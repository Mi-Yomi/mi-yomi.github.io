import { useCallback, useRef, useState } from 'react';

const PAGE_SIZE = 20;

/**
 * Generic pagination hook for Supabase queries.
 * Returns paginated data with "load more" capability.
 */
export default function usePagination(initialData = []) {
    const [items, setItems] = useState(initialData);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const offsetRef = useRef(0);

    const reset = useCallback((data = []) => {
        setItems(data);
        offsetRef.current = data.length;
        setHasMore(data.length >= PAGE_SIZE);
    }, []);

    const loadMore = useCallback(async (queryFn) => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        try {
            const data = await queryFn(offsetRef.current, PAGE_SIZE);
            if (!data || data.length === 0) {
                setHasMore(false);
            } else {
                setItems(prev => [...prev, ...data]);
                offsetRef.current += data.length;
                setHasMore(data.length >= PAGE_SIZE);
            }
        } catch (err) {
            console.error('Pagination error:', err);
        }
        setLoadingMore(false);
    }, [loadingMore, hasMore]);

    const prepend = useCallback((item) => {
        setItems(prev => [item, ...prev]);
        offsetRef.current += 1;
    }, []);

    const remove = useCallback((predicate) => {
        setItems(prev => prev.filter(item => !predicate(item)));
        offsetRef.current = Math.max(0, offsetRef.current - 1);
    }, []);

    return { items, setItems, hasMore, loadingMore, reset, loadMore, prepend, remove };
}
