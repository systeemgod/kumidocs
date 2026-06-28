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
import inlineEmailHtml from "./email-inliner";

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
      <div className="flex flex-col items-center gap-3">
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
