var config = require("../config");

// method:   The function to call on the remote end (not GET/POST)
// params:   An array of parameters
// callback: function(status, data, error){}
function Request(remote, method, params, callback) {
  if (config.IsNodeJs()) {
    return requestNode(remote, method, params, callback);
  } else {
    return requestBrowser(remote, method, params, callback);
  }
}

function requestNode(remote, method, params, callback) {
  console.log("requestNode(", remote, method, params, callback, ")");
  var rpcRequest = JSON.stringify({
    jsonrpc: "2.0",
    method: method,
    params: params,
    id: null,
  });
  var options = {
    host: remote.host,
    port: remote.port,
    path: "/",
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

function requestBrowser(remote, method, params, callback) {
  var rpcRequest = JSON.stringify({
    jsonrpc: "2.0",
    method: method,
    params: params,
    id: null,
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
  request.open('POST', "http://" + remote.host + ":" + remote.port + "/", true);
  request.send(rpcRequest);
}
;

// path:     The file path to download from the server.
// dest:     The local destination of the downloaded file.
// callback: function(error){}
function Download(remote, path, dest, callback) {
  if (!path || !dest) {
    throw ("rpc.Download requires path and dest")
  }
  if (!config.IsNodeJs()) {
    throw ("rpc.Download not supported in the browser");
  } else {
    downloadNode(remote, path, dest, callback);
  }
}

function downloadNode(remote, path, dest, callback) {
  var postData = require("querystring").stringify({
    path: path
  });
  var options = {
    host: remote.host,
    port: remote.port,
    path: "/download",
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": postData.length,
    },
  };
  var req = require("http").request(options, function(res) {
    // Handle error.
    if (res.statusCode != 200) {
      var resData = "";
      res.setEncoding("utf8");
      res.on("data", function(chunk) {
        resData += chunk;
      });
      res.on("end", function() {
        if (!resData) {
          resData = "Unknown error";
        }
        callback(resData);
      });
      return;
    }
    // 200 status code.
    var stream = require("fs").createWriteStream(dest);
    stream.once("open", function(fd) {
      res.on("data", function(chunk) {
        stream.write(chunk);
      });
      res.on("end", function() {
        stream.end();
        callback(null);
      });
      res.on("error", function(err) {
        callback(err.message);
      });
    });
  });
  req.write(postData);
  req.end();
}

module.exports = {
  Request: Request,
  Download: Download,
};
