var Utils = require("./utils")

var fetch = require("node-fetch");

var RPCEngine = function (rpcUrl) {
    this.rpcUrl = rpcUrl
    this.intIds = new Map;
}

RPCEngine.prototype._intifyId = function(payload){
    if(!payload.id) {
        payload.id = Utils.genId();
        return;
    }

    if(typeof payload.id !== "number") {
        var newId = Utils.genId()
        this.intIds.set(newId,payload.id)
        payload.id = newId
    }
}

RPCEngine.prototype._restoreId = function(payload){
    var id = this.intIds.get(payload.id);
    if(id) {
        this.intIds.delete(payload.id)
        payload.id = id;
    }
}

RPCEngine.prototype.getBlockNumber = function() {
    return this.call({jsonrpc:"2.0", method: "eth_blockNumber", params:[]})
        .then(json => json.result);
}

RPCEngine.prototype.getBlockByNumber = function(number) {
    return this.call({jsonrpc: "2.0", method: "eth_getBlockByNumber", params: [number, false]})
        .then(json => json.result);
}

RPCEngine.prototype.getFilterLogs = function(filter) {
    return this.call({jsonrpc: "2.0", method: "eth_getLogs", params: [filter]});
}

RPCEngine.prototype.call = function(payload){
    this._intifyId(payload);
    return fetch(this.rpcUrl,{
        method:"POST",
        headers: {
            "Accept":"application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    }).then(response => response.json())
        .then((json) => {
        if (!json.result && json.error) {
            console.log("<== rpc error",json.error)
            throw new Error(json.error.message || "rpc error")
        }

        this._restoreId(json);
        return json;
    });
}

module.exports = RPCEngine;

