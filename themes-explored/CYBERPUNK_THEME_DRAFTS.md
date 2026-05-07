# Cyberpunk theme drafts

Five (six, see end) coherent variations on cinematic, professional
cyberpunk. Same family, distinct identities. Listed in roughly
ascending intensity / descending restraint, so the first reads as
calmest, the last as most assertive.

The existing `cyberpunk` theme in the codebase is the saturated-
magenta-on-deep-purple version you're rejecting. These are designed
to either replace that slot or coexist beside it as a "v2 cyberpunk"
family. None of them touches `styles.css` or the `THEMES` array yet —
this is design, not implementation.

## Notes on what these all share

- **No pure black.** Every base is offset toward warm or cool, never
  `#000`. The eye reads "atmosphere" instead of "void."
- **Restraint over saturation.** Accent hues are picked at moderate
  saturation (`#f59e0b` not `#ffaa00`, `#8de4ec` not `#00ffff`,
  `#b91c1c` not `#ff0000`). Most pixels are dark and quiet; accents
  earn their visibility.
- **Hierarchy via luminance.** Active surfaces lift through tone, not
  size. Borders stay thin; rims do the work that drop shadows usually
  do in light themes.
- **Motion budget: tiny.** No scanlines, no glitch transitions, no
  ambient pulses. The only allowed animations are the cursor blink in
  monospace contexts and a subtle 200–300ms fade on focus changes.
- **Monospace doing real work.** When mono appears, it carries
  semantic weight — IDs, timestamps, tag values, technical data — not
  decoration. Body copy stays in the display sans.

## Notes on implementation cost (so we can sequence)

Things that are cheap to ship for any draft:
- Color palette via CSS variables (already the existing pattern).
- Font swap via `--font` override on `html[data-theme="..."]`.
- Per-theme shadow overrides.

Things that need new infrastructure:
- **Monospace font.** No `--font-mono` variable exists today. Adding
  one is straightforward but it's a small refactor — every place that
  should use mono (timestamps, todo IDs, tag values) needs to opt in.
- **Cut-corner elements.** The codebase uses `border-radius`
  universally. Drafts that propose corner cuts will scope that to a
  short whitelist (badges, primary CTAs, key panel headers) — not
  everywhere — to keep retrofit cost reasonable.
- **Subtle glow on focus.** Easy via `box-shadow` on `:focus-visible`;
  needs a per-theme tuning pass to land at "halo, not blur."

These are all manageable, just worth flagging up front.

---

## 1. Bay City Hotel

The Raven Hotel after midnight. Heavy curtains, brushed brass
fittings, a single amber lamp pooling light onto a marble desk.
Built for someone who works at unsociable hours on things that
matter. The interface equivalent of expensive whiskey — present,
warm, restrained.

**ID:** `cp-bay-city`
**Reference weight:** Altered Carbon, primary.

### Palette

```css
html[data-theme="cp-bay-city"] {
  --accent:           #f59e0b;   /* amber lamplight */
  --accent-light:     #2a1d08;
  --accent-dark:      #fcd34d;
  --accent-faint:     color-mix(in srgb, var(--accent) 12%, transparent);
  --accent-soft:      color-mix(in srgb, var(--accent) 7%, transparent);

  --sidebar-bg:       #0a1015;   /* deep teal-black */
  --sidebar-hover:    #131c25;
  --sidebar-active:   #131c25;

  --content-bg:       #0a1015;
  --card-bg:          #0f1820;   /* very subtle teal lift */

  --text-primary:     #e9d8a6;   /* warm cream — like lamplight on paper */
  --text-secondary:   #b09472;
  --text-muted:       #6b7c89;

  --border:           #1a242e;
  --border-strong:    #243140;

  --shadow-sm:        0 1px 2px rgba(0,0,0,0.6);
  --shadow:           0 1px 3px rgba(0,0,0,0.7), 0 0 0 1px rgba(245,158,11,0.04);
  --shadow-md:        0 6px 14px rgba(0,0,0,0.7);
  --shadow-lg:        0 20px 40px rgba(0,0,0,0.8);
}
```

`forceAccent: '#f59e0b'`.

### Typography

Display sans, slightly tight (Inter / Söhne / Segoe UI Variable
fall-through). Mono for timestamps, todo IDs, tag values. Mono pairing
suggestion: `JetBrains Mono` or `IBM Plex Mono`. Body 13–14px,
mono 12px.

### Treatments

- **Edges:** rounded subtle (`--radius: 8px`, `--radius-sm: 5px`).
  Cards keep their soft shape — this draft doesn't do corner cuts.
- **Glow:** focused inputs get a 2–3px amber halo
  (`box-shadow: 0 0 0 3px var(--accent-soft)`). Active project's
  card gets a barely-visible amber rim (`1px solid` at 20% opacity).
- **Surface:** cards have a faint top-down gradient — `linear-gradient(
  180deg, var(--card-bg), color-mix(in srgb, var(--card-bg) 95%, black))`.
  Reads as tinted glass over dark wood.
- **Mono usage:** timestamps, ISO dates, IDs, slash-command chips.

### Mock

```
─────────────────────────────────────────────────────
  PULL                              06 / 07 · 14:23
─────────────────────────────────────────────────────

   ┃  Call Lukas re: Q4 proposal              HIGH
      due 14:00 · 12m
                                              ────
   ┃  Send onboarding doc                      MED
      sketch · 2026-05-10
                                              ────
   ┊  Schick Angebot to Lukas                  ───
      drafted yesterday
```

The `┃` is a 2px amber stroke on the active row. Mono renders the
timestamp + date. Most of the surface stays in the deep teal-black —
the amber column is the only thing that earns brightness.

---

## 2. Section 9 Console

The terminal in Major Kusanagi's chair. Cool icy cyan against a
slightly-warm-black base — the warmth in the black is what makes the
cyan land cinematically instead of medically. Built for technical
work where every screen carries data the operator is actually
expected to read.

**ID:** `cp-section-9`
**Reference weight:** Ghost in the Shell (1995 + 2017).

### Palette

```css
html[data-theme="cp-section-9"] {
  --accent:           #8de4ec;   /* icy cyan, NOT #00ffff */
  --accent-light:     #16383d;
  --accent-dark:      #c8f4f8;
  --accent-faint:     color-mix(in srgb, var(--accent) 10%, transparent);
  --accent-soft:      color-mix(in srgb, var(--accent) 6%, transparent);

  --sidebar-bg:       #0a0b0e;   /* warm-black, slight magenta undertone */
  --sidebar-hover:    #14161b;
  --sidebar-active:   #14161b;

  --content-bg:       #0a0b0e;
  --card-bg:          #11141a;

  --text-primary:     #d4e5e9;
  --text-secondary:   #7e96a3;
  --text-muted:       #4a5969;

  --border:           #1e242d;
  --border-strong:    #2c343f;

  --shadow-sm:        0 1px 2px rgba(0,0,0,0.7);
  --shadow:           0 0 0 1px rgba(141,228,236,0.06);
  --shadow-md:        0 4px 14px rgba(0,0,0,0.7);
  --shadow-lg:        0 10px 30px rgba(0,0,0,0.8);
}
```

`forceAccent: '#8de4ec'`.

### Typography

Monospace-LED. Body in a tight technical sans (Inter or system),
**but** all secondary chrome — labels, dates, status badges, button
text, sidebar nav, IDs, tag values — in monospace. The mono is the
identity. Pairing: `IBM Plex Mono` 12px primary, `Inter` 14px for
card titles. Captions in mono uppercase tracking +0.05em.

### Treatments

- **Edges:** corner cut on badges and panel headers via
  `clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)`
  — top-right slice. Cards remain rounded (subtle, 6px); only the
  badge / header strip shows the cut.
- **Glow:** subtle cyan halo on focus, dimmer than draft 1 because
  cyan is so dominant. Selected nav item: 2px cyan vertical stripe
  on the left edge, like a tab indicator on a synth rack.
- **Surface:** flat. No gradients. Hierarchy is the border + the
  cut corner, full stop.
- **Bracket vocabulary:** `[ ]` chips around technical metadata,
  rendered in mono. `┌ ┐ └ ┘` corner glyphs decorating section
  headers in some places (sparingly — not on every card, only on
  major view headers).

### Mock

```
┌─ PULL ──────────────────────[ TZ +02:00 · 14:23:07 ]─┐
│                                                       │
│ ╱ id: t-2026-04-29-3f2 ──────────────────[ HIGH ] ╱  │
│ │ Call Lukas re: Q4 proposal                        │
│ │ due 14:00 · 12m                                    │
│ ╱─────────────────────────────────────────────────── │
│                                                       │
│ ╱ id: t-2026-04-29-9b1 ──────────────────[  MED ] ╱  │
│ │ Send onboarding doc                                │
│ │ sketch · last updated 2d ago                       │
│ ╱─────────────────────────────────────────────────── │
└───────────────────────────────────────────────────────┘
```

The `╱` on the right edge of card headers is the corner cut.
Everything in mono is in mono. Card title proper in the sans.

---

## 3. Wallace Atrium

The Wallace Corp atrium during the orange hour from BR 2049 — dust
in the air, low light, brutalist concrete underfoot, the warmth of a
sun that's wrong. Slow contemplation theme. Fewer stimuli, deeper
warmth, more breathing room. For someone who works on something that
doesn't need to feel like a video game and has time to look at it.

**ID:** `cp-wallace`
**Reference weight:** Blade Runner 2049 (Vegas sequence).

### Palette

```css
html[data-theme="cp-wallace"] {
  --accent:           #d97706;   /* burnt orange, warmer than amber */
  --accent-light:     #341a05;
  --accent-dark:      #fdba74;
  --accent-faint:     color-mix(in srgb, var(--accent) 12%, transparent);
  --accent-soft:      color-mix(in srgb, var(--accent) 7%, transparent);

  --sidebar-bg:       #120c08;   /* warm sepia-near-black */
  --sidebar-hover:    #1d140d;
  --sidebar-active:   #1d140d;

  --content-bg:       #120c08;
  --card-bg:          #1c130c;

  --text-primary:     #f4e0c5;   /* warm cream, paper-under-orange-light */
  --text-secondary:   #b59377;
  --text-muted:       #6f5e4c;

  --border:           #2a1d10;
  --border-strong:    #3d2a17;

  --shadow-sm:        0 1px 2px rgba(0,0,0,0.5);
  --shadow:           0 4px 12px rgba(60,30,10,0.4);
  --shadow-md:        0 8px 24px rgba(60,30,10,0.5);
  --shadow-lg:        0 24px 60px rgba(60,30,10,0.6);
}
```

`forceAccent: '#d97706'`.

### Typography

Display-LED. A serif-flavored sans for headers (something with
slightly slabbed terminals — `Recoleta` mood, but a sans-serif
neighbor like `Söhne Breit` works). Body in regular sans. Mono used
sparingly, only for IDs and timestamps. Larger type sizes overall —
this draft has more breathing room than the others.

### Treatments

- **Edges:** rounded generous (`--radius: 12px`, `--radius-lg: 18px`).
  Soft, atmospheric. No corner cuts.
- **Glow:** soft orange halo on focus (slightly larger blur than
  draft 1 — `box-shadow: 0 0 0 4px var(--accent-soft), 0 0 16px -4px var(--accent-faint)`). Active card has a subtle orange backlight along
  the left edge — a 2px gradient that fades to transparent over 60% of
  the card height. Reads as "lit from the side."
- **Surface:** stronger gradient than draft 1 — top of the card 6%
  lighter, bottom 4% darker than the base. Suggests a backlit panel.
- **Density:** **looser** than the rest. Increase row vertical
  padding ~25%, increase line-height. Fewer items per screen, more
  air between them.

### Mock

```
                                              06 / 07
   PULL                                          14:23



      Call Lukas re: Q4 proposal
      due 14:00  ·  12 minutes
                                                    ●


      Send onboarding doc
      sketch
                                                    ●


      Schick Angebot to Lukas
      drafted yesterday
                                                    ○



```

Big margins, soft separators (or no separators — let space do the
work). `●` is the priority dot in orange (filled = high, outlined =
low). Reads less like a list, more like a poem.

---

## 4. Tachikoma Runtime

The little spider tank's HUD as it crawls a server room. Friendlier
than Section 9 — has a sense of humor — but still serious operational
software. Lime-yellow against cool slate, monospace doing the heavy
lifting, slightly tighter information density. For a developer who
likes the data dense and the chrome clean.

**ID:** `cp-tachikoma`
**Reference weight:** GitS, with a Cyberpunk 2077 glyph hint.

### Palette

```css
html[data-theme="cp-tachikoma"] {
  --accent:           #a3e635;   /* lime, not #00ff00 */
  --accent-light:     #1f3a0a;
  --accent-dark:      #d9f99d;
  --accent-faint:     color-mix(in srgb, var(--accent) 12%, transparent);
  --accent-soft:      color-mix(in srgb, var(--accent) 6%, transparent);

  --sidebar-bg:       #0e1116;   /* cool neutral slate */
  --sidebar-hover:    #181c24;
  --sidebar-active:   #181c24;

  --content-bg:       #11141a;
  --card-bg:          #181c24;

  --text-primary:     #dde3eb;
  --text-secondary:   #8895a8;
  --text-muted:       #4d5868;

  --border:           #232936;
  --border-strong:    #313847;

  --shadow-sm:        0 1px 1px rgba(0,0,0,0.4);
  --shadow:           0 1px 3px rgba(0,0,0,0.5);
  --shadow-md:        0 4px 10px rgba(0,0,0,0.5);
  --shadow-lg:        0 12px 28px rgba(0,0,0,0.6);
}
```

`forceAccent: '#a3e635'`.

### Typography

Monospace-LED for technical chrome (more aggressive than Section 9 —
even card titles can be in mono here, slightly larger). `JetBrains Mono`
14px primary; sans only on view headers. Smaller body sizes (12–13px)
since mono reads denser. Tracking +0.02em on labels.

### Treatments

- **Edges:** corner cuts on badges, primary CTA buttons, and the
  active-nav indicator. `clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 100%, 0 100%)`
  — diagonal slice on the right.
- **Glow:** lime halo on focus only (NOT on hover — hover gets a
  border color shift to `border-strong` instead). The halo pulses
  once on focus-arrival (200ms ease-out) then settles.
- **Surface:** flat with thin borders. No gradients.
- **Active indicator:** thin lime stripe on the left of the active
  card, plus a tiny 4×4 lime square at the top-left.

### Density

Tightest of the five. Smaller card padding, shorter row heights.
Treats vertical space as scarce.

### Mock

```
┌── PULL ──────────────────────────────── [ 14:23 ] ──┐
│                                                      │
│ ▪ [HI] call lukas re: Q4 proposal       due 14:00   │
│        12m · q4 · proposal                          │
│ ───────────────────────────────────────────────────  │
│   [MD] send onboarding doc              sketch      │
│        2026-05-10 · onboarding                      │
│ ───────────────────────────────────────────────────  │
│   [LO] schick angebot to lukas          done        │
│        yesterday · pricing                          │
└──────────────────────────────────────────────────────┘
```

The `▪` is a 4×4 lime square = active row indicator. `[HI]` etc. are
priority chips with the corner cut. All chrome in mono.

---

## 5. Arasaka Black

The executive interface at Arasaka HQ. Quiet, restrained, monolithic.
Restrained crimson against the warmest black of the five — a black
that suggests dimmed gallery lighting, not absence. Display-led
typography, thin sharp lines, no glow at all. The feel of using
software designed by a corporation that does not believe in playful
UX and trusts the operator to read.

**ID:** `cp-arasaka`
**Reference weight:** Cyberpunk 2077 corporate, but stripped of
saturation. Authoritarian feel of certain AC police interfaces.

### Palette

```css
html[data-theme="cp-arasaka"] {
  --accent:           #b91c1c;   /* crimson, dark — not blood-red */
  --accent-light:     #2a0a0a;
  --accent-dark:      #fca5a5;
  --accent-faint:     color-mix(in srgb, var(--accent) 12%, transparent);
  --accent-soft:      color-mix(in srgb, var(--accent) 6%, transparent);

  --sidebar-bg:       #0d0c0a;   /* warm-black, the warmest of the 5 */
  --sidebar-hover:    #1a1815;
  --sidebar-active:   #1a1815;

  --content-bg:       #0d0c0a;
  --card-bg:          #15130f;

  --text-primary:     #e8e4dc;   /* off-white, warm */
  --text-secondary:   #948d80;
  --text-muted:       #5a564d;

  --border:           #1f1c17;
  --border-strong:    #2a261f;

  --shadow-sm:        0 1px 1px rgba(0,0,0,0.7);
  --shadow:           0 1px 2px rgba(0,0,0,0.8);
  --shadow-md:        0 2px 6px rgba(0,0,0,0.85);
  --shadow-lg:        0 8px 24px rgba(0,0,0,0.9);
}
```

`forceAccent: '#b91c1c'`.

### Typography

Display-LED. A serious sans, slightly condensed (`Söhne Breit`,
`Inter Display`, or `IBM Plex Sans Condensed`). All-caps for nav
items, view titles, and labels — but with a comfortable tracking
(+0.06em) so it reads architectural rather than shouty. Monospace
**barely** used — only for raw IDs in developer/inspect surfaces.

### Treatments

- **Edges:** sharp corners. `--radius` reduces to 4px globally; some
  elements (cards, primary buttons) drop to 0px. No corner cuts —
  the whole point is clean razor edges.
- **Glow:** **none.** This theme rejects glow entirely. Active states
  use a single-pixel `--accent` border swap and a 3×3 filled crimson
  square indicator on the left edge of the active row.
- **Surface:** flat. Hierarchy via luminance only (the active card is
  ~3% lighter than its siblings; that's the whole signal).
- **Lines:** thin horizontal rules between sections (`border-top: 1px
  solid var(--border)`). `═` style double-rule below view titles.

### Mock

```
═══════════════════════════════════════════════════════
  PULL                                    14:23 / 14:35
═══════════════════════════════════════════════════════

  ▪  CALL LUKAS RE: Q4 PROPOSAL                  HIGH
     Due 14:00 · 12 min remaining

  ▫  SEND ONBOARDING DOC                          MED
     Sketch state · last updated 2 days ago

  ▫  SCHICK ANGEBOT TO LUKAS                       —
     Drafted yesterday

═══════════════════════════════════════════════════════
```

Filled `▪` for active/high; outlined `▫` for the rest. Nav and
labels in tracked all-caps. No glow anywhere — the active row reads
through luminance + the filled square indicator.

---

## 6. Yokohama Rain *(unsolicited bonus)*

You said you'd welcome a sixth I believed in. Here it is. The other
five are all clearly cinematic-cyberpunk; this one pushes one axis
further — *restraint past the point of being fun*. Most pixels are
silvery-grey on near-black. The accent appears almost nowhere — only
on the single keyboard-focused element and on overdue / urgent
states. For someone who finds even Section 9 too vivid; for the
work day where the screen is the room.

**ID:** `cp-yokohama`
**Reference weight:** AC's wettest scenes, BR original (1982)
night-in-the-rain.

### Palette

```css
html[data-theme="cp-yokohama"] {
  --accent:           #ea580c;   /* warm orange, used SPARINGLY */
  --accent-light:     #2a1308;
  --accent-dark:      #fed7aa;
  --accent-faint:     color-mix(in srgb, var(--accent) 8%, transparent);
  --accent-soft:      color-mix(in srgb, var(--accent) 4%, transparent);

  --sidebar-bg:       #0e1115;   /* cool blue-grey, not too cool */
  --sidebar-hover:    #161a20;
  --sidebar-active:   #161a20;

  --content-bg:       #0e1115;
  --card-bg:          #14181d;

  --text-primary:     #c8ced6;
  --text-secondary:   #7e8a96;
  --text-muted:       #4a525c;

  --border:           #1d232c;
  --border-strong:    #2a3140;

  --shadow-sm:        0 1px 2px rgba(0,0,0,0.5);
  --shadow:           0 1px 3px rgba(0,0,0,0.6);
  --shadow-md:        0 4px 12px rgba(0,0,0,0.6);
  --shadow-lg:        0 16px 40px rgba(0,0,0,0.7);
}
```

`forceAccent: '#ea580c'`.

### Typography

Mono-LEANING. Body in a sans with slightly narrow proportions
(`Inter Tight`, `IBM Plex Sans`). Mono for chrome but at the same
size as the body — feels like a single voice rather than two.

### Treatments

- **Edges:** rounded subtle (`--radius: 8px`). Borders thin and
  silver-grey.
- **Glow:** **only** on the single focused element. Not on hover.
  Not on the active card. Not on the active nav. Just one halo at a
  time, on whatever the keyboard cursor is on.
- **Accent budget:** the orange appears on
  - the focus ring,
  - overdue indicators,
  - a single "active" indicator on the most-recently-touched item
  
  …and **nowhere else**. Primary CTAs are light grey on slightly-
  darker, not orange. Selected nav item: silver-grey lift + a
  vertical line, no orange. The orange is rare and earned.
- **Surface:** very subtle gradient on cards, cool grey lifting at
  the top.

### Mock

```
   pull                                  14:23

   call lukas re: Q4 proposal           high
   due 14:00 · 12m

   send onboarding doc                  med
   sketch · 2 days ago

▶  schick angebot to lukas               ←   (only this row glows)
   yesterday
```

Most of the screen is silvery-grey on near-black. The `▶` and the
faint orange ring on the bottom row are the *only* color on the
page. The eye locks onto them instantly because they have no
competition.

---

## How to choose between them

If you want to pick by **mood, not palette**:

- **Bay City Hotel** — quietly luxurious, unhurried, a classic
  "good cyberpunk theme" you wouldn't get tired of.
- **Section 9 Console** — operator's tool, technical respect, info-
  dense without being cold. My pick if you want the most distinctive
  cyberpunk identity.
- **Wallace Atrium** — slow, contemplative, atmospheric. Best for
  reading-heavy days; possibly *too* relaxed for inbox-grinding work.
- **Tachikoma Runtime** — playful pro, denser data, glyphs and cuts.
  Most "modern fintech meets AC" of the five.
- **Arasaka Black** — austere, monolithic, no glow at all. The most
  *severe* theme; pairs well with focus mode.
- **Yokohama Rain** — the one that disappears. Closest to a
  reading-paper background, with cyberpunk identity in the details
  rather than the surface.

If you want the **safest "this looks great immediately" pick**:
**Bay City Hotel**.

If you want the **most distinctly cyberpunk and most differentiated
from the existing themes in the app**: **Section 9 Console**.

If you want the **most opinionated / most likely to surprise people
who try it**: **Yokohama Rain**.

## Pick one (or one + tweaks) and I'll implement.

When implementing, I'll need decisions on:

1. **Replace** the existing `cyberpunk` theme entry, or add as a new
   `cp-*` entry? (My default: keep both, mark the old one
   `Cyberpunk (legacy)` so anyone using it stays put.)
2. **Mono font infra.** Add `--font-mono` global, then opt-in the
   surfaces that should use it (timestamps, IDs, tag chips, slash
   chips, etc.). Cheap once but touches several files.
3. **Corner-cut scope.** For Section 9 / Tachikoma — should I cut
   corners on (a) badges only, (b) badges + primary CTAs, or (c)
   badges + CTAs + view-header strips?

Tell me your pick and the answers to those, and we ship.
