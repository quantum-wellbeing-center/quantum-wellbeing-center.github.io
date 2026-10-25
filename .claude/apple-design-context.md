# Apple design context

Read by the `hig-foundations` skill before asking questions. Everything below is decided; do not ask again.

## Platform and targets

- Platform: **web** (static Astro site), bilingual Romanian (default) and English.
- Accessibility level: **WCAG 2.2 AA** (4.5:1 body text, 3:1 large text and UI parts, visible focus ring, 44x44 touch targets, reduced motion, landmarks, correct `lang`).
- No Apple-only assets: SF Pro is not self-hosted (licence) and SF Symbols are not used (licence). Icons are **Lucide** (outline, stroke 1.75) plus locally drawn brand glyphs (Facebook, Instagram, YouTube, TikTok, WhatsApp) in the same style.

## Where things live

- Tokens: `src/styles/tokens.css` (light on `:root`, dark under `prefers-color-scheme: dark`).
- Type scale: `src/styles/typography.css` (utility classes `.text-*` and element defaults).
- Reset, focus, motion, helpers: `src/styles/base.css`.
- Primitives: `src/components/ui/` (Button, Card, Section, Container, Badge, SegmentedControl, Icon).
- Booking and contact: `src/components/BookingLink.astro` (every "Rezervă" / "Programează-te" button) opens the chat panel `src/components/islands/WhatsAppChat.astro`, mounted once by BaseLayout; message helpers in `src/lib/whatsapp.ts` and `src/lib/whatsapp-message.ts`. There is no contact form and no booking URL.
- Styleguide: `/styleguide/` (noindex, excluded from the sitemap).
- Contrast check: `node tests/contrast.mjs` (fails on any pair below target).
- Content rules check: `node scripts/check-content.mjs` (banned words in content, i18n and `site.ts`).

## Colour tokens

Apple semantic colours, with the accent and the alternating backgrounds retuned to the brand
hues sampled from the banner (`src/assets/photos/banner.jpg`): deep navy, teal and cyan. Colour
lives in a few deliberate places (the hero, the CTA band, the secondary-section tint, step
numbers, service-card icons, eyebrows and links); everything else stays neutral.

| Token                 | Light                 | Dark                  | Use                                                   |
| --------------------- | --------------------- | --------------------- | ----------------------------------------------------- |
| `--bg`                | #FFFFFF               | #000000               | Page background                                       |
| `--bg-secondary`      | #EEF3F8               | #141E2B               | Alternating sections, footer (cool brand tint)        |
| `--bg-elevated`       | #FFFFFF               | #232B36               | Cards, chat bubbles and inputs, consent dialog        |
| `--label`             | #1D1D1F               | #F5F5F7               | Primary text                                          |
| `--label-secondary`   | #6E6E73               | #A1A1A6               | Captions and metadata                                 |
| `--separator`         | rgba(60,60,67,.29)    | rgba(84,84,88,.6)     | Hairlines                                             |
| `--fill`              | rgba(120,120,128,.12) | rgba(120,120,128,.24) | Inputs, tinted controls                               |
| `--brand-navy`        | #0B2242               | #0B2242               | Banner navy: hero fill and scrim, gradient start      |
| `--brand-teal`        | #1A5F6E               | #1A5F6E               | Banner teal: gradient end                             |
| `--brand-cyan`        | #8FE3FF               | #8FE3FF               | Banner highlight: links and eyebrow on brand surfaces |
| `--brand-gradient`    | navy → teal, 135deg   | same                  | CTA band (`Section tone="brand"`)                     |
| `--accent`            | #0E7390               | #46BFE3               | Links, text on tint, eyebrows, small icons            |
| `--accent-fill`       | #0E7390               | #46BFE3               | Primary button background, step numbers               |
| `--on-accent`         | #FFFFFF               | #0B2242               | Text on `--accent-fill`                               |
| `--accent-tint`       | rgba(14,115,144,.12)  | rgba(70,191,227,.16)  | Secondary button, accent badge                        |
| `--accent-strong`     | #0A6681               | #6FD0EC               | Text on `--accent-tint`                               |
| `--success`           | #1F7A35               | #30D158               | Success text, always with text                        |
| `--success-strong`    | #1C7031               | #30D158               | Text on `--success-tint`                              |
| `--danger`            | #D70015               | #FF6961               | Error text, always with text                          |
| `--danger-strong`     | #C40013               | #FF8781               | Text on `--danger-tint`                               |
| `--warning`           | #9A4A00               | #FFB340               | Caution text (footer SOL note)                        |
| `--warning-strong`    | #9A4A00               | #FFB340               | Text on `--warning-tint`                              |
| `--whatsapp`          | #128C7E               | #25D366               | Glyph-only floating WhatsApp button (3:1 UI)          |
| `--whatsapp-fill`     | #107A6E               | #25D366               | WhatsApp buttons with a text label                    |
| `--on-whatsapp`       | #FFFFFF               | #000000               | Glyph and text on the two above                       |
| `--scrim`             | rgba(0,0,0,.32)       | rgba(0,0,0,.55)       | Backdrop of the chat panel                            |
| `--material`          | rgba(255,255,255,.72) | rgba(22,22,23,.72)    | Translucent header and chat panel                     |
| `--material-fallback` | #FFFFFF               | #161617               | Header and chat panel without backdrop-filter         |
| `--focus-ring`        | #0E7390               | #46BFE3               | Focus outline                                         |

### Brand surfaces (`.surface-brand`)

The home hero (over the banner) and the CTA band are always dark, in both schemes. Instead of
hard-coding colours there, `.surface-brand` in tokens.css re-maps the semantic tokens, so
Button, BookingLink and links keep working unchanged: `--label` #FFFFFF, `--label-secondary`
#CFD9E4, `--accent` #8FE3FF (cyan links and eyebrow), `--accent-fill` #FFFFFF with
`--on-accent` #0B2242 (white primary button, navy text, 15.9:1), `--accent-tint`
rgba(255,255,255,.18) with `--accent-strong` #FFFFFF (translucent secondary button, 4.69:1 on
teal), `--focus-ring` #FFFFFF. `Section tone="brand"` applies the gradient plus this class.

### Hero rules

- The banner (`src/assets/photos/banner.jpg`, frame cropped off by `scripts/prepare-photos.mjs`)
  is a decorative `<Picture>` (avif/webp, `alt=""`, eager, `fetchpriority="high"`) behind the copy.
- Below 80em: cover-fitted, `object-position: 51% 0`, under a clear band (`--hero-band`,
  clamp(13rem, 60vw, 24rem)) that shows the logo; the copy sits under the band on a vertical
  scrim that fades from navy at 12% through 30% to 90% just above the first line.
- From 80em: the copy takes the left 34rem of the container; the image keeps its own aspect
  ratio, as tall as the hero (min-height min(42vw, 48rem)) and anchored right, so the logo lands
  right of the copy (its left arc may touch the copy between 80em and ~84em); on very wide
  screens the navy fills the left and the image's left edge is feathered with a mask. The scrim
  is a horizontal gradient: navy 90% up to the copy's right edge, fading to 12% over 16rem.
- The hero headline is `clamp(2.5rem, 4.2vw, 4rem)`, a notch under `.text-display`, so it holds
  two lines in the copy column (a taller hero would slide the image under the copy).
- Worst case contrast (tests/contrast.mjs "hero" rows): white text over the 90% navy scrim
  composited on a pure white pixel is 11.88:1, the lead 8.31:1, the cyan eyebrow 8.26:1.

### Deviations from the plan's table, with reasons

- **Accent retuned from HIG blue to the brand teal-blue.** Light #0E7390 reaches 5.42:1 on white
  and 4.86:1 on `--bg-secondary`; white button text 5.42:1. In dark mode links and the button
  fill are the brand cyan #46BFE3 (9.8:1 on black, 6.68:1 on cards) and the button carries navy
  text (7.43:1) rather than white, so one fill serves links, buttons and the focus ring.
- **`--bg-secondary` and dark `--bg-elevated` carry a cool brand tint** (#EEF3F8; #141E2B and
  #232B36) instead of Apple's neutral greys. Light `--label-secondary` on #EEF3F8 is 4.54:1.
- **`--success` light: #248A3D → #1F7A35.** Apple's green reaches only 4.40:1 on white; the darker value gives 5.39:1 on white and 4.95:1 on `--bg-secondary`.
- **`--danger` dark: #FF453A → #FF6961.** Apple's red reaches only 4.10:1 on `--bg-elevated` (#2C2C2E); the lighter value gives 4.94:1 there and 7.45:1 on black.
- **Added `--accent-fill` and `--on-accent`.** Kept as separate tokens so a scheme can use a different fill or text colour for the primary button than for links (dark mode now uses the same cyan fill with navy text; `.surface-brand` uses a white fill).
- **Added `--warning`** (not in Apple's table) for caution text such as the footer's TODO(legal) note on the SOL badge; 6.26:1 light, 11.77:1 dark on `--bg`. It never labels research documents: the library carries neutral document-type badges only.
- **Added `--accent-tint`, `--success-tint`, `--danger-tint`, `--warning-tint`, `--fill-strong`, `--focus-ring`** as derived tokens so components never write raw colours.
- **Added `--whatsapp-fill` next to `--whatsapp`.** The plan's WhatsApp teal #128C7E gives white only 4.14:1, enough for the glyph-only floating button (UI target 3:1) but not for button text. Buttons that carry a label ("Trimite pe WhatsApp", "Programează-te pe WhatsApp") use the deeper #107A6E, 5.21:1 for white text. In dark mode both are the brand green #25D366 with a black glyph or label (10.59:1). The `whatsapp` Button variant uses `--whatsapp-fill`; only the floating button uses `--whatsapp`.
- **Added `--*-strong` text tokens for tinted surfaces.** A tint lightens the surface it sits on, so the plain `--accent` over `--accent-tint` drops to 4.31:1 (light, on `--bg-secondary`) and 3.69:1 (dark, on `--bg-elevated`), which axe flagged. Secondary buttons and badges therefore use `--accent-strong`, `--success-strong`, `--danger-strong`, `--warning-strong`: slightly darker than the base in light mode, slightly lighter in dark mode, and verified against the tint alpha-composited over every background.

### Contrast results (tests/contrast.mjs)

All 112 checked pairs pass (text on each background, button text on the fill, "-strong" text over each composited tint, label on `--fill`, the WhatsApp pairs, fill and focus ring as UI contrast, the `.surface-brand` pairs against both ends of the gradient, and the hero scrim worst case). Lowest ratios: light `--label-secondary` on `--bg-secondary` 4.54:1; brand `--accent-strong` on its tint over `--brand-teal` 4.69:1; brand `--accent` (cyan) on `--brand-teal` 5.02:1; light `--accent` on `--bg-secondary` 4.86:1; light `--whatsapp` against `--bg-secondary` 3.70:1 (UI target 3:1).

## Type scale

System font stack (`-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`), all sizes in rem so browser text-size settings scale everything (the web stand-in for Dynamic Type).

| Style                | Size / line height                | Weight | Class               |
| -------------------- | --------------------------------- | ------ | ------------------- |
| Display (hero only)  | clamp(2.75rem, 6vw, 5rem) / 1.05  | 700    | `.text-display`     |
| Hero headline        | clamp(2.5rem, 4.2vw, 4rem) / 1.05 | 700    | `.hero__title`      |
| Large title (h1)     | 2.125rem / 1.2                    | 700    | `.text-large-title` |
| Title 1 (h2)         | 1.75rem / 1.2                     | 700    | `.text-title-1`     |
| Title 2 (h3)         | 1.375rem / 1.27                   | 600    | `.text-title-2`     |
| Title 3 (h4)         | 1.25rem / 1.25                    | 600    | `.text-title-3`     |
| Headline (h5, h6)    | 1.0625rem / 1.3                   | 600    | `.text-headline`    |
| Body (p)             | 1.0625rem / 1.47                  | 400    | `.text-body`        |
| Callout              | 1rem / 1.31                       | 400    | `.text-callout`     |
| Subheadline          | 0.9375rem / 1.33                  | 400    | `.text-subheadline` |
| Footnote (small)     | 0.8125rem / 1.38                  | 400    | `.text-footnote`    |
| Caption (figcaption) | 0.75rem / 1.33                    | 400    | `.text-caption`     |

Negative letter-spacing only on Display (-0.02em) and Large title (-0.012em). Measure: `--measure` 65ch for running text, `.prose` applies it.

## Materials

Header bar and chat panel: `background: var(--material); backdrop-filter: saturate(180%) blur(20px)`. Solid `--material-fallback` under `@supports not (backdrop-filter: blur(1px))` and `@media (prefers-reduced-transparency: reduce)`. In the header the filter sits on a `::before` pseudo-element of the bar, never on an ancestor of the mobile sheet: `backdrop-filter` makes an element the containing block for fixed descendants, which would pin the full-screen sheet to the bar instead of the viewport. The chat panel is itself the fixed element, so it carries the filter directly; its `::backdrop` is `--scrim`.

## Shape

- Cards: `--radius-card` 18px (range 16 to 20px), hairline or subtle shadow, never heavy borders.
- Photos (`src/assets/photos/`, prepared by `scripts/prepare-photos.mjs`): `astro:assets` with explicit `widths`/`sizes`, lazy below the fold, `--radius-card` corners, `--shadow-md`, a footnote-size caption from page content. Alt text and captions live in the content collections, never in components, and describe only what is visible (never the room's equipment).
- Buttons: capsules (`--radius-capsule`). Primary = filled `--accent-fill`; secondary = tinted `--accent-tint`; plain = text only; whatsapp = filled `--whatsapp-fill`. Labels wrap (`text-wrap: balance`, no `nowrap`), so "Programează-te pe WhatsApp" fits a 320px screen at 200% text without horizontal scroll; full-width buttons keep only 0.5rem of side padding because their content is centred anyway.
- Logo: mark plus wordmark; the wordmark may wrap at 320px and 200% text, and the desktop header pins the brand (`flex-shrink: 0`) so it never wraps there.
- Chat panel: a bottom sheet below 640px (top corners `--radius-lg`), a 24rem floating card above; bubbles use `--radius-lg` with one small corner; chips are capsules.
- Badges and segmented controls: capsules.
- Spacing scale `--space-1` (0.25rem) to `--space-10` (8rem); container 75rem (~1200px); narrow container 72ch.

## Motion

- Durations 150 / 250 / 400ms, `--ease-out` cubic-bezier(0.25, 0.1, 0.25, 1).
- Scroll reveals (Phase 5): fade and rise, 200 to 400ms, ease-out. Nothing autoplays.
- Chat panel: opens with `chat-in` (250ms fade and 0.5rem rise, ease-out); the floating button slides up by `--consent-offset` when a consent banner is shown.
- Under `prefers-reduced-motion: reduce`: base.css zeroes every transition and animation; elements with `.allow-fade` keep an opacity-only crossfade of 150ms; the chat panel switches to `chat-fade` (opacity only). Hover lifts and scale effects are removed.

## Accessibility implementation

- `:focus-visible`: 3px solid `--focus-ring`, 3px offset, on every background (3:1 or better).
- Touch targets 44x44 (`--touch-target`); small controls grow to 44px under `(pointer: coarse)`.
- Skip link to `#main`; landmarks: `header`, `nav[aria-label]`, `main`, `footer`; `aria-current="page"` on the active nav link; `lang` and `hreflang` on the language switch link.
- Mobile menu: `aria-expanded`, `aria-controls`, focus trap, Escape, focus return, scroll lock; works without JS as a static list. Its document-level key handler yields Escape and Tab to any open modal dialog, so the chat panel opened from inside the sheet closes first and returns focus to the "Rezervă" link while the sheet stays open.
- Chat panel: native `<dialog>` opened with `showModal()` (page inert, Escape closes), `aria-label`, focus trap inside the panel, focus returns to the trigger, body scroll lock shared with the menu. Quick-reply chips are a radio group (single-select, arrow keys, checked state exposed). Every trigger is a `BookingLink`: a plain `wa.me` link with a prefilled message when JavaScript is off. Close control, chips and inputs are at least 44px tall; the floating button is 56px and respects `env(safe-area-inset-bottom)`.
- Cookie consent: rendered only when `needsConsentBanner()` in `site.ts` is true (gtag analytics or the reviews embed); the default build has no banner, notice, markup or script. When enabled: `role="dialog"` with `aria-labelledby`/`aria-describedby`, equal-weight buttons, reopened from a footer link that exists only in that case.
- External links: `target="_blank" rel="noopener"`, a visible arrow icon and a visually-hidden "(se deschide într-o filă nouă)" note.

## Writing

- Romanian first, comma-below ș/ț (U+0219/U+021B), never cedilla forms.
- Sentence-case headings, short verb-led button labels ("Programează-te pe WhatsApp", "Rezervă", "Trimite pe WhatsApp").
- No claims of any kind (WEBSITE_PLAN.md section 9). Services are described factually: what the service is, what happens during a visit, how long it takes, what it costs, how to book. No health, benefit or effect claims, no conditions or diseases, and none of the effect words (relaxare, energie, echilibru, detox, sănătate, terapie, beneficii, efecte, stres, tratament and their English forms) anywhere, including the tagline, alt text, metadata and the WhatsApp message templates. `scripts/check-content.mjs` enforces the list.
- No disclaimer anywhere: there is nothing to disclaim. The research library lists documents neutrally, with a document type and a one-line description of what each document is.
- Booking and contact copy always points to WhatsApp or the phone number; there is no form.
- Placeholders are marked `TODO(content)`; draft legal text `TODO(legal)`.
