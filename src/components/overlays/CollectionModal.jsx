import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useDialogFocus from '../../hooks/useDialogFocus.js';

export default function CollectionModal({ isOpen, onClose, onSave, initialTitle = '', title: heading }) {
    const [value, setValue] = useState(initialTitle);
    const dialogRef = useRef(null);
    const inputRef = useRef(null);
    useDialogFocus(isOpen, dialogRef, inputRef);

    useEffect(() => {
        if (!isOpen) return undefined;
        const shell = document.querySelector('.app-shell');
        const hadInert = shell?.hasAttribute('inert');
        shell?.setAttribute('inert', '');
        return () => { if (!hadInert) shell?.removeAttribute('inert'); };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!value.trim()) return;
        onSave(value.trim());
        setValue('');
        onClose();
    };

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div ref={dialogRef} className="modal-box" role="dialog" aria-modal="true" aria-labelledby="collection-modal-title" tabIndex={-1} onClick={e => e.stopPropagation()}>
                <div className="modal-title" id="collection-modal-title">{heading || 'Новая коллекция'}</div>
                <input
                    ref={inputRef}
                    className="auth-input"
                    aria-label="Название коллекции"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    placeholder="Название коллекции"
                    style={{ marginBottom: 20 }}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                />
                <div className="modal-actions">
                    <button className="modal-btn secondary" onClick={onClose}>Отмена</button>
                    <button className="modal-btn primary" onClick={handleSave} disabled={!value.trim()}>Сохранить</button>
                </div>
            </div>
        </div>,
        document.body
    );
}
