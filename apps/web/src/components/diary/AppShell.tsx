import { NavLink, Outlet, Link } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { BookOpen, Mail, PenLine, Pin, UserRound } from "lucide-react";
import { Wordmark } from "@/components/diary/Wordmark";
import { ThemeToggle } from "@/components/diary/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useUnread } from "@/hooks/useApi";
import { cn } from "@/lib/utils";

export type ShellContext = { refreshUnread: () => void };

const NAV = [
  { to: "/app", label: "Notebook", icon: BookOpen, end: true },
  { to: "/app/inbox", label: "Inbox", icon: Mail },
  { to: "/app/wall", label: "Wall", icon: Pin },
  { to: "/app/me", label: "My details", icon: UserRound },
];

/** Left "spine" on desktop, bottom tabs on phones. */
export function AppShell() {
  const { unread, refresh } = useUnread();

  const badge = (n: number) =>
    n > 0 && <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-rose px-1.5 text-[11px] font-semibold text-white">{n}</span>;

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      {/* desktop spine */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-edge bg-paper/60 p-5 md:flex">
        <Wordmark to="/app" className="mt-1 self-start" />
        <Button asChild size="lg" className="w-full justify-start">
          <Link to="/app/write"><PenLine /> New page</Link>
        </Button>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => cn("flex items-center gap-3 rounded-lg px-3 py-2 text-[0.95rem] transition-colors", isActive ? "bg-marigold/50 font-medium" : "text-ink-soft hover:bg-paper-2 hover:text-ink")}>
              <Icon className="size-4" /> {label}
              {label === "Inbox" && badge(unread)}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex items-center justify-between">
          <UserButton afterSignOutUrl="/" />
          <ThemeToggle />
        </div>
      </aside>

      {/* phone top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-edge bg-background/90 px-4 py-3 backdrop-blur md:hidden">
        <Wordmark to="/app" />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-28 sm:px-8 md:py-10 md:pb-10">
        <Outlet context={{ refreshUnread: refresh } satisfies ShellContext} />
      </main>

      {/* phone tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 items-end border-t border-edge bg-paper/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur md:hidden">
        {[NAV[0], NAV[1]].map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => cn("relative flex flex-col items-center gap-0.5 py-1 text-[11px]", isActive ? "text-ink font-medium" : "text-ink-soft")}>
            <Icon className="size-5" /> {label}
            {label === "Inbox" && unread > 0 && <span className="absolute right-4 top-0 size-2.5 rounded-full bg-rose" />}
          </NavLink>
        ))}
        <Link to="/app/write" aria-label="New page" className="-mt-5 mb-1 grid size-14 place-items-center justify-self-center rounded-full bg-ink text-paper shadow-lg dark:bg-marigold dark:text-ink">
          <PenLine className="size-6" />
        </Link>
        {[NAV[2], NAV[3]].map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => cn("flex flex-col items-center gap-0.5 py-1 text-[11px]", isActive ? "text-ink font-medium" : "text-ink-soft")}>
            <Icon className="size-5" /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
