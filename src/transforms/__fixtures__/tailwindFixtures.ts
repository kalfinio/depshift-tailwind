/**
 * Shared source-text fixtures and expected values used by the transform tests.
 * Keeping these in one place makes the before/after expectations easy to audit.
 */

/** A Tailwind config using the legacy v3 `content: [...]` array form. */
export const beforeTailwindConfig = `export default {
  content: ["./src/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"],
  theme: {
    extend: {}
  },
  plugins: []
};
`;

/** A component whose JSX className uses the legacy arbitrary rgba shadow. */
export const beforeCardComponent = `export function Card() {
  return (
    <div className="rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.2)] p-4">
      Hello
    </div>
  );
}
`;

/** The same legacy shadow class, but inside a plain string literal. */
export const shadowInStringLiteral = `const cls = "rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.2)] p-4";
`;

/** The same legacy shadow class, but inside a no-substitution template. */
export const shadowInTemplateLiteral = "const cls = `rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.2)] p-4`;\n";

/** A component that is already on the v4 shadow syntax (no suggestions). */
export const alreadyMigratedComponent = `export function Card() {
  return (
    <div className="rounded-xl shadow-[0_0_10px_rgb(0_0_0_/_0.2)] p-4">
      Hello
    </div>
  );
}
`;

/** Expected before/after for the content-array transform. */
export const expectedContentBefore =
  'content: ["./src/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"]';
export const expectedContentAfter =
  'content: { files: ["./src/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"] }';

/** Expected before/after for the arbitrary shadow class transform. */
export const expectedClassBefore = "rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.2)] p-4";
export const expectedClassAfter = "rounded-xl shadow-[0_0_10px_rgb(0_0_0_/_0.2)] p-4";

export const TRANSFORM_CONTENT_ARRAY = "tailwind-config-content-array-to-object";
export const TRANSFORM_SHADOW_RGBA = "tailwind-arbitrary-shadow-rgba-to-rgb";
