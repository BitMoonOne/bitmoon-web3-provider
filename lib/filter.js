var Utils = require("./utils.js");


var FilterMgr = function (rpc) {
        this.rpc = rpc;
        this.filters = new Map;
        this.blockNumbers = new Map;
        this.timers = new Map;
        this.timeoutInterval = 5 * 60 * 1000;
}

FilterMgr.prototype.newFilter = function(payload) {
    var filter = {
        type: "log",
        options: this._normalizeFilter(payload.params[0])
    };
    var filterId = this._installFilter(filter);
    return this._getBlockNumber().then(blockNumber => {
        this.blockNumbers.set(filterId, blockNumber);
        return Utils.intToHex(filterId);
    });
}

FilterMgr.prototype.newBlockFilter = function() {
    var filter = {type: "block", options: "latest"};
    var filterId = this._installFilter(filter);
    return this._getBlockNumber().then(blockNumber => {
        this.blockNumbers.set(filterId, blockNumber);
        return Utils.intToHex(filterId);
    });
}

FilterMgr.prototype.newPendingTransactionFilter = function() {
    var filter = {type: "tx", options: "pending"};
    var filterId = this._installFilter(filter);
    return this._getBlockNumber().then(blockNumber => {
        this.blockNumbers.set(filterId, blockNumber);
        return Utils.intToHex(filterId);
    });
}

FilterMgr.prototype._installFilter = function(filter) {
    var count = this.filters.keys.length;
    var filterId = count + 1;
    filter.id = filterId;
    this.filters.set(filterId, filter);
    this._setupTimer(filterId);
    return filterId;
}

FilterMgr.prototype.uninstallFilter = function(filterId) {
    var id = Utils.hexToInt(filterId);
    console.log("uninstall filter ", this.filters.get(id));
    this.filters.delete(id);
    this.blockNumbers.delete(id);
    this._clearTimer(id);
    return Promise.resolve(true);
}

FilterMgr.prototype.getFilterChanges = function(filterId) {
    var id = Utils.hexToInt(filterId);
    var filter = this.filters.get(id);
    if (!filter) { return Promise.reject(new Error("getFilterChanges: no filter found")); }
    switch (filter.type) {
        case "log":
            return this._getLogFilterChanges(filter.id);
        case "block":
            return this._getBlockFilterChanges(filter.id);
        case "tx":
            return this._getTxFilterChanges(filter.id);
        default:
            return Promise.reject(new Error("unsupport filter type"));
    }
}

FilterMgr.prototype._getLogFilterChanges = function(filterId) {
    var filter = this.filters.get(filterId).options;
    var fromBlock = this.blockNumbers.get(filterId);
    if (!filter || !fromBlock) {
        return Promise.reject(new Error("_getLogFilterChanges: no filter found"));
    }
    return this._getBlockNumber().then(blockNumber => {
        var toBlock = (filter.toBlock === "latest" ? blockNumber : filter.toBlock);
        var from = Utils.hexToInt(fromBlock);
        var to = Utils.hexToInt(toBlock);
        if (from > to) {
            return [];
        }
        return this.rpc.getFilterLogs(Object.assign({}, filter, {
            fromBlock: fromBlock,
            toBlock: toBlock
        }));
    });
}

FilterMgr.prototype._getBlockFilterChanges = function(filterId) {
    return this._getBlocksForFilter(filterId)
        .then(blocks => blocks.map(block => block.hash));
}

FilterMgr.prototype._getTxFilterChanges = function(filterId) {
    return this._getBlocksForFilter(filterId)
        .then(blocks => Utils.flatMap(blocks, block => block.transactions));
}

FilterMgr.prototype._getBlocksForFilter = function(filterId) {
    var fromBlock = this.blockNumbers.get(filterId);
    if (!fromBlock) { return Promise.reject(new Error("no filter found")); }
    return this._getBlockNumber().then(toBlock => {
        var from = Utils.hexToInt(fromBlock);
        var to = Utils.hexToInt(toBlock);
        if (to > from) {
            this.blockNumbers.set(filterId, toBlock);
        }
        return this._getBlocksInRange(from, to);
    });
}

FilterMgr.prototype._getBlocksInRange = function(fromBlock, toBlock) {
    if (fromBlock >= toBlock) {
        return Promise.resolve([]);
    }
    return Promise.all(
        Utils.intRange(fromBlock, toBlock)
            .map(Utils.intToHex)
            .map(this._getBlockByNumber.bind(this))
    );
}

FilterMgr.prototype._getBlockNumber = function() {
    return this.rpc.getBlockNumber();
}

FilterMgr.prototype._getBlockByNumber = function(number) {
    return this.rpc.getBlockByNumber(number);
}

FilterMgr.prototype.getFilterLogs = function(filterId) {
    var filter = this.filters.get(Utils.hexToInt(filterId));
    if (!filter) {
        return Promise.reject(new Error("no filter found"));
    }
    return this.rpc.getFilterLogs(this._normalizeParams(filter.options));
}

FilterMgr.prototype._normalizeParams = function(filter) {
    var params = {
        fromBlock : this._normalizeParamBlock(filter.fromBlock),
        toBlock : this._normalizeParamBlock(filter.toBlock),
        topics : filter.topics
    };
    if (filter.addresses) {
        params.address = filter.addresses;
    }
    return params;
}

FilterMgr.prototype._normalizeFilter = function(params) {
    return {
        fromBlock : this._normalizeFilterBlock(params.fromBlock),
        toBlock : this._normalizeFilterBlock(params.toBlock),
        addresses : undefined === params.address ? null : Array.isArray(params.address) ? params.address : [params.address],
        topics : params.topics || []
    };
}

FilterMgr.prototype._normalizeFilterBlock = function(blockNumber) {
    if (undefined === blockNumber || "latest" === blockNumber || "pending" === blockNumber) {
        return "latest";
    }
    if ("earliest" === blockNumber) {
        return 0;
    }
    if (blockNumber.startsWith("0x")) {
        return Utils.hexToInt(blockNumber);
    }
    throw new Error("Invalid block option: " + blockNumber);
}

FilterMgr.prototype._normalizeParamBlock = function(blockNumber) {
    return "latest" === blockNumber ? blockNumber : Utils.intToHex(blockNumber);
}

FilterMgr.prototype._clearTimer = function(filterId) {
    var oldTimer = this.timers.get(filterId);
    if (oldTimer) {
        clearTimeout(oldTimer);
    }
}

FilterMgr.prototype._setupTimer = function(filterId) {
    this._clearTimer(filterId);
    var newTimer = setTimeout(() => {
        console.log("filter timeout ", filterId);
        this.filters.delete(filterId);
        this.blockNumbers.delete(filterId);
    }, this.timeoutInterval);
    this.timers.set(filterId, newTimer);
}


module.exports = FilterMgr;
