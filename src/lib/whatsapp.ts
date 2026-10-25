/**
 * WhatsApp hand-off: assembles the prefilled message and the wa.me link.
 *
 * Shared by the server-rendered booking links (BookingLink, the no-JavaScript fallback) and the
 * chat panel island, so a booking reads the same with or without JavaScript. Message wording
 * lives in `site.whatsappMessages`.
 *
 *   buildWhatsAppMessage('ro', { topic: 'booking', name: 'Ana', preferredTime: 'joi după-amiază' })
 *   → 'Bună ziua! Aș dori o programare. Nume: Ana. Ziua/ora preferată: joi după-amiază.'
 *
 * The pure halves (`composeMessage`, `whatsappLink`) live in ./whatsapp-message.ts; the chat
 * island imports them from there and receives the templates and number through data attributes,
 * so the site config never enters the client bundle.
 */
import { site, type Locale } from '../config/site';
import { composeMessage, whatsappLink, type ChatMessageParts } from './whatsapp-message';

export type { ChatTopic, WhatsAppMessages } from '../config/site';
export { composeMessage, whatsappLink, type ChatMessageParts } from './whatsapp-message';

export function buildWhatsAppMessage(lang: Locale, parts: ChatMessageParts = {}): string {
  return composeMessage(site.whatsappMessages[lang], parts);
}

/** `whatsappLink` bound to the site's number. */
export function whatsappHref(text?: string, number: string = site.whatsappNumber): string {
  return whatsappLink(number, text);
}
