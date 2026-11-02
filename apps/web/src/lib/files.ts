import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";

export type FileMeta = { id: string; name: string; mime: string; size: number };

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // keep in step with the API (10 MB)

export const isImage = (mime: string) => mime.startsWith("image/");

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Sends one file to the API (R2) and gives back its id. */
export async function uploadFile(file: File): Promise<FileMeta> {
  if (file.size > MAX_FILE_BYTES) throw new Error("Files can be up to 10 MB.");
  const body = new FormData();
  body.append("file", file);
  try {
    const res = await api.post("/files", body);
    return res.data.file as FileMeta;
  } catch (e) {
    throw new Error(errorMessage(e, "Couldn't upload that file."));
  }
}

export async function deleteFile(id: string) {
  try {
    await api.delete(`/files/${id}`);
  } catch {
    /* an orphaned upload is harmless */
  }
}

/** Files are behind login, so images are fetched with the token and shown from a blob URL. */
export function useBlobUrl(id: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!id) return;
    let alive = true;
    let made: string | null = null;
    setUrl(null);
    setFailed(false);
    api
      .get(`/files/${id}`, { responseType: "blob" })
      .then((res) => {
        if (!alive) return;
        made = URL.createObjectURL(res.data);
        setUrl(made);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [id]);
  return { url, failed };
}

/** Opens (or saves) a non-image file. */
export async function openFile(meta: FileMeta) {
  const res = await api.get(`/files/${meta.id}`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  if (meta.mime === "application/pdf" || meta.mime.startsWith("text/")) {
    window.open(url, "_blank", "noopener");
  } else {
    const a = document.createElement("a");
    a.href = url;
    a.download = meta.name;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
