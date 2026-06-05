import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FAL_URL = 'https://fal.run/openrouter/router/openai/v1/chat/completions';

const DESIGN_SYSTEM = fs.readFileSync(
  path.join(__dirname, '../../DESIGN_SYSTEM.md'), 'utf-8'
);

function falHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Key ${process.env.FAL_KEY}`,
  };
}

// Non-streaming call — returns text string
export async function callModel(messages, model) {
  const res = await fetch(FAL_URL, {
    method: 'POST',
    headers: falHeaders(),
    body: JSON.stringify({
      model: model || process.env.MODEL || 'anthropic/claude-sonnet-4-5',
      messages,
      max_tokens: 2048,
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

function stage04Prompt({ stage02Output, stage03Output }) {
  return `Based on the brand audit and gap analysis, produce:

1. layout-blueprint: new page architecture section by section
   (Hero → Problem → Solution → Benefits → Proof → Audience → FAQ → CTA → Footer)
   For each: name · purpose · grid pattern · content blocks · CTA · visual suggestion

2. copy: proposed copy for every section
   (headline max 10 words · sub-headline · body · CTA label · microcopy)
   Tone: outcome-first, evidence-based, no hype.

Brand audit:
${stage02Output}

Gap analysis:
${stage03Output}`;
}

function stage05Prompt({ designSystem, referenceNotes, stage04Output }) {
  const ds = designSystem || DESIGN_SYSTEM;
  return `Build a complete responsive HTML redesign.

DESIGN SYSTEM — apply every token, rule, and component exactly:
${ds}

REFERENCE NOTES (visual direction):
${referenceNotes || 'None provided.'}

CONTENT:
${stage04Output}

Requirements:
- Single HTML file, self-contained (CDN for Manrope font only)
- All sections in order: nav · hero · problem · solution · benefits · proof · audience · FAQ · CTA · footer
- Dark/light toggle (prefers-color-scheme + manual button)
- Responsive: mobile-first, breakpoints 640px and 1024px
- Semantic HTML, WCAG AA
- No shadows, no border-radius on block elements (badges/tags: 999px only)
- Return ONLY the complete HTML. No explanation.`;
}
