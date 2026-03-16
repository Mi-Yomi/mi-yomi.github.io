import AsyncStorage from '@react-native-async-storage/async-storage';

export const pluralize = (n, one, few, many) => {
    const abs = Math.abs(n) % 100;
    const lastDigit = abs % 10;
    if (abs > 10 && abs < 20) return many;
    if (lastDigit > 1 && lastDigit < 5) return few;
    if (lastDigit === 1) return one;
    return many;
};

export const ratingColor = (rating) => {
    if (!rating) return '#666';
    if (rating >= 7) return '#00c853';
    if (rating >= 5) return '#ffd700';
    return '#e50914';
};

export const formatWatchTime = (seconds) => {
    if (!seconds || seconds < 0) return null;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
};

export const getStoredProgress = async (itemId) => {
    try {
        const raw = await AsyncStorage.getItem(`hades_progress_${itemId}`);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
};

export const saveStoredProgress = async (itemId, time, duration) => {
    try {
        await AsyncStorage.setItem(`hades_progress_${itemId}`, JSON.stringify({ time: Math.floor(time), duration: Math.floor(duration || 0), ts: Date.now() }));
    } catch {}
};

export const HOME_GENRES = [
    { id: 'all', label: 'Все' }, { id: '28', label: 'Экшн' }, { id: '35', label: 'Комедия' },
    { id: '18', label: 'Драма' }, { id: '27', label: 'Хоррор' }, { id: '878', label: 'Фантастика' },
    { id: '53', label: 'Триллер' }, { id: '10749', label: 'Романтика' }, { id: '80', label: 'Криминал' },
    { id: '16', label: 'Анимация' },
];

export const TV_GENRES = [
    { id: 'all', label: 'Все' }, { id: '18', label: 'Драма' }, { id: '35', label: 'Комедия' },
    { id: '80', label: 'Криминал' }, { id: '10765', label: 'Фэнтези' }, { id: '9648', label: 'Детектив' },
    { id: '10759', label: 'Экшн' },
];

export const ANIME_GENRES = [
    { id: 'all', label: 'Все' }, { id: 'action', label: 'Экшн' }, { id: 'romance', label: 'Романтика' },
    { id: 'fantasy', label: 'Фэнтези' }, { id: 'comedy', label: 'Комедия' }, { id: 'drama', label: 'Драма' },
];

export const MOOD_MAP = {
    fun: { genres: '35,10751', label: 'Весёлое' }, scary: { genres: '27,53', label: 'Страшное' },
    sad: { genres: '18,10749', label: 'Грустное' }, tense: { genres: '28,53,80', label: 'Напряжённое' },
    romantic: { genres: '10749,35', label: 'Романтика' }, epic: { genres: '12,14,878', label: 'Эпик' },
};

export const GENRE_NAMES = {
    28: 'Экшн', 35: 'Комедия', 18: 'Драма', 27: 'Хоррор', 878: 'Фантастика',
    53: 'Триллер', 10749: 'Романтика', 80: 'Криминал', 16: 'Анимация',
    12: 'Приключения', 14: 'Фэнтези', 9648: 'Детектив', 36: 'История',
    10752: 'Военный', 10402: 'Музыка',
};

export const ANIME_GENRE_MAP = { action: 28, romance: 10749, fantasy: 14, comedy: 35, drama: 18 };

export const LIBRARY_STATUSES = [
    { id: 'watching', label: 'Смотрю', icon: '▶️', color: '#00c853' },
    { id: 'planned', label: 'Буду смотреть', icon: '🔖', color: '#ffd700' },
    { id: 'completed', label: 'Просмотрено', icon: '✅', color: '#2196f3' },
    { id: 'on_hold', label: 'Отложено', icon: '⏸️', color: '#ff9800' },
    { id: 'dropped', label: 'Брошено', icon: '🚫', color: '#e50914' },
];

export const FALLBACK_SOURCES = [
    { id: 'vidlink', name: 'VidLink', icon: '🔗', getUrl: (id, type, s, e) => type === 'tv' ? `https://vidlink.pro/tv/${id}/${s}/${e}` : `https://vidlink.pro/movie/${id}` },
    { id: 'smashy', name: 'Smashy', icon: '💥', getUrl: (id, type, s, e) => type === 'tv' ? `https://player.smashy.stream/tv/${id}?s=${s}&e=${e}` : `https://player.smashy.stream/movie/${id}` },
    { id: 'vidsrc', name: 'VidSrc', icon: '🇷🇺', getUrl: (id, type, s, e) => type === 'tv' ? `https://vidsrc.net/embed/tv/${id}/${s}/${e}` : `https://vidsrc.net/embed/movie/${id}` },
    { id: 'autoembed', name: 'Auto', icon: '🤖', getUrl: (id, type, s, e) => type === 'tv' ? `https://autoembed.co/tv/tmdb/${id}-${s}-${e}` : `https://autoembed.co/movie/tmdb/${id}` },
    { id: 'multi', name: 'Multi', icon: '🌍', getUrl: (id, type, s, e) => { let u = `https://multiembed.mov/?video_id=${id}&tmdb=1`; if (type === 'tv') u += `&s=${s}&e=${e}`; return u; } },
    { id: 'nontongo', name: 'Nonto', icon: '🎭', getUrl: (id, type, s, e) => type === 'tv' ? `https://www.nontongo.win/embed/tv/${id}/${s}/${e}` : `https://www.nontongo.win/embed/movie/${id}` },
];

export const isRuSource = (name) => ['Collaps', 'Alloha', 'Kodik'].includes(name);
