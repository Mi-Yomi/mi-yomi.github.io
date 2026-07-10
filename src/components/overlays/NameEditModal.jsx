import { useRef } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import useDialogFocus from '../../hooks/useDialogFocus.js';

export default function NameEditModal() {
  const {
    nameEditOpen,
    setNameEditOpen,
    newUsername,
    setNewUsername,
    updateUsername,
  } = useApp();
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  useDialogFocus(nameEditOpen, dialogRef, inputRef);

  return (
    <>
      {nameEditOpen && (
          <div className="modal-overlay" onClick={() => setNameEditOpen(false)}>
              <div ref={dialogRef} className="modal-box" role="dialog" aria-modal="true" aria-labelledby="name-edit-title" tabIndex={-1} onClick={e => e.stopPropagation()}>
                  <div className="modal-title" id="name-edit-title">Сменить имя</div>
                  <input ref={inputRef} className="auth-input" aria-label="Новое имя" value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="Новое имя" style={{ marginBottom: 20 }} />
                  <div className="modal-actions"><button className="modal-btn secondary" onClick={() => setNameEditOpen(false)}>Отмена</button><button className="modal-btn primary" onClick={updateUsername}>Сохранить</button></div>
              </div>
          </div>
      )}
    </>
  );
}
