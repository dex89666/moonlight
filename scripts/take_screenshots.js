import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const OUT = path.resolve(process.cwd(), 'screenshots');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const targets = [
  { url: '/', name: 'home' },
  { url: '/pro', name: 'pro' },
  { url: '/compatibility', name: 'compatibility' },
];

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  for (const t of targets) {
    const url = new URL(t.url, BASE).toString();
    console.log('Capturing', url);
    try {
      await page.goto(url, { waitUntil: 'networkidle' , timeout: 15000});
      // small wait for animations
      await page.waitForTimeout(600);
      const file = path.join(OUT, `${t.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log('Saved', file);
    } catch (err) {
      console.error('Failed to capture', url, err && err.message ? err.message : err);
    }
  }

  await browser.close();
  console.log('Done');
})();
