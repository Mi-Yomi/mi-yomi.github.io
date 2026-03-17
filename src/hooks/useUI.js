import { useCallback, useEffect, useRef, useState } from 'react';

export default function useUI() {
    const tg = window.Telegram?.WebApp;
    const [tab, setTab] = useState('home');
    const [profileTab, setProfileTab] = useState('library');
    const [heroIndex, setHeroIndex] = useState(0);
    const [tvHeroIndex, setTvHeroIndex] = useState(0);
    const [animeHeroIndex, setAnimeHeroIndex] = useState(0);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const contentRef = useRef(null);
    const [randomSpinning, setRandomSpinning] = useState(false);
    const doubleTapRef = useRef({});

    // Toast system
    const [toasts, setToasts] = useState([]);
    const toastIdRef = useRef(0);
    const showToast = useCallback((msg) => {
        const id = ++toastIdRef.current;
        setToasts(prev => [...prev.slice(-2), { id, msg }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500);
    }, []);

    // Mood quiz state
    const [moodOpen, setMoodOpen] = useState(false);
    const [moodStep, setMoodStep] = useState(0);
    const [moodMood, setMoodMood] = useState(null);
    const [moodType, setMoodType] = useState(null);
    const [moodDuration, setMoodDuration] = useState(null);
    const [moodResults, setMoodResults] = useState([]);
    const [moodLoading, setMoodLoading] = useState(false);

    // Genre filter state
    const [homeGenre, setHomeGenre] = useState('all');
    const [tvGenre, setTvGenre] = useState('all');
    const [animeGenre, setAnimeGenre] = useState('all');
    const [librarySort, setLibrarySort] = useState('date');

    // Scroll handler
    const handleContentScroll = useCallback((e) => {
        setShowScrollTop(e.target.scrollTop > 400);
    }, []);

    const scrollToTop = useCallback(() => {
        contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        tg?.HapticFeedback?.impactOccurred?.('light');
    }, [tg]);

    // Tab change: cards now animate via CSS IntersectionObserver in Card.jsx
    // anime.js kept only for complex overlay/hero animations in useAppController
    useEffect(() => {
        contentRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    }, [tab]);

    return {
        tab, setTab,
        profileTab, setProfileTab,
        heroIndex, setHeroIndex,
        tvHeroIndex, setTvHeroIndex,
        animeHeroIndex, setAnimeHeroIndex,
        showScrollTop, contentRef,
        randomSpinning, setRandomSpinning,
        doubleTapRef,
        toasts, showToast,
        moodOpen, setMoodOpen,
        moodStep, setMoodStep,
        moodMood, setMoodMood,
        moodType, setMoodType,
        moodDuration, setMoodDuration,
        moodResults, setMoodResults,
        moodLoading, setMoodLoading,
        homeGenre, setHomeGenre,
        tvGenre, setTvGenre,
        animeGenre, setAnimeGenre,
        librarySort, setLibrarySort,
        handleContentScroll, scrollToTop,
    };
}
