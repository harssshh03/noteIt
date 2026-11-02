import { Empty, ErrorNote, GridSkeleton } from "@/components/diary/States";
import { NoteCard, NoteGrid } from "@/components/diary/NoteCard";
import { useWall } from "@/hooks/useApi";

export default function Wall() {
  const { data, loading, error, reload } = useWall();
  return (
    <div className="space-y-8">
      <header>
        <p className="font-hand text-2xl text-ink-soft">Pages people chose to pin up</p>
        <h1 className="text-4xl font-semibold">The Wall</h1>
      </header>
      {loading ? <GridSkeleton /> : error ? <ErrorNote message={error} onRetry={reload} /> : !data?.length ? (
        <Empty title="The wall is empty." hint="Tick “Post on the public Wall” when you write a page and it shows up here." />
      ) : (
        <NoteGrid>{data.map((n) => <NoteCard key={n.id} note={n} to={`/app/wall/${n.id}`} showAuthor />)}</NoteGrid>
      )}
    </div>
  );
}
