import { DismissRegular, TextBulletListLtrRegular } from "@fluentui/react-icons";
import { useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import cn from "@/lib/utils";
import { extractTocItems } from "@/lib/heading";
import useMountEffect from "@/hooks/use-mount-effect";

interface TocSidebarProps {
  /** Raw markdown content to extract headings from. */
  content: string;
  /** Called when the user clicks the close button. */
  onClose?: () => void;
}

/**
 * In-page table of contents sidebar for documentation pages.
 *
 * - Extracts headings from raw markdown (mirrors `rehypeHeadingIdsPlugin` slugs)
 * - Highlights the heading currently visible via `IntersectionObserver`
 * - Clicking a heading smooth-scrolls to it
 * - Indents `##` under `#`, `###` under `##`, etc.
 *
 * Styled to match the "Page info" panel (PageInfoPanel).
 */
export default function TocSidebar({ content, onClose }: TocSidebarProps): JSX.Element {
  const tocItems = useMemo(() => extractTocItems(content), [content]);
  const [activeId, setActiveId] = useState<string>("");

  // Only observe h2+ headings (skip h1 = page title).
  const observedItems = useMemo(() => tocItems.filter((item) => item.level >= 2), [tocItems]);

  useMountEffect(() => {
    // Collect all heading elements by their slug IDs.
    const elements = new Map<string, Element>();
    for (const item of observedItems) {
      const el = document.querySelector(`#${CSS.escape(item.id)}`);
      if (el) {
        elements.set(item.id, el);
      }
    }
    if (elements.size === 0) {
      return;
    }

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

    // oxlint-disable-next-line typescript/consistent-return
    return (): void => {
      observer.disconnect();
    };
  });

  if (tocItems.length === 0) {
    return (
      <div className="w-72 shrink-0 border-l border-border bg-sidebar p-4">
        <p className="text-xs text-foreground">No headings found</p>
      </div>
    );
  }

  const minLevel = Math.min(...tocItems.map((item) => item.level));

  return (
    <nav
      aria-label="Table of contents"
      className="w-72 shrink-0 border-l border-border bg-sidebar flex flex-col h-full overflow-hidden"
    >
      {/* Header bar — matches PageInfoPanel */}
      <div className="px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <TextBulletListLtrRegular className="w-4 h-4 shrink-0" />
          <span className="flex-1">On this page</span>
          {onClose && (
            <button
              className="ml-auto p-0.5 rounded hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-colors"
              onClick={onClose}
              aria-label="Close"
            >
              <DismissRegular className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3">
          <ul className="space-y-0.5">
            {tocItems.map((item) => {
              const indent = item.level - minLevel;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.querySelector(`#${CSS.escape(item.id)}`);
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
      </ScrollArea>
    </nav>
  );
}
