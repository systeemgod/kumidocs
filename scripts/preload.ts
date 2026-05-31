/**
 * Preload script — registers bun-plugin-tailwind for dev mode.
 *
 * Bun's `--hot` dev server processes src/index.html on-the-fly.
 * This script registers the Tailwind CSS v4 plugin so that
 * @import 'tailwindcss' and @apply directives are compiled.
 *
 * Configured in bunfig.toml via:
 *   preload = ["./scripts/preload.ts"]
 */
import tailwindPlugin from "bun-plugin-tailwind";

Bun.plugin(tailwindPlugin);
