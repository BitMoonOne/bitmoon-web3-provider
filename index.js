
var Web3 = require("web3")
var RPCEngine = require("./lib/rpc")
var FilterMgr = require("./lib/filter")
var Utils = require("./lib/utils")

var BitmoonWeb3Provider = function (config) {
    this.address = config.address;
    this.chainId = config.chainId;
    this.rpc = new RPCEngine(config.rpcUrl);
    this.filterMgr = new FilterMgr(this.rpc);
    this.callbacks = new Map;
    this.isBitmoon = true;
}

BitmoonWeb3Provider.prototype.isConnected = function () {
    return true;
}

BitmoonWeb3Provider.prototype.send = function (payload) {
    var response = {
        jsonrpc: "2.0",
        id: payload.id
    };

    switch (payload.method) {
        case "eth_accounts":
            response.result = this.eth_accounts();
            break;
        case "eth_coinbase":
            response.result = this.eth_coinbase();
            break;
        case "net_version":
            response.result = this.net_version();
            break;
        case "eth_uninstallFilter":
            this.sendAsync(payload,(error) => {
                if(error){
                    console.log(error);
                }
            });
            response.result = true;
            break;
        default:
            throw new Error("Bitmoon does not support calling " + payload.method + " synchronously without a callback. Please provide a callback parameter to call " + payload.method + " asynchronously.");
    }
}


BitmoonWeb3Provider.prototype.sendAsync = function(payload,callback){
    if (Array.isArray(payload)) {
        Promise.all(payload.map(this._sendAsync.bind(this)))
            .then(data => callback(null,data))
            .catch(error => callback(error,null))
    }else {
        this._sendAsync(payload)
            .then(data => callback(null,data))
            .catch(error => callback(error,null))
    }
}

BitmoonWeb3Provider.prototype._sendAsync = function(payload){
    return new Promise((resolve, reject) => {
        if(!payload.id) {
            payload.id = Utils.genId();
        }

        this.callbacks.set(payload.id,(error,data) => {
            if(error){
                reject(error);
            }else {
                resolve(data);
            }
        });

        switch (payload.method) {
            case "eth_accounts":
                return this.sendResponse(payload.id,this.eth_accounts());
            case "eth_coinbase":
                return this.sendResponse(payload.id,this.eth_coinbase());
            case "net_version":
                return this.sendResponse(payload.id, this.net_version());
            case "eth_sign":
                return this.eth_sign(payload);
            case "personal_sign":
                return this.personal_sign(payload);
            case "eth_signTypedData":
                return this.eth_signTypedData(payload);
            case "eth_sendTransaction":
                return this.eth_sendTransaction(payload);
            case "eth_newFilter":
                return this.eth_newFilter(payload);
            case "eth_newBlockFilter":
                return this.eth_newBlockFilter(payload);
            case "eth_newPendingTransactionFilter":
                return this.eth_newPendingTransactionFilter(payload);
            case "eth_uninstallFilter":
                return this.eth_uninstallFilter(payload);
            case "eth_getFilterChanges":
                return this.eth_getFilterChanges(payload);
            case "eth_getFilterLogs":
                return this.eth_getFilterLogs(payload);
            default:
                this.callbacks.delete(payload.id);
                return this.rpc.call(payload).then(resolve).catch(reject);
        }
    })
}

BitmoonWeb3Provider.prototype.eth_accounts = function () {
    return this.address ? [this.address] : [];
}

BitmoonWeb3Provider.prototype.eth_coinbase = function() {
    return this.address;
}

BitmoonWeb3Provider.prototype.net_version = function(){
    return this.chainId.toString(10) || null;
}

BitmoonWeb3Provider.prototype.eth_sign = function(payload) {
    this.postMessage("signMassage",payload.id,{data: payload.params[1]});
}

BitmoonWeb3Provider.prototype.personal_sign = function(payload){
    this.postMessage("signPersonalMessage",payload.id,{data:payload.params[0]});
}

BitmoonWeb3Provider.prototype.eth_signTypedData = function(payload){
    this.postMessage("signTypedMessage",payload.id,{data: payload.params[0]});
}

BitmoonWeb3Provider.prototype.eth_sendTransaction = function(payload){
    this.postMessage("signTransaction",payload.id,{data: payload.params[0]});
}


BitmoonWeb3Provider.prototype.eth_newFilter = function(payload){
    this.filterMgr.newFilter(payload).
        then(filterId => this.sendResponse(payload.id,filterId))
        .catch(error => this.sendError(payload.id,error));
}

BitmoonWeb3Provider.prototype.eth_newBlockFilter = function(payload) {
    this.filterMgr.newBlockFilter()
        .then(filterId => this.sendResponse(payload.id,filterId))
        .catch(error => this.sendError(payload.id,error));
}

BitmoonWeb3Provider.prototype.eth_newPendingTransactionFilter = function(payload){
    this.filterMgr.newPendingTransactionFilter()
        .then(filterId => this.sendResponse(payload.id,filterId))
        .catch(error => this.sendError(payload.id,error));
}

BitmoonWeb3Provider.prototype.eth_uninstallFilter = function(payload) {
    this.filterMgr.uninstallFilter(payload.params[0])
        .then(filterId => this.sendResponse(payload.id,filterId))
        .catch(error => this.sendError(payload.id,error));
}

BitmoonWeb3Provider.prototype.eth_getFilterChanges = function(payload){
    this.filterMgr.getFilterChanges(payload.params[0])
        .then(data => this.sendResponse(payload.id,filterId))
        .catch(error => this.sendError(payload.id,error));
}

BitmoonWeb3Provider.prototype.getFilterLogs = function(payload) {
    this.filterMgr.getFilterLogs(payload.params[0])
        .then(data => this.sendResponse(payload.id,data))
        .catch(error => this.sendError(payload.id,error));
}

BitmoonWeb3Provider.prototype.postMessage = function(handler,id,data){
    window.webkit.messageHandlers[handler].postMessage({
        "name": handler,
        "object": data,
        "id": id
    });
}

BitmoonWeb3Provider.prototype.sendResponse = function(id,result){
    var callback = this.callbacks.get(id)
    var data = {"jsonrpc":"2.0", id: id}

    if (typeof result === "object" && result.jsonrpc && result.result) {
        data.result = result.result
    }else {
        data.result = result;
    }

    if(callback) {
        callback(null,data);
        this.callbacks.delete(id);
    }
}

BitmoonWeb3Provider.prototype.sendError = function(id,error) {
    console.log("<== sendError",id,error);
    var callback = this.callbacks.get(id);
    if(callback) {
        callback(error,null);
        this.callbacks.delete(id);
    }
}
module.exports = BitmoonWeb3Provider