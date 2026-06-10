import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FAL_URL = 'https://fal.run/openrouter/router/openai/v1/chat/completions';

function getDefaultDesignSystem() {
  try {
    return fs.readFileSync(path.join(__dirname, '../../DESIGN_SYSTEM.md'), 'utf-8');
  } catch {
    return '# Design System\nDark-first. Manrope typeface. CSS variables for all tokens.';
  }
}

function falHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Key ${process.env.FAL_KEY}`,
  };
}

// Non-streaming call — returns text string
export async function callModel(messages, model, maxTokens = 4096) {
  const res = await fetch(FAL_URL, {
    method: 'POST',
    headers: falHeaders(),
    body: JSON.stringify({
      model: model || process.env.MODEL || 'anthropic/claude-sonnet-4-5',
      messages,
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// Streaming call — pipes SSE to Express response
export async function runStage(stageNum, context, res) {
  const prompt = buildPrompt(stageNum, context);
  const model = process.env.MODEL || 'anthropic/claude-sonnet-4-5';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let upstream;
  try {
    upstream = await fetch(FAL_URL, {
      method: 'POST',
      headers: falHeaders(),
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: stageNum === 5 ? 32000 : 8192,
        stream: true,
      }),
    });
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
    return;
  }

  if (!upstream.ok) {
    const errText = await upstream.text();
    res.write(`data: ${JSON.stringify({ type: 'error', message: errText })}\n\n`);
    res.end();
    return;
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete line

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') continue;
      try {
        const chunk = JSON.parse(payload);
        const text = chunk.choices?.[0]?.delta?.content || '';
        if (text) {
          fullText += text;
          res.write(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`);
        }
      } catch {}
    }
  }

  res.write(`data: ${JSON.stringify({ type: 'done', fullText })}\n\n`);
  res.end();
}

function buildPrompt(stageNum, context) {
  const prompts = {
    1: stage01Prompt(context),
    2: stage02Prompt(context),
    3: stage03Prompt(context),
    4: stage04Prompt(context),
    5: stage05Prompt(context),
  };
  return prompts[stageNum];
}

function stage01Prompt({ url, scrapedContent }) {
  return `Based on the following scraped website content from ${url}, extract and structure the information as markdown:

- Full visible text content summary
- Page title and meta description
- Navigation links
- All CTA button/link text
- Footer links and content
- Any visible metrics, claims, or social proof

Scraped content:
${scrapedContent}

Return as structured markdown.`;
}

function stage02Prompt({ stage01Output }) {
  return `Based on this scraped website content, produce a structured brand audit.

Cover: company overview · mission/vision · brand promise · positioning · estimated audience · voice and tone · CTAs and KPIs · website type · visual style summary · strengths · weaknesses.

Content:
${stage01Output}`;
}

function stage03Prompt({ stage01Output }) {
  return `Score this homepage against the Perfect Homepage Formula.
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
${stage01Output}`;
}

function stage04Prompt({ stage02Output, stage03Output, siteContent, editRequest, currentOutput, editSection }) {
  // ── Edit / revision path ────────────────────────────────────────────────────
  if (editRequest?.trim() && currentOutput?.trim()) {
    const sectionFocus = editSection === 'layout'
      ? 'Focus ONLY on the LAYOUT BLUEPRINT section. Keep the REVISED COPY section exactly as-is — reproduce it word for word.'
      : editSection === 'copy'
      ? 'Focus ONLY on the REVISED COPY section. Keep the LAYOUT BLUEPRINT section exactly as-is — reproduce it word for word.'
      : 'Apply the changes where appropriate across both sections.';

    return `You are revising an existing content blueprint based on a specific user request.

CURRENT BLUEPRINT:
${currentOutput}

USER REQUEST:
${editRequest.trim()}

INSTRUCTIONS:
- ${sectionFocus}
- Apply the requested change precisely.
- Return the COMPLETE revised blueprint — both parts — using EXACTLY these two headers:

# LAYOUT BLUEPRINT
[full layout section here]

-- PART TWO: COPY
[full copy section here]

- Do not add commentary, preamble, or explanations — output only the blueprint.`;
  }

  // ── Full generation path ────────────────────────────────────────────────────
  const siteSection = siteContent?.trim()
    ? `\n\n---\n\nUPLOADED SITE CONTENT — use this as the structural and copy base for the blueprint. Extract the existing page sections, navigation, messaging and content areas from it. Preserve what works; improve what the gap analysis flagged.\n\n${siteContent.trim()}\n\n---`
    : '';
  return `Based on the brand audit and gap analysis, produce a blueprint in EXACTLY two parts using these exact headers:

# LAYOUT BLUEPRINT

For each page section (Hero → Problem → Solution → Benefits → Proof → Audience → FAQ → CTA → Footer):
- **Section name** and purpose
- Grid pattern and layout structure
- Content blocks and their placement
- CTA placement and label
- Visual suggestion / component type

-- PART TWO: COPY

For each section from the blueprint above, provide the full proposed copy:
- Headline (max 10 words)
- Sub-headline
- Body copy
- CTA label
- Microcopy / supporting text

Tone: outcome-first, evidence-based, no hype. Do not add any text outside these two parts.
${siteSection}
Brand audit:
${stage02Output}

Gap analysis:
${stage03Output}`;
}

function stage05Prompt({ designSystem, referenceNotes, colorMode, stage04Output }) {
  const ds = designSystem || getDefaultDesignSystem();
  const colorInstruction = colorMode === 'both'
    ? 'Include BOTH dark and light modes. Add a visible toggle button (top-right of nav) that switches between them. Default to dark.'
    : 'Use the color mode defined in the design system. Do not add a theme toggle unless the design system specifies one.';

  return `Build a complete responsive HTML redesign using ONLY the design system below. Do not invent colors, fonts, or styles — every visual decision must come directly from the tokens provided.

===== DESIGN SYSTEM (primary source of truth — follow exactly) =====
${ds}
===== END DESIGN SYSTEM =====

COLOR MODE: ${colorInstruction}

REFERENCE NOTES (visual direction):
${referenceNotes || 'None provided.'}

CONTENT TO REDESIGN:
${stage04Output}

Hard requirements:
- Inline all CSS into a <style> tag — no external stylesheets except font CDN
- Use the exact CSS variable names from the design system (--bg, --text, --accent, etc.)
- Use the exact typeface from the design system loaded via Google Fonts CDN
- All sections: nav · hero · problem · solution · benefits · proof · audience · FAQ · CTA · footer
- Responsive: mobile-first, breakpoints 640px and 1024px
- Semantic HTML5, WCAG AA contrast
- Return ONLY the raw HTML document. No explanation, no markdown, no code fences.

ICON RULES — follow strictly unless the design.md uploaded above explicitly overrides:
- NEVER use emoji characters (🚀 ✅ 📱 💡 🎯 ⭐ etc.) anywhere in the design — not as icons, decoration, or bullet points
- NEVER use Unicode symbols (★ ✓ → ✔ ✦ ◆ etc.) as visual icons
- ALL icons must be inline SVG — clean flat paths, single colour, no gradients, no drop shadows, no 3D effects
- Visual style: geometric outline or solid, matching the Heroicons / Lucide / Feather aesthetic — simple, minimal, professional
- Icon colour: inherit from CSS variable (var(--text-2) default, var(--accent) for highlighted/CTA icons)
- Icon size: 18–24px, vertically aligned with adjacent text via display:flex + align-items:center, gap:8px
- Each icon must be a purposeful, accurate SVG path — not a placeholder square or circle
- If a section genuinely needs no icon, use none — do not force decorative icons
- Exception: if the uploaded design system/reference notes above explicitly specify emoji usage or a 3D icon style, follow that specification instead`;
}
