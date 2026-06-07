import * as cheerio from 'cheerio';

// ── Puppeteer: screenshot + CSS variable extraction ───────────────────────────
// Returns { screenshotBase64, cssVars } or null on failure.
// Forces dark mode (prefers-color-scheme: dark) so JS-themed pages render correctly.
async function takeScreenshotWithPuppeteer(url) {
  try {
    const { default: puppeteer } = await import('puppeteer');
    console.log(`  [puppeteer] launching for ${url}`);
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

    // Set dark mode preference
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Try to force dark theme via common JS class patterns
    await page.evaluate(() => {
      const el = document.documentElement;
      el.classList.add('dark', 'dark-mode', 'theme-dark');
      el.setAttribute('data-theme', 'dark');
      el.setAttribute('data-color-scheme', 'dark');
      document.body.classList.add('dark', 'dark-mode');
    });

    // Wait for theme transitions to settle
    await new Promise(r => setTimeout(r, 3000));

    // Extract CSS custom properties + actual computed colors
    const cssVars = await page.evaluate(() => {
      const result = {};

      // Walk all stylesheets for :root and [data-theme="dark"] / .dark rules
      const darkSelectors = [':root', 'html', '.dark', '[data-theme="dark"]', '[data-color-scheme="dark"]', 'html.dark', 'body.dark'];
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules || []) {
            if (darkSelectors.some(s => rule.selectorText === s || (rule.selectorText || '').includes(s))) {
              const matches = [...rule.cssText.matchAll(/--([\w-]+):\s*([^;]+);/g)];
              for (const m of matches) {
                const val = m[2].trim();
                if (/^#[0-9a-fA-F]{3,8}$/.test(val) || /^rgba?\(/.test(val)) {
                  result['--' + m[1]] = val;
                }
              }
            }
          }
        } catch (e) { /* cross-origin sheet, skip */ }
      }

      // Add actual computed colors of key elements
      const bodyBg = getComputedStyle(document.body).backgroundColor;
      const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
      const bodyColor = getComputedStyle(document.body).color;
      if (bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)') result['__computed-body-bg'] = bodyBg;
      if (htmlBg && htmlBg !== 'rgba(0, 0, 0, 0)') result['__computed-html-bg'] = htmlBg;
      if (bodyColor) result['__computed-body-color'] = bodyColor;

      // First CTA button color
      const btn = document.querySelector('button, a[class*="btn"], a[class*="cta"], [class*="button-primary"]');
      if (btn) result['__computed-cta-bg'] = getComputedStyle(btn).backgroundColor;

      return result;
    });

    const buffer = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: 1440, height: 900 },
    });
    await browser.close();

    const cssVarCount = Object.keys(cssVars).length;
    console.log(`  [puppeteer] screenshot OK (${Math.round(buffer.length / 1024)}KB) + ${cssVarCount} CSS vars`);
    return { screenshotBase64: buffer.toString('base64'), cssVars };
  } catch (e) {
    console.warn(`  [puppeteer] failed: ${e.message}`);
    return null;
  }
}

// ── Design-analysis scrape: screenshot + hex colors + markdown ─────────────────
// Used by the generate-url token extraction endpoint.
// Returns { text, screenshotBase64, hexColors, screenshotSource }
export async function scrapeForDesignAnalysis(url) {
  const key = process.env.FIRECRAWL_API_KEY?.trim();
  console.log(`[scrape] ${url}`);
  console.log(`  FIRECRAWL_API_KEY: ${key ? `set (${key.slice(0, 6)}…)` : 'NOT SET'}`);

  let text = '';
  let hexColors = [];
  let screenshotBase64 = null;
  let screenshotSource = 'none';
  let cssVars = {};

  // ── 1. Try Firecrawl (screenshot + html + markdown) ──────────────────────────
  if (key) {
    try {
      console.log('  [firecrawl] requesting markdown+html+screenshot…');
      const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ url, formats: ['markdown', 'html', 'screenshot'], onlyMainContent: false }),
      });

      if (!res.ok) {
        console.warn(`  [firecrawl] HTTP ${res.status}`);
      } else {
        const json = await res.json();
        const md           = json.data?.markdown   || json.markdown   || '';
        const html         = json.data?.html        || json.html        || '';
        const screenshotUrl = json.data?.screenshot || json.screenshot || '';
        console.log(`  [firecrawl] markdown:${md.length}chars  html:${html.length}chars  screenshot:${screenshotUrl ? 'URL present' : 'MISSING'}`);

        text = md;

        // Extract hex colors from HTML source
        if (html) {
          hexColors = [...new Set(
            [...html.matchAll(/#([0-9a-fA-F]{6})\b/g)]
              .map(m => '#' + m[1].toUpperCase())
              .filter(h => !['#000000','#FFFFFF','#111111','#EEEEEE'].includes(h))
          )].slice(0, 50);
          console.log(`  [firecrawl] ${hexColors.length} hex colors from HTML`);
        }

        // Download screenshot
        if (screenshotUrl) {
          try {
            const imgRes = await fetch(screenshotUrl);
            if (imgRes.ok) {
              const buf = await imgRes.arrayBuffer();
              screenshotBase64 = Buffer.from(buf).toString('base64');
              screenshotSource = 'firecrawl';
              console.log(`  [firecrawl] screenshot downloaded OK (${Math.round(buf.byteLength / 1024)}KB)`);
            } else {
              console.warn(`  [firecrawl] screenshot download HTTP ${imgRes.status}`);
            }
          } catch (e) {
            console.warn(`  [firecrawl] screenshot download error: ${e.message}`);
          }
        }
      }
    } catch (e) {
      console.warn(`  [firecrawl] network error: ${e.message}`);
    }
  }

  // ── 2. Puppeteer: full JS render + CSS var extraction (primary) ──────────────
  // Firecrawl captures pre-JS state; Puppeteer waits for full render + dark mode.
  // Returns { screenshotBase64, cssVars } or null when unavailable (Vercel).
  {
    console.log('  [screenshot] trying Puppeteer (full JS render + dark mode)…');
    const puppeteerResult = await takeScreenshotWithPuppeteer(url);
    if (puppeteerResult) {
      screenshotBase64 = puppeteerResult.screenshotBase64;
      cssVars = puppeteerResult.cssVars || {};
      screenshotSource = 'puppeteer';
      console.log(`  [screenshot] Puppeteer OK — overrides Firecrawl screenshot`);
    } else if (!screenshotBase64) {
      console.log('  [screenshot] Puppeteer unavailable — using Firecrawl screenshot (may be pre-render)');
    }
  }

  // ── 3. Cheerio fallback for text content ──────────────────────────────────────
  if (!text) {
    console.log('  [text] Firecrawl returned no markdown — falling back to Cheerio');
    text = await scrapeUrl(url).catch(e => {
      console.warn(`  [cheerio] failed: ${e.message}`);
      return '';
    });
  }

  console.log(`[scrape] done — screenshot:${screenshotSource}  text:${text.length}chars  hexColors:${hexColors.length}  cssVars:${Object.keys(cssVars).length}`);
  return { text, screenshotBase64, hexColors, cssVars, screenshotSource };
}

// ── Legacy helper: returns plain text string (used by scrape-reference etc.) ──
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
  $('script, style, noscript, svg').remove();

  const title = $('title').text().trim();
  const metaDesc = $('meta[name="description"]').attr('content') || '';

  const navLinks = [];
  $('nav a, header a').each((_, el) => {
    const text = $(el).text().trim();
    if (text) navLinks.push(text);
  });

  const ctas = [];
  $('button, a.btn, a.cta, [class*="cta"], [class*="button"]').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 60) ctas.push(text);
  });

  const footerText = $('footer').text().replace(/\s+/g, ' ').trim().slice(0, 1000);
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000);

  return `Title: ${title}
Meta description: ${metaDesc}

Navigation links: ${navLinks.slice(0, 20).join(' · ')}

CTA buttons: ${[...new Set(ctas)].slice(0, 20).join(' · ')}

Footer: ${footerText}

Body content:
${bodyText}`;
}
