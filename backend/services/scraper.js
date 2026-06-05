import * as cheerio from 'cheerio';

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
