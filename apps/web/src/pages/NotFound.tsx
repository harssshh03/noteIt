import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <p className="font-hand text-7xl text-rose">404</p>
        <h1 className="mt-2 text-3xl font-semibold">This page was torn out.</h1>
        <p className="mt-2 text-ink-soft">The link might be old, or the page never existed.</p>
        <Button asChild size="lg" className="mt-6"><Link to="/">Back to the start</Link></Button>
      </div>
    </main>
  );
}
