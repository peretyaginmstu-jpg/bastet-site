#!/bin/bash
# Скриншоты сайта headless-Хромом. Сервер должен быть запущен: python3 devserver.py 8744
# Использование: bash tools/shots.sh [desktop|tablet|mobile|all]
set -e
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/tools/shots"
# ?qa=1 отключает анимации появления — иначе кадр может поймать полупрозрачные блоки.
URL="${URL:-http://127.0.0.1:8744/?qa=1}"
mkdir -p "$OUT"

shot () {
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --window-size="$2,$3" --virtual-time-budget=9000 \
    --screenshot="$OUT/$1.png" "$URL" 2>/dev/null
  echo "  $OUT/$1.png  ($2×$3)"
}

case "${1:-all}" in
  desktop) shot desktop 1440 12000 ;;
  tablet)  shot tablet   900 14000 ;;
  # ВНИМАНИЕ: у headless-окна минимальная ширина ~500px. Кадр 390px обрежется справа,
  # поэтому мобильные снимки делаем на 500px — брейкпоинт ≤620 всё равно срабатывает.
  mobile)  shot mobile   500 18000 ;;
  all)     shot desktop 1440 12000; shot tablet 900 14000; shot mobile 500 18000 ;;
  *)       echo "неизвестный режим: $1"; exit 1 ;;
esac
