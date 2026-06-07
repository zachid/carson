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

// URL Reference — screenshot vision (primary) or text fallback → extract tokens
app.post('/api/projects/:id/direction/generate-url', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const { scrapeForDesignAnalysis } = await import('./services/scraper.js');
    const { text, screenshotBase64, hexColors } = await scrapeForDesignAnalysis(url);
    const { callModel } = await import('./services/claude.js');

    let raw;

    if (screenshotBase64) {
      // ── Vision path: Claude reads actual pixels ───────────────────────────
      const colorHint = hexColors.length
        ? `\nCSS hex colors found in page source (use these exact values when they match what you see): ${hexColors.join(', ')}`
        : '';
      raw = await callModel([{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/png;base64,${screenshotBase64}` } },
          { type: 'text', text:
`You are a senior brand designer. Analyze this SCREENSHOT of ${url}.

Read the EXACT colors, fonts, radius, spacing, and layout structure directly from the pixels — do not guess.
${colorHint}

${TOKEN_SCHEMA}` },
        ],
      }], 'google/gemini-flash-1.5');
    } else {
      // ── Text fallback: use HTML hex colors + markdown ─────────────────────
      const colorSection = hexColors.length
        ? `\n\n## Hex Colors Extracted From Page CSS\n${hexColors.join(', ')}`
        : '';
      raw = await callModel([{
        role: 'user',
        content: `Extract design tokens from this site. Prioritize the CSS hex colors section for actual color values.

SITE: ${url}
${text}${colorSection}

${TOKEN_SCHEMA}`,
      }]);
    }

    const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    res.json({ tokens: JSON.parse(cleaned) });
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

// ── Generate layout structure spec (text) from layout tokens ─────────────────
// Returns a structured text document listing sections, patterns, proportions,
// alignments and spacing — no visual wireframe HTML, for accuracy.
app.post('/api/projects/:id/direction/generate-scaffold', async (req, res) => {
  const { tokens } = req.body;
  if (!tokens) return res.status(400).json({ error: 'tokens required' });

  const brandName      = tokens.name || 'Site';
  const layout         = tokens.layout || {};
  const sections       = Array.isArray(layout.sections) && layout.sections.length
    ? layout.sections : ['hero', 'features', 'cta', 'faq', 'footer'];
  const heroPattern    = layout.heroPattern    || 'centered';
  const borderRadius   = layout.borderRadius   || '0px';
  const shadowStyle    = layout.shadowStyle    || 'none';
  const sectionSpacing = layout.sectionSpacing || 'balanced';
  const cardStyle      = layout.cardStyle      || 'bordered';
  const navStyle       = layout.navStyle       || 'minimal';
  const personality    = layout.personality    || 'minimal';

  const sectionList = sections.map((s, i) => `${i + 1}. ${s}`).join('\n');

  try {
    const { callModel } = await import('./services/claude.js');
    const spec = await callModel([{ role: 'user', content:
`You are a senior UX architect. Write a precise layout structure specification for "${brandName}".

LAYOUT PROFILE EXTRACTED FROM REFERENCE:
- Hero pattern: ${heroPattern}
- Border radius: ${borderRadius}
- Shadow: ${shadowStyle}
- Section spacing: ${sectionSpacing}
- Card style: ${cardStyle}
- Nav style: ${navStyle}
- Visual personality: ${personality}

SECTIONS TO DOCUMENT (in order):
${sectionList}

Write the spec as a structured plain-text document. For each block use this exact format:

────────────────────────────────────
NAVIGATION
Pattern: [e.g. 3-col: Logo · Nav links · CTA buttons]
Height: [e.g. 64px]
Behavior: [e.g. sticky, transparent on scroll]
Alignment: [logo left / nav center / CTAs right]
Elements: [list each element with its size and position]
────────────────────────────────────

Then for each section:

────────────────────────────────────
SECTION [N] · [SECTION NAME IN CAPS]
Background: [canvas / subtle-tinted / dark / brand-color]
Height: [full-vh / tall ~80vh / medium ~50vh / natural / compact ~120px]
Layout pattern: [e.g. 2-col split: 45% copy / 55% media]
Padding: [e.g. 96px top / 80px bottom]
Alignment: [left / center / right]

Content blocks (top to bottom, left to right):
  - [Block name] — [size/proportion, e.g. "max-width 680px, centered"] — [alignment]
  - [Block name] — [size] — [alignment]
  ...

Grid (if applicable): [e.g. 3-col equal gap-20px / 2-col bento 1.1fr+0.9fr]
Card style: [bordered / shadow / flat / elevated] — [border-radius] — [padding e.g. 24px]
Notes: [any important layout behavior, overlaps, sticky elements, z-index, etc.]
────────────────────────────────────

Be specific with sizes and proportions. Use px or % or fr units. Do NOT describe colors or visual styling — this is structural only.

End with:
────────────────────────────────────
LAYOUT RULES
- [5-8 key layout rules derived from the profile]
────────────────────────────────────
` }]);

    res.json({ spec });
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
