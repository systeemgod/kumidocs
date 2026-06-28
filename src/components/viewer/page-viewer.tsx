// oxlint-disable unicorn/prefer-ternary complexity max-depth
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { toast } from "@/components/ui/toaster";
import type { PageTemplateDef } from "@/lib/page";
import { Streamdown } from "streamdown";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { COMPONENTS_DOC, REHYPE_PLUGINS } from "@/components/editor/markdown/streamdown-components";

const A4_W = 794;

interface PageViewerProps {
  value: string;
  template: PageTemplateDef;
  title: string;
  pageVars?: Record<string, string>;
}

interface PageViewerHandle {
  copyHtml: () => Promise<void>;
}

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

function interp(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, val);
  }
  return result;
}

function inlineEmailHtml(clone: HTMLElement): string {
  // Convert SVG Emojis as Outlook does not render "data:image/svg+xml"
  const emojiImages = clone.querySelectorAll<HTMLElement>('img[src^="data:image/svg+xml;base64"]');
  for (const img of emojiImages) {
    const alt = img.getAttribute("alt") ?? "";
    img.replaceWith(document.createTextNode(alt));
  }

  // Strip internal attributes that are meaningless in email
  for (const el of clone.querySelectorAll<HTMLElement>("[data-streamdown],[data-incomplete]")) {
    delete el.dataset.streamdown;
    delete el.dataset.incomplete;
  }

  // Walk the entire tree and inline styles
  const allElements = [clone, ...clone.querySelectorAll<HTMLElement>("*")];
  for (const el of allElements) {
    const tag = el.nodeName.toLowerCase();
    let style = el.getAttribute("style") ?? "";
    let inline = "";

    // Inline styles
    if (tag === "p") {
      inline += " margin: 0 0 1m;";
    }
    if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) {
      inline += " margin: 0 0 8px;";
    }
    // Inline CSS from known utility classes
    const classStyles: Record<string, string> = {
      "bg-amber-50": "background-color:#fffbeb",
      "bg-blue-50": "background-color:#eff6ff",
      "bg-green-50": "background-color:#f0fdf4",
      "bg-purple-50": "background-color:#faf5ff",
      "bg-red-50": "background-color:#fef2f2",
      "border-amber-500": "border-color:#f59e0b",
      "border-blue-500": "border-color:#3b82f6",
      "border-green-500": "border-color:#22c55e",
      "border-purple-500": "border-color:#a855f7",
      "border-red-500": "border-color:#ef4444",
      "font-semibold": "font-weight:700",
      "list-disc": "list-style-type:disc",
      "list-inside": "list-style-position:inside",
      "py-1": "padding-top:4px;padding-bottom:4px",
      "text-amber-800": "color:#92400e",
      "text-blue-800": "color:#1e40af",
      "text-green-800": "color:#166534",
      "text-purple-800": "color:#6b21a8",
      "text-red-800": "color:#991b1b",
    };
    for (const cls of el.classList) {
      const mapped = classStyles[cls];
      if (mapped === undefined) {
        continue;
      }
      const propName = mapped.split(":")[0];
      if (propName !== undefined && !style.includes(propName)) {
        inline += ` ${mapped};`;
      }
    }

    // Fallback-inline
    inline = inline.trim();
    if (!(inline + style).includes("box-sizing:")) {
      inline = `box-sizing: border-box; ${inline}`;
    }
    if (!(inline + style).includes("padding:")) {
      inline = `padding: 0; ${inline}`;
    }
    if (!(inline + style).includes("margin:")) {
      inline = `margin: 0; ${inline}`;
    }
    style = `${inline.trim()} ${style}`.trim();

    // Replace e.g. var(--border, #000000) with just the fallback value
    style = style.replaceAll(/var\(--[\w-]+,\s*(?<fallback>[^)]+)\)/gu, "$<fallback>");

    // Append ; if style already doesn't end with it
    if (style.length > 0 && style.at(-1) !== ";") {
      style += ";";
    }

    el.setAttribute("style", style);

    // Apply space-y-4: margin-bottom to every direct child except the last
    if (el.classList.contains("space-y-4")) {
      const children = el.children;
      for (let ci = 0; ci < children.length - 1; ci++) {
        const child = children[ci];
        if (!(child instanceof HTMLElement)) {
          continue;
        }
        const childStyle = child.getAttribute("style") ?? "";
        if (childStyle.includes("margin:") || childStyle.includes("margin-bottom:")) {
          continue;
        }
        const trimmed = childStyle.trim();
        child.setAttribute(
          "style",
          `${trimmed.length > 0 ? `${trimmed}; ` : ""}margin-bottom: 16px;`,
        );
      }
    }

    // Copy CSS height/width/align onto HTML attribute
    if (tag === "table" && el.style.width.length > 0 && el.style.width.endsWith("%")) {
      el.setAttribute("width", el.style.width);
    }
    if (tag === "table" && el.style.height.length > 0 && el.style.height.endsWith("%")) {
      el.setAttribute("height", el.style.height);
    }
    if (tag === "td" && el.style.width.length > 0 && el.style.width.endsWith("px")) {
      el.setAttribute("width", el.style.width.replaceAll("px", ""));
    }
    if (tag === "td" && el.style.height.length > 0 && el.style.height.endsWith("px")) {
      el.setAttribute("height", el.style.height.replaceAll("px", ""));
    }
    if (tag === "td" && el.style.textAlign.length > 0) {
      el.setAttribute("align", el.style.textAlign);
    }
    if (tag === "td" && el.style.verticalAlign.length > 0) {
      el.setAttribute("valign", el.style.verticalAlign);
    }
  }

  return `<!DOCTYPE html>
<html lang="en" style="margin: 0; padding: 0; box-sizing: border-box;">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>Page</title>
  </head>
  <body style="margin: 0; padding: 0; box-sizing: border-box;">
    ${clone.outerHTML}
  </body>
</html>`;
}

const PageViewer = forwardRef<PageViewerHandle, PageViewerProps>(
  ({ value, template, title, pageVars }, ref): JSX.Element => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const vars = buildTemplateVars(title, pageVars);

    // Render markdown to static HTML and inject it into the template string
    const html = useMemo(() => {
      const contentHtml = renderToStaticMarkup(
        <Streamdown
          mode="static"
          plugins={{ cjk, code, math, mermaid }}
          shikiTheme={["github-light", "github-dark"]}
          linkSafety={{ enabled: false }}
          components={COMPONENTS_DOC}
          rehypePlugins={REHYPE_PLUGINS}
        >
          {value}
        </Streamdown>,
      );
      let result = template.template;
      result = interp(result, vars);
      result = result.replace("{{content}}", contentHtml);
      return result;
    }, [value, template.template, vars]);

    const handleCopyHtml = useCallback(async () => {
      if (!wrapperRef.current) {
        return;
      }
      try {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        const clone = wrapperRef.current.cloneNode(true) as HTMLElement;
        const emailHtml = inlineEmailHtml(clone);
        await navigator.clipboard.writeText(emailHtml);
        toast.success("HTML copied to clipboard");
      } catch (error: unknown) {
        toast.error("Failed to copy HTML");
        console.error("Copy HTML failed:", error);
      }
    }, []);

    useImperativeHandle(ref, () => ({ copyHtml: handleCopyHtml }), [handleCopyHtml]);

    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <div
          ref={wrapperRef}
          style={{
            marginLeft: "1px",
            outline: "1px solid var(--border, #000000)",
            width: A4_W,
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    );
  },
);

export default PageViewer;
export type { PageViewerHandle };
