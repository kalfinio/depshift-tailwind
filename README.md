# DepShift Tailwind

A minimal, local-only CLI that scans a repository for **safe Tailwind CSS v3 → v4
migration issues** and writes a markdown report. By default it does **not**
modify any of your files; pass `--write` to apply the currently supported safe
transforms in place.

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

From the root of the project you want to scan:

```bash
node dist/cli.js
```

This writes `depshift-report.md` to the current working directory and prints a
short summary to the terminal. To apply safe transforms and then write the
report:

```bash
node dist/cli.js --write
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

## Development

```bash
npm test       # run the Vitest suite
npm run build  # type-check and emit to dist/
```

## Roadmap

1. A GitHub Action wrapper for CI.
2. A GitHub App for repo-wide checks.
3. Paid auto-fix commits / PRs.
