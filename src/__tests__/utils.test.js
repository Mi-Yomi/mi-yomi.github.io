import { describe, it, expect, beforeEach, vi } from 'vitest';
import { pluralize, ratingColor, formatWatchTime, getStoredProgress } from '../lib/utils.js';

describe('pluralize', () => {
    it('returns "one" form for 1', () => {
        expect(pluralize(1, 'фильм', 'фильма', 'фильмов')).toBe('фильм');
        expect(pluralize(21, 'фильм', 'фильма', 'фильмов')).toBe('фильм');
    });

    it('returns "few" form for 2-4', () => {
        expect(pluralize(2, 'фильм', 'фильма', 'фильмов')).toBe('фильма');
        expect(pluralize(3, 'фильм', 'фильма', 'фильмов')).toBe('фильма');
        expect(pluralize(24, 'фильм', 'фильма', 'фильмов')).toBe('фильма');
    });

    it('returns "many" form for 5-20 and 0', () => {
        expect(pluralize(0, 'фильм', 'фильма', 'фильмов')).toBe('фильмов');
        expect(pluralize(5, 'фильм', 'фильма', 'фильмов')).toBe('фильмов');
        expect(pluralize(11, 'фильм', 'фильма', 'фильмов')).toBe('фильмов');
        expect(pluralize(19, 'фильм', 'фильма', 'фильмов')).toBe('фильмов');
    });
});

describe('ratingColor', () => {
    it('returns green for 7+', () => {
        expect(ratingColor(7)).toBe('rating-green');
        expect(ratingColor(9.5)).toBe('rating-green');
    });

    it('returns yellow for 5-6.9', () => {
        expect(ratingColor(5)).toBe('rating-yellow');
        expect(ratingColor(6.9)).toBe('rating-yellow');
    });

    it('returns red for below 5', () => {
        expect(ratingColor(4.9)).toBe('rating-red');
        expect(ratingColor(1)).toBe('rating-red');
    });

    it('returns empty for falsy', () => {
        expect(ratingColor(0)).toBe('');
        expect(ratingColor(null)).toBe('');
    });
});

describe('formatWatchTime', () => {
    it('formats seconds to MM:SS', () => {
        expect(formatWatchTime(65)).toBe('1:05');
        expect(formatWatchTime(3599)).toBe('59:59');
    });

    it('formats to HH:MM:SS for 1h+', () => {
        expect(formatWatchTime(3600)).toBe('1:00:00');
        expect(formatWatchTime(7384)).toBe('2:03:04');
    });

    it('returns null for invalid input', () => {
        expect(formatWatchTime(0)).toBeNull();
        expect(formatWatchTime(-5)).toBeNull();
        expect(formatWatchTime(null)).toBeNull();
    });
});

describe('getStoredProgress', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('returns null when no data stored', () => {
        expect(getStoredProgress('999')).toBeNull();
    });

    it('returns parsed progress data', () => {
        const progress = { time: 120, duration: 5400, ts: Date.now() };
        localStorage.setItem('hades_progress_42', JSON.stringify(progress));
        const result = getStoredProgress('42');
        expect(result.time).toBe(120);
        expect(result.duration).toBe(5400);
    });
});
