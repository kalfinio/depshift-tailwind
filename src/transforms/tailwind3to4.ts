import { Node, Project, SyntaxKind, ts } from "ts-morph";

/**
 * A single suggested, non-destructive change. Nothing is written to disk;
 * `before`/`after` are shown to the user in the report.
 */
export type TransformSuggestion = {
  filePath: string;
  transformName: string;
  before: string;
  after: string;
  message: string;
};

export type TransformFileResult = {
  suggestions: TransformSuggestion[];
  outputText: string;
  modified: boolean;
};

const TRANSFORM_CONTENT_ARRAY = "tailwind-config-content-array-to-object";
const TRANSFORM_SHADOW_RGBA = "tailwind-arbitrary-shadow-rgba-to-rgb";

/**
 * Analyzes a single source file's text for safe Tailwind v3 -> v4 migrations.
 *
 * Two detections are implemented:
 *  1. `content: [...]` in a Tailwind config -> `content: { files: [...] }`
 *  2. legacy arbitrary shadow classes using `rgba(r,g,b,a)` ->
 *     the v4 color syntax `rgb(r_g_b_/_a)` inside `shadow-[...]`
 *
 * All work happens on an in-memory ts-morph source file. The real file on disk
 * is never read or written here, and the in-memory file is never saved.
 */
export function analyzeTailwind3to4File(input: {
  filePath: string;
  sourceText: string;
}): TransformSuggestion[] {
  return transformTailwind3to4File({ ...input, apply: false }).suggestions;
}

/**
 * Applies the currently supported safe transforms to a single file's source
 * text using ts-morph AST edits. The caller decides whether to write
 * `outputText` to disk.
 */
export function applyTailwind3to4File(input: {
  filePath: string;
  sourceText: string;
}): TransformFileResult {
  return transformTailwind3to4File({ ...input, apply: true });
}

function transformTailwind3to4File(input: {
  filePath: string;
  sourceText: string;
  apply: boolean;
}): TransformFileResult {
  const { filePath, sourceText } = input;

  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, allowJs: true },
  });

  // Always parse as .tsx so JSX is understood; plain TS/JS object literals
  // (Tailwind configs) parse fine under .tsx as well.
  const sourceFile = project.createSourceFile("__depshift_source__.tsx", sourceText, {
    overwrite: true,
  });

  // Collect/apply class-string suggestions first, before config AST mutation
  // can shift node positions in files that contain both patterns.
  const classSuggestions = collectShadowSuggestions(sourceFile, filePath, input.apply);
  const configSuggestions = collectContentArraySuggestions(sourceFile, filePath);

  const outputText = input.apply ? sourceFile.getFullText() : sourceText;

  // Config suggestions first, then class suggestions: deterministic ordering.
  return {
    suggestions: [...configSuggestions, ...classSuggestions],
    outputText,
    modified: outputText !== sourceText,
  };
}

/**
 * Finds `content: [ ... ]` property assignments and suggests wrapping the
 * array in `{ files: [ ... ] }`. Uses ts-morph AST manipulation to produce the
 * "after" text on the in-memory tree and, in write mode, the output text.
 */
function collectContentArraySuggestions(
  sourceFile: ReturnType<Project["createSourceFile"]>,
  filePath: string,
): TransformSuggestion[] {
  const suggestions: TransformSuggestion[] = [];

  const propertyAssignments = sourceFile.getDescendantsOfKind(
    SyntaxKind.PropertyAssignment,
  );

  for (const prop of propertyAssignments) {
    if (prop.getName() !== "content") {
      continue;
    }

    const initializer = prop.getInitializer();
    if (!initializer || !Node.isArrayLiteralExpression(initializer)) {
      continue;
    }

    const arrayText = initializer.getText();
    const before = prop.getText();

    // Real AST node manipulation on the in-memory tree.
    prop.setInitializer(`{ files: ${arrayText} }`);
    const after = prop.getText();

    suggestions.push({
      filePath,
      transformName: TRANSFORM_CONTENT_ARRAY,
      before,
      after,
      message:
        "Tailwind v4 prefers the object form for `content`. Wrap the array in `{ files: [...] }`.",
    });
  }

  return suggestions;
}

/**
 * Finds string-like nodes (string literals and no-substitution template
 * literals, which also cover JSX `className`/`class` string attributes) and
 * suggests rewriting legacy `rgba(...)` arbitrary shadow values to the v4
 * `rgb(... / ...)` color syntax.
 *
 * Each node is processed at most once (tracked by start position) so a JSX
 * className string is never reported twice.
 */
function collectShadowSuggestions(
  sourceFile: ReturnType<Project["createSourceFile"]>,
  filePath: string,
  apply: boolean,
): TransformSuggestion[] {
  const suggestions: TransformSuggestion[] = [];
  const seenStarts = new Set<number>();

  sourceFile.forEachDescendant((node) => {
    if (
      !Node.isStringLiteral(node) &&
      !Node.isNoSubstitutionTemplateLiteral(node)
    ) {
      return;
    }

    const start = node.getStart();
    if (seenStarts.has(start)) {
      return;
    }

    const value = node.getLiteralText();
    const transformed = transformShadowClassString(value);
    if (transformed === null || transformed === value) {
      return;
    }

    seenStarts.add(start);
    suggestions.push({
      filePath,
      transformName: TRANSFORM_SHADOW_RGBA,
      before: value,
      after: transformed,
      message:
        "Legacy `rgba(r,g,b,a)` in an arbitrary `shadow-[...]` class. Tailwind v4 uses the `rgb(r g b / a)` color syntax (underscores inside arbitrary values).",
    });

    if (apply) {
      node.setLiteralValue(transformed);
    }
  });

  return suggestions;
}

const SHADOW_ARBITRARY = /shadow-\[([^\]]+)\]/g;
const RGBA_CALL = /rgba\(([^)]+)\)/g;

/**
 * Rewrites `rgba(r,g,b,a)` to `rgb(r_g_b_/_a)` inside any `shadow-[...]`
 * arbitrary value found in the given class string. Returns the rewritten
 * string, or `null` if nothing matched / changed.
 */
export function transformShadowClassString(classString: string): string | null {
  let changed = false;

  const result = classString.replace(SHADOW_ARBITRARY, (full, inner: string) => {
    const newInner = inner.replace(RGBA_CALL, (match, args: string) => {
      const parts = args.split(",").map((p) => p.trim());
      if (parts.length !== 4) {
        return match;
      }
      const [r, g, b, a] = parts;
      changed = true;
      return `rgb(${r}_${g}_${b}_/_${a})`;
    });
    return `shadow-[${newInner}]`;
  });

  return changed ? result : null;
}
