#!/usr/bin/env python3
"""将mt_deploy/index.html修改为pthread多线程版本"""
import re

input_file = '/home/user/Doubao/chats/38441497042875650/chess_release_v1060_full/mt_deploy/index.html'
output_file = '/home/user/Doubao/chats/38441497042875650/chess_release_v1060_full/mt_deploy/index_pthread.html'

with open(input_file, 'r', encoding='utf-8') as f:
    content = f.read()

print(f"原始文件大小: {len(content)} 字符")

# 1. 在<head>中添加Service Worker注册和pthread多线程WASM加载
sw_code = '''
<script>
// 注册Service Worker以支持COOP/COEP（SharedArrayBuffer）
if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(e => console.log('SW注册失败:', e));
}
// 全局线程数
window.PTHREAD_THREADS = 4;
</script>
<script src="yubai1005_engine_mt.js"></script>
<script src="fs0927_engine_mt.js"></script>
<script src="sf0930_engine_mt.js"></script>
<script src="alpha0823_engine_mt.js"></script>
'''

# 在</head>前插入
content = content.replace('</head>', sw_code + '\n</head>')

# 2. 修改YBEngine的isReallyReady，支持pthread模式（没有HEAP32但有setValue）
content = content.replace(
    "return !!(YBModuleReady && typeof window.YBModule === 'object' &&\n               window.YBModule._engine_init && window.YBModule._malloc && window.YBModule._free &&\n               window.YBModule.setValue && window.YBModule.UTF8ToString);",
    "return !!(YBModuleReady && typeof window.YBModule === 'object' &&\n               window.YBModule._engine_init && window.YBModule._malloc && window.YBModule._free &&\n               window.YBModule.setValue);"
)

# 3. 修改YBEngine的init方法，使用YBModuleMT
old_yb_init = """        if (typeof window.YBModule === 'function') {
            var initParams = {};
            // JQ1005: 捕获stderr输出（FEN日志等）到游戏日志
            initParams.printErr = function(text) {
                if (typeof appendDebugLog === 'function') appendDebugLog(text);
                else console.error(text);
            };
            initParams.print = function(text) { /* 静默引擎stdout，避免info depth日志刷屏 */ };
            // emscripten 6.x: 使用instantiateWasm回调直接从内存实例化WASM
            if (typeof _ybWasmBinaryData !== 'undefined') {
                initParams.instantiateWasm = function(imports, successCallback) {
                    WebAssembly.instantiate(_ybWasmBinaryData, imports).then(function(output) {
                        successCallback(output.instance);
                    }).catch(function(e) {
                        console.error('yubai1005 WASM实例化失败:', e);
                    });
                    return {};
                };
            }
            window.YBModule(initParams).then(function(mod) {
                window.YBModule = mod;
                YBModuleReady = true;
                checkReady();
            }).catch(function(e) {
                if (typeof appendDebugLog === 'function') appendDebugLog('❌ yubai1005 WASM加载失败: ' + e.message);
                console.error('yubai1005 WASM加载失败:', e);
            });"""

new_yb_init = """        if (typeof window.YBModuleMT === 'function') {
            // pthread多线程版本
            window.YBModuleMT().then(function(mod) {
                window.YBModule = mod;
                YBModuleReady = true;
                checkReady();
            }).catch(function(e) {
                if (typeof appendDebugLog === 'function') appendDebugLog('❌ yubai1005 pthread加载失败: ' + e.message);
                console.error('yubai1005 pthread加载失败:', e);
            });"""

content = content.replace(old_yb_init, new_yb_init)

# 4. 在YBEngine init中设置线程数
content = content.replace(
    "                self._flatBuffer = new Int32Array(90);\n                if (typeof appendDebugLog === 'function') appendDebugLog('✅ yubai1005揭棋引擎就绪');",
    "                self._flatBuffer = new Int32Array(90);\n                if (window.YBModule._engine_set_threads) window.YBModule._engine_set_threads(window.PTHREAD_THREADS || 4);\n                if (typeof appendDebugLog === 'function') appendDebugLog('✅ yubai1005揭棋引擎就绪(pthread' + (window.PTHREAD_THREADS || 4) + '线程)');"
)

# 5. 修改YBEngine的setBoard，pthread模式下用setValue
content = content.replace(
    "            window.YBModule.HEAP32.set(flat, self._boardPtr >> 2);",
    "            if (window.YBModule.HEAP32) { window.YBModule.HEAP32.set(flat, self._boardPtr >> 2); } else { for (var _i=0;_i<90;_i++) window.YBModule.setValue(self._boardPtr+_i*4, flat[_i], 'i32'); }"
)

with open(output_file, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"输出文件大小: {len(content)} 字符")
print("pthread多线程版本HTML创建完成")
