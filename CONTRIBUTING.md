# Contributing to DepShift Tailwind

Thanks for your interest in improving DepShift Tailwind! The most valuable
contributions are **safe, narrow Tailwind v3 → v4 transforms** and clear
bug / false-positive reports.

If you'd like to propose something before writing code, open an issue first:

- [Request a transform](https://github.com/kalfinio/depshift-tailwind/issues/new?template=transform-request.md)
- [Report a bug](https://github.com/kalfinio/depshift-tailwind/issues/new?template=bug-report.md)
- [Report a false positive](https://github.com/kalfinio/depshift-tailwind/issues/new?template=false-positive.md)

## Project status

**DepShift Tailwind is not a full Tailwind v4 migration tool yet.** It is an MVP
with a small, deliberately safe transform set. It catches a few specific,
well-understood patterns — it does not perform a complete v4 migration and will
miss many real migration issues. See
[KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md) for the full picture. Contributions
that keep this safe, focused character are very welcome.

## Local setup

Requires Node.js 18 or newer (CI uses Node 20) and npm.

```bash
npm install
npm test
npm run build
```

## Useful commands

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies. |
| `npm test` | Run the [Vitest](https://vitest.dev/) suite once. |
| `npm run build` | Type-check (strict) and emit JavaScript to `dist/`. |
| `npm run dev` | Run `src/cli.ts` directly with `tsx` (no build step). |

## How to run the CLI locally

After `npm run build`, run the compiled CLI from the root of the repo you want to
scan:

```bash
node dist/cli.js               # report-only: write depshift-report.md, change nothing
node dist/cli.js --check       # CI mode: exit 1 if any suggestions are found
node dist/cli.js --write       # apply the supported safe transforms in place
node dist/cli.js --json        # print structured JSON to stdout
node dist/cli.js --check --json   # check mode + JSON (exit 1 on suggestions)
```

During development you can skip the build and use `npm run dev` instead of
`node dist/cli.js`.

## How transforms are organized

- **`src/transforms/tailwind3to4.ts`** — all transforms live here. It exposes
  `analyzeTailwind3to4File` (report-only) and `applyTailwind3to4File` (`--write`),
  both backed by one ts-morph pass over an in-memory source file. Each detection
  emits a `TransformSuggestion` (`filePath`, `transformName`, `before`, `after`,
  `message`).
- **`src/transforms/__fixtures__/tailwindFixtures.ts`** — shared before/after
  sample source used by the tests.
- **`src/transforms/tailwind3to4.test.ts`** — Vitest coverage for each transform.
- **`src/scanner.ts`, `src/report.ts`, `src/cliCore.ts`** — consume the
  suggestions your transform emits. A typical new transform does **not** need to
  touch these.

## How to add a new transform

1. **Detect the pattern with the AST.** Walk the in-memory ts-morph source file
   and match the specific node(s) you care about (e.g. a `PropertyAssignment`, a
   `StringLiteral`, a JSX attribute). Avoid blind text/regex replacement across
   whole files.
2. **Emit a `TransformSuggestion`.** Push an object with `filePath`, a unique
   `transformName`, the `before` text, the `after` text, and a short
   human-readable `message`. This is what report mode and `--json` surface.
3. **Support `--write` safely.** When the analysis runs in apply mode, perform
   the edit on the AST node so the same change can be written back to disk. Follow
   how the two existing transforms thread the `apply` flag and keep output
   deterministic.
4. **Add fixtures and tests** (see Testing expectations) and update the README
   "Supported transforms" section.

## Safety rules for transforms

DepShift's value is that its changes are trustworthy. Every transform must:

- **Be narrow and safe.** Match a specific, documented pattern and only rewrite
  code when the result is unambiguously equivalent in Tailwind v4. When in doubt,
  report but do not auto-fix. Prefer false negatives (missing a case) over false
  positives (changing something it shouldn't).
- **Avoid broad, risky rewrites.** Do not ship sweeping or speculative edits. If
  a migration can't be made safe and narrow, leave it as a documented limitation.
- **Never modify files in the default (report-only) mode.** Without `--write`,
  DepShift must only read files and produce `depshift-report.md`.
- **Keep `--write` limited to supported safe transforms.** `--write` applies only
  the same documented transforms shown in report mode — nothing speculative.

## Testing expectations

- **Every transform needs before/after fixtures** in
  `src/transforms/__fixtures__/tailwindFixtures.ts`.
- **Every transform needs Vitest coverage** in
  `src/transforms/tailwind3to4.test.ts` that asserts: the pattern is detected,
  the `before`/`after` values are correct, already-migrated code produces **no**
  suggestion, and no duplicate suggestions are emitted.
- If your transform affects scanning or `--write`, add coverage in the relevant
  `*.test.ts` (e.g. `src/scanner.test.ts`, `src/cliCore.test.ts`).
- Keep the whole suite green: `npm test` must pass before you open a PR.

## Pull request checklist

- [ ] `npm test` passes.
- [ ] `npm run build` passes (no TypeScript errors).
- [ ] New/changed transforms include before/after fixtures and Vitest coverage.
- [ ] Transforms are narrow, safe, and deterministic — no broad risky rewrites.
- [ ] Default report-only mode does not modify files; `--write` only applies
      supported safe transforms.
- [ ] README "Supported transforms" updated if you added a transform.
- [ ] No out-of-scope features (GitHub App, billing, auto-commit, broad framework
      migrations) — see [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md).
