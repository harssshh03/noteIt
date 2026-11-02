import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { BookmarkPlus, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import VoiceComposer from "@/components/ui/voice-composer";
import { PaperPage } from "@/components/diary/PaperPage";
import { Empty, ErrorNote, GridSkeleton } from "@/components/diary/States";
import type { ShellContext } from "@/components/diary/AppShell";
import { useInbox, useSent, type Letter } from "@/hooks/useApi";
import { api, errorMessage } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function Inbox() {
  const { refreshUnread } = useOutletContext<ShellContext>();
  const [tab, setTab] = useState<"in" | "out">("in");
  const inbox = useInbox();
  const sent = useSent();
  const list = tab === "in" ? inbox : sent;
  const [openId, setOpenId] = useState<number | null>(null);
  const [saved, setSaved] = useState<number[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const open = list.data?.find((l) => l.id === openId) ?? null;

  async function openLetter(l: Letter) {
    setOpenId(l.id);
    if (tab === "in" && !l.readAt) {
      inbox.setData((prev) => prev?.map((x) => (x.id === l.id ? { ...x, readAt: new Date().toISOString() } : x)) ?? null);
      try { await api.put(`/letters/${l.id}/read`); refreshUnread(); } catch { /* it'll show unread next time */ }
    }
  }

  async function saveToNotebook(l: Letter) {
    try {
      await api.post("/notes", { title: l.title, content: l.content, paper: l.paper });
      setSaved((s) => [...s, l.id]);
    } catch (e) { setErr(errorMessage(e)); }
  }

  async function remove(l: Letter) {
    if (!window.confirm("Remove this letter from your Inbox?")) return;
    try {
      await api.delete(`/letters/${l.id}`);
      inbox.setData((prev) => prev?.filter((x) => x.id !== l.id) ?? null);
      setOpenId(null);
      refreshUnread();
    } catch (e) { setErr(errorMessage(e)); }
  }

  const who = (l: Letter) => (tab === "in" ? l.sender : l.recipient);
  const whoName = (l: Letter) => who(l).name ?? (who(l).handle ? `@${who(l).handle}` : "Someone");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-4xl font-semibold">Inbox</h1>
        <div className="flex rounded-full bg-paper-2 p-1 ring-1 ring-edge">
          {(["in", "out"] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); setOpenId(null); }} className={cn("rounded-full px-4 py-1.5 text-sm transition-colors", tab === t ? "bg-ink text-paper" : "text-ink-soft")}>
              {t === "in" ? "Received" : "Sent"}
            </button>
          ))}
        </div>
      </header>
      {err && <p className="text-sm text-destructive">{err}</p>}

      {list.loading ? <GridSkeleton /> : list.error ? <ErrorNote message={list.error} onRetry={list.reload} /> : !list.data?.length ? (
        <Empty title={tab === "in" ? "No letters yet." : "You haven't sent any."} hint={tab === "in" ? "When a friend sends you a note, it lands here. Add your phone number in My details so they can find you." : "Open any page in your notebook and tap Send."} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
          <ul className="space-y-2">
            {list.data.map((l) => (
              <li key={l.id}>
                <button onClick={() => openLetter(l)} className={cn("paper flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-paper-2", openId === l.id && "ring-2 ring-rose/60")}>
                  <span className={cn("mt-2 size-2.5 shrink-0 rounded-full", tab === "in" && !l.readAt ? "bg-rose" : "bg-transparent")} aria-label={tab === "in" && !l.readAt ? "Unread" : undefined} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cn("truncate text-sm", tab === "in" && !l.readAt && "font-semibold")}>{tab === "out" ? "To " : ""}{whoName(l)}</span>
                      <span className="shrink-0 text-xs text-ink-soft">{timeAgo(l.createdAt)}</span>
                    </span>
                    <span className="block truncate font-display text-[0.95rem]">{l.title || "Untitled page"}</span>
                    <span className="block truncate font-hand text-lg leading-5 text-ink-soft">{l.content}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <section aria-live="polite">
            {open ? (
              <div className="space-y-4">
                <PaperPage note={open} by={tab === "in" ? whoName(open) : undefined} />
                {tab === "in" && (
                  <VoiceComposer
                    lang="en-IN"
                    attachments={false}
                    placeholder={`Reply to ${whoName(open)}…`}
                    className="max-w-none"
                    onSend={(text) =>
                      api.post("/letters", { toUserId: open.sender.id, title: open.title ? `Re: ${open.title}` : "", content: text, paper: open.paper }).catch((e) => setErr(errorMessage(e)))
                    }
                  />
                )}
                {tab === "in" && (
                  <div className="flex gap-2">
                    <Button variant="outline" disabled={saved.includes(open.id)} onClick={() => saveToNotebook(open)}>
                      {saved.includes(open.id) ? <Check /> : <BookmarkPlus />} {saved.includes(open.id) ? "Saved" : "Keep in my notebook"}
                    </Button>
                    <Button variant="ghost" className="text-destructive" onClick={() => remove(open)}><Trash2 /> Remove</Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="hidden pt-10 text-center font-hand text-3xl text-ink-soft/70 lg:block">Pick a letter to read it ✉</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
