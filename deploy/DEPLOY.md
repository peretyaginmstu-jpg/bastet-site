# Бастет — залив и перезалив (сайт + сервис заявок)

## Где что лежит

- Сайт (webroot): /var/www/bastet-dez.ru — git-репозиторий, сюда приходит git pull
- Бэкенд заявок: /var/www/bastet-back/ — submit.py и submit.env (в git их нет)
- systemd-юнит: /etc/systemd/system/bastet-api.service
- Конфиг сайта (nginx): /etc/nginx/sites-available/bastet-dez.ru
- Логи сервиса: sudo journalctl -u bastet-api -n 50 --no-pager
- Логи nginx: /var/log/nginx/bastet-dez.ru.*

## Первый залив (один раз)

# 1) Репозиторий и бэкенд
git clone https://github.com/peretyaginmstu-jpg/bastet-site.git /var/www/bastet-dez.ru
sudo mkdir -p /var/www/bastet-back
sudo cp /var/www/bastet-dez.ru/submit.py /var/www/bastet-back/
sudo cp /var/www/bastet-dez.ru/submit.env.example /var/www/bastet-back/submit.env

# 2) Пароль приложения Яндекса — единственный ручной шаг (не обычный пароль!)
sudo nano /var/www/bastet-back/submit.env
sudo chmod 600 /var/www/bastet-back/submit.env

# 3) Сервис заявок
sudo cp /var/www/bastet-dez.ru/deploy/bastet-api.service /etc/systemd/system/
sudo nano /etc/systemd/system/bastet-api.service   # поправить пути, если папки другие (WorkingDirectory, EnvironmentFile, ExecStart)
sudo systemctl daemon-reload && sudo systemctl enable --now bastet-api
curl http://127.0.0.1:8751/healthz        # {"ok": true}

# 4) nginx: location = /api/request (см. deploy/nginx-api.conf) — внутрь server {} на 443
sudo nginx -t && sudo systemctl reload nginx

# 5) Сквозной тест — придёт письмо на info@bastet-dez.ru
curl -X POST https://bastet-dez.ru/api/request -H 'Content-Type: application/json' -d '{"phone":"79188266617","consent":true,"text":"Тест"}'

## Перезалив сайта

cd /var/www/bastet-dez.ru
git pull
# Статика обновилась. nginx перезагружать не нужно (кроме случаев правки его конфигов).

## Перезалив бэкенда (если менялся submit.py)

cd /var/www/bastet-dez.ru
git pull
sudo cp submit.py /var/www/bastet-back/submit.py
sudo systemctl restart bastet-api
curl -s http://127.0.0.1:8751/healthz     # {"ok": true}

## Диагностика

sudo systemctl status bastet-api --no-pager
sudo journalctl -u bastet-api -n 50 --no-pager
curl -s http://127.0.0.1:8751/healthz
sudo ss -lntp | grep 8751
sudo nginx -t
sudo nginx -T 2>&1 | grep -n -A7 "api/request"
curl -sI https://bastet-dez.ru/ | head -1

## Важно

- submit.env в git не попадает (.gitignore): при перезаливе не затирать, пароль вписывать только вручную.
- Пароль приложения Яндекса (Яндекс 360 → Безопасность → Пароли приложений → Почта/SMTP), а не обычный пароль ящика.
- На сервере Python 3.14: в submit.py время пишется через time.strftime — не возвращать формат {:%Y-%m-%d}.
- Файлы бэкенда (submit.py, submit.env) должны лежать вне webroot — иначе их можно скачать по URL.
- После правки юнита: sudo systemctl daemon-reload. После правки nginx: sudo nginx -t && sudo systemctl reload nginx.