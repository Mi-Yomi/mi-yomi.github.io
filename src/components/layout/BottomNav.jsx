import { memo } from 'react';
import { useUIContext } from '../../context/UIContext.jsx';
import { useContentContext } from '../../context/ContentContext.jsx';
import { I } from '../../lib/icons.jsx';

const BottomNav = memo(function BottomNav() {
    const { tab, setTab } = useUIContext();
    const { detailsOpen, playerOpen, viewingFriend, friendRequests, setViewingFriend } = useContentContext();
    const tg = window.Telegram?.WebApp;

    return (
        <nav className={`nav ${detailsOpen || playerOpen || viewingFriend ? 'hidden' : ''}`} role="navigation" aria-label="Основная навигация">
            <button className={`nav-item ${tab === 'home' ? 'active' : ''}`} onClick={() => { setTab('home'); tg?.HapticFeedback?.impactOccurred?.('light'); }} aria-label="Главная" aria-current={tab === 'home' ? 'page' : undefined}>
                {I.home}<span>Главная</span>
            </button>
            <button className={`nav-item ${tab === 'tv' ? 'active' : ''}`} onClick={() => { setTab('tv'); tg?.HapticFeedback?.impactOccurred?.('light'); }} aria-label="Сериалы" aria-current={tab === 'tv' ? 'page' : undefined}>
                {I.tv}<span>Сериалы</span>
            </button>
            <button className={`nav-item ${tab === 'anime' ? 'active' : ''}`} onClick={() => { setTab('anime'); tg?.HapticFeedback?.impactOccurred?.('light'); }} aria-label="Аниме" aria-current={tab === 'anime' ? 'page' : undefined}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                <span>Аниме</span>
            </button>
            <button className={`nav-item ${tab === 'profile' ? 'active' : ''}`} onClick={() => { setTab('profile'); setViewingFriend(null); tg?.HapticFeedback?.impactOccurred?.('light'); }} aria-label="Профиль" aria-current={tab === 'profile' ? 'page' : undefined}>
                {I.user}<span>Профиль</span>
                {friendRequests.length > 0 && <span className="nav-badge">{friendRequests.length}</span>}
            </button>
        </nav>
    );
});

export default BottomNav;
