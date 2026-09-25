#!/usr/bin/env python3
"""Статический dev-сервер БЕЗ кеширования (браузер и скриншот-харнесс всегда берут свежие файлы).
Запуск: python3 devserver.py [порт]   (по умолчанию 8747)
"""
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, *a):
        pass


os.chdir(os.path.dirname(os.path.abspath(__file__)))  # раздаём папку сайта, откуда бы ни запускали
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8747
ThreadingHTTPServer.allow_reuse_address = True
ThreadingHTTPServer(('127.0.0.1', port), NoCacheHandler).serve_forever()
