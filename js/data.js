/* Единственный источник правды по контенту сайта.
   Меняете телефон, почту или реквизиты — правите ТОЛЬКО этот файл.
   Файл работает и в браузере (глобальный SITE), и в Node (module.exports) — на нём же
   гоняются офлайн-проверки из tools/verify-picker.mjs. */

const CONTACTS = {
  phoneHuman: '8 (918) 826-66-17',
  phoneLink: '+79188266617',
  email: 'aziev-robert@mail.ru',
  legalName: 'Индивидуальный предприниматель Азиев Роберт Русланович',
  shortName: 'ИП Азиев Р. Р.',
  brand: 'Бастет',
  domain: 'bastet-dez.ru',
  inn: '440701851711',
  ogrnip: '325774600487755',
  licenseNo: 'ЕРУЛ № Л064-00111-77/02987662',
  licenseDate: '18.08.2025',
  licenseActivity:
    'Деятельность по оказанию услуг по дезинфекции, дезинсекции и дератизации ' +
    'в целях обеспечения санитарно-эпидемиологического благополучия населения',
  city: 'Москва',
  /* Полный адрес регистрации нужен только в реквизитах политики обработки ПДн.
     Номер квартиры не выводим нигде: это жилое помещение, а privacy.html — публичная
     индексируемая страница. */
  addressLegal: '127540, г. Москва, ул. Дубнинская, д. 16, корп. 5',
};

/* Отчётные документы (ТЗ, «Общая информация») */
const DOCS = {
  acaro: 'Акт акарологического обследования',
  works: 'Акт проведения санитарных мероприятий',
  effect: 'Акт оценки эффективности проведённых мероприятий',
};

/* Оборудование (ТЗ, блок 2). id совпадает с id <symbol> в спрайте. */
const EQUIPMENT = {
  'backpack-battery': 'Ранцевый опрыскиватель аккумуляторный',
  'hot-fog': 'Генератор горячего тумана',
  'cold-fog': 'Генератор холодного тумана',
  'gel-gun': 'Пистолет для нанесения инсектицидного геля',
  'uv-lamp': 'Ультрафиолетовые лампы',
  kik: 'КИК — контрольно-истребительский контейнер',
  livetrap: 'Живоловка металлическая',
  ultrasonic: 'Ультразвуковой отпугиватель',
  'backpack-petrol': 'Ранцевый бензиновый мотоопрыскиватель',
  'entomo-kit': 'Набор энтомолога',
  flag: 'Флаг для флажирования территории',
};

/* Типы и классы препаратов (ТЗ, блок 3) */
const PREPARATIONS = {
  'gel-pheromone': 'Инсектицидные гели с феромоном',
  microcapsule: 'Жидкие микрокапсулированные концентраты',
  'insect-trap': 'Инсектицидные ловушки',
  'granule-bait': 'Пищевые гранулированные приманки',
  'rodent-bait': 'Родентицидные приманки',
  kik: 'Контрольно-истребительские контейнеры',
  'rodent-foam': 'Родентицидная пена',
  'glue-plate': 'Липкие пластины и ловушки',
  ultrasonic: 'Ультразвуковые отпугиватели',
  'acaricide-liquid': 'Инсектоакарицидные жидкие концентраты',
  'acaricide-powder': 'Инсектоакарицидные порошки',
  'disinfectant-liquid': 'Дезинфектанты в виде жидкого концентрата',
  'disinfectant-tablet': 'Таблетированные дезинфектанты',
};

/* Четыре услуги. Тексты — пересказ ТЗ под веб, без добавления фактов. */
const SERVICES = [
  {
    id: 'disinsection',
    name: 'Дезинсекция',
    target: 'Уничтожение всех видов насекомых внутри и снаружи зданий и сооружений',
    lead:
      'Профилактическая или истребительская обработка инсектицидными средствами ' +
      'различной препаративной формы — чтобы предупредить появление вредителей или уничтожить уже заселившихся.',
    methods: ['Орошение', 'Фогация', 'Ловушки и приманки', 'Нанесение геля'],
    equipment: ['backpack-battery', 'hot-fog', 'cold-fog', 'gel-gun', 'uv-lamp'],
    preparations: ['gel-pheromone', 'microcapsule', 'insect-trap', 'granule-bait'],
    docs: [DOCS.works, DOCS.effect],
  },
  {
    id: 'deratization',
    name: 'Дератизация, пест-контроль',
    target: 'Уничтожение всех видов грызунов на территории, внутри и по периметру зданий и сооружений',
    lead:
      'Профилактическая или истребительская обработка родентицидными средствами ' +
      'различной препаративной формы с постоянным контролем точек.',
    methods: [
      'Раскладка приманки',
      'Клеевые пластины и мышеловки',
      'Запенивание нежелательных дыр',
      'Закладывание приманки в норы',
    ],
    equipment: ['kik', 'livetrap', 'ultrasonic'],
    preparations: ['rodent-bait', 'kik', 'rodent-foam', 'glue-plate', 'ultrasonic'],
    docs: [DOCS.works, DOCS.effect],
  },
  {
    id: 'acaricidal',
    name: 'Акарицидная обработка',
    target: 'Уничтожение иксодовых клещей на территории',
    lead:
      'Начинаем с акарологического обследования методом флажирования — считаем численность клещей ' +
      'и оцениваем высоту и густоту травяного покрова. При необходимости пойманных особей ' +
      'лабораторно проверяют на наличие заболеваний.',
    methods: [
      'Флажирование',
      'Распыление моторным опрыскивателем дальнего действия',
      'Фогация горячим туманом',
      'Контроль на 3–5 и 15 день',
    ],
    equipment: ['backpack-petrol', 'hot-fog', 'entomo-kit'],
    preparations: ['acaricide-liquid', 'acaricide-powder'],
    docs: [DOCS.acaro, DOCS.works, DOCS.effect],
    outdoorOnly: true,
  },
  {
    id: 'disinfection',
    name: 'Дезинфекция',
    target: 'Уничтожение или предотвращение распространения инфекций',
    lead:
      'Профилактическая или заключительная дезинфекция методом орошения рабочего раствора ' +
      'в закрытом помещении или местах общего пользования. Вид препарата, концентрацию и время ' +
      'экспозиции подбираем по виду инфекции и степени её распространения.',
    methods: ['Профилактическая (точечное орошение в местах риска заражения)', 'Заключительная (орошение генератором холодного тумана в закрытом пространстве)'],
    /* В ТЗ оборудование для дезинфекции не указано — не выдумываем. */
    equipment: [],
    preparations: ['disinfectant-liquid', 'disinfectant-tablet'],
    docs: [DOCS.works, DOCS.effect],
  },
];

/* Типы объектов (ТЗ, «Общая информация»). outdoor — есть ли открытая территория,
   от этого зависит применимость акарицидной обработки. */
const OBJECTS = [
  { id: 'food-production', label: 'Пищевые производства', icon: 'obj-factory', outdoor: false },
  { id: 'kitchen', label: 'Пищеблоки', icon: 'obj-kitchen', outdoor: false },
  { id: 'restaurant', label: 'Рестораны', icon: 'obj-restaurant', outdoor: false },
  { id: 'cafe', label: 'Кафе', icon: 'obj-cafe', outdoor: false },
  { id: 'warehouse', label: 'Складские помещения', icon: 'obj-warehouse', outdoor: false },
  { id: 'housing', label: 'Жилые помещения', icon: 'obj-housing', outdoor: false },
  { id: 'common', label: 'Места общего пользования', icon: 'obj-common', outdoor: false },
  { id: 'office', label: 'Офисные помещения', icon: 'obj-office', outdoor: false },
  { id: 'recreation', label: 'Базы отдыха', icon: 'obj-recreation', outdoor: true },
  { id: 'basement', label: 'Подвалы и чердаки', icon: 'obj-basement', outdoor: false },
  { id: 'territory', label: 'Территория', icon: 'obj-territory', outdoor: true },
  { id: 'perimeter', label: 'Периметр зданий', icon: 'obj-perimeter', outdoor: true },
];

/* Что беспокоит. prevention раскрывается во все услуги, применимые к объекту. */
const ISSUES = [
  { id: 'insects', label: 'Насекомые', service: 'disinsection' },
  { id: 'rodents', label: 'Грызуны', service: 'deratization' },
  { id: 'ticks', label: 'Клещи на территории', service: 'acaricidal' },
  { id: 'infection', label: 'Инфекция, вирус', service: 'disinfection' },
  { id: 'prevention', label: 'Плановая профилактика', service: null },
];

/* Ядро подбора: тип объекта × список проблем -> услуги + примечания.
   Чистая функция без DOM, поэтому её же гоняет офлайн-проверка. */
function pickServices(objectId, issueIds) {
  const object = OBJECTS.find((o) => o.id === objectId) || null;
  const issues = (issueIds || []).filter((id) => ISSUES.some((i) => i.id === id));
  const notes = [];
  const chosen = [];

  const add = (serviceId) => {
    const service = SERVICES.find((s) => s.id === serviceId);
    if (service && chosen.indexOf(service) === -1) chosen.push(service);
  };

  /* Услуга применима к объекту, если она не «только для территории»
     или у объекта есть открытая территория. */
  const applicable = (service) => !service.outdoorOnly || !object || object.outdoor;

  issues.forEach((issueId) => {
    const issue = ISSUES.find((i) => i.id === issueId);
    if (issue.service === null) {
      SERVICES.filter(applicable).forEach((s) => add(s.id));
      return;
    }
    const service = SERVICES.find((s) => s.id === issue.service);
    if (!applicable(service)) {
      notes.push(
        'Акарицидная обработка выполняется на открытой территории. Для «' +
          object.label +
          '» подберём обработку по другому вредителю или выедем на прилегающую территорию.'
      );
      return;
    }
    add(service.id);
  });

  return { object: object, issues: issues, services: chosen, notes: notes };
}

/* Текст заявки для письма и копирования. Собирается из полей формы и результата подбора. */
function buildRequestText(form) {
  const lines = ['Заявка с сайта «Бастет» — санитарная обработка объекта', ''];
  if (form.name) lines.push('Имя: ' + form.name);
  if (form.phone) lines.push('Телефон: ' + form.phone);
  if (form.objectLabel) lines.push('Тип объекта: ' + form.objectLabel);
  if (form.place) lines.push('Адрес / площадь: ' + form.place);
  if (form.issueLabels && form.issueLabels.length) lines.push('Что беспокоит: ' + form.issueLabels.join(', '));
  if (form.serviceNames && form.serviceNames.length) lines.push('Подобранные услуги: ' + form.serviceNames.join(', '));
  if (form.comment) {
    lines.push('');
    lines.push('Комментарий: ' + form.comment);
  }
  return lines.join('\n');
}

const SITE = {
  CONTACTS: CONTACTS,
  DOCS: DOCS,
  EQUIPMENT: EQUIPMENT,
  PREPARATIONS: PREPARATIONS,
  SERVICES: SERVICES,
  OBJECTS: OBJECTS,
  ISSUES: ISSUES,
  pickServices: pickServices,
  buildRequestText: buildRequestText,
};

if (typeof window !== 'undefined') window.SITE = SITE;
if (typeof module !== 'undefined' && module.exports) module.exports = SITE;
