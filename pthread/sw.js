// Service Worker for COOP/COEP headers (SharedArrayBuffer support)
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', e => {
    const req = e.request;
    const url = new URL(req.url);
    
    // 只处理同源的HTML/JS/WASM文件
    if (url.origin !== location.origin) return;
    const isHtml = req.mode === 'navigate' || url.pathname.endsWith('.html');
    const isJs = url.pathname.endsWith('.js');
    const isWasm = url.pathname.endsWith('.wasm');
    if (!isHtml && !isJs && !isWasm) return;
    
    e.respondWith(
        fetch(req).then(res => {
            const clone = res.clone();
            return clone.arrayBuffer().then(buf => {
                const newHeaders = new Headers(clone.headers);
                if (isHtml) {
                    newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
                    newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
                }
                // JS/WASM需要CORP头，防止pthread worker被COEP阻止
                newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
                newHeaders.set('Content-Length', buf.byteLength);
                return new Response(buf, { 
                    status: clone.status, 
                    statusText: clone.statusText, 
                    headers: newHeaders 
                });
            });
        }).catch(() => fetch(req))
    );
});
