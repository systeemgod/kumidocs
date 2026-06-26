/** Page template types -- single-page A4 document templates with branded elements. */

import type { SlideThemeElement } from "./slide";

/** A page template definition, stored in .kumidocs.json under `pageTemplates`. */
interface PageTemplateDef {
  /** Page size preset. Default: "a4". */
  pageSize?: "a4" | "letter";
  /** Margin in px around the content area. Default: 40. */
  margin?: number | { top: number; right: number; bottom: number; left: number };
  /** Background color of the page canvas. Default: "#ffffff". */
  bg?: string;
  /** Foreground (text) color. Inherits to prose content. */
  fg?: string;
  /** Font family applied to all text on the page. */
  fontFamily?: string;
  /** Overlay elements rendered on top of the content area (reuses slide element types). */
  elements?: SlideThemeElement[];
}

type PageTemplateMap = Record<string, PageTemplateDef>;

/** Default margin used when no margin is specified. */
const DEFAULT_MARGIN = 40;

/**
 * Resolve the effective margin object from a template definition.
 */
function resolveMargin(
  margin?: number | { bottom: number; left: number; right: number; top: number },
): { bottom: number; left: number; right: number; top: number } {
  if (margin === undefined) {
    return {
      bottom: DEFAULT_MARGIN,
      left: DEFAULT_MARGIN,
      right: DEFAULT_MARGIN,
      top: DEFAULT_MARGIN,
    };
  }
  if (typeof margin === "number") {
    return { bottom: margin, left: margin, right: margin, top: margin };
  }
  return margin;
}

/**
 * Resolve a page template definition from the template map.
 * Returns undefined if the template name is not found.
 */
function resolvePageTemplate(
  pageTemplates: PageTemplateMap | undefined,
  templateName: string,
): PageTemplateDef | undefined {
  if (pageTemplates === undefined) {
    return undefined;
  }
  return pageTemplates[templateName];
}

export type { PageTemplateDef, PageTemplateMap };
export { resolveMargin, resolvePageTemplate };
