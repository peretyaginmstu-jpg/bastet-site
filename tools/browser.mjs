/* Общий запуск браузера для проверок и скриншотов.
   Playwright ищем по очереди: PLAYWRIGHT_MODULE (путь к папке проекта с playwright),
   node_modules этого репозитория, глобальная установка npm, соседний superselezen-visa.
   Браузер: CHROME_PATH, установленный Google Chrome на macOS, иначе Chromium самого Playwright. */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function globalRoot() {
  try { return execSync('npm root -g', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; }
}

function loadChromium() {
  const bases = [process.env.PLAYWRIGHT_MODULE, root, globalRoot(), '/Users/pavelp/Documents/Claude/superselezen-visa'].filter(Boolean);
  for (const base of bases) {
    const require = createRequire(resolve(base, 'package.json'));
    for (const name of ['playwright-core', 'playwright']) {
      try { return require(name).chromium; } catch {}
    }
  }
  throw new Error('Playwright не найден: npm i -D playwright-core или укажите PLAYWRIGHT_MODULE');
}

export const chromium = loadChromium();
export const executablePath = process.env.CHROME_PATH || (existsSync(MAC_CHROME) ? MAC_CHROME : undefined);
export const launch = (options = {}) => chromium.launch({ executablePath, headless: true, ...options });
