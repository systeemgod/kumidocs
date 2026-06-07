import {
  AddRegular,
  BookTemplateRegular,
  ImageRegular,
  MoreHorizontalRegular,
} from "@fluentui/react-icons";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PageNode, PresenceUser, TreeNode } from "@/lib/types";
import { Button } from "@/components/ui/button";
import PageNodeRow from "./sidebar-page-node";
import { useNavigate } from "react-router-dom";
import usePageActions from "@/hooks/use-page-actions";
import { useUser } from "@/store/user";

interface SidebarProps {
  tree: TreeNode[];
  width: number;
  onNewPage: () => void;
  onNewSubPage: (parentDir: string) => void;
  presenceByPage: Map<string, PresenceUser[]>;
  reloadTree: () => void;
}

// Names always hidden from sidebar
const HIDDEN_NAMES = new Set(["_sidebar.md"]);
// Directory names always hidden from sidebar
const HIDDEN_DIR_NAMES = new Set(["images"]);

/**
 * Merge TreeNode[] (mixed files + dirs) into PageNode[]:
 * - dir "test-3/" + "test-3.md" → one PageNode with children
 * - dir with no matching .md → virtual ghost PageNode
 * - .md file with no matching dir → leaf PageNode
 */
function buildPageTree(nodes: TreeNode[]): PageNode[] {
  const filtered = nodes.filter(
    (node) =>
      !HIDDEN_NAMES.has(node.name) && !(node.type === "dir" && HIDDEN_DIR_NAMES.has(node.name)),
  );

  const fileMap = new Map<string, TreeNode>(); // baseName → file node
  const dirMap = new Map<string, TreeNode>(); // dirName → dir node

  for (const node of filtered) {
    if (node.type === "dir") {
      dirMap.set(node.name, node);
    } else {
      fileMap.set(node.name.replace(/\.md$/iu, ""), node);
    }
  }

  const result: PageNode[] = [];

  // Real file nodes (with optional dir children)
  for (const [baseName, fileNode] of fileMap) {
    const dir = dirMap.get(baseName);
    result.push({
      children: dir ? buildPageTree(dir.children ?? []) : [],
      displayTitle: fileNode.fileEntry?.title ?? baseName.replaceAll(/[-_]/gu, " "),
      fileEntry: fileNode.fileEntry,
      isVirtual: false,
      path: fileNode.path,
    });
  }

  // Orphan dirs (no matching .md) → virtual ghost page
  for (const [name, dirNode] of dirMap) {
    if (fileMap.has(name)) {
      continue;
    }
    result.push({
      children: buildPageTree(dirNode.children ?? []),
      displayTitle: name.replaceAll(/[-_]/gu, " "),
      fileEntry: undefined,
      isVirtual: true,
      path: `${dirNode.path}.md`,
    });
  }

  // Sort: README first, then alphabetically by display title
  return result.toSorted((nodeA, nodeB) => {
    if (nodeA.path.endsWith("README.md")) {
      return -1;
    }
    if (nodeB.path.endsWith("README.md")) {
      return 1;
    }
    return nodeA.displayTitle.localeCompare(nodeB.displayTitle, undefined, { sensitivity: "base" });
  });
}

export default function Sidebar({
  tree,
  width,
  onNewPage,
  onNewSubPage,
  presenceByPage,
  reloadTree,
}: SidebarProps): JSX.Element {
  const pages = buildPageTree(tree);
  const { user: currentUser } = useUser();
  const navigate = useNavigate();
  const { openMove, openDelete, dialogs: pageActionDialogs } = usePageActions(reloadTree);

  const handleOpenMove = async (path: string): Promise<void> => {
    try {
      await openMove(path);
    } catch (error: unknown) {
      console.error("Failed to open move dialog:", error);
    }
  };

  return (
    <>
      <aside
        className="shrink-0 border-r border-border bg-sidebar flex flex-col h-full overflow-hidden"
        style={{ width }}
      >
        {/* ── Pages header ── */}
        <div className="flex items-center px-3 py-1.5 border-b border-border shrink-0">
          <span className="flex-1 text-xs font-semibold text-foreground uppercase tracking-wide select-none">
            Pages
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                title="Wiki options"
              >
                <MoreHorizontalRegular className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  void navigate("/i");
                }}
              >
                <ImageRegular className="mr-2 w-4 h-4" />
                Image library
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  void navigate("/t");
                }}
              >
                <BookTemplateRegular className="mr-2 w-4 h-4" />
                Theme library
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-1 py-2">
              {pages.length === 0 ? (
                <div className="px-3 py-4 text-xs text-foreground text-center">
                  No pages yet.
                  <br />
                  Create your first page below.
                </div>
              ) : (
                pages.map((node) => (
                  <PageNodeRow
                    key={node.path}
                    node={node}
                    depth={0}
                    presenceByPage={presenceByPage}
                    currentUser={currentUser}
                    onNewSubPage={onNewSubPage}
                    onMove={handleOpenMove}
                    onDelete={openDelete}
                  />
                ))
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={onNewPage}>
              <AddRegular className="mr-2 w-4 h-4" />
              Create page
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        <div className="p-2 border-t border-border shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-1.5 text-muted-foreground hover:text-foreground h-7 text-xs"
            onClick={onNewPage}
          >
            <AddRegular className="w-3.5 h-3.5" />
            New page
          </Button>
        </div>
      </aside>

      {pageActionDialogs}
    </>
  );
}
