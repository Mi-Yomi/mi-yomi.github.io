import { createContext, useContext } from 'react';

const UIContext = createContext(null);

export function UIProvider({ value, children }) {
    return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUIContext() {
    const ctx = useContext(UIContext);
    if (!ctx) throw new Error('useUIContext must be used within UIProvider');
    return ctx;
}

export default UIContext;
