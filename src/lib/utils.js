/** Convert file to base64 data URL */
export const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
});

/** Russian pluralization: pluralize(5, 'фильм', 'фильма', 'фильмов') -> 'фильмов' */
export const pluralize = (n, one, few, many) => {
    const abs = Math.abs(n) % 100;
    const lastDigit = abs % 10;
    if (abs > 10 && abs < 20) return many;
    if (lastDigit > 1 && lastDigit < 5) return few;
    if (lastDigit === 1) return one;
    return many;
};

/** Rating CSS class based on number */
export const ratingColor = (rating) => {
    if (!rating) return '';
    if (rating >= 7) return 'rating-green';
    if (rating >= 5) return 'rating-yellow';
    return 'rating-red';
};

/** Format seconds into HH:MM:SS or MM:SS */
export const formatWatchTime = (seconds) => {
    if (!seconds || seconds < 0) return null;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
};

/** Read watch progress from localStorage */
export const getStoredProgress = (itemId) => {
    try {
        const raw = localStorage.getItem(`hades_progress_${itemId}`);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
};

/** Genre lists for filters */
export const HOME_GENRES = [
    { id: 'all', label: 'Все' },
    { id: '28', label: 'Экшн' },
    { id: '35', label: 'Комедия' },
    { id: '18', label: 'Драма' },
    { id: '27', label: 'Хоррор' },
    { id: '878', label: 'Фантастика' },
    { id: '53', label: 'Триллер' },
    { id: '10749', label: 'Романтика' },
    { id: '80', label: 'Криминал' },
    { id: '16', label: 'Анимация' },
];

export const TV_GENRES = [
    { id: 'all', label: 'Все' },
    { id: '18', label: 'Драма' },
    { id: '35', label: 'Комедия' },
    { id: '80', label: 'Криминал' },
    { id: '10765', label: 'Фэнтези' },
    { id: '9648', label: 'Детектив' },
    { id: '10759', label: 'Экшн' },
];

export const ANIME_GENRES = [
    { id: 'all', label: 'Все' },
    { id: 'action', label: 'Экшн' },
    { id: 'romance', label: 'Романтика' },
    { id: 'fantasy', label: 'Фэнтези' },
    { id: 'comedy', label: 'Комедия' },
    { id: 'drama', label: 'Драма' },
];

export const MOOD_MAP = {
    fun: { genres: '35,10751', label: 'Весёлое' },
    scary: { genres: '27,53', label: 'Страшное' },
    sad: { genres: '18,10749', label: 'Грустное' },
    tense: { genres: '28,53,80', label: 'Напряжённое' },
    romantic: { genres: '10749,35', label: 'Романтика' },
    epic: { genres: '12,14,878', label: 'Эпик' },
};

export const GENRE_NAMES = {
    28: 'Экшн', 35: 'Комедия', 18: 'Драма', 27: 'Хоррор', 878: 'Фантастика',
    53: 'Триллер', 10749: 'Романтика', 80: 'Криминал', 16: 'Анимация',
    12: 'Приключения', 14: 'Фэнтези', 9648: 'Детектив', 36: 'История',
    10752: 'Военный', 10402: 'Музыка',
};

export const ANIME_GENRE_MAP = { action: 28, romance: 10749, fantasy: 14, comedy: 35, drama: 18 };
