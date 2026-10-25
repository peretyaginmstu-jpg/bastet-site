#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Bastet site request form API (Python 3, stdlib only).

Receives POST /api/request with the request form as JSON, validates it and
sends an email through Yandex SMTP to the site owner's mailbox.

Binds to a loopback address (127.0.0.1:8751 by default) and is exposed to the
internet through an nginx reverse proxy: location /api/ proxied to the local
service at http://127.0.0.1:8751.

Configuration comes from environment variables (see submit.env.example),
loaded from BASTET_ENV_FILE or /opt/bastet/submit.env when present.

Error responses carry an ASCII error code in "error" (bad_phone, no_consent,
rate_limit, too_large, bad_request, not_found, send_failed); the frontend
translates the codes to the site language.
"""

import json
import os
import smtplib
import sys
import time
from email.message import EmailMessage
from email.utils import formataddr
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse


# --- Configuration -----------------------------------------------------------

def env(name, default=None):
    value = os.environ.get(name)
    return default if value in (None, '') else value


def load_env_file(path):
    """Minimal .env parser: KEY=VALUE, no interpolation. Does not override env."""
    try:
        with open(path, 'r', encoding='utf-8-sig') as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                key, _, value = line.partition('=')
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value
    except OSError:
        pass


load_env_file(os.environ.get('BASTET_ENV_FILE', '/opt/bastet/submit.env'))

CONFIG = {
    'bind_host': env('BASTET_BIND_HOST', '127.0.0.1'),
    'bind_port': int(env('BASTET_BIND_PORT', '8751')),
    'smtp_host': env('BASTET_SMTP_HOST', 'smtp.yandex.ru'),
    'smtp_port': int(env('BASTET_SMTP_PORT', '465')),
    'smtp_user': env('BASTET_SMTP_USER', 'info@bastet-dez.ru'),
    'smtp_password': env('BASTET_SMTP_PASSWORD', ''),
    'to_addr': env('BASTET_TO', 'info@bastet-dez.ru'),
    'log_file': env('BASTET_LOG_FILE', ''),
    'rate_max': int(env('BASTET_RATE_MAX', '3')),
    'rate_window': int(env('BASTET_RATE_WINDOW', '600')),
    'max_body': int(env('BASTET_MAX_BODY', '32768')),
}

FIELD_LIMITS = {'name': 120, 'objectLabel': 120, 'place': 300, 'comment': 2000}


# --- Validation and message building ------------------------------------------

def clean_str(value, limit):
    if not isinstance(value, str):
        return ''
    return value.strip()[:limit]


def clean_list(value, limit_items=10, limit_len=80):
    if not isinstance(value, list):
        return []
    result = []
    for item in value:
        text = clean_str(item, limit_len)
        if text and text not in result and len(result) < limit_items:
            result.append(text)
    return result


def format_phone(digits):
    if len(digits) != 11:
        return digits
    d = digits[1:] if digits[0] in '78' else digits
    return '+7 ({}) {}-{}-{}'.format(d[0:3], d[3:6], d[6:8], d[8:10])


def validate(payload):
    """Returns (data, error). The hidden "website" field is a honeypot: when it
    is filled in we treat the request as a bot (returns None, None) and answer
    with success without sending anything."""
    if not isinstance(payload, dict):
        return None, 'bad_request'
    if clean_str(payload.get('website'), 200):
        return None, None
    digits = ''.join(ch for ch in clean_str(payload.get('phone'), 20) if ch.isdigit())
    if len(digits) != 11 or digits[0] not in '78':
        return None, 'bad_phone'
    if not payload.get('consent'):
        return None, 'no_consent'
    data = {
        'name': clean_str(payload.get('name'), FIELD_LIMITS['name']),
        'phone': digits,
        'objectLabel': clean_str(payload.get('objectLabel'), FIELD_LIMITS['objectLabel']),
        'place': clean_str(payload.get('place'), FIELD_LIMITS['place']),
        'comment': clean_str(payload.get('comment'), FIELD_LIMITS['comment']),
        'issueLabels': clean_list(payload.get('issueLabels')),
        'serviceNames': clean_list(payload.get('serviceNames')),
        'text': clean_str(payload.get('text'), 4000),
    }
    return data, None


def build_body(data):
    """Fallback body when the client did not send the pre-composed text."""
    lines = ['Заявка с сайта «Бастет» — санитарная обработка объекта', '']
    if data['name']:
        lines.append('Name: ' + data['name'])
    if data['phone']:
        lines.append('Phone: ' + format_phone(data['phone']))
    if data['objectLabel']:
        lines.append('Object type: ' + data['objectLabel'])
    if data['place']:
        lines.append('Address / area: ' + data['place'])
    if data['issueLabels']:
        lines.append('Issues: ' + ', '.join(data['issueLabels']))
    if data['serviceNames']:
        lines.append('Selected services: ' + ', '.join(data['serviceNames']))
    if data['comment']:
        lines.append('')
        lines.append('Comment: ' + data['comment'])
    return '\n'.join(lines)


def send_email(data):
    if not CONFIG['smtp_password']:
        raise RuntimeError('BASTET_SMTP_PASSWORD is not set - see submit.env.example')
    message = EmailMessage()
    message['From'] = formataddr(('Сайт «Бастет»', CONFIG['smtp_user']))
    message['To'] = CONFIG['to_addr']
    message['Subject'] = 'Заявка с сайта «Бастет» — санитарная обработка'
    message.set_content(data['text'] or build_body(data))
    with smtplib.SMTP_SSL(CONFIG['smtp_host'], CONFIG['smtp_port'], timeout=20) as server:
        server.login(CONFIG['smtp_user'], CONFIG['smtp_password'])
        server.send_message(message)


# --- Spam protection ---------------------------------------------------------

class RateLimiter:
    def __init__(self, max_count, window):
        self.max_count = max_count
        self.window = window
        self.hits = {}

    def allow(self, key, now=None):
        now = now or time.time()
        stamps = [t for t in self.hits.get(key, []) if now - t < self.window]
        if self.max_count <= len(stamps):
            self.hits[key] = stamps
            return False
        stamps.append(now)
        self.hits[key] = stamps
        return True


limiter = RateLimiter(CONFIG['rate_max'], CONFIG['rate_window'])


def log_line(text):
    if not CONFIG['log_file']:
        return
    try:
        with open(CONFIG['log_file'], 'a', encoding='utf-8') as fh:
            fh.write(text + '\n')
    except OSError:
        pass


# --- HTTP ---------------------------------------------------------------------

class ApiHandler(BaseHTTPRequestHandler):
    server_version = 'BastetForm/1.0'

    def log_message(self, fmt, *args):
        pass

    def client_ip(self):
        fwd = self.headers.get('X-Forwarded-For')
        if fwd:
            first = fwd.split(',')[0].strip()
            if first:
                return first
        real = self.headers.get('X-Real-IP')
        if real:
            return real
        return self.client_address[0]

    def _json(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if urlparse(self.path).path == '/healthz':
            self._json(200, {'ok': True})
            return
        self._json(404, {'ok': False, 'error': 'not_found'})

    def do_POST(self):
        if urlparse(self.path).path != '/api/request':
            self._json(404, {'ok': False, 'error': 'not_found'})
            return
        client = self.client_ip()
        try:
            length = int(self.headers.get('Content-Length') or 0)
        except (TypeError, ValueError):
            length = 0
        if length <= 0 or CONFIG['max_body'] < length:
            self._json(413, {'ok': False, 'error': 'too_large'})
            return
        try:
            payload = json.loads(self.rfile.read(length).decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            self._json(400, {'ok': False, 'error': 'bad_request'})
            return

        if not limiter.allow(client):
            self._json(429, {'ok': False, 'error': 'rate_limit'})
            return

        data, error = validate(payload)
        if data is None and error is not None:
            self._json(400, {'ok': False, 'error': error})
            return
        if data is None and error is None:
            # Honeypot fired: pretend success, send nothing.
            self._json(200, {'ok': True})
            return

        try:
            send_email(data)
        except Exception as exc:
            log_line('[error] {:%Y-%m-%d %H:%M:%S} {} send failed: {}'.format(time.localtime(), client, exc))
            self._json(500, {'ok': False, 'error': 'send_failed'})
            return

        log_line('{:%Y-%m-%d %H:%M:%S}\t{}\t{}'.format(time.localtime(), client, data['phone']))
        self._json(200, {'ok': True})


def main():
    if not CONFIG['smtp_password']:
        print('warning: BASTET_SMTP_PASSWORD is not set - sending disabled (see submit.env.example)', file=sys.stderr)
    httpd = ThreadingHTTPServer((CONFIG['bind_host'], CONFIG['bind_port']), ApiHandler)
    httpd.daemon_threads = True
    print('Bastet form API listening on http://{}:{}'.format(CONFIG['bind_host'], CONFIG['bind_port']), flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == '__main__':
    main()