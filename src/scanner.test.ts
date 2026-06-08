import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildMarkdownReport } from "./report.js";
import { scanRepository } from "./scanner.js";
import {
  alreadyMigratedComponent,
  beforeCardComponent,
  beforeTailwindConfig,
  expectedClassAfter,
  expectedContentAfter,
} from "./transforms/__fixtures__/tailwindFixtures.js";

const tempRoots: string[] = [];

describe("scanRepository write mode", () => {
  afterEach(async () => {
    await Promise.all(
      tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
    );
  });

  it("report-only mode does not modify fixture text", async () => {
    const root = await createFixtureRepo({
      "tailwind.config.ts": beforeTailwindConfig,
    });
    const configPath = join(root, "tailwind.config.ts");

    const result = await scanRepository(root);

    expect(result.writeMode).toBe(false);
    expect(result.filesModified).toEqual([]);
    expect(await readFile(configPath, "utf8")).toBe(beforeTailwindConfig);
  });

  it("write mode modifies Tailwind config", async () => {
    const root = await createFixtureRepo({
      "tailwind.config.ts": beforeTailwindConfig,
    });
    const configPath = join(root, "tailwind.config.ts");

    const result = await scanRepository(root, { writeMode: true });

    expect(await readFile(configPath, "utf8")).toContain(expectedContentAfter);
    expect(toRelativeFiles(root, result.filesModified)).toEqual(["tailwind.config.ts"]);
  });

  it("write mode modifies JSX className shadow string", async () => {
    const root = await createFixtureRepo({
      "src/Card.tsx": beforeCardComponent,
    });
    const cardPath = join(root, "src", "Card.tsx");

    const result = await scanRepository(root, { writeMode: true });

    expect(await readFile(cardPath, "utf8")).toContain(expectedClassAfter);
    expect(toRelativeFiles(root, result.filesModified)).toEqual(["src/Card.tsx"]);
  });

  it("write mode reports filesModified correctly", async () => {
    const root = await createFixtureRepo({
      "tailwind.config.ts": beforeTailwindConfig,
      "src/Card.tsx": beforeCardComponent,
    });

    const result = await scanRepository(root, { writeMode: true });
    const report = buildMarkdownReport(result);

    expect(result.writeMode).toBe(true);
    expect(toRelativeFiles(root, result.filesModified)).toEqual([
      "src/Card.tsx",
      "tailwind.config.ts",
    ]);
    expect(report).toContain("- **Mode:** write");
    expect(report).toContain("- **Files modified:** 2");
    expect(report).toContain("- `tailwind.config.ts`");
    expect(report).toContain("- `src/Card.tsx`");
  });

  it("write mode does not modify files when there are zero suggestions", async () => {
    const root = await createFixtureRepo({
      "src/Card.tsx": alreadyMigratedComponent,
    });
    const cardPath = join(root, "src", "Card.tsx");

    const result = await scanRepository(root, { writeMode: true });

    expect(result.suggestions).toEqual([]);
    expect(result.filesModified).toEqual([]);
    expect(await readFile(cardPath, "utf8")).toBe(alreadyMigratedComponent);
  });
});

async function createFixtureRepo(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "depshift-tailwind-"));
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

function toRelativeFiles(root: string, files: string[]): string[] {
  return files
    .map((filePath) => relative(root, filePath).split("\\").join("/"))
    .sort((a, b) => a.localeCompare(b));
}
