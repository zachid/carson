# Design System
**Aeline · v1.0**
Replace this file to change the visual language of the entire project.

---

## Identity
| | |
|---|---|
| Typeface | Inter (400, 500, 600, 700) |
| Primary accent | `#6B5CE7` dark · `#8B7FF5` light |
| Secondary accent | `#00D4AA` dark · `#00F0C0` light — use sparingly |
| Border radius | `12px` everywhere |
| Radius exception | `6px` — badges and tags only |
| Mode | Dark-first. Light via `body.light` |
| Shadows | Subtle diffuse: `0 4px 24px rgba(0,0,0,0.35)` on cards; `0 0 0 1px` border glow on hover |

---

## Tokens

```css
/* Dark (default) */
:root {
  --bg:         #0A0A0F;
  --bg-card:    #111118;
  --bg-hover:   #18181F;
  --border:     #1E1E2A;
  --border-md:  #2A2A3A;
  --border-hi:  #3D3D55;
  --text:       #F0F0F5;
  --text-2:     #A0A0B8;
  --text-3:     #5A5A78;
  --accent:     #6B5CE7;
  --accent-2:   #00D4AA;
}

/* Light */
body.light {
  --bg:         #F7F7FB;
  --bg-card:    #FFFFFF;
  --bg-hover:   #EDEDF5;
  --border:     #E2E2EE;
  --border-md:  #CDCDE0;
  --border-hi:  #B8B8D0;
  --text:       #0A0A0F;
  --text-2:     #444460;
  --text-3:     #9090AA;
  --accent:     #5A4DD6;
  --accent-2:   #00B894;
}
```

---

## Typography

| Role | Size | Weight | Letter-spacing | Line-height | Color |
|---|---|---|---|---|---|
| Display / Hero H1 | `clamp(2.75rem, 5vw, 4rem)` | 700 | `-0.03em` | 1.1 | `var(--text)` |
| Section Heading H2 | `clamp(1.75rem, 3vw, 2.5rem)` | 700 | `-0.02em` | 1.15 | `var(--text)` |
| Card Heading H3 | `1.25rem` | 600 | `-0.01em` | 1.3 | `var(--text)` |
| Sub-heading H4 | `1rem` | 600 | `0em` | 1.4 | `var(--text)` |
| Body / Default | `1rem` | 400 | `0em` | 1.65 | `var(--text-2)` |
| Body Small | `0.875rem` | 400 | `0em` | 1.6 | `var(--text-2)` |
| Caption / Label | `0.75rem` | 500 | `0.04em` | 1.5 | `var(--text-3)` |
| Nav Link | `0.9375rem` | 500 | `0em` | 1 | `var(--text-2)` |
| Price / Stat | `2rem` | 700 | `-0.02em` | 1 | `var(--text)` |
| Button Text | `0.9375rem` | 600 | `0.01em` | 1 | inherit |

```css
body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.65;
  color: var(--text-2);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
}

h1 { font-size: clamp(2.75rem, 5vw, 4rem);   font-weight: 700; letter-spacing: -0.03em; line-height: 1.1;  color: var(--text); }
h2 { font-size: clamp(1.75rem, 3vw, 2.5rem); font-weight: 700; letter-spacing: -0.02em; line-height: 1.15; color: var(--text); }
h3 { font-size: 1.25rem;  font-weight: 600; letter-spacing: -0.01em; line-height: 1.3;  color: var(--text); }
h4 { font-size: 1rem;     font-weight: 600; letter-spacing: 0;        line-height: 1.4;  color: var(--text); }
```

---

## Spacing

Base unit: `4px`

| Token | Value | Usage |
|---|---|---|
| `--space-1` | `4px` | Icon gap, tight inline |
| `--space-2` | `8px` | Badge padding, small gap |
| `--space-3` | `12px` | Button padding-y, input padding |
| `--space-4` | `16px` | Card inner gap, list item gap |
| `--space-5` | `20px` | Button padding-x |
| `--space-6` | `24px` | Card padding |
| `--space-8` | `32px` | Section sub-gap |
| `--space-10` | `40px` | Component vertical gap |
| `--space-12` | `48px` | Section top padding (mobile) |
| `--space-16` | `64px` | Section padding (tablet) |
| `--space-24` | `96px` | Section padding (desktop) |
| `--space-32` | `128px` | Hero padding |

```css
:root {
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-24: 96px;
  --space-32: 128px;
}
```

---

## Components

### Buttons

```css
/* Base */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  font-family: inherit;
  font-size: 0.9375rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1;
  border-radius: 12px;
  border: 1px solid transparent;
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  transition: background 200ms ease, box-shadow 200ms ease, transform 150ms ease, border-color 200ms ease;
}

.btn:active {
  transform: scale(0.97);
}

/* Primary — filled accent */
.btn-primary {
  background: var(--accent);
  color: #FFFFFF;
  border-color: var(--accent);
}

.btn-primary:hover {
  background: #7D6EF0;
  border-color: #7D6EF0;
  box-shadow: 0 0 20px rgba(107, 92, 231, 0.45);
}

/* Secondary — ghost/outlined */
.btn-secondary {
  background