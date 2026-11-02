import { Link } from "react-router-dom";
import { Globe, Link2 } from "lucide-react";
import type { Note } from "@/hooks/useApi";
import { MOODS, formatDate, tilt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AuthImage, ClipCount } from "@/components/diary/Attachments";
import { isImage } from "@/lib/files";

/** A little paper card. `to` decides where it opens. */
export function NoteCard({ note, to, showAuthor }: { note: Note; to: string; showAuthor?: boolean }) {
  const mood = note.mood ? MOODS[note.mood] : null;
  const photo = note.files?.find((f) => isImage(f.mime));
  return (
    <Link
      to={to}
      style={{ rotate: `${tilt(note.id)}deg` }}
      className="group relative block transition-all duration-200 hover:-translate-y-1 hover:!rotate-0"
    >
      {note.pinned && <span className="tape" aria-hidden />}
      <article
        data-paper={note.paper}
        className={cn("paper lined h-full overflow-hidden p-4 pb-3", note.paper === "ruled" && "pl-[calc(var(--gutter)*0.8)]")}
        style={{ ["--line" as string]: "1.6rem", ["--gutter" as string]: "2.4rem" }}
      >
        <h3 className="mb-1 line-clamp-1 font-display text-lg font-semibold leading-[1.6rem]">
          {note.title || "Untitled page"}
        </h3>
        <p className={cn("font-hand text-[1.3rem] leading-[1.6rem] text-ink/85", photo ? "line-clamp-2" : "line-clamp-4")}>{note.content}</p>
        {photo && <AuthImage file={photo} className="mt-2 h-24 w-full rounded-sm object-cover" />}
        <footer className="mt-3 flex items-center gap-2 text-xs text-ink-soft">
          <span>{formatDate(note.createdAt)}</span>
          {showAuthor && note.author?.name && <span>· {note.author.name}</span>}
          <span className="ml-auto flex items-center gap-1.5">
            <ClipCount n={note.files?.length ?? 0} />
            {note.published && <Globe className="size-3.5" aria-label="On the Wall" />}
            {note.shareId && <Link2 className="size-3.5" aria-label="Has a share link" />}
            {mood && <span title={mood.label}>{mood.emoji}</span>}
          </span>
        </footer>
      </article>
    </Link>
  );
}

export function NoteGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}
