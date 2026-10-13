// Service Worker - only handle HTML to set COOP/COEP, JS/WASM pass through
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', e => {
    const req = e.request;
    const url = new URL(req.url);
    
    if (url.origin !== location.origin) return;
    
    const isHtml = req.mode === 'navigate' || url.pathname.endsWith('.html');
    
    if (!isHtml) return; // JS/WASM and other resources pass through directly
    
    e.respondWith(
        fetch(req, {cache: 'no-cache'}).then(res => {
            return res.arrayBuffer().then(buf => {
                const newHeaders = new Headers(res.headers);
                newHeaders.set('Content-Length', buf.byteLength);
                newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
                newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
                newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
                
                return new Response(buf, {
                    status: res.status,
                    statusText: res.statusText,
                    headers: newHeaders
                });
            });
        }).catch(() => fetch(req))
    );
});
