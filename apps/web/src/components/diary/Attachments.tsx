import { useState } from "react";
import { FileText, Loader2, Paperclip, X } from "lucide-react";
import { formatSize, isImage, openFile, useBlobUrl, type FileMeta } from "@/lib/files";
import type { Pending } from "@/hooks/useAttachments";
import { cn } from "@/lib/utils";

/** Photo that lives behind login. Shows a soft placeholder while it loads. */
export function AuthImage({ file, className, alt }: { file: FileMeta; className?: string; alt?: string }) {
  const { url, failed } = useBlobUrl(file.id);
  if (failed) return <div className={cn("grid place-items-center bg-paper-2 text-xs text-ink-soft", className)}>Couldn't load photo</div>;
  if (!url) return <div className={cn("animate-pulse bg-paper-2", className)} />;
  return <img src={url} alt={alt ?? file.name} className={className} loading="lazy" />;
}

/** Attachments on a saved page: photos as taped-in prints, other files as small tags. */
export function AttachmentGallery({ files }: { files?: FileMeta[] }) {
  const [err, setErr] = useState<string | null>(null);
  if (!files?.length) return null;
  const photos = files.filter((f) => isImage(f.mime));
  const others = files.filter((f) => !isImage(f.mime));
  return (
    <section aria-label="Attachments" className="mt-6 space-y-4">
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {photos.map((f, i) => (
            <figure
              key={f.id}
              style={{ rotate: `${i % 2 ? 1.2 : -1.2}deg` }}
              className="paper relative max-w-full bg-paper p-2 pb-3 transition-transform hover:rotate-0"
            >
              <span className="tape" aria-hidden />
              <AuthImage file={f} className="max-h-72 max-w-full rounded-sm object-contain" />
            </figure>
          ))}
        </div>
      )}
      {others.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {others.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => openFile(f).catch(() => setErr("Couldn't open that file."))}
                className="paper inline-flex items-center gap-2 !rounded-lg px-3 py-2 text-sm hover:bg-paper-2"
              >
                <FileText className="size-4 text-ink-soft" />
                <span className="max-w-48 truncate">{f.name}</span>
                <span className="text-xs text-ink-soft">{formatSize(f.size)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {err && <p className="text-xs text-destructive">{err}</p>}
    </section>
  );
}

/** The row of things you've picked, before they're saved. */
export function PendingChips({ items, onRemove, className }: { items: Pending[]; onRemove: (key: string) => void; className?: string }) {
  if (!items.length) return null;
  return (
    <ul className={cn("flex flex-wrap gap-2", className)} aria-label="Attached files">
      {items.map((i) => (
        <li
          key={i.key}
          className={cn(
            "group relative flex items-center gap-2 overflow-hidden rounded-xl border bg-paper-2 pr-7 text-xs text-ink",
            i.status === "error" ? "border-destructive/60" : "border-edge",
          )}
          title={i.error ?? i.name}
        >
          {i.preview ? (
            <img src={i.preview} alt="" className="size-11 object-cover" />
          ) : (
            <span className="grid size-11 place-items-center bg-marigold/30"><FileText className="size-4" /></span>
          )}
          <span className="max-w-28 py-1">
            <span className="block truncate font-medium">{i.name}</span>
            <span className={cn("block", i.status === "error" ? "text-destructive" : "text-ink-soft")}>
              {i.status === "uploading" ? "Uploading…" : i.status === "error" ? i.error : formatSize(i.size)}
            </span>
          </span>
          {i.status === "uploading" && <Loader2 className="absolute right-7 top-1 size-3 animate-spin text-ink-soft" />}
          <button
            type="button"
            onClick={() => onRemove(i.key)}
            aria-label={`Remove ${i.name}`}
            className="absolute right-1 top-1 grid size-5 place-items-center rounded-full text-ink-soft hover:bg-ink/10 hover:text-ink"
          >
            <X className="size-3" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Small "attached" marker for cards. */
export function ClipCount({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="inline-flex items-center gap-0.5" title={`${n} attachment${n > 1 ? "s" : ""}`}>
      <Paperclip className="size-3.5" aria-hidden /> {n}
    </span>
  );
}
