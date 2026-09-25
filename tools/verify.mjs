/* Браузерные проверки. Playwright берём из соседнего проекта — ставить нечего.
   Запуск: node tools/verify.mjs [базовый-url]   (нужен запущенный devserver.py 8744)

   Статический tools/verify-static.mjs проверяет исходники регулярками; этот файл
   проверяет то, что регулярками не проверить: реальную геометрию, поведение без JS,
   собранные ссылки и живой сценарий подбора. */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire('/Users/pavelp/Documents/Claude/superselezen-visa/');
const { chromium } = require('playwright-core');

const BASE = process.argv[2] || 'http://127.0.0.1:8745';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const problems = [];
const fail = (m) => problems.push(m);
const ok = (m) => console.log('  ✓ ' + m);

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleErrors = [];
const missing = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
page.on('response', (r) => { if (r.status() === 404) missing.push(new URL(r.url()).pathname); });

/* Финальный переход в почтовый клиент перехватываем: вместо навигации пишем адрес в window.__mail. */
await page.route('**/js/app.js', (route) => route.fulfill({ contentType: 'text/javascript', body: readFileSync(resolve(here, '../js/app.js'), 'utf8').replace('window.location.href = url;', 'window.__mail = url;') }));
await page.goto(BASE + '/', { waitUntil: 'networkidle' });

/* --- 0. Правки заказчика (25.09.2026) --- */
const client = await page.evaluate(() => ({
  html: document.documentElement.outerHTML,
  /* Подзаголовок заказчика: вводная фраза + перечень объектов списком (слова дословно). */
  lead: [document.querySelector('.hero-lead')?.textContent.trim(), [...document.querySelectorAll('.hero .object-list li')].map((li) => li.textContent.trim()).join(', ')].filter(Boolean).join(' ') + (document.querySelector('.hero .object-list li') ? '.' : ''),
  price: document.querySelector('.price-note')?.textContent.replace(/\s+/g, ' ').trim(),
  title: document.title,
  brand: document.querySelector('.site-header .brand')?.textContent,
}));
if (/whatsapp|wa\.me/i.test(client.html)) fail('на странице остались упоминания/ссылки WhatsApp');
else ok('WhatsApp убран: остались только телефон и почта');
if (client.lead !== "Оказание услуг по дезинсекции, дератизации, дезинфекции, пест-контроля и акарицидной обработке на следующих типах объектов: пищевые производства, пищеблоки, рестораны, кафе, складские помещения, жилые помещения, места общего пользования, офисные помещения, базы отдыха, подвальные и чердачные помещения, территория, периметр зданий и сооружений.") fail('подзаголовок hero не совпадает с текстом заказчика');
else ok('подзаголовок hero — дословно текст заказчика');
if (!client.price || !client.price.includes("зависит от особенностей объекта. Подберём её после бесплатного выезда и обследования.")) fail('нет блока о ценообразовании');
else ok('блок о ценообразовании в начале страницы');
if (!/Бастет/.test(client.title) || !/Бастет/.test(client.brand || '')) fail('название «Бастет» не в title/шапке');
else ok('название «Бастет» в title и шапке');

/* --- 1. Ошибки и битые ссылки --- */
if (consoleErrors.length) fail('ошибки в консоли: ' + consoleErrors.join(' | '));
else ok('консоль без ошибок');
if (missing.length) fail('404: ' + [...new Set(missing)].join(', '));
else ok('битых ссылок нет');

/* --- 2. Состав по ТЗ --- */
const counts = await page.evaluate(() => ({
  services: document.querySelectorAll('.service-card').length,
  equipment: document.querySelectorAll('.equipment-grid li').length,
  process: document.querySelectorAll('.process-list li').length,
  proof: document.querySelectorAll('.proof-item').length,
  h1: document.querySelectorAll('h1').length,
  imgsNoAlt: [...document.querySelectorAll('img')].filter((i) => i.getAttribute('alt') === null).length,
  useRefs: [...document.querySelectorAll('use')].map((u) => u.getAttribute('href')),
  symbols: [...document.querySelectorAll('symbol')].map((s) => s.id),
  clients: document.querySelectorAll('.clients-copy li').length,
}));
if (counts.services !== 4) fail(`карточек услуг ${counts.services}, в ТЗ 4`); else ok('4 услуги');
if (counts.equipment !== 11) fail(`позиций оснащения ${counts.equipment}, в ТЗ 11`); else ok('11 позиций оборудования с иллюстрациями (блок 2 ТЗ)');
if (counts.process !== 5) fail(`шагов процесса ${counts.process}`); else ok('5 шагов процесса');
if (counts.h1 !== 1) fail(`заголовков h1: ${counts.h1}`); else ok('ровно один h1');
if (counts.imgsNoAlt) fail(`картинок без alt: ${counts.imgsNoAlt}`); else ok('у всех картинок есть alt');
const broken = counts.useRefs.map((h) => (h || '').replace('#', '')).filter((id) => id && !counts.symbols.includes(id));
if (broken.length) fail('битые ссылки на символы: ' + [...new Set(broken)].join(', '));
else ok(`все ${counts.useRefs.length} ссылок на спрайт разрешаются (${counts.symbols.length} символов)`);

/* --- 3. Препараты во второй вкладке --- */
const equipmentImageSrc = await page.getAttribute('#systemImage img', 'src');
await page.click('.system-tab[data-system="preparations"]');
await page.waitForFunction(() => /preparations-tab\.jpg$/.test(document.querySelector('#systemImage img')?.getAttribute('src') || ''));
await page.waitForTimeout(80);
const preparationsState = await page.evaluate(() => ({
  count: document.querySelectorAll('#systemContent .compact-list li').length,
  src: document.querySelector('#systemImage img')?.getAttribute('src') || '',
  alt: document.querySelector('#systemImage img')?.getAttribute('alt') || '',
}));
if (preparationsState.count !== 13) fail(`препаратов ${preparationsState.count}, в ТЗ 13`); else ok('13 препаративных форм');
if (equipmentImageSrc === preparationsState.src || !/preparations-tab\.jpg$/.test(preparationsState.src) || !/Препаративные формы/.test(preparationsState.alt)) {
  fail('вкладка препаратов не переключила тематическое изображение');
} else ok('у вкладок оборудования и препаратов разные тематические изображения');
await page.click('.system-tab[data-system="equipment"]');
await page.waitForFunction(() => /equipment-tab\.jpg$/.test(document.querySelector('#systemImage img')?.getAttribute('src') || ''));
await page.waitForTimeout(80);
const restoredEquipmentImage = await page.getAttribute('#systemImage img', 'src');
if (restoredEquipmentImage !== equipmentImageSrc || !/equipment-tab\.jpg$/.test(restoredEquipmentImage || '')) fail('вкладка оборудования не вернула свой кадр');
else ok('вкладка оборудования возвращает свой кадр');
await page.focus('.system-tab[data-system="equipment"]');
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(280);
const keyboardTab = await page.evaluate(() => ({
  active: document.activeElement && document.activeElement.getAttribute('data-system'),
  selected: document.querySelector('.system-tab[aria-selected="true"]')?.getAttribute('data-system'),
  count: document.querySelectorAll('#systemContent .compact-list li').length,
}));
if (keyboardTab.active !== 'preparations' || keyboardTab.selected !== 'preparations' || keyboardTab.count !== 13) fail('клавиатурное переключение вкладок не сработало');
else ok('вкладки переключаются ArrowRight с переносом фокуса');
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(280);

/* --- 4. Компактные полупрозрачные поверхности --- */
const css = readFileSync(resolve(here, '../css/styles.css'), 'utf8');
if (/backdrop-filter\s*:/.test(css)) fail('V4 не должна использовать backdrop-filter');
else ok('нет зависимости от backdrop-filter');
if (/mask-composite:\s*exclude/.test(css)) fail('в pastel-версии осталась тяжёлая бликующая стеклянная кромка v2');
else ok('тяжёлая стеклянная кромка v2 удалена');

await page.evaluate(() => window.scrollTo(0, 0));
const glass = await page.evaluate(() => {
  const all = [...document.querySelectorAll('*')].filter((el) => {
    const cs = getComputedStyle(el);
    return cs.backdropFilter && cs.backdropFilter !== 'none';
  });
  /* Считаем максимум одновременно видимых слоёв по всей странице, а не в текущей позиции:
     дорогой момент — это когда четыре размытия попадают в один экран. */
  const boxes = all.map((el) => { const r = el.getBoundingClientRect(); return { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY }; });
  const vh = window.innerHeight;
  let worst = 0, at = 0;
  for (let y = 0; y < document.body.scrollHeight; y += 120) {
    const n = boxes.filter((b) => b.bottom > y && b.top < y + vh).length;
    if (n > worst) { worst = n; at = y; }
  }
  return { total: all.length, worst: worst, at: at };
});
if (glass.worst > 2) fail(`до ${glass.worst} слоёв backdrop-filter одновременно (на прокрутке ${glass.at}px) — pastel-система должна быть лёгкой`);
else ok(`максимум одновременных слоёв backdrop-filter: ${glass.worst} (всего на странице ${glass.total})`);

/* --- 4б. Hero: фотография ровно одна.
       Раньше тот же кадр стоял и подложкой во всю ширину, и внутри карточки. --- */
const heroPics = await page.evaluate(() => document.querySelectorAll('.hero picture').length);
if (heroPics !== 1) fail(`в hero ${heroPics} фотографий, должна быть одна`);
else ok('в hero одна фотография, дубля-подложки нет');

/* --- 4в. Редакционный аккордеон услуг: открыт ровно один сюжет --- */
const cardsBefore = await page.evaluate(() => document.querySelectorAll('.service-card.is-open').length);
if (cardsBefore !== 1) fail(`раскрытых карточек на старте ${cardsBefore}, ожидалась одна`);
else ok('на старте раскрыта одна карточка');

await page.click('.service-card[data-service="acaricidal"] .service-more');
await page.waitForTimeout(800);
const cardOpen = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.service-card')];
  const open = cards.filter((c) => c.classList.contains('is-open'));
  const active = document.querySelector('.service-card[data-service="acaricidal"]');
  const picture = active.querySelector('picture');
  const detail = active.querySelector('.service-card-detail');
  return {
    openCount: open.length,
    activeIsOpen: active.classList.contains('is-open'),
    pictureHeight: Math.round(picture.getBoundingClientRect().height),
    detailHeight: Math.round(detail.getBoundingClientRect().height),
    detailOpacity: Number(getComputedStyle(detail).opacity),
    detailText: detail.textContent.replace(/\s+/g, ' ').trim().slice(0, 40),
    aria: [...document.querySelectorAll('.service-more')].map((b) => b.getAttribute('aria-expanded')).join(','),
  };
});
if (cardOpen.openCount !== 1 || !cardOpen.activeIsOpen) fail(`после клика раскрыто ${cardOpen.openCount} карточек`);
else if (cardOpen.pictureHeight < 250) fail(`фотография раскрытой услуги слишком мала (${cardOpen.pictureHeight}px)`);
else if (cardOpen.detailHeight < 180) fail(`описание раскрытой услуги схлопнуто (${cardOpen.detailHeight}px)`);
else if (cardOpen.detailOpacity < 0.9) fail(`описание не появилось (прозрачность ${cardOpen.detailOpacity})`);
else if (cardOpen.aria !== 'false,false,true,false') fail('aria-expanded не синхронизирован: ' + cardOpen.aria);
else ok(`аккордеон услуги раскрывает фото ${cardOpen.pictureHeight}px и описание («${cardOpen.detailText}…»)`);

await page.focus('.service-card[data-service="acaricidal"] .service-more');
await page.keyboard.press('Escape');
const cardEscaped = await page.evaluate(() => ({
  openCount: document.querySelectorAll('.service-card.is-open').length,
  aria: document.querySelector('.service-card[data-service="acaricidal"] .service-more').getAttribute('aria-expanded'),
  focused: document.activeElement === document.querySelector('.service-card[data-service="acaricidal"] .service-more'),
}));
if (cardEscaped.openCount !== 0 || cardEscaped.aria !== 'false' || !cardEscaped.focused) fail('Escape не закрывает сфокусированную услугу корректно');
else ok('Escape закрывает сфокусированную услугу и возвращает фокус');
await page.click('.service-card[data-service="acaricidal"] .service-more');

/* --- 4в-2. Кнопки раскрытия целиком внутри карточек.
       В узкой карточке грид-колонка 1fr не сжимается ниже min-content заголовка
       и выталкивает кнопку за край, где её срезает overflow: hidden. --- */
for (const w of [1000, 1160, 1440]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.waitForTimeout(220);
  const clipped = await page.evaluate(() => [...document.querySelectorAll('.service-card')].map((c) => {
    const card = c.getBoundingClientRect();
    const btn = c.querySelector('.service-more').getBoundingClientRect();
    const over = Math.max(btn.right - card.right, card.left - btn.left, card.top - btn.top, btn.bottom - card.bottom);
    return { s: c.dataset.service, over: Math.round(over) };
  }).filter((x) => x.over > 0));
  if (clipped.length) fail(`${w}px — кнопки раскрытия выходят за карточку: ` + clipped.map((c) => `${c.s} на ${c.over}px`).join(', '));
  else ok(`${w}px — кнопки раскрытия целиком внутри карточек`);
}
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(200);

/* --- 4г. Быстрый подбор: выбор виден и переносится в заявку --- */
await page.selectOption('#quickObject', 'restaurant');
await page.selectOption('#quickIssue', 'rodents');
await page.waitForTimeout(150);
const quick = await page.evaluate(() => [...document.querySelectorAll('.quick-field')].map((f) => ({
  hint: f.querySelector('small').textContent, filled: f.classList.contains('filled'),
})));
if (!quick.every((f) => f.filled) || quick[0].hint !== 'Ресторан' || quick[1].hint !== 'Грызуны') {
  fail('быстрый подбор не показывает выбранное: ' + JSON.stringify(quick));
} else ok('быстрый подбор показывает выбор: ' + quick.map((f) => f.hint).join(' + '));

await page.click('#quickGo');
await page.waitForTimeout(700);
const carried = await page.evaluate(() => ({
  obj: document.querySelector('#fObject').value,
  issues: [...document.querySelectorAll('input[name="issue"]:checked')].map((i) => i.value).join(','),
  res: document.querySelector('#pickerResult').textContent,
}));
if (carried.obj !== 'restaurant' || carried.issues !== 'rodents' || !/Дератизация/.test(carried.res)) {
  fail('быстрый подбор не перенёс выбор в заявку: ' + JSON.stringify({ obj: carried.obj, issues: carried.issues }));
} else ok('быстрый подбор переносит выбор в заявку и показывает состав работ');

/* --- 5. Живой сценарий подбора --- */
await page.selectOption('#fObject', 'territory');
const tickBox = '#issuesBox label:has(input[value="ticks"])';
await page.click(tickBox);
await page.waitForTimeout(200);
let res = await page.textContent('#pickerResult');
if (!res.includes('Акарицидная') || !res.includes('Флажирование')) fail('территория + клещи: нет акарицидной обработки с методами');
else ok('территория + клещи → акарицидная обработка с методами');

await page.click(tickBox);
await page.selectOption('#fObject', 'housing');
await page.click(tickBox);
await page.waitForTimeout(200);
res = await page.textContent('#pickerResult');
if (!/территори/i.test(res)) fail('жильё + клещи: нет поясняющего примечания');
else ok('жильё + клещи → примечание вместо неподходящей услуги');

/* --- 6. Форма --- */
await page.selectOption('#fObject', 'warehouse');
await page.fill('#fName', 'Иван');
await page.fill('#fPhone', '89188266617');
const masked = await page.inputValue('#fPhone');
if (masked !== '+7 (918) 826-66-17') fail('маска телефона дала «' + masked + '»');
else ok('маска телефона: 89188266617 → ' + masked);

await page.evaluate(() => { window.__mail = null; });
await page.click('#btnMail');
let opened = await page.evaluate(() => window.__mail);
if (opened) fail('заявка ушла без согласия на обработку ПДн');
else ok('без согласия на обработку ПДн отправка блокируется');

await page.check('#fConsent');
await page.click('#btnMail');
opened = await page.evaluate(() => window.__mail);
if (!opened || !opened.startsWith('mailto:aziev-robert@mail.ru?subject=')) fail('некорректная ссылка письма: ' + opened);
else {
  const decoded = decodeURIComponent(opened.split('body=')[1]);
  if (!decoded.includes('Складские помещения') || !decoded.includes('+7 (918) 826-66-17')) fail('в тексте заявки нет объекта или телефона');
  else ok('письмо: ссылка собрана, объект и телефон в тексте');
}

/* --- 7. Контакты нормализованы --- */
const links = await page.evaluate(() => ({
  tel: [...new Set([...document.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href')))],
  mail: [...new Set([...document.querySelectorAll('a[href^="mailto:"]')].map((a) => a.getAttribute('href')))],
}));
if (links.tel.some((h) => h !== 'tel:+79188266617')) fail('нестандартный tel:: ' + links.tel.join(', '));
else ok('все tel: в международном формате');
if (links.mail.some((h) => !h.startsWith('mailto:aziev-robert@mail.ru'))) fail('неверный mailto: ' + links.mail.join(', '));
else ok('mailto ведёт на почту заказчика');

/* --- 8. Страницу нельзя увести вбок.
       Именно так, а не по scrollWidth: он превышает окно и на здоровой странице,
       а body здесь имеет overflow-x: hidden, который прячет настоящее переполнение. --- */
for (const w of [320, 375, 768, 1024, 1280, 1440]) {
  await page.setViewportSize({ width: w, height: 800 });
  await page.waitForTimeout(120);
  const x = await page.evaluate(() => { window.scrollTo(400, 0); const v = window.scrollX; window.scrollTo(0, 0); return v; });
  if (x !== 0) fail(`при ширине ${w}px страница уезжает вбок на ${x}px`);
  else ok(`${w}px — горизонтального сдвига нет`);
}

/* --- 9. Шапка помещается в контейнер --- */
for (const w of [1024, 1160, 1280, 1440]) {
  await page.setViewportSize({ width: w, height: 800 });
  await page.waitForTimeout(380);
  const nav = await page.evaluate(() => {
    const n = document.querySelector('.nav-shell');
    const cs = getComputedStyle(n);
    const inner = n.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const kids = [...n.children].filter((c) => c.getBoundingClientRect().width > 0);
    const used = kids.reduce((a, c) => a + c.getBoundingClientRect().width, 0) + parseFloat(cs.gap || 0) * (kids.length - 1);
    return { inner: Math.round(inner), used: Math.round(used) };
  });
  if (nav.used > nav.inner) fail(`шапка на ${w}px не помещается: занято ${nav.used}px при ${nav.inner}px`);
  else ok(`${w}px — шапка помещается (${nav.used} из ${nav.inner}px)`);
}

/* --- 9б. Прямое открытие публичных hash-якорей --- */
for (const w of [375, 1440]) {
  await page.setViewportSize({ width: w, height: 900 });
  for (const hash of ['top', 'services', 'equipment', 'process', 'documents', 'request', 'contacts']) {
    await page.goto(`${BASE}/#${hash}`, { waitUntil: 'load' });
    await page.waitForTimeout(120);
    const anchor = await page.evaluate((id) => {
      const target = document.getElementById(id);
      const header = document.querySelector('.site-header');
      const targetTop = Math.round(target.getBoundingClientRect().top);
      const headerBottom = Math.round(header.getBoundingClientRect().bottom);
      return { targetTop, headerBottom, hash: location.hash };
    }, hash);
    if (anchor.hash !== `#${hash}`) fail(`${w}px #${hash} — hash не установлен`);
    else if (hash !== 'top' && anchor.targetTop < anchor.headerBottom - 4) fail(`${w}px #${hash} — начало секции перекрыто шапкой (${anchor.targetTop}px < ${anchor.headerBottom}px)`);
  }
  ok(`${w}px — прямые переходы по 7 hash-якорям не перекрываются шапкой`);
}

/* --- 9в. Плавающая кнопка звонка: после hero, но не поверх формы и контактов --- */
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(BASE + '/', { waitUntil: 'load' });
const floatingStates = {};
for (const [name, selector] of [['hero', '#top'], ['services', '#services'], ['request', '#request'], ['contacts', '#contacts']]) {
  await page.locator(selector).scrollIntoViewIfNeeded();
  await page.waitForTimeout(380);
  floatingStates[name] = await page.evaluate(() => {
    const item = document.querySelector('.floating-contact');
    return { href: item.getAttribute('href'), visible: item.classList.contains('visible'), suppressed: item.classList.contains('suppressed'), opacity: Number(getComputedStyle(item).opacity) };
  });
}
if (floatingStates.hero.href !== 'tel:+79188266617') fail('плавающая кнопка ведёт не на телефон: ' + floatingStates.hero.href);
else if (floatingStates.hero.opacity > 0.1) fail('плавающая кнопка звонка видна в hero');
else if (!floatingStates.services.visible || floatingStates.services.suppressed || floatingStates.services.opacity < 0.9) fail('плавающая кнопка звонка не появилась после hero');
else if (!floatingStates.request.suppressed || floatingStates.request.opacity > 0.1) fail('плавающая кнопка звонка перекрывает заявку');
else if (!floatingStates.contacts.suppressed || floatingStates.contacts.opacity > 0.1) fail('плавающая кнопка звонка перекрывает контакты');
else ok('плавающая кнопка звонка появляется после hero и подавляется у заявки/контактов');

/* --- 10. Мобильное меню и тач-цели --- */
await page.setViewportSize({ width: 390, height: 800 });
await page.waitForTimeout(120);
await page.click('.menu-button');
const menu = await page.evaluate(() => {
  const m = document.querySelector('.mobile-menu');
  const b = document.querySelector('.menu-button');
  return { open: m && getComputedStyle(m).display !== 'none', expanded: b && b.getAttribute('aria-expanded') };
});
if (!menu.open || menu.expanded !== 'true') fail('бургер не открывает мобильное меню');
else ok('мобильное меню открывается, aria-expanded синхронизирован');
await page.keyboard.press('Escape');

const small = await page.evaluate(() => {
  const bad = [];
  document.querySelectorAll('a.btn, button, .choice span, .desktop-nav a, .mobile-menu a, .system-tab, .service-tab').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.height < 40) bad.push((el.textContent || el.className).trim().slice(0, 28) + ` (${Math.round(r.height)}px)`);
  });
  return bad;
});
if (small.length) fail('тач-цели ниже 40px: ' + small.join('; '));
else ok('все видимые тач-цели не ниже 40px');

/* --- 10б. Копирование заявки --- */
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.selectOption('#fObject', 'warehouse');
await page.fill('#fName', 'Иван');
await page.fill('#fPhone', '89188266617');
await page.check('#fConsent');
await page.evaluate(() => {
  window.__copied = '';
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async (text) => { window.__copied = text; } },
  });
});
await page.click('#btnCopy');
await page.waitForTimeout(80);
const copied = await page.evaluate(() => window.__copied);
if (!copied || !copied.includes('Складские помещения') || !copied.includes('+7 (918) 826-66-17')) fail('кнопка копирования не собрала полную заявку');
else ok('копирование заявки включает объект и телефон');

/* --- 11. Без JavaScript --- */
const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
const noJsPage = await ctx.newPage();
await noJsPage.goto(BASE + '/', { waitUntil: 'load' });
const noJs = await noJsPage.evaluate(() => {
  const rev = [...document.querySelectorAll('.reveal')];
  return {
    total: rev.length,
    hidden: rev.filter((e) => parseFloat(getComputedStyle(e).opacity) < 0.5).length,
    h2: document.querySelectorAll('h2').length,
    phone: !!document.querySelector('a[href^="tel:"]'),
    equipment: document.querySelectorAll('.equipment-grid li').length,
    details: [...document.querySelectorAll('.service-card')].filter((c) => {
      const d = c.querySelector('.service-card-detail');
      if (!d) return false;
      const cr = c.getBoundingClientRect(), dr = d.getBoundingClientRect();
      return dr.height > 0 && dr.top >= cr.top - 1 && dr.bottom <= cr.bottom + 1;
    }).length,
  };
});
await ctx.close();
if (noJs.hidden) fail(`без JS скрыто ${noJs.hidden} из ${noJs.total} блоков .reveal`);
else if (!noJs.phone || noJs.h2 < 6) fail('без JS страница неполная');
else if (noJs.equipment !== 11) fail(`без JS позиций оснащения ${noJs.equipment}, ожидалось 11`);
else if (noJs.details !== 4) fail(`без JS видно ${noJs.details} описаний услуг из 4 — раскрытие карточек недоступно, текст обязан быть виден сразу`);
else ok(`без JS: контент виден, ${noJs.h2} заголовков, 11 позиций оснащения, 4 описания услуг, телефон доступен`);

/* --- 11б. Prefers reduced motion --- */
const motionCtx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });
const motionPage = await motionCtx.newPage();
await motionPage.goto(BASE + '/', { waitUntil: 'load' });
const motion = await motionPage.evaluate(() => {
  const reveal = document.querySelector('.reveal');
  const hero = document.querySelector('.hero-visual');
  return {
    opacity: Number(getComputedStyle(reveal).opacity),
    transform: getComputedStyle(reveal).transform,
    heroTransform: getComputedStyle(hero).transform,
    media: matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
});
await motionCtx.close();
if (!motion.media || motion.opacity < 0.99 || (motion.transform !== 'none' && motion.transform !== 'matrix(1, 0, 0, 1, 0, 0)')) fail('prefers-reduced-motion не отключил reveal-движение');
else if (motion.heroTransform !== 'none' && motion.heroTransform !== 'matrix(1, 0, 0, 1, 0, 0)') fail('prefers-reduced-motion не отключил параллакс hero');
else ok('prefers-reduced-motion отключает reveal и параллакс');

/* --- 12. Политика ПДн --- */
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(BASE + '/privacy.html', { waitUntil: 'networkidle' });
const privacy = await page.evaluate(() => ({
  text: document.body.textContent,
  h1: (document.querySelector('h1') || {}).textContent || '',
}));
if (!/152-ФЗ/.test(privacy.text)) fail('в политике нет ссылки на 152-ФЗ');
else if (!/\[ПРОВЕРИТЬ\]/.test(privacy.text)) fail('в политике нет маркера [ПРОВЕРИТЬ]');
else if (/кв\.\s*\d/.test(privacy.text)) fail('в политике опубликован номер квартиры');
else ok('политика: 152-ФЗ, маркер [ПРОВЕРИТЬ], номера квартиры нет');

/* --- 13. Никаких выдуманных фактов --- */
const pageText = await page.goto(BASE + '/').then(() => page.evaluate(() => document.body.innerText));
const banned = [
  [/\bот\s*\d[\d\s]*(₽|руб)/i, 'цена «от N ₽»'],
  [/24\s*\/\s*7|круглосуточно/i, 'режим 24/7'],
  [/гаранти[яию]\s+\d/i, 'срок гарантии'],
  [/выезд(?:аем)?\s+за\s+\d/i, 'срок выезда'],
  [/более\s+\d+\s+объект/i, 'счётчик объектов'],
  [/\d+\s+(лет|года)\s+(опыта|на рынке)/i, 'стаж'],
  [/отзыв|рейтинг/i, 'отзывы или рейтинг'],
];
const found = banned.filter(([re]) => re.test(pageText)).map(([, label]) => label);
if (found.length) fail('на странице появились неподтверждённые факты: ' + found.join(', '));
else ok('выдуманных фактов нет: ни цен, ни сроков, ни гарантий, ни отзывов');

await browser.close();

console.log('');
if (problems.length) {
  console.error('ПРОБЛЕМЫ:');
  problems.forEach((p) => console.error('  ✗ ' + p));
  process.exit(1);
}
console.log('Все браузерные проверки пройдены.');
