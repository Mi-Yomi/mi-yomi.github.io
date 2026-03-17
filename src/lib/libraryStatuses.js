export const LIBRARY_STATUSES = [
    { id: 'watching', label: 'Смотрю', icon: 'play', color: 'var(--green)' },
    { id: 'planned', label: 'Буду смотреть', icon: 'bookmark', color: 'var(--gold)' },
    { id: 'completed', label: 'Просмотрено', icon: 'checkCircle', color: 'var(--blue)' },
    { id: 'on_hold', label: 'Отложено', icon: 'pause', color: 'var(--orange)' },
    { id: 'dropped', label: 'Брошено', icon: 'ban', color: 'var(--accent)' },
];

export const STATUS_MAP = Object.fromEntries(LIBRARY_STATUSES.map(s => [s.id, s]));

export function getStatusInfo(status) {
    return STATUS_MAP[status] || STATUS_MAP.planned;
}
