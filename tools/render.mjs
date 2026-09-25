/* Снимок страницы в PNG через установленный Chrome (Playwright из соседнего проекта).
   node tools/render.mjs <url> <out.png> [ширина=1440] [высота=900] [full=1] [scale=1]
   Добавляет ?qa=1, чтобы появления (.reveal) не прятали контент на снимке. */
import { createRequire } from 'node:module';
const require = createRequire('/Users/pavelp/Documents/Claude/superselezen-visa/');
const { chromium } = require('playwright-core');
const [, , url, out, w = '1440', h = '900', full = '1', scale = '1'] = process.argv;
if (!url || !out) { console.error('usage: node tools/render.mjs <url> <out.png> [w] [h] [full] [scale]'); process.exit(2); }
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +scale });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('response', (r) => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });
await page.goto(url + (url.includes('?') ? '&' : '?') + 'qa=1', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts && document.fonts.ready);
await page.waitForTimeout(300);
await page.screenshot({ path: out, fullPage: full === '1' });
await browser.close();
console.log(out + (errors.length ? '  ERRORS: ' + errors.join(' | ') : '  ok'));
