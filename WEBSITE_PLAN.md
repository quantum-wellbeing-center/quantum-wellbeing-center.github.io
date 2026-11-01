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
- Appointments and contact go through an on-site WhatsApp chat panel that opens WhatsApp with a prefilled message to +40 742 644 016. There is no contact form and no booking backend. Section 8 specifies the chat.
- The site makes no claims of any kind. No health, therapeutic, medical or benefit claims, no before/after images, no lists of effects. Describe the centre and its services factually. Section 9 has the full rules.
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
| Phone | 0742 644 016 |
| Phone link | tel:+40742644016 |
| WhatsApp for appointments | +40 742 644 016, link base `https://wa.me/40742644016` |
| Brand name | Quantum Wellbeing Center |
| Domain | https://www.quantumwellbeing.ro |
| Address and city | Iclod, județul Cluj (street and postal code still missing) |
| Opening hours | |
| Email | contact@quantumwellbeing.ro |
| Social links (Facebook, Instagram, YouTube, TikTok) | |
| Community channel (Telegram or WhatsApp channel) | |
| Logo file and one brand accent colour (hex) | |
| Services, session lengths and prices | EESystem sessions, individual or in a small group: 60 min 70 RON; 90 min 90 RON; package of 3 + 1 free (four 60-min sessions, 210 RON); pensioners 50 RON per 60-min session |
| Company legal details (name, CUI, Reg. Com.) | |
| Analytics wanted? Which tool? | |
| Research documents (PDFs and their metadata) | |
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
| Services description | both | Factual service cards and a services page |
| Research library: grouped cards linking to PDFs | quantumspace | A neutral document library with metadata, search and filters |
| Photo gallery | quantumspace | Gallery of the centre's space, with an accessible lightbox |
| Testimonials and Google reviews widget | both | Testimonials from a local collection; reviews embed optional, consent-gated |
| Grouped FAQ | quantumclinic | Accordion built on native details elements |
| Pricing | both | Pricing page with service cards |
| Blog / articles | both | Articles with pagination and RSS |
| Contact, floating WhatsApp button | both | An on-site WhatsApp chat panel, plus phone, address and hours |
| Footer: useful links, company links, socials, community CTA, ANPC badges, copyright | both | Same |
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
  content/                services, research, testimonials, faq, blog, gallery
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
| `/servicii/` | `/en/services/` | Services, described factually |
| `/cercetari-stiintifice/` | `/en/research/` | Document library |
| `/testimoniale/` | `/en/testimonials/` | Testimonials and gallery of the centre |
| `/preturi/` | `/en/pricing/` | Services and prices |
| `/articole/` and `/articole/[slug]/` | `/en/articles/` and `/en/articles/[slug]/` | Blog |
| `/intrebari-frecvente/` | `/en/faq/` | FAQ |
| `/contact/` | `/en/contact/` | WhatsApp, phone, address, hours, map link |
| `/termeni-si-conditii/` | `/en/terms/` | Terms |
| `/politica-de-confidentialitate/` | `/en/privacy/` | Privacy policy |
| `/politica-cookies/` | `/en/cookies/` | Cookie policy |
| 404 page | 404 page | Not found, in both languages |

**Primary navigation:** Servicii, Cercetări științifice, Testimoniale, Prețuri, Articole, Contact, then the language switcher and the "Rezervă" button. FAQ sits in the footer and as a section on the home page.

**Home page sections, in order:**

1. Hero with the "Centru de wellness" eyebrow, headline, subheading, a "Programează-te pe WhatsApp" button and a secondary "Vezi serviciile" link.
2. Short, factual introduction to the centre: who you are, where you are, what the space is like.
3. Service cards: name, duration, price from, and a link.
4. "Cum te programezi" in three steps: write on WhatsApp, confirm the time, come to the centre.
5. Gallery carousel with photos of the space, auto-advancing with the controls in section 5 principle 6; a plain scroll-snap strip without JavaScript.
6. Testimonials, as a scroll-snap row with no autoplay.
7. FAQ teaser with five questions.
8. CTA band with the WhatsApp button and the phone number.

---

## 7. Content model

Define every collection with a schema. Each entry has `lang` ("ro" or "en") and a `translationKey` that links the Romanian and English versions.

- **services:** name, factual description, duration in minutes, price, currency RON, sessions per package (optional), highlighted flag, order, and the WhatsApp message to prefill when booking this service.
- **research:** title, authors, year (optional), `documentType` (peer-reviewed article, clinical study, pilot study, case report, review, report, other), source or publisher, DOI (optional), pdf path or URL, a one-line neutral description of what the document is, `group`, featured flag. The description says what the document is, never what it claims. The build must fail on duplicate pdf paths.
- **testimonials:** first name and initial, quote, date, rating (optional), source (google or in-person), `consent: true` required to render.
- **gallery:** image of the centre or team, alt text, caption, `consent: true` required when a person is identifiable.
- **faq:** question, answer in Markdown, category, order. Cover practical topics: booking, what to bring, duration, cancellation, payment, location, parking.
- **blog:** title, description, publish date, updated date (optional), cover image, author, tags, draft flag.

Site-wide values such as phone, WhatsApp number, prefilled messages, socials, opening hours and analytics settings live in `src/config/site.ts`. UI strings live in the i18n JSON files.

---

## 8. Feature specs

- **WhatsApp chat panel.** This is the only booking and contact channel.
  - A floating round button sits bottom right: at least 56px, the WhatsApp glyph, `--whatsapp` colours, and an accessible name such as "Scrie-ne pe WhatsApp". It respects `env(safe-area-inset-bottom)` and never covers the cookie notice.
  - Clicking it opens a chat-style panel built on the native `dialog` element, with the material background. It has a header with the centre's name and logo, plus a line such as "Îți răspundem în timpul programului" with the hours from config.
  - The panel shows a greeting bubble, "Bună! Cu ce te putem ajuta?", and quick-reply chips: "Vreau o programare", "Întrebare despre prețuri" and "Altă întrebare".
  - Below the bubble are optional fields for name and preferred day and time, a message box, and a "Trimite pe WhatsApp" button.
  - Sending opens `https://wa.me/40742644016?text=` plus the URL-encoded message. The message is assembled from the chosen chip, the fields and the page language. Example: "Bună ziua! Aș dori o programare. Nume: Ana. Ziua/ora preferată: joi după-amiază."
  - A secondary "Sună: 0742 644 016" link uses `tel:+40742644016`.
  - Every "Rezervă" and "Programează-te" button opens the same panel. Service cards preselect "Vreau o programare" and add the service name to the message.
  - Without JavaScript, each of those buttons is a plain `wa.me` link with a default prefilled message, so booking still works.
  - The panel loads no third-party script and sets no cookies. Nothing is sent anywhere until the visitor taps send. Focus is trapped while open, Escape closes it, and focus returns to the button that opened it.
  - The privacy policy explains that messages are handled by WhatsApp, which Meta operates.
- **Header.** Sticky with the material background. Below about 900px it collapses into a full-screen sheet menu with a focus trap, Escape to close, and `aria-expanded` on the toggle. Render the header once, not twice as on the reference site.
- **Top info bar.** Phone, hours, email and socials. Hidden on small screens, where the phone moves into the menu.
- **Research library.**
  - Present it as a document library with no editorial commentary. A short intro says the documents are listed for information and that some are not peer-reviewed.
  - Group items into sections with counts. Each card shows title, authors, year, a document-type badge, source, and an "Deschide PDF" link labelled with file type and size.
  - Add a search box over titles and authors, and document-type filter chips styled as a segmented control.
  - Mirror search and filters in the URL query string, show an empty state, and announce result counts through an `aria-live` region.
  - Without JavaScript, every item still renders.
- **Gallery lightbox.** Built on the native `dialog` element. Arrow keys move between images, Escape closes, and focus returns to the opening thumbnail.
- **FAQ.** Native `details` and `summary`, grouped by category, with FAQPage structured data.
- **Pricing.** Service cards with prices formatted by `Intl` in RON, each with a "Programează-te" button that opens the chat. Add a TODO(content) note about VAT.
- **Articles.** Paginated list of 9 per page, reading time, RSS feed, and per-article Open Graph data.
- **Contact page.** The WhatsApp button that opens the chat, the phone link, address, hours, email, and socials. Use a static map image with an "Deschide în Google Maps" link instead of an iframe, because the embed sets cookies.
- **Cookie consent.**
  - By default the site sets no cookies, so it shows no banner.
  - If the owner turns on analytics or embeds that set cookies, show a banner with necessary, statistics and marketing categories. "Acceptă tot", "Respinge tot" and "Preferințe" get equal visual weight. Store the choice with a version number, load nothing non-essential before consent, and add a footer link to reopen preferences.
- **Footer.**
  - Columns: useful links, company and legal links, contact with the WhatsApp and phone links, community CTA, and socials.
  - Add the ANPC SAL badge linking to ANPC. The EU online dispute resolution (SOL) platform closed in July 2025. Add a TODO(legal) to confirm with the owner whether the SOL badge is still required.
  - Include a copyright line with the current year computed at build time.
- **SEO.**
  - Give every page a title, description and canonical URL.
  - Add hreflang alternates for ro, en and x-default, a sitemap via `@astrojs/sitemap`, `robots.txt` and Open Graph images.
  - Add LocalBusiness structured data using the `HealthAndBeautyBusiness` type with the phone number. Do not use medical schema types.
- **Analytics.** Off by default. If the owner wants it, prefer a cookieless tool such as Plausible or Umami.
- **Performance.** Lighthouse mobile scores of 95 or higher in all four categories. No layout shift from images or fonts. Lazy-load below-the-fold images.

---

## 9. Content rules: no claims

The site presents a Centru de wellness and makes no claims of any kind.

- **No health or benefit claims.** Do not say or imply that any service treats, cures, prevents, heals, repairs, detoxifies, boosts immunity, reduces stress or pain, slows ageing, or improves any condition. Avoid words such as "vindecă", "tratează", "previne", "terapie", "beneficii", "efecte" and their English equivalents.
- **No conditions or diseases** mentioned anywhere, including in FAQ answers, testimonials, articles and image alt text.
- **Describe services factually:** what the service is, what happens during a visit, how long it takes, what it costs, and how to book.
- **EESystem by name only.** The sessions may be called EESystem sessions (owner decision, 2026-11-02). Do not expand the acronym, explain how the system works, or repeat any wording from the owner's flyers about what it does: scalar fields, biophotons, energy, frequencies, detox, cells, DNA, circulation, sleep, balance, or any condition.
- **No before/after images.** The gallery shows the space, the team and the atmosphere only.
- **Testimonials** talk about the experience, the staff, the space or the booking. Leave out any quote that mentions health results, even from a real client. Publish them only with written consent.
- **Research library** lists documents neutrally, with no summaries of findings and no headline claims.
- **Articles** stay on practical or lifestyle topics with no health claims. Placeholder articles are about visiting the centre, booking and the team.
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
| 3. Content | Collection schemas. Placeholder content in both languages: 4 services, about 10 research items across all groups, 6 testimonials, 12 FAQs, 3 articles and 6 gallery images. | Schemas reject bad data. The duplicate-PDF rule fails the build when triggered. A search of all content for the banned words in section 9 finds nothing. |
| 4. Pages | Every page in section 6, in both languages, plus the 404 pages. | Every route returns 200 in `npm run preview`. No missing translations. |
| 5. Enhancements | Research search and filters, lightbox, scroll reveal, service preselection in the chat, structured data, sitemap, RSS, and the optional consent banner behind a config flag. | Features work with JavaScript on. Booking links and content still work with JavaScript off. Reduced motion is respected. |
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
- [ ] The site presents itself as a Centru de wellness and contains no claims, as defined in section 9.
- [ ] The WhatsApp chat opens from every booking button, builds the right message in both languages, and falls back to a plain link without JavaScript.
- [ ] Light and dark modes both follow the token table and pass AA contrast.
- [ ] Keyboard, screen reader landmarks, reduced motion and 200% text size all work.
- [ ] The research library searches, filters and labels document types, and works without JavaScript.
- [ ] The default build sets no cookies.
- [ ] Lighthouse mobile scores are 95 or higher on home, research and contact.
- [ ] Playwright and axe tests pass.
- [ ] README and CLAUDE.md describe how to run, test and deploy.
- [ ] The final report lists every TODO(content) and TODO(legal) item.
