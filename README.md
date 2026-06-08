# DepShift Tailwind

> Safe Tailwind v3 → v4 migration checks for pull requests.

DepShift scans your repo for supported Tailwind v3 patterns, reports safe
migration suggestions, can apply safe fixes locally, and can fail CI when
migration issues exist. Everything runs on your filesystem — no backend, no
database, no auth, no external APIs.

## Why it exists

Tools like Renovate and Dependabot open dependency-upgrade PRs, but they bump
versions — they don't fix the breaking *code* patterns a major upgrade
introduces. DepShift is a small codemod/check layer focused on the migration
work itself: it finds known Tailwind v3 → v4 patterns, shows the exact change,
and can either apply them or gate them in CI.

## Features

- Scan Tailwind config and source files for known v3 → v4 patterns
- Generate a markdown report (`depshift-report.md`) with before/after snippets
- Apply safe fixes in place with `--write` (AST-based, opt-in)
- Fail CI when suggestions exist with `--check`
- Emit structured, machine-readable results with `--json`
- GitHub Actions workflow with a job summary
- Sticky pull request comment (created once, updated on re-runs)
- Upload the markdown report as a build artifact

## Installation & local usage

Requires Node.js 18+ (the GitHub Action uses Node 20).

```bash
npm install
npm run build
```

Then run the compiled CLI from the root of the repo you want to scan:

```bash
node dist/cli.js                # report-only: write depshift-report.md, change nothing
node dist/cli.js --write        # apply the supported safe transforms in place
node dist/cli.js --check        # CI mode: exit 1 if any suggestions are found
node dist/cli.js --json         # print structured JSON to stdout
node dist/cli.js --check --json # check mode + JSON (exit 1 on suggestions)
```

Every run writes `depshift-report.md` to the current directory. `--write` and
`--check` cannot be combined. With `--json`, stdout is valid JSON only (runtime
errors go to stderr).

## GitHub Actions usage

The repo ships a workflow at `.github/workflows/depshift-tailwind.yml` that runs
on every `pull_request`. It:

1. builds the CLI and runs `node dist/cli.js --check --json`,
2. posts — and on re-runs updates — a single comment on the PR summarizing the result,
3. uploads `depshift-report.md` as the `depshift-report` artifact, and
4. fails the job when migration suggestions are found.

The comment, summary, and artifact steps run first, so you still get feedback on
the PR even when the check fails. PR comments need `pull-requests: write` and
`issues: write` permissions, which the workflow declares, and it uses the
built-in `GITHUB_TOKEN` — no GitHub App or server required.

## Example PR comment

When suggestions are found, the action posts a comment like this on the pull
request:

> **DepShift Tailwind**
>
> DepShift Tailwind found 2 migration suggestions.
>
> Files affected:
> - `src/brokenTailwindClass.ts`
> - `tailwind.config.ts`
>
> The full `depshift-report.md` is uploaded as the `depshift-report` workflow
> artifact.

The workflow attaches a hidden marker (`<!-- depshift-tailwind-comment -->`) to
this comment, so subsequent runs **update the same single DepShift comment**
instead of spamming the PR with a new one each time.

This comment is informational — in `--check` mode the PR check still **fails**
when suggestions are found, so the migration work isn't silently merged.

## Supported transforms

DepShift uses [ts-morph](https://ts-morph.com/) to edit the AST, so changes are
syntax-aware rather than blind text replacement.

**1. Tailwind config `content` array → object form**

```diff
- content: ["./src/**/*.{ts,tsx}"]
+ content: { files: ["./src/**/*.{ts,tsx}"] }
```

**2. Arbitrary `rgba()` shadow → v4 `rgb()` color syntax**

Inside JSX `className` strings, plain string literals, and no-substitution
template literals:

```diff
- shadow-[0_0_10px_rgba(0,0,0,0.2)]
+ shadow-[0_0_10px_rgb(0_0_0_/_0.2)]
```

**Scanned:** `tailwind.config.{ts,js,mjs,cjs}` at the repo root, plus `*.ts` /
`*.tsx` under `src/`, `app/`, and `components/`.

**Ignored:** `node_modules`, `dist`, `build`, `.next`, `.git`, `coverage`,
`__fixtures__`, `__tests__`, and `*.test.*` / `*.spec.*` files.

## Safety model

- **Report-only by default.** Without `--write`, no files are modified — you only
  get `depshift-report.md`.
- **`--write` is explicit.** It applies only the supported safe transforms, and
  the report lists exactly which files changed.
- **`--check` never modifies files.** It is read-only and intended for CI.
- **Full before/after detail lives in the markdown report**, not in the terminal
  output.
- **JSON output omits large before/after code strings** so it stays small for CI
  and tooling; it carries counts, repo-relative file paths, and transform names.

## Current status

DepShift Tailwind is an early MVP. It deliberately ships a **small, safe set of
transforms** rather than attempting a full migration. It does **not** fully
migrate a project to Tailwind v4 — treat it as an assistant that handles a few
well-understood patterns and surfaces them in PRs. Always review the generated
report before merging.

## Roadmap

- Publish to npm for `npx depshift-tailwind` usage
- Monorepo / custom package-path support
- More Tailwind v4 transforms
- Richer Tailwind config handling
- A GitHub App for repo-wide checks (later)

## Development

```bash
npm test       # run the Vitest suite
npm run build  # type-check and emit to dist/
```

## Packaging

This package is **not published to npm yet**. To preview exactly what *would* be
published — without creating a tarball or publishing anything — run:

```bash
npm pack --dry-run
```

It prints the file list and package size. Thanks to the `files` whitelist in
`package.json`, only `dist/`, `action.yml`, `README.md`, `package.json`, and
`LICENSE` are included — source, tests, and config are left out. The `prepack`
script rebuilds `dist/` automatically before packing or publishing, so the
output always reflects the current source.
