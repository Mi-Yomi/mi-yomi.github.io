import { HDREZKA_FN } from './config.js';

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
export const isRuSource = (name) => ['Collaps', 'Alloha', 'Anixart', 'HDRezka', 'Kodik'].includes(name);

/** HDRezka resolve endpoint of our Edge Function — returns { ok, embed } JSON.
 *  We resolve the balancer URL via fetch and point the iframe straight at it
 *  (a 302 from the function loses the Referer cinemar.cc requires). */
export const hdrezkaResolveUrl = (media) => {
    const title = media.title || media.name || '';
    const year = (media.release_date || media.first_air_date || '').slice(0, 4);
    const type = media.media_type || (media.first_air_date ? 'tv' : 'movie');
    return `${HDREZKA_FN}?action=resolve&title=${encodeURIComponent(title)}&year=${encodeURIComponent(year)}&type=${type}`;
};

/**
 * Build the ordered list of available players for the current title.
 * RU balancers first (most reliable for Russian dub), then the international ones.
 * Each entry: { id, name, lang, url, builtinEpisodes }
 *   builtinEpisodes = the balancer has its own episode/season switcher inside the iframe,
 *   so we should NOT show our external episode picker for it.
 */
export function buildPlayerSources({ media, collapsData, allohaData, isAnimeContent }) {
    if (!media) return [];
    const id = media.id;
    const type = media.media_type || (media.first_air_date ? 'tv' : 'movie');
    const sources = [];

    if (collapsData?.iframe_url) {
        // Collaps uses document.referrer to select its working embed host. Sending only
        // our origin is sufficient and avoids leaking a title-specific page URL.
        sources.push({ id: 'collaps', name: 'Collaps', lang: 'ru', url: collapsData.iframe_url, builtinEpisodes: true, needsReferrer: true });
    }
    if (allohaData?.iframe) {
        sources.push({ id: 'alloha', name: 'Alloha', lang: 'ru', url: allohaData.iframe, builtinEpisodes: true });
    }
    // HDRezka — only if its Edge Function is configured. Special: resolved via fetch
    // (the function returns the cinemar.cc embed URL), then the iframe points straight
    // at cinemar. Sandboxed + unsafe-url referrer (cinemar 404s without a Referer).
    if (HDREZKA_FN) {
        sources.push({ id: 'hdrezka', name: 'HDRezka', lang: 'ru', special: 'hdrezka', resolveUrl: hdrezkaResolveUrl(media), builtinEpisodes: true, ads: true });
    }
    // Anixart — proper anime experience (voiceover + episode picker), anime only.
    // Plays via kodikplayer, which is ad-prone -> mark `ads` so the iframe is sandboxed
    // (otherwise its ad scripts call top.history.back() and close the page).
    if (isAnimeContent) {
        sources.push({ id: 'anixart', name: 'Anixart', lang: 'ru', special: 'anixart', builtinEpisodes: true, ads: true });
    }
    // International balancers (need explicit season/episode) — also ad-prone, sandbox them
    for (const fb of FALLBACK_SOURCES) {
        sources.push({ id: fb.id, name: fb.name, lang: 'en', getUrl: fb.getUrl, builtinEpisodes: false, icon: fb.icon, _fb: fb, ads: true });
    }

    return sources.map(s => ({ ...s, url: s.url || (s.getUrl ? s.getUrl(id, type, 1, 1) : null) }));
}
