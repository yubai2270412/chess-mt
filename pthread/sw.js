// Service Worker - arrayBuffer for ALL resources to ensure Content-Length
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', e => {
    const req = e.request;
    const url = new URL(req.url);
    
    if (url.origin !== location.origin) return;
    
    const isHtml = req.mode === 'navigate' || url.pathname.endsWith('.html');
    const isJs = url.pathname.endsWith('.js');
    const isWasm = url.pathname.endsWith('.wasm');
    
    if (!isHtml && !isJs && !isWasm) return;
    
    e.respondWith(
        fetch(req, {cache: 'no-cache'}).then(res => {
            console.log('[SW] fetch ok:', url.pathname, 'status=', res.status, 'mode=', req.mode, 'dest=', req.destination);
            return res.arrayBuffer().then(buf => {
                const newHeaders = new Headers(res.headers);
                newHeaders.set('Content-Length', buf.byteLength);
                newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
                newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
                newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
                newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
                
                if (isHtml) {
                    newHeaders.set('Content-Type', 'text/html; charset=utf-8');
                } else if (isJs) {
                    newHeaders.set('Content-Type', 'application/javascript');
                } else if (isWasm) {
                    newHeaders.set('Content-Type', 'application/wasm');
                }
                
                return new Response(buf, {
                    status: res.status,
                    statusText: res.statusText,
                    headers: newHeaders
                });
            });
        }).catch(() => fetch(req))
    );
});
