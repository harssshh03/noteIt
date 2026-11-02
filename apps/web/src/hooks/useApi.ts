import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import type { Paper } from "@/lib/format";
import type { FileMeta } from "@/lib/files";

export type Person = { id: number; name: string | null; handle: string | null };

export interface Note {
  id: number;
  title: string;
  content: string;
  paper: Paper;
  mood: string | null;
  pinned?: boolean;
  published?: boolean;
  shareId?: string | null;
  createdAt: string;
  updatedAt?: string;
  author: { name: string | null; handle: string | null } | null;
  files?: FileMeta[];
}

export interface Letter {
  id: number;
  title: string;
  content: string;
  paper: Paper;
  readAt: string | null;
  createdAt: string;
  sender: Person;
  recipient: Person;
}

export interface Me {
  id: number;
  name: string | null;
  handle: string | null;
  phone: string | null;
  email: string | null;
}

/** GET helper: { data, loading, error, reload, setData }. Pass null to skip. */
export function useRequest<T>(path: string | null, key: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);

  const load = useCallback(async () => {
    if (!path) return;
    const run = ++latest.current;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(path);
      if (run === latest.current) setData(res.data[key]);
    } catch (err) {
      if (run === latest.current) setError(errorMessage(err, "Couldn't load this."));
    } finally {
      if (run === latest.current) setLoading(false);
    }
  }, [path, key]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, setData, loading, error, reload: load };
}

export const useMyNotes = () => useRequest<Note[]>("/notes", "notes");
export const useNote = (id: number) => useRequest<Note>(id > 0 ? `/notes/${id}` : null, "note");
export const useWall = () => useRequest<Note[]>("/wall", "notes");
export const useWallNote = (id: number) => useRequest<Note>(id > 0 ? `/wall/${id}` : null, "note");
export const useSharedNote = (shareId: string) => useRequest<Note>(`/shared/${shareId}`, "note");
export const useInbox = () => useRequest<Letter[]>("/letters/inbox", "letters");
export const useSent = () => useRequest<Letter[]>("/letters/sent", "letters");
export const useMe = () => useRequest<Me>("/me", "user");

/** Unread count for the badge. Re-checks every minute. */
export function useUnread() {
  const [unread, setUnread] = useState(0);
  const check = useCallback(async () => {
    try {
      const res = await api.get("/letters/unread");
      setUnread(res.data.unread ?? 0);
    } catch {
      /* the badge just stays as it was */
    }
  }, []);
  useEffect(() => {
    void check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [check]);
  return { unread, refresh: check };
}
