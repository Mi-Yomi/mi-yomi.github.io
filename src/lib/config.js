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
