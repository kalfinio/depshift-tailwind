---
name: Transform request
about: Suggest a new Tailwind v3 → v4 transform DepShift should support
title: "[transform] "
labels: ["transform-request"]
---

Thanks for suggesting a transform! Please fill in as much as you can. DepShift
only ships **safe, narrow** transforms, so the more precise this is, the better.

## Tailwind v3 pattern

<!-- The v3 syntax/pattern that should be detected. -->

## Tailwind v4 expected output

<!-- What the pattern should become in Tailwind v4. -->

## Example "before" code

```tsx
// paste a minimal v3 example here
```

## Example "after" code

```tsx
// paste the expected v4 result here
```

## Is this migration always safe?

<!--
Is the rewrite ALWAYS equivalent in v4, or only under certain conditions?
List any cases where it would be unsafe or ambiguous. DepShift prefers to skip
risky cases rather than auto-fix them.
-->

## Links to Tailwind docs (if available)

<!-- Links to the Tailwind v3/v4 upgrade guide or relevant docs that confirm the change. -->
