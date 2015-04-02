var http = require("http");

var remote = {
   host: "188.166.55.222",
   port: 8081,
   path: "/",
};

function SetRemote(newRemote) {
   remote = newRemote;
}

// method:   The function to call on the remote end (not GET/POST)
// params:   An array of parameters
// callback: function(status, data, error){}
function Request(method, params, callback) {
	var rpcRequest = JSON.stringify({
		jsonrpc: "2.0",
		method:  method,
		params:  params,
		id:      null,
	});
	var options = {
		host: remote.host,
		port: remote.port,
		path: remote.path,
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"Content-Length": rpcRequest.length,
		},
	};
	var req = http.request(options, function(res) {
		var resData = "";
		//res.setEncoding("utf8");
		res.on("data", function(chunk) {
			resData += chunk;
		});
		res.on("end", function() {
			var resJSON = JSON.parse(resData);
			if (resJSON.jsonrpc == "2.0") {
				callback(resJSON.result, resJSON.error);
			} else {
				callback(null, "Response is not jsonrpc 2.0");
			}
		});
	});
	req.write(rpcRequest);
	req.end();
}

module.exports = {
	SetRemote: SetRemote,
	Request: Request,
};
