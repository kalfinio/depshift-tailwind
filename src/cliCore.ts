import { writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

import { buildMarkdownReport } from "./report.js";
import { scanRepository, type ScanResult } from "./scanner.js";

const REPORT_FILENAME = "depshift-report.md";

export type CliMode = "report-only" | "write" | "check";

export interface ParsedCliArgs {
  mode: CliMode;
  writeMode: boolean;
  checkMode: boolean;
  json: boolean;
}

/** A single suggestion as exposed in `--json` output (no large code strings). */
export interface JsonSuggestion {
  filePath: string;
  transformName: string;
  message: string;
}

/** Structured `--json` payload, intended for CI / PR comment / App consumers. */
export interface JsonReport {
  mode: CliMode;
  tailwind: {
    found: boolean;
    versionRange: string | null;
    dependencySection: string | null;
  };
  filesScanned: number;
  suggestionsFound: number;
  filesModified: string[];
  reportPath: string;
  checkResult: "passed" | "failed" | null;
  suggestions: JsonSuggestion[];
}

export interface RunCliOptions {
  args?: string[];
  rootDir?: string;
  log?: (message: string) => void;
  error?: (message: string) => void;
}

export async function runCli(options: RunCliOptions = {}): Promise<number> {
  const log = options.log ?? console.log;
  const error = options.error ?? console.error;

  let parsed: ParsedCliArgs;
  try {
    parsed = parseArgs(options.args ?? process.argv.slice(2));
  } catch (parseError) {
    error(formatError(parseError));
    return 1;
  }

  try {
    const rootDir = options.rootDir ?? process.cwd();
    const result = await scanRepository(rootDir, {
      writeMode: parsed.writeMode,
      checkMode: parsed.checkMode,
    });
    const report = buildMarkdownReport(result);

    const reportPath = join(rootDir, REPORT_FILENAME);
    await writeFile(reportPath, report, "utf8");

    if (parsed.json) {
      // stdout must be valid JSON only: no human-readable summary here.
      const jsonReport = buildJsonReport({ result, mode: parsed.mode, reportPath });
      log(JSON.stringify(jsonReport, null, 2));
    } else {
      printSummary({
        result,
        mode: parsed.mode,
        reportPath,
        log,
      });
    }

    if (parsed.checkMode) {
      return result.suggestions.length === 0 ? 0 : 1;
    }

    return 0;
  } catch (runtimeError) {
    error("depshift-tailwind failed:");
    error(formatUnknown(runtimeError));
    return 1;
  }
}

export function parseArgs(args: string[]): ParsedCliArgs {
  let writeMode = false;
  let checkMode = false;
  let json = false;

  for (const arg of args) {
    if (arg === "--write") {
      writeMode = true;
      continue;
    }

    if (arg === "--check") {
      checkMode = true;
      continue;
    }

    if (arg === "--json") {
      json = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (writeMode && checkMode) {
    throw new Error("--write and --check cannot be used together.");
  }

  return {
    mode: checkMode ? "check" : writeMode ? "write" : "report-only",
    writeMode,
    checkMode,
    json,
  };
}

/**
 * Builds the structured `--json` payload from a scan result. Pure function:
 * it does not touch the filesystem. Large before/after code strings are
 * intentionally omitted so the payload stays small for CI consumers.
 */
export function buildJsonReport(input: {
  result: ScanResult;
  mode: CliMode;
  reportPath: string;
}): JsonReport {
  const { result, mode, reportPath } = input;
  const { rootDir, packageInfo, filesScanned, suggestions, filesModified, checkMode } =
    result;

  return {
    mode,
    tailwind: {
      found: packageInfo.found,
      versionRange: packageInfo.versionRange ?? null,
      dependencySection: packageInfo.dependencySection ?? null,
    },
    filesScanned: filesScanned.length,
    suggestionsFound: suggestions.length,
    filesModified: filesModified.map((filePath) => toRelativeDisplay(filePath, rootDir)),
    reportPath,
    checkResult: checkMode ? (suggestions.length === 0 ? "passed" : "failed") : null,
    suggestions: suggestions.map((suggestion) => ({
      filePath: toRelativeDisplay(suggestion.filePath, rootDir),
      transformName: suggestion.transformName,
      message: suggestion.message,
    })),
  };
}

function toRelativeDisplay(filePath: string, rootDir: string): string {
  const rel = relative(rootDir, filePath);
  if (rel === "" || rel.startsWith("..")) {
    return filePath;
  }
  // Normalize Windows separators for stable, portable output.
  return rel.split("\\").join("/");
}

function printSummary(input: {
  result: ScanResult;
  mode: CliMode;
  reportPath: string;
  log: (message: string) => void;
}): void {
  const { result, mode, reportPath, log } = input;
  const { packageInfo, filesScanned, suggestions, filesModified } = result;
  const tailwindStatus = packageInfo.found
    ? `yes${packageInfo.versionRange ? ` (${packageInfo.versionRange})` : ""}`
    : "no";

  log("DepShift Tailwind — v3 → v4 scan");
  log(`  Mode:              ${mode}`);
  log(`  Tailwind found:    ${tailwindStatus}`);
  log(`  Files scanned:     ${filesScanned.length}`);
  log(`  Suggestions found: ${suggestions.length}`);
  log(`  Files modified:    ${filesModified.length}`);
  log(`  Report written to: ${reportPath}`);

  if (mode === "check") {
    log(`  Check result:      ${suggestions.length === 0 ? "passed" : "failed"}`);
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `depshift-tailwind failed: ${error.message}`;
  }

  return "depshift-tailwind failed.";
}

function formatUnknown(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  return String(error);
}
