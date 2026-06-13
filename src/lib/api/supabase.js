import { HADES_API_URL } from '../config.js';

const TOKEN_KEY = 'hades_local_api_token';
const listeners = new Set();

function token() { return localStorage.getItem(TOKEN_KEY) || ''; }
function setToken(value) {
    if (value) localStorage.setItem(TOKEN_KEY, value);
    else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, body = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const t = token();
    if (t) headers.Authorization = `Bearer ${t}`;
    const res = await fetch(`${HADES_API_URL}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { data: null, error: { message: json.error || `HTTP ${res.status}`, status: res.status }, count: null };
    return { data: json.data ?? json, error: null, count: json.count ?? null };
}

function normalizeSession(payload) {
    const session = payload?.session || null;
    if (session?.access_token) setToken(session.access_token);
    return session;
}

class QueryBuilder {
    constructor(table) {
        this.table = table;
        this.action = 'select';
        this.values = undefined;
        this.filters = [];
        this.orFilters = [];
        this.orderBy = null;
        this.limitValue = null;
        this.offsetValue = null;
        this.endValue = null;
        this.singleMode = false;
        this.maybeSingleMode = false;
        this.countMode = null;
        this.headMode = false;
        this.onConflictValue = null;
    }

    select(_columns = '*', opts = {}) { this.action = this.action || 'select'; this.countMode = opts?.count || null; this.headMode = !!opts?.head; return this; }
    insert(values) { this.action = 'insert'; this.values = values; return this; }
    update(values) { this.action = 'update'; this.values = values; return this; }
    delete() { this.action = 'delete'; return this; }
    upsert(values, opts = {}) { this.action = 'upsert'; this.values = values; this.onConflictValue = opts?.onConflict || null; return this; }
    eq(key, value) { this.filters.push({ op: 'eq', key, value }); return this; }
    ilike(key, value) { this.filters.push({ op: 'ilike', key, value }); return this; }
    order(key, opts = {}) { this.orderBy = { key, ascending: opts.ascending !== false }; return this; }
    limit(n) { this.limitValue = n; return this; }
    range(start, end) { this.offsetValue = start; this.endValue = end; return this; }
    single() { this.singleMode = true; return this; }
    maybeSingle() { this.maybeSingleMode = true; return this; }

    or(expr = '') {
        this.orFilters = expr.split(',').map(part => {
            const [key, op, ...rest] = part.split('.');
            return { key, op, value: rest.join('.') };
        }).filter(f => f.key && f.op);
        return this;
    }

    async execute() {
        const payload = {
            table: this.table,
            action: this.action || 'select',
            values: this.values,
            filters: this.filters,
            orFilters: this.orFilters,
            order: this.orderBy,
            limit: this.limitValue,
            offset: this.offsetValue,
            end: this.endValue,
            count: this.countMode,
            head: this.headMode,
            onConflict: this.onConflictValue,
        };
        const res = await request('/query', payload);
        if (res.error) return res;
        let data = res.data;
        if (data && !Array.isArray(data) && Array.isArray(data.data)) data = data.data;
        if (this.headMode) data = null;
        if (this.singleMode || this.maybeSingleMode) {
            if (Array.isArray(data)) data = data[0] || null;
        }
        return { data, error: null, count: res.count };
    }

    then(resolve, reject) { return this.execute().then(resolve, reject); }
    catch(reject) { return this.execute().catch(reject); }
    finally(cb) { return this.execute().finally(cb); }
}

export const supabase = {
    auth: {
        async signUp({ email, password }) {
            const res = await request('/auth/signup', { email, password });
            if (res.error) return { data: null, error: res.error };
            return { data: { user: res.data.user, session: null }, error: null };
        },
        async signInWithPassword({ email, password }) {
            const res = await request('/auth/signin', { email, password });
            if (res.error) return { data: null, error: res.error };
            const session = normalizeSession(res.data);
            listeners.forEach(fn => fn('SIGNED_IN', session));
            return { data: { session, user: session?.user }, error: null };
        },
        async getSession() {
            if (!token()) return { data: { session: null }, error: null };
            const res = await request('/auth/session', {});
            if (res.error) { setToken(''); return { data: { session: null }, error: null }; }
            const session = normalizeSession(res.data);
            return { data: { session }, error: null };
        },
        onAuthStateChange(callback) {
            listeners.add(callback);
            return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
        },
        async signOut() {
            await request('/auth/signout', {});
            setToken('');
            listeners.forEach(fn => fn('SIGNED_OUT', null));
            return { error: null };
        },
        async signInWithOAuth() {
            return { data: null, error: { message: 'Google login временно отключён на self-host backend. Используй email/пароль.' } };
        },
    },
    from(table) { return new QueryBuilder(table); },
    storage: {
        from() {
            return {
                async upload() { return { data: null, error: { message: 'Storage is not enabled; using base64 fallback.' } }; },
                getPublicUrl(path) { return { data: { publicUrl: path } }; },
            };
        },
    },
    channel() {
        return { on() { return this; }, subscribe() { return this; } };
    },
    removeChannel() {},
};
