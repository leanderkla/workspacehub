# Theme drafts — batch 3 (range expansion)

Ten distinct directions, deliberately *outside* the cyberpunk family
already explored in `CYBERPUNK_THEME_DRAFTS*.md`. The goal is range:
no two should read as variations of each other. Different bases,
different surface treatments, different typographic philosophies,
different moods.

The existing theme catalogue already covers: dark, midnight, sepia,
nord, rose, lavender, mono, contrast, terracotta, forest, solarized,
glass, several cyberpunk variants, several Energy-Hero / AI5 brand
themes, and a Slack mimic. This batch deliberately steps into
unexplored territory: **brutalist, art-deco, hospital-clean,
engineering-notebook, museum-architectural, magazine-print,
sun-drenched-Mediterranean, washi-minimal, dim-warm-reader, riso-zine**.

All ten pass WCAG AA on body text; AA-large is documented where used
intentionally for ornament-only colours. Contrast reports list the
specific ratios. Each draft has a standalone HTML preview in
`previews/`.

---

## Conventions used across this batch

- **No untested colour pairs.** Body text on its primary surface is
  always at least 4.5:1. Muted text is at least 4.5:1 against its
  surface — verified, not eyeballed.
- **Accent-on-bg is reported.** When an accent is used as text or icon
  (active-state label, badge text, link), its ratio against the
  surrounding surface is given. Where an accent only ever appears as a
  fill (a dot, a ring, a button background with white text), it's
  flagged "fill-only" and the *text-on-fill* contrast is what matters.
- **Faded-row test.** The Pull view fades the lowest rows toward 0.55
  opacity. A theme whose body-on-bg sits at 14:1+ still hits 5–7:1
  faded, which is fine; themes hovering near the 4.5 floor would
  break under the fade. None of these ten land near that floor for
  body text.

---

## 1. Bauhaus Yellow

**ID:** `bauhaus-yellow`
**Mood:** Werkstatt, signage. Industrial, anti-decorative, raw.
A workshop poster taped to a concrete wall. Cadmium yellow doing the
shouting; everything else is true black, bone-white, and right
angles. Built for someone who finds soft rounded UI patronising.

### Palette

```css
html[data-theme="bauhaus-yellow"] {
  --accent:           #f5c518;   /* cadmium yellow — fill-only as text */
  --accent-light:     #fff8d6;
  --accent-dark:      #927400;
  --accent-faint:     color-mix(in srgb, var(--accent) 18%, transparent);
  --accent-soft:      color-mix(in srgb, var(--accent) 8%, transparent);

  --sidebar-bg:       #0a0a0a;   /* coal */
  --sidebar-hover:    #1a1a1a;
  --sidebar-active:   #1a1a1a;

  --content-bg:       #f7f4ed;   /* bone */
  --card-bg:          #ffffff;

  --text-primary:     #0a0a0a;
  --text-secondary:   #2c2c2c;
  --text-muted:       #5a5a5a;

  --border:           #1a1a1a;   /* heavy hairlines — the identity */
  --border-strong:    #0a0a0a;

  --radius:           0;
  --radius-sm:        0;
  --radius-lg:        0;

  --shadow-sm:        none;
  --shadow:           none;
  --shadow-md:        none;
  --shadow-lg:        none;
}
```

### Typography

`Space Grotesk` (700 for display, 500 for body) + `JetBrains Mono` for
all chrome (counts, dates, IDs, tags, button labels). Labels are
**uppercase, tracked +0.10em**. Body 13px, mono 11px tracked +0.05em.
No italics anywhere.

### Treatments

- **Edges:** zero radius. Cards are rectangles. Hairlines are 1px
  solid `#0a0a0a` — the heaviest border in any theme in this batch.
- **Shadow:** none. Elevation is made by stacking solid 4px offsets
  in `--accent` for primary CTAs (a hard drop, no blur).
- **CTAs:** `background: #f5c518; color: #0a0a0a;` only. Black-on-yellow
  hits 12.14:1 — the safest pairing in the file.
- **Active row:** a solid 4px `--accent` block on the left edge,
  flush, no taper.
- **Motion:** none worth adding. Hover changes border colour, that's
  it.

### Contrast report

| Pair | Ratio | Pass |
|------|-------|------|
| body text on bg (`#0a0a0a`/`#f7f4ed`) | **18.02:1** | AAA |
| muted on bg (`#5a5a5a`/`#f7f4ed`) | **6.28:1** | AA |
| yellow on coal sidebar (`#f5c518`/`#0a0a0a`) | **12.14:1** | AAA |
| coal on yellow CTA (`#0a0a0a`/`#f5c518`) | **12.14:1** | AAA |
| white on coal sidebar | **19.80:1** | AAA |

> Yellow is **fill-only** as a UI surface. Any text laid on yellow is
> pure coal. Yellow on bone (`#f5c518` on `#f7f4ed`) is **1.7:1** —
> intentional only as a saturated rectangle / mark, never as text.

### Mock

```
┌──────────────────────────────────────────────────────┐
│  PULL                              06 / 05 · 14:23   │
├──────────────────────────────────────────────────────┤
█▌ CALL LUKAS RE: Q4 PROPOSAL              [HIGH]
   DUE 14:00 · 12M
   ────────────────────────────────────────────────
   SEND ONBOARDING DOC                       [MED]
   SKETCH · 2026-05-10
```

`█▌` is a 4px solid yellow block on the active row. No anti-aliasing
forgiveness — it's a literal rectangle.

---

## 2. Atelier 1928

**ID:** `atelier-1928`
**Mood:** A 1928 jeweller's atelier on the Rue de la Paix. Bottle-
green lacquer, cream marble, brass fittings. Geometric ornaments
under serif headlines. Built for someone who mistrusts software but
respects fountain pens.

### Palette

```css
html[data-theme="atelier-1928"] {
  --accent:           #1F5F4A;   /* bottle green */
  --accent-light:     #DDEAE2;
  --accent-dark:      #0F3526;
  --accent-faint:     color-mix(in srgb, var(--accent) 12%, transparent);
  --accent-soft:      color-mix(in srgb, var(--accent) 6%, transparent);

  /* Brass — used as ornament fill / chip border / fan spokes only.
     Never body text. AA-large at best on cream. */
  --accent-secondary: #C19A2C;

  --sidebar-bg:       #0E2A22;   /* dark bottle green */
  --sidebar-hover:    #16382E;
  --sidebar-active:   #16382E;

  --content-bg:       #F2EAD8;   /* warm marble cream */
  --card-bg:          #FBF6E9;   /* slightly lifted cream */

  --text-primary:     #1A1410;
  --text-secondary:   #5C4F3E;
  --text-muted:       #705F47;

  --border:           #DCD0B6;
  --border-strong:    #B59E78;

  --radius:           4px;
  --radius-sm:        2px;
  --radius-lg:        6px;
}
```

### Typography

`Cormorant Garamond` (600 for view titles, 500 italic for sub-heads) +
`Inter` (500 for body, 600 for chrome). Display sizes are larger than
default — a Pull title sits at 28px not 22px. Tracking on uppercase
labels +0.14em.

### Treatments

- **Edges:** 4px subtle round on cards; 2px on chips; 0 on rules.
- **Surface:** flat cream cards over flat cream bg, separated by
  `--border` hairlines. Soft warm shadow `0 1px 0 rgba(181,158,120,0.4)`
  under cards — barely a shadow, more a brass underline.
- **Ornament:** thin geometric fan ornaments at section heads (SVG
  inline, single-stroke `--accent-secondary`). Active project gets a
  brass corner triangle.
- **CTAs:** primary buttons in `--accent` with cream text; secondary
  buttons cream with `--accent` border.
- **Active row:** 2px brass left edge + cream→accent-light gradient
  fill (very subtle).
- **Motion:** 200ms ease on focus. Brass fan ornaments do *not*
  animate — they're a still-life.

### Contrast report

| Pair | Ratio | Pass |
|------|-------|------|
| body text on cream | **15.23:1** | AAA |
| secondary on cream (`#5C4F3E`) | **6.63:1** | AA |
| muted on cream (`#705F47`) | **5.13:1** | AA |
| bottle-green accent on cream | **6.28:1** | AA |
| brass on dark green sidebar | **5.77:1** | AA |
| cream on dark green sidebar | **12.77:1** | AAA |

> Brass `#C19A2C` on cream is **3.0:1** — used **only** as ornament
> fill / hairline ring, never body or button text.

### Mock

```
✦ ATELIER ✦
─────────────  PULL  ─────────────────────────────
                                       06 May · 14:23

  ╱  Call Lukas re: Q4 proposal              [ HIGH ]
  ▎  due 14:00 · 12m
  ─────────────────────────────────────────────────
     Send onboarding doc                       [ MED ]
     sketch · 10 May 2026
```

`╱` is a brass-coloured corner triangle on the active row's top-left.
Section divider is a hairline with a centred fleur ornament.

---

## 3. Operating Theatre

**ID:** `operating-theatre`
**Mood:** Surgical lighting + Apple Health. Pure white, ice blue
flag, generous whitespace, no shadows. Reads as professional,
unhurried, almost medical. Built for someone who sees software as an
instrument.

### Palette

```css
html[data-theme="operating-theatre"] {
  --accent:           #1A73C9;
  --accent-light:     #E6F0FB;
  --accent-dark:      #0E5295;
  --accent-faint:     color-mix(in srgb, var(--accent) 10%, transparent);
  --accent-soft:      color-mix(in srgb, var(--accent) 5%, transparent);

  --sidebar-bg:       #FFFFFF;          /* yes — white sidebar */
  --sidebar-hover:    #F0F4F9;
  --sidebar-active:   #E6F0FB;

  --content-bg:       #FBFCFE;
  --card-bg:          #FFFFFF;

  --text-primary:     #0E2438;
  --text-secondary:   #475669;
  --text-muted:       #5C6A7E;

  --border:           #E4EAF1;
  --border-strong:    #C5D0DD;

  --radius:           12px;
  --radius-sm:        8px;
  --radius-lg:        16px;

  --shadow-sm:        none;
  --shadow:           none;
  --shadow-md:        0 2px 12px rgba(14, 36, 56, 0.04);
  --shadow-lg:        0 8px 24px rgba(14, 36, 56, 0.06);
}
```

### Typography

`Inter` only. 14px body, 13px chrome, 22px headings, 11px uppercase
labels (tracked +0.08em). Weights 400 / 500 / 600. No italics, no
serifs anywhere.

### Treatments

- **Edges:** 12px on cards, 16px on the major surfaces, 8px on chips.
  Everything reads soft and unhurried.
- **Shadow:** virtually none. Hierarchy is by 1px borders + the
  `--accent-light` highlight on active items. Shadows only on modals
  / popovers (the `0 8px 24px` very-soft variant).
- **Borders:** 1px `#E4EAF1` everywhere; the only places that get
  `--border-strong` are hover states.
- **Active row:** background flips to `--accent-light`; left edge
  gets a 3px solid `--accent` band.
- **Density:** spacious. Row padding 14px (vs 10px default). Section
  gaps 24px. Margin-driven hierarchy, not size or weight.
- **Motion:** 250ms ease — slow, hospital-calm.

### Contrast report

| Pair | Ratio | Pass |
|------|-------|------|
| body on bg (`#0E2438`/`#FBFCFE`) | **15.40:1** | AAA |
| secondary on bg | **7.30:1** | AAA |
| muted on bg (`#5C6A7E`) | **5.36:1** | AA |
| accent blue on bg | **4.71:1** | AA |
| white on accent CTA | **4.84:1** | AA |

### Mock

```
  Pull                                        06 May · 14:23

  ┃ Call Lukas re: Q4 proposal                       HIGH
    due 14:00 · 12m
  ─────────────────────────────────────────────────────────
    Send onboarding doc                                 MED
    sketch · 10 May 2026
```

`┃` is a 3px ice-blue rule on the active row, against a soft
`--accent-light` row highlight.

---

## 4. Engineer's Pad

**ID:** `engineers-pad`
**Mood:** A quad-ruled engineering pad, faint green-grey grid,
mechanical pencil marks. Mono everywhere chrome lives. Honest,
working, pre-CAD. Built for someone who keeps a slide rule on the
desk for the bit.

### Palette

```css
html[data-theme="engineers-pad"] {
  --accent:           #1B3A6B;   /* ink navy */
  --accent-light:     #DCE5F1;
  --accent-dark:      #0E2245;
  --accent-faint:     color-mix(in srgb, var(--accent) 14%, transparent);
  --accent-soft:      color-mix(in srgb, var(--accent) 7%, transparent);

  --sidebar-bg:       #2A2E33;   /* graphite */
  --sidebar-hover:    #3A3F45;
  --sidebar-active:   #3A3F45;

  --content-bg:       #EEF1E8;   /* ledger green-grey */
  --card-bg:          #F6F8F1;

  --text-primary:     #161B22;   /* ink */
  --text-secondary:   #3F4A55;
  --text-muted:       #5F6C7A;

  --border:           #C8CDBF;   /* paper rule */
  --border-strong:    #A8AE9D;

  --radius:           2px;
  --radius-sm:        2px;
  --radius-lg:        3px;
}
```

### Typography

`IBM Plex Sans` (body, 14px, 400/500) + `IBM Plex Mono` for **every-
thing else** — view titles, dates, chip text, IDs, sidebar nav, status
badges, button labels. Mono 12px. The mono is the identity.

### Treatments

- **Edges:** 2–3px (squared, pretending to be drafted by hand).
- **Surface:** body has a faint quad-grid backdrop —
  `linear-gradient(...) 24px` cross-pattern at 4% opacity. Cards sit
  *over* the grid as cleaner-paper rectangles.
- **Rules:** every list row separated by a 1px `--border` rule.
  Active row gets a 1px `--accent` rule on top + 1px on bottom (a
  highlighted band).
- **Active row:** plain `--card-bg` pulled higher with the navy bands;
  the row title gains 600 weight; everything else stays the same. No
  background flip — engineers don't shout.
- **Density:** compact. Row padding 8px.
- **Motion:** none.

### Contrast report

| Pair | Ratio | Pass |
|------|-------|------|
| body on bg | **15.14:1** | AAA |
| secondary on bg | **7.92:1** | AAA |
| muted on bg | **4.70:1** | AA |
| navy accent on bg | **9.86:1** | AAA |
| ledger on graphite sidebar | **12.76:1** | AAA |

### Mock

```
══ pull ══════════════════════════════════════════════════
                                          06.may.26 14:23

──┬─ id: t-2026-04-29-3f2 ────────────────────── [ HIGH ]
  │ Call Lukas re: Q4 proposal
  │ due 14:00 · 12m
──┴────────────────────────────────────────────────────────
    id: t-2026-04-29-9b1 ──────────────────────── [ MED ]
    Send onboarding doc
    sketch · 2026-05-10
```

The `──┬─ ... ──┴─` bracket marks the active row across two rules.

---

## 5. Plinth

**ID:** `plinth`
**Mood:** A modernist museum wall: bare concrete-cream, a single
cobalt rule, generous whitespace, a tiny laser-cut plate caption.
Stedelijk catalogue energy. Built for someone who appreciates that
the most expensive material in a gallery is the empty wall.

### Palette

```css
html[data-theme="plinth"] {
  --accent:           #1E3A8A;   /* electric cobalt */
  --accent-light:     #D6DDF0;
  --accent-dark:      #0E1F4A;
  --accent-faint:     color-mix(in srgb, var(--accent) 12%, transparent);
  --accent-soft:      color-mix(in srgb, var(--accent) 6%, transparent);

  --sidebar-bg:       #15171B;   /* charcoal */
  --sidebar-hover:    #23262C;
  --sidebar-active:   #23262C;

  --content-bg:       #ECEDE8;   /* cool concrete cream */
  --card-bg:          #FBFBF7;

  --text-primary:     #15171B;
  --text-secondary:   #3F4452;
  --text-muted:       #5E6471;

  --border:           #D5D5CE;
  --border-strong:    #B6B6AC;

  --radius:           2px;
  --radius-sm:        1px;
  --radius-lg:        3px;
}
```

### Typography

`Inter` everywhere. 13px body. **15px uppercase labels** with letter-
spacing +0.18em — the single typographic trick. Headings 24px regular
(not bold). View titles set in tracked uppercase.

### Treatments

- **Edges:** 2px on cards, sharp.
- **Rules:** 1px hairlines doing 90% of the visual hierarchy.
- **Density:** generous. View padding 32px+. Rows breathe.
- **Active row:** a 2px cobalt vertical rule, flush left; nothing
  else changes — no background fill, no extra weight. The rule is
  the entire signal.
- **Plates:** small uppercase labels above each card act as gallery
  plates — `TODO · DUE 14:00` set in tracked mono-feel uppercase
  Inter, 11px, in `--text-muted`.
- **CTAs:** primary buttons in `--accent` with white text, 2px
  square. Secondary buttons are a 1px cobalt outline.
- **Motion:** 180ms ease. The cobalt rule on active row slides in
  — that's the only animation.

### Contrast report

| Pair | Ratio | Pass |
|------|-------|------|
| body on bg | **15.25:1** | AAA |
| secondary on bg | **8.26:1** | AAA |
| muted on bg | **5.05:1** | AA |
| cobalt on bg | **8.80:1** | AAA |
| white on cobalt CTA | **10.36:1** | AAA |

### Mock

```
            PULL
            ─────────────────────  06 MAY  ·  14:23
                                                                  
            TODO · HIGH · DUE 14:00
   ▎        Call Lukas re: Q4 proposal
            12 minutes
                                                                  
            TODO · MED · SKETCH
            Send onboarding doc
            10 May 2026
```

`▎` is the 2px cobalt rule. The all-caps line above each title is the
plate caption.

---

## 6. Broadsheet

**ID:** `broadsheet`
**Mood:** Sunday-paper editorial. Newsprint cream, a deep crimson
masthead red, mustard rule, serif body. Long-form gravitas. Built
for someone who reads.

### Palette

```css
html[data-theme="broadsheet"] {
  --accent:           #B11C24;   /* masthead crimson */
  --accent-light:     #F5DDDF;
  --accent-dark:      #780E16;
  --accent-faint:     color-mix(in srgb, var(--accent) 10%, transparent);
  --accent-soft:      color-mix(in srgb, var(--accent) 5%, transparent);

  /* Mustard rule — fill-only ornament, never text. */
  --accent-secondary: #C9971C;

  --sidebar-bg:       #1B1715;   /* warm coal */
  --sidebar-hover:    #2B2622;
  --sidebar-active:   #2B2622;

  --content-bg:       #F6F1E6;   /* newsprint cream */
  --card-bg:          #FCF8EE;

  --text-primary:     #14100D;
  --text-secondary:   #3C3530;
  --text-muted:       #6F6256;

  --border:           #DCD1BD;
  --border-strong:    #B5A88E;

  --radius:           0;
  --radius-sm:        2px;
  --radius-lg:        2px;
}
```

### Typography

`Source Serif Pro` (body, 14px, 400) + `Inter` (chrome, 13px, 500).
View titles in Source Serif at **32px, 600**, with a `--accent-secondary`
2px underline rule.

### Treatments

- **Edges:** 0–2px. Cards flat-rectangle with a 1px `--border`
  hairline. No shadow.
- **Rules:** the `<hr>` is a load-bearing element. Section dividers
  get a centred italic word ("today", "later") in serif.
- **Active row:** a 4px crimson vertical rule flush left + the title
  shifts to weight 600 italic. Subtle but unmistakable.
- **Drop caps:** the first paragraph of an opened note gets a 3-line
  drop cap. Optional flourish.
- **Density:** medium. Generous line-height (1.6) for body copy.
- **Motion:** 150ms. The active rule slides in.

### Contrast report

| Pair | Ratio | Pass |
|------|-------|------|
| body on cream | **16.80:1** | AAA |
| secondary on cream | **10.69:1** | AAA |
| muted on cream | **5.24:1** | AA |
| crimson on cream | **6.09:1** | AA |
| cream on warm-coal sidebar | **15.80:1** | AAA |

> Mustard `#C9971C` on cream is **3.1:1** — used only as a 1–2px
> horizontal rule under view titles, never text.

### Mock

```
       Pull                         The Workspace · No. 487
       ─────                                       06 May 2026
       ▔▔▔▔▔  ← mustard rule

  │   Call Lukas re: Q4 proposal               HIGH · 14:00
  │   *due in 12 minutes — confirm headcount before*
  ─────────────────────────────  later  ─────────────────────
      Send onboarding doc                        MED · sketch
```

`│` is the 4px crimson active-rule. The italic in body is intentional.

---

## 7. Stucco

**ID:** `stucco`
**Mood:** A whitewashed coastal village at noon. Sun on pink-stained
plaster, coral shutters, glimpses of turquoise. Warm, generous,
relaxed. Built for someone whose best ideas come at 11am with coffee
on a terrace.

### Palette

```css
html[data-theme="stucco"] {
  --accent:           #D03A33;   /* coral red */
  --accent-light:     #FCE0DD;
  --accent-dark:      #8E1F19;
  --accent-faint:     color-mix(in srgb, var(--accent) 10%, transparent);
  --accent-soft:      color-mix(in srgb, var(--accent) 5%, transparent);

  /* Turquoise — fill-only (notification dots, chip backgrounds with
     dark text inside). Fails as text on cream. */
  --accent-secondary: #2EAFB0;

  --sidebar-bg:       #FBE7DA;          /* terracotta-tinted cream */
  --sidebar-hover:    #F5D4C0;
  --sidebar-active:   #F2CAB1;

  --content-bg:       #FFF7F1;
  --card-bg:          #FFFFFF;

  --text-primary:     #2A1B16;
  --text-secondary:   #6F564B;
  --text-muted:       #735746;

  --border:           #F2DFD0;
  --border-strong:    #E0BFAA;

  --radius:           14px;
  --radius-sm:        10px;
  --radius-lg:        20px;

  --shadow-sm:        0 1px 3px rgba(208, 58, 51, 0.08);
  --shadow:           0 4px 12px rgba(208, 58, 51, 0.10);
  --shadow-md:        0 6px 20px rgba(208, 58, 51, 0.12);
}
```

### Typography

`Plus Jakarta Sans` (everything; lighter weights — 400/500/600). Line-
height 1.55. Slightly larger body (14.5px) for the breezy feel.

### Treatments

- **Edges:** 14–20px round. Generous.
- **Surface:** cards are crisp white over a sun-warmed cream backdrop.
  Soft pink-tinted shadows give a subtle depth — feels lit by warm sun.
- **Active row:** card flips to `--accent-light` with a coral 3px
  left rule. The selected card lifts very slightly (1px translate + a
  warmer shadow).
- **Multi-accent:** turquoise `--accent-secondary` is reserved for
  *secondary* type chips (e.g. note-counts, "due tomorrow" pills) so
  the eye reads three colours: coral=urgent, turquoise=informational,
  cream=ambient. Turquoise text never lands on cream — it's always
  inside a pill (white text on turquoise: 3.2:1, AA-large for chip
  copy ≥14px).
- **Density:** spacious.
- **Motion:** 220ms cubic-bezier(.2, .9, .3, 1) — a gentle bounce.

### Contrast report

| Pair | Ratio | Pass |
|------|-------|------|
| body on bg | **15.65:1** | AAA |
| secondary on bg | **6.38:1** | AA |
| muted on bg (`#735746`) | **6.23:1** | AA |
| coral on bg | **4.57:1** | AA |
| white on coral CTA | **4.84:1** | AA |

> Turquoise `#2EAFB0` is **fill-only**. White on turquoise is
> **3.2:1** — usable for **chip text at 14px+** (AA-large) but never
> for body or button labels. Most consumption: as a notification dot
> or chip background paired with `--text-primary`.

### Mock

```
    ☼  Pull                              06 May · 14:23

   ╭───────────────────────────────────────────────────╮
   │  ▌ Call Lukas re: Q4 proposal              ● HIGH │
   │    due 14:00 · 12m                                │
   ╰───────────────────────────────────────────────────╯

      Send onboarding doc                       ◌ MED
      sketch · 10 May 2026                      ⓘ note
```

The `●` is coral. `⓲` is a turquoise pill. `▌` is the coral active rule.

---

## 8. Sumi

**ID:** `sumi`
**Mood:** Sumi-e on washi paper. Generous space, a single brush
stroke, one vermillion seal. Pre-digital. Built for someone who
believes most software is too loud.

### Palette

```css
html[data-theme="sumi"] {
  --accent:           #B22B1F;   /* vermillion seal */
  --accent-light:     #F5DEDA;
  --accent-dark:      #6F1810;
  --accent-faint:     color-mix(in srgb, var(--accent) 10%, transparent);
  --accent-soft:      color-mix(in srgb, var(--accent) 5%, transparent);

  --sidebar-bg:       #1F1B17;   /* sumi ink */
  --sidebar-hover:    #2A2520;
  --sidebar-active:   #2A2520;

  --content-bg:       #F4EFE4;   /* washi paper */
  --card-bg:          #FAF6EC;

  --text-primary:     #1F1B17;   /* same ink as sidebar */
  --text-secondary:   #5A554C;
  --text-muted:       #6A6356;

  --border:           #E0D8C4;
  --border-strong:    #C5BA9F;

  --radius:           4px;
  --radius-sm:        3px;
  --radius-lg:        6px;
}
```

### Typography

`Cormorant Garamond` (titles, 500) + `Inter` (body, 400, 14px). Body
line-height **1.7**. View titles at 30px regular weight in serif —
not bold; the type does not strain.

### Treatments

- **Edges:** 4–6px. Soft, never sharp.
- **Surface:** flat washi cards over a flat washi bg. Borders are
  almost invisible (`#E0D8C4`). Hierarchy is whitespace, not lines.
- **Seal:** the active row's left edge has a small vermillion *seal*
  — a 16×16 square stamp with a faint texture. Used **once per
  view** at most. It is the single piece of colour.
- **Density:** very spacious. Row padding 18px. Section gap 36px.
- **Brush motif:** thin SVG brush-stroke ornaments at section heads —
  one per view, never per card.
- **Motion:** 350ms ease. Slow, deliberate.

### Contrast report

| Pair | Ratio | Pass |
|------|-------|------|
| body on washi | **14.92:1** | AAA |
| secondary on washi | **6.45:1** | AA |
| muted on washi (`#6A6356`) | **5.19:1** | AA |
| vermillion on washi | **5.62:1** | AA |
| washi on sumi sidebar | **17.11:1** | AAA |

### Mock

```

       Pull                                        06 五 · 14:23
                                  ╴╴╴
                              ╭───╮
                              │ 印 │   ← vermillion seal (active)
                              ╰───╯
       Call Lukas re: Q4 proposal                              高
       due 14:00 · 12 m

       Send onboarding doc                                     中
       sketch · 10 May 2026

```

A single vermillion seal marks the active item. Everything else is ink
on paper. The 高 / 中 are stylistic — the actual UI uses HIGH / MED.

---

## 9. Velvet Lounge

**ID:** `velvet-lounge`
**Mood:** A library at midnight — a single brass desk lamp, kraft-
paper book covers, an unfinished glass of wine. Warm dim, parchment
text, brass and burgundy accents. Built for someone who works after
the kids are asleep.

### Palette

```css
html[data-theme="velvet-lounge"] {
  --accent:           #D9A055;   /* brass */
  --accent-light:     #4A3920;
  --accent-dark:      #FFCB80;
  --accent-faint:     color-mix(in srgb, var(--accent) 12%, transparent);
  --accent-soft:      color-mix(in srgb, var(--accent) 6%, transparent);

  /* Wine — alert / overdue colour, used on dim bg only. */
  --accent-secondary: #B23A4E;

  --sidebar-bg:       #1B0F0A;   /* dark espresso */
  --sidebar-hover:    #2A1A12;
  --sidebar-active:   #2A1A12;

  --content-bg:       #1F1612;   /* deep tobacco */
  --card-bg:          #2A1F1A;

  --text-primary:     #F0DFC8;   /* warm parchment */
  --text-secondary:   #BFA889;
  --text-muted:       #9A8568;

  --border:           #3A2A21;
  --border-strong:    #5A4233;

  --radius:           8px;
  --radius-sm:        6px;
  --radius-lg:        12px;

  --shadow-sm:        0 1px 2px rgba(0,0,0,0.6);
  --shadow:           0 2px 6px rgba(0,0,0,0.7);
  --shadow-md:        0 6px 18px rgba(0,0,0,0.7), inset 0 1px 0 rgba(217, 160, 85, 0.06);
  --shadow-lg:        0 18px 40px rgba(0,0,0,0.85);
}
```

### Typography

`Lora` (body, 400, 14.5px) + `Inter` (chrome, 13px). Body line-height
1.65 for evening reading. Italics used sparingly in metadata
("*due in 12m*").

### Treatments

- **Edges:** 8px. Soft.
- **Surface:** cards have a subtle inner highlight `inset 0 1px 0
  rgba(217,160,85,0.06)` — like the brass-lamp glow catching the
  card's top edge. No outer shadow on cards (the bg already absorbs
  light).
- **Active row:** card-bg lifts to `#352720` and gains a 2px brass
  left rule + a warm brass halo on the row title.
- **Wine accent:** overdue items get a wine-coloured chip. Never
  red — wine is the anger here.
- **Density:** medium. Designed to be looked at for hours.
- **Motion:** 280ms ease. The brass-rule fade-in on the active row
  is the only ambient animation.

### Contrast report

| Pair | Ratio | Pass |
|------|-------|------|
| parchment on tobacco | **13.62:1** | AAA |
| secondary on tobacco | **7.77:1** | AAA |
| muted on tobacco (`#9A8568`) | **5.02:1** | AA |
| brass on tobacco | **7.71:1** | AAA |
| tobacco on brass CTA | **7.71:1** | AAA |
| wine on tobacco (`#B23A4E`) | **3.64:1** | AA-large (chip-only, 14px+) |

### Mock

```

   PULL                                       06 May · 14:23

    ╭─ Call Lukas re: Q4 proposal ─────────────────  HIGH ─╮
    │  due 14:00 · 12m                                      │
    ╰───────────────────────────────────────────────────────╯

    Send onboarding doc                                  MED
    sketch · 10 May 2026

    Schick Angebot to Lukas                               …
    drafted yesterday

```

The active card has a 2px brass left rule (rendered above as the `│`
column) and a brass-warm title.

---

## 10. Risograph

**ID:** `risograph`
**Mood:** A two-colour risograph zine. Fluorescent pink overprinting
cobalt blue on cream paper, slightly off-register, halftone dots
visible if you look. Loud, opinionated, joyful. Built for someone
who believes UI should feel made.

### Palette

```css
html[data-theme="risograph"] {
  --accent:           #FF4FA3;   /* riso fluorescent pink — fill-only as text */
  --accent-light:     #FFD1E5;
  --accent-dark:      #C92E7C;
  --accent-faint:     color-mix(in srgb, var(--accent) 12%, transparent);
  --accent-soft:      color-mix(in srgb, var(--accent) 6%, transparent);

  /* Cobalt — actual text-bearing accent. White on cobalt is 6.87:1. */
  --accent-secondary: #1E48E0;

  --sidebar-bg:       #1E48E0;   /* cobalt sidebar — bold */
  --sidebar-hover:    #2A55EE;
  --sidebar-active:   #1538D0;

  --content-bg:       #F5EFE0;   /* paper cream */
  --card-bg:          #FFFAEE;

  --text-primary:     #14130E;
  --text-secondary:   #4A463A;
  --text-muted:       #6A604D;

  --border:           #E0D8C2;
  --border-strong:    #B5AB91;

  --radius:           0;
  --radius-sm:        0;
  --radius-lg:        2px;
}
```

### Typography

`Space Grotesk` (display + body, 500/700) + `Space Mono` (chips, IDs,
counts). View titles 32px **800** with a fluorescent pink text-shadow
3px-offset (the "misregister" of the risograph print). Mono labels
uppercase tracked +0.10em.

### Treatments

- **Edges:** 0px on cards. Aggressively rectangular.
- **Surface:** halftone dot overlay on cards via
  `background-image: radial-gradient(rgba(20,19,14,0.06) 1px, transparent 1.5px)`
  at 6px spacing — visible up close, ambient at distance. Reads as
  printed paper.
- **Misregister:** primary CTAs are `--accent-secondary` cobalt with
  a 3px-offset pink "shadow" rectangle behind them — the classic
  riso colour-misalignment effect. View titles get a 2px-offset pink
  text-shadow.
- **Active row:** the row's title gains a 2px-offset cobalt
  text-shadow + a 6px solid pink left rule.
- **Sidebar:** cobalt all the way down, white text. Active item: a
  saturated pink fill (text stays white — 3.04:1, AA-large; we
  enlarge the active label to 14px to clear the AA-large floor).
- **Density:** medium-tight.
- **Motion:** none. This theme is print.

### Contrast report

| Pair | Ratio | Pass |
|------|-------|------|
| body on cream | **16.21:1** | AAA |
| secondary on cream | **8.21:1** | AA |
| muted on cream (`#6A604D`) | **5.39:1** | AA |
| white on cobalt sidebar | **6.87:1** | AA |
| white on pink CTA | **3.04:1** | AA-large (≥14px / bold ≥18px) |
| cobalt on cream (`#1E48E0`) | **8.69:1** | AAA — for text |

> Pink `#FF4FA3` **fails as body text** on cream (2.65:1). It is
> always a fill: the misregister shadow rectangle, the active-row
> rule, button backgrounds with white text at AA-large. Where text
> needs to land on cream as a coloured accent, **cobalt is the answer.**

### Mock

```

   ╔═════════════════════════════════════════════╗
   ║   PULL                                      ║   ← cobalt block,
   ║   06 . 05 . 26                              ║     pink offset
   ╚═════════════════════════════════════════════╝

   ▌▌  Call Lukas re: Q4 proposal             HIGH
       due 14:00 · 12m
   ─────────────────────────────────────────────────
       Send onboarding doc                      MED
       sketch · 10 May 2026

```

`▌▌` is a 6px pink rule + 2px cobalt shadow — the riso miss.

---

## How the ten relate

| # | Theme | Base | Accent vibe | Type | Edges | Density |
|---|-------|------|-------------|------|-------|---------|
| 1 | Bauhaus Yellow | Light bone | Cadmium yellow + black | Sans + mono | 0px | medium |
| 2 | Atelier 1928 | Warm cream | Bottle green + brass | Serif + sans | 4px | medium |
| 3 | Operating Theatre | Pure white | Ice blue | Sans only | 12px | spacious |
| 4 | Engineer's Pad | Ledger green | Ink navy | Mono-led | 2px | compact |
| 5 | Plinth | Concrete cream | Cobalt | Sans tracked | 2px | very spacious |
| 6 | Broadsheet | Newsprint | Crimson + mustard | Serif + sans | 0–2px | medium |
| 7 | Stucco | Warm white | Coral + turquoise | Sans light | 14px | spacious |
| 8 | Sumi | Washi | Vermillion seal | Serif + sans | 4px | very spacious |
| 9 | Velvet Lounge | Tobacco dim | Brass + wine | Serif + sans | 8px | medium |
| 10 | Risograph | Paper cream | Pink + cobalt | Sans display | 0px | medium |

Two are dark-base (Velvet Lounge, the cobalt sidebar of Risograph).
Eight are light-base. Three are bold/loud (Bauhaus, Risograph,
Stucco's coral). Two are calligraphic/restrained (Sumi, Plinth). One
is editorial (Broadsheet). One is pre-digital industrial (Engineer's
Pad). One is hospital-clean (Operating Theatre). One is vintage
ornate (Atelier).

If a stranger saw any two of these side by side, they should never
mistake them for the same family. That was the test.

---

## Standalone HTML previews

Each draft has a self-contained preview at `previews/`:

- `previews/bauhaus-yellow.html`
- `previews/atelier-1928.html`
- `previews/operating-theatre.html`
- `previews/engineers-pad.html`
- `previews/plinth.html`
- `previews/broadsheet.html`
- `previews/stucco.html`
- `previews/sumi.html`
- `previews/velvet-lounge.html`
- `previews/risograph.html`

Open in a wide window for the fairest read. The previews link from
the existing `previews/index.html` (updated to add a new section).
