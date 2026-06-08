# Known limitations

Please read this before relying on DepShift Tailwind for a migration.

## DepShift Tailwind is an MVP

DepShift Tailwind is an early, minimal tool. It is useful for catching a few
specific, well-understood Tailwind v3 → v4 patterns in pull requests — nothing
more. Treat its output as a helpful hint, not a guarantee.

## It does not fully migrate Tailwind v4

DepShift does **not** perform a complete Tailwind v3 → v4 migration. It will not
update your build pipeline, PostCSS/Vite setup, theme configuration, plugin
APIs, removed/renamed utilities, or the many other breaking changes involved in
a real v4 upgrade. Running DepShift and seeing "no suggestions" does **not** mean
your project is fully migrated.

## It only supports the currently documented transforms

DepShift only detects and fixes the transforms listed in the README under
"Supported transforms". Anything outside that small set is invisible to it.

## It may miss many real Tailwind v4 migration issues

Because the supported set is intentionally narrow, DepShift will miss most
real-world migration issues. A clean DepShift report is not evidence that a
codebase is v4-ready.

## `--write` only applies supported safe fixes

`--write` applies **only** the supported, safe transforms — the same ones shown
in report mode. It does not attempt risky or speculative edits, and it never
touches patterns it does not explicitly support.

## Review all changes manually

Always review DepShift's report and any `--write` changes yourself (e.g. via
`git diff`) before committing or merging. DepShift is an assistant, not a
replacement for human review and testing.

## Not implemented (by design, for now)

The following are intentionally **out of scope** for the current MVP:

- A GitHub App
- Billing or any paid features
- Auto-commit / auto-opening fix PRs
- Broad framework migrations (e.g. React or other ecosystem upgrades)

See the README "Roadmap" for what may come later. If something here is blocking
you, please open an issue — see [CONTRIBUTING.md](./CONTRIBUTING.md).
