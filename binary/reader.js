var assert = require("assert")
var binary = require("./binary")
var buffer = require("buffer")
var varint = require("varint")


// https://github.com/feross/buffer/blob/master/index.js#L1127
function verifuint(value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

//-----------------------------------------------------------------------------

var Reader = function(buf) {
	this.buf = buf
	this.offset = 0
}

Reader.prototype.readUint8 = function() {
	var v = this.buf.readUInt8(this.offset)
	this.offset += 1
	return v
}

Reader.prototype.readUint16 = function() {
	var v = this.buf.readUInt16LE(this.offset)
	this.offset += 2
	return v
}

Reader.prototype.readUint32 = function() {
	var v = this.buf.readUInt32LE(this.offset)
	this.offset += 4
	return v
}

Reader.prototype.readUint64 = function() {
	// bitcoin-js
	var a = this.buf.readUInt32LE(this.offset)
	var b = this.buf.readUInt32LE(this.offset + 4)
	b *= 0x100000000
	verifuint(b + a, 0x001fffffffffffff)
	return b + a
}

Reader.prototype.readUvarint = function() {
	var v = varint.decode(this.buf, this.offset)
	this.offset += varint.decode.bytes
	return v
}

Reader.prototype.readString = function() {
	var length = this.readUvarint()
	var v = this.buf.toString("utf8", this.offset, this.offset+length)
	this.offset += length
	return v
}

Reader.prototype.readString = function() {
	var length = this.readUvarint()
	var v = this.buf.toString("utf8", this.offset, this.offset+length)
	this.offset += length
	return v
}

//-----------------------------------------------------------------------------

var buf = new buffer.Buffer("AC02000000000000", "hex")
var r = new Reader(buf)
console.log(r, ">>"+r)
console.log(r.readUvarint())
