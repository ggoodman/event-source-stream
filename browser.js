var stream = require('stream');

module.exports = function(url, opts) {
    if (!opts) opts = {};

    var destroyed = false;
    var rs = new stream.Readable({
        objectMode: true
    });

    rs._read = function() {};

    rs.destroy = function() {
        if (destroyed) return;
        destroyed = true;
        rs.emit('close');
    };
    
    connect(url, rs, opts);
    
    return rs;
};

function connect(url, rs, options) {
    var timeout;
    var es = new window.EventSource(url);
    var json = !!options.json;
    
    rs.once('close', onClose);

    es.onopen = function() {
        rs.emit('open');
        
        resetTimeout();
    };
    
    es.addEventListener('ping', resetTimeout);

    es.onmessage = function(e) {
        rs.push(decode(e.data, json));
        
        resetTimeout();
    };

    es.onerror = function() {
        var error = es.readyState === 0
            ?   new Error('Connection lost')
            :   new Error('Connection error');

        if (rs.listeners('error').length) rs.emit('error', error);
    };
    
    function onClose() {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
        
        if (!es.readyState !== 2) {
            es.close();
        }
    }

    function onTimeout() {
        var error = new Error('Connection timed out');
        
        error.code = 'E_TIMEDOUT';
        
        rs.emit('error', error);
        
        onClose();
    }

    function resetTimeout() {
        if (timeout) {
            clearTimeout(timeout);
        }
        
        // Default to 20s timeout
        timeout = setTimeout(onTimeout, options.timeout || 20 * 1000);
    }
}

function decode(data, json) {
    try {
        if (json) return JSON.parse(data);
        return data;
    }
    catch (err) {
        return undefined;
    }
}