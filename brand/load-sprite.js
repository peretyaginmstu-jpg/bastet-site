/* Подгружает brand/sprite-symbols.txt в скрытый <svg class="sprite"> — страницы бренда
   используют ровно тот же символ #logo-bastet, что и сайт. */
(function () {
  var holder = document.querySelector('svg.sprite');
  var base = document.currentScript.src.replace(/[^/]*$/, '');
  window.spriteReady = fetch(base + 'sprite-symbols.txt').then(function (r) { return r.text(); }).then(function (t) {
    holder.innerHTML = t;
    document.documentElement.classList.add('sprite-ok');
  });
})();
