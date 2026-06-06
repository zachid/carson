import { useState, useEffect, useRef } from 'react';
import useProjectStore from '../../store/projectStore.js';
import api from '../../api/client.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const RANDOM_NAMES = [
  'Onyx', 'Vanta', 'Chalk', 'Obsidian', 'Dusk', 'Slate', 'Carbon', 'Void',
  'Ember', 'Mist', 'Storm', 'Ash', 'Frost', 'Nova', 'Flux', 'Moor', 'Coda',
  'Lumen', 'Helix', 'Quartz', 'Basalt', 'Crest', 'Prism', 'Sable',
];
const randomName = () => RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];

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
};

function hexToRgba(hex, alpha) {
  if (!hex?.startsWith('#') || hex.length < 7) return `rgba(128,128,128,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Shift a hex colour toward white (positive) or black (negative)
function hexShift(hex, amount) {
  if (!hex?.startsWith('#') || hex.length < 7) return hex;
  const clamp = v => Math.min(255, Math.max(0, v));
  const r = clamp(parseInt(hex.slice(1, 3), 16) + amount);
  const g = clamp(parseInt(hex.slice(3, 5), 16) + amount);
  const b = clamp(parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

function buildDesignSystemMd(tokens) {
  const { name = 'Custom', colors: c = {}, typography: t = {} } = tokens;
  const bg   = c.background || '#111110';
  const bgc  = c.bgCard     || '#1A1A19';
  const bdr  = c.border     || '#252523';
  const txt  = c.text       || '#F4F3EF';
  const acc1 = c.accent01   || '#8B5CF6';
  const acc2 = c.accent02   || '#06B6D4';
  const font = t.headlines?.font || 'Inter';

  // Derived tokens
  const bgHover  = hexShift(bgc,  6);
  const bdrMd    = hexShift(bdr, 12);
  const bdrHi    = hexShift(bdr, 30);
  const txt2     = hexToRgba(txt, 0.55);
  const txt3     = hexToRgba(txt, 0.28);

  // Light mode — invert the dark surfaces, keep accents close
  const bgLight     = hexShift(txt,  10);   // near-white from text colour
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

  return `# Design System
**${name} · v1.0**
Replace this file to change the visual language of the entire project.

---

## Identity
| | |
|---|---|
| Typeface | ${font} |
| Primary accent | \`${acc1}\` dark · \`${acc1Light}\` light |
| Secondary accent | \`${acc2}\` dark · \`${acc2Light}\` light — use sparingly |
| Border radius | \`0px\` everywhere |
| Radius exception | \`999px\` — badges and tags only |
| Mode | Dark-first. Light via \`body.light\` |
| Shadows | None — depth through borders and layering only |

---

## Tokens

\`\`\`css
/* Dark (default) */
:root {
  --bg:        ${bg};
  --bg-card:   ${bgc};
  --bg-hover:  ${bgHover};
  --border:    ${bdr};
  --border-md: ${bdrMd};
  --border-hi: ${bdrHi};
  --text:      ${txt};
  --text-2:    ${txt2};
  --text-3:    ${txt3};
  --accent:    ${acc1};
  --accent-2:  ${acc2};
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

**Functional** (both modes)

| | |
|---|---|
| Success | \`#10B981\` |
| Danger  | \`#EF4444\` · hover \`#DC2626\` |

---

## Typography

Font import:
\`\`\`html
<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@300;400;600;700;800&display=swap" rel="stylesheet">
\`\`\`

| Role | Size | Weight | Letter-spacing | Line-height | Color |
|---|---|---|---|---|---|
| Display / Hero H1 | \`clamp(2.75rem, 5vw, 4rem)\` | ${t.headlines?.weight || '800'} | \`-0.03em\` | 1.1 | \`var(--text)\` |
| Title / H2 | \`clamp(1.75rem, 3vw, 2.5rem)\` | ${t.sub?.weight || '700'} | \`-0.02em\` | 1.15 | \`var(--text)\` |
| Card name | \`18px\` | ${t.sub?.weight || '700'} | \`-0.02em\` | — | \`var(--text)\` |
| Body | \`16px\` | ${t.body?.weight || '400'} | — | 1.65 | \`var(--text)\` |
| Secondary | \`14px\` | ${t.body?.weight || '400'} | — | 1.60 | \`var(--text-2)\` |
| Caption | \`13px\` | ${t.captions?.weight || '400'} | — | 1.55 | \`var(--text-2)\` |
| Label | \`11px uppercase\` | 700 | \`0.10em\` | — | \`var(--text-2)\` |
| Eyebrow | \`10px uppercase\` | 700 | \`0.16em\` | — | \`var(--accent)\` |

---

## Spacing

4px base unit. All values are multiples of 4.

| Token | px |
|---|---|
| --sp-1 | 4 |
| --sp-2 | 8 |
| --sp-3 | 12 |
| --sp-4 | 16 |
| --sp-6 | 24 |
| --sp-8 | 32 |
| --sp-10 | 40 |
| --sp-12 | 48 |
| --sp-16 | 64 |
| --sp-20 | 80 |

---

## Components

### Buttons
\`border-radius: 0\` · height \`36px\` · ${font} 700 · 10px uppercase · ls 0.10em

\`\`\`css
.btn-primary { background: var(--accent); border: 1px solid var(--accent); color: #fff; }
.btn-primary:hover { opacity: 0.88; }

.btn-ghost { background: transparent; border: 1px solid var(--border-md); color: var(--text-2); }
.btn-ghost:hover { border-color: var(--border-hi); color: var(--text); }

.btn-danger { background: #EF4444; border: 1px solid #EF4444; color: #fff; }
.btn-danger:hover { background: #DC2626; border-color: #DC2626; }

.btn-lg { height: 44px; padding: 0 24px; font-size: 11px; }
\`\`\`

### Badges
\`border-radius: 999px\` · 10px/700 uppercase · padding \`2px 10px\`

\`\`\`css
.badge-do   { background: rgba(16,185,129,0.10); color: #10B981; border: 1px solid rgba(16,185,129,0.20); }
.badge-dont { background: rgba(239,68,68,0.10);  color: #EF4444; border: 1px solid rgba(239,68,68,0.20); }
.badge-new  { background: rgba(139,92,246,0.10); color: var(--accent); border: 1px solid rgba(139,92,246,0.20); }
\`\`\`

### Cards
\`border-radius: 0\` · \`border: 1px solid var(--border-md)\` · no shadow

\`\`\`css
.card { background: var(--bg-card); border: 1px solid var(--border-md); transition: background 0.12s; }
.card:hover { background: var(--bg-hover); }
.card-band { height: 3px; background: var(--accent); }
\`\`\`

### Inputs
\`border-radius: 0\` · padding \`10px 12px\` · font-size \`13px\`

\`\`\`css
.input { background: var(--bg); border: 1px solid var(--border-md); color: var(--text); font-family: '${font}', sans-serif; }
.input:focus { border-color: var(--accent); outline: none; }
.input::placeholder { color: var(--text-3); }
\`\`\`

### Grid
\`\`\`css
.grid { display: grid; gap: 1px; background: var(--border-md); border: 1px solid var(--border-md); }
.grid-cell { background: var(--bg-card); padding: 24px 20px; }
.grid-cell:hover { background: var(--bg-hover); }
\`\`\`

---

## Motion

| Speed | Duration | Use |
|---|---|---|
| Fast | 80ms | Icon hovers, micro state changes |
| Normal | 150ms | Buttons, inputs, nav |
| Slow | 300ms | Panels, overlays, cards |

\`\`\`css
transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
\`\`\`

---

## Layout

| | |
|---|---|
| Max width | 1200px |
| Section padding | \`80px 48px\` desktop · \`48px 20px\` mobile |
| Header height | 56px |
| Mobile breakpoint | 768px |

---

## Rules

1. Use only CSS variables from Tokens — no hardcoded colors
2. ${font} typeface only — load via Google Fonts CDN
3. Dark-first — always implement both modes
4. No shadows anywhere
5. 4px grid — all spacing is a multiple of 4
6. Zero border-radius on block elements — 999px on badges/tags only
7. \`--accent\` is primary · \`--accent-2\` is secondary, use sparingly
8. Functional colors for semantic states only
9. Eyebrows always in \`--accent\`
10. Motion is subtle — 80–300ms, ease, color/border/opacity only
`;
}

function parseMdTokens(md) {
  const colors = {};
  const re = /--(bg|bg-card|border|text|accent|accent-2)(?![\w-]):\s*(#[0-9a-fA-F]{3,8})/g;
  const map = { 'bg': 'background', 'bg-card': 'bgCard', 'border': 'border', 'text': 'text', 'accent': 'accent01', 'accent-2': 'accent02' };
  let m;
  while ((m = re.exec(md)) !== null) {
    if (map[m[1]] && !colors[map[m[1]]]) colors[map[m[1]]] = m[2];
  }
  const fontM = md.match(/\|\s*Typeface\s*\|\s*([^|\n]+)/i);
  const font = fontM ? fontM[1].trim().split(/[\s,(]/)[0] : 'Inter';
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

// ── Sub-components ─────────────────────────────────────────────────────────────

const TABS = [
  { label: 'Classic Mode' },
  { label: 'Add a Site URL' },
  { label: 'Upload an Image' },
  { label: 'Upload Design.md' },
];

const SWATCH_KEYS = [
  { key: 'background', label: 'Background' },
  { key: 'bgCard',     label: 'Bg Card'    },
  { key: 'border',     label: 'Border'     },
  { key: 'text',       label: 'Text'       },
  { key: 'accent01',   label: 'Accent 01'  },
  { key: 'accent02',   label: 'Accent 02'  },
];

const TYPO_ROWS = ['headlines', 'sub', 'body', 'captions'];

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
  const [panelTab,     setPanelTab]     = useState(0); // 0 = visual, 1 = markdown

  // Per-tab state
  const [refUrl,      setRefUrl]      = useState('');
  const [imageFile,   setImageFile]   = useState(null);
  const [imagePreview,setImagePreview]= useState('');
  const [dragOver,    setDragOver]    = useState(false);
  const [mdError,     setMdError]     = useState('');

  // Color picker refs — one per swatch
  const cpBg     = useRef(null); const cpBgCard = useRef(null);
  const cpBorder = useRef(null); const cpText   = useRef(null);
  const cpAcc1   = useRef(null); const cpAcc2   = useRef(null);
  const cpRefs   = { background: cpBg, bgCard: cpBgCard, border: cpBorder, text: cpText, accent01: cpAcc1, accent02: cpAcc2 };

  const imageInputRef = useRef(null);
  const mdInputRef    = useRef(null);

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

  const setTypo = (role, field, value) =>
    setTokens(prev => ({ ...prev, typography: { ...prev.typography, [role]: { ...prev.typography[role], [field]: value } } }));

  const applyTokens = (t) => { setTokens(t); setPreviewReady(true); setGenError(''); };

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

  // ── Render helpers ─────────────────────────────────────────────────────────

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
            <button className="btn btn-ghost" onClick={handleClassic} disabled={generating} style={{ fontSize: 11 }}>
              {generating ? '● Regenerating…' : '↺ Regenerate from brand audit'}
            </button>
          </div>
        );

      // ── Tab 1: URL Reference ─────────────────────────────────────────────
      case 1:
        return (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input" type="url" placeholder="ADD URL…"
                value={refUrl} onChange={e => setRefUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUrlGenerate()}
                style={{ flex: 1 }}
              />
              <button className="btn btn-ghost" onClick={handleUrlGenerate} disabled={generating || !refUrl.trim()}>
                {generating ? '● Generating…' : 'GENERATE STYLE'}
              </button>
            </div>
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
                <div style={{ fontSize: 20, marginBottom: 8, opacity: 0.4 }}>↑</div>
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
                    <button className="btn btn-ghost" onClick={() => { setImageFile(null); setImagePreview(''); }} style={{ fontSize: 11 }}>
                      ✕ Remove
                    </button>
                  </div>
                </div>
              </div>
            )}
            <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleImageFile(e.target.files[0])} />
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

      default: return null;
    }
  };

  // ── Design System Preview Panel ────────────────────────────────────────────
  const renderPreviewPanel = () => (
    <div style={{ border: '1px solid var(--border-md)', background: 'var(--bg-card)' }}>
      {/* Panel header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', borderBottom: '1px solid var(--border)',
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex' }}>
          {['Design System', 'Markdown'].map((label, i) => (
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
        <button className="btn btn-ghost" style={{ height: 26, padding: '0 10px', fontSize: 9 }}
          onClick={() => downloadMd(buildDesignSystemMd(tokens), `${tokens.name || 'design-system'}.md`)}>
          ↓ Download .md
        </button>
      </div>

      {/* ── Markdown view ── */}
      {panelTab === 1 && (
        <textarea
          readOnly
          value={buildDesignSystemMd(tokens)}
          style={{
            width: '100%', minHeight: 360, padding: 20,
            background: 'var(--bg)', color: 'var(--text-2)',
            fontFamily: 'monospace', fontSize: 11, lineHeight: 1.7,
            border: 'none', resize: 'vertical',
          }}
        />
      )}

      {/* ── Visual view ── */}
      {panelTab === 0 && <>
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
                {/* Swatch + pencil */}
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
                    fontSize: 12, opacity: 0.5,
                  }}>✏</span>
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

        {/* Typography */}
        <div style={{ flex: 1, padding: '16px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 14 }}>Typography</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TYPO_ROWS.map(role => (
              <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', width: 64, flexShrink: 0 }}>{role}</span>
                <input
                  className="input"
                  value={tokens.typography[role]?.font || ''}
                  onChange={e => setTypo(role, 'font', e.target.value)}
                  placeholder="Font"
                  style={{ width: 110, flexShrink: 0, height: 26, fontSize: 11, fontWeight: 700 }}
                />
                <span style={{ fontSize: 10, color: 'var(--text-2)', letterSpacing: '0.12em', width: 44, flexShrink: 0, textAlign: 'center' }}>ABCDE</span>
                <input
                  className="input"
                  value={tokens.typography[role]?.weight || ''}
                  onChange={e => setTypo(role, 'weight', e.target.value)}
                  placeholder="Wt"
                  style={{ width: 48, flexShrink: 0, height: 26, fontSize: 11, textAlign: 'center' }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      </>}
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
              onClick={() => setActiveTab(i)}
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
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Zone 3 — Content Area (scrollable) */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 40px' }}>
        {/* Error */}
        {genError && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 12, color: '#ef4444' }}>
            {genError}
          </div>
        )}

        {/* Tab-specific input area */}
        {renderTabInput()}

        {/* Design System Preview Panel — shared, persists across tabs */}
        {previewReady && renderPreviewPanel()}
      </div>

      {/* Zone 4 — Footer (sticky) */}
      <div style={{
        flexShrink: 0, borderTop: '1px solid var(--border)',
        background: 'var(--bg-card)', padding: '14px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Light+dark toggle */}
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

        {/* Confirm */}
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
