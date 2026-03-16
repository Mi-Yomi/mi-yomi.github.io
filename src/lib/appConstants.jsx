/**
 * @deprecated Backward-compatibility bridge.
 * Import from specific modules instead:
 *   config.js, icons.jsx, api/tmdb.js, api/supabase.js, playerSources.js, utils.js
 */
export { supabase } from './api/supabase.js';
export { TMDB_KEY, BASE, IMG, IMG_SM, BACKDROP, COLLAPS_TOKEN, COLLAPS_API, ALLOHA_TOKEN } from './config.js';
export { I } from './icons.jsx';
export { api, getImdbId, searchCollaps, searchAlloha, isAnime, getMalId } from './api/tmdb.js';
export { FALLBACK_SOURCES } from './playerSources.js';
export { toBase64 } from './utils.js';
