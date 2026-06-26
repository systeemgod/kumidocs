import type { CSSProperties } from "react";
import { resolveMargin } from "@/lib/page";
import type { PageTemplateDef } from "@/lib/page";
import type { SlideThemeElement } from "@/lib/slide";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "@/components/ui/toaster";
import MarkdownViewer from "@/components/editor/markdown/viewer";
import { useCallback, useRef } from "react";

// A4 dimensions at 96dpi: 794 x 1123 px
const A4_W = 794;
const A4_H = 1123;

interface PageViewerProps {
  value: string;
  template: PageTemplateDef;
  /** Page title for variable substitution. */
  title: string;
  /** Custom page vars from frontmatter pageVars field. */
  pageVars?: Record<string, string>;
}

// Position helper for template elements (using A4 canvas sizing)

const PAGE_CANVAS_W = A4_W;
const PAGE_CANVAS_H = A4_H;

type RectElement = Extract<SlideThemeElement, { type: "rect" }>;
type AlignableElement = Extract<SlideThemeElement, { type: "text" | "image" }>;
type ImageElement = Extract<SlideThemeElement, { type: "image" }>;
type AnyElement = SlideThemeElement;

function applyRectStyle(el: RectElement, styles: CSSProperties): void {
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
    styles.width = PAGE_CANVAS_W - el.left - el.right;
  }
  if (el.height !== undefined) {
    styles.height = el.height;
  } else if (el.top !== undefined && el.bottom !== undefined) {
    styles.height = PAGE_CANVAS_H - el.top - el.bottom;
  }
}

function applyXPositioning(el: AlignableElement, styles: CSSProperties): void {
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

function applyYPositioning(el: AlignableElement, styles: CSSProperties): void {
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

function applyImageDimensions(el: ImageElement, styles: CSSProperties): void {
  if (el.width !== undefined) {
    styles.width = el.width;
  } else if (el.centerX !== true && el.left !== undefined && el.right !== undefined) {
    styles.width = PAGE_CANVAS_W - el.left - el.right;
  }
  if (el.height !== undefined) {
    styles.height = el.height;
  } else if (el.centerY !== true && el.top !== undefined && el.bottom !== undefined) {
    styles.height = PAGE_CANVAS_H - el.top - el.bottom;
  } else if (el.width !== undefined && el.height === undefined) {
    styles.height = el.width;
  }
}

function computeElementStyle(el: AnyElement): CSSProperties {
  const styles: CSSProperties = { position: "absolute" };

  if (el.type === "rect") {
    applyRectStyle(el, styles);
  } else if (el.type === "text" || el.type === "image") {
    applyXPositioning(el, styles);
    applyYPositioning(el, styles);
    if (el.type === "image") {
      applyImageDimensions(el, styles);
    }
  }

  return styles;
}

/** Template variables available for interpolation in element content. */
function buildTemplateVars(
  title: string,
  pageVars?: Record<string, string>,
): Record<string, string> {
  const vars: Record<string, string> = {
    date: new Date().toISOString().slice(0, 10),
    title,
  };
  if (pageVars) {
    for (const [key, val] of Object.entries(pageVars)) {
      vars[key] = val;
    }
  }
  return vars;
}

/** Interpolate a template string with the given variables. */
function interp(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, val);
  }
  return result;
}

export default function PageViewer({
  value,
  template,
  title,
  pageVars,
}: PageViewerProps): JSX.Element {
  const pageRef = useRef<HTMLDivElement>(null);
  const margin = resolveMargin(template.margin);
  const vars = buildTemplateVars(title, pageVars);

  // Content area inline style
  const contentStyle: CSSProperties = {
    color: template.fg ?? "inherit",
    fontFamily: template.fontFamily ?? undefined,
    margin: `${margin.top}px ${margin.right}px ${margin.bottom}px ${margin.left}px`,
  };

  // Background style for the page canvas
  const bgStyle: CSSProperties = {};
  if (template.bg !== undefined && template.bg !== "") {
    bgStyle.backgroundColor = template.bg;
  }

  const handleCopyHtml = useCallback(async () => {
    if (!pageRef.current) {
      return;
    }
    try {
      // Clone the page to avoid mutating the live DOM
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      const clone = pageRef.current.cloneNode(true) as HTMLElement;

      // Remove emoji images (large data URIs) and replace with alt text
      const emojiImages = clone.querySelectorAll('img[src^="data:image/svg+xml;base64"]');
      for (const img of emojiImages) {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        const el = img as HTMLElement;
        const alt = el.getAttribute("alt") ?? "";
        el.replaceWith(document.createTextNode(alt));
      }

      // Get computed styles for every element and inline them
      const allElements = clone.querySelectorAll("*");
      for (const el of allElements) {
        const computed = window.getComputedStyle(el);
        // Inline the most important text/style properties
        const props = [
          "color",
          "font-family",
          "font-size",
          "font-weight",
          "line-height",
          "text-align",
          "margin",
          "padding",
          "background-color",
          "background",
          "border",
          "display",
          "width",
          "height",
          "position",
          "top",
          "right",
          "bottom",
          "left",
          "transform",
          "object-fit",
        ];
        for (const prop of props) {
          const val = computed.getPropertyValue(prop);
          if (val !== undefined && val !== "" && val !== "none") {
            // oxlint-disable-next-line typescript/no-unsafe-type-assertion
            (el as HTMLElement).style.setProperty(prop, val);
          }
        }
      }

      const rawHtml = clone.outerHTML;

      // Dynamic import juice for CSS inlining
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      const juiceMod = (await import("juice")) as {
        default: (html: string, opts?: Record<string, unknown>) => string;
      };
      const inlined = juiceMod.default(rawHtml, {
        applyHeightAttributes: true,
        applyStyleTags: true,
        applyWidthAttributes: true,
        extraCss:
          "\n          body { margin: 0; padding: 0; }\n          * { box-sizing: border-box; }\n        ",
        preserveKeyFrames: false,
        removeStyleTags: true,
      });

      await navigator.clipboard.writeText(inlined);
      toast.success("HTML copied to clipboard");
    } catch (error: unknown) {
      toast.error("Failed to copy HTML");
      console.error("Copy HTML failed:", error);
    }
  }, []);

  const elements = template.elements ?? [];

  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={handleCopyHtml}>
          <Copy className="size-3.5 mr-1.5" />
          Copy as HTML
        </Button>
      </div>

      {/* A4 page canvas */}
      <div
        ref={pageRef}
        style={{
          boxShadow: "0 2px 16px rgba(0,0,0,0.12)",
          minHeight: A4_H,
          overflow: "hidden",
          position: "relative",
          width: A4_W,
          ...bgStyle,
        }}
      >
        {/* Template overlay elements */}
        {elements.length > 0 && (
          <>
            {elements.map((el, idx) => {
              const posStyle = computeElementStyle(el);

              if (el.type === "rect") {
                return <div key={idx} style={{ background: el.fill, ...posStyle }} />;
              }

              if (el.type === "text") {
                const text = interp(el.content, vars);
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

              // image
              return (
                <img
                  key={idx}
                  src={el.src}
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
        )}

        {/* Content area */}
        <div style={contentStyle}>
          <MarkdownViewer value={value} />
        </div>
      </div>
    </div>
  );
}
