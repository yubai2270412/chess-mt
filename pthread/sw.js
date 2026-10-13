// Service Worker for COOP/COEP headers (SharedArrayBuffer support)
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', e => {
    const req = e.request;
    // 只处理同源请求
    if (new URL(req.url).origin !== location.origin) return;
    
    e.respondWith(
        fetch(req).then(res => {
            const clone = res.clone();
            const newHeaders = new Headers(clone.headers);
            newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
            newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
            newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
            return new Response(clone.body, { 
                status: res.status, 
                statusText: res.statusText, 
                headers: newHeaders 
            });
        }).catch(() => {
            // 网络错误时返回缓存
            return caches.match(req);
        })
    );
});
