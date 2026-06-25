import type { CSSProperties } from "react";
import type { ParsedSlide } from "@/lib/slide";
import SlideStreamdown from "@/components/editor/slides/streamdown";
import cn from "@/lib/utils";
import { memo } from "react";
import { splitAtSecondH2 } from "@/lib/slide";

const PROSE_BASE =
  "prose prose-table:my-0 prose-img:my-0 prose-pre:my-0 prose-pre:bg-transparent max-w-none slide-prose";

interface SlideMarkdownViewerProps {
  slide: ParsedSlide;
  contentPadding?: { top?: number; right?: number; bottom?: number; left?: number };
  /** Horizontal text alignment for center-type layouts. Overrides the default "center". */
  contentAlign?: "left" | "center" | "right";
  /** Vertical content alignment for center-type layouts. Overrides the default "center". */
  contentVAlign?: "top" | "center" | "bottom";
  /** Per-heading style overrides applied as CSS custom properties. */
  headers?: Partial<Record<1 | 2 | 3 | 4 | 5 | 6, { color?: string; fontSize?: number }>>;
}

const buildOuterStyle = (
  directives: ParsedSlide["directives"],
  padding: SlideMarkdownViewerProps["contentPadding"],
): CSSProperties => {
  const style: CSSProperties = {};
  if (directives.color !== undefined && directives.color !== "") {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    (style as Record<string, unknown>)["--slide-fg"] = directives.color;
  }
  if (padding) {
    style.paddingTop = padding.top;
    style.paddingRight = padding.right;
    style.paddingBottom = padding.bottom;
    style.paddingLeft = padding.left;
  }
  return style;
};

const SlideMarkdownViewerInner = (allProps: SlideMarkdownViewerProps): JSX.Element => {
  const { slide, contentPadding, contentAlign, contentVAlign, headers } = allProps;
  const { content, directives } = slide;
  const isTitle = directives.classes.includes("title");
  const isSection = directives.classes.includes("section");
  const isSplit = directives.classes.includes("split");
  const isCenter = isTitle || isSection || directives.classes.includes("center");
  const isBlank = directives.classes.includes("blank");
  const outerStyle = buildOuterStyle(directives, contentPadding);

  // Build CSS custom properties from per-heading theme config
  if (headers) {
    const cssVars: Record<string, string> = {};
    for (const [level, hStyle] of Object.entries(headers)) {
      if (hStyle.color !== undefined) {
        cssVars[`--slide-h${level}-color`] = hStyle.color;
      }
      if (hStyle.fontSize !== undefined) {
        cssVars[`--slide-h${level}-size`] = `${hStyle.fontSize}px`;
      }
    }
    Object.assign(outerStyle, cssVars);
  }
  if (isSplit) {
    const [left, right] = splitAtSecondH2(content);
    return (
      <div className="flex h-full overflow-hidden" style={outerStyle}>
        <div className="flex-1 overflow-hidden">
          <div className={cn(PROSE_BASE, "px-6 py-5")}>
            <SlideStreamdown value={left} />
          </div>
        </div>
        <div className="w-px shrink-0 bg-current opacity-15" />
        <div className="flex-1 overflow-hidden">
          <div className={cn(PROSE_BASE, "px-6 py-5")}>
            <SlideStreamdown value={right} />
          </div>
        </div>
      </div>
    );
  }
  if (isCenter) {
    // flex-col: justify-* controls vertical (main axis), items-* controls horizontal (cross axis)
    const justifyMap: Record<string, string> = {
      bottom: "justify-end",
      center: "justify-center",
      top: "justify-start",
    };
    const alignMap: Record<string, string> = {
      center: "items-center",
      left: "items-start",
      right: "items-end",
    };
    const textMap: Record<string, string> = {
      center: "text-center",
      left: "text-left",
      right: "text-right",
    };
    const hAlign = contentAlign ?? "center";
    const vAlign = contentVAlign ?? "center";
    return (
      <div
        className={cn(
          "h-full flex flex-col overflow-hidden",
          justifyMap[vAlign] ?? "justify-center",
          alignMap[hAlign] ?? "items-center",
        )}
        style={outerStyle}
      >
        <div
          className={cn(
            PROSE_BASE,
            textMap[hAlign] ?? "text-center",
            "px-12 py-8",
            isTitle && "slide-prose-title",
            isSection && "slide-prose-section",
          )}
        >
          <SlideStreamdown value={content} />
        </div>
      </div>
    );
  }
  let defaultPadding = "px-8 py-6";
  if (isBlank) {
    defaultPadding = "p-0";
  }
  return (
    <div style={outerStyle}>
      <div className={cn(PROSE_BASE, defaultPadding)}>
        <SlideStreamdown value={content} />
      </div>
    </div>
  );
};

const SlideMarkdownViewer = memo(SlideMarkdownViewerInner);

export default SlideMarkdownViewer;
