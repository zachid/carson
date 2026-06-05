# Carson — Build Session Summary
**Date:** June 5, 2026

---

## What Is Carson

A full-stack web app that takes a URL and runs it through a 7-stage AI pipeline to produce a fully redesigned, self-contained HTML page — ready to download or export as PDF.

**Pipeline:** Input → Brand Audit → Homepage Analysis → Content Blueprint → Design Direction → Design Concept → Export

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite, Zustand, Axios, React-Markdown |
| Backend | Node.js + Express |
| Database | Firebase Firestore (Admin SDK) |
| AI | FAL OpenRouter → `anthropic/claude-sonnet-4-6` |
| Scraping | Cheerio + fetch (browser-like headers) |
| Export | Puppeteer (PDF + HTML) |
| Repo | github.com/zachid/carson |

---

## Build Log

### 1. Initial Build
Built the entire app from scratch following `CLAUDE_WEBAPP.md`:
- Express backend with all routes (`/api/projects`, `/api/projects/:id/run/:stage`, etc.)
- React/Vite frontend with all 7 stage pages
- SQLite via `node:sqlite` (built-in Node 25 — avoided `better-sqlite3` native compilation failure)
- CSS design system from `DESIGN_SYSTEM.md` (April v1.0) — dark-first, Manrope, zero border-radius, no shadows

### 2. Auth Fix — FAL OpenRouter
- Replaced Anthropic SDK with direct `fetch` to FAL OpenRouter
- Endpoint: `https://fal.run/openrouter/router/openai/v1/chat/completions`
- Auth: `Authorization: Key {FAL_KEY}`
- Streaming: OpenAI SSE format parsed manually
- Model set via `MODEL` env var (default: `anthropic/claude-sonnet-4-6`)
- Key insight: ES module imports are hoisted — `dotenv.config({ override: true })` + lazy client init required

### 3. Stage 05 Blank Page Fix
- Root cause: `max_tokens: 8192` truncated HTML mid-`<style>` block → open tag made body invisible
- Fix 1: `max_tokens: 32000` for stage 5 only
- Fix 2: Robust `stripCodeFences()` to handle unclosed ` ```html ` fences (truncated output)
- Fix 3: Separate `streamText` (textarea during generation) from `finalHtml` (iframe only set on `done`)

### 4. UX Improvements
- **Continue buttons** — after each stage completes, "Continue to [Next Stage] →" appears
- **PDF download** — every markdown output has "↓ Save PDF" (opens styled print window via `marked` CDN)
- **Design brief approval** — Stage 05 shows active design system tokens, reference notes, model before generating
- **Stage 05 iframe** — `key` prop on iframe = first 40 chars of HTML to prevent re-render during streaming

### 5. Database Migration: SQLite → Supabase → Firebase
- Started with `node:sqlite` (built-in)
- Migrated to Supabase (`@supabase/supabase-js`) — schema in `supabase/schema.sql`
- Switched again to Firebase Firestore (`firebase-admin`) per user request
- Firestore structure: `projects/{id}/stages/{num}` + `projects/{id}/direction/main`
- Lazy proxy pattern in `db.js` to defer Firebase init until after `dotenv.config()` runs

### 6. Scraper 403 Fix
- Was using `CarsonBot/1.0` user agent — blocked by many sites
- Replaced with full Chrome browser headers: real UA string + `Sec-Fetch-*` + `Accept-Language` + `Accept-Encoding`

### 7. URL Editor in Stage 01
- Added inline URL editor component in Stage 01
- Shows current URL as a clickable link with `✎ Edit` button
- Edit → input field → Save/Cancel (Enter/Escape)
- PATCH `/api/projects/:id` endpoint + `updateProject` Zustand action

### 8. Design System Generator
- In Stage 04.5, next to reference URL inputs: **✦ Generate Design System** button
- Scrapes the reference URL, sends to Claude with a structured prompt
- Claude reverse-engineers the site's color tokens, typography, spacing, border-radius, component styles
- Output: complete `DESIGN_SYSTEM.md` in the same format as April v1.0
- Editable inline, downloadable as `.md`, replaces April as active design system for Stage 05

### 9. HTML Download in Stage 05
- Added **↓ Download HTML** button to Stage 05 toolbar (alongside Save PDF)
- Downloads self-contained HTML file named after the project

### 10. Git + Deployment Setup
- Repo: `github.com/zachid/carson`
- Frontend → Vercel (set `VITE_API_URL` to backend URL)
- Backend → Railway (Node.js container, persistent filesystem for Puppeteer exports)
- Firebase service account file (`firebase-service-account.json.json`) gitignored

---

## Environment Variables

```
FAL_KEY=...              # fal.ai key → OpenRouter access
MODEL=anthropic/claude-sonnet-4-6
PORT=3005
FIREBASE_SERVICE_ACCOUNT=./firebase-service-account.json.json
SUPABASE_URL=...         # legacy — no longer used
SUPABASE_SERVICE_KEY=... # legacy — no longer used
```

---

## Key Files

| File | Purpose |
|---|---|
| `backend/server.js` | Express app, CORS, all special endpoints |
| `backend/db/db.js` | Firebase Admin lazy init + Firestore client |
| `backend/services/claude.js` | FAL OpenRouter fetch, SSE streaming, all 5 stage prompts |
| `backend/services/scraper.js` | Cheerio URL scraper with browser headers |
| `backend/services/exporter.js` | Puppeteer PDF + HTML export |
| `backend/routes/projects.js` | Project CRUD + direction save |
| `backend/routes/stages.js` | Stage run (SSE) + stage get |
| `frontend/src/pages/stages/Stage05Design.jsx` | Design brief → streaming textarea → iframe |
| `frontend/src/pages/stages/Stage045Gate.jsx` | Design direction + Generate Design System |
| `frontend/src/styles/tokens.css` | All CSS variables from DESIGN_SYSTEM.md |
| `frontend/src/styles/global.css` | Full component library (buttons, cards, inputs, etc.) |

---

## Running Locally

```bash
# Backend (from Carson app/backend/)
node server.js
# → http://localhost:3005

# Frontend (from Carson app/frontend/)
npx vite --port 3004
# → http://localhost:3004
```
