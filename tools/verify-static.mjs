import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const index = readFileSync(resolve(root, 'index.html'), 'utf8');
const privacy = readFileSync(resolve(root, 'privacy.html'), 'utf8');
const css = readFileSync(resolve(root, 'css/styles.css'), 'utf8');
const app = readFileSync(resolve(root, 'js/app.js'), 'utf8');
const data = readFileSync(resolve(root, 'js/data.js'), 'utf8');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

function localAssetRefs(html) {
  const refs = [];
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) refs.push(match[1]);
  for (const match of html.matchAll(/srcset="([^"]+)"/g)) {
    for (const candidate of match[1].split(',')) refs.push(candidate.trim().split(/\s+/)[0]);
  }
  return refs.filter((ref) => ref && !/^(?:#|https?:|tel:|mailto:|data:)/.test(ref));
}

for (const page of ['index.html', 'privacy.html']) {
  const html = page === 'index.html' ? index : privacy;
  for (const ref of localAssetRefs(html)) {
    const pathname = ref.split(/[?#]/)[0];
    const target = resolve(root, pathname);
    check(existsSync(target), `${page}: отсутствует локальный ресурс ${pathname}`);
    if (existsSync(target)) check(statSync(target).size > 0, `${page}: пустой ресурс ${pathname}`);
  }
}

for (const [name, html] of [['index.html', index], ['privacy.html', privacy]]) {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicates = ids.filter((id, position) => ids.indexOf(id) !== position);
  check(duplicates.length === 0, `${name}: повторяющиеся id: ${[...new Set(duplicates)].join(', ')}`);
  const images = [...html.matchAll(/<img\b[^>]*>/g)].map((match) => match[0]);
  images.forEach((tag, index) => check(/\salt="[^"]*"/.test(tag), `${name}: img #${index + 1} без alt`));
  check(/<html[^>]+lang="ru"/.test(html), `${name}: не указан lang=ru`);
  check(/<main\b/.test(html) && /<nav\b/.test(html) && /<footer\b/.test(html), `${name}: неполный набор семантических областей`);
}

check((index.match(/class="service-card"/g) || []).length === 4, 'На странице должно быть ровно 4 карточки услуг');
check((index.match(/<li><span><i class="ic"/g) || []).length === 5, 'В процессе должно быть 5 этапов');
check(index.includes('Л064-00111-77/02987662'), 'Нет подтверждённого номера лицензии');
/* Правки заказчика 25.09.2026. */
for (const [name, text] of [['index.html', index], ['privacy.html', privacy], ['js/app.js', app], ['js/data.js', data], ['css/styles.css', css]]) {
  check(!/whatsapp|wa\.me/i.test(text), `${name}: остался WhatsApp — заказчик просил только телефон и почту`);
}
/* Файлы в корне сайта отдаются сервером: служебные *.md тоже не должны упоминать WhatsApp
   и старый домен-заглушку. */
for (const name of readdirSync(root).filter((file) => /\.md$/i.test(file))) {
  const text = readFileSync(resolve(root, name), 'utf8');
  check(!/whatsapp|wa\.me/i.test(text), `${name}: в корне сайта упомянут WhatsApp`);
  check(!/example\.ru/i.test(text), `${name}: в корне сайта остался домен-заглушка example.ru`);
}
{
  /* Подзаголовок заказчика: либо цельным абзацем, либо вводная фраза + список .object-list — слова дословно. */
  const lead = (index.match(/<p class="hero-lead">([\s\S]*?)<\/p>/) || [])[1] || '';
  const list = (index.match(/<ul class="object-list"[^>]*>([\s\S]*?)<\/ul>/) || [])[1] || '';
  const items = [...list.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());
  const text = (lead.replace(/<[^>]+>/g, '').trim() + (items.length ? ' ' + items.join(', ') + '.' : '')).replace(/\s+/g, ' ');
  check(text === "Оказание услуг по дезинсекции, дератизации, дезинфекции, пест-контроля и акарицидной обработке на следующих типах объектов: пищевые производства, пищеблоки, рестораны, кафе, складские помещения, жилые помещения, места общего пользования, офисные помещения, базы отдыха, подвальные и чердачные помещения, территория, периметр зданий и сооружений.", 'Подзаголовок hero не совпадает с текстом заказчика: ' + text.slice(0, 120));
}
check(index.includes("зависит от особенностей объекта. Подберём её после бесплатного выезда и обследования.") && index.includes('class="price-note"'), 'Нет блока о ценообразовании');
check(/<title>[^<]*Бастет/.test(index) && /<title>[^<]*Бастет/.test(privacy), 'Нет названия «Бастет» в title');
check(index.includes('https://bastet-dez.ru/') && !index.includes('example.ru'), 'Canonical/OG должны указывать на bastet-dez.ru');
/* Правки заказчика 26.09.2026. */
check(!index.includes('control-section') && !index.includes('Контроль эффективности после обработки'),
  'Блок «Контроль эффективности после обработки» убран по просьбе заказчика (есть в услуге 03)');
{
  const disinfection = (index.match(/<div class="service-card-detail" id="sd-disinfection">[\s\S]*?<\/ul>/) || [])[0] || '';
  const tags = [...disinfection.matchAll(/<li>([^<]*)<\/li>/g)].map((m) => m[1]);
  const expected = ['Профилактическая (точечное орошение в местах риска заражения)', 'Заключительная (орошение генератором холодного тумана в закрытом пространстве)'];
  check(JSON.stringify(tags) === JSON.stringify(expected), 'Приписки к дезинфекции должны быть ровно две, текстом заказчика: ' + tags.join(' | '));
  check(expected.every((t) => data.includes(`'${t}'`)) && !data.includes('Орошение рабочим раствором'), 'Методы дезинфекции в js/data.js не совпадают с приписками на странице');
}
check(!/quick-mark/.test(index) && !/quick-mark/.test(css), 'Водяной знак-кошка удалён вместе со старым логотипом');
for (const [name, html] of [['index.html', index], ['privacy.html', privacy]]) {
  check(/<symbol id="logo-bastet" viewBox="21 37 169 109">/.test(html), `${name}: в спрайте не логотип заказчика (монограмма + «БАСТЕТ», brand/build-logo.py)`);
  check((html.match(/<span class="visually-hidden">Бастет<\/span>/g) || []).length === 2, `${name}: у логотипа в шапке и подвале нет текстового имени «Бастет»`);
  check(!/bastet-badge|bastet-mark|logo-eye/.test(html), `${name}: остались ссылки на старый знак-кошку`);
}
check(index.includes('сертифицированными препаратами нового поколения'), 'Пропущен факт о сертифицированных препаратах нового поколения');
check(index.includes('резистентность вредителей'), 'Пропущен факт об учёте резистентности вредителей');
check(index.includes('ГБУК г. Москвы «Театр им. Моссовета»'), 'Неполное наименование контрагента Театр им. Моссовета');
check(index.includes('ФГАУ «НМИЦ здоровья детей» Минздрава России'), 'Неполное наименование контрагента НМИЦ здоровья детей');
check(!/кв\.\s*\d/.test(privacy), 'В политике опубликован номер квартиры (жилое помещение)');
{
  /* Пометка о вычитке политики нужна команде до утверждения текста заказчиком, но посетителю
     её видеть нельзя: маркер [ПРОВЕРИТЬ] допустим только внутри служебного <p id="reviewNote" hidden>. */
  const note = (privacy.match(/<p class="legal-notice" id="reviewNote" hidden>[\s\S]*?<\/p>/) || [])[0] || '';
  const outside = privacy.replace(note, '').replace(/<!--[\s\S]*?-->/g, '');
  check(note.includes('[ПРОВЕРИТЬ]'), 'В политике нет служебной пометки [ПРОВЕРИТЬ] о необходимости вычитки (скрытый #reviewNote)');
  check(!outside.includes('[ПРОВЕРИТЬ]') && !index.includes('[ПРОВЕРИТЬ]'), 'Маркер [ПРОВЕРИТЬ] виден посетителю: допустим только в скрытом #reviewNote политики');
}
/* Инлайновый SVG теперь разрешён и обязателен: на нём спрайт иконок и иллюстрации
   оборудования по блоку 2 ТЗ. Иконочный шрифт Phosphor удалён. */
check(/<symbol id="i-/.test(index), 'В index.html нет спрайта иконок');
check(!/license\.(?:png|jpe?g|webp|avif)/i.test(index), 'Скан лицензии нельзя заменять изображением-заглушкой');
/* В pastel-версии тяжёлое стекло убрано: blur остаётся только у компактной навигации
   и доказательной полосы, поэтому проверяем фолбэк без требования mask-composite. */
check(!/backdrop-filter\s*:/.test(css), 'V4 не должна зависеть от backdrop-filter');
/* Палитра V5 «Бастет» (_dev/directions/SYNTHESIS.md): все 13 токенов должны быть в CSS. */
for (const token of ['#f7f2e8', '#fffcf5', '#e8d7bf', '#f3e9da', '#d9c6a8', '#c8d5c1', '#e6ece1', '#556b57', '#3f5142', '#7a5f3f', '#28312b', '#5f685f', '#7c8478']) {
  check(css.toLowerCase().includes(token), `В CSS отсутствует pastel-токен ${token}`);
}
check(!/btn-whatsapp/.test(css), 'В CSS остались стили .btn-whatsapp');
check(/font-synthesis:\s*none/.test(css), 'Prata без синтеза: нужен font-synthesis: none');
check(/prata-regular-cyrillic\.woff2/.test(index) && /rel="preload"[^>]+prata-regular-cyrillic/.test(index), 'Нет preload кириллической Prata');
check(/<symbol id="logo-bastet"/.test(index) && /<symbol id="logo-bastet"/.test(privacy), 'Нет символа логотипа #logo-bastet в спрайте');
check(!/[∩]/.test(index) && !/content:\s*"∩"/.test(css), 'Маркер «∩» запрещён (читается как «п»)');
check(!css.toLowerCase().includes('#07111f'), 'В CSS осталась тёмно-синяя база v2');
check(css.includes('@media (prefers-reduced-motion: reduce)'), 'Нет отключения движения для prefers-reduced-motion');
check(css.includes(':focus-visible'), 'Нет заметного состояния focus-visible');
check(css.includes('min-width: 320px'), 'Не зафиксирована минимальная тестовая ширина 320 px');
check(app.includes("event.key === 'Escape'"), 'Мобильное меню не закрывается по Escape');
check(app.includes("event.key !== 'ArrowRight'"), 'Табы не поддерживают клавиши со стрелками');
check(app.includes("if (!consent || !consent.checked)"), 'Нет проверки согласия перед отправкой');
check(app.includes("navigator.clipboard"), 'Нет копирования заявки');
check(app.includes("'mailto:' + C.email"), 'Нет отправки заявки через почтовый клиент');
check(data.includes('function pickServices'), 'Отсутствует клиентская функция подбора');

/* Правки по ревью V5 (25.09.2026): регрессионные проверки. */
check(!/rel="preload"[^>]+preparations-tab/.test(index), 'Кадр неактивной вкладки «Препараты» не должен предзагружаться в <head>');
for (const [name, text] of [['index.html', index], ['privacy.html', privacy]]) {
  check(!/консультаци/i.test(text), `${name}: подпись у телефона не должна обещать «консультацию» — только «Звонок»`);
  const visible = text.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
  const all = (visible.match(/Л064-00111-77\/02987662/g) || []).length;
  const wrapped = (visible.match(/<span class="nowrap">Л064-00111-77\/02987662<\/span>/g) || []).length;
  check(all > 0 && all === wrapped, `${name}: номер лицензии должен стоять в <span class="nowrap"> (не рваться на дефисах): ${wrapped} из ${all}`);
}
{
  /* Цифры в заголовках (Prata) — только Inter: цифра допустима лишь внутри <span class="num">. */
  const headings = [...index.matchAll(/<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/g)].map((m) => m[2]);
  const withDigits = headings.filter((h) => /\d/.test(h.replace(/<span class="num">\d+<\/span>/g, '').replace(/<[^>]+>/g, '')));
  check(!withDigits.length, 'Цифры в заголовках Prata: ' + withDigits.join(' | '));
}
check(index.includes('от&nbsp;обследования') && privacy.includes('Политика в&nbsp;отношении'), 'Короткие предлоги в H1 должны быть привязаны неразрывным пробелом');
check(/\.legal-content a\[href\^="tel:"\][^{]*\{[^}]*white-space:\s*nowrap/.test(css), 'Телефон в тексте политики не должен рваться (white-space: nowrap)');
check(css.includes('@media (forced-colors: active)'), 'Нет правил для режима высокой контрастности (forced-colors)');
check(/id="quickError"[^>]*role="status"/.test(index) && /id="pickerLive"[^>]*role="status"/.test(index), 'Нет постоянных live-регионов для ошибки быстрого подбора и сводки подбора');
check(!/id="pickerResult"[^>]*aria-live/.test(index) && !/id="systemContent"[^>]*aria-live/.test(index), 'Блок результата и панель вкладок не должны быть live-регионами целиком');
check(/id="fPhoneError"/.test(index) && app.includes("setAttribute('aria-invalid', 'true')") && app.includes("setAttribute('aria-describedby', box.id)"), 'Ошибки формы должны быть у поля: aria-invalid и aria-describedby');
check(app.includes("event.key !== 'Home'") && app.includes("event.key !== 'End'"), 'Вкладки должны поддерживать Home и End');
check(/<main[^>]+tabindex="-1"/.test(index) && /<main[^>]+tabindex="-1"/.test(privacy), 'У <main> нужен tabindex="-1" для ссылки «Перейти к содержанию»');

function luminance(hex) {
  const channels = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
function contrast(foreground, background) {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}
const contrastPairs = [
  ['28312b', 'f7f2e8', 'основной текст на ivory'],
  ['5f685f', 'f7f2e8', 'вторичный текст на ivory'],
  ['28312b', 'c8d5c1', 'основной текст на шалфейном фоне'],
  ['556b57', 'fffcf5', 'акцентный текст на молочном фоне'],
  ['ffffff', '556b57', 'основная кнопка'],
  /* V5 */
  ['fffcf5', '3f5142', 'тёмная CTA-таблетка (milk на sage-dark)'],
  ['556b57', 'f7f2e8', 'акцентный текст на ivory'],
  ['3f5142', 'c8d5c1', 'рубрика и акценты на панели подбора'],
  ['28312b', 'e8d7bf', 'текст поля цены на песке'],
  ['3f5142', 'e8d7bf', 'акцент поля цены на песке'],
  ['7a5f3f', 'f7f2e8', 'охристые номера на ivory'],
  ['7a5f3f', 'fffcf5', 'охра на молочных поверхностях'],
  ['7a5f3f', 'f3e9da', 'охра на песочных панелях'],
  ['5f685f', 'f3e9da', 'вторичный текст на песочных панелях'],
  ['5f685f', 'e6ece1', 'вторичный текст на sage-soft'],
  ['5f685f', 'efe8d8', 'вторичный текст на ступени аркады 2'],
  ['5f685f', 'ece9dc', 'вторичный текст на ступени аркады 3'],
  ['5f685f', 'e9eadf', 'вторичный текст на ступени аркады 4'],
  ['7a3424', 'c8d5c1', 'ошибка быстрого подбора на шалфее'],
  ['7a3424', 'fffcf5', 'ошибка формы на молочном фоне'],
];
for (const [foreground, background, label] of contrastPairs) {
  check(contrast(foreground, background) >= 4.5, `Контраст ниже 4.5:1: ${label}`);
}
/* Графика и границы интерактивных элементов: не ниже 3:1 (WCAG 1.4.11). */
const uiPairs = [
  ['7c8478', 'fffcf5', 'границы полей на молочном фоне'],
  ['7c8478', 'f7f2e8', 'контур круглых кнопок на ivory'],
  ['556b57', 'c8d5c1', 'граница полей подбора на шалфее'],
  ['3f5142', 'f7f2e8', 'знак логотипа на ivory'],
];
for (const [foreground, background, label] of uiPairs) {
  check(contrast(foreground, background) >= 3, `Контраст графики ниже 3:1: ${label}`);
}

const imageNames = ['hero', 'service-disinsection', 'service-deratization', 'service-acaricidal', 'service-disinfection', 'equipment-tab', 'preparations-tab', 'contact'];
for (const name of imageNames) {
  for (const ext of ['avif', 'webp', 'jpg']) {
    check(existsSync(resolve(root, `assets/images/${name}.${ext}`)), `Нет ${name}.${ext}`);
  }
}
check(existsSync(resolve(root, 'assets/og-cover.jpg')), 'Нет обновлённой OG-обложки');
check(!existsSync(resolve(root, 'assets/icons/Phosphor.woff2')), 'Иконочный шрифт Phosphor должен быть удалён — иконки перенесены в инлайновый спрайт');

if (failures.length) {
  console.error(`Статическая проверка: ${failures.length} проблем`);
  failures.forEach((failure) => console.error(`  ✗ ${failure}`));
  process.exit(1);
}

console.log('Статическая проверка: passed');
console.log('  страницы: index.html, privacy.html');
console.log('  локальные ссылки и srcset: без битых ресурсов');
console.log('  семантика, alt, focus, reduced motion: базовые проверки пройдены');
console.log('  ключевые текстовые контрасты: WCAG AA');
console.log('  контент ТЗ и ограничения: проверены');
