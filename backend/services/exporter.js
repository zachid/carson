import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function exportProject(projectId, html) {
  const exportDir = path.join(__dirname, '../../exports', projectId);
  fs.mkdirSync(exportDir, { recursive: true });

  const htmlPath = path.join(exportDir, 'site.html');
  const pdfPath = path.join(exportDir, 'site.pdf');

  fs.writeFileSync(htmlPath, html, 'utf-8');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
  } finally {
    await browser.close();
  }

  return { htmlPath, pdfPath };
}

export function getExportPaths(projectId) {
  const exportDir = path.join(__dirname, '../../exports', projectId);
  return {
    html: path.join(exportDir, 'site.html'),
    pdf: path.join(exportDir, 'site.pdf'),
  };
}
