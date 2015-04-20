var rpc = require("./rpc");
var types = require("./types");
var config = require("./config");

function printRPCResponse(res, err) {
  if (err != "") {
    console.log("Error!", err);
  } else {
    console.log(JSON.stringify(res, null, 3));
  }
}

// XXX This is stupid.
rpc.Request("RunProcess", [true, "echo", "/bin/echo", ["woot"], ""], printRPCResponse);
rpc.Request("ListProcesses", [], printRPCResponse);
rpc.Download("echo_2015_04_09_20_54_11_PDT.out", "download_test", function(error) {
  if (error) {
    throw (error);
  }
});
