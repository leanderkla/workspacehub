# Dark Academia theme drafts

Five dark-academia variations on the same family — oxblood, brass,
parchment, ink, wood — pitched at distinct axes so we can narrow.
A sixth proposal at the end argues that the genre's strongest move is
actually a *light* theme (vellum & ink) and is included so we can
reject or keep it deliberately, not by accident.

None of these touches `styles.css` or the `THEMES` array yet — this is
design, not implementation. Variable names match the existing scheme
in `styles.css:4-29` so any draft can be lifted straight in.

## Shared family DNA

- **Mahogany-not-black bases.** Even the darkest base sits offset
  toward warm brown or olive — never `#000`. Reads as "lamplit room"
  instead of "void." Same principle the cyberpunk drafts use, applied
  to a much warmer hue family.
- **Serif-led typography.** Body in a transitional or old-style serif
  (Plantin, Source Serif Pro, EB Garamond). Sans only where necessary
  for chrome density. Mono reserved for IDs, dates, "card catalog"
  numerals.
- **Restraint, then theatre.** Most pixels are quiet. Theatre comes
  from one or two earned moments per view: a brass-lamp pool of light
  under the focused card, a hanging silk ribbon on the pinned row,
  a wax-seal status dot. Never all of them at once.
- **Hierarchy via luminance + serif weight.** Borders are thin, often
  hairlines in `--border-strong`. Active surfaces lift through tone,
  occasionally through a ruled brass underline.
- **Motion budget: tiny.** Same as the rest of the catalogue. No
  page transitions, no decorative animation. One draft (Magdalen)
  breaks the rule for a single 8% candle-flicker pulse, and that
  exception is the whole identity argument for that draft.

## Shared "fun stuff" — gimmick shortlist

Each draft picks 1–2 of these. None picks all of them. They are
listed so we can mix-and-match later without re-deriving them.

| Gimmick                  | What it is                                                       | Cost          | Best in     |
| ------------------------ | ---------------------------------------------------------------- | ------------- | ----------- |
| **Brass desk lamp pool** | radial amber gradient under the keyboard-focused card            | cheap (CSS)   | Bodleian, Magdalen |
| **Wax seal status dots** | oxblood circle with a darker embossed ring as the priority dot   | cheap         | Bodleian, Professor |
| **Hanging silk ribbon**  | 2px vertical ribbon hanging from the top of pinned/active rows   | cheap         | Bodleian, Trinity |
| **Marginalia notes**     | italic serif annotations rendered in the right margin gutter     | small refactor — needs a margin column on cards | Bodleian, Inkwell |
| **Library card IDs**     | todo IDs rendered as Dewey-style `821.914 / W873s` in mono       | cheap         | All except Magdalen |
| **Gold leaf CTAs**       | primary button background is a subtle vertical gold gradient with a hairline darker rim | cheap | Bodleian, Trinity |
| **Latin section heads**  | view titles in small-caps Latin (`OPVS · LECTIO · NOTÆ`)         | optional, opt-in per user | Bodleian, Trinity |
| **Candle flicker**       | 8% amber-glow opacity sine on focus, 1200ms — *one draft only*   | cheap, but breaks motion budget | Magdalen |
| **Leather spine bar**    | vertical ribbed gradient on the sidebar suggesting book spines   | cheap         | Bodleian, Professor |
| **Inkwell loader**       | single black drop falling into a brass ring instead of a spinner | one new SVG   | Inkwell, Magdalen |
| **Tooled-leather rim**   | 1px hairline + 1px gold inside-rim on cards (suggests embossing) | cheap         | Bodleian |

## Side-by-side comparison

| Draft                 | ID                  | Accent          | Base hue            | Surface temp     | Type axis           | Density   | Signature gimmick(s)         |
| --------------------- | ------------------- | --------------- | ------------------- | ---------------- | ------------------- | --------- | ---------------------------- |
| Bodleian Reading Room | `da-bodleian`       | brass `#b8862b` | mahogany `#1a110b`  | warm             | serif-LED           | medium    | brass lamp pool, wax seals, ribbon |
| Trinity Quadrangle    | `da-trinity-dusk`   | tarnished brass `#9a7b2e` over forest `#1f2e22` | stone-olive `#161c18` | cool-warm | serif + condensed sans for chrome | medium-tight | ribbon, gold leaf CTAs, Latin heads |
| Magdalen Candlelit    | `da-magdalen`       | beeswax `#e8b04a` | smoke-near-black `#0e0a06` | very warm | serif-only, no sans | loose     | candle flicker, inkwell loader |
| Inkwell & Quarto      | `da-inkwell`        | oxblood `#7a1f2b` (used sparingly) | iron `#0c0c0d` | neutral-warm | serif + tiny mono | tightest | marginalia, library card IDs, no glow |
| Professor's Study     | `da-professor`      | burnt sienna `#a0522d` | tobacco `#1b140e` | warm | serif + slab for headings | medium | leather spine bar, wax seals |
| *(bonus)* The Scriptorium | `da-scriptorium` | gold leaf `#a07e22` | vellum `#f1e6c8` (LIGHT) | very warm | serif-only | loose | rubrication (red initials), marginalia |

## Side-by-side mocks — same Pull view, five renderings

So we can compare the *feel* of each at the same content. The
hypothetical content is three tasks: an urgent call, a sketch doc,
and a drafted offer.

### Bodleian Reading Room

```
─────────────────────────────────────────────────────
  OPVS                              vi · vii · xiv·xxiii
─────────────────────────────────────────────────────

   │ Call Lukas re: Q4 proposal              ●  high
   │   due 14:00 · 12m       821.914 / W873s
   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
     Send onboarding doc                     ◐  med
        sketch · 2026-05-10  658.812 / S474o
   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
     Schick Angebot to Lukas                 ○  —
        drafted yesterday    658.811 / A584g

           ╴ marginal: "Lukas prefers PDF" ╴
```

The `│` on the active row is a silk ribbon (oxblood). `●` is a
filled wax seal. The Dewey-style numbers are todo IDs in mono. The
italic margin note at the bottom is marginalia (only appears when a
note exists on the active row). Heading uses Latin + Roman numerals
for the date.

### Trinity Quadrangle (Dusk)

```
═══════════════════════════════════════════════════════
  PULL                                  06 / 07 · 14:23
═══════════════════════════════════════════════════════

  ▌ Call Lukas re: Q4 proposal                    HIGH
    due 14:00 · 12m                  T-26.04-3F2

    Send onboarding doc                            MED
    sketch · 2026-05-10              T-26.04-9B1

    Schick Angebot to Lukas                          —
    drafted yesterday                T-26.04-7A4

═══════════════════════════════════════════════════════
                                       [  REVIEW  ALL  ]
```

Architectural rules instead of dotted lines. The `▌` is a tarnished
brass tab on the active row. `[ REVIEW ALL ]` button is rendered
with the gold-leaf CTA treatment — vertical brass gradient with a
1px darker rim.

### Magdalen Candlelit

```


     OPVS                              the 6th of June



        Call Lukas re: Q4 proposal
           due 14:00  ·  twelve minutes
                                                  ✦


        Send onboarding doc
           sketch
                                                  ·


        Schick Angebot to Lukas
           drafted yesterday
                                                  ·



```

Everything is air. The `✦` is the candle marker on the active row
and it pulses (8% amber sine, 1200ms). Time is spelled out in words,
not digits — the only draft that does this. No borders, no rules.

### Inkwell & Quarto

```
  ¶ OPUS                                  06.06 · 14:23
  ─────────────────────────────────────────────────────

    Call Lukas re: Q4 proposal                     hi
      due 14:00 · 12m              t-26-04-3f2

    Send onboarding doc                            md
      sketch · 2026-05-10          t-26-04-9b1

    Schick Angebot to Lukas                         —
      drafted yesterday            t-26-04-7a4

  ─────────────────────────────────────────────────────
```

No glow. No icons. No fills. The active row is signaled by a single
darker hairline above and below it and a 2-character indent shift
(everything else has a 4-space indent; the active row has 6). The
`¶` pilcrow is the view marker. Designed for someone who finds the
other four ornamental.

### Professor's Study (Autumn)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PULL · Friday afternoon                       14:23
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ◉  Call Lukas re: Q4 proposal                  HIGH
     due 14:00 · 12m left
                                       — quarter past two

  ◐  Send onboarding doc                          med
     sketch · drafted Mon

  ○  Schick Angebot to Lukas                       —
     yesterday, late

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

The `━` heavy rules suggest a leather-bound section divider.
The wax-seal dots use a slab variant — slightly chunkier than
Bodleian's because the rest of this draft is chunkier. The
italic "— quarter past two" is a soft natural-language echo of
the deadline; it's a small charm, not metadata.

### The Scriptorium *(light)*

```
─────────────────────────────────────────────────────
  𝐎pvs                                   vi · vi · xiv
─────────────────────────────────────────────────────

   C all Lukas re: Q4 proposal                ✦  high
     due 14:00 · 12m              821.914 / W873s

   S end onboarding doc                       ◐  med
     sketch · 2026-05-10          658.812 / S474o

   S chick Angebot to Lukas                   ·  —
     drafted yesterday            658.811 / A584g

```

The dropped first letter on each row (`C all`, `S end`) is rubricated
— rendered in oxblood with a slightly larger serif. The view title
also gets a rubricated initial. This is a *light* theme — vellum
cream content surface, dark sepia ink text. Argued for at the end.

---

# Drafts in full

## 1. Bodleian Reading Room

The Old Bodleian after closing. Brass desk lamps over leather-topped
desks, oxblood spine bindings filling the shelves, deep mahogany
panels everywhere. The interface equivalent of being trusted with a
key to the reading room. Built for someone who finds Cyberpunk too
fluorescent and Solarized too clinical.

**ID:** `da-bodleian`
**Reference weight:** Bodleian Library, Trinity College Old Library,
*The Secret History* (Tartt) interior shots.

### Palette

```css
html[data-theme="da-bodleian"] {
  --accent:           #b8862b;   /* brass — patinated, not new */
  --accent-light:     #3a2a0e;
  --accent-dark:      #e0b75e;
  --accent-faint:     color-mix(in srgb, var(--accent) 12%, transparent);
  --accent-soft:      color-mix(in srgb, var(--accent) 7%, transparent);

  --sidebar-bg:       #14100a;   /* mahogany-near-black */
  --sidebar-hover:    #1f1810;
  --sidebar-active:   #1f1810;

  --content-bg:       #1a110b;
  --card-bg:          #221710;   /* a single shade lighter — leather */

  --text-primary:     #ede0c2;   /* parchment cream */
  --text-secondary:   #b39772;
  --text-muted:       #74614a;

  --border:           #2a1e15;
  --border-strong:    #3a2c1f;

  --shadow-sm:        0 1px 2px rgba(0,0,0,0.6);
  --shadow:           0 1px 3px rgba(0,0,0,0.7), 0 0 0 1px rgba(184,134,43,0.05);
  --shadow-md:        0 6px 18px rgba(0,0,0,0.7);
  --shadow-lg:        0 24px 50px rgba(0,0,0,0.85);
}
```

`forceAccent: '#b8862b'`. Hits 7.2:1 on cream against the card surface,
well above AA. Brass on card surface is 4.9:1 — passes AA for chrome
text size.

### Typography

Serif-LED. Body in `Source Serif Pro` or `EB Garamond` 14px (Garamond
needs +0.5px tracking and a bump to 14.5 to feel right on screen).
Sans (Inter 13px) only for very dense chrome — sidebar nav, count
badges. Mono (`IBM Plex Mono` 11px) for IDs rendered as Dewey-style
numerals: `821.914 / W873s`. Tabular-nums on for any number column.

### Treatments

- **Edges:** `--radius: 8px`, `--radius-sm: 4px`. Cards keep soft
  corners — leather, not metal. Some elements (the view header
  underline, the seal dots) get full radii.
- **Glow:** the **brass desk lamp pool** — keyboard-focused card gets
  a radial gradient behind it (`radial-gradient(ellipse at 50% 0%,
  color-mix(in srgb, var(--accent) 14%, transparent) 0%, transparent
  60%)`). Reads as warm lamplight from above. No haloed outline —
  the pool *is* the focus signal.
- **Surface:** cards have a very faint top-down gradient — top edge
  3% lighter, bottom 2% darker. Suggests a leather-topped desk lit
  from above.
- **Active row indicator:** the **hanging silk ribbon** — a 2px
  vertical `--accent` strip on the left edge of the row, but it
  extends `4px` above the row's top edge with a slight `border-radius`
  on the bottom, suggesting a bookmark ribbon hanging out of the top
  of a book.
- **Status dots:** the **wax seal** — a circular `--accent` fill
  with a 1px darker concentric inner ring at 60% radius, suggesting
  embossing. `●` = high (filled), `◐` = medium (half wax), `○` = low
  (outline).
- **Card rim:** the **tooled leather rim** — `box-shadow: inset 0 0 0
  1px var(--border)` plus a second `inset 0 0 0 2px` at 4% accent
  opacity to suggest a gold inside-rim. Reads as embossing under
  lamplight.
- **Latin section heads (opt-in):** if a user enables it, view titles
  render as `OPVS / LECTIO / NOTÆ` in tracked small-caps. Off by
  default so we don't impose pretension.
- **CTAs:** primary buttons use the **gold leaf** treatment — vertical
  gradient `linear-gradient(180deg, #d4a647, #a06d1c)` with a 1px
  darker rim. Text in `#1a110b` (mahogany), 11.1:1 on the lightest
  point.

### Density

Medium. Card vertical padding stays at default. Line-height slightly
generous (1.55) to suit the serif body.

---

## 2. Trinity Quadrangle (Dusk)

Trinity (Cambridge or Oxford, pick yours) seen from the quad at the
blue hour. Cold stone, dark forest hedges, tarnished brass plaques
on doors, gas lamps just lit. More architectural than Bodleian —
less cozy, more institutional. The interface equivalent of a college
chapel: serious, ordered, beautiful but not warm.

**ID:** `da-trinity-dusk`
**Reference weight:** Trinity Great Court at dusk, Magdalen Tower,
*Brideshead Revisited*.

### Palette

```css
html[data-theme="da-trinity-dusk"] {
  --accent:           #9a7b2e;   /* tarnished brass */
  --accent-light:     #2a2010;
  --accent-dark:      #c8a64d;
  --accent-faint:     color-mix(in srgb, var(--accent) 12%, transparent);
  --accent-soft:      color-mix(in srgb, var(--accent) 6%, transparent);

  --sidebar-bg:       #131a16;   /* forest-stone */
  --sidebar-hover:    #1c2620;
  --sidebar-active:   #1c2620;

  --content-bg:       #161c18;   /* stone-olive */
  --card-bg:          #1d251f;

  --text-primary:     #e6e4d6;   /* ivory, cooler than Bodleian's cream */
  --text-secondary:   #9ea399;
  --text-muted:       #5e6760;

  --border:           #232c25;
  --border-strong:    #2e3830;

  --shadow-sm:        0 1px 2px rgba(0,0,0,0.5);
  --shadow:           0 1px 3px rgba(0,0,0,0.6);
  --shadow-md:        0 6px 14px rgba(0,0,0,0.7);
  --shadow-lg:        0 22px 48px rgba(0,0,0,0.8);
}
```

`forceAccent: '#9a7b2e'`. Ivory on stone-olive sits at 11.1:1.
Brass on the same surface is 4.6:1 — AA-passing for chrome text.

### Typography

Serif for body and titles, condensed sans for dense chrome. `Plantin`
or `Source Serif Pro` 14px for body; `Inter Display` (or `Söhne
Breit`) for sidebar nav and label chips, slightly tracked. Mono for
IDs only. Important: titles are slightly **larger** here than in
Bodleian (16px vs 14px) — Trinity wants the architectural rhythm of
chapter heads, not the cozy uniformity of reading-room paragraphs.

### Treatments

- **Edges:** sharper. `--radius: 6px`, cards at 4px. The view header
  rule below the title is `border-bottom: 2px double var(--border-strong)`
  — a double rule, like a section break in a printed book.
- **Glow:** **none.** Trinity rejects the lamp-pool. Focus is signaled
  by a 1px brass border-color swap plus the ribbon.
- **Active row indicator:** the **hanging silk ribbon** in tarnished
  brass — same shape as Bodleian but cooler hue.
- **Status:** small-caps text chips, not dots — `HIGH` `MED` `LOW` in
  the right margin, set in condensed sans, no fill.
- **CTAs:** **gold leaf** treatment, identical to Bodleian. Brass is
  the one warm element this draft permits.
- **Latin section heads:** off by default but feels more natural here
  than in Bodleian. Probably worth a per-user opt-in either way.

### Density

Medium-tight. Card padding 12px (vs Bodleian's 16px). The architectural
rhythm reads better when rows sit closer.

---

## 3. Magdalen Candlelit

A single beeswax candle on a desk in Magdalen tower at 1 AM, with the
rest of the room dark. Most extreme of the warmths. Most extreme of
the breathing room. Built for someone whose work feels like writing
by candle and who is willing to accept one decorative motion break in
exchange for that.

**ID:** `da-magdalen`
**Reference weight:** Vermeer's *Astronomer*, Joseph Wright of Derby's
candlelight studies, *Dead Poets Society* dorm scenes.

### Palette

```css
html[data-theme="da-magdalen"] {
  --accent:           #e8b04a;   /* beeswax candle */
  --accent-light:     #2d2008;
  --accent-dark:      #f5d28a;
  --accent-faint:     color-mix(in srgb, var(--accent) 14%, transparent);
  --accent-soft:      color-mix(in srgb, var(--accent) 6%, transparent);

  --sidebar-bg:       #0e0a06;   /* smoke-black */
  --sidebar-hover:    #181107;
  --sidebar-active:   #181107;

  --content-bg:       #0e0a06;
  --card-bg:          #16100a;

  --text-primary:     #f0d8a8;   /* warm cream, deeper than Bodleian */
  --text-secondary:   #a88a5e;
  --text-muted:       #6a553a;

  --border:           #1f1610;
  --border-strong:    #2d2118;

  --shadow-sm:        0 1px 2px rgba(0,0,0,0.7);
  --shadow:           0 2px 6px rgba(0,0,0,0.8);
  --shadow-md:        0 10px 24px rgba(0,0,0,0.85);
  --shadow-lg:        0 28px 60px rgba(0,0,0,0.9);
}
```

`forceAccent: '#e8b04a'`. Cream on smoke is 12.8:1. Beeswax on card
is 6.4:1 — comfortable AA pass.

### Typography

Serif-only. No sans anywhere, no mono. `EB Garamond` 14.5px for body,
16px for titles. This is the strictest type rule in the batch and
it's the point — every other surface here is reading copy. Tabular
numbers via OpenType feature, not a separate font.

### Treatments

- **Edges:** `--radius: 10px`. No corner cuts. No borders on most
  cards — only the active row gets a hairline.
- **The one allowed motion:** **candle flicker.** The focused card's
  amber lamp pool pulses on an 1200ms sine between 92% and 100%
  opacity at 8% amplitude. Reads as flame breath, not animation. Can
  be killed by `prefers-reduced-motion: reduce`.
- **Glow:** **brass lamp pool** identical to Bodleian, but warmer and
  slightly larger (radial blur 20% wider). When combined with the
  flicker, it's the whole identity of the theme. Without the flicker
  this draft is just a warmer Bodleian; with it, it's distinct.
- **Surface:** no gradients beyond the lamp pool. Cards are flat
  warm-near-black rectangles.
- **Time format:** natural language. `quarter past two`, `the 6th of
  June`. The Pull view title bar shows `the 6th of June · evening`
  rather than `06 / 06 · 18:00`. Internal time is still stored
  numerically; only the display is prose. Toggleable per-user, since
  this is the most opinionated treatment in any draft here.
- **Inkwell loader:** the only loader animation in the app for this
  theme — a single black drop falling into a brass ring, replacing
  the spinner. Used only on long-running operations (save, export),
  not on every fetch.

### Density

Loosest in the batch. 1.7 line-height. Card padding 22px. Two-thirds
the items per screen as Bodleian. The screen reads like a page of a
novel, not a list.

---

## 4. Inkwell & Quarto

The anti-theatrical dark academia. Iron-gall ink, eggshell-coloured
text, near-black paper, one drop of oxblood used only on overdue or
urgent. The Arasaka of this family — refuses glow, refuses the
candle, refuses the ribbon. For someone who finds the other four
ornamental and wants the *typography* to be the academia.

**ID:** `da-inkwell`
**Reference weight:** Aldus Manutius pocket editions, T.S. Eliot's
*Four Quartets* first edition, Faber & Faber jacket design.

### Palette

```css
html[data-theme="da-inkwell"] {
  --accent:           #7a1f2b;   /* oxblood — used very sparingly */
  --accent-light:     #2a0a0e;
  --accent-dark:      #a8404e;
  --accent-faint:     color-mix(in srgb, var(--accent) 10%, transparent);
  --accent-soft:      color-mix(in srgb, var(--accent) 5%, transparent);

  --sidebar-bg:       #0c0c0d;   /* iron-black, ever-so-slightly cool */
  --sidebar-hover:    #15151a;
  --sidebar-active:   #15151a;

  --content-bg:       #0c0c0d;
  --card-bg:          #131318;

  --text-primary:     #e8e2d4;   /* eggshell */
  --text-secondary:   #8e887b;
  --text-muted:       #5a564d;

  --border:           #1b1b21;
  --border-strong:    #25252e;

  --shadow-sm:        0 1px 1px rgba(0,0,0,0.7);
  --shadow:           0 1px 2px rgba(0,0,0,0.8);
  --shadow-md:        0 2px 6px rgba(0,0,0,0.85);
  --shadow-lg:        0 8px 24px rgba(0,0,0,0.9);
}
```

`forceAccent: '#7a1f2b'`. Eggshell on iron sits at 12.4:1. Oxblood
is **fill-only as text**: it appears only as a 2px left-edge stripe
on overdue rows, never as readable text against the dark surface
(where it would be 2.9:1 and fail AA). Documented because we'll be
tempted.

### Typography

Serif + tiny mono. `Source Serif Pro` 13.5px for body and titles
(no size hierarchy — chapter typography uses tracked small-caps for
titles instead). `IBM Plex Mono` 10.5px for IDs and dates only.
Italic serif for marginalia. No sans anywhere. Tabular numerals on.

### Treatments

- **Edges:** sharp. `--radius: 3px` for cards, 0px for indicators.
  The view title is followed by a 1px hairline `border-bottom`, full
  stop. No double rules, no boxes.
- **Glow:** **none.** Focus is signaled by a 2-character indent shift
  — every row has a `padding-left: 16px`; the focused row has 24px.
  The reader's eye finds the shift instantly without any luminance
  change. This is the theme's strongest typographic argument.
- **Marginalia:** the right-edge gutter (~120px) of each card carries
  italic serif annotations when the row has a note. Annotations are
  in `var(--text-secondary)` italic, no border, no background. This
  is the **one decorative move** the theme makes, and it earns it by
  being functional (the note is real metadata).
- **Library card IDs:** every todo carries a Dewey-style ID in mono
  in the right column. Acts like a barcode — never decorative, always
  present. Reinforces the "this is an index" feel.
- **Active row:** the indent shift + a single hairline above and below
  the focused row in `--border-strong`. Pinned/overdue rows get a 2px
  oxblood left edge, the only place oxblood ever appears.
- **No status dots.** Priority is a single lowercase abbreviation
  (`hi`, `md`, `lo`, `—`) in the right margin. The lack of fill is
  intentional.

### Density

Tightest of the dark academia drafts. 12px card padding. 1.45
line-height (serif still needs more than sans, but less than Magdalen).

---

## 5. Professor's Study (Autumn)

A senior tutor's college rooms in late October. Tweed jackets,
leather-bound editions of less-read authors, a fire just lit, a
window with a view of the chestnut tree turning. Warmer than
Bodleian but more lived-in — less monastic, more *home office of a
person who has been here for thirty years*. Built for people who
find the other drafts too ceremonial.

**ID:** `da-professor`
**Reference weight:** Lewis & Tolkien Inklings descriptions, *The
History Boys* staff room.

### Palette

```css
html[data-theme="da-professor"] {
  --accent:           #a0522d;   /* burnt sienna */
  --accent-light:     #2c1408;
  --accent-dark:      #c97548;
  --accent-faint:     color-mix(in srgb, var(--accent) 12%, transparent);
  --accent-soft:      color-mix(in srgb, var(--accent) 6%, transparent);

  /* Two supporting hues used sparingly */
  --moss:             #5a6f3a;   /* dried moss / leather binding */
  --oxblood:          #6a1f25;   /* used on overdue only */

  --sidebar-bg:       #1b140e;   /* tobacco */
  --sidebar-hover:    #27190e;
  --sidebar-active:   #27190e;

  --content-bg:       #1b140e;
  --card-bg:          #251a10;

  --text-primary:     #ecdcb6;   /* tweedy cream */
  --text-secondary:   #b2966a;
  --text-muted:       #75614a;

  --border:           #2a1e13;
  --border-strong:    #3c2c1d;

  --shadow-sm:        0 1px 2px rgba(0,0,0,0.5);
  --shadow:           0 2px 5px rgba(0,0,0,0.55);
  --shadow-md:        0 8px 20px rgba(0,0,0,0.65);
  --shadow-lg:        0 24px 50px rgba(0,0,0,0.75);
}
```

`forceAccent: '#a0522d'`. Cream on tobacco is 9.6:1. Sienna on card
is 5.2:1 — AA pass for chrome.

### Typography

Serif + slab. Body in `Source Serif Pro` 14px. Section headings in
`Roboto Slab` or `Zilla Slab` — slabby enough to suggest the
roman-numeral chapter heads in old monographs without going full
hairshirt. Mono for IDs.

### Treatments

- **Edges:** `--radius: 9px`. Slightly chunkier than Bodleian, suits
  the slab heads. Cards have a real (visible) `--shadow` — the warmth
  in the shadow ties everything together.
- **Glow:** brass lamp pool, slightly desaturated (sienna instead of
  brass-gold). Less ceremonial than Bodleian — the lamp here is a
  green-shaded banker's lamp, conceptually. Focus state.
- **Leather spine sidebar:** the sidebar gets a vertical ribbed
  gradient — alternating 24px stripes at `--sidebar-bg` and `color-mix(
  in srgb, var(--sidebar-bg) 92%, white)`, with hairline `--border-strong`
  dividers. Suggests the spines of a row of books seen edge-on.
  Subtle (2-3% luminance difference); reads as texture, not zebra.
- **Status dots:** wax seal style, sienna. Same shape as Bodleian.
- **Secondary hue use:** `--moss` is used on completed/archived
  states (instead of grey) — desaturated enough to recede but warm
  enough not to feel sad. `--oxblood` is used on overdue rows as a
  left-edge stripe.
- **Natural-language echoes:** the soft italic suffix `— quarter past
  two` (or similar) appears under the deadline of the active row
  only. Less ambitious than Magdalen's full prose-time treatment but
  in the same family.

### Density

Medium. Card padding 14px, line-height 1.55.

---

## 6. The Scriptorium *(bonus — light theme)*

The genre's strongest visual argument is actually the *manuscript
page itself* — vellum cream paper, dark sepia ink, gold-leaf
initials, rubricated chapter heads, italic marginalia. "Dark academia"
the aesthetic is about books and libraries, not necessarily about a
dark UI. This is included as a deliberate counter-proposal so we can
reject it on purpose rather than by default.

**ID:** `da-scriptorium`
**Reference weight:** Lindisfarne Gospels, Très Riches Heures du Duc
de Berry, early Aldine pocket editions.

### Palette

```css
html[data-theme="da-scriptorium"] {
  --accent:           #a07e22;   /* gold leaf, dark */
  --accent-light:     #f3e7c5;
  --accent-dark:      #6d541b;
  --accent-faint:     color-mix(in srgb, var(--accent) 14%, transparent);
  --accent-soft:      color-mix(in srgb, var(--accent) 7%, transparent);

  --rubric:           #7a1f2b;   /* oxblood for rubricated initials */

  --sidebar-bg:       #2a2418;   /* dark walnut — the binding */
  --sidebar-hover:    #3a3120;
  --sidebar-active:   #3a3120;

  --content-bg:       #f1e6c8;   /* vellum cream */
  --card-bg:          #faf2dc;   /* slightly brighter page */

  --text-primary:     #2a1f10;   /* dark sepia ink */
  --text-secondary:   #6b5635;
  --text-muted:       #9c8a64;

  --border:           #d6c79a;
  --border-strong:    #b8a371;

  --shadow-sm:        0 1px 1px rgba(74,55,28,0.08);
  --shadow:           0 1px 3px rgba(74,55,28,0.1);
  --shadow-md:        0 4px 12px rgba(74,55,28,0.12);
  --shadow-lg:        0 14px 32px rgba(74,55,28,0.18);
}
```

Sepia on vellum: 11.4:1. Gold-leaf accent on vellum: 4.8:1 — AA pass.
Oxblood rubric on vellum: 8.9:1.

### Treatments

- **Rubrication:** the first letter of every card title is rendered
  in `--rubric` (oxblood) at 1.4× the surrounding size, set in a
  display serif. Matches manuscript convention. View titles also get
  a rubricated initial.
- **Marginalia:** italic sepia notes in the right gutter, like Inkwell.
- **Gold-leaf section dividers:** `border-top: 1px solid var(--accent)`
  on section breaks — the gold leaf catches under the eye exactly
  the way a single illuminated rule does on a manuscript page.
- **Walnut sidebar:** the only dark surface in the theme — the
  sidebar is the *binding*, the content area is the *page*. This
  reinforces the metaphor more than any single decorative element.
- **Typography:** EB Garamond 14.5px body. Display serif (`Cormorant
  Garamond` or `Cardo`) for titles and rubricated initials. No sans,
  no mono on the page — but yes, mono for IDs (it's the index, not
  the manuscript proper).

This draft is the only one in the catalogue that argues *against* a
dark base for the "dark academia" prompt. Including it on purpose so
we can either commit to dark or knowingly pick this one.

---

# How to narrow

Three orthogonal decisions:

1. **How ceremonial?**
   - Most: Magdalen (candlelit, prose-time, no sans, generous air)
   - Least: Inkwell (typographic-only, no glow, no dots, no ribbon)
   - Middle: Bodleian / Trinity / Professor

2. **Cool or warm?**
   - Warmest → coolest: Magdalen → Bodleian → Professor → Inkwell → Trinity
   - Trinity is the only draft with a green undertone; everything else
     sits on the brown axis.

3. **How many gimmicks do you actually want?**
   - All-in: Bodleian (lamp pool + ribbon + wax seal + tooled rim +
     Latin titles)
   - One-strong-motif: Magdalen (candle flicker is the whole identity)
   - Functional-only: Inkwell (marginalia and library IDs do real work)
   - Mid-mix: Trinity, Professor

If we want one to ship and one to keep on the shelf, my recommendation
is **Bodleian** as the canonical dark-academia theme (most legible
read of the genre, generous but not pretentious) plus **Inkwell**
as the restrained sibling for users who reject ornament. Magdalen is
the "I want a vibe, not a tool" choice — keep it as a third if we want
range, drop it if we want a tighter catalogue.

If we'd rather make the unconventional bet, **Scriptorium** is the
only theme in our whole catalogue that argues "the academia is the
page, not the room." It would slot alongside `sepia` / `solarized`
in the lights, not against the cyberpunks in the darks — different
shelf, different defence.
