import { memo, useEffect, useRef } from 'react';
import { useUIContext } from '../../context/UIContext.jsx';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useContentContext } from '../../context/ContentContext.jsx';
import { usePlayerContext } from '../../context/PlayerContext.jsx';
import { I } from '../../lib/icons.jsx';

const NAV_LINKS = [
    { id: 'home', label: 'Главная' },
    { id: 'tv', label: 'Сериалы' },
    { id: 'anime', label: 'Аниме' },
    { id: 'profile', label: 'Профиль' },
];

const AppHeader = memo(function AppHeader() {
    const { tab, setTab } = useUIContext();
    const { userProfile } = useAuthContext();
    const { setSearchOpen, detailsOpen, viewingFriend, setViewingFriend, setNotifOpen, unreadNotifCount, friendRequests } = useContentContext();
    const { playerOpen } = usePlayerContext();
    const headerRef = useRef(null);
    const tg = window.Telegram?.WebApp;

    useEffect(() => {
        const content = document.querySelector('.content');
        if (!headerRef.current) return;
        // The scroll container is .content on mobile but the window on desktop,
        // so listen to both and react to whichever is actually scrolling.
        const handler = () => {
            const y = Math.max(content?.scrollTop || 0, window.scrollY || 0);
            headerRef.current?.classList.toggle('scrolled', y > 20);
        };
        content?.addEventListener('scroll', handler, { passive: true });
        window.addEventListener('scroll', handler, { passive: true });
        handler();
        return () => {
            content?.removeEventListener('scroll', handler);
            window.removeEventListener('scroll', handler);
        };
    }, []);

    const goTab = (id) => {
        setTab(id);
        if (id === 'profile') setViewingFriend(null);
        tg?.HapticFeedback?.impactOccurred?.('light');
    };

    return (
        <header ref={headerRef} className={`header ${detailsOpen || playerOpen || viewingFriend ? 'hidden' : ''}`}>
            <div className="logo-wrap"><span className="logo-sub">Cinema</span><span className="logo-main">HADES</span></div>

            <nav className="header-nav" aria-label="Разделы">
                {NAV_LINKS.map(link => (
                    <button
                        key={link.id}
                        className={`header-nav-item ${tab === link.id && !viewingFriend ? 'active' : ''}`}
                        onClick={() => goTab(link.id)}
                        aria-current={tab === link.id ? 'page' : undefined}
                    >
                        {link.label}
                        {link.id === 'profile' && friendRequests?.length > 0 && (
                            <span className="header-nav-badge">{friendRequests.length}</span>
                        )}
                    </button>
                ))}
            </nav>

            <div className="header-actions">
                <button className="icon-btn notif-bell" onClick={() => { setNotifOpen(true); tg?.HapticFeedback?.impactOccurred?.('light'); }} aria-label="Уведомления">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    {unreadNotifCount > 0 && <span className="notif-dot" aria-label={`${unreadNotifCount} непрочитанных`}></span>}
                </button>
                <button className="icon-btn" onClick={() => setSearchOpen(true)} aria-label="Поиск">{I.search}</button>
                <button className="header-avatar" onClick={() => goTab('profile')} aria-label="Профиль">
                    {userProfile?.avatar_url
                        ? <img src={userProfile.avatar_url} alt="" />
                        : (userProfile?.username?.[0]?.toUpperCase() || 'U')}
                </button>
            </div>
        </header>
    );
});

export default AppHeader;
