/*! coi-serviceworker v0.1.7 - Guido Zuidhof, licensed under MIT */
/*! Modified for yubai1005 multi-thread engine */
if (typeof window === 'undefined') {
    self.addEventListener("install", () => self.skipWaiting());
    self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

    self.addEventListener("message", (ev) => {
        if (ev.data && ev.data.type === "deregister") {
            self.registration
                .unregister()
                .then(() => self.clients.matchAll())
                .then((clients) => {
                    clients.forEach((client) => client.navigate(client.url));
                });
        }
    });

    self.addEventListener("fetch", function (event) {
        if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") {
            return;
        }

        // 只拦截导航请求（HTML页面），资源请求（WASM/JS/CSS/图片）直接通过
        if (event.request.mode !== "navigate") {
            return;
        }

        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response.status === 0) {
                        return response;
                    }

                    const newHeaders = new Headers(response.headers);
                    newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
                    newHeaders.set("Cross-Origin-Embedder-Policy", "credentialless");

                    return new Response(response.body, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: newHeaders,
                    });
                })
                .catch((e) => console.error(e))
        );
    });
} else {
    (function () {
        // You can customize the behavior via window.coi = { ... } before loading this script
        const coi = window.coi || {};
        const shouldRegister = coi.shouldRegister || (() => true);
        const onSuccess = coi.onSuccess || (() => {});
        const onError = coi.onError || (() => {});
        const doReload = coi.doReload !== false;
        const escapeIfUnsafe = coi.escapeIfUnsafe || false;

        function reloadOnBusy() {
            if (navigator.serviceWorker.controller) {
                onSuccess();
            } else {
                setTimeout(reloadOnBusy, 200);
            }
        }

        if (typeof SharedArrayBuffer === "undefined" && escapeIfUnsafe) {
            // Browser does not support SAB, and user wants to escape
            return;
        }

        if (shouldRegister()) {
            navigator.serviceWorker
                .register(window.document.currentScript.src)
                .then(function () {
                    if (navigator.serviceWorker.controller) {
                        onSuccess();
                    } else {
                        if (doReload) {
                            navigator.serviceWorker.addEventListener("controllerchange", () => {
                                window.location.reload();
                            });
                            // Trigger reload if controller does not change within a second
                            setTimeout(() => {
                                if (!navigator.serviceWorker.controller) {
                                    window.location.reload();
                                }
                            }, 1000);
                        } else {
                            reloadOnBusy();
                        }
                    }
                })
                .catch(function (e) {
                    onError(e);
                });
        }
    })();
}
