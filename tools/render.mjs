/* Снимок страницы в PNG через Playwright (браузер подбирает tools/browser.mjs).
   node tools/render.mjs <url> <out.png> [ширина=1440] [высота=900] [full=1] [scale=1] [transparent]
   transparent — без фона по умолчанию (для страниц с прозрачным body, например логотипа).
   Добавляет ?qa=1, чтобы появления (.reveal) не прятали контент на снимке. */
import { launch } from './browser.mjs';
const [, , url, out, w = '1440', h = '900', full = '1', scale = '1', bg = ''] = process.argv;
if (!url || !out) { console.error('usage: node tools/render.mjs <url> <out.png> [w] [h] [full] [scale]'); process.exit(2); }
const browser = await launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +scale });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('response', (r) => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });
await page.goto(url + (url.includes('?') ? '&' : '?') + 'qa=1', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts && document.fonts.ready);
await page.waitForTimeout(300);
await page.screenshot({ path: out, fullPage: full === '1', omitBackground: bg === 'transparent' });
await browser.close();
console.log(out + (errors.length ? '  ERRORS: ' + errors.join(' | ') : '  ok'));
