var rpc = require("./rpc");
var types = require("./types");
var config = require("./config");
var db = require("./db");
var words = require("./words");
var randomotp = require("./randomotp");
if (!config.IsNodeJs()) {
  window.require = require;
}
