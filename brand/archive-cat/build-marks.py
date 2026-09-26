#!/usr/bin/env python3
"""Генератор знака «Бастет» (сидящая кошка в профиль) и его производных.

Все формы описаны на сетке 64×64 (1 модуль = 1/64 стороны). Запуск из корня сайта:
    python3 brand/build-marks.py
Пишет в brand/: bastet-mark.svg, bastet-mark-mono.svg, bastet-mark-small.svg,
bastet-badge.svg, bastet-badge-dark.svg, sprite-symbols.txt и assets/icons/favicon.svg.
PNG (фавиконы, локапы, лист, OG) рендерятся из HTML-страниц brand/*.html через tools/render.mjs.
"""
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

DARK = "#3F5142"   # шалфей тёмный — силуэт
DEEP = "#556B57"   # шалфей глубокий — арка в тёмном варианте, контур портала
SAGE = "#C8D5C1"   # шалфей пастель — арка бейджа
SAND = "#E8D7BF"   # песок — глаз, порог
MILK = "#FFFCF5"   # молоко — негатив


def f(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def tangent_left(P, C, R):
    """Точка касания прямой из P к окружности (C, R) с левой стороны."""
    px, py = P
    cx, cy = C
    a = math.atan2(py - cy, px - cx)
    b = math.acos(R / math.hypot(px - cx, py - cy))
    t = a - b
    return cx + R * math.cos(t), cy + R * math.sin(t)


# ---------- силуэт ----------
HIP_C = (26.5, 49.0)      # центр бедра, R 11
HIP_R = 11.0
BACK_TOP = (25.9, 26.0)   # где прямая спина (касательная к бедру) переходит в выемку затылка


def cat_path(slot=4.0, tail=5.0, tail_top=46.6, far_ear=True, nape=(28.75, 19.6), occiput=(26.5, 13.2)):
    """Контур кошки. slot — ширина прорези между лапой и хвостом, tail — толщина хвоста,
    tail_top — верх кончика хвоста. Дно прорези и изгиб хвоста — концентрические дуги,
    поэтому толщина хвоста постоянна по всей длине."""
    tx, ty = tangent_left(BACK_TOP, HIP_C, HIP_R)
    leg_x = 40.5                      # передний край лапы у основания
    r_in = slot / 2                   # радиус дна прорези
    r_out = r_in + tail               # радиус внешнего изгиба хвоста
    cx = leg_x + r_in                 # общий центр дуг
    cy = 60 - r_out
    x_in, x_out = leg_x + slot, leg_x + slot + tail
    tip_cy = tail_top + tail / 2
    nx, ny = nape
    ox, oy = occiput
    ear = (["L33.4 9.5", "L35.5 7.1", "C36.1 8 36.6 9.1 36.9 10.25"] if far_ear
           else ["L34.6 9.9", "C35.4 10 36.2 10.1 36.9 10.25"])
    p = [
        "M29.4 3.2",                       # кончик ближнего уха
        *ear,                              # ложбинка и намёк на дальнее ухо → лоб
        "C39.4 10.3 41.1 11.5 42.2 12.9",  # лоб
        "L45.5 17.1",                      # спинка носа
        "Q46.05 17.95 45.45 18.6",         # мочка носа
        "L44.25 19.8",                     # рот
        "C43.45 20.6 42.55 21.25 41.35 21.6",    # подбородок
        "C39.85 22.05 38.95 23.35 38.95 25.25",  # горло
        "C38.95 28.9 41.55 30.7 41.35 35.3",     # грудь
        f"L{f(leg_x)} {f(cy)}",                  # передняя лапа
        f"A{f(r_in)} {f(r_in)} 0 0 0 {f(x_in)} {f(cy)}",           # дно прорези
        f"L{f(x_in)} {f(tip_cy)}",                                 # внутренний край хвоста
        f"A{f(tail / 2)} {f(tail / 2)} 0 0 1 {f(x_out)} {f(tip_cy)}",  # кончик хвоста
        f"L{f(x_out)} {f(cy)}",                                    # внешний край хвоста
        f"A{f(r_out)} {f(r_out)} 0 0 1 {f(cx)} 60",                # изгиб хвоста
        f"L{f(HIP_C[0])} 60",                                      # основание
        f"A{f(HIP_R)} {f(HIP_R)} 0 0 1 {f(tx)} {f(ty)}",           # бедро
        f"L{f(BACK_TOP[0])} {f(BACK_TOP[1])}",                     # спина по касательной
        f"C26.9 24 {f(nx)} {f(ny + 2.4)} {f(nx)} {f(ny)}",         # выемка затылка (вогнутая)
        f"C{f(nx)} {f(ny - 2.2)} {f(ox)} {f(oy + 2.8)} {f(ox)} {f(oy)}",  # затылок (выпуклый)
        f"C{f(ox + 0.1)} {f(oy - 2.8)} 28.2 6.4 29.4 3.2",        # заднее ребро уха
        "Z",
    ]
    return " ".join(p)


EYE = "M35.1 14.6 Q38.35 13.35 40.8 16 Q37.6 17.5 35.1 14.6 Z"   # миндалевидный глаз

CAT = cat_path()
# Для ≤24 px: прорезь и хвост шире, чтобы не слипались в 16 px; глаза нет
# В 16 px 1 px = 58/16 = 3,625 модуля: прорезь ровно 1 px, хвост 1,5 px, передний край лапы и
# основание лежат на границах пикселей (viewBox сдвинут на 4,35 / 2).
SMALL_KW = dict(slot=3.625, tail=5.45)
CAT_SMALL = cat_path(**SMALL_KW)
SMALL_VIEWBOX = "4.35 2 58 58"

# ---------- арка (бейдж) ----------
# Сетка фавикона: viewBox 4 5 56 56, в 16 px 1 px = 3,5 модуля — стороны арки, порог и основание
# кошки лежат на границах пикселей.
ARCH_X0, ARCH_X1 = 11.0, 53.0    # ширина 42 (12 px из 16)
ARCH_TOP = 5.0                   # верх полуокружности, R 21
BASE_Y = 54.0                    # верх порога — на нём сидит кошка
PLINTH = (4.0, 54.0, 56.0, 7.0)  # порог-цоколь: x, y, ширина, высота (шире арки на 7 с каждой стороны; 2 px в 16 px)
CAT_SCALE = 0.8
CAT_ANCHOR_X = 32.16             # точка силуэта, которая встаёт на ось арки (между центром габарита и центром масс)
FAV_CAT_KW = dict(slot=4.375, tail=6.2)   # в фавиконе прорезь = 1 px в 16 px
PORTAL_GAP, PORTAL_W = 2.2, 1.2  # тонкий контур портала вокруг арки, как у арки hero на сайте


def arch_d(r_extra=0.0):
    R = (ARCH_X1 - ARCH_X0) / 2 + r_extra
    cx, cy = (ARCH_X0 + ARCH_X1) / 2, ARCH_TOP + (ARCH_X1 - ARCH_X0) / 2
    return f"M{f(cx - R)} {f(BASE_Y)}V{f(cy)}A{f(R)} {f(R)} 0 0 1 {f(cx + R)} {f(cy)}V{f(BASE_Y)}"


def cat_in_arch_transform():
    # опорная точка силуэта (x 32,25 — между центром габарита и центром масс; основание y 60) → центр арки на пороге
    return f"translate(32 {f(BASE_Y)}) scale({CAT_SCALE}) translate(-{f(CAT_ANCHOR_X)} -60)"


def badge_body(arch=SAGE, plinth=SAND, cat=DARK, eye=SAND, portal=DEEP, small=False, sep="\n  "):
    x, y, w, h = PLINTH
    out = []
    if portal:
        out.append(f'<path fill="none" stroke="{portal}" stroke-width="{f(PORTAL_W)}" d="{arch_d(PORTAL_GAP + PORTAL_W / 2)}"/>')
    out.append(f'<path fill="{arch}" d="{arch_d()}Z"/>')
    out.append(f'<rect fill="{plinth}" x="{f(x)}" y="{f(y)}" width="{f(w)}" height="{f(h)}" rx=".6"/>')
    g = f'<g transform="{cat_in_arch_transform()}"><path fill="{cat}" d="{cat_path(**FAV_CAT_KW) if small else CAT}"/>'
    if eye and not small:
        g += f'<path fill="{eye}" d="{EYE}"/>'
    out.append(g + "</g>")
    return sep.join(out)


def svg(viewbox, body, label, size=64, comment=""):
    c = f"\n  <!-- {comment} -->" if comment else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" width="{size}" height="{size}" '
            f'role="img" aria-label="{label}">\n  <title>{label}</title>{c}\n  {body}\n</svg>\n')


def write(rel, text):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)
    print("wrote", rel)


FAV_VIEWBOX = f"{f(PLINTH[0])} {f(ARCH_TOP)} {f(PLINTH[2])} {f(PLINTH[1] + PLINTH[3] - ARCH_TOP)}"


def main():
    write("brand/bastet-mark.svg", svg(
        "0 0 64 64",
        f'<path fill="{DARK}" d="{CAT}"/>\n  <path fill="{SAND}" d="{EYE}"/>',
        "Бастет — знак",
        comment="Сидящая Бастет в профиль: силуэт #3F5142, глаз-инкрустация песком #E8D7BF (ниже 24 px — bastet-mark-small.svg)"))
    write("brand/bastet-mark-mono.svg", svg(
        "0 0 64 64",
        f'<path fill="currentColor" fill-rule="evenodd" d="{CAT} {EYE}"/>',
        "Бастет — знак",
        comment="Одноцветная версия: цвет наследуется (currentColor), глаз вырезан"))
    write("brand/bastet-mark-small.svg", svg(
        SMALL_VIEWBOX,
        f'<path fill="currentColor" d="{CAT_SMALL}"/>',
        "Бастет — знак",
        comment="Для 16–24 px: укрупнённый viewBox, без глаза, прорезь и лапа по пиксельной сетке 16 px; цвет — currentColor (#3F5142 на светлом)"))
    write("brand/bastet-badge.svg", svg(
        "0 0 64 64", badge_body(), "Бастет — знак в арке",
        comment="Пастельная арка-портал #C8D5C1 с тонким контуром #556B57 и песочным порогом #E8D7BF; кошка #3F5142"))
    write("brand/bastet-badge-dark.svg", svg(
        "0 0 64 64", badge_body(arch=DEEP, plinth=SAND, cat=MILK, eye=DEEP, portal=SAGE), "Бастет — знак в арке",
        comment="Тёмный вариант: арка шалфей #556B57 (не серый и не чёрный), кошка молоко #FFFCF5, порог песок"))
    # фавикон: без контура и глаза, «малая» кошка, viewBox по габариту арки с порогом
    write("assets/icons/favicon.svg", svg(
        FAV_VIEWBOX, badge_body(portal=None, small=True), "Бастет",
        comment="Фавикон: арка с собственным фоном — читается на светлой и тёмной вкладке"))

    sym_main = (f'<symbol id="logo-bastet" viewBox="0 0 64 64">'
                f'<path fill="currentColor" d="{CAT}"/>'
                f'<path fill="var(--logo-eye, #E8D7BF)" style="fill:var(--logo-eye, #E8D7BF)" d="{EYE}"/></symbol>')
    sym_small = (f'<symbol id="logo-bastet-small" viewBox="{SMALL_VIEWBOX}">'
                 f'<path fill="currentColor" d="{CAT_SMALL}"/></symbol>')
    write("brand/sprite-symbols.txt",
          "<!-- Знак «Бастет» для инлайн-спрайта (вставить внутрь <svg class=\"icon-sprite\">).\n"
          "     logo-bastet: силуэт = currentColor (задайте color: #3F5142), глаз = var(--logo-eye, #E8D7BF);\n"
          "       ниже 24 px глаз не показывать: берите logo-bastet-small или задайте --logo-eye: currentColor.\n"
          "       viewBox 0 0 64 64; силуэт занимает x 15,5–49,5 и y 3,2–60 (основание — y 60).\n"
          "     logo-bastet-small: одноцветный currentColor, укрупнённый viewBox, для 16–24 px. -->\n"
          + sym_main + "\n" + sym_small + "\n")


if __name__ == "__main__":
    main()
