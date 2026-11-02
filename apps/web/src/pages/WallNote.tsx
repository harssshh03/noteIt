import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PaperPage } from "@/components/diary/PaperPage";
import { ErrorNote } from "@/components/diary/States";
import { useWallNote } from "@/hooks/useApi";

export default function WallNote() {
  const id = Number(useParams().id);
  const { data: note, loading, error } = useWallNote(id);
  if (loading) return <p className="font-hand text-2xl text-ink-soft">Opening…</p>;
  if (error || !note) return <ErrorNote message={error ?? "page not found."} />;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link to="/app/wall" className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"><ArrowLeft className="size-4" /> The Wall</Link>
      <PaperPage note={note} by={note.author?.name ?? (note.author?.handle ? `@${note.author.handle}` : null)} />
    </div>
  );
}
