import { lazy, Suspense } from 'react';
import { useApp } from './context/AppContext.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import AppHeader from './components/layout/AppHeader.jsx';
import BottomNav from './components/layout/BottomNav.jsx';
import GlobalUi from './components/layout/GlobalUi.jsx';
import PendingScreen from './components/screens/PendingScreen.jsx';
import HomeTab from './components/views/HomeTab.jsx';

const Auth = lazy(() => import('./components/common/Auth.jsx'));
const TvTab = lazy(() => import('./components/views/TvTab.jsx'));
const AnimeTab = lazy(() => import('./components/views/AnimeTab.jsx'));
const MangaTab = lazy(() => import('./components/views/MangaTab.jsx'));
const ProfileTab = lazy(() => import('./components/views/ProfileTab.jsx'));
const FriendProfileView = lazy(() => import('./components/views/FriendProfileView.jsx'));
const SearchOverlay = lazy(() => import('./components/overlays/SearchOverlay.jsx'));
const DetailsOverlay = lazy(() => import('./components/overlays/DetailsOverlay.jsx'));
const ReviewModal = lazy(() => import('./components/overlays/ReviewModal.jsx'));
const NameEditModal = lazy(() => import('./components/overlays/NameEditModal.jsx'));
const MoodOverlay = lazy(() => import('./components/overlays/MoodOverlay.jsx'));
const NotificationsPanel = lazy(() => import('./components/overlays/NotificationsPanel.jsx'));
const CollectionAddMenu = lazy(() => import('./components/overlays/CollectionAddMenu.jsx'));
const AdminPanel = lazy(() => import('./components/overlays/AdminPanel.jsx'));
const StatusPicker = lazy(() => import('./components/overlays/StatusPicker.jsx'));
const MangaDetailsOverlay = lazy(() => import('./components/overlays/MangaDetailsOverlay.jsx'));
const MangaReader = lazy(() => import('./components/overlays/MangaReader.jsx'));

function OverlayFallback() {
    return null;
}

function FullScreenLoader() {
    return <div className="loader" role="status" aria-label="Загрузка"><div className="loader-spin"></div><div className="loader-brand">HADES</div></div>;
}

function TabFallback() {
    return <div className="tab-loading" role="status"><div className="loader-spin"></div><span>Загружаем раздел…</span></div>;
}

export default function App() {
    const {
        loading, user, userProfile, isAdmin, userApproved, tab, viewingFriend,
        contentRef, handleContentScroll, searchOpen, detailsOpen, reviewOpen,
        nameEditOpen, moodOpen, notifOpen, adminOpen, statusPickerItem,
        addToCollectionItem, collectionModalOpen, mangaTitle, mangaReaderOpen,
    } = useApp();

    if (loading && !user) {
        return <FullScreenLoader />;
    }

    if (!user) {
        return <Suspense fallback={<FullScreenLoader />}><Auth /></Suspense>;
    }

    if (user && !userProfile) {
        return <FullScreenLoader />;
    }

    if (userProfile && !isAdmin && !userApproved) {
        return <PendingScreen />;
    }

    const overlayOpen = Boolean(
        searchOpen || detailsOpen || reviewOpen || nameEditOpen || moodOpen || notifOpen ||
        adminOpen || statusPickerItem || addToCollectionItem || collectionModalOpen ||
        mangaTitle || mangaReaderOpen
    );

    return (
        <ErrorBoundary>
            <div className="app-shell" inert={overlayOpen ? '' : undefined}>
                <AppHeader />
                <main className="content" ref={contentRef} onScroll={handleContentScroll}>
                    <Suspense fallback={<TabFallback />}>
                        {tab === 'home' && <HomeTab />}
                        {tab === 'tv' && <TvTab />}
                        {tab === 'anime' && <AnimeTab />}
                        {tab === 'manga' && <MangaTab />}
                        {tab === 'profile' && !viewingFriend && <ProfileTab />}
                        {viewingFriend && <FriendProfileView />}
                    </Suspense>
                </main>
                <BottomNav />
            </div>
            <GlobalUi />
            <Suspense fallback={<OverlayFallback />}>
                <SearchOverlay />
                <DetailsOverlay />
                <ReviewModal />
                <NameEditModal />
                <MoodOverlay />
                <NotificationsPanel />
                <CollectionAddMenu />
                <AdminPanel />
                <StatusPicker />
                <MangaDetailsOverlay />
                <MangaReader />
            </Suspense>
        </ErrorBoundary>
    );
}
