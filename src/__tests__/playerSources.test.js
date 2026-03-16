import { describe, it, expect } from 'vitest';
import { FALLBACK_SOURCES, isRuSource } from '../lib/playerSources.js';

describe('FALLBACK_SOURCES', () => {
    it('has at least 5 sources', () => {
        expect(FALLBACK_SOURCES.length).toBeGreaterThanOrEqual(5);
    });

    it('each source has id, name, icon, and getUrl function', () => {
        FALLBACK_SOURCES.forEach(src => {
            expect(src).toHaveProperty('id');
            expect(src).toHaveProperty('name');
            expect(src).toHaveProperty('icon');
            expect(typeof src.getUrl).toBe('function');
        });
    });

    it('generates correct movie URLs', () => {
        const vidlink = FALLBACK_SOURCES.find(s => s.id === 'vidlink');
        expect(vidlink.getUrl(123, 'movie', 1, 1)).toContain('/movie/123');
    });

    it('generates correct TV URLs with season/episode', () => {
        const vidlink = FALLBACK_SOURCES.find(s => s.id === 'vidlink');
        const url = vidlink.getUrl(456, 'tv', 2, 5);
        expect(url).toContain('/tv/456/2/5');
    });
});

describe('isRuSource', () => {
    it('identifies Russian sources', () => {
        expect(isRuSource('Collaps')).toBe(true);
        expect(isRuSource('Alloha')).toBe(true);
        expect(isRuSource('Kodik')).toBe(true);
    });

    it('returns false for non-Russian sources', () => {
        expect(isRuSource('VidLink')).toBe(false);
        expect(isRuSource('Smashy')).toBe(false);
        expect(isRuSource('')).toBe(false);
    });
});
