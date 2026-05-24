import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useWsListener, wsClient } from "@/store/ws";
import type { PresenceUser } from "@/lib/types";
import { toast } from "sonner";
import useMountEffect from "./use-mount-effect";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

interface UsePagePresenceReturn {
  editLocked: PresenceUser | undefined;
  remoteBanner: string | undefined;
  setRemoteBanner: Dispatch<SetStateAction<string | undefined>>;
  viewers: PresenceUser[];
}

export default function usePagePresence(
  filePath: string,
  userId: string | undefined,
  editModeRef: MutableRefObject<boolean>,
  isDirtyRef: MutableRefObject<boolean>,
  loadDoc: (path: string) => Promise<void>,
): UsePagePresenceReturn {
  const navigate = useNavigate();
  const [editLocked, setEditLocked] = useState<PresenceUser | undefined>();
  const [viewers, setViewers] = useState<PresenceUser[]>([]);
  const [remoteBanner, setRemoteBanner] = useState<string | undefined>();

  useMountEffect(() => {
    if (userId) {
      wsClient.joinPage(filePath);
    }
    return (): void => {
      if (editModeRef.current) {
        wsClient.stopEditing(filePath);
      }
      wsClient.leavePage();
    };
  });

  useWsListener((msg) => {
    if (msg.type === "presence_update" && msg.pageId === filePath) {
      setViewers(msg.viewers);
      setEditLocked(msg.editor);
    }
    if (msg.type === "page_changed" && msg.pageId === filePath) {
      if (msg.changedBy === userId) {
        return;
      }
      if (isDirtyRef.current) {
        setRemoteBanner(`${msg.changedByName} saved this page remotely`);
      } else {
        void (async (): Promise<void> => {
          try {
            await loadDoc(filePath);
          } catch (error: unknown) {
            console.error("Failed to reload document after remote change:", error);
          }
        })();
        toast.info(`Page updated by ${msg.changedByName}`);
      }
    }
    if (msg.type === "page_deleted" && msg.pageId === filePath) {
      toast.warning("This page was deleted");
      navigate("/p/README.md");
    }
    if (msg.type === "save_conflict_lost" && msg.pageId === filePath) {
      toast.error("Your changes were lost due to a remote conflict.");
      void (async (): Promise<void> => {
        try {
          await loadDoc(filePath);
        } catch (error: unknown) {
          console.error("Failed to reload document after conflict:", error);
        }
      })();
    }
  });

  return { editLocked, remoteBanner, setRemoteBanner, viewers };
}
