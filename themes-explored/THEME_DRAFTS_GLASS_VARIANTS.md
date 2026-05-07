# Glass-variant theme drafts

Three glass-treatment cousins of the existing solid themes —
**Saffron**, **Vellum**, **Capri** — each rebuilt around the same
frosted-translucent surface model the existing `glass` theme uses, but
keeping the source theme's signature accent and hue family.

The existing `glass` is cool and pink — purple/sky-blue gradient
backdrop with a hot-pink accent and cool-cream text. These three add a
warm-amber pair (kitchen at dusk, library at midnight) and a cool-cyan
pair (Mediterranean spray) so the `glass` treatment can be picked in
the mood that fits, not just one specific colour story.

The drafts are design exploration only — nothing is wired into
`styles.css` or `THEMES` yet. After review, pick which to ship and I'll
add them to the theme system the same way Operating Theatre and Stucco
were added.

---

## Conventions used across this batch

These mirror the existing `glass` theme so cross-pollinated treatments
look right:

- **Body has a multi-radial gradient backdrop, fixed-attachment.** Three
  saturated stops in the theme's hue family over a near-black base of
  the same temperature.
- **`--content-bg: transparent`.** The content surface lets the body
  gradient bleed through everywhere.
- **Translucent cards** (`rgba(...) ~6 %`) with **`backdrop-filter:
  blur(18px)`**. That filter is the actual frosted-glass effect — most
  of the visual identity lives there.
- **Translucent sidebar** in the same hue family as the base, but at
  higher alpha than the cards so it reads as a panel, not a transparent
  smear.
- **Accent stays locked** to the source theme's signature hue. Glass-
  variants use the same `forceAccent` so a project's colour can't
  override the identity.
- **Shadows are heavier** than solid themes — frosted cards floating
  over a busy backdrop need real lift to register as elevated.
- **No Inter/etc. font override.** Inherits the system stack for
  consistency with the existing `glass`.
- **Modals get an opaque-enough frosted background** (~92 % alpha) so
  text inputs read against a calm surface, not whatever happens to be
  behind the dialog.

### Worst-case contrast methodology

Glass themes can't be characterised by a single text-on-bg ratio
because the backdrop varies pixel to pixel. The reports below give
both numbers that matter:

1. **Text on solid base** (worst case for pixels outside any gradient
   centre — large stretches of the screen).
2. **Text on each gradient peak** alpha-blended onto the base
   (Porter-Duff over). This is the brightest pixel in the radial
   centre — the smallest contrast budget anywhere.

Frosted cards add another ~0.5–1.0 ratio points of effective lift via
the blur, so in practice text on a card reads even cleaner than the
gradient-peak number suggests.

---

## 1. Lamplight  (Saffron Glass)

**ID:** `lamplight`
**Source theme:** Saffron (`eh-sun`) — cadmium amber on cool slate.
**Mood:** A kitchen at dusk. One amber bulb in the ceiling, last sun
through the curtains, dust in the light. Warm but not orange-loud —
the amber sits inside saturated dusk-purple and a soft ember.

### Palette

```css
html[data-theme="lamplight"] {
  --accent:           #F9A81A;                            /* Saffron amber, locked */
  --accent-light:     rgba(249, 168, 26, 0.30);
  --accent-dark:      #C68200;
  --accent-faint:     rgba(249, 168, 26, 0.12);
  --accent-soft:      rgba(249, 168, 26, 0.06);

  --sidebar-bg:       rgba(40, 25, 10, 0.55);             /* warm tobacco glass */
  --sidebar-hover:    rgba(255, 200, 100, 0.06);
  --sidebar-active:   rgba(255, 200, 100, 0.12);

  --content-bg:       transparent;
  --card-bg:          rgba(255, 245, 220, 0.06);          /* warm cream tint */

  --text-primary:     #FFF4E0;
  --text-secondary:   rgba(255, 244, 224, 0.72);
  --text-muted:       rgba(255, 244, 224, 0.50);

  --border:           rgba(255, 200, 100, 0.10);
  --border-strong:    rgba(255, 200, 100, 0.22);

  --shadow-sm:        0 1px 2px rgba(0, 0, 0, 0.30);
  --shadow:           0 4px 12px rgba(0, 0, 0, 0.40);
  --shadow-md:        0 8px 24px rgba(0, 0, 0, 0.40);
  --shadow-lg:        0 16px 40px rgba(0, 0, 0, 0.50);
}

html[data-theme="lamplight"] body {
  background:
    radial-gradient(at 20%  5%, rgba(249, 168,  26, 0.55) 0%, transparent 45%),
    radial-gradient(at 80% 10%, rgba(180,  60,  60, 0.50) 0%, transparent 50%),
    radial-gradient(at 60% 95%, rgba( 60,  30,  80, 0.55) 0%, transparent 55%),
    #1A0E04;
  background-attachment: fixed;
}
```

`forceAccent: '#F9A81A'`.

### Typography

System sans (the codebase default) — no override. The mood is carried
by colour and translucency, not type.

### Treatments

- **Edges:** 10px (the codebase default). Glass surfaces don't need
  sharp corners to feel intentional — the blur does the work.
- **Frosted cards:** 18px backdrop-blur on `.todo-card`, `.note-list-
  panel`, `.com-card`, `.del-card`, `.flow-card`, `#sidebar`, etc. —
  the same selector list the existing `glass` rules cover.
- **Sidebar:** mostly clear over the body's gradient, with a 0.55-alpha
  warm-tobacco overlay so it reads as a panel.
- **CTAs:** primary buttons keep solid amber `#F9A81A` with near-black
  text — black-on-amber lands at 9.6:1 (AAA). Hover lifts toward
  `#FFB733`.
- **Active row:** card-bg gains a 2px solid amber left rule + shifts to
  `rgba(255, 200, 100, 0.12)`.
- **Modals / palette:** opaque-enough backdrop (rgba(28, 18, 8, 0.92))
  with 30px blur so dialog text reads against a calm warm surface, not
  the busy gradient.

### Contrast report

| Pair | Ratio | Pass |
|---|---|---|
| text `#FFF4E0` on solid base `#1A0E04` | 17.38:1 | AAA |
| text on amber-peak composite `#956310` | **4.73:1** | AA |
| text on red-peak composite `#672520` | 10.35:1 | AAA |
| text on violet-peak composite `#2D172E` | 15.13:1 | AAA |
| near-black on amber CTA | 9.60:1 | AAA |

### Mock

```
       ─── PULL ────────────────────────  06 May · 14:23

   [  ▌ Call Lukas re: Q4 proposal               HIGH ]    ← amber rule, frosted card
   [    due 14:00 · 12m                                ]
   [                                                   ]
   [    Send onboarding doc                       MED  ]
   [    sketch · 10 May 2026                           ]
   [                                                   ]
   [    Tariff comparison findings                NOTE ]
```

Square brackets stand in for the frosted card outline. The "▌" is the
2px amber active-rule.

---

## 2. Reading Lamp  (Vellum Glass)

**ID:** `reading-lamp`
**Source theme:** Vellum (`eh-sepia`) — warm cream paper with amber
gilt accent.
**Mood:** A leather-bound book under a single brass desk lamp. Dust
motes in the lamplight, dark room behind. Warm enough that it reads as
"library at midnight" rather than "kitchen at dusk" — the difference
from Lamplight is that the warm tones lean *brown* (cinnamon, leather,
tobacco) rather than *orange-violet*.

### Palette

```css
html[data-theme="reading-lamp"] {
  --accent:           #F9A81A;                            /* Vellum amber, locked */
  --accent-light:     rgba(249, 168, 26, 0.28);
  --accent-dark:      #B77900;
  --accent-faint:     rgba(249, 168, 26, 0.10);
  --accent-soft:      rgba(249, 168, 26, 0.05);

  --sidebar-bg:       rgba(30, 20, 12, 0.62);             /* warm leather glass */
  --sidebar-hover:    rgba(244, 220, 180, 0.06);
  --sidebar-active:   rgba(244, 220, 180, 0.12);

  --content-bg:       transparent;
  --card-bg:          rgba(244, 220, 180, 0.07);          /* parchment tint */

  --text-primary:     #F5E6CC;
  --text-secondary:   rgba(245, 230, 204, 0.72);
  --text-muted:       rgba(245, 230, 204, 0.50);

  --border:           rgba(244, 220, 180, 0.10);
  --border-strong:    rgba(244, 220, 180, 0.22);

  --shadow-sm:        0 1px 2px rgba(0, 0, 0, 0.35);
  --shadow:           0 4px 14px rgba(0, 0, 0, 0.45);
  --shadow-md:        0 8px 26px rgba(0, 0, 0, 0.45);
  --shadow-lg:        0 18px 44px rgba(0, 0, 0, 0.55);
}

html[data-theme="reading-lamp"] body {
  background:
    radial-gradient(at 50%  0%, rgba(249, 168,  26, 0.40) 0%, transparent 40%),
    radial-gradient(at 10% 100%, rgba(120,  50,  30, 0.55) 0%, transparent 50%),
    radial-gradient(at 90% 100%, rgba( 60,  35,  20, 0.55) 0%, transparent 50%),
    #140906;
  background-attachment: fixed;
}
```

`forceAccent: '#F9A81A'`.

### Treatments

- **Edges:** 10px.
- **Frosted cards:** 18px blur, same selector list as `glass`.
- **Sidebar:** stronger 0.62 alpha than Lamplight — leather gets darker
  weight than dusk light. Reads as a deeper, more grounded panel.
- **Card-bg tint** is parchment-cream with low alpha, so cards visibly
  warm what's behind them.
- **CTAs:** amber on near-black text, 9.93:1.
- **Active row:** 2px amber left rule + parchment-tinted card lift.
- **Modals:** rgba(20, 14, 8, 0.93) with 30px blur — feels like an open
  book in a dark room.

### Contrast report

| Pair | Ratio | Pass |
|---|---|---|
| text `#F5E6CC` on solid base `#140906` | 15.93:1 | AAA |
| text on amber-peak composite `#70490E` | **6.45:1** | AA |
| text on cinnamon-peak composite `#4B2013` | 11.27:1 | AAA |
| text on tobacco-peak composite `#2A170E` | 13.91:1 | AAA |
| near-black on amber CTA | 9.93:1 | AAA |

The amber-peak is the brightest pixel and still hits 6.45:1 — the
narrowest gradient (40 %) in this trio leaves more headroom than
Lamplight's 55 %.

### Mock

```
       ─ Pull ──────────────────────  06 May · 14:23

      ▌ Call Lukas re: Q4 proposal                  HIGH      ← active rule
        due 14:00 · 12m

        Send onboarding doc                          MED
        sketch · 10 May 2026

        Tariff comparison findings                  NOTE
```

The amber on parchment-tinted glass reads warmer than Lamplight —
cards feel like book pages with light passing through.

---

## 3. Spray  (Capri Glass)

**ID:** `spray`
**Source theme:** Capri (`ai5-cyan`) — bright cyan on near-black
sidebar with clean white content.
**Mood:** Spray off a Mediterranean cliff at noon. Cool aquamarine
glass, deep ocean blues underneath, a flash of teal sun. The cool
counterpart to Lamplight and Reading Lamp.

### Palette

```css
html[data-theme="spray"] {
  --accent:           #26C9E2;                            /* Capri cyan, locked */
  --accent-light:     rgba(38, 201, 226, 0.30);
  --accent-dark:      #1A8F9E;
  --accent-faint:     rgba(38, 201, 226, 0.12);
  --accent-soft:      rgba(38, 201, 226, 0.06);

  --sidebar-bg:       rgba( 8, 20, 40, 0.55);             /* deep navy glass */
  --sidebar-hover:    rgba(180, 230, 240, 0.06);
  --sidebar-active:   rgba( 38, 201, 226, 0.18);

  --content-bg:       transparent;
  --card-bg:          rgba(220, 240, 250, 0.07);          /* cool blue-white tint */

  --text-primary:     #E8F5FA;
  --text-secondary:   rgba(232, 245, 250, 0.72);
  --text-muted:       rgba(232, 245, 250, 0.50);

  --border:           rgba(180, 230, 240, 0.10);
  --border-strong:    rgba( 38, 201, 226, 0.30);

  --shadow-sm:        0 1px 2px rgba(0, 0, 0, 0.30);
  --shadow:           0 4px 12px rgba(0, 0, 0, 0.40);
  --shadow-md:        0 8px 24px rgba(0, 0, 0, 0.40);
  --shadow-lg:        0 16px 40px rgba(0, 0, 0, 0.50);
}

html[data-theme="spray"] body {
  background:
    radial-gradient(at 70% 10%, rgba( 38, 201, 226, 0.55) 0%, transparent 45%),
    radial-gradient(at 20%  5%, rgba( 56, 120, 200, 0.50) 0%, transparent 50%),
    radial-gradient(at 80% 95%, rgba( 15,  60, 100, 0.60) 0%, transparent 55%),
    #061421;
  background-attachment: fixed;
}
```

`forceAccent: '#26C9E2'`.

### Treatments

- **Edges:** 10px.
- **Frosted cards:** 18px blur.
- **Sidebar:** deep navy translucent (0.55 alpha). The active state
  reuses the cyan accent at 0.18 — same lit-from-within effect Glass
  uses but cooled down.
- **Border-strong** is the cyan accent at 0.30 alpha rather than a
  neutral white-translucent — picked rims read as cyan trim, like
  glass with metallic-cyan edging.
- **CTAs:** solid cyan with deep navy text. Navy-on-cyan: 9.33:1.
- **Active row:** 2px cyan left rule + cool blue-white card lift.
- **Modals:** rgba(8, 20, 40, 0.92) with 30px blur — same model as
  Glass, retoned cool.

### Contrast report

| Pair | Ratio | Pass |
|---|---|---|
| text `#E8F5FA` on solid base `#061421` | 16.70:1 | AAA |
| text on cyan-peak composite `#18788B` | **4.61:1** | AA |
| text on ocean-peak composite `#1F4674` | 8.63:1 | AAA |
| text on teal-peak composite `#0B2C49` | 12.83:1 | AAA |
| deep navy on cyan CTA | 9.33:1 | AAA |

Cyan peak at 4.61:1 — the saturated cyan centre is the budget-tightest
spot in the trio. Anything off-centre passes comfortably.

### Mock

```
        ─── Pull ────────────────────────  06 May · 14:23

      ▌ Call Lukas re: Q4 proposal                  HIGH      ← cyan rule
        due 14:00 · 12m

        Send onboarding doc                          MED
        sketch · 10 May 2026

        Tariff comparison findings                  NOTE
```

The card surface is faintly cyan-cooled — like looking through pool
water at noon. The single cyan accent rule is the sharpest line on the
screen.

---

## How the four glass themes relate

| # | Theme | Accent | Backdrop hue | Card tint | Mood |
|---|---|---|---|---|---|
| existing | **Glass** | hot pink `#ec4899` | purple + pink + sky-blue | cool white-blue | club / dim cinema |
| 1 | **Lamplight** | amber `#F9A81A` | amber + red + violet | warm cream | kitchen at dusk |
| 2 | **Reading Lamp** | amber `#F9A81A` | amber + cinnamon + tobacco | parchment | library at midnight |
| 3 | **Spray** | cyan `#26C9E2` | cyan + ocean + teal | cool blue-white | Mediterranean noon |

**Coverage check:**
- Glass: cool/cinematic
- Lamplight: warm/saturated
- Reading Lamp: warm/grounded (less saturated than Lamplight, more
  brown)
- Spray: cool/bright (lighter and less violet than Glass)

The two amber drafts are intentionally close — they share the same
accent — but their backdrops sit far enough apart that side-by-side
you read one as "evening kitchen" and the other as "library night".
If you only want one, **Lamplight** is the louder, more saturated
choice; **Reading Lamp** is the calmer, more useful-for-long-sessions
choice.

---

## Standalone HTML previews

- `previews/glass-lamplight.html`
- `previews/glass-reading-lamp.html`
- `previews/glass-spray.html`

Open each at desktop width. Look at how the cards float above the
backdrop, how the active-row accent rule reads against the frosted
surface, and how the sidebar's translucent base shows the gradient
through it. The previews link from the existing `previews/index.html`.
