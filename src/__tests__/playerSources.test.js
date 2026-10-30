import { describe, it, expect } from 'vitest';
import { allohaPlayerUrl, FALLBACK_SOURCES, buildPlayerSources, isRuSource } from '../lib/playerSources.js';

describe('Alloha iframe migration', () => {
    it('keeps the publisher token and selected episode while using the current content ID', () => {
        const url = new URL(allohaPlayerUrl('https://miyagi-as.stravers.live/?token_movie=old-id&token=publisher-key&season=1&episode=2', 5158783));
        expect(url.origin).toBe('https://miyagi-as.stloadi.live');
        expect(url.searchParams.get('token')).toBe('publisher-key');
        expect(url.searchParams.get('kp')).toBe('5158783');
        expect(url.searchParams.has('token_movie')).toBe(false);
        expect(url.searchParams.get('episode')).toBe('2');
    });

    it('migrates dotted legacy hosts and obsolete ports', () => {
        expect(new URL(allohaPlayerUrl('https://tories.as.newplayjj.com:444/?kp=5158783', 5158783)).origin).toBe('https://tories-as.stloadi.live');
    });

    it('leaves other providers untouched and preserves unknown legacy content IDs', () => {
        const other = 'https://stravers.live.attacker.example/?token_movie=value';
        expect(allohaPlayerUrl(other, 5158783)).toBe(other);
        expect(new URL(allohaPlayerUrl('https://miyagi-as.stravers.live/?token_movie=value')).searchParams.get('token_movie')).toBe('value');
    });

    it('uses the migrated URL in the regular source picker', () => {
        const sources = buildPlayerSources({ media: { id: 213375, media_type: 'tv' }, allohaData: {
            id_kp: 5158783, iframe: 'https://miyagi-as.stravers.live/?token_movie=old&token=key',
        } });
        expect(sources.find(s => s.id === 'alloha').url).toBe('https://miyagi-as.stloadi.live/?token=key&kp=5158783');
        expect(sources.find(s => s.id === 'alloha')).toMatchObject({ needsReferrer: true, ads: true });
    });
});

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

describe('Collaps embed requirements', () => {
    it('marks Collaps embeds as requiring the embedding site origin as Referer', () => {
        const sources = buildPlayerSources({
            media: { id: 123, media_type: 'tv' },
            collapsData: { iframe_url: 'https://api.example.test/embed/tv/123' },
            allohaData: null,
            isAnimeContent: false,
        });

        expect(sources.find((source) => source.id === 'collaps')).toMatchObject({
            needsReferrer: true,
        });
    });
});
