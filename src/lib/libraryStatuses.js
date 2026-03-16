export const LIBRARY_STATUSES = [
    { id: 'watching', label: 'Смотрю', icon: '▶️', color: 'var(--green)' },
    { id: 'planned', label: 'Буду смотреть', icon: '🔖', color: 'var(--gold)' },
    { id: 'completed', label: 'Просмотрено', icon: '✅', color: 'var(--blue)' },
    { id: 'on_hold', label: 'Отложено', icon: '⏸️', color: 'var(--orange)' },
    { id: 'dropped', label: 'Брошено', icon: '🚫', color: 'var(--accent)' },
];

export const STATUS_MAP = Object.fromEntries(LIBRARY_STATUSES.map(s => [s.id, s]));

export function getStatusInfo(status) {
    return STATUS_MAP[status] || STATUS_MAP.planned;
}
