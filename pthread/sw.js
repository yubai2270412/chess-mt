// Service Worker for COOP/COEP headers (SharedArrayBuffer support)
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', e => {
    const req = e.request;
    // 只处理页面导航请求
    if (req.mode !== 'navigate') return;
    
    e.respondWith(
        fetch(req).then(res => {
            const clone = res.clone();
            return clone.arrayBuffer().then(buf => {
                const newHeaders = new Headers(clone.headers);
                newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
                newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
                newHeaders.set('Content-Length', buf.byteLength);
                return new Response(buf, { 
                    status: clone.status, 
                    statusText: clone.statusText, 
                    headers: newHeaders 
                });
            });
        })
    );
});
