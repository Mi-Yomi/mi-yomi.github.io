import { MANGA_API } from '../config.js';

/**
 * MangaLib API client (api2.mangalib.me). Endpoints/shapes are adapted from the
 * Python parser `damirTAG/mangagraph`. The JSON API is CORS-friendly so it's called
 * directly from the browser; only images are referer-gated and go through the proxy.
 *
 *   search:   manga?q=&site_id[]=1&fields[]=rate_avg
 *   catalog:  manga?site_id[]=1&sort_by=<views|last_chapter_at|created_at>
 *   title:    manga/{slug}?fields[]=summary&fields[]=genres&fields[]=rate_avg
 *   chapters: manga/{slug}/chapters                      -> data[] {volume,number,name}
 *   pages:    manga/{slug}/chapter?number=&volume=       -> data.pages[].url (img path)
 */

const IMG_BASE = 'https://img2.imglib.info';

async function mlFetch(path) {
    const res = await fetch(MANGA_API + path, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`mangalib ${res.status}`);
    return res.json();
}

// Images are loaded directly (the hosts accept any non-empty referer; the <img>
// tags set referrerPolicy="origin"). No proxy.
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

/** Catalog listing. ordering: last_chapter_at (updated) | views (popular) | created_at (new) */
export async function getCatalog({ ordering = 'last_chapter_at', page = 1 } = {}) {
    const d = await mlFetch(`/manga?site_id[]=1&sort_by=${encodeURIComponent(ordering)}&fields[]=rate_avg&page=${page}`);
    return (d.data || []).map(normalizeManga);
}

/** Search by query. */
export async function searchManga(query, limit = 30) {
    if (!query?.trim()) return [];
    const d = await mlFetch(`/manga?q=${encodeURIComponent(query.trim())}&site_id[]=1&fields[]=rate_avg`);
    return (d.data || []).slice(0, limit).map(normalizeManga);
}

/** Full title details by slug (slug_url, e.g. "706--onepunchman"). */
export async function getTitle(slug) {
    const d = await mlFetch(`/manga/${encodeURIComponent(slug)}?fields[]=summary&fields[]=genres&fields[]=rate_avg`);
    const c = d.data;
    if (!c) return null;
    return {
        ...normalizeManga(c),
        description: String(c.summary || '').replace(/<[^>]+>/g, '').trim(),
        status: c.status?.label || '',
        isLicensed: !!c.is_licensed,
    };
}

/** Chapter list, newest-first (MangaLib returns oldest-first, so we reverse). */
export async function getChapters(slug) {
    const d = await mlFetch(`/manga/${encodeURIComponent(slug)}/chapters`);
    const arr = Array.isArray(d.data) ? d.data : [];
    return arr.map((c) => ({
        id: `${c.volume}_${c.number}`,
        volume: c.volume,
        number: c.number,
        tome: c.volume,
        chapter: c.number,
        name: c.name || '',
        isPaid: false,
        label: `Том ${c.volume} Глава ${c.number}${c.name ? ` — ${c.name}` : ''}`,
    })).reverse();
}

/** Page image URLs for a chapter (already wrapped in the referer image proxy). */
export async function getChapterPages(slug, volume, number) {
    const d = await mlFetch(`/manga/${encodeURIComponent(slug)}/chapter?number=${encodeURIComponent(number)}&volume=${encodeURIComponent(volume)}`);
    const pages = d?.data?.pages || [];
    const list = pages
        .map((p) => ({ link: IMG_BASE + p.url, width: p.width, height: p.height }))
        .filter((p) => p.link);
    return { pages: list, paid: false };
}
