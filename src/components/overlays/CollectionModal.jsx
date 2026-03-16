import { useState } from 'react';

export default function CollectionModal({ isOpen, onClose, onSave, initialTitle = '', title: heading }) {
    const [value, setValue] = useState(initialTitle);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!value.trim()) return;
        onSave(value.trim());
        setValue('');
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                <div className="modal-title">{heading || 'Новая коллекция'}</div>
                <input
                    className="auth-input"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    placeholder="Название коллекции"
                    style={{ marginBottom: 20 }}
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                />
                <div className="modal-actions">
                    <button className="modal-btn secondary" onClick={onClose}>Отмена</button>
                    <button className="modal-btn primary" onClick={handleSave} disabled={!value.trim()}>Сохранить</button>
                </div>
            </div>
        </div>
    );
}
