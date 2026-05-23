import {
  ChevronDownRegular,
  ChevronRightRegular,
  MoreHorizontalFilled,
  MoreHorizontalRegular,
} from "@fluentui/react-icons";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmojiIcon, TitleWithEmoji } from "@/components/ui/emoji-icon";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { PageNode, PresenceUser, User } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PageMenuItems } from "@/components/ui/page-menu-items";
import { UserAvatar } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useState } from "react";

function PageNodeRow({
  node,
  depth,
  presenceByPage,
  currentUser,
  onNewSubPage,
  onMove,
  onDelete,
}: {
  node: PageNode;
  depth: number;
  presenceByPage: Map<string, PresenceUser[]>;
  currentUser: User | undefined;
  onNewSubPage: (parentDir: string) => void;
  onMove: (path: string) => void;
  onDelete: (path: string, title: string) => void;
}): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const hasChildren = node.children.length > 0;
  const [open, setOpen] = useState(depth <= 1);
  const [dotsHovered, setDotsHovered] = useState(false);
  const [dotsOpen, setDotsOpen] = useState(false);

  const href = `/p/${node.path}`.replace(/\.md$/iu, "");
  const isActive = location.pathname === href;
  const othersOnPage = presenceByPage.get(node.path) ?? [];
  const presenceUsers =
    isActive && currentUser
      ? [
          { email: currentUser.email, id: currentUser.id, name: currentUser.displayName },
          ...othersOnPage,
        ]
      : othersOnPage;
  const indent = 8 + depth * 14;
  const parentDir = node.path.includes("/") ? node.path.slice(0, node.path.lastIndexOf("/")) : "";

  const handleDuplicate = async (): Promise<void> => {
    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(node.path)}`);
      if (!res.ok) {
        toast.error("Duplicate failed");
        return;
      }
      const data = (await res.json()) as { content: string };
      const base = node.path.replace(/\.md$/iu, "");
      const newPath = `${base}-copy.md`;
      const saveRes = await fetch("/api/file", {
        body: JSON.stringify({ content: data.content, path: newPath }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (saveRes.ok) {
        toast.success("Page duplicated");
        void navigate(`/p/${newPath}`);
      } else if (saveRes.status === 409) {
        toast.error("A copy already exists at that path");
      } else {
        toast.error("Duplicate failed");
      }
    } catch {
      toast.error("Duplicate failed");
    }
  };

  return (
    <div className="w-full">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={`group flex items-center gap-1 px-2 py-[3px] rounded text-sm select-none min-w-0 ${
              isActive
                ? "bg-accent text-accent-foreground font-medium"
                : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
            }`}
            style={{ paddingLeft: `${String(indent)}px` }}
          >
            {/* Chevron — toggles expand without navigating */}
            <span
              className="shrink-0 w-3 h-3 flex items-center justify-center cursor-pointer"
              onClick={(ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                if (hasChildren) {
                  setOpen((prev) => !prev);
                }
              }}
            >
              {hasChildren &&
                (open ? (
                  <ChevronDownRegular className="w-3 h-3" />
                ) : (
                  <ChevronRightRegular className="w-3 h-3" />
                ))}
            </span>

            {/* Page icon */}
            <span
              className={`flex items-center justify-center ${node.isVirtual ? "opacity-40 shrink-0" : "shrink-0"}`}
            >
              <EmojiIcon
                emoji={node.fileEntry?.emoji}
                fileType={node.fileEntry?.type ?? "doc"}
                size={24}
              />
            </span>

            {/* Title navigates on click */}
            <Link
              to={href}
              className={`truncate flex-1 min-w-0 ${node.isVirtual ? "italic opacity-50" : ""}`}
              title={node.displayTitle}
            >
              <TitleWithEmoji title={node.displayTitle} />
            </Link>

            {/* Presence avatars — users currently on this page */}
            {presenceUsers.length > 0 && (
              <div className="flex items-center shrink-0 -space-x-1">
                {presenceUsers.slice(0, 3).map((user) => (
                  <Tooltip key={user.id}>
                    <TooltipTrigger asChild>
                      <UserAvatar
                        name={user.name}
                        email={user.email}
                        size="xs"
                        className="ring-1 ring-sidebar cursor-default"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      {user.id === currentUser?.id ? "You" : user.name}
                    </TooltipContent>
                  </Tooltip>
                ))}
                {presenceUsers.length > 3 && (
                  <div className="w-[18px] h-[18px] rounded-full bg-muted flex items-center justify-center text-[7px] font-bold ring-1 ring-sidebar text-muted-foreground cursor-default shrink-0">
                    +{presenceUsers.length - 3}
                  </div>
                )}
              </div>
            )}

            {/* 3-dot menu — visible on hover, same actions as right-click */}
            <DropdownMenu onOpenChange={setDotsOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className="opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-accent text-current transition-opacity"
                  onClick={(ev) => {
                    ev.stopPropagation();
                  }}
                  onMouseEnter={() => {
                    setDotsHovered(true);
                  }}
                  onMouseLeave={() => {
                    setDotsHovered(false);
                  }}
                >
                  {dotsHovered || dotsOpen ? (
                    <MoreHorizontalFilled className="w-4 h-4" />
                  ) : (
                    <MoreHorizontalRegular className="w-4 h-4" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start">
                <PageMenuItems
                  variant="dropdown"
                  href={href}
                  path={node.path}
                  displayTitle={node.displayTitle}
                  isVirtual={node.isVirtual}
                  parentDir={parentDir}
                  onNewSubPage={onNewSubPage}
                  onNewPage={onNewSubPage}
                  onDuplicate={() => {
                    void handleDuplicate();
                  }}
                  onMove={onMove}
                  onDelete={onDelete}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent>
          <PageMenuItems
            variant="context"
            href={href}
            path={node.path}
            displayTitle={node.displayTitle}
            isVirtual={node.isVirtual}
            parentDir={parentDir}
            onNewSubPage={onNewSubPage}
            onNewPage={onNewSubPage}
            onDuplicate={() => {
              void handleDuplicate();
            }}
            onMove={onMove}
            onDelete={onDelete}
          />
        </ContextMenuContent>
      </ContextMenu>

      {/* Children rendered outside ContextMenu so right-click doesn't bubble */}
      {hasChildren && open && (
        <div>
          {node.children.map((child) => (
            <PageNodeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              presenceByPage={presenceByPage}
              currentUser={currentUser}
              onNewSubPage={onNewSubPage}
              onMove={onMove}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default PageNodeRow;
