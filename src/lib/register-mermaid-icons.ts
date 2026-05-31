/**
 * Mermaid Icon Pack Registration
 *
 * Registers Iconify icon packs with Mermaid so architecture diagrams
 * can use icon prefixes like `logos:*`, `devicon:*`, `flag:*`,
 * `fluent-color:*`, and `glyphs-poly:*` — all embedded at build time.
 *
 * Usage: call once at app startup (client-side only):
 *   import { registerMermaidIcons } from "@/lib/register-mermaid-icons";
 *   registerMermaidIcons();
 *
 * No CDN fetches — icons are bundled via npm packages.
 */

// ── Icon pack imports (bundled at build time) ───────────────────────────
// Each @iconify-json/* package exports a JSON file with the Iconify schema:
//   { prefix: string, icons: Record<string, IconifyIcon>, ... }
import deviconIcons from "@iconify-json/devicon/icons.json";
import flagIcons from "@iconify-json/flag/icons.json";
import fluentColorIcons from "@iconify-json/fluent-color/icons.json";
import glyphsPolyIcons from "@iconify-json/glyphs-poly/icons.json";
import logosIcons from "@iconify-json/logos/icons.json";

/** Shape of an Iconify JSON collection. */
interface IconifyJSON {
  prefix: string;
  icons: Record<string, { body: string }>;
}

/**
 * Register all icon packs with Mermaid.
 * Safe to call multiple times — Mermaid deduplicates by prefix.
 * Must be called on the client (browser) only.
 */
export async function registerMermaidIcons(): Promise<void> {
  // Mermaid's module only exports `default` — dynamic import gives us
  // { default: mermaid }, so we need `.default.registerIconPacks`.
  // We also try `registerIconPacks` directly in case the bundler
  // flattens the module differently (dev vs production).
  try {
    const mod = await import("mermaid");
    const mermaid =
      (
        mod as {
          default?: { registerIconPacks: (packs: unknown[]) => void };
          registerIconPacks?: (packs: unknown[]) => void;
        }
      ).default ?? mod;

    if (typeof mermaid.registerIconPacks !== "function") {
      console.warn("[kumidocs] Mermaid registerIconPacks not available");
      return;
    }

    mermaid.registerIconPacks([
      {
        name: "devicon",
        icons: deviconIcons as unknown as IconifyJSON,
      },
      {
        name: "flag",
        icons: flagIcons as unknown as IconifyJSON,
      },
      {
        name: "fluent-color",
        icons: fluentColorIcons as unknown as IconifyJSON,
      },
      {
        name: "glyphs-poly",
        icons: glyphsPolyIcons as unknown as IconifyJSON,
      },
      {
        name: "logos",
        icons: logosIcons as unknown as IconifyJSON,
      },
    ]);

    console.debug(
      `[kumidocs] Mermaid icons registered: ` +
        `devicon (${Object.keys(deviconIcons.icons ?? {}).length}), ` +
        `flag (${Object.keys(flagIcons.icons ?? {}).length}), ` +
        `fluent-color (${Object.keys(fluentColorIcons.icons ?? {}).length}), ` +
        `glyphs-poly (${Object.keys(glyphsPolyIcons.icons ?? {}).length}), ` +
        `logos (${Object.keys(logosIcons.icons ?? {}).length})`,
    );
  } catch (error: unknown) {
    console.warn("[kumidocs] Failed to register Mermaid icon packs:", error);
  }
}
