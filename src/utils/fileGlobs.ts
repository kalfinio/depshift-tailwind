import { promises as fs } from "node:fs";
import { extname, join, resolve } from "node:path";

/** Directories that are never scanned, regardless of depth. */
const EXCLUDED_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".next",
  ".git",
  "coverage",
]);

/** Source directories that are recursively scanned when present. */
const SCAN_DIRS = ["src", "app", "components"];

/** Root Tailwind config files that are scanned directly when present. */
const ROOT_CONFIG_FILES = [
  "tailwind.config.ts",
  "tailwind.config.js",
  "tailwind.config.mjs",
  "tailwind.config.cjs",
];

/** File extensions scanned inside the source directories. */
const SCAN_EXTENSIONS = new Set([".ts", ".tsx"]);

/**
 * Returns the absolute paths of all files that should be analyzed:
 *  - root Tailwind config files (any supported extension)
 *  - `.ts` / `.tsx` files under src/, app/, components/
 *
 * Excluded directories (node_modules, dist, build, .next, .git, coverage) are
 * skipped at every level. The result is sorted for deterministic output.
 */
export async function findCandidateFiles(rootDir: string): Promise<string[]> {
  const root = resolve(rootDir);
  const results: string[] = [];

  for (const name of ROOT_CONFIG_FILES) {
    const full = join(root, name);
    if (await isFile(full)) {
      results.push(full);
    }
  }

  for (const dir of SCAN_DIRS) {
    const full = join(root, dir);
    if (await isDirectory(full)) {
      await walk(full, results);
    }
  }

  results.sort((a, b) => a.localeCompare(b));
  return results;
}

async function walk(dir: string, results: string[]): Promise<void> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) {
        continue;
      }
      await walk(join(dir, entry.name), results);
    } else if (entry.isFile()) {
      if (SCAN_EXTENSIONS.has(extname(entry.name))) {
        results.push(join(dir, entry.name));
      }
    }
  }
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await fs.stat(path)).isFile();
  } catch {
    return false;
  }
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await fs.stat(path)).isDirectory();
  } catch {
    return false;
  }
}
