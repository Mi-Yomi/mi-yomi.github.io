// Recover queue tabs that were opened under the previous root-scope worker.
// The new navigation denylist lets these requests reach their own Pages site.
self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        await self.clients.claim();
        const windows = await self.clients.matchAll({ type: 'window' });
        await Promise.all(windows.map(async (client) => {
            const url = new URL(client.url);
            if (url.origin === self.location.origin && /^\/campus-queue(?:\/|$)/.test(url.pathname)) {
                await client.navigate(client.url).catch(() => {});
            }
        }));
    })());
});
