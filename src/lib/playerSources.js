export const FALLBACK_SOURCES = [
    { id: 'vidlink', name: 'VidLink', icon: '🔗', getUrl: (id, type, s, e) => type === 'tv' ? `https://vidlink.pro/tv/${id}/${s}/${e}` : `https://vidlink.pro/movie/${id}` },
    { id: 'smashy', name: 'Smashy', icon: '💥', getUrl: (id, type, s, e) => type === 'tv' ? `https://player.smashy.stream/tv/${id}?s=${s}&e=${e}` : `https://player.smashy.stream/movie/${id}` },
    { id: 'vidsrc', name: 'VidSrc', icon: '🇷🇺', getUrl: (id, type, s, e) => type === 'tv' ? `https://vidsrc.net/embed/tv/${id}/${s}/${e}` : `https://vidsrc.net/embed/movie/${id}` },
    { id: 'autoembed', name: 'Auto', icon: '🤖', getUrl: (id, type, s, e) => type === 'tv' ? `https://autoembed.co/tv/tmdb/${id}-${s}-${e}` : `https://autoembed.co/movie/tmdb/${id}` },
    { id: 'multi', name: 'Multi', icon: '🌍', getUrl: (id, type, s, e) => { let u = `https://multiembed.mov/?video_id=${id}&tmdb=1`; if (type === 'tv') u += `&s=${s}&e=${e}`; return u; } },
    { id: 'nontongo', name: 'Nonto', icon: '🎭', getUrl: (id, type, s, e) => type === 'tv' ? `https://www.nontongo.win/embed/tv/${id}/${s}/${e}` : `https://www.nontongo.win/embed/movie/${id}` },
];

export const isRuSource = (name) => ['Collaps', 'Alloha', 'Kodik'].includes(name);
