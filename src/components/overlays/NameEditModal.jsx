import { useApp } from '../../context/AppContext.jsx';

export default function NameEditModal() {
  const {
    nameEditOpen,
    setNameEditOpen,
    newUsername,
    setNewUsername,
    updateUsername,
  } = useApp();

  return (
    <>
      {nameEditOpen && (
          <div className="modal-overlay" onClick={() => setNameEditOpen(false)}>
              <div className="modal-box" onClick={e => e.stopPropagation()}>
                  <div className="modal-title">Сменить имя</div>
                  <input className="auth-input" value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="Новое имя" style={{ marginBottom: 20 }} />
                  <div className="modal-actions"><button className="modal-btn secondary" onClick={() => setNameEditOpen(false)}>Отмена</button><button className="modal-btn primary" onClick={updateUsername}>Сохранить</button></div>
              </div>
          </div>
      )}
    </>
  );
}
