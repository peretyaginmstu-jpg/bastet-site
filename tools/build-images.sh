#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
IMAGE_DIR="$ROOT_DIR/assets/images"
# Исходные PNG (по 1.3–2.6 МБ) лежат вне раздаваемой папки — на хостинг они не едут.
MASTER_DIR="$ROOT_DIR/_dev/image-sources"

if command -v magick >/dev/null 2>&1; then
  MAGICK_BIN=$(command -v magick)
else
  echo "ImageMagick (magick) is required" >&2
  exit 1
fi

make_variant() {
  master="$1"
  output="$2"
  width="$3"
  "$MAGICK_BIN" "$master" -auto-orient -strip -resize "${width}x>" -quality 84 "$output.jpg"
  "$MAGICK_BIN" "$master" -auto-orient -strip -resize "${width}x>" -quality 80 "$output.webp"
  "$MAGICK_BIN" "$master" -auto-orient -strip -resize "${width}x>" -quality 56 "$output.avif"
}

make_set() {
  name="$1"
  medium="$2"
  large="$3"
  master="$MASTER_DIR/${name}-master.png"
  test -s "$master"
  make_variant "$master" "$IMAGE_DIR/${name}-${medium}" "$medium"
  make_variant "$master" "$IMAGE_DIR/${name}-${large}" "$large"
  make_variant "$master" "$IMAGE_DIR/${name}" "$large"
}

make_set hero 960 1920
make_set service-disinsection 640 1200
make_set service-deratization 640 1200
make_set service-acaricidal 640 1200
make_set service-disinfection 640 1200
make_set equipment 800 1600
make_set equipment-tab 800 1600
make_set preparations-tab 800 1600
make_set contact 800 1600

"$MAGICK_BIN" "$MASTER_DIR/hero-master.png" -auto-orient -strip -resize '1200x630^' -gravity center -extent 1200x630 -quality 86 "$ROOT_DIR/assets/og-cover.jpg"

echo "Responsive AVIF, WebP and JPEG assets generated."
