import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Mic } from "lucide-react";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/diary/Wordmark";
import { ThemeToggle } from "@/components/diary/ThemeToggle";
import { PAPERS, type Paper } from "@/lib/format";
import { cn } from "@/lib/utils";

const SAMPLE =
  "Window seat on the 8:15. Didn't feel like typing, so I said it out loud and it wrote itself.\n\nSending this one to Harsh before my stop 🚂";

/** Types text out one letter at a time, like someone writing. */
function useTypewriter(text: string, speed = 38, start = true) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!start) return;
    if (reduce) { setN(text.length); return; }
    if (n >= text.length) return;
    const t = setTimeout(() => setN((x) => x + 1), speed + (text[n] === "\n" ? 260 : 0));
    return () => clearTimeout(t);
  }, [n, text, speed, start, reduce]);
  return { out: text.slice(0, n), done: n >= text.length };
}

/** Fades + slides up once when scrolled into view. */
function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} className={className} initial={{ opacity: 0, y: 24 }} animate={seen ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

function Hero() {
  const { out, done } = useTypewriter(SAMPLE, 34);
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-10 sm:px-8 md:pt-16 lg:grid-cols-[1.05fr_1fr]">
      <div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mb-4 font-hand text-2xl text-rose">
          a pocket diary ✎
        </motion.p>
        <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-5xl font-semibold leading-[1.05] sm:text-6xl lg:text-7xl">
          Write it down.
          <br />
          Say it <span className="highlight italic">out loud</span>.
          <br />
          Send it on.
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
          noteIt is a diary on real-feeling paper. Type or speak your thoughts, keep them private, pin them on a public wall, or send one to a friend's phone.
        </motion.p>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 flex flex-wrap items-center gap-3">
          <SignedOut>
            <Button asChild size="lg" className="h-12 px-6 text-base"><Link to="/sign-up">Open a fresh page <ArrowRight /></Link></Button>
            <Button asChild variant="ghost" size="lg" className="h-12 text-base"><Link to="/sign-in">I have a notebook</Link></Button>
          </SignedOut>
          <SignedIn>
            <Button asChild size="lg" className="h-12 px-6 text-base"><Link to="/app">Go to my notebook <ArrowRight /></Link></Button>
          </SignedIn>
        </motion.div>
      </div>

      {/* the sheet that writes itself */}
      <motion.div initial={{ opacity: 0, rotate: 4, y: 30 }} animate={{ opacity: 1, rotate: -1.5, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} whileHover={{ rotate: 0 }} className="relative mx-auto w-full max-w-md">
        <span className="tape" aria-hidden />
        <div data-paper="ruled" className="paper lined writing min-h-[22rem] whitespace-pre-wrap pb-4 pt-0 [--gutter:3rem]">
          <p className="font-display text-xl font-semibold italic leading-[var(--line)] text-ink-soft not-italic">Monday, 2 November</p>
          <span className={cn(!done && "caret")}>{out}</span>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: 8 }}
          animate={done ? { opacity: 1, scale: 1, rotate: 4 } : {}}
          transition={{ type: "spring", stiffness: 260, damping: 16 }}
          className="absolute -bottom-6 -right-2 flex items-center gap-2 rounded-md bg-marigold px-4 py-2.5 font-hand text-xl text-ink shadow-lg sm:-right-6"
        >
          <Check className="size-4" /> sent to Harsh
        </motion.div>
        <div className="absolute -left-3 top-24 hidden size-12 place-items-center rounded-full bg-rose text-white shadow-lg sm:grid">
          <Mic className="size-5" />
        </div>
      </motion.div>
    </section>
  );
}

const STEPS = [
  { n: "1", title: "Write", body: "Open a page and just start. Pick ruled, plain, grid or dotted paper, add a mood, switch between handwriting and typed text. Drafts are kept if you close the tab." },
  { n: "2", title: "Speak", body: "Tap the mic and talk. Your words land on the page as you speak, in English, हिन्दी or मराठी. Good for when your hands are busy or your thoughts are quicker than your thumbs." },
  { n: "3", title: "Send", body: "Send a page to another noteIt user by phone number, or open WhatsApp or SMS with the note and a private link ready to go. Pin one on the public Wall if you want everyone to read it." },
];

function Steps() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
      <Reveal><h2 className="mb-10 text-4xl font-semibold sm:text-5xl">How it works</h2></Reveal>
      <div className="grid gap-8 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={i * 0.1}>
            <div style={{ rotate: `${[-1.2, 0.8, -0.6][i]}deg` }} className="paper h-full p-6 transition-transform hover:rotate-0">
              <p className="font-hand text-6xl leading-none text-rose">{s.n}</p>
              <h3 className="mb-2 mt-3 text-2xl font-semibold">{s.title}</h3>
              <p className="leading-relaxed text-ink-soft">{s.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function SendDemo() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-8 lg:grid-cols-2">
      <Reveal>
        <h2 className="text-4xl font-semibold sm:text-5xl">A note that <span className="highlight">travels</span>.</h2>
        <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-soft">
          Your friend isn't on noteIt yet? No problem. One tap opens WhatsApp with your note and a link that opens without an account. If they are on noteIt, it lands in their Inbox with a little red dot.
        </p>
      </Reveal>
      <Reveal delay={0.15} className="relative mx-auto grid w-full max-w-md gap-5">
        <div className="paper flex items-center gap-3 p-4">
          <span className="size-2.5 rounded-full bg-rose" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Meera <span className="font-normal text-ink-soft">· just now</span></p>
            <p className="truncate font-display">Things I never said at the station</p>
            <p className="truncate font-hand text-lg leading-5 text-ink-soft">I kept the ticket you gave me…</p>
          </div>
        </div>
        <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-sage/40 p-3.5 text-sm leading-relaxed shadow-sm">
          <p className="font-medium">Window seat on the 8:15</p>
          <p className="mt-1 text-ink/80">Didn't feel like typing, so I said it out loud…</p>
          <p className="mt-2 break-all text-sky underline">noteit.app/s/a81f3c9e02d4</p>
          <p className="mt-1 text-right text-[11px] text-ink-soft">9:41 ✓✓</p>
        </div>
      </Reveal>
    </section>
  );
}

function PaperPicker() {
  const [paper, setPaper] = useState<Paper>("ruled");
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
        <Reveal>
          <h2 className="text-4xl font-semibold sm:text-5xl">Pick your paper.</h2>
          <p className="mt-4 max-w-md text-lg text-ink-soft">Lined for letters, blank for ideas, grid for plans, dots for doodles. Tap one.</p>
          <div className="mt-6 flex gap-3" role="group" aria-label="Paper type">
            {PAPERS.map((p) => (
              <button key={p} data-paper={p} onClick={() => setPaper(p)} aria-pressed={paper === p}
                className={cn("paper lined grid size-16 place-items-end rounded-lg p-1 text-[11px] capitalize transition-all [--line:0.8rem] [--gutter:1rem]", paper === p ? "-translate-y-1 ring-2 ring-rose ring-offset-2 ring-offset-background" : "opacity-80 hover:opacity-100")}>
                {p}
              </button>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div data-paper={paper} className="paper lined writing min-h-64 whitespace-pre-line py-0 transition-all duration-300">
            {"Things to do this week\n— call nani\n— finish the sketch\n— buy stamps (!!)\n— say sorry first"}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-8">
      <Reveal>
        <p className="font-hand text-3xl text-rose">dear future you,</p>
        <h2 className="mt-2 text-4xl font-semibold sm:text-6xl">Your next page is blank.</h2>
        <SignedOut>
          <Button asChild size="lg" className="mt-8 h-12 px-7 text-base"><Link to="/sign-up">Start writing — it's free <ArrowRight /></Link></Button>
        </SignedOut>
        <SignedIn>
          <Button asChild size="lg" className="mt-8 h-12 px-7 text-base"><Link to="/app/write">Write a new page <ArrowRight /></Link></Button>
        </SignedIn>
      </Reveal>
    </section>
  );
}

export default function Landing() {
  return (
    <div className="overflow-x-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <Wordmark />
        <nav className="flex items-center gap-1 sm:gap-3">
          <a href="#how" className="hidden px-3 text-sm text-ink-soft hover:text-ink sm:block">How it works</a>
          <ThemeToggle />
          <SignedOut><Button asChild variant="outline" size="sm"><Link to="/sign-in">Sign in</Link></Button></SignedOut>
          <SignedIn><Button asChild size="sm"><Link to="/app">My notebook</Link></Button></SignedIn>
        </nav>
      </header>
      <main>
        <Hero />
        <Steps />
        <SendDemo />
        <PaperPicker />
        <Closing />
      </main>
      <footer className="border-t border-edge px-4 py-8 text-center text-sm text-ink-soft">
        <p className="font-hand text-xl">noteIt · written by hand, mostly.</p>
      </footer>
    </div>
  );
}
