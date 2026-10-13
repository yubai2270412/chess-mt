// 象棋引擎Web Worker - 加载单线程WASM，接收搜索任务，返回最佳走法
// 多线程方案：每个Worker一个独立WASM实例，并行搜索

importScripts('yubai1005_final.js');

var mod = null;
var initialized = false;

function waitForExports(timeout) {
    return new Promise(function(resolve, reject) {
        var start = Date.now();
        function check() {
            if (mod._engine_init && mod._engine_set_board && mod._engine_get_best_move) {
                resolve();
            } else if (Date.now() - start > timeout) {
                reject(new Error('等待导出函数超时'));
            } else {
                setTimeout(check, 100);
            }
        }
        check();
    });
}

async function init() {
    if (initialized) return;
    mod = await YBModule({
        locateFile: function(path) {
            if (path.endsWith('.wasm')) return 'yubai1005_final.wasm';
            return path;
        }
    });
    await waitForExports(10000);
    mod._engine_init();
    initialized = true;
}

self.onmessage = async function(e) {
    var data = e.data;
    
    if (data.type === 'init') {
        try {
            await init();
            self.postMessage({type: 'ready', workerId: data.workerId});
        } catch (err) {
            self.postMessage({type: 'error', error: err.message});
        }
        return;
    }
    
    if (data.type === 'search') {
        try {
            if (!initialized) await init();
            
            // 设置棋盘
            var board = new Int32Array(data.board);
            var boardPtr = mod._malloc(board.length * 4);
            for (var i = 0; i < board.length; i++) {
                mod.setValue(boardPtr + i * 4, board[i], 'i32');
            }
            mod._engine_set_board(boardPtr, data.side, 0);
            mod._free(boardPtr);
            
            // 设置线程数（单线程WASM忽略此参数，但保留接口）
            if (mod._engine_set_threads) {
                mod._engine_set_threads(1);
            }
            
            // 搜索
            var startTime = Date.now();
            var movePtr = mod._engine_get_best_move(data.time || 1000);
            var move = mod.UTF8ToString(movePtr);
            var elapsed = Date.now() - startTime;
            var nodes = mod._engine_get_node_count ? mod._engine_get_node_count() : 0;
            
            self.postMessage({
                type: 'result',
                workerId: data.workerId,
                move: move,
                nodes: nodes,
                elapsed: elapsed,
                nps: elapsed > 0 ? Math.round(nodes / (elapsed / 1000)) : 0
            });
        } catch (err) {
            self.postMessage({type: 'error', workerId: data.workerId, error: err.message});
        }
    }
};
