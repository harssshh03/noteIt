export function formatDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days < 7 ? `${days}d ago` : formatDate(iso);
}

export const MOODS: Record<string, { emoji: string; label: string }> = {
  happy: { emoji: "😊", label: "happy" },
  calm: { emoji: "😌", label: "calm" },
  excited: { emoji: "🤩", label: "excited" },
  tired: { emoji: "😴", label: "tired" },
  sad: { emoji: "🥲", label: "sad" },
  grateful: { emoji: "🙏", label: "grateful" },
};

export { PAPERS, type Paper } from "@noteit/shared";

/** Every card gets its own little tilt, stable for that id. */
export function tilt(id: number, max = 1.6) {
  const x = Math.sin(id * 9301 + 49297) * 233280;
  return (x - Math.floor(x) - 0.5) * 2 * max;
}
