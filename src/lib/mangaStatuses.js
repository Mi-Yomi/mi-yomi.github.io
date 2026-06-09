import { I } from './icons.jsx';

/** Reading-list statuses for manga (mirrors LIBRARY_STATUSES for movies/series). */
export const MANGA_STATUSES = [
    { id: 'reading', label: 'Читаю', icon: I.bookOpen },
    { id: 'planned', label: 'Хочу прочитать', icon: I.bookmark },
    { id: 'completed', label: 'Прочитано', icon: I.checkCircle },
    { id: 'favorite', label: 'Любимое', icon: I.heartFilled },
    { id: 'dropped', label: 'Брошено', icon: I.ban },
];

export const MANGA_STATUS_MAP = Object.fromEntries(MANGA_STATUSES.map((s) => [s.id, s]));
