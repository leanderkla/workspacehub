# Cyberpunk Theme Drafts

Five distinct drafts exploring different slices of the cinematic-cyberpunk aesthetic, plus one bonus pick I think is worth considering. Each draft maps onto the existing theme variable system in [styles.css](styles.css) — `--accent` family, `--sidebar-*`, `--content-bg`, `--card-bg`, `--text-*`, `--border-*`, `--shadow-*`. None of these are implemented yet; this is exploration only.

The existing `cyberpunk` theme (neon-pink on near-black purple) is louder than what's described here and is treated as a separate, older theme — none of these replace it.

---

## Shared design DNA

These five themes belong to the same family and share these properties unless a draft explicitly overrides them:

- **No pure black anywhere.** Every "black" in this family is tinted — warm, cool, teal, graphite. The shift is small (~3-5 points off neutral) but legible.
- **Restrained accent.** The accent appears on focused/active elements, key data points, and primary actions. Not on every border, not on body text, not as a section background fill.
- **Tinted-glass surfaces.** `--card-bg` is a few luminance steps above `--content-bg`, never a contrasting fill. Cards read as backlit panels, not white boxes on dark.
- **Monospace doing real work.** Timestamps, IDs, counts, status flags render in monospace. Display sans handles titles and prose. The split is semantic, not decorative.
- **Edges over corners.** Border radius drops to `--radius: 6px` / `--radius-sm: 3px` / `--radius-lg: 8px` (vs. the default 10/6/14). Three drafts go further with corner cuts via `clip-path` on specific elements (panels, badges) — see treatments per draft.
- **Glow earns its place.** A focused element gets a 1px accent border + a soft outer glow. Hover states stay quiet (no glow). No glow on idle text, no glow on dividers.
- **Motion floor.** No scanlines, no glitch, no sweeping animations. A cursor blink in monospace inputs and a slow accent pulse on the active sidebar item are the only allowed motion beyond the default `--transition`.

> **Variable convention reminder:** in dark themes in this codebase, `--accent-light` is used as a *dark accent tint* (for hover/active backgrounds in light-on-dark) and `--accent-dark` is the *brightened* version of the accent (for highlight on dark surfaces). The drafts below follow that inversion — see [styles.css#L185-L203](styles.css#L185-L203) for the precedent.

---

## Draft 1 — Bay City

### Character
The Altered Carbon flagship. A late-night view of a rain-glassed Bay City: deep cool teal-black surfaces, a single warm amber accent that reads like sodium streetlight bleeding through tinted windows. This is the theme for someone working a long case at 2 a.m. — restrained, expensive-looking, cinematic. The amber is the only warm thing in the frame; everything else is cool.

### Palette
```css
html[data-theme="bay-city"] {
  --accent: #d97f2b;                    /* sodium amber */
  --accent-light: rgba(217, 127, 43, 0.16);
  --accent-dark: #f4a560;               /* brightened, used on dark surfaces */
  --accent-faint: rgba(217, 127, 43, 0.09);
  --accent-soft: rgba(217, 127, 43, 0.05);

  --sidebar-bg: #0a1014;                /* cool teal-black */
  --sidebar-hover: #121a21;
  --sidebar-active: #182530;
  --content-bg: #0c1217;
  --card-bg: #131c23;                   /* one step above content */

  --text-primary: #e8dcc6;              /* warm cream — the only warm text */
  --text-secondary: #8da0aa;            /* cool grey-teal */
  --text-muted: #4f5f6a;
  --border: #1d2a33;
  --border-strong: #2a3d48;

  --shadow-sm: 0 1px 2px rgba(0,0,0,0.5);
  --shadow:    0 1px 3px rgba(0,0,0,0.65), 0 0 0 1px rgba(217,127,43,0.04);
  --shadow-md: 0 6px 18px rgba(0,0,0,0.6);
  --shadow-lg: 0 14px 36px rgba(0,0,0,0.75);

  --radius: 6px;
  --radius-sm: 3px;
  --radius-lg: 8px;
  --font: 'Inter', 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif;
}
```

### Typography
- **Display:** Inter, weight 500 for titles, 400 for prose, tracking -0.005em.
- **Mono:** JetBrains Mono, weight 400, used for timestamps, IDs, numeric counts, due dates, file paths.
- **Sizes unchanged from base.** Hierarchy comes from luminance and weight, not size escalation.

### Treatments
- Body gets a very subtle warm radial bleed at bottom-left to suggest off-screen amber light:
  ```css
  body { background:
    radial-gradient(at 0% 100%, rgba(217,127,43,0.06) 0%, transparent 45%),
    var(--content-bg); }
  ```
- Cards use a 1px-tall top inner highlight to read as backlit glass:
  ```css
  .card-bg, .stat-card { box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), var(--shadow); }
  ```
- Focused inputs and the active sidebar item get a 1px `--accent` border + `0 0 12px rgba(217,127,43,0.18)` outer glow. Hover state: border only, no glow.
- Soft corners (no clip-path cuts in this draft). The cinematic feel is in lighting, not geometry.

### Mock — Pull view header + one row
```
                                                                              
   PULL                                                  47 ITEMS · 03:42:11   
   ──────────────────────────────────────────────────────────────────────     
   FILTER ▾    SORT priority ▾    ⌕ search                                    
                                                                              
   ▢  Reroute auth middleware before staging cut             P1     ER-441   
      due 05·05·26   ·   4 deps   ·   l.klass                                
                                                                              
   ▢  Migrate session store off legacy cache                 P2     ER-438   
      due 09·05·26   ·   2 deps   ·   l.klass                                
                                                                              
```
Title in warm cream, IDs/dates in cool monospace, the `P1` and `ER-441` chips on the active row tinted in amber. Everything else is cool grey on cool teal-black.

---

## Draft 2 — Tachikoma

### Character
A Ghost in the Shell HUD: cool, technical, mono-led, slightly cramped in a way that feels professional rather than busy. The accent is a desaturated industrial cyan — not the bright AI5 cyan, more like the color of a CRT before it fully warms up. This is the theme for someone who treats the app like an instrument panel. Highest information density of the five.

### Palette
```css
html[data-theme="tachikoma"] {
  --accent: #5fb6c2;                    /* desaturated industrial cyan */
  --accent-light: rgba(95, 182, 194, 0.16);
  --accent-dark: #88d8e2;               /* brightened for dark surfaces */
  --accent-faint: rgba(95, 182, 194, 0.08);
  --accent-soft: rgba(95, 182, 194, 0.04);

  --sidebar-bg: #0b0e12;                /* cool neutral black */
  --sidebar-hover: #131820;
  --sidebar-active: #1a2230;
  --content-bg: #0c1015;
  --card-bg: #11161e;

  --text-primary: #d8e2ea;
  --text-secondary: #7d8d9f;
  --text-muted: #4a5564;
  --border: #1a2230;
  --border-strong: #2a3848;

  --shadow-sm: 0 1px 2px rgba(0,0,0,0.5);
  --shadow:    0 1px 3px rgba(0,0,0,0.6);
  --shadow-md: 0 4px 14px rgba(0,0,0,0.55);
  --shadow-lg: 0 10px 28px rgba(0,0,0,0.7);

  --radius: 3px;                        /* near-square */
  --radius-sm: 2px;
  --radius-lg: 4px;
  --font: 'IBM Plex Sans Condensed', 'Inter', 'Segoe UI', system-ui, sans-serif;
}
```

### Typography
- **Display:** IBM Plex Sans Condensed, weight 500 for titles. Condensed is the signal — this theme reads as engineered.
- **Mono:** IBM Plex Mono, weight 400, used heavily — every metadata line, every count, every status label, every column header in tables.
- **Tabular numerals enforced:** `font-variant-numeric: tabular-nums` on `.timestamp`, `.count`, `.id`, all numeric cells.
- **Slightly tighter line-height (1.35 vs. default 1.5) for high-density rows.**

### Treatments
- Panels and badges get angular corner cuts via clip-path:
  ```css
  .stat-card, .badge, .pull-row { clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px); }
  ```
  (8px on top-left and bottom-right only — the "tech corner" cut, not symmetric.)
- Section dividers are 1px lines that fade out with a `linear-gradient(to right, var(--border-strong), transparent 80%)`.
- Focused inputs get a 1px accent border + a single small `[+]`-like corner bracket overlay rendered via pseudo-elements (no glow — too HUD).
- Active sidebar item: 2px-wide `--accent` left bar instead of a full background fill.

### Mock — Pull view header + one row
```
  ╱─ PULL ────────────────────────────── 47 ITEMS · ▣ ▣ ▣ ─╲
  │  FLT ▾   SRT priority ▾   [⌕                    ]      │
  ╲─────────────────────────────────────────────────────── ╱

   [P1]   Reroute auth middleware before staging cut
          ER-441 │ DUE 2026-05-05 │ DEPS 04 │ ASSIGN l.klass

   [P2]   Migrate session store off legacy cache
          ER-438 │ DUE 2026-05-09 │ DEPS 02 │ ASSIGN l.klass
```
Pipes between fields are real — the metadata line is monospace. The `[P1]` chip is a square clipped badge in cyan tint. Title in display sans, everything tabular below it in mono. Reads like a status panel.

---

## Draft 3 — Vegas Apocalypse

### Character
The orange-haze Vegas scenes from Blade Runner 2049 — a single dominant warm hue carrying the whole frame. The most atmospheric draft, the most "monochrome." Surfaces are warm-black with a subtle orange wash; the accent is a saturated orange that lives a half-step short of the body color so it earns its visibility. This is the theme for someone who wants the app to feel like a place, not a dashboard.

### Palette
```css
html[data-theme="vegas-apocalypse"] {
  --accent: #f97316;                    /* saturated apocalypse orange */
  --accent-light: rgba(249, 115, 22, 0.18);
  --accent-dark: #fb923c;
  --accent-faint: rgba(249, 115, 22, 0.10);
  --accent-soft: rgba(249, 115, 22, 0.05);

  --sidebar-bg: #140a05;                /* warm-black */
  --sidebar-hover: #1d1108;
  --sidebar-active: #28180c;
  --content-bg: #170d05;
  --card-bg: #1f1308;

  --text-primary: #f0dcc4;              /* warm bone */
  --text-secondary: #a98770;
  --text-muted: #6b5443;
  --border: #2a1c10;
  --border-strong: #3d2918;

  --shadow-sm: 0 1px 2px rgba(0,0,0,0.6);
  --shadow:    0 1px 3px rgba(0,0,0,0.7);
  --shadow-md: 0 8px 22px rgba(0,0,0,0.65);
  --shadow-lg: 0 18px 44px rgba(0,0,0,0.75);

  --radius: 6px;
  --radius-sm: 4px;
  --radius-lg: 10px;                    /* slightly softer than the family */
  --font: 'Inter', 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif;
}
```

### Typography
- **Display:** Inter, weight 500. Letter-spacing slightly looser (0.005em) — this theme breathes.
- **Mono:** JetBrains Mono, used sparingly. Fewer columns rendered as mono than in Bay City; this is the most display-led draft.
- **Headings can run a touch larger (+1px on h1/h2)** — the only draft where size carries weight.

### Treatments
- Body gets a strong warm haze gradient — this is the signature of the draft:
  ```css
  body { background:
    radial-gradient(at 50% 0%, rgba(249,115,22,0.10) 0%, transparent 50%),
    radial-gradient(at 50% 100%, rgba(124,45,18,0.18) 0%, transparent 60%),
    var(--content-bg); }
  ```
- Cards: a very subtle vertical gradient (`--card-bg` at top → 5% darker at bottom) so they read as physical objects in atmosphere.
- Focused element: amber border + warm outer glow `0 0 16px rgba(249,115,22,0.22)`.
- Soft corners across the board. **No clip-path cuts in this draft** — angular geometry would fight the atmospheric softness.
- Scrollbars tinted warm to participate in the haze.

### Mock — Pull view header + one row
```


    PULL                                          47 items · 03:42


    Filter ▾    Sort: priority ▾    ⌕ search


    ●  Reroute auth middleware before staging cut         P1
       ER-441   due 05·05   ·   4 deps   ·   l.klass


    ●  Migrate session store off legacy cache             P2
       ER-438   due 09·05   ·   2 deps   ·   l.klass


```
Lots of breathing room. The `●` priority dot in saturated orange is the only saturated thing on screen. Body cream-warm, metadata muted ochre, background a faint orange dust glow at the edges. Reads like a wide cinematic shot.

---

## Draft 4 — Chiba

### Character
The Neuromancer opening line, made interface. Cool neutral-black with a muted rose-magenta primary and a quiet cyan undertone in borders and dividers — the warm/cool tension that defines BR 2049's color grading, but with the saturation pulled back hard. This is the theme that's pretty without being precious. Most likely to be picked by someone who wants cyberpunk but doesn't want to advertise it.

### Palette
```css
html[data-theme="chiba"] {
  --accent: #c25681;                    /* muted rose-magenta */
  --accent-light: rgba(194, 86, 129, 0.16);
  --accent-dark: #d97aa0;
  --accent-faint: rgba(194, 86, 129, 0.09);
  --accent-soft: rgba(194, 86, 129, 0.05);

  --sidebar-bg: #0c0c14;                /* neutral cool black */
  --sidebar-hover: #15151f;
  --sidebar-active: #1f1d2c;
  --content-bg: #0e0d16;
  --card-bg: #16151f;

  --text-primary: #e6dde8;
  --text-secondary: #8d8a9d;            /* slight purple-grey */
  --text-muted: #565468;
  --border: #1d1c2a;                    /* cool — pulls toward cyan in context */
  --border-strong: #2c2a3e;

  --shadow-sm: 0 1px 2px rgba(0,0,0,0.5);
  --shadow:    0 1px 3px rgba(0,0,0,0.6);
  --shadow-md: 0 6px 18px rgba(0,0,0,0.55);
  --shadow-lg: 0 14px 32px rgba(0,0,0,0.7);

  --radius: 5px;
  --radius-sm: 3px;
  --radius-lg: 7px;
  --font: 'Rajdhani', 'Inter', 'Segoe UI', system-ui, sans-serif;
}
```

### Typography
- **Display:** Rajdhani, weight 500 for titles — slightly angular, free, gives just enough cyberpunk geometry without going Eurostile-novelty. Falls back gracefully to Inter.
- **Mono:** JetBrains Mono, weight 400, used for IDs and timestamps only — restrained. This draft is display-led.
- **Title tracking:** -0.01em on h1/h2 to tighten Rajdhani's natural openness.

### Treatments
- Cool/warm tension is the whole point: `--border` reads slightly cyan against the `--card-bg`, and the `--accent` rose-magenta pops warm against it. Don't add explicit cyan; let the relationship do the work.
- Subtle vertical gradient on the sidebar: `--sidebar-bg` at top → 3% darker at bottom, so it reads as recessed.
- Focused element gets a thin 1px rose border + faint warm glow `0 0 10px rgba(194,86,129,0.18)`.
- One small concession to angular: priority chips and status badges use a 4px top-right corner cut via clip-path. Cards do not.

### Mock — Pull view header + one row
```
   ┌─ Pull ─────────────────────────────── 47 items ─┐
   │  Filter ▾   Sort: priority ▾   ⌕ search         │
   └─────────────────────────────────────────────────┘

      ▢  Reroute auth middleware before staging cut
         ER-441 · due 05.05 · 4 deps                      [P1╱]

      ▢  Migrate session store off legacy cache
         ER-438 · due 09.05 · 2 deps                      [P2╱]
```
Title in Rajdhani, IDs in mono, the `[P1╱]` chip with its cut top-right corner in muted rose. Borders read faintly cool-cyan against the card. The whole thing is quiet — no single element shouts.

---

## Draft 5 — Daemon

### Character
The terminal theme. Warm graphite-black surfaces with a low-chroma phosphor lime accent — old-monitor color memory, not Matrix lime. Mono-led typography across most of the UI; display sans only for top-level page titles. This is the theme for someone who lives in keyboard shortcuts and treats the cursor as the most important pixel. Highest density of the five.

### Palette
```css
html[data-theme="daemon"] {
  --accent: #9bcc4a;                    /* low-chroma phosphor lime */
  --accent-light: rgba(155, 204, 74, 0.14);
  --accent-dark: #b8e066;
  --accent-faint: rgba(155, 204, 74, 0.08);
  --accent-soft: rgba(155, 204, 74, 0.04);

  --sidebar-bg: #0c0d09;                /* warm graphite-black */
  --sidebar-hover: #14160f;
  --sidebar-active: #1c1e15;
  --content-bg: #0a0b08;
  --card-bg: #11130d;

  --text-primary: #d4d8c8;              /* warm bone-grey */
  --text-secondary: #7a8068;
  --text-muted: #4a4f3f;
  --border: #1a1c14;
  --border-strong: #2a2d22;

  --shadow-sm: 0 1px 2px rgba(0,0,0,0.55);
  --shadow:    0 1px 2px rgba(0,0,0,0.65);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.6);
  --shadow-lg: 0 10px 24px rgba(0,0,0,0.7);

  --radius: 2px;                        /* near-zero — most angular of the family */
  --radius-sm: 1px;
  --radius-lg: 3px;
  --font: 'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace;
}
```

### Typography
- **Primary face is monospace.** `--font` itself is JetBrains Mono. Body text, labels, buttons — all mono. This is the radical typographic choice of the family.
- **Display sans only on h1 page titles:** `'Inter', system-ui, sans-serif`, weight 500. Everything else, mono.
- **Slightly larger base size** (15px → 14px feels too dense for mono body); spacing tightened to compensate.
- **Tabular nums and slashed zero enabled globally:** `font-feature-settings: 'tnum', 'zero'`.

### Treatments
- Angular cuts on more elements than any other draft — cards, panels, badges, even the sidebar item's hover state get a 6px diagonal cut on top-left + bottom-right via clip-path.
- Slow blinking caret on focused inputs (the only motion in the family beyond the shared baseline):
  ```css
  input:focus { caret-color: var(--accent); animation: caret-pulse 1s steps(2) infinite; }
  ```
- Active sidebar item: a `▶ ` glyph in `--accent` rendered as a `::before` pseudo-element, no background fill.
- No body gradient. The flatness is the point — this is a working terminal, not a mood piece.
- Focused element: 1px lime border, faint glow `0 0 8px rgba(155,204,74,0.2)`.

### Mock — Pull view header + one row
```
  ┌╱ PULL ╲──────────────────────────────────── 47 / 47 ─┐
  │ flt:▾  srt:priority▾  q:[                       ]    │
  └──────────────────────────────────────────────────────┘

  [ ]  P1  ER-441   reroute auth middleware before stagi
          due:2026-05-05  deps:04  asg:l.klass     mod:↑3

  [ ]  P2  ER-438   migrate session store off legacy cac
          due:2026-05-09  deps:02  asg:l.klass     mod:──

  [✓]  P3  ER-432   patch token rotation grace window
          due:2026-04-28  deps:00  asg:l.klass     mod:──
```
Everything is fixed-width. Columns line up vertically. The `P1` ID is colored lime; the title truncates at the column edge with no ellipsis (the truncation is the signal). `mod:↑3` shows recent edits. Reads like a terminal, behaves like one.

---

## Bonus — Draft 6: Protocol

> The user invited a sixth unexpected pick if I believed in it. I do.

### Character
The most extreme interpretation of "deep but restrained." Almost no visible accent color — the palette is pure neutral graphite from black to bone, and the amber accent is reserved for *only* the most semantically loaded elements: the focused input, the active sidebar item, unread/overdue counters, and primary action buttons. Everywhere else, hierarchy is expressed in luminance alone. This is the theme that whispers competence instead of advertising it. The kind of UI a fictional intelligence agency would actually use, not the kind a film would dress one in.

I think this is worth a draft because the brief explicitly named restraint as the goal, and the safe move is to dial down the accent saturation but still spread it everywhere. Protocol asks: what if we just don't use the accent for decoration at all? It's the highest-discipline reading of the brief.

### Palette
```css
html[data-theme="protocol"] {
  --accent: #b88142;                    /* subdued amber, used very sparingly */
  --accent-light: rgba(184, 129, 66, 0.14);
  --accent-dark: #d49a5a;
  --accent-faint: rgba(184, 129, 66, 0.07);
  --accent-soft: rgba(184, 129, 66, 0.03);

  --sidebar-bg: #0a0a0c;                /* near-black, very slightly cool */
  --sidebar-hover: #131316;
  --sidebar-active: #1a1a1e;
  --content-bg: #0c0c0e;
  --card-bg: #131316;

  --text-primary: #c8c8cc;
  --text-secondary: #6e6e76;
  --text-muted: #404048;
  --border: #1d1d22;
  --border-strong: #2a2a30;

  --shadow-sm: 0 1px 2px rgba(0,0,0,0.5);
  --shadow:    0 1px 3px rgba(0,0,0,0.6);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.55);
  --shadow-lg: 0 10px 26px rgba(0,0,0,0.7);

  --radius: 4px;
  --radius-sm: 2px;
  --radius-lg: 6px;
  --font: 'Inter Tight', 'Inter', 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif;
}
```

### Typography
- **Display:** Inter Tight, weight 500. The tighter cut adds restraint without going condensed.
- **Mono:** JetBrains Mono, used for IDs, dates, counts. Same as Bay City — restrained, semantic.
- **No size escalation. No tracking flourish.** Most disciplined typographic treatment of the six.

### Treatments
- **Accent appears in fewer than ~6 places per screen.** This is enforced by convention, not code, but it's the theme's defining rule. Specifically: focused input border, active sidebar item indicator, unread counter, primary CTA button, overdue badge, and a single 1px top-of-page rule to demarcate the app shell. That's it.
- Hover states never introduce the accent. Hover is a `--card-bg` luminance bump and nothing else.
- No body gradient. No card gradient. No glow on focus — focus is a flat 1px accent border, period. Glow is too theatrical for this theme.
- Soft corners. **No clip-path cuts.** The geometry stays neutral so the discipline is the only signature.

### Mock — Pull view header + one row
```
   ────────────────────────────────────────────────────────────

   Pull                                              47 items

   Filter ▾    Sort priority ▾    ⌕ search

      Reroute auth middleware before staging cut
      ER-441    due 05.05.26    4 deps    l.klass        P1

      Migrate session store off legacy cache
      ER-438    due 09.05.26    2 deps    l.klass        P2

      Patch token rotation grace window
      ER-432    due 28.04.26    0 deps    l.klass    OVERDUE
```
The only colored thing on screen is `OVERDUE` and a single underline beneath the focused row (not shown). `P1`/`P2` are muted grey, not amber — they're not loaded enough to earn the accent. Everything else is luminance-only hierarchy on near-black. This is what "restrained" looks like at the limit.

---

## My take, if asked

If I had to pick blind: **Bay City** is the safest bet — it's the most directly cinematic, the easiest to read at 8 hours/day, and it lands the Altered Carbon reference squarely. **Tachikoma** is the most distinctive and the most fun to build out (the HUD vocabulary scales naturally to other components). **Protocol** is the dark-horse pick — unflashy in screenshots, but the kind of theme that grows on you and gets out of your way.

**Vegas Apocalypse** I'd flag as the riskiest: the strong warm haze and monochrome warmth are gorgeous in a screenshot but might fatigue faster than Bay City over a full workday — that orange wash never quite leaves your peripheral vision. Worth prototyping before committing.

**Chiba** and **Daemon** are the strong outliers in their respective directions: Chiba is the most "subtle cyberpunk for non-cyberpunks," Daemon is the most uncompromising. Pick Chiba if you want one of these to read as a normal good dark theme to outsiders. Pick Daemon if you want the theme to make a statement about how you work.

Happy to push any of these further, swap accent hues, or merge characteristics from two drafts (e.g., Bay City's amber on Tachikoma's typographic system is a real option) once you've picked a direction.
