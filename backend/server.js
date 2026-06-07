import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
const __rootdir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(__rootdir, '.env'), override: true });
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';

import projectRoutes from './routes/projects.js';
import stageRoutes from './routes/stages.js';
import exportRoutes from './routes/export.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({
  origin: (origin, cb) => cb(null, true), // allow all origins; tighten after deploy
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:id/stages', stageRoutes);
app.use('/api/projects/:id', stageRoutes);
app.use('/api/projects/:id/export', exportRoutes);

// Upload reference images for Stage 04.5 — analyze with vision via FAL OpenRouter
app.post('/api/projects/:id/analyze-images', upload.array('images', 10), async (req, res) => {
  const { callModel } = await import('./services/claude.js');
  try {
    const imageContent = req.files.map(f => ({
      type: 'image_url',
      image_url: { url: `data:${f.mimetype};base64,${f.buffer.toString('base64')}` },
    }));

    const notes = await callModel([{
      role: 'user',
      content: [
        ...imageContent,
        { type: 'text', text: 'Analyze these reference images for visual design direction. Extract: color palette, typography feel, layout patterns, spacing density, visual style (minimal/dense/editorial/corporate), mood, and any distinctive design elements. Format as structured notes for a designer.' },
      ],
    }], 'google/gemini-flash-1.5');

    res.json({ notes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Token extraction helper ────────────────────────────────────────────────────
const TOKEN_SCHEMA = `Return ONLY a valid JSON object — no explanation, no markdown, no code fences:
{
  "name": "2-3 word evocative name (e.g. 'Carbon Wave', 'Ivory Stack')",
  "colors": {
    "background": "#hex — main page background",
    "bgCard":     "#hex — card/panel surface, slightly lighter than bg",
    "border":     "#hex — subtle divider/border",
    "text":       "#hex — primary text, high contrast on bg",
    "accent01":   "#hex — primary CTA/highlight color",
    "accent02":   "#hex — secondary accent, different hue"
  },
  "typography": {
    "headlines": { "font": "Google Fonts name", "weight": "800" },
    "sub":       { "font": "Google Fonts name", "weight": "600" },
    "body":      { "font": "Google Fonts name", "weight": "400" },
    "captions":  { "font": "Google Fonts name", "weight": "300" }
  },
  "layout": {
    "borderRadius": "one of: 0px | 4px | 8px | 12px | 20px | 999px — dominant radius of UI elements",
    "shadowStyle":  "one of: none | subtle | prominent",
    "heroPattern":  "one of: centered | left-text-right-media | right-text-left-media | full-width | split-equal",
    "sectionSpacing": "one of: compact | balanced | airy",
    "cardStyle":    "one of: flat | bordered | shadow | elevated | glass",
    "navStyle":     "one of: minimal | standard | prominent | transparent-blur",
    "personality":  "one of: minimal | bold | editorial | technical | corporate | playful | luxury",
    "sections":     ["ordered list of page section ids, e.g.: hero, trust-strip, features-grid, features-dark, use-cases, testimonials, pricing, cta, faq, footer"]
  }
}`;

async function extractTokens(messages, model) {
  const { callModel } = await import('./services/claude.js');
  const raw = await callModel(messages, model);
  const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
  return JSON.parse(cleaned);
}

// Classic Mode — generate design system from brand audit
app.post('/api/projects/:id/direction/generate-classic', async (req, res) => {
  try {
    const { db } = await import('./db/db.js');
    const stageDoc = await db.collection('projects').doc(req.params.id)
      .collection('stages').doc('2').get();
    const brandAudit = stageDoc.exists ? stageDoc.data().output || '' : '';
    if (!brandAudit) return res.status(400).json({ error: 'Stage 02 (Brand Audit) not complete yet' });

    const tokens = await extractTokens([{
      role: 'user',
      content: `You are a senior brand designer. Based on this brand audit, create a fitting design system — colors and typography that authentically represent this brand's personality, audience, and values.

BRAND AUDIT:
${brandAudit}

${TOKEN_SCHEMA}`,
    }]);
    res.json({ tokens });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// URL Reference — Firecrawl scrape → extract tokens
app.post('/api/projects/:id/direction/generate-url', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const { scrapeWithFirecrawl } = await import('./services/scraper.js');
    const content = await scrapeWithFirecrawl(url);
    const tokens = await extractTokens([{
      role: 'user',
      content: `You are a senior brand designer extracting a design system from a real website.

REFERENCE SITE: ${url}

The scraped content below includes a "Hex Colors Extracted From Page CSS/HTML" section — USE THOSE HEX VALUES DIRECTLY when assigning colors. Do not invent or approximate colors; prioritize the extracted hex codes.

For typography, identify the heading and body font from the content (Google Fonts names preferred). If you cannot determine the exact font, use a close match.

${content}

${TOKEN_SCHEMA}`,
    }]);
    res.json({ tokens });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Image Reference — Claude vision → extract tokens
app.post('/api/projects/:id/direction/generate-image', upload.array('images', 5), async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'No images provided' });
  try {
    const { callModel } = await import('./services/claude.js');
    const imageContent = req.files.map(f => ({
      type: 'image_url',
      image_url: { url: `data:${f.mimetype};base64,${f.buffer.toString('base64')}` },
    }));
    const raw = await callModel([{
      role: 'user',
      content: [
        ...imageContent,
        { type: 'text', text: `Analyze these reference images and extract their visual design language as a design system.
Extract real colors visible in the images and identify the typography style.

${TOKEN_SCHEMA}` },
      ],
    }], 'google/gemini-flash-1.5');
    const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    res.json({ tokens: JSON.parse(cleaned) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Scrape reference URLs for Stage 04.5 — uses Firecrawl for rich markdown
app.post('/api/scrape-reference', async (req, res) => {
  const { urls } = req.body;
  if (!urls?.length) return res.json({ notes: '' });

  const { scrapeWithFirecrawl } = await import('./services/scraper.js');
  const { callModel } = await import('./services/claude.js');

  try {
    const scraped = await Promise.all(
      urls.map(u => scrapeWithFirecrawl(u).catch(e => `Failed to scrape ${u}: ${e.message}`))
    );
    const combined = scraped
      .map((c, i) => `## Reference site ${i + 1}: ${urls[i]}\n\n${c}`)
      .join('\n\n---\n\n');

    const notes = await callModel([{
      role: 'user',
      content: `You are a senior brand and visual design analyst. Analyze the following reference website content and extract a detailed visual + brand profile.

Extract and structure the following:

**Colors**
- Background color(s) — approximate hex or description
- Primary text color
- Accent / CTA color(s)
- Secondary colors or gradients

**Typography**
- Heading font family and weight
- Body font family and weight
- Font size feel (large/medium/small, editorial/functional)
- Letter-spacing and line-height character

**Layout & Spacing**
- Overall density (airy / balanced / dense)
- Grid structure (centered narrow / full-width / asymmetric)
- Section padding character

**Visual Style**
- Design aesthetic (minimal / bold / editorial / corporate / playful / luxury / technical)
- Use of imagery (photography / illustration / icons / none)
- Motion / animation presence
- Border radius style (sharp / subtle / rounded)
- Shadow usage

**Tone of Voice**
- Communication style (formal / conversational / technical / inspiring)
- Key messaging themes
- CTA language style

**Brand Attributes**
- 5 adjectives that describe the brand
- Target audience impression

Format as structured markdown notes a designer can use directly as visual direction.

---

${combined}`,
    }]);

    res.json({ notes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate a DESIGN_SYSTEM.md from uploaded reference images
app.post('/api/generate-designsystem-from-image', upload.array('images', 10), async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'No images provided' });
  const { callModel } = await import('./services/claude.js');
  try {
    const imageContent = req.files.map(f => ({
      type: 'image_url',
      image_url: { url: `data:${f.mimetype};base64,${f.buffer.toString('base64')}` },
    }));
    const content = await callModel([{
      role: 'user',
      content: [
        ...imageContent,
        { type: 'text', text: `You are a senior design systems engineer. Analyze these reference images and reverse-engineer a complete DESIGN_SYSTEM.md that captures their exact visual language.

Extract real values — colors, fonts, spacing, border radii, button styles, typography hierarchy — and define them as CSS custom properties and component rules.

Use EXACTLY this structure:

# Design System
**[Brand Name derived from images] · v1.0**
Replace this file to change the visual language of the entire project.

---

## Identity
| | |
|---|---|
| Typeface | [font name] ([weights]) |
| Primary accent | \`#hex\` dark · \`#hex\` light |
| Secondary accent | \`#hex\` dark · \`#hex\` light — use sparingly |
| Border radius | [value] everywhere |
| Radius exception | [value] — badges and tags only |
| Mode | Dark-first. Light via \`body.light\` |
| Shadows | [none/describe] |

---

## Tokens

\`\`\`css
/* Dark (default) */
:root {
  --bg: #hex;
  --bg-card: #hex;
  --bg-hover: #hex;
  --border: #hex;
  --border-md: #hex;
  --border-hi: #hex;
  --text: #hex;
  --text-2: #hex;
  --text-3: #hex;
  --accent: #hex;
  --accent-2: #hex;
}

/* Light */
body.light {
  /* light mode overrides */
}
\`\`\`

## Typography
[table with role, size, weight, letter-spacing, line-height, color]

## Spacing
[4px base unit table]

## Components
[buttons, badges, cards, inputs — with exact CSS]

## Rules
[numbered list of design rules]

Return ONLY the markdown. No explanation.` },
      ],
    }], 'google/gemini-flash-1.5');
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate a DESIGN_SYSTEM.md from a reference URL
app.post('/api/generate-designsystem', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  const { scrapeWithFirecrawl } = await import('./services/scraper.js');
  const { callModel } = await import('./services/claude.js');

  try {
    const scrapedContent = await scrapeWithFirecrawl(url);

    const content = await callModel([{
      role: 'user',
      content: `You are a senior design systems engineer. Analyze this website's visual design and reverse-engineer a complete DESIGN_SYSTEM.md file that captures its exact design language.

Extract real values from the page content — colors, fonts, spacing patterns, border radii, button styles, typography hierarchy — and define them as CSS custom properties and component rules.

Use EXACTLY this structure and format:

# Design System
**[Brand Name] · v1.0**
Replace this file to change the visual language of the entire project.

---

## Identity
| | |
|---|---|
| Typeface | [font name] ([weights]) |
| Primary accent | \`#hex\` dark · \`#hex\` light |
| Secondary accent | \`#hex\` dark · \`#hex\` light — use sparingly |
| Border radius | [value] everywhere |
| Radius exception | [value] — badges and tags only |
| Mode | Dark-first. Light via \`body.light\` |
| Shadows | [none/describe] |

---

## Tokens

\`\`\`css
/* Dark (default) */
:root {
  --bg: #hex;
  --bg-card: #hex;
  --bg-hover: #hex;
  --border: #hex;
  --border-md: #hex;
  --border-hi: #hex;
  --text: #hex;
  --text-2: #hex;
  --text-3: #hex;
  --accent: #hex;
  --accent-2: #hex;
}

/* Light */
body.light {
  /* light mode overrides */
}
\`\`\`

## Typography
[table with role, size, weight, letter-spacing, line-height, color]

## Spacing
[4px base unit table]

## Components
[buttons, badges, cards, inputs, grid — with exact CSS]

## Motion
[timing table + transition declaration]

## Layout
[max-width, section padding, header height, breakpoints]

## Rules
[numbered list of design rules]

---

Website content from ${url}:
${scrapedContent}

Return ONLY the markdown content. No explanation.`,
    }]);

    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Generate scaffold wireframe HTML from layout tokens ───────────────────────
app.post('/api/projects/:id/direction/generate-scaffold', async (req, res) => {
  const { tokens } = req.body;
  if (!tokens) return res.status(400).json({ error: 'tokens required' });

  const brandName = tokens.name || 'Site';
  const layout = tokens.layout || {};
  const sections = Array.isArray(layout.sections) && layout.sections.length
    ? layout.sections
    : ['hero', 'features', 'cta', 'faq', 'footer'];

  const heroPattern    = layout.heroPattern    || 'centered';
  const borderRadius   = layout.borderRadius   || '0px';
  const shadowStyle    = layout.shadowStyle    || 'none';
  const sectionSpacing = layout.sectionSpacing || 'balanced';
  const cardStyle      = layout.cardStyle      || 'bordered';
  const navStyle       = layout.navStyle       || 'minimal';
  const personality    = layout.personality    || 'minimal';

  const sectionGuide = sections.map((s, i) => `Section ${String(i + 1).padStart(2, '0')}: ${s}`).join('\n');

  try {
    const { callModel } = await import('./services/claude.js');
    const html = await callModel([{ role: 'user', content: `
Generate a complete grayscale visual wireframe HTML for "${brandName}".

LAYOUT PROFILE:
- Hero pattern: ${heroPattern}
- Border radius: ${borderRadius}
- Shadow style: ${shadowStyle}
- Section spacing: ${sectionSpacing}
- Card style: ${cardStyle}
- Nav style: ${navStyle}
- Visual personality: ${personality}

SECTIONS TO RENDER IN ORDER:
${sectionGuide}

WIREFRAME STYLE RULES (follow exactly):
CSS vars: --bg:#e8e8e8; --page:#f7f7f7; --ink:#111; --muted:#6a6a6a; --line:#b9b9b9; --line-strong:#777; --fill-white:#fff; --fill-light:#eee; --fill-mid:#d8d8d8; --fill-dark:#1c1c1c; --fill-deep:#050505;

body background: 40×40 grid lines (rgba(0,0,0,0.045)) on --bg.
.page-frame: white page container, max 1500px, centered.
.wire-box: border:1px dashed var(--line-strong); background:var(--fill-white); font-family:monospace; font-size:12px; color:var(--muted); display:flex; align-items:center; justify-content:center;
.wire-box::before: content:attr(data-label); position:absolute; top:6px; left:8px; font-size:9px; text-transform:uppercase; letter-spacing:0.04em; color:#8a8a8a;
.wire-box.wire-dark: background:var(--fill-dark); color:#cfcfcf; border-color:#676767;
.section-note: monospace 11px muted label with horizontal rules left+right, section number + name + proportion note.
.section: padding based on sectionSpacing — compact:48px, balanced:80px, airy:120px — all sections border-bottom:1px solid var(--line).

HERO PATTERN RULES:
- centered: large centered h1 box, sub-copy box, cta-row centered
- left-text-right-media: 2-col grid ~45/55, copy stack left, large dashed media right
- right-text-left-media: 2-col grid ~55/45, large dashed media left, copy stack right
- full-width: full-width h1 spanning page, media below
- split-equal: 2-col 50/50, both sides content

CARD/GRID PATTERN RULES:
- features-grid → 3-col equal cards or 2-col bento depending on personality
- features-dark → dark background section
- trust-strip → compact logo row
- use-cases → 3-col use-case cards with icon + title + body + media
- testimonials → quote cards row
- pricing → 2 or 3-col pricing panels
- cta → large centered conversion panel
- faq → 2-col, left heading + right accordion list
- footer → dark bg, logo + 3-col link grid

BORDER RADIUS: apply ${borderRadius} to buttons and cards (wire-box elements); if 0px use sharp corners everywhere.
SHADOW: if "none" use border-only depth; if "subtle" add box-shadow:0 2px 8px rgba(0,0,0,0.08); if "prominent" add box-shadow:0 8px 32px rgba(0,0,0,0.16).

Output the annotation panel (fixed bottom-right, 300px, white, mono 11px) explaining wireframe conventions.

Return ONLY the complete raw HTML document — no explanation, no markdown fences, no preamble.
    ` }]);

    res.json({ html });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Parse uploaded content file (PDF / DOCX / MD / TXT) ──────────────────────
app.post('/api/parse-content', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  const { mimetype, buffer, originalname } = req.file;
  const name = (originalname || '').toLowerCase();

  try {
    let text = '';

    if (mimetype === 'application/pdf' || name.endsWith('.pdf')) {
      // pdf-parse ESM-safe dynamic import
      const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
      const result = await pdfParse(buffer);
      text = result.text;
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      name.endsWith('.docx')
    ) {
      const mammoth = (await import('mammoth')).default;
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      // .md / .txt / .doc — read as UTF-8 text
      text = buffer.toString('utf8');
    }

    // Trim whitespace runs, cap at 40 000 chars so it fits in context
    text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 40000);
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: `Parse failed: ${err.message}` });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Carson backend running on :${PORT}`));

export default app;
