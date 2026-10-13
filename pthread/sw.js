// Service Worker - match local coop_server.py config (require-corp)
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
        fetch(req).then(res => {
            const newHeaders = new Headers(res.headers);
            newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
            newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
            newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
            
            if (isHtml) {
                // HTML用arrayBuffer确保Content-Length正确
                return res.arrayBuffer().then(buf => {
                    newHeaders.set('Content-Length', buf.byteLength);
                    newHeaders.set('Content-Type', 'text/html; charset=utf-8');
                    return new Response(buf, {
                        status: res.status,
                        statusText: res.statusText,
                        headers: newHeaders
                    });
                });
            } else {
                // JS/WASM用流传递，保留原Content-Length
                return new Response(res.body, {
                    status: res.status,
                    statusText: res.statusText,
                    headers: newHeaders
                });
            }
        }).catch(() => fetch(req))
    );
});
