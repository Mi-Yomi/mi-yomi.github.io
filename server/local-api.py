#!/usr/bin/env python3
import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, urlparse
from urllib.request import Request, urlopen

DB_PATH = os.environ.get('HADES_DB_PATH', '/root/apps/hades-api/hades.sqlite')
ALLOWED_ORIGINS = {o.strip() for o in os.environ.get('HADES_ALLOWED_ORIGINS', 'https://mi-yomi.github.io,http://127.0.0.1:5173,http://localhost:5173').split(',') if o.strip()}
ADMIN_EMAIL = os.environ.get('HADES_ADMIN_EMAIL', '').strip().lower()
PBKDF2_ROUNDS = 180_000


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('pragma journal_mode=wal')
    conn.execute('pragma foreign_keys=on')
    return conn


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with db() as c:
        c.executescript('''
        create table if not exists users (
          id text primary key,
          email text not null unique,
          password_hash text not null,
          created_at text not null
        );
        create table if not exists sessions (
          token text primary key,
          user_id text not null references users(id) on delete cascade,
          created_at integer not null
        );
        create table if not exists rows (
          table_name text not null,
          id text not null,
          data text not null,
          created_at integer not null,
          updated_at integer not null,
          primary key (table_name, id)
        );
        create index if not exists rows_table_idx on rows(table_name);
        ''')


def now_iso():
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())


def hash_password(password, salt=None):
    if salt is None:
        salt = secrets.token_bytes(16)
    if isinstance(salt, str):
        salt = base64.b64decode(salt)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, PBKDF2_ROUNDS)
    return f'pbkdf2_sha256${PBKDF2_ROUNDS}${base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}'


def verify_password(password, stored):
    try:
        scheme, rounds, salt_b64, digest_b64 = stored.split('$')
        if scheme != 'pbkdf2_sha256':
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(digest_b64)
        got = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, int(rounds))
        return hmac.compare_digest(got, expected)
    except Exception:
        return False


def public_user(row):
    return {'id': row['id'], 'email': row['email']}


def make_session(c, user_id):
    token = secrets.token_urlsafe(48)
    c.execute('insert into sessions(token,user_id,created_at) values(?,?,?)', (token, user_id, int(time.time())))
    return token


def get_auth_user(c, headers):
    auth = headers.get('authorization') or headers.get('Authorization') or ''
    if not auth.lower().startswith('bearer '):
        return None
    token = auth.split(' ', 1)[1].strip()
    if not token:
        return None
    row = c.execute('select u.* from sessions s join users u on u.id=s.user_id where s.token=?', (token,)).fetchone()
    return row


def load_rows(c, table):
    out = []
    for r in c.execute('select id,data from rows where table_name=?', (table,)):
        try:
            item = json.loads(r['data'])
        except Exception:
            item = {'id': r['id']}
        if 'id' not in item:
            item['id'] = r['id']
        out.append(item)
    return out


def get_field(row, key):
    return row.get(key)


def match_filter(row, f):
    op = f.get('op')
    key = f.get('key')
    val = f.get('value')
    cur = get_field(row, key)
    if op == 'eq':
        return str(cur) == str(val)
    if op == 'ilike':
        pattern = str(val).replace('%', '').lower()
        return pattern in str(cur or '').lower()
    return True


def apply_query(rows, q):
    filters = q.get('filters') or []
    or_filters = q.get('orFilters') or []
    for f in filters:
        rows = [r for r in rows if match_filter(r, f)]
    if or_filters:
        rows = [r for r in rows if any(match_filter(r, f) for f in or_filters)]
    order = q.get('order')
    if order and order.get('key'):
        key = order['key']
        rows.sort(key=lambda r: (get_field(r, key) is None, str(get_field(r, key) or '')), reverse=not order.get('ascending', True))
    count = len(rows)
    start = q.get('offset')
    end = q.get('end')
    limit = q.get('limit')
    if start is not None or end is not None:
        s = int(start or 0)
        e = int(end) + 1 if end is not None else None
        rows = rows[s:e]
    elif limit is not None:
        rows = rows[:int(limit)]
    return rows, count


def upsert_row(c, table, item):
    item = dict(item or {})
    rid = str(item.get('id') or uuid.uuid4())
    item['id'] = rid
    ts = int(time.time())
    if 'created_at' not in item:
        item['created_at'] = now_iso()
    c.execute('''insert into rows(table_name,id,data,created_at,updated_at) values(?,?,?,?,?)
                 on conflict(table_name,id) do update set data=excluded.data, updated_at=excluded.updated_at''',
              (table, rid, json.dumps(item, ensure_ascii=False), ts, ts))
    return item


REZKA_MIRRORS = [s.strip() for s in os.environ.get('HDREZKA_MIRRORS', 'https://kz.rezka.biz,https://rezka.biz,https://hdrezka.tv').split(',') if s.strip()]
REZKA_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
_active_rezka_mirror = ''


def fetch_text(url):
    req = Request(url, headers={'User-Agent': REZKA_UA, 'Accept-Language': 'ru,en;q=0.8'})
    with urlopen(req, timeout=12) as r:
        return r.read().decode('utf-8', 'ignore')


def rezka_mirror():
    global _active_rezka_mirror
    if _active_rezka_mirror:
        return _active_rezka_mirror
    for m in REZKA_MIRRORS:
        try:
            h = fetch_text(m + '/')
            if re.search(r'b-content__inline|postItem|HDREZKA|hdrezka|rezka', h, re.I):
                _active_rezka_mirror = m
                return m
        except Exception:
            pass
    raise RuntimeError('Ни одно зеркало HDRezka недоступно с этого сервера.')


def rezka_search(query):
    html = fetch_text(f'{rezka_mirror()}/search/?do=search&subaction=search&q={quote(query)}')
    items = []
    for chunk in html.split('class="postItem"')[1:]:
        m = re.search(r'data-link="([^"]+)"', chunk) or re.search(r'href="(https?://[^"]+/\d+-[^"]+\.html)"', chunk)
        if not m:
            continue
        entity = (re.search(r'class="entity">\s*([^<]+)', chunk) or ['', ''])[1]
        year = (re.search(r'[>\s(]((?:19|20)\d{2})[<\s)]', chunk) or ['', ''])[1]
        items.append({'url': m.group(1), 'isSeries': bool(re.search(r'сериал|серии', entity, re.I)), 'year': year})
    if not items:
        seen = set()
        for m in re.finditer(r'href="(https?://[^"]+/\d+-[^"]+\.html)"', html):
            if m.group(1) not in seen:
                seen.add(m.group(1)); items.append({'url': m.group(1), 'isSeries': False, 'year': ''})
    return items


def rezka_resolve(title, year='', typ=''):
    items = rezka_search(title)
    if not items:
        return None, None
    want_series = typ == 'tv'
    pick = None
    if year:
        pick = next((i for i in items if i.get('year') == str(year) and ((not typ) or i.get('isSeries') == want_series)), None)
        pick = pick or next((i for i in items if i.get('year') == str(year)), None)
    pick = pick or (next((i for i in items if i.get('isSeries') == want_series), None) if typ else None) or items[0]
    html = fetch_text(pick['url'])
    m = re.search(r'<iframe[^>]+src="(https?://[^"]*(?:cinemar|/embed/|cdnvideo|voidboost|hdvb|collaps|player)[^"]*)"', html, re.I) or re.search(r'<iframe[^>]+src="(https?://[^"]+)"', html, re.I)
    if not m:
        return None, pick
    return m.group(1).replace('&amp;', '&'), pick


class Handler(BaseHTTPRequestHandler):
    server_version = 'HADESLocalAPI/1.0'

    def log_message(self, fmt, *args):
        print('%s - - [%s] %s' % (self.client_address[0], self.log_date_time_string(), fmt % args), flush=True)

    def _origin(self):
        origin = self.headers.get('Origin')
        if origin in ALLOWED_ORIGINS:
            return origin
        return 'https://mi-yomi.github.io'

    def _send(self, status=200, payload=None):
        data = json.dumps(payload if payload is not None else {}, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', self._origin())
        self.send_header('Access-Control-Allow-Credentials', 'false')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _read_json(self):
        n = int(self.headers.get('Content-Length') or 0)
        if n <= 0:
            return {}
        return json.loads(self.rfile.read(n).decode('utf-8'))

    def do_OPTIONS(self):
        self._send(204, {})

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        if path == '/api/health':
            self._send(200, {'ok': True, 'service': 'hades-local-api'})
            return
        if path == '/api/hdrezka':
            try:
                q = {k: v[0] for k, v in parse_qs(parsed.query).items()}
                action = q.get('action')
                title = q.get('title') or q.get('q') or ''
                if action == 'search':
                    self._send(200, {'ok': True, 'results': rezka_search(title)})
                    return
                embed, picked = rezka_resolve(title, q.get('year', ''), q.get('type', ''))
                if action == 'resolve':
                    self._send(200, {'ok': bool(embed), 'embed': embed, 'picked': picked})
                    return
                if embed:
                    self.send_response(302)
                    self.send_header('Location', embed)
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    return
                html = f'<!doctype html><meta charset="utf-8"><body style="margin:0;background:#000;color:#bbb;font:14px system-ui;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center">HDRezka не найдено: {title}</body>'.encode('utf-8')
                self.send_response(200); self.send_header('Content-Type','text/html; charset=utf-8'); self.send_header('Content-Length', str(len(html))); self.end_headers(); self.wfile.write(html)
                return
            except Exception as e:
                self._send(500, {'ok': False, 'error': str(e)})
                return
        self._send(404, {'error': 'not found'})

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            body = self._read_json()
            with db() as c:
                if path == '/api/auth/signup':
                    email = (body.get('email') or '').strip().lower()
                    password = body.get('password') or ''
                    if '@' not in email or len(password) < 6:
                        self._send(400, {'error': 'Email или пароль некорректны (минимум 6 символов).'})
                        return
                    if c.execute('select 1 from users where email=?', (email,)).fetchone():
                        self._send(409, {'error': 'Пользователь уже существует.'})
                        return
                    user_id = str(uuid.uuid4())
                    created = now_iso()
                    c.execute('insert into users(id,email,password_hash,created_at) values(?,?,?,?)', (user_id, email, hash_password(password), created))
                    profile = {
                        'id': user_id, 'email': email, 'username': email.split('@')[0], 'tag': str(secrets.randbelow(9000)+1000),
                        'status': 'approved', 'is_admin': bool(ADMIN_EMAIL and email == ADMIN_EMAIL), 'created_at': created,
                    }
                    upsert_row(c, 'profiles', profile)
                    self._send(200, {'user': {'id': user_id, 'email': email}})
                    return

                if path == '/api/auth/signin':
                    email = (body.get('email') or '').strip().lower()
                    password = body.get('password') or ''
                    row = c.execute('select * from users where email=?', (email,)).fetchone()
                    if not row or not verify_password(password, row['password_hash']):
                        self._send(401, {'error': 'Неверный email или пароль.'})
                        return
                    token = make_session(c, row['id'])
                    self._send(200, {'session': {'access_token': token, 'user': public_user(row)}, 'user': public_user(row)})
                    return

                if path == '/api/auth/session':
                    row = get_auth_user(c, self.headers)
                    if not row:
                        self._send(200, {'session': None})
                        return
                    token = (self.headers.get('authorization') or '').split(' ', 1)[1]
                    self._send(200, {'session': {'access_token': token, 'user': public_user(row)}, 'user': public_user(row)})
                    return

                if path == '/api/auth/signout':
                    auth = self.headers.get('authorization') or ''
                    if auth.lower().startswith('bearer '):
                        c.execute('delete from sessions where token=?', (auth.split(' ', 1)[1].strip(),))
                    self._send(200, {'ok': True})
                    return

                if path == '/api/query':
                    user = get_auth_user(c, self.headers)
                    if not user:
                        self._send(401, {'error': 'Unauthorized'})
                        return
                    table = body.get('table')
                    action = body.get('action') or 'select'
                    if not table or not table.replace('_', '').isalnum():
                        self._send(400, {'error': 'Invalid table'})
                        return
                    if action == 'select':
                        rows, count = apply_query(load_rows(c, table), body)
                        self._send(200, {'data': rows, 'count': count})
                        return
                    if action == 'insert':
                        items = body.get('values') if isinstance(body.get('values'), list) else [body.get('values')]
                        saved = [upsert_row(c, table, x) for x in items]
                        self._send(200, {'data': saved, 'count': len(saved)})
                        return
                    if action == 'upsert':
                        values = body.get('values') if isinstance(body.get('values'), list) else [body.get('values')]
                        saved = []
                        conflict = (body.get('onConflict') or '').split(',') if body.get('onConflict') else []
                        existing = load_rows(c, table)
                        for item in values:
                            item = dict(item or {})
                            if conflict:
                                found = next((r for r in existing if all(str(r.get(k.strip())) == str(item.get(k.strip())) for k in conflict)), None)
                                if found and found.get('id'):
                                    item['id'] = found['id']
                            saved.append(upsert_row(c, table, item))
                        self._send(200, {'data': saved, 'count': len(saved)})
                        return
                    if action == 'update':
                        rows, _ = apply_query(load_rows(c, table), body)
                        patch = body.get('values') or {}
                        updated = []
                        for r in rows:
                            r.update(patch)
                            updated.append(upsert_row(c, table, r))
                        self._send(200, {'data': updated, 'count': len(updated)})
                        return
                    if action == 'delete':
                        rows, _ = apply_query(load_rows(c, table), body)
                        ids = [str(r.get('id')) for r in rows if r.get('id') is not None]
                        for rid in ids:
                            c.execute('delete from rows where table_name=? and id=?', (table, rid))
                        self._send(200, {'data': rows, 'count': len(rows)})
                        return
                    self._send(400, {'error': 'Invalid action'})
                    return
        except Exception as e:
            self._send(500, {'error': str(e)})
            return
        self._send(404, {'error': 'not found'})


if __name__ == '__main__':
    init_db()
    host = os.environ.get('HADES_API_HOST', '127.0.0.1')
    port = int(os.environ.get('HADES_API_PORT', '3101'))
    print(f'HADES local API listening on {host}:{port}', flush=True)
    ThreadingHTTPServer((host, port), Handler).serve_forever()
