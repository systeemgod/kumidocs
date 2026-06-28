// oxlint-disable unicorn/prefer-ternary
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
import juice from "juice/client";

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
        // Clone
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        const clone = wrapperRef.current.cloneNode(true) as HTMLElement;

        // Convert SVG Emojis as Outlook does not render "data:image/svg+xml"
        const emojiImages = clone.querySelectorAll<HTMLElement>(
          'img[src^="data:image/svg+xml;base64"]',
        );
        for (const img of emojiImages) {
          const alt = img.getAttribute("alt") ?? "";
          img.replaceWith(document.createTextNode(alt));
        }

        // Strip internal attributes that are meaningless in email
        for (const el of clone.querySelectorAll<HTMLElement>(
          "[data-streamdown],[data-incomplete]",
        )) {
          delete el.dataset.streamdown;
          delete el.dataset.incomplete;
        }

        // Walk the entire tree to ensure box-sizing: border-box on every element
        const allElements = [clone, ...clone.querySelectorAll<HTMLElement>("*")];
        for (const el of allElements) {
          const tag = el.nodeName.toLowerCase();
          let style = el.getAttribute("style") ?? "";
          console.log(tag, style);
          let inline = "";

          // Inline styles

          if (tag === "p") {
            inline += " margin: 0 0 1m;";
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

          // Append ; if style already doesn't end with it
          if (style.length > 0 && style.at(-1) !== ";") {
            style += ";";
          }

          el.setAttribute("style", style);
        }

        const rawHtml = `<!DOCTYPE html>
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

        const inlined = juice(rawHtml, {
          applyHeightAttributes: true,
          applyStyleTags: true,
          applyWidthAttributes: true,
          extraCss: [
            "body { margin: 0; padding: 0; }",
            "* { box-sizing: border-box; }",
            "p { margin: 0 0 1em; }",
            "h1, h2, h3, h4, h5, h6 { margin: 0 0 8px; }",
            ".py-1 { padding-top: 4px; padding-bottom: 4px; }",
            ".font-semibold { font-weight: 700; }",
            ".space-y-4 {:where(& > :not(:last-child)) {margin-bottom: 16px;}}",
            ".list-disc {list-style-type: disc;}",
            ".list-inside {list-style-position: inside;}",
            ".border-red-500 { border-color: #ef4444; }",
            ".bg-red-50 { background-color: #fef2f2; }",
            ".text-red-800 { color: #991b1b; }",
            ".border-purple-500 { border-color: #a855f7; }",
            ".bg-purple-50 { background-color: #faf5ff; }",
            ".text-purple-800 { color: #6b21a8; }",
            ".border-blue-500 { border-color: #3b82f6; }",
            ".bg-blue-50 { background-color: #eff6ff; }",
            ".text-blue-800 { color: #1e40af; }",
            ".border-green-500 { border-color: #22c55e; }",
            ".bg-green-50 { background-color: #f0fdf4; }",
            ".text-green-800 { color: #166534; }",
            ".border-amber-500 { border-color: #f59e0b; }",
            ".bg-amber-50 { background-color: #fffbeb; }",
            ".text-amber-800 { color: #92400e; }",
          ].join("\n"),
          preserveKeyFrames: false,
          removeStyleTags: true,
        });

        // console.log("juice", rawHtml, inlined);

        await navigator.clipboard.writeText(rawHtml);
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
