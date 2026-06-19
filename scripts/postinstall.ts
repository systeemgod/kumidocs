/**
 * Postinstall patch for khroma ESM compatibility with Bun's dev bundler.
 *
 * Bun's dev HMR bundler (used when serving `src/index.html` via `bun --hot`)
 * cannot trace khroma's deep ESM re-export chain:
 *
 *   khroma/dist/index.js
 *     → export * from './methods/index.js'
 *       → import rgba from './rgba.js'
 *         → export { ... rgba ... }
 *
 * The `export { defaultImport }` pattern (default → named re-export) through
 * a re-export chain breaks Bun's named-export resolution, resulting in:
 *   TypeError: import_khromaN.rgba is not a function
 *
 * This patch replaces khroma/dist/index.js with direct re-exports from each
 * individual method file, eliminating the methods/index.js intermediary.
 *
 * The production build (scripts/build.ts → Bun.build()) does NOT need this
 * patch: Bun.build() traces exports correctly.
 */

import { join } from "node:path";
import { writeFileSync } from "node:fs";

const KHROMA_INDEX = join(import.meta.dir, "..", "node_modules", "khroma", "dist", "index.js");

const PATCHED = `/* PATCHED by scripts/postinstall.js: Bun dev bundler compat.
 * Original: export * from './methods/index.js'
 * Bun's HMR bundler cannot trace deep ESM re-exports through
 * the methods/index.js intermediary (default imports → named re-exports). */
export { default as adjust } from './methods/adjust.js';
export { default as alpha, default as opacity } from './methods/alpha.js';
export { default as blue } from './methods/blue.js';
export { default as change } from './methods/change.js';
export { default as channel } from './methods/channel.js';
export { default as complement } from './methods/complement.js';
export { default as contrast } from './methods/contrast.js';
export { default as darken } from './methods/darken.js';
export { default as desaturate } from './methods/desaturate.js';
export { default as grayscale } from './methods/grayscale.js';
export { default as green } from './methods/green.js';
export { default as hsla, default as hsl } from './methods/hsla.js';
export { default as hue } from './methods/hue.js';
export { default as invert } from './methods/invert.js';
export { default as isDark } from './methods/is_dark.js';
export { default as isLight } from './methods/is_light.js';
export { default as isTransparent } from './methods/is_transparent.js';
export { default as isValid } from './methods/is_valid.js';
export { default as lighten } from './methods/lighten.js';
export { default as lightness } from './methods/lightness.js';
export { default as luminance } from './methods/luminance.js';
export { default as mix } from './methods/mix.js';
export { default as opacify, default as fadeIn } from './methods/opacify.js';
export { default as red } from './methods/red.js';
export { default as rgba, default as hex, default as rgb } from './methods/rgba.js';
export { default as saturate } from './methods/saturate.js';
export { default as saturation } from './methods/saturation.js';
export { default as scale } from './methods/scale.js';
export { default as toHex } from './methods/to_hex.js';
export { default as toHsla } from './methods/to_hsla.js';
export { default as toKeyword } from './methods/to_keyword.js';
export { default as toRgba } from './methods/to_rgba.js';
export { default as transparentize, default as fadeOut } from './methods/transparentize.js';
`;

try {
  writeFileSync(KHROMA_INDEX, PATCHED, "utf8");
  console.log("[postinstall] Patched khroma/dist/index.js for Bun dev bundler compatibility");
} catch (error: unknown) {
  if (error instanceof Error && "code" in error && error.code === "ENOENT") {
    console.warn("[postinstall] khroma not installed; skipping patch");
  } else {
    console.error("[postinstall] Failed to patch khroma:", error);
  }
}
