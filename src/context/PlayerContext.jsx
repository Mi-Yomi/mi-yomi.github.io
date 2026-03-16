import { createContext, useContext } from 'react';

const PlayerContext = createContext(null);

export function PlayerProvider({ value, children }) {
    return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayerContext() {
    const ctx = useContext(PlayerContext);
    if (!ctx) throw new Error('usePlayerContext must be used within PlayerProvider');
    return ctx;
}

export default PlayerContext;
