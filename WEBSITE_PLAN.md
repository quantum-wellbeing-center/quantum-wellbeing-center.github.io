# Website build plan: Centru de wellness

This file is the hand-off for the agent that builds the site. Section 1 is the prompt to paste into that agent. Sections 2 to 12 are the plan it follows.

---

## 1. Prompt for the next agent

Paste this into a new Claude Code session opened in this folder:

```text
You are building a modern, bilingual marketing website (Romanian first, English second) for a wellbeing centre, presented as "Centru de wellness", in /Users/romantudorgeorge/VisualStudioProjects/Web.

Read WEBSITE_PLAN.md in full before writing any code, and follow it. It defines the stack, design system, pages, content model, features, content rules, phases and acceptance checks.

Before any visual work, invoke the project skill `hig-foundations` (.claude/skills/hig-foundations/SKILL.md). The design must follow Apple Human Interface Guidelines foundations translated to the web, as set out in section 5 of the plan. The skill's references/ files are not installed, so rely on SKILL.md and section 5.

Rules:
- Static site. It must run locally with `npm run dev`, preview the production build with `npm run preview`, and deploy to any static host.
- Appointments and contact go through an on-site WhatsApp chat panel that opens WhatsApp with a prefilled message to +40 748 011 259. There is no contact form and no booking backend. Section 8 specifies the chat.
- The owner decides the wording about the centre, the EESystem and its effects, and takes responsibility for it (section 9).
- All site content lives in content collections and config files, never hard-coded inside components.
- Section 2 lists owner inputs. Where a value is blank, use a clearly fake placeholder and mark it with "TODO(content)". Mark draft legal text with "TODO(legal)".
- Never copy text or images from the reference sites.
- Work phase by phase as in section 10. At the end of each phase run that phase's checks and fix failures before moving on. Commit at the end of each phase.
- Do not deploy, create accounts on external services, or push to a remote. Prepare the config so the owner can deploy.

When finished, report what was built, which checks pass, and the full list of TODO(content) and TODO(legal) items the owner must fill in.
```

---

## 2. Owner inputs

Anything left blank becomes a TODO(content) placeholder.

| Item | Value |
|---|---|
| Positioning | Centru de wellness (wellbeing centre) |
| Phone | 0748 011 259 |
| Phone link | tel:+40748011259 |
| WhatsApp for appointments | +40 748 011 259, link base `https://wa.me/40748011259` |
| Brand name | Quantum Wellbeing Center |
| Domain | https://www.quantumwellbeing.ro |
| Address and city | Iclod, județul Cluj (street and postal code still missing) |
| Opening hours | |
| Email | contact@quantumwellbeing.ro |
| Social links (Facebook, Instagram, YouTube, TikTok) | |
| Logo file and one brand accent colour (hex) | |
| Services, session lengths and prices | EESystem sessions, individual or in a small group: 60 min ("O oră") 70 RON; 90 min ("O oră și 30 min") 90 RON; 120 min ("Două ore") 120 RON. No packages and no pensioners' rate (removed 2026-11-06) |
| Company legal details (name, CUI, Reg. Com.) | |
| Analytics wanted? Which tool? | |
| Research documents (PDFs and their metadata) | 43 EESystem documents from the materials board (https://widgets.getgorilla.app/2072c7d4375fdbf5), plus the ADHD pilot study and its summary supplied by the owner (2026-11-06); in `public/research/` |
| Photos of the centre and team | |
| Real testimonials, with written consent | |

---

## 3. What the reference sites do

Feature references only. Do not copy their wording, images or claims.

- https://quantumspace.ro/cercetari-stiintifice/
- https://quantumclinic.ro

The merged feature set to build:

| Feature | Seen on | What we build |
|---|---|---|
| Top info bar with phone, hours, email, socials | quantumspace | Same, hidden on small screens |
| Sticky header, menu, language switcher, "Rezervă" button | both | Same, with a translucent material header. "Rezervă" opens the WhatsApp chat |
| Hero with headline and booking CTA | quantumclinic | Same, with "Centru de wellness" as the eyebrow label |
| Services description | both | Factual service cards on the home page; no separate services page (removed 2026-11-06, it repeated the pricing page) |
| Research page: "Energy Enhancement System" heading, document cards with thumbnails linking to PDFs, booking block, reviews | quantumclinic.ro/cercetari-stiintifice/ | Same structure (owner's request, 2026-11-06), with the reviews replaced by our testimonials row |
| Photo gallery | quantumspace | Gallery of the centre's space, with an accessible lightbox |
| Testimonials and Google reviews widget | both | Testimonials from a local collection; reviews embed optional, consent-gated |
| FAQ, one short flat list | quantumclinic | Accordion built on native details elements |
| Pricing | both | Pricing page with service cards |
| Contact, floating WhatsApp button | both | An on-site WhatsApp chat panel, plus phone, address and hours |
| Footer: useful links, company links, socials, ANPC badges, copyright | both | Same |
| Cookie consent | quantumclinic | Only if the site sets non-essential cookies, with reject as easy as accept |
| Skip link | quantumspace | Same |

Deliberately left out: benefit and effects lists, before/after photos, condition or disease mentions, and the contact form.

Problems on the reference sites to avoid: a duplicated header block, typos and missing Romanian diacritics, duplicated research entries, and PDFs with no metadata.

---

## 4. Stack and decisions

- **Astro, latest stable.** Static output, content collections with schemas, built-in i18n routing, and zero JavaScript by default. Scaffold with the minimal template.
- **TypeScript in strict mode.**
- **Plain CSS with design tokens as custom properties.** No Tailwind. Tokens map one-to-one onto HIG semantic colours. Component styles use Astro scoped styles.
- **Small vanilla JS islands only** for the mobile menu, the WhatsApp chat panel, research search and filters, the lightbox, scroll reveal and cookie consent.
- **Fonts: the system font stack.** Apple devices then render SF Pro natively. Do not self-host SF Pro, because its licence does not allow web embedding.
- **Icons: Lucide**, outline style at one stroke weight. SF Symbols are licensed for Apple-platform apps only. Use the official WhatsApp glyph, for example from Simple Icons, for WhatsApp buttons only.
- **Images: astro:assets** for responsive AVIF and WebP output with explicit dimensions.
- **i18n:** Romanian is the default locale at `/`. English lives under `/en/`. The language switcher links to the same page in the other language, not to the home page.
- **Appointments and contact:** the WhatsApp chat panel builds a `wa.me` link with a prefilled message. No form backend, no third-party chat script.
- **Hosting:** any static host that serves `dist/`. Default to Netlify for free hosting and deploy previews. Cloudflare Pages and Vercel work the same way.
- **Node:** this machine runs Node 26.9.0. Add an `.nvmrc` with a Node version the installed Astro supports, and set the same version on the host.
- **Testing:** `astro check`, Playwright smoke tests, `@axe-core/playwright` accessibility tests, and Lighthouse.
- **Tooling:** Prettier with `prettier-plugin-astro`.

Target layout, high level only:

```text
src/
  config/site.ts          brand, phone, WhatsApp number and messages, socials, hours, feature flags
  content.config.ts       collection schemas (check the location for the installed Astro version)
  content/                services, research, testimonials, faq, gallery
  i18n/                   ro.json, en.json UI strings, route map between languages, helpers
  layouts/BaseLayout.astro
  components/             ui/ primitives, sections/ page sections, islands/ interactive parts
  pages/                  Romanian routes; pages/en/ English routes
  styles/                 tokens.css, base.css, typography.css
public/research/          PDFs
tests/                    Playwright specs
```

---

## 5. Design system: Apple HIG on the web

Read the `hig-foundations` skill first. These rules translate its principles into CSS.

### Principles

1. **Content over chrome.** Use generous whitespace, large imagery and hairline separators instead of heavy borders or boxes. Keep text columns to 60 to 75 characters and the page grid to about 1200px wide.
2. **Semantic colour tokens.** Components use tokens such as `--label`, never raw hex values. Every token has a light and dark value, switched by `prefers-color-scheme`.
3. **Platform type.** Use the system font stack and the Apple text-style scale below, in rem units so browser text size settings scale everything. This is the web equivalent of Dynamic Type.
4. **Materials.** The sticky header and the chat panel use a translucent background with `backdrop-filter: saturate(180%) blur(20px)`. Fall back to a solid background when backdrop-filter is unsupported or `prefers-reduced-transparency: reduce` is set.
5. **Shape.** Cards use a 16 to 20px radius. Buttons are capsules. The primary button is filled with the accent colour, and the secondary button uses a tinted fill.
6. **Purposeful motion.** Use subtle fade-and-rise reveals on scroll, 200 to 400ms with ease-out. Under `prefers-reduced-motion: reduce`, remove transforms and keep at most a short crossfade. Nothing autoplays, except the home gallery carousel (owner request): it has Pause/Play and Previous/Next controls, pauses on hover, focus, hidden tab and off-screen, and does not autoplay under reduced motion.
7. **Accessibility from the start.** Meet WCAG 2.2 AA contrast: 4.5:1 for body text and 3:1 for large text and UI parts. Show a visible focus ring, use 44 by 44px minimum touch targets, a skip link, landmarks, alt text and correct `lang` attributes. The menu, chat panel, lightbox, accordion and filters must all work by keyboard.
8. **Writing.** Use sentence-case headings, short verb-led button labels such as "Programează-te pe WhatsApp", and correct Romanian diacritics. Use comma-below ș and ț, not the cedilla forms ş and ţ.
9. **Internationalization.** Leave room for text expansion between Romanian and English. Format dates and prices with `Intl` for the page locale.

### Colour tokens

Values follow Apple's system colours. Secondary text and accent are darkened from Apple's app values so small text passes AA on the web.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | #FFFFFF | #000000 | Page background |
| `--bg-secondary` | #F5F5F7 | #1C1C1E | Alternating sections |
| `--bg-elevated` | #FFFFFF | #2C2C2E | Cards on secondary background |
| `--label` | #1D1D1F | #F5F5F7 | Primary text |
| `--label-secondary` | #6E6E73 | #A1A1A6 | Captions and metadata |
| `--separator` | rgba(60,60,67,0.29) | rgba(84,84,88,0.6) | Hairlines |
| `--fill` | rgba(120,120,128,0.12) | rgba(120,120,128,0.24) | Inputs and tinted buttons |
| `--accent` | #0066CC | #2997FF | Links and primary buttons |
| `--whatsapp` | #128C7E with a white glyph | #25D366 with a black glyph | WhatsApp buttons only |
| `--success` | #248A3D | #30D158 | Success states, always paired with text |
| `--danger` | #D70015 | #FF453A | Error states, always paired with text |
| `--material` | rgba(255,255,255,0.72) | rgba(22,22,23,0.72) | Translucent header and chat panel |

If the owner supplies a brand accent, check it reaches 4.5:1 against both backgrounds and adjust its lightness per mode until it does.

### Type scale

| Style | Size / line height | Weight |
|---|---|---|
| Display (hero only) | clamp(2.75rem, 6vw, 5rem) / 1.05 | 700 |
| Large title | 2.125rem / 1.2 | 700 |
| Title 1 | 1.75rem / 1.2 | 700 |
| Title 2 | 1.375rem / 1.27 | 600 |
| Title 3 | 1.25rem / 1.25 | 600 |
| Headline | 1.0625rem / 1.3 | 600 |
| Body | 1.0625rem / 1.47 | 400 |
| Callout | 1rem / 1.31 | 400 |
| Subheadline | 0.9375rem / 1.33 | 400 |
| Footnote | 0.8125rem / 1.38 | 400 |
| Caption | 0.75rem / 1.33 | 400 |

Use slightly negative letter-spacing on Display and Large title only.

Also create `.claude/apple-design-context.md` summarising these decisions. The skill reads that file before asking questions.

---

## 6. Site map

| Romanian route | English route | Purpose |
|---|---|---|
| `/` | `/en/` | Home |
| `/despre-eesystem/` | `/en/about-eesystem/` | Dr. Sandra Rose Michael, the EESystem's inventor: biography and a click-to-play YouTube interview |
| `/cercetari-stiintifice/` | `/en/research/` | Document library |
| `/testimoniale/` | `/en/testimonials/` | Testimonials and gallery of the centre |
| `/preturi/` | `/en/pricing/` | Services and prices |
| `/intrebari-frecvente/` | `/en/faq/` | FAQ |
| `/contact/` | `/en/contact/` | WhatsApp, phone, address, hours, embedded Google map |
| `/termeni-si-conditii/` | `/en/terms/` | Terms |
| `/politica-de-confidentialitate/` | `/en/privacy/` | Privacy policy |
| `/politica-cookies/` | `/en/cookies/` | Cookie policy |
| 404 page | 404 page | Not found, in both languages |

**Primary navigation:** Despre EESystem, Cercetări științifice, Testimoniale, Prețuri, Contact, then the language switcher and the "Rezervă" button. FAQ sits in the footer and as a section on the home page.

**Home page sections, in order:**

1. Hero with the "Centru de wellness" eyebrow, headline, subheading, a "Programează-te pe WhatsApp" button and a secondary "Vezi prețurile" link.
2. Short, factual introduction to the centre: who you are, where you are, what the space is like.
3. Service cards: name, duration, price from, and a link to that session on the pricing page.
4. "Cum te programezi" in three steps: write on WhatsApp, confirm the time, come to the centre.
5. Gallery carousel with photos of the space, auto-advancing with the controls in section 5 principle 6; a plain scroll-snap strip without JavaScript.
6. Testimonials, as a scroll-snap row with no autoplay.
7. FAQ teaser with five questions.
8. CTA band with the WhatsApp button and the phone number.

---

## 7. Content model

Define every collection with a schema. Each entry has `lang` ("ro" or "en") and a `translationKey` that links the Romanian and English versions.

- **services:** name, the duration in words (the pricing card title), factual description, duration in minutes, price, currency RON, highlighted flag, order, and the WhatsApp message to prefill when booking this service.
- **research:** title, authors (may be empty), year (optional), `documentType` (optional: peer-reviewed article, clinical study, pilot study, case report, review, report, other), source or affiliation (optional), DOI (optional), pdf path or URL, an optional summary PDF, a cover image (the first page, made by `npm run research:covers`), an optional one-line description, featured flag. The build must fail on duplicate pdf paths.
- **testimonials:** first name and initial, quote, date, rating (optional), source (google or in-person), `consent: true` required to render.
- **gallery:** image of the centre or team, alt text, caption, `consent: true` required when a person is identifiable.
- **faq:** question, answer in Markdown, order. Essentials only, one or two sentences each: what the EESystem is, session length, preparing, during and after a session, how often, booking, cancellation, location, parking.

Site-wide values such as phone, WhatsApp number, prefilled messages, socials, opening hours and analytics settings live in `src/config/site.ts`. UI strings live in the i18n JSON files.

---

## 8. Feature specs

- **WhatsApp chat panel.** This is the only booking and contact channel.
  - A floating round button sits bottom right: at least 56px, the WhatsApp glyph, `--whatsapp` colours, and an accessible name such as "Scrie-ne pe WhatsApp". It respects `env(safe-area-inset-bottom)` and never covers the cookie notice.
  - Clicking it opens a chat-style panel built on the native `dialog` element, with the material background. It has a header with the centre's name and logo, plus a line such as "Îți răspundem în timpul programului" with the hours from config.
  - The panel shows a greeting bubble, "Bună! Cu ce te putem ajuta?", and quick-reply chips: "Vreau o programare", "Întrebare despre prețuri" and "Altă întrebare".
  - Below the bubble are optional fields for name and preferred day and time, a message box, and a "Trimite pe WhatsApp" button.
  - Sending opens `https://wa.me/40748011259?text=` plus the URL-encoded message. The message is assembled from the chosen chip, the fields and the page language. Example: "Bună ziua! Aș dori o programare. Nume: Ana. Ziua/ora preferată: joi după-amiază."
  - A secondary "Sună: 0748 011 259" link uses `tel:+40748011259`.
  - Every "Rezervă" and "Programează-te" button opens the same panel. Service cards preselect "Vreau o programare" and add the service name to the message.
  - Without JavaScript, each of those buttons is a plain `wa.me` link with a default prefilled message, so booking still works.
  - The panel loads no third-party script and sets no cookies. Nothing is sent anywhere until the visitor taps send. Focus is trapped while open, Escape closes it, and focus returns to the button that opened it.
  - The privacy policy explains that messages are handled by WhatsApp, which Meta operates.
- **Header.** Sticky with the material background. Below about 900px it collapses into a full-screen sheet menu with a focus trap, Escape to close, and `aria-expanded` on the toggle. Render the header once, not twice as on the reference site.
- **Top info bar.** Phone, hours, email and socials. Hidden on small screens, where the phone moves into the menu.
- **Research page.** Revised 2026-11-06 at the owner's request to follow the structure of quantumclinic.ro/cercetari-stiintifice/:
  - The h1 band with a short lead, then an h2 "Energy Enhancement System" with the document count and a link to testimonials from other EESystem centres (unifydhealing.com).
  - One grid of document cards, featured first, then newest year first. Each card shows a thumbnail of the PDF's first page, the title (the link to the PDF), authors, year and source, a document-type badge when the entry sets one, and the file type and size. A featured card is wide and can carry a second "Rezumat" file. On narrow screens the cards become a compact list.
  - Then a booking band with the centre's name, then the testimonials row (where the reference shows Google reviews).
  - Without JavaScript, every item still renders. Optional later: a search box and type filters through the `data-research-*` hooks, with results announced in the `aria-live` region.
- **Gallery lightbox.** Built on the native `dialog` element. Arrow keys move between images, Escape closes, and focus returns to the opening thumbnail.
- **FAQ.** Native `details` and `summary` in one flat list (no categories), with FAQPage structured data.
- **Pricing.** A simple price list: one wide horizontal card per session (duration in words, price formatted by `Intl` as "70 lei", a "Programează-te" button that opens the chat), then a short note on what a session includes and a TODO(content) note about VAT.
- **Contact page.** A large title, then two columns: an intro paragraph, icon rows for email, phone, address (linking to Google Maps) and hours, and the WhatsApp button that opens the chat; beside them an embedded Google Maps iframe with a pin on the address. Revised 2026-11-05 at the owner's request: the embed replaces the earlier static map image. Google may set its own cookies through it, so the cookie policy says so (TODO(legal): confirm whether the map needs consent).
- **Cookie consent.**
  - By default the site sets no cookies, so it shows no banner.
  - If the owner turns on analytics or embeds that set cookies, show a banner with necessary, statistics and marketing categories. "Acceptă tot", "Respinge tot" and "Preferințe" get equal visual weight. Store the choice with a version number, load nothing non-essential before consent, and add a footer link to reopen preferences.
- **Footer.**
  - Columns: useful links, company and legal links, contact with the WhatsApp and phone links, and socials. No community channel.
  - Add the ANPC SAL badge linking to ANPC. The EU online dispute resolution (SOL) platform closed in July 2025. Add a TODO(legal) to confirm with the owner whether the SOL badge is still required.
  - Include a copyright line with the current year computed at build time.
- **SEO.**
  - Give every page a title, description and canonical URL.
  - Add hreflang alternates for ro, en and x-default, a sitemap via `@astrojs/sitemap`, `robots.txt` and Open Graph images.
  - Add LocalBusiness structured data using the `HealthAndBeautyBusiness` type with the phone number. Do not use medical schema types.
- **Analytics.** Off by default. If the owner wants it, prefer a cookieless tool such as Plausible or Umami.
- **Performance.** Lighthouse mobile scores of 95 or higher in all four categories. No layout shift from images or fonts. Lazy-load below-the-fold images.

---

## 9. Content rules

**Wording is the owner's decision (2026-11-06).** The owner decides what the site says about the centre, the EESystem and its effects, and takes responsibility for it. There is no automated word check: the earlier "no claims" rules and the banned-word test (`scripts/banned-words.mjs`) were removed at the owner's request. Write the copy the owner supplies; don't add or remove claims on your own initiative.

- **Testimonials** are published only with the client's written consent.
- **Fresh copy only.** Never copy text or images from the reference sites, which would also breach their copyright.
- **Placeholder images** are neutral local SVGs with a label. No stock photos posing as clients, and no hotlinked images.
- **Legal pages** are drafted as structure plus placeholder text marked TODO(legal), for review by the owner's adviser.

---

## 10. Phases and checks

Run `npm run build` and `npm run check` at the end of every phase, in addition to the phase-specific checks.

| Phase | Work | Checks |
|---|---|---|
| 0. Setup | `git init`. Scaffold Astro (minimal template) into this folder without overwriting CLAUDE.md, WEBSITE_PLAN.md or `.claude/`. Add `.nvmrc`, `.gitignore`, Prettier, the scripts in section 11, and Playwright with Chromium. | `npm run dev` serves on localhost:4321. Build passes. |
| 1. Design system | Tokens, base styles, typography, and UI primitives: Button, Card, Section, Container, Badge, SegmentedControl, Icon. Add a noindex `/_styleguide/` page showing every primitive. Create `.claude/apple-design-context.md`. | Every text and background pair passes AA in both themes. The styleguide renders correctly in light and dark. |
| 2. Layout and i18n | BaseLayout, TopBar, Header, mobile menu, LanguageSwitcher, Footer, SkipLink, SEO head, WhatsApp chat panel, i18n config and route map. | Keyboard-only navigation works. The axe test passes. The language switcher keeps the current page. The chat builds a correct `wa.me` link in both languages. |
| 3. Content | Collection schemas. Placeholder content in both languages: 4 services, about 10 research items across all groups, 6 testimonials, 12 FAQs and 6 gallery images. | Schemas reject bad data. The duplicate-PDF rule fails the build when triggered. |
| 4. Pages | Every page in section 6, in both languages, plus the 404 pages. | Every route returns 200 in `npm run preview`. No missing translations. |
| 5. Enhancements | Research search and filters, lightbox, scroll reveal, service preselection in the chat, structured data, sitemap and the optional consent banner behind a config flag. | Features work with JavaScript on. Booking links and content still work with JavaScript off. Reduced motion is respected. |
| 6. QA | Playwright smoke and axe tests across all routes. Lighthouse on home, research and contact. Test at 320px width, in both themes and at 200% text size. Check diacritics and links. | All tests pass. Lighthouse targets are met. No horizontal scroll at 320px. |
| 7. Deploy prep | `netlify.toml` with build command, publish folder, Node version and basic security headers. A README with local and deploy steps. Replace the placeholder CLAUDE.md with real commands and architecture. | `npm run build && npm run preview` serves the final site. |

---

## 11. Commands to set up

```bash
npm install
npm run dev                                   # dev server at http://localhost:4321
npm run dev -- --host                         # also reachable from a phone on the same Wi-Fi
npm run build                                 # production build into dist/
npm run preview                               # serve the production build locally
npm run check                                 # astro check: types and .astro diagnostics
npm run format                                # Prettier
npm run test                                  # all Playwright tests (builds and previews first)
npx playwright test tests/whatsapp.spec.ts    # one test file
npx playwright test -g "language switcher"    # one test by name
```

Configure Playwright's `webServer` to run the production preview, so tests hit the built site. Test the WhatsApp chat by checking the generated `wa.me` URL, without opening WhatsApp.

Test the real WhatsApp hand-off by hand on a phone using `npm run dev -- --host`.

---

## 12. Definition of done

- [ ] All routes in section 6 exist in Romanian and English and build without warnings.
- [ ] The owner has approved the site's wording (section 9).
- [ ] The WhatsApp chat opens from every booking button, builds the right message in both languages, and falls back to a plain link without JavaScript.
- [ ] Light and dark modes both follow the token table and pass AA contrast.
- [ ] Keyboard, screen reader landmarks, reduced motion and 200% text size all work.
- [ ] The research page follows the reference structure, every card opens its PDF, and it works without JavaScript.
- [ ] The default build sets no cookies.
- [ ] Lighthouse mobile scores are 95 or higher on home, research and contact.
- [ ] Playwright and axe tests pass.
- [ ] README and CLAUDE.md describe how to run, test and deploy.
- [ ] The final report lists every TODO(content) and TODO(legal) item.
