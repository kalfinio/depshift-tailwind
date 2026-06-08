import { describe, expect, it } from "vitest";

import { analyzeTailwind3to4File } from "./tailwind3to4.js";
import {
  alreadyMigratedComponent,
  beforeCardComponent,
  beforeTailwindConfig,
  expectedClassAfter,
  expectedClassBefore,
  expectedContentAfter,
  expectedContentBefore,
  shadowInStringLiteral,
  shadowInTemplateLiteral,
  TRANSFORM_CONTENT_ARRAY,
  TRANSFORM_SHADOW_RGBA,
} from "./__fixtures__/tailwindFixtures.js";

describe("analyzeTailwind3to4File", () => {
  it("detects the content array -> { files: [...] } transform", () => {
    const suggestions = analyzeTailwind3to4File({
      filePath: "tailwind.config.ts",
      sourceText: beforeTailwindConfig,
    });

    const content = suggestions.filter(
      (s) => s.transformName === TRANSFORM_CONTENT_ARRAY,
    );

    expect(content).toHaveLength(1);
    expect(content[0]!.before).toBe(expectedContentBefore);
    expect(content[0]!.after).toBe(expectedContentAfter);
  });

  it("detects the arbitrary shadow transform inside a JSX className", () => {
    const suggestions = analyzeTailwind3to4File({
      filePath: "Card.tsx",
      sourceText: beforeCardComponent,
    });

    const shadow = suggestions.filter(
      (s) => s.transformName === TRANSFORM_SHADOW_RGBA,
    );

    expect(shadow).toHaveLength(1);
    expect(shadow[0]!.before).toBe(expectedClassBefore);
    expect(shadow[0]!.after).toBe(expectedClassAfter);
  });

  it("detects the arbitrary shadow transform inside a normal string literal", () => {
    const suggestions = analyzeTailwind3to4File({
      filePath: "styles.ts",
      sourceText: shadowInStringLiteral,
    });

    const shadow = suggestions.filter(
      (s) => s.transformName === TRANSFORM_SHADOW_RGBA,
    );

    expect(shadow).toHaveLength(1);
    expect(shadow[0]!.before).toBe(expectedClassBefore);
    expect(shadow[0]!.after).toBe(expectedClassAfter);
  });

  it("detects the arbitrary shadow transform inside a template literal", () => {
    const suggestions = analyzeTailwind3to4File({
      filePath: "styles.ts",
      sourceText: shadowInTemplateLiteral,
    });

    const shadow = suggestions.filter(
      (s) => s.transformName === TRANSFORM_SHADOW_RGBA,
    );

    expect(shadow).toHaveLength(1);
    expect(shadow[0]!.after).toBe(expectedClassAfter);
  });

  it("returns no suggestions for already-migrated code", () => {
    const suggestions = analyzeTailwind3to4File({
      filePath: "Card.tsx",
      sourceText: alreadyMigratedComponent,
    });

    expect(suggestions).toHaveLength(0);
  });

  it("does not duplicate suggestions for the same JSX className string", () => {
    const suggestions = analyzeTailwind3to4File({
      filePath: "Card.tsx",
      sourceText: beforeCardComponent,
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]!.transformName).toBe(TRANSFORM_SHADOW_RGBA);
  });
});
