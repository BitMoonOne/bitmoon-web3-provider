var Web3 = require("web3")
var BitmoonProvider = require("../index.js");
var expect = require('chai').expect
var assert = require("assert")


var config = {
    "address":"0x15Afed32B6A7118aa8CeefAC014b4F4d1676448d",
    "chainId":"",
    "rpcUrl": "https://mainnet.infura.io/llyrtzQ3YhkdESt2Fzrk"
}

var provider = new BitmoonProvider(config);
var web3 = new Web3(provider);

describe("Test bitmoon web3 provider",function () {
    it("eth_accounts",function () {
        web3.eth.getAccounts(function (error,address) {
            console.log(error)
            assert.equal(error,null)
            expect(address[0]).to.equal(config.address);
        })
    })

    it("eth_getBlockNumber",function () {
        web3.eth.getBlockNumber(function (error,number) {
            console.log(error,number)
        })
    })
})
