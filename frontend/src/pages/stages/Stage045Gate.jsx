import { useState, useEffect, useRef } from 'react';
import useProjectStore from '../../store/projectStore.js';
import api from '../../api/client.js';
import {
  IconEdit, IconClose, IconCheck, IconDownload, IconUpload,
  IconRefresh, IconBookmark, IconBookmarkFill, IconCopy, IconLayout,
} from '../../components/Icons.jsx';

// ── Helpers ───────────────────────────────────────────────────────────────────

const RANDOM_NAMES = [
  'Onyx', 'Vanta', 'Chalk', 'Obsidian', 'Dusk', 'Slate', 'Carbon', 'Void',
  'Ember', 'Mist', 'Storm', 'Ash', 'Frost', 'Nova', 'Flux', 'Moor', 'Coda',
  'Lumen', 'Helix', 'Quartz', 'Basalt', 'Crest', 'Prism', 'Sable',
];
const randomName = () => RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];

const THEMES_KEY = 'carson_saved_themes';
function loadSavedThemes() {
  try { return JSON.parse(localStorage.getItem(THEMES_KEY) || '[]'); } catch { return []; }
}
function persistSavedThemes(themes) {
  try { localStorage.setItem(THEMES_KEY, JSON.stringify(themes)); } catch {}
}

const DEFAULT_TOKENS = {
  name: '',
  colors: {
    background: '#0A0A0F', bgCard: '#111118', border: '#1E1E2A',
    text: '#F0F0F5', accent01: '#6B5CE7', accent02: '#00D4AA',
  },
  typography: {
    headlines: { font: 'Inter', weight: '800' },
    sub:       { font: 'Inter', weight: '600' },
    body:      { font: 'Inter', weight: '400' },
    captions:  { font: 'Inter', weight: '300' },
  },
  layout: {
    borderRadius: '0px',
    shadowStyle: 'none',
    heroPattern: 'left-text-right-media',
    sectionSpacing: 'balanced',
    cardStyle: 'bordered',
    navStyle: 'minimal',
    personality: 'minimal',
    sections: ['hero', 'features-grid', 'cta', 'faq', 'footer'],
  },
};

function hexToRgba(hex, alpha) {
  if (!hex?.startsWith('#') || hex.length < 7) return `rgba(128,128,128,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function hexShift(hex, amount) {
  if (!hex?.startsWith('#') || hex.length < 7) return hex;
  const clamp = v => Math.min(255, Math.max(0, v));
  const r = clamp(parseInt(hex.slice(1, 3), 16) + amount);
  const g = clamp(parseInt(hex.slice(3, 5), 16) + amount);
  const b = clamp(parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

function buildDesignSystemMd(tokens) {
  const { name = 'Custom', colors: c = {}, typography: t = {}, layout: l = {} } = tokens;
  const bg   = c.background || '#111110';
  const bgc  = c.bgCard     || '#1A1A19';
  const bdr  = c.border     || '#252523';
  const txt  = c.text       || '#F4F3EF';
  const acc1 = c.accent01   || '#8B5CF6';
  const acc2 = c.accent02   || '#06B6D4';
  const font = t.headlines?.font || 'Inter';

  const bgHover  = hexShift(bgc,  6);
  const bdrMd    = hexShift(bdr, 12);
  const bdrHi    = hexShift(bdr, 30);
  const txt2     = hexToRgba(txt, 0.55);
  const txt3     = hexToRgba(txt, 0.28);

  const bgLight     = hexShift(txt,  10);
  const bgCardLight = '#FFFFFF';
  const bgHoverL    = hexShift(txt,  -10);
  const bdrLight    = hexToRgba(bg, 0.07);
  const bdrMdLight  = hexToRgba(bg, 0.13);
  const bdrHiLight  = hexToRgba(bg, 0.23);
  const txtLight    = bg;
  const txt2Light   = hexToRgba(bg, 0.55);
  const txt3Light   = hexToRgba(bg, 0.28);
  const acc1Light   = hexShift(acc1, -15);
  const acc2Light   = hexShift(acc2, -15);

  const rad    = l.borderRadius || '0px';
  const radSm  = rad === '0px' ? '0px' : rad === '999px' ? '4px' : rad;
  const radLg  = rad === '0px' ? '0px' : rad === '4px' ? '8px' : rad === '8px' ? '16px' : rad === '12px' ? '20px' : '24px';
  const shadow = l.shadowStyle || 'none';
  const shadowSm = shadow === 'none' ? 'none' : shadow === 'subtle' ? '0 1px 4px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.14)';
  const shadowMd = shadow === 'none' ? 'none' : shadow === 'subtle' ? '0 4px 16px rgba(0,0,0,0.10)' : '0 8px 24px rgba(0,0,0,0.18)';
  const shadowLg = shadow === 'none' ? 'none' : shadow === 'subtle' ? '0 12px 40px rgba(0,0,0,0.12)' : '0 20px 60px rgba(0,0,0,0.22)';
  const spSm  = l.sectionSpacing === 'compact' ? '48px' : l.sectionSpacing === 'airy' ? '120px' : '80px';
  const spLg  = l.sectionSpacing === 'compact' ? '80px' : l.sectionSpacing === 'airy' ? '160px' : '120px';

  const heroPatternDesc = {
    'centered':              'Centered hero — headline and CTA centered on page',
    'left-text-right-media': 'Split hero — copy left (~45%), product visual right (~55%)',
    'right-text-left-media': 'Split hero — product visual left (~55%), copy right (~45%)',
    'full-width':            'Full-width hero — headline spans full page width, media below',
    'split-equal':           'Equal split — 50/50 content both columns',
  }[l.heroPattern] || l.heroPattern || 'Centered hero';

  const cardBorderNote = l.cardStyle === 'flat'     ? 'No border, background-only separation'
    : l.cardStyle === 'shadow'   ? 'Shadow-only depth, no border'
    : l.cardStyle === 'elevated' ? 'Elevated with shadow + subtle border'
    : l.cardStyle === 'glass'    ? 'Frosted glass — backdrop-filter + border'
    :                              '1px solid var(--border-md)';

  return `# Design System
**${name} · v1.0**
Replace this file to change the visual language of the entire project.

---

## 1. Visual Personality
| | |
|---|---|
| Style direction | ${l.personality || 'minimal'} |
| Hero pattern | ${heroPatternDesc} |
| Nav style | ${l.navStyle || 'minimal'} |
| Card style | ${l.cardStyle || 'bordered'} — ${cardBorderNote} |
| Section density | ${l.sectionSpacing || 'balanced'} |
| Page sections | ${(l.sections || []).join(' → ') || 'hero → features → cta → footer'} |

---

## 2. Color System

\`\`\`css
/* Dark (default) */
:root {
  /* Canvas */
  --bg:        ${bg};
  --bg-card:   ${bgc};
  --bg-hover:  ${bgHover};

  /* Borders */
  --border:    ${bdr};
  --border-md: ${bdrMd};
  --border-hi: ${bdrHi};

  /* Text */
  --text:      ${txt};
  --text-2:    ${txt2};
  --text-3:    ${txt3};

  /* Brand */
  --accent:    ${acc1};
  --accent-2:  ${acc2};

  /* Semantic */
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error:   #EF4444;
  --color-info:    #3B82F6;
}

/* Light */
body.light {
  --bg:        ${bgLight};
  --bg-card:   ${bgCardLight};
  --bg-hover:  ${bgHoverL};
  --border:    ${bdrLight};
  --border-md: ${bdrMdLight};
  --border-hi: ${bdrHiLight};
  --text:      ${txtLight};
  --text-2:    ${txt2Light};
  --text-3:    ${txt3Light};
  --accent:    ${acc1Light};
  --accent-2:  ${acc2Light};
}
\`\`\`

---

## 3. Typography System

Font import:
\`\`\`html
<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@300;400;600;700;800&display=swap" rel="stylesheet">
\`\`\`

**Font families**
- Display / Headlines: ${font}
- Body: ${t.body?.font || font}
- Mono: ui-monospace, "SFMono-Regular", Consolas, monospace

**Type scale**

| Token | Size | Weight | Letter-spacing | Line-height | Usage |
|---|---|---|---|---|---|
| --type-hero | \`clamp(2.75rem, 5vw, 4rem)\` | ${t.headlines?.weight || '800'} | \`-0.03em\` | 1.1 | Hero H1 |
| --type-h1   | \`clamp(2rem, 3.5vw, 3rem)\`   | ${t.headlines?.weight || '800'} | \`-0.03em\` | 1.1 | Page title |
| --type-h2   | \`clamp(1.75rem, 3vw, 2.5rem)\` | ${t.sub?.weight || '700'} | \`-0.02em\` | 1.15 | Section title |
| --type-h3   | \`1.25rem\`  | ${t.sub?.weight || '700'} | \`-0.01em\` | 1.3 | Card title |
| --type-body | \`1rem\`     | ${t.body?.weight || '400'} | \`0\` | 1.65 | Body copy |
| --type-caption | \`0.8125rem\` | ${t.captions?.weight || '400'} | \`0\` | 1.55 | Labels / meta |
| --type-button  | \`0.6875rem\` | 700 | \`0.10em\` | 1 | CTA text |
| --type-eyebrow | \`0.625rem\`  | 700 | \`0.16em\` | 1 | Section eyebrows |

---

## 4. Spacing System

4px base unit.

| Token | Value | Usage |
|---|---|---|
| --space-2xs | 4px  | Inline gaps, icon padding |
| --space-xs  | 8px  | Icon + text gap |
| --space-sm  | 12px | Small component padding |
| --space-md  | 16px | Card padding, form rows |
| --space-lg  | 24px | Section inner spacing |
| --space-xl  | 40px | Large component spacing |
| --space-2xl | ${spSm} | Section vertical padding |
| --space-3xl | ${spLg} | Hero / major separation |

---

## 5. Layout System

| | |
|---|---|
| Max container | 1200px |
| Section padding | \`${spSm} 48px\` desktop · \`48px 20px\` mobile |
| Header height | 56px |
| Mobile breakpoint | 768px |
| Hero pattern | ${heroPatternDesc} |
| Section rhythm | ${l.sectionSpacing || 'balanced'} — consistent vertical spacing between all sections |
| Card grid | 3-col desktop → 2-col tablet → 1-col mobile |
| Text/media relationship | defined by hero pattern above |
| Alignment | Left-start default; center for full-width sections only |

---

## 6. Shape System

| Token | Value | Usage |
|---|---|---|
| --radius-none | 0px   | Sharp elements (default for blocks) |
| --radius-sm   | ${radSm}  | Small UI — badges, tags, chips |
| --radius-md   | ${rad}   | Cards, inputs, buttons |
| --radius-lg   | ${radLg} | Large panels, modals |
| --radius-full | 999px | Pills, avatars, toggles |

\`\`\`css
:root {
  --radius-none: 0px;
  --radius-sm:   ${radSm};
  --radius-md:   ${rad};
  --radius-lg:   ${radLg};
  --radius-full: 999px;
}
\`\`\`

---

## 7. Border System

\`\`\`css
--border-subtle: 1px solid var(--border);
--border-default: 1px solid var(--border-md);
--border-strong: 1px solid var(--border-hi);
--divider: 1px solid var(--border);
\`\`\`

---

## 8. Shadow / Elevation System

| Token | Value | Usage |
|---|---|---|
| --shadow-sm | ${shadowSm} | Small cards, dropdowns |
| --shadow-md | ${shadowMd} | Floating panels, tooltips |
| --shadow-lg | ${shadowLg} | Modals, hero mockups |

---

## 9. Components

### Buttons
height \`36px\` (lg: 44px) · ${font} 700 · 10px uppercase · letter-spacing 0.10em · border-radius \`var(--radius-md)\`

\`\`\`css
.btn-primary { background: var(--accent); border: 1px solid var(--accent); color: #fff; border-radius: var(--radius-md); }
.btn-primary:hover { opacity: 0.88; }

.btn-ghost { background: transparent; border: 1px solid var(--border-md); color: var(--text-2); border-radius: var(--radius-md); }
.btn-ghost:hover { border-color: var(--border-hi); color: var(--text); }

.btn-danger { background: var(--color-error); border: 1px solid var(--color-error); color: #fff; border-radius: var(--radius-md); }
.btn-lg { height: 44px; padding: 0 24px; font-size: 11px; }
\`\`\`

### Cards
${cardBorderNote} · border-radius \`var(--radius-md)\` · shadow: \`var(--shadow-sm)\`

\`\`\`css
.card { background: var(--bg-card); border: var(--border-default); border-radius: var(--radius-md); box-shadow: var(--shadow-sm); transition: background 0.12s; }
.card:hover { background: var(--bg-hover); }
.card-band { height: 3px; background: var(--accent); }
\`\`\`

### Inputs
height \`40px\` · padding \`10px 12px\` · font-size \`13px\` · border-radius \`var(--radius-md)\`

\`\`\`css
.input { background: var(--bg); border: var(--border-default); color: var(--text); border-radius: var(--radius-md); font-family: '${font}', sans-serif; }
.input:focus { border-color: var(--accent); outline: none; box-shadow: 0 0 0 3px ${hexToRgba(acc1, 0.15)}; }
.input::placeholder { color: var(--text-3); }
\`\`\`

### Badges
border-radius \`var(--radius-full)\` · 10px/700 uppercase · padding \`2px 10px\`

\`\`\`css
.badge-do      { background: rgba(16,185,129,0.10); color: var(--color-success); border: 1px solid rgba(16,185,129,0.20); border-radius: var(--radius-full); }
.badge-danger  { background: rgba(239,68,68,0.10);  color: var(--color-error);   border: 1px solid rgba(239,68,68,0.20);  border-radius: var(--radius-full); }
.badge-warning { background: rgba(245,158,11,0.10); color: var(--color-warning); border: 1px solid rgba(245,158,11,0.20); border-radius: var(--radius-full); }
.badge-info    { background: rgba(59,130,246,0.10); color: var(--color-info);    border: 1px solid rgba(59,130,246,0.20); border-radius: var(--radius-full); }
\`\`\`

---

## 10. Motion

| Speed | Duration | Usage |
|---|---|---|
| Fast   | 80ms  | Icon hovers, micro state changes |
| Normal | 150ms | Buttons, inputs, nav, cards |
| Slow   | 300ms | Panels, overlays, page transitions |

\`\`\`css
transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease;
\`\`\`
- Scroll behavior: smooth
- No parallax or transform-heavy animations
- Hover: opacity or border-color shift only — no layout shifts

---

## 11. Rules

1. Use only CSS variables — no hardcoded colors except semantic (#10B981, #EF4444, #F59E0B, #3B82F6)
2. ${font} typeface only — load via Google Fonts CDN
3. Dark-first — always implement both modes via \`body.light\`
4. 4px grid — all spacing is a multiple of 4
5. Border-radius: \`var(--radius-md)\` on all block elements; \`var(--radius-full)\` on pills/tags only
6. Shadow: \`var(--shadow-sm)\` on cards, \`var(--shadow-md)\` on floating panels
7. \`--accent\` is primary; \`--accent-2\` is secondary — use sparingly
8. Semantic color tokens for states only (\`--color-success\`, \`--color-error\`, etc.)
9. Eyebrows always in \`var(--accent)\`
10. Motion is subtle — 80–300ms ease — color/border/opacity only, no layout animation
`;
}

function parseMdTokens(md) {
  const colors = {};

  const cssRe = /--(bg|bg-card|border|text|accent|accent-2)(?![\w-]):\s*(#[0-9a-fA-F]{6,8})/g;
  const cssMap = { 'bg': 'background', 'bg-card': 'bgCard', 'border': 'border', 'text': 'text', 'accent': 'accent01', 'accent-2': 'accent02' };
  let m;
  while ((m = cssRe.exec(md)) !== null) {
    if (cssMap[m[1]] && !colors[cssMap[m[1]]]) colors[cssMap[m[1]]] = m[2];
  }

  if (Object.keys(colors).length < 3) {
    const roleMap = [
      { patterns: ['background', 'page background', 'main background', 'bg color', 'base color'],          target: 'background' },
      { patterns: ['bg card', 'bgcard', 'card surface', 'panel background', 'secondary background', 'card background'], target: 'bgCard' },
      { patterns: ['border', 'divider', 'separator', 'stroke'],                                             target: 'border' },
      { patterns: ['primary text', 'body text', 'text color', 'foreground', 'main text'],                  target: 'text' },
      { patterns: ['accent 01', 'accent01', 'primary accent', 'primary color', 'cta', 'highlight', 'brand color', 'accent color'], target: 'accent01' },
      { patterns: ['accent 02', 'accent02', 'accent-2', 'secondary accent', 'secondary color'],             target: 'accent02' },
    ];
    const lines = md.split('\n');
    for (const line of lines) {
      const hexMatch = line.match(/#([0-9a-fA-F]{6})\b/);
      if (!hexMatch) continue;
      const hex = '#' + hexMatch[1];
      const lower = line.toLowerCase();
      for (const { patterns, target } of roleMap) {
        if (colors[target]) continue;
        if (patterns.some(p => lower.includes(p))) { colors[target] = hex; break; }
      }
    }
  }

  if (Object.keys(colors).length < 4) {
    const cssSection = md.match(/## Hex Colors Extracted From Page CSS\/HTML\n([^\n#]+)/);
    if (cssSection) {
      const extracted = cssSection[1].split(',').map(s => s.trim()).filter(s => /^#[0-9a-fA-F]{6}$/.test(s));
      const slots = ['background', 'bgCard', 'border', 'text', 'accent01', 'accent02'];
      for (const hex of extracted) {
        const empty = slots.find(s => !colors[s]);
        if (!empty) break;
        colors[empty] = hex;
      }
    }
  }

  const fontPatterns = [
    /\|\s*Typeface\s*\|\s*([^|\n]+)/i,
    /heading\s+font[^:\n]*:\s*\**'?([A-Z][a-zA-Z ]+?)'?\**/i,
    /typeface[^:\n]*:\s*\**'?([A-Z][a-zA-Z ]+?)'?\**/i,
    /font(?:\s+family)?[^:\n]*:\s*\**'?([A-Z][a-zA-Z ]+?)'?\**/i,
  ];
  let font = 'Inter';
  for (const pat of fontPatterns) {
    const fm = md.match(pat);
    if (fm) { font = fm[1].trim().split(/[\s,(]/)[0]; break; }
  }

  return {
    name: parseBrandName(md),
    colors: { ...DEFAULT_TOKENS.colors, ...colors },
    typography: {
      headlines: { font, weight: '800' },
      sub:       { font, weight: '600' },
      body:      { font, weight: '400' },
      captions:  { font, weight: '300' },
    },
  };
}

function parseBrandName(md) {
  const m = md.match(/^#\s+(.+)/m);
  return m ? m[1].replace(/design system/i, '').replace(/·.*$/, '').trim() : '';
}

function downloadMd(content, filename = 'DESIGN_SYSTEM.md') {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TABS = [
  { label: 'Classic Mode' },
  { label: 'Site URL Reference' },
  { label: 'Upload Image' },
  { label: 'Upload Design.md' },
  { label: 'Saved Themes' },
];

const SWATCH_KEYS = [
  { key: 'background', label: 'Background' },
  { key: 'bgCard',     label: 'Bg Card'    },
  { key: 'border',     label: 'Border'     },
  { key: 'text',       label: 'Text'       },
  { key: 'accent01',   label: 'Accent 01'  },
  { key: 'accent02',   label: 'Accent 02'  },
];

// ── Main component ─────────────────────────────────────────────────────────────

export default function Stage045Gate({ project, onComplete }) {
  const { saveDirection } = useProjectStore();

  const [activeTab,    setActiveTab]    = useState(0);
  const [previewReady, setPreviewReady] = useState(false);
  const [tokens,       setTokens]       = useState(DEFAULT_TOKENS);
  const [lightDark,    setLightDark]    = useState(false);
  const [generating,   setGenerating]   = useState(false);
  const [genError,     setGenError]     = useState('');
  const [saving,       setSaving]       = useState(false);
  // panelTab: 0 = visual, 1 = design system, 2 = scaffold (URL tab only)
  const [panelTab,     setPanelTab]     = useState(0);

  // Scaffold
  const [scaffoldSpec,       setScaffoldSpec]       = useState('');
  const [scaffoldGenerating, setScaffoldGenerating] = useState(false);
  const [scaffoldError,      setScaffoldError]      = useState('');

  // URL tab
  const [refUrl,     setRefUrl]     = useState('');
  const [refUrlName, setRefUrlName] = useState('');

  // Image tab
  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [dragOver,     setDragOver]     = useState(false);

  // MD tab
  const [mdError, setMdError] = useState('');

  // Saved themes
  const [savedThemes, setSavedThemes] = useState(() => loadSavedThemes());
  const [themeSaved,  setThemeSaved]  = useState(false); // brief feedback flash

  // Color picker refs
  const cpBg     = useRef(null); const cpBgCard = useRef(null);
  const cpBorder = useRef(null); const cpText   = useRef(null);
  const cpAcc1   = useRef(null); const cpAcc2   = useRef(null);
  const cpRefs   = { background: cpBg, bgCard: cpBgCard, border: cpBorder, text: cpText, accent01: cpAcc1, accent02: cpAcc2 };

  const imageInputRef = useRef(null);
  const mdInputRef    = useRef(null);

  // Derived: scaffold tab only visible in URL mode
  const panelTabs = activeTab === 1
    ? ['Visual', 'Design System', 'Scaffold']
    : ['Visual', 'Design System'];

  // Pre-populate if direction already exists
  useEffect(() => {
    const dir = project?.direction;
    if (dir?.tokens) {
      setTokens(dir.tokens);
      setPreviewReady(true);
      setLightDark(dir.color_mode === 'both');
    }
  }, []);

  // ── Token helpers ──────────────────────────────────────────────────────────
  const setColor = (key, value) =>
    setTokens(prev => ({ ...prev, colors: { ...prev.colors, [key]: value } }));

  const applyTokens = (t) => { setTokens(t); setPreviewReady(true); setGenError(''); };

  const handleSetActiveTab = (i) => {
    setActiveTab(i);
    // Hide scaffold panel tab when leaving URL mode
    if (i !== 1 && panelTab === 2) setPanelTab(0);
  };

  // ── Tab actions ────────────────────────────────────────────────────────────

  const handleClassic = async () => {
    setGenerating(true); setGenError('');
    try {
      const { data } = await api.post(`/projects/${project.id}/direction/generate-classic`);
      applyTokens(data.tokens);
    } catch (err) { setGenError(err.response?.data?.error || err.message); }
    finally { setGenerating(false); }
  };

  const handleUrlGenerate = async () => {
    if (!refUrl.trim()) return;
    // Auto-set name from hostname if empty
    if (!refUrlName) {
      try {
        const hostname = new URL(refUrl.trim()).hostname.replace(/^www\./, '');
        setRefUrlName(hostname);
      } catch {}
    }
    setGenerating(true); setGenError('');
    try {
      const { data } = await api.post(`/projects/${project.id}/direction/generate-url`, { url: refUrl.trim() });
      applyTokens(data.tokens);
    } catch (err) { setGenError(err.response?.data?.error || err.message); }
    finally { setGenerating(false); }
  };

  const handleImageFile = (file) => {
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleImageExtract = async () => {
    if (!imageFile) return;
    setGenerating(true); setGenError('');
    try {
      const form = new FormData();
      form.append('images', imageFile);
      const { data } = await api.post(`/projects/${project.id}/direction/generate-image`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      applyTokens(data.tokens);
    } catch (err) { setGenError(err.response?.data?.error || err.message); }
    finally { setGenerating(false); }
  };

  const handleMdUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    e.target.value = '';
    setMdError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseMdTokens(ev.target.result);
        applyTokens(parsed);
      } catch {
        setMdError('Could not parse design tokens from this file.');
      }
    };
    reader.readAsText(file);
  };

  // ── Scaffold ───────────────────────────────────────────────────────────────
  const handleGenerateScaffold = async () => {
    setScaffoldGenerating(true); setScaffoldError('');
    try {
      const { data } = await api.post(`/projects/${project.id}/direction/generate-scaffold`, { tokens });
      setScaffoldSpec(data.spec || '');
    } catch (err) { setScaffoldError(err.response?.data?.error || err.message); }
    finally { setScaffoldGenerating(false); }
  };

  // ── Save theme ─────────────────────────────────────────────────────────────
  const handleSaveTheme = () => {
    const name = refUrlName || tokens.name || 'Untitled';
    const theme = {
      id: Date.now().toString(),
      name,
      url: refUrl || '',
      tokens: { ...tokens, name },
      scaffoldSpec,
      savedAt: new Date().toISOString(),
    };
    const updated = [...savedThemes, theme];
    setSavedThemes(updated);
    persistSavedThemes(updated);
    // Brief "Saved!" feedback
    setThemeSaved(true);
    setTimeout(() => setThemeSaved(false), 2000);
  };

  const handleDeleteTheme = (id) => {
    const updated = savedThemes.filter(t => t.id !== id);
    setSavedThemes(updated);
    persistSavedThemes(updated);
  };

  const handleApplyTheme = (theme) => {
    applyTokens(theme.tokens);
    if (theme.scaffoldSpec) setScaffoldSpec(theme.scaffoldSpec);
    // Switch to URL tab so panel shows correctly (with scaffold if present)
    handleSetActiveTab(theme.url ? 1 : 0);
    if (theme.url) setRefUrl(theme.url);
    if (theme.name) setRefUrlName(theme.name);
  };

  // ── Confirm ────────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    setSaving(true);
    try {
      const designSystemMd = buildDesignSystemMd(tokens);
      await saveDirection(project.id, {
        design_system:   designSystemMd,
        tokens:          tokens,
        reference_urls:  refUrl ? JSON.stringify([refUrl]) : null,
        reference_notes: null,
        brand_assets:    null,
        color_mode:      lightDark ? 'both' : 'match',
      });
      onComplete?.();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  // ── Render: tab input area ─────────────────────────────────────────────────
  const renderTabInput = () => {
    switch (activeTab) {

      // ── Tab 0: Classic Mode ──────────────────────────────────────────────
      case 0:
        if (!previewReady) {
          return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
              <button className="btn btn-primary btn-lg" onClick={handleClassic} disabled={generating}>
                {generating ? <><span style={{ animation: 'pulse 1s infinite' }}>●</span> Generating…</> : 'GENERATE NEW DESIGN'}
              </button>
            </div>
          );
        }
        return (
          <div style={{ marginBottom: 16 }}>
            <button className="btn btn-ghost" onClick={handleClassic} disabled={generating} style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconRefresh size={13} /> {generating ? 'Regenerating…' : 'Regenerate from brand audit'}
            </button>
          </div>
        );

      // ── Tab 1: Site URL Reference ────────────────────────────────────────
      case 1:
        return (
          <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* URL row */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input" type="url"
                placeholder="Add site url for design reference…"
                value={refUrl} onChange={e => setRefUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUrlGenerate()}
                style={{ flex: 1 }}
              />
              <button className="btn btn-ghost" onClick={handleUrlGenerate} disabled={generating || !refUrl.trim()}>
                {generating ? '● Extracting…' : 'EXTRACT STYLE'}
              </button>
            </div>
            {/* Name + save row — visible once a URL is entered */}
            {refUrl && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  className="input"
                  placeholder="Name this reference…"
                  value={refUrlName}
                  onChange={e => setRefUrlName(e.target.value)}
                  style={{ flex: 1, height: 30, fontSize: 11 }}
                />
                {previewReady && (
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 10, flexShrink: 0, color: themeSaved ? 'var(--color-success)' : undefined, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    onClick={handleSaveTheme}
                  >
                    {themeSaved
                      ? <><IconBookmarkFill size={12} /> Saved</>
                      : <><IconBookmark size={12} /> Save Theme</>}
                  </button>
                )}
              </div>
            )}
          </div>
        );

      // ── Tab 2: Upload Image ──────────────────────────────────────────────
      case 2:
        return (
          <div style={{ marginBottom: 16 }}>
            {!imageFile ? (
              <div
                onClick={() => imageInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleImageFile(e.dataTransfer.files[0]); }}
                style={{
                  border: `1px dashed ${dragOver ? 'var(--accent)' : 'var(--border-md)'}`,
                  padding: '32px 24px', textAlign: 'center', cursor: 'pointer',
                  background: dragOver ? 'var(--bg-hover)' : 'transparent',
                  transition: 'all 0.12s',
                }}
              >
                <div style={{ marginBottom: 8, opacity: 0.4, display: 'flex', justifyContent: 'center' }}><IconUpload size={22} /></div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Drop image or click to upload
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>JPG · PNG · WEBP</div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <img src={imagePreview} alt="preview" style={{ width: 56, height: 56, objectFit: 'cover', border: '1px solid var(--border-md)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>{imageFile.name}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" onClick={handleImageExtract} disabled={generating} style={{ fontSize: 11 }}>
                      {generating ? '● Extracting…' : 'EXTRACT STYLE'}
                    </button>
                    <button className="btn btn-ghost" onClick={() => { setImageFile(null); setImagePreview(''); }} style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <IconClose size={12} /> Remove
                    </button>
                  </div>
                </div>
              </div>
            )}
            <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { handleImageFile(e.target.files[0]); e.target.value = ''; }} />
          </div>
        );

      // ── Tab 3: Upload Design.md ──────────────────────────────────────────
      case 3:
        return (
          <div style={{ marginBottom: 16 }}>
            <label className="btn btn-ghost" style={{ cursor: 'pointer', display: 'inline-flex' }}>
              UPLOAD DESIGN.MD
              <input ref={mdInputRef} type="file" accept=".md,.txt" style={{ display: 'none' }} onChange={handleMdUpload} />
            </label>
            {mdError && <div style={{ marginTop: 8, fontSize: 11, color: '#ef4444' }}>{mdError}</div>}
          </div>
        );

      // ── Tab 4: Saved Themes ──────────────────────────────────────────────
      case 4:
        return (
          <div style={{ marginBottom: 16 }}>
            {savedThemes.length === 0 ? (
              <div style={{
                padding: '32px 24px', textAlign: 'center',
                border: '1px dashed var(--border-md)',
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.7 }}>
                  No saved themes yet.<br />
                  Extract a site URL and click <strong>Save Theme</strong> to store it here.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {savedThemes.map(theme => (
                  <div key={theme.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-md)',
                  }}>
                    {/* Color strip */}
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      {['background', 'bgCard', 'accent01', 'accent02', 'text'].map(k => (
                        <div key={k} style={{
                          width: 14, height: 36,
                          background: theme.tokens?.colors?.[k] || '#333',
                        }} />
                      ))}
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                        {theme.name}
                      </div>
                      {theme.url && (
                        <div style={{ fontSize: 10, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {theme.url}
                        </div>
                      )}
                    </div>
                    {/* Actions */}
                    <button className="btn btn-ghost" style={{ fontSize: 10, flexShrink: 0 }}
                      onClick={() => handleApplyTheme(theme)}>
                      Apply
                    </button>
                    <button
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-3)', padding: '0 4px',
                        flexShrink: 0, display: 'flex', alignItems: 'center',
                      }}
                      onClick={() => handleDeleteTheme(theme.id)}
                      title="Remove theme"
                    ><IconClose size={13} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default: return null;
    }
  };

  // ── Render: preview panel ──────────────────────────────────────────────────
  const renderPreviewPanel = () => (
    <div style={{ border: '1px solid var(--border-md)', background: 'var(--bg-card)' }}>
      {/* Panel header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex' }}>
          {panelTabs.map((label, i) => (
            <button key={i} onClick={() => setPanelTab(i)} style={{
              padding: '11px 14px', background: 'transparent', border: 'none',
              borderBottom: panelTab === i ? '2px solid var(--accent)' : '2px solid transparent',
              color: panelTab === i ? 'var(--text)' : 'var(--text-3)',
              fontWeight: panelTab === i ? 700 : 400,
              fontSize: 11, cursor: 'pointer', letterSpacing: '0.04em',
              transition: 'color 0.12s, border-color 0.12s',
              marginBottom: -1,
            }}>{label}</button>
          ))}
        </div>
        <button className="btn btn-ghost" style={{ height: 26, padding: '0 10px', fontSize: 9, display: 'inline-flex', alignItems: 'center', gap: 5 }}
          onClick={() => downloadMd(buildDesignSystemMd(tokens), `${tokens.name || 'design-system'}.md`)}>
          <IconDownload size={11} /> Download .md
        </button>
      </div>

      {/* ── Design System markdown ── */}
      {panelTab === 1 && (
        <textarea
          readOnly
          value={buildDesignSystemMd(tokens)}
          style={{
            width: '100%', minHeight: 420, padding: 20,
            background: 'var(--bg)', color: 'var(--text-2)',
            fontFamily: 'monospace', fontSize: 11, lineHeight: 1.7,
            border: 'none', resize: 'vertical',
          }}
        />
      )}

      {/* ── Scaffold (URL tab only) ── */}
      {panelTab === 2 && (
        <div style={{ padding: 16 }}>
          {!scaffoldSpec ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.65 }}>
                Generates a precise structural layout specification — section order, grid patterns,
                column proportions, element sizes and alignments. Structural only: no color or visual styling.
              </div>
              <button
                className="btn btn-primary"
                onClick={handleGenerateScaffold}
                disabled={scaffoldGenerating}
                style={{ fontSize: 11 }}
              >
                {scaffoldGenerating
                  ? <><span style={{ animation: 'pulse 1s infinite' }}>●</span> Generating spec…</>
                  : <><IconLayout size={13} style={{ flexShrink: 0 }} /> Generate Layout Spec</>}
              </button>
              {scaffoldError && <div style={{ fontSize: 11, color: '#ef4444' }}>{scaffoldError}</div>}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn btn-ghost" onClick={handleGenerateScaffold} disabled={scaffoldGenerating} style={{ fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <IconRefresh size={12} /> {scaffoldGenerating ? 'Regenerating…' : 'Regenerate'}
                </button>
                <button className="btn btn-ghost" style={{ fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  onClick={() => navigator.clipboard?.writeText(scaffoldSpec)}>
                  <IconCopy size={12} /> Copy
                </button>
              </div>
              <pre style={{
                margin: 0, padding: '16px 20px',
                background: 'var(--bg)', border: '1px solid var(--border-md)',
                fontFamily: 'monospace', fontSize: 11, lineHeight: 1.75,
                color: 'var(--text-2)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                maxHeight: 560, overflowY: 'auto',
              }}>{scaffoldSpec}</pre>
            </div>
          )}
        </div>
      )}

      {/* ── Visual view ── */}
      {panelTab === 0 && (
        <>
          {/* Name field */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="input"
              placeholder="NAME / ADD RANDOM"
              value={tokens.name}
              onChange={e => setTokens(prev => ({ ...prev, name: e.target.value }))}
              style={{ flex: 1, height: 32, fontSize: 13, fontWeight: 700 }}
            />
            <button className="btn btn-ghost" style={{ height: 32, padding: '0 12px', fontSize: 10, flexShrink: 0 }}
              onClick={() => setTokens(prev => ({ ...prev, name: randomName() }))}>
              Random
            </button>
          </div>

          {/* Two-column: Colors + Typography */}
          <div style={{ display: 'flex', gap: 0 }}>
            {/* Colors */}
            <div style={{ flex: 1, padding: '16px', borderRight: '1px solid var(--border)' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 14 }}>Colors</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SWATCH_KEYS.map(({ key, label }) => (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div
                      onClick={() => cpRefs[key].current?.click()}
                      style={{
                        width: 52, height: 52, position: 'relative',
                        background: tokens.colors[key] || '#333',
                        border: '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      <span style={{
                        position: 'absolute', inset: 0, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        opacity: 0.5,
                      }}><IconEdit size={12} /></span>
                    </div>
                    <input
                      ref={cpRefs[key]} type="color"
                      value={tokens.colors[key] || '#000000'}
                      onChange={e => setColor(key, e.target.value)}
                      style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
                    />
                    <div style={{ fontSize: 9, color: 'var(--text-3)', textAlign: 'center', maxWidth: 52, lineHeight: 1.3 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Typography — read-only font display */}
            <div style={{ flex: 1, padding: '16px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 14 }}>Typography</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Primary font */}
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 6 }}>
                    Display / Headlines
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                    {tokens.typography.headlines?.font || 'Inter'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
                    Aa Bb Cc 123
                  </div>
                </div>
                {/* Body font — only show if different */}
                {tokens.typography.body?.font && tokens.typography.body.font !== tokens.typography.headlines?.font && (
                  <div>
                    <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 6 }}>
                      Body
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-2)', lineHeight: 1.2 }}>
                      {tokens.typography.body.font}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // ── Root render ────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* Zone 1 — Header */}
      <div style={{ padding: '28px 40px 0', flexShrink: 0 }}>
        <div className="eyebrow">Add Design Direction</div>
      </div>

      {/* Zone 2 — Tab Bar */}
      <div style={{ padding: '16px 40px 0', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {TABS.map((tab, i) => (
            <button
              key={i}
              onClick={() => handleSetActiveTab(i)}
              style={{
                padding: '8px 16px',
                background: 'transparent', border: 'none',
                borderBottom: activeTab === i ? '2px solid var(--accent)' : '2px solid transparent',
                color: activeTab === i ? 'var(--text)' : 'var(--text-3)',
                fontWeight: activeTab === i ? 700 : 400,
                fontSize: 12, cursor: 'pointer',
                letterSpacing: '0.04em',
                transition: 'color 0.12s, border-color 0.12s',
                marginBottom: -1,
                position: 'relative',
              }}
            >
              {tab.label}
              {/* Badge showing saved theme count */}
              {i === 4 && savedThemes.length > 0 && (
                <span style={{
                  position: 'absolute', top: 4, right: 4,
                  fontSize: 8, fontWeight: 800,
                  background: 'var(--accent)', color: '#fff',
                  borderRadius: '999px', padding: '1px 5px', lineHeight: 1.5,
                }}>
                  {savedThemes.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Zone 3 — Content Area (scrollable) */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 40px' }}>
        {genError && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 12, color: '#ef4444' }}>
            {genError}
          </div>
        )}

        {renderTabInput()}

        {/* Preview panel — shown when tokens are loaded (not on Saved Themes tab) */}
        {previewReady && activeTab !== 4 && renderPreviewPanel()}
      </div>

      {/* Zone 4 — Footer (sticky) */}
      <div style={{
        flexShrink: 0, borderTop: '1px solid var(--border)',
        background: 'var(--bg-card)', padding: '14px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            onClick={() => setLightDark(v => !v)}
            style={{
              width: 36, height: 20, borderRadius: 10, position: 'relative', cursor: 'pointer',
              background: lightDark ? 'var(--accent)' : 'var(--border-md)',
              transition: 'background 0.2s',
            }}
          >
            <div style={{
              position: 'absolute', top: 2, left: lightDark ? 18 : 2,
              width: 16, height: 16, borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: lightDark ? 'var(--text)' : 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Create Light + Dark Mode
          </span>
        </div>

        <button
          className="btn btn-primary btn-lg"
          onClick={handleConfirm}
          disabled={!previewReady || saving}
          style={{ opacity: previewReady ? 1 : 0.4, pointerEvents: previewReady ? 'auto' : 'none' }}
        >
          {saving ? 'Saving…' : 'Confirm and Build →'}
        </button>
      </div>
    </div>
  );
}
