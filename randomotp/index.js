// var words = ["a", "b", "c", "D", "e", "f", "g"];
function randomotp() {
    var rpc = require("../rpc");
    var config = require("../config");
    var db = require("../db");
    var words = require("../words");
    words=words.Words;
    var remote = config.Remotes[4];
    rpc.Request(remote, "status", [], function(res, err) {
	var h = res["LatestBlockHeight"];
	console.log(h);
	h = Math.floor(h/100)*100;
	console.log(h);
	localStorage.setItem("height", h);
    });
    var height = localStorage.getItem("height");
    console.log("now fetching", height);
    function refresh() {
	var address = document.getElementById("input").value;
	var random = CryptoJS.SHA256(res["BlockMeta"]["Hash"]+address);
	var r = parseInt("0x"+random);
	console.log("words")
	console.log(words.length)
	a = [0, 1, 2, 3, 4]
	r = a.map(function(x){ return words[r%(words.length-x)]; });
	document.getElementById("text").innerHTML = JSON.stringify(r, null, 4);  
    }
    rpc.Request(remote, "get_block", [parseInt(height)], function(res, err) {
	console.log(document.getElementById("input").value);
	setInterval(refresh, 1000);
    });
}
module.exports = {
    RandomOTP: randomotp,
};
