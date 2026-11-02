/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";

/* Voice → text, using the browser's built-in speech recognition (free, no server).
   Works in Chrome / Edge / Android / Safari. Firefox doesn't have it, so we say so.

   Usage:  <VoiceNote onText={(t) => setContent((c) => c + t)} />

   NOTE: if you later run `pnpm dlx shadcn@latest add https://makeui.harssh.xyz/r/voice-composer.json`
   you can swap this for that component — only the `onText` callback in Editor.tsx needs to match. */

type SpeechRec = {
  lang: string; continuous: boolean; interimResults: boolean;
  start(): void; stop(): void;
  onresult: ((e: any) => void) | null; onerror: ((e: any) => void) | null; onend: (() => void) | null;
};

const LANGS = [
  { code: "en-IN", label: "English" },
  { code: "hi-IN", label: "हिन्दी" },
  { code: "mr-IN", label: "मराठी" },
];

function getRecognition(): (new () => SpeechRec) | null {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function VoiceNote({ onText, className }: { onText: (text: string) => void; className?: string }) {
  const Rec = getRecognition();
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem("voice-lang") ?? "en-IN"; } catch { return "en-IN"; }
  });
  const rec = useRef<SpeechRec | null>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  useEffect(() => () => rec.current?.stop(), []);

  if (!Rec) {
    return <p className={cn("text-xs text-ink-soft", className)}>Voice typing isn't supported in this browser — try Chrome.</p>;
  }

  function start() {
    setError(null);
    const r = new Rec!();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text: string = e.results[i][0].transcript;
        if (e.results[i].isFinal) onTextRef.current(text.trim() + " ");
        else live += text;
      }
      setInterim(live);
    };
    r.onerror = (e) => {
      setError(e.error === "not-allowed" ? "Microphone is blocked — allow it in the address bar." : e.error === "no-speech" ? null : "Couldn't hear you. Try again?");
    };
    r.onend = () => { setListening(false); setInterim(""); };
    rec.current = r;
    r.start();
    setListening(true);
  }

  function pickLang(code: string) {
    setLang(code);
    try { localStorage.setItem("voice-lang", code); } catch { /* ignore */ }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <button
        type="button"
        onClick={() => (listening ? rec.current?.stop() : start())}
        aria-pressed={listening}
        className={cn(
          "relative isolate inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
          listening ? "mic-ring bg-rose text-white" : "bg-paper-2 text-ink ring-1 ring-edge hover:bg-marigold/40"
        )}
      >
        {listening ? <Square className="size-4 fill-current" /> : <Mic className="size-4" />}
        {listening ? "Stop" : "Speak it"}
      </button>

      <div className="flex rounded-full bg-paper-2 p-0.5 ring-1 ring-edge" role="group" aria-label="Speaking language">
        {LANGS.map((l) => (
          <button
            key={l.code}
            type="button"
            disabled={listening}
            onClick={() => pickLang(l.code)}
            className={cn("rounded-full px-2.5 py-1 text-xs transition-colors disabled:opacity-60", lang === l.code ? "bg-ink text-paper" : "text-ink-soft hover:text-ink")}
          >
            {l.label}
          </button>
        ))}
      </div>

      {listening && <span className="max-w-full truncate font-hand text-lg text-ink-soft">{interim || "listening…"}</span>}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
