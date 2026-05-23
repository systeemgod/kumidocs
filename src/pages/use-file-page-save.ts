import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { buildFrontmatter, parseFrontmatter } from "@/lib/frontmatter";
import { useCallback, useRef, useState } from "react";
import type { PageMeta as DocMeta } from "@/lib/frontmatter";
import { toast } from "sonner";
import useMountEffect from "@/hooks/use-mount-effect";

type SaveStatus = "saved" | "saving" | "unsaved" | "error";

interface UseFilePageSaveProps {
  filePath: string;
  reloadTree: () => void;
  autoSaveDelay: number;
  setEditMode: (mode: boolean) => void;
}

interface UseFilePageSaveReturn {
  content: string;
  contentRef: MutableRefObject<string>;
  doSave: (currentContent: string, isRaw?: boolean) => Promise<void>;
  handleChange: (val: string) => void;
  handleSave: () => Promise<void>;
  isDirtyRef: MutableRefObject<boolean>;
  lastSha: string | undefined;
  loadDoc: (path: string) => Promise<void>;
  loading: boolean;
  meta: DocMeta;
  metaRef: MutableRefObject<DocMeta>;
  notFound: boolean;
  rawContent: string;
  rawContentRef: MutableRefObject<string>;
  savedContent: string;
  savePromiseRef: MutableRefObject<Promise<void>>;
  saveStatus: SaveStatus;
  setContent: Dispatch<SetStateAction<string>>;
  setMeta: Dispatch<SetStateAction<DocMeta>>;
  setRawContent: Dispatch<SetStateAction<string>>;
}

function useFilePageSave({
  filePath,
  reloadTree,
  autoSaveDelay,
  setEditMode,
}: UseFilePageSaveProps): UseFilePageSaveReturn {
  const [content, setContent] = useState("");
  const [rawContent, setRawContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [meta, setMeta] = useState<DocMeta>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [lastSha, setLastSha] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const autoSaveTimer = useRef(undefined as ReturnType<typeof setTimeout> | undefined);
  useMountEffect(() => (): void => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
  });

  const savePromiseRef = useRef<Promise<void>>(Promise.resolve());
  const isDirtyRef = useRef(false);
  const contentRef = useRef(content);
  contentRef.current = content;
  const rawContentRef = useRef(rawContent);
  rawContentRef.current = rawContent;
  const savedContentRef = useRef(savedContent);
  savedContentRef.current = savedContent;
  const metaRef = useRef(meta);
  metaRef.current = meta;

  const loadDoc = useCallback(
    async (path: string) => {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
        if (res.status === 404) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const data = (await res.json()) as {
          content: string;
          sha: string;
        };
        const parsed = parseFrontmatter(data.content);
        setContent(parsed.content);
        setRawContent(data.content);
        setSavedContent(parsed.content);
        isDirtyRef.current = false;
        setMeta(parsed.data);
        setLastSha(data.sha);
        setSaveStatus("saved");
        setEditMode(false);
      } finally {
        setLoading(false);
      }
    },
    [setEditMode],
  );

  useMountEffect(() => {
    void (async (): Promise<void> => {
      try {
        await loadDoc(filePath);
      } catch (error: unknown) {
        console.error("Failed to load document:", error);
      }
    })();
  });

  const doSave = useCallback(
    (currentContent: string, isRaw = false): Promise<void> => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = undefined;
      }
      const prev = savePromiseRef.current;
      const next: Promise<void> = (async () => {
        try {
          await prev;
        } catch {
          /* intentionally empty — previous save errors must not block the queue */
        }
        setSaveStatus("saving");

        const fullContent = isRaw
          ? currentContent
          : buildFrontmatter(metaRef.current) + currentContent;

        try {
          const res = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`, {
            body: JSON.stringify({ content: fullContent }),
            headers: { "Content-Type": "application/json" },
            method: "PUT",
          });
          if (res.ok) {
            const data = (await res.json()) as { sha: string; pushWarning?: boolean };
            if (isRaw) {
              const parsed = parseFrontmatter(currentContent);
              setContent(parsed.content);
              setSavedContent(parsed.content);
              savedContentRef.current = parsed.content;
              setMeta(parsed.data);
              metaRef.current = parsed.data;
            } else {
              setSavedContent(currentContent);
              savedContentRef.current = currentContent;
            }
            isDirtyRef.current = false;
            setSaveStatus("saved");
            setLastSha(data.sha);
            reloadTree();
            if (data.pushWarning) {
              toast.warning("Saved locally. Remote push failed — check git remote config.");
            }
          } else {
            setSaveStatus("error");
            toast.error("Save failed.");
          }
        } catch {
          setSaveStatus("error");
          toast.error("Save failed — network error.");
        }
      })();
      savePromiseRef.current = next;
      return next;
    },
    [filePath, reloadTree],
  );

  const handleChange = useCallback(
    (val: string) => {
      setRawContent(val);
      rawContentRef.current = val;
      setSaveStatus("unsaved");
      isDirtyRef.current = true;
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
      autoSaveTimer.current = setTimeout(async () => {
        try {
          await doSave(val, true);
        } catch (error: unknown) {
          console.error("Auto-save failed:", error);
        }
      }, autoSaveDelay);
    },
    [doSave, autoSaveDelay],
  );

  const handleSave = useCallback(async () => {
    try {
      await doSave(rawContentRef.current, true);
    } catch (error: unknown) {
      console.error("Manual save failed:", error);
    }
  }, [doSave]);

  return {
    content,
    contentRef,
    doSave,
    handleChange,
    handleSave,
    isDirtyRef,
    lastSha,
    loadDoc,
    loading,
    meta,
    metaRef,
    notFound,
    rawContent,
    rawContentRef,
    savePromiseRef,
    saveStatus,
    savedContent,
    setContent,
    setMeta,
    setRawContent,
  };
}

export { useFilePageSave };
export type { SaveStatus };
