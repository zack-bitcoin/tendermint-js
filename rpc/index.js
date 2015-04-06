var config = require("../config");

var remote = {
    host: "46.101.49.208", //purple anteater
   // host: "188.166.55.222", //navy toad
   port: 8081,
   path: "/",
};

function SetRemote(newRemote) {
   remote = newRemote;
}

// method:   The function to call on the remote end (not GET/POST)
// params:   An array of parameters
// callback: function(status, data, error){}
function Request(method, params, callback, ip) {
    if(typeof ip === "undefined") {
        ip = remote.host;
    }
    if (config.IsNodeJs()) {
	return requestNode(method, params, callback, ip);
    } else {
	return requestBrowser(method, params, callback, ip);
    }
}

function requestNode(method, params, callback, ip) {
    console.log("REQUEST NODE");
    console.log(ip);
	var rpcRequest = JSON.stringify({
		jsonrpc: "2.0",
		method:  method,
		params:  params,
		id:      null,
	});
	var options = {
		host: ip,
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
			    return callback(resJSON.result, resJSON.error);
			} else {
			    return callback("node down", "Response is not jsonrpc 2.0");
			}
		});
	});
	req.write(rpcRequest);
	req.end();
}

function requestBrowser(method, params, callback, ip) {
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
			    return callback(resJSON.result, resJSON.error);
			} else {
			    return callback("node down", "Response is not jsonrpc 2.0");
			}
        }
    };
    request.open('POST', "http://"+ip+":"+remote.port+remote.path, true);
    request.send(rpcRequest);
};

module.exports = {
	SetRemote: SetRemote,
	Request: Request,
};
function printRPCResponse(res, err) {
    if (err != "") {
	console.log("Error!", err);
    } else {
	console.log(JSON.stringify(res, null, 3));
    }
}

//Request("unsafe/gen_priv_account", [], printRPCResponse);

