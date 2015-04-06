var rpc = require("./rpc");
var types = require("./types");

function printRPCResponse(res, err) {
	if (err != "") {
		console.log("Error!", err);
	} else {
		console.log(JSON.stringify(res, null, 3));
	}
}

//rpc.Request("status", [], printRPCResponse);
//rpc.Request("net_info", [], printRPCResponse);
//rpc.Request("get_block", [1], printRPCResponse);
//rpc.Request("list_accounts", [], printRPCResponse);
//rpc.Request("unsafe/gen_priv_account", [], printRPCResponse);

/*
var address = "29bf3a0a13001a0d23533386be03e74923af1179";
var pubKey = [types.PubKeyTypeEd25519,"3a2c5c341ffc1d5f7ab518519ff8289d3bfab82dfd6e167b926fad72c1bf10f8"];
var privKey = [types.PrivKeyTypeEd25519,"ADD KEY HERE."];

if (true) {
	var tx = [types.TxTypeSend,{
		Inputs:[{
			Address: address,
			Amount:  100,
			Sequence: 1,
			PubKey: pubKey,
		}],
		Outputs:[{
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
		console.log("foo", res.Tx, err);
		rpc.Request("broadcast_tx", [res.Tx], printRPCResponse);
	});
}
*/

var ips = [
    "128.199.230.153",
    "45.55.141.184",
    "188.166.55.222",
    "188.226.153.157",
    "46.101.49.208",//me
    "192.241.194.249"
];
var commands = [
    "status",
    "net_info",
    "list_validators",
    "list_accounts",
    "ip"
];
function request(s, ip) {
    console.log(ip)
    function callback(result, error) { 
	document.getElementById(s).innerHTML = "";  
	document.getElementById(s).innerHTML = JSON.stringify(result, null, 3);  
    }
    if (s == "ip") { callback(ip); }
    else { rpc.Request(s, [], callback, ip); }
}
var ip = 1;
function refresh() {
    console.log(ip);
    commands.map(function(y){ request(y, ips[ip%(ips.length)]);});
}

document.getElementById("next_node_button").onclick=function(){
    commands.map(function(y){ document.getElementById(y).innerHTML = ""; });
    ip+=1;
}
function refresher() {
    setTimeout(function(){
	refresh();
	refresher();
    }, 1000);
}
refresher();
function f(result, error) { 
    document.getElementById("text").innerHTML = JSON.stringify(result, null, 3);
}
