/* Интерактив лендинга. Контент и правила подбора находятся в data.js. */
(function () {
  'use strict';

  if (!window.SITE) return;

  var S = window.SITE;
  var C = S.CONTACTS;
  var $ = function (selector, root) { return (root || document).querySelector(selector); };
  var $$ = function (selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var qaMode = document.documentElement.classList.contains('qa-mode');

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* Типографика текстов, которые вставляет скрипт: пробел после короткого предлога или союза
     неразрывный («в норы», «для вашего»), слова через дефис не рвутся («пест-контроль»).
     Слова не меняются. Примечания подбора (notes) выводятся как есть. */
  var shortWord = /(^|[\s(«])(в|во|с|со|к|ко|и|а|о|об|у|на|по|до|от|из|за|для|не|но|ни)\s+/gi;
  function typo(value) {
    var glue = function (match, before, word) { return before + word + '\u00A0'; };
    /* Дважды: подряд идущие короткие слова («в и с») перекрываются в одном проходе. */
    return String(value == null ? '' : value).replace(shortWord, glue).replace(shortWord, glue);
  }
  function typoHtml(value) {
    return escapeHtml(typo(value)).replace(/([А-Яа-яЁё]+-[А-Яа-яЁё]+)/g, '<span class="nowrap">$1</span>');
  }

  function scrollToElement(selector) {
    var element = $(selector);
    if (!element) return;
    element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  /* Год и состояние шапки. */
  var year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  var header = $('#header');
  var floatingContact = $('.floating-contact');
  var floatingContactZones = $$('#request, #contacts, .site-footer');
  var heroSection = $('#top');

  /* Кнопка не должна лечь поверх других элементов управления — кнопок аккордеона, вкладок
     «Оборудование / Препараты», полей и кнопок подбора: промах пальцем начал бы звонок.
     На ≥1024 px, где процесс — аркада, круг не заходит и на арки «Как мы работаем»
     (на 1181–1430 px поле страницы уже круга). */
  var floatingContactGuards = $$('.service-more, [role="tab"], .btn, .round-link, .quick-field');
  var floatingContactArcade = $$('.process-list > li');
  var arcadeLayout = window.matchMedia('(min-width: 1024px)');

  /* Берём место кнопки без transform: у position: fixed offsetTop/Left считаются от окна. */
  function floatingContactCovers() {
    if (!floatingContact.offsetWidth) return false;
    var left = floatingContact.offsetLeft;
    var top = floatingContact.offsetTop;
    var right = left + floatingContact.offsetWidth;
    var bottom = top + floatingContact.offsetHeight;
    var guards = arcadeLayout.matches ? floatingContactGuards.concat(floatingContactArcade) : floatingContactGuards;
    return guards.some(function (guard) {
      var rect = guard.getBoundingClientRect();
      return rect.width > 0 && rect.right > left && rect.left < right && rect.bottom > top && rect.top < bottom;
    });
  }

  function floatingContactSuppressed() {
    return floatingContactZones.some(function (zone) {
      var rect = zone.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    }) || floatingContactCovers();
  }

  function updateHeader() {
    if (header) header.classList.toggle('scrolled', window.scrollY > 12);
    if (floatingContact) {
      var heroEnd = heroSection ? heroSection.offsetTop + heroSection.offsetHeight - 120 : 520;
      var suppressed = floatingContactSuppressed();
      var visible = window.scrollY > heroEnd;
      floatingContact.classList.toggle('visible', visible);
      floatingContact.classList.toggle('suppressed', suppressed);
      floatingContact.inert = !visible || suppressed;
    }
  }
  var headerFrame = 0;
  window.addEventListener('scroll', function () {
    if (headerFrame) return;
    headerFrame = window.requestAnimationFrame(function () { headerFrame = 0; updateHeader(); });
  }, { passive: true });
  window.addEventListener('resize', updateHeader);
  updateHeader();

  /* Мобильное меню. */
  var burger = $('#burger');
  var mobileMenu = $('#mobileMenu');
  function setMenu(open) {
    if (!burger || !mobileMenu) return;
    mobileMenu.classList.toggle('open', open);
    if (header) header.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  }
  function closeMenu() { setMenu(false); }
  if (burger && mobileMenu) {
    burger.addEventListener('click', function () {
      setMenu(!mobileMenu.classList.contains('open'));
    });
    mobileMenu.addEventListener('click', function (event) {
      if (event.target.closest('a')) closeMenu();
    });
    /* Касание вне панели (в том числе по затемнённой подложке — это псевдоэлемент шапки)
       и прокрутка страницы жестом закрывают меню. */
    document.addEventListener('click', function (event) {
      if (!mobileMenu.classList.contains('open')) return;
      if (mobileMenu.contains(event.target) || burger.contains(event.target)) return;
      closeMenu();
    });
    var closeOnPageGesture = function (event) {
      if (mobileMenu.classList.contains('open') && !mobileMenu.contains(event.target)) closeMenu();
    };
    document.addEventListener('wheel', closeOnPageGesture, { passive: true });
    document.addEventListener('touchmove', closeOnPageGesture, { passive: true });
    /* Tab за последний пункт уводит фокус из меню — закрываем, чтобы панель не перекрыла фокус. */
    mobileMenu.addEventListener('focusout', function (event) {
      var next = event.relatedTarget;
      if (next && !mobileMenu.contains(next) && next !== burger) closeMenu();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && mobileMenu.classList.contains('open')) {
        closeMenu();
        burger.focus();
      }
    });
  }

  /* Стаггер: там, где .reveal висит на контейнере, переносим его на детей и раздаём --i.
     Сетка перестаёт всплывать одним куском — карточки появляются по очереди. */
  [['.proof-rail', '.proof-item'],
   ['.process-list', 'li'],
   ['.documents-panel', 'article'],
   ['.contact-links', 'a']].forEach(function (pair) {
    var box = $(pair[0]);
    if (!box) return;
    var kids = $$(pair[1], box);
    if (kids.length < 2) return;
    box.classList.remove('reveal');
    kids.forEach(function (kid, i) {
      kid.classList.add('reveal');
      kid.style.setProperty('--i', String(i));
    });
  });

  /* На desktop карточки услуг появляются по очереди. На mobile раскрывающаяся галерея
     появляется целиком, чтобы невидимые высокие карточки не создавали пустые экраны. */
  var serviceGallery = $('.service-gallery');
  if (serviceGallery && window.matchMedia('(min-width: 901px)').matches) {
    var serviceRevealCards = $$('.service-card', serviceGallery);
    serviceGallery.classList.remove('reveal');
    serviceRevealCards.forEach(function (card, index) {
      card.classList.add('reveal');
      card.style.setProperty('--i', String(index));
    });
  }

  /* Появление секций и очень мягкий параллакс первого экрана. */
  var revealItems = $$('.reveal');
  if (!reduceMotion && !qaMode && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -3% 0px' });
    revealItems.forEach(function (item) { observer.observe(item); });
  } else {
    revealItems.forEach(function (item) { item.classList.add('in'); });
  }

  var heroVisual = $('.hero-visual');
  if (window.matchMedia) {
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', function (event) {
      reduceMotion = event.matches;
      if (reduceMotion) {
        revealItems.forEach(function (item) { item.classList.add('in'); });
        if (heroVisual) heroVisual.style.transform = '';
      }
    });
  }
  if (heroVisual && !reduceMotion && !qaMode && window.matchMedia('(min-width: 901px)').matches) {
    var parallaxQueued = false;
    window.addEventListener('scroll', function () {
      if (parallaxQueued || reduceMotion || window.innerWidth < 1024) return;
      parallaxQueued = true;
      window.requestAnimationFrame(function () {
        var offset = Math.max(-6, Math.min(6, window.scrollY * 0.012));
        heroVisual.style.transform = 'translate3d(0,' + offset + 'px,0)';
        parallaxQueued = false;
      });
    }, { passive: true });
  }

  /* Раскрытие карточек услуг: карточка расширяется, фотография уезжает влево,
     на её место выезжает описание. Одновременно открыта одна карточка. */
  var serviceCards = $$('.service-card');

  /* Мгновенная прокрутка без плавности html (тот же приём, что у alignInitialHash). */
  function scrollByInstant(dy) {
    if (!dy) return;
    var root = document.documentElement;
    root.classList.add('hash-aligning');
    window.scrollBy(0, dy);
    root.classList.remove('hash-aligning');
  }

  function closeService(card, focusIt) {
    card.classList.remove('is-open');
    var btn = $('.service-more', card);
    var detail = $('.service-card-detail', card);
    if (detail) detail.setAttribute('aria-hidden', 'true');
    if (btn) {
      btn.setAttribute('aria-expanded', 'false');
      if (focusIt) btn.focus();
    }
    updateHeader();
  }

  function openService(card, focusIt, keepInView) {
    var before = card.getBoundingClientRect().top;
    serviceCards.forEach(function (other) {
      other.classList.remove('is-open');
      var btn = $('.service-more', other);
      var detail = $('.service-card-detail', other);
      if (btn) btn.setAttribute('aria-expanded', 'false');
      if (detail) detail.setAttribute('aria-hidden', 'true');
    });
    card.classList.add('is-open');
    var button = $('.service-more', card);
    var openDetail = $('.service-card-detail', card);
    if (openDetail) openDetail.setAttribute('aria-hidden', 'false');
    if (button) {
      button.setAttribute('aria-expanded', 'true');
      if (focusIt) button.focus();
    }
    /* Если выше схлопнулась раскрытая карточка, нажатая уезжает вверх (на телефоне — за край
       экрана). Возвращаем её заголовок туда, где он был, но не под шапку. */
    if (keepInView) {
      var headerBottom = header ? header.getBoundingClientRect().bottom : 0;
      var after = card.getBoundingClientRect().top;
      if (after < before - 1) scrollByInstant(after - Math.max(before, headerBottom));
    }
    updateHeader();
  }

  serviceCards.forEach(function (card) {
    var button = $('.service-more', card);
    if (button) {
      button.addEventListener('click', function (event) {
        event.stopPropagation();
        /* Одна модель для мыши, касания, клавиатуры и экранных дикторов: кнопка раскрытой
           карточки ничего не делает (cursor: default, без смены вида при наведении) — раскрытие
           переходит к другой карточке, а не сворачивается случайным повторным нажатием.
           Свернуть раскрытую карточку можно только явным действием — клавишей Escape. */
        if (card.classList.contains('is-open')) return;
        openService(card, false, true);
      });
    }
    /* Клик по всей карточке тоже раскрывает — но не перехватываем клики по кнопке и ссылкам. */
    card.addEventListener('click', function (event) {
      if (event.target.closest('a, button')) return;
      if (card.classList.contains('is-open')) return;
      openService(card, false, true);
    });
  });

  /* Закрыть по Escape. */
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    var open = $('.service-card.is-open');
    if (!open || !open.contains(document.activeElement)) return;
    closeService(open, true);
  });

  /* Первая карточка раскрыта по умолчанию — иначе непонятно, что они вообще раскрываются. */
  if (serviceCards.length) openService(serviceCards[0], false, false);

  /* Табы оборудования и препаративных форм. */
  var systemTabs = $$('.system-tab');
  var systemContent = $('#systemContent');
  var systemImage = $('#systemImage');
  var currentSystemImage = null;
  var systemRevision = 0;
  var systemImageTimer = 0;
  var systemImageReady = { equipment: true };

  function uniqueValues(values) {
    return values.filter(function (value, index, list) { return value && list.indexOf(value) === index; });
  }

  /* Оборудование собираем по id: id совпадает с id <symbol> в спрайте,
     поэтому напротив каждой позиции встаёт её иллюстрация — как требует блок 2 ТЗ.
     Флаг для флажирования в SERVICES не числится (он часть набора энтомолога),
     но в EQUIPMENT есть и в перечень ТЗ входит — добавляем в конец. */
  var equipmentIds = uniqueValues(S.SERVICES.reduce(function (all, service) {
    return all.concat(service.equipment);
  }, []).concat(['flag']));
  var preparationNames = uniqueValues(S.SERVICES.reduce(function (all, service) {
    return all.concat(service.preparations.map(function (id) { return S.PREPARATIONS[id]; }));
  }, []));

  function applySystemImage(kind) {
    if (!systemImage) return;
    var isEquipment = kind === 'equipment';
    var base = isEquipment ? 'equipment-tab' : 'preparations-tab';
    var avif = $('source[data-system-format="avif"]', systemImage);
    var webp = $('source[data-system-format="webp"]', systemImage);
    var image = $('img', systemImage);
    if (avif) avif.srcset = 'assets/images/' + base + '-800.avif 800w, assets/images/' + base + '.avif 1600w';
    if (webp) webp.srcset = 'assets/images/' + base + '-800.webp 800w, assets/images/' + base + '.webp 1600w';
    if (image) {
      image.src = 'assets/images/' + base + '.jpg';
      image.srcset = 'assets/images/' + base + '-800.jpg 800w, assets/images/' + base + '.jpg 1600w';
      image.alt = isEquipment
        ? 'Профессиональное оборудование для санитарной обработки'
        : 'Препаративные формы для санитарной обработки';
    }
  }

  function preloadSystemImage(kind, done) {
    if (systemImageReady[kind]) { done(); return; }
    var base = kind === 'equipment' ? 'equipment-tab' : 'preparations-tab';
    var size = window.matchMedia('(max-width: 1023px)').matches ? '-800' : '';
    var formats = ['avif', 'webp', 'jpg'];
    var index = 0;
    var preload = new Image();
    preload.onload = function () {
      systemImageReady[kind] = true;
      done();
    };
    preload.onerror = function () {
      index += 1;
      if (index < formats.length) preload.src = 'assets/images/' + base + size + '.' + formats[index];
      else done();
    };
    preload.src = 'assets/images/' + base + size + '.' + formats[index];
  }

  /* One cancellable transition commits image, text and ARIA together.
     An earlier image decode can never overwrite a later selection. */
  function commitSystem(kind, html, revision) {
    if (revision !== systemRevision) return;
    systemContent.innerHTML = html;
    applySystemImage(kind);
    currentSystemImage = kind;
    systemTabs.forEach(function (tab) {
      var active = tab.getAttribute('data-system') === kind;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.setAttribute('tabindex', active ? '0' : '-1');
      if (active) systemContent.setAttribute('aria-labelledby', tab.id);
    });
    systemContent.classList.remove('swapping');
    if (systemImage) systemImage.classList.remove('swapping');
    systemContent.removeAttribute('aria-busy');
  }

  function transitionSystem(kind, html) {
    var revision = ++systemRevision;
    window.clearTimeout(systemImageTimer);
    if (!currentSystemImage || reduceMotion || qaMode) {
      commitSystem(kind, html, revision);
      return;
    }
    systemContent.setAttribute('aria-busy', 'true');
    preloadSystemImage(kind, function () {
      if (revision !== systemRevision) return;
      systemContent.classList.add('swapping');
      if (systemImage) systemImage.classList.add('swapping');
      systemImageTimer = window.setTimeout(function () {
        commitSystem(kind, html, revision);
      }, 160);
    });
  }

  function systemHtml(kind) {
    var isEquipment = kind === 'equipment';
    var intro = isEquipment
      ? 'Оснащение выбирается под метод обработки и особенности объекта.'
      : 'Работаем только с сертифицированными препаратами нового поколения. Конкретное средство подбираем после обследования с учётом особенностей объекта и резистентности вредителей.';
    var body = isEquipment
      ? '<ul class="equipment-grid">' + equipmentIds.map(function (id) {
          return '<li><span class="equipment-ill"><svg aria-hidden="true" focusable="false"><use href="#ill-' + id + '"/></svg></span>' +
                 '<span>' + escapeHtml(typo(S.EQUIPMENT[id])) + '</span></li>';
        }).join('') + '</ul>'
      : '<ul class="compact-list">' + preparationNames.map(function (item) {
          return '<li>' + escapeHtml(typo(item)) + '</li>';
        }).join('') + '</ul>';
    return '<p>' + escapeHtml(typo(intro)) + '</p>' + body;
  }

  function renderSystem(kind, focusTab) {
    if (!systemContent) return;
    if (focusTab) {
      var focusTarget = systemTabs.find(function (tab) { return tab.getAttribute('data-system') === kind; });
      if (focusTarget) focusTarget.focus();
    }
    transitionSystem(kind, systemHtml(kind));
  }

  systemTabs.forEach(function (tab, index) {
    var kind = tab.getAttribute('data-system');
    tab.addEventListener('click', function () { renderSystem(kind, false); });
    tab.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') return;
      event.preventDefault();
      var next = event.key === 'ArrowRight' ? index + 1 : index - 1;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = systemTabs.length - 1;
      if (next < 0) next = systemTabs.length - 1;
      if (next >= systemTabs.length) next = 0;
      renderSystem(systemTabs[next].getAttribute('data-system'), true);
    });
    /* Кадр второй вкладки подгружаем по намерению (наведение, фокус), а не preload в <head>. */
    var warm = function () { preloadSystemImage(kind, function () {}); };
    tab.addEventListener('pointerenter', warm);
    tab.addEventListener('focus', warm);
  });
  renderSystem('equipment', false);

  /* Высота панели — по большей из вкладок, чтобы при переключении контент ниже не прыгал. */
  function reserveSystemHeight() {
    if (!systemContent) return;
    var width = systemContent.getBoundingClientRect().width;
    if (!width) return;
    var probe = document.createElement('div');
    probe.className = 'system-content';
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:absolute;left:-10000px;top:0;visibility:hidden;min-height:0;transition:none;width:' + width + 'px';
    document.body.appendChild(probe);
    var tallest = 0;
    ['equipment', 'preparations'].forEach(function (kind) {
      probe.innerHTML = systemHtml(kind);
      tallest = Math.max(tallest, probe.getBoundingClientRect().height);
    });
    document.body.removeChild(probe);
    systemContent.style.minHeight = Math.ceil(tallest) + 'px';
  }
  var reserveFrame = 0;
  function queueReserveSystemHeight() {
    if (reserveFrame) window.cancelAnimationFrame(reserveFrame);
    reserveFrame = window.requestAnimationFrame(function () { reserveFrame = 0; reserveSystemHeight(); });
  }
  reserveSystemHeight();
  window.addEventListener('resize', queueReserveSystemHeight);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueReserveSystemHeight);

  /* Подбор решения и форма. */
  var form = $('#requestForm');
  var objectSelect = $('#fObject');
  var issuesBox = $('#issuesBox');
  var resultBox = $('#pickerResult');
  var quickObject = $('#quickObject');
  var quickIssue = $('#quickIssue');
  var quickGo = $('#quickGo');

  function selectedIssues() {
    if (!issuesBox) return [];
    return $$('input[name="issue"]:checked', issuesBox).map(function (input) { return input.value; });
  }

  function currentPick() {
    return S.pickServices(objectSelect ? objectSelect.value : '', selectedIssues());
  }

  function listLine(label, values) {
    if (!values || !values.length) return '';
    return '<li><b>' + escapeHtml(label) + ':</b> ' + values.map(typoHtml).join(', ') + '</li>';
  }

  /* Короткая сводка для экранного диктора: сам блок результата не live-регион,
     иначе при каждом чекбоксе зачитывается весь состав работ. */
  var pickerLive = $('#pickerLive');
  function announcePick(selection) {
    if (!pickerLive) return;
    var parts = [];
    if (selection.services.length) parts.push('Подобрано услуг: ' + selection.services.length + '.');
    parts = parts.concat(selection.notes);
    pickerLive.textContent = parts.join(' ');
  }

  function renderPick(announce) {
    if (!resultBox) return;
    var selection = currentPick();
    var hasResults = Boolean(selection.services.length || selection.notes.length);
    resultBox.classList.toggle('has-results', hasResults);
    if (announce) announcePick(selection);
    if (!selection.services.length && !selection.notes.length) {
      resultBox.innerHTML =
        '<p class="panel-kicker">Подобранное решение</p>' +
        '<h3 id="pickerTitle">Состав работ появится здесь</h3>' +
        '<p>Выберите объект и задачу. Покажем методы, оборудование, классы препаратов и итоговые документы.</p>' +
        '<ul class="result-preview"><li><i class="ic" aria-hidden="true"><svg aria-hidden="true"><use href="#i-strategy"/></svg></i> Метод обработки</li>' +
        '<li><i class="ic" aria-hidden="true"><svg aria-hidden="true"><use href="#i-toolbox"/></svg></i> Оснащение</li>' +
        '<li><i class="ic" aria-hidden="true"><svg aria-hidden="true"><use href="#i-files"/></svg></i> Отчётные акты</li></ul>';
      return;
    }

    var html = '<p class="panel-kicker">Подобранное решение</p><h3 id="pickerTitle">' + typoHtml('Состав выезда для вашего объекта') + '</h3>';
    selection.services.forEach(function (service) {
      html += '<div class="result-service"><b>' + typoHtml(service.name) + '</b><ul>';
      html += listLine('Методы', service.methods);
      html += listLine('Оборудование', service.equipment.map(function (id) { return S.EQUIPMENT[id]; }));
      html += listLine('Препараты', service.preparations.map(function (id) { return S.PREPARATIONS[id]; }));
      html += listLine('Документы', service.docs);
      html += '</ul></div>';
    });
    selection.notes.forEach(function (note) { html += '<p class="result-note">' + escapeHtml(note) + '</p>'; });
    resultBox.innerHTML = html;
  }

  if (form) {
    form.addEventListener('submit', function (event) { event.preventDefault(); });
    form.addEventListener('change', function (event) {
      if (event.target.id === 'fObject' || event.target.name === 'issue') renderPick(true);
    });
  }
  renderPick(false);

  /* Повторно выравниваем прямой hash после загрузки изображений и динамического контента.
     На время коррекции отключаем плавность, чтобы страница не делала заметный второй прыжок. */
  function alignInitialHash() {
    if (!window.location.hash || window.location.hash === '#top') return;
    var id;
    try { id = decodeURIComponent(window.location.hash.slice(1)); } catch (error) { return; }
    var target = document.getElementById(id);
    if (!target) return;
    document.documentElement.classList.add('hash-aligning');
    target.scrollIntoView({ behavior: 'auto', block: 'start' });
    window.requestAnimationFrame(function () {
      document.documentElement.classList.remove('hash-aligning');
      updateHeader();
    });
  }
  window.addEventListener('load', function () {
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(alignInitialHash);
    });
  });

  /* Ошибка быстрого подбора пишется в постоянный пустой live-регион #quickError:
     вставленный сразу с текстом узел дикторы часто не объявляют. */
  var quickError = $('#quickError');
  var quickErrorTimer = 0;
  function hideQuickError() {
    window.clearTimeout(quickErrorTimer);
    if (quickError) quickError.textContent = '';
  }

  function showQuickError(message) {
    if (!quickError) return;
    window.clearTimeout(quickErrorTimer);
    quickError.textContent = message;
    quickErrorTimer = window.setTimeout(hideQuickError, 4500);
  }

  /* Раньше выбор в быстром подборе никак не отображался: сам <select> прозрачный и лежит
     поверх поля, а подпись «Выберите тип объекта» оставалась неизменной — казалось, что выбор
     не срабатывает. Теперь поле показывает выбранное значение. */
  function bindQuickField(select) {
    if (!select) return;
    var field = select.closest('.quick-field');
    var hint = field ? field.querySelector('small') : null;
    if (!hint) return;
    var placeholder = hint.textContent;
    var sync = function () {
      var chosen = select.value ? select.options[select.selectedIndex].text : '';
      hint.textContent = chosen || placeholder;
      field.classList.toggle('filled', Boolean(select.value));
      if (select.value) hideQuickError();
    };
    select.addEventListener('change', sync);
    sync();
  }
  bindQuickField(quickObject);
  bindQuickField(quickIssue);

  if (quickGo) {
    quickGo.addEventListener('click', function () {
      if (!quickObject.value || !quickIssue.value) {
        showQuickError('Выберите объект и задачу — затем покажем состав решения.');
        (!quickObject.value ? quickObject : quickIssue).focus();
        return;
      }
      objectSelect.value = quickObject.value;
      $$('input[name="issue"]', issuesBox).forEach(function (input) { input.checked = input.value === quickIssue.value; });
      renderPick(true);
      /* На desktop результат стоит рядом с формой — ведём к началу заявки. До 1023px он под
         формой, поэтому ведём сразу к нему. Фокус переносим на результат, чтобы следующий Tab
         не уводил клавиатуру назад, к аккордеону услуг. */
      var narrow = window.matchMedia('(max-width: 1023px)').matches;
      /* Появление (.reveal: сдвиг 16px) завершаем сразу, иначе цель прокрутки считается
         со сдвигом и после анимации уезжает под шапку. */
      $$('#request .reveal:not(.in)').forEach(function (item) {
        item.style.transition = 'none';
        item.classList.add('in');
        void item.offsetHeight;
        item.style.transition = '';
      });
      scrollToElement(narrow ? '#pickerResult' : '#request');
      if (resultBox) {
        try { resultBox.focus({ preventScroll: true }); } catch (error) { resultBox.focus(); }
      }
    });
  }

  /* Маска телефона. */
  var phone = $('#fPhone');
  function formatPhone(value) {
    var digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.charAt(0) === '8') digits = '7' + digits.slice(1);
    if (digits.charAt(0) !== '7') digits = '7' + digits;
    digits = digits.slice(0, 11);
    var formatted = '+7';
    if (digits.length > 1) formatted += ' (' + digits.slice(1, 4);
    if (digits.length >= 4) formatted += ')';
    if (digits.length > 4) formatted += ' ' + digits.slice(4, 7);
    if (digits.length > 7) formatted += '-' + digits.slice(7, 9);
    if (digits.length > 9) formatted += '-' + digits.slice(9, 11);
    return formatted;
  }
  /* Ошибка проверки выводится под самим полем, поле получает aria-invalid и aria-describedby:
     диктор зачитывает причину при фокусе, а на телефоне текст не оказывается за экраном. */
  var phoneError = $('#fPhoneError');
  var consentBox = $('#fConsent');
  var consentError = $('#fConsentError');
  function setFieldError(field, box, message) {
    if (!field || !box) return;
    box.textContent = message || '';
    box.hidden = !message;
    if (message) {
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', box.id);
    } else {
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-describedby');
    }
  }

  /* После «→» быстрого подбора фокус стоит на блоке результата. В DOM он идёт после формы,
     и следующий Tab увёл бы к контактам внизу страницы, минуя «Телефон», согласие и отправку.
     Tab с самого блока результата ведёт к полю телефона (Shift+Tab — как обычно). */
  if (resultBox && phone) {
    resultBox.addEventListener('keydown', function (event) {
      if (event.key !== 'Tab' || event.shiftKey || event.target !== resultBox) return;
      event.preventDefault();
      phone.focus();
    });
  }

  if (phone) {
    phone.addEventListener('input', function () {
      phone.value = formatPhone(phone.value);
      setFieldError(phone, phoneError, '');
    });
  }
  if (consentBox) consentBox.addEventListener('change', function () { setFieldError(consentBox, consentError, ''); });

  var status = $('#formStatus');
  function setStatus(message, success) {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('success', Boolean(success));
  }

  function validateForm() {
    var phoneDigits = phone ? phone.value.replace(/\D/g, '') : '';
    setFieldError(phone, phoneError, '');
    setFieldError(consentBox, consentError, '');
    if (phoneDigits.length !== 11) {
      setStatus('', false);
      setFieldError(phone, phoneError, 'Укажите телефон полностью — 11 цифр.');
      if (phone) phone.focus();
      return false;
    }
    var consent = $('#fConsent');
    if (!consent || !consent.checked) {
      setStatus('', false);
      setFieldError(consent, consentError, 'Нужно согласие на обработку персональных данных.');
      if (consent) consent.focus();
      return false;
    }
    setStatus('', false);
    return true;
  }

  function requestText() {
    var selection = currentPick();
    var selectedOption = objectSelect && objectSelect.selectedIndex >= 0 ? objectSelect.options[objectSelect.selectedIndex] : null;
    return S.buildRequestText({
      name: $('#fName').value.trim(),
      phone: phone.value.trim(),
      objectLabel: objectSelect.value && selectedOption ? selectedOption.textContent.trim() : '',
      place: $('#fPlace').value.trim(),
      issueLabels: selection.issues.map(function (id) {
        var issue = S.ISSUES.find(function (item) { return item.id === id; });
        return issue ? issue.label : id;
      }),
      serviceNames: selection.services.map(function (service) { return service.name; }),
      comment: $('#fComment').value.trim(),
    });
  }

  var mailButton = $('#btnMail');
  if (mailButton) mailButton.addEventListener('click', function () {
    if (!validateForm()) return;
    var body = requestText();
    var url = 'mailto:' + C.email + '?subject=' + encodeURIComponent('Заявка с сайта «Бастет» — санитарная обработка') + '&body=' + encodeURIComponent(body);
    if (url.length > 1800) {
      body = body.slice(0, 900) + '\n…(текст сокращён; подробности сообщу по телефону)';
      url = 'mailto:' + C.email + '?subject=' + encodeURIComponent('Заявка с сайта «Бастет» — санитарная обработка') + '&body=' + encodeURIComponent(body);
    }
    window.location.href = url;
    setStatus('Открываем почтовый клиент. Если он не настроен, используйте «Копировать».', true);
  });

  function fallbackCopy(text) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    var copied = false;
    try { copied = document.execCommand('copy'); } catch (error) { copied = false; }
    document.body.removeChild(textarea);
    if (copied) setStatus('Текст заявки скопирован.', true);
    else setStatus('Не удалось скопировать автоматически — выделите текст вручную.', false);
  }

  var copyButton = $('#btnCopy');
  if (copyButton) copyButton.addEventListener('click', function () {
    if (!validateForm()) return;
    var text = requestText() + '\n\nОтправить на ' + C.email + ' или сообщить по телефону ' + C.phoneHuman;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(function () { setStatus('Текст заявки скопирован.', true); })
        .catch(function () { fallbackCopy(text); });
    } else {
      fallbackCopy(text);
    }
  });

})();
