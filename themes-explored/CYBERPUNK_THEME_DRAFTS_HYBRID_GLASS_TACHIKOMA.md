# Hybrid drafts — Glass × Tachikoma Standby

Three versions combining the existing **Glass** theme (translucent
glass panels over a radial-gradient backdrop) with **Tachikoma
Standby** (mono-led, cool slate, lime accent reserved for what's
focused).

The two themes contradict each other in interesting ways:

- Glass is **atmospheric** (the backdrop is doing emotional work).
  Tachikoma is **operational** (every pixel earns its place).
- Glass uses **pink** as accent. Tachikoma uses **lime**.
- Glass is sans-led with regular typography. Tachikoma is
  monospace-led with technical chrome.
- Glass leans **show**. Tachikoma leans **work**.

The three drafts below pick three different mixing ratios.

| # | Name | Backdrop | Accent strength | Typography | Glass intensity |
|---|------|----------|-----------------|------------|-----------------|
| 1 | Tachikoma Reflection | Cool lime+teal+cyan | Disciplined (focus only) | 100% mono | Heavy blur |
| 2 | Major's Shell        | Glass's hot pink+purple+cyan | Disciplined (focus only) | 100% mono | Heavy blur |
| 3 | Section 9 Mist       | Subtle, near-monochrome cool | Slightly more visible | Mixed (sans titles + mono labels) | Light blur |

Previews:
[1](previews/hybrid-tachikoma-reflection.html) ·
[2](previews/hybrid-majors-shell.html) ·
[3](previews/hybrid-section-9-mist.html)

---

## 1. Tachikoma Reflection

**ID:** `cp-hybrid-reflection`
**Concept:** A Tachikoma sees its own reflection in a calm pool of
coolant. Glass treatment but in Tachikoma's hue family. Cool teal +
lime + cyan radial gradients in the backdrop. Glass panels float
above them. Mono everywhere. Lime accent reserved for focus.

### Palette

```css
html[data-theme="cp-hybrid-reflection"] {
  --accent:           #a3e635;   /* Tachikoma lime */
  --accent-light:     rgba(163, 230, 53, 0.25);
  --accent-dark:      #d9f99d;
  --accent-faint:     rgba(163, 230, 53, 0.16);
  --accent-soft:      rgba(163, 230, 53, 0.07);

  --sidebar-bg:       rgba(13, 20, 26, 0.55);
  --sidebar-hover:    rgba(255, 255, 255, 0.05);
  --sidebar-active:   rgba(163, 230, 53, 0.10);

  --content-bg:       transparent;
  --card-bg:          rgba(255, 255, 255, 0.04);

  --text-primary:     #c8d2dd;
  --text-secondary:   rgba(200, 210, 221, 0.70);
  --text-muted:       rgba(200, 210, 221, 0.45);

  --border:           rgba(255, 255, 255, 0.08);
  --border-strong:    rgba(163, 230, 53, 0.25);

  --font:             'JetBrains Mono', 'IBM Plex Mono', Consolas, monospace;
}
html[data-theme="cp-hybrid-reflection"] body {
  background:
    radial-gradient(at 18% 12%, rgba(34, 197, 94, 0.45) 0%, transparent 50%),
    radial-gradient(at 82%  6%, rgba(20, 184, 166, 0.5) 0%, transparent 45%),
    radial-gradient(at 65% 95%, rgba(14, 165, 233, 0.40) 0%, transparent 55%),
    #060c10;
  background-attachment: fixed;
}
```

### Treatments

- Cards: `backdrop-filter: blur(24px)` over the cool gradient.
- Active card: lime left-stripe + faint lime halo through the glass.
- Mono everywhere — body, titles, labels, sidebar.
- Tag chips and mention chips: silver-grey by default, lime on hover
  or `:focus-within` (Standby discipline).
- Sidebar items have a thin lime stripe on the active item.

### Mood

The cool-headed pick. Atmospheric like Glass, disciplined like
Tachikoma, but the temperature is calm. Easiest to live with for
long periods of the three.

---

## 2. Major's Shell

**ID:** `cp-hybrid-majors-shell`
**Concept:** Major Kusanagi's cyborg shell viewed through synthwave
neon. Glass's *original* hot pink+purple+cyan backdrop — unchanged —
but every UI surface above it adopts Tachikoma's discipline. Lime
accent on focus stands in deliberate contrast to the pink ambient
behind it. Cinematic.

### Palette

```css
html[data-theme="cp-hybrid-majors-shell"] {
  --accent:           #a3e635;   /* Tachikoma lime — over Glass's hot backdrop */
  --accent-light:     rgba(163, 230, 53, 0.25);
  --accent-dark:      #d9f99d;
  --accent-faint:     rgba(163, 230, 53, 0.16);
  --accent-soft:      rgba(163, 230, 53, 0.07);

  --sidebar-bg:       rgba(15, 20, 40, 0.55);
  --sidebar-hover:    rgba(255, 255, 255, 0.06);
  --sidebar-active:   rgba(163, 230, 53, 0.12);

  --content-bg:       transparent;
  --card-bg:          rgba(255, 255, 255, 0.05);

  --text-primary:     #f1f5ff;            /* Glass's near-white */
  --text-secondary:   rgba(241, 245, 255, 0.70);
  --text-muted:       rgba(241, 245, 255, 0.45);

  --border:           rgba(255, 255, 255, 0.10);
  --border-strong:    rgba(163, 230, 53, 0.30);

  --font:             'JetBrains Mono', 'IBM Plex Mono', Consolas, monospace;
}
html[data-theme="cp-hybrid-majors-shell"] body {
  /* Glass's exact backdrop, untouched */
  background:
    radial-gradient(at 15% 10%, rgba(76, 29, 149, 0.75) 0%, transparent 50%),
    radial-gradient(at 85%  5%, rgba(219, 39, 119, 0.70) 0%, transparent 45%),
    radial-gradient(at 60% 100%, rgba(14, 165, 233, 0.50) 0%, transparent 55%),
    #0b0f1e;
  background-attachment: fixed;
}
```

### Treatments

- Same heavy blur on cards as Glass (`backdrop-filter: blur(24px)`).
- Active card: lime stripe + lime halo. The contrast against the
  pink+purple ambient is the whole point — the lime reads as "the
  active element" against a backdrop of "everything else."
- Mono throughout (Tachikoma's identity).
- Pink does NOT appear as accent on UI surfaces — it lives in the
  backdrop only. UI elements use lime.
- Sidebar active item: lime stripe + slight lime tint background.

### Mood

The most cinematic of the three. Pink synthwave at rest, lime focus
when you look at it. Most "look at this thing I made" — but doesn't
break Tachikoma's discipline.

---

## 3. Section 9 Mist

**ID:** `cp-hybrid-section-9-mist`
**Concept:** The team's command room seen through a faint cool fog.
Glass treatment is **dialed down** — light blur, near-monochrome
backdrop with only a hint of color. Lime is **slightly more present**
than in Tachikoma Standby (about 60% of full Tachikoma intensity);
it shows on hover, not only on focus. Mixed typography (sans for
titles, mono for labels) — quieter than full mono.

### Palette

```css
html[data-theme="cp-hybrid-section-9-mist"] {
  --accent:           #a3e635;
  --accent-light:     rgba(163, 230, 53, 0.22);
  --accent-dark:      #d9f99d;
  --accent-faint:     rgba(163, 230, 53, 0.14);
  --accent-soft:      rgba(163, 230, 53, 0.06);

  --sidebar-bg:       rgba(13, 18, 24, 0.85);
  --sidebar-hover:    rgba(255, 255, 255, 0.04);
  --sidebar-active:   rgba(163, 230, 53, 0.10);

  --content-bg:       transparent;
  --card-bg:          rgba(255, 255, 255, 0.03);

  --text-primary:     #c8d2dd;
  --text-secondary:   rgba(200, 210, 221, 0.72);
  --text-muted:       rgba(200, 210, 221, 0.45);

  --border:           rgba(255, 255, 255, 0.07);
  --border-strong:    rgba(163, 230, 53, 0.22);

  --font:             'Inter', system-ui, sans-serif;
  --font-mono:        'JetBrains Mono', monospace;
}
html[data-theme="cp-hybrid-section-9-mist"] body {
  background:
    radial-gradient(at 30% 10%, rgba(31, 90, 80, 0.30) 0%, transparent 60%),
    radial-gradient(at 70% 95%, rgba(14, 116, 144, 0.18) 0%, transparent 60%),
    #0a0e12;
  background-attachment: fixed;
}
```

### Treatments

- Lighter blur (`backdrop-filter: blur(12px)`) — the glass is more
  solid, less atmospheric.
- Cards have visible borders (semi-transparent silver), not just
  accent border on focus.
- Card titles in Inter (sans). Labels, IDs, timestamps in mono.
- Tag chips and mention chips: silver by default, lime on **hover**
  (faster reveal than Standby's focus-within only).
- Active card: lime border + small lime square indicator at top-left,
  plus a subtle stripe.

### Mood

The most readable of the three for daily use. Borrows Glass's
translucency without committing to its volume; borrows Tachikoma's
discipline without enforcing all-mono. The middle path.

---

## Which to pick

- **Tachikoma Reflection** — atmospheric without being loud. If you
  liked Tachikoma Standby and want it warmer / more alive without
  losing discipline.
- **Major's Shell** — most cinematic. If Glass's backdrop is part of
  what drew you in but the pink-on-pink-on-pink is too much; this
  keeps Glass intact while disciplining the foreground.
- **Section 9 Mist** — most pragmatic. If the previous two feel like
  showpieces and you want something Glass-flavored that you'd
  actually leave on for a workday.

Open the previews, then tell me which (or which combination) and
we'll wire it into the theme system.
