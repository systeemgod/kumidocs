import { useMemo, useState } from "react";
import { extractTocItems } from "@/lib/heading";
import cn from "@/lib/utils";
import useMountEffect from "@/hooks/use-mount-effect";

interface TocSidebarProps {
  /** Raw markdown content to extract headings from. */
  content: string;
}

/**
 * In-page table of contents sidebar for documentation pages.
 *
 * - Extracts headings from raw markdown (mirrors `rehypeHeadingIdsPlugin` slugs)
 * - Highlights the heading currently visible via `IntersectionObserver`
 * - Clicking a heading smooth-scrolls to it
 * - Indents `##` under `#`, `###` under `##`, etc.
 */
export default function TocSidebar({ content }: TocSidebarProps): JSX.Element {
  const tocItems = useMemo(() => extractTocItems(content), [content]);
  const [activeId, setActiveId] = useState<string>("");

  // Only observe h2+ headings (skip h1 = page title).
  const observedItems = useMemo(
    () => tocItems.filter((item) => item.level >= 2),
    [tocItems],
  );

  useMountEffect(() => {
    // Collect all heading elements by their slug IDs.
    const elements = new Map<string, Element>();
    for (const item of observedItems) {
      const el = document.getElementById(item.id);
      if (el) {
        elements.set(item.id, el);
      }
    }
    if (elements.size === 0) return;

    const visibleIds = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleIds.add(entry.target.id);
          } else {
            visibleIds.delete(entry.target.id);
          }
        }
        // Active = first visible heading in document order (closest to top).
        let found = "";
        for (const item of observedItems) {
          if (visibleIds.has(item.id)) {
            found = item.id;
            break;
          }
        }
        setActiveId(found);
      },
      {
        // Root margin pushes the detection zone to the top 60 % of the viewport
        // so the active heading updates before it reaches the very top.
        rootMargin: "-10% 0px -40% 0px",
        threshold: 0,
      },
    );

    for (const el of elements.values()) {
      observer.observe(el);
    }

    return () => {
      observer.disconnect();
    };
  });

  if (tocItems.length === 0) {
    return (
      <div className="w-56 shrink-0 border-l border-border bg-background p-4">
        <p className="text-xs text-muted-foreground">No headings found</p>
      </div>
    );
  }

  const minLevel = Math.min(...tocItems.map((i) => i.level));

  return (
    <nav
      aria-label="Table of contents"
      className="w-56 shrink-0 border-l border-border bg-background overflow-y-auto"
    >
      <div className="px-3 py-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          On this page
        </h2>
        <ul className="space-y-0.5">
          {tocItems.map((item) => {
            const indent = item.level - minLevel;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById(item.id);
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                  className={cn(
                    "block w-full text-left text-xs rounded px-2 py-1 transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    activeId === item.id
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground",
                  )}
                  style={{ paddingLeft: `${8 + indent * 12}px` }}
                >
                  {item.text}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
