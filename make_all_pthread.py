#!/usr/bin/env python3
"""将所有引擎修改为pthread多线程版本"""
import re

input_file = '/home/user/Doubao/chats/38441497042875650/chess_release_v1060_full/mt_deploy/index_pthread.html'

with open(input_file, 'r', encoding='utf-8') as f:
    content = f.read()

print(f"文件大小: {len(content)} 字符")

# ===== 1. 修改FSEngine：使用FS0927ModuleMT =====
# 修改isReallyReady
content = content.replace(
    "isReallyReady: function() {\n        return FSModuleReady && typeof FSModule === 'object' &&\n               FSModule._engine_init && FSModule._malloc && FSModule._free &&\n               FSModule.setValue && FSModule.UTF8ToString;\n    },",
    "isReallyReady: function() {\n        return FSModuleReady && typeof FSModule === 'object' &&\n               FSModule._engine_init && FSModule._malloc && FSModule._free &&\n               FSModule.setValue;\n    },"
)

# 修改init方法，使用FS0927ModuleMT
old_fs_init = """        // 启动FSModule
        if (typeof FSModule === 'function') {
            FSModule({}).then(function(mod) {
                FSModule = mod;
                FSModuleReady = true;
                checkReady();
            }).catch(function(e) {
                if (typeof appendDebugLog === 'function') appendDebugLog('❌ FS WASM加载失败: ' + e.message);
            });
        } else if (typeof FSModule === 'object' && FSModule._engine_init) {
            FSModuleReady = true;
            checkReady();
        } else {
            checkReady();
        }"""

new_fs_init = """        // 启动FS0927 pthread多线程版本
        if (typeof FS0927ModuleMT === 'function') {
            FS0927ModuleMT().then(function(mod) {
                FSModule = mod;
                FSModuleReady = true;
                if (FSModule._engine_set_threads) FSModule._engine_set_threads(window.PTHREAD_THREADS || 4);
                checkReady();
            }).catch(function(e) {
                if (typeof appendDebugLog === 'function') appendDebugLog('❌ FS pthread加载失败: ' + e.message);
            });
        } else if (typeof FSModule === 'object' && FSModule._engine_init) {
            FSModuleReady = true;
            checkReady();
        } else {
            checkReady();
        }"""

content = content.replace(old_fs_init, new_fs_init)

# 修改就绪日志
content = content.replace(
    "if (typeof appendDebugLog === 'function') appendDebugLog('✅ FS0927引擎就绪（内存复用优化）');",
    "if (typeof appendDebugLog === 'function') appendDebugLog('✅ FS0927引擎就绪（pthread' + (window.PTHREAD_THREADS || 4) + '线程）');"
)

# ===== 2. 修改WasmEngine（alpha0823）：使用Alpha0823ModuleMT =====
# 修改isReallyReady
content = content.replace(
    """isReallyReady: function() {
        if (this.isAndroid) return true; // Android 原生引擎随 APK 加载完成
        return typeof Module !== 'undefined' &&
               Module._engine_init &&
               Module._malloc &&
               Module._free &&
               Module.setValue &&
               Module.UTF8ToString;
    },""",
    """isReallyReady: function() {
        if (this.isAndroid) return true;
        return typeof Module !== 'undefined' &&
               Module._engine_init &&
               Module._malloc &&
               Module._free &&
               Module.setValue;
    },"""
)

# 修改init方法，使用Alpha0823ModuleMT
old_wasm_init = """        if (typeof Module !== 'undefined') {
            if (Module.onRuntimeInitialized) {
                var oldCb = Module.onRuntimeInitialized;
                Module.onRuntimeInitialized = function() { if(oldCb) oldCb(); checkReady(); };
            } else {
                Module.onRuntimeInitialized = checkReady;
            }
        }
        checkReady();"""

new_wasm_init = """        // 使用alpha0823 pthread多线程版本
        if (typeof Alpha0823ModuleMT === 'function') {
            Alpha0823ModuleMT().then(function(mod) {
                Module = mod;
                if (Module._engine_set_threads) Module._engine_set_threads(window.PTHREAD_THREADS || 4);
                checkReady();
            }).catch(function(e) {
                if (typeof appendDebugLog === 'function') appendDebugLog('❌ alpha0823 pthread加载失败: ' + e.message);
            });
        } else if (typeof Module !== 'undefined') {
            if (Module.onRuntimeInitialized) {
                var oldCb = Module.onRuntimeInitialized;
                Module.onRuntimeInitialized = function() { if(oldCb) oldCb(); checkReady(); };
            } else {
                Module.onRuntimeInitialized = checkReady;
            }
            checkReady();
        } else {
            checkReady();
        }"""

content = content.replace(old_wasm_init, new_wasm_init)

# 修改就绪日志
content = content.replace(
    "if (typeof appendDebugLog === 'function') appendDebugLog('✅ WebAssembly引擎就绪（内存复用优化）');",
    "if (typeof appendDebugLog === 'function') appendDebugLog('✅ alpha0823引擎就绪（pthread' + (window.PTHREAD_THREADS || 4) + '线程）');"
)

# ===== 3. 修改StandardWasmEngine（SF0930）：使用SF0930ModuleMT =====
# 修改isReallyReady
content = content.replace(
    """        return typeof SF0930Module !== 'undefined' &&
               SF0930Module._ready &&
               SF0930Module._engine_init &&
               SF0930Module._malloc &&
               SF0930Module._free &&
               SF0930Module.setValue &&
               SF0930Module.UTF8ToString;""",
    """        return typeof SF0930Module !== 'undefined' &&
               SF0930Module._engine_init &&
               SF0930Module._malloc &&
               SF0930Module._free &&
               SF0930Module.setValue;"""
)

# 修改load方法，使用SF0930ModuleMT
# 先找到StandardWasmEngine的load方法
old_sf_load_pattern = r"(StandardWasmEngine = \{[\s\S]*?load: function\(\) \{[\s\S]*?\})"
match = re.search(old_sf_load_pattern, content)
if match:
    print("找到StandardWasmEngine.load")
    # 替换其中的初始化逻辑
    old_sf_init = """        if (typeof SF0930Module === 'object' && SF0930Module._engine_init) {
            SF0930Module._ready = true;
            checkReady();
        }"""
    new_sf_init = """        if (typeof SF0930ModuleMT === 'function') {
            SF0930ModuleMT().then(function(mod) {
                SF0930Module = mod;
                if (SF0930Module._engine_set_threads) SF0930Module._engine_set_threads(window.PTHREAD_THREADS || 4);
                checkReady();
            }).catch(function(e) {
                if (typeof appendDebugLog === 'function') appendDebugLog('❌ SF0930 pthread加载失败: ' + e.message);
            });
        } else if (typeof SF0930Module === 'object' && SF0930Module._engine_init) {
            checkReady();
        }"""
    content = content.replace(old_sf_init, new_sf_init)
    print("已修改StandardWasmEngine.load")

# 修改SF0930就绪日志
content = content.replace(
    "if (typeof appendDebugLog === 'function') appendDebugLog('✅ SF0930标准中国象棋引擎就绪（Fairy-Stockfish xiangqi）');",
    "if (typeof appendDebugLog === 'function') appendDebugLog('✅ SF0930引擎就绪（pthread' + (window.PTHREAD_THREADS || 4) + '线程）');"
)

with open(input_file, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n修改完成，文件大小: {len(content)} 字符")
print("所有引擎已修改为pthread多线程版本")
