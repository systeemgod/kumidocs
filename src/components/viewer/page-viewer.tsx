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
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        const clone = wrapperRef.current.cloneNode(true) as HTMLElement;

        const emojiImages = clone.querySelectorAll('img[src^="data:image/svg+xml;base64"]');
        for (const img of emojiImages) {
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion
          const el = img as HTMLElement;
          const alt = el.getAttribute("alt") ?? "";
          el.replaceWith(document.createTextNode(alt));
        }

        // Strip internal attributes that are meaningless in email
        for (const el of clone.querySelectorAll<HTMLElement>(
          "[data-streamdown],[data-incomplete]",
        )) {
          delete el.dataset.streamdown;
          delete el.dataset.incomplete;
        }

        const rawHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>Page</title>
  </head>
  <body>
    ${clone.outerHTML}
  </body>
</html>`;

        const inlined = juice(rawHtml, {
          applyHeightAttributes: true,
          applyStyleTags: true,
          applyWidthAttributes: true,
          extraCss: [
            "*, :after, :before { box-sizing: border-box; border: 0 solid; margin: 0; padding: 0; }",
            "body { margin: 0; padding: 0; }",
            "* { box-sizing: border-box; }",
            "p { margin: 0 0 1em !important; }",
            "h1, h2, h3, h4, h5, h6 { margin: 0 0 8px !important; }",
            ".py-1 { padding-top: 4px !important; padding-bottom: 4px !important; }",
            ".font-semibold { font-weight: 700; }",
            ".space-y-4 {:where(& > :not(:last-child)) {margin-bottom: 16px;}}",
            ".list-disc {list-style-type: disc;}",
            ".list-inside {list-style-position: inside;}",
            ".border-red-500 { border-color: #ef4444 !important; }",
            ".bg-red-50 { background-color: #fef2f2 !important; }",
            ".text-red-800 { color: #991b1b !important; }",
            ".border-purple-500 { border-color: #a855f7 !important; }",
            ".bg-purple-50 { background-color: #faf5ff !important; }",
            ".text-purple-800 { color: #6b21a8 !important; }",
            ".border-blue-500 { border-color: #3b82f6 !important; }",
            ".bg-blue-50 { background-color: #eff6ff !important; }",
            ".text-blue-800 { color: #1e40af !important; }",
            ".border-green-500 { border-color: #22c55e !important; }",
            ".bg-green-50 { background-color: #f0fdf4 !important; }",
            ".text-green-800 { color: #166534 !important; }",
            ".border-amber-500 { border-color: #f59e0b !important; }",
            ".bg-amber-50 { background-color: #fffbeb !important; }",
            ".text-amber-800 { color: #92400e !important; }",
          ].join("\n"),
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

    useImperativeHandle(ref, () => ({ copyHtml: handleCopyHtml }), [handleCopyHtml]);

    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <div
          ref={wrapperRef}
          style={{
            outline: "1px solid var(--border, rgba(0,0,0,0.2))",
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
