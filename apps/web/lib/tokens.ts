// Re-export of token names that exist as Tailwind colors and CSS variables.
// Use Tailwind utilities such as `bg-canvas`, `text-text-p`, `border-border-s`.
// For dynamic style hooks (animations, computed values), reference the CSS
// var directly via `var(--green)` etc.

export const TOKEN_NAMES = [
  "canvas", "surface", "sunken",
  "border-s", "border-d", "border-st",
  "text-p", "text-s", "text-t",
  "green", "green-bg", "green-bd",
  "red",   "red-bg",   "red-bd",
  "amber", "amber-bg", "amber-bd",
  "slate", "slate-bg", "slate-bd",
] as const;

export type TokenName = (typeof TOKEN_NAMES)[number];

/** Resolve to `var(--token-name)` for inline styles. */
export const cssVar = (name: TokenName) => `var(--${name})`;
