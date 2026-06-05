// English / international iframe balancers (work by TMDB id, need a season/episode in the URL)
export const FALLBACK_SOURCES = [
    { id: 'vidlink', name: 'VidLink', icon: 'link', getUrl: (id, type, s, e) => type === 'tv' ? `https://vidlink.pro/tv/${id}/${s}/${e}` : `https://vidlink.pro/movie/${id}` },
    { id: 'smashy', name: 'Smashy', icon: 'zap', getUrl: (id, type, s, e) => type === 'tv' ? `https://player.smashy.stream/tv/${id}?s=${s}&e=${e}` : `https://player.smashy.stream/movie/${id}` },
    { id: 'vidsrc', name: 'VidSrc', icon: 'globe', getUrl: (id, type, s, e) => type === 'tv' ? `https://vidsrc.net/embed/tv/${id}/${s}/${e}` : `https://vidsrc.net/embed/movie/${id}` },
    { id: 'autoembed', name: 'Auto', icon: 'bot', getUrl: (id, type, s, e) => type === 'tv' ? `https://autoembed.co/tv/tmdb/${id}-${s}-${e}` : `https://autoembed.co/movie/tmdb/${id}` },
    { id: 'multi', name: 'Multi', icon: 'globe', getUrl: (id, type, s, e) => { let u = `https://multiembed.mov/?video_id=${id}&tmdb=1`; if (type === 'tv') u += `&s=${s}&e=${e}`; return u; } },
    { id: 'nontongo', name: 'Nonto', icon: 'mask', getUrl: (id, type, s, e) => type === 'tv' ? `https://www.nontongo.win/embed/tv/${id}/${s}/${e}` : `https://www.nontongo.win/embed/movie/${id}` },
];

/** Russian balancers that handle their own season/episode navigation inside the iframe. */
export const isRuSource = (name) => ['Collaps', 'Alloha', 'Kodik', 'Anixart'].includes(name);

/**
 * Kodik iframe by Kinopoisk id (works for films, series and anime). Kodik runs its
 * own episode/voiceover selector inside the player, so no external picker is needed.
 * NOTE: yohoho.cc was intentionally NOT embedded — it injects ad-redirects that hang
 * the page. Collaps / Alloha / Kodik are the balancers yohoho aggregates anyway.
 */
export const kodikByKpUrl = (kpId) => `https://kodik.info/find-player?kinopoiskID=${kpId}`;
export const kodikByImdbUrl = (imdbId) => `https://kodik.info/find-player?imdbID=tt${imdbId}`;
export const kodikByMalUrl = (malId) => `https://kodik.info/find-player?mal_id=${malId}`;

/**
 * Build the ordered list of available players for the current title.
 * RU balancers first (most reliable for Russian dub), then the international ones.
 * Each entry: { id, name, lang, url, builtinEpisodes }
 *   builtinEpisodes = the balancer has its own episode/season switcher inside the iframe,
 *   so we should NOT show our external episode picker for it.
 */
export function buildPlayerSources({ media, collapsData, allohaData, isAnimeContent, animeData }) {
    if (!media) return [];
    const id = media.id;
    const type = media.media_type || (media.first_air_date ? 'tv' : 'movie');
    const kpId = collapsData?.kinopoisk_id || allohaData?.kinopoisk || null;
    const sources = [];

    if (collapsData?.iframe_url) {
        sources.push({ id: 'collaps', name: 'Collaps', lang: 'ru', url: collapsData.iframe_url, builtinEpisodes: true });
    }
    if (allohaData?.iframe) {
        sources.push({ id: 'alloha', name: 'Alloha', lang: 'ru', url: allohaData.iframe, builtinEpisodes: true });
    }
    // Anixart — proper anime experience (voiceover + episode picker), anime only
    if (isAnimeContent) {
        sources.push({ id: 'anixart', name: 'Anixart', lang: 'ru', special: 'anixart', builtinEpisodes: true });
    }
    // Kodik — by MAL for anime, by Kinopoisk for everything else
    if (isAnimeContent && animeData?.myAnimeListId) {
        sources.push({ id: 'kodik', name: 'Kodik', lang: 'ru', url: kodikByMalUrl(animeData.myAnimeListId), builtinEpisodes: true });
    } else if (kpId) {
        sources.push({ id: 'kodik', name: 'Kodik', lang: 'ru', url: kodikByKpUrl(kpId), builtinEpisodes: true });
    }

    // International balancers (need explicit season/episode)
    for (const fb of FALLBACK_SOURCES) {
        sources.push({ id: fb.id, name: fb.name, lang: 'en', getUrl: fb.getUrl, builtinEpisodes: false, icon: fb.icon, _fb: fb });
    }

    return sources.map(s => ({ ...s, url: s.url || (s.getUrl ? s.getUrl(id, type, 1, 1) : null) }));
}
