/**
 * Mermaid Icon Pack Registration
 *
 * Registers Iconify icon packs with Mermaid so architecture diagrams
 * can use `logos:*`, `skill-icons:*`, `devicon:*`, `mdi:*`, and
 * `simple-icons:*` icon prefixes — all embedded at build time.
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
import logosIcons from "@iconify-json/logos/icons.json";
import skillIcons from "@iconify-json/skill-icons/icons.json";
import deviconIcons from "@iconify-json/devicon/icons.json";
import mdiIcons from "@iconify-json/mdi/icons.json";
import simpleIcons from "@iconify-json/simple-icons/icons.json";

/** Shape of an Iconify JSON collection. */
interface IconifyJSON {
  prefix: string;
  icons: Record<string, { body: string }>;
}

/**
 * Register all icon packs with Mermaid.
 * Safe to call multiple times — Mermaid deduplicates by prefix.
 * Must be called on the client (browser) — uses dynamic import of mermaid
 * to avoid pulling it into the server bundle.
 */
export async function registerMermaidIcons(): Promise<void> {
  try {
    const mermaid = await import("mermaid");

    mermaid.registerIconPacks([
      {
        name: "logos",
        icons: logosIcons as unknown as IconifyJSON,
      },
      {
        name: "skill-icons",
        icons: skillIcons as unknown as IconifyJSON,
      },
      {
        name: "devicon",
        icons: deviconIcons as unknown as IconifyJSON,
      },
      {
        name: "mdi",
        icons: mdiIcons as unknown as IconifyJSON,
      },
      {
        name: "simple-icons",
        icons: simpleIcons as unknown as IconifyJSON,
      },
    ]);

    console.debug(
      `[kumidocs] Mermaid icons: logos (${Object.keys(logosIcons.icons ?? {}).length}), ` +
        `skill-icons (${Object.keys(skillIcons.icons ?? {}).length}), ` +
        `devicon (${Object.keys(deviconIcons.icons ?? {}).length}), ` +
        `mdi (${Object.keys(mdiIcons.icons ?? {}).length}), ` +
        `simple-icons (${Object.keys(simpleIcons.icons ?? {}).length})`,
    );
  } catch (error: unknown) {
    console.warn("[kumidocs] Failed to register Mermaid icon packs:", error);
  }
}
