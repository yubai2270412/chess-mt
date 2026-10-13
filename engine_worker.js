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
            
            // 初始棋盘：正数=红，负数=黑，1=将,2=士,3=象,4=马,5=车,6=炮,7=兵
            var board = new Int32Array([
                -5,-4,-3,-2,-1,-2,-3,-4,-5,
                0,0,0,0,0,0,0,0,0,
                0,-6,0,0,0,0,0,-6,0,
                -7,0,-7,0,-7,0,-7,0,-7,
                0,0,0,0,0,0,0,0,0,
                0,0,0,0,0,0,0,0,0,
                7,0,7,0,7,0,7,0,7,
                0,6,0,0,0,0,0,6,0,
                0,0,0,0,0,0,0,0,0,
                5,4,3,2,1,2,3,4,5
            ]);
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
            
            // 搜索 - 注意：engine_get_best_move(maxDepth, timeMs)需要两个参数
            var startTime = Date.now();
            var movePtr = mod._engine_get_best_move(0, data.time || 1000);  // maxDepth=0不限制，timeMs=1000
            var move = mod.UTF8ToString(movePtr);
            var elapsed = Date.now() - startTime;
            var nodes = mod._engine_get_node_count ? Number(mod._engine_get_node_count()) : 0;
            
            self.postMessage({
                type: 'result',
                workerId: Number(data.workerId),
                move: String(move),
                nodes: Number(nodes),
                elapsed: Number(elapsed),
                nps: Number(elapsed > 0 ? Math.round(nodes / (elapsed / 1000)) : 0)
            });
        } catch (err) {
            self.postMessage({type: 'error', workerId: data.workerId, error: err.message});
        }
    }
};
