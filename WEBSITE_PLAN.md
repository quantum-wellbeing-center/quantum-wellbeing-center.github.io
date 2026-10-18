# Website build plan: wellness centre site

This file is the hand-off for the agent that builds the site. Section 1 is the prompt to paste into that agent. Sections 2 to 12 are the plan it follows.

---

## 1. Prompt for the next agent

Paste this into a new Claude Code session opened in this folder:

```text
You are building a modern, bilingual marketing website (Romanian first, English second) for a wellness centre, in /Users/romantudorgeorge/VisualStudioProjects/Web.

Read WEBSITE_PLAN.md in full before writing any code, and follow it. It defines the stack, design system, pages, content model, features, guardrails, phases and acceptance checks.

Before any visual work, invoke the project skill `hig-foundations` (.claude/skills/hig-foundations/SKILL.md). The design must follow Apple Human Interface Guidelines foundations translated to the web, as set out in section 5 of the plan. The skill's references/ files are not installed, so rely on SKILL.md and section 5.

Rules:
- Static site. It must run locally with `npm run dev`, preview the production build with `npm run preview`, and deploy to any static host.
- All site content lives in content collections and config files, never hard-coded inside components.
- Section 2 lists owner inputs. Where a value is blank, use a clearly fake placeholder and mark it with "TODO(content)". Mark draft legal text with "TODO(legal)".
- Follow the content guardrails in section 9. Never write that the service treats, cures or prevents any disease, and never copy text or images from the reference sites.
- Work phase by phase as in section 10. At the end of each phase run that phase's checks and fix failures before moving on. Commit at the end of each phase.
- Do not deploy, create accounts on external services, or push to a remote. Prepare the config so the owner can deploy.

When finished, report what was built, which checks pass, and the full list of TODO(content) and TODO(legal) items the owner must fill in.
```

---

## 2. Owner inputs

Fill these in before handing over. Anything left blank becomes a TODO(content) placeholder.

| Item | Value |
|---|---|
| Brand name | |
| Domain | |
| Address and city | |
| Phone, email, WhatsApp number | |
| Opening hours | |
| Booking link (Cal.com, Calendly, Fresha, or WhatsApp) | |
| Social links (Facebook, Instagram, YouTube, TikTok) | |
| Community channel (Telegram or WhatsApp channel) | |
| Logo file and one brand accent colour (hex) | |
| Services, session lengths and prices | |
| Company legal details (name, CUI, Reg. Com.) | |
| Analytics wanted? Which tool? | |
| Research documents (PDFs and their metadata) | |
| Real testimonials and before/after photos, with written consent | |

---

## 3. What the reference sites do

Feature references only. Do not copy their wording, images or claims.

- https://quantumspace.ro/cercetari-stiintifice/
- https://quantumclinic.ro

Both are Romanian wellness centres selling EESystem sessions. The merged feature set to build:

| Feature | Seen on | What we build |
|---|---|---|
| Top info bar with phone, hours, email, socials | quantumspace | Same, hidden on small screens |
| Sticky header, menu, language switcher, "Rezervă" button | both | Same, with a translucent material header |
| Hero with headline and booking CTA | quantumclinic | Same |
| Technology explainer ("how it works") | both | Dedicated page plus a home teaser |
| Benefits list | both | Reframed as "reported experiences", see section 9 |
| Complementary services (coaching, ozone, infrared) | quantumclinic | Service cards on home and pricing page |
| Research library: grouped cards linking to PDFs | quantumspace | Improved: metadata, evidence-type labels, search, filters, no duplicates |
| Before/after gallery | quantumspace | Gallery with an accessible lightbox |
| Testimonials and Google reviews widget | both | Testimonials from a local collection; reviews embed optional, consent-gated |
| Grouped FAQ | quantumclinic | Accordion built on native details elements |
| Pricing | both | Pricing page with service cards |
| Blog / articles | both | Articles with pagination and RSS |
| Contact | both | Contact page with a form, hours and a map link |
| Floating WhatsApp button | quantumclinic | Same |
| Footer: useful links, company links, socials, community CTA, ANPC badges, disclaimer, copyright | both | Same |
| Cookie consent with categories and accept, reject, preferences | quantumclinic | Same, with reject as easy as accept |
| Skip link | quantumspace | Same |

Problems on the reference sites to avoid: a duplicated header block, typos and missing Romanian diacritics, duplicated research entries, PDFs with no metadata, and unsupported medical claims.

---

## 4. Stack and decisions

- **Astro, latest stable.** Static output, content collections with schemas, built-in i18n routing, and zero JavaScript by default. Scaffold with the minimal template.
- **TypeScript in strict mode.**
- **Plain CSS with design tokens as custom properties.** No Tailwind. Tokens map one-to-one onto HIG semantic colours. Component styles use Astro scoped styles.
- **Small vanilla JS islands only** for the mobile menu, research search and filters, the lightbox, scroll reveal, the contact form and cookie consent.
- **Fonts: the system font stack.** Apple devices then render SF Pro natively. Do not self-host SF Pro, because its licence does not allow web embedding.
- **Icons: Lucide**, outline style at one stroke weight. SF Symbols are licensed for Apple-platform apps only, so they cannot be used on a website.
- **Images: astro:assets** for responsive AVIF and WebP output with explicit dimensions.
- **i18n:** Romanian is the default locale at `/`. English lives under `/en/`. The language switcher links to the same page in the other language, not to the home page.
- **Booking:** one external booking URL set in site config. No booking backend.
- **Contact form:** posts to a configurable endpoint. Default to Netlify Forms. Formspree or Web3Forms are drop-in alternatives for other hosts.
- **Hosting:** Netlify by default, for free static hosting, form handling and deploy previews. Cloudflare Pages, Vercel or any host that serves the `dist/` folder also works.
- **Node:** this machine runs Node 26.9.0. Add an `.nvmrc` with a Node version the installed Astro supports, and set the same version on the host.
- **Testing:** `astro check`, Playwright smoke tests, `@axe-core/playwright` accessibility tests, and Lighthouse.
- **Tooling:** Prettier with `prettier-plugin-astro`.

Target layout, high level only:

```text
src/
  config/site.ts          brand, contact, socials, booking URL, form endpoint, feature flags
  content.config.ts       collection schemas (check the location for the installed Astro version)
  content/                research, testimonials, faq, services, blog, gallery
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
4. **Materials.** The sticky header uses a translucent background with `backdrop-filter: saturate(180%) blur(20px)`. Fall back to a solid background when backdrop-filter is unsupported or `prefers-reduced-transparency: reduce` is set.
5. **Shape.** Cards use a 16 to 20px radius. Buttons are capsules. The primary button is filled with the accent colour, and the secondary button uses a tinted fill.
6. **Purposeful motion.** Use subtle fade-and-rise reveals on scroll, 200 to 400ms with ease-out. Under `prefers-reduced-motion: reduce`, remove transforms and keep at most a short crossfade. Nothing autoplays.
7. **Accessibility from the start.** Meet WCAG 2.2 AA contrast: 4.5:1 for body text and 3:1 for large text and UI parts. Show a visible focus ring, use 44 by 44px minimum touch targets, a skip link, landmarks, alt text and correct `lang` attributes. The menu, lightbox, accordion and filters must all work by keyboard.
8. **Writing.** Use sentence-case headings, short verb-led button labels such as "Rezervă o sesiune", and correct Romanian diacritics. Use comma-below ș and ț, not the cedilla forms ş and ţ.
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
| `--success` | #248A3D | #30D158 | Form success, always paired with text |
| `--danger` | #D70015 | #FF453A | Form errors, always paired with text |
| `--material` | rgba(255,255,255,0.72) | rgba(22,22,23,0.72) | Translucent header |

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
| `/tehnologie/` | `/en/technology/` | Technology explainer and complementary services |
| `/cercetari-stiintifice/` | `/en/research/` | Research library |
| `/testimoniale/` | `/en/testimonials/` | Testimonials and before/after gallery |
| `/preturi/` | `/en/pricing/` | Services and prices |
| `/articole/` and `/articole/[slug]/` | `/en/articles/` and `/en/articles/[slug]/` | Blog |
| `/intrebari-frecvente/` | `/en/faq/` | FAQ |
| `/contact/` | `/en/contact/` | Contact |
| `/termeni-si-conditii/` | `/en/terms/` | Terms |
| `/politica-de-confidentialitate/` | `/en/privacy/` | Privacy policy |
| `/politica-cookies/` | `/en/cookies/` | Cookie policy |
| 404 page | 404 page | Not found, in both languages |

**Primary navigation:** Tehnologia, Cercetări științifice, Testimoniale, Prețuri, Articole, Contact, then the language switcher and the "Rezervă" button. FAQ sits in the footer and as a section on the home page.

**Home page sections, in order:**

1. Hero with headline, subheading, "Rezervă o sesiune" and a secondary "Cum funcționează" link.
2. Short introduction to the technology.
3. Reported experiences list.
4. Complementary services cards.
5. Research teaser with three featured items and a link to the library.
6. Testimonials, as a scroll-snap row with no autoplay.
7. FAQ teaser with five questions.
8. Booking CTA band.

---

## 7. Content model

Define every collection with a schema. Each entry has `lang` ("ro" or "en") and a `translationKey` that links the Romanian and English versions.

- **research:** title, authors, year (optional), `evidenceType` (peer-reviewed, clinical-study, pilot-study, case-report, review, anecdotal-report, other), source or publisher, DOI (optional), pdf path or URL, short neutral summary, `group` (published-clinical, research-studies, additional), featured flag. The build must fail on duplicate pdf paths.
- **testimonials:** first name and initial, quote, date, rating (optional), source (google or in-person), `consent: true` required to render.
- **gallery:** image, alt text, caption, `consent: true` required to render.
- **faq:** question, answer in Markdown, category, order.
- **services:** name, description, duration in minutes, price, currency RON, sessions per package (optional), highlighted flag, order.
- **blog:** title, description, publish date, updated date (optional), cover image, author, tags, draft flag.

Site-wide values such as contact details, socials, booking URL, form endpoint, opening hours and analytics settings live in `src/config/site.ts`. UI strings live in the i18n JSON files.

---

## 8. Feature specs

- **Header.** Sticky with the material background. Below about 900px it collapses into a full-screen sheet menu with a focus trap, Escape to close, and `aria-expanded` on the toggle. Render the header once, not twice as on the reference site.
- **Top info bar.** Phone, hours, email and socials. Hidden on small screens, where the phone moves into the menu.
- **Booking CTA.** Every "Rezervă" button reads the one booking URL from config. External links open in a new tab with a visible indicator.
- **Research library.**
  - Show a short intro explaining the evidence-type labels and that some material is not peer-reviewed.
  - Group items into sections with counts. Each card shows title, authors, year, an evidence-type badge, source, and an "Deschide PDF" link labelled with file type and size.
  - Add a search box over titles and authors, and evidence-type filter chips styled as a segmented control.
  - Mirror search and filters in the URL query string, show an empty state, and announce result counts through an `aria-live` region.
  - Without JavaScript, every item still renders.
- **Gallery lightbox.** Built on the native `dialog` element. Arrow keys move between images, Escape closes, and focus returns to the opening thumbnail.
- **FAQ.** Native `details` and `summary`, grouped by category, with FAQPage structured data.
- **Pricing.** Service cards with prices formatted by `Intl` in RON, and a TODO(content) note about VAT.
- **Articles.** Paginated list of 9 per page, reading time, RSS feed, and per-article Open Graph data.
- **Contact.**
  - The form has name, email, optional phone, message, a required privacy-consent checkbox linking to the privacy policy, and a honeypot field.
  - Show clear success and error states.
  - Show address, hours, a tel link, a mailto link and a WhatsApp link.
  - Use a static map image with an "Deschide în Google Maps" link instead of an iframe, because the embed sets cookies.
- **Floating WhatsApp button.** Bottom right, at least 56px, respects `env(safe-area-inset-bottom)`, and never covers the cookie banner.
- **Cookie consent.**
  - Categories are necessary (always on), statistics and marketing.
  - "Acceptă tot", "Respinge tot" and "Preferințe" buttons get equal visual weight.
  - Store the choice with a version number, and load no non-essential script before consent.
  - A footer link reopens the preferences.
  - If no analytics or embeds are configured, show only a short notice.
- **Footer.**
  - Columns: useful links, company and legal links, contact, community CTA, and socials.
  - Add the ANPC SAL badge linking to ANPC. The EU online dispute resolution (SOL) platform closed in July 2025. Add a TODO(legal) to confirm with the owner whether the SOL badge is still required.
  - Include a disclaimer line and a copyright line with the current year computed at build time.
- **SEO.**
  - Give every page a title, description and canonical URL.
  - Add hreflang alternates for ro, en and x-default, a sitemap via `@astrojs/sitemap`, `robots.txt` and Open Graph images.
  - Add LocalBusiness structured data using the `HealthAndBeautyBusiness` type. Do not use medical schema types.
- **Analytics.** Off by default. If the owner wants it, prefer a cookieless tool such as Plausible or Umami. Anything else loads only after statistics consent.
- **Performance.** Lighthouse mobile scores of 95 or higher in all four categories. No layout shift from images or fonts. Lazy-load below-the-fold images.

---

## 9. Content guardrails

Both reference sites claim the technology helps with diseases such as diabetes, autism and infertility, and that it repairs DNA. Under EU Directive 2005/29/EC, Annex I point 17, falsely claiming a product can cure illnesses is always an unfair commercial practice. Romania applies this through Law 363/2007, enforced by ANPC. The site must protect the owner from that risk.

- Describe sessions as relaxation and wellness experiences, not treatment.
- Present benefits as "experiențe raportate de clienți", never as outcomes.
- Do not name diseases as things the service helps. Avoid "vindecă", "tratează" and "previne", and their English equivalents.
- Label every research item's evidence type honestly. Never present a testimonial or pilot report as a clinical study.
- Show a disclaimer in the footer and at the top of the research and testimonials pages. It says the service is not medical, does not replace diagnosis or treatment, and that visitors should consult a doctor.
- Only publish testimonials and before/after photos with written consent from the people shown. Never edit before/after images.
- Write all copy fresh. Copying text or images from the reference sites would also breach their copyright.
- Use neutral local placeholder images such as solid-colour SVGs with a label. No stock photos posing as clients, and no hotlinked images.
- Draft legal pages as structure plus placeholder text marked TODO(legal), for review by the owner's adviser.

---

## 10. Phases and checks

Run `npm run build` and `npm run check` at the end of every phase, in addition to the phase-specific checks.

| Phase | Work | Checks |
|---|---|---|
| 0. Setup | `git init`. Scaffold Astro (minimal template) into this folder without overwriting CLAUDE.md, WEBSITE_PLAN.md or `.claude/`. Add `.nvmrc`, `.gitignore`, Prettier, the scripts in section 11, and Playwright with Chromium. | `npm run dev` serves on localhost:4321. Build passes. |
| 1. Design system | Tokens, base styles, typography, and UI primitives: Button, Card, Section, Container, Badge, SegmentedControl, Icon. Add a noindex `/_styleguide/` page showing every primitive. Create `.claude/apple-design-context.md`. | Every text and background pair passes AA in both themes. The styleguide renders correctly in light and dark. |
| 2. Layout and i18n | BaseLayout, TopBar, Header, mobile menu, LanguageSwitcher, Footer, SkipLink, SEO head, cookie consent, WhatsApp button, i18n config and route map. | Keyboard-only navigation works. The axe test passes on the styleguide. The language switcher keeps the current page. |
| 3. Content | Collection schemas. Placeholder content in both languages: about 10 research items across all groups, 6 testimonials, 12 FAQs, 4 services, 3 articles and 6 gallery images. | Schemas reject bad data. The duplicate-PDF rule fails the build when triggered. |
| 4. Pages | Every page in section 6, in both languages, plus the 404 pages. | Every route returns 200 in `npm run preview`. No missing translations. |
| 5. Enhancements | Research search and filters, lightbox, scroll reveal, contact form wiring, structured data, sitemap, RSS, analytics hook behind consent. | Features work with JavaScript on. Content stays readable with JavaScript off. Reduced motion is respected. |
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
npx playwright test tests/research.spec.ts    # one test file
npx playwright test -g "language switcher"    # one test by name
```

Configure Playwright's `webServer` to run the production preview, so tests hit the built site.

---

## 12. Definition of done

- [ ] All routes in section 6 exist in Romanian and English and build without warnings.
- [ ] Light and dark modes both follow the token table and pass AA contrast.
- [ ] Keyboard, screen reader landmarks, reduced motion and 200% text size all work.
- [ ] The research library searches, filters and labels evidence types, and works without JavaScript.
- [ ] Cookie consent blocks non-essential scripts until accepted, and rejecting is as easy as accepting.
- [ ] No disease-treatment claims anywhere. A disclaimer appears in the footer, research page and testimonials page.
- [ ] Lighthouse mobile scores are 95 or higher on home, research and contact.
- [ ] Playwright and axe tests pass.
- [ ] README and CLAUDE.md describe how to run, test and deploy.
- [ ] The final report lists every TODO(content) and TODO(legal) item.
