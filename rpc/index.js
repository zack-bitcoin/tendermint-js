var config = require("../config");

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
	if (config.IsNodeJs()) {
		requestNode(method, params, callback);
	} else {
		requestBrowser(method, params, callback);
	}
}

function requestNode(method, params, callback) {
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
	var req = require("http").request(options, function(res) {
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

function requestBrowser(method, params, callback) {
	var rpcRequest = JSON.stringify({
		jsonrpc: "2.0",
		method:  method,
		params:  params,
		id:      null,
	});
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
        if (request.readyState === 4) {
			var resJSON = JSON.parse(request.responseText);
			if (resJSON.jsonrpc == "2.0") {
				callback(resJSON.result, resJSON.error);
			} else {
				callback(null, "Response is not jsonrpc 2.0");
			}
        }
    };
    request.open('POST', "http://"+remote.host+":"+remote.port+remote.path, true);
    request.send(rpcRequest);
};

module.exports = {
	SetRemote: SetRemote,
	Request: Request,
};
