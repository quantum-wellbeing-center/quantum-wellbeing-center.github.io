/**
 * WhatsApp hand-off: assembles the prefilled message and the wa.me link.
 *
 * Shared by the server-rendered booking links (BookingLink, the no-JavaScript fallback) and the
 * chat panel island, so a booking reads the same with or without JavaScript. Message wording
 * lives in `site.whatsappMessages`.
 *
 *   buildWhatsAppMessage('ro', { topic: 'booking', name: 'Ana', preferredTime: 'joi după-amiază' })
 *   → 'Bună ziua! Aș dori o programare. Nume: Ana. Ziua/ora preferată: joi după-amiază.'
 */
import { site, type ChatTopic, type Locale } from '../config/site';

export type { ChatTopic } from '../config/site';

export interface ChatMessageParts {
  /** Defaults to 'booking'. */
  topic?: ChatTopic;
  /** Service name, added when a service card opened the chat. */
  service?: string;
  name?: string;
  preferredTime?: string;
  /** Free text from the message box, appended as written. */
  message?: string;
}

/** Trims a field value and drops trailing punctuation, which the template supplies. */
function clean(value: string | undefined): string {
  return value?.trim().replace(/[\s.!?]+$/u, '') ?? '';
}

function fill(template: string, value: string | undefined): string {
  const text = clean(value);
  return text ? template.replace('{value}', () => text) : '';
}

export function buildWhatsAppMessage(lang: Locale, parts: ChatMessageParts = {}): string {
  const m = site.whatsappMessages[lang];
  return [
    m.greeting,
    m.topics[parts.topic ?? 'booking'],
    fill(m.service, parts.service),
    fill(m.name, parts.name),
    fill(m.preferredTime, parts.preferredTime),
    parts.message?.trim() ?? '',
  ]
    .filter(Boolean)
    .join(' ');
}

/** `https://wa.me/<number>?text=<encoded>`; without text, the bare chat link. */
export function whatsappHref(text?: string, number: string = site.whatsappNumber): string {
  const base = `https://wa.me/${number}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
