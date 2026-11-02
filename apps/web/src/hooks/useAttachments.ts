import { useCallback, useEffect, useRef, useState } from "react";
import { deleteFile, isImage, uploadFile, type FileMeta } from "@/lib/files";

export type Pending = {
  key: string;
  name: string;
  size: number;
  mime: string;
  /** local preview for images, so the thumbnail shows instantly */
  preview: string | null;
  /** uploaded in this session (so removing it can delete it for good) */
  fresh: boolean;
  status: "uploading" | "done" | "error";
  meta?: FileMeta;
  error?: string;
};

/**
 * Picking files starts uploading right away, so by the time you press send
 * they are usually ready. `ids` are the finished uploads, `busy` means "wait a moment".
 */
export function useAttachments(initial: FileMeta[] = []) {
  const [items, setItems] = useState<Pending[]>(() =>
    initial.map((m) => ({ key: m.id, name: m.name, size: m.size, mime: m.mime, preview: null, fresh: false, status: "done", meta: m })),
  );
  const previews = useRef<string[]>([]);

  useEffect(() => () => previews.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const add = useCallback((files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      let preview: string | null = null;
      if (isImage(file.type)) {
        preview = URL.createObjectURL(file);
        previews.current.push(preview);
      }
      setItems((p) => [...p, { key, name: file.name, size: file.size, mime: file.type, preview, fresh: true, status: "uploading" }]);
      uploadFile(file)
        .then((meta) => setItems((p) => p.map((i) => (i.key === key ? { ...i, status: "done", meta } : i))))
        .catch((e: Error) => setItems((p) => p.map((i) => (i.key === key ? { ...i, status: "error", error: e.message } : i))));
    }
  }, []);

  const remove = useCallback((key: string) => {
    setItems((p) => {
      const gone = p.find((i) => i.key === key);
      // throw away uploads made just now; files already on a page are unlinked when the page is saved
      if (gone?.fresh && gone.meta) void deleteFile(gone.meta.id);
      return p.filter((i) => i.key !== key);
    });
  }, []);

  const clear = useCallback(() => setItems([]), []);

  return {
    items,
    add,
    remove,
    clear,
    ids: items.flatMap((i) => (i.status === "done" && i.meta ? [i.meta.id] : [])),
    busy: items.some((i) => i.status === "uploading"),
    error: items.find((i) => i.status === "error")?.error ?? null,
  };
}
