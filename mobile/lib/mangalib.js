import { MANGA_API } from './config';

/**
 * MangaLib API client (api2.mangalib.me) — RN port of src/lib/api/mangalib.js.
 * The JSON API needs no auth; images are referer-gated, so every Image that
 * shows a cover or a page must pass MANGA_IMG_HEADERS (see lib/config.js).
 *
 *   search:   manga?q=&site_id[]=1&fields[]=rate_avg
 *   catalog:  manga?site_id[]=1&sort_by=<views|last_chapter_at|created_at>
 *   title:    manga/{slug}?fields[]=summary&fields[]=genres&fields[]=rate_avg
 *   chapters: manga/{slug}/chapters                      -> data[] {volume,number,name}
 *   pages:    manga/{slug}/chapter?number=&volume=       -> data.pages[].url (img path)
 */

const IMG_BASE = 'https://img2.imglib.info';
const CACHE_TTL = 600000;

const cache = new Map();
const inflight = new Map();

async function mlFetch(path, ttl = 0, fresh = false) {
    if (fresh) cache.delete(path);
    const hit = ttl && cache.get(path);
    if (hit && Date.now() - hit.ts < ttl) return hit.data;
    if (inflight.has(path)) return inflight.get(path);
    const promise = (async () => {
        try {
            const res = await fetch(MANGA_API + path, { headers: { Accept: 'application/json' } });
            if (!res.ok) throw new Error(`mangalib ${res.status}`);
            const data = await res.json();
            if (ttl) cache.set(path, { data, ts: Date.now() });
            return data;
        } finally { inflight.delete(path); }
    })();
    inflight.set(path, promise);
    return promise;
}

function coverUrl(cover, big = false) {
    return (big ? (cover?.default || cover?.md) : (cover?.md || cover?.default || cover?.thumbnail)) || null;
}

/** Normalize a MangaLib manga object into the shape the UI expects. */
export function normalizeManga(t) {
    if (!t) return null;
    return {
        id: t.id,
        dir: t.slug_url || t.slug,
        title: t.rus_name || t.name || t.eng_name || 'Без названия',
        altTitle: t.eng_name || t.name || '',
        cover: coverUrl(t.cover),
        coverHigh: coverUrl(t.cover, true),
        rating: t.rating?.average ? Number(t.rating.average) : (t.rate_avg ? Number(t.rate_avg) : 0),
        type: t.type?.label || (typeof t.type === 'string' ? t.type : ''),
        year: t.releaseDate || (t.releaseDateString ? parseInt(t.releaseDateString, 10) : null),
        chapters: t.items_count?.uploaded ?? null,
        isAdult: (t.ageRestriction?.id ?? 0) >= 4 || !!t.is_erotic,
        genres: (t.genres || []).map((g) => g.name).filter(Boolean),
    };
}

/** Curated subset of MangaLib genre ids (full list lives at /constants). */
export const MANGA_GENRES = [
    { id: null, label: 'Все' },
    { id: 34, label: 'Боевик' },
    { id: 56, label: 'Романтика' },
    { id: 69, label: 'Фэнтези' },
    { id: 47, label: 'Комедия' },
    { id: 43, label: 'Драма' },
    { id: 79, label: 'Исекай' },
    { id: 54, label: 'Приключения' },
    { id: 55, label: 'Психология' },
    { id: 67, label: 'Ужасы' },
    { id: 40, label: 'Детектив' },
    { id: 63, label: 'Спорт' },
];

/** Catalog listing. ordering: last_chapter_at (updated) | views (popular) | created_at (new) */
export async function getCatalog({ ordering = 'last_chapter_at', page = 1, genre = null, fresh = false } = {}) {
    const g = genre ? `&genres[]=${genre}` : '';
    const d = await mlFetch(`/manga?site_id[]=1&sort_by=${encodeURIComponent(ordering)}${g}&fields[]=rate_avg&page=${page}`, CACHE_TTL, fresh);
    return (d.data || []).map(normalizeManga);
}

/** Search by query. */
export async function searchManga(query, limit = 30) {
    if (!query?.trim()) return [];
    const d = await mlFetch(`/manga?q=${encodeURIComponent(query.trim())}&site_id[]=1&fields[]=rate_avg`);
    return (d.data || []).slice(0, limit).map(normalizeManga);
}

// MangaLib's `summary` is either a plain string or a TipTap/ProseMirror doc
// ({type:'doc', content:[{type:'paragraph', content:[{type:'text', text:'…'}]}]}).
function nodeText(node) {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(nodeText).join('');
    let s = node.text || '';
    if (node.content) s += nodeText(node.content);
    if (node.type === 'paragraph') s += '\n';
    return s;
}
function parseSummary(summary) {
    if (!summary) return '';
    const raw = typeof summary === 'string' ? summary.replace(/<[^>]+>/g, '') : nodeText(summary);
    return raw.replace(/\n{3,}/g, '\n\n').trim();
}

/** Full title details by slug (slug_url, e.g. "706--onepunchman"). */
export async function getTitle(slug) {
    const d = await mlFetch(`/manga/${encodeURIComponent(slug)}?fields[]=summary&fields[]=genres&fields[]=rate_avg`, CACHE_TTL);
    const c = d.data;
    if (!c) return null;
    return {
        ...normalizeManga(c),
        description: parseSummary(c.summary),
        status: c.status?.label || '',
        isLicensed: !!c.is_licensed,
    };
}

/** Chapter list, newest-first (MangaLib returns oldest-first, so we reverse). */
export async function getChapters(slug) {
    const d = await mlFetch(`/manga/${encodeURIComponent(slug)}/chapters`, CACHE_TTL);
    const arr = Array.isArray(d.data) ? d.data : [];
    return arr.map((c) => ({
        id: `${c.volume}_${c.number}`,
        cid: c.id,
        volume: c.volume,
        number: c.number,
        tome: c.volume,
        chapter: c.number,
        name: c.name || '',
        label: `Том ${c.volume} Глава ${c.number}${c.name ? ` — ${c.name}` : ''}`,
    })).reverse();
}

/** Page image URLs for a chapter. Render with MANGA_IMG_HEADERS.
 *  Cached briefly so prefetching the next chapter doesn't double-fetch. */
export async function getChapterPages(slug, volume, number) {
    const d = await mlFetch(`/manga/${encodeURIComponent(slug)}/chapter?number=${encodeURIComponent(number)}&volume=${encodeURIComponent(volume)}`, CACHE_TTL);
    const pages = d?.data?.pages || [];
    const list = pages
        .map((p) => ({ link: IMG_BASE + p.url, width: p.width, height: p.height }))
        .filter((p) => p.link);
    return { pages: list, paid: false };
}

function stripHtml(html) {
    return String(html || '')
        .replace(/<\/p>|<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function normalizeComment(c) {
    return {
        id: c.id,
        text: stripHtml(c.comment),
        user: c.user?.username || 'Аноним',
        avatar: c.user?.avatar?.url || null,
        date: c.created_at || null,
        up: c.votes?.up || 0,
        down: c.votes?.down || 0,
    };
}

/** Comments for a whole title (by MangaLib manga id). */
export async function getTitleComments(mangaId, page = 1) {
    if (!mangaId) return [];
    try {
        const d = await mlFetch(`/comments?manga_id=${mangaId}&page=${page}`);
        return ((d.data && d.data.root) || []).map(normalizeComment);
    } catch { return []; }
}
