import { promises as fs } from "node:fs";

import { detectTailwindPackage, type TailwindPackageInfo } from "./packageDetector.js";
import { findCandidateFiles } from "./utils/fileGlobs.js";
import {
  applyTailwind3to4File,
  analyzeTailwind3to4File,
  type TransformSuggestion,
} from "./transforms/tailwind3to4.js";

export interface ScanResult {
  rootDir: string;
  packageInfo: TailwindPackageInfo;
  filesScanned: string[];
  suggestions: TransformSuggestion[];
  writeMode: boolean;
  filesModified: string[];
}

export interface ScanOptions {
  writeMode?: boolean;
}

/**
 * Scans a repository rooted at `rootDir`:
 *  - detects the tailwindcss package via package.json
 *  - finds candidate files (config + src/app/components)
 *  - runs the Tailwind v3 -> v4 analysis on each file's text
 *
 * Files are only modified when `writeMode` is true and at least one safe
 * transform changes that file. Unreadable files are skipped silently.
 */
export async function scanRepository(
  rootDir: string,
  options: ScanOptions = {},
): Promise<ScanResult> {
  const writeMode = options.writeMode ?? false;
  const packageInfo = detectTailwindPackage(rootDir);
  const filesScanned = await findCandidateFiles(rootDir);

  const suggestions: TransformSuggestion[] = [];
  const filesModified: string[] = [];
  for (const filePath of filesScanned) {
    let sourceText: string;
    try {
      sourceText = await fs.readFile(filePath, "utf8");
    } catch {
      continue;
    }

    if (!writeMode) {
      suggestions.push(...analyzeTailwind3to4File({ filePath, sourceText }));
      continue;
    }

    const transformResult = applyTailwind3to4File({ filePath, sourceText });
    suggestions.push(...transformResult.suggestions);

    if (transformResult.suggestions.length === 0 || !transformResult.modified) {
      continue;
    }

    await fs.writeFile(filePath, transformResult.outputText, "utf8");
    filesModified.push(filePath);
  }

  return {
    rootDir,
    packageInfo,
    filesScanned,
    suggestions,
    writeMode,
    filesModified,
  };
}
