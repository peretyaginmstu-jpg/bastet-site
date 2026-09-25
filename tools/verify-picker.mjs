/* Офлайн-прогон логики подбора: все комбинации «объект × проблема» без браузера.
   Запуск: node tools/verify-picker.mjs */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const S = require(resolve(here, '../js/data.js'));

let checked = 0;
const problems = [];
const fail = (msg) => problems.push(msg);

/* 1. Каждая пара «объект × проблема» даёт либо услугу, либо внятное примечание */
for (const obj of S.OBJECTS) {
  for (const issue of S.ISSUES) {
    checked++;
    const r = S.pickServices(obj.id, [issue.id]);
    if (!r.services.length && !r.notes.length) {
      fail(`${obj.id} × ${issue.id}: пусто — ни услуги, ни примечания`);
    }
    /* клещи вне открытой территории должны давать примечание, а не услугу */
    if (issue.id === 'ticks' && !obj.outdoor) {
      if (r.services.length) fail(`${obj.id} × клещи: предложена акарицидная обработка на закрытом объекте`);
      if (!r.notes.length) fail(`${obj.id} × клещи: нет примечания`);
    }
    /* у каждой подобранной услуги должен быть полный состав */
    for (const s of r.services) {
      if (!s.methods.length) fail(`${s.id}: нет методов`);
      if (!s.preparations.length) fail(`${s.id}: нет препаратов`);
      if (!s.docs.length) fail(`${s.id}: нет отчётных документов`);
      for (const id of s.equipment) if (!S.EQUIPMENT[id]) fail(`${s.id}: неизвестное оборудование «${id}»`);
      for (const id of s.preparations) if (!S.PREPARATIONS[id]) fail(`${s.id}: неизвестный препарат «${id}»`);
    }
  }
}

/* 2. Плановая профилактика раскрывается корректно */
for (const obj of S.OBJECTS) {
  const r = S.pickServices(obj.id, ['prevention']);
  const expected = obj.outdoor ? 4 : 3;
  if (r.services.length !== expected) {
    fail(`${obj.id} × профилактика: услуг ${r.services.length}, ожидалось ${expected}`);
  }
}

/* 3. Ничего не выбрано — пусто и без ошибок */
const empty = S.pickServices('', []);
if (empty.services.length || empty.notes.length) fail('пустой выбор даёт непустой результат');

/* 4. Несколько проблем не дублируют услуги */
const multi = S.pickServices('territory', ['insects', 'prevention', 'ticks']);
if (new Set(multi.services.map((s) => s.id)).size !== multi.services.length) fail('дубли услуг при нескольких проблемах');

/* 5. Ссылки заявки собираются и укладываются в лимиты */
const text = S.buildRequestText({
  name: 'Иван Иванов',
  phone: '+7 (918) 826-66-17',
  objectLabel: 'Пищевые производства',
  place: 'Москва, цех 1200 м²',
  issueLabels: ['Насекомые', 'Грызуны'],
  serviceNames: ['Дезинсекция', 'Дератизация, пест-контроль'],
  comment: 'Нужна обработка в нерабочую смену. '.repeat(40),
});
const mail = 'mailto:' + S.CONTACTS.email + '?subject=' + encodeURIComponent('Заявка с сайта') + '&body=' + encodeURIComponent(text);
if (!S.CONTACTS.phoneLink.startsWith('+7') || S.CONTACTS.phoneLink.length !== 12) fail('телефон не в международном формате: ' + S.CONTACTS.phoneLink);
if ('whatsapp' in S.CONTACTS) fail('в контактах остался WhatsApp — заказчик просил только телефон и почту');
if (!text.startsWith('Заявка с сайта «Бастет»')) fail('текст заявки не содержит название «Бастет»');
console.log(`  длина mailto с длинным комментарием: ${mail.length} символов (в коде обрезается после 1800)`);

/* 6. Полнота данных по ТЗ */
if (S.OBJECTS.length !== 12) fail(`типов объектов ${S.OBJECTS.length}, в ТЗ 12`);
if (S.SERVICES.length !== 4) fail(`услуг ${S.SERVICES.length}, в ТЗ 4`);
if (Object.keys(S.EQUIPMENT).length !== 11) fail(`оборудования ${Object.keys(S.EQUIPMENT).length}, в ТЗ 11 позиций`);
if (Object.keys(S.PREPARATIONS).length !== 13) fail(`препаратов ${Object.keys(S.PREPARATIONS).length}, в ТЗ 13 позиций`);

console.log(`Проверено комбинаций: ${checked}`);
if (problems.length) {
  console.error('\nПРОБЛЕМЫ:');
  problems.forEach((p) => console.error('  ✗ ' + p));
  process.exit(1);
}
console.log('Логика подбора и сборки заявки — без замечаний.');
