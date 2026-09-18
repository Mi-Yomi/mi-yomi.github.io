/**
 * HADES API client with a Supabase-shaped surface.
 *
 * The backend is no longer Supabase: it is the self-hosted HADES API
 * (server/local-api.py). This module keeps the `supabase.*` call shape the
 * screens already use, so the rest of the app needs no changes.
 *
 * Differences from the real Supabase client, by design:
 *  - the session token lives in AsyncStorage, not in a Supabase session object;
 *  - realtime channels are stubs (the HADES API has no websocket);
 *  - storage is a stub (avatars are stored as data: URIs inside the profile).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { HADES_API_URL } from './config';

const TOKEN_KEY = 'hades_local_api_token';
const listeners = new Set();

// Hydrated once at startup; every request waits for it exactly once.
let cachedToken = null;
const hydrating = AsyncStorage.getItem(TOKEN_KEY)
    .then((value) => { cachedToken = value || ''; })
    .catch(() => { cachedToken = ''; });

async function token() {
    if (cachedToken === null) await hydrating;
    return cachedToken || '';
}

async function setToken(value) {
    cachedToken = value || '';
    try {
        if (value) await AsyncStorage.setItem(TOKEN_KEY, value);
        else await AsyncStorage.removeItem(TOKEN_KEY);
    } catch { /* storage unavailable: the in-memory token still works this session */ }
}

async function request(path, body = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const t = await token();
    if (t) headers.Authorization = `Bearer ${t}`;
    let res;
    try {
        res = await fetch(`${HADES_API_URL}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
    } catch {
        return { data: null, error: { message: 'Нет связи с сервером HADES.', status: 0 }, count: null };
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { data: null, error: { message: json.error || `HTTP ${res.status}`, status: res.status }, count: null };
    return { data: json.data ?? json, error: null, count: json.count ?? null };
}

async function normalizeSession(payload) {
    const session = payload?.session || null;
    if (session?.access_token) await setToken(session.access_token);
    return session;
}

function emit(event, session) {
    listeners.forEach((fn) => fn(event, session));
}

/** Server-side Google flow: /api/auth/google/start -> Google -> callback -> redirect with ?auth_token */
async function signInWithGoogle() {
    const redirectTo = Linking.createURL('auth');
    const startUrl = `${HADES_API_URL}/auth/google/start?redirect_to=${encodeURIComponent(redirectTo)}`;
    let result;
    try {
        result = await WebBrowser.openAuthSessionAsync(startUrl, redirectTo);
    } catch (e) {
        return { data: null, error: { message: e?.message || 'Не удалось открыть окно Google.' } };
    }
    if (result.type !== 'success' || !result.url) {
        return { data: null, error: { message: 'Вход через Google отменён.' } };
    }
    const { queryParams } = Linking.parse(result.url);
    if (queryParams?.auth_error) {
        return { data: null, error: { message: String(queryParams.auth_error) } };
    }
    const accessToken = queryParams?.auth_token;
    if (!accessToken) {
        return { data: null, error: { message: 'Сервер не вернул токен входа.' } };
    }
    await setToken(String(accessToken));
    const res = await request('/auth/session', {});
    if (res.error) {
        await setToken('');
        return { data: null, error: res.error };
    }
    const session = await normalizeSession(res.data);
    emit('SIGNED_IN', session);
    return { data: { session, user: session?.user }, error: null };
}

class QueryBuilder {
    constructor(table) {
        this.table = table;
        this.action = 'select';
        this.selectColumns = '*';
        this.values = undefined;
        this.filters = [];
        this.orFilters = [];
        this.orderBy = null;
        this.limitValue = null;
        this.offsetValue = null;
        this.endValue = null;
        this.singleMode = false;
        this.maybeSingleMode = false;
        this.onConflictValue = null;
    }

    select(columns = '*') { this.action = this.action || 'select'; this.selectColumns = columns; return this; }
    insert(values) { this.action = 'insert'; this.values = values; return this; }
    update(values) { this.action = 'update'; this.values = values; return this; }
    upsert(values, opts = {}) { this.action = 'upsert'; this.values = values; this.onConflictValue = opts?.onConflict || null; return this; }
    delete() { this.action = 'delete'; return this; }

    eq(key, value) { this.filters.push({ op: 'eq', key, value }); return this; }
    neq(key, value) { this.filters.push({ op: 'neq', key, value }); return this; }
    ilike(key, value) { this.filters.push({ op: 'ilike', key, value }); return this; }
    in(key, values) { this.filters.push({ op: 'in', key, value: values }); return this; }
    gt(key, value) { this.filters.push({ op: 'gt', key, value }); return this; }
    gte(key, value) { this.filters.push({ op: 'gte', key, value }); return this; }
    lt(key, value) { this.filters.push({ op: 'lt', key, value }); return this; }
    lte(key, value) { this.filters.push({ op: 'lte', key, value }); return this; }

    or(expr = '') {
        this.orFilters = expr.split(',').map((part) => {
            const [key, op, ...rest] = part.split('.');
            return { key, op, value: rest.join('.') };
        }).filter((f) => f.key && f.op);
        return this;
    }

    order(key, opts = {}) { this.orderBy = { key, ascending: opts.ascending !== false }; return this; }
    limit(n) { this.limitValue = n; return this; }
    range(start, end) { this.offsetValue = start; this.endValue = end; return this; }
    single() { this.singleMode = true; return this; }
    maybeSingle() { this.maybeSingleMode = true; return this; }

    async execute() {
        const res = await request('/query', {
            table: this.table,
            action: this.action || 'select',
            select: this.selectColumns,
            values: this.values,
            filters: this.filters,
            orFilters: this.orFilters,
            order: this.orderBy,
            limit: this.limitValue,
            offset: this.offsetValue,
            end: this.endValue,
            onConflict: this.onConflictValue,
        });
        if (res.error) return res;
        let data = res.data;
        if (data && !Array.isArray(data) && Array.isArray(data.data)) data = data.data;
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
            const session = await normalizeSession(res.data);
            emit('SIGNED_IN', session);
            return { data: { session, user: session?.user }, error: null };
        },

        async getSession() {
            if (!(await token())) return { data: { session: null }, error: null };
            const res = await request('/auth/session', {});
            if (res.error) { await setToken(''); return { data: { session: null }, error: null }; }
            const session = await normalizeSession(res.data);
            return { data: { session }, error: null };
        },

        onAuthStateChange(callback) {
            listeners.add(callback);
            return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
        },

        async signOut() {
            await request('/auth/signout', {});
            await setToken('');
            emit('SIGNED_OUT', null);
            return { error: null };
        },

        async signInWithOAuth({ provider } = {}) {
            if (provider !== 'google') return { data: null, error: { message: 'Поддерживается только вход через Google.' } };
            try {
                return await signInWithGoogle();
            } catch (err) {
                return { data: null, error: { message: err?.message || 'Вход через Google не удался.' } };
            }
        },
    },

    from(table) { return new QueryBuilder(table); },

    // Avatars and covers are data: URIs inside the profile row; no object storage.
    storage: {
        from() {
            return {
                async upload() { return { data: null, error: { message: 'Хранилище файлов отключено; используется data: URI.' } }; },
                getPublicUrl(path) { return { data: { publicUrl: path } }; },
            };
        },
    },

    // The HADES API has no realtime transport; screens fall back to polling on focus.
    channel() { return { on() { return this; }, subscribe() { return this; } }; },
    removeChannel() {},
};
