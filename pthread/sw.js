// Service Worker for COOP/COEP headers (SharedArrayBuffer support)
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', e => {
    const req = e.request;
    const url = new URL(req.url);
    
    // 只处理同源请求
    if (url.origin !== location.origin) return;
    
    e.respondWith(
        fetch(req).then(res => {
            const clone = res.clone();
            return clone.arrayBuffer().then(buf => {
                const newHeaders = new Headers(clone.headers);
                // 页面导航需要COOP/COEP头
                if (req.mode === 'navigate') {
                    newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
                    newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
                }
                // 所有同源资源都添加CORP头，防止被COEP阻止
                newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
                newHeaders.set('Content-Length', buf.byteLength);
                return new Response(buf, { 
                    status: clone.status, 
                    statusText: clone.statusText, 
                    headers: newHeaders 
                });
            });
        }).catch(() => {
            return fetch(req);
        })
    );
});
