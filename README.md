# DepShift Tailwind

A minimal, local-only CLI that scans a repository for **safe Tailwind CSS v3 → v4
migration issues** and writes a markdown report. By default it does **not**
modify any of your files; pass `--write` to apply the currently supported safe
transforms in place, or `--check` to fail CI when suggestions are found.

## What it is

DepShift Tailwind reads your project, detects whether `tailwindcss` is installed,
scans your config and source files, and reports a set of safe, mechanical v3 → v4
changes with clear before/after snippets. There is no backend, no database, no
auth, and no external/paid APIs — everything runs locally over your filesystem.

## Install

```bash
npm install
npm run build
```

## Run

Build the CLI first:

```bash
npm run build
```

From this repository, you can run the compiled CLI directly:

```bash
node dist/cli.js
node dist/cli.js --check
```

This writes `depshift-report.md` to the current working directory and prints a
short summary to the terminal. To apply safe transforms and then write the
report:

```bash
node dist/cli.js --write
```

Because `package.json` exposes a `depshift-tailwind` bin entry, the same built
CLI can also be invoked through npm/npx from this package directory:

```bash
npx .
npx . --check
npx . --write
```

Use `--write` only from the repository you intend to modify; it applies safe
transforms to scanned files in the current working directory. `--check` never
modifies files.

When scanning another local repository, run the package from that repository's
root. For example, from `demo-repo` in this workspace:

```bash
node ../dist/cli.js
node ../dist/cli.js --check
node ../dist/cli.js --write
```

After publishing or installing the package, use the bin name:

```bash
depshift-tailwind
depshift-tailwind --check
depshift-tailwind --write
```

During development you can run it without building:

```bash
npm run dev
```

## What it currently detects

1. **Tailwind config `content` array → object form**

   ```diff
   - content: ["./src/**/*.{ts,tsx}"]
   + content: { files: ["./src/**/*.{ts,tsx}"] }
   ```

2. **Legacy arbitrary `rgba()` shadow → v4 `rgb()` color syntax**

   Inside JSX `className` strings, plain string literals, and no-substitution
   template literals:

   ```diff
   - shadow-[0_0_10px_rgba(0,0,0,0.2)]
   + shadow-[0_0_10px_rgb(0_0_0_/_0.2)]
   ```

### Files scanned

- `tailwind.config.{ts,js,mjs,cjs}` at the repo root
- `*.ts` / `*.tsx` under `src/`, `app/`, and `components/`

### Files ignored

`node_modules`, `dist`, `build`, `.next`, `.git`, `coverage`, `__fixtures__`,
`__tests__`, and `*.test.*` / `*.spec.*` files.

## Important: report-only by default

Without `--write`, this tool **does not modify your files**. It only generates
`depshift-report.md` with suggested before/after changes for you to apply
yourself. With `--write`, the same report is generated after safe transforms are
written, and the report lists which files were modified.

## Check mode

`--check` is intended for CI. It scans and writes `depshift-report.md`, but never
modifies source files. It exits with code `1` when suggestions are found and
code `0` when there are no suggestions. `--write` and `--check` cannot be used
together.

## JSON output

Pass `--json` to print a structured JSON payload to stdout instead of the
human-readable summary. It works alongside every mode:

```bash
node dist/cli.js --json          # report-only + JSON
node dist/cli.js --check --json  # check mode + JSON (exits 1 if suggestions found)
node dist/cli.js --write --json  # write mode + JSON

# or via npx from this package directory
npx . --json
npx . --check --json
npx . --write --json
```

The markdown report is still written to `depshift-report.md`, and exit codes are
unchanged: `--check --json` exits `1` when suggestions are found and `0`
otherwise; the other modes exit `0` unless a runtime error occurs. When `--json`
is set, **stdout is valid JSON only** — runtime errors go to stderr.

The payload is shaped for CI, PR comment, and GitHub App consumers and omits the
large before/after code strings (those stay in `depshift-report.md`):

```json
{
  "mode": "report-only",
  "tailwind": {
    "found": true,
    "versionRange": "^3.4.0",
    "dependencySection": "devDependencies"
  },
  "filesScanned": 1,
  "suggestionsFound": 1,
  "filesModified": [],
  "reportPath": "/abs/path/to/depshift-report.md",
  "checkResult": null,
  "suggestions": [
    {
      "filePath": "tailwind.config.ts",
      "transformName": "tailwind-config-content-array-to-object",
      "message": "Tailwind v4 prefers the object form for `content`. Wrap the array in `{ files: [...] }`."
    }
  ]
}
```

In check mode `checkResult` is `"passed"` or `"failed"`; in the other modes it is
`null`. Paths in `suggestions[].filePath` and `filesModified` are repo-relative.

## GitHub Actions

This repository includes a pull request workflow at
`.github/workflows/depshift-tailwind.yml`. It checks out the repo, sets up
Node.js 20, installs dependencies, builds the CLI, runs `node dist/cli.js
--check --json` (saving the structured output to `depshift-result.json`), posts
or updates a single PR comment, uploads `depshift-report.md` as an artifact when
the report exists, and finally fails the job when migration suggestions are
found.

Example workflow:

```yaml
name: DepShift Tailwind

on:
  pull_request:

jobs:
  depshift-tailwind:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci
      - run: npm run build
      - run: node dist/cli.js --check

      - name: Upload DepShift report
        if: ${{ always() && hashFiles('depshift-report.md') != '' }}
        uses: actions/upload-artifact@v4
        with:
          name: depshift-report
          path: depshift-report.md
```

### Pull request comments

On `pull_request` runs, the workflow posts a single sticky comment summarizing
the scan, using the built-in `GITHUB_TOKEN` and `actions/github-script`. The
comment carries a hidden marker (`<!-- depshift-tailwind-comment -->`) so
re-runs **update the same comment instead of adding new ones**.

- When suggestions are found, the comment reports how many, lists the affected
  files (derived from `suggestions[].filePath` in `depshift-result.json`), and
  notes that the full `depshift-report.md` is uploaded as the `depshift-report`
  artifact.
- When no suggestions are found, the comment simply says so.

The check still fails the job when suggestions exist, but the comment, summary,
and artifact steps run first so you always get feedback on the PR. This requires
the workflow permissions `pull-requests: write` and `issues: write` (PR comments
are issue comments); `contents: read` and `actions: read` are also granted. No
GitHub App, server, or auto-commit is involved — everything runs inside the
workflow.

The project also includes a root `action.yml` for future local composite-action
usage:

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: ./
    with:
      mode: check
```

For pull requests, prefer `mode: check`. It leaves source files untouched and
fails the workflow when migration suggestions exist. Do not run `--write`
automatically on untrusted pull requests yet; write mode modifies files in the
checked-out workspace. The workflow now posts a summary PR comment (see above),
but this project still does not auto-commit fixes or open follow-up pull
requests.

## Development

```bash
npm test       # run the Vitest suite
npm run build  # type-check and emit to dist/
```

## Roadmap

1. A GitHub App for repo-wide checks.
2. Paid auto-fix commits / PRs.
