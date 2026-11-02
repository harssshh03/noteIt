import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { PenLine, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NoteCard, NoteGrid } from "@/components/diary/NoteCard";
import { Empty, ErrorNote, GridSkeleton } from "@/components/diary/States";
import VoiceComposer from "@/components/ui/voice-composer";
import { useMe, useMyNotes } from "@/hooks/useApi";
import { api, errorMessage } from "@/lib/api";

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function Notebook() {
  const { user } = useUser();
  const { data: notes, setData, loading, error, reload } = useMyNotes();

  // Quick jot: type, speak or attach, press send, it becomes a new page.
  // Throwing tells the composer to keep the text and show the reason.
  async function jot(content: string, fileIds: string[]) {
    try {
      const res = await api.post("/notes", { title: "", content: content || "Attachment", fileIds });
      setData((prev) => [res.data.note, ...(prev ?? [])]);
    } catch (e) {
      throw new Error(errorMessage(e, "Couldn't save that one — try again."));
    }
  }
  const { data: me } = useMe();
  const [q, setQ] = useState("");

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (notes ?? []).filter((n) => !s || n.title.toLowerCase().includes(s) || n.content.toLowerCase().includes(s));
  }, [notes, q]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-hand text-2xl text-ink-soft">{greeting()}{user?.firstName ? `, ${user.firstName}` : ""}</p>
          <h1 className="text-4xl font-semibold">Your notebook</h1>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your pages" className="bg-paper pl-9" aria-label="Search notes" />
        </div>
      </header>

      <div>
        <VoiceComposer lang="en-IN" placeholder="Jot something down, or tap the mic and say it…" onSend={jot} className="max-w-none" />
      </div>

      {me && !me.phone && (
        <Link to="/app/me" className="block rounded-lg border border-dashed border-rose/60 bg-marigold/25 px-4 py-3 text-sm hover:bg-marigold/40">
          <span className="highlight font-medium">Add your phone number</span> so friends can send notes straight to your Inbox →
        </Link>
      )}

      {loading ? <GridSkeleton /> : error ? <ErrorNote message={error} onRetry={reload} /> : !notes?.length ? (
        <Empty title="A fresh page, waiting." hint="Write something — a thought, a plan, a message you'll send later.">
          <Button asChild size="lg"><Link to="/app/write"><PenLine /> Write the first one</Link></Button>
        </Empty>
      ) : !shown.length ? (
        <Empty title="Nothing matches that." />
      ) : (
        <NoteGrid>{shown.map((n) => <NoteCard key={n.id} note={n} to={`/app/note/${n.id}`} />)}</NoteGrid>
      )}
    </div>
  );
}
