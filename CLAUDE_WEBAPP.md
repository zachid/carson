# Carson · Web App
**Build instructions for Claude Code**

Build a full-stack web application for the Carson URL→Redesign pipeline.
The entire UI is built on `DESIGN_SYSTEM.md` (April). No other visual language.

---

## Stack

```
Frontend   React + Vite
Styling    CSS variables from DESIGN_SYSTEM.md — no Tailwind, no UI libraries
State      Zustand
Backend    Node.js + Express
Database   SQLite (via better-sqlite3) — simple, no setup
AI         Anthropic SDK → claude-sonnet-4-5
Export     Puppeteer → PDF + standalone HTML
```

---

## Folder Structure

```
carson-app/
├── CLAUDE_WEBAPP.md
├── DESIGN_SYSTEM.md
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── styles/
│       │   ├── tokens.css          ← all CSS vars from DESIGN_SYSTEM.md
│       │   └── global.css
│       ├── store/
│       │   └── projectStore.js     ← Zustand
│       ├── api/
│       │   └── client.js           ← axios wrapper
│       └── pages/
│           ├── Dashboard.jsx       ← project list
│           ├── Project.jsx         ← stage shell
│           └── stages/
│               ├── Stage01Input.jsx
│               ├── Stage02Audit.jsx
│               ├── Stage03Analysis.jsx
│               ├── Stage04Content.jsx
│               ├── Stage045Gate.jsx
│               ├── Stage05Design.jsx
│               └── Stage06Export.jsx
│
├── backend/
│   ├── server.js
│   ├── db/
│   │   ├── schema.sql
│   │   └── db.js
│   ├── routes/
│   │   ├── projects.js
│   │   ├── stages.js
│   │   └── export.js
│   └── services/
│       ├── claude.js               ← Anthropic SDK wrapper
│       ├── scraper.js              ← fetch + parse URL
│       └── exporter.js             ← Puppeteer PDF + HTML
│
└── .env
```

---

## Database Schema

```sql
-- projects
CREATE TABLE projects (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  url        TEXT NOT NULL,
  status     TEXT DEFAULT 'active',
  stage      INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- stages — one row per stage per project
CREATE TABLE stages (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  stage_num  INTEGER NOT NULL,
  status     TEXT DEFAULT 'pending',   -- pending | running | done
  output     TEXT,                     -- markdown content
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- design_direction — saved at Stage 04.5
CREATE TABLE design_direction (
  id              TEXT PRIMARY KEY,
  project_id      TEXT NOT NULL,
  design_system   TEXT,               -- contents of DESIGN_SYSTEM.md in use
  reference_urls  TEXT,               -- JSON array
  reference_notes TEXT,               -- extracted visual patterns
  brand_assets    TEXT,               -- notes on client assets
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

---

## API Routes

```
GET    /api/projects              → list all projects
POST   /api/projects              → create project { name, url }
GET    /api/projects/:id          → get project + all stages
DELETE /api/projects/:id          → delete project

POST   /api/projects/:id/run/:stage   → run a stage (calls Claude)
GET    /api/projects/:id/stages/:num  → get stage output

POST   /api/projects/:id/direction    → save design direction (Stage 04.5)
POST   /api/projects/:id/export       → generate HTML + PDF (Stage 06)
GET    /api/projects/:id/export/html  → download site.html
GET    /api/projects/:id/export/pdf   → download site.pdf
```

---

## Claude Service

`backend/services/claude.js`

```js
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DESIGN_SYSTEM = fs.readFileSync(
  path.join(process.cwd(), 'DESIGN_SYSTEM.md'), 'utf-8'
);

export async function runStage(stageNum, context) {
  const prompt = buildPrompt(stageNum, context);
  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-5',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }]
  });
  return stream;
}

function buildPrompt(stageNum, context) {
  const prompts = {
    1: stage01Prompt(context),
    2: stage02Prompt(context),
    3: stage03Prompt(context),
    4: stage04Prompt(context),
    5: stage05Prompt(context),
    6: stage06Prompt(context),
  };
  return prompts[stageNum];
}
```

Each stage prompt is a function that receives the project context (scraped content, previous stage outputs, design direction) and returns the full prompt string. Stage 05 prompt always includes the active `DESIGN_SYSTEM.md` content.

**Streaming**: pipe Claude's stream to the frontend via SSE (Server-Sent Events) so output appears word by word.

---

## Stage Prompts

### Stage 01 — Input
```
Fetch the following URL and extract:
- Full visible text content
- Page title and meta description
- Navigation links
- All CTA button/link text
- Footer links and content
- Any visible metrics, claims, or social proof

URL: {url}

Return as structured markdown.
```

### Stage 02 — Brand Audit
```
Based on this scraped website content, produce a structured brand audit.

Cover: company overview · mission/vision · brand promise · positioning ·
estimated audience · voice and tone · CTAs and KPIs · website type ·
visual style summary · strengths · weaknesses.

Content:
{stage01_output}
```

### Stage 03 — Homepage Formula Analysis
```
Score this homepage against the Perfect Homepage Formula.
For each section: exists? execution quality? what's missing?

1. 5-Second Hook
2. Problem Agitation
3. The Solution
4. Benefits & Workflow
5. Trust Signals
6. Audience Segmentation
7. FAQ
8. Final CTA

End with a gap analysis.

Content:
{stage01_output}
```

### Stage 04 — Content + Blueprint
```
Based on the brand audit and gap analysis, produce:

1. layout-blueprint: new page architecture section by section
   (Hero → Problem → Solution → Benefits → Proof → Audience → FAQ → CTA → Footer)
   For each: name · purpose · grid pattern · content blocks · CTA · visual suggestion

2. copy: proposed copy for every section
   (headline max 10 words · sub-headline · body · CTA label · microcopy)
   Tone: outcome-first, evidence-based, no hype.

Brand audit:
{stage02_output}

Gap analysis:
{stage03_output}
```

### Stage 05 — Design Concept
```
Build a complete responsive HTML redesign.

DESIGN SYSTEM — apply every token, rule, and component exactly:
{design_system}

REFERENCE NOTES (visual direction):
{reference_notes}

CONTENT:
Layout blueprint: {stage04_blueprint}
Copy: {stage04_copy}

Requirements:
- Single HTML file, self-contained (CDN for Manrope font only)
- All sections in order: nav · hero · problem · solution · benefits · proof · audience · FAQ · CTA · footer
- Dark/light toggle (prefers-color-scheme + manual button)
- Responsive: mobile-first, breakpoints 640px and 1024px
- Semantic HTML, WCAG AA
- No shadows, no border-radius on block elements (badges/tags: 999px only)
- Return ONLY the complete HTML. No explanation.
```

### Stage 06 — Export
Handled by Puppeteer service, not Claude.

---

## Frontend Pages

### Dashboard — `Dashboard.jsx`
- Grid layout of project cards (4 columns → 2 → 1)
- Each card: project name · URL · current stage · date · "Open →"
- Empty state: dashed border card with "+ New Project"
- New project modal: input for name + URL → POST /api/projects
- Uses April card component exactly (band + body + meta footer)

### Project — `Project.jsx`
- Left sidebar: stage list with status indicators (pending / running / done)
- Main area: active stage content
- Stage nav is sequential — can't jump ahead unless previous is done
- Each stage has: heading · instructions panel · output area · Run button

### Stage Shell pattern
Every stage page follows this layout:
```
┌─────────────────────────────────────┐
│ EYEBROW: Stage 01                   │
│ TITLE: Input                        │
│ DESC: one line                      │
├─────────────────────────────────────┤
│ Instructions panel (collapsible)    │
│ What this stage does and why        │
├─────────────────────────────────────┤
│ Input area (if needed)              │
│ URL field / file upload / textarea  │
├─────────────────────────────────────┤
│ [Run Stage] button                  │
├─────────────────────────────────────┤
│ Output area                         │
│ Streams in as Claude responds       │
│ Markdown rendered                   │
└─────────────────────────────────────┘
```

### Stage 04.5 — Design Direction Gate — `Stage045Gate.jsx`
Shown between Stage 04 and Stage 05. Does not proceed until confirmed.

```
┌─────────────────────────────────────┐
│ EYEBROW: Design Direction           │
│ TITLE: Before we build              │
├─────────────────────────────────────┤
│ 1. Design System                    │
│    Currently: April (default)       │
│    [Upload new DESIGN_SYSTEM.md]    │
├─────────────────────────────────────┤
│ 2. Reference URLs                   │
│    [+ Add URL]  url input           │
├─────────────────────────────────────┤
│ 3. Reference Images                 │
│    [Upload images / moodboard]      │
├─────────────────────────────────────┤
│ 4. Brand Assets                     │
│    [Upload logo / fonts / colors]   │
├─────────────────────────────────────┤
│ [Confirm & Build →]                 │
└─────────────────────────────────────┘
```

On confirm:
- If new DESIGN_SYSTEM.md uploaded → use it for Stage 05
- If reference URLs → fetch each, extract visual patterns via Claude, save to reference_notes
- If images uploaded → send to Claude with vision, extract visual language, save to reference_notes
- Save everything to design_direction table
- Unlock Stage 05

### Stage 05 — Design — `Stage05Design.jsx`
- Runs Claude with Stage 05 prompt
- Output is raw HTML
- Renders inside `<iframe>` — resizable
- Toolbar above iframe: [Light] [Dark] toggle · [Fullscreen] · [Edit HTML] · [Proceed to Export]
- "Edit HTML" opens a code panel alongside the iframe

### Stage 06 — Export — `Stage06Export.jsx`
- [Generate Export] button → POST /api/projects/:id/export
- Puppeteer renders the HTML → saves PDF
- Two download buttons: [Download HTML] · [Download PDF]
- Summary: what was built, what was rewritten, any gaps

---

## CSS Tokens

`frontend/src/styles/tokens.css` — copy exactly from DESIGN_SYSTEM.md:

```css
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;500;600;700;800&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

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

body {
  font-family: 'Manrope', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}
```

---

## .env

```
ANTHROPIC_API_KEY=your_key_here
PORT=3001
```

---

## Build Order

Build in this sequence — each step depends on the previous:

1. `backend/db/schema.sql` + `db.js`
2. `backend/services/claude.js` + `scraper.js`
3. `backend/routes/projects.js` + `stages.js`
4. `backend/server.js`
5. `frontend/src/styles/tokens.css` + `global.css`
6. `frontend/src/store/projectStore.js`
7. `frontend/src/api/client.js`
8. `frontend/src/pages/Dashboard.jsx`
9. `frontend/src/pages/stages/` — all stage pages in order
10. `frontend/src/pages/Project.jsx`
11. `backend/services/exporter.js` + `routes/export.js`
12. Wire everything in `App.jsx`

---

## Rules

- All UI uses CSS variables from tokens.css — no hardcoded colors
- No Tailwind, no component libraries — build from the design system
- Manrope only — no other fonts in the app UI
- Zero border-radius on all block elements — badges/tags only: 999px
- No shadows anywhere
- Dark-first — light mode via body.light toggle
- Stage 05 iframe must use the active DESIGN_SYSTEM.md, not the app tokens
- Claude streams via SSE — never wait for full response before rendering
- Never skip build order — test each layer before moving to the next
