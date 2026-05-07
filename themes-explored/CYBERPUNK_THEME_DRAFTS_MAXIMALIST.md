# Cyberpunk theme drafts — MAXIMALIST round

Five drafts, deliberately loud. The opposite-end-of-the-spectrum
counterpart to the restrained drafts in `CYBERPUNK_THEME_DRAFTS.md`.
None of these are meant to coexist with the daily-driver drafts as
peers — these are *signature* themes, the kind you switch to when
you want the screen to feel like a thing.

Each draft has a standalone HTML preview at
`previews/<draft>.html` — open in a browser to see motion.

## Variation map

| # | Name             | Hue family             | Motion         | Density | Era                 | Surface              |
|---|------------------|------------------------|----------------|---------|---------------------|----------------------|
| 1 | Night City       | Magenta + cyan         | Pulse + glow   | Heavy   | Near-future tactical | Flat saturated       |
| 2 | Mirrorshades     | Pink + purple + cyan   | Gradient drift | Medium  | 80s synthwave       | Glassy translucent   |
| 3 | Terminal Green   | Phosphor green         | Scanline scroll| Heavy   | Hacker terminal     | Flat + scan texture  |
| 4 | Kobayashi Maru   | Amber + crimson + cyan | Multi-stream   | Extreme | Anime mecha cockpit | Layered HUD frames   |
| 5 | Arasaka Red      | Blood red + gold       | Metallic shimmer| Medium | Corpo-dystopian     | Metallic + shimmer   |

---

## 1. Night City

**ID:** `cp-max-night-city`
**Reference weight:** Cyberpunk 2077 (game UI), Ghost in the Shell SAC
HUD overlays.

### Character

The interface of someone running a job in a megacorp tower at 3 a.m.
Magenta and cyan locked in tension across every surface; HUD chrome
on every card (ID strips, frame brackets, status LEDs); a slow
ambient pulse in the deep purple base. Confident, busy, *operational*.

### Palette

```css
html[data-theme="cp-max-night-city"] {
  --accent:           #ff0080;   /* hot magenta */
  --accent-secondary: #00f0ff;   /* electric cyan */
  --accent-warn:      #fde047;   /* warning yellow */
  --accent-light:     #4a002a;
  --accent-dark:      #ff66b8;
  --accent-faint:     color-mix(in srgb, #ff0080 18%, transparent);
  --accent-soft:      color-mix(in srgb, #ff0080 9%, transparent);

  --sidebar-bg:       #0a0014;
  --sidebar-hover:    #16001f;
  --sidebar-active:   #1f0029;

  --content-bg:       #0a0014;
  --card-bg:          #16001f;

  --text-primary:     #e6deff;
  --text-secondary:   #9d8bb8;
  --text-muted:       #5d4d75;

  --border:           #2d1240;
  --border-strong:    #5d2480;

  --glow-magenta:     rgba(255,0,128,0.55);
  --glow-cyan:        rgba(0,240,255,0.50);
}
```

`forceAccent: '#ff0080'`

### Typography

Display sans (Inter Display / Söhne) for titles. Mono (JetBrains Mono)
for every label, ID, timestamp, and status — wide tracking. UI nav
items uppercase, +0.08em tracking.

### Treatments

- **Card chrome:** every card has an ID strip header
  (`< 03 // ID:T_3F2 ─── HIGH ──>`) in mono with corner glyph caps.
  Active card shows a cyan tick mark and a magenta accent rule on
  the left edge.
- **Cut corners:** clip-path on cards (top-right + bottom-left, 12px
  diagonals).
- **Pulse motion:** the active card's left magenta rule breathes
  (3s loop, 0.6 → 1.0 → 0.6 opacity). The view header has a thin
  cyan line under it that sweeps left-to-right (8s loop).
- **Sidebar:** items have a small `[●]` LED indicator on the right
  edge; the active item's LED pulses cyan (1.5s).
- **Buttons:** primary CTAs have a magenta→cyan gradient with a
  hover state that shifts the gradient origin.
- **Backdrop:** subtle radial vignette in deep purple, slow saturation
  drift (12s loop, ±2%).

### Mock

```
┌── NC.SYS ─────────────────────[ 14:23:07 // GRID:LIVE ]──┐
│                                                           │
│ ╱──< 03 // ID:T_3F2 // HIGH ──────────[REC#03287]─╱       │
│ │ ⏵  Call @LUKAS re: Q4 proposal                          │
│ │    DUE 14:00 · ▓▓▓░░ 60%  ·  #q4 #pricing               │
│ ╱──────────────────────────────────────────────────╱      │
│                                                           │
│ ╱──< 04 // ID:T_9B1 // MED  ──────────[REC#03291]─╱       │
│ │    Send onboarding doc                                  │
│ │    SKETCH · 2D AGO                                      │
│ ╱──────────────────────────────────────────────────╱      │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## 2. Mirrorshades

**ID:** `cp-max-mirrorshades`
**Reference weight:** 80s vaporwave / synthwave aesthetic, Tron-original.

### Character

A retro-future the future never delivered. Pink-purple-cyan trinity
across a slowly drifting gradient sky, glass panels floating above a
Tron grid horizon, particles drifting in dead space. Permission to
be unsubtle.

### Palette

```css
html[data-theme="cp-max-mirrorshades"] {
  --accent:           #ff39c0;   /* hot pink */
  --accent-secondary: #ff7a00;   /* sunset orange */
  --accent-tertiary:  #00d4ff;   /* sky cyan */
  --accent-light:     #4a0a3a;
  --accent-dark:      #ffb3e6;
  --accent-faint:     rgba(255,57,192,0.16);
  --accent-soft:      rgba(255,57,192,0.08);

  --bg-deep:          #1a0533;
  --bg-mid:           #2d0a4d;
  --bg-light:         #4a1473;

  --sidebar-bg:       rgba(20, 5, 45, 0.7);
  --sidebar-hover:    rgba(255, 57, 192, 0.08);
  --sidebar-active:   rgba(255, 57, 192, 0.16);

  --content-bg:       transparent;
  --card-bg:          rgba(255, 57, 192, 0.06);

  --text-primary:     #f5e8ff;
  --text-secondary:   #c5a8e0;
  --text-muted:       #7a5d99;

  --border:           rgba(255, 255, 255, 0.10);
  --border-strong:    rgba(255, 57, 192, 0.30);
}
```

`forceAccent: '#ff39c0'`

### Typography

Inter Display for titles (slightly italic on view headers — channels
80s race-game type). Lowercase nav. Mono used sparingly, only for
explicit data fields.

### Treatments

- **Body backdrop:** layered radial-gradient (purple top, pink center,
  cyan bottom-edge) that animates over 60s — slow drift between
  related hues.
- **Grid horizon:** at the bottom of the content area, a CSS-only
  grid (perspective-tilted) that fades upward — Tron-style.
- **Glass cards:** `backdrop-filter: blur(20px)` with a thin pink
  border at 30% opacity. Hover lifts the card and brightens the glass.
- **Particle drift:** small (2–3px) glowing dots float upward in
  the dead space between cards (CSS animation, ~30 dots staggered).
- **Chromatic aberration on titles:** view-header text uses three-
  color text-shadow (cyan offset -2px, pink offset +2px) — readable
  but unmistakably retro.
- **Active card:** glows pink with a cyan inner ring; chromatic
  shadow extends downward 30px.

### Mock

```
       ✦                                  ·

        pull                       06.07 · 14:23

   ╔══════════════════════════════════════════════╗
   ║  ⏵  call @lukas re: q4 proposal              ║  ← glass card
   ║     due 14:00 · 12m · #q4                    ║     pink glow
   ╚══════════════════════════════════════════════╝

   ╔══════════════════════════════════════════════╗
   ║     send onboarding doc                      ║
   ║     sketch · 2 days ago                      ║
   ╚══════════════════════════════════════════════╝
                                              ✦
   ────────────────────────────────────────────
   ─────────────────────────────────────────────────
   ──────────────────────────────────────────────────────  ← grid horizon
                                                fading up
```

---

## 3. Terminal Green

**ID:** `cp-max-terminal-green`
**Reference weight:** Mr. Robot terminal, original Matrix UI, vintage
phosphor CRT.

### Character

The hacker terminal. Pure phosphor green on warm-near-black, every
single text element in monospace, scanlines actively drifting, ASCII
chrome doing real visual work. Includes a subtle glitch frame on
focus changes — earned, not gratuitous.

### Palette

```css
html[data-theme="cp-max-terminal-green"] {
  --accent:           #00ff41;     /* phosphor green */
  --accent-secondary: #00ff41;     /* same — single-hue theme */
  --accent-warn:      #ff6030;     /* alert red — used VERY sparingly */
  --accent-light:     #003d10;
  --accent-dark:      #66ff8c;
  --accent-faint:     rgba(0, 255, 65, 0.18);
  --accent-soft:      rgba(0, 255, 65, 0.07);

  --sidebar-bg:       #060a08;
  --sidebar-hover:    #0a1410;
  --sidebar-active:   #0d1f14;

  --content-bg:       #060a08;
  --card-bg:          #0a1410;

  --text-primary:     #b8ffc4;
  --text-secondary:   #66cc77;
  --text-muted:       #2d6638;

  --border:           #143820;
  --border-strong:    #1f5a30;
}
```

`forceAccent: '#00ff41'`

### Typography

100% monospace. JetBrains Mono / IBM Plex Mono / Consolas. Body,
titles, labels, sidebar — all of it. Body 13px, mono 12px for chrome.

### Treatments

- **Scanlines:** repeating-linear-gradient overlay at 2px stripes,
  3% opacity. Slowly drifts vertically (animation: 4px translate
  over 600ms, infinite). Barely perceptible motion — it's atmosphere.
- **Cursor blink:** active card's title has a `▌` block cursor at
  the end that blinks (1s ease-in-out alternate).
- **ASCII frames:** every section uses `┌─ NAME ─┐` borders — these
  are real `<div>`s with mono content, not just decoration.
- **Command-prompt vocabulary:** view headers display as
  `$ tasks --pull --due=today    [7 RESULTS]`. Empty states
  read like terminal output.
- **Sidebar items:** `[*]`, `[+]`, `[-]` ASCII prefixes by status.
- **Glitch frame on row entry:** when a card becomes active, its
  text briefly chromatic-shifts (2 keyframes, 200ms, then resolves).
  Very subtle — looks like a CRT settling.
- **Buttons:** rendered as `[ ADD ]`-style brackets, not actual
  button shapes. Hover replaces brackets with `> ADD <`.

### Mock

```
┌── ~/workspace ─────────────────────[ 14:23:07 ]──┐
│                                                   │
│ $ tasks --pull --due=today      [ 7 RESULTS ]    │
│                                                   │
│ [*] > call @lukas re: Q4 proposal           ▌    │  ← active row,
│       due 14:00 · 12m · #q4                       │     cursor blinks
│                                                   │
│ [+]   send onboarding doc                         │
│       sketch · 2d ago                             │
│                                                   │
│ [-]   schick angebot to lukas                     │
│       drafted yesterday                           │
│                                                   │
│ [!]   review architecture doc                     │  ← [!] = overdue
│       OVERDUE · 2d                                │     muted red
│                                                   │
│ ─────────────────────────────────────────────     │
│ $ _                                                │  ← prompt
└───────────────────────────────────────────────────┘
```

---

## 4. Kobayashi Maru

**ID:** `cp-max-kobayashi-maru`
**Reference weight:** Evangelion bridge UI, GitS SAC ops visualizations,
Kojima UI (Death Stranding telemetry).

### Character

Information-density off the charts. Multiple simultaneous data
streams, fake serial numbers and telemetry on every surface, a
sweeping radar arc in the view header, animated countdowns,
crimson alert pulses. Built to feel like an interface you'd see
inside a giant robot's cockpit.

### Palette

```css
html[data-theme="cp-max-kobayashi-maru"] {
  --accent:           #ffaa00;   /* mecha amber */
  --accent-secondary: #00d4e6;   /* info cyan */
  --accent-warn:      #ff3030;   /* crimson alert */
  --accent-light:     #3d2400;
  --accent-dark:      #ffd166;
  --accent-faint:     rgba(255,170,0,0.18);
  --accent-soft:      rgba(255,170,0,0.08);

  --sidebar-bg:       #0a0808;
  --sidebar-hover:    #14100d;
  --sidebar-active:   #1f1814;

  --content-bg:       #0a0808;
  --card-bg:          #14100d;
  --surface-frame:    #1f1814;

  --text-primary:     #ffe6c5;
  --text-secondary:   #b89570;
  --text-muted:       #5c4a3a;

  --border:           #3a2818;       /* warm thick frames */
  --border-strong:    #5a3a20;
}
```

`forceAccent: '#ffaa00'`

### Typography

Mono for ALL data; Inter for titles only. Tabular numerals on every
numeric surface (timestamps, percentages, IDs). Wide tracking on
labels.

### Treatments

- **Radar sweep:** view header has a small SVG circular gauge in the
  top-right corner with a sweeping arc that rotates 360° over 8s.
- **Layered frames:** cards have nested frames — outer thick frame
  (warm brown), inner thin frame, header strip with gradient. Reads
  visually like a panel inside a panel.
- **Telemetry sidebar:** sidebar bottom shows `▓▓▓░ MEM 67%`,
  `███▓ CPU 80%`, `▓▓░░ NET 45%` — fake bars that animate by ±3%
  over 5s loops, *suggesting* live data without committing to it.
- **Card serial numbers:** every card displays
  `T-2026-04-29-3F2A` in mono, prominently. Fake but consistent.
- **Status row:** every card has a `▶ STATUS: ACTIVE | T-12:34 | RANK: HIGH`
  line — color-coded (green/amber/red).
- **Crimson alert pulse:** overdue items have a crimson left border
  that pulses (1s loop). The "ALERT" badge throbs.
- **Animated countdowns:** `T-12:34` style countdowns visibly tick
  down (every second, JS-driven).
- **Bottom status bar:** the view footer is a fake telemetry strip:
  `LINK_OK | LATENCY 4ms | LOAD ░▓▓▓ | OPS 247/s`.

### Mock

```
╔══[ KM/PULL ]═══════════════════════════════[◔ scan ]═╗
║ ▶ ACTIVE OPS: 7   · OVERDUE: 1   · DONE: 23   · ALL: 42║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║ ┌──< T-2026-04-29-3F2A >─────────────[▶ HIGH ]────┐   ║
║ │   Call @LUKAS re: Q4 proposal                   │   ║
║ │   ▶ STATUS: ACTIVE | T-00:12:34 | RANK: 03     │   ║  ← live counter
║ │   #q4  ·  #pricing                              │   ║
║ └─────────────────────────────────────────────────┘   ║
║                                                       ║
║ ┌──< T-2026-04-29-9B1C >─────────────[▶ MED  ]────┐   ║
║ │   Send onboarding doc                           │   ║
║ │   ▶ STATUS: SKETCH | T-2D AGO  | RANK: 14      │   ║
║ └─────────────────────────────────────────────────┘   ║
║                                                       ║
║ ┌──< T-2026-04-22-1AAB >════════════[⚠ ALERT ]═══┐   ║  ← pulsing
║ │   Review architecture doc                       │   ║     crimson
║ │   ▶ STATUS: OVERDUE | T+02:00:00 | RANK: !!    │   ║
║ └═════════════════════════════════════════════════┘   ║
║                                                       ║
╠═══════════════════════════════════════════════════════╣
║ LINK_OK · LATENCY 4ms · LOAD ░▓▓▓ · OPS 247/s        ║
╚═══════════════════════════════════════════════════════╝
```

---

## 5. Arasaka Red

**ID:** `cp-max-arasaka-red`
**Reference weight:** Cyberpunk 2077's Arasaka corporate identity,
Blade Runner Wallace Corp, MGS exec menus.

### Character

Corporate power. Blood red and deep gold against matte warm-black.
Surfaces feel weighted, considered, *expensive*. Less ambient
motion than the others — what motion exists is deliberate (a slow
gold shimmer on the brand mark, crimson glow on critical alerts).
The interface of a software you don't *like*, but you respect.

### Palette

```css
html[data-theme="cp-max-arasaka-red"] {
  --accent:           #c41e3a;   /* blood red */
  --accent-secondary: #d4a017;   /* deep gold */
  --accent-warn:      #ff6030;   /* sharper urgent red */
  --accent-light:     #2a0810;
  --accent-dark:      #ff5070;
  --accent-faint:     rgba(196,30,58,0.20);
  --accent-soft:      rgba(196,30,58,0.10);

  --sidebar-bg:       #0a0606;
  --sidebar-hover:    #150a0a;
  --sidebar-active:   #1f0e0e;

  --content-bg:       #0a0606;
  --card-bg:          #150a0a;
  --surface-elevated: #1f0e0e;

  --text-primary:     #f5e0c5;       /* warm gold-cream */
  --text-secondary:   #b48560;
  --text-muted:       #6a4830;

  --border:           #2d1414;
  --border-strong:    #4d1a1a;

  --gold-shimmer:     linear-gradient(135deg, #d4a017 0%, #f5d166 50%, #d4a017 100%);
}
```

`forceAccent: '#c41e3a'`

### Typography

Display all-caps with wide tracking (+0.10em) for nav, view titles,
and labels. Body in a serious sans (Inter Display, slightly
condensed). Mono only for serial numbers — and even those styled
to look stamped, not typed.

### Treatments

- **Brand shimmer:** the sidebar brand element ("ARASAKA") has its
  gold accent rendered with `background-clip: text` and an animated
  gradient that drifts (6s loop). Subtle but conveys "this brand is
  metallic."
- **Double borders:** cards have a thin gold inner border + a thin
  crimson outer border, 1px gap between. Reads visually as
  "weighted frame."
- **Active card:** heavy crimson outer glow (15px blur), gold inner
  border at 100% opacity (vs. 40% on inactive cards).
- **Crests / emblems:** decorative `◆` `◇` `⊰` `⊱` glyphs flank
  view-title text. Sidebar section headers separated by horizontal
  gold rules.
- **Backdrop:** very subtle warm vertical gradient (slightly darker
  at top, slightly lighter at bottom). Slow shift over 20s suggests
  ambient lighting.
- **Buttons:** crimson with gold trim and tracked all-caps text. On
  hover, the gold trim brightens; no other animation.
- **Priority badges:** high = crimson with gold; med = grey; low =
  grey muted.

### Mock

```
═══════════════════════════════════════════════════════════
  ARASAKA · PULL                              14:23 / 14:35
═══════════════════════════════════════════════════════════

   ⊰  CALL @LUKAS RE: Q4 PROPOSAL                  HIGH
       DUE 14:00 · 12 MIN · #Q4 · #PRICING

   ◇  SEND ONBOARDING DOC                          MED
       SKETCH · 2 DAYS AGO

   ◇  SCHICK ANGEBOT TO LUKAS                       —
       DRAFTED YESTERDAY

   ⊱  REVIEW ARCHITECTURE DOC                      ALERT
       OVERDUE · 2 DAYS                              ←  crimson glow

═══════════════════════════════════════════════════════════
```

---

## How to choose between these and the restrained drafts

If you found the restrained drafts pretty and these noisy: pick one
of the restrained drafts and we ship it cleanly. They're
daily-driver themes.

If you found these noisy and the restrained drafts boring: pick one
of these and we ship it knowing the implementation is heavier
(animations, decorative elements, font loading, possibly bundled
assets).

If you found yourself wanting parts of both — a restrained base
*with* some maximalist accents — that's the most likely hybrid path.
Specifically:

- **Tachikoma Standby** (restrained #7) + **Night City** chrome →
  the silver-grey discipline with HUD ID strips on the active card
  only. "Quiet until you focus, then the cockpit lights up."
- **Bay City Hotel** (restrained #1) + **Arasaka Red** decorative
  elements → amber and brushed brass with deliberate corporate
  emblems and gold shimmer on brand marks.
- **Section 9 Console** (restrained #2) + **Kobayashi Maru**
  telemetry → mono-led HUD, but with the sidebar bottom showing the
  fake-telemetry strip that makes the surface feel alive.

After you see the previews, tell me which direction (full maximalist,
hybrid, or back to restrained) and we'll implement.
