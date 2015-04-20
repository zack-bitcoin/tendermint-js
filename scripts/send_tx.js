// TODO: stop using unsafe/*.
// TODO: fetch account from storage.

var rpc = require("./rpc");
var types = require("./types");
var config = require("./config");

var address = "29bf3a0a13001a0d23533386be03e74923af1179";
var pubKey = [types.PubKeyTypeEd25519, "3a2c5c341ffc1d5f7ab518519ff8289d3bfab82dfd6e167b926fad72c1bf10f8"];
var privKey = [types.PrivKeyTypeEd25519, "ADD KEY HERE."];

var tx = [types.TxTypeSend, {
  Inputs: [{
    Address: address,
    Amount: 100,
    Sequence: 1,
    PubKey: pubKey,
  }],
  Outputs: [{
    Address: "DEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF",
    Amount: 100,
  }],
}];
var privAccounts = [{
  Address: address,
  PubKey: pubKey,
  PrivKey: privKey,
}];

rpc.Request("unsafe/sign_tx", [tx, privAccounts], function(res, err) {
  console.log("Signed transaction.", res.Tx, err);
  rpc.Request("broadcast_tx", [res.Tx], printRPCResponse);
});
