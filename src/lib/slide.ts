/** Per-slide directives parsed from <!-- key: value --> HTML comments (Marp-compatible). */
interface SlideDirectives {
  /**
   * Layout / style classes applied to the slide canvas.
   * Supported values: 'title' | 'section' | 'split' | 'invert' | 'blank' | 'center'
   */
  classes: string[];
  /** CSS background value: hex color, named color, hsl(), rgb(), linear-gradient(), url() */
  bg?: string;
  /** CSS color override for all text on this slide */
  color?: string;
}

interface ParsedSlide {
  /** Markdown content with all directives stripped */
  content: string;
  directives: SlideDirectives;
}

/**
 * Parse Marp-compatible <!-- key: value --> directives from a single slide's markdown.
 * Recognized keys: class / _class (layout), bg (background), color (text color).
 * Returns the cleaned content (directives removed) and the extracted directives.
 */
const parseSlideDirectives = (raw: string): ParsedSlide => {
  const directives: SlideDirectives = { classes: [] };
  const content = raw.replaceAll(
    /<!--\s*([\w-]+)\s*:\s*([\s\S]*?)\s*-->/giu,
    (_match: string, key: string, value: string) => {
      const directiveKey = key.trim().toLowerCase();
      const directiveValue = value.trim();
      switch (directiveKey) {
        case "class":
        case "_class": {
          directives.classes.push(...directiveValue.split(/\s+/u).filter(Boolean));
          break;
        }
        case "bg": {
          directives.bg = directiveValue;
          break;
        }
        case "color": {
          directives.color = directiveValue;
          break;
        }
        default: {
          break;
        }
      }
      return "";
    },
  );
  return { content: content.trim(), directives };
};

// ── Custom theme system ───────────────────────────────────────────────────────

type SlideThemeElement =
  | {
      type: "rect";
      fill: string;
      left?: number;
      right?: number;
      width?: number;
      top?: number;
      bottom?: number;
      height?: number;
    }
  | {
      type: "text";
      content: string;
      color?: string;
      fontSize?: number;
      bold?: boolean;
      align?: "left" | "center" | "right";
      left?: number;
      right?: number;
      centerX?: boolean;
      top?: number;
      bottom?: number;
      centerY?: boolean;
    }
  | {
      type: "image";
      src: string;
      opacity?: number;
      left?: number;
      right?: number;
      width?: number;
      centerX?: boolean;
      top?: number;
      bottom?: number;
      height?: number;
      centerY?: boolean;
    };

interface SlideThemeDef {
  bg?: string;
  fg?: string;
  /** CSS font-family value applied to the entire slide canvas. Inherits to all content. */
  fontFamily?: string;
  contentPadding?: { top?: number; right?: number; bottom?: number; left?: number };
  elements?: SlideThemeElement[];
  layouts?: Record<string, Omit<SlideThemeDef, "layouts">>;
}

type SlideThemeMap = Record<string, SlideThemeDef>;

/**
 * Returns true if a CSS color string represents a dark background.
 * Handles hex (#rrggbb / #rgb) and oklch(L ...) formats.
 */
const isBgDark = (color: string): boolean => {
  const SHORT_HEX_LENGTH = 3;
  const HEX_G_END = 4;
  const HEX_B_END = 6;
  const RED_LUMINANCE = 0.299;
  const GREEN_LUMINANCE = 0.587;
  const BLUE_LUMINANCE = 0.114;
  const DARK_THRESHOLD = 128;
  const OKLCH_DARK_LIGHTNESS = 0.4;

  const hexMatch = /^#([0-9a-f]{3,6})$/iu.exec(color.trim());
  if (hexMatch) {
    const hexValue = hexMatch.at(1) ?? "";
    let full = hexValue;
    if (hexValue.length === SHORT_HEX_LENGTH) {
      // oxlint-disable-next-line typescript/no-misused-spread
      full = [...hexValue].map((hexChar) => hexChar + hexChar).join("");
    }
    const redChannel = Number.parseInt(full.slice(0, 2), 16);
    const greenChannel = Number.parseInt(full.slice(2, HEX_G_END), 16);
    const blueChannel = Number.parseInt(full.slice(HEX_G_END, HEX_B_END), 16);
    return (
      RED_LUMINANCE * redChannel + GREEN_LUMINANCE * greenChannel + BLUE_LUMINANCE * blueChannel <
      DARK_THRESHOLD
    );
  }
  const oklchMatch = /oklch\(\s*([\d.]+)/u.exec(color);
  if (oklchMatch) {
    return Number.parseFloat(oklchMatch.at(1) ?? "1") < OKLCH_DARK_LIGHTNESS;
  }
  return false;
};

/** Built-in slide themes expressed as code. 'default' is intentionally absent — it inherits app tokens via .slide-canvas CSS. */
const BUILTIN_SLIDE_THEMES: SlideThemeMap = {
  corporate: {
    bg: "#ffffff",
    contentPadding: { bottom: 36 },
    elements: [{ bottom: 0, fill: "#005251", height: 36, left: 0, right: 0, type: "rect" }],
    fg: "#1a1a1a",
    fontFamily: "Georgia, 'Times New Roman', serif",
    layouts: {
      title: {
        bg: "#005251",
        contentPadding: { bottom: 60, left: 60, right: 60, top: 80 },
        elements: [],
        fg: "#ffffff",
      },
    },
  },
  dark: {
    bg: "oklch(0.13 0 0)",
    fg: "oklch(0.93 0 0)",
  },
  gradient: {
    bg: "linear-gradient(72.44deg, rgb(156, 246, 250) 0%, rgb(227, 237, 185) 100%)",
    fg: "#1a2020",
  },
  minimal: {
    bg: "oklch(0.96 0.005 240)",
    fg: "oklch(0.18 0.01 240)",
  },
};

/** Resolve effective theme def for a slide, checking layout override first. */
const resolveCustomTheme = (
  map: SlideThemeMap,
  themeName: string,
  layoutClass: string,
): Omit<SlideThemeDef, "layouts"> | undefined => {
  const base = map[themeName];
  if (!base) {
    return undefined;
  }
  const layoutKey = layoutClass || "default";
  const baseDef: Omit<SlideThemeDef, "layouts"> = {
    bg: base.bg,
    contentPadding: base.contentPadding,
    elements: base.elements,
    fg: base.fg,
    fontFamily: base.fontFamily,
  };
  if (base.layouts) {
    const override = base.layouts[layoutKey];
    if (override) {
      // Inherit fontFamily from base when the layout override does not set it
      return {
        bg: override.bg,
        contentPadding: override.contentPadding,
        elements: override.elements,
        fg: override.fg,
        fontFamily: override.fontFamily ?? baseDef.fontFamily,
      };
    }
  }
  return baseDef;
};

/** Resolve a theme for a slide: user-defined custom themes take priority over built-ins. */
const resolveTheme = (
  slideThemes: SlideThemeMap | undefined,
  themeName: string,
  layoutClass: string,
): Omit<SlideThemeDef, "layouts"> | undefined => {
  if (slideThemes) {
    const custom = resolveCustomTheme(slideThemes, themeName, layoutClass);
    if (custom) {
      return custom;
    }
  }
  return resolveCustomTheme(BUILTIN_SLIDE_THEMES, themeName, layoutClass);
};

/**
 * Split slide content into two columns for the 'split' layout.
 * Splits at the second top-level '## ' heading.
 * Falls back to a midpoint split if no second heading exists.
 */
const splitAtSecondH2 = (content: string): [string, string] => {
  const H2_PREFIX = "## ";
  const lines = content.split("\n");
  let h2Count = 0;
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    if ((lines.at(lineIndex) ?? "").startsWith(H2_PREFIX)) {
      h2Count += 1;
      if (h2Count === 2) {
        return [
          lines.slice(0, lineIndex).join("\n").trim(),
          lines.slice(lineIndex).join("\n").trim(),
        ];
      }
    }
  }
  // Fallback: midpoint split
  const mid = Math.ceil(lines.length / 2);
  return [lines.slice(0, mid).join("\n").trim(), lines.slice(mid).join("\n").trim()];
};

export type { SlideDirectives, ParsedSlide, SlideThemeElement, SlideThemeDef, SlideThemeMap };
export {
  parseSlideDirectives,
  isBgDark,
  BUILTIN_SLIDE_THEMES,
  resolveCustomTheme,
  resolveTheme,
  splitAtSecondH2,
};
