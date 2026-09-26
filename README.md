# «Бастет» — лендинг санитарной службы (V5)

Дезинсекция, дератизация и пест-контроль, акарицидная обработка, дезинфекция. ИП Азиев Р. Р., Москва.
Статический сайт: семантический HTML, CSS, vanilla JS; без сборки, API, сервера заявок и хранения данных.
Шрифты локальные: Prata 400 (заголовки, OFL) и Inter var 400–700.

Итоговое направление дизайна и обязательные правила — `_dev/directions/SYNTHESIS.md`.

## Preview

```sh
cd /Users/pavelp/Documents/Claude/pest-control-site-v5-bastet
python3 devserver.py 8747
```

Открыть http://127.0.0.1:8747/ . Сервер привязан только к localhost и отдаёт файлы без кеширования.
Предыдущие версии (`../pest-control-site-v4` и старше) не изменяются.

## Публикация

Репозиторий: https://github.com/peretyaginmstu-jpg/bastet-site
Сайт: https://peretyaginmstu-jpg.github.io/bastet-site/

Каждый push в `main` запускает `.github/workflows/pages.yml` и публикует на GitHub Pages только файлы сайта:
`index.html`, `privacy.html`, `robots.txt`, `sitemap.xml`, `css/`, `js/`, `assets/`. Папки `brand/` (исходники логотипа),
`tools/` (проверки) и `README.md` лежат в репозитории, но на сайт не попадают. `_dev/` в git не входит.

Canonical/OG и sitemap указывают на будущий домен `bastet-dez.ru`: после его регистрации привязать домен
в настройках Pages (Custom domain) — адреса в разметке менять не придётся.

## Проверки

```sh
node tools/verify-static.mjs
node tools/verify-picker.mjs
node tools/verify.mjs http://127.0.0.1:8747
node tools/verify-editorial.mjs http://127.0.0.1:8747
node tools/render.mjs http://127.0.0.1:8747/ out.png 1440 900 1 1
```

Браузерные проверки используют установленный Google Chrome и Playwright из соседнего `superselezen-visa`;
сам сайт от них не зависит. Снимки и результаты — `_dev/qa-v5/`.

## Логотип

С 26.09.2026 — логотип заказчика: монограмма «Б» из тонких линий над надписью «БАСТЕТ», цвет `#556B57`
(`--sage-deep`, как зелёная строка заголовка). Прислан картинкой из конструктора Turbologo (с водяными знаками)
и перерисован в вектор по пиксельным замерам: `brand/build-logo.py` — единственный источник.

```sh
python3 brand/build-logo.py   # SVG логотипа, символы спрайта, favicon.svg
```

Генератор пишет `brand/bastet-logo.svg`, `bastet-logo-white.svg`, `bastet-monogram.svg`, `bastet-app-icon.svg`,
`brand/sprite-symbols.txt` и `assets/icons/favicon.svg`. Символ `#logo-bastet` из `sprite-symbols.txt` вставлен
в спрайты `index.html` и `privacy.html` — после изменения генератора заменить его и там. PNG (иконки приложения,
OG-обложка, `logo-green.png`/`logo-white.png` без фона, `logo-sheet.png`) рендерятся из HTML-страниц в `brand/`,
команды — в комментариях этих страниц. Прежний знак-кошка — в `brand/archive-cat/`.

Права на логотип из Turbologo заказчик получает после покупки там; если пришлёт официальный SVG — заменить им перерисовку.

## Контакты и заявки

Только телефон и почта. Сайт сам не отправляет и не сохраняет заявки: форма собирает текст
и передаёт его в почтовое приложение пользователя или копирует в буфер обмена.

## Что выкладывать на хостинг

- `index.html`, `privacy.html`
- `css/`, `js/`, `assets/`
- `robots.txt`, `sitemap.xml`

Не выкладывать: `_dev/`, `tools/`, `brand/` (исходники логотипа), `devserver.py`, `README.md` и другие `*.md`.

## Перед публикацией

- Домен `bastet-dez.ru` указан в canonical, OG, `sitemap.xml` и `robots.txt` по пожеланию заказчика — проверить регистрацию.
- Текст политики ПДн — типовой и требует утверждения заказчиком. Служебная пометка `[ПРОВЕРИТЬ]` скрыта от посетителей
  (видна по адресу `privacy.html?review=1`). После утверждения удалить её вместе с проверками маркера
  в `tools/verify-static.mjs` и `tools/verify.mjs`.
- Скан лицензии на сайте отсутствует и не подменяется изображением-заглушкой.

Материалы V4 (прежние README и design-qa) — в `_dev/archive-v4/`.
