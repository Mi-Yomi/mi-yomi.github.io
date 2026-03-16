import { createContext, useContext } from 'react';

const ContentContext = createContext(null);

export function ContentProvider({ value, children }) {
    return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContentContext() {
    const ctx = useContext(ContentContext);
    if (!ctx) throw new Error('useContentContext must be used within ContentProvider');
    return ctx;
}

export default ContentContext;
