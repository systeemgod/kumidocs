import { PageActionDialogs, ROOT } from "@/components/dialogs/page-action-dialogs";
import { useCallback, useRef, useState } from "react";
import type { PageOption } from "@/components/dialogs/page-action-dialogs";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface RawNode {
  path: string;
  type: string;
  fileEntry?: { title?: string };
  children?: RawNode[];
}

function flattenTree(nodes: RawNode[]): RawNode[] {
  return nodes.flatMap((node) => (node.type === "dir" ? flattenTree(node.children ?? []) : [node]));
}

interface UsePageActionsResult {
  openMove: (filePath: string) => Promise<void>;
  openDelete: (filePath: string, title?: string) => void;
  dialogs: JSX.Element;
}

/**
 * Shared hook for Move + Delete page actions.
 * Manages all dialog state internally; returns open-functions and dialog JSX.
 *
 * Usage:
 *   const { openMove, openDelete, dialogs } = usePageActions(reloadTree);
 *   // ... render {dialogs} somewhere in the component tree
 */
export default function usePageActions(reloadTree: () => void): UsePageActionsResult {
  const navigate = useNavigate();

  // ── Move dialog ──────────────────────────────────────────────────────────
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveFrom, setMoveFrom] = useState("");
  const [moveParent, setMoveParent] = useState(ROOT); // sentinel = root
  const [moveSlug, setMoveSlug] = useState("");
  const [movePages, setMovePages] = useState<PageOption[]>([]);
  const [parentOpen, setParentOpen] = useState(false);
  const [parentSearch, setParentSearch] = useState("");
  const comboboxRef = useRef<HTMLDivElement>(null);
  const outsideHandlerRef = useRef(undefined as ((ev: MouseEvent) => void) | undefined);

  const closeParentDropdown = useCallback(() => {
    if (outsideHandlerRef.current) {
      document.removeEventListener("mousedown", outsideHandlerRef.current);
      outsideHandlerRef.current = undefined;
    }
    setParentOpen(false);
  }, []);

  // Close the parent combobox dropdown when clicking outside
  const openParentDropdown = useCallback(() => {
    const handler = (ev: MouseEvent): void => {
      if (comboboxRef.current && !comboboxRef.current.contains(ev.target as Node)) {
        closeParentDropdown();
      }
    };
    outsideHandlerRef.current = handler;
    document.addEventListener("mousedown", handler);
    setParentOpen(true);
  }, [closeParentDropdown]);

  const openMove = useCallback(async (filePath: string) => {
    const parts = filePath.replace(/\.md$/u, "").split("/");
    const slug = parts.pop() ?? "";
    const parent = parts.join("/");
    setMoveFrom(filePath);
    setMoveSlug(slug);
    setParentSearch("");
    try {
      const res = await fetch("/api/tree");
      const tree = (await res.json()) as RawNode[];
      // Flatten the nested tree into a flat list of file nodes
      const pages: PageOption[] = flattenTree(tree)
        .filter(({ path: pagePath }) => pagePath.endsWith(".md") && pagePath !== filePath)
        .map(({ path: pagePath, fileEntry }) => ({
          dir: pagePath.replace(/\.md$/iu, ""),
          path: pagePath,
          title: fileEntry?.title ?? pagePath.replace(/\.md$/iu, ""),
        }))
        .toSorted((pageA, pageB) =>
          pageA.title.localeCompare(pageB.title, undefined, { sensitivity: "base" }),
        );
      setMovePages(pages);
      const parentPageExists = pages.some((pg) => pg.dir === parent);
      setMoveParent(parent && parentPageExists ? parent : ROOT);
    } catch {
      setMovePages([]);
      setMoveParent(ROOT);
    }
    setMoveOpen(true);
  }, []);

  const confirmMove = useCallback(async () => {
    const slug = moveSlug.trim().replace(/\.md$/u, "");
    if (!slug) {
      return;
    }
    const parent = moveParent === ROOT ? "" : moveParent;
    const toPath = parent ? `${parent}/${slug}.md` : `${slug}.md`;
    const res = await fetch("/api/file/rename", {
      body: JSON.stringify({ from: moveFrom, to: toPath }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    if (res.ok) {
      toast.success("Page moved");
      reloadTree();
      navigate(`/p/${toPath}`);
    } else {
      toast.error("Move failed");
    }
    setMoveOpen(false);
  }, [moveFrom, moveParent, moveSlug, navigate, reloadTree]);

  // ── Delete dialog ─────────────────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState("");
  const [deleteTitle, setDeleteTitle] = useState("");

  const openDelete = useCallback((filePath: string, title?: string) => {
    setDeleteTarget(filePath);
    setDeleteTitle(title ?? filePath);
    setDeleteOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    const res = await fetch(`/api/file?path=${encodeURIComponent(deleteTarget)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Page deleted");
      reloadTree();
      navigate("/p/README.md");
    } else {
      toast.error("Delete failed");
    }
    setDeleteOpen(false);
  }, [deleteTarget, navigate, reloadTree]);

  // ── Preview path ──────────────────────────────────────────────────────────
  const previewParent = moveParent === ROOT ? "" : moveParent;
  const previewSlug = moveSlug || "page-name";
  const previewPath = previewParent ? `${previewParent}/${previewSlug}.md` : `${previewSlug}.md`;

  // ── Dialog JSX ─────────────────────────────────────────────────────────
  const dialogs = (
    <PageActionDialogs
      moveOpen={moveOpen}
      setMoveOpen={setMoveOpen}
      movePages={movePages}
      moveParent={moveParent}
      setMoveParent={setMoveParent}
      moveSlug={moveSlug}
      setMoveSlug={setMoveSlug}
      parentOpen={parentOpen}
      parentSearch={parentSearch}
      setParentSearch={setParentSearch}
      comboboxRef={comboboxRef}
      closeParentDropdown={closeParentDropdown}
      openParentDropdown={openParentDropdown}
      confirmMove={confirmMove}
      previewPath={previewPath}
      deleteOpen={deleteOpen}
      setDeleteOpen={setDeleteOpen}
      deleteTitle={deleteTitle}
      deleteTarget={deleteTarget}
      confirmDelete={confirmDelete}
    />
  );
  return { dialogs, openDelete, openMove };
}
