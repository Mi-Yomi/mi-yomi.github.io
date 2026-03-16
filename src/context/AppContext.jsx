import { createContext, useContext, useMemo } from 'react';
import useAppController from '../hooks/useAppController.js';
import { AuthProvider, useAuthContext } from './AuthContext.jsx';
import { UIProvider, useUIContext } from './UIContext.jsx';
import { ContentProvider, useContentContext } from './ContentContext.jsx';
import { PlayerProvider, usePlayerContext } from './PlayerContext.jsx';

const AppContext = createContext(null);

export function AppProvider({ children }) {
    const app = useAppController();

    const authValue = useMemo(() => ({
        tg: app.tg, user: app.user, setUser: app.setUser,
        userProfile: app.userProfile, setUserProfile: app.setUserProfile,
        loading: app.loading, setLoading: app.setLoading,
        isAdmin: app.isAdmin, userApproved: app.userApproved,
        nameEditOpen: app.nameEditOpen, setNameEditOpen: app.setNameEditOpen,
        newUsername: app.newUsername, setNewUsername: app.setNewUsername,
        refreshingStatus: app.refreshingStatus,
        loadUserProfile: app.loadUserProfile, updateUsername: app.updateUsername,
        handleLogout: app.handleLogout, handleProfileImage: app.handleProfileImage,
        refreshApprovalStatus: app.refreshApprovalStatus,
    }), [app.user, app.userProfile, app.loading, app.isAdmin, app.userApproved,
        app.nameEditOpen, app.newUsername, app.refreshingStatus]);

    const uiValue = useMemo(() => ({
        tab: app.tab, setTab: app.setTab,
        profileTab: app.profileTab, setProfileTab: app.setProfileTab,
        heroIndex: app.heroIndex, setHeroIndex: app.setHeroIndex,
        tvHeroIndex: app.tvHeroIndex, setTvHeroIndex: app.setTvHeroIndex,
        animeHeroIndex: app.animeHeroIndex, setAnimeHeroIndex: app.setAnimeHeroIndex,
        showScrollTop: app.showScrollTop, contentRef: app.contentRef,
        randomSpinning: app.randomSpinning, setRandomSpinning: app.setRandomSpinning,
        doubleTapRef: app.doubleTapRef,
        toasts: app.toasts, showToast: app.showToast,
        moodOpen: app.moodOpen, setMoodOpen: app.setMoodOpen,
        moodStep: app.moodStep, setMoodStep: app.setMoodStep,
        moodMood: app.moodMood, setMoodMood: app.setMoodMood,
        moodType: app.moodType, setMoodType: app.setMoodType,
        moodDuration: app.moodDuration, setMoodDuration: app.setMoodDuration,
        moodResults: app.moodResults, setMoodResults: app.setMoodResults,
        moodLoading: app.moodLoading, setMoodLoading: app.setMoodLoading,
        homeGenre: app.homeGenre, setHomeGenre: app.setHomeGenre,
        tvGenre: app.tvGenre, setTvGenre: app.setTvGenre,
        animeGenre: app.animeGenre, setAnimeGenre: app.setAnimeGenre,
        librarySort: app.librarySort, setLibrarySort: app.setLibrarySort,
        handleContentScroll: app.handleContentScroll, scrollToTop: app.scrollToTop,
    }), [app.tab, app.profileTab, app.heroIndex, app.tvHeroIndex, app.animeHeroIndex,
        app.showScrollTop, app.randomSpinning, app.toasts,
        app.moodOpen, app.moodStep, app.moodMood, app.moodType, app.moodDuration,
        app.moodResults, app.moodLoading,
        app.homeGenre, app.tvGenre, app.animeGenre, app.librarySort]);

    const playerValue = useMemo(() => ({
        playerOpen: app.playerOpen, setPlayerOpen: app.setPlayerOpen,
        playerUrl: app.playerUrl, setPlayerUrl: app.setPlayerUrl,
        currentSeason: app.currentSeason, setCurrentSeason: app.setCurrentSeason,
        currentEpisode: app.currentEpisode, setCurrentEpisode: app.setCurrentEpisode,
        playerSource: app.playerSource, setPlayerSource: app.setPlayerSource,
        playerLoaded: app.playerLoaded, setPlayerLoaded: app.setPlayerLoaded,
        playerError: app.playerError, setPlayerError: app.setPlayerError,
        playerTimerRef: app.playerTimerRef,
        skipSegments: app.skipSegments, activeSkip: app.activeSkip, autoSkip: app.autoSkip,
        loadSkipData: app.loadSkipData, checkSkipSegment: app.checkSkipSegment,
        performSkip: app.performSkip, toggleAutoSkip: app.toggleAutoSkip,
        saveProgress: app.saveProgress, clearProgress: app.clearProgress,
        getProgressPercent: app.getProgressPercent,
        playSource: app.playSource, closePlayer: app.closePlayer,
        updatePlayerEpisode: app.updatePlayerEpisode, isRuSource: app.isRuSource,
    }), [app.playerOpen, app.playerUrl, app.currentSeason, app.currentEpisode,
        app.playerSource, app.playerLoaded, app.playerError,
        app.skipSegments, app.activeSkip, app.autoSkip]);

    return (
        <AuthProvider value={authValue}>
            <UIProvider value={uiValue}>
                <ContentProvider value={app}>
                    <PlayerProvider value={playerValue}>
                        {children}
                    </PlayerProvider>
                </ContentProvider>
            </UIProvider>
        </AuthProvider>
    );
}

/**
 * Full app state - backward compatible. For performance-critical components,
 * use specific context hooks: useAuthContext, useUIContext, usePlayerContext
 */
export function useApp() {
    const auth = useAuthContext();
    const ui = useUIContext();
    const content = useContentContext();
    const player = usePlayerContext();
    return { ...auth, ...ui, ...content, ...player };
}

export { useAuthContext } from './AuthContext.jsx';
export { useUIContext } from './UIContext.jsx';
export { useContentContext } from './ContentContext.jsx';
export { usePlayerContext } from './PlayerContext.jsx';

export default AppContext;
