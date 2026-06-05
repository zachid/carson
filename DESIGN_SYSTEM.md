# Design System
**April · v1.0**
Replace this file to change the visual language of the entire project.

---

## Identity

| | |
|---|---|
| Typeface | Manrope (200–800) |
| Primary accent | `#8B5CF6` dark · `#7C3AED` light |
| Secondary accent | `#06B6D4` dark · `#0891B2` light — use sparingly |
| Border radius | `0px` everywhere |
| Radius exception | `999px` — badges and tags only |
| Mode | Dark-first. Light via `body.light` |
| Shadows | None — depth through borders and layering only |

---

## Tokens

```css
/* Dark (default) */
:root {
  --bg:        #111110;
  --bg-card:   #1A1A19;
  --bg-hover:  #1F1F1E;
  --border:    #252523;
  --border-md: #323230;
  --border-hi: #4A4A47;
  --text:      #F4F3EF;
  --text-2:    #6B6B66;
  --text-3:    #3D3D39;
  --accent:    #8B5CF6;
  --accent-2:  #06B6D4;
}

/* Light */
body.light {
  --bg:        #F2F2EF;
  --bg-card:   #FFFFFF;
  --bg-hover:  #F8F8F5;
  --border:    rgba(0,0,0,0.07);
  --border-md: rgba(0,0,0,0.12);
  --border-hi: rgba(0,0,0,0.22);
  --text:      #111110;
  --text-2:    rgba(17,17,16,0.55);
  --text-3:    rgba(17,17,16,0.28);
  --accent:    #7C3AED;
  --accent-2:  #0891B2;
}
```

**Functional** (both modes)

| | |
|---|---|
| Success | `#10B981` |
| Danger | `#EF4444` · hover `#DC2626` |

---

## Typography

Font import:
```html
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;500;600;700;800&display=swap" rel="stylesheet">
```

| Role | Size | Weight | Letter-spacing | Line-height | Color |
|---|---|---|---|---|---|
| Display | clamp(44–80px) | 800 | -0.04em | 0.92 | --text |
| Title | clamp(30–52px) | 800 | -0.03em | 1.05 | --text |
| Card name | 18px | 800 | -0.03em | — | --text |
| Body | 16px | 400 | — | 1.65 | --text |
| Secondary | 14px | 400 | — | 1.60 | --text-2 |
| Caption | 13px | 400 | — | 1.55 | --text-2 |
| Label | 11px uppercase | 700 | 0.10em | — | --text-2 |
| Eyebrow | 10px uppercase | 700 | 0.16em | — | --accent |
| Mono | 12px | 400 | — | — | --text-2 |

Mono stack: `'SF Mono', 'Fira Code', 'Cascadia Code', monospace`

---

## Spacing

4px base unit. All values are multiples of 4.

| Token | px |
|---|---|
| --sp-1 | 4 |
| --sp-2 | 8 |
| --sp-3 | 12 |
| --sp-4 | 16 |
| --sp-5 | 20 |
| --sp-6 | 24 |
| --sp-8 | 32 |
| --sp-10 | 40 |
| --sp-12 | 48 |
| --sp-16 | 64 |
| --sp-20 | 80 |
| --sp-24 | 96 |

---

## Components

### Buttons
`border-radius: 0` · height `36px` · Manrope 700 · 10px uppercase · ls 0.10em

```css
.btn-primary { background: var(--accent); border: 1px solid var(--accent); color: #fff; }
.btn-primary:hover { opacity: 0.88; }

.btn-ghost { background: transparent; border: 1px solid var(--border-md); color: var(--text-2); }
.btn-ghost:hover { border-color: var(--border-hi); color: var(--text); }

.btn-danger { background: #EF4444; border: 1px solid #EF4444; color: #fff; }
.btn-danger:hover { background: #DC2626; border-color: #DC2626; }

.btn-lg { height: 44px; padding: 0 24px; font-size: 11px; }
```

### Badges
`border-radius: 999px` · 10px/700 uppercase · padding `2px 10px`

```css
.badge-do   { background: rgba(16,185,129,0.10); color: #10B981; border: 1px solid rgba(16,185,129,0.20); }
.badge-dont { background: rgba(239,68,68,0.10);  color: #EF4444; border: 1px solid rgba(239,68,68,0.20); }
.badge-new  { background: rgba(139,92,246,0.10); color: var(--accent); border: 1px solid rgba(139,92,246,0.20); }
```

### Keyword Tags
`border-radius: 999px` · 11px/500 · padding `3px 10px`

```css
.kw-tag {
  background: rgba(139,92,246,0.08);
  border: 1px solid rgba(139,92,246,0.18);
  color: var(--accent);
}
```

### Cards
`border-radius: 0` · `border: 1px solid var(--border-md)` · no shadow

```css
.card { background: var(--bg-card); border: 1px solid var(--border-md); transition: background 0.12s; }
.card:hover { background: var(--bg-hover); }
.card-band { height: 3px; background: var(--accent); } /* optional top accent strip */
```

Card anatomy: Band (optional) → Body (20px padding) → Meta footer (`border-top: 1px solid var(--border)`)

### Inputs
`border-radius: 0` · padding `10px 12px` · font-size `13px`

```css
.input { background: var(--bg); border: 1px solid var(--border-md); color: var(--text); font-family: 'Manrope', sans-serif; }
.input:focus { border-color: var(--accent); outline: none; }
.input::placeholder { color: var(--text-3); }
.input-label { font-size: 10px; font-weight: 700; letter-spacing: 0.10em; text-transform: uppercase; color: var(--text-2); }
```

### Grid
The gap is the border — no individual border declarations.

```css
.grid { display: grid; gap: 1px; background: var(--border-md); border: 1px solid var(--border-md); }
.grid-cell { background: var(--bg-card); padding: 24px 20px; }
.grid-cell:hover { background: var(--bg-hover); }
```

---

## Motion

| Speed | Duration | Use |
|---|---|---|
| Fast | 80ms | Icon hovers, micro state changes |
| Normal | 150ms | Buttons, inputs, nav |
| Slow | 300ms | Panels, overlays, cards |

```css
transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
```

---

## Layout

| | |
|---|---|
| Max width | 1200px |
| Section padding | `80px 48px` desktop · `48px 20px` mobile |
| Header height | 56px |
| Mobile breakpoint | 768px |

Section header pattern:
```html
<div class="eyebrow">01</div>
<h2 class="section-title">Name</h2>
<p class="section-desc">One line. Max 520px.</p>
```

---

## Rules

1. Manrope only — no other typefaces
2. Zero radius — except `999px` on badges and tags
3. No shadows
4. Dark-first — always implement both modes
5. 4px grid — all spacing is a multiple of 4
6. Grid borders via gap, not individual declarations
7. `--accent` is primary · `--accent-2` is secondary, use sparingly
8. Functional colors for semantic states only
9. Eyebrows always in `--accent`
10. Motion is subtle — 80–300ms, ease, color/border/opacity only
