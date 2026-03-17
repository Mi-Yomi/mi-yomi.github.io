import { lazy, Suspense } from 'react';
import { useApp } from './context/AppContext.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import Auth from './components/common/Auth.jsx';
import AppHeader from './components/layout/AppHeader.jsx';
import BottomNav from './components/layout/BottomNav.jsx';
import GlobalUi from './components/layout/GlobalUi.jsx';
import PendingScreen from './components/screens/PendingScreen.jsx';
import HomeTab from './components/views/HomeTab.jsx';
import TvTab from './components/views/TvTab.jsx';
import AnimeTab from './components/views/AnimeTab.jsx';
import ProfileTab from './components/views/ProfileTab.jsx';
import FriendProfileView from './components/views/FriendProfileView.jsx';

const SearchOverlay = lazy(() => import('./components/overlays/SearchOverlay.jsx'));
const DetailsOverlay = lazy(() => import('./components/overlays/DetailsOverlay.jsx'));
const PlayerOverlay = lazy(() => import('./components/overlays/PlayerOverlay.jsx'));
const ReviewModal = lazy(() => import('./components/overlays/ReviewModal.jsx'));
const NameEditModal = lazy(() => import('./components/overlays/NameEditModal.jsx'));
const MoodOverlay = lazy(() => import('./components/overlays/MoodOverlay.jsx'));
const NotificationsPanel = lazy(() => import('./components/overlays/NotificationsPanel.jsx'));
const CollectionAddMenu = lazy(() => import('./components/overlays/CollectionAddMenu.jsx'));
const AdminPanel = lazy(() => import('./components/overlays/AdminPanel.jsx'));
const StatusPicker = lazy(() => import('./components/overlays/StatusPicker.jsx'));

function OverlayFallback() {
    return null;
}

export default function App() {
    const { loading, user, userProfile, isAdmin, userApproved, tab, viewingFriend, contentRef, handleContentScroll } = useApp();

    if (loading && !user) {
        return <div className="loader"><div className="loader-spin"></div><div className="loader-brand">HADES</div></div>;
    }

    if (!user) {
        return <Auth />;
    }

    if (user && !userProfile) {
        return <div className="loader"><div className="loader-spin"></div><div className="loader-brand">HADES</div></div>;
    }

    if (userProfile && !isAdmin && !userApproved) {
        return <PendingScreen />;
    }

    return (
        <ErrorBoundary>
            <AppHeader />
            <main className="content" ref={contentRef} onScroll={handleContentScroll}>
                {tab === 'home' && <HomeTab />}
                {tab === 'tv' && <TvTab />}
                {tab === 'anime' && <AnimeTab />}
                {tab === 'profile' && !viewingFriend && <ProfileTab />}
                {viewingFriend && <FriendProfileView />}
            </main>
            <BottomNav />
            <GlobalUi />
            <Suspense fallback={<OverlayFallback />}>
                <SearchOverlay />
                <DetailsOverlay />
                <PlayerOverlay />
                <ReviewModal />
                <NameEditModal />
                <MoodOverlay />
                <NotificationsPanel />
                <CollectionAddMenu />
                <AdminPanel />
                <StatusPicker />
            </Suspense>
        </ErrorBoundary>
    );
}
