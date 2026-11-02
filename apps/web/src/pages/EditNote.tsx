import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Editor, type NoteDraft } from "@/components/diary/Editor";
import { ErrorNote } from "@/components/diary/States";
import { useNote } from "@/hooks/useApi";
import { api, errorMessage } from "@/lib/api";

export default function EditNote() {
  const id = Number(useParams().id);
  const nav = useNavigate();
  const { data: note, loading, error } = useNote(id);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (loading) return <p className="font-hand text-2xl text-ink-soft">Opening your page…</p>;
  if (error || !note) return <ErrorNote message={error ?? "page not found."} />;

  async function save(d: NoteDraft) {
    setSaving(true);
    setSaveError(null);
    try {
      await api.put(`/notes/${id}`, d);
      nav(`/app/note/${id}`);
    } catch (e) {
      setSaveError(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Editor initial={note} saving={saving} error={saveError} onSave={save} />
    </div>
  );
}
