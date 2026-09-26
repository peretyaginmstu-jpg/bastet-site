#!/usr/bin/env python3
"""Логотип «Бастет» по макету заказчика (Turbologo, прислан 26.09.2026): монограмма «Б»
из тонких линий над надписью «БАСТЕТ» разреженными прописными.

Перерисовано в вектор по присланной картинке 204×167 (белое на чёрном). Все координаты ниже —
в системе этой картинки: центры штрихов и кромки, снятые попиксельно (центроиды яркости по
строкам и столбцам). Шрифт надписи похож на Montserrat Regular; буквы построены геометрически
линиями одной толщины, без шрифтовых файлов.

Запуск из корня сайта:  python3 brand/build-logo.py
Пишет: brand/bastet-logo.svg, brand/bastet-logo-white.svg, brand/bastet-monogram.svg,
       brand/bastet-app-icon.svg, brand/sprite-symbols.txt, assets/icons/favicon.svg
"""
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

GREEN = '#556B57'  # --sage-deep: зелёный второй строки заголовка на сайте
MILK = '#FFFCF5'   # --milk: негатив на тёмном фоне

MONO_W = 2.2  # линии монограммы: в исходнике ≈ 2 px при высоте знака 54 px
WORD_W = 2.5  # линии надписи: ≈ 2,3–2,7 px при высоте прописной 24 px

# Габарит всего логотипа (кромки штрихов x 22,25–189, y 37,9–145) с полем ≈ 1.
VIEWBOX = '21 37 169 109'
# Габарит одной монограммы (x 80–130,6, y 37,9–92,1).
MONO_VIEWBOX = '79 37 53 56'

# --- Монограмма ---------------------------------------------------------------
# Колонна из двух вертикалей (центры x 81,1 и 99), верхняя перекладина (y 39) до x 120,7,
# средняя (y 70,8) и нижняя (y 91) перекладины — это чаша: справа прямая x 129,5
# и скругления r 9. Один контур, чтобы углы колонны были острыми (miter).
MONOGRAM = ('M120.7 39H81.1V91H120.5A9 9 0 0 0 129.5 82V79.8A9 9 0 0 0 120.5 70.8H81.1'
            'M99 39V91')

# --- Надпись «БАСТЕТ» -----------------------------------------------------------
# Прописные: верх 121, низ 145 (высота 24). Центры горизонталей: 122,4 / 131,9 (Б) / 132,4 (Е) / 143,6.
B = 'M37.1 122.4H23.5V143.6H33.1A4.5 4.5 0 0 0 37.6 139.1V136.4A4.5 4.5 0 0 0 33.1 131.9H23.5'
T1 = 'M115 122.4H132M123.5 122.4V145'
E = 'M160 122.4H145.8V143.6H160M145.8 132.4H158'
T2 = 'M171 122.4H189M180 122.4V145'


def letter_a(w=WORD_W):
    """«А»: две наклонные ноги (центры по замерам: слева 55,8 − 0,425·(y−132), справа
    66,1 + 0,425·(y−132)), плоская вершина на y 121, плоские пятки на y 145 — поэтому
    ноги заданы заливкой, а не штрихом. Перекладина y 135,8 — штрихом между центрами ног."""
    k = 0.425
    hw = (w / 2) * math.sqrt(1 + k * k)  # половина горизонтальной ширины наклонного штриха
    left = lambda y: 55.8 - k * (y - 132)
    right = lambda y: 66.1 + k * (y - 132)
    top, base = 121.0, 145.0
    yi = 132 + (2 * hw - 10.3) / (2 * k)  # точка, где сходятся внутренние кромки ног
    xi = left(yi) + hw
    pts = [(left(base) - hw, base), (left(top) - hw, top), (right(top) + hw, top),
           (right(base) + hw, base), (right(base) - hw, base), (xi, yi), (left(base) + hw, base)]
    outline = 'M' + 'L'.join(f'{x:.2f} {y:.2f}' for x, y in pts) + 'Z'
    ybar = 135.8
    bar = f'M{left(ybar):.2f} {ybar}H{right(ybar):.2f}'
    return outline, bar


def letter_c():
    """«С»: суперэллипс n ≈ 2,5 (у Montserrat «С» «квадратнее» окружности), центр (95,2; 133),
    полуоси 11,05 × 10,7; концы — на x 102,4 (y ≈ 124 и 142). Четверти — кубическими кривыми
    с коэффициентом 0,688 (точка на 45° совпадает с суперэллипсом), крайние четверти обрезаны."""
    cx, cy, a, b, kk = 95.2, 133.0, 11.05, 10.7, 0.688
    x_end = 102.4

    def cubic(p0, p1, p2, p3, u):
        m = 1 - u
        return tuple(m**3 * p0[i] + 3 * m * m * u * p1[i] + 3 * m * u * u * p2[i] + u**3 * p3[i] for i in (0, 1))

    def split(p0, p1, p2, p3, u):
        """Де Кастельжо: две половины кривой в точке u."""
        lerp = lambda p, q: (p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u)
        a1, b1, c1 = lerp(p0, p1), lerp(p1, p2), lerp(p2, p3)
        a2, b2 = lerp(a1, b1), lerp(b1, c1)
        a3 = lerp(a2, b2)
        return (p0, a1, a2, a3), (a3, b2, c1, p3)

    def solve_x(curve, target, decreasing):
        lo, hi = 0.0, 1.0
        for _ in range(60):
            mid = (lo + hi) / 2
            x = cubic(*curve, mid)[0]
            if (x > target) == decreasing:
                lo = mid
            else:
                hi = mid
        return (lo + hi) / 2

    right_pt, top_pt, left_pt, bottom_pt = (cx + a, cy), (cx, cy - b), (cx - a, cy), (cx, cy + b)
    q_tr = (right_pt, (cx + a, cy - kk * b), (cx + kk * a, cy - b), top_pt)       # справа → вверх
    q_tl = (top_pt, (cx - kk * a, cy - b), (cx - a, cy - kk * b), left_pt)        # вверх → влево
    q_bl = (left_pt, (cx - a, cy + kk * b), (cx - kk * a, cy + b), bottom_pt)     # влево → вниз
    q_br = (bottom_pt, (cx + kk * a, cy + b), (cx + a, cy + kk * b), right_pt)    # вниз → вправо
    _, tr_tail = split(*q_tr, solve_x(q_tr, x_end, decreasing=True))
    br_head, _ = split(*q_br, solve_x(q_br, x_end, decreasing=False))

    fmt = lambda p: f'{p[0]:.2f} {p[1]:.2f}'
    d = 'M' + fmt(tr_tail[0])
    for seg in (tr_tail, q_tl, q_bl, br_head):
        d += 'C' + ' '.join(fmt(p) for p in seg[1:])
    return d


A_FILL, A_BAR = letter_a()
C_PATH = letter_c()
WORD_STROKES = ' '.join([B, A_BAR, C_PATH, T1, E, T2])


def logo_body(color):
    """Содержимое логотипа: монограмма и надпись. color — цвет или currentColor."""
    return (f'<g fill="none" stroke="{color}" stroke-linejoin="miter" stroke-miterlimit="10">'
            f'<path stroke-width="{MONO_W}" d="{MONOGRAM}"/>'
            f'<path stroke-width="{WORD_W}" d="{WORD_STROKES}"/></g>'
            f'<path fill="{color}" d="{A_FILL}"/>')


def monogram_body(color, width=MONO_W):
    return (f'<path fill="none" stroke="{color}" stroke-width="{width}" stroke-linejoin="miter" '
            f'stroke-miterlimit="10" d="{MONOGRAM}"/>')


def svg_file(viewbox, body, title, width, height):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" width="{width}" height="{height}" '
            f'role="img" aria-label="{title}"><title>{title}</title>{body}</svg>\n')


def tile(size_px, radius, line, background=GREEN, color=MILK):
    """Квадратная плашка 64×64 с монограммой по центру (фавикон, иконка приложения).
    line — толщина линии в долях плашки 64: монограмма масштабируется, линия задаётся отдельно."""
    s = 34 / 52  # высота монограммы по центрам линий — 34 из 64
    # центр масс габарита монограммы по центрам линий: x (81,1 + 129,5)/2, y (39 + 91)/2
    tx = 32 - s * (81.1 + 129.5) / 2
    ty = 32 - s * (39 + 91) / 2
    rect = f'<rect width="64" height="64" rx="{radius}" fill="{background}"/>' if radius is not None else f'<rect width="64" height="64" fill="{background}"/>'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="{size_px}" height="{size_px}">'
            f'{rect}<g transform="translate({tx:.3f} {ty:.3f}) scale({s:.4f})">'
            f'{monogram_body(color, line / s)}</g></svg>\n')


def write(rel, text):
    path = os.path.join(ROOT, rel)
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(text)
    print(f'{rel}: {len(text)} байт')


if __name__ == '__main__':
    write('brand/bastet-logo.svg', svg_file(VIEWBOX, logo_body(GREEN), 'Бастет', 676, 436))
    write('brand/bastet-logo-white.svg', svg_file(VIEWBOX, logo_body(MILK), 'Бастет', 676, 436))
    write('brand/bastet-monogram.svg', svg_file(MONO_VIEWBOX, monogram_body(GREEN), 'Бастет', 212, 224))
    # Иконка приложения: сплошной квадрат (скругляет сама система), линия 3/64.
    write('brand/bastet-app-icon.svg', tile(512, None, 3.0))
    # Фавикон: скруглённая плашка, линия 4,6/64 — в 16 px это ≈ 1,15 px, линии не пропадают.
    write('assets/icons/favicon.svg', tile(64, 14, 4.6))
    sprite = (
        '<!-- Логотип заказчика «Бастет» (генерирует brand/build-logo.py). Цвет — currentColor. -->\n'
        f'<symbol id="logo-bastet" viewBox="{VIEWBOX}">{logo_body("currentColor")}</symbol>\n'
        f'<symbol id="logo-bastet-monogram" viewBox="{MONO_VIEWBOX}">{monogram_body("currentColor")}</symbol>\n'
    )
    write('brand/sprite-symbols.txt', sprite)
