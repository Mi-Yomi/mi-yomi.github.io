export const LIBRARY_STATUSES = [
    { id: 'watching', label: 'Смотрю', shortLabel: 'LIVE', icon: 'play', color: 'var(--green)' },
    { id: 'planned', label: 'Буду смотреть', shortLabel: 'ПЛАН', icon: 'bookmark', color: 'var(--gold)' },
    { id: 'completed', label: 'Просмотрено', shortLabel: 'ГОТОВ', icon: 'checkCircle', color: 'var(--blue)' },
    { id: 'on_hold', label: 'Отложено', shortLabel: 'ПАУЗА', icon: 'pause', color: 'var(--orange)' },
    { id: 'dropped', label: 'Брошено', shortLabel: 'ДРОП', icon: 'ban', color: 'var(--accent)' },
];

export const STATUS_MAP = Object.fromEntries(LIBRARY_STATUSES.map(s => [s.id, s]));

export function getStatusInfo(status) {
    return STATUS_MAP[status] || STATUS_MAP.planned;
}
