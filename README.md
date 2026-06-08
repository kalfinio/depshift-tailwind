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

`node_modules`, `dist`, `build`, `.next`, `.git`, and `coverage`.

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

## GitHub Actions

This repository includes an example pull request workflow at
`.github/workflows/depshift-tailwind.yml`. It checks out the repo, sets up
Node.js 20, installs dependencies, builds the CLI, runs `node dist/cli.js
--check`, and uploads `depshift-report.md` as an artifact when the report exists.

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
checked-out workspace and this project does not currently add PR comments,
auto-commit fixes, or open follow-up pull requests.

## Development

```bash
npm test       # run the Vitest suite
npm run build  # type-check and emit to dist/
```

## Roadmap

1. A GitHub App for repo-wide checks.
2. Paid auto-fix commits / PRs.
