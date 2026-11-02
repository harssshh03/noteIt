import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Editor, type NoteDraft } from "@/components/diary/Editor";
import { api, errorMessage } from "@/lib/api";

export default function Write() {
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(d: NoteDraft) {
    setSaving(true);
    setError(null);
    try {
      const res = await api.post("/notes", d);
      nav(`/app/note/${res.data.note.id}`, { replace: true });
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Editor isNew saving={saving} error={error} onSave={save} />
    </div>
  );
}
