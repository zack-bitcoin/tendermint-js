var isNodeJs = false;

function IsNodeJs() {
	return typeof(window) != "object";
}

module.exports = {
	IsNodeJs: IsNodeJs,
};
