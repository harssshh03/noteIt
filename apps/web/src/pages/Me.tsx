import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMe } from "@/hooks/useApi";
import { api, errorMessage } from "@/lib/api";

export default function Me() {
  const { data: me, loading } = useMe();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    setName(me.name ?? "");
    setHandle(me.handle ?? "");
    setPhone(me.phone ?? "");
  }, [me]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    setError(null);
    try {
      const res = await api.put("/me", { name, handle: handle.replace(/^@/, "") || null, phone: phone || null });
      setPhone(res.data.user.phone ?? "");
      setState("saved");
      setTimeout(() => setState("idle"), 2000);
    } catch (err) {
      setError(errorMessage(err));
      setState("idle");
    }
  }

  if (loading) return <p className="font-hand text-2xl text-ink-soft">Loading…</p>;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header>
        <p className="font-hand text-2xl text-ink-soft">How friends find you</p>
        <h1 className="text-4xl font-semibold">My details</h1>
      </header>
      <form onSubmit={save} className="paper space-y-5 p-6">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="bg-paper" maxLength={60} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="handle">Handle</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft">@</span>
            <Input id="handle" value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase())} className="bg-paper pl-7" placeholder="harsh_writes" maxLength={20} />
          </div>
          <p className="text-xs text-ink-soft">Letters, numbers and _ · 3–20 characters</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone number</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="bg-paper" placeholder="98765 43210" />
          <p className="text-xs text-ink-soft">Friends type this to send you a note. Only noteIt users can look you up, and they only see your name. No country code = +91.</p>
        </div>
        {me?.email && <p className="text-sm text-ink-soft">Signed in as {me.email}</p>}
        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" disabled={state === "saving"}>
            {state === "saving" ? <Loader2 className="animate-spin" /> : state === "saved" ? <Check /> : null}
            {state === "saved" ? "Saved" : "Save details"}
          </Button>
          {error && <span className="text-sm text-destructive" role="alert">{error}</span>}
        </div>
      </form>
    </div>
  );
}
