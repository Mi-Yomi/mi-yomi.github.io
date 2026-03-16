import { IMG, BACKDROP } from './config.js';

/**
 * Normalize a TMDB / Supabase media item to a consistent shape.
 * Resolves id vs item_id, title vs name, movie vs tv inconsistencies.
 *
 * @param {Object} raw - Raw media item from any source
 * @param {string} [fallbackType='movie'] - Default media_type if missing
 * @returns {Object} Normalized item
 */
export function normalizeMediaItem(raw, fallbackType = 'movie') {
    if (!raw) return null;

    const id = String(raw.item_id || raw.id || '');
    const mediaType = raw.media_type || (raw.first_air_date ? 'tv' : fallbackType);
    const title = raw.title || raw.name || 'Без названия';
    const originalTitle = raw.original_title || raw.original_name || '';
    const releaseDate = raw.release_date || raw.first_air_date || '';
    const year = releaseDate.split('-')[0] || '';
    const posterPath = raw.poster_path || null;
    const backdropPath = raw.backdrop_path || null;
    const voteAverage = Number(raw.vote_average) || 0;
    const voteCount = Number(raw.vote_count) || 0;
    const genreIds = raw.genre_ids || (raw.genres ? raw.genres.map(g => g.id) : []);

    return {
        id,
        mediaType,
        title,
        originalTitle,
        releaseDate,
        year,
        posterPath,
        backdropPath,
        posterUrl: posterPath ? `${IMG}${posterPath}` : null,
        backdropUrl: backdropPath ? `${BACKDROP}${backdropPath}` : null,
        voteAverage,
        voteCount,
        genreIds,
        overview: raw.overview || '',
        runtime: raw.runtime || null,
        numberOfSeasons: raw.number_of_seasons || null,
        numberOfEpisodes: raw.number_of_episodes || null,
        status: raw.status || null,
        credits: raw.credits || null,
        genres: raw.genres || [],
        _raw: raw,
    };
}

/**
 * Normalize a Supabase favorites/history/watchlist item back to Card-compatible shape.
 * This bridges the gap between Supabase stored items (item_id, title) and TMDB format.
 *
 * @param {Object} dbItem - Item from Supabase table
 * @returns {Object} Card-compatible item
 */
export function normalizeDbItem(dbItem) {
    if (!dbItem) return null;
    return {
        ...dbItem,
        id: dbItem.item_id || dbItem.id,
        media_type: dbItem.media_type || 'movie',
        title: dbItem.title || dbItem.name || '',
        name: dbItem.name || dbItem.title || '',
        poster_path: dbItem.poster_path || null,
        backdrop_path: dbItem.backdrop_path || null,
        vote_average: dbItem.vote_average || 0,
        release_date: dbItem.release_date || dbItem.first_air_date || '',
    };
}

/**
 * Check if an array contains an item by id (handles both id and item_id).
 * @param {Array} list - Array of items
 * @param {string|number} itemId - Item id to find
 * @returns {boolean}
 */
export function listContains(list, itemId) {
    const id = String(itemId);
    return list.some(item => String(item.item_id || item.id) === id);
}
