function Set(key, value) {
    return sessionStorage.key = value;
}

function Get(key) {
    return sessionStorage.key;
}

module.exports = {
  Set: Set,
  Get: Get,
};
