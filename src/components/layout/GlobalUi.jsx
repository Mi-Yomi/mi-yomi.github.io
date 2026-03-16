import { memo } from 'react';
import { useUIContext } from '../../context/UIContext.jsx';

const GlobalUi = memo(function GlobalUi() {
    const { showScrollTop, scrollToTop, toasts } = useUIContext();

    return (
        <>
            <button className={`scroll-top-btn ${showScrollTop ? 'visible' : ''}`} onClick={scrollToTop} aria-label="Наверх">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6"/></svg>
            </button>
            {toasts.length > 0 && (
                <div className="toast-stack" role="status" aria-live="polite">
                    {toasts.map(t => <div key={t.id} className="toast-item">{t.msg}</div>)}
                </div>
            )}
        </>
    );
});

export default GlobalUi;
