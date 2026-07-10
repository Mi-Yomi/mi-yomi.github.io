/** Reading-list statuses for manga (mirrors LIBRARY_STATUSES for movies/series). */
export const MANGA_STATUSES = [
    { id: 'reading', label: 'Читаю', icon: 'book', color: '#00c853' },
    { id: 'planned', label: 'Хочу прочитать', icon: 'bookmark', color: '#ffd700' },
    { id: 'completed', label: 'Прочитано', icon: 'checkmark-circle', color: '#2196f3' },
    { id: 'favorite', label: 'Любимое', icon: 'heart', color: '#ff4081' },
    { id: 'dropped', label: 'Брошено', icon: 'ban', color: '#e50914' },
];

export const MANGA_STATUS_MAP = Object.fromEntries(MANGA_STATUSES.map((s) => [s.id, s]));
