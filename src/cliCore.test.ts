import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { parseArgs, runCli } from "./cliCore.js";
import {
  alreadyMigratedComponent,
  beforeTailwindConfig,
} from "./transforms/__fixtures__/tailwindFixtures.js";

const tempRoots: string[] = [];

describe("cli check mode", () => {
  afterEach(async () => {
    await Promise.all(
      tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
    );
  });

  it("--check with suggestions exits with code 1", async () => {
    const root = await createFixtureRepo({
      "tailwind.config.ts": beforeTailwindConfig,
    });
    const output: string[] = [];

    const exitCode = await runCli({
      args: ["--check"],
      rootDir: root,
      log: (message) => output.push(message),
    });

    expect(exitCode).toBe(1);
    expect(output).toContain("  Mode:              check");
    expect(output).toContain("  Suggestions found: 1");
    expect(output).toContain("  Files modified:    0");
    expect(output).toContain("  Check result:      failed");
    expect(await pathExists(join(root, "depshift-report.md"))).toBe(true);
  });

  it("--check without suggestions exits with code 0", async () => {
    const root = await createFixtureRepo({
      "src/Card.tsx": alreadyMigratedComponent,
    });
    const output: string[] = [];

    const exitCode = await runCli({
      args: ["--check"],
      rootDir: root,
      log: (message) => output.push(message),
    });
    const report = await readFile(join(root, "depshift-report.md"), "utf8");

    expect(exitCode).toBe(0);
    expect(output).toContain("  Mode:              check");
    expect(output).toContain("  Suggestions found: 0");
    expect(output).toContain("  Check result:      passed");
    expect(report).toContain("- **Mode:** check");
    expect(report).toContain("- **Check result:** passed");
  });

  it("--check does not modify files", async () => {
    const root = await createFixtureRepo({
      "tailwind.config.ts": beforeTailwindConfig,
    });
    const configPath = join(root, "tailwind.config.ts");

    const exitCode = await runCli({
      args: ["--check"],
      rootDir: root,
      log: () => undefined,
    });

    expect(exitCode).toBe(1);
    expect(await readFile(configPath, "utf8")).toBe(beforeTailwindConfig);
  });

  it("--write and --check together is invalid", async () => {
    const root = await createFixtureRepo({
      "tailwind.config.ts": beforeTailwindConfig,
    });
    const errors: string[] = [];

    const exitCode = await runCli({
      args: ["--write", "--check"],
      rootDir: root,
      log: () => undefined,
      error: (message) => errors.push(message),
    });

    expect(exitCode).toBe(1);
    expect(errors).toEqual([
      "depshift-tailwind failed: --write and --check cannot be used together.",
    ]);
    expect(await pathExists(join(root, "depshift-report.md"))).toBe(false);
  });

  it("parses --check as a non-writing mode", () => {
    expect(parseArgs(["--check"])).toEqual({
      mode: "check",
      writeMode: false,
      checkMode: true,
    });
  });
});

async function createFixtureRepo(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "depshift-tailwind-cli-"));
  tempRoots.push(root);

  await writeRepoFile(
    root,
    "package.json",
    JSON.stringify({ devDependencies: { tailwindcss: "^3.4.0" } }, null, 2),
  );

  for (const [filePath, sourceText] of Object.entries(files)) {
    await writeRepoFile(root, filePath, sourceText);
  }

  return root;
}

async function writeRepoFile(
  root: string,
  filePath: string,
  sourceText: string,
): Promise<void> {
  const fullPath = join(root, filePath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, sourceText, "utf8");
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}
