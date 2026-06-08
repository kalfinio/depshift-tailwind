# Contributing to DepShift Tailwind

Thanks for your interest in improving DepShift Tailwind! This project is a small,
focused MVP (see [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md)), so the most
valuable contributions are **safe, narrow transforms** and clear bug/false-positive
reports.

If you're proposing a change before writing code, please open an issue first:

- [Request a transform](https://github.com/kalfinio/depshift-tailwind/issues/new?template=transform-request.md)
- [Report a bug](https://github.com/kalfinio/depshift-tailwind/issues/new?template=bug-report.md)
- [Report a false positive](https://github.com/kalfinio/depshift-tailwind/issues/new?template=false-positive.md)

## Prerequisites

- Node.js 18 or newer (CI uses Node 20)
- npm

## Install

```bash
npm install
```

## Run the tests

```bash
npm test
```

Tests run with [Vitest](https://vitest.dev/). Please keep the suite green.

## Build

```bash
npm run build
```

This type-checks the project and emits JavaScript to `dist/`. The build is strict
TypeScript — fix all type errors before opening a PR.

To try the CLI against the repo itself (or any local repo) while developing:

```bash
npm run dev            # runs src/cli.ts with tsx
# or, after building:
node dist/cli.js
```

## Adding a new transform (high level)

All transforms live in
[`src/transforms/tailwind3to4.ts`](./src/transforms/tailwind3to4.ts). At a high
level, a new transform should:

1. **Detect the pattern with the AST.** DepShift uses
   [ts-morph](https://ts-morph.com/). Walk the in-memory source file and match
   the specific node(s) you care about (e.g. a `PropertyAssignment`, a
   `StringLiteral`, a JSX attribute). Avoid blind text/regex replacement across
   whole files.
2. **Produce a `TransformSuggestion`.** Push an object with `filePath`,
   a unique `transformName`, the `before` text, the `after` text, and a short
   human-readable `message`. This is what report mode and `--json` surface.
3. **Support `--write` safely.** When the analysis runs in apply mode, perform
   the edit on the AST node so the same change can be written back to disk. Read
   how the existing two transforms thread the `apply` flag and keep their output
   deterministic.

You do **not** need to touch the scanner, report, or CLI for a typical new
transform — they consume the suggestions your transform emits.

### New transforms must include fixtures and tests

Every new transform must come with:

- **Fixtures** in
  [`src/transforms/__fixtures__/tailwindFixtures.ts`](./src/transforms/__fixtures__/tailwindFixtures.ts)
  — realistic before/after samples.
- **Tests** in
  [`src/transforms/tailwind3to4.test.ts`](./src/transforms/tailwind3to4.test.ts)
  covering: the pattern is detected, the `before`/`after` are correct, already-
  migrated code produces **no** suggestion, and no duplicate suggestions are
  emitted.

If your transform interacts with scanning or `--write`, add coverage in the
relevant `*.test.ts` as well.

### Transforms must be safe and narrow

DepShift's whole value is that its changes are trustworthy. A transform should:

- Be **safe**: only rewrite code when the result is unambiguously equivalent in
  Tailwind v4. When in doubt, report but do not auto-fix.
- Be **narrow**: match a specific, documented pattern. Prefer false negatives
  (missing a case) over false positives (changing something it shouldn't).
- Be **deterministic**: the same input always yields the same output and
  ordering.

If a migration can't be made safe and narrow, it's better to leave it as a
documented limitation than to ship a risky transform.

## Pull requests

- Keep PRs focused and small.
- Run `npm test` and `npm run build` before pushing.
- Update the README "Supported transforms" section when you add a transform.
- Do not add out-of-scope features (GitHub App, billing, auto-commit, broad
  framework migrations) — see [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md).
