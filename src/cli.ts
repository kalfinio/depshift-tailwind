#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { scanRepository } from "./scanner.js";
import { buildMarkdownReport } from "./report.js";

const REPORT_FILENAME = "depshift-report.md";

async function main(): Promise<void> {
  const { writeMode } = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();

  const result = await scanRepository(rootDir, { writeMode });
  const report = buildMarkdownReport(result);

  const reportPath = join(rootDir, REPORT_FILENAME);
  await writeFile(reportPath, report, "utf8");

  const { packageInfo, filesScanned, suggestions, filesModified } = result;
  const tailwindStatus = packageInfo.found
    ? `yes${packageInfo.versionRange ? ` (${packageInfo.versionRange})` : ""}`
    : "no";

  console.log("DepShift Tailwind — v3 → v4 scan");
  console.log(`  Mode:              ${writeMode ? "write" : "report-only"}`);
  console.log(`  Tailwind found:    ${tailwindStatus}`);
  console.log(`  Files scanned:     ${filesScanned.length}`);
  console.log(`  Suggestions found: ${suggestions.length}`);
  console.log(`  Files modified:    ${filesModified.length}`);
  console.log(`  Report written to: ${reportPath}`);
}

function parseArgs(args: string[]): { writeMode: boolean } {
  let writeMode = false;

  for (const arg of args) {
    if (arg === "--write") {
      writeMode = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { writeMode };
}

main().catch((error: unknown) => {
  console.error("depshift-tailwind failed:");
  console.error(error);
  process.exitCode = 1;
});
