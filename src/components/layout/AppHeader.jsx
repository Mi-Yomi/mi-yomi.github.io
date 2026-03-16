import { memo, useEffect, useRef } from 'react';
import { useUIContext } from '../../context/UIContext.jsx';
import { useContentContext } from '../../context/ContentContext.jsx';
import { usePlayerContext } from '../../context/PlayerContext.jsx';
import { I } from '../../lib/icons.jsx';

const AppHeader = memo(function AppHeader() {
    const { setSearchOpen } = useContentContext();
    const { detailsOpen } = useContentContext();
    const { playerOpen } = usePlayerContext();
    const { viewingFriend, setNotifOpen, unreadNotifCount } = useContentContext();
    const headerRef = useRef(null);
    const tg = window.Telegram?.WebApp;

    useEffect(() => {
        const content = document.querySelector('.content');
        if (!content || !headerRef.current) return;
        const handler = (e) => {
            if (e.target.scrollTop > 20) headerRef.current?.classList.add('scrolled');
            else headerRef.current?.classList.remove('scrolled');
        };
        content.addEventListener('scroll', handler, { passive: true });
        return () => content.removeEventListener('scroll', handler);
    }, []);

    return (
        <header ref={headerRef} className={`header ${detailsOpen || playerOpen || viewingFriend ? 'hidden' : ''}`}>
            <div className="logo-wrap"><span className="logo-sub">Cinema</span><span className="logo-main">HADES</span></div>
            <div className="header-actions">
                <button className="icon-btn notif-bell" onClick={() => { setNotifOpen(true); tg?.HapticFeedback?.impactOccurred?.('light'); }} aria-label="Уведомления">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    {unreadNotifCount > 0 && <span className="notif-dot" aria-label={`${unreadNotifCount} непрочитанных`}></span>}
                </button>
                <button className="icon-btn" onClick={() => setSearchOpen(true)} aria-label="Поиск">{I.search}</button>
            </div>
        </header>
    );
});

export default AppHeader;
