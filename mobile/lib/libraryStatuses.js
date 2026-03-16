export const LIBRARY_STATUSES = [
    { id: 'watching', label: 'Смотрю', icon: '▶️', color: '#00c853' },
    { id: 'planned', label: 'Буду смотреть', icon: '🔖', color: '#ffd700' },
    { id: 'completed', label: 'Просмотрено', icon: '✅', color: '#2196f3' },
    { id: 'on_hold', label: 'Отложено', icon: '⏸️', color: '#ff9800' },
    { id: 'dropped', label: 'Брошено', icon: '🚫', color: '#e50914' },
];

export const getStatusInfo = (statusId) => LIBRARY_STATUSES.find(s => s.id === statusId);
