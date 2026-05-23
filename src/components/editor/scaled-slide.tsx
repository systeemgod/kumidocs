import type { ParsedSlide, SlideThemeMap } from "@/lib/slide";
import { SLIDE_H, SLIDE_W, buildCanvasStyle } from "./slide-utils";
import { isBgDark, resolveTheme } from "@/lib/slide";
import SlideMarkdownViewer from "./slide-markdown-viewer";
import SlideOverlay from "./slide-overlay";
import cn from "@/lib/utils";
import { useMemo } from "react";
import { useTheme } from "@/store/theme";

function ScaledSlide({
  slide,
  scale,
  theme,
  paginate,
  slideNum,
  total,
  slideThemes,
  themeVars,
  origin = "center center",
  shadow = false,
  rounded = false,
  absolute = false,
}: {
  slide: ParsedSlide;
  scale: number;
  theme: string;
  paginate: boolean;
  slideNum: number;
  total: number;
  slideThemes?: SlideThemeMap;
  themeVars?: Record<string, string>;
  origin?: string;
  shadow?: boolean;
  rounded?: boolean;
  /** Position absolute top-0 left-0 — used inside the scroll-mode tile wrapper */
  absolute?: boolean;
}): JSX.Element {
  const { directives } = slide;
  const { theme: siteTheme } = useTheme();

  // Resolve theme: user-defined custom themes first, then built-ins, then default (null)
  const layoutClass = directives.classes[0] ?? "";
  const resolvedTheme = resolveTheme(slideThemes, theme, layoutClass);

  // Stamp .dark or .light on canvas to isolate slide tokens from site mode.
  const isDark = resolvedTheme
    ? isBgDark(resolvedTheme.bg ?? "")
    : theme === "default" && siteTheme === "dark";

  // Extract first heading for template variable substitution
  const slideTitle = useMemo(() => {
    const match = /^#+\s+(.+)$/mu.exec(slide.content);
    return match?.[1]?.trim() ?? "";
  }, [slide.content]);

  // Build canvas inline style: custom theme bg/fg first, then per-slide directive overrides
  const canvasStyle = buildCanvasStyle(resolvedTheme, directives);

  return (
    <div
      style={{
        flexShrink: 0,
        height: SLIDE_H,
        transform: `scale(${String(scale)})`,
        transformOrigin: origin,
        width: SLIDE_W,
        ...canvasStyle,
      }}
      className={cn(
        "slide-canvas overflow-hidden",
        isDark ? "dark" : "light",
        directives.classes.includes("invert") && "slide-layout-invert",
        shadow && "shadow-xl",
        rounded && "rounded-sm",
        absolute && "absolute top-0 left-0",
      )}
    >
      <SlideMarkdownViewer slide={slide} contentPadding={resolvedTheme?.contentPadding} />
      {resolvedTheme?.elements && resolvedTheme.elements.length > 0 && (
        <SlideOverlay
          elements={resolvedTheme.elements}
          slideNum={slideNum}
          total={total}
          title={slideTitle}
          themeVars={themeVars}
        />
      )}
      {paginate && (
        <div className="slide-number">
          {slideNum} / {total}
        </div>
      )}
    </div>
  );
}

export default ScaledSlide;
