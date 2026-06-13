import type { SlideDirectives, SlideThemeDef } from "@/lib/slide";
import type { jsPDF as JsPDF } from "jspdf";

function overlaySelectableLayer(pdf: JsPDF, root: HTMLElement): void {
  const rootRect = root.getBoundingClientRect();

  // Invisible text
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = (node.textContent ?? "").replaceAll(/\s+/gu, " ").trim();
    if (!text || !node.parentElement) {
      continue;
    }
    // Skip text nodes inside SVG (rendered as vector paths, not text)
    let ancestor: Element | null = node.parentElement;
    let inSvg = false;
    while (ancestor) {
      if (ancestor.tagName.toLowerCase() === "svg") {
        inSvg = true;
        break;
      }
      ancestor = ancestor.parentElement;
    }
    if (inSvg) {
      continue;
    }
    const range = document.createRange();
    range.selectNode(node);
    const br = range.getBoundingClientRect();
    if (br.width <= 0 || br.height <= 0) {
      continue;
    }
    const fsPx = Number.parseFloat(window.getComputedStyle(node.parentElement).fontSize);
    pdf.setFontSize(Number.isNaN(fsPx) ? 12 : fsPx);
    // Stretch/compress char spacing so the invisible text spans the same
    // pixel width as the actual DOM render, compensating for font differences.
    const pdfWidth = pdf.getTextWidth(text);
    const charSpace = text.length > 1 ? (br.width - pdfWidth) / (text.length - 1) : 0;
    pdf.setCharSpace(charSpace);
    pdf.text(text, br.left - rootRect.left, br.top - rootRect.top, {
      baseline: "top",
      renderingMode: "invisible",
    });
    pdf.setCharSpace(0);
  }

  // Link hotspots
  for (const anchor of root.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    const rect = anchor.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      continue;
    }
    const xPos = rect.left - rootRect.left;
    const yPos = rect.top - rootRect.top;
    if (xPos < 0 || yPos < 0) {
      continue;
    }
    pdf.link(xPos, yPos, rect.width, rect.height, { url: anchor.href });
  }
}

// ── Slide parsing ─────────────────────────────────────────────────────────────

/**
 * Split markdown content into individual slides on `---` separator lines.
 * Lines inside fenced code blocks (``` or ~~~) are never treated as separators.
 */
function splitSlides(content: string): string[] {
  const slides: string[] = [];
  let current: string[] = [];
  let fence: string | undefined;
  for (const line of content.split("\n")) {
    const trimmed = line.trimStart();
    if (fence === undefined) {
      const match = /^(?<fence>`{3,}|~{3,})/u.exec(trimmed);
      if (match) {
        // Opening a fenced code block — capture the fence character string
        fence = match[1] ?? "```";
        current.push(line);
        continue;
      }
      // Only treat bare `---` as a slide separator when outside a code fence
      if (line.trim() === "---") {
        slides.push(current.join("\n").trim());
        current = [];
        continue;
      }
    } else {
      // Inside a fence — check if this line closes it
      const closeRe = new RegExp(`^${fence[0] ?? "`"}{${String(fence.length)},}\\s*$`, "u");
      if (closeRe.test(trimmed)) {
        fence = undefined;
      }
    }
    current.push(line);
  }
  slides.push(current.join("\n").trim());
  return slides.filter((slide) => slide.length > 0);
}

// ── Slide canvas size ─────────────────────────────────────────────────────────
const SLIDE_W = 960;
const SLIDE_H = 540;

// ── Canvas style builder ──────────────────────────────────────────────────────

function buildCanvasStyle(
  resolvedTheme: Omit<SlideThemeDef, "layouts"> | undefined,
  directives: SlideDirectives,
): React.CSSProperties {
  const style: React.CSSProperties = {};

  // 1. Theme-level background defaults
  if (resolvedTheme?.bg !== undefined && resolvedTheme.bg !== "") {
    style.background = resolvedTheme.bg;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
    style.backgroundRepeat = "no-repeat";
  }
  if (resolvedTheme?.fg !== undefined && resolvedTheme.fg !== "") {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    (style as Record<string, unknown>)["--slide-fg"] = resolvedTheme.fg;
  }
  if (resolvedTheme?.fontFamily !== undefined && resolvedTheme.fontFamily !== "") {
    style.fontFamily = resolvedTheme.fontFamily;
  }

  // 2. Per-slide individual background-* directives override specific properties
  if (directives.backgroundColor !== undefined) {
    style.backgroundColor = directives.backgroundColor as React.CSSProperties["backgroundColor"];
  }
  if (directives.backgroundImage !== undefined) {
    style.backgroundImage = directives.backgroundImage as React.CSSProperties["backgroundImage"];
  }
  if (directives.backgroundPosition !== undefined) {
    style.backgroundPosition =
      directives.backgroundPosition as React.CSSProperties["backgroundPosition"];
  }
  if (directives.backgroundRepeat !== undefined) {
    style.backgroundRepeat = directives.backgroundRepeat as React.CSSProperties["backgroundRepeat"];
  }
  if (directives.backgroundSize !== undefined) {
    style.backgroundSize = directives.backgroundSize as React.CSSProperties["backgroundSize"];
  }

  // 3. Per-slide `background` shorthand overrides ALL background properties
  if (directives.background !== undefined && directives.background !== "") {
    style.background = directives.background as React.CSSProperties["background"];
  }

  // 4. Per-slide background filter
  if (directives.backgroundFilter !== undefined) {
    style.filter = directives.backgroundFilter as React.CSSProperties["filter"];
  }

  return style;
}

// ── Component ─────────────────────────────────────────────────────────────────
/**
 * Renders a single 960×540 slide canvas, scaled to `scale` and optionally
 * showing a slide number badge.  Theme and per-slide directives are both applied.
 */

export { overlaySelectableLayer, splitSlides, buildCanvasStyle, SLIDE_W, SLIDE_H };
