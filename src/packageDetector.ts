import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Result of looking for the `tailwindcss` package in a project's package.json.
 */
export interface TailwindPackageInfo {
  found: boolean;
  versionRange?: string;
  dependencySection?: string;
}

const DEPENDENCY_SECTIONS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;

/**
 * Reads `<rootDir>/package.json` and reports whether `tailwindcss` is declared,
 * and in which dependency section, along with the declared version range.
 *
 * Never throws: a missing or malformed package.json simply yields `found: false`.
 */
export function detectTailwindPackage(rootDir: string): TailwindPackageInfo {
  const pkgPath = join(rootDir, "package.json");
  if (!existsSync(pkgPath)) {
    return { found: false };
  }

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as Record<string, unknown>;
  } catch {
    return { found: false };
  }

  for (const section of DEPENDENCY_SECTIONS) {
    const deps = pkg[section];
    if (deps && typeof deps === "object") {
      const range = (deps as Record<string, unknown>).tailwindcss;
      if (typeof range === "string") {
        return {
          found: true,
          versionRange: range,
          dependencySection: section,
        };
      }
    }
  }

  return { found: false };
}
