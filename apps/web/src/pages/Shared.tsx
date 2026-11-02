import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/diary/Wordmark";
import { PaperPage } from "@/components/diary/PaperPage";
import { ErrorNote } from "@/components/diary/States";
import { useSharedNote } from "@/hooks/useApi";

/** What a friend sees when they tap the WhatsApp / SMS link. No login needed. */
export default function Shared() {
  const { shareId = "" } = useParams();
  const { data: note, loading, error } = useSharedNote(shareId);
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
        <Wordmark />
        <Button asChild size="sm"><Link to="/sign-up">Start your own diary</Link></Button>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16">
        {loading ? <p className="font-hand text-2xl text-ink-soft">Opening…</p> : error || !note ? <ErrorNote message={error ?? "this link isn't active anymore."} /> : (
          <PaperPage note={note} by={note.author?.name} />
        )}
      </main>
    </div>
  );
}
