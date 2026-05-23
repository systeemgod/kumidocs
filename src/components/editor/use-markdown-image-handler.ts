import { insertImage, uploadImageFile } from "./markdown-editor-utils";
import type { RefObject } from "react";
import { toast } from "sonner";
import { useCallback } from "react";

interface UseMarkdownImageHandlerReturn {
  handleDragOver: (ev: React.DragEvent) => void;
  handleDrop: (ev: React.DragEvent) => void;
  handleImageFiles: (files: FileList | File[]) => void;
}

function useMarkdownImageHandler(
  taRef: RefObject<HTMLTextAreaElement | null>,
  onChange: (val: string) => void,
): UseMarkdownImageHandlerReturn {
  const syncChange = useCallback(() => {
    if (taRef.current) {
      onChange(taRef.current.value);
    }
  }, [taRef, onChange]);

  const handleImageFiles = useCallback(
    (files: FileList | File[]) => {
      const images = [...files].filter((file) => file.type.startsWith("image/"));
      if (images.length === 0) {
        return;
      }
      const ta = taRef.current;
      for (const file of images) {
        const toastId = toast.loading(`Uploading ${file.name}…`);
        void (async (): Promise<void> => {
          const url = await uploadImageFile(file);
          toast.dismiss(toastId);
          if (url && ta) {
            insertImage(ta, url);
            syncChange();
            toast.success("Image uploaded");
          }
        })();
      }
    },
    [taRef, syncChange],
  );

  const handleDragOver = useCallback((ev: React.DragEvent) => {
    if (
      [...ev.dataTransfer.items].some(
        (item) => item.kind === "file" && item.type.startsWith("image/"),
      )
    ) {
      ev.preventDefault();
      ev.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const handleDrop = useCallback(
    (ev: React.DragEvent) => {
      const files = ev.dataTransfer.files;
      if (files.length === 0) {
        return;
      }
      const hasImage = [...files].some((file) => file.type.startsWith("image/"));
      if (!hasImage) {
        return;
      }
      ev.preventDefault();
      handleImageFiles(files);
    },
    [handleImageFiles],
  );

  return { handleDragOver, handleDrop, handleImageFiles };
}

export default useMarkdownImageHandler;
