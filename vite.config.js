import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    // VITE_* keys are baked into the bundle at build time. Building without the
    // required public API/movie keys silently produces a broken production bundle.
    const env = loadEnv(mode, process.cwd(), '');
    if (mode === 'production' && (!env.VITE_TMDB_KEY || !env.VITE_HADES_API_URL)) {
        throw new Error('Missing VITE_TMDB_KEY / VITE_HADES_API_URL — copy .env to this checkout before building.');
    }

    return {
    base: '/',
    plugins: [
        react(),
        // PWA: installable app + offline shell. The service worker precaches the
        // built shell (html/js/css/icons) and keeps runtime caches for images.
        // API JSON (TMDB/MangaLib/Supabase) is intentionally NOT cached — the app
        // has its own in-memory SWR and data must stay fresh.
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['apple-touch-icon.png', 'favicon.png'],
            manifest: {
                id: '/',
                name: 'HADES Cinema',
                short_name: 'HADES',
                description: 'Твой личный кинотеатр: фильмы, сериалы, аниме и манга',
                lang: 'ru',
                start_url: '/',
                scope: '/',
                display: 'standalone',
                orientation: 'portrait-primary',
                background_color: '#0a0a0a',
                theme_color: '#0a0a0a',
                icons: [
                    { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
                    { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
                    { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
            },
            workbox: {
                clientsClaim: true,
                skipWaiting: true,
                cleanupOutdatedCaches: true,
                navigateFallback: '/index.html',
                // Do not hijack independent GitHub Pages project sites under this user domain.
                // Without this denylist, HADES' root-scope PWA service worker serves
                // /index.html for /pixel-mmorpg/* navigations, making the game open HADES.
                navigateFallbackDenylist: [/^\/pixel-mmorpg(?:\/|$)/],
                globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
                runtimeCaching: [
                    {
                        // TMDB posters/backdrops — immutable by URL
                        urlPattern: /^https:\/\/image\.tmdb\.org\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'img-tmdb',
                            expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30, purgeOnQuotaError: true },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    {
                        // Manga covers and pages (MangaLib CDNs)
                        urlPattern: /^https:\/\/(cover\.cdnlibs\.org|img\d*\.imglib\.info)\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'img-manga',
                            expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 7, purgeOnQuotaError: true },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    {
                        // Google Fonts stylesheets + woff2
                        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'fonts',
                            expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    {
                        // Telegram WebApp shim loaded in <head>
                        urlPattern: /^https:\/\/telegram\.org\/js\/telegram-web-app\.js/i,
                        handler: 'StaleWhileRevalidate',
                        options: { cacheName: 'vendor-js', cacheableResponse: { statuses: [0, 200] } },
                    },
                ],
            },
        }),
    ],
    build: {
        outDir: 'docs',
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    anime: ['animejs'],
                },
            },
        },
    },
    };
});
