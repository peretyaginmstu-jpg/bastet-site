import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const out = resolve(root, '_dev/qa-v5', process.argv[3] || 'after');
const require = createRequire('/Users/pavelp/Documents/Claude/superselezen-visa/');
const { chromium } = require('playwright-core');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const base = process.argv[2] || 'http://127.0.0.1:8745';

mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: chrome, headless: true });
const widths = [320, 375, 768, 1024, 1280, 1440];

async function open(width, path = '/?qa=1') {
  const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
  await page.goto(base + path, { waitUntil: 'networkidle' });
  return page;
}

async function warmLazyImages(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 720) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(18);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(80);
}

// Fit the whole section below the sticky header before taking an element shot.
// This avoids Chrome stitching the fixed header into the middle of tall crops.
async function sectionShot(page, selector, name, width) {
  const height = await page.locator(selector).evaluate(el => Math.ceil(el.getBoundingClientRect().height));
  await page.setViewportSize({ width, height: height + 240 });
  await page.locator(selector).evaluate(el => el.scrollIntoView({block:'start',behavior:'instant'}));
  await page.mouse.move(0,0);
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
  await page.waitForTimeout(80);
  await page.locator(selector).screenshot({ path: resolve(out, name) });
  await page.setViewportSize({ width, height: 900 });
}

for (const width of widths) {
  const page = await open(width);
  await warmLazyImages(page);
  await page.setViewportSize({ width, height: 900 });
  await page.screenshot({ path: resolve(out, `top-${width}.png`) });
  await page.screenshot({ path: resolve(out, `after-${width}.png`), fullPage: true });
  await page.close();
  console.log(`after-${width}.png`);
}

for (const width of widths) {
  const page = await open(width);
  await warmLazyImages(page);
  for (const service of ['disinsection', 'deratization', 'acaricidal', 'disinfection']) {
    await page.click(`.service-card[data-service="${service}"] .service-more`);
    await page.waitForTimeout(40);
    await sectionShot(page, '.services-section', `service-${service}-${width}.png`, width);
  }

  if (width < 680) await page.setViewportSize({ width, height: 2200 });
  await page.click('.system-tab[data-system="equipment"]');
  await sectionShot(page, '.system-panel', `equipment-${width}.png`, width);
  await page.click('.system-tab[data-system="preparations"]');
  await page.waitForFunction(() => {
    const image = document.querySelector('#systemImage img');
    return image && /preparations-tab\.jpg$/.test(image.getAttribute('src') || '') && image.complete && image.naturalWidth > 0;
  });
  await page.waitForTimeout(300);
  await sectionShot(page, '.system-panel', `preparations-${width}.png`, width);
  if (width < 680) await page.setViewportSize({ width, height: 1000 });

  await sectionShot(page, '.request-section', `request-empty-${width}.png`, width);
  await page.selectOption('#fObject', 'territory');
  await page.check('#issuesBox input[value="ticks"]', { force: true });
  await page.waitForTimeout(40);
  await sectionShot(page, '.request-section', `request-filled-${width}.png`, width);
  await sectionShot(page, '.contact-section', `contact-${width}.png`, width);
  for (const name of ['process', 'documents']) {
    await sectionShot(page, `.${name}-section`, `${name}-${width}.png`, width);
  }
  await page.close();

  const privacy = await open(width, '/privacy.html');
  await privacy.screenshot({ path: resolve(out, `privacy-${width}.png`), fullPage: true });
  await privacy.close();
}

await browser.close();
console.log(`QA screenshots: ${out}`);
