const RELOAD_KEY = 'hades:chunk-reload';

export function isChunkLoadError(error) {
    return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk .+ failed|Unable to preload CSS/i.test(error?.message || '');
}

export function reloadForChunkError(error) {
    if (!isChunkLoadError(error) || navigator.onLine === false) return false;
    try {
        // One automatic retry per bundle and tab, including across page reloads.
        if (sessionStorage.getItem(RELOAD_KEY) === import.meta.url) return false;
        sessionStorage.setItem(RELOAD_KEY, import.meta.url);
    } catch {
        return false;
    }
    window.location.reload();
    return true;
}
