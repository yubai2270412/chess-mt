// Service Worker for COOP/COEP/CORP headers
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', e => {
    const req = e.request;
    const url = new URL(req.url);
    
    // 只处理同源的HTML/JS/WASM文件
    if (url.origin !== location.origin) return;
    const path = url.pathname;
    const isHtml = req.mode === 'navigate' || path.endsWith('.html');
    const isJs = path.endsWith('.js');
    const isWasm = path.endsWith('.wasm');
    if (!isHtml && !isJs && !isWasm) return;
    
    e.respondWith(
        fetch(req).then(res => {
            const newHeaders = new Headers(res.headers);
            if (isHtml) {
                newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
                newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
            }
            // 所有HTML/JS/WASM都需要CORP头
            newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
            return new Response(res.body, {
                status: res.status,
                statusText: res.statusText,
                headers: newHeaders
            });
        }).catch(() => fetch(req))
    );
});
