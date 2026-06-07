import * as cheerio from 'cheerio';

// ── Design-analysis scrape: screenshot + hex colors + markdown ─────────────────
// Used by the generate-url token extraction endpoint.
// Returns { text, screenshotBase64, hexColors } so callers can choose vision vs text.
export async function scrapeForDesignAnalysis(url) {
  const key = process.env.FIRECRAWL_API_KEY?.trim();
  if (!key) {
    const text = await scrapeUrl(url);
    return { text, screenshotBase64: null, hexColors: [] };
  }

  let res;
  try {
    res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ url, formats: ['markdown', 'html', 'screenshot'], onlyMainContent: false }),
    });
  } catch (e) {
    console.warn('Firecrawl network error, falling back:', e.message);
    const text = await scrapeUrl(url);
    return { text, screenshotBase64: null, hexColors: [] };
  }

  if (!res.ok) {
    console.warn(`Firecrawl ${res.status} for ${url}, falling back`);
    const text = await scrapeUrl(url);
    return { text, screenshotBase64: null, hexColors: [] };
  }

  const json = await res.json();
  const md            = json.data?.markdown   || json.markdown   || '';
  const html          = json.data?.html        || json.html        || '';
  const screenshotUrl = json.data?.screenshot  || json.screenshot  || '';

  // Deduplicated hex colors from HTML source (skip pure black/white)
  const hexColors = html
    ? [...new Set(
        [...html.matchAll(/#([0-9a-fA-F]{6})\b/g)]
          .map(m => '#' + m[1].toUpperCase())
          .filter(h => !['#000000','#FFFFFF','#111111','#EEEEEE','#FFFFFF'].includes(h))
      )].slice(0, 40)
    : [];

  // Download screenshot → base64 so we can send to vision model
  let screenshotBase64 = null;
  if (screenshotUrl) {
    try {
      const imgRes = await fetch(screenshotUrl);
      if (imgRes.ok) {
        const buf = await imgRes.arrayBuffer();
        screenshotBase64 = Buffer.from(buf).toString('base64');
      }
    } catch (e) {
      console.warn('Screenshot download failed:', e.message);
    }
  }

  const text = md || await scrapeUrl(url).catch(() => '');
  return { text, screenshotBase64, hexColors };
}

// ── Legacy helper: scrape → markdown string (used by scrape-reference etc.) ───
export async function scrapeWithFirecrawl(url) {
  const { text, hexColors } = await scrapeForDesignAnalysis(url);
  const colorSection = hexColors.length
    ? `\n\n---\n## Hex Colors Extracted From Page CSS/HTML\n${hexColors.join(', ')}\n`
    : '';
  return text + colorSection;
}


export async function scrapeUrl(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    },
    redirect: 'follow',
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const html = await res.text();

  const $ = cheerio.load(html);

  // Remove scripts, styles, noscript
  $('script, style, noscript, svg').remove();

  const title = $('title').text().trim();
  const metaDesc = $('meta[name="description"]').attr('content') || '';

  // Nav links
  const navLinks = [];
  $('nav a, header a').each((_, el) => {
    const text = $(el).text().trim();
    if (text) navLinks.push(text);
  });

  // CTAs
  const ctas = [];
  $('button, a.btn, a.cta, [class*="cta"], [class*="button"]').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 60) ctas.push(text);
  });

  // Footer
  const footerText = $('footer').text().replace(/\s+/g, ' ').trim().slice(0, 1000);

  // Body text
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000);

  return `Title: ${title}
Meta description: ${metaDesc}

Navigation links: ${navLinks.slice(0, 20).join(' · ')}

CTA buttons: ${[...new Set(ctas)].slice(0, 20).join(' · ')}

Footer: ${footerText}

Body content:
${bodyText}`;
}
