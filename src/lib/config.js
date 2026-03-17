export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
export const TMDB_KEY = import.meta.env.VITE_TMDB_KEY;
export const COLLAPS_TOKEN = import.meta.env.VITE_COLLAPS_TOKEN;
export const COLLAPS_API = import.meta.env.VITE_COLLAPS_API;
export const ALLOHA_TOKEN = import.meta.env.VITE_ALLOHA_TOKEN;

export const BASE = 'https://api.themoviedb.org/3';
export const IMG = 'https://image.tmdb.org/t/p/w342';
export const IMG_SM = 'https://image.tmdb.org/t/p/w185';
export const BACKDROP = window.innerWidth <= 768
    ? 'https://image.tmdb.org/t/p/w780'
    : 'https://image.tmdb.org/t/p/w1280';

export const ADMIN_USERNAME = 'Vian_u';
export const ADMIN_TAG = '1787';
/** Admin by email (optional): set VITE_ADMIN_EMAIL in .env */
export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || null;

/**
 * Whitelist mode: 'on' = require admin approval, 'off' = everyone auto-approved.
 * Set VITE_WHITELIST=off in .env to disable whitelist completely.
 */
export const WHITELIST_ENABLED = (import.meta.env.VITE_WHITELIST || 'on') !== 'off';
