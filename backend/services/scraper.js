import * as cheerio from 'cheerio';

// ── Firecrawl scraper ─────────────────────────────────────────────────────────
// Returns rich markdown of the full page — far better for visual/brand analysis.
// Falls back to Cheerio if FIRECRAWL_API_KEY is not set.
export async function scrapeWithFirecrawl(url) {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return scrapeUrl(url); // fallback

  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      url,
      formats: ['markdown', 'html'],
      onlyMainContent: false,
    }),
  });

  if (!res.ok) {
    console.warn(`Firecrawl failed (${res.status}) for ${url}, falling back to Cheerio`);
    return scrapeUrl(url);
  }

  const json = await res.json();
  const md = json.data?.markdown || json.markdown || '';
  if (!md) return scrapeUrl(url); // fallback if empty

  // Extract all hex colors from the raw HTML (CSS vars, inline styles, class definitions)
  const html = json.data?.html || json.html || '';
  if (html) {
    const hexSet = new Set(
      [...html.matchAll(/#([0-9a-fA-F]{6})\b/g)]
        .map(m => '#' + m[1].toUpperCase())
        .filter(h => h !== '#000000' && h !== '#FFFFFF' && h !== '#FFFFFF') // skip pure black/white
    );
    if (hexSet.size > 0) {
      const colorList = [...hexSet].slice(0, 40).join(', ');
      return md + `\n\n---\n## Hex Colors Extracted From Page CSS/HTML\n${colorList}\n`;
    }
  }

  return md;
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
