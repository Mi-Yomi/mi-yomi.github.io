import { describe, it, expect } from 'vitest';
import { normalizeMediaItem, normalizeDbItem, listContains } from '../lib/normalize.js';

describe('normalizeMediaItem', () => {
    it('returns null for null input', () => {
        expect(normalizeMediaItem(null)).toBeNull();
    });

    it('normalizes a TMDB movie item', () => {
        const raw = {
            id: 123,
            title: 'Test Movie',
            release_date: '2024-06-15',
            poster_path: '/poster.jpg',
            backdrop_path: '/backdrop.jpg',
            vote_average: 7.5,
            vote_count: 1000,
            genre_ids: [28, 12],
            overview: 'A test movie',
        };
        const result = normalizeMediaItem(raw, 'movie');
        expect(result.id).toBe('123');
        expect(result.mediaType).toBe('movie');
        expect(result.title).toBe('Test Movie');
        expect(result.year).toBe('2024');
        expect(result.voteAverage).toBe(7.5);
        expect(result.genreIds).toEqual([28, 12]);
    });

    it('normalizes a TV show (detects via first_air_date)', () => {
        const raw = {
            id: 456,
            name: 'Test Show',
            first_air_date: '2023-01-01',
            poster_path: '/tv.jpg',
            vote_average: 8.2,
        };
        const result = normalizeMediaItem(raw);
        expect(result.mediaType).toBe('tv');
        expect(result.title).toBe('Test Show');
        expect(result.year).toBe('2023');
    });

    it('handles missing fields gracefully', () => {
        const result = normalizeMediaItem({ id: 1 });
        expect(result.title).toBe('Без названия');
        expect(result.year).toBe('');
        expect(result.voteAverage).toBe(0);
        expect(result.posterUrl).toBeNull();
    });
});

describe('normalizeDbItem', () => {
    it('maps item_id to id', () => {
        const db = { item_id: '999', title: 'Stored Movie', media_type: 'movie' };
        const result = normalizeDbItem(db);
        expect(result.id).toBe('999');
        expect(result.title).toBe('Stored Movie');
    });

    it('returns null for null', () => {
        expect(normalizeDbItem(null)).toBeNull();
    });
});

describe('listContains', () => {
    it('finds item by item_id', () => {
        const list = [{ item_id: '10' }, { item_id: '20' }];
        expect(listContains(list, 10)).toBe(true);
        expect(listContains(list, '20')).toBe(true);
        expect(listContains(list, 30)).toBe(false);
    });

    it('finds item by id', () => {
        const list = [{ id: 5 }, { id: 15 }];
        expect(listContains(list, '5')).toBe(true);
        expect(listContains(list, 99)).toBe(false);
    });
});
