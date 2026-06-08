import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { findCandidateFiles } from "./fileGlobs.js";

const tempRoots: string[] = [];

describe("findCandidateFiles", () => {
  afterEach(async () => {
    await Promise.all(
      tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
    );
  });

  it("excludes fixture and test directories", async () => {
    const root = await createFixtureRepo({
      "tailwind.config.ts": "export default {};",
      "src/App.tsx": "export function App() { return null; }",
      "src/transforms/__fixtures__/tailwindFixtures.ts": "export const fixture = true;",
      "src/components/__tests__/Card.tsx": "export function Card() { return null; }",
    });

    expect(await getRelativeFiles(root)).toEqual([
      "src/App.tsx",
      "tailwind.config.ts",
    ]);
  });

  it("excludes test and spec files", async () => {
    const root = await createFixtureRepo({
      "src/App.tsx": "export function App() { return null; }",
      "src/App.test.ts": "",
      "src/App.test.tsx": "",
      "src/App.spec.ts": "",
      "src/App.spec.tsx": "",
      "src/App.test.js": "",
      "src/App.test.jsx": "",
      "src/App.spec.js": "",
      "src/App.spec.jsx": "",
    });

    expect(await getRelativeFiles(root)).toEqual(["src/App.tsx"]);
  });
});

async function createFixtureRepo(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "depshift-tailwind-files-"));
  tempRoots.push(root);

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

async function getRelativeFiles(root: string): Promise<string[]> {
  const files = await findCandidateFiles(root);
  return files
    .map((filePath) => relative(root, filePath).split("\\").join("/"))
    .sort((a, b) => a.localeCompare(b));
}
