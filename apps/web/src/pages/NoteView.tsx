import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaperPage } from "@/components/diary/PaperPage";
import { SendSheet } from "@/components/diary/SendSheet";
import { ErrorNote } from "@/components/diary/States";
import { useNote } from "@/hooks/useApi";
import { api, errorMessage } from "@/lib/api";

export default function NoteView() {
  const id = Number(useParams().id);
  const nav = useNavigate();
  const { data: note, setData, loading, error } = useNote(id);
  const [sendOpen, setSendOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (loading) return <p className="font-hand text-2xl text-ink-soft">Opening your page…</p>;
  if (error || !note) return <ErrorNote message={error ?? "page not found."} />;

  async function remove() {
    if (!window.confirm("Tear out this page? This can't be undone.")) return;
    try {
      await api.delete(`/notes/${id}`);
      nav("/app", { replace: true });
    } catch (e) {
      setErr(errorMessage(e));
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link to="/app" className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"><ArrowLeft className="size-4" /> Notebook</Link>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><Link to={`/app/note/${id}/edit`}><Pencil /> Edit</Link></Button>
          <Button size="sm" onClick={() => setSendOpen(true)}><Send /> Send</Button>
          <Button variant="ghost" size="icon-sm" onClick={remove} aria-label="Delete page" className="text-destructive"><Trash2 /></Button>
        </div>
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <PaperPage note={note} />
      <SendSheet note={note} open={sendOpen} onOpenChange={setSendOpen} onNoteChange={setData} />
    </div>
  );
}
