// Service Worker for COOP/COEP headers (SharedArrayBuffer support)
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', e => {
    const req = e.request;
    // 只处理页面导航请求，其他请求直接通过（不修改JS/WASM等资源）
    if (req.mode !== 'navigate') return;
    
    e.respondWith(
        fetch(req).then(res => {
            const newHeaders = new Headers(res.headers);
            newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
            newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
            return new Response(res.body, { 
                status: res.status, 
                statusText: res.statusText, 
                headers: newHeaders 
            });
        })
    );
});
