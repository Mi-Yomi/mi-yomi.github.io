export const HADES_API_URL = import.meta.env.VITE_HADES_API_URL || 'https://hades.178-62-250-207.sslip.io/api';
export const FIREBASE_CONFIG = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};
export const FIREBASE_ENABLED = Object.values(FIREBASE_CONFIG).every(Boolean);
export const TMDB_KEY = import.meta.env.VITE_TMDB_KEY;
export const COLLAPS_TOKEN = import.meta.env.VITE_COLLAPS_TOKEN;
export const COLLAPS_API = import.meta.env.VITE_COLLAPS_API;
export const ALLOHA_TOKEN = import.meta.env.VITE_ALLOHA_TOKEN;
/** HDRezka resolver endpoint. The resolver is part of the self-host HADES API. */
export const HDREZKA_FN = `${HADES_API_URL}/hdrezka`;

export const BASE = 'https://api.themoviedb.org/3';
export const IMG = 'https://image.tmdb.org/t/p/w342';
export const IMG_SM = 'https://image.tmdb.org/t/p/w185';
export const BACKDROP = window.innerWidth <= 768
    ? 'https://image.tmdb.org/t/p/w780'
    : 'https://image.tmdb.org/t/p/w1280';

/**
 * Admin by email: set VITE_ADMIN_EMAIL in .env (UI hint only).
 * The server decides real admin rights via HADES_ADMIN_EMAIL / profiles.is_admin.
 */
export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || null;

/**
 * Whitelist mode: 'on' = require admin approval, 'off' = everyone auto-approved.
 * Set VITE_WHITELIST=off in .env to disable whitelist completely.
 */
export const WHITELIST_ENABLED = (import.meta.env.VITE_WHITELIST || 'on') !== 'off';

/**
 * Manga via the MangaLib API (api2.mangalib.me). No proxy needed:
 *  - the JSON API is CORS-friendly (reflects the request Origin), and
 *  - the image hosts (cover.cdnlibs.org covers, img*.imglib.info pages) block only
 *    an EMPTY referer — the browser's default cross-origin referer (our origin) is
 *    accepted, so <img> loads them directly. We set referrerPolicy="origin" on
 *    those <img>s to guarantee a non-empty referer regardless of page policy.
 * Works the same in dev and production with zero backend.
 */
export const MANGA_API = 'https://api2.mangalib.me/api';
export const MANGA_ENABLED = true;
