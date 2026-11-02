import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/** Just the name, set in type with a hand-drawn underline. No icon. */
export function Wordmark({ className, to = "/" }: { className?: string; to?: string }) {
  return (
    <Link to={to} className={cn("relative inline-block font-display text-[1.65rem] font-semibold italic leading-none tracking-tight", className)}>
      NoteIt
      <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="absolute -bottom-1.5 left-0 h-2 w-full text-rose" aria-hidden>
        <path d="M1 5 C 18 1, 30 7, 50 4 S 85 2, 99 5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </Link>
  );
}
