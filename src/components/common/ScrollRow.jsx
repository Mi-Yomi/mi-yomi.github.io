import { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';

/**
 * Horizontal poster row with desktop scroll arrows.
 *
 * On touch/mobile the row is swiped (arrows are hidden via CSS), exactly as
 * before — this is a drop-in replacement for a bare `<div className="scroll-row">`.
 * On desktop (>=900px) it overlays a ‹ / › button in each gutter so the row can be
 * paged with a mouse. Each arrow hides when there's nothing left to scroll that way.
 */
export default function ScrollRow({ children, className = '' }) {
    const ref = useRef(null);
    const [canLeft, setCanLeft] = useState(false);
    const [canRight, setCanRight] = useState(false);

    const update = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        // scroll-snap aligns the first card past the row's left gutter padding, so a
        // row "at the start" can sit at scrollLeft ≈ paddingLeft, not 0. Treat anything
        // within that padding as the start so the left arrow hides there.
        const pad = parseFloat(getComputedStyle(el).paddingLeft) || 0;
        const max = el.scrollWidth - el.clientWidth;
        setCanLeft(el.scrollLeft > pad + 4);
        setCanRight(el.scrollLeft < max - 4);
    }, []);

    // Recompute after every render so arrows track late-loading items/images.
    useLayoutEffect(update);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        // Posters load async and grow the row — re-check once layout settles.
        const t = setTimeout(update, 400);
        return () => {
            el.removeEventListener('scroll', update);
            window.removeEventListener('resize', update);
            clearTimeout(t);
        };
    }, [update]);

    const page = (dir) => {
        const el = ref.current;
        if (!el) return;
        el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.8), behavior: 'smooth' });
    };

    return (
        <div className="scroll-row-wrap">
            <button
                type="button"
                className={`scroll-arrow left ${canLeft ? '' : 'is-off'}`}
                aria-label="Прокрутить назад"
                tabIndex={-1}
                onClick={() => page(-1)}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <div className={`scroll-row ${className}`} ref={ref}>
                {children}
            </div>
            <button
                type="button"
                className={`scroll-arrow right ${canRight ? '' : 'is-off'}`}
                aria-label="Прокрутить вперёд"
                tabIndex={-1}
                onClick={() => page(1)}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
        </div>
    );
}
