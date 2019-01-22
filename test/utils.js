var expect = require('chai').expect
var Utils = require("../lib/utils")

describe("Util test",function () {
    it("test genId",function () {
        console.log(Utils.genId())
    })

    it("test flatMap",function () {
        array = [[1],[2],[3]]
        var result = Utils.flatMap(array,function (v,i) {
            return v * v ;
        })
        expect(result).to.deep.equal([1,4,9])
    })

    it("test intRange no value",function () {
        var result = Utils.intRange(6,4)
        expect(result).to.deep.equal([])
    })

    it("test intRange many values",function () {
        var result = Utils.intRange(1,4)
        expect(result).to.deep.equal([1,2,3])
    })

    it("test hexToInt",function () {
        var value = Utils.hexToInt("0x1f")
        expect(value).to.equal(31)
    })

    it("test intToHex",function () {
        var value = Utils.intToHex(31)
        expect(value).to.equal("0x1f")
    })
})