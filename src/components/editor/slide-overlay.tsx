import type React from "react";
import type { SlideThemeElement } from "@/lib/slide";

// ── Canvas dimensions must match SlideViewer ─────────────────────────────────
const CANVAS_W = 960;
const CANVAS_H = 540;

// ── Position helper ───────────────────────────────────────────────────────────

type RectElement = Extract<SlideThemeElement, { type: "rect" }>;
type AlignableElement = Extract<SlideThemeElement, { type: "text" | "image" }>;
type ImageElement = Extract<SlideThemeElement, { type: "image" }>;

function applyRectStyle(el: RectElement, styles: React.CSSProperties): void {
  if (el.left !== undefined) {
    styles.left = el.left;
  }
  if (el.right !== undefined) {
    styles.right = el.right;
  }
  if (el.top !== undefined) {
    styles.top = el.top;
  }
  if (el.bottom !== undefined) {
    styles.bottom = el.bottom;
  }
  if (el.width !== undefined) {
    styles.width = el.width;
  } else if (el.left !== undefined && el.right !== undefined) {
    styles.width = CANVAS_W - el.left - el.right;
  }
  if (el.height !== undefined) {
    styles.height = el.height;
  } else if (el.top !== undefined && el.bottom !== undefined) {
    styles.height = CANVAS_H - el.top - el.bottom;
  }
}

function applyXPositioning(el: AlignableElement, styles: React.CSSProperties): void {
  if (el.centerX === true) {
    styles.left = "50%";
    styles.transform = "translateX(-50%)";
  } else {
    if (el.left !== undefined) {
      styles.left = el.left;
    }
    if (el.right !== undefined) {
      styles.right = el.right;
    }
  }
}

function applyYPositioning(el: AlignableElement, styles: React.CSSProperties): void {
  if (el.centerY === true) {
    styles.top = "50%";
    styles.transform = `${styles.transform !== undefined && styles.transform !== "" ? `${styles.transform} ` : ""}translateY(-50%)`;
  } else {
    if (el.top !== undefined) {
      styles.top = el.top;
    }
    if (el.bottom !== undefined) {
      styles.bottom = el.bottom;
    }
  }
}

function applyImageDimensions(el: ImageElement, styles: React.CSSProperties): void {
  if (el.width !== undefined) {
    styles.width = el.width;
  } else if (el.centerX !== true && el.left !== undefined && el.right !== undefined) {
    styles.width = CANVAS_W - el.left - el.right;
  }
  if (el.height !== undefined) {
    styles.height = el.height;
  } else if (el.centerY !== true && el.top !== undefined && el.bottom !== undefined) {
    styles.height = CANVAS_H - el.top - el.bottom;
  }
}

function computePositionStyle(el: SlideThemeElement): React.CSSProperties {
  const styles: React.CSSProperties = { position: "absolute" };

  if (el.type === "rect") {
    applyRectStyle(el, styles);
  }
  if (el.type === "text" || el.type === "image") {
    applyXPositioning(el, styles);
    applyYPositioning(el, styles);
  }
  if (el.type === "image") {
    applyImageDimensions(el, styles);
  }

  return styles;
}

// ── Template variable interpolation ──────────────────────────────────────────

function interpolate(
  template: string,
  vars: { slideNum: number; slideTotal: number; title: string },
  customVars?: Record<string, string>,
): string {
  let result = template
    .replaceAll("{{slideNum}}", String(vars.slideNum))
    .replaceAll("{{slideTotal}}", String(vars.slideTotal))
    .replaceAll("{{title}}", vars.title)
    .replaceAll(/\{\{date:(?<fmt>[^}]+)\}\}/gu, (_match, fmt: string) => {
      const now = new Date();
      return fmt
        .replaceAll("YYYY", String(now.getFullYear()))
        .replaceAll("MM", String(now.getMonth() + 1).padStart(2, "0"))
        .replaceAll("DD", String(now.getDate()).padStart(2, "0"));
    })
    .replaceAll("{{date}}", new Date().toISOString().slice(0, 10));
  if (customVars) {
    for (const [key, val] of Object.entries(customVars)) {
      result = result.replaceAll(`{{${key}}}`, val);
    }
  }
  return result;
}

// ── SVG dimension patcher ─────────────────────────────────────────────────────
// html2canvas renders <img src="...svg..."> at the SVG's own intrinsic size,
// ignoring CSS width/height, which crops the image to the top-left corner.
// Patching the SVG root's width/height attributes to match the display size
// before rendering tells html2canvas the correct raster dimensions.

function patchSvgDimensions(src: string, width?: number, height?: number): string {
  if (
    !src.startsWith("data:image/svg+xml;base64,") ||
    width === undefined ||
    height === undefined
  ) {
    return src;
  }
  try {
    const b64 = src.slice("data:image/svg+xml;base64,".length);
    let svg = atob(b64);
    svg = svg.replace(/<svg(?<attrs>[^>]*)>/iu, (_match, attrs: string) => {
      const cleaned = attrs
        .replaceAll(/\s+width="[^"]*"/gu, "")
        .replaceAll(/\s+height="[^"]*"/gu, "");
      return `<svg${cleaned} width="${String(width)}" height="${String(height)}">`;
    });
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  } catch {
    return src;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface SlideOverlayProps {
  elements: SlideThemeElement[];
  slideNum: number;
  total: number;
  title: string;
  /** User-defined theme variables from frontmatter (theme-var-* fields) */
  themeVars?: Record<string, string>;
}

export default function SlideOverlay({
  elements,
  slideNum,
  total,
  title,
  themeVars,
}: SlideOverlayProps): JSX.Element {
  return (
    <>
      {elements.map((el, idx) => {
        const posStyle = computePositionStyle(el);

        if (el.type === "rect") {
          return <div key={idx} style={{ background: el.fill, ...posStyle }} />;
        }

        if (el.type === "text") {
          const text = interpolate(el.content, { slideNum, slideTotal: total, title }, themeVars);
          return (
            <div
              key={idx}
              style={{
                color: el.color,
                fontSize: el.fontSize,
                fontWeight: el.bold === true ? "bold" : undefined,
                lineHeight: 1.2,
                textAlign: el.align,
                whiteSpace: "pre",
                ...posStyle,
              }}
            >
              {text}
            </div>
          );
        }

        // el.type === 'image' — only remaining union member
        return (
          <img
            key={idx}
            src={patchSvgDimensions(el.src, el.width, el.height)}
            alt=""
            style={{
              objectFit: "contain",
              objectPosition: "left center",
              opacity: el.opacity,
              ...posStyle,
            }}
          />
        );
      })}
    </>
  );
}

export { interpolate };
