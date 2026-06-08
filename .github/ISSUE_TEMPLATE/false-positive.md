---
name: False positive
about: Report code DepShift flagged (or would change) that it should not have
title: "[false-positive] "
labels: ["false-positive"]
---

Thanks for helping keep DepShift safe and narrow! False positives are important —
DepShift should prefer missing a case over changing something it shouldn't.

## File / pattern detected

<!-- Which file and which transform/pattern was flagged? Include the
transformName from the report or --json output if you have it. -->

## Why it should not be flagged

<!-- Explain why this code is already correct, or why the suggested change would
be wrong or unsafe in this context. -->

## "Before" code

```tsx
// paste the exact code DepShift flagged
```

## Expected behavior

<!-- What DepShift should do instead (e.g. "leave this unchanged", "only match
when ..."). -->
