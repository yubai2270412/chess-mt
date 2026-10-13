// Service Worker - arrayBuffer with explicit Content-Length
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', e => {
    const req = e.request;
    const url = new URL(req.url);
    
    if (req.mode !== 'navigate' && !url.pathname.endsWith('.html')) return;
    if (url.origin !== location.origin) return;
    
    e.respondWith(
        fetch(req).then(res => {
            return res.arrayBuffer().then(buf => {
                const newHeaders = new Headers(res.headers);
                newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
                newHeaders.set('Cross-Origin-Embedder-Policy', 'credentialless');
                newHeaders.set('Content-Length', buf.byteLength);
                newHeaders.set('Content-Type', 'text/html; charset=utf-8');
                return new Response(buf, {
                    status: res.status,
                    statusText: res.statusText,
                    headers: newHeaders
                });
            });
        }).catch(() => fetch(req))
    );
});
