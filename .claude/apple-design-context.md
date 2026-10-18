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
- Styleguide: `/styleguide/` (noindex, excluded from the sitemap).
- Contrast check: `node tests/contrast.mjs` (fails on any pair below target).

## Colour tokens

Apple system colours, with secondary text and accent darkened so small text passes AA on the web.

| Token                 | Light                 | Dark                  | Use                                 |
| --------------------- | --------------------- | --------------------- | ----------------------------------- |
| `--bg`                | #FFFFFF               | #000000               | Page background                     |
| `--bg-secondary`      | #F5F5F7               | #1C1C1E               | Alternating sections, footer        |
| `--bg-elevated`       | #FFFFFF               | #2C2C2E               | Cards, consent dialog               |
| `--label`             | #1D1D1F               | #F5F5F7               | Primary text                        |
| `--label-secondary`   | #6E6E73               | #A1A1A6               | Captions and metadata               |
| `--separator`         | rgba(60,60,67,.29)    | rgba(84,84,88,.6)     | Hairlines                           |
| `--fill`              | rgba(120,120,128,.12) | rgba(120,120,128,.24) | Inputs, tinted controls             |
| `--accent`            | #0066CC               | #2997FF               | Links, text on tint                 |
| `--accent-fill`       | #0066CC               | #0071EE               | Primary button background           |
| `--on-accent`         | #FFFFFF               | #FFFFFF               | Text on `--accent-fill`             |
| `--accent-tint`       | rgba(0,102,204,.12)   | rgba(41,151,255,.16)  | Secondary button, accent badge      |
| `--accent-strong`     | #005EBD               | #58AEFF               | Text on `--accent-tint`             |
| `--success`           | #1F7A35               | #30D158               | Success text, always with text      |
| `--success-strong`    | #1C7031               | #30D158               | Text on `--success-tint`            |
| `--danger`            | #D70015               | #FF6961               | Error text, always with text        |
| `--danger-strong`     | #C40013               | #FF8781               | Text on `--danger-tint`             |
| `--warning`           | #9A4A00               | #FFB340               | Caution labels (anecdotal evidence) |
| `--warning-strong`    | #9A4A00               | #FFB340               | Text on `--warning-tint`            |
| `--material`          | rgba(255,255,255,.72) | rgba(22,22,23,.72)    | Translucent header                  |
| `--material-fallback` | #FFFFFF               | #161617               | Header without backdrop-filter      |
| `--focus-ring`        | #0066CC               | #2997FF               | Focus outline                       |

### Deviations from the plan's table, with reasons

- **`--success` light: #248A3D → #1F7A35.** Apple's green reaches only 4.40:1 on white; the darker value gives 5.39:1 on white and 4.95:1 on `--bg-secondary`.
- **`--danger` dark: #FF453A → #FF6961.** Apple's red reaches only 4.10:1 on `--bg-elevated` (#2C2C2E); the lighter value gives 4.94:1 there and 7.45:1 on black.
- **Added `--accent-fill` and `--on-accent`.** White text on the dark-mode accent #2997FF is 3.02:1, so the primary button uses a deeper fill in dark mode (#0071EE: 4.57:1 for white text, 3.05:1 against the elevated card). Links keep #2997FF.
- **Added `--warning`** (not in Apple's table) for "anecdotal report" style labels; 6.26:1 light, 11.77:1 dark on `--bg`.
- **Added `--accent-tint`, `--success-tint`, `--danger-tint`, `--warning-tint`, `--fill-strong`, `--focus-ring`** as derived tokens so components never write raw colours.
- **Added `--*-strong` text tokens for tinted surfaces.** A tint lightens the surface it sits on, so the plain `--accent` over `--accent-tint` drops to 4.31:1 (light, on `--bg-secondary`) and 3.69:1 (dark, on `--bg-elevated`), which axe flagged. Secondary buttons and badges therefore use `--accent-strong`, `--success-strong`, `--danger-strong`, `--warning-strong`: slightly darker than the base in light mode, slightly lighter in dark mode, and verified against the tint alpha-composited over every background.

### Contrast results (tests/contrast.mjs)

All 80 checked pairs pass (text on each background, button text on the fill, "-strong" text over each composited tint, label on `--fill`, fill and focus ring as UI contrast). Lowest ratios: light `--label-secondary` on `--bg-secondary` 4.66:1; dark `--accent` on `--bg-elevated` 4.62:1; dark `--on-accent` on `--accent-fill` 4.57:1; dark `--accent-strong` on its tint over `--bg-elevated` 4.72:1; dark `--accent-fill` against `--bg-elevated` 3.05:1 (UI target 3:1).

## Type scale

System font stack (`-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`), all sizes in rem so browser text-size settings scale everything (the web stand-in for Dynamic Type).

| Style                | Size / line height               | Weight | Class               |
| -------------------- | -------------------------------- | ------ | ------------------- |
| Display (hero only)  | clamp(2.75rem, 6vw, 5rem) / 1.05 | 700    | `.text-display`     |
| Large title (h1)     | 2.125rem / 1.2                   | 700    | `.text-large-title` |
| Title 1 (h2)         | 1.75rem / 1.2                    | 700    | `.text-title-1`     |
| Title 2 (h3)         | 1.375rem / 1.27                  | 600    | `.text-title-2`     |
| Title 3 (h4)         | 1.25rem / 1.25                   | 600    | `.text-title-3`     |
| Headline (h5, h6)    | 1.0625rem / 1.3                  | 600    | `.text-headline`    |
| Body (p)             | 1.0625rem / 1.47                 | 400    | `.text-body`        |
| Callout              | 1rem / 1.31                      | 400    | `.text-callout`     |
| Subheadline          | 0.9375rem / 1.33                 | 400    | `.text-subheadline` |
| Footnote (small)     | 0.8125rem / 1.38                 | 400    | `.text-footnote`    |
| Caption (figcaption) | 0.75rem / 1.33                   | 400    | `.text-caption`     |

Negative letter-spacing only on Display (-0.02em) and Large title (-0.012em). Measure: `--measure` 65ch for running text, `.prose` applies it.

## Materials

Header bar: `background: var(--material); backdrop-filter: saturate(180%) blur(20px)`. Solid `--material-fallback` under `@supports not (backdrop-filter: blur(1px))` and `@media (prefers-reduced-transparency: reduce)`. The filter sits on a `::before` pseudo-element of the header bar, never on an ancestor of the mobile sheet: `backdrop-filter` makes an element the containing block for fixed descendants, which would pin the full-screen sheet to the bar instead of the viewport.

## Shape

- Cards: `--radius-card` 18px (range 16 to 20px), hairline or subtle shadow, never heavy borders.
- Buttons: capsules (`--radius-capsule`). Primary = filled `--accent-fill`; secondary = tinted `--accent-tint`; plain = text only.
- Badges and segmented controls: capsules.
- Spacing scale `--space-1` (0.25rem) to `--space-10` (8rem); container 75rem (~1200px); narrow container 72ch.

## Motion

- Durations 150 / 250 / 400ms, `--ease-out` cubic-bezier(0.25, 0.1, 0.25, 1).
- Scroll reveals (Phase 5): fade and rise, 200 to 400ms, ease-out. Nothing autoplays.
- Under `prefers-reduced-motion: reduce`: base.css zeroes every transition and animation; elements with `.allow-fade` keep an opacity-only crossfade of 150ms. Hover lifts and scale effects are removed.

## Accessibility implementation

- `:focus-visible`: 3px solid `--focus-ring`, 3px offset, on every background (3:1 or better).
- Touch targets 44x44 (`--touch-target`); small controls grow to 44px under `(pointer: coarse)`.
- Skip link to `#main`; landmarks: `header`, `nav[aria-label]`, `main`, `footer`; `aria-current="page"` on the active nav link; `lang` and `hreflang` on the language switch link.
- Mobile menu: `aria-expanded`, `aria-controls`, focus trap, Escape, focus return, scroll lock; works without JS as a static list.
- Cookie consent: `role="dialog"` with `aria-labelledby`/`aria-describedby`, equal-weight buttons, reopened from the footer.
- External links: `target="_blank" rel="noopener"`, a visible arrow icon and a visually-hidden "(se deschide într-o filă nouă)" note.

## Writing

- Romanian first, comma-below ș/ț (U+0219/U+021B), never cedilla forms.
- Sentence-case headings, short verb-led button labels ("Rezervă o sesiune").
- Sessions are relaxation and wellness experiences. Never "treats", "cures" or "prevents"; never name diseases. Disclaimer in the footer and at the top of the research and testimonials pages.
- Placeholders are marked `TODO(content)`; draft legal text `TODO(legal)`.
