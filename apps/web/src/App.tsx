import { useEffect } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";

import { CLERK_KEY } from "@/lib/config";
import { setTokenGetter } from "@/lib/api";
import { AppShell } from "@/components/diary/AppShell";

import Landing from "@/pages/Landing";
import { SignInPage, SignUpPage } from "@/pages/Auth";
import Notebook from "@/pages/Notebook";
import Write from "@/pages/Write";
import EditNote from "@/pages/EditNote";
import NoteView from "@/pages/NoteView";
import Inbox from "@/pages/Inbox";
import Wall from "@/pages/Wall";
import WallNote from "@/pages/WallNote";
import Me from "@/pages/Me";
import Shared from "@/pages/Shared";
import NotFound from "@/pages/NotFound";

/** Only signed-in people get past this. Everyone else is sent to /sign-in. */
function RequireAuth() {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();
  if (!isLoaded) return <p className="grid min-h-dvh place-items-center font-hand text-3xl text-ink-soft">Opening your notebook…</p>;
  return isSignedIn ? <Outlet /> : <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
}

/** Gives our API helper a way to ask Clerk for a fresh token. */
function ApiBridge() {
  const { getToken } = useAuth();
  useEffect(() => setTokenGetter(() => getToken()), [getToken]);
  return null;
}

function MissingKey() {
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div className="paper max-w-md p-6">
        <h1 className="text-2xl font-semibold">One thing missing</h1>
        <p className="mt-2 text-ink-soft">Add <code>VITE_CLERK_PUBLISHABLE_KEY</code> to <code>frontend/.env</code> (copy <code>.env.example</code>) and restart <code>pnpm dev</code>.</p>
      </div>
    </main>
  );
}

function Routed() {
  const nav = useNavigate();
  return (
    <ClerkProvider
      publishableKey={CLERK_KEY!}
      afterSignOutUrl="/"
      routerPush={(to) => nav(to)}
      routerReplace={(to) => nav(to, { replace: true })}
    >
      <ApiBridge />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />
        <Route path="/s/:shareId" element={<Shared />} />

        <Route element={<RequireAuth />}>
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Notebook />} />
            <Route path="write" element={<Write />} />
            <Route path="note/:id" element={<NoteView />} />
            <Route path="note/:id/edit" element={<EditNote />} />
            <Route path="inbox" element={<Inbox />} />
            <Route path="wall" element={<Wall />} />
            <Route path="wall/:id" element={<WallNote />} />
            <Route path="me" element={<Me />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </ClerkProvider>
  );
}

export default function App() {
  return <BrowserRouter>{CLERK_KEY ? <Routed /> : <MissingKey />}</BrowserRouter>;
}
