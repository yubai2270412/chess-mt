// Service Worker for COOP/COEP headers - stream passthrough with Content-Length
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', e => {
    const req = e.request;
    const url = new URL(req.url);
    
    // 只处理HTML导航请求
    if (req.mode !== 'navigate' && !url.pathname.endsWith('.html')) return;
    if (url.origin !== location.origin) return;
    
    e.respondWith(
        fetch(req).then(res => {
            const newHeaders = new Headers(res.headers);
            newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
            newHeaders.set('Cross-Origin-Embedder-Policy', 'credentialless');
            // 确保Content-Length被保留
            const cl = res.headers.get('Content-Length');
            if (cl) newHeaders.set('Content-Length', cl);
            // 使用流传递，不读取完整内容
            return new Response(res.body, {
                status: res.status,
                statusText: res.statusText,
                headers: newHeaders
            });
        }).catch(() => fetch(req))
    );
});
