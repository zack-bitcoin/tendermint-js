var rpc = require("./rpc");

rpc.Request("status", [], function(res) {
	var result = res.result;
	var error  = res.error;
	if (error) {
		console.log("error =", error);
	} else {
		console.log("result =", JSON.stringify(result, null, 4));
	}
});

rpc.Request("net_info", [], function(res) {
	var result = res.result;
	var error  = res.error;
	if (error) {
		console.log("error =", error);
	} else {
		console.log("result =", JSON.stringify(result, null, 4));
	}
});
