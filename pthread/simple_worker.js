// Simple worker for testing
self.onmessage = function(e) {
    self.postMessage({cmd: 'reply', data: 'worker received: ' + JSON.stringify(e.data)});
};
self.postMessage({cmd: 'ready', msg: 'worker started, name=' + self.name});
