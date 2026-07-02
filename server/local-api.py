#!/usr/bin/env python3
import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import threading
import time
import traceback
import uuid

try:
    import bcrypt
except Exception:
    bcrypt = None
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, urlencode, urlparse
from urllib.request import Request, urlopen

DB_PATH = os.environ.get('HADES_DB_PATH', '/root/apps/hades-api/hades.sqlite')
ALLOWED_ORIGINS = {o.strip() for o in os.environ.get('HADES_ALLOWED_ORIGINS', 'https://mi-yomi.github.io,http://127.0.0.1:5173,http://localhost:5173').split(',') if o.strip()}
ADMIN_EMAIL = os.environ.get('HADES_ADMIN_EMAIL', '').strip().lower()
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '').strip()
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '').strip()
HADES_PUBLIC_URL = os.environ.get('HADES_PUBLIC_URL', 'https://hades.178-62-250-207.sslip.io').rstrip('/')
FIREBASE_PROJECT_ID = os.environ.get('FIREBASE_PROJECT_ID', '').strip()
OAUTH_STATE_SECRET = os.environ.get('HADES_OAUTH_STATE_SECRET') or GOOGLE_CLIENT_SECRET or secrets.token_urlsafe(32)
PBKDF2_ROUNDS = 180_000
# Must match the frontend VITE_WHITELIST: 'off' = auto-approve, anything else = admin approval
WHITELIST_ENABLED = os.environ.get('HADES_WHITELIST', 'on') != 'off'
SESSION_TTL_SECONDS = int(os.environ.get('HADES_SESSION_TTL_DAYS', '30')) * 86400
# Sliding-window rate limit for credential endpoints, per client IP
AUTH_RATE_LIMIT = int(os.environ.get('HADES_AUTH_RATE_LIMIT', '20'))
AUTH_RATE_WINDOW = int(os.environ.get('HADES_AUTH_RATE_WINDOW', '600'))

# Per-table access rules for /api/query. Reads are open to any authenticated
# user (social features: friends browse each other's profiles/libraries).
# Writes require ownership: the owner column must equal the session user id.
#   also_owner  — extra columns that also grant write access to a matched row
#                 (friendships: the recipient accepts/declines the request)
#   insert_any  — anyone authenticated may insert (notifications for others)
#   admin_write — only admins may write (curated home-screen lists)
#   protected   — fields a non-admin can never set/change on this table
TABLE_RULES = {
    'profiles':             {'owner': 'id', 'protected': ('is_admin', 'status', 'email')},
    'friendships':          {'owner': 'user_id', 'also_owner': ('friend_id',)},
    'notifications':        {'owner': 'user_id', 'insert_any': True},
    'history':              {'owner': 'user_id'},
    'reviews':              {'owner': 'user_id'},
    'favorites':            {'owner': 'user_id'},
    'user_library':         {'owner': 'user_id'},
    'user_collections':     {'owner': 'user_id'},
    'watchlist':            {'owner': 'user_id'},
    'watch_progress':       {'owner': 'user_id'},
    'review_reactions':     {'owner': 'user_id'},
    'review_comments':      {'owner': 'user_id'},
    'review_comment_likes': {'owner': 'user_id'},
    'curated_lists':        {'owner': 'user_id', 'admin_write': True},
}

# Child-table foreign keys for embedded selects like review_comments(count)
CHILD_FK = {
    'review_comments': 'review_id',
    'review_comment_likes': 'comment_id',
    'review_reactions': 'review_id',
}


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


def _b64url(data):
    return base64.urlsafe_b64encode(data).decode().rstrip('=')


def _unb64url(text):
    return base64.urlsafe_b64decode(text + '=' * (-len(text) % 4))


def make_oauth_state(redirect_to):
    if not redirect_to:
        redirect_to = 'https://mi-yomi.github.io/'
    payload = {'redirect_to': redirect_to, 'ts': int(time.time()), 'nonce': secrets.token_urlsafe(12)}
    body = _b64url(json.dumps(payload, separators=(',', ':')).encode())
    sig = _b64url(hmac.new(OAUTH_STATE_SECRET.encode(), body.encode(), hashlib.sha256).digest())
    return f'{body}.{sig}'


def verify_oauth_state(state, max_age=600):
    try:
        body, sig = state.split('.', 1)
        expected = _b64url(hmac.new(OAUTH_STATE_SECRET.encode(), body.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):
            raise ValueError('bad oauth state signature')
        payload = json.loads(_unb64url(body).decode())
        if int(time.time()) - int(payload.get('ts', 0)) > max_age:
            raise ValueError('oauth state expired')
        redirect_to = payload.get('redirect_to') or 'https://mi-yomi.github.io/'
        if not (redirect_to.startswith('https://mi-yomi.github.io') or redirect_to.startswith('http://localhost:') or redirect_to.startswith('http://127.0.0.1:')):
            raise ValueError('redirect target is not allowed')
        return payload
    except ValueError:
        raise
    except Exception as e:
        raise ValueError('invalid oauth state') from e


def google_callback_url():
    return f'{HADES_PUBLIC_URL}/api/auth/google/callback'


def google_auth_url(state):
    params = {
        'client_id': GOOGLE_CLIENT_ID,
        'redirect_uri': google_callback_url(),
        'response_type': 'code',
        'scope': 'openid email profile',
        'state': state,
        'access_type': 'online',
        'prompt': 'select_account',
    }
    return 'https://accounts.google.com/o/oauth2/v2/auth?' + urlencode(params)


def google_exchange_code(code):
    payload = urlencode({
        'code': code,
        'client_id': GOOGLE_CLIENT_ID,
        'client_secret': GOOGLE_CLIENT_SECRET,
        'redirect_uri': google_callback_url(),
        'grant_type': 'authorization_code',
    }).encode()
    req = Request('https://oauth2.googleapis.com/token', data=payload, headers={'Content-Type': 'application/x-www-form-urlencoded'})
    with urlopen(req, timeout=15) as res:
        return json.loads(res.read().decode())


def google_userinfo(access_token):
    req = Request('https://www.googleapis.com/oauth2/v3/userinfo', headers={'Authorization': f'Bearer {access_token}'})
    with urlopen(req, timeout=15) as res:
        return json.loads(res.read().decode())


# Overridable in tests; resolved lazily so the module imports without google-auth
verify_firebase_token_impl = None


def verify_firebase_id_token(token):
    if not FIREBASE_PROJECT_ID:
        raise ValueError('Firebase Auth is not configured: FIREBASE_PROJECT_ID is missing')
    impl = verify_firebase_token_impl
    if impl is None:
        try:
            from google.auth.transport import requests as google_requests
            from google.oauth2 import id_token as google_id_token
        except ImportError as e:
            raise ValueError('google-auth is not installed on the server') from e
        claims = google_id_token.verify_firebase_token(token, google_requests.Request(), audience=FIREBASE_PROJECT_ID)
    else:
        claims = impl(token, None, audience=FIREBASE_PROJECT_ID)
    email = (claims.get('email') or '').strip().lower()
    if not email or not claims.get('email_verified'):
        raise ValueError('Firebase email is not verified')
    return claims


def default_status(email):
    """Approval status for a freshly created profile, decided ONLY server-side."""
    if ADMIN_EMAIL and email == ADMIN_EMAIL:
        return 'approved'
    return 'pending' if WHITELIST_ENABLED else 'approved'


def is_admin_email(email):
    return bool(ADMIN_EMAIL and (email or '').strip().lower() == ADMIN_EMAIL)


def get_or_create_firebase_user(c, claims):
    info = {
        'sub': claims.get('sub') or claims.get('user_id') or '',
        'email': claims.get('email'),
        'email_verified': claims.get('email_verified'),
        'name': claims.get('name') or claims.get('email', '').split('@')[0],
        'picture': claims.get('picture'),
    }
    return get_or_create_google_user(c, info)


def get_or_create_google_user(c, info):
    email = (info.get('email') or '').strip().lower()
    if not email or not info.get('email_verified'):
        raise ValueError('Google email is not verified')
    row = c.execute('select * from users where email=?', (email,)).fetchone()
    if row:
        return row
    user_id = str(uuid.uuid4())
    created = now_iso()
    c.execute('insert into users(id,email,password_hash,created_at) values(?,?,?,?)', (user_id, email, f'oauth_google${info.get("sub", "")}', created))
    profile = {
        'id': user_id,
        'email': email,
        'username': info.get('name') or email.split('@')[0],
        'avatar_url': info.get('picture'),
        'tag': str(secrets.randbelow(9000)+1000),
        'status': default_status(email),
        'is_admin': is_admin_email(email),
        'created_at': created,
    }
    upsert_row(c, 'profiles', profile)
    return c.execute('select * from users where id=?', (user_id,)).fetchone()


def redirect_response(handler, location):
    handler.send_response(302)
    handler.send_header('Location', location)
    handler.send_header('Cache-Control', 'no-store')
    handler.end_headers()


def hash_password(password, salt=None):
    if salt is None:
        salt = secrets.token_bytes(16)
    if isinstance(salt, str):
        salt = base64.b64decode(salt)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, PBKDF2_ROUNDS)
    return f'pbkdf2_sha256${PBKDF2_ROUNDS}${base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}'


def verify_password(password, stored):
    try:
        if stored.startswith('supabase_bcrypt$'):
            if bcrypt is None:
                return False
            supabase_hash = stored.split('$', 1)[1]
            return bcrypt.checkpw(password.encode(), supabase_hash.encode())
        if stored.startswith('$2a$') or stored.startswith('$2b$') or stored.startswith('$2y$'):
            if bcrypt is None:
                return False
            return bcrypt.checkpw(password.encode(), stored.encode())
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
    # Opportunistic cleanup so the table doesn't accumulate dead tokens forever
    if SESSION_TTL_SECONDS:
        c.execute('delete from sessions where created_at < ?', (int(time.time()) - SESSION_TTL_SECONDS,))
    c.execute('insert into sessions(token,user_id,created_at) values(?,?,?)', (token, user_id, int(time.time())))
    return token


def get_auth_user(c, headers):
    auth = headers.get('authorization') or headers.get('Authorization') or ''
    if not auth.lower().startswith('bearer '):
        return None
    token = auth.split(' ', 1)[1].strip()
    if not token:
        return None
    row = c.execute('select s.created_at as session_created_at, u.* from sessions s join users u on u.id=s.user_id where s.token=?', (token,)).fetchone()
    if not row:
        return None
    if SESSION_TTL_SECONDS and int(time.time()) - int(row['session_created_at']) > SESSION_TTL_SECONDS:
        c.execute('delete from sessions where token=?', (token,))
        return None
    return row


def get_profile(c, user_id):
    row = c.execute('select data from rows where table_name=? and id=?', ('profiles', str(user_id))).fetchone()
    if not row:
        return None
    try:
        return json.loads(row['data'])
    except Exception:
        return None


def is_admin_user(c, user):
    if is_admin_email(user['email']):
        return True
    profile = get_profile(c, user['id'])
    return bool(profile and profile.get('is_admin') is True)


_rate_lock = threading.Lock()
_rate_hits = {}


def rate_limited(key, limit=None, window=None):
    limit = limit or AUTH_RATE_LIMIT
    window = window or AUTH_RATE_WINDOW
    now = time.time()
    with _rate_lock:
        hits = [t for t in _rate_hits.get(key, []) if now - t < window]
        if len(hits) >= limit:
            _rate_hits[key] = hits
            return True
        hits.append(now)
        _rate_hits[key] = hits
        return False


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


def match_filter(row, f):
    op = f.get('op')
    key = f.get('key')
    val = f.get('value')
    cur = row.get(key)
    if op == 'eq':
        return str(cur) == str(val)
    if op == 'neq':
        return str(cur) != str(val)
    if op in ('like', 'ilike'):
        pattern = str(val).replace('%', '').lower()
        return pattern in str(cur or '').lower()
    if op == 'is':
        if val is None or str(val).lower() == 'null':
            return cur is None
        if str(val).lower() in ('true', 'false'):
            return bool(cur) == (str(val).lower() == 'true')
        return str(cur) == str(val)
    if op == 'in':
        vals = val if isinstance(val, list) else [v.strip() for v in str(val).strip('()').split(',')]
        return str(cur) in [str(v) for v in vals]
    if op in ('gt', 'gte', 'lt', 'lte'):
        try:
            a, b = float(cur), float(val)
        except (TypeError, ValueError):
            a, b = str(cur or ''), str(val or '')
        return {'gt': a > b, 'gte': a >= b, 'lt': a < b, 'lte': a <= b}[op]
    # An unknown operator MUST fail loudly: silently matching everything would
    # turn "delete these rows" into "delete all rows".
    raise ValueError(f'Unsupported filter operator: {op!r}')


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
        rows.sort(key=lambda r: (r.get(key) is None, str(r.get(key) or '')), reverse=not order.get('ascending', True))
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


# --- Embedded selects -------------------------------------------------------
# Supports the PostgREST subset the client actually uses:
#   profiles(f1,f2)          — join profiles via row.user_id
#   alias:user_id(f1,f2)     — join profiles via the named *_id column
#   child_table(count)       — [{count: n}] of child rows (FK from CHILD_FK)
#   child_table(f1,f2)       — list of child rows projected to the fields
_EMBED_RE = re.compile(r'(?:(\w+):)?(\w+)\(([^)]*)\)')


def parse_embeds(select_str):
    embeds = []
    for m in _EMBED_RE.finditer(select_str or ''):
        alias, name, fields = m.group(1), m.group(2), [f.strip() for f in m.group(3).split(',') if f.strip()]
        embeds.append({'alias': alias or name, 'name': name, 'fields': fields})
    return embeds


def expand_embeds(c, rows, select_str):
    embeds = parse_embeds(select_str)
    if not embeds or not rows:
        return rows
    profile_cache = {}

    def profile_by_id(pid):
        key = str(pid)
        if key not in profile_cache:
            profile_cache[key] = get_profile(c, key)
        return profile_cache[key]

    for e in embeds:
        name, alias, fields = e['name'], e['alias'], e['fields']
        if name.endswith('_id') or name == 'profiles':
            col = name if name.endswith('_id') else 'user_id'
            for r in rows:
                p = profile_by_id(r.get(col)) if r.get(col) is not None else None
                r[alias] = {f: p.get(f) for f in fields} if p else None
        elif name in CHILD_FK:
            fk = CHILD_FK[name]
            children = load_rows(c, name)
            for r in rows:
                mine = [ch for ch in children if str(ch.get(fk)) == str(r.get('id'))]
                if fields == ['count']:
                    r[alias] = [{'count': len(mine)}]
                else:
                    r[alias] = [{f: ch.get(f) for f in fields} for ch in mine]
    return rows


# --- /api/query with per-table authorization --------------------------------

def _owned(row, rule, uid):
    cols = (rule['owner'],) + tuple(rule.get('also_owner', ()))
    return any(str(row.get(col)) == str(uid) for col in cols)


def _sanitize_new_profile(c, item, user):
    """Non-admins can only create their own profile; approval flags are server-decided."""
    email = (user['email'] or '').strip().lower()
    item['id'] = str(user['id'])
    item['email'] = email
    item['is_admin'] = is_admin_email(email)
    item['status'] = default_status(email)
    existing = get_profile(c, user['id'])
    if existing:
        # Re-insert must never reset moderation done since (approved/rejected)
        item['status'] = existing.get('status', item['status'])
        item['is_admin'] = existing.get('is_admin', item['is_admin'])
    return item


def handle_query(c, user, body):
    """Returns (http_status, payload). Raises ValueError for malformed queries."""
    table = body.get('table')
    action = body.get('action') or 'select'
    if not table or not isinstance(table, str) or not table.replace('_', '').isalnum():
        return 400, {'error': 'Invalid table'}
    rule = TABLE_RULES.get(table)
    if rule is None:
        return 400, {'error': f'Unknown table: {table}'}
    uid = str(user['id'])

    if action == 'select':
        rows, count = apply_query(load_rows(c, table), body)
        rows = expand_embeds(c, rows, body.get('select'))
        return 200, {'data': rows, 'count': count}

    admin = is_admin_user(c, user)
    if rule.get('admin_write') and not admin:
        return 403, {'error': 'Admin only'}

    if action in ('insert', 'upsert'):
        values = body.get('values') if isinstance(body.get('values'), list) else [body.get('values')]
        conflict = (body.get('onConflict') or '').split(',') if body.get('onConflict') else []
        existing = load_rows(c, table) if (action == 'upsert' and conflict) else None
        saved = []
        for item in values:
            item = dict(item or {})
            if action == 'upsert' and conflict:
                found = next((r for r in existing if all(str(r.get(k.strip())) == str(item.get(k.strip())) for k in conflict)), None)
                if found and found.get('id'):
                    item['id'] = found['id']
                    if not admin and not _owned(found, rule, uid):
                        return 403, {'error': 'Forbidden: not your row'}
            if not admin and not rule.get('insert_any'):
                if table == 'profiles':
                    item = _sanitize_new_profile(c, item, user)
                else:
                    owner_col = rule['owner']
                    item.setdefault(owner_col, uid)
                    if str(item.get(owner_col)) != uid:
                        return 403, {'error': 'Forbidden: not your row'}
            saved.append(upsert_row(c, table, item))
        return 200, {'data': saved, 'count': len(saved)}

    if action == 'update':
        rows, _ = apply_query(load_rows(c, table), body)
        if not admin and any(not _owned(r, rule, uid) for r in rows):
            return 403, {'error': 'Forbidden: not your row'}
        patch = dict(body.get('values') or {})
        patch.pop('id', None)
        if not admin:
            for key in rule.get('protected', ()):
                patch.pop(key, None)
        updated = []
        for r in rows:
            r.update(patch)
            updated.append(upsert_row(c, table, r))
        return 200, {'data': updated, 'count': len(updated)}

    if action == 'delete':
        rows, _ = apply_query(load_rows(c, table), body)
        if not admin and any(not _owned(r, rule, uid) for r in rows):
            return 403, {'error': 'Forbidden: not your row'}
        for r in rows:
            if r.get('id') is not None:
                c.execute('delete from rows where table_name=? and id=?', (table, str(r['id'])))
        return 200, {'data': rows, 'count': len(rows)}

    return 400, {'error': 'Invalid action'}


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
    server_version = 'HADESLocalAPI/1.1'

    def log_message(self, fmt, *args):
        print('%s - - [%s] %s' % (self.client_address[0], self.log_date_time_string(), fmt % args), flush=True)

    def _client_ip(self):
        fwd = self.headers.get('X-Forwarded-For') or ''
        return fwd.split(',')[0].strip() or self.client_address[0]

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
        if path == '/api/auth/google/start':
            if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
                self._send(503, {'error': 'Google OAuth is not configured: GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET are missing.'})
                return
            q = {k: v[0] for k, v in parse_qs(parsed.query).items()}
            state = make_oauth_state(q.get('redirect_to') or 'https://mi-yomi.github.io/')
            redirect_response(self, google_auth_url(state))
            return
        if path == '/api/auth/google/callback':
            q = {k: v[0] for k, v in parse_qs(parsed.query).items()}
            try:
                payload = verify_oauth_state(q.get('state') or '')
                redirect_to = payload.get('redirect_to') or 'https://mi-yomi.github.io/'
                if q.get('error'):
                    redirect_response(self, f'{redirect_to}?auth_error={quote(q.get("error"))}')
                    return
                tokens = google_exchange_code(q.get('code') or '')
                info = google_userinfo(tokens.get('access_token') or '')
                with db() as c:
                    user = get_or_create_google_user(c, info)
                    session_token = make_session(c, user['id'])
                sep = '&' if '?' in redirect_to else '?'
                redirect_response(self, f'{redirect_to}{sep}auth_token={quote(session_token)}')
                return
            except Exception as e:
                target = 'https://mi-yomi.github.io/'
                try:
                    target = verify_oauth_state(q.get('state') or '').get('redirect_to') or target
                except Exception:
                    pass
                sep = '&' if '?' in target else '?'
                redirect_response(self, f'{target}{sep}auth_error={quote(str(e))}')
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
            except RuntimeError as e:
                self._send(502, {'ok': False, 'error': str(e)})
                return
            except Exception:
                print(traceback.format_exc(), flush=True)
                self._send(500, {'ok': False, 'error': 'Internal server error'})
                return
        self._send(404, {'error': 'not found'})

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            body = self._read_json()
            if path in ('/api/auth/signup', '/api/auth/signin', '/api/auth/firebase'):
                if rate_limited(f'{path}:{self._client_ip()}'):
                    self._send(429, {'error': 'Слишком много попыток. Подожди несколько минут.'})
                    return
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
                        'status': default_status(email), 'is_admin': is_admin_email(email), 'created_at': created,
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

                if path == '/api/auth/firebase':
                    claims = verify_firebase_id_token(body.get('idToken') or '')
                    row = get_or_create_firebase_user(c, claims)
                    token = make_session(c, row['id'])
                    self._send(200, {'session': {'access_token': token, 'user': public_user(row)}, 'user': public_user(row)})
                    return

                if path == '/api/query':
                    user = get_auth_user(c, self.headers)
                    if not user:
                        self._send(401, {'error': 'Unauthorized'})
                        return
                    status, payload = handle_query(c, user, body)
                    self._send(status, payload)
                    return
        except ValueError as e:
            # Malformed input / user-facing config errors — safe to echo
            self._send(400, {'error': str(e)})
            return
        except Exception:
            print(traceback.format_exc(), flush=True)
            self._send(500, {'error': 'Internal server error'})
            return
        self._send(404, {'error': 'not found'})


if __name__ == '__main__':
    init_db()
    host = os.environ.get('HADES_API_HOST', '127.0.0.1')
    port = int(os.environ.get('HADES_API_PORT', '3101'))
    print(f'HADES local API listening on {host}:{port}', flush=True)
    ThreadingHTTPServer((host, port), Handler).serve_forever()
