# Known limitations

Please read this before relying on DepShift Tailwind for a migration.

## Current status

DepShift Tailwind is an **MVP**. It is **not** a full Tailwind v4 migration tool.
It only supports the small set of documented, safe transforms — it catches a few
specific, well-understood Tailwind v3 → v4 patterns in pull requests, and nothing
more. Treat its output as a helpful hint, not a guarantee that a project is
v4-ready.

## What DepShift Tailwind supports today

The currently supported safe transforms are:

- **Tailwind config `content` array → object form**

  ```diff
  - content: ["./src/**/*.{ts,tsx}"]
  + content: { files: ["./src/**/*.{ts,tsx}"] }
  ```

- **Legacy `rgba()` arbitrary shadow → v4 `rgb()` slash syntax**

  ```diff
  - shadow-[0_0_10px_rgba(0,0,0,0.2)]
  + shadow-[0_0_10px_rgb(0_0_0_/_0.2)]
  ```

These are surfaced through the report (`depshift-report.md`), `--json` output,
`--check` (CI gating), and `--write` (apply in place).

## What it does not support yet

DepShift does **not** perform a complete Tailwind v3 → v4 migration. Out of scope
today:

- Build pipeline / PostCSS / Vite configuration changes
- Theme configuration, plugin API changes, and removed/renamed utilities
- The many other breaking changes involved in a real v4 upgrade
- **React 19 migrations**
- **Broad framework migrations** (any non-Tailwind ecosystem upgrade)
- A **GitHub App** — not implemented
- **Billing** / paid features — not implemented
- **Auto-commit** / auto-opening fix PRs — not implemented

Anything outside the documented transform set is invisible to DepShift.

## Safety model

- **Report-only by default.** Without `--write`, DepShift only reads files and
  writes `depshift-report.md`. It never modifies your source in this mode.
- **`--write` only applies supported safe fixes** — the same transforms shown in
  report mode. It does not attempt risky or speculative edits, and it never
  touches patterns it does not explicitly support.
- **Changes are AST-based and deterministic.** The same input always yields the
  same output.
- **Always review diffs manually.** DepShift is an assistant, not a replacement
  for human review and testing.

## Expected false negatives

Because the supported set is intentionally narrow, DepShift will **miss many real
Tailwind v4 migration issues**. A clean DepShift report is *not* evidence that a
codebase is fully migrated — it only means the few supported patterns weren't
found. Expect to do additional migration work by hand and with other tools.

## Expected false positives

DepShift aims to be precise, but it may occasionally **flag code that needs human
review**. For example, a string that looks like a Tailwind class or a `content`
array in a config-shaped object might be matched even when the surrounding
context is unusual. Review each suggestion before accepting it, and please
[report false positives](https://github.com/kalfinio/depshift-tailwind/issues/new?template=false-positive.md)
so the matching can be tightened.

## Before using `--write`

`--write` edits files in place. Before running it:

1. Start from a clean working tree (commit or stash pending changes).
2. Run report-only mode first (`node dist/cli.js`) and skim `depshift-report.md`.
3. After `--write`, review the changes with `git diff`.
4. Run your own build and tests before committing or merging.

## Roadmap boundaries

The following remain explicitly out of scope for the current MVP and are not
planned for the near term: a GitHub App, billing, auto-commit / fix PRs, React 19
migrations, and broad framework migrations. See the README "Roadmap" for what may
come later. If something here is blocking you, please open an issue — see
[CONTRIBUTING.md](./CONTRIBUTING.md).
