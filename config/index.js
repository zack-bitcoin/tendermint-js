function remote(host, port) {
  return {
    host: host,
    port: port
  };
}

var Remotes = [
  remote("188.166.55.222", 8081),
  remote("107.170.212.15", 8081),
  remote("104.236.32.36", 8081),
  remote("107.170.212.15", 8081),
  remote("188.226.236.196", 8081),
  remote("46.101.170.172", 8081),
  remote("188.226.236.196", 8081),
  remote("46.101.170.172", 8081),
  remote("104.236.32.36", 8081),
  remote("162.243.85.60", 8081),
  remote("162.243.85.60", 8081),
];

function IsNodeJs() {
  return typeof (window) != "object";
}

module.exports = {
  Remotes: Remotes,
  IsNodeJs: IsNodeJs,
};
