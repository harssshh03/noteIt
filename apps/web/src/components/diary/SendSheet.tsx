import { useEffect, useState } from "react";
import { Dialog } from "radix-ui";
import { Check, Copy, Link2Off, Loader2, Mail, MessageCircle, Send, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, errorMessage } from "@/lib/api";
import { normalizePhone } from "@/lib/phone";
import { noteUrl, shareText, smsLink, whatsappLink } from "@/lib/share";
import { cn } from "@/lib/utils";
import type { Note, Person } from "@/hooks/useApi";

type Tab = "noteit" | "whatsapp" | "sms" | "link";
const TABS: { id: Tab; label: string; icon: typeof Mail }[] = [
  { id: "noteit", label: "noteIt", icon: Mail },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "sms", label: "SMS", icon: Smartphone },
  { id: "link", label: "Link", icon: Send },
];

/**
 * "Send this note" — four ways:
 *  noteIt   → lands in another noteIt user's Inbox (found by phone or @handle)
 *  WhatsApp → opens WhatsApp with the note + a link, ready to send
 *  SMS      → same, in the Messages app
 *  Link     → copy a private read-only link (can be switched off again)
 */
export function SendSheet({
  note,
  open,
  onOpenChange,
  onNoteChange,
}: {
  note: Note;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onNoteChange: (n: Note) => void;
}) {
  const [tab, setTab] = useState<Tab>("noteit");
  const [to, setTo] = useState("");
  const [found, setFound] = useState<Person | "none" | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const isHandle = to.trim().startsWith("@");
  const phone = !isHandle ? normalizePhone(to) : null;
  const handle = isHandle ? to.trim().slice(1).toLowerCase() : "";
  const canLookup = !!phone || handle.length >= 3;

  // "Is this person on noteIt?" — checked as you type
  useEffect(() => {
    setFound(null);
    setMsg(null);
    if (tab !== "noteit" || !canLookup) return;
    const t = setTimeout(async () => {
      try {
        const res = await api.get("/letters/find", { params: phone ? { phone } : { handle } });
        setFound(res.data.user);
      } catch {
        setFound("none");
      }
    }, 450);
    return () => clearTimeout(t);
  }, [to, tab, canLookup, phone, handle]);

  // WhatsApp / SMS / Link need a public link, so make sure one exists.
  const url = note.shareId ? noteUrl(note.shareId) : null;
  useEffect(() => {
    if (!open || tab === "noteit" || note.shareId) return;
    void setShare(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab, note.shareId]);

  async function setShare(enabled: boolean) {
    try {
      const res = await api.post(`/notes/${note.id}/share`, { enabled });
      onNoteChange(res.data.note);
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
    }
  }

  async function sendLetter() {
    setBusy(true);
    setMsg(null);
    try {
      await api.post("/letters", {
        ...(phone ? { toPhone: phone } : { toHandle: handle }),
        title: note.title,
        content: note.content,
        paper: note.paper,
      });
      const name = found && found !== "none" ? found.name ?? `@${found.handle}` : "them";
      setMsg({ ok: true, text: `Sent to ${name}. It's in their Inbox now.` });
      setTo("");
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setMsg({ ok: false, text: "Couldn't copy — select the link and copy it by hand." });
    }
  }

  const text = url ? shareText(note.title, note.content, url) : "";
  const person = found && found !== "none" ? found : null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="paper fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 p-5 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-display text-2xl font-semibold">Send this note</Dialog.Title>
              <Dialog.Description className="text-sm text-ink-soft line-clamp-1">“{note.title || "Untitled page"}”</Dialog.Description>
            </div>
            <Dialog.Close className="rounded-full p-1.5 text-ink-soft hover:bg-paper-2" aria-label="Close"><X className="size-4" /></Dialog.Close>
          </div>

          <div className="mb-4 grid grid-cols-4 gap-1 rounded-lg bg-paper-2 p-1" role="tablist">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setMsg(null); }}
                className={cn("flex flex-col items-center gap-0.5 rounded-md py-1.5 text-xs font-medium transition-colors", tab === id ? "bg-paper shadow-sm" : "text-ink-soft hover:text-ink")}>
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>

          {(tab === "noteit" || tab === "whatsapp" || tab === "sms") && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="to">
                {tab === "noteit" ? "Their phone number or @handle" : "Their phone number (optional)"}
              </label>
              <Input id="to" value={to} onChange={(e) => setTo(e.target.value)} inputMode={isHandle ? "text" : "tel"} placeholder={tab === "noteit" ? "98765 43210 or @harsh" : "98765 43210"} className="bg-paper" />
            </div>
          )}

          {tab === "noteit" && (
            <div className="mt-4 space-y-3">
              <p className="min-h-5 text-sm">
                {!canLookup && <span className="text-ink-soft">Numbers without a country code are treated as +91.</span>}
                {canLookup && found === null && <span className="text-ink-soft">Looking…</span>}
                {person && <span><Check className="mr-1 inline size-4 text-sage" />{person.name ?? "A friend"} {person.handle && <span className="text-ink-soft">@{person.handle}</span>} is on noteIt</span>}
                {found === "none" && <span className="text-ink-soft">Not on noteIt yet — use the WhatsApp tab to invite them with this note.</span>}
              </p>
              <Button className="w-full" size="lg" disabled={!person || busy} onClick={sendLetter}>
                {busy ? <Loader2 className="animate-spin" /> : <Send />} Send letter
              </Button>
            </div>
          )}

          {(tab === "whatsapp" || tab === "sms") && (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-sage/25 p-3 text-sm leading-relaxed whitespace-pre-line text-ink/90">
                {url ? text : <span className="inline-flex items-center gap-2 text-ink-soft"><Loader2 className="size-4 animate-spin" />Making a private link…</span>}
              </div>
              <Button asChild className={cn("w-full", !url && "pointer-events-none opacity-50")} size="lg">
                <a href={url ? (tab === "whatsapp" ? whatsappLink(text, to) : smsLink(text, to)) : undefined} target="_blank" rel="noreferrer">
                  {tab === "whatsapp" ? <MessageCircle /> : <Smartphone />} Open {tab === "whatsapp" ? "WhatsApp" : "Messages"}
                </a>
              </Button>
              <p className="text-xs text-ink-soft">Anyone with the link can read this one note. Switch it off from the Link tab anytime.</p>
            </div>
          )}

          {tab === "link" && (
            <div className="space-y-3">
              {url ? (
                <>
                  <div className="flex gap-2">
                    <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="bg-paper" aria-label="Share link" />
                    <Button onClick={copy} variant="outline" size="icon" aria-label="Copy link">{copied ? <Check /> : <Copy />}</Button>
                  </div>
                  {"share" in navigator && (
                    <Button className="w-full" variant="outline" onClick={() => navigator.share({ title: note.title || "A note", text: shareText(note.title, note.content, url) }).catch(() => {})}>
                      <Send /> More apps…
                    </Button>
                  )}
                  <Button className="w-full text-destructive" variant="ghost" onClick={() => setShare(false)}>
                    <Link2Off /> Turn this link off
                  </Button>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-ink-soft">Make a private read-only link to this page. Only people you give it to can open it.</p>
                  <Button className="w-full" size="lg" onClick={() => setShare(true)}>Create link</Button>
                </div>
              )}
            </div>
          )}

          {msg && <p className={cn("mt-3 text-sm", msg.ok ? "text-ink" : "text-destructive")} role="status">{msg.text}</p>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
