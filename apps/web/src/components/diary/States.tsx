import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export function GridSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-40 rounded-lg bg-paper-2" />)}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="paper mx-auto max-w-md p-6 text-center">
      <p className="font-hand text-2xl">Oops — {message}</p>
      {onRetry && <Button className="mt-3" variant="outline" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function Empty({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-sm py-16 text-center">
      <p className="font-hand text-4xl">{title}</p>
      {hint && <p className="mt-2 text-ink-soft">{hint}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
