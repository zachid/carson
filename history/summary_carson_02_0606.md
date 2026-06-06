# Carson — Build Session Summary 02
**Date:** June 6, 2026

---

## What Was Done This Session

### 1. Vercel Deployment (Frontend + Backend)

- **Backend** deployed to Vercel as a serverless Express app
  - Created `backend/api/index.js` as Vercel entry point
  - Created `backend/vercel.json` routing all requests to Express
  - Added `export default app` to `server.js` (only change to existing code)
  - Fixed `backend/db/db.js` to support inline JSON for `FIREBASE_SERVICE_ACCOUNT` env var (for Vercel/Railway — detects if value starts with `{`)
- **Frontend** deployed to Vercel
  - Fixed `frontend/vercel.json` to use `handle: filesystem` before SPA fallback (was returning `index.html` for JS assets)
  - Set `VITE_API_URL` env var in Vercel → backend URL

**Environment vars needed in Vercel (backend):**
```
FAL_KEY=...
MODEL=anthropic/claude-sonnet-4-6
FIREBASE_SERVICE_ACCOUNT=<full JSON contents>
FIRECRAWL_API_KEY=fc-9f34b615627d48ae84288f9d085c0999
```

**Deployed URLs:**
- Backend: `https://carson-ten.vercel.app`
- Frontend: auto-deployed from `main` branch

---

### 2. Bug Fixes

| Bug | Fix |
|---|---|
| Black screen on load | `fetchProjects` crashed when backend returned error object instead of array — added `Array.isArray(data)` guard |
| iframe links navigating to Carson app | Injected `<base target="_blank">` into iframe `srcDoc` so all links open in new tab |
| Stage 05 regenerating on every navigation | Replaced `directionVersion > 0` (always true) with one-shot `pendingRegen` flag in Project.jsx — cleared by Stage05 on mount via `onMounted()` callback |
| New design system not applied on regenerate | `setTimeout` race condition in `setDesignSystem` — fixed by computing new index synchronously before calling `setDsVersions` |
| `color_mode` silently dropped | Backend route wasn't saving `color_mode` to Firestore — added to destructuring and `.set()` call |

---

### 3. Stage 05 — Design Concept

**Auto-generation flow:**
- Coming from Stage 04.5 ("Confirm and Build →") → Stage 05 auto-starts generation immediately, no approval screen
- Navigating to Stage 05 directly → shows existing result or a single "Generate Design →" button
- Removed the approval/brief screen entirely

**Version history:**
- Stored in `localStorage` keyed by `project.id` (`carson_s5v_${id}`)
- Before each new generation, existing HTML is archived as `v1`, `v2`, etc.
- Version pill tabs appear in toolbar when >1 version exists
- Clicking a version tab switches the iframe to that version
- Editing HTML via "Edit HTML" saves as a new version

**Regenerate button:**
- "← Regenerate" navigates back to Stage 04.5 (not reset in-place)
- On direction save, `pendingRegen=true` → Stage 05 remounts fresh and auto-generates

**Prompt improvements:**
- Design system delimited with `===== DESIGN SYSTEM =====` markers
- Explicit: "use exact CSS variable names", "font from DS only", "no invented styles"
- `color_mode` now wired into prompt:
  - `'match'` → follow design system's mode
  - `'both'` → generate dark + light with toggle button in nav

---

### 4. Stage 04.5 — Complete Redesign (per `STAGE_045_SPEC_01.md`)

**New layout — 4 zones:**
1. **Header** — eyebrow "ADD DESIGN DIRECTION"
2. **Tab Bar** — 4 tabs
3. **Content Area** — tab content + shared preview panel
4. **Footer** — sticky, always visible

**4 Tabs:**

| Tab | Trigger | Backend |
|---|---|---|
| Classic Mode | "GENERATE NEW DESIGN" button | Reads Stage 02 brand audit → Claude generates tokens |
| Add a Site URL | URL input + "GENERATE STYLE" | Firecrawl scrapes → Claude extracts tokens |
| Upload an Image | Drop zone + "EXTRACT STYLE" | Claude vision extracts tokens |
| Upload Design.md | File upload | Parsed on frontend (no API call) |

**Design System Preview Panel** (shared, persists across tab switches):
- Two inner tabs: **Design System** (visual) and **Markdown** (raw .md code view)
- Name field with **Random** name generator (20 evocative names)
- **Colors**: 6 swatches (Background, Bg Card, Border, Text, Accent 01, Accent 02)
  - Click ✏ to open native `<input type="color">` color picker
  - Live updates token state
- **Typography**: 4 editable rows (Headlines, Sub, Body, Captions) — font + ABCDE sample + weight, all fixed widths to prevent overflow

**Footer:**
- Toggle: "Create Light + Dark Mode" (saves as `color_mode: 'both'`)
- "Confirm and Build →" — disabled until preview panel populated

**On Confirm:**
1. Builds full DESIGN_SYSTEM.md from current tokens (comprehensive — see below)
2. Saves `design_system` (markdown), `tokens` (JSON), `color_mode` to Firestore
3. `pendingRegen=true` → navigates to Stage 05 → auto-generates

**Pre-populate on return:** if `project.direction.tokens` exists in Firestore, panel is pre-populated on mount.

---

### 5. Firecrawl Integration

- Package: direct `fetch` to `https://api.firecrawl.dev/v1/scrape` (no npm package)
- Added `scrapeWithFirecrawl(url)` to `backend/services/scraper.js`
  - Falls back to Cheerio if `FIRECRAWL_API_KEY` not set or call fails
- Used in:
  - `/api/projects/:id/direction/generate-url` (Stage 04.5 URL tab)
  - `/api/generate-designsystem` (generate DS from URL)
  - `/api/scrape-reference` (old reference URL flow — upgraded)
- Reference analysis prompt now extracts: Colors, Typography, Layout, Visual Style, Tone of Voice, Brand Attributes

---

### 6. New Backend Endpoints

```
POST /api/projects/:id/direction/generate-classic
     → reads Stage 02 output → Claude generates JSON tokens

POST /api/projects/:id/direction/generate-url
     body: { url }
     → Firecrawl scrapes → Claude extracts JSON tokens

POST /api/projects/:id/direction/generate-image
     body: multipart images
     → Claude vision (gemini-flash-1.5) → JSON tokens

POST /api/generate-designsystem-from-image
     body: multipart images
     → Claude vision → full DESIGN_SYSTEM.md string
```

**Token extraction schema (all 3 generate endpoints return this):**
```json
{
  "name": "evocative 2-3 word name",
  "colors": { "background", "bgCard", "border", "text", "accent01", "accent02" },
  "typography": {
    "headlines": { "font", "weight" },
    "sub":       { "font", "weight" },
    "body":      { "font", "weight" },
    "captions":  { "font", "weight" }
  }
}
```

---

### 7. `buildDesignSystemMd` — Comprehensive Output

The function that generates DESIGN_SYSTEM.md from tokens now outputs a full spec matching April v1.0 depth:

- **Identity** table with derived light mode accent values
- **Tokens** — full dark + light CSS variable set
  - `--bg-hover`, `--border-md`, `--border-hi` derived via `hexShift()`
  - `--text-2`, `--text-3` derived via `hexToRgba()`
  - Full light mode block auto-derived from dark colors
- **Functional colors** (success, danger)
- **Typography** — complete scale (Display, Title, Card name, Body, Secondary, Caption, Label, Eyebrow) with sizes, weights, letter-spacing, line-height
- **Spacing** — 4px grid token table
- **Components** — Buttons, Badges, Cards, Inputs, Grid (CSS using vars)
- **Motion** — speed table + transition declaration
- **Layout** — max-width, padding, breakpoints
- **Rules** — 10 rules

---

## Current State

| Layer | Status |
|---|---|
| Frontend (Vercel) | Live, auto-deploys from `main` |
| Backend (Vercel) | Live at `carson-ten.vercel.app` |
| Database (Firebase) | `carson-app-cf3f7` — Firestore working |
| Git | `github.com/zachid/carson` — `main` branch |
| Last commit | `7e818b8` — iframe links fix + dashboard slogan |

**Pending (not yet committed):**
- Stage 04.5 full redesign (all tab work, preview panel, color pickers)
- `buildDesignSystemMd` comprehensive version
- 3 new backend token-generation endpoints
- Typography overflow fix (fixed widths)
- Panel inner tabs (Design System / Markdown)

---

## Key Files

| File | Role |
|---|---|
| `backend/server.js` | Express app + all special endpoints incl. 3 new token-gen routes |
| `backend/db/db.js` | Firebase lazy init — supports inline JSON for `FIREBASE_SERVICE_ACCOUNT` |
| `backend/services/claude.js` | FAL OpenRouter streaming + `getDefaultDesignSystem()` lazy fallback |
| `backend/services/scraper.js` | Cheerio scraper + new `scrapeWithFirecrawl()` |
| `backend/routes/projects.js` | Direction save now includes `tokens` + `color_mode` |
| `backend/routes/stages.js` | Stage 05 context includes `colorMode` |
| `backend/api/index.js` | Vercel serverless entry point |
| `backend/vercel.json` | Routes all requests to Express |
| `frontend/src/pages/Project.jsx` | `pendingRegen` state — one-shot Stage 05 regen flag |
| `frontend/src/pages/stages/Stage045Gate.jsx` | Full redesign — 4 tabs, preview panel, color pickers, token builder |
| `frontend/src/pages/stages/Stage05Design.jsx` | Version history (localStorage), auto-gen on startFresh, no approval screen |
| `frontend/vercel.json` | `handle: filesystem` before SPA fallback |

---

## Dev Notes

- Puppeteer (PDF/HTML export) does not work on Vercel — export routes return 501 gracefully
- `FIRECRAWL_API_KEY` has a leading space in `.env` — trim if issues arise: `fc-9f34b615627d48ae84288f9d085c0999`
- `firebase-service-account.json.json` (double `.json`) — gitignored, must be pasted as inline JSON in Vercel env var
- Stage 05 version history is `localStorage` only — clears on browser clear; not persisted to Firestore
- `directionVersion` state was removed from Project.jsx — replaced entirely by `pendingRegen`
