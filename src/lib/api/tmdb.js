import { BASE, TMDB_KEY, COLLAPS_API, COLLAPS_TOKEN, ALLOHA_TOKEN } from '../config.js';

const apiCache = new Map();
const inflight = new Map();
const CATALOG_TTL = 900000; // 15 min for catalog data
const DEFAULT_TTL = 300000; // 5 min default

/**
 * Stale-while-revalidate TMDB API wrapper.
 * Returns cached data instantly (even if stale), refreshes in background.
 * Deduplicates concurrent requests to the same path.
 *
 * @param {string} path - TMDB API path (e.g. /movie/popular)
 * @param {number} [ttl] - Cache TTL in ms (default 15min for catalog, 5min for details)
 * @returns {Promise<Object|null>}
 */
export const api = async (path, ttl) => {
    const effectiveTtl = ttl ?? (path.startsWith('/trending') || path.startsWith('/movie/popular') || path.startsWith('/movie/top_rated') || path.startsWith('/tv/') || path.startsWith('/discover/') || path.startsWith('/movie/upcoming') ? CATALOG_TTL : DEFAULT_TTL);

    const cached = apiCache.get(path);
    const isFresh = cached && Date.now() - cached.ts < effectiveTtl;

    if (isFresh) return cached.data;

    if (cached) {
        revalidate(path);
        return cached.data;
    }

    return fetchAndCache(path);
};

async function fetchAndCache(path) {
    if (inflight.has(path)) return inflight.get(path);

    const promise = (async () => {
        try {
            const sep = path.includes('?') ? '&' : '?';
            const res = await fetch(`${BASE}${path}${sep}api_key=${TMDB_KEY}&language=ru-RU`);
            if (!res.ok) throw new Error(`TMDB ${res.status}`);
            const data = await res.json();
            apiCache.set(path, { data, ts: Date.now() });
            return data;
        } catch (err) {
            console.error('TMDB API error:', err.message, path);
            return apiCache.get(path)?.data || null;
        } finally {
            inflight.delete(path);
        }
    })();

    inflight.set(path, promise);
    return promise;
}

function revalidate(path) {
    if (inflight.has(path)) return;
    const promise = (async () => {
        try {
            const sep = path.includes('?') ? '&' : '?';
            const res = await fetch(`${BASE}${path}${sep}api_key=${TMDB_KEY}&language=ru-RU`);
            if (!res.ok) return;
            const data = await res.json();
            apiCache.set(path, { data, ts: Date.now() });
        } catch {} finally {
            inflight.delete(path);
        }
    })();
    inflight.set(path, promise);
}

/** @param {number} tmdbId @param {string} type @returns {Promise<string|null>} */
export const getImdbId = async (tmdbId, type) => {
    try {
        const data = await api(`/${type}/${tmdbId}/external_ids`);
        return data?.imdb_id?.replace('tt', '') || null;
    } catch { return null; }
};

/** @param {string} imdbId @returns {Promise<Object|null>} */
export const searchCollaps = async (imdbId) => {
    try {
        const res = await fetch(`${COLLAPS_API}/list?token=${COLLAPS_TOKEN}&imdb_id=${imdbId}`);
        const data = await res.json();
        return data?.results?.[0] || null;
    } catch { return null; }
};

/** @param {string} kpId @returns {Promise<Object|null>} */
export const searchAlloha = async (kpId) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`https://api.alloha.tv/?token=${ALLOHA_TOKEN}&kp=${kpId}`, { signal: controller.signal }).catch(() => null);
        clearTimeout(timeout);
        if (!res || !res.ok) return null;
        const data = await res.json();
        return data.status === 'success' ? data.data : null;
    } catch { return null; }
};

/** @param {string} title @returns {Promise<number|null>} */
export const getMalId = async (title) => {
    try {
        const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1`);
        const data = await res.json();
        return data?.data?.[0]?.mal_id || null;
    } catch { return null; }
};

/** @param {Object} item @returns {boolean} */
export const isAnime = (item) => {
    const countries = item.origin_country || item.production_countries?.map(c => c.iso_3166_1) || [];
    return countries.includes('JP');
};
