// Service Worker for COOP/COEP headers with Content-Length fix
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', e => {
    const req = e.request;
    const url = new URL(req.url);
    
    // 只处理HTML导航请求（JS/WASM已内联，不需要处理）
    if (req.mode !== 'navigate' && !url.pathname.endsWith('.html')) return;
    if (url.origin !== location.origin) return;
    
    e.respondWith(
        fetch(req).then(res => {
            // 必须读取完整内容再创建Response，否则会丢失Content-Length
            // 导致大HTML在浏览器中永远处于loading状态
            return res.clone().arrayBuffer().then(buf => {
                const newHeaders = new Headers(res.headers);
                newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
                newHeaders.set('Cross-Origin-Embedder-Policy', 'credentialless');
                newHeaders.set('Content-Length', buf.byteLength);
                return new Response(buf, {
                    status: res.status,
                    statusText: res.statusText,
                    headers: newHeaders
                });
            });
        }).catch(() => fetch(req))
    );
});
