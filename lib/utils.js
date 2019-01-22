
var Utils = function(){

}

Utils.genId = function(){
    return new Date().getTime() + Math.floor(Math.random() * 1000);
}

Utils.flatMap = function(array,func){
    return [].concat(...array.map(func));
}

Utils.intRange = function(from,to){
    if (from >= to){
        return [];
    }

    return new Array(to - from).fill().map((_,i) => i + from);
}

Utils.hexToInt = function (hexString) {
    if (hexString === undefined || hexString === null){
        return hexString;
    }
    return Number.parseInt(hexString,16);
}

Utils.intToHex = function (int) {
    if (int === undefined || int === null) {
        return int;
    }
    var hexString = int.toString(16);
    return "0x" + hexString;
}

module.exports = Utils;