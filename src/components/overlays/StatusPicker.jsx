import { useApp } from '../../context/AppContext.jsx';
import { I } from '../../lib/icons.jsx';
import { LIBRARY_STATUSES } from '../../lib/libraryStatuses.js';

export default function StatusPicker() {
    const { statusPickerItem, setStatusPickerItem, getItemStatus, setItemStatus } = useApp();

    if (!statusPickerItem) return null;

    const currentStatus = getItemStatus(statusPickerItem.id);
    const type = statusPickerItem.media_type || 'movie';

    return (
        <div className="collection-add-menu" onClick={() => setStatusPickerItem(null)}>
            <div onClick={e => e.stopPropagation()}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>
                    {statusPickerItem.title || statusPickerItem.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                    Выберите статус
                </div>
                {LIBRARY_STATUSES.map(s => {
                    const isActive = currentStatus === s.id;
                    return (
                        <button
                            key={s.id}
                            className="status-picker-item"
                            style={{
                                background: isActive ? `color-mix(in srgb, ${s.color} 12%, transparent)` : undefined,
                                borderColor: isActive ? s.color : 'var(--border)',
                            }}
                            onClick={() => {
                                setItemStatus(statusPickerItem, type, s.id);
                                setStatusPickerItem(null);
                            }}
                        >
                            <div className="status-picker-flag" style={{ background: s.color }}>
                                <span className="tab-icon" style={{ color: 'white' }}>{I[s.icon]}</span>
                            </div>
                            <div style={{ flex: 1 }}>
                                <div className="status-picker-label" style={{ color: isActive ? s.color : 'var(--text)' }}>{s.label}</div>
                                <div className="status-picker-short">{s.shortLabel}</div>
                            </div>
                            {isActive && <div className="collection-add-item-check" style={{ color: s.color }}>{I.check}</div>}
                        </button>
                    );
                })}
                <button
                    style={{
                        width: '100%', padding: 14, marginTop: 8, borderRadius: 12,
                        background: 'var(--surface-2)', border: '1px solid var(--border)',
                        color: 'var(--text-muted)', fontSize: 13, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                    }}
                    onClick={() => setStatusPickerItem(null)}
                >
                    Отмена
                </button>
            </div>
        </div>
    );
}
