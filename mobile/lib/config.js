export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;
/** Self-hosted HADES API — auth и БД (замена Supabase, как на сайте). */
export const HADES_API_URL = process.env.EXPO_PUBLIC_HADES_API_URL || 'https://hades.178-62-250-207.sslip.io/api';
export const TMDB_KEY = process.env.EXPO_PUBLIC_TMDB_KEY;
export const COLLAPS_TOKEN = process.env.EXPO_PUBLIC_COLLAPS_TOKEN;
export const COLLAPS_API = process.env.EXPO_PUBLIC_COLLAPS_API;
export const ALLOHA_TOKEN = process.env.EXPO_PUBLIC_ALLOHA_TOKEN;

export const BASE = 'https://api.themoviedb.org/3';
export const IMG = 'https://image.tmdb.org/t/p/w342';
export const IMG_SM = 'https://image.tmdb.org/t/p/w185';
export const BACKDROP = 'https://image.tmdb.org/t/p/w780';

/**
 * Manga via the MangaLib API (api2.mangalib.me), same source as the web app.
 * Image hosts (cover.cdnlibs.org, img*.imglib.info) reject an EMPTY referer,
 * and React Native sends none by default — every manga <Image> must pass
 * MANGA_IMG_HEADERS in its source.
 */
export const MANGA_API = 'https://api2.mangalib.me/api';
export const MANGA_IMG_HEADERS = { Referer: 'https://mangalib.me/' };

export const ADMIN_USERNAME = 'Vian_u';
export const ADMIN_TAG = '1787';
/** Admin by email (optional): set EXPO_PUBLIC_ADMIN_EMAIL in .env to bypass approval */
export const ADMIN_EMAIL = process.env.EXPO_PUBLIC_ADMIN_EMAIL || null;
