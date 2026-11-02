import { normalizePhone } from "@/lib/phone";

/** What the friend sees in WhatsApp / SMS before they tap the link. */
export function shareText(title: string, content: string, url: string) {
  const excerpt = content.length > 180 ? content.slice(0, 180).trimEnd() + "…" : content;
  return `${title ? title + "\n\n" : ""}${excerpt}\n\nRead the full note: ${url}`;
}

/** Opens WhatsApp with the message ready. With a phone → that chat; without → WhatsApp asks who. */
export function whatsappLink(text: string, phone?: string) {
  const n = phone ? normalizePhone(phone) : null;
  const digits = n ? n.slice(1) : "";
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** Opens the phone's messages app. (iOS wants "&body=", Android is happy with "?body=".) */
export function smsLink(text: string, phone?: string) {
  const n = phone ? normalizePhone(phone) : "";
  const sep = /iPhone|iPad|iPod/.test(navigator.userAgent) ? "&" : "?";
  return `sms:${n ?? ""}${sep}body=${encodeURIComponent(text)}`;
}

export const noteUrl = (shareId: string) => `${window.location.origin}/s/${shareId}`;
