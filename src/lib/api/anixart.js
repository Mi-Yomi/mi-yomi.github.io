/**
 * Anixart API — Russian anime catalogue with multiple voiceovers (озвучки).
 * Reverse-engineered, unofficial; the API is CORS-friendly so it works directly
 * from the browser (no proxy needed). Flow:
 *   search(query)                       -> releases [{ id, title_ru, year }]
 *   getTypes(releaseId)                 -> voiceovers [{ id, name }]
 *   getSources(releaseId, typeId)       -> balancers  [{ id, name }]
 *   getEpisodes(releaseId, typeId, src) -> episodes   [{ position, name, url }]
 * Episode `url` is a ready kodikplayer.com / sibnet embed link.
 */
const ANIXART = 'https://api.anixart.tv';

async function aniFetch(path, options) {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 8000);
    try {
        const res = await fetch(`${ANIXART}${path}`, { signal: ctrl.signal, ...options });
        clearTimeout(timeout);
        if (!res.ok) return null;
        return await res.json();
    } catch {
        clearTimeout(timeout);
        return null;
    }
}

/** Search releases by title. searchBy: 0 = all, 1 = name, 2 = original. */
export async function anixartSearch(query) {
    if (!query) return [];
    const data = await aniFetch('/search/releases/0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, searchBy: 0 }),
    });
    return data?.content || [];
}

/** Try the Russian title first, then the original title, return the best release match. */
export async function anixartFindRelease(media) {
    const queries = [
        media.name || media.title,
        media.original_name || media.original_title,
    ].filter(Boolean);
    const year = (media.first_air_date || media.release_date || '').slice(0, 4);
    for (const q of queries) {
        const results = await anixartSearch(q);
        if (results.length) {
            // Prefer an exact-ish title and matching year when we can
            const byYear = year && results.find(r => String(r.year) === year);
            return byYear || results[0];
        }
    }
    return null;
}

export async function anixartTypes(releaseId) {
    const data = await aniFetch(`/episode/${releaseId}`);
    return data?.types || [];
}

export async function anixartSources(releaseId, typeId) {
    const data = await aniFetch(`/episode/${releaseId}/${typeId}`);
    return data?.sources || [];
}

export async function anixartEpisodes(releaseId, typeId, sourceId) {
    const data = await aniFetch(`/episode/${releaseId}/${typeId}/${sourceId}`);
    return data?.episodes || [];
}
