import { relative } from "node:path";

import type { ScanResult } from "./scanner.js";
import type { TransformSuggestion } from "./transforms/tailwind3to4.js";

/**
 * Builds the full markdown report from a scan result. Pure function: it does
 * not touch the filesystem.
 */
export function buildMarkdownReport(scanResult: ScanResult): string {
  const {
    rootDir,
    packageInfo,
    filesScanned,
    suggestions,
    writeMode,
    checkMode,
    filesModified,
  } = scanResult;
  const mode = checkMode ? "check" : writeMode ? "write" : "report-only";

  const lines: string[] = [];

  lines.push("# DepShift Tailwind Report");
  lines.push("");
  lines.push("Safe Tailwind CSS v3 → v4 migration suggestions for this repository.");
  lines.push("");

  // --- Tailwind package status ---
  lines.push("## Tailwind package");
  lines.push("");
  if (packageInfo.found) {
    lines.push(`- **Status:** found`);
    lines.push(`- **Version range:** \`${packageInfo.versionRange ?? "unknown"}\``);
    lines.push(`- **Declared in:** \`${packageInfo.dependencySection ?? "unknown"}\``);
  } else {
    lines.push("- **Status:** not found in package.json");
  }
  lines.push("");

  // --- Summary ---
  lines.push("## Summary");
  lines.push("");
  lines.push(`- **Mode:** ${mode}`);
  lines.push(`- **Files scanned:** ${filesScanned.length}`);
  lines.push(`- **Suggestions found:** ${suggestions.length}`);
  lines.push(`- **Files modified:** ${filesModified.length}`);
  if (checkMode) {
    lines.push(`- **Check result:** ${suggestions.length === 0 ? "passed" : "failed"}`);
  }
  lines.push("");

  // --- Files modified ---
  lines.push("## Files modified");
  lines.push("");
  if (filesModified.length === 0) {
    lines.push("No files were modified.");
  } else {
    for (const filePath of filesModified) {
      lines.push(`- \`${toDisplayPath(filePath, rootDir)}\``);
    }
  }
  lines.push("");

  // --- Suggestions grouped by file ---
  lines.push("## Suggestions");
  lines.push("");

  if (suggestions.length === 0) {
    lines.push("No migration suggestions were found. 🎉");
    lines.push("");
  } else {
    for (const [filePath, fileSuggestions] of groupByFile(suggestions, rootDir)) {
      lines.push(`### ${filePath}`);
      lines.push("");
      for (const suggestion of fileSuggestions) {
        lines.push(`#### ${suggestion.transformName}`);
        lines.push("");
        lines.push(suggestion.message);
        lines.push("");
        lines.push("Before:");
        lines.push("");
        lines.push("```text");
        lines.push(suggestion.before);
        lines.push("```");
        lines.push("");
        lines.push("After:");
        lines.push("");
        lines.push("```text");
        lines.push(suggestion.after);
        lines.push("```");
        lines.push("");
      }
    }
  }

  // --- Footer ---
  lines.push("---");
  lines.push("");
  if (checkMode) {
    lines.push(
      suggestions.length === 0
        ? "> Check mode passed: no migration suggestions were found and no files were modified."
        : "> Check mode failed: migration suggestions were found. No files were modified.",
    );
  } else if (!writeMode) {
    lines.push(
      "> Report-only mode: no files were modified. Run with `--write` to apply the safe transforms.",
    );
  } else if (filesModified.length === 0) {
    lines.push("> Write mode was enabled, but no files were modified.");
  } else {
    lines.push("> Write mode applied the safe transforms listed above.");
  }
  lines.push("");

  return lines.join("\n");
}

/**
 * Groups suggestions by their (repo-relative) file path, preserving the order
 * in which files first appear so the output stays deterministic.
 */
function groupByFile(
  suggestions: TransformSuggestion[],
  rootDir: string,
): Map<string, TransformSuggestion[]> {
  const grouped = new Map<string, TransformSuggestion[]>();

  for (const suggestion of suggestions) {
    const display = toDisplayPath(suggestion.filePath, rootDir);
    const existing = grouped.get(display);
    if (existing) {
      existing.push(suggestion);
    } else {
      grouped.set(display, [suggestion]);
    }
  }

  return grouped;
}

function toDisplayPath(filePath: string, rootDir: string): string {
  const rel = relative(rootDir, filePath);
  if (rel === "" || rel.startsWith("..")) {
    return filePath;
  }
  // Normalize Windows separators for stable, readable output.
  return rel.split("\\").join("/");
}
