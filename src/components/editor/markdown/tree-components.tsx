import { ChevronDownRegular, ChevronRightRegular } from "@fluentui/react-icons";
import { EmojiIcon } from "@/components/ui/emoji-icon";
import { Link } from "react-router-dom";
import buildPageTree from "@/lib/page-tree";
import { extractTocItems } from "@/lib/heading";
import { usePageContext } from "@/lib/page-context";
import type { PageNode } from "@/lib/types";
import cn from "@/lib/utils";
import { useMemo, useState } from "react";

interface PageTreeViewProps {
  nodes: PageNode[];
  depth?: number;
  maxDepth?: number;
}

/** Shared read-only tree renderer, used by sidebar's PageNodeRow and by Tree/TreeNested. */
function PageTreeItem({
  node,
  depth,
  maxDepth,
}: {
  node: PageNode;
  depth: number;
  maxDepth?: number;
}): JSX.Element {
  const hasChildren = node.children.length > 0;
  const href = `/p/${node.path}`.replace(/\.md$/iu, "");
  const shouldRenderChildren = hasChildren && (maxDepth === undefined || depth + 1 < maxDepth);
  const [open, setOpen] = useState(true);

  return (
    <li className="mb-0.5">
      <div
        className="flex items-center gap-1 rounded px-2 py-1 text-sm hover:bg-accent/50"
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="flex items-center justify-center w-4 h-4 p-0 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setOpen(!open);
            }}
          >
            {open ? (
              <ChevronDownRegular className="w-3 h-3" />
            ) : (
              <ChevronRightRegular className="w-3 h-3" />
            )}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <Link
          to={href}
          className="flex items-center gap-1.5 min-w-0 text-foreground no-underline hover:text-foreground"
        >
          <EmojiIcon
            emoji={node.fileEntry?.emoji}
            fileType={node.fileEntry?.type ?? "doc"}
            size={24}
          />
          <span className="truncate">{node.displayTitle}</span>
        </Link>
      </div>
      {shouldRenderChildren &&
        open && (
          // oxlint-disable-next-line no-use-before-define
          <PageTreeView nodes={node.children} depth={depth + 1} maxDepth={maxDepth} />
        )}
    </li>
  );
}

function PageTreeView({ nodes, depth = 0, maxDepth }: PageTreeViewProps): JSX.Element {
  return (
    <ul className="list-none p-0 m-0 not-prose">
      {nodes.map((node, idx) => (
        // oxlint-disable-next-line no-use-before-define
        <PageTreeItem key={`${node.path}-${idx}`} node={node} depth={depth} maxDepth={maxDepth} />
      ))}
    </ul>
  );
}

/** Find a PageNode in the tree matching a given .md path. */
function findNodeByPath(nodes: PageNode[], targetPath: string): PageNode | undefined {
  for (const node of nodes) {
    if (node.path === targetPath) {
      return node;
    }
    if (node.children.length > 0) {
      const found = findNodeByPath(node.children, targetPath);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

/** Flat list of immediate child pages of the current page's directory. */
function Pages(): JSX.Element {
  const { pagePath, tree } = usePageContext();
  const pages = useMemo(() => buildPageTree(tree), [tree]);

  const children = useMemo(() => {
    const node = findNodeByPath(pages, pagePath);
    return node?.children ?? [];
  }, [pages, pagePath]);

  if (children.length === 0) {
    return <></>;
  }

  return (
    <div className="my-4 rounded-md border bg-card p-3">
      <PageTreeView nodes={children} maxDepth={1} />
    </div>
  );
}

/** Nested tree of all pages under the current page's directory. */
function Tree(): JSX.Element {
  const { pagePath, tree } = usePageContext();
  const pages = useMemo(() => buildPageTree(tree), [tree]);

  const subtree = useMemo(() => {
    const node = findNodeByPath(pages, pagePath);
    return node?.children ?? [];
  }, [pages, pagePath]);

  if (subtree.length === 0) {
    return <></>;
  }

  return (
    <div className="my-4 rounded-md border bg-card p-3">
      <PageTreeView nodes={subtree} />
    </div>
  );
}

/** Table of contents of the current page's headings. */
function Toc(): JSX.Element {
  const { rawContent } = usePageContext();
  const items = useMemo(() => extractTocItems(rawContent), [rawContent]);

  if (items.length === 0) {
    return <></>;
  }

  return (
    <div className="my-4 rounded-md border bg-card p-3">
      <nav className="space-y-0.5">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={cn(
              "block rounded px-2 py-0.5 text-sm no-underline transition-colors hover:bg-accent/50",
            )}
            style={{ paddingLeft: `${8 + (item.level - 1) * 16}px` }}
          >
            {item.text}
          </a>
        ))}
      </nav>
    </div>
  );
}

export { Pages, PageTreeView, Toc, Tree };
