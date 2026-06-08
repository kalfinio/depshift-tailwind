import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { buildMarkdownReport } from "./report.js";
import { scanRepository, type ScanResult } from "./scanner.js";

const REPORT_FILENAME = "depshift-report.md";

export type CliMode = "report-only" | "write" | "check";

export interface ParsedCliArgs {
  mode: CliMode;
  writeMode: boolean;
  checkMode: boolean;
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

    printSummary({
      result,
      mode: parsed.mode,
      reportPath,
      log,
    });

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

  for (const arg of args) {
    if (arg === "--write") {
      writeMode = true;
      continue;
    }

    if (arg === "--check") {
      checkMode = true;
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
  };
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
