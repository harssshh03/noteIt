import { MOODS, formatDate } from "@/lib/format";
import type { Note } from "@/hooks/useApi";
import { cn } from "@/lib/utils";
import { AttachmentGallery } from "@/components/diary/Attachments";

/** A note, read-only, on its paper. Used by notebook, wall, shared link and letters. */
export function PaperPage({
  note,
  by,
}: {
  note: Pick<Note, "title" | "content" | "paper" | "createdAt" | "files"> & { mood?: string | null };
  by?: string | null;
}) {
  let typed = false;
  try { typed = localStorage.getItem("write-font") === "typed"; } catch { /* ignore */ }
  const mood = note.mood ? MOODS[note.mood] : null;

  return (
    <article>
      <p className="mb-1 font-hand text-xl text-ink-soft">
        {formatDate(note.createdAt)}
        {by && <> · from {by}</>} {mood && <span title={mood.label}>{mood.emoji}</span>}
      </p>
      <h1 className="mb-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{note.title || "Untitled page"}</h1>
      <div
        data-paper={note.paper}
        className={cn("paper lined writing min-h-[28rem] whitespace-pre-wrap break-words py-0", typed && "typed")}
      >
        {note.content}
      </div>
      <AttachmentGallery files={note.files} />
    </article>
  );
}
