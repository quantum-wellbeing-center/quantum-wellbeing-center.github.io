/**
 * Pure WhatsApp helpers with no dependency on the site config, so the chat panel island can
 * import them without pulling src/config/site.ts into the client bundle. The server-side
 * wrappers bound to the config live in src/lib/whatsapp.ts.
 */
import type { ChatTopic, WhatsAppMessages } from '../config/site';

export type { ChatTopic, WhatsAppMessages } from '../config/site';

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

/**
 * Assembles the message from a set of templates.
 *
 *   composeMessage(site.whatsappMessages.ro, { topic: 'booking', name: 'Ana', preferredTime: 'joi după-amiază' })
 *   → 'Bună ziua! Aș dori o programare. Nume: Ana. Ziua/ora preferată: joi după-amiază.'
 */
export function composeMessage(m: WhatsAppMessages, parts: ChatMessageParts = {}): string {
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
export function whatsappLink(number: string, text?: string): string {
  const base = `https://wa.me/${number}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
