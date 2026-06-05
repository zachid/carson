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

// Scrape reference URLs for Stage 04.5
app.post('/api/scrape-reference', async (req, res) => {
  const { urls } = req.body;
  if (!urls?.length) return res.json({ notes: '' });

  const { scrapeUrl } = await import('./services/scraper.js');
  const { callModel } = await import('./services/claude.js');

  try {
    const scraped = await Promise.all(urls.map(u => scrapeUrl(u).catch(() => `Failed to scrape ${u}`)));
    const combined = scraped.map((c, i) => `Reference site ${i + 1} (${urls[i]}):\n${c}`).join('\n\n---\n\n');

    const notes = await callModel([{
      role: 'user',
      content: `Analyze these reference websites for visual design patterns. Extract: layout structure, visual style, spacing, typography choices, color use, UI patterns, and overall aesthetic. Format as structured design notes.\n\n${combined}`,
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

  const { scrapeUrl } = await import('./services/scraper.js');
  const { callModel } = await import('./services/claude.js');

  try {
    const scrapedContent = await scrapeUrl(url);

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Carson backend running on :${PORT}`));

export default app;
