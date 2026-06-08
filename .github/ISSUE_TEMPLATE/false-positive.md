---
name: False positive
about: Report code that DepShift flagged incorrectly
title: "[False positive]: "
labels: false-positive
assignees: ""
---

Thanks for helping keep DepShift safe and narrow! False positives are important —
DepShift should prefer missing a case over changing something it shouldn't.

## File type

<!-- e.g. tailwind.config.ts, a .tsx component, a .ts module. -->

## Detected transform name

<!-- The `transformName` from the report or `--json` output, e.g.
tailwind-config-content-array-to-object or tailwind-arbitrary-shadow-rgba-to-rgb. -->

## Flagged code

```tsx
// paste the exact code DepShift flagged
```

## Why it should not be flagged

<!-- Explain why this code is already correct, or why the suggested change would
be wrong or unsafe in this context. -->

## Expected behavior

<!-- What DepShift should do instead (e.g. "leave this unchanged", "only match
when ..."). -->

## Did `--write` change anything incorrectly?

<!-- If you ran `--write`, what did it change, and what should it have done? If
you only ran report-only/`--check`, say so. -->
