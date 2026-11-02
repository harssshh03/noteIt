import { useEffect, useRef, useState } from "react";
import { Globe, Loader2, Paperclip, Pin, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceNote } from "@/components/diary/VoiceNote";
import { MOODS, PAPERS, type Paper } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAttachments } from "@/hooks/useAttachments";
import { PendingChips } from "@/components/diary/Attachments";
import type { FileMeta } from "@/lib/files";

export type NoteDraft = {
  title: string;
  content: string;
  paper: Paper;
  mood: string | null;
  published: boolean;
  pinned: boolean;
  fileIds: string[];
};

const EMPTY: NoteDraft = { title: "", content: "", paper: "ruled", mood: null, published: false, pinned: false, fileIds: [] };
const DRAFT_KEY = "noteit:draft";

function loadDraft(): NoteDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}

/** One writing page. Used for both "new" and "edit". */
export function Editor({
  initial,
  isNew,
  saving,
  error,
  onSave,
}: {
  initial?: Partial<NoteDraft> & { files?: FileMeta[] };
  isNew?: boolean;
  saving: boolean;
  error?: string | null;
  onSave: (draft: NoteDraft) => void;
}) {
  // A new page remembers what you typed if you close the tab by mistake.
  const [d, setD] = useState<NoteDraft>(() => ({ ...EMPTY, ...(isNew ? loadDraft() : null), ...initial, fileIds: [] }));
  const [typed, setTyped] = useState(() => {
    try { return localStorage.getItem("write-font") === "typed"; } catch { return false; }
  });
  const area = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const att = useAttachments(initial?.files);
  const set = <K extends keyof NoteDraft>(k: K, v: NoteDraft[K]) => setD((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!isNew) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* ignore */ }
  }, [d, isNew]);

  // grow with the text so the page feels endless
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 480)}px`;
  }, [d.content, typed]);

  function toggleFont() {
    setTyped((t) => {
      try { localStorage.setItem("write-font", t ? "hand" : "typed"); } catch { /* ignore */ }
      return !t;
    });
  }

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const canSave = d.content.trim().length > 0 && !saving && !att.busy;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSave) return;
        try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
        onSave({ ...d, fileIds: att.ids });
      }}
      className="space-y-4"
    >
      <div>
        <p className="mb-1 font-hand text-xl text-ink-soft">{today}</p>
        <input
          value={d.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Untitled page"
          maxLength={200}
          aria-label="Title"
          className="w-full bg-transparent font-display text-3xl font-semibold tracking-tight outline-none placeholder:text-ink/30 sm:text-4xl"
        />
      </div>

      <textarea
        ref={area}
        value={d.content}
        onChange={(e) => set("content", e.target.value)}
        data-paper={d.paper}
        placeholder="Dear diary…"
        aria-label="Your note"
        maxLength={20000}
        autoFocus={isNew}
        className={cn("paper lined writing block w-full resize-none overflow-hidden py-0 outline-none placeholder:text-ink/30 focus-visible:ring-2 focus-visible:ring-rose/40", typed && "typed")}
      />

      <PendingChips items={att.items} onRemove={att.remove} />

      {/* tools */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <VoiceNote onText={(t) => setD((p) => ({ ...p, content: p.content + (p.content && !p.content.endsWith(" ") && !p.content.endsWith("\n") ? " " : "") + t }))} />

        <div className="flex items-center gap-1.5" role="group" aria-label="Paper">
          {PAPERS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => set("paper", p)}
              title={p}
              aria-pressed={d.paper === p}
              data-paper={p}
              className={cn("paper lined size-8 rounded-md transition-all [--line:0.55rem] [--gutter:0.7rem]", d.paper === p ? "ring-2 ring-rose ring-offset-2 ring-offset-background" : "opacity-80 hover:opacity-100")}
            />
          ))}
        </div>

        <div className="flex items-center gap-0.5" role="group" aria-label="Mood">
          {Object.entries(MOODS).map(([key, m]) => (
            <button
              key={key}
              type="button"
              title={m.label}
              aria-pressed={d.mood === key}
              onClick={() => set("mood", d.mood === key ? null : key)}
              className={cn("size-8 rounded-full text-lg transition-transform hover:scale-125", d.mood === key ? "bg-marigold/60" : "grayscale-[0.6] hover:grayscale-0")}
            >
              {m.emoji}
            </button>
          ))}
        </div>

        <button type="button" onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink" title="Attach a photo or file">
          <Paperclip className="size-4" /> Attach
        </button>
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          accept="image/*,application/pdf,text/plain,audio/*,.doc,.docx,.zip"
          onChange={(e) => { if (e.target.files) att.add(e.target.files); e.target.value = ""; }}
        />

        <button type="button" onClick={toggleFont} className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink" title="Switch between handwriting and typed text">
          <Type className="size-4" /> {typed ? "Typed" : "Handwritten"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-dashed border-edge pt-4">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={d.pinned} onChange={(e) => set("pinned", e.target.checked)} className="accent-rose" />
          <Pin className="size-4 text-ink-soft" /> Pin to top
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={d.published} onChange={(e) => set("published", e.target.checked)} className="accent-rose" />
          <Globe className="size-4 text-ink-soft" /> Post on the public Wall
        </label>
        <div className="ml-auto flex items-center gap-3">
          {(error || att.error) && <span className="text-sm text-destructive">{error ?? att.error}</span>}
          <Button type="submit" size="lg" disabled={!canSave}>
            {saving && <Loader2 className="animate-spin" />} {isNew ? "Save page" : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}
