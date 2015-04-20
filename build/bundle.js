(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var rpc = require("./rpc");
var types = require("./types");
var config = require("./config");
var db = require("./db");
var words = require("./words");
var randomotp = require("./randomotp");
if (!config.IsNodeJs()) {
  window.require = require;
}

},{"./config":2,"./db":3,"./randomotp":38,"./rpc":39,"./types":40,"./words":41}],2:[function(require,module,exports){
"use strict";

function remote(host, port) {
  return {
    host: host,
    port: port
  };
}

var Remotes = [remote("188.166.55.222", 8081), remote("107.170.212.15", 8081), remote("104.236.32.36", 8081), remote("107.170.212.15", 8081), remote("188.226.236.196", 8081), remote("46.101.170.172", 8081), remote("188.226.236.196", 8081), remote("46.101.170.172", 8081), remote("104.236.32.36", 8081), remote("162.243.85.60", 8081), remote("162.243.85.60", 8081)];

function IsNodeJs() {
  return typeof window != "object";
}

module.exports = {
  Remotes: Remotes,
  IsNodeJs: IsNodeJs };

},{}],3:[function(require,module,exports){
"use strict";

function Set(key, value) {
    return sessionStorage.key = value;
}

function Get(key) {
    return sessionStorage.key;
}

module.exports = {
    Set: Set,
    Get: Get };

},{}],4:[function(require,module,exports){

},{}],5:[function(require,module,exports){
arguments[4][4][0].apply(exports,arguments)
},{"dup":4}],6:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('is-array')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var kMaxLength = 0x3fffffff
var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Note:
 *
 * - Implementation must support adding new properties to `Uint8Array` instances.
 *   Firefox 4-29 lacked support, fixed in Firefox 30+.
 *   See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *  - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *  - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *    incorrect length in some situations.
 *
 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they will
 * get the Object implementation, which is slower but will work correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = (function () {
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        new Uint8Array(1).subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding) {
  var self = this
  if (!(self instanceof Buffer)) return new Buffer(subject, encoding)

  var type = typeof subject
  var length

  if (type === 'number') {
    length = +subject
  } else if (type === 'string') {
    length = Buffer.byteLength(subject, encoding)
  } else if (type === 'object' && subject !== null) {
    // assume object is array-like
    if (subject.type === 'Buffer' && isArray(subject.data)) subject = subject.data
    length = +subject.length
  } else {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (length > kMaxLength) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum size: 0x' +
      kMaxLength.toString(16) + ' bytes')
  }

  if (length < 0) length = 0
  else length >>>= 0 // coerce to uint32

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    self = Buffer._augment(new Uint8Array(length)) // eslint-disable-line consistent-this
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    self.length = length
    self._isBuffer = true
  }

  var i
  if (Buffer.TYPED_ARRAY_SUPPORT && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    self._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    if (Buffer.isBuffer(subject)) {
      for (i = 0; i < length; i++) {
        self[i] = subject.readUInt8(i)
      }
    } else {
      for (i = 0; i < length; i++) {
        self[i] = ((subject[i] % 256) + 256) % 256
      }
    }
  } else if (type === 'string') {
    self.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer.TYPED_ARRAY_SUPPORT) {
    for (i = 0; i < length; i++) {
      self[i] = 0
    }
  }

  if (length > 0 && length <= Buffer.poolSize) self.parent = rootParent

  return self
}

function SlowBuffer (subject, encoding) {
  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

  var buf = new Buffer(subject, encoding)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length
  for (var i = 0, len = Math.min(x, y); i < len && a[i] === b[i]; i++) {}
  if (i !== len) {
    x = a[i]
    y = b[i]
  }
  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, totalLength) {
  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (totalLength === undefined) {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

Buffer.byteLength = function byteLength (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    case 'hex':
      ret = str.length >>> 1
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    default:
      ret = str.length
  }
  return ret
}

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function toString (encoding, start, end) {
  var loweredCase = false

  start = start >>> 0
  end = end === undefined || end === Infinity ? this.length : end >>> 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return 0
  return Buffer.compare(this, b)
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    if (val.length === 0) return -1 // special case: looking for empty string always fails
    return String.prototype.indexOf.call(this, val, byteOffset)
  }
  if (Buffer.isBuffer(val)) {
    return arrayIndexOf(this, val, byteOffset)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset)
  }

  function arrayIndexOf (arr, val, byteOffset) {
    var foundIndex = -1
    for (var i = 0; byteOffset + i < arr.length; i++) {
      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
      } else {
        foundIndex = -1
      }
    }
    return -1
  }

  throw new TypeError('val must be string, number or Buffer')
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function get (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function set (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) throw new Error('Invalid hex string')
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
  return charsWritten
}

function asciiWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function utf16leWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0

  if (length < 0 || offset < 0 || offset > this.length) {
    throw new RangeError('attempt to write outside buffer bounds')
  }

  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = utf16leWrite(this, string, offset, length)
      break
    default:
      throw new TypeError('Unknown encoding: ' + encoding)
  }
  return ret
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length) newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) >>> 0 & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) >>> 0 & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = value
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = value
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkInt(
      this, value, offset, byteLength,
      Math.pow(2, 8 * byteLength - 1) - 1,
      -Math.pow(2, 8 * byteLength - 1)
    )
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkInt(
      this, value, offset, byteLength,
      Math.pow(2, 8 * byteLength - 1) - 1,
      -Math.pow(2, 8 * byteLength - 1)
    )
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = value
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, target_start, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (target_start >= target.length) target_start = target.length
  if (!target_start) target_start = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (target_start < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - target_start < end - start) {
    end = target.length - target_start + start
  }

  var len = end - start

  if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < len; i++) {
      target[i + target_start] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function _augment (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array set method before overwriting
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.indexOf = BP.indexOf
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUIntLE = BP.readUIntLE
  arr.readUIntBE = BP.readUIntBE
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readIntLE = BP.readIntLE
  arr.readIntBE = BP.readIntBE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUIntLE = BP.writeUIntLE
  arr.writeUIntBE = BP.writeUIntBE
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeIntLE = BP.writeIntLE
  arr.writeIntBE = BP.writeIntBE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-z\-]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []
  var i = 0

  for (; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (leadSurrogate) {
        // 2 leads in a row
        if (codePoint < 0xDC00) {
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          leadSurrogate = codePoint
          continue
        } else {
          // valid surrogate pair
          codePoint = leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00 | 0x10000
          leadSurrogate = null
        }
      } else {
        // no lead yet

        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else {
          // valid lead
          leadSurrogate = codePoint
          continue
        }
      }
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
      leadSurrogate = null
    }

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x200000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

},{"base64-js":7,"ieee754":8,"is-array":9}],7:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],8:[function(require,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],9:[function(require,module,exports){

/**
 * isArray
 */

var isArray = Array.isArray;

/**
 * toString
 */

var str = Object.prototype.toString;

/**
 * Whether or not the given `val`
 * is an array.
 *
 * example:
 *
 *        isArray([]);
 *        // > true
 *        isArray(arguments);
 *        // > false
 *        isArray('');
 *        // > false
 *
 * @param {mixed} val
 * @return {bool}
 */

module.exports = isArray || function (val) {
  return !! val && '[object Array]' == str.call(val);
};

},{}],10:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],11:[function(require,module,exports){
var http = module.exports;
var EventEmitter = require('events').EventEmitter;
var Request = require('./lib/request');
var url = require('url')

http.request = function (params, cb) {
    if (typeof params === 'string') {
        params = url.parse(params)
    }
    if (!params) params = {};
    if (!params.host && !params.port) {
        params.port = parseInt(window.location.port, 10);
    }
    if (!params.host && params.hostname) {
        params.host = params.hostname;
    }

    if (!params.protocol) {
        if (params.scheme) {
            params.protocol = params.scheme + ':';
        } else {
            params.protocol = window.location.protocol;
        }
    }

    if (!params.host) {
        params.host = window.location.hostname || window.location.host;
    }
    if (/:/.test(params.host)) {
        if (!params.port) {
            params.port = params.host.split(':')[1];
        }
        params.host = params.host.split(':')[0];
    }
    if (!params.port) params.port = params.protocol == 'https:' ? 443 : 80;
    
    var req = new Request(new xhrHttp, params);
    if (cb) req.on('response', cb);
    return req;
};

http.get = function (params, cb) {
    params.method = 'GET';
    var req = http.request(params, cb);
    req.end();
    return req;
};

http.Agent = function () {};
http.Agent.defaultMaxSockets = 4;

var xhrHttp = (function () {
    if (typeof window === 'undefined') {
        throw new Error('no window object present');
    }
    else if (window.XMLHttpRequest) {
        return window.XMLHttpRequest;
    }
    else if (window.ActiveXObject) {
        var axs = [
            'Msxml2.XMLHTTP.6.0',
            'Msxml2.XMLHTTP.3.0',
            'Microsoft.XMLHTTP'
        ];
        for (var i = 0; i < axs.length; i++) {
            try {
                var ax = new(window.ActiveXObject)(axs[i]);
                return function () {
                    if (ax) {
                        var ax_ = ax;
                        ax = null;
                        return ax_;
                    }
                    else {
                        return new(window.ActiveXObject)(axs[i]);
                    }
                };
            }
            catch (e) {}
        }
        throw new Error('ajax not supported in this browser')
    }
    else {
        throw new Error('ajax not supported in this browser');
    }
})();

http.STATUS_CODES = {
    100 : 'Continue',
    101 : 'Switching Protocols',
    102 : 'Processing',                 // RFC 2518, obsoleted by RFC 4918
    200 : 'OK',
    201 : 'Created',
    202 : 'Accepted',
    203 : 'Non-Authoritative Information',
    204 : 'No Content',
    205 : 'Reset Content',
    206 : 'Partial Content',
    207 : 'Multi-Status',               // RFC 4918
    300 : 'Multiple Choices',
    301 : 'Moved Permanently',
    302 : 'Moved Temporarily',
    303 : 'See Other',
    304 : 'Not Modified',
    305 : 'Use Proxy',
    307 : 'Temporary Redirect',
    400 : 'Bad Request',
    401 : 'Unauthorized',
    402 : 'Payment Required',
    403 : 'Forbidden',
    404 : 'Not Found',
    405 : 'Method Not Allowed',
    406 : 'Not Acceptable',
    407 : 'Proxy Authentication Required',
    408 : 'Request Time-out',
    409 : 'Conflict',
    410 : 'Gone',
    411 : 'Length Required',
    412 : 'Precondition Failed',
    413 : 'Request Entity Too Large',
    414 : 'Request-URI Too Large',
    415 : 'Unsupported Media Type',
    416 : 'Requested Range Not Satisfiable',
    417 : 'Expectation Failed',
    418 : 'I\'m a teapot',              // RFC 2324
    422 : 'Unprocessable Entity',       // RFC 4918
    423 : 'Locked',                     // RFC 4918
    424 : 'Failed Dependency',          // RFC 4918
    425 : 'Unordered Collection',       // RFC 4918
    426 : 'Upgrade Required',           // RFC 2817
    428 : 'Precondition Required',      // RFC 6585
    429 : 'Too Many Requests',          // RFC 6585
    431 : 'Request Header Fields Too Large',// RFC 6585
    500 : 'Internal Server Error',
    501 : 'Not Implemented',
    502 : 'Bad Gateway',
    503 : 'Service Unavailable',
    504 : 'Gateway Time-out',
    505 : 'HTTP Version Not Supported',
    506 : 'Variant Also Negotiates',    // RFC 2295
    507 : 'Insufficient Storage',       // RFC 4918
    509 : 'Bandwidth Limit Exceeded',
    510 : 'Not Extended',               // RFC 2774
    511 : 'Network Authentication Required' // RFC 6585
};
},{"./lib/request":12,"events":10,"url":35}],12:[function(require,module,exports){
var Stream = require('stream');
var Response = require('./response');
var Base64 = require('Base64');
var inherits = require('inherits');

var Request = module.exports = function (xhr, params) {
    var self = this;
    self.writable = true;
    self.xhr = xhr;
    self.body = [];
    
    self.uri = (params.protocol || 'http:') + '//'
        + params.host
        + (params.port ? ':' + params.port : '')
        + (params.path || '/')
    ;
    
    if (typeof params.withCredentials === 'undefined') {
        params.withCredentials = true;
    }

    try { xhr.withCredentials = params.withCredentials }
    catch (e) {}
    
    if (params.responseType) try { xhr.responseType = params.responseType }
    catch (e) {}
    
    xhr.open(
        params.method || 'GET',
        self.uri,
        true
    );

    xhr.onerror = function(event) {
        self.emit('error', new Error('Network error'));
    };

    self._headers = {};
    
    if (params.headers) {
        var keys = objectKeys(params.headers);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            if (!self.isSafeRequestHeader(key)) continue;
            var value = params.headers[key];
            self.setHeader(key, value);
        }
    }
    
    if (params.auth) {
        //basic auth
        this.setHeader('Authorization', 'Basic ' + Base64.btoa(params.auth));
    }

    var res = new Response;
    res.on('close', function () {
        self.emit('close');
    });
    
    res.on('ready', function () {
        self.emit('response', res);
    });

    res.on('error', function (err) {
        self.emit('error', err);
    });
    
    xhr.onreadystatechange = function () {
        // Fix for IE9 bug
        // SCRIPT575: Could not complete the operation due to error c00c023f
        // It happens when a request is aborted, calling the success callback anyway with readyState === 4
        if (xhr.__aborted) return;
        res.handle(xhr);
    };
};

inherits(Request, Stream);

Request.prototype.setHeader = function (key, value) {
    this._headers[key.toLowerCase()] = value
};

Request.prototype.getHeader = function (key) {
    return this._headers[key.toLowerCase()]
};

Request.prototype.removeHeader = function (key) {
    delete this._headers[key.toLowerCase()]
};

Request.prototype.write = function (s) {
    this.body.push(s);
};

Request.prototype.destroy = function (s) {
    this.xhr.__aborted = true;
    this.xhr.abort();
    this.emit('close');
};

Request.prototype.end = function (s) {
    if (s !== undefined) this.body.push(s);

    var keys = objectKeys(this._headers);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var value = this._headers[key];
        if (isArray(value)) {
            for (var j = 0; j < value.length; j++) {
                this.xhr.setRequestHeader(key, value[j]);
            }
        }
        else this.xhr.setRequestHeader(key, value)
    }

    if (this.body.length === 0) {
        this.xhr.send('');
    }
    else if (typeof this.body[0] === 'string') {
        this.xhr.send(this.body.join(''));
    }
    else if (isArray(this.body[0])) {
        var body = [];
        for (var i = 0; i < this.body.length; i++) {
            body.push.apply(body, this.body[i]);
        }
        this.xhr.send(body);
    }
    else if (/Array/.test(Object.prototype.toString.call(this.body[0]))) {
        var len = 0;
        for (var i = 0; i < this.body.length; i++) {
            len += this.body[i].length;
        }
        var body = new(this.body[0].constructor)(len);
        var k = 0;
        
        for (var i = 0; i < this.body.length; i++) {
            var b = this.body[i];
            for (var j = 0; j < b.length; j++) {
                body[k++] = b[j];
            }
        }
        this.xhr.send(body);
    }
    else if (isXHR2Compatible(this.body[0])) {
        this.xhr.send(this.body[0]);
    }
    else {
        var body = '';
        for (var i = 0; i < this.body.length; i++) {
            body += this.body[i].toString();
        }
        this.xhr.send(body);
    }
};

// Taken from http://dxr.mozilla.org/mozilla/mozilla-central/content/base/src/nsXMLHttpRequest.cpp.html
Request.unsafeHeaders = [
    "accept-charset",
    "accept-encoding",
    "access-control-request-headers",
    "access-control-request-method",
    "connection",
    "content-length",
    "cookie",
    "cookie2",
    "content-transfer-encoding",
    "date",
    "expect",
    "host",
    "keep-alive",
    "origin",
    "referer",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "user-agent",
    "via"
];

Request.prototype.isSafeRequestHeader = function (headerName) {
    if (!headerName) return false;
    return indexOf(Request.unsafeHeaders, headerName.toLowerCase()) === -1;
};

var objectKeys = Object.keys || function (obj) {
    var keys = [];
    for (var key in obj) keys.push(key);
    return keys;
};

var isArray = Array.isArray || function (xs) {
    return Object.prototype.toString.call(xs) === '[object Array]';
};

var indexOf = function (xs, x) {
    if (xs.indexOf) return xs.indexOf(x);
    for (var i = 0; i < xs.length; i++) {
        if (xs[i] === x) return i;
    }
    return -1;
};

var isXHR2Compatible = function (obj) {
    if (typeof Blob !== 'undefined' && obj instanceof Blob) return true;
    if (typeof ArrayBuffer !== 'undefined' && obj instanceof ArrayBuffer) return true;
    if (typeof FormData !== 'undefined' && obj instanceof FormData) return true;
};

},{"./response":13,"Base64":14,"inherits":15,"stream":33}],13:[function(require,module,exports){
var Stream = require('stream');
var util = require('util');

var Response = module.exports = function (res) {
    this.offset = 0;
    this.readable = true;
};

util.inherits(Response, Stream);

var capable = {
    streaming : true,
    status2 : true
};

function parseHeaders (res) {
    var lines = res.getAllResponseHeaders().split(/\r?\n/);
    var headers = {};
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line === '') continue;
        
        var m = line.match(/^([^:]+):\s*(.*)/);
        if (m) {
            var key = m[1].toLowerCase(), value = m[2];
            
            if (headers[key] !== undefined) {
            
                if (isArray(headers[key])) {
                    headers[key].push(value);
                }
                else {
                    headers[key] = [ headers[key], value ];
                }
            }
            else {
                headers[key] = value;
            }
        }
        else {
            headers[line] = true;
        }
    }
    return headers;
}

Response.prototype.getResponse = function (xhr) {
    var respType = String(xhr.responseType).toLowerCase();
    if (respType === 'blob') return xhr.responseBlob || xhr.response;
    if (respType === 'arraybuffer') return xhr.response;
    return xhr.responseText;
}

Response.prototype.getHeader = function (key) {
    return this.headers[key.toLowerCase()];
};

Response.prototype.handle = function (res) {
    if (res.readyState === 2 && capable.status2) {
        try {
            this.statusCode = res.status;
            this.headers = parseHeaders(res);
        }
        catch (err) {
            capable.status2 = false;
        }
        
        if (capable.status2) {
            this.emit('ready');
        }
    }
    else if (capable.streaming && res.readyState === 3) {
        try {
            if (!this.statusCode) {
                this.statusCode = res.status;
                this.headers = parseHeaders(res);
                this.emit('ready');
            }
        }
        catch (err) {}
        
        try {
            this._emitData(res);
        }
        catch (err) {
            capable.streaming = false;
        }
    }
    else if (res.readyState === 4) {
        if (!this.statusCode) {
            this.statusCode = res.status;
            this.emit('ready');
        }
        this._emitData(res);
        
        if (res.error) {
            this.emit('error', this.getResponse(res));
        }
        else this.emit('end');
        
        this.emit('close');
    }
};

Response.prototype._emitData = function (res) {
    var respBody = this.getResponse(res);
    if (respBody.toString().match(/ArrayBuffer/)) {
        this.emit('data', new Uint8Array(respBody, this.offset));
        this.offset = respBody.byteLength;
        return;
    }
    if (respBody.length > this.offset) {
        this.emit('data', respBody.slice(this.offset));
        this.offset = respBody.length;
    }
};

var isArray = Array.isArray || function (xs) {
    return Object.prototype.toString.call(xs) === '[object Array]';
};

},{"stream":33,"util":37}],14:[function(require,module,exports){
;(function () {

  var object = typeof exports != 'undefined' ? exports : this; // #8: web workers
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  function InvalidCharacterError(message) {
    this.message = message;
  }
  InvalidCharacterError.prototype = new Error;
  InvalidCharacterError.prototype.name = 'InvalidCharacterError';

  // encoder
  // [https://gist.github.com/999166] by [https://github.com/nignag]
  object.btoa || (
  object.btoa = function (input) {
    for (
      // initialize result and counter
      var block, charCode, idx = 0, map = chars, output = '';
      // if the next input index does not exist:
      //   change the mapping table to "="
      //   check if d has no fractional digits
      input.charAt(idx | 0) || (map = '=', idx % 1);
      // "8 - idx % 1 * 8" generates the sequence 2, 4, 6, 8
      output += map.charAt(63 & block >> 8 - idx % 1 * 8)
    ) {
      charCode = input.charCodeAt(idx += 3/4);
      if (charCode > 0xFF) {
        throw new InvalidCharacterError("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
      }
      block = block << 8 | charCode;
    }
    return output;
  });

  // decoder
  // [https://gist.github.com/1020396] by [https://github.com/atk]
  object.atob || (
  object.atob = function (input) {
    input = input.replace(/=+$/, '');
    if (input.length % 4 == 1) {
      throw new InvalidCharacterError("'atob' failed: The string to be decoded is not correctly encoded.");
    }
    for (
      // initialize result and counters
      var bc = 0, bs, buffer, idx = 0, output = '';
      // get next character
      buffer = input.charAt(idx++);
      // character found in table? initialize bit storage and add its ascii value;
      ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
        // and if not first of each 4 characters,
        // convert the first 8 bits to one ascii character
        bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
    ) {
      // try to find character in table (0-63, not found => -1)
      buffer = chars.indexOf(buffer);
    }
    return output;
  });

}());

},{}],15:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],16:[function(require,module,exports){
module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

},{}],17:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],18:[function(require,module,exports){
(function (global){
/*! http://mths.be/punycode v1.2.4 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports;
	var freeModule = typeof module == 'object' && module &&
		module.exports == freeExports && module;
	var freeGlobal = typeof global == 'object' && global;
	if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^ -~]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /\x2E|\u3002|\uFF0E|\uFF61/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		while (length--) {
			array[length] = fn(array[length]);
		}
		return array;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings.
	 * @private
	 * @param {String} domain The domain name.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		return map(string.split(regexSeparators), fn).join('.');
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <http://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * http://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols to a Punycode string of ASCII-only
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name to Unicode. Only the
	 * Punycoded parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it on a string that has already been converted to
	 * Unicode.
	 * @memberOf punycode
	 * @param {String} domain The Punycode domain name to convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(domain) {
		return mapDomain(domain, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name to Punycode. Only the
	 * non-ASCII parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it with a domain that's already in ASCII.
	 * @memberOf punycode
	 * @param {String} domain The domain name to convert, as a Unicode string.
	 * @returns {String} The Punycode representation of the given domain name.
	 */
	function toASCII(domain) {
		return mapDomain(domain, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.2.4',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <http://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && !freeExports.nodeType) {
		if (freeModule) { // in Node.js or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else { // in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else { // in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],19:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],20:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],21:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":19,"./encode":20}],22:[function(require,module,exports){
module.exports = require("./lib/_stream_duplex.js")

},{"./lib/_stream_duplex.js":23}],23:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

module.exports = Duplex;

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
}
/*</replacement>*/


/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

forEach(objectKeys(Writable.prototype), function(method) {
  if (!Duplex.prototype[method])
    Duplex.prototype[method] = Writable.prototype[method];
});

function Duplex(options) {
  if (!(this instanceof Duplex))
    return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false)
    this.readable = false;

  if (options && options.writable === false)
    this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false)
    this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended)
    return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  process.nextTick(this.end.bind(this));
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

}).call(this,require('_process'))

},{"./_stream_readable":25,"./_stream_writable":27,"_process":17,"core-util-is":28,"inherits":15}],24:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough))
    return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function(chunk, encoding, cb) {
  cb(null, chunk);
};

},{"./_stream_transform":26,"core-util-is":28,"inherits":15}],25:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Readable;

/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/


/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Readable.ReadableState = ReadableState;

var EE = require('events').EventEmitter;

/*<replacement>*/
if (!EE.listenerCount) EE.listenerCount = function(emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

var Stream = require('stream');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var StringDecoder;


/*<replacement>*/
var debug = require('util');
if (debug && debug.debuglog) {
  debug = debug.debuglog('stream');
} else {
  debug = function () {};
}
/*</replacement>*/


util.inherits(Readable, Stream);

function ReadableState(options, stream) {
  var Duplex = require('./_stream_duplex');

  options = options || {};

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  var defaultHwm = options.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.buffer = [];
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;


  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex)
    this.objectMode = this.objectMode || !!options.readableObjectMode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // when piping, we only care about 'readable' events that happen
  // after read()ing all the bytes and not getting any pushback.
  this.ranOut = false;

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder)
      StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  var Duplex = require('./_stream_duplex');

  if (!(this instanceof Readable))
    return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  Stream.call(this);
}

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function(chunk, encoding) {
  var state = this._readableState;

  if (util.isString(chunk) && !state.objectMode) {
    encoding = encoding || state.defaultEncoding;
    if (encoding !== state.encoding) {
      chunk = new Buffer(chunk, encoding);
      encoding = '';
    }
  }

  return readableAddChunk(this, state, chunk, encoding, false);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function(chunk) {
  var state = this._readableState;
  return readableAddChunk(this, state, chunk, '', true);
};

function readableAddChunk(stream, state, chunk, encoding, addToFront) {
  var er = chunkInvalid(state, chunk);
  if (er) {
    stream.emit('error', er);
  } else if (util.isNullOrUndefined(chunk)) {
    state.reading = false;
    if (!state.ended)
      onEofChunk(stream, state);
  } else if (state.objectMode || chunk && chunk.length > 0) {
    if (state.ended && !addToFront) {
      var e = new Error('stream.push() after EOF');
      stream.emit('error', e);
    } else if (state.endEmitted && addToFront) {
      var e = new Error('stream.unshift() after end event');
      stream.emit('error', e);
    } else {
      if (state.decoder && !addToFront && !encoding)
        chunk = state.decoder.write(chunk);

      if (!addToFront)
        state.reading = false;

      // if we want the data now, just emit it.
      if (state.flowing && state.length === 0 && !state.sync) {
        stream.emit('data', chunk);
        stream.read(0);
      } else {
        // update the buffer info.
        state.length += state.objectMode ? 1 : chunk.length;
        if (addToFront)
          state.buffer.unshift(chunk);
        else
          state.buffer.push(chunk);

        if (state.needReadable)
          emitReadable(stream);
      }

      maybeReadMore(stream, state);
    }
  } else if (!addToFront) {
    state.reading = false;
  }

  return needMoreData(state);
}



// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended &&
         (state.needReadable ||
          state.length < state.highWaterMark ||
          state.length === 0);
}

// backwards compatibility.
Readable.prototype.setEncoding = function(enc) {
  if (!StringDecoder)
    StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
  return this;
};

// Don't raise the hwm > 128MB
var MAX_HWM = 0x800000;
function roundUpToNextPowerOf2(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2
    n--;
    for (var p = 1; p < 32; p <<= 1) n |= n >> p;
    n++;
  }
  return n;
}

function howMuchToRead(n, state) {
  if (state.length === 0 && state.ended)
    return 0;

  if (state.objectMode)
    return n === 0 ? 0 : 1;

  if (isNaN(n) || util.isNull(n)) {
    // only flow one buffer at a time
    if (state.flowing && state.buffer.length)
      return state.buffer[0].length;
    else
      return state.length;
  }

  if (n <= 0)
    return 0;

  // If we're asking for more than the target buffer level,
  // then raise the water mark.  Bump up to the next highest
  // power of 2, to prevent increasing it excessively in tiny
  // amounts.
  if (n > state.highWaterMark)
    state.highWaterMark = roundUpToNextPowerOf2(n);

  // don't have that much.  return null, unless we've ended.
  if (n > state.length) {
    if (!state.ended) {
      state.needReadable = true;
      return 0;
    } else
      return state.length;
  }

  return n;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function(n) {
  debug('read', n);
  var state = this._readableState;
  var nOrig = n;

  if (!util.isNumber(n) || n > 0)
    state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 &&
      state.needReadable &&
      (state.length >= state.highWaterMark || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended)
      endReadable(this);
    else
      emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0)
      endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  }

  if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0)
      state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
  }

  // If _read pushed data synchronously, then `reading` will be false,
  // and we need to re-evaluate how much data we can return to the user.
  if (doRead && !state.reading)
    n = howMuchToRead(nOrig, state);

  var ret;
  if (n > 0)
    ret = fromList(n, state);
  else
    ret = null;

  if (util.isNull(ret)) {
    state.needReadable = true;
    n = 0;
  }

  state.length -= n;

  // If we have nothing in the buffer, then we want to know
  // as soon as we *do* get something into the buffer.
  if (state.length === 0 && !state.ended)
    state.needReadable = true;

  // If we tried to read() past the EOF, then emit end on the next tick.
  if (nOrig !== n && state.ended && state.length === 0)
    endReadable(this);

  if (!util.isNull(ret))
    this.emit('data', ret);

  return ret;
};

function chunkInvalid(state, chunk) {
  var er = null;
  if (!util.isBuffer(chunk) &&
      !util.isString(chunk) &&
      !util.isNullOrUndefined(chunk) &&
      !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}


function onEofChunk(stream, state) {
  if (state.decoder && !state.ended) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // emit 'readable' now to make sure it gets picked up.
  emitReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    if (state.sync)
      process.nextTick(function() {
        emitReadable_(stream);
      });
    else
      emitReadable_(stream);
  }
}

function emitReadable_(stream) {
  debug('emit readable');
  stream.emit('readable');
  flow(stream);
}


// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    process.nextTick(function() {
      maybeReadMore_(stream, state);
    });
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended &&
         state.length < state.highWaterMark) {
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;
    else
      len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function(n) {
  this.emit('error', new Error('not implemented'));
};

Readable.prototype.pipe = function(dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

  var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
              dest !== process.stdout &&
              dest !== process.stderr;

  var endFn = doEnd ? onend : cleanup;
  if (state.endEmitted)
    process.nextTick(endFn);
  else
    src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable) {
    debug('onunpipe');
    if (readable === src) {
      cleanup();
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', cleanup);
    src.removeListener('data', ondata);

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain &&
        (!dest._writableState || dest._writableState.needDrain))
      ondrain();
  }

  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    var ret = dest.write(chunk);
    if (false === ret) {
      debug('false write response, pause',
            src._readableState.awaitDrain);
      src._readableState.awaitDrain++;
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EE.listenerCount(dest, 'error') === 0)
      dest.emit('error', er);
  }
  // This is a brutally ugly hack to make sure that our error handler
  // is attached before any userland ones.  NEVER DO THIS.
  if (!dest._events || !dest._events.error)
    dest.on('error', onerror);
  else if (isArray(dest._events.error))
    dest._events.error.unshift(onerror);
  else
    dest._events.error = [onerror, dest._events.error];



  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function() {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain)
      state.awaitDrain--;
    if (state.awaitDrain === 0 && EE.listenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}


Readable.prototype.unpipe = function(dest) {
  var state = this._readableState;

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0)
    return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes)
      return this;

    if (!dest)
      dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest)
      dest.emit('unpipe', this);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var i = 0; i < len; i++)
      dests[i].emit('unpipe', this);
    return this;
  }

  // try to find the right one.
  var i = indexOf(state.pipes, dest);
  if (i === -1)
    return this;

  state.pipes.splice(i, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1)
    state.pipes = state.pipes[0];

  dest.emit('unpipe', this);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function(ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  // If listening to data, and it has not explicitly been paused,
  // then call resume to start the flow of data on the next tick.
  if (ev === 'data' && false !== this._readableState.flowing) {
    this.resume();
  }

  if (ev === 'readable' && this.readable) {
    var state = this._readableState;
    if (!state.readableListening) {
      state.readableListening = true;
      state.emittedReadable = false;
      state.needReadable = true;
      if (!state.reading) {
        var self = this;
        process.nextTick(function() {
          debug('readable nexttick read 0');
          self.read(0);
        });
      } else if (state.length) {
        emitReadable(this, state);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function() {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    state.flowing = true;
    if (!state.reading) {
      debug('resume read 0');
      this.read(0);
    }
    resume(this, state);
  }
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    process.nextTick(function() {
      resume_(stream, state);
    });
  }
}

function resume_(stream, state) {
  state.resumeScheduled = false;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading)
    stream.read(0);
}

Readable.prototype.pause = function() {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (false !== this._readableState.flowing) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  if (state.flowing) {
    do {
      var chunk = stream.read();
    } while (null !== chunk && state.flowing);
  }
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function(stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function() {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length)
        self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function(chunk) {
    debug('wrapped data');
    if (state.decoder)
      chunk = state.decoder.write(chunk);
    if (!chunk || !state.objectMode && !chunk.length)
      return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (util.isFunction(stream[i]) && util.isUndefined(this[i])) {
      this[i] = function(method) { return function() {
        return stream[method].apply(stream, arguments);
      }}(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  forEach(events, function(ev) {
    stream.on(ev, self.emit.bind(self, ev));
  });

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function(n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};



// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
function fromList(n, state) {
  var list = state.buffer;
  var length = state.length;
  var stringMode = !!state.decoder;
  var objectMode = !!state.objectMode;
  var ret;

  // nothing in the list, definitely empty.
  if (list.length === 0)
    return null;

  if (length === 0)
    ret = null;
  else if (objectMode)
    ret = list.shift();
  else if (!n || n >= length) {
    // read it all, truncate the array.
    if (stringMode)
      ret = list.join('');
    else
      ret = Buffer.concat(list, length);
    list.length = 0;
  } else {
    // read just some of it.
    if (n < list[0].length) {
      // just take a part of the first list item.
      // slice is the same for buffers and strings.
      var buf = list[0];
      ret = buf.slice(0, n);
      list[0] = buf.slice(n);
    } else if (n === list[0].length) {
      // first list is a perfect match
      ret = list.shift();
    } else {
      // complex case.
      // we have enough to cover it, but it spans past the first buffer.
      if (stringMode)
        ret = '';
      else
        ret = new Buffer(n);

      var c = 0;
      for (var i = 0, l = list.length; i < l && c < n; i++) {
        var buf = list[0];
        var cpy = Math.min(n - c, buf.length);

        if (stringMode)
          ret += buf.slice(0, cpy);
        else
          buf.copy(ret, c, 0, cpy);

        if (cpy < buf.length)
          list[0] = buf.slice(cpy);
        else
          list.shift();

        c += cpy;
      }
    }
  }

  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0)
    throw new Error('endReadable called on non-empty stream');

  if (!state.endEmitted) {
    state.ended = true;
    process.nextTick(function() {
      // Check that we didn't get one last unshift.
      if (!state.endEmitted && state.length === 0) {
        state.endEmitted = true;
        stream.readable = false;
        stream.emit('end');
      }
    });
  }
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf (xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}

}).call(this,require('_process'))

},{"./_stream_duplex":23,"_process":17,"buffer":6,"core-util-is":28,"events":10,"inherits":15,"isarray":16,"stream":33,"string_decoder/":34,"util":5}],26:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.


// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);


function TransformState(options, stream) {
  this.afterTransform = function(er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb)
    return stream.emit('error', new Error('no writecb in Transform class'));

  ts.writechunk = null;
  ts.writecb = null;

  if (!util.isNullOrUndefined(data))
    stream.push(data);

  if (cb)
    cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}


function Transform(options) {
  if (!(this instanceof Transform))
    return new Transform(options);

  Duplex.call(this, options);

  this._transformState = new TransformState(options, this);

  // when the writable side finishes, then flush out anything remaining.
  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  this.once('prefinish', function() {
    if (util.isFunction(this._flush))
      this._flush(function(er) {
        done(stream, er);
      });
    else
      done(stream);
  });
}

Transform.prototype.push = function(chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function(chunk, encoding, cb) {
  throw new Error('not implemented');
};

Transform.prototype._write = function(chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform ||
        rs.needReadable ||
        rs.length < rs.highWaterMark)
      this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function(n) {
  var ts = this._transformState;

  if (!util.isNull(ts.writechunk) && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};


function done(stream, er) {
  if (er)
    return stream.emit('error', er);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var ts = stream._transformState;

  if (ws.length)
    throw new Error('calling transform done when ws.length != 0');

  if (ts.transforming)
    throw new Error('calling transform done when still transforming');

  return stream.push(null);
}

},{"./_stream_duplex":23,"core-util-is":28,"inherits":15}],27:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, cb), and it'll handle all
// the drain event emission and buffering.

module.exports = Writable;

/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Writable.WritableState = WritableState;


/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Stream = require('stream');

util.inherits(Writable, Stream);

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
}

function WritableState(options, stream) {
  var Duplex = require('./_stream_duplex');

  options = options || {};

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  var defaultHwm = options.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex)
    this.objectMode = this.objectMode || !!options.writableObjectMode;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function(er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.buffer = [];

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;
}

function Writable(options) {
  var Duplex = require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, though they're not
  // instanceof Writable, they're instanceof Readable.
  if (!(this instanceof Writable) && !(this instanceof Duplex))
    return new Writable(options);

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function() {
  this.emit('error', new Error('Cannot pipe. Not readable.'));
};


function writeAfterEnd(stream, state, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  process.nextTick(function() {
    cb(er);
  });
}

// If we get something that is not a buffer, string, null, or undefined,
// and we're not in objectMode, then that's an error.
// Otherwise stream chunks are all considered to be of length=1, and the
// watermarks determine how many objects to keep in the buffer, rather than
// how many bytes or characters.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  if (!util.isBuffer(chunk) &&
      !util.isString(chunk) &&
      !util.isNullOrUndefined(chunk) &&
      !state.objectMode) {
    var er = new TypeError('Invalid non-string/buffer chunk');
    stream.emit('error', er);
    process.nextTick(function() {
      cb(er);
    });
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function(chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  if (util.isFunction(encoding)) {
    cb = encoding;
    encoding = null;
  }

  if (util.isBuffer(chunk))
    encoding = 'buffer';
  else if (!encoding)
    encoding = state.defaultEncoding;

  if (!util.isFunction(cb))
    cb = function() {};

  if (state.ended)
    writeAfterEnd(this, state, cb);
  else if (validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, chunk, encoding, cb);
  }

  return ret;
};

Writable.prototype.cork = function() {
  var state = this._writableState;

  state.corked++;
};

Writable.prototype.uncork = function() {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;

    if (!state.writing &&
        !state.corked &&
        !state.finished &&
        !state.bufferProcessing &&
        state.buffer.length)
      clearBuffer(this, state);
  }
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode &&
      state.decodeStrings !== false &&
      util.isString(chunk)) {
    chunk = new Buffer(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, chunk, encoding, cb) {
  chunk = decodeChunk(state, chunk, encoding);
  if (util.isBuffer(chunk))
    encoding = 'buffer';
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret)
    state.needDrain = true;

  if (state.writing || state.corked)
    state.buffer.push(new WriteReq(chunk, encoding, cb));
  else
    doWrite(stream, state, false, len, chunk, encoding, cb);

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (writev)
    stream._writev(chunk, state.onwrite);
  else
    stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  if (sync)
    process.nextTick(function() {
      state.pendingcb--;
      cb(er);
    });
  else {
    state.pendingcb--;
    cb(er);
  }

  stream._writableState.errorEmitted = true;
  stream.emit('error', er);
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er)
    onwriteError(stream, state, sync, er, cb);
  else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(stream, state);

    if (!finished &&
        !state.corked &&
        !state.bufferProcessing &&
        state.buffer.length) {
      clearBuffer(stream, state);
    }

    if (sync) {
      process.nextTick(function() {
        afterWrite(stream, state, finished, cb);
      });
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished)
    onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}


// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;

  if (stream._writev && state.buffer.length > 1) {
    // Fast case, write everything using _writev()
    var cbs = [];
    for (var c = 0; c < state.buffer.length; c++)
      cbs.push(state.buffer[c].callback);

    // count the one we are adding, as well.
    // TODO(isaacs) clean this up
    state.pendingcb++;
    doWrite(stream, state, true, state.length, state.buffer, '', function(err) {
      for (var i = 0; i < cbs.length; i++) {
        state.pendingcb--;
        cbs[i](err);
      }
    });

    // Clear buffer
    state.buffer = [];
  } else {
    // Slow case, write chunks one-by-one
    for (var c = 0; c < state.buffer.length; c++) {
      var entry = state.buffer[c];
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;

      doWrite(stream, state, false, len, chunk, encoding, cb);

      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        c++;
        break;
      }
    }

    if (c < state.buffer.length)
      state.buffer = state.buffer.slice(c);
    else
      state.buffer.length = 0;
  }

  state.bufferProcessing = false;
}

Writable.prototype._write = function(chunk, encoding, cb) {
  cb(new Error('not implemented'));

};

Writable.prototype._writev = null;

Writable.prototype.end = function(chunk, encoding, cb) {
  var state = this._writableState;

  if (util.isFunction(chunk)) {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (util.isFunction(encoding)) {
    cb = encoding;
    encoding = null;
  }

  if (!util.isNullOrUndefined(chunk))
    this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished)
    endWritable(this, state, cb);
};


function needFinish(stream, state) {
  return (state.ending &&
          state.length === 0 &&
          !state.finished &&
          !state.writing);
}

function prefinish(stream, state) {
  if (!state.prefinished) {
    state.prefinished = true;
    stream.emit('prefinish');
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(stream, state);
  if (need) {
    if (state.pendingcb === 0) {
      prefinish(stream, state);
      state.finished = true;
      stream.emit('finish');
    } else
      prefinish(stream, state);
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished)
      process.nextTick(cb);
    else
      stream.once('finish', cb);
  }
  state.ended = true;
}

}).call(this,require('_process'))

},{"./_stream_duplex":23,"_process":17,"buffer":6,"core-util-is":28,"inherits":15,"stream":33}],28:[function(require,module,exports){
(function (Buffer){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

function isBuffer(arg) {
  return Buffer.isBuffer(arg);
}
exports.isBuffer = isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}
}).call(this,require("buffer").Buffer)

},{"buffer":6}],29:[function(require,module,exports){
module.exports = require("./lib/_stream_passthrough.js")

},{"./lib/_stream_passthrough.js":24}],30:[function(require,module,exports){
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = require('stream');
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":23,"./lib/_stream_passthrough.js":24,"./lib/_stream_readable.js":25,"./lib/_stream_transform.js":26,"./lib/_stream_writable.js":27,"stream":33}],31:[function(require,module,exports){
module.exports = require("./lib/_stream_transform.js")

},{"./lib/_stream_transform.js":26}],32:[function(require,module,exports){
module.exports = require("./lib/_stream_writable.js")

},{"./lib/_stream_writable.js":27}],33:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = require('events').EventEmitter;
var inherits = require('inherits');

inherits(Stream, EE);
Stream.Readable = require('readable-stream/readable.js');
Stream.Writable = require('readable-stream/writable.js');
Stream.Duplex = require('readable-stream/duplex.js');
Stream.Transform = require('readable-stream/transform.js');
Stream.PassThrough = require('readable-stream/passthrough.js');

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":10,"inherits":15,"readable-stream/duplex.js":22,"readable-stream/passthrough.js":29,"readable-stream/readable.js":30,"readable-stream/transform.js":31,"readable-stream/writable.js":32}],34:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var Buffer = require('buffer').Buffer;

var isBufferEncoding = Buffer.isEncoding
  || function(encoding) {
       switch (encoding && encoding.toLowerCase()) {
         case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
         default: return false;
       }
     }


function assertEncoding(encoding) {
  if (encoding && !isBufferEncoding(encoding)) {
    throw new Error('Unknown encoding: ' + encoding);
  }
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters. CESU-8 is handled as part of the UTF-8 encoding.
//
// @TODO Handling all encodings inside a single object makes it very difficult
// to reason about this code, so it should be split up in the future.
// @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
// points as used by CESU-8.
var StringDecoder = exports.StringDecoder = function(encoding) {
  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
  assertEncoding(encoding);
  switch (this.encoding) {
    case 'utf8':
      // CESU-8 represents each of Surrogate Pair by 3-bytes
      this.surrogateSize = 3;
      break;
    case 'ucs2':
    case 'utf16le':
      // UTF-16 represents each of Surrogate Pair by 2-bytes
      this.surrogateSize = 2;
      this.detectIncompleteChar = utf16DetectIncompleteChar;
      break;
    case 'base64':
      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
      this.surrogateSize = 3;
      this.detectIncompleteChar = base64DetectIncompleteChar;
      break;
    default:
      this.write = passThroughWrite;
      return;
  }

  // Enough space to store all bytes of a single character. UTF-8 needs 4
  // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
  this.charBuffer = new Buffer(6);
  // Number of bytes received for the current incomplete multi-byte character.
  this.charReceived = 0;
  // Number of bytes expected for the current incomplete multi-byte character.
  this.charLength = 0;
};


// write decodes the given buffer and returns it as JS string that is
// guaranteed to not contain any partial multi-byte characters. Any partial
// character found at the end of the buffer is buffered up, and will be
// returned when calling write again with the remaining bytes.
//
// Note: Converting a Buffer containing an orphan surrogate to a String
// currently works, but converting a String to a Buffer (via `new Buffer`, or
// Buffer#write) will replace incomplete surrogates with the unicode
// replacement character. See https://codereview.chromium.org/121173009/ .
StringDecoder.prototype.write = function(buffer) {
  var charStr = '';
  // if our last write ended with an incomplete multibyte character
  while (this.charLength) {
    // determine how many remaining bytes this buffer has to offer for this char
    var available = (buffer.length >= this.charLength - this.charReceived) ?
        this.charLength - this.charReceived :
        buffer.length;

    // add the new bytes to the char buffer
    buffer.copy(this.charBuffer, this.charReceived, 0, available);
    this.charReceived += available;

    if (this.charReceived < this.charLength) {
      // still not enough chars in this buffer? wait for more ...
      return '';
    }

    // remove bytes belonging to the current character from the buffer
    buffer = buffer.slice(available, buffer.length);

    // get the character that was split
    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

    // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
    var charCode = charStr.charCodeAt(charStr.length - 1);
    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
      this.charLength += this.surrogateSize;
      charStr = '';
      continue;
    }
    this.charReceived = this.charLength = 0;

    // if there are no more bytes in this buffer, just emit our char
    if (buffer.length === 0) {
      return charStr;
    }
    break;
  }

  // determine and set charLength / charReceived
  this.detectIncompleteChar(buffer);

  var end = buffer.length;
  if (this.charLength) {
    // buffer the incomplete character bytes we got
    buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
    end -= this.charReceived;
  }

  charStr += buffer.toString(this.encoding, 0, end);

  var end = charStr.length - 1;
  var charCode = charStr.charCodeAt(end);
  // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
    var size = this.surrogateSize;
    this.charLength += size;
    this.charReceived += size;
    this.charBuffer.copy(this.charBuffer, size, 0, size);
    buffer.copy(this.charBuffer, 0, 0, size);
    return charStr.substring(0, end);
  }

  // or just emit the charStr
  return charStr;
};

// detectIncompleteChar determines if there is an incomplete UTF-8 character at
// the end of the given buffer. If so, it sets this.charLength to the byte
// length that character, and sets this.charReceived to the number of bytes
// that are available for this character.
StringDecoder.prototype.detectIncompleteChar = function(buffer) {
  // determine how many bytes we have to check at the end of this buffer
  var i = (buffer.length >= 3) ? 3 : buffer.length;

  // Figure out if one of the last i bytes of our buffer announces an
  // incomplete char.
  for (; i > 0; i--) {
    var c = buffer[buffer.length - i];

    // See http://en.wikipedia.org/wiki/UTF-8#Description

    // 110XXXXX
    if (i == 1 && c >> 5 == 0x06) {
      this.charLength = 2;
      break;
    }

    // 1110XXXX
    if (i <= 2 && c >> 4 == 0x0E) {
      this.charLength = 3;
      break;
    }

    // 11110XXX
    if (i <= 3 && c >> 3 == 0x1E) {
      this.charLength = 4;
      break;
    }
  }
  this.charReceived = i;
};

StringDecoder.prototype.end = function(buffer) {
  var res = '';
  if (buffer && buffer.length)
    res = this.write(buffer);

  if (this.charReceived) {
    var cr = this.charReceived;
    var buf = this.charBuffer;
    var enc = this.encoding;
    res += buf.slice(0, cr).toString(enc);
  }

  return res;
};

function passThroughWrite(buffer) {
  return buffer.toString(this.encoding);
}

function utf16DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 2;
  this.charLength = this.charReceived ? 2 : 0;
}

function base64DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 3;
  this.charLength = this.charReceived ? 3 : 0;
}

},{"buffer":6}],35:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var punycode = require('punycode');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a puny coded representation of "domain".
      // It only converts the part of the domain name that
      // has non ASCII characters. I.e. it dosent matter if
      // you call it with a domain that already is in ASCII.
      var domainArray = this.hostname.split('.');
      var newOut = [];
      for (var i = 0; i < domainArray.length; ++i) {
        var s = domainArray[i];
        newOut.push(s.match(/[^A-Za-z0-9_-]/) ?
            'xn--' + punycode.encode(s) : s);
      }
      this.hostname = newOut.join('.');
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  Object.keys(this).forEach(function(k) {
    result[k] = this[k];
  }, this);

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    Object.keys(relative).forEach(function(k) {
      if (k !== 'protocol')
        result[k] = relative[k];
    });

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      Object.keys(relative).forEach(function(k) {
        result[k] = relative[k];
      });
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especialy happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!isNull(result.pathname) || !isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host) && (last === '.' || last === '..') ||
      last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last == '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especialy happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!isNull(result.pathname) || !isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

function isString(arg) {
  return typeof arg === "string";
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isNull(arg) {
  return arg === null;
}
function isNullOrUndefined(arg) {
  return  arg == null;
}

},{"punycode":18,"querystring":21}],36:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],37:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./support/isBuffer":36,"_process":17,"inherits":15}],38:[function(require,module,exports){
// var words = ["a", "b", "c", "D", "e", "f", "g"];
"use strict";

function randomotp() {
   var rpc = require("../rpc");
   var config = require("../config");
   var db = require("../db");
   var words = require("../words");
   words = words.Words;
   var remote = config.Remotes[4];
   rpc.Request(remote, "status", [], function (res, err) {
      var h = res.LatestBlockHeight;
      console.log(h);
      h = Math.floor(h / 100) * 100;
      console.log(h);
      localStorage.setItem("height", h);
   });
   var height = localStorage.getItem("height");
   console.log("now fetching", height);
   function refresh() {
      var address = document.getElementById("input").value;
      var random = CryptoJS.SHA256(res.BlockMeta.Hash + address);
      var r = parseInt("0x" + random);
      console.log("words");
      console.log(words.length);
      a = [0, 1, 2, 3, 4];
      r = a.map(function (x) {
         return words[r % (words.length - x)];
      });
      document.getElementById("text").innerHTML = JSON.stringify(r, null, 4);
   }
   rpc.Request(remote, "get_block", [parseInt(height)], function (res, err) {
      console.log(document.getElementById("input").value);
      setInterval(refresh, 1000);
   });
}
module.exports = {
   RandomOTP: randomotp };

},{"../config":2,"../db":3,"../rpc":39,"../words":41}],39:[function(require,module,exports){
"use strict";

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
    id: null });
  var options = {
    host: remote.host,
    port: remote.port,
    path: "/",
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": rpcRequest.length } };
  var req = require("http").request(options, function (res) {
    var resData = "";
    //res.setEncoding("utf8");
    res.on("data", function (chunk) {
      resData += chunk;
    });
    res.on("end", function () {
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
    id: null });
  var request = new XMLHttpRequest();
  request.onreadystatechange = function () {
    if (request.readyState === 4) {
      var resJSON = JSON.parse(request.responseText);
      if (resJSON.jsonrpc == "2.0") {
        return callback(resJSON.result, resJSON.error);
      } else {
        return callback("node down", "Response is not jsonrpc 2.0");
      }
    }
  };
  request.open("POST", "http://" + remote.host + ":" + remote.port + "/", true);
  request.send(rpcRequest);
}
;

// path:     The file path to download from the server.
// dest:     The local destination of the downloaded file.
// callback: function(error){}
function Download(remote, path, dest, callback) {
  if (!path || !dest) {
    throw "rpc.Download requires path and dest";
  }
  if (!config.IsNodeJs()) {
    throw "rpc.Download not supported in the browser";
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
      "Content-Length": postData.length } };
  var req = require("http").request(options, function (res) {
    // Handle error.
    if (res.statusCode != 200) {
      var resData = "";
      res.setEncoding("utf8");
      res.on("data", function (chunk) {
        resData += chunk;
      });
      res.on("end", function () {
        if (!resData) {
          resData = "Unknown error";
        }
        callback(resData);
      });
      return;
    }
    // 200 status code.
    var stream = require("fs").createWriteStream(dest);
    stream.once("open", function (fd) {
      res.on("data", function (chunk) {
        stream.write(chunk);
      });
      res.on("end", function () {
        stream.end();
        callback(null);
      });
      res.on("error", function (err) {
        callback(err.message);
      });
    });
  });
  req.write(postData);
  req.end();
}

module.exports = {
  Request: Request,
  Download: Download };

},{"../config":2,"fs":4,"http":11,"querystring":21}],40:[function(require,module,exports){
// TX TYPES
"use strict";

exports.TxTypeSend = 1;
exports.TxTypeCall = 2;
exports.TxTypeBond = 17;
exports.TxTypeUnbond = 18;
exports.TxTypeRebond = 19;
exports.TxTypeDupeout = 20;

// PUBKEY TYPES
exports.PubKeyTypeNil = 0;
exports.PubKeyTypeEd25519 = 1;

// PRIVKEY TYPES
//exports.PrivKeyTypeNil =     0x00;
exports.PrivKeyTypeEd25519 = 1;

},{}],41:[function(require,module,exports){
"use strict";var Words=["a", "b", "c", "d"];module.exports = {Words:Words};

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS96YWNrL0hhY2tpbmcvdGVuZGVybWludC1qcy9pbmRleC5qcyIsIi9ob21lL3phY2svSGFja2luZy90ZW5kZXJtaW50LWpzL2NvbmZpZy9pbmRleC5qcyIsIi9ob21lL3phY2svSGFja2luZy90ZW5kZXJtaW50LWpzL2RiL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbGliL19lbXB0eS5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL25vZGVfbW9kdWxlcy9iYXNlNjQtanMvbGliL2I2NC5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL25vZGVfbW9kdWxlcy9pcy1hcnJheS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2h0dHAtYnJvd3NlcmlmeS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9odHRwLWJyb3dzZXJpZnkvbGliL3JlcXVlc3QuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaHR0cC1icm93c2VyaWZ5L2xpYi9yZXNwb25zZS5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9odHRwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL0Jhc2U2NC9iYXNlNjQuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5oZXJpdHMvaW5oZXJpdHNfYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pc2FycmF5L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wdW55Y29kZS9wdW55Y29kZS5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9xdWVyeXN0cmluZy1lczMvZGVjb2RlLmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3F1ZXJ5c3RyaW5nLWVzMy9lbmNvZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcXVlcnlzdHJpbmctZXMzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3JlYWRhYmxlLXN0cmVhbS9kdXBsZXguanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcmVhZGFibGUtc3RyZWFtL2xpYi9fc3RyZWFtX2R1cGxleC5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9yZWFkYWJsZS1zdHJlYW0vbGliL19zdHJlYW1fcGFzc3Rocm91Z2guanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcmVhZGFibGUtc3RyZWFtL2xpYi9fc3RyZWFtX3JlYWRhYmxlLmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3JlYWRhYmxlLXN0cmVhbS9saWIvX3N0cmVhbV90cmFuc2Zvcm0uanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcmVhZGFibGUtc3RyZWFtL2xpYi9fc3RyZWFtX3dyaXRhYmxlLmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3JlYWRhYmxlLXN0cmVhbS9ub2RlX21vZHVsZXMvY29yZS11dGlsLWlzL2xpYi91dGlsLmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3JlYWRhYmxlLXN0cmVhbS9wYXNzdGhyb3VnaC5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9yZWFkYWJsZS1zdHJlYW0vcmVhZGFibGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcmVhZGFibGUtc3RyZWFtL3RyYW5zZm9ybS5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9yZWFkYWJsZS1zdHJlYW0vd3JpdGFibGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvc3RyZWFtLWJyb3dzZXJpZnkvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvc3RyaW5nX2RlY29kZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXJsL3VybC5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3N1cHBvcnQvaXNCdWZmZXJCcm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3V0aWwvdXRpbC5qcyIsIi9ob21lL3phY2svSGFja2luZy90ZW5kZXJtaW50LWpzL3JhbmRvbW90cC9pbmRleC5qcyIsIi9ob21lL3phY2svSGFja2luZy90ZW5kZXJtaW50LWpzL3JwYy9pbmRleC5qcyIsIi9ob21lL3phY2svSGFja2luZy90ZW5kZXJtaW50LWpzL3R5cGVzL2luZGV4LmpzIiwiL2hvbWUvemFjay9IYWNraW5nL3RlbmRlcm1pbnQtanMvd29yZHMvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztBQ0FBLElBQUksR0FBRyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMzQixJQUFJLEtBQUssR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDL0IsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pDLElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN6QixJQUFJLEtBQUssR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDL0IsSUFBSSxTQUFTLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3ZDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUU7QUFDdEIsUUFBTSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7Q0FDMUI7Ozs7O0FDUkQsU0FBUyxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRTtBQUMxQixTQUFPO0FBQ0wsUUFBSSxFQUFFLElBQUk7QUFDVixRQUFJLEVBQUUsSUFBSTtHQUNYLENBQUM7Q0FDSDs7QUFFRCxJQUFJLE9BQU8sR0FBRyxDQUNaLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsRUFDOUIsTUFBTSxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxFQUM5QixNQUFNLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxFQUM3QixNQUFNLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLEVBQzlCLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsRUFDL0IsTUFBTSxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxFQUM5QixNQUFNLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLEVBQy9CLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsRUFDOUIsTUFBTSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsRUFDN0IsTUFBTSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsRUFDN0IsTUFBTSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FDOUIsQ0FBQzs7QUFFRixTQUFTLFFBQVEsR0FBRztBQUNsQixTQUFPLE9BQVEsTUFBTSxBQUFDLElBQUksUUFBUSxDQUFDO0NBQ3BDOztBQUVELE1BQU0sQ0FBQyxPQUFPLEdBQUc7QUFDZixTQUFPLEVBQUUsT0FBTztBQUNoQixVQUFRLEVBQUUsUUFBUSxFQUNuQixDQUFDOzs7OztBQzVCRixTQUFTLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFO0FBQ3JCLFdBQU8sY0FBYyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUM7Q0FDckM7O0FBRUQsU0FBUyxHQUFHLENBQUMsR0FBRyxFQUFFO0FBQ2QsV0FBTyxjQUFjLENBQUMsR0FBRyxDQUFDO0NBQzdCOztBQUVELE1BQU0sQ0FBQyxPQUFPLEdBQUc7QUFDZixPQUFHLEVBQUUsR0FBRztBQUNSLE9BQUcsRUFBRSxHQUFHLEVBQ1QsQ0FBQzs7O0FDWEY7Ozs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbnpDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDak5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMzZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTs7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDekZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3Y3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNqTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDN2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMxR0E7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7O0FDREE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9IQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuc0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7OztBQ3prQkEsU0FBUyxTQUFTLEdBQUc7QUFDakIsT0FBSSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQzVCLE9BQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNsQyxPQUFJLEVBQUUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDMUIsT0FBSSxLQUFLLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2hDLFFBQUssR0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO0FBQ2xCLE9BQUksTUFBTSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0IsTUFBRyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxVQUFTLEdBQUcsRUFBRSxHQUFHLEVBQUU7QUFDeEQsVUFBSSxDQUFDLEdBQUcsR0FBRyxrQkFBcUIsQ0FBQztBQUNqQyxhQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2YsT0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFDLEdBQUcsQ0FBQyxHQUFDLEdBQUcsQ0FBQztBQUMxQixhQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2Ysa0JBQVksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzlCLENBQUMsQ0FBQztBQUNILE9BQUksTUFBTSxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDNUMsVUFBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDcEMsWUFBUyxPQUFPLEdBQUc7QUFDdEIsVUFBSSxPQUFPLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDckQsVUFBSSxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLFVBQWEsS0FBUSxHQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQy9ELFVBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxJQUFJLEdBQUMsTUFBTSxDQUFDLENBQUM7QUFDOUIsYUFBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtBQUNwQixhQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQTtBQUN6QixPQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFDbkIsT0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBRSxnQkFBTyxLQUFLLENBQUMsQ0FBQyxJQUFFLEtBQUssQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxDQUFDO09BQUUsQ0FBQyxDQUFDO0FBQzVELGNBQVEsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNuRTtBQUNELE1BQUcsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLFdBQVcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFVBQVMsR0FBRyxFQUFFLEdBQUcsRUFBRTtBQUMzRSxhQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDcEQsaUJBQVcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdkIsQ0FBQyxDQUFDO0NBQ047QUFDRCxNQUFNLENBQUMsT0FBTyxHQUFHO0FBQ2IsWUFBUyxFQUFFLFNBQVMsRUFDdkIsQ0FBQzs7Ozs7QUNsQ0YsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDOzs7OztBQUtsQyxTQUFTLE9BQU8sQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7QUFDakQsTUFBSSxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUU7QUFDckIsV0FBTyxXQUFXLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7R0FDdEQsTUFBTTtBQUNMLFdBQU8sY0FBYyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0dBQ3pEO0NBQ0Y7O0FBRUQsU0FBUyxXQUFXLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFO0FBQ3JELFNBQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUNuRSxNQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO0FBQzlCLFdBQU8sRUFBRSxLQUFLO0FBQ2QsVUFBTSxFQUFFLE1BQU07QUFDZCxVQUFNLEVBQUUsTUFBTTtBQUNkLE1BQUUsRUFBRSxJQUFJLEVBQ1QsQ0FBQyxDQUFDO0FBQ0gsTUFBSSxPQUFPLEdBQUc7QUFDWixRQUFJLEVBQUUsTUFBTSxDQUFDLElBQUk7QUFDakIsUUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJO0FBQ2pCLFFBQUksRUFBRSxHQUFHO0FBQ1QsVUFBTSxFQUFFLE1BQU07QUFDZCxXQUFPLEVBQUU7QUFDUCxvQkFBYyxFQUFFLG1DQUFtQztBQUNuRCxzQkFBZ0IsRUFBRSxVQUFVLENBQUMsTUFBTSxFQUNwQyxFQUNGLENBQUM7QUFDRixNQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxVQUFTLEdBQUcsRUFBRTtBQUN2RCxRQUFJLE9BQU8sR0FBRyxFQUFFLENBQUM7O0FBRWpCLE9BQUcsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLFVBQVMsS0FBSyxFQUFFO0FBQzdCLGFBQU8sSUFBSSxLQUFLLENBQUM7S0FDbEIsQ0FBQyxDQUFDO0FBQ0gsT0FBRyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsWUFBVztBQUN2QixVQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ2xDLFVBQUksT0FBTyxDQUFDLE9BQU8sSUFBSSxLQUFLLEVBQUU7QUFDNUIsZUFBTyxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7T0FDaEQsTUFBTTtBQUNMLGVBQU8sUUFBUSxDQUFDLFdBQVcsRUFBRSw2QkFBNkIsQ0FBQyxDQUFDO09BQzdEO0tBQ0YsQ0FBQyxDQUFDO0dBQ0osQ0FBQyxDQUFDO0FBQ0gsS0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUN0QixLQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7Q0FDWDs7QUFFRCxTQUFTLGNBQWMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7QUFDeEQsTUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztBQUM5QixXQUFPLEVBQUUsS0FBSztBQUNkLFVBQU0sRUFBRSxNQUFNO0FBQ2QsVUFBTSxFQUFFLE1BQU07QUFDZCxNQUFFLEVBQUUsSUFBSSxFQUNULENBQUMsQ0FBQztBQUNILE1BQUksT0FBTyxHQUFHLElBQUksY0FBYyxFQUFFLENBQUM7QUFDbkMsU0FBTyxDQUFDLGtCQUFrQixHQUFHLFlBQVc7QUFDdEMsUUFBSSxPQUFPLENBQUMsVUFBVSxLQUFLLENBQUMsRUFBRTtBQUM1QixVQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUMvQyxVQUFJLE9BQU8sQ0FBQyxPQUFPLElBQUksS0FBSyxFQUFFO0FBQzVCLGVBQU8sUUFBUSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO09BQ2hELE1BQU07QUFDTCxlQUFPLFFBQVEsQ0FBQyxXQUFXLEVBQUUsNkJBQTZCLENBQUMsQ0FBQztPQUM3RDtLQUNGO0dBQ0YsQ0FBQztBQUNGLFNBQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLFNBQVMsR0FBRyxNQUFNLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxNQUFNLENBQUMsSUFBSSxHQUFHLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM5RSxTQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0NBQzFCO0FBQ0QsQ0FBQzs7Ozs7QUFLRCxTQUFTLFFBQVEsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7QUFDOUMsTUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksRUFBRTtBQUNsQixVQUFPLHFDQUFxQyxDQUFDO0dBQzlDO0FBQ0QsTUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRTtBQUN0QixVQUFPLDJDQUEyQyxDQUFFO0dBQ3JELE1BQU07QUFDTCxnQkFBWSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0dBQzVDO0NBQ0Y7O0FBRUQsU0FBUyxZQUFZLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFO0FBQ2xELE1BQUksUUFBUSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxTQUFTLENBQUM7QUFDOUMsUUFBSSxFQUFFLElBQUk7R0FDWCxDQUFDLENBQUM7QUFDSCxNQUFJLE9BQU8sR0FBRztBQUNaLFFBQUksRUFBRSxNQUFNLENBQUMsSUFBSTtBQUNqQixRQUFJLEVBQUUsTUFBTSxDQUFDLElBQUk7QUFDakIsUUFBSSxFQUFFLFdBQVc7QUFDakIsVUFBTSxFQUFFLE1BQU07QUFDZCxXQUFPLEVBQUU7QUFDUCxvQkFBYyxFQUFFLG1DQUFtQztBQUNuRCxzQkFBZ0IsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUNsQyxFQUNGLENBQUM7QUFDRixNQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxVQUFTLEdBQUcsRUFBRTs7QUFFdkQsUUFBSSxHQUFHLENBQUMsVUFBVSxJQUFJLEdBQUcsRUFBRTtBQUN6QixVQUFJLE9BQU8sR0FBRyxFQUFFLENBQUM7QUFDakIsU0FBRyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN4QixTQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxVQUFTLEtBQUssRUFBRTtBQUM3QixlQUFPLElBQUksS0FBSyxDQUFDO09BQ2xCLENBQUMsQ0FBQztBQUNILFNBQUcsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLFlBQVc7QUFDdkIsWUFBSSxDQUFDLE9BQU8sRUFBRTtBQUNaLGlCQUFPLEdBQUcsZUFBZSxDQUFDO1NBQzNCO0FBQ0QsZ0JBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztPQUNuQixDQUFDLENBQUM7QUFDSCxhQUFPO0tBQ1I7O0FBRUQsUUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ25ELFVBQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLFVBQVMsRUFBRSxFQUFFO0FBQy9CLFNBQUcsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLFVBQVMsS0FBSyxFQUFFO0FBQzdCLGNBQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7T0FDckIsQ0FBQyxDQUFDO0FBQ0gsU0FBRyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsWUFBVztBQUN2QixjQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDYixnQkFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO09BQ2hCLENBQUMsQ0FBQztBQUNILFNBQUcsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLFVBQVMsR0FBRyxFQUFFO0FBQzVCLGdCQUFRLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO09BQ3ZCLENBQUMsQ0FBQztLQUNKLENBQUMsQ0FBQztHQUNKLENBQUMsQ0FBQztBQUNILEtBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDcEIsS0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0NBQ1g7O0FBRUQsTUFBTSxDQUFDLE9BQU8sR0FBRztBQUNmLFNBQU8sRUFBRSxPQUFPO0FBQ2hCLFVBQVEsRUFBRSxRQUFRLEVBQ25CLENBQUM7Ozs7OztBQzFJRixPQUFPLENBQUMsVUFBVSxHQUFHLENBQUksQ0FBQztBQUMxQixPQUFPLENBQUMsVUFBVSxHQUFHLENBQUksQ0FBQztBQUMxQixPQUFPLENBQUMsVUFBVSxHQUFHLEVBQUksQ0FBQztBQUMxQixPQUFPLENBQUMsWUFBWSxHQUFHLEVBQUksQ0FBQztBQUM1QixPQUFPLENBQUMsWUFBWSxHQUFHLEVBQUksQ0FBQztBQUM1QixPQUFPLENBQUMsYUFBYSxHQUFHLEVBQUksQ0FBQzs7O0FBRzdCLE9BQU8sQ0FBQyxhQUFhLEdBQUcsQ0FBSSxDQUFDO0FBQzdCLE9BQU8sQ0FBQyxpQkFBaUIsR0FBRyxDQUFJLENBQUM7Ozs7QUFJakMsT0FBTyxDQUFDLGtCQUFrQixHQUFHLENBQUksQ0FBQzs7O2FDZGxDLElBQUksS0FBSyxDQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUEsQUFFaEMsTUFBTSxDQUFDLE9BQU8sR0FBRyxDQUNaLEtBQUssQ0FBRSxLQUFLLENBQ2hCLENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIHJwYyA9IHJlcXVpcmUoXCIuL3JwY1wiKTtcbnZhciB0eXBlcyA9IHJlcXVpcmUoXCIuL3R5cGVzXCIpO1xudmFyIGNvbmZpZyA9IHJlcXVpcmUoXCIuL2NvbmZpZ1wiKTtcbnZhciBkYiA9IHJlcXVpcmUoXCIuL2RiXCIpO1xudmFyIHdvcmRzID0gcmVxdWlyZShcIi4vd29yZHNcIik7XG52YXIgcmFuZG9tb3RwID0gcmVxdWlyZShcIi4vcmFuZG9tb3RwXCIpO1xuaWYgKCFjb25maWcuSXNOb2RlSnMoKSkge1xuICB3aW5kb3cucmVxdWlyZSA9IHJlcXVpcmU7XG59XG4iLCJmdW5jdGlvbiByZW1vdGUoaG9zdCwgcG9ydCkge1xuICByZXR1cm4ge1xuICAgIGhvc3Q6IGhvc3QsXG4gICAgcG9ydDogcG9ydFxuICB9O1xufVxuXG52YXIgUmVtb3RlcyA9IFtcbiAgcmVtb3RlKFwiMTg4LjE2Ni41NS4yMjJcIiwgODA4MSksXG4gIHJlbW90ZShcIjEwNy4xNzAuMjEyLjE1XCIsIDgwODEpLFxuICByZW1vdGUoXCIxMDQuMjM2LjMyLjM2XCIsIDgwODEpLFxuICByZW1vdGUoXCIxMDcuMTcwLjIxMi4xNVwiLCA4MDgxKSxcbiAgcmVtb3RlKFwiMTg4LjIyNi4yMzYuMTk2XCIsIDgwODEpLFxuICByZW1vdGUoXCI0Ni4xMDEuMTcwLjE3MlwiLCA4MDgxKSxcbiAgcmVtb3RlKFwiMTg4LjIyNi4yMzYuMTk2XCIsIDgwODEpLFxuICByZW1vdGUoXCI0Ni4xMDEuMTcwLjE3MlwiLCA4MDgxKSxcbiAgcmVtb3RlKFwiMTA0LjIzNi4zMi4zNlwiLCA4MDgxKSxcbiAgcmVtb3RlKFwiMTYyLjI0My44NS42MFwiLCA4MDgxKSxcbiAgcmVtb3RlKFwiMTYyLjI0My44NS42MFwiLCA4MDgxKSxcbl07XG5cbmZ1bmN0aW9uIElzTm9kZUpzKCkge1xuICByZXR1cm4gdHlwZW9mICh3aW5kb3cpICE9IFwib2JqZWN0XCI7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBSZW1vdGVzOiBSZW1vdGVzLFxuICBJc05vZGVKczogSXNOb2RlSnMsXG59O1xuIiwiZnVuY3Rpb24gU2V0KGtleSwgdmFsdWUpIHtcbiAgICByZXR1cm4gc2Vzc2lvblN0b3JhZ2Uua2V5ID0gdmFsdWU7XG59XG5cbmZ1bmN0aW9uIEdldChrZXkpIHtcbiAgICByZXR1cm4gc2Vzc2lvblN0b3JhZ2Uua2V5O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgU2V0OiBTZXQsXG4gIEdldDogR2V0LFxufTtcbiIsbnVsbCwiLyohXG4gKiBUaGUgYnVmZmVyIG1vZHVsZSBmcm9tIG5vZGUuanMsIGZvciB0aGUgYnJvd3Nlci5cbiAqXG4gKiBAYXV0aG9yICAgRmVyb3NzIEFib3VraGFkaWplaCA8ZmVyb3NzQGZlcm9zcy5vcmc+IDxodHRwOi8vZmVyb3NzLm9yZz5cbiAqIEBsaWNlbnNlICBNSVRcbiAqL1xuXG52YXIgYmFzZTY0ID0gcmVxdWlyZSgnYmFzZTY0LWpzJylcbnZhciBpZWVlNzU0ID0gcmVxdWlyZSgnaWVlZTc1NCcpXG52YXIgaXNBcnJheSA9IHJlcXVpcmUoJ2lzLWFycmF5JylcblxuZXhwb3J0cy5CdWZmZXIgPSBCdWZmZXJcbmV4cG9ydHMuU2xvd0J1ZmZlciA9IFNsb3dCdWZmZXJcbmV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVMgPSA1MFxuQnVmZmVyLnBvb2xTaXplID0gODE5MiAvLyBub3QgdXNlZCBieSB0aGlzIGltcGxlbWVudGF0aW9uXG5cbnZhciBrTWF4TGVuZ3RoID0gMHgzZmZmZmZmZlxudmFyIHJvb3RQYXJlbnQgPSB7fVxuXG4vKipcbiAqIElmIGBCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVGA6XG4gKiAgID09PSB0cnVlICAgIFVzZSBVaW50OEFycmF5IGltcGxlbWVudGF0aW9uIChmYXN0ZXN0KVxuICogICA9PT0gZmFsc2UgICBVc2UgT2JqZWN0IGltcGxlbWVudGF0aW9uIChtb3N0IGNvbXBhdGlibGUsIGV2ZW4gSUU2KVxuICpcbiAqIEJyb3dzZXJzIHRoYXQgc3VwcG9ydCB0eXBlZCBhcnJheXMgYXJlIElFIDEwKywgRmlyZWZveCA0KywgQ2hyb21lIDcrLCBTYWZhcmkgNS4xKyxcbiAqIE9wZXJhIDExLjYrLCBpT1MgNC4yKy5cbiAqXG4gKiBOb3RlOlxuICpcbiAqIC0gSW1wbGVtZW50YXRpb24gbXVzdCBzdXBwb3J0IGFkZGluZyBuZXcgcHJvcGVydGllcyB0byBgVWludDhBcnJheWAgaW5zdGFuY2VzLlxuICogICBGaXJlZm94IDQtMjkgbGFja2VkIHN1cHBvcnQsIGZpeGVkIGluIEZpcmVmb3ggMzArLlxuICogICBTZWU6IGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTY5NTQzOC5cbiAqXG4gKiAgLSBDaHJvbWUgOS0xMCBpcyBtaXNzaW5nIHRoZSBgVHlwZWRBcnJheS5wcm90b3R5cGUuc3ViYXJyYXlgIGZ1bmN0aW9uLlxuICpcbiAqICAtIElFMTAgaGFzIGEgYnJva2VuIGBUeXBlZEFycmF5LnByb3RvdHlwZS5zdWJhcnJheWAgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyBhcnJheXMgb2ZcbiAqICAgIGluY29ycmVjdCBsZW5ndGggaW4gc29tZSBzaXR1YXRpb25zLlxuICpcbiAqIFdlIGRldGVjdCB0aGVzZSBidWdneSBicm93c2VycyBhbmQgc2V0IGBCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVGAgdG8gYGZhbHNlYCBzbyB0aGV5IHdpbGxcbiAqIGdldCB0aGUgT2JqZWN0IGltcGxlbWVudGF0aW9uLCB3aGljaCBpcyBzbG93ZXIgYnV0IHdpbGwgd29yayBjb3JyZWN0bHkuXG4gKi9cbkJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUID0gKGZ1bmN0aW9uICgpIHtcbiAgdHJ5IHtcbiAgICB2YXIgYnVmID0gbmV3IEFycmF5QnVmZmVyKDApXG4gICAgdmFyIGFyciA9IG5ldyBVaW50OEFycmF5KGJ1ZilcbiAgICBhcnIuZm9vID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gNDIgfVxuICAgIHJldHVybiBhcnIuZm9vKCkgPT09IDQyICYmIC8vIHR5cGVkIGFycmF5IGluc3RhbmNlcyBjYW4gYmUgYXVnbWVudGVkXG4gICAgICAgIHR5cGVvZiBhcnIuc3ViYXJyYXkgPT09ICdmdW5jdGlvbicgJiYgLy8gY2hyb21lIDktMTAgbGFjayBgc3ViYXJyYXlgXG4gICAgICAgIG5ldyBVaW50OEFycmF5KDEpLnN1YmFycmF5KDEsIDEpLmJ5dGVMZW5ndGggPT09IDAgLy8gaWUxMCBoYXMgYnJva2VuIGBzdWJhcnJheWBcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG59KSgpXG5cbi8qKlxuICogQ2xhc3M6IEJ1ZmZlclxuICogPT09PT09PT09PT09PVxuICpcbiAqIFRoZSBCdWZmZXIgY29uc3RydWN0b3IgcmV0dXJucyBpbnN0YW5jZXMgb2YgYFVpbnQ4QXJyYXlgIHRoYXQgYXJlIGF1Z21lbnRlZFxuICogd2l0aCBmdW5jdGlvbiBwcm9wZXJ0aWVzIGZvciBhbGwgdGhlIG5vZGUgYEJ1ZmZlcmAgQVBJIGZ1bmN0aW9ucy4gV2UgdXNlXG4gKiBgVWludDhBcnJheWAgc28gdGhhdCBzcXVhcmUgYnJhY2tldCBub3RhdGlvbiB3b3JrcyBhcyBleHBlY3RlZCAtLSBpdCByZXR1cm5zXG4gKiBhIHNpbmdsZSBvY3RldC5cbiAqXG4gKiBCeSBhdWdtZW50aW5nIHRoZSBpbnN0YW5jZXMsIHdlIGNhbiBhdm9pZCBtb2RpZnlpbmcgdGhlIGBVaW50OEFycmF5YFxuICogcHJvdG90eXBlLlxuICovXG5mdW5jdGlvbiBCdWZmZXIgKHN1YmplY3QsIGVuY29kaW5nKSB7XG4gIHZhciBzZWxmID0gdGhpc1xuICBpZiAoIShzZWxmIGluc3RhbmNlb2YgQnVmZmVyKSkgcmV0dXJuIG5ldyBCdWZmZXIoc3ViamVjdCwgZW5jb2RpbmcpXG5cbiAgdmFyIHR5cGUgPSB0eXBlb2Ygc3ViamVjdFxuICB2YXIgbGVuZ3RoXG5cbiAgaWYgKHR5cGUgPT09ICdudW1iZXInKSB7XG4gICAgbGVuZ3RoID0gK3N1YmplY3RcbiAgfSBlbHNlIGlmICh0eXBlID09PSAnc3RyaW5nJykge1xuICAgIGxlbmd0aCA9IEJ1ZmZlci5ieXRlTGVuZ3RoKHN1YmplY3QsIGVuY29kaW5nKVxuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdvYmplY3QnICYmIHN1YmplY3QgIT09IG51bGwpIHtcbiAgICAvLyBhc3N1bWUgb2JqZWN0IGlzIGFycmF5LWxpa2VcbiAgICBpZiAoc3ViamVjdC50eXBlID09PSAnQnVmZmVyJyAmJiBpc0FycmF5KHN1YmplY3QuZGF0YSkpIHN1YmplY3QgPSBzdWJqZWN0LmRhdGFcbiAgICBsZW5ndGggPSArc3ViamVjdC5sZW5ndGhcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdtdXN0IHN0YXJ0IHdpdGggbnVtYmVyLCBidWZmZXIsIGFycmF5IG9yIHN0cmluZycpXG4gIH1cblxuICBpZiAobGVuZ3RoID4ga01heExlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdBdHRlbXB0IHRvIGFsbG9jYXRlIEJ1ZmZlciBsYXJnZXIgdGhhbiBtYXhpbXVtIHNpemU6IDB4JyArXG4gICAgICBrTWF4TGVuZ3RoLnRvU3RyaW5nKDE2KSArICcgYnl0ZXMnKVxuICB9XG5cbiAgaWYgKGxlbmd0aCA8IDApIGxlbmd0aCA9IDBcbiAgZWxzZSBsZW5ndGggPj4+PSAwIC8vIGNvZXJjZSB0byB1aW50MzJcblxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAvLyBQcmVmZXJyZWQ6IFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlIGZvciBiZXN0IHBlcmZvcm1hbmNlXG4gICAgc2VsZiA9IEJ1ZmZlci5fYXVnbWVudChuZXcgVWludDhBcnJheShsZW5ndGgpKSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGNvbnNpc3RlbnQtdGhpc1xuICB9IGVsc2Uge1xuICAgIC8vIEZhbGxiYWNrOiBSZXR1cm4gVEhJUyBpbnN0YW5jZSBvZiBCdWZmZXIgKGNyZWF0ZWQgYnkgYG5ld2ApXG4gICAgc2VsZi5sZW5ndGggPSBsZW5ndGhcbiAgICBzZWxmLl9pc0J1ZmZlciA9IHRydWVcbiAgfVxuXG4gIHZhciBpXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCAmJiB0eXBlb2Ygc3ViamVjdC5ieXRlTGVuZ3RoID09PSAnbnVtYmVyJykge1xuICAgIC8vIFNwZWVkIG9wdGltaXphdGlvbiAtLSB1c2Ugc2V0IGlmIHdlJ3JlIGNvcHlpbmcgZnJvbSBhIHR5cGVkIGFycmF5XG4gICAgc2VsZi5fc2V0KHN1YmplY3QpXG4gIH0gZWxzZSBpZiAoaXNBcnJheWlzaChzdWJqZWN0KSkge1xuICAgIC8vIFRyZWF0IGFycmF5LWlzaCBvYmplY3RzIGFzIGEgYnl0ZSBhcnJheVxuICAgIGlmIChCdWZmZXIuaXNCdWZmZXIoc3ViamVjdCkpIHtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBzZWxmW2ldID0gc3ViamVjdC5yZWFkVUludDgoaSlcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHNlbGZbaV0gPSAoKHN1YmplY3RbaV0gJSAyNTYpICsgMjU2KSAlIDI1NlxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIGlmICh0eXBlID09PSAnc3RyaW5nJykge1xuICAgIHNlbGYud3JpdGUoc3ViamVjdCwgMCwgZW5jb2RpbmcpXG4gIH0gZWxzZSBpZiAodHlwZSA9PT0gJ251bWJlcicgJiYgIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBzZWxmW2ldID0gMFxuICAgIH1cbiAgfVxuXG4gIGlmIChsZW5ndGggPiAwICYmIGxlbmd0aCA8PSBCdWZmZXIucG9vbFNpemUpIHNlbGYucGFyZW50ID0gcm9vdFBhcmVudFxuXG4gIHJldHVybiBzZWxmXG59XG5cbmZ1bmN0aW9uIFNsb3dCdWZmZXIgKHN1YmplY3QsIGVuY29kaW5nKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBTbG93QnVmZmVyKSkgcmV0dXJuIG5ldyBTbG93QnVmZmVyKHN1YmplY3QsIGVuY29kaW5nKVxuXG4gIHZhciBidWYgPSBuZXcgQnVmZmVyKHN1YmplY3QsIGVuY29kaW5nKVxuICBkZWxldGUgYnVmLnBhcmVudFxuICByZXR1cm4gYnVmXG59XG5cbkJ1ZmZlci5pc0J1ZmZlciA9IGZ1bmN0aW9uIGlzQnVmZmVyIChiKSB7XG4gIHJldHVybiAhIShiICE9IG51bGwgJiYgYi5faXNCdWZmZXIpXG59XG5cbkJ1ZmZlci5jb21wYXJlID0gZnVuY3Rpb24gY29tcGFyZSAoYSwgYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihhKSB8fCAhQnVmZmVyLmlzQnVmZmVyKGIpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnRzIG11c3QgYmUgQnVmZmVycycpXG4gIH1cblxuICBpZiAoYSA9PT0gYikgcmV0dXJuIDBcblxuICB2YXIgeCA9IGEubGVuZ3RoXG4gIHZhciB5ID0gYi5sZW5ndGhcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IE1hdGgubWluKHgsIHkpOyBpIDwgbGVuICYmIGFbaV0gPT09IGJbaV07IGkrKykge31cbiAgaWYgKGkgIT09IGxlbikge1xuICAgIHggPSBhW2ldXG4gICAgeSA9IGJbaV1cbiAgfVxuICBpZiAoeCA8IHkpIHJldHVybiAtMVxuICBpZiAoeSA8IHgpIHJldHVybiAxXG4gIHJldHVybiAwXG59XG5cbkJ1ZmZlci5pc0VuY29kaW5nID0gZnVuY3Rpb24gaXNFbmNvZGluZyAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiBjb25jYXQgKGxpc3QsIHRvdGFsTGVuZ3RoKSB7XG4gIGlmICghaXNBcnJheShsaXN0KSkgdGhyb3cgbmV3IFR5cGVFcnJvcignbGlzdCBhcmd1bWVudCBtdXN0IGJlIGFuIEFycmF5IG9mIEJ1ZmZlcnMuJylcblxuICBpZiAobGlzdC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcigwKVxuICB9IGVsc2UgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIGxpc3RbMF1cbiAgfVxuXG4gIHZhciBpXG4gIGlmICh0b3RhbExlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdG90YWxMZW5ndGggPSAwXG4gICAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRvdGFsTGVuZ3RoICs9IGxpc3RbaV0ubGVuZ3RoXG4gICAgfVxuICB9XG5cbiAgdmFyIGJ1ZiA9IG5ldyBCdWZmZXIodG90YWxMZW5ndGgpXG4gIHZhciBwb3MgPSAwXG4gIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGl0ZW0gPSBsaXN0W2ldXG4gICAgaXRlbS5jb3B5KGJ1ZiwgcG9zKVxuICAgIHBvcyArPSBpdGVtLmxlbmd0aFxuICB9XG4gIHJldHVybiBidWZcbn1cblxuQnVmZmVyLmJ5dGVMZW5ndGggPSBmdW5jdGlvbiBieXRlTGVuZ3RoIChzdHIsIGVuY29kaW5nKSB7XG4gIHZhciByZXRcbiAgc3RyID0gc3RyICsgJydcbiAgc3dpdGNoIChlbmNvZGluZyB8fCAndXRmOCcpIHtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdyYXcnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aFxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aCAqIDJcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGggPj4+IDFcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gdXRmOFRvQnl0ZXMoc3RyKS5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldCA9IGJhc2U2NFRvQnl0ZXMoc3RyKS5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGhcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbi8vIHByZS1zZXQgZm9yIHZhbHVlcyB0aGF0IG1heSBleGlzdCBpbiB0aGUgZnV0dXJlXG5CdWZmZXIucHJvdG90eXBlLmxlbmd0aCA9IHVuZGVmaW5lZFxuQnVmZmVyLnByb3RvdHlwZS5wYXJlbnQgPSB1bmRlZmluZWRcblxuLy8gdG9TdHJpbmcoZW5jb2RpbmcsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nIChlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuXG4gIHN0YXJ0ID0gc3RhcnQgPj4+IDBcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgfHwgZW5kID09PSBJbmZpbml0eSA/IHRoaXMubGVuZ3RoIDogZW5kID4+PiAwXG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcbiAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKGVuZCA8PSBzdGFydCkgcmV0dXJuICcnXG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gYmluYXJ5U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1dGYxNmxlU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKGVuY29kaW5nICsgJycpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gZXF1YWxzIChiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgaWYgKHRoaXMgPT09IGIpIHJldHVybiB0cnVlXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKSA9PT0gMFxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbiBpbnNwZWN0ICgpIHtcbiAgdmFyIHN0ciA9ICcnXG4gIHZhciBtYXggPSBleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTXG4gIGlmICh0aGlzLmxlbmd0aCA+IDApIHtcbiAgICBzdHIgPSB0aGlzLnRvU3RyaW5nKCdoZXgnLCAwLCBtYXgpLm1hdGNoKC8uezJ9L2cpLmpvaW4oJyAnKVxuICAgIGlmICh0aGlzLmxlbmd0aCA+IG1heCkgc3RyICs9ICcgLi4uICdcbiAgfVxuICByZXR1cm4gJzxCdWZmZXIgJyArIHN0ciArICc+J1xufVxuXG5CdWZmZXIucHJvdG90eXBlLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlIChiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgaWYgKHRoaXMgPT09IGIpIHJldHVybiAwXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbiBpbmRleE9mICh2YWwsIGJ5dGVPZmZzZXQpIHtcbiAgaWYgKGJ5dGVPZmZzZXQgPiAweDdmZmZmZmZmKSBieXRlT2Zmc2V0ID0gMHg3ZmZmZmZmZlxuICBlbHNlIGlmIChieXRlT2Zmc2V0IDwgLTB4ODAwMDAwMDApIGJ5dGVPZmZzZXQgPSAtMHg4MDAwMDAwMFxuICBieXRlT2Zmc2V0ID4+PSAwXG5cbiAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gLTFcbiAgaWYgKGJ5dGVPZmZzZXQgPj0gdGhpcy5sZW5ndGgpIHJldHVybiAtMVxuXG4gIC8vIE5lZ2F0aXZlIG9mZnNldHMgc3RhcnQgZnJvbSB0aGUgZW5kIG9mIHRoZSBidWZmZXJcbiAgaWYgKGJ5dGVPZmZzZXQgPCAwKSBieXRlT2Zmc2V0ID0gTWF0aC5tYXgodGhpcy5sZW5ndGggKyBieXRlT2Zmc2V0LCAwKVxuXG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIGlmICh2YWwubGVuZ3RoID09PSAwKSByZXR1cm4gLTEgLy8gc3BlY2lhbCBjYXNlOiBsb29raW5nIGZvciBlbXB0eSBzdHJpbmcgYWx3YXlzIGZhaWxzXG4gICAgcmV0dXJuIFN0cmluZy5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKHRoaXMsIHZhbCwgYnl0ZU9mZnNldClcbiAgfVxuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHZhbCkpIHtcbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKHRoaXMsIHZhbCwgYnl0ZU9mZnNldClcbiAgfVxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgJiYgVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2YuY2FsbCh0aGlzLCB2YWwsIGJ5dGVPZmZzZXQpXG4gICAgfVxuICAgIHJldHVybiBhcnJheUluZGV4T2YodGhpcywgWyB2YWwgXSwgYnl0ZU9mZnNldClcbiAgfVxuXG4gIGZ1bmN0aW9uIGFycmF5SW5kZXhPZiAoYXJyLCB2YWwsIGJ5dGVPZmZzZXQpIHtcbiAgICB2YXIgZm91bmRJbmRleCA9IC0xXG4gICAgZm9yICh2YXIgaSA9IDA7IGJ5dGVPZmZzZXQgKyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoYXJyW2J5dGVPZmZzZXQgKyBpXSA9PT0gdmFsW2ZvdW5kSW5kZXggPT09IC0xID8gMCA6IGkgLSBmb3VuZEluZGV4XSkge1xuICAgICAgICBpZiAoZm91bmRJbmRleCA9PT0gLTEpIGZvdW5kSW5kZXggPSBpXG4gICAgICAgIGlmIChpIC0gZm91bmRJbmRleCArIDEgPT09IHZhbC5sZW5ndGgpIHJldHVybiBieXRlT2Zmc2V0ICsgZm91bmRJbmRleFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm91bmRJbmRleCA9IC0xXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMVxuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcigndmFsIG11c3QgYmUgc3RyaW5nLCBudW1iZXIgb3IgQnVmZmVyJylcbn1cblxuLy8gYGdldGAgd2lsbCBiZSByZW1vdmVkIGluIE5vZGUgMC4xMytcbkJ1ZmZlci5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gZ2V0IChvZmZzZXQpIHtcbiAgY29uc29sZS5sb2coJy5nZXQoKSBpcyBkZXByZWNhdGVkLiBBY2Nlc3MgdXNpbmcgYXJyYXkgaW5kZXhlcyBpbnN0ZWFkLicpXG4gIHJldHVybiB0aGlzLnJlYWRVSW50OChvZmZzZXQpXG59XG5cbi8vIGBzZXRgIHdpbGwgYmUgcmVtb3ZlZCBpbiBOb2RlIDAuMTMrXG5CdWZmZXIucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIHNldCAodiwgb2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuc2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy53cml0ZVVJbnQ4KHYsIG9mZnNldClcbn1cblxuZnVuY3Rpb24gaGV4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSBidWYubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cblxuICAvLyBtdXN0IGJlIGFuIGV2ZW4gbnVtYmVyIG9mIGRpZ2l0c1xuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aFxuICBpZiAoc3RyTGVuICUgMiAhPT0gMCkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGhleCBzdHJpbmcnKVxuXG4gIGlmIChsZW5ndGggPiBzdHJMZW4gLyAyKSB7XG4gICAgbGVuZ3RoID0gc3RyTGVuIC8gMlxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgcGFyc2VkID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGlmIChpc05hTihwYXJzZWQpKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgaGV4IHN0cmluZycpXG4gICAgYnVmW29mZnNldCArIGldID0gcGFyc2VkXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gdXRmOFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIGNoYXJzV3JpdHRlbiA9IGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiBhc2NpaVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIGNoYXJzV3JpdHRlbiA9IGJsaXRCdWZmZXIoYXNjaWlUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG4gIHJldHVybiBjaGFyc1dyaXR0ZW5cbn1cblxuZnVuY3Rpb24gYmluYXJ5V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYXNjaWlXcml0ZShidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGJhc2U2NFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIGNoYXJzV3JpdHRlbiA9IGJsaXRCdWZmZXIoYmFzZTY0VG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBibGl0QnVmZmVyKHV0ZjE2bGVUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG4gIHJldHVybiBjaGFyc1dyaXR0ZW5cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uIHdyaXRlIChzdHJpbmcsIG9mZnNldCwgbGVuZ3RoLCBlbmNvZGluZykge1xuICAvLyBTdXBwb3J0IGJvdGggKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKVxuICAvLyBhbmQgdGhlIGxlZ2FjeSAoc3RyaW5nLCBlbmNvZGluZywgb2Zmc2V0LCBsZW5ndGgpXG4gIGlmIChpc0Zpbml0ZShvZmZzZXQpKSB7XG4gICAgaWYgKCFpc0Zpbml0ZShsZW5ndGgpKSB7XG4gICAgICBlbmNvZGluZyA9IGxlbmd0aFxuICAgICAgbGVuZ3RoID0gdW5kZWZpbmVkXG4gICAgfVxuICB9IGVsc2UgeyAgLy8gbGVnYWN5XG4gICAgdmFyIHN3YXAgPSBlbmNvZGluZ1xuICAgIGVuY29kaW5nID0gb2Zmc2V0XG4gICAgb2Zmc2V0ID0gbGVuZ3RoXG4gICAgbGVuZ3RoID0gc3dhcFxuICB9XG5cbiAgb2Zmc2V0ID0gTnVtYmVyKG9mZnNldCkgfHwgMFxuXG4gIGlmIChsZW5ndGggPCAwIHx8IG9mZnNldCA8IDAgfHwgb2Zmc2V0ID4gdGhpcy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignYXR0ZW1wdCB0byB3cml0ZSBvdXRzaWRlIGJ1ZmZlciBib3VuZHMnKVxuICB9XG5cbiAgdmFyIHJlbWFpbmluZyA9IHRoaXMubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cbiAgZW5jb2RpbmcgPSBTdHJpbmcoZW5jb2RpbmcgfHwgJ3V0ZjgnKS50b0xvd2VyQ2FzZSgpXG5cbiAgdmFyIHJldFxuICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IGhleFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIHJldCA9IHV0ZjhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgICByZXQgPSBhc2NpaVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICByZXQgPSBiaW5hcnlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgcmV0ID0gYmFzZTY0V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IHV0ZjE2bGVXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04gKCkge1xuICByZXR1cm4ge1xuICAgIHR5cGU6ICdCdWZmZXInLFxuICAgIGRhdGE6IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMuX2FyciB8fCB0aGlzLCAwKVxuICB9XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKHN0YXJ0ID09PSAwICYmIGVuZCA9PT0gYnVmLmxlbmd0aCkge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYpXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1Zi5zbGljZShzdGFydCwgZW5kKSlcbiAgfVxufVxuXG5mdW5jdGlvbiB1dGY4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmVzID0gJydcbiAgdmFyIHRtcCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIGlmIChidWZbaV0gPD0gMHg3Rikge1xuICAgICAgcmVzICs9IGRlY29kZVV0ZjhDaGFyKHRtcCkgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgICAgIHRtcCA9ICcnXG4gICAgfSBlbHNlIHtcbiAgICAgIHRtcCArPSAnJScgKyBidWZbaV0udG9TdHJpbmcoMTYpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlcyArIGRlY29kZVV0ZjhDaGFyKHRtcClcbn1cblxuZnVuY3Rpb24gYXNjaWlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0gJiAweDdGKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gYmluYXJ5U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gaGV4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuXG4gIGlmICghc3RhcnQgfHwgc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgfHwgZW5kIDwgMCB8fCBlbmQgPiBsZW4pIGVuZCA9IGxlblxuXG4gIHZhciBvdXQgPSAnJ1xuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIG91dCArPSB0b0hleChidWZbaV0pXG4gIH1cbiAgcmV0dXJuIG91dFxufVxuXG5mdW5jdGlvbiB1dGYxNmxlU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgYnl0ZXMgPSBidWYuc2xpY2Uoc3RhcnQsIGVuZClcbiAgdmFyIHJlcyA9ICcnXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYnl0ZXMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlc1tpXSArIGJ5dGVzW2kgKyAxXSAqIDI1NilcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbiBzbGljZSAoc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgc3RhcnQgPSB+fnN0YXJ0XG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkID8gbGVuIDogfn5lbmRcblxuICBpZiAoc3RhcnQgPCAwKSB7XG4gICAgc3RhcnQgKz0gbGVuXG4gICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIH0gZWxzZSBpZiAoc3RhcnQgPiBsZW4pIHtcbiAgICBzdGFydCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IDApIHtcbiAgICBlbmQgKz0gbGVuXG4gICAgaWYgKGVuZCA8IDApIGVuZCA9IDBcbiAgfSBlbHNlIGlmIChlbmQgPiBsZW4pIHtcbiAgICBlbmQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICB2YXIgbmV3QnVmXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIG5ld0J1ZiA9IEJ1ZmZlci5fYXVnbWVudCh0aGlzLnN1YmFycmF5KHN0YXJ0LCBlbmQpKVxuICB9IGVsc2Uge1xuICAgIHZhciBzbGljZUxlbiA9IGVuZCAtIHN0YXJ0XG4gICAgbmV3QnVmID0gbmV3IEJ1ZmZlcihzbGljZUxlbiwgdW5kZWZpbmVkKVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2xpY2VMZW47IGkrKykge1xuICAgICAgbmV3QnVmW2ldID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9XG5cbiAgaWYgKG5ld0J1Zi5sZW5ndGgpIG5ld0J1Zi5wYXJlbnQgPSB0aGlzLnBhcmVudCB8fCB0aGlzXG5cbiAgcmV0dXJuIG5ld0J1ZlxufVxuXG4vKlxuICogTmVlZCB0byBtYWtlIHN1cmUgdGhhdCBidWZmZXIgaXNuJ3QgdHJ5aW5nIHRvIHdyaXRlIG91dCBvZiBib3VuZHMuXG4gKi9cbmZ1bmN0aW9uIGNoZWNrT2Zmc2V0IChvZmZzZXQsIGV4dCwgbGVuZ3RoKSB7XG4gIGlmICgob2Zmc2V0ICUgMSkgIT09IDAgfHwgb2Zmc2V0IDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ29mZnNldCBpcyBub3QgdWludCcpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBsZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdUcnlpbmcgdG8gYWNjZXNzIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludExFID0gZnVuY3Rpb24gcmVhZFVJbnRMRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRCRSA9IGZ1bmN0aW9uIHJlYWRVSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuICB9XG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgLS1ieXRlTGVuZ3RoXVxuICB2YXIgbXVsID0gMVxuICB3aGlsZSAoYnl0ZUxlbmd0aCA+IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdICogbXVsXG4gIH1cblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQ4ID0gZnVuY3Rpb24gcmVhZFVJbnQ4IChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2TEUgPSBmdW5jdGlvbiByZWFkVUludDE2TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkJFID0gZnVuY3Rpb24gcmVhZFVJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDgpIHwgdGhpc1tvZmZzZXQgKyAxXVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAoKHRoaXNbb2Zmc2V0XSkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpKSArXG4gICAgICAodGhpc1tvZmZzZXQgKyAzXSAqIDB4MTAwMDAwMClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkUgPSBmdW5jdGlvbiByZWFkVUludDMyQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSAqIDB4MTAwMDAwMCkgK1xuICAgICgodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICB0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRMRSA9IGZ1bmN0aW9uIHJlYWRJbnRMRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cbiAgbXVsICo9IDB4ODBcblxuICBpZiAodmFsID49IG11bCkgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50QkUgPSBmdW5jdGlvbiByZWFkSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoXG4gIHZhciBtdWwgPSAxXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0taV1cbiAgd2hpbGUgKGkgPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1pXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiByZWFkSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICBpZiAoISh0aGlzW29mZnNldF0gJiAweDgwKSkgcmV0dXJuICh0aGlzW29mZnNldF0pXG4gIHJldHVybiAoKDB4ZmYgLSB0aGlzW29mZnNldF0gKyAxKSAqIC0xKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkxFID0gZnVuY3Rpb24gcmVhZEludDE2TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG4gIHJldHVybiAodmFsICYgMHg4MDAwKSA/IHZhbCB8IDB4RkZGRjAwMDAgOiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZCRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIDFdIHwgKHRoaXNbb2Zmc2V0XSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyTEUgPSBmdW5jdGlvbiByZWFkSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdKSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10gPDwgMjQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyQkUgPSBmdW5jdGlvbiByZWFkSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDI0KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0TEUgPSBmdW5jdGlvbiByZWFkRmxvYXRMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkUgPSBmdW5jdGlvbiByZWFkRmxvYXRCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIHJlYWREb3VibGVMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgNTIsIDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUJFID0gZnVuY3Rpb24gcmVhZERvdWJsZUJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgNTIsIDgpXG59XG5cbmZ1bmN0aW9uIGNoZWNrSW50IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignYnVmZmVyIG11c3QgYmUgYSBCdWZmZXIgaW5zdGFuY2UnKVxuICBpZiAodmFsdWUgPiBtYXggfHwgdmFsdWUgPCBtaW4pIHRocm93IG5ldyBSYW5nZUVycm9yKCd2YWx1ZSBpcyBvdXQgb2YgYm91bmRzJylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGJ1Zi5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdpbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludExFID0gZnVuY3Rpb24gd3JpdGVVSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCksIDApXG5cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpID4+PiAwICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRCRSA9IGZ1bmN0aW9uIHdyaXRlVUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpLCAwKVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdGhpc1tvZmZzZXQgKyBpXSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoLS1pID49IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKHZhbHVlIC8gbXVsKSA+Pj4gMCAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50OCA9IGZ1bmN0aW9uIHdyaXRlVUludDggKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweGZmLCAwKVxuICBpZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB2YWx1ZSA9IE1hdGguZmxvb3IodmFsdWUpXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbmZ1bmN0aW9uIG9iamVjdFdyaXRlVUludDE2IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbikge1xuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZiArIHZhbHVlICsgMVxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGJ1Zi5sZW5ndGggLSBvZmZzZXQsIDIpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID0gKHZhbHVlICYgKDB4ZmYgPDwgKDggKiAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSkpKSA+Pj5cbiAgICAgIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpICogOFxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDFdID0gdmFsdWVcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5mdW5jdGlvbiBvYmplY3RXcml0ZVVJbnQzMiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4pIHtcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmZmZmZmICsgdmFsdWUgKyAxXG4gIGZvciAodmFyIGkgPSAwLCBqID0gTWF0aC5taW4oYnVmLmxlbmd0aCAtIG9mZnNldCwgNCk7IGkgPCBqOyBpKyspIHtcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSAodmFsdWUgPj4+IChsaXR0bGVFbmRpYW4gPyBpIDogMyAtIGkpICogOCkgJiAweGZmXG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkxFID0gZnVuY3Rpb24gd3JpdGVVSW50MzJMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXRdID0gdmFsdWVcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9IHZhbHVlXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludExFID0gZnVuY3Rpb24gd3JpdGVJbnRMRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja0ludChcbiAgICAgIHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsXG4gICAgICBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCAtIDEpIC0gMSxcbiAgICAgIC1NYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCAtIDEpXG4gICAgKVxuICB9XG5cbiAgdmFyIGkgPSAwXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSB2YWx1ZSA8IDAgPyAxIDogMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50QkUgPSBmdW5jdGlvbiB3cml0ZUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSW50KFxuICAgICAgdGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCxcbiAgICAgIE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoIC0gMSkgLSAxLFxuICAgICAgLU1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoIC0gMSlcbiAgICApXG4gIH1cblxuICB2YXIgaSA9IGJ5dGVMZW5ndGggLSAxXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSB2YWx1ZSA8IDAgPyAxIDogMFxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVJbnQ4ICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHg3ZiwgLTB4ODApXG4gIGlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHZhbHVlID0gTWF0aC5mbG9vcih2YWx1ZSlcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmICsgdmFsdWUgKyAxXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24gd3JpdGVJbnQxNkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSB2YWx1ZVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSB2YWx1ZVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkxFID0gZnVuY3Rpb24gd3JpdGVJbnQzMkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkJFID0gZnVuY3Rpb24gd3JpdGVJbnQzMkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmZmZmZiArIHZhbHVlICsgMVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9IHZhbHVlXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuZnVuY3Rpb24gY2hlY2tJRUVFNzU0IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndmFsdWUgaXMgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignaW5kZXggb3V0IG9mIHJhbmdlJylcbiAgaWYgKG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdpbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5mdW5jdGlvbiB3cml0ZUZsb2F0IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDQsIDMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgsIC0zLjQwMjgyMzQ2NjM4NTI4ODZlKzM4KVxuICB9XG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRMRSA9IGZ1bmN0aW9uIHdyaXRlRmxvYXRMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdEJFID0gZnVuY3Rpb24gd3JpdGVGbG9hdEJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRG91YmxlIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDgsIDEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4LCAtMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgNTIsIDgpXG4gIHJldHVybiBvZmZzZXQgKyA4XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVMRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gd3JpdGVEb3VibGVCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuLy8gY29weSh0YXJnZXRCdWZmZXIsIHRhcmdldFN0YXJ0PTAsIHNvdXJjZVN0YXJ0PTAsIHNvdXJjZUVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gY29weSAodGFyZ2V0LCB0YXJnZXRfc3RhcnQsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKCFzdGFydCkgc3RhcnQgPSAwXG4gIGlmICghZW5kICYmIGVuZCAhPT0gMCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldF9zdGFydCA+PSB0YXJnZXQubGVuZ3RoKSB0YXJnZXRfc3RhcnQgPSB0YXJnZXQubGVuZ3RoXG4gIGlmICghdGFyZ2V0X3N0YXJ0KSB0YXJnZXRfc3RhcnQgPSAwXG4gIGlmIChlbmQgPiAwICYmIGVuZCA8IHN0YXJ0KSBlbmQgPSBzdGFydFxuXG4gIC8vIENvcHkgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuIDBcbiAgaWYgKHRhcmdldC5sZW5ndGggPT09IDAgfHwgdGhpcy5sZW5ndGggPT09IDApIHJldHVybiAwXG5cbiAgLy8gRmF0YWwgZXJyb3IgY29uZGl0aW9uc1xuICBpZiAodGFyZ2V0X3N0YXJ0IDwgMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCd0YXJnZXRTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgfVxuICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0ID49IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc291cmNlU3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChlbmQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc291cmNlRW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIC8vIEFyZSB3ZSBvb2I/XG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldC5sZW5ndGggLSB0YXJnZXRfc3RhcnQgPCBlbmQgLSBzdGFydCkge1xuICAgIGVuZCA9IHRhcmdldC5sZW5ndGggLSB0YXJnZXRfc3RhcnQgKyBzdGFydFxuICB9XG5cbiAgdmFyIGxlbiA9IGVuZCAtIHN0YXJ0XG5cbiAgaWYgKGxlbiA8IDEwMDAgfHwgIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgdGFyZ2V0W2kgKyB0YXJnZXRfc3RhcnRdID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRhcmdldC5fc2V0KHRoaXMuc3ViYXJyYXkoc3RhcnQsIHN0YXJ0ICsgbGVuKSwgdGFyZ2V0X3N0YXJ0KVxuICB9XG5cbiAgcmV0dXJuIGxlblxufVxuXG4vLyBmaWxsKHZhbHVlLCBzdGFydD0wLCBlbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuZmlsbCA9IGZ1bmN0aW9uIGZpbGwgKHZhbHVlLCBzdGFydCwgZW5kKSB7XG4gIGlmICghdmFsdWUpIHZhbHVlID0gMFxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQpIGVuZCA9IHRoaXMubGVuZ3RoXG5cbiAgaWYgKGVuZCA8IHN0YXJ0KSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignZW5kIDwgc3RhcnQnKVxuXG4gIC8vIEZpbGwgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuXG4gIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3N0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBpZiAoZW5kIDwgMCB8fCBlbmQgPiB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2VuZCBvdXQgb2YgYm91bmRzJylcblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICAgIHRoaXNbaV0gPSB2YWx1ZVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YXIgYnl0ZXMgPSB1dGY4VG9CeXRlcyh2YWx1ZS50b1N0cmluZygpKVxuICAgIHZhciBsZW4gPSBieXRlcy5sZW5ndGhcbiAgICBmb3IgKGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgICB0aGlzW2ldID0gYnl0ZXNbaSAlIGxlbl1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgYEFycmF5QnVmZmVyYCB3aXRoIHRoZSAqY29waWVkKiBtZW1vcnkgb2YgdGhlIGJ1ZmZlciBpbnN0YW5jZS5cbiAqIEFkZGVkIGluIE5vZGUgMC4xMi4gT25seSBhdmFpbGFibGUgaW4gYnJvd3NlcnMgdGhhdCBzdXBwb3J0IEFycmF5QnVmZmVyLlxuICovXG5CdWZmZXIucHJvdG90eXBlLnRvQXJyYXlCdWZmZXIgPSBmdW5jdGlvbiB0b0FycmF5QnVmZmVyICgpIHtcbiAgaWYgKHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJykge1xuICAgIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgICAgcmV0dXJuIChuZXcgQnVmZmVyKHRoaXMpKS5idWZmZXJcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGJ1ZiA9IG5ldyBVaW50OEFycmF5KHRoaXMubGVuZ3RoKVxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGJ1Zi5sZW5ndGg7IGkgPCBsZW47IGkgKz0gMSkge1xuICAgICAgICBidWZbaV0gPSB0aGlzW2ldXG4gICAgICB9XG4gICAgICByZXR1cm4gYnVmLmJ1ZmZlclxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCdWZmZXIudG9BcnJheUJ1ZmZlciBub3Qgc3VwcG9ydGVkIGluIHRoaXMgYnJvd3NlcicpXG4gIH1cbn1cblxuLy8gSEVMUEVSIEZVTkNUSU9OU1xuLy8gPT09PT09PT09PT09PT09PVxuXG52YXIgQlAgPSBCdWZmZXIucHJvdG90eXBlXG5cbi8qKlxuICogQXVnbWVudCBhIFVpbnQ4QXJyYXkgKmluc3RhbmNlKiAobm90IHRoZSBVaW50OEFycmF5IGNsYXNzISkgd2l0aCBCdWZmZXIgbWV0aG9kc1xuICovXG5CdWZmZXIuX2F1Z21lbnQgPSBmdW5jdGlvbiBfYXVnbWVudCAoYXJyKSB7XG4gIGFyci5jb25zdHJ1Y3RvciA9IEJ1ZmZlclxuICBhcnIuX2lzQnVmZmVyID0gdHJ1ZVxuXG4gIC8vIHNhdmUgcmVmZXJlbmNlIHRvIG9yaWdpbmFsIFVpbnQ4QXJyYXkgc2V0IG1ldGhvZCBiZWZvcmUgb3ZlcndyaXRpbmdcbiAgYXJyLl9zZXQgPSBhcnIuc2V0XG5cbiAgLy8gZGVwcmVjYXRlZCwgd2lsbCBiZSByZW1vdmVkIGluIG5vZGUgMC4xMytcbiAgYXJyLmdldCA9IEJQLmdldFxuICBhcnIuc2V0ID0gQlAuc2V0XG5cbiAgYXJyLndyaXRlID0gQlAud3JpdGVcbiAgYXJyLnRvU3RyaW5nID0gQlAudG9TdHJpbmdcbiAgYXJyLnRvTG9jYWxlU3RyaW5nID0gQlAudG9TdHJpbmdcbiAgYXJyLnRvSlNPTiA9IEJQLnRvSlNPTlxuICBhcnIuZXF1YWxzID0gQlAuZXF1YWxzXG4gIGFyci5jb21wYXJlID0gQlAuY29tcGFyZVxuICBhcnIuaW5kZXhPZiA9IEJQLmluZGV4T2ZcbiAgYXJyLmNvcHkgPSBCUC5jb3B5XG4gIGFyci5zbGljZSA9IEJQLnNsaWNlXG4gIGFyci5yZWFkVUludExFID0gQlAucmVhZFVJbnRMRVxuICBhcnIucmVhZFVJbnRCRSA9IEJQLnJlYWRVSW50QkVcbiAgYXJyLnJlYWRVSW50OCA9IEJQLnJlYWRVSW50OFxuICBhcnIucmVhZFVJbnQxNkxFID0gQlAucmVhZFVJbnQxNkxFXG4gIGFyci5yZWFkVUludDE2QkUgPSBCUC5yZWFkVUludDE2QkVcbiAgYXJyLnJlYWRVSW50MzJMRSA9IEJQLnJlYWRVSW50MzJMRVxuICBhcnIucmVhZFVJbnQzMkJFID0gQlAucmVhZFVJbnQzMkJFXG4gIGFyci5yZWFkSW50TEUgPSBCUC5yZWFkSW50TEVcbiAgYXJyLnJlYWRJbnRCRSA9IEJQLnJlYWRJbnRCRVxuICBhcnIucmVhZEludDggPSBCUC5yZWFkSW50OFxuICBhcnIucmVhZEludDE2TEUgPSBCUC5yZWFkSW50MTZMRVxuICBhcnIucmVhZEludDE2QkUgPSBCUC5yZWFkSW50MTZCRVxuICBhcnIucmVhZEludDMyTEUgPSBCUC5yZWFkSW50MzJMRVxuICBhcnIucmVhZEludDMyQkUgPSBCUC5yZWFkSW50MzJCRVxuICBhcnIucmVhZEZsb2F0TEUgPSBCUC5yZWFkRmxvYXRMRVxuICBhcnIucmVhZEZsb2F0QkUgPSBCUC5yZWFkRmxvYXRCRVxuICBhcnIucmVhZERvdWJsZUxFID0gQlAucmVhZERvdWJsZUxFXG4gIGFyci5yZWFkRG91YmxlQkUgPSBCUC5yZWFkRG91YmxlQkVcbiAgYXJyLndyaXRlVUludDggPSBCUC53cml0ZVVJbnQ4XG4gIGFyci53cml0ZVVJbnRMRSA9IEJQLndyaXRlVUludExFXG4gIGFyci53cml0ZVVJbnRCRSA9IEJQLndyaXRlVUludEJFXG4gIGFyci53cml0ZVVJbnQxNkxFID0gQlAud3JpdGVVSW50MTZMRVxuICBhcnIud3JpdGVVSW50MTZCRSA9IEJQLndyaXRlVUludDE2QkVcbiAgYXJyLndyaXRlVUludDMyTEUgPSBCUC53cml0ZVVJbnQzMkxFXG4gIGFyci53cml0ZVVJbnQzMkJFID0gQlAud3JpdGVVSW50MzJCRVxuICBhcnIud3JpdGVJbnRMRSA9IEJQLndyaXRlSW50TEVcbiAgYXJyLndyaXRlSW50QkUgPSBCUC53cml0ZUludEJFXG4gIGFyci53cml0ZUludDggPSBCUC53cml0ZUludDhcbiAgYXJyLndyaXRlSW50MTZMRSA9IEJQLndyaXRlSW50MTZMRVxuICBhcnIud3JpdGVJbnQxNkJFID0gQlAud3JpdGVJbnQxNkJFXG4gIGFyci53cml0ZUludDMyTEUgPSBCUC53cml0ZUludDMyTEVcbiAgYXJyLndyaXRlSW50MzJCRSA9IEJQLndyaXRlSW50MzJCRVxuICBhcnIud3JpdGVGbG9hdExFID0gQlAud3JpdGVGbG9hdExFXG4gIGFyci53cml0ZUZsb2F0QkUgPSBCUC53cml0ZUZsb2F0QkVcbiAgYXJyLndyaXRlRG91YmxlTEUgPSBCUC53cml0ZURvdWJsZUxFXG4gIGFyci53cml0ZURvdWJsZUJFID0gQlAud3JpdGVEb3VibGVCRVxuICBhcnIuZmlsbCA9IEJQLmZpbGxcbiAgYXJyLmluc3BlY3QgPSBCUC5pbnNwZWN0XG4gIGFyci50b0FycmF5QnVmZmVyID0gQlAudG9BcnJheUJ1ZmZlclxuXG4gIHJldHVybiBhcnJcbn1cblxudmFyIElOVkFMSURfQkFTRTY0X1JFID0gL1teK1xcLzAtOUEtelxcLV0vZ1xuXG5mdW5jdGlvbiBiYXNlNjRjbGVhbiAoc3RyKSB7XG4gIC8vIE5vZGUgc3RyaXBzIG91dCBpbnZhbGlkIGNoYXJhY3RlcnMgbGlrZSBcXG4gYW5kIFxcdCBmcm9tIHRoZSBzdHJpbmcsIGJhc2U2NC1qcyBkb2VzIG5vdFxuICBzdHIgPSBzdHJpbmd0cmltKHN0cikucmVwbGFjZShJTlZBTElEX0JBU0U2NF9SRSwgJycpXG4gIC8vIE5vZGUgY29udmVydHMgc3RyaW5ncyB3aXRoIGxlbmd0aCA8IDIgdG8gJydcbiAgaWYgKHN0ci5sZW5ndGggPCAyKSByZXR1cm4gJydcbiAgLy8gTm9kZSBhbGxvd3MgZm9yIG5vbi1wYWRkZWQgYmFzZTY0IHN0cmluZ3MgKG1pc3NpbmcgdHJhaWxpbmcgPT09KSwgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHdoaWxlIChzdHIubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgIHN0ciA9IHN0ciArICc9J1xuICB9XG4gIHJldHVybiBzdHJcbn1cblxuZnVuY3Rpb24gc3RyaW5ndHJpbSAoc3RyKSB7XG4gIGlmIChzdHIudHJpbSkgcmV0dXJuIHN0ci50cmltKClcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJylcbn1cblxuZnVuY3Rpb24gaXNBcnJheWlzaCAoc3ViamVjdCkge1xuICByZXR1cm4gaXNBcnJheShzdWJqZWN0KSB8fCBCdWZmZXIuaXNCdWZmZXIoc3ViamVjdCkgfHxcbiAgICAgIHN1YmplY3QgJiYgdHlwZW9mIHN1YmplY3QgPT09ICdvYmplY3QnICYmXG4gICAgICB0eXBlb2Ygc3ViamVjdC5sZW5ndGggPT09ICdudW1iZXInXG59XG5cbmZ1bmN0aW9uIHRvSGV4IChuKSB7XG4gIGlmIChuIDwgMTYpIHJldHVybiAnMCcgKyBuLnRvU3RyaW5nKDE2KVxuICByZXR1cm4gbi50b1N0cmluZygxNilcbn1cblxuZnVuY3Rpb24gdXRmOFRvQnl0ZXMgKHN0cmluZywgdW5pdHMpIHtcbiAgdW5pdHMgPSB1bml0cyB8fCBJbmZpbml0eVxuICB2YXIgY29kZVBvaW50XG4gIHZhciBsZW5ndGggPSBzdHJpbmcubGVuZ3RoXG4gIHZhciBsZWFkU3Vycm9nYXRlID0gbnVsbFxuICB2YXIgYnl0ZXMgPSBbXVxuICB2YXIgaSA9IDBcblxuICBmb3IgKDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgY29kZVBvaW50ID0gc3RyaW5nLmNoYXJDb2RlQXQoaSlcblxuICAgIC8vIGlzIHN1cnJvZ2F0ZSBjb21wb25lbnRcbiAgICBpZiAoY29kZVBvaW50ID4gMHhEN0ZGICYmIGNvZGVQb2ludCA8IDB4RTAwMCkge1xuICAgICAgLy8gbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICAgIGlmIChsZWFkU3Vycm9nYXRlKSB7XG4gICAgICAgIC8vIDIgbGVhZHMgaW4gYSByb3dcbiAgICAgICAgaWYgKGNvZGVQb2ludCA8IDB4REMwMCkge1xuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGxlYWRTdXJyb2dhdGUgPSBjb2RlUG9pbnRcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHZhbGlkIHN1cnJvZ2F0ZSBwYWlyXG4gICAgICAgICAgY29kZVBvaW50ID0gbGVhZFN1cnJvZ2F0ZSAtIDB4RDgwMCA8PCAxMCB8IGNvZGVQb2ludCAtIDB4REMwMCB8IDB4MTAwMDBcbiAgICAgICAgICBsZWFkU3Vycm9nYXRlID0gbnVsbFxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBubyBsZWFkIHlldFxuXG4gICAgICAgIGlmIChjb2RlUG9pbnQgPiAweERCRkYpIHtcbiAgICAgICAgICAvLyB1bmV4cGVjdGVkIHRyYWlsXG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfSBlbHNlIGlmIChpICsgMSA9PT0gbGVuZ3RoKSB7XG4gICAgICAgICAgLy8gdW5wYWlyZWQgbGVhZFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gdmFsaWQgbGVhZFxuICAgICAgICAgIGxlYWRTdXJyb2dhdGUgPSBjb2RlUG9pbnRcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChsZWFkU3Vycm9nYXRlKSB7XG4gICAgICAvLyB2YWxpZCBibXAgY2hhciwgYnV0IGxhc3QgY2hhciB3YXMgYSBsZWFkXG4gICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgIGxlYWRTdXJyb2dhdGUgPSBudWxsXG4gICAgfVxuXG4gICAgLy8gZW5jb2RlIHV0ZjhcbiAgICBpZiAoY29kZVBvaW50IDwgMHg4MCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAxKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKGNvZGVQb2ludClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4ODAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgfCAweEMwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHgxMDAwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAzKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHhDIHwgMHhFMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHgyMDAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gNCkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4MTIgfCAweEYwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHhDICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNvZGUgcG9pbnQnKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBieXRlc1xufVxuXG5mdW5jdGlvbiBhc2NpaVRvQnl0ZXMgKHN0cikge1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAvLyBOb2RlJ3MgY29kZSBzZWVtcyB0byBiZSBkb2luZyB0aGlzIGFuZCBub3QgJiAweDdGLi5cbiAgICBieXRlQXJyYXkucHVzaChzdHIuY2hhckNvZGVBdChpKSAmIDB4RkYpXG4gIH1cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiB1dGYxNmxlVG9CeXRlcyAoc3RyLCB1bml0cykge1xuICB2YXIgYywgaGksIGxvXG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIGlmICgodW5pdHMgLT0gMikgPCAwKSBicmVha1xuXG4gICAgYyA9IHN0ci5jaGFyQ29kZUF0KGkpXG4gICAgaGkgPSBjID4+IDhcbiAgICBsbyA9IGMgJSAyNTZcbiAgICBieXRlQXJyYXkucHVzaChsbylcbiAgICBieXRlQXJyYXkucHVzaChoaSlcbiAgfVxuXG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYmFzZTY0VG9CeXRlcyAoc3RyKSB7XG4gIHJldHVybiBiYXNlNjQudG9CeXRlQXJyYXkoYmFzZTY0Y2xlYW4oc3RyKSlcbn1cblxuZnVuY3Rpb24gYmxpdEJ1ZmZlciAoc3JjLCBkc3QsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoKGkgKyBvZmZzZXQgPj0gZHN0Lmxlbmd0aCkgfHwgKGkgPj0gc3JjLmxlbmd0aCkpIGJyZWFrXG4gICAgZHN0W2kgKyBvZmZzZXRdID0gc3JjW2ldXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gZGVjb2RlVXRmOENoYXIgKHN0cikge1xuICB0cnkge1xuICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoc3RyKVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSgweEZGRkQpIC8vIFVURiA4IGludmFsaWQgY2hhclxuICB9XG59XG4iLCJ2YXIgbG9va3VwID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nO1xuXG47KGZ1bmN0aW9uIChleHBvcnRzKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuICB2YXIgQXJyID0gKHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJylcbiAgICA/IFVpbnQ4QXJyYXlcbiAgICA6IEFycmF5XG5cblx0dmFyIFBMVVMgICA9ICcrJy5jaGFyQ29kZUF0KDApXG5cdHZhciBTTEFTSCAgPSAnLycuY2hhckNvZGVBdCgwKVxuXHR2YXIgTlVNQkVSID0gJzAnLmNoYXJDb2RlQXQoMClcblx0dmFyIExPV0VSICA9ICdhJy5jaGFyQ29kZUF0KDApXG5cdHZhciBVUFBFUiAgPSAnQScuY2hhckNvZGVBdCgwKVxuXHR2YXIgUExVU19VUkxfU0FGRSA9ICctJy5jaGFyQ29kZUF0KDApXG5cdHZhciBTTEFTSF9VUkxfU0FGRSA9ICdfJy5jaGFyQ29kZUF0KDApXG5cblx0ZnVuY3Rpb24gZGVjb2RlIChlbHQpIHtcblx0XHR2YXIgY29kZSA9IGVsdC5jaGFyQ29kZUF0KDApXG5cdFx0aWYgKGNvZGUgPT09IFBMVVMgfHxcblx0XHQgICAgY29kZSA9PT0gUExVU19VUkxfU0FGRSlcblx0XHRcdHJldHVybiA2MiAvLyAnKydcblx0XHRpZiAoY29kZSA9PT0gU0xBU0ggfHxcblx0XHQgICAgY29kZSA9PT0gU0xBU0hfVVJMX1NBRkUpXG5cdFx0XHRyZXR1cm4gNjMgLy8gJy8nXG5cdFx0aWYgKGNvZGUgPCBOVU1CRVIpXG5cdFx0XHRyZXR1cm4gLTEgLy9ubyBtYXRjaFxuXHRcdGlmIChjb2RlIDwgTlVNQkVSICsgMTApXG5cdFx0XHRyZXR1cm4gY29kZSAtIE5VTUJFUiArIDI2ICsgMjZcblx0XHRpZiAoY29kZSA8IFVQUEVSICsgMjYpXG5cdFx0XHRyZXR1cm4gY29kZSAtIFVQUEVSXG5cdFx0aWYgKGNvZGUgPCBMT1dFUiArIDI2KVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBMT1dFUiArIDI2XG5cdH1cblxuXHRmdW5jdGlvbiBiNjRUb0J5dGVBcnJheSAoYjY0KSB7XG5cdFx0dmFyIGksIGosIGwsIHRtcCwgcGxhY2VIb2xkZXJzLCBhcnJcblxuXHRcdGlmIChiNjQubGVuZ3RoICUgNCA+IDApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzdHJpbmcuIExlbmd0aCBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNCcpXG5cdFx0fVxuXG5cdFx0Ly8gdGhlIG51bWJlciBvZiBlcXVhbCBzaWducyAocGxhY2UgaG9sZGVycylcblx0XHQvLyBpZiB0aGVyZSBhcmUgdHdvIHBsYWNlaG9sZGVycywgdGhhbiB0aGUgdHdvIGNoYXJhY3RlcnMgYmVmb3JlIGl0XG5cdFx0Ly8gcmVwcmVzZW50IG9uZSBieXRlXG5cdFx0Ly8gaWYgdGhlcmUgaXMgb25seSBvbmUsIHRoZW4gdGhlIHRocmVlIGNoYXJhY3RlcnMgYmVmb3JlIGl0IHJlcHJlc2VudCAyIGJ5dGVzXG5cdFx0Ly8gdGhpcyBpcyBqdXN0IGEgY2hlYXAgaGFjayB0byBub3QgZG8gaW5kZXhPZiB0d2ljZVxuXHRcdHZhciBsZW4gPSBiNjQubGVuZ3RoXG5cdFx0cGxhY2VIb2xkZXJzID0gJz0nID09PSBiNjQuY2hhckF0KGxlbiAtIDIpID8gMiA6ICc9JyA9PT0gYjY0LmNoYXJBdChsZW4gLSAxKSA/IDEgOiAwXG5cblx0XHQvLyBiYXNlNjQgaXMgNC8zICsgdXAgdG8gdHdvIGNoYXJhY3RlcnMgb2YgdGhlIG9yaWdpbmFsIGRhdGFcblx0XHRhcnIgPSBuZXcgQXJyKGI2NC5sZW5ndGggKiAzIC8gNCAtIHBsYWNlSG9sZGVycylcblxuXHRcdC8vIGlmIHRoZXJlIGFyZSBwbGFjZWhvbGRlcnMsIG9ubHkgZ2V0IHVwIHRvIHRoZSBsYXN0IGNvbXBsZXRlIDQgY2hhcnNcblx0XHRsID0gcGxhY2VIb2xkZXJzID4gMCA/IGI2NC5sZW5ndGggLSA0IDogYjY0Lmxlbmd0aFxuXG5cdFx0dmFyIEwgPSAwXG5cblx0XHRmdW5jdGlvbiBwdXNoICh2KSB7XG5cdFx0XHRhcnJbTCsrXSA9IHZcblx0XHR9XG5cblx0XHRmb3IgKGkgPSAwLCBqID0gMDsgaSA8IGw7IGkgKz0gNCwgaiArPSAzKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDE4KSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpIDw8IDEyKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMikpIDw8IDYpIHwgZGVjb2RlKGI2NC5jaGFyQXQoaSArIDMpKVxuXHRcdFx0cHVzaCgodG1wICYgMHhGRjAwMDApID4+IDE2KVxuXHRcdFx0cHVzaCgodG1wICYgMHhGRjAwKSA+PiA4KVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH1cblxuXHRcdGlmIChwbGFjZUhvbGRlcnMgPT09IDIpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMikgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA+PiA0KVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH0gZWxzZSBpZiAocGxhY2VIb2xkZXJzID09PSAxKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDEwKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpIDw8IDQpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAyKSkgPj4gMilcblx0XHRcdHB1c2goKHRtcCA+PiA4KSAmIDB4RkYpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fVxuXG5cdFx0cmV0dXJuIGFyclxuXHR9XG5cblx0ZnVuY3Rpb24gdWludDhUb0Jhc2U2NCAodWludDgpIHtcblx0XHR2YXIgaSxcblx0XHRcdGV4dHJhQnl0ZXMgPSB1aW50OC5sZW5ndGggJSAzLCAvLyBpZiB3ZSBoYXZlIDEgYnl0ZSBsZWZ0LCBwYWQgMiBieXRlc1xuXHRcdFx0b3V0cHV0ID0gXCJcIixcblx0XHRcdHRlbXAsIGxlbmd0aFxuXG5cdFx0ZnVuY3Rpb24gZW5jb2RlIChudW0pIHtcblx0XHRcdHJldHVybiBsb29rdXAuY2hhckF0KG51bSlcblx0XHR9XG5cblx0XHRmdW5jdGlvbiB0cmlwbGV0VG9CYXNlNjQgKG51bSkge1xuXHRcdFx0cmV0dXJuIGVuY29kZShudW0gPj4gMTggJiAweDNGKSArIGVuY29kZShudW0gPj4gMTIgJiAweDNGKSArIGVuY29kZShudW0gPj4gNiAmIDB4M0YpICsgZW5jb2RlKG51bSAmIDB4M0YpXG5cdFx0fVxuXG5cdFx0Ly8gZ28gdGhyb3VnaCB0aGUgYXJyYXkgZXZlcnkgdGhyZWUgYnl0ZXMsIHdlJ2xsIGRlYWwgd2l0aCB0cmFpbGluZyBzdHVmZiBsYXRlclxuXHRcdGZvciAoaSA9IDAsIGxlbmd0aCA9IHVpbnQ4Lmxlbmd0aCAtIGV4dHJhQnl0ZXM7IGkgPCBsZW5ndGg7IGkgKz0gMykge1xuXHRcdFx0dGVtcCA9ICh1aW50OFtpXSA8PCAxNikgKyAodWludDhbaSArIDFdIDw8IDgpICsgKHVpbnQ4W2kgKyAyXSlcblx0XHRcdG91dHB1dCArPSB0cmlwbGV0VG9CYXNlNjQodGVtcClcblx0XHR9XG5cblx0XHQvLyBwYWQgdGhlIGVuZCB3aXRoIHplcm9zLCBidXQgbWFrZSBzdXJlIHRvIG5vdCBmb3JnZXQgdGhlIGV4dHJhIGJ5dGVzXG5cdFx0c3dpdGNoIChleHRyYUJ5dGVzKSB7XG5cdFx0XHRjYXNlIDE6XG5cdFx0XHRcdHRlbXAgPSB1aW50OFt1aW50OC5sZW5ndGggLSAxXVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKHRlbXAgPj4gMilcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA8PCA0KSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSAnPT0nXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIDI6XG5cdFx0XHRcdHRlbXAgPSAodWludDhbdWludDgubGVuZ3RoIC0gMl0gPDwgOCkgKyAodWludDhbdWludDgubGVuZ3RoIC0gMV0pXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUodGVtcCA+PiAxMClcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA+PiA0KSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPDwgMikgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gJz0nXG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXG5cdFx0cmV0dXJuIG91dHB1dFxuXHR9XG5cblx0ZXhwb3J0cy50b0J5dGVBcnJheSA9IGI2NFRvQnl0ZUFycmF5XG5cdGV4cG9ydHMuZnJvbUJ5dGVBcnJheSA9IHVpbnQ4VG9CYXNlNjRcbn0odHlwZW9mIGV4cG9ydHMgPT09ICd1bmRlZmluZWQnID8gKHRoaXMuYmFzZTY0anMgPSB7fSkgOiBleHBvcnRzKSlcbiIsImV4cG9ydHMucmVhZCA9IGZ1bmN0aW9uKGJ1ZmZlciwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sXG4gICAgICBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxLFxuICAgICAgZU1heCA9ICgxIDw8IGVMZW4pIC0gMSxcbiAgICAgIGVCaWFzID0gZU1heCA+PiAxLFxuICAgICAgbkJpdHMgPSAtNyxcbiAgICAgIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMCxcbiAgICAgIGQgPSBpc0xFID8gLTEgOiAxLFxuICAgICAgcyA9IGJ1ZmZlcltvZmZzZXQgKyBpXTtcblxuICBpICs9IGQ7XG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSk7XG4gIHMgPj49ICgtbkJpdHMpO1xuICBuQml0cyArPSBlTGVuO1xuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gZSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KTtcblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKTtcbiAgZSA+Pj0gKC1uQml0cyk7XG4gIG5CaXRzICs9IG1MZW47XG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSBtICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpO1xuXG4gIGlmIChlID09PSAwKSB7XG4gICAgZSA9IDEgLSBlQmlhcztcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpO1xuICB9IGVsc2Uge1xuICAgIG0gPSBtICsgTWF0aC5wb3coMiwgbUxlbik7XG4gICAgZSA9IGUgLSBlQmlhcztcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKTtcbn07XG5cbmV4cG9ydHMud3JpdGUgPSBmdW5jdGlvbihidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSwgYyxcbiAgICAgIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDEsXG4gICAgICBlTWF4ID0gKDEgPDwgZUxlbikgLSAxLFxuICAgICAgZUJpYXMgPSBlTWF4ID4+IDEsXG4gICAgICBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMCksXG4gICAgICBpID0gaXNMRSA/IDAgOiAobkJ5dGVzIC0gMSksXG4gICAgICBkID0gaXNMRSA/IDEgOiAtMSxcbiAgICAgIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDA7XG5cbiAgdmFsdWUgPSBNYXRoLmFicyh2YWx1ZSk7XG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDA7XG4gICAgZSA9IGVNYXg7XG4gIH0gZWxzZSB7XG4gICAgZSA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjIpO1xuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLTtcbiAgICAgIGMgKj0gMjtcbiAgICB9XG4gICAgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICB2YWx1ZSArPSBydCAvIGM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKTtcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKys7XG4gICAgICBjIC89IDI7XG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMDtcbiAgICAgIGUgPSBlTWF4O1xuICAgIH0gZWxzZSBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIG0gPSAodmFsdWUgKiBjIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKTtcbiAgICAgIGUgPSBlICsgZUJpYXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSB2YWx1ZSAqIE1hdGgucG93KDIsIGVCaWFzIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKTtcbiAgICAgIGUgPSAwO1xuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpO1xuXG4gIGUgPSAoZSA8PCBtTGVuKSB8IG07XG4gIGVMZW4gKz0gbUxlbjtcbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KTtcblxuICBidWZmZXJbb2Zmc2V0ICsgaSAtIGRdIHw9IHMgKiAxMjg7XG59O1xuIiwiXG4vKipcbiAqIGlzQXJyYXlcbiAqL1xuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG5cbi8qKlxuICogdG9TdHJpbmdcbiAqL1xuXG52YXIgc3RyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuLyoqXG4gKiBXaGV0aGVyIG9yIG5vdCB0aGUgZ2l2ZW4gYHZhbGBcbiAqIGlzIGFuIGFycmF5LlxuICpcbiAqIGV4YW1wbGU6XG4gKlxuICogICAgICAgIGlzQXJyYXkoW10pO1xuICogICAgICAgIC8vID4gdHJ1ZVxuICogICAgICAgIGlzQXJyYXkoYXJndW1lbnRzKTtcbiAqICAgICAgICAvLyA+IGZhbHNlXG4gKiAgICAgICAgaXNBcnJheSgnJyk7XG4gKiAgICAgICAgLy8gPiBmYWxzZVxuICpcbiAqIEBwYXJhbSB7bWl4ZWR9IHZhbFxuICogQHJldHVybiB7Ym9vbH1cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGlzQXJyYXkgfHwgZnVuY3Rpb24gKHZhbCkge1xuICByZXR1cm4gISEgdmFsICYmICdbb2JqZWN0IEFycmF5XScgPT0gc3RyLmNhbGwodmFsKTtcbn07XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCJ2YXIgaHR0cCA9IG1vZHVsZS5leHBvcnRzO1xudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcbnZhciBSZXF1ZXN0ID0gcmVxdWlyZSgnLi9saWIvcmVxdWVzdCcpO1xudmFyIHVybCA9IHJlcXVpcmUoJ3VybCcpXG5cbmh0dHAucmVxdWVzdCA9IGZ1bmN0aW9uIChwYXJhbXMsIGNiKSB7XG4gICAgaWYgKHR5cGVvZiBwYXJhbXMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHBhcmFtcyA9IHVybC5wYXJzZShwYXJhbXMpXG4gICAgfVxuICAgIGlmICghcGFyYW1zKSBwYXJhbXMgPSB7fTtcbiAgICBpZiAoIXBhcmFtcy5ob3N0ICYmICFwYXJhbXMucG9ydCkge1xuICAgICAgICBwYXJhbXMucG9ydCA9IHBhcnNlSW50KHdpbmRvdy5sb2NhdGlvbi5wb3J0LCAxMCk7XG4gICAgfVxuICAgIGlmICghcGFyYW1zLmhvc3QgJiYgcGFyYW1zLmhvc3RuYW1lKSB7XG4gICAgICAgIHBhcmFtcy5ob3N0ID0gcGFyYW1zLmhvc3RuYW1lO1xuICAgIH1cblxuICAgIGlmICghcGFyYW1zLnByb3RvY29sKSB7XG4gICAgICAgIGlmIChwYXJhbXMuc2NoZW1lKSB7XG4gICAgICAgICAgICBwYXJhbXMucHJvdG9jb2wgPSBwYXJhbXMuc2NoZW1lICsgJzonO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGFyYW1zLnByb3RvY29sID0gd2luZG93LmxvY2F0aW9uLnByb3RvY29sO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFwYXJhbXMuaG9zdCkge1xuICAgICAgICBwYXJhbXMuaG9zdCA9IHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZSB8fCB3aW5kb3cubG9jYXRpb24uaG9zdDtcbiAgICB9XG4gICAgaWYgKC86Ly50ZXN0KHBhcmFtcy5ob3N0KSkge1xuICAgICAgICBpZiAoIXBhcmFtcy5wb3J0KSB7XG4gICAgICAgICAgICBwYXJhbXMucG9ydCA9IHBhcmFtcy5ob3N0LnNwbGl0KCc6JylbMV07XG4gICAgICAgIH1cbiAgICAgICAgcGFyYW1zLmhvc3QgPSBwYXJhbXMuaG9zdC5zcGxpdCgnOicpWzBdO1xuICAgIH1cbiAgICBpZiAoIXBhcmFtcy5wb3J0KSBwYXJhbXMucG9ydCA9IHBhcmFtcy5wcm90b2NvbCA9PSAnaHR0cHM6JyA/IDQ0MyA6IDgwO1xuICAgIFxuICAgIHZhciByZXEgPSBuZXcgUmVxdWVzdChuZXcgeGhySHR0cCwgcGFyYW1zKTtcbiAgICBpZiAoY2IpIHJlcS5vbigncmVzcG9uc2UnLCBjYik7XG4gICAgcmV0dXJuIHJlcTtcbn07XG5cbmh0dHAuZ2V0ID0gZnVuY3Rpb24gKHBhcmFtcywgY2IpIHtcbiAgICBwYXJhbXMubWV0aG9kID0gJ0dFVCc7XG4gICAgdmFyIHJlcSA9IGh0dHAucmVxdWVzdChwYXJhbXMsIGNiKTtcbiAgICByZXEuZW5kKCk7XG4gICAgcmV0dXJuIHJlcTtcbn07XG5cbmh0dHAuQWdlbnQgPSBmdW5jdGlvbiAoKSB7fTtcbmh0dHAuQWdlbnQuZGVmYXVsdE1heFNvY2tldHMgPSA0O1xuXG52YXIgeGhySHR0cCA9IChmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignbm8gd2luZG93IG9iamVjdCBwcmVzZW50Jyk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHdpbmRvdy5YTUxIdHRwUmVxdWVzdCkge1xuICAgICAgICByZXR1cm4gd2luZG93LlhNTEh0dHBSZXF1ZXN0O1xuICAgIH1cbiAgICBlbHNlIGlmICh3aW5kb3cuQWN0aXZlWE9iamVjdCkge1xuICAgICAgICB2YXIgYXhzID0gW1xuICAgICAgICAgICAgJ01zeG1sMi5YTUxIVFRQLjYuMCcsXG4gICAgICAgICAgICAnTXN4bWwyLlhNTEhUVFAuMy4wJyxcbiAgICAgICAgICAgICdNaWNyb3NvZnQuWE1MSFRUUCdcbiAgICAgICAgXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBheHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdmFyIGF4ID0gbmV3KHdpbmRvdy5BY3RpdmVYT2JqZWN0KShheHNbaV0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChheCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGF4XyA9IGF4O1xuICAgICAgICAgICAgICAgICAgICAgICAgYXggPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF4XztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcod2luZG93LkFjdGl2ZVhPYmplY3QpKGF4c1tpXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGUpIHt9XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdhamF4IG5vdCBzdXBwb3J0ZWQgaW4gdGhpcyBicm93c2VyJylcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYWpheCBub3Qgc3VwcG9ydGVkIGluIHRoaXMgYnJvd3NlcicpO1xuICAgIH1cbn0pKCk7XG5cbmh0dHAuU1RBVFVTX0NPREVTID0ge1xuICAgIDEwMCA6ICdDb250aW51ZScsXG4gICAgMTAxIDogJ1N3aXRjaGluZyBQcm90b2NvbHMnLFxuICAgIDEwMiA6ICdQcm9jZXNzaW5nJywgICAgICAgICAgICAgICAgIC8vIFJGQyAyNTE4LCBvYnNvbGV0ZWQgYnkgUkZDIDQ5MThcbiAgICAyMDAgOiAnT0snLFxuICAgIDIwMSA6ICdDcmVhdGVkJyxcbiAgICAyMDIgOiAnQWNjZXB0ZWQnLFxuICAgIDIwMyA6ICdOb24tQXV0aG9yaXRhdGl2ZSBJbmZvcm1hdGlvbicsXG4gICAgMjA0IDogJ05vIENvbnRlbnQnLFxuICAgIDIwNSA6ICdSZXNldCBDb250ZW50JyxcbiAgICAyMDYgOiAnUGFydGlhbCBDb250ZW50JyxcbiAgICAyMDcgOiAnTXVsdGktU3RhdHVzJywgICAgICAgICAgICAgICAvLyBSRkMgNDkxOFxuICAgIDMwMCA6ICdNdWx0aXBsZSBDaG9pY2VzJyxcbiAgICAzMDEgOiAnTW92ZWQgUGVybWFuZW50bHknLFxuICAgIDMwMiA6ICdNb3ZlZCBUZW1wb3JhcmlseScsXG4gICAgMzAzIDogJ1NlZSBPdGhlcicsXG4gICAgMzA0IDogJ05vdCBNb2RpZmllZCcsXG4gICAgMzA1IDogJ1VzZSBQcm94eScsXG4gICAgMzA3IDogJ1RlbXBvcmFyeSBSZWRpcmVjdCcsXG4gICAgNDAwIDogJ0JhZCBSZXF1ZXN0JyxcbiAgICA0MDEgOiAnVW5hdXRob3JpemVkJyxcbiAgICA0MDIgOiAnUGF5bWVudCBSZXF1aXJlZCcsXG4gICAgNDAzIDogJ0ZvcmJpZGRlbicsXG4gICAgNDA0IDogJ05vdCBGb3VuZCcsXG4gICAgNDA1IDogJ01ldGhvZCBOb3QgQWxsb3dlZCcsXG4gICAgNDA2IDogJ05vdCBBY2NlcHRhYmxlJyxcbiAgICA0MDcgOiAnUHJveHkgQXV0aGVudGljYXRpb24gUmVxdWlyZWQnLFxuICAgIDQwOCA6ICdSZXF1ZXN0IFRpbWUtb3V0JyxcbiAgICA0MDkgOiAnQ29uZmxpY3QnLFxuICAgIDQxMCA6ICdHb25lJyxcbiAgICA0MTEgOiAnTGVuZ3RoIFJlcXVpcmVkJyxcbiAgICA0MTIgOiAnUHJlY29uZGl0aW9uIEZhaWxlZCcsXG4gICAgNDEzIDogJ1JlcXVlc3QgRW50aXR5IFRvbyBMYXJnZScsXG4gICAgNDE0IDogJ1JlcXVlc3QtVVJJIFRvbyBMYXJnZScsXG4gICAgNDE1IDogJ1Vuc3VwcG9ydGVkIE1lZGlhIFR5cGUnLFxuICAgIDQxNiA6ICdSZXF1ZXN0ZWQgUmFuZ2UgTm90IFNhdGlzZmlhYmxlJyxcbiAgICA0MTcgOiAnRXhwZWN0YXRpb24gRmFpbGVkJyxcbiAgICA0MTggOiAnSVxcJ20gYSB0ZWFwb3QnLCAgICAgICAgICAgICAgLy8gUkZDIDIzMjRcbiAgICA0MjIgOiAnVW5wcm9jZXNzYWJsZSBFbnRpdHknLCAgICAgICAvLyBSRkMgNDkxOFxuICAgIDQyMyA6ICdMb2NrZWQnLCAgICAgICAgICAgICAgICAgICAgIC8vIFJGQyA0OTE4XG4gICAgNDI0IDogJ0ZhaWxlZCBEZXBlbmRlbmN5JywgICAgICAgICAgLy8gUkZDIDQ5MThcbiAgICA0MjUgOiAnVW5vcmRlcmVkIENvbGxlY3Rpb24nLCAgICAgICAvLyBSRkMgNDkxOFxuICAgIDQyNiA6ICdVcGdyYWRlIFJlcXVpcmVkJywgICAgICAgICAgIC8vIFJGQyAyODE3XG4gICAgNDI4IDogJ1ByZWNvbmRpdGlvbiBSZXF1aXJlZCcsICAgICAgLy8gUkZDIDY1ODVcbiAgICA0MjkgOiAnVG9vIE1hbnkgUmVxdWVzdHMnLCAgICAgICAgICAvLyBSRkMgNjU4NVxuICAgIDQzMSA6ICdSZXF1ZXN0IEhlYWRlciBGaWVsZHMgVG9vIExhcmdlJywvLyBSRkMgNjU4NVxuICAgIDUwMCA6ICdJbnRlcm5hbCBTZXJ2ZXIgRXJyb3InLFxuICAgIDUwMSA6ICdOb3QgSW1wbGVtZW50ZWQnLFxuICAgIDUwMiA6ICdCYWQgR2F0ZXdheScsXG4gICAgNTAzIDogJ1NlcnZpY2UgVW5hdmFpbGFibGUnLFxuICAgIDUwNCA6ICdHYXRld2F5IFRpbWUtb3V0JyxcbiAgICA1MDUgOiAnSFRUUCBWZXJzaW9uIE5vdCBTdXBwb3J0ZWQnLFxuICAgIDUwNiA6ICdWYXJpYW50IEFsc28gTmVnb3RpYXRlcycsICAgIC8vIFJGQyAyMjk1XG4gICAgNTA3IDogJ0luc3VmZmljaWVudCBTdG9yYWdlJywgICAgICAgLy8gUkZDIDQ5MThcbiAgICA1MDkgOiAnQmFuZHdpZHRoIExpbWl0IEV4Y2VlZGVkJyxcbiAgICA1MTAgOiAnTm90IEV4dGVuZGVkJywgICAgICAgICAgICAgICAvLyBSRkMgMjc3NFxuICAgIDUxMSA6ICdOZXR3b3JrIEF1dGhlbnRpY2F0aW9uIFJlcXVpcmVkJyAvLyBSRkMgNjU4NVxufTsiLCJ2YXIgU3RyZWFtID0gcmVxdWlyZSgnc3RyZWFtJyk7XG52YXIgUmVzcG9uc2UgPSByZXF1aXJlKCcuL3Jlc3BvbnNlJyk7XG52YXIgQmFzZTY0ID0gcmVxdWlyZSgnQmFzZTY0Jyk7XG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuXG52YXIgUmVxdWVzdCA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHhociwgcGFyYW1zKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHNlbGYud3JpdGFibGUgPSB0cnVlO1xuICAgIHNlbGYueGhyID0geGhyO1xuICAgIHNlbGYuYm9keSA9IFtdO1xuICAgIFxuICAgIHNlbGYudXJpID0gKHBhcmFtcy5wcm90b2NvbCB8fCAnaHR0cDonKSArICcvLydcbiAgICAgICAgKyBwYXJhbXMuaG9zdFxuICAgICAgICArIChwYXJhbXMucG9ydCA/ICc6JyArIHBhcmFtcy5wb3J0IDogJycpXG4gICAgICAgICsgKHBhcmFtcy5wYXRoIHx8ICcvJylcbiAgICA7XG4gICAgXG4gICAgaWYgKHR5cGVvZiBwYXJhbXMud2l0aENyZWRlbnRpYWxzID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICBwYXJhbXMud2l0aENyZWRlbnRpYWxzID0gdHJ1ZTtcbiAgICB9XG5cbiAgICB0cnkgeyB4aHIud2l0aENyZWRlbnRpYWxzID0gcGFyYW1zLndpdGhDcmVkZW50aWFscyB9XG4gICAgY2F0Y2ggKGUpIHt9XG4gICAgXG4gICAgaWYgKHBhcmFtcy5yZXNwb25zZVR5cGUpIHRyeSB7IHhoci5yZXNwb25zZVR5cGUgPSBwYXJhbXMucmVzcG9uc2VUeXBlIH1cbiAgICBjYXRjaCAoZSkge31cbiAgICBcbiAgICB4aHIub3BlbihcbiAgICAgICAgcGFyYW1zLm1ldGhvZCB8fCAnR0VUJyxcbiAgICAgICAgc2VsZi51cmksXG4gICAgICAgIHRydWVcbiAgICApO1xuXG4gICAgeGhyLm9uZXJyb3IgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICBzZWxmLmVtaXQoJ2Vycm9yJywgbmV3IEVycm9yKCdOZXR3b3JrIGVycm9yJykpO1xuICAgIH07XG5cbiAgICBzZWxmLl9oZWFkZXJzID0ge307XG4gICAgXG4gICAgaWYgKHBhcmFtcy5oZWFkZXJzKSB7XG4gICAgICAgIHZhciBrZXlzID0gb2JqZWN0S2V5cyhwYXJhbXMuaGVhZGVycyk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICAgICAgICBpZiAoIXNlbGYuaXNTYWZlUmVxdWVzdEhlYWRlcihrZXkpKSBjb250aW51ZTtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IHBhcmFtcy5oZWFkZXJzW2tleV07XG4gICAgICAgICAgICBzZWxmLnNldEhlYWRlcihrZXksIHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBpZiAocGFyYW1zLmF1dGgpIHtcbiAgICAgICAgLy9iYXNpYyBhdXRoXG4gICAgICAgIHRoaXMuc2V0SGVhZGVyKCdBdXRob3JpemF0aW9uJywgJ0Jhc2ljICcgKyBCYXNlNjQuYnRvYShwYXJhbXMuYXV0aCkpO1xuICAgIH1cblxuICAgIHZhciByZXMgPSBuZXcgUmVzcG9uc2U7XG4gICAgcmVzLm9uKCdjbG9zZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2VsZi5lbWl0KCdjbG9zZScpO1xuICAgIH0pO1xuICAgIFxuICAgIHJlcy5vbigncmVhZHknLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNlbGYuZW1pdCgncmVzcG9uc2UnLCByZXMpO1xuICAgIH0pO1xuXG4gICAgcmVzLm9uKCdlcnJvcicsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgc2VsZi5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgfSk7XG4gICAgXG4gICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gRml4IGZvciBJRTkgYnVnXG4gICAgICAgIC8vIFNDUklQVDU3NTogQ291bGQgbm90IGNvbXBsZXRlIHRoZSBvcGVyYXRpb24gZHVlIHRvIGVycm9yIGMwMGMwMjNmXG4gICAgICAgIC8vIEl0IGhhcHBlbnMgd2hlbiBhIHJlcXVlc3QgaXMgYWJvcnRlZCwgY2FsbGluZyB0aGUgc3VjY2VzcyBjYWxsYmFjayBhbnl3YXkgd2l0aCByZWFkeVN0YXRlID09PSA0XG4gICAgICAgIGlmICh4aHIuX19hYm9ydGVkKSByZXR1cm47XG4gICAgICAgIHJlcy5oYW5kbGUoeGhyKTtcbiAgICB9O1xufTtcblxuaW5oZXJpdHMoUmVxdWVzdCwgU3RyZWFtKTtcblxuUmVxdWVzdC5wcm90b3R5cGUuc2V0SGVhZGVyID0gZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgICB0aGlzLl9oZWFkZXJzW2tleS50b0xvd2VyQ2FzZSgpXSA9IHZhbHVlXG59O1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5nZXRIZWFkZXIgPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgcmV0dXJuIHRoaXMuX2hlYWRlcnNba2V5LnRvTG93ZXJDYXNlKCldXG59O1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5yZW1vdmVIZWFkZXIgPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgZGVsZXRlIHRoaXMuX2hlYWRlcnNba2V5LnRvTG93ZXJDYXNlKCldXG59O1xuXG5SZXF1ZXN0LnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uIChzKSB7XG4gICAgdGhpcy5ib2R5LnB1c2gocyk7XG59O1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24gKHMpIHtcbiAgICB0aGlzLnhoci5fX2Fib3J0ZWQgPSB0cnVlO1xuICAgIHRoaXMueGhyLmFib3J0KCk7XG4gICAgdGhpcy5lbWl0KCdjbG9zZScpO1xufTtcblxuUmVxdWVzdC5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24gKHMpIHtcbiAgICBpZiAocyAhPT0gdW5kZWZpbmVkKSB0aGlzLmJvZHkucHVzaChzKTtcblxuICAgIHZhciBrZXlzID0gb2JqZWN0S2V5cyh0aGlzLl9oZWFkZXJzKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICAgIHZhciB2YWx1ZSA9IHRoaXMuX2hlYWRlcnNba2V5XTtcbiAgICAgICAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHZhbHVlLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy54aHIuc2V0UmVxdWVzdEhlYWRlcihrZXksIHZhbHVlW2pdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHRoaXMueGhyLnNldFJlcXVlc3RIZWFkZXIoa2V5LCB2YWx1ZSlcbiAgICB9XG5cbiAgICBpZiAodGhpcy5ib2R5Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB0aGlzLnhoci5zZW5kKCcnKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIHRoaXMuYm9keVswXSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhpcy54aHIuc2VuZCh0aGlzLmJvZHkuam9pbignJykpO1xuICAgIH1cbiAgICBlbHNlIGlmIChpc0FycmF5KHRoaXMuYm9keVswXSkpIHtcbiAgICAgICAgdmFyIGJvZHkgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmJvZHkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGJvZHkucHVzaC5hcHBseShib2R5LCB0aGlzLmJvZHlbaV0pO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMueGhyLnNlbmQoYm9keSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKC9BcnJheS8udGVzdChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodGhpcy5ib2R5WzBdKSkpIHtcbiAgICAgICAgdmFyIGxlbiA9IDA7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5ib2R5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBsZW4gKz0gdGhpcy5ib2R5W2ldLmxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYm9keSA9IG5ldyh0aGlzLmJvZHlbMF0uY29uc3RydWN0b3IpKGxlbik7XG4gICAgICAgIHZhciBrID0gMDtcbiAgICAgICAgXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5ib2R5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgYiA9IHRoaXMuYm9keVtpXTtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgYi5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIGJvZHlbaysrXSA9IGJbal07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy54aHIuc2VuZChib2R5KTtcbiAgICB9XG4gICAgZWxzZSBpZiAoaXNYSFIyQ29tcGF0aWJsZSh0aGlzLmJvZHlbMF0pKSB7XG4gICAgICAgIHRoaXMueGhyLnNlbmQodGhpcy5ib2R5WzBdKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHZhciBib2R5ID0gJyc7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5ib2R5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBib2R5ICs9IHRoaXMuYm9keVtpXS50b1N0cmluZygpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMueGhyLnNlbmQoYm9keSk7XG4gICAgfVxufTtcblxuLy8gVGFrZW4gZnJvbSBodHRwOi8vZHhyLm1vemlsbGEub3JnL21vemlsbGEvbW96aWxsYS1jZW50cmFsL2NvbnRlbnQvYmFzZS9zcmMvbnNYTUxIdHRwUmVxdWVzdC5jcHAuaHRtbFxuUmVxdWVzdC51bnNhZmVIZWFkZXJzID0gW1xuICAgIFwiYWNjZXB0LWNoYXJzZXRcIixcbiAgICBcImFjY2VwdC1lbmNvZGluZ1wiLFxuICAgIFwiYWNjZXNzLWNvbnRyb2wtcmVxdWVzdC1oZWFkZXJzXCIsXG4gICAgXCJhY2Nlc3MtY29udHJvbC1yZXF1ZXN0LW1ldGhvZFwiLFxuICAgIFwiY29ubmVjdGlvblwiLFxuICAgIFwiY29udGVudC1sZW5ndGhcIixcbiAgICBcImNvb2tpZVwiLFxuICAgIFwiY29va2llMlwiLFxuICAgIFwiY29udGVudC10cmFuc2Zlci1lbmNvZGluZ1wiLFxuICAgIFwiZGF0ZVwiLFxuICAgIFwiZXhwZWN0XCIsXG4gICAgXCJob3N0XCIsXG4gICAgXCJrZWVwLWFsaXZlXCIsXG4gICAgXCJvcmlnaW5cIixcbiAgICBcInJlZmVyZXJcIixcbiAgICBcInRlXCIsXG4gICAgXCJ0cmFpbGVyXCIsXG4gICAgXCJ0cmFuc2Zlci1lbmNvZGluZ1wiLFxuICAgIFwidXBncmFkZVwiLFxuICAgIFwidXNlci1hZ2VudFwiLFxuICAgIFwidmlhXCJcbl07XG5cblJlcXVlc3QucHJvdG90eXBlLmlzU2FmZVJlcXVlc3RIZWFkZXIgPSBmdW5jdGlvbiAoaGVhZGVyTmFtZSkge1xuICAgIGlmICghaGVhZGVyTmFtZSkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiBpbmRleE9mKFJlcXVlc3QudW5zYWZlSGVhZGVycywgaGVhZGVyTmFtZS50b0xvd2VyQ2FzZSgpKSA9PT0gLTE7XG59O1xuXG52YXIgb2JqZWN0S2V5cyA9IE9iamVjdC5rZXlzIHx8IGZ1bmN0aW9uIChvYmopIHtcbiAgICB2YXIga2V5cyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIGtleXMucHVzaChrZXkpO1xuICAgIHJldHVybiBrZXlzO1xufTtcblxudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uICh4cykge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeHMpID09PSAnW29iamVjdCBBcnJheV0nO1xufTtcblxudmFyIGluZGV4T2YgPSBmdW5jdGlvbiAoeHMsIHgpIHtcbiAgICBpZiAoeHMuaW5kZXhPZikgcmV0dXJuIHhzLmluZGV4T2YoeCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoeHNbaV0gPT09IHgpIHJldHVybiBpO1xuICAgIH1cbiAgICByZXR1cm4gLTE7XG59O1xuXG52YXIgaXNYSFIyQ29tcGF0aWJsZSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICBpZiAodHlwZW9mIEJsb2IgIT09ICd1bmRlZmluZWQnICYmIG9iaiBpbnN0YW5jZW9mIEJsb2IpIHJldHVybiB0cnVlO1xuICAgIGlmICh0eXBlb2YgQXJyYXlCdWZmZXIgIT09ICd1bmRlZmluZWQnICYmIG9iaiBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAodHlwZW9mIEZvcm1EYXRhICE9PSAndW5kZWZpbmVkJyAmJiBvYmogaW5zdGFuY2VvZiBGb3JtRGF0YSkgcmV0dXJuIHRydWU7XG59O1xuIiwidmFyIFN0cmVhbSA9IHJlcXVpcmUoJ3N0cmVhbScpO1xudmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsJyk7XG5cbnZhciBSZXNwb25zZSA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHJlcykge1xuICAgIHRoaXMub2Zmc2V0ID0gMDtcbiAgICB0aGlzLnJlYWRhYmxlID0gdHJ1ZTtcbn07XG5cbnV0aWwuaW5oZXJpdHMoUmVzcG9uc2UsIFN0cmVhbSk7XG5cbnZhciBjYXBhYmxlID0ge1xuICAgIHN0cmVhbWluZyA6IHRydWUsXG4gICAgc3RhdHVzMiA6IHRydWVcbn07XG5cbmZ1bmN0aW9uIHBhcnNlSGVhZGVycyAocmVzKSB7XG4gICAgdmFyIGxpbmVzID0gcmVzLmdldEFsbFJlc3BvbnNlSGVhZGVycygpLnNwbGl0KC9cXHI/XFxuLyk7XG4gICAgdmFyIGhlYWRlcnMgPSB7fTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBsaW5lID0gbGluZXNbaV07XG4gICAgICAgIGlmIChsaW5lID09PSAnJykgY29udGludWU7XG4gICAgICAgIFxuICAgICAgICB2YXIgbSA9IGxpbmUubWF0Y2goL14oW146XSspOlxccyooLiopLyk7XG4gICAgICAgIGlmIChtKSB7XG4gICAgICAgICAgICB2YXIga2V5ID0gbVsxXS50b0xvd2VyQ2FzZSgpLCB2YWx1ZSA9IG1bMl07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChoZWFkZXJzW2tleV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGlzQXJyYXkoaGVhZGVyc1trZXldKSkge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXJzW2tleV0ucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXJzW2tleV0gPSBbIGhlYWRlcnNba2V5XSwgdmFsdWUgXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBoZWFkZXJzW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGhlYWRlcnNbbGluZV0gPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBoZWFkZXJzO1xufVxuXG5SZXNwb25zZS5wcm90b3R5cGUuZ2V0UmVzcG9uc2UgPSBmdW5jdGlvbiAoeGhyKSB7XG4gICAgdmFyIHJlc3BUeXBlID0gU3RyaW5nKHhoci5yZXNwb25zZVR5cGUpLnRvTG93ZXJDYXNlKCk7XG4gICAgaWYgKHJlc3BUeXBlID09PSAnYmxvYicpIHJldHVybiB4aHIucmVzcG9uc2VCbG9iIHx8IHhoci5yZXNwb25zZTtcbiAgICBpZiAocmVzcFR5cGUgPT09ICdhcnJheWJ1ZmZlcicpIHJldHVybiB4aHIucmVzcG9uc2U7XG4gICAgcmV0dXJuIHhoci5yZXNwb25zZVRleHQ7XG59XG5cblJlc3BvbnNlLnByb3RvdHlwZS5nZXRIZWFkZXIgPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgcmV0dXJuIHRoaXMuaGVhZGVyc1trZXkudG9Mb3dlckNhc2UoKV07XG59O1xuXG5SZXNwb25zZS5wcm90b3R5cGUuaGFuZGxlID0gZnVuY3Rpb24gKHJlcykge1xuICAgIGlmIChyZXMucmVhZHlTdGF0ZSA9PT0gMiAmJiBjYXBhYmxlLnN0YXR1czIpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuc3RhdHVzQ29kZSA9IHJlcy5zdGF0dXM7XG4gICAgICAgICAgICB0aGlzLmhlYWRlcnMgPSBwYXJzZUhlYWRlcnMocmVzKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBjYXBhYmxlLnN0YXR1czIgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGNhcGFibGUuc3RhdHVzMikge1xuICAgICAgICAgICAgdGhpcy5lbWl0KCdyZWFkeScpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKGNhcGFibGUuc3RyZWFtaW5nICYmIHJlcy5yZWFkeVN0YXRlID09PSAzKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuc3RhdHVzQ29kZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdHVzQ29kZSA9IHJlcy5zdGF0dXM7XG4gICAgICAgICAgICAgICAgdGhpcy5oZWFkZXJzID0gcGFyc2VIZWFkZXJzKHJlcyk7XG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0KCdyZWFkeScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnIpIHt9XG4gICAgICAgIFxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5fZW1pdERhdGEocmVzKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBjYXBhYmxlLnN0cmVhbWluZyA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKHJlcy5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgIGlmICghdGhpcy5zdGF0dXNDb2RlKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXR1c0NvZGUgPSByZXMuc3RhdHVzO1xuICAgICAgICAgICAgdGhpcy5lbWl0KCdyZWFkeScpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2VtaXREYXRhKHJlcyk7XG4gICAgICAgIFxuICAgICAgICBpZiAocmVzLmVycm9yKSB7XG4gICAgICAgICAgICB0aGlzLmVtaXQoJ2Vycm9yJywgdGhpcy5nZXRSZXNwb25zZShyZXMpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHRoaXMuZW1pdCgnZW5kJyk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmVtaXQoJ2Nsb3NlJyk7XG4gICAgfVxufTtcblxuUmVzcG9uc2UucHJvdG90eXBlLl9lbWl0RGF0YSA9IGZ1bmN0aW9uIChyZXMpIHtcbiAgICB2YXIgcmVzcEJvZHkgPSB0aGlzLmdldFJlc3BvbnNlKHJlcyk7XG4gICAgaWYgKHJlc3BCb2R5LnRvU3RyaW5nKCkubWF0Y2goL0FycmF5QnVmZmVyLykpIHtcbiAgICAgICAgdGhpcy5lbWl0KCdkYXRhJywgbmV3IFVpbnQ4QXJyYXkocmVzcEJvZHksIHRoaXMub2Zmc2V0KSk7XG4gICAgICAgIHRoaXMub2Zmc2V0ID0gcmVzcEJvZHkuYnl0ZUxlbmd0aDtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAocmVzcEJvZHkubGVuZ3RoID4gdGhpcy5vZmZzZXQpIHtcbiAgICAgICAgdGhpcy5lbWl0KCdkYXRhJywgcmVzcEJvZHkuc2xpY2UodGhpcy5vZmZzZXQpKTtcbiAgICAgICAgdGhpcy5vZmZzZXQgPSByZXNwQm9keS5sZW5ndGg7XG4gICAgfVxufTtcblxudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uICh4cykge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeHMpID09PSAnW29iamVjdCBBcnJheV0nO1xufTtcbiIsIjsoZnVuY3Rpb24gKCkge1xuXG4gIHZhciBvYmplY3QgPSB0eXBlb2YgZXhwb3J0cyAhPSAndW5kZWZpbmVkJyA/IGV4cG9ydHMgOiB0aGlzOyAvLyAjODogd2ViIHdvcmtlcnNcbiAgdmFyIGNoYXJzID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky89JztcblxuICBmdW5jdGlvbiBJbnZhbGlkQ2hhcmFjdGVyRXJyb3IobWVzc2FnZSkge1xuICAgIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG4gIH1cbiAgSW52YWxpZENoYXJhY3RlckVycm9yLnByb3RvdHlwZSA9IG5ldyBFcnJvcjtcbiAgSW52YWxpZENoYXJhY3RlckVycm9yLnByb3RvdHlwZS5uYW1lID0gJ0ludmFsaWRDaGFyYWN0ZXJFcnJvcic7XG5cbiAgLy8gZW5jb2RlclxuICAvLyBbaHR0cHM6Ly9naXN0LmdpdGh1Yi5jb20vOTk5MTY2XSBieSBbaHR0cHM6Ly9naXRodWIuY29tL25pZ25hZ11cbiAgb2JqZWN0LmJ0b2EgfHwgKFxuICBvYmplY3QuYnRvYSA9IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgIGZvciAoXG4gICAgICAvLyBpbml0aWFsaXplIHJlc3VsdCBhbmQgY291bnRlclxuICAgICAgdmFyIGJsb2NrLCBjaGFyQ29kZSwgaWR4ID0gMCwgbWFwID0gY2hhcnMsIG91dHB1dCA9ICcnO1xuICAgICAgLy8gaWYgdGhlIG5leHQgaW5wdXQgaW5kZXggZG9lcyBub3QgZXhpc3Q6XG4gICAgICAvLyAgIGNoYW5nZSB0aGUgbWFwcGluZyB0YWJsZSB0byBcIj1cIlxuICAgICAgLy8gICBjaGVjayBpZiBkIGhhcyBubyBmcmFjdGlvbmFsIGRpZ2l0c1xuICAgICAgaW5wdXQuY2hhckF0KGlkeCB8IDApIHx8IChtYXAgPSAnPScsIGlkeCAlIDEpO1xuICAgICAgLy8gXCI4IC0gaWR4ICUgMSAqIDhcIiBnZW5lcmF0ZXMgdGhlIHNlcXVlbmNlIDIsIDQsIDYsIDhcbiAgICAgIG91dHB1dCArPSBtYXAuY2hhckF0KDYzICYgYmxvY2sgPj4gOCAtIGlkeCAlIDEgKiA4KVxuICAgICkge1xuICAgICAgY2hhckNvZGUgPSBpbnB1dC5jaGFyQ29kZUF0KGlkeCArPSAzLzQpO1xuICAgICAgaWYgKGNoYXJDb2RlID4gMHhGRikge1xuICAgICAgICB0aHJvdyBuZXcgSW52YWxpZENoYXJhY3RlckVycm9yKFwiJ2J0b2EnIGZhaWxlZDogVGhlIHN0cmluZyB0byBiZSBlbmNvZGVkIGNvbnRhaW5zIGNoYXJhY3RlcnMgb3V0c2lkZSBvZiB0aGUgTGF0aW4xIHJhbmdlLlwiKTtcbiAgICAgIH1cbiAgICAgIGJsb2NrID0gYmxvY2sgPDwgOCB8IGNoYXJDb2RlO1xuICAgIH1cbiAgICByZXR1cm4gb3V0cHV0O1xuICB9KTtcblxuICAvLyBkZWNvZGVyXG4gIC8vIFtodHRwczovL2dpc3QuZ2l0aHViLmNvbS8xMDIwMzk2XSBieSBbaHR0cHM6Ly9naXRodWIuY29tL2F0a11cbiAgb2JqZWN0LmF0b2IgfHwgKFxuICBvYmplY3QuYXRvYiA9IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgIGlucHV0ID0gaW5wdXQucmVwbGFjZSgvPSskLywgJycpO1xuICAgIGlmIChpbnB1dC5sZW5ndGggJSA0ID09IDEpIHtcbiAgICAgIHRocm93IG5ldyBJbnZhbGlkQ2hhcmFjdGVyRXJyb3IoXCInYXRvYicgZmFpbGVkOiBUaGUgc3RyaW5nIHRvIGJlIGRlY29kZWQgaXMgbm90IGNvcnJlY3RseSBlbmNvZGVkLlwiKTtcbiAgICB9XG4gICAgZm9yIChcbiAgICAgIC8vIGluaXRpYWxpemUgcmVzdWx0IGFuZCBjb3VudGVyc1xuICAgICAgdmFyIGJjID0gMCwgYnMsIGJ1ZmZlciwgaWR4ID0gMCwgb3V0cHV0ID0gJyc7XG4gICAgICAvLyBnZXQgbmV4dCBjaGFyYWN0ZXJcbiAgICAgIGJ1ZmZlciA9IGlucHV0LmNoYXJBdChpZHgrKyk7XG4gICAgICAvLyBjaGFyYWN0ZXIgZm91bmQgaW4gdGFibGU/IGluaXRpYWxpemUgYml0IHN0b3JhZ2UgYW5kIGFkZCBpdHMgYXNjaWkgdmFsdWU7XG4gICAgICB+YnVmZmVyICYmIChicyA9IGJjICUgNCA/IGJzICogNjQgKyBidWZmZXIgOiBidWZmZXIsXG4gICAgICAgIC8vIGFuZCBpZiBub3QgZmlyc3Qgb2YgZWFjaCA0IGNoYXJhY3RlcnMsXG4gICAgICAgIC8vIGNvbnZlcnQgdGhlIGZpcnN0IDggYml0cyB0byBvbmUgYXNjaWkgY2hhcmFjdGVyXG4gICAgICAgIGJjKysgJSA0KSA/IG91dHB1dCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKDI1NSAmIGJzID4+ICgtMiAqIGJjICYgNikpIDogMFxuICAgICkge1xuICAgICAgLy8gdHJ5IHRvIGZpbmQgY2hhcmFjdGVyIGluIHRhYmxlICgwLTYzLCBub3QgZm91bmQgPT4gLTEpXG4gICAgICBidWZmZXIgPSBjaGFycy5pbmRleE9mKGJ1ZmZlcik7XG4gICAgfVxuICAgIHJldHVybiBvdXRwdXQ7XG4gIH0pO1xuXG59KCkpO1xuIiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKGFycikge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGFycikgPT0gJ1tvYmplY3QgQXJyYXldJztcbn07XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IHRydWU7XG4gICAgdmFyIGN1cnJlbnRRdWV1ZTtcbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgdmFyIGkgPSAtMTtcbiAgICAgICAgd2hpbGUgKCsraSA8IGxlbikge1xuICAgICAgICAgICAgY3VycmVudFF1ZXVlW2ldKCk7XG4gICAgICAgIH1cbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xufVxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICBxdWV1ZS5wdXNoKGZ1bik7XG4gICAgaWYgKCFkcmFpbmluZykge1xuICAgICAgICBzZXRUaW1lb3V0KGRyYWluUXVldWUsIDApO1xuICAgIH1cbn07XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiLyohIGh0dHA6Ly9tdGhzLmJlL3B1bnljb2RlIHYxLjIuNCBieSBAbWF0aGlhcyAqL1xuOyhmdW5jdGlvbihyb290KSB7XG5cblx0LyoqIERldGVjdCBmcmVlIHZhcmlhYmxlcyAqL1xuXHR2YXIgZnJlZUV4cG9ydHMgPSB0eXBlb2YgZXhwb3J0cyA9PSAnb2JqZWN0JyAmJiBleHBvcnRzO1xuXHR2YXIgZnJlZU1vZHVsZSA9IHR5cGVvZiBtb2R1bGUgPT0gJ29iamVjdCcgJiYgbW9kdWxlICYmXG5cdFx0bW9kdWxlLmV4cG9ydHMgPT0gZnJlZUV4cG9ydHMgJiYgbW9kdWxlO1xuXHR2YXIgZnJlZUdsb2JhbCA9IHR5cGVvZiBnbG9iYWwgPT0gJ29iamVjdCcgJiYgZ2xvYmFsO1xuXHRpZiAoZnJlZUdsb2JhbC5nbG9iYWwgPT09IGZyZWVHbG9iYWwgfHwgZnJlZUdsb2JhbC53aW5kb3cgPT09IGZyZWVHbG9iYWwpIHtcblx0XHRyb290ID0gZnJlZUdsb2JhbDtcblx0fVxuXG5cdC8qKlxuXHQgKiBUaGUgYHB1bnljb2RlYCBvYmplY3QuXG5cdCAqIEBuYW1lIHB1bnljb2RlXG5cdCAqIEB0eXBlIE9iamVjdFxuXHQgKi9cblx0dmFyIHB1bnljb2RlLFxuXG5cdC8qKiBIaWdoZXN0IHBvc2l0aXZlIHNpZ25lZCAzMi1iaXQgZmxvYXQgdmFsdWUgKi9cblx0bWF4SW50ID0gMjE0NzQ4MzY0NywgLy8gYWthLiAweDdGRkZGRkZGIG9yIDJeMzEtMVxuXG5cdC8qKiBCb290c3RyaW5nIHBhcmFtZXRlcnMgKi9cblx0YmFzZSA9IDM2LFxuXHR0TWluID0gMSxcblx0dE1heCA9IDI2LFxuXHRza2V3ID0gMzgsXG5cdGRhbXAgPSA3MDAsXG5cdGluaXRpYWxCaWFzID0gNzIsXG5cdGluaXRpYWxOID0gMTI4LCAvLyAweDgwXG5cdGRlbGltaXRlciA9ICctJywgLy8gJ1xceDJEJ1xuXG5cdC8qKiBSZWd1bGFyIGV4cHJlc3Npb25zICovXG5cdHJlZ2V4UHVueWNvZGUgPSAvXnhuLS0vLFxuXHRyZWdleE5vbkFTQ0lJID0gL1teIC1+XS8sIC8vIHVucHJpbnRhYmxlIEFTQ0lJIGNoYXJzICsgbm9uLUFTQ0lJIGNoYXJzXG5cdHJlZ2V4U2VwYXJhdG9ycyA9IC9cXHgyRXxcXHUzMDAyfFxcdUZGMEV8XFx1RkY2MS9nLCAvLyBSRkMgMzQ5MCBzZXBhcmF0b3JzXG5cblx0LyoqIEVycm9yIG1lc3NhZ2VzICovXG5cdGVycm9ycyA9IHtcblx0XHQnb3ZlcmZsb3cnOiAnT3ZlcmZsb3c6IGlucHV0IG5lZWRzIHdpZGVyIGludGVnZXJzIHRvIHByb2Nlc3MnLFxuXHRcdCdub3QtYmFzaWMnOiAnSWxsZWdhbCBpbnB1dCA+PSAweDgwIChub3QgYSBiYXNpYyBjb2RlIHBvaW50KScsXG5cdFx0J2ludmFsaWQtaW5wdXQnOiAnSW52YWxpZCBpbnB1dCdcblx0fSxcblxuXHQvKiogQ29udmVuaWVuY2Ugc2hvcnRjdXRzICovXG5cdGJhc2VNaW51c1RNaW4gPSBiYXNlIC0gdE1pbixcblx0Zmxvb3IgPSBNYXRoLmZsb29yLFxuXHRzdHJpbmdGcm9tQ2hhckNvZGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlLFxuXG5cdC8qKiBUZW1wb3JhcnkgdmFyaWFibGUgKi9cblx0a2V5O1xuXG5cdC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG5cdC8qKlxuXHQgKiBBIGdlbmVyaWMgZXJyb3IgdXRpbGl0eSBmdW5jdGlvbi5cblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IHR5cGUgVGhlIGVycm9yIHR5cGUuXG5cdCAqIEByZXR1cm5zIHtFcnJvcn0gVGhyb3dzIGEgYFJhbmdlRXJyb3JgIHdpdGggdGhlIGFwcGxpY2FibGUgZXJyb3IgbWVzc2FnZS5cblx0ICovXG5cdGZ1bmN0aW9uIGVycm9yKHR5cGUpIHtcblx0XHR0aHJvdyBSYW5nZUVycm9yKGVycm9yc1t0eXBlXSk7XG5cdH1cblxuXHQvKipcblx0ICogQSBnZW5lcmljIGBBcnJheSNtYXBgIHV0aWxpdHkgZnVuY3Rpb24uXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBpdGVyYXRlIG92ZXIuXG5cdCAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIFRoZSBmdW5jdGlvbiB0aGF0IGdldHMgY2FsbGVkIGZvciBldmVyeSBhcnJheVxuXHQgKiBpdGVtLlxuXHQgKiBAcmV0dXJucyB7QXJyYXl9IEEgbmV3IGFycmF5IG9mIHZhbHVlcyByZXR1cm5lZCBieSB0aGUgY2FsbGJhY2sgZnVuY3Rpb24uXG5cdCAqL1xuXHRmdW5jdGlvbiBtYXAoYXJyYXksIGZuKSB7XG5cdFx0dmFyIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcblx0XHR3aGlsZSAobGVuZ3RoLS0pIHtcblx0XHRcdGFycmF5W2xlbmd0aF0gPSBmbihhcnJheVtsZW5ndGhdKTtcblx0XHR9XG5cdFx0cmV0dXJuIGFycmF5O1xuXHR9XG5cblx0LyoqXG5cdCAqIEEgc2ltcGxlIGBBcnJheSNtYXBgLWxpa2Ugd3JhcHBlciB0byB3b3JrIHdpdGggZG9tYWluIG5hbWUgc3RyaW5ncy5cblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGRvbWFpbiBUaGUgZG9tYWluIG5hbWUuXG5cdCAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIFRoZSBmdW5jdGlvbiB0aGF0IGdldHMgY2FsbGVkIGZvciBldmVyeVxuXHQgKiBjaGFyYWN0ZXIuXG5cdCAqIEByZXR1cm5zIHtBcnJheX0gQSBuZXcgc3RyaW5nIG9mIGNoYXJhY3RlcnMgcmV0dXJuZWQgYnkgdGhlIGNhbGxiYWNrXG5cdCAqIGZ1bmN0aW9uLlxuXHQgKi9cblx0ZnVuY3Rpb24gbWFwRG9tYWluKHN0cmluZywgZm4pIHtcblx0XHRyZXR1cm4gbWFwKHN0cmluZy5zcGxpdChyZWdleFNlcGFyYXRvcnMpLCBmbikuam9pbignLicpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENyZWF0ZXMgYW4gYXJyYXkgY29udGFpbmluZyB0aGUgbnVtZXJpYyBjb2RlIHBvaW50cyBvZiBlYWNoIFVuaWNvZGVcblx0ICogY2hhcmFjdGVyIGluIHRoZSBzdHJpbmcuIFdoaWxlIEphdmFTY3JpcHQgdXNlcyBVQ1MtMiBpbnRlcm5hbGx5LFxuXHQgKiB0aGlzIGZ1bmN0aW9uIHdpbGwgY29udmVydCBhIHBhaXIgb2Ygc3Vycm9nYXRlIGhhbHZlcyAoZWFjaCBvZiB3aGljaFxuXHQgKiBVQ1MtMiBleHBvc2VzIGFzIHNlcGFyYXRlIGNoYXJhY3RlcnMpIGludG8gYSBzaW5nbGUgY29kZSBwb2ludCxcblx0ICogbWF0Y2hpbmcgVVRGLTE2LlxuXHQgKiBAc2VlIGBwdW55Y29kZS51Y3MyLmVuY29kZWBcblx0ICogQHNlZSA8aHR0cDovL21hdGhpYXNieW5lbnMuYmUvbm90ZXMvamF2YXNjcmlwdC1lbmNvZGluZz5cblx0ICogQG1lbWJlck9mIHB1bnljb2RlLnVjczJcblx0ICogQG5hbWUgZGVjb2RlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBzdHJpbmcgVGhlIFVuaWNvZGUgaW5wdXQgc3RyaW5nIChVQ1MtMikuXG5cdCAqIEByZXR1cm5zIHtBcnJheX0gVGhlIG5ldyBhcnJheSBvZiBjb2RlIHBvaW50cy5cblx0ICovXG5cdGZ1bmN0aW9uIHVjczJkZWNvZGUoc3RyaW5nKSB7XG5cdFx0dmFyIG91dHB1dCA9IFtdLFxuXHRcdCAgICBjb3VudGVyID0gMCxcblx0XHQgICAgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aCxcblx0XHQgICAgdmFsdWUsXG5cdFx0ICAgIGV4dHJhO1xuXHRcdHdoaWxlIChjb3VudGVyIDwgbGVuZ3RoKSB7XG5cdFx0XHR2YWx1ZSA9IHN0cmluZy5jaGFyQ29kZUF0KGNvdW50ZXIrKyk7XG5cdFx0XHRpZiAodmFsdWUgPj0gMHhEODAwICYmIHZhbHVlIDw9IDB4REJGRiAmJiBjb3VudGVyIDwgbGVuZ3RoKSB7XG5cdFx0XHRcdC8vIGhpZ2ggc3Vycm9nYXRlLCBhbmQgdGhlcmUgaXMgYSBuZXh0IGNoYXJhY3RlclxuXHRcdFx0XHRleHRyYSA9IHN0cmluZy5jaGFyQ29kZUF0KGNvdW50ZXIrKyk7XG5cdFx0XHRcdGlmICgoZXh0cmEgJiAweEZDMDApID09IDB4REMwMCkgeyAvLyBsb3cgc3Vycm9nYXRlXG5cdFx0XHRcdFx0b3V0cHV0LnB1c2goKCh2YWx1ZSAmIDB4M0ZGKSA8PCAxMCkgKyAoZXh0cmEgJiAweDNGRikgKyAweDEwMDAwKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyB1bm1hdGNoZWQgc3Vycm9nYXRlOyBvbmx5IGFwcGVuZCB0aGlzIGNvZGUgdW5pdCwgaW4gY2FzZSB0aGUgbmV4dFxuXHRcdFx0XHRcdC8vIGNvZGUgdW5pdCBpcyB0aGUgaGlnaCBzdXJyb2dhdGUgb2YgYSBzdXJyb2dhdGUgcGFpclxuXHRcdFx0XHRcdG91dHB1dC5wdXNoKHZhbHVlKTtcblx0XHRcdFx0XHRjb3VudGVyLS07XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG91dHB1dC5wdXNoKHZhbHVlKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIG91dHB1dDtcblx0fVxuXG5cdC8qKlxuXHQgKiBDcmVhdGVzIGEgc3RyaW5nIGJhc2VkIG9uIGFuIGFycmF5IG9mIG51bWVyaWMgY29kZSBwb2ludHMuXG5cdCAqIEBzZWUgYHB1bnljb2RlLnVjczIuZGVjb2RlYFxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGUudWNzMlxuXHQgKiBAbmFtZSBlbmNvZGVcblx0ICogQHBhcmFtIHtBcnJheX0gY29kZVBvaW50cyBUaGUgYXJyYXkgb2YgbnVtZXJpYyBjb2RlIHBvaW50cy5cblx0ICogQHJldHVybnMge1N0cmluZ30gVGhlIG5ldyBVbmljb2RlIHN0cmluZyAoVUNTLTIpLlxuXHQgKi9cblx0ZnVuY3Rpb24gdWNzMmVuY29kZShhcnJheSkge1xuXHRcdHJldHVybiBtYXAoYXJyYXksIGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHR2YXIgb3V0cHV0ID0gJyc7XG5cdFx0XHRpZiAodmFsdWUgPiAweEZGRkYpIHtcblx0XHRcdFx0dmFsdWUgLT0gMHgxMDAwMDtcblx0XHRcdFx0b3V0cHV0ICs9IHN0cmluZ0Zyb21DaGFyQ29kZSh2YWx1ZSA+Pj4gMTAgJiAweDNGRiB8IDB4RDgwMCk7XG5cdFx0XHRcdHZhbHVlID0gMHhEQzAwIHwgdmFsdWUgJiAweDNGRjtcblx0XHRcdH1cblx0XHRcdG91dHB1dCArPSBzdHJpbmdGcm9tQ2hhckNvZGUodmFsdWUpO1xuXHRcdFx0cmV0dXJuIG91dHB1dDtcblx0XHR9KS5qb2luKCcnKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIGJhc2ljIGNvZGUgcG9pbnQgaW50byBhIGRpZ2l0L2ludGVnZXIuXG5cdCAqIEBzZWUgYGRpZ2l0VG9CYXNpYygpYFxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge051bWJlcn0gY29kZVBvaW50IFRoZSBiYXNpYyBudW1lcmljIGNvZGUgcG9pbnQgdmFsdWUuXG5cdCAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBudW1lcmljIHZhbHVlIG9mIGEgYmFzaWMgY29kZSBwb2ludCAoZm9yIHVzZSBpblxuXHQgKiByZXByZXNlbnRpbmcgaW50ZWdlcnMpIGluIHRoZSByYW5nZSBgMGAgdG8gYGJhc2UgLSAxYCwgb3IgYGJhc2VgIGlmXG5cdCAqIHRoZSBjb2RlIHBvaW50IGRvZXMgbm90IHJlcHJlc2VudCBhIHZhbHVlLlxuXHQgKi9cblx0ZnVuY3Rpb24gYmFzaWNUb0RpZ2l0KGNvZGVQb2ludCkge1xuXHRcdGlmIChjb2RlUG9pbnQgLSA0OCA8IDEwKSB7XG5cdFx0XHRyZXR1cm4gY29kZVBvaW50IC0gMjI7XG5cdFx0fVxuXHRcdGlmIChjb2RlUG9pbnQgLSA2NSA8IDI2KSB7XG5cdFx0XHRyZXR1cm4gY29kZVBvaW50IC0gNjU7XG5cdFx0fVxuXHRcdGlmIChjb2RlUG9pbnQgLSA5NyA8IDI2KSB7XG5cdFx0XHRyZXR1cm4gY29kZVBvaW50IC0gOTc7XG5cdFx0fVxuXHRcdHJldHVybiBiYXNlO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgZGlnaXQvaW50ZWdlciBpbnRvIGEgYmFzaWMgY29kZSBwb2ludC5cblx0ICogQHNlZSBgYmFzaWNUb0RpZ2l0KClgXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBkaWdpdCBUaGUgbnVtZXJpYyB2YWx1ZSBvZiBhIGJhc2ljIGNvZGUgcG9pbnQuXG5cdCAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBiYXNpYyBjb2RlIHBvaW50IHdob3NlIHZhbHVlICh3aGVuIHVzZWQgZm9yXG5cdCAqIHJlcHJlc2VudGluZyBpbnRlZ2VycykgaXMgYGRpZ2l0YCwgd2hpY2ggbmVlZHMgdG8gYmUgaW4gdGhlIHJhbmdlXG5cdCAqIGAwYCB0byBgYmFzZSAtIDFgLiBJZiBgZmxhZ2AgaXMgbm9uLXplcm8sIHRoZSB1cHBlcmNhc2UgZm9ybSBpc1xuXHQgKiB1c2VkOyBlbHNlLCB0aGUgbG93ZXJjYXNlIGZvcm0gaXMgdXNlZC4gVGhlIGJlaGF2aW9yIGlzIHVuZGVmaW5lZFxuXHQgKiBpZiBgZmxhZ2AgaXMgbm9uLXplcm8gYW5kIGBkaWdpdGAgaGFzIG5vIHVwcGVyY2FzZSBmb3JtLlxuXHQgKi9cblx0ZnVuY3Rpb24gZGlnaXRUb0Jhc2ljKGRpZ2l0LCBmbGFnKSB7XG5cdFx0Ly8gIDAuLjI1IG1hcCB0byBBU0NJSSBhLi56IG9yIEEuLlpcblx0XHQvLyAyNi4uMzUgbWFwIHRvIEFTQ0lJIDAuLjlcblx0XHRyZXR1cm4gZGlnaXQgKyAyMiArIDc1ICogKGRpZ2l0IDwgMjYpIC0gKChmbGFnICE9IDApIDw8IDUpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEJpYXMgYWRhcHRhdGlvbiBmdW5jdGlvbiBhcyBwZXIgc2VjdGlvbiAzLjQgb2YgUkZDIDM0OTIuXG5cdCAqIGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM0OTIjc2VjdGlvbi0zLjRcblx0ICogQHByaXZhdGVcblx0ICovXG5cdGZ1bmN0aW9uIGFkYXB0KGRlbHRhLCBudW1Qb2ludHMsIGZpcnN0VGltZSkge1xuXHRcdHZhciBrID0gMDtcblx0XHRkZWx0YSA9IGZpcnN0VGltZSA/IGZsb29yKGRlbHRhIC8gZGFtcCkgOiBkZWx0YSA+PiAxO1xuXHRcdGRlbHRhICs9IGZsb29yKGRlbHRhIC8gbnVtUG9pbnRzKTtcblx0XHRmb3IgKC8qIG5vIGluaXRpYWxpemF0aW9uICovOyBkZWx0YSA+IGJhc2VNaW51c1RNaW4gKiB0TWF4ID4+IDE7IGsgKz0gYmFzZSkge1xuXHRcdFx0ZGVsdGEgPSBmbG9vcihkZWx0YSAvIGJhc2VNaW51c1RNaW4pO1xuXHRcdH1cblx0XHRyZXR1cm4gZmxvb3IoayArIChiYXNlTWludXNUTWluICsgMSkgKiBkZWx0YSAvIChkZWx0YSArIHNrZXcpKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5IHN5bWJvbHMgdG8gYSBzdHJpbmcgb2YgVW5pY29kZVxuXHQgKiBzeW1ib2xzLlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGlucHV0IFRoZSBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seSBzeW1ib2xzLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgcmVzdWx0aW5nIHN0cmluZyBvZiBVbmljb2RlIHN5bWJvbHMuXG5cdCAqL1xuXHRmdW5jdGlvbiBkZWNvZGUoaW5wdXQpIHtcblx0XHQvLyBEb24ndCB1c2UgVUNTLTJcblx0XHR2YXIgb3V0cHV0ID0gW10sXG5cdFx0ICAgIGlucHV0TGVuZ3RoID0gaW5wdXQubGVuZ3RoLFxuXHRcdCAgICBvdXQsXG5cdFx0ICAgIGkgPSAwLFxuXHRcdCAgICBuID0gaW5pdGlhbE4sXG5cdFx0ICAgIGJpYXMgPSBpbml0aWFsQmlhcyxcblx0XHQgICAgYmFzaWMsXG5cdFx0ICAgIGosXG5cdFx0ICAgIGluZGV4LFxuXHRcdCAgICBvbGRpLFxuXHRcdCAgICB3LFxuXHRcdCAgICBrLFxuXHRcdCAgICBkaWdpdCxcblx0XHQgICAgdCxcblx0XHQgICAgLyoqIENhY2hlZCBjYWxjdWxhdGlvbiByZXN1bHRzICovXG5cdFx0ICAgIGJhc2VNaW51c1Q7XG5cblx0XHQvLyBIYW5kbGUgdGhlIGJhc2ljIGNvZGUgcG9pbnRzOiBsZXQgYGJhc2ljYCBiZSB0aGUgbnVtYmVyIG9mIGlucHV0IGNvZGVcblx0XHQvLyBwb2ludHMgYmVmb3JlIHRoZSBsYXN0IGRlbGltaXRlciwgb3IgYDBgIGlmIHRoZXJlIGlzIG5vbmUsIHRoZW4gY29weVxuXHRcdC8vIHRoZSBmaXJzdCBiYXNpYyBjb2RlIHBvaW50cyB0byB0aGUgb3V0cHV0LlxuXG5cdFx0YmFzaWMgPSBpbnB1dC5sYXN0SW5kZXhPZihkZWxpbWl0ZXIpO1xuXHRcdGlmIChiYXNpYyA8IDApIHtcblx0XHRcdGJhc2ljID0gMDtcblx0XHR9XG5cblx0XHRmb3IgKGogPSAwOyBqIDwgYmFzaWM7ICsraikge1xuXHRcdFx0Ly8gaWYgaXQncyBub3QgYSBiYXNpYyBjb2RlIHBvaW50XG5cdFx0XHRpZiAoaW5wdXQuY2hhckNvZGVBdChqKSA+PSAweDgwKSB7XG5cdFx0XHRcdGVycm9yKCdub3QtYmFzaWMnKTtcblx0XHRcdH1cblx0XHRcdG91dHB1dC5wdXNoKGlucHV0LmNoYXJDb2RlQXQoaikpO1xuXHRcdH1cblxuXHRcdC8vIE1haW4gZGVjb2RpbmcgbG9vcDogc3RhcnQganVzdCBhZnRlciB0aGUgbGFzdCBkZWxpbWl0ZXIgaWYgYW55IGJhc2ljIGNvZGVcblx0XHQvLyBwb2ludHMgd2VyZSBjb3BpZWQ7IHN0YXJ0IGF0IHRoZSBiZWdpbm5pbmcgb3RoZXJ3aXNlLlxuXG5cdFx0Zm9yIChpbmRleCA9IGJhc2ljID4gMCA/IGJhc2ljICsgMSA6IDA7IGluZGV4IDwgaW5wdXRMZW5ndGg7IC8qIG5vIGZpbmFsIGV4cHJlc3Npb24gKi8pIHtcblxuXHRcdFx0Ly8gYGluZGV4YCBpcyB0aGUgaW5kZXggb2YgdGhlIG5leHQgY2hhcmFjdGVyIHRvIGJlIGNvbnN1bWVkLlxuXHRcdFx0Ly8gRGVjb2RlIGEgZ2VuZXJhbGl6ZWQgdmFyaWFibGUtbGVuZ3RoIGludGVnZXIgaW50byBgZGVsdGFgLFxuXHRcdFx0Ly8gd2hpY2ggZ2V0cyBhZGRlZCB0byBgaWAuIFRoZSBvdmVyZmxvdyBjaGVja2luZyBpcyBlYXNpZXJcblx0XHRcdC8vIGlmIHdlIGluY3JlYXNlIGBpYCBhcyB3ZSBnbywgdGhlbiBzdWJ0cmFjdCBvZmYgaXRzIHN0YXJ0aW5nXG5cdFx0XHQvLyB2YWx1ZSBhdCB0aGUgZW5kIHRvIG9idGFpbiBgZGVsdGFgLlxuXHRcdFx0Zm9yIChvbGRpID0gaSwgdyA9IDEsIGsgPSBiYXNlOyAvKiBubyBjb25kaXRpb24gKi87IGsgKz0gYmFzZSkge1xuXG5cdFx0XHRcdGlmIChpbmRleCA+PSBpbnB1dExlbmd0aCkge1xuXHRcdFx0XHRcdGVycm9yKCdpbnZhbGlkLWlucHV0Jyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRkaWdpdCA9IGJhc2ljVG9EaWdpdChpbnB1dC5jaGFyQ29kZUF0KGluZGV4KyspKTtcblxuXHRcdFx0XHRpZiAoZGlnaXQgPj0gYmFzZSB8fCBkaWdpdCA+IGZsb29yKChtYXhJbnQgLSBpKSAvIHcpKSB7XG5cdFx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpICs9IGRpZ2l0ICogdztcblx0XHRcdFx0dCA9IGsgPD0gYmlhcyA/IHRNaW4gOiAoayA+PSBiaWFzICsgdE1heCA/IHRNYXggOiBrIC0gYmlhcyk7XG5cblx0XHRcdFx0aWYgKGRpZ2l0IDwgdCkge1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0YmFzZU1pbnVzVCA9IGJhc2UgLSB0O1xuXHRcdFx0XHRpZiAodyA+IGZsb29yKG1heEludCAvIGJhc2VNaW51c1QpKSB7XG5cdFx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR3ICo9IGJhc2VNaW51c1Q7XG5cblx0XHRcdH1cblxuXHRcdFx0b3V0ID0gb3V0cHV0Lmxlbmd0aCArIDE7XG5cdFx0XHRiaWFzID0gYWRhcHQoaSAtIG9sZGksIG91dCwgb2xkaSA9PSAwKTtcblxuXHRcdFx0Ly8gYGlgIHdhcyBzdXBwb3NlZCB0byB3cmFwIGFyb3VuZCBmcm9tIGBvdXRgIHRvIGAwYCxcblx0XHRcdC8vIGluY3JlbWVudGluZyBgbmAgZWFjaCB0aW1lLCBzbyB3ZSdsbCBmaXggdGhhdCBub3c6XG5cdFx0XHRpZiAoZmxvb3IoaSAvIG91dCkgPiBtYXhJbnQgLSBuKSB7XG5cdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0fVxuXG5cdFx0XHRuICs9IGZsb29yKGkgLyBvdXQpO1xuXHRcdFx0aSAlPSBvdXQ7XG5cblx0XHRcdC8vIEluc2VydCBgbmAgYXQgcG9zaXRpb24gYGlgIG9mIHRoZSBvdXRwdXRcblx0XHRcdG91dHB1dC5zcGxpY2UoaSsrLCAwLCBuKTtcblxuXHRcdH1cblxuXHRcdHJldHVybiB1Y3MyZW5jb2RlKG91dHB1dCk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBzdHJpbmcgb2YgVW5pY29kZSBzeW1ib2xzIHRvIGEgUHVueWNvZGUgc3RyaW5nIG9mIEFTQ0lJLW9ubHlcblx0ICogc3ltYm9scy5cblx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBpbnB1dCBUaGUgc3RyaW5nIG9mIFVuaWNvZGUgc3ltYm9scy5cblx0ICogQHJldHVybnMge1N0cmluZ30gVGhlIHJlc3VsdGluZyBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seSBzeW1ib2xzLlxuXHQgKi9cblx0ZnVuY3Rpb24gZW5jb2RlKGlucHV0KSB7XG5cdFx0dmFyIG4sXG5cdFx0ICAgIGRlbHRhLFxuXHRcdCAgICBoYW5kbGVkQ1BDb3VudCxcblx0XHQgICAgYmFzaWNMZW5ndGgsXG5cdFx0ICAgIGJpYXMsXG5cdFx0ICAgIGosXG5cdFx0ICAgIG0sXG5cdFx0ICAgIHEsXG5cdFx0ICAgIGssXG5cdFx0ICAgIHQsXG5cdFx0ICAgIGN1cnJlbnRWYWx1ZSxcblx0XHQgICAgb3V0cHV0ID0gW10sXG5cdFx0ICAgIC8qKiBgaW5wdXRMZW5ndGhgIHdpbGwgaG9sZCB0aGUgbnVtYmVyIG9mIGNvZGUgcG9pbnRzIGluIGBpbnB1dGAuICovXG5cdFx0ICAgIGlucHV0TGVuZ3RoLFxuXHRcdCAgICAvKiogQ2FjaGVkIGNhbGN1bGF0aW9uIHJlc3VsdHMgKi9cblx0XHQgICAgaGFuZGxlZENQQ291bnRQbHVzT25lLFxuXHRcdCAgICBiYXNlTWludXNULFxuXHRcdCAgICBxTWludXNUO1xuXG5cdFx0Ly8gQ29udmVydCB0aGUgaW5wdXQgaW4gVUNTLTIgdG8gVW5pY29kZVxuXHRcdGlucHV0ID0gdWNzMmRlY29kZShpbnB1dCk7XG5cblx0XHQvLyBDYWNoZSB0aGUgbGVuZ3RoXG5cdFx0aW5wdXRMZW5ndGggPSBpbnB1dC5sZW5ndGg7XG5cblx0XHQvLyBJbml0aWFsaXplIHRoZSBzdGF0ZVxuXHRcdG4gPSBpbml0aWFsTjtcblx0XHRkZWx0YSA9IDA7XG5cdFx0YmlhcyA9IGluaXRpYWxCaWFzO1xuXG5cdFx0Ly8gSGFuZGxlIHRoZSBiYXNpYyBjb2RlIHBvaW50c1xuXHRcdGZvciAoaiA9IDA7IGogPCBpbnB1dExlbmd0aDsgKytqKSB7XG5cdFx0XHRjdXJyZW50VmFsdWUgPSBpbnB1dFtqXTtcblx0XHRcdGlmIChjdXJyZW50VmFsdWUgPCAweDgwKSB7XG5cdFx0XHRcdG91dHB1dC5wdXNoKHN0cmluZ0Zyb21DaGFyQ29kZShjdXJyZW50VmFsdWUpKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRoYW5kbGVkQ1BDb3VudCA9IGJhc2ljTGVuZ3RoID0gb3V0cHV0Lmxlbmd0aDtcblxuXHRcdC8vIGBoYW5kbGVkQ1BDb3VudGAgaXMgdGhlIG51bWJlciBvZiBjb2RlIHBvaW50cyB0aGF0IGhhdmUgYmVlbiBoYW5kbGVkO1xuXHRcdC8vIGBiYXNpY0xlbmd0aGAgaXMgdGhlIG51bWJlciBvZiBiYXNpYyBjb2RlIHBvaW50cy5cblxuXHRcdC8vIEZpbmlzaCB0aGUgYmFzaWMgc3RyaW5nIC0gaWYgaXQgaXMgbm90IGVtcHR5IC0gd2l0aCBhIGRlbGltaXRlclxuXHRcdGlmIChiYXNpY0xlbmd0aCkge1xuXHRcdFx0b3V0cHV0LnB1c2goZGVsaW1pdGVyKTtcblx0XHR9XG5cblx0XHQvLyBNYWluIGVuY29kaW5nIGxvb3A6XG5cdFx0d2hpbGUgKGhhbmRsZWRDUENvdW50IDwgaW5wdXRMZW5ndGgpIHtcblxuXHRcdFx0Ly8gQWxsIG5vbi1iYXNpYyBjb2RlIHBvaW50cyA8IG4gaGF2ZSBiZWVuIGhhbmRsZWQgYWxyZWFkeS4gRmluZCB0aGUgbmV4dFxuXHRcdFx0Ly8gbGFyZ2VyIG9uZTpcblx0XHRcdGZvciAobSA9IG1heEludCwgaiA9IDA7IGogPCBpbnB1dExlbmd0aDsgKytqKSB7XG5cdFx0XHRcdGN1cnJlbnRWYWx1ZSA9IGlucHV0W2pdO1xuXHRcdFx0XHRpZiAoY3VycmVudFZhbHVlID49IG4gJiYgY3VycmVudFZhbHVlIDwgbSkge1xuXHRcdFx0XHRcdG0gPSBjdXJyZW50VmFsdWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gSW5jcmVhc2UgYGRlbHRhYCBlbm91Z2ggdG8gYWR2YW5jZSB0aGUgZGVjb2RlcidzIDxuLGk+IHN0YXRlIHRvIDxtLDA+LFxuXHRcdFx0Ly8gYnV0IGd1YXJkIGFnYWluc3Qgb3ZlcmZsb3dcblx0XHRcdGhhbmRsZWRDUENvdW50UGx1c09uZSA9IGhhbmRsZWRDUENvdW50ICsgMTtcblx0XHRcdGlmIChtIC0gbiA+IGZsb29yKChtYXhJbnQgLSBkZWx0YSkgLyBoYW5kbGVkQ1BDb3VudFBsdXNPbmUpKSB7XG5cdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0fVxuXG5cdFx0XHRkZWx0YSArPSAobSAtIG4pICogaGFuZGxlZENQQ291bnRQbHVzT25lO1xuXHRcdFx0biA9IG07XG5cblx0XHRcdGZvciAoaiA9IDA7IGogPCBpbnB1dExlbmd0aDsgKytqKSB7XG5cdFx0XHRcdGN1cnJlbnRWYWx1ZSA9IGlucHV0W2pdO1xuXG5cdFx0XHRcdGlmIChjdXJyZW50VmFsdWUgPCBuICYmICsrZGVsdGEgPiBtYXhJbnQpIHtcblx0XHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChjdXJyZW50VmFsdWUgPT0gbikge1xuXHRcdFx0XHRcdC8vIFJlcHJlc2VudCBkZWx0YSBhcyBhIGdlbmVyYWxpemVkIHZhcmlhYmxlLWxlbmd0aCBpbnRlZ2VyXG5cdFx0XHRcdFx0Zm9yIChxID0gZGVsdGEsIGsgPSBiYXNlOyAvKiBubyBjb25kaXRpb24gKi87IGsgKz0gYmFzZSkge1xuXHRcdFx0XHRcdFx0dCA9IGsgPD0gYmlhcyA/IHRNaW4gOiAoayA+PSBiaWFzICsgdE1heCA/IHRNYXggOiBrIC0gYmlhcyk7XG5cdFx0XHRcdFx0XHRpZiAocSA8IHQpIHtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRxTWludXNUID0gcSAtIHQ7XG5cdFx0XHRcdFx0XHRiYXNlTWludXNUID0gYmFzZSAtIHQ7XG5cdFx0XHRcdFx0XHRvdXRwdXQucHVzaChcblx0XHRcdFx0XHRcdFx0c3RyaW5nRnJvbUNoYXJDb2RlKGRpZ2l0VG9CYXNpYyh0ICsgcU1pbnVzVCAlIGJhc2VNaW51c1QsIDApKVxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdHEgPSBmbG9vcihxTWludXNUIC8gYmFzZU1pbnVzVCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0b3V0cHV0LnB1c2goc3RyaW5nRnJvbUNoYXJDb2RlKGRpZ2l0VG9CYXNpYyhxLCAwKSkpO1xuXHRcdFx0XHRcdGJpYXMgPSBhZGFwdChkZWx0YSwgaGFuZGxlZENQQ291bnRQbHVzT25lLCBoYW5kbGVkQ1BDb3VudCA9PSBiYXNpY0xlbmd0aCk7XG5cdFx0XHRcdFx0ZGVsdGEgPSAwO1xuXHRcdFx0XHRcdCsraGFuZGxlZENQQ291bnQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0KytkZWx0YTtcblx0XHRcdCsrbjtcblxuXHRcdH1cblx0XHRyZXR1cm4gb3V0cHV0LmpvaW4oJycpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgUHVueWNvZGUgc3RyaW5nIHJlcHJlc2VudGluZyBhIGRvbWFpbiBuYW1lIHRvIFVuaWNvZGUuIE9ubHkgdGhlXG5cdCAqIFB1bnljb2RlZCBwYXJ0cyBvZiB0aGUgZG9tYWluIG5hbWUgd2lsbCBiZSBjb252ZXJ0ZWQsIGkuZS4gaXQgZG9lc24ndFxuXHQgKiBtYXR0ZXIgaWYgeW91IGNhbGwgaXQgb24gYSBzdHJpbmcgdGhhdCBoYXMgYWxyZWFkeSBiZWVuIGNvbnZlcnRlZCB0b1xuXHQgKiBVbmljb2RlLlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGRvbWFpbiBUaGUgUHVueWNvZGUgZG9tYWluIG5hbWUgdG8gY29udmVydCB0byBVbmljb2RlLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgVW5pY29kZSByZXByZXNlbnRhdGlvbiBvZiB0aGUgZ2l2ZW4gUHVueWNvZGVcblx0ICogc3RyaW5nLlxuXHQgKi9cblx0ZnVuY3Rpb24gdG9Vbmljb2RlKGRvbWFpbikge1xuXHRcdHJldHVybiBtYXBEb21haW4oZG9tYWluLCBmdW5jdGlvbihzdHJpbmcpIHtcblx0XHRcdHJldHVybiByZWdleFB1bnljb2RlLnRlc3Qoc3RyaW5nKVxuXHRcdFx0XHQ/IGRlY29kZShzdHJpbmcuc2xpY2UoNCkudG9Mb3dlckNhc2UoKSlcblx0XHRcdFx0OiBzdHJpbmc7XG5cdFx0fSk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBVbmljb2RlIHN0cmluZyByZXByZXNlbnRpbmcgYSBkb21haW4gbmFtZSB0byBQdW55Y29kZS4gT25seSB0aGVcblx0ICogbm9uLUFTQ0lJIHBhcnRzIG9mIHRoZSBkb21haW4gbmFtZSB3aWxsIGJlIGNvbnZlcnRlZCwgaS5lLiBpdCBkb2Vzbid0XG5cdCAqIG1hdHRlciBpZiB5b3UgY2FsbCBpdCB3aXRoIGEgZG9tYWluIHRoYXQncyBhbHJlYWR5IGluIEFTQ0lJLlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGRvbWFpbiBUaGUgZG9tYWluIG5hbWUgdG8gY29udmVydCwgYXMgYSBVbmljb2RlIHN0cmluZy5cblx0ICogQHJldHVybnMge1N0cmluZ30gVGhlIFB1bnljb2RlIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBnaXZlbiBkb21haW4gbmFtZS5cblx0ICovXG5cdGZ1bmN0aW9uIHRvQVNDSUkoZG9tYWluKSB7XG5cdFx0cmV0dXJuIG1hcERvbWFpbihkb21haW4sIGZ1bmN0aW9uKHN0cmluZykge1xuXHRcdFx0cmV0dXJuIHJlZ2V4Tm9uQVNDSUkudGVzdChzdHJpbmcpXG5cdFx0XHRcdD8gJ3huLS0nICsgZW5jb2RlKHN0cmluZylcblx0XHRcdFx0OiBzdHJpbmc7XG5cdFx0fSk7XG5cdH1cblxuXHQvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuXHQvKiogRGVmaW5lIHRoZSBwdWJsaWMgQVBJICovXG5cdHB1bnljb2RlID0ge1xuXHRcdC8qKlxuXHRcdCAqIEEgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgY3VycmVudCBQdW55Y29kZS5qcyB2ZXJzaW9uIG51bWJlci5cblx0XHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0XHQgKiBAdHlwZSBTdHJpbmdcblx0XHQgKi9cblx0XHQndmVyc2lvbic6ICcxLjIuNCcsXG5cdFx0LyoqXG5cdFx0ICogQW4gb2JqZWN0IG9mIG1ldGhvZHMgdG8gY29udmVydCBmcm9tIEphdmFTY3JpcHQncyBpbnRlcm5hbCBjaGFyYWN0ZXJcblx0XHQgKiByZXByZXNlbnRhdGlvbiAoVUNTLTIpIHRvIFVuaWNvZGUgY29kZSBwb2ludHMsIGFuZCBiYWNrLlxuXHRcdCAqIEBzZWUgPGh0dHA6Ly9tYXRoaWFzYnluZW5zLmJlL25vdGVzL2phdmFzY3JpcHQtZW5jb2Rpbmc+XG5cdFx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdFx0ICogQHR5cGUgT2JqZWN0XG5cdFx0ICovXG5cdFx0J3VjczInOiB7XG5cdFx0XHQnZGVjb2RlJzogdWNzMmRlY29kZSxcblx0XHRcdCdlbmNvZGUnOiB1Y3MyZW5jb2RlXG5cdFx0fSxcblx0XHQnZGVjb2RlJzogZGVjb2RlLFxuXHRcdCdlbmNvZGUnOiBlbmNvZGUsXG5cdFx0J3RvQVNDSUknOiB0b0FTQ0lJLFxuXHRcdCd0b1VuaWNvZGUnOiB0b1VuaWNvZGVcblx0fTtcblxuXHQvKiogRXhwb3NlIGBwdW55Y29kZWAgKi9cblx0Ly8gU29tZSBBTUQgYnVpbGQgb3B0aW1pemVycywgbGlrZSByLmpzLCBjaGVjayBmb3Igc3BlY2lmaWMgY29uZGl0aW9uIHBhdHRlcm5zXG5cdC8vIGxpa2UgdGhlIGZvbGxvd2luZzpcblx0aWYgKFxuXHRcdHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJlxuXHRcdHR5cGVvZiBkZWZpbmUuYW1kID09ICdvYmplY3QnICYmXG5cdFx0ZGVmaW5lLmFtZFxuXHQpIHtcblx0XHRkZWZpbmUoJ3B1bnljb2RlJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gcHVueWNvZGU7XG5cdFx0fSk7XG5cdH0gZWxzZSBpZiAoZnJlZUV4cG9ydHMgJiYgIWZyZWVFeHBvcnRzLm5vZGVUeXBlKSB7XG5cdFx0aWYgKGZyZWVNb2R1bGUpIHsgLy8gaW4gTm9kZS5qcyBvciBSaW5nb0pTIHYwLjguMCtcblx0XHRcdGZyZWVNb2R1bGUuZXhwb3J0cyA9IHB1bnljb2RlO1xuXHRcdH0gZWxzZSB7IC8vIGluIE5hcndoYWwgb3IgUmluZ29KUyB2MC43LjAtXG5cdFx0XHRmb3IgKGtleSBpbiBwdW55Y29kZSkge1xuXHRcdFx0XHRwdW55Y29kZS5oYXNPd25Qcm9wZXJ0eShrZXkpICYmIChmcmVlRXhwb3J0c1trZXldID0gcHVueWNvZGVba2V5XSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9IGVsc2UgeyAvLyBpbiBSaGlubyBvciBhIHdlYiBicm93c2VyXG5cdFx0cm9vdC5wdW55Y29kZSA9IHB1bnljb2RlO1xuXHR9XG5cbn0odGhpcykpO1xuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbid1c2Ugc3RyaWN0JztcblxuLy8gSWYgb2JqLmhhc093blByb3BlcnR5IGhhcyBiZWVuIG92ZXJyaWRkZW4sIHRoZW4gY2FsbGluZ1xuLy8gb2JqLmhhc093blByb3BlcnR5KHByb3ApIHdpbGwgYnJlYWsuXG4vLyBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9qb3llbnQvbm9kZS9pc3N1ZXMvMTcwN1xuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihxcywgc2VwLCBlcSwgb3B0aW9ucykge1xuICBzZXAgPSBzZXAgfHwgJyYnO1xuICBlcSA9IGVxIHx8ICc9JztcbiAgdmFyIG9iaiA9IHt9O1xuXG4gIGlmICh0eXBlb2YgcXMgIT09ICdzdHJpbmcnIHx8IHFzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICB2YXIgcmVnZXhwID0gL1xcKy9nO1xuICBxcyA9IHFzLnNwbGl0KHNlcCk7XG5cbiAgdmFyIG1heEtleXMgPSAxMDAwO1xuICBpZiAob3B0aW9ucyAmJiB0eXBlb2Ygb3B0aW9ucy5tYXhLZXlzID09PSAnbnVtYmVyJykge1xuICAgIG1heEtleXMgPSBvcHRpb25zLm1heEtleXM7XG4gIH1cblxuICB2YXIgbGVuID0gcXMubGVuZ3RoO1xuICAvLyBtYXhLZXlzIDw9IDAgbWVhbnMgdGhhdCB3ZSBzaG91bGQgbm90IGxpbWl0IGtleXMgY291bnRcbiAgaWYgKG1heEtleXMgPiAwICYmIGxlbiA+IG1heEtleXMpIHtcbiAgICBsZW4gPSBtYXhLZXlzO1xuICB9XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgIHZhciB4ID0gcXNbaV0ucmVwbGFjZShyZWdleHAsICclMjAnKSxcbiAgICAgICAgaWR4ID0geC5pbmRleE9mKGVxKSxcbiAgICAgICAga3N0ciwgdnN0ciwgaywgdjtcblxuICAgIGlmIChpZHggPj0gMCkge1xuICAgICAga3N0ciA9IHguc3Vic3RyKDAsIGlkeCk7XG4gICAgICB2c3RyID0geC5zdWJzdHIoaWR4ICsgMSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGtzdHIgPSB4O1xuICAgICAgdnN0ciA9ICcnO1xuICAgIH1cblxuICAgIGsgPSBkZWNvZGVVUklDb21wb25lbnQoa3N0cik7XG4gICAgdiA9IGRlY29kZVVSSUNvbXBvbmVudCh2c3RyKTtcblxuICAgIGlmICghaGFzT3duUHJvcGVydHkob2JqLCBrKSkge1xuICAgICAgb2JqW2tdID0gdjtcbiAgICB9IGVsc2UgaWYgKGlzQXJyYXkob2JqW2tdKSkge1xuICAgICAgb2JqW2tdLnB1c2godik7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9ialtrXSA9IFtvYmpba10sIHZdO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBvYmo7XG59O1xuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKHhzKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeHMpID09PSAnW29iamVjdCBBcnJheV0nO1xufTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBzdHJpbmdpZnlQcmltaXRpdmUgPSBmdW5jdGlvbih2KSB7XG4gIHN3aXRjaCAodHlwZW9mIHYpIHtcbiAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgcmV0dXJuIHY7XG5cbiAgICBjYXNlICdib29sZWFuJzpcbiAgICAgIHJldHVybiB2ID8gJ3RydWUnIDogJ2ZhbHNlJztcblxuICAgIGNhc2UgJ251bWJlcic6XG4gICAgICByZXR1cm4gaXNGaW5pdGUodikgPyB2IDogJyc7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuICcnO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9iaiwgc2VwLCBlcSwgbmFtZSkge1xuICBzZXAgPSBzZXAgfHwgJyYnO1xuICBlcSA9IGVxIHx8ICc9JztcbiAgaWYgKG9iaiA9PT0gbnVsbCkge1xuICAgIG9iaiA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGlmICh0eXBlb2Ygb2JqID09PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiBtYXAob2JqZWN0S2V5cyhvYmopLCBmdW5jdGlvbihrKSB7XG4gICAgICB2YXIga3MgPSBlbmNvZGVVUklDb21wb25lbnQoc3RyaW5naWZ5UHJpbWl0aXZlKGspKSArIGVxO1xuICAgICAgaWYgKGlzQXJyYXkob2JqW2tdKSkge1xuICAgICAgICByZXR1cm4gbWFwKG9ialtrXSwgZnVuY3Rpb24odikge1xuICAgICAgICAgIHJldHVybiBrcyArIGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUodikpO1xuICAgICAgICB9KS5qb2luKHNlcCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4ga3MgKyBlbmNvZGVVUklDb21wb25lbnQoc3RyaW5naWZ5UHJpbWl0aXZlKG9ialtrXSkpO1xuICAgICAgfVxuICAgIH0pLmpvaW4oc2VwKTtcblxuICB9XG5cbiAgaWYgKCFuYW1lKSByZXR1cm4gJyc7XG4gIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQoc3RyaW5naWZ5UHJpbWl0aXZlKG5hbWUpKSArIGVxICtcbiAgICAgICAgIGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUob2JqKSk7XG59O1xuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKHhzKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeHMpID09PSAnW29iamVjdCBBcnJheV0nO1xufTtcblxuZnVuY3Rpb24gbWFwICh4cywgZikge1xuICBpZiAoeHMubWFwKSByZXR1cm4geHMubWFwKGYpO1xuICB2YXIgcmVzID0gW107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcbiAgICByZXMucHVzaChmKHhzW2ldLCBpKSk7XG4gIH1cbiAgcmV0dXJuIHJlcztcbn1cblxudmFyIG9iamVjdEtleXMgPSBPYmplY3Qua2V5cyB8fCBmdW5jdGlvbiAob2JqKSB7XG4gIHZhciByZXMgPSBbXTtcbiAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSByZXMucHVzaChrZXkpO1xuICB9XG4gIHJldHVybiByZXM7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLmRlY29kZSA9IGV4cG9ydHMucGFyc2UgPSByZXF1aXJlKCcuL2RlY29kZScpO1xuZXhwb3J0cy5lbmNvZGUgPSBleHBvcnRzLnN0cmluZ2lmeSA9IHJlcXVpcmUoJy4vZW5jb2RlJyk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL2xpYi9fc3RyZWFtX2R1cGxleC5qc1wiKVxuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbi8vIGEgZHVwbGV4IHN0cmVhbSBpcyBqdXN0IGEgc3RyZWFtIHRoYXQgaXMgYm90aCByZWFkYWJsZSBhbmQgd3JpdGFibGUuXG4vLyBTaW5jZSBKUyBkb2Vzbid0IGhhdmUgbXVsdGlwbGUgcHJvdG90eXBhbCBpbmhlcml0YW5jZSwgdGhpcyBjbGFzc1xuLy8gcHJvdG90eXBhbGx5IGluaGVyaXRzIGZyb20gUmVhZGFibGUsIGFuZCB0aGVuIHBhcmFzaXRpY2FsbHkgZnJvbVxuLy8gV3JpdGFibGUuXG5cbm1vZHVsZS5leHBvcnRzID0gRHVwbGV4O1xuXG4vKjxyZXBsYWNlbWVudD4qL1xudmFyIG9iamVjdEtleXMgPSBPYmplY3Qua2V5cyB8fCBmdW5jdGlvbiAob2JqKSB7XG4gIHZhciBrZXlzID0gW107XG4gIGZvciAodmFyIGtleSBpbiBvYmopIGtleXMucHVzaChrZXkpO1xuICByZXR1cm4ga2V5cztcbn1cbi8qPC9yZXBsYWNlbWVudD4qL1xuXG5cbi8qPHJlcGxhY2VtZW50PiovXG52YXIgdXRpbCA9IHJlcXVpcmUoJ2NvcmUtdXRpbC1pcycpO1xudXRpbC5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG4vKjwvcmVwbGFjZW1lbnQ+Ki9cblxudmFyIFJlYWRhYmxlID0gcmVxdWlyZSgnLi9fc3RyZWFtX3JlYWRhYmxlJyk7XG52YXIgV3JpdGFibGUgPSByZXF1aXJlKCcuL19zdHJlYW1fd3JpdGFibGUnKTtcblxudXRpbC5pbmhlcml0cyhEdXBsZXgsIFJlYWRhYmxlKTtcblxuZm9yRWFjaChvYmplY3RLZXlzKFdyaXRhYmxlLnByb3RvdHlwZSksIGZ1bmN0aW9uKG1ldGhvZCkge1xuICBpZiAoIUR1cGxleC5wcm90b3R5cGVbbWV0aG9kXSlcbiAgICBEdXBsZXgucHJvdG90eXBlW21ldGhvZF0gPSBXcml0YWJsZS5wcm90b3R5cGVbbWV0aG9kXTtcbn0pO1xuXG5mdW5jdGlvbiBEdXBsZXgob3B0aW9ucykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRHVwbGV4KSlcbiAgICByZXR1cm4gbmV3IER1cGxleChvcHRpb25zKTtcblxuICBSZWFkYWJsZS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuICBXcml0YWJsZS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuXG4gIGlmIChvcHRpb25zICYmIG9wdGlvbnMucmVhZGFibGUgPT09IGZhbHNlKVxuICAgIHRoaXMucmVhZGFibGUgPSBmYWxzZTtcblxuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLndyaXRhYmxlID09PSBmYWxzZSlcbiAgICB0aGlzLndyaXRhYmxlID0gZmFsc2U7XG5cbiAgdGhpcy5hbGxvd0hhbGZPcGVuID0gdHJ1ZTtcbiAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5hbGxvd0hhbGZPcGVuID09PSBmYWxzZSlcbiAgICB0aGlzLmFsbG93SGFsZk9wZW4gPSBmYWxzZTtcblxuICB0aGlzLm9uY2UoJ2VuZCcsIG9uZW5kKTtcbn1cblxuLy8gdGhlIG5vLWhhbGYtb3BlbiBlbmZvcmNlclxuZnVuY3Rpb24gb25lbmQoKSB7XG4gIC8vIGlmIHdlIGFsbG93IGhhbGYtb3BlbiBzdGF0ZSwgb3IgaWYgdGhlIHdyaXRhYmxlIHNpZGUgZW5kZWQsXG4gIC8vIHRoZW4gd2UncmUgb2suXG4gIGlmICh0aGlzLmFsbG93SGFsZk9wZW4gfHwgdGhpcy5fd3JpdGFibGVTdGF0ZS5lbmRlZClcbiAgICByZXR1cm47XG5cbiAgLy8gbm8gbW9yZSBkYXRhIGNhbiBiZSB3cml0dGVuLlxuICAvLyBCdXQgYWxsb3cgbW9yZSB3cml0ZXMgdG8gaGFwcGVuIGluIHRoaXMgdGljay5cbiAgcHJvY2Vzcy5uZXh0VGljayh0aGlzLmVuZC5iaW5kKHRoaXMpKTtcbn1cblxuZnVuY3Rpb24gZm9yRWFjaCAoeHMsIGYpIHtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB4cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBmKHhzW2ldLCBpKTtcbiAgfVxufVxuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbi8vIGEgcGFzc3Rocm91Z2ggc3RyZWFtLlxuLy8gYmFzaWNhbGx5IGp1c3QgdGhlIG1vc3QgbWluaW1hbCBzb3J0IG9mIFRyYW5zZm9ybSBzdHJlYW0uXG4vLyBFdmVyeSB3cml0dGVuIGNodW5rIGdldHMgb3V0cHV0IGFzLWlzLlxuXG5tb2R1bGUuZXhwb3J0cyA9IFBhc3NUaHJvdWdoO1xuXG52YXIgVHJhbnNmb3JtID0gcmVxdWlyZSgnLi9fc3RyZWFtX3RyYW5zZm9ybScpO1xuXG4vKjxyZXBsYWNlbWVudD4qL1xudmFyIHV0aWwgPSByZXF1aXJlKCdjb3JlLXV0aWwtaXMnKTtcbnV0aWwuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuLyo8L3JlcGxhY2VtZW50PiovXG5cbnV0aWwuaW5oZXJpdHMoUGFzc1Rocm91Z2gsIFRyYW5zZm9ybSk7XG5cbmZ1bmN0aW9uIFBhc3NUaHJvdWdoKG9wdGlvbnMpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFBhc3NUaHJvdWdoKSlcbiAgICByZXR1cm4gbmV3IFBhc3NUaHJvdWdoKG9wdGlvbnMpO1xuXG4gIFRyYW5zZm9ybS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xufVxuXG5QYXNzVGhyb3VnaC5wcm90b3R5cGUuX3RyYW5zZm9ybSA9IGZ1bmN0aW9uKGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgY2IobnVsbCwgY2h1bmspO1xufTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWRhYmxlO1xuXG4vKjxyZXBsYWNlbWVudD4qL1xudmFyIGlzQXJyYXkgPSByZXF1aXJlKCdpc2FycmF5Jyk7XG4vKjwvcmVwbGFjZW1lbnQ+Ki9cblxuXG4vKjxyZXBsYWNlbWVudD4qL1xudmFyIEJ1ZmZlciA9IHJlcXVpcmUoJ2J1ZmZlcicpLkJ1ZmZlcjtcbi8qPC9yZXBsYWNlbWVudD4qL1xuXG5SZWFkYWJsZS5SZWFkYWJsZVN0YXRlID0gUmVhZGFibGVTdGF0ZTtcblxudmFyIEVFID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xuXG4vKjxyZXBsYWNlbWVudD4qL1xuaWYgKCFFRS5saXN0ZW5lckNvdW50KSBFRS5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICByZXR1cm4gZW1pdHRlci5saXN0ZW5lcnModHlwZSkubGVuZ3RoO1xufTtcbi8qPC9yZXBsYWNlbWVudD4qL1xuXG52YXIgU3RyZWFtID0gcmVxdWlyZSgnc3RyZWFtJyk7XG5cbi8qPHJlcGxhY2VtZW50PiovXG52YXIgdXRpbCA9IHJlcXVpcmUoJ2NvcmUtdXRpbC1pcycpO1xudXRpbC5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG4vKjwvcmVwbGFjZW1lbnQ+Ki9cblxudmFyIFN0cmluZ0RlY29kZXI7XG5cblxuLyo8cmVwbGFjZW1lbnQ+Ki9cbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ3V0aWwnKTtcbmlmIChkZWJ1ZyAmJiBkZWJ1Zy5kZWJ1Z2xvZykge1xuICBkZWJ1ZyA9IGRlYnVnLmRlYnVnbG9nKCdzdHJlYW0nKTtcbn0gZWxzZSB7XG4gIGRlYnVnID0gZnVuY3Rpb24gKCkge307XG59XG4vKjwvcmVwbGFjZW1lbnQ+Ki9cblxuXG51dGlsLmluaGVyaXRzKFJlYWRhYmxlLCBTdHJlYW0pO1xuXG5mdW5jdGlvbiBSZWFkYWJsZVN0YXRlKG9wdGlvbnMsIHN0cmVhbSkge1xuICB2YXIgRHVwbGV4ID0gcmVxdWlyZSgnLi9fc3RyZWFtX2R1cGxleCcpO1xuXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIC8vIHRoZSBwb2ludCBhdCB3aGljaCBpdCBzdG9wcyBjYWxsaW5nIF9yZWFkKCkgdG8gZmlsbCB0aGUgYnVmZmVyXG4gIC8vIE5vdGU6IDAgaXMgYSB2YWxpZCB2YWx1ZSwgbWVhbnMgXCJkb24ndCBjYWxsIF9yZWFkIHByZWVtcHRpdmVseSBldmVyXCJcbiAgdmFyIGh3bSA9IG9wdGlvbnMuaGlnaFdhdGVyTWFyaztcbiAgdmFyIGRlZmF1bHRId20gPSBvcHRpb25zLm9iamVjdE1vZGUgPyAxNiA6IDE2ICogMTAyNDtcbiAgdGhpcy5oaWdoV2F0ZXJNYXJrID0gKGh3bSB8fCBod20gPT09IDApID8gaHdtIDogZGVmYXVsdEh3bTtcblxuICAvLyBjYXN0IHRvIGludHMuXG4gIHRoaXMuaGlnaFdhdGVyTWFyayA9IH5+dGhpcy5oaWdoV2F0ZXJNYXJrO1xuXG4gIHRoaXMuYnVmZmVyID0gW107XG4gIHRoaXMubGVuZ3RoID0gMDtcbiAgdGhpcy5waXBlcyA9IG51bGw7XG4gIHRoaXMucGlwZXNDb3VudCA9IDA7XG4gIHRoaXMuZmxvd2luZyA9IG51bGw7XG4gIHRoaXMuZW5kZWQgPSBmYWxzZTtcbiAgdGhpcy5lbmRFbWl0dGVkID0gZmFsc2U7XG4gIHRoaXMucmVhZGluZyA9IGZhbHNlO1xuXG4gIC8vIGEgZmxhZyB0byBiZSBhYmxlIHRvIHRlbGwgaWYgdGhlIG9ud3JpdGUgY2IgaXMgY2FsbGVkIGltbWVkaWF0ZWx5LFxuICAvLyBvciBvbiBhIGxhdGVyIHRpY2suICBXZSBzZXQgdGhpcyB0byB0cnVlIGF0IGZpcnN0LCBiZWNhdXNlIGFueVxuICAvLyBhY3Rpb25zIHRoYXQgc2hvdWxkbid0IGhhcHBlbiB1bnRpbCBcImxhdGVyXCIgc2hvdWxkIGdlbmVyYWxseSBhbHNvXG4gIC8vIG5vdCBoYXBwZW4gYmVmb3JlIHRoZSBmaXJzdCB3cml0ZSBjYWxsLlxuICB0aGlzLnN5bmMgPSB0cnVlO1xuXG4gIC8vIHdoZW5ldmVyIHdlIHJldHVybiBudWxsLCB0aGVuIHdlIHNldCBhIGZsYWcgdG8gc2F5XG4gIC8vIHRoYXQgd2UncmUgYXdhaXRpbmcgYSAncmVhZGFibGUnIGV2ZW50IGVtaXNzaW9uLlxuICB0aGlzLm5lZWRSZWFkYWJsZSA9IGZhbHNlO1xuICB0aGlzLmVtaXR0ZWRSZWFkYWJsZSA9IGZhbHNlO1xuICB0aGlzLnJlYWRhYmxlTGlzdGVuaW5nID0gZmFsc2U7XG5cblxuICAvLyBvYmplY3Qgc3RyZWFtIGZsYWcuIFVzZWQgdG8gbWFrZSByZWFkKG4pIGlnbm9yZSBuIGFuZCB0b1xuICAvLyBtYWtlIGFsbCB0aGUgYnVmZmVyIG1lcmdpbmcgYW5kIGxlbmd0aCBjaGVja3MgZ28gYXdheVxuICB0aGlzLm9iamVjdE1vZGUgPSAhIW9wdGlvbnMub2JqZWN0TW9kZTtcblxuICBpZiAoc3RyZWFtIGluc3RhbmNlb2YgRHVwbGV4KVxuICAgIHRoaXMub2JqZWN0TW9kZSA9IHRoaXMub2JqZWN0TW9kZSB8fCAhIW9wdGlvbnMucmVhZGFibGVPYmplY3RNb2RlO1xuXG4gIC8vIENyeXB0byBpcyBraW5kIG9mIG9sZCBhbmQgY3J1c3R5LiAgSGlzdG9yaWNhbGx5LCBpdHMgZGVmYXVsdCBzdHJpbmdcbiAgLy8gZW5jb2RpbmcgaXMgJ2JpbmFyeScgc28gd2UgaGF2ZSB0byBtYWtlIHRoaXMgY29uZmlndXJhYmxlLlxuICAvLyBFdmVyeXRoaW5nIGVsc2UgaW4gdGhlIHVuaXZlcnNlIHVzZXMgJ3V0ZjgnLCB0aG91Z2guXG4gIHRoaXMuZGVmYXVsdEVuY29kaW5nID0gb3B0aW9ucy5kZWZhdWx0RW5jb2RpbmcgfHwgJ3V0ZjgnO1xuXG4gIC8vIHdoZW4gcGlwaW5nLCB3ZSBvbmx5IGNhcmUgYWJvdXQgJ3JlYWRhYmxlJyBldmVudHMgdGhhdCBoYXBwZW5cbiAgLy8gYWZ0ZXIgcmVhZCgpaW5nIGFsbCB0aGUgYnl0ZXMgYW5kIG5vdCBnZXR0aW5nIGFueSBwdXNoYmFjay5cbiAgdGhpcy5yYW5PdXQgPSBmYWxzZTtcblxuICAvLyB0aGUgbnVtYmVyIG9mIHdyaXRlcnMgdGhhdCBhcmUgYXdhaXRpbmcgYSBkcmFpbiBldmVudCBpbiAucGlwZSgpc1xuICB0aGlzLmF3YWl0RHJhaW4gPSAwO1xuXG4gIC8vIGlmIHRydWUsIGEgbWF5YmVSZWFkTW9yZSBoYXMgYmVlbiBzY2hlZHVsZWRcbiAgdGhpcy5yZWFkaW5nTW9yZSA9IGZhbHNlO1xuXG4gIHRoaXMuZGVjb2RlciA9IG51bGw7XG4gIHRoaXMuZW5jb2RpbmcgPSBudWxsO1xuICBpZiAob3B0aW9ucy5lbmNvZGluZykge1xuICAgIGlmICghU3RyaW5nRGVjb2RlcilcbiAgICAgIFN0cmluZ0RlY29kZXIgPSByZXF1aXJlKCdzdHJpbmdfZGVjb2Rlci8nKS5TdHJpbmdEZWNvZGVyO1xuICAgIHRoaXMuZGVjb2RlciA9IG5ldyBTdHJpbmdEZWNvZGVyKG9wdGlvbnMuZW5jb2RpbmcpO1xuICAgIHRoaXMuZW5jb2RpbmcgPSBvcHRpb25zLmVuY29kaW5nO1xuICB9XG59XG5cbmZ1bmN0aW9uIFJlYWRhYmxlKG9wdGlvbnMpIHtcbiAgdmFyIER1cGxleCA9IHJlcXVpcmUoJy4vX3N0cmVhbV9kdXBsZXgnKTtcblxuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUmVhZGFibGUpKVxuICAgIHJldHVybiBuZXcgUmVhZGFibGUob3B0aW9ucyk7XG5cbiAgdGhpcy5fcmVhZGFibGVTdGF0ZSA9IG5ldyBSZWFkYWJsZVN0YXRlKG9wdGlvbnMsIHRoaXMpO1xuXG4gIC8vIGxlZ2FjeVxuICB0aGlzLnJlYWRhYmxlID0gdHJ1ZTtcblxuICBTdHJlYW0uY2FsbCh0aGlzKTtcbn1cblxuLy8gTWFudWFsbHkgc2hvdmUgc29tZXRoaW5nIGludG8gdGhlIHJlYWQoKSBidWZmZXIuXG4vLyBUaGlzIHJldHVybnMgdHJ1ZSBpZiB0aGUgaGlnaFdhdGVyTWFyayBoYXMgbm90IGJlZW4gaGl0IHlldCxcbi8vIHNpbWlsYXIgdG8gaG93IFdyaXRhYmxlLndyaXRlKCkgcmV0dXJucyB0cnVlIGlmIHlvdSBzaG91bGRcbi8vIHdyaXRlKCkgc29tZSBtb3JlLlxuUmVhZGFibGUucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbihjaHVuaywgZW5jb2RpbmcpIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fcmVhZGFibGVTdGF0ZTtcblxuICBpZiAodXRpbC5pc1N0cmluZyhjaHVuaykgJiYgIXN0YXRlLm9iamVjdE1vZGUpIHtcbiAgICBlbmNvZGluZyA9IGVuY29kaW5nIHx8IHN0YXRlLmRlZmF1bHRFbmNvZGluZztcbiAgICBpZiAoZW5jb2RpbmcgIT09IHN0YXRlLmVuY29kaW5nKSB7XG4gICAgICBjaHVuayA9IG5ldyBCdWZmZXIoY2h1bmssIGVuY29kaW5nKTtcbiAgICAgIGVuY29kaW5nID0gJyc7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlYWRhYmxlQWRkQ2h1bmsodGhpcywgc3RhdGUsIGNodW5rLCBlbmNvZGluZywgZmFsc2UpO1xufTtcblxuLy8gVW5zaGlmdCBzaG91bGQgKmFsd2F5cyogYmUgc29tZXRoaW5nIGRpcmVjdGx5IG91dCBvZiByZWFkKClcblJlYWRhYmxlLnByb3RvdHlwZS51bnNoaWZ0ID0gZnVuY3Rpb24oY2h1bmspIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fcmVhZGFibGVTdGF0ZTtcbiAgcmV0dXJuIHJlYWRhYmxlQWRkQ2h1bmsodGhpcywgc3RhdGUsIGNodW5rLCAnJywgdHJ1ZSk7XG59O1xuXG5mdW5jdGlvbiByZWFkYWJsZUFkZENodW5rKHN0cmVhbSwgc3RhdGUsIGNodW5rLCBlbmNvZGluZywgYWRkVG9Gcm9udCkge1xuICB2YXIgZXIgPSBjaHVua0ludmFsaWQoc3RhdGUsIGNodW5rKTtcbiAgaWYgKGVyKSB7XG4gICAgc3RyZWFtLmVtaXQoJ2Vycm9yJywgZXIpO1xuICB9IGVsc2UgaWYgKHV0aWwuaXNOdWxsT3JVbmRlZmluZWQoY2h1bmspKSB7XG4gICAgc3RhdGUucmVhZGluZyA9IGZhbHNlO1xuICAgIGlmICghc3RhdGUuZW5kZWQpXG4gICAgICBvbkVvZkNodW5rKHN0cmVhbSwgc3RhdGUpO1xuICB9IGVsc2UgaWYgKHN0YXRlLm9iamVjdE1vZGUgfHwgY2h1bmsgJiYgY2h1bmsubGVuZ3RoID4gMCkge1xuICAgIGlmIChzdGF0ZS5lbmRlZCAmJiAhYWRkVG9Gcm9udCkge1xuICAgICAgdmFyIGUgPSBuZXcgRXJyb3IoJ3N0cmVhbS5wdXNoKCkgYWZ0ZXIgRU9GJyk7XG4gICAgICBzdHJlYW0uZW1pdCgnZXJyb3InLCBlKTtcbiAgICB9IGVsc2UgaWYgKHN0YXRlLmVuZEVtaXR0ZWQgJiYgYWRkVG9Gcm9udCkge1xuICAgICAgdmFyIGUgPSBuZXcgRXJyb3IoJ3N0cmVhbS51bnNoaWZ0KCkgYWZ0ZXIgZW5kIGV2ZW50Jyk7XG4gICAgICBzdHJlYW0uZW1pdCgnZXJyb3InLCBlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHN0YXRlLmRlY29kZXIgJiYgIWFkZFRvRnJvbnQgJiYgIWVuY29kaW5nKVxuICAgICAgICBjaHVuayA9IHN0YXRlLmRlY29kZXIud3JpdGUoY2h1bmspO1xuXG4gICAgICBpZiAoIWFkZFRvRnJvbnQpXG4gICAgICAgIHN0YXRlLnJlYWRpbmcgPSBmYWxzZTtcblxuICAgICAgLy8gaWYgd2Ugd2FudCB0aGUgZGF0YSBub3csIGp1c3QgZW1pdCBpdC5cbiAgICAgIGlmIChzdGF0ZS5mbG93aW5nICYmIHN0YXRlLmxlbmd0aCA9PT0gMCAmJiAhc3RhdGUuc3luYykge1xuICAgICAgICBzdHJlYW0uZW1pdCgnZGF0YScsIGNodW5rKTtcbiAgICAgICAgc3RyZWFtLnJlYWQoMCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyB1cGRhdGUgdGhlIGJ1ZmZlciBpbmZvLlxuICAgICAgICBzdGF0ZS5sZW5ndGggKz0gc3RhdGUub2JqZWN0TW9kZSA/IDEgOiBjaHVuay5sZW5ndGg7XG4gICAgICAgIGlmIChhZGRUb0Zyb250KVxuICAgICAgICAgIHN0YXRlLmJ1ZmZlci51bnNoaWZ0KGNodW5rKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHN0YXRlLmJ1ZmZlci5wdXNoKGNodW5rKTtcblxuICAgICAgICBpZiAoc3RhdGUubmVlZFJlYWRhYmxlKVxuICAgICAgICAgIGVtaXRSZWFkYWJsZShzdHJlYW0pO1xuICAgICAgfVxuXG4gICAgICBtYXliZVJlYWRNb3JlKHN0cmVhbSwgc3RhdGUpO1xuICAgIH1cbiAgfSBlbHNlIGlmICghYWRkVG9Gcm9udCkge1xuICAgIHN0YXRlLnJlYWRpbmcgPSBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiBuZWVkTW9yZURhdGEoc3RhdGUpO1xufVxuXG5cblxuLy8gaWYgaXQncyBwYXN0IHRoZSBoaWdoIHdhdGVyIG1hcmssIHdlIGNhbiBwdXNoIGluIHNvbWUgbW9yZS5cbi8vIEFsc28sIGlmIHdlIGhhdmUgbm8gZGF0YSB5ZXQsIHdlIGNhbiBzdGFuZCBzb21lXG4vLyBtb3JlIGJ5dGVzLiAgVGhpcyBpcyB0byB3b3JrIGFyb3VuZCBjYXNlcyB3aGVyZSBod209MCxcbi8vIHN1Y2ggYXMgdGhlIHJlcGwuICBBbHNvLCBpZiB0aGUgcHVzaCgpIHRyaWdnZXJlZCBhXG4vLyByZWFkYWJsZSBldmVudCwgYW5kIHRoZSB1c2VyIGNhbGxlZCByZWFkKGxhcmdlTnVtYmVyKSBzdWNoIHRoYXRcbi8vIG5lZWRSZWFkYWJsZSB3YXMgc2V0LCB0aGVuIHdlIG91Z2h0IHRvIHB1c2ggbW9yZSwgc28gdGhhdCBhbm90aGVyXG4vLyAncmVhZGFibGUnIGV2ZW50IHdpbGwgYmUgdHJpZ2dlcmVkLlxuZnVuY3Rpb24gbmVlZE1vcmVEYXRhKHN0YXRlKSB7XG4gIHJldHVybiAhc3RhdGUuZW5kZWQgJiZcbiAgICAgICAgIChzdGF0ZS5uZWVkUmVhZGFibGUgfHxcbiAgICAgICAgICBzdGF0ZS5sZW5ndGggPCBzdGF0ZS5oaWdoV2F0ZXJNYXJrIHx8XG4gICAgICAgICAgc3RhdGUubGVuZ3RoID09PSAwKTtcbn1cblxuLy8gYmFja3dhcmRzIGNvbXBhdGliaWxpdHkuXG5SZWFkYWJsZS5wcm90b3R5cGUuc2V0RW5jb2RpbmcgPSBmdW5jdGlvbihlbmMpIHtcbiAgaWYgKCFTdHJpbmdEZWNvZGVyKVxuICAgIFN0cmluZ0RlY29kZXIgPSByZXF1aXJlKCdzdHJpbmdfZGVjb2Rlci8nKS5TdHJpbmdEZWNvZGVyO1xuICB0aGlzLl9yZWFkYWJsZVN0YXRlLmRlY29kZXIgPSBuZXcgU3RyaW5nRGVjb2RlcihlbmMpO1xuICB0aGlzLl9yZWFkYWJsZVN0YXRlLmVuY29kaW5nID0gZW5jO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIERvbid0IHJhaXNlIHRoZSBod20gPiAxMjhNQlxudmFyIE1BWF9IV00gPSAweDgwMDAwMDtcbmZ1bmN0aW9uIHJvdW5kVXBUb05leHRQb3dlck9mMihuKSB7XG4gIGlmIChuID49IE1BWF9IV00pIHtcbiAgICBuID0gTUFYX0hXTTtcbiAgfSBlbHNlIHtcbiAgICAvLyBHZXQgdGhlIG5leHQgaGlnaGVzdCBwb3dlciBvZiAyXG4gICAgbi0tO1xuICAgIGZvciAodmFyIHAgPSAxOyBwIDwgMzI7IHAgPDw9IDEpIG4gfD0gbiA+PiBwO1xuICAgIG4rKztcbiAgfVxuICByZXR1cm4gbjtcbn1cblxuZnVuY3Rpb24gaG93TXVjaFRvUmVhZChuLCBzdGF0ZSkge1xuICBpZiAoc3RhdGUubGVuZ3RoID09PSAwICYmIHN0YXRlLmVuZGVkKVxuICAgIHJldHVybiAwO1xuXG4gIGlmIChzdGF0ZS5vYmplY3RNb2RlKVxuICAgIHJldHVybiBuID09PSAwID8gMCA6IDE7XG5cbiAgaWYgKGlzTmFOKG4pIHx8IHV0aWwuaXNOdWxsKG4pKSB7XG4gICAgLy8gb25seSBmbG93IG9uZSBidWZmZXIgYXQgYSB0aW1lXG4gICAgaWYgKHN0YXRlLmZsb3dpbmcgJiYgc3RhdGUuYnVmZmVyLmxlbmd0aClcbiAgICAgIHJldHVybiBzdGF0ZS5idWZmZXJbMF0ubGVuZ3RoO1xuICAgIGVsc2VcbiAgICAgIHJldHVybiBzdGF0ZS5sZW5ndGg7XG4gIH1cblxuICBpZiAobiA8PSAwKVxuICAgIHJldHVybiAwO1xuXG4gIC8vIElmIHdlJ3JlIGFza2luZyBmb3IgbW9yZSB0aGFuIHRoZSB0YXJnZXQgYnVmZmVyIGxldmVsLFxuICAvLyB0aGVuIHJhaXNlIHRoZSB3YXRlciBtYXJrLiAgQnVtcCB1cCB0byB0aGUgbmV4dCBoaWdoZXN0XG4gIC8vIHBvd2VyIG9mIDIsIHRvIHByZXZlbnQgaW5jcmVhc2luZyBpdCBleGNlc3NpdmVseSBpbiB0aW55XG4gIC8vIGFtb3VudHMuXG4gIGlmIChuID4gc3RhdGUuaGlnaFdhdGVyTWFyaylcbiAgICBzdGF0ZS5oaWdoV2F0ZXJNYXJrID0gcm91bmRVcFRvTmV4dFBvd2VyT2YyKG4pO1xuXG4gIC8vIGRvbid0IGhhdmUgdGhhdCBtdWNoLiAgcmV0dXJuIG51bGwsIHVubGVzcyB3ZSd2ZSBlbmRlZC5cbiAgaWYgKG4gPiBzdGF0ZS5sZW5ndGgpIHtcbiAgICBpZiAoIXN0YXRlLmVuZGVkKSB7XG4gICAgICBzdGF0ZS5uZWVkUmVhZGFibGUgPSB0cnVlO1xuICAgICAgcmV0dXJuIDA7XG4gICAgfSBlbHNlXG4gICAgICByZXR1cm4gc3RhdGUubGVuZ3RoO1xuICB9XG5cbiAgcmV0dXJuIG47XG59XG5cbi8vIHlvdSBjYW4gb3ZlcnJpZGUgZWl0aGVyIHRoaXMgbWV0aG9kLCBvciB0aGUgYXN5bmMgX3JlYWQobikgYmVsb3cuXG5SZWFkYWJsZS5wcm90b3R5cGUucmVhZCA9IGZ1bmN0aW9uKG4pIHtcbiAgZGVidWcoJ3JlYWQnLCBuKTtcbiAgdmFyIHN0YXRlID0gdGhpcy5fcmVhZGFibGVTdGF0ZTtcbiAgdmFyIG5PcmlnID0gbjtcblxuICBpZiAoIXV0aWwuaXNOdW1iZXIobikgfHwgbiA+IDApXG4gICAgc3RhdGUuZW1pdHRlZFJlYWRhYmxlID0gZmFsc2U7XG5cbiAgLy8gaWYgd2UncmUgZG9pbmcgcmVhZCgwKSB0byB0cmlnZ2VyIGEgcmVhZGFibGUgZXZlbnQsIGJ1dCB3ZVxuICAvLyBhbHJlYWR5IGhhdmUgYSBidW5jaCBvZiBkYXRhIGluIHRoZSBidWZmZXIsIHRoZW4ganVzdCB0cmlnZ2VyXG4gIC8vIHRoZSAncmVhZGFibGUnIGV2ZW50IGFuZCBtb3ZlIG9uLlxuICBpZiAobiA9PT0gMCAmJlxuICAgICAgc3RhdGUubmVlZFJlYWRhYmxlICYmXG4gICAgICAoc3RhdGUubGVuZ3RoID49IHN0YXRlLmhpZ2hXYXRlck1hcmsgfHwgc3RhdGUuZW5kZWQpKSB7XG4gICAgZGVidWcoJ3JlYWQ6IGVtaXRSZWFkYWJsZScsIHN0YXRlLmxlbmd0aCwgc3RhdGUuZW5kZWQpO1xuICAgIGlmIChzdGF0ZS5sZW5ndGggPT09IDAgJiYgc3RhdGUuZW5kZWQpXG4gICAgICBlbmRSZWFkYWJsZSh0aGlzKTtcbiAgICBlbHNlXG4gICAgICBlbWl0UmVhZGFibGUodGhpcyk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBuID0gaG93TXVjaFRvUmVhZChuLCBzdGF0ZSk7XG5cbiAgLy8gaWYgd2UndmUgZW5kZWQsIGFuZCB3ZSdyZSBub3cgY2xlYXIsIHRoZW4gZmluaXNoIGl0IHVwLlxuICBpZiAobiA9PT0gMCAmJiBzdGF0ZS5lbmRlZCkge1xuICAgIGlmIChzdGF0ZS5sZW5ndGggPT09IDApXG4gICAgICBlbmRSZWFkYWJsZSh0aGlzKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIEFsbCB0aGUgYWN0dWFsIGNodW5rIGdlbmVyYXRpb24gbG9naWMgbmVlZHMgdG8gYmVcbiAgLy8gKmJlbG93KiB0aGUgY2FsbCB0byBfcmVhZC4gIFRoZSByZWFzb24gaXMgdGhhdCBpbiBjZXJ0YWluXG4gIC8vIHN5bnRoZXRpYyBzdHJlYW0gY2FzZXMsIHN1Y2ggYXMgcGFzc3Rocm91Z2ggc3RyZWFtcywgX3JlYWRcbiAgLy8gbWF5IGJlIGEgY29tcGxldGVseSBzeW5jaHJvbm91cyBvcGVyYXRpb24gd2hpY2ggbWF5IGNoYW5nZVxuICAvLyB0aGUgc3RhdGUgb2YgdGhlIHJlYWQgYnVmZmVyLCBwcm92aWRpbmcgZW5vdWdoIGRhdGEgd2hlblxuICAvLyBiZWZvcmUgdGhlcmUgd2FzICpub3QqIGVub3VnaC5cbiAgLy9cbiAgLy8gU28sIHRoZSBzdGVwcyBhcmU6XG4gIC8vIDEuIEZpZ3VyZSBvdXQgd2hhdCB0aGUgc3RhdGUgb2YgdGhpbmdzIHdpbGwgYmUgYWZ0ZXIgd2UgZG9cbiAgLy8gYSByZWFkIGZyb20gdGhlIGJ1ZmZlci5cbiAgLy9cbiAgLy8gMi4gSWYgdGhhdCByZXN1bHRpbmcgc3RhdGUgd2lsbCB0cmlnZ2VyIGEgX3JlYWQsIHRoZW4gY2FsbCBfcmVhZC5cbiAgLy8gTm90ZSB0aGF0IHRoaXMgbWF5IGJlIGFzeW5jaHJvbm91cywgb3Igc3luY2hyb25vdXMuICBZZXMsIGl0IGlzXG4gIC8vIGRlZXBseSB1Z2x5IHRvIHdyaXRlIEFQSXMgdGhpcyB3YXksIGJ1dCB0aGF0IHN0aWxsIGRvZXNuJ3QgbWVhblxuICAvLyB0aGF0IHRoZSBSZWFkYWJsZSBjbGFzcyBzaG91bGQgYmVoYXZlIGltcHJvcGVybHksIGFzIHN0cmVhbXMgYXJlXG4gIC8vIGRlc2lnbmVkIHRvIGJlIHN5bmMvYXN5bmMgYWdub3N0aWMuXG4gIC8vIFRha2Ugbm90ZSBpZiB0aGUgX3JlYWQgY2FsbCBpcyBzeW5jIG9yIGFzeW5jIChpZSwgaWYgdGhlIHJlYWQgY2FsbFxuICAvLyBoYXMgcmV0dXJuZWQgeWV0KSwgc28gdGhhdCB3ZSBrbm93IHdoZXRoZXIgb3Igbm90IGl0J3Mgc2FmZSB0byBlbWl0XG4gIC8vICdyZWFkYWJsZScgZXRjLlxuICAvL1xuICAvLyAzLiBBY3R1YWxseSBwdWxsIHRoZSByZXF1ZXN0ZWQgY2h1bmtzIG91dCBvZiB0aGUgYnVmZmVyIGFuZCByZXR1cm4uXG5cbiAgLy8gaWYgd2UgbmVlZCBhIHJlYWRhYmxlIGV2ZW50LCB0aGVuIHdlIG5lZWQgdG8gZG8gc29tZSByZWFkaW5nLlxuICB2YXIgZG9SZWFkID0gc3RhdGUubmVlZFJlYWRhYmxlO1xuICBkZWJ1ZygnbmVlZCByZWFkYWJsZScsIGRvUmVhZCk7XG5cbiAgLy8gaWYgd2UgY3VycmVudGx5IGhhdmUgbGVzcyB0aGFuIHRoZSBoaWdoV2F0ZXJNYXJrLCB0aGVuIGFsc28gcmVhZCBzb21lXG4gIGlmIChzdGF0ZS5sZW5ndGggPT09IDAgfHwgc3RhdGUubGVuZ3RoIC0gbiA8IHN0YXRlLmhpZ2hXYXRlck1hcmspIHtcbiAgICBkb1JlYWQgPSB0cnVlO1xuICAgIGRlYnVnKCdsZW5ndGggbGVzcyB0aGFuIHdhdGVybWFyaycsIGRvUmVhZCk7XG4gIH1cblxuICAvLyBob3dldmVyLCBpZiB3ZSd2ZSBlbmRlZCwgdGhlbiB0aGVyZSdzIG5vIHBvaW50LCBhbmQgaWYgd2UncmUgYWxyZWFkeVxuICAvLyByZWFkaW5nLCB0aGVuIGl0J3MgdW5uZWNlc3NhcnkuXG4gIGlmIChzdGF0ZS5lbmRlZCB8fCBzdGF0ZS5yZWFkaW5nKSB7XG4gICAgZG9SZWFkID0gZmFsc2U7XG4gICAgZGVidWcoJ3JlYWRpbmcgb3IgZW5kZWQnLCBkb1JlYWQpO1xuICB9XG5cbiAgaWYgKGRvUmVhZCkge1xuICAgIGRlYnVnKCdkbyByZWFkJyk7XG4gICAgc3RhdGUucmVhZGluZyA9IHRydWU7XG4gICAgc3RhdGUuc3luYyA9IHRydWU7XG4gICAgLy8gaWYgdGhlIGxlbmd0aCBpcyBjdXJyZW50bHkgemVybywgdGhlbiB3ZSAqbmVlZCogYSByZWFkYWJsZSBldmVudC5cbiAgICBpZiAoc3RhdGUubGVuZ3RoID09PSAwKVxuICAgICAgc3RhdGUubmVlZFJlYWRhYmxlID0gdHJ1ZTtcbiAgICAvLyBjYWxsIGludGVybmFsIHJlYWQgbWV0aG9kXG4gICAgdGhpcy5fcmVhZChzdGF0ZS5oaWdoV2F0ZXJNYXJrKTtcbiAgICBzdGF0ZS5zeW5jID0gZmFsc2U7XG4gIH1cblxuICAvLyBJZiBfcmVhZCBwdXNoZWQgZGF0YSBzeW5jaHJvbm91c2x5LCB0aGVuIGByZWFkaW5nYCB3aWxsIGJlIGZhbHNlLFxuICAvLyBhbmQgd2UgbmVlZCB0byByZS1ldmFsdWF0ZSBob3cgbXVjaCBkYXRhIHdlIGNhbiByZXR1cm4gdG8gdGhlIHVzZXIuXG4gIGlmIChkb1JlYWQgJiYgIXN0YXRlLnJlYWRpbmcpXG4gICAgbiA9IGhvd011Y2hUb1JlYWQobk9yaWcsIHN0YXRlKTtcblxuICB2YXIgcmV0O1xuICBpZiAobiA+IDApXG4gICAgcmV0ID0gZnJvbUxpc3Qobiwgc3RhdGUpO1xuICBlbHNlXG4gICAgcmV0ID0gbnVsbDtcblxuICBpZiAodXRpbC5pc051bGwocmV0KSkge1xuICAgIHN0YXRlLm5lZWRSZWFkYWJsZSA9IHRydWU7XG4gICAgbiA9IDA7XG4gIH1cblxuICBzdGF0ZS5sZW5ndGggLT0gbjtcblxuICAvLyBJZiB3ZSBoYXZlIG5vdGhpbmcgaW4gdGhlIGJ1ZmZlciwgdGhlbiB3ZSB3YW50IHRvIGtub3dcbiAgLy8gYXMgc29vbiBhcyB3ZSAqZG8qIGdldCBzb21ldGhpbmcgaW50byB0aGUgYnVmZmVyLlxuICBpZiAoc3RhdGUubGVuZ3RoID09PSAwICYmICFzdGF0ZS5lbmRlZClcbiAgICBzdGF0ZS5uZWVkUmVhZGFibGUgPSB0cnVlO1xuXG4gIC8vIElmIHdlIHRyaWVkIHRvIHJlYWQoKSBwYXN0IHRoZSBFT0YsIHRoZW4gZW1pdCBlbmQgb24gdGhlIG5leHQgdGljay5cbiAgaWYgKG5PcmlnICE9PSBuICYmIHN0YXRlLmVuZGVkICYmIHN0YXRlLmxlbmd0aCA9PT0gMClcbiAgICBlbmRSZWFkYWJsZSh0aGlzKTtcblxuICBpZiAoIXV0aWwuaXNOdWxsKHJldCkpXG4gICAgdGhpcy5lbWl0KCdkYXRhJywgcmV0KTtcblxuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gY2h1bmtJbnZhbGlkKHN0YXRlLCBjaHVuaykge1xuICB2YXIgZXIgPSBudWxsO1xuICBpZiAoIXV0aWwuaXNCdWZmZXIoY2h1bmspICYmXG4gICAgICAhdXRpbC5pc1N0cmluZyhjaHVuaykgJiZcbiAgICAgICF1dGlsLmlzTnVsbE9yVW5kZWZpbmVkKGNodW5rKSAmJlxuICAgICAgIXN0YXRlLm9iamVjdE1vZGUpIHtcbiAgICBlciA9IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgbm9uLXN0cmluZy9idWZmZXIgY2h1bmsnKTtcbiAgfVxuICByZXR1cm4gZXI7XG59XG5cblxuZnVuY3Rpb24gb25Fb2ZDaHVuayhzdHJlYW0sIHN0YXRlKSB7XG4gIGlmIChzdGF0ZS5kZWNvZGVyICYmICFzdGF0ZS5lbmRlZCkge1xuICAgIHZhciBjaHVuayA9IHN0YXRlLmRlY29kZXIuZW5kKCk7XG4gICAgaWYgKGNodW5rICYmIGNodW5rLmxlbmd0aCkge1xuICAgICAgc3RhdGUuYnVmZmVyLnB1c2goY2h1bmspO1xuICAgICAgc3RhdGUubGVuZ3RoICs9IHN0YXRlLm9iamVjdE1vZGUgPyAxIDogY2h1bmsubGVuZ3RoO1xuICAgIH1cbiAgfVxuICBzdGF0ZS5lbmRlZCA9IHRydWU7XG5cbiAgLy8gZW1pdCAncmVhZGFibGUnIG5vdyB0byBtYWtlIHN1cmUgaXQgZ2V0cyBwaWNrZWQgdXAuXG4gIGVtaXRSZWFkYWJsZShzdHJlYW0pO1xufVxuXG4vLyBEb24ndCBlbWl0IHJlYWRhYmxlIHJpZ2h0IGF3YXkgaW4gc3luYyBtb2RlLCBiZWNhdXNlIHRoaXMgY2FuIHRyaWdnZXJcbi8vIGFub3RoZXIgcmVhZCgpIGNhbGwgPT4gc3RhY2sgb3ZlcmZsb3cuICBUaGlzIHdheSwgaXQgbWlnaHQgdHJpZ2dlclxuLy8gYSBuZXh0VGljayByZWN1cnNpb24gd2FybmluZywgYnV0IHRoYXQncyBub3Qgc28gYmFkLlxuZnVuY3Rpb24gZW1pdFJlYWRhYmxlKHN0cmVhbSkge1xuICB2YXIgc3RhdGUgPSBzdHJlYW0uX3JlYWRhYmxlU3RhdGU7XG4gIHN0YXRlLm5lZWRSZWFkYWJsZSA9IGZhbHNlO1xuICBpZiAoIXN0YXRlLmVtaXR0ZWRSZWFkYWJsZSkge1xuICAgIGRlYnVnKCdlbWl0UmVhZGFibGUnLCBzdGF0ZS5mbG93aW5nKTtcbiAgICBzdGF0ZS5lbWl0dGVkUmVhZGFibGUgPSB0cnVlO1xuICAgIGlmIChzdGF0ZS5zeW5jKVxuICAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgICAgZW1pdFJlYWRhYmxlXyhzdHJlYW0pO1xuICAgICAgfSk7XG4gICAgZWxzZVxuICAgICAgZW1pdFJlYWRhYmxlXyhzdHJlYW0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGVtaXRSZWFkYWJsZV8oc3RyZWFtKSB7XG4gIGRlYnVnKCdlbWl0IHJlYWRhYmxlJyk7XG4gIHN0cmVhbS5lbWl0KCdyZWFkYWJsZScpO1xuICBmbG93KHN0cmVhbSk7XG59XG5cblxuLy8gYXQgdGhpcyBwb2ludCwgdGhlIHVzZXIgaGFzIHByZXN1bWFibHkgc2VlbiB0aGUgJ3JlYWRhYmxlJyBldmVudCxcbi8vIGFuZCBjYWxsZWQgcmVhZCgpIHRvIGNvbnN1bWUgc29tZSBkYXRhLiAgdGhhdCBtYXkgaGF2ZSB0cmlnZ2VyZWRcbi8vIGluIHR1cm4gYW5vdGhlciBfcmVhZChuKSBjYWxsLCBpbiB3aGljaCBjYXNlIHJlYWRpbmcgPSB0cnVlIGlmXG4vLyBpdCdzIGluIHByb2dyZXNzLlxuLy8gSG93ZXZlciwgaWYgd2UncmUgbm90IGVuZGVkLCBvciByZWFkaW5nLCBhbmQgdGhlIGxlbmd0aCA8IGh3bSxcbi8vIHRoZW4gZ28gYWhlYWQgYW5kIHRyeSB0byByZWFkIHNvbWUgbW9yZSBwcmVlbXB0aXZlbHkuXG5mdW5jdGlvbiBtYXliZVJlYWRNb3JlKHN0cmVhbSwgc3RhdGUpIHtcbiAgaWYgKCFzdGF0ZS5yZWFkaW5nTW9yZSkge1xuICAgIHN0YXRlLnJlYWRpbmdNb3JlID0gdHJ1ZTtcbiAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgbWF5YmVSZWFkTW9yZV8oc3RyZWFtLCBzdGF0ZSk7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gbWF5YmVSZWFkTW9yZV8oc3RyZWFtLCBzdGF0ZSkge1xuICB2YXIgbGVuID0gc3RhdGUubGVuZ3RoO1xuICB3aGlsZSAoIXN0YXRlLnJlYWRpbmcgJiYgIXN0YXRlLmZsb3dpbmcgJiYgIXN0YXRlLmVuZGVkICYmXG4gICAgICAgICBzdGF0ZS5sZW5ndGggPCBzdGF0ZS5oaWdoV2F0ZXJNYXJrKSB7XG4gICAgZGVidWcoJ21heWJlUmVhZE1vcmUgcmVhZCAwJyk7XG4gICAgc3RyZWFtLnJlYWQoMCk7XG4gICAgaWYgKGxlbiA9PT0gc3RhdGUubGVuZ3RoKVxuICAgICAgLy8gZGlkbid0IGdldCBhbnkgZGF0YSwgc3RvcCBzcGlubmluZy5cbiAgICAgIGJyZWFrO1xuICAgIGVsc2VcbiAgICAgIGxlbiA9IHN0YXRlLmxlbmd0aDtcbiAgfVxuICBzdGF0ZS5yZWFkaW5nTW9yZSA9IGZhbHNlO1xufVxuXG4vLyBhYnN0cmFjdCBtZXRob2QuICB0byBiZSBvdmVycmlkZGVuIGluIHNwZWNpZmljIGltcGxlbWVudGF0aW9uIGNsYXNzZXMuXG4vLyBjYWxsIGNiKGVyLCBkYXRhKSB3aGVyZSBkYXRhIGlzIDw9IG4gaW4gbGVuZ3RoLlxuLy8gZm9yIHZpcnR1YWwgKG5vbi1zdHJpbmcsIG5vbi1idWZmZXIpIHN0cmVhbXMsIFwibGVuZ3RoXCIgaXMgc29tZXdoYXRcbi8vIGFyYml0cmFyeSwgYW5kIHBlcmhhcHMgbm90IHZlcnkgbWVhbmluZ2Z1bC5cblJlYWRhYmxlLnByb3RvdHlwZS5fcmVhZCA9IGZ1bmN0aW9uKG4pIHtcbiAgdGhpcy5lbWl0KCdlcnJvcicsIG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJykpO1xufTtcblxuUmVhZGFibGUucHJvdG90eXBlLnBpcGUgPSBmdW5jdGlvbihkZXN0LCBwaXBlT3B0cykge1xuICB2YXIgc3JjID0gdGhpcztcbiAgdmFyIHN0YXRlID0gdGhpcy5fcmVhZGFibGVTdGF0ZTtcblxuICBzd2l0Y2ggKHN0YXRlLnBpcGVzQ291bnQpIHtcbiAgICBjYXNlIDA6XG4gICAgICBzdGF0ZS5waXBlcyA9IGRlc3Q7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDE6XG4gICAgICBzdGF0ZS5waXBlcyA9IFtzdGF0ZS5waXBlcywgZGVzdF07XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgc3RhdGUucGlwZXMucHVzaChkZXN0KTtcbiAgICAgIGJyZWFrO1xuICB9XG4gIHN0YXRlLnBpcGVzQ291bnQgKz0gMTtcbiAgZGVidWcoJ3BpcGUgY291bnQ9JWQgb3B0cz0laicsIHN0YXRlLnBpcGVzQ291bnQsIHBpcGVPcHRzKTtcblxuICB2YXIgZG9FbmQgPSAoIXBpcGVPcHRzIHx8IHBpcGVPcHRzLmVuZCAhPT0gZmFsc2UpICYmXG4gICAgICAgICAgICAgIGRlc3QgIT09IHByb2Nlc3Muc3Rkb3V0ICYmXG4gICAgICAgICAgICAgIGRlc3QgIT09IHByb2Nlc3Muc3RkZXJyO1xuXG4gIHZhciBlbmRGbiA9IGRvRW5kID8gb25lbmQgOiBjbGVhbnVwO1xuICBpZiAoc3RhdGUuZW5kRW1pdHRlZClcbiAgICBwcm9jZXNzLm5leHRUaWNrKGVuZEZuKTtcbiAgZWxzZVxuICAgIHNyYy5vbmNlKCdlbmQnLCBlbmRGbik7XG5cbiAgZGVzdC5vbigndW5waXBlJywgb251bnBpcGUpO1xuICBmdW5jdGlvbiBvbnVucGlwZShyZWFkYWJsZSkge1xuICAgIGRlYnVnKCdvbnVucGlwZScpO1xuICAgIGlmIChyZWFkYWJsZSA9PT0gc3JjKSB7XG4gICAgICBjbGVhbnVwKCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gb25lbmQoKSB7XG4gICAgZGVidWcoJ29uZW5kJyk7XG4gICAgZGVzdC5lbmQoKTtcbiAgfVxuXG4gIC8vIHdoZW4gdGhlIGRlc3QgZHJhaW5zLCBpdCByZWR1Y2VzIHRoZSBhd2FpdERyYWluIGNvdW50ZXJcbiAgLy8gb24gdGhlIHNvdXJjZS4gIFRoaXMgd291bGQgYmUgbW9yZSBlbGVnYW50IHdpdGggYSAub25jZSgpXG4gIC8vIGhhbmRsZXIgaW4gZmxvdygpLCBidXQgYWRkaW5nIGFuZCByZW1vdmluZyByZXBlYXRlZGx5IGlzXG4gIC8vIHRvbyBzbG93LlxuICB2YXIgb25kcmFpbiA9IHBpcGVPbkRyYWluKHNyYyk7XG4gIGRlc3Qub24oJ2RyYWluJywgb25kcmFpbik7XG5cbiAgZnVuY3Rpb24gY2xlYW51cCgpIHtcbiAgICBkZWJ1ZygnY2xlYW51cCcpO1xuICAgIC8vIGNsZWFudXAgZXZlbnQgaGFuZGxlcnMgb25jZSB0aGUgcGlwZSBpcyBicm9rZW5cbiAgICBkZXN0LnJlbW92ZUxpc3RlbmVyKCdjbG9zZScsIG9uY2xvc2UpO1xuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2ZpbmlzaCcsIG9uZmluaXNoKTtcbiAgICBkZXN0LnJlbW92ZUxpc3RlbmVyKCdkcmFpbicsIG9uZHJhaW4pO1xuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2Vycm9yJywgb25lcnJvcik7XG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcigndW5waXBlJywgb251bnBpcGUpO1xuICAgIHNyYy5yZW1vdmVMaXN0ZW5lcignZW5kJywgb25lbmQpO1xuICAgIHNyYy5yZW1vdmVMaXN0ZW5lcignZW5kJywgY2xlYW51cCk7XG4gICAgc3JjLnJlbW92ZUxpc3RlbmVyKCdkYXRhJywgb25kYXRhKTtcblxuICAgIC8vIGlmIHRoZSByZWFkZXIgaXMgd2FpdGluZyBmb3IgYSBkcmFpbiBldmVudCBmcm9tIHRoaXNcbiAgICAvLyBzcGVjaWZpYyB3cml0ZXIsIHRoZW4gaXQgd291bGQgY2F1c2UgaXQgdG8gbmV2ZXIgc3RhcnRcbiAgICAvLyBmbG93aW5nIGFnYWluLlxuICAgIC8vIFNvLCBpZiB0aGlzIGlzIGF3YWl0aW5nIGEgZHJhaW4sIHRoZW4gd2UganVzdCBjYWxsIGl0IG5vdy5cbiAgICAvLyBJZiB3ZSBkb24ndCBrbm93LCB0aGVuIGFzc3VtZSB0aGF0IHdlIGFyZSB3YWl0aW5nIGZvciBvbmUuXG4gICAgaWYgKHN0YXRlLmF3YWl0RHJhaW4gJiZcbiAgICAgICAgKCFkZXN0Ll93cml0YWJsZVN0YXRlIHx8IGRlc3QuX3dyaXRhYmxlU3RhdGUubmVlZERyYWluKSlcbiAgICAgIG9uZHJhaW4oKTtcbiAgfVxuXG4gIHNyYy5vbignZGF0YScsIG9uZGF0YSk7XG4gIGZ1bmN0aW9uIG9uZGF0YShjaHVuaykge1xuICAgIGRlYnVnKCdvbmRhdGEnKTtcbiAgICB2YXIgcmV0ID0gZGVzdC53cml0ZShjaHVuayk7XG4gICAgaWYgKGZhbHNlID09PSByZXQpIHtcbiAgICAgIGRlYnVnKCdmYWxzZSB3cml0ZSByZXNwb25zZSwgcGF1c2UnLFxuICAgICAgICAgICAgc3JjLl9yZWFkYWJsZVN0YXRlLmF3YWl0RHJhaW4pO1xuICAgICAgc3JjLl9yZWFkYWJsZVN0YXRlLmF3YWl0RHJhaW4rKztcbiAgICAgIHNyYy5wYXVzZSgpO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlmIHRoZSBkZXN0IGhhcyBhbiBlcnJvciwgdGhlbiBzdG9wIHBpcGluZyBpbnRvIGl0LlxuICAvLyBob3dldmVyLCBkb24ndCBzdXBwcmVzcyB0aGUgdGhyb3dpbmcgYmVoYXZpb3IgZm9yIHRoaXMuXG4gIGZ1bmN0aW9uIG9uZXJyb3IoZXIpIHtcbiAgICBkZWJ1Zygnb25lcnJvcicsIGVyKTtcbiAgICB1bnBpcGUoKTtcbiAgICBkZXN0LnJlbW92ZUxpc3RlbmVyKCdlcnJvcicsIG9uZXJyb3IpO1xuICAgIGlmIChFRS5saXN0ZW5lckNvdW50KGRlc3QsICdlcnJvcicpID09PSAwKVxuICAgICAgZGVzdC5lbWl0KCdlcnJvcicsIGVyKTtcbiAgfVxuICAvLyBUaGlzIGlzIGEgYnJ1dGFsbHkgdWdseSBoYWNrIHRvIG1ha2Ugc3VyZSB0aGF0IG91ciBlcnJvciBoYW5kbGVyXG4gIC8vIGlzIGF0dGFjaGVkIGJlZm9yZSBhbnkgdXNlcmxhbmQgb25lcy4gIE5FVkVSIERPIFRISVMuXG4gIGlmICghZGVzdC5fZXZlbnRzIHx8ICFkZXN0Ll9ldmVudHMuZXJyb3IpXG4gICAgZGVzdC5vbignZXJyb3InLCBvbmVycm9yKTtcbiAgZWxzZSBpZiAoaXNBcnJheShkZXN0Ll9ldmVudHMuZXJyb3IpKVxuICAgIGRlc3QuX2V2ZW50cy5lcnJvci51bnNoaWZ0KG9uZXJyb3IpO1xuICBlbHNlXG4gICAgZGVzdC5fZXZlbnRzLmVycm9yID0gW29uZXJyb3IsIGRlc3QuX2V2ZW50cy5lcnJvcl07XG5cblxuXG4gIC8vIEJvdGggY2xvc2UgYW5kIGZpbmlzaCBzaG91bGQgdHJpZ2dlciB1bnBpcGUsIGJ1dCBvbmx5IG9uY2UuXG4gIGZ1bmN0aW9uIG9uY2xvc2UoKSB7XG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcignZmluaXNoJywgb25maW5pc2gpO1xuICAgIHVucGlwZSgpO1xuICB9XG4gIGRlc3Qub25jZSgnY2xvc2UnLCBvbmNsb3NlKTtcbiAgZnVuY3Rpb24gb25maW5pc2goKSB7XG4gICAgZGVidWcoJ29uZmluaXNoJyk7XG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcignY2xvc2UnLCBvbmNsb3NlKTtcbiAgICB1bnBpcGUoKTtcbiAgfVxuICBkZXN0Lm9uY2UoJ2ZpbmlzaCcsIG9uZmluaXNoKTtcblxuICBmdW5jdGlvbiB1bnBpcGUoKSB7XG4gICAgZGVidWcoJ3VucGlwZScpO1xuICAgIHNyYy51bnBpcGUoZGVzdCk7XG4gIH1cblxuICAvLyB0ZWxsIHRoZSBkZXN0IHRoYXQgaXQncyBiZWluZyBwaXBlZCB0b1xuICBkZXN0LmVtaXQoJ3BpcGUnLCBzcmMpO1xuXG4gIC8vIHN0YXJ0IHRoZSBmbG93IGlmIGl0IGhhc24ndCBiZWVuIHN0YXJ0ZWQgYWxyZWFkeS5cbiAgaWYgKCFzdGF0ZS5mbG93aW5nKSB7XG4gICAgZGVidWcoJ3BpcGUgcmVzdW1lJyk7XG4gICAgc3JjLnJlc3VtZSgpO1xuICB9XG5cbiAgcmV0dXJuIGRlc3Q7XG59O1xuXG5mdW5jdGlvbiBwaXBlT25EcmFpbihzcmMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciBzdGF0ZSA9IHNyYy5fcmVhZGFibGVTdGF0ZTtcbiAgICBkZWJ1ZygncGlwZU9uRHJhaW4nLCBzdGF0ZS5hd2FpdERyYWluKTtcbiAgICBpZiAoc3RhdGUuYXdhaXREcmFpbilcbiAgICAgIHN0YXRlLmF3YWl0RHJhaW4tLTtcbiAgICBpZiAoc3RhdGUuYXdhaXREcmFpbiA9PT0gMCAmJiBFRS5saXN0ZW5lckNvdW50KHNyYywgJ2RhdGEnKSkge1xuICAgICAgc3RhdGUuZmxvd2luZyA9IHRydWU7XG4gICAgICBmbG93KHNyYyk7XG4gICAgfVxuICB9O1xufVxuXG5cblJlYWRhYmxlLnByb3RvdHlwZS51bnBpcGUgPSBmdW5jdGlvbihkZXN0KSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX3JlYWRhYmxlU3RhdGU7XG5cbiAgLy8gaWYgd2UncmUgbm90IHBpcGluZyBhbnl3aGVyZSwgdGhlbiBkbyBub3RoaW5nLlxuICBpZiAoc3RhdGUucGlwZXNDb3VudCA9PT0gMClcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBqdXN0IG9uZSBkZXN0aW5hdGlvbi4gIG1vc3QgY29tbW9uIGNhc2UuXG4gIGlmIChzdGF0ZS5waXBlc0NvdW50ID09PSAxKSB7XG4gICAgLy8gcGFzc2VkIGluIG9uZSwgYnV0IGl0J3Mgbm90IHRoZSByaWdodCBvbmUuXG4gICAgaWYgKGRlc3QgJiYgZGVzdCAhPT0gc3RhdGUucGlwZXMpXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmICghZGVzdClcbiAgICAgIGRlc3QgPSBzdGF0ZS5waXBlcztcblxuICAgIC8vIGdvdCBhIG1hdGNoLlxuICAgIHN0YXRlLnBpcGVzID0gbnVsbDtcbiAgICBzdGF0ZS5waXBlc0NvdW50ID0gMDtcbiAgICBzdGF0ZS5mbG93aW5nID0gZmFsc2U7XG4gICAgaWYgKGRlc3QpXG4gICAgICBkZXN0LmVtaXQoJ3VucGlwZScsIHRoaXMpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gc2xvdyBjYXNlLiBtdWx0aXBsZSBwaXBlIGRlc3RpbmF0aW9ucy5cblxuICBpZiAoIWRlc3QpIHtcbiAgICAvLyByZW1vdmUgYWxsLlxuICAgIHZhciBkZXN0cyA9IHN0YXRlLnBpcGVzO1xuICAgIHZhciBsZW4gPSBzdGF0ZS5waXBlc0NvdW50O1xuICAgIHN0YXRlLnBpcGVzID0gbnVsbDtcbiAgICBzdGF0ZS5waXBlc0NvdW50ID0gMDtcbiAgICBzdGF0ZS5mbG93aW5nID0gZmFsc2U7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgZGVzdHNbaV0uZW1pdCgndW5waXBlJywgdGhpcyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyB0cnkgdG8gZmluZCB0aGUgcmlnaHQgb25lLlxuICB2YXIgaSA9IGluZGV4T2Yoc3RhdGUucGlwZXMsIGRlc3QpO1xuICBpZiAoaSA9PT0gLTEpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgc3RhdGUucGlwZXMuc3BsaWNlKGksIDEpO1xuICBzdGF0ZS5waXBlc0NvdW50IC09IDE7XG4gIGlmIChzdGF0ZS5waXBlc0NvdW50ID09PSAxKVxuICAgIHN0YXRlLnBpcGVzID0gc3RhdGUucGlwZXNbMF07XG5cbiAgZGVzdC5lbWl0KCd1bnBpcGUnLCB0aGlzKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIHNldCB1cCBkYXRhIGV2ZW50cyBpZiB0aGV5IGFyZSBhc2tlZCBmb3Jcbi8vIEVuc3VyZSByZWFkYWJsZSBsaXN0ZW5lcnMgZXZlbnR1YWxseSBnZXQgc29tZXRoaW5nXG5SZWFkYWJsZS5wcm90b3R5cGUub24gPSBmdW5jdGlvbihldiwgZm4pIHtcbiAgdmFyIHJlcyA9IFN0cmVhbS5wcm90b3R5cGUub24uY2FsbCh0aGlzLCBldiwgZm4pO1xuXG4gIC8vIElmIGxpc3RlbmluZyB0byBkYXRhLCBhbmQgaXQgaGFzIG5vdCBleHBsaWNpdGx5IGJlZW4gcGF1c2VkLFxuICAvLyB0aGVuIGNhbGwgcmVzdW1lIHRvIHN0YXJ0IHRoZSBmbG93IG9mIGRhdGEgb24gdGhlIG5leHQgdGljay5cbiAgaWYgKGV2ID09PSAnZGF0YScgJiYgZmFsc2UgIT09IHRoaXMuX3JlYWRhYmxlU3RhdGUuZmxvd2luZykge1xuICAgIHRoaXMucmVzdW1lKCk7XG4gIH1cblxuICBpZiAoZXYgPT09ICdyZWFkYWJsZScgJiYgdGhpcy5yZWFkYWJsZSkge1xuICAgIHZhciBzdGF0ZSA9IHRoaXMuX3JlYWRhYmxlU3RhdGU7XG4gICAgaWYgKCFzdGF0ZS5yZWFkYWJsZUxpc3RlbmluZykge1xuICAgICAgc3RhdGUucmVhZGFibGVMaXN0ZW5pbmcgPSB0cnVlO1xuICAgICAgc3RhdGUuZW1pdHRlZFJlYWRhYmxlID0gZmFsc2U7XG4gICAgICBzdGF0ZS5uZWVkUmVhZGFibGUgPSB0cnVlO1xuICAgICAgaWYgKCFzdGF0ZS5yZWFkaW5nKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgICAgICBkZWJ1ZygncmVhZGFibGUgbmV4dHRpY2sgcmVhZCAwJyk7XG4gICAgICAgICAgc2VsZi5yZWFkKDApO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGUubGVuZ3RoKSB7XG4gICAgICAgIGVtaXRSZWFkYWJsZSh0aGlzLCBzdGF0ZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlcztcbn07XG5SZWFkYWJsZS5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBSZWFkYWJsZS5wcm90b3R5cGUub247XG5cbi8vIHBhdXNlKCkgYW5kIHJlc3VtZSgpIGFyZSByZW1uYW50cyBvZiB0aGUgbGVnYWN5IHJlYWRhYmxlIHN0cmVhbSBBUElcbi8vIElmIHRoZSB1c2VyIHVzZXMgdGhlbSwgdGhlbiBzd2l0Y2ggaW50byBvbGQgbW9kZS5cblJlYWRhYmxlLnByb3RvdHlwZS5yZXN1bWUgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fcmVhZGFibGVTdGF0ZTtcbiAgaWYgKCFzdGF0ZS5mbG93aW5nKSB7XG4gICAgZGVidWcoJ3Jlc3VtZScpO1xuICAgIHN0YXRlLmZsb3dpbmcgPSB0cnVlO1xuICAgIGlmICghc3RhdGUucmVhZGluZykge1xuICAgICAgZGVidWcoJ3Jlc3VtZSByZWFkIDAnKTtcbiAgICAgIHRoaXMucmVhZCgwKTtcbiAgICB9XG4gICAgcmVzdW1lKHRoaXMsIHN0YXRlKTtcbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cbmZ1bmN0aW9uIHJlc3VtZShzdHJlYW0sIHN0YXRlKSB7XG4gIGlmICghc3RhdGUucmVzdW1lU2NoZWR1bGVkKSB7XG4gICAgc3RhdGUucmVzdW1lU2NoZWR1bGVkID0gdHJ1ZTtcbiAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgcmVzdW1lXyhzdHJlYW0sIHN0YXRlKTtcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZXN1bWVfKHN0cmVhbSwgc3RhdGUpIHtcbiAgc3RhdGUucmVzdW1lU2NoZWR1bGVkID0gZmFsc2U7XG4gIHN0cmVhbS5lbWl0KCdyZXN1bWUnKTtcbiAgZmxvdyhzdHJlYW0pO1xuICBpZiAoc3RhdGUuZmxvd2luZyAmJiAhc3RhdGUucmVhZGluZylcbiAgICBzdHJlYW0ucmVhZCgwKTtcbn1cblxuUmVhZGFibGUucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oKSB7XG4gIGRlYnVnKCdjYWxsIHBhdXNlIGZsb3dpbmc9JWonLCB0aGlzLl9yZWFkYWJsZVN0YXRlLmZsb3dpbmcpO1xuICBpZiAoZmFsc2UgIT09IHRoaXMuX3JlYWRhYmxlU3RhdGUuZmxvd2luZykge1xuICAgIGRlYnVnKCdwYXVzZScpO1xuICAgIHRoaXMuX3JlYWRhYmxlU3RhdGUuZmxvd2luZyA9IGZhbHNlO1xuICAgIHRoaXMuZW1pdCgncGF1c2UnKTtcbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cbmZ1bmN0aW9uIGZsb3coc3RyZWFtKSB7XG4gIHZhciBzdGF0ZSA9IHN0cmVhbS5fcmVhZGFibGVTdGF0ZTtcbiAgZGVidWcoJ2Zsb3cnLCBzdGF0ZS5mbG93aW5nKTtcbiAgaWYgKHN0YXRlLmZsb3dpbmcpIHtcbiAgICBkbyB7XG4gICAgICB2YXIgY2h1bmsgPSBzdHJlYW0ucmVhZCgpO1xuICAgIH0gd2hpbGUgKG51bGwgIT09IGNodW5rICYmIHN0YXRlLmZsb3dpbmcpO1xuICB9XG59XG5cbi8vIHdyYXAgYW4gb2xkLXN0eWxlIHN0cmVhbSBhcyB0aGUgYXN5bmMgZGF0YSBzb3VyY2UuXG4vLyBUaGlzIGlzICpub3QqIHBhcnQgb2YgdGhlIHJlYWRhYmxlIHN0cmVhbSBpbnRlcmZhY2UuXG4vLyBJdCBpcyBhbiB1Z2x5IHVuZm9ydHVuYXRlIG1lc3Mgb2YgaGlzdG9yeS5cblJlYWRhYmxlLnByb3RvdHlwZS53cmFwID0gZnVuY3Rpb24oc3RyZWFtKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX3JlYWRhYmxlU3RhdGU7XG4gIHZhciBwYXVzZWQgPSBmYWxzZTtcblxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHN0cmVhbS5vbignZW5kJywgZnVuY3Rpb24oKSB7XG4gICAgZGVidWcoJ3dyYXBwZWQgZW5kJyk7XG4gICAgaWYgKHN0YXRlLmRlY29kZXIgJiYgIXN0YXRlLmVuZGVkKSB7XG4gICAgICB2YXIgY2h1bmsgPSBzdGF0ZS5kZWNvZGVyLmVuZCgpO1xuICAgICAgaWYgKGNodW5rICYmIGNodW5rLmxlbmd0aClcbiAgICAgICAgc2VsZi5wdXNoKGNodW5rKTtcbiAgICB9XG5cbiAgICBzZWxmLnB1c2gobnVsbCk7XG4gIH0pO1xuXG4gIHN0cmVhbS5vbignZGF0YScsIGZ1bmN0aW9uKGNodW5rKSB7XG4gICAgZGVidWcoJ3dyYXBwZWQgZGF0YScpO1xuICAgIGlmIChzdGF0ZS5kZWNvZGVyKVxuICAgICAgY2h1bmsgPSBzdGF0ZS5kZWNvZGVyLndyaXRlKGNodW5rKTtcbiAgICBpZiAoIWNodW5rIHx8ICFzdGF0ZS5vYmplY3RNb2RlICYmICFjaHVuay5sZW5ndGgpXG4gICAgICByZXR1cm47XG5cbiAgICB2YXIgcmV0ID0gc2VsZi5wdXNoKGNodW5rKTtcbiAgICBpZiAoIXJldCkge1xuICAgICAgcGF1c2VkID0gdHJ1ZTtcbiAgICAgIHN0cmVhbS5wYXVzZSgpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gcHJveHkgYWxsIHRoZSBvdGhlciBtZXRob2RzLlxuICAvLyBpbXBvcnRhbnQgd2hlbiB3cmFwcGluZyBmaWx0ZXJzIGFuZCBkdXBsZXhlcy5cbiAgZm9yICh2YXIgaSBpbiBzdHJlYW0pIHtcbiAgICBpZiAodXRpbC5pc0Z1bmN0aW9uKHN0cmVhbVtpXSkgJiYgdXRpbC5pc1VuZGVmaW5lZCh0aGlzW2ldKSkge1xuICAgICAgdGhpc1tpXSA9IGZ1bmN0aW9uKG1ldGhvZCkgeyByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBzdHJlYW1bbWV0aG9kXS5hcHBseShzdHJlYW0sIGFyZ3VtZW50cyk7XG4gICAgICB9fShpKTtcbiAgICB9XG4gIH1cblxuICAvLyBwcm94eSBjZXJ0YWluIGltcG9ydGFudCBldmVudHMuXG4gIHZhciBldmVudHMgPSBbJ2Vycm9yJywgJ2Nsb3NlJywgJ2Rlc3Ryb3knLCAncGF1c2UnLCAncmVzdW1lJ107XG4gIGZvckVhY2goZXZlbnRzLCBmdW5jdGlvbihldikge1xuICAgIHN0cmVhbS5vbihldiwgc2VsZi5lbWl0LmJpbmQoc2VsZiwgZXYpKTtcbiAgfSk7XG5cbiAgLy8gd2hlbiB3ZSB0cnkgdG8gY29uc3VtZSBzb21lIG1vcmUgYnl0ZXMsIHNpbXBseSB1bnBhdXNlIHRoZVxuICAvLyB1bmRlcmx5aW5nIHN0cmVhbS5cbiAgc2VsZi5fcmVhZCA9IGZ1bmN0aW9uKG4pIHtcbiAgICBkZWJ1Zygnd3JhcHBlZCBfcmVhZCcsIG4pO1xuICAgIGlmIChwYXVzZWQpIHtcbiAgICAgIHBhdXNlZCA9IGZhbHNlO1xuICAgICAgc3RyZWFtLnJlc3VtZSgpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gc2VsZjtcbn07XG5cblxuXG4vLyBleHBvc2VkIGZvciB0ZXN0aW5nIHB1cnBvc2VzIG9ubHkuXG5SZWFkYWJsZS5fZnJvbUxpc3QgPSBmcm9tTGlzdDtcblxuLy8gUGx1Y2sgb2ZmIG4gYnl0ZXMgZnJvbSBhbiBhcnJheSBvZiBidWZmZXJzLlxuLy8gTGVuZ3RoIGlzIHRoZSBjb21iaW5lZCBsZW5ndGhzIG9mIGFsbCB0aGUgYnVmZmVycyBpbiB0aGUgbGlzdC5cbmZ1bmN0aW9uIGZyb21MaXN0KG4sIHN0YXRlKSB7XG4gIHZhciBsaXN0ID0gc3RhdGUuYnVmZmVyO1xuICB2YXIgbGVuZ3RoID0gc3RhdGUubGVuZ3RoO1xuICB2YXIgc3RyaW5nTW9kZSA9ICEhc3RhdGUuZGVjb2RlcjtcbiAgdmFyIG9iamVjdE1vZGUgPSAhIXN0YXRlLm9iamVjdE1vZGU7XG4gIHZhciByZXQ7XG5cbiAgLy8gbm90aGluZyBpbiB0aGUgbGlzdCwgZGVmaW5pdGVseSBlbXB0eS5cbiAgaWYgKGxpc3QubGVuZ3RoID09PSAwKVxuICAgIHJldHVybiBudWxsO1xuXG4gIGlmIChsZW5ndGggPT09IDApXG4gICAgcmV0ID0gbnVsbDtcbiAgZWxzZSBpZiAob2JqZWN0TW9kZSlcbiAgICByZXQgPSBsaXN0LnNoaWZ0KCk7XG4gIGVsc2UgaWYgKCFuIHx8IG4gPj0gbGVuZ3RoKSB7XG4gICAgLy8gcmVhZCBpdCBhbGwsIHRydW5jYXRlIHRoZSBhcnJheS5cbiAgICBpZiAoc3RyaW5nTW9kZSlcbiAgICAgIHJldCA9IGxpc3Quam9pbignJyk7XG4gICAgZWxzZVxuICAgICAgcmV0ID0gQnVmZmVyLmNvbmNhdChsaXN0LCBsZW5ndGgpO1xuICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgfSBlbHNlIHtcbiAgICAvLyByZWFkIGp1c3Qgc29tZSBvZiBpdC5cbiAgICBpZiAobiA8IGxpc3RbMF0ubGVuZ3RoKSB7XG4gICAgICAvLyBqdXN0IHRha2UgYSBwYXJ0IG9mIHRoZSBmaXJzdCBsaXN0IGl0ZW0uXG4gICAgICAvLyBzbGljZSBpcyB0aGUgc2FtZSBmb3IgYnVmZmVycyBhbmQgc3RyaW5ncy5cbiAgICAgIHZhciBidWYgPSBsaXN0WzBdO1xuICAgICAgcmV0ID0gYnVmLnNsaWNlKDAsIG4pO1xuICAgICAgbGlzdFswXSA9IGJ1Zi5zbGljZShuKTtcbiAgICB9IGVsc2UgaWYgKG4gPT09IGxpc3RbMF0ubGVuZ3RoKSB7XG4gICAgICAvLyBmaXJzdCBsaXN0IGlzIGEgcGVyZmVjdCBtYXRjaFxuICAgICAgcmV0ID0gbGlzdC5zaGlmdCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBjb21wbGV4IGNhc2UuXG4gICAgICAvLyB3ZSBoYXZlIGVub3VnaCB0byBjb3ZlciBpdCwgYnV0IGl0IHNwYW5zIHBhc3QgdGhlIGZpcnN0IGJ1ZmZlci5cbiAgICAgIGlmIChzdHJpbmdNb2RlKVxuICAgICAgICByZXQgPSAnJztcbiAgICAgIGVsc2VcbiAgICAgICAgcmV0ID0gbmV3IEJ1ZmZlcihuKTtcblxuICAgICAgdmFyIGMgPSAwO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBsaXN0Lmxlbmd0aDsgaSA8IGwgJiYgYyA8IG47IGkrKykge1xuICAgICAgICB2YXIgYnVmID0gbGlzdFswXTtcbiAgICAgICAgdmFyIGNweSA9IE1hdGgubWluKG4gLSBjLCBidWYubGVuZ3RoKTtcblxuICAgICAgICBpZiAoc3RyaW5nTW9kZSlcbiAgICAgICAgICByZXQgKz0gYnVmLnNsaWNlKDAsIGNweSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBidWYuY29weShyZXQsIGMsIDAsIGNweSk7XG5cbiAgICAgICAgaWYgKGNweSA8IGJ1Zi5sZW5ndGgpXG4gICAgICAgICAgbGlzdFswXSA9IGJ1Zi5zbGljZShjcHkpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgbGlzdC5zaGlmdCgpO1xuXG4gICAgICAgIGMgKz0gY3B5O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXQ7XG59XG5cbmZ1bmN0aW9uIGVuZFJlYWRhYmxlKHN0cmVhbSkge1xuICB2YXIgc3RhdGUgPSBzdHJlYW0uX3JlYWRhYmxlU3RhdGU7XG5cbiAgLy8gSWYgd2UgZ2V0IGhlcmUgYmVmb3JlIGNvbnN1bWluZyBhbGwgdGhlIGJ5dGVzLCB0aGVuIHRoYXQgaXMgYVxuICAvLyBidWcgaW4gbm9kZS4gIFNob3VsZCBuZXZlciBoYXBwZW4uXG4gIGlmIChzdGF0ZS5sZW5ndGggPiAwKVxuICAgIHRocm93IG5ldyBFcnJvcignZW5kUmVhZGFibGUgY2FsbGVkIG9uIG5vbi1lbXB0eSBzdHJlYW0nKTtcblxuICBpZiAoIXN0YXRlLmVuZEVtaXR0ZWQpIHtcbiAgICBzdGF0ZS5lbmRlZCA9IHRydWU7XG4gICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgIC8vIENoZWNrIHRoYXQgd2UgZGlkbid0IGdldCBvbmUgbGFzdCB1bnNoaWZ0LlxuICAgICAgaWYgKCFzdGF0ZS5lbmRFbWl0dGVkICYmIHN0YXRlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBzdGF0ZS5lbmRFbWl0dGVkID0gdHJ1ZTtcbiAgICAgICAgc3RyZWFtLnJlYWRhYmxlID0gZmFsc2U7XG4gICAgICAgIHN0cmVhbS5lbWl0KCdlbmQnKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmb3JFYWNoICh4cywgZikge1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHhzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGYoeHNbaV0sIGkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGluZGV4T2YgKHhzLCB4KSB7XG4gIGZvciAodmFyIGkgPSAwLCBsID0geHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKHhzW2ldID09PSB4KSByZXR1cm4gaTtcbiAgfVxuICByZXR1cm4gLTE7XG59XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuXG4vLyBhIHRyYW5zZm9ybSBzdHJlYW0gaXMgYSByZWFkYWJsZS93cml0YWJsZSBzdHJlYW0gd2hlcmUgeW91IGRvXG4vLyBzb21ldGhpbmcgd2l0aCB0aGUgZGF0YS4gIFNvbWV0aW1lcyBpdCdzIGNhbGxlZCBhIFwiZmlsdGVyXCIsXG4vLyBidXQgdGhhdCdzIG5vdCBhIGdyZWF0IG5hbWUgZm9yIGl0LCBzaW5jZSB0aGF0IGltcGxpZXMgYSB0aGluZyB3aGVyZVxuLy8gc29tZSBiaXRzIHBhc3MgdGhyb3VnaCwgYW5kIG90aGVycyBhcmUgc2ltcGx5IGlnbm9yZWQuICAoVGhhdCB3b3VsZFxuLy8gYmUgYSB2YWxpZCBleGFtcGxlIG9mIGEgdHJhbnNmb3JtLCBvZiBjb3Vyc2UuKVxuLy9cbi8vIFdoaWxlIHRoZSBvdXRwdXQgaXMgY2F1c2FsbHkgcmVsYXRlZCB0byB0aGUgaW5wdXQsIGl0J3Mgbm90IGFcbi8vIG5lY2Vzc2FyaWx5IHN5bW1ldHJpYyBvciBzeW5jaHJvbm91cyB0cmFuc2Zvcm1hdGlvbi4gIEZvciBleGFtcGxlLFxuLy8gYSB6bGliIHN0cmVhbSBtaWdodCB0YWtlIG11bHRpcGxlIHBsYWluLXRleHQgd3JpdGVzKCksIGFuZCB0aGVuXG4vLyBlbWl0IGEgc2luZ2xlIGNvbXByZXNzZWQgY2h1bmsgc29tZSB0aW1lIGluIHRoZSBmdXR1cmUuXG4vL1xuLy8gSGVyZSdzIGhvdyB0aGlzIHdvcmtzOlxuLy9cbi8vIFRoZSBUcmFuc2Zvcm0gc3RyZWFtIGhhcyBhbGwgdGhlIGFzcGVjdHMgb2YgdGhlIHJlYWRhYmxlIGFuZCB3cml0YWJsZVxuLy8gc3RyZWFtIGNsYXNzZXMuICBXaGVuIHlvdSB3cml0ZShjaHVuayksIHRoYXQgY2FsbHMgX3dyaXRlKGNodW5rLGNiKVxuLy8gaW50ZXJuYWxseSwgYW5kIHJldHVybnMgZmFsc2UgaWYgdGhlcmUncyBhIGxvdCBvZiBwZW5kaW5nIHdyaXRlc1xuLy8gYnVmZmVyZWQgdXAuICBXaGVuIHlvdSBjYWxsIHJlYWQoKSwgdGhhdCBjYWxscyBfcmVhZChuKSB1bnRpbFxuLy8gdGhlcmUncyBlbm91Z2ggcGVuZGluZyByZWFkYWJsZSBkYXRhIGJ1ZmZlcmVkIHVwLlxuLy9cbi8vIEluIGEgdHJhbnNmb3JtIHN0cmVhbSwgdGhlIHdyaXR0ZW4gZGF0YSBpcyBwbGFjZWQgaW4gYSBidWZmZXIuICBXaGVuXG4vLyBfcmVhZChuKSBpcyBjYWxsZWQsIGl0IHRyYW5zZm9ybXMgdGhlIHF1ZXVlZCB1cCBkYXRhLCBjYWxsaW5nIHRoZVxuLy8gYnVmZmVyZWQgX3dyaXRlIGNiJ3MgYXMgaXQgY29uc3VtZXMgY2h1bmtzLiAgSWYgY29uc3VtaW5nIGEgc2luZ2xlXG4vLyB3cml0dGVuIGNodW5rIHdvdWxkIHJlc3VsdCBpbiBtdWx0aXBsZSBvdXRwdXQgY2h1bmtzLCB0aGVuIHRoZSBmaXJzdFxuLy8gb3V0cHV0dGVkIGJpdCBjYWxscyB0aGUgcmVhZGNiLCBhbmQgc3Vic2VxdWVudCBjaHVua3MganVzdCBnbyBpbnRvXG4vLyB0aGUgcmVhZCBidWZmZXIsIGFuZCB3aWxsIGNhdXNlIGl0IHRvIGVtaXQgJ3JlYWRhYmxlJyBpZiBuZWNlc3NhcnkuXG4vL1xuLy8gVGhpcyB3YXksIGJhY2stcHJlc3N1cmUgaXMgYWN0dWFsbHkgZGV0ZXJtaW5lZCBieSB0aGUgcmVhZGluZyBzaWRlLFxuLy8gc2luY2UgX3JlYWQgaGFzIHRvIGJlIGNhbGxlZCB0byBzdGFydCBwcm9jZXNzaW5nIGEgbmV3IGNodW5rLiAgSG93ZXZlcixcbi8vIGEgcGF0aG9sb2dpY2FsIGluZmxhdGUgdHlwZSBvZiB0cmFuc2Zvcm0gY2FuIGNhdXNlIGV4Y2Vzc2l2ZSBidWZmZXJpbmdcbi8vIGhlcmUuICBGb3IgZXhhbXBsZSwgaW1hZ2luZSBhIHN0cmVhbSB3aGVyZSBldmVyeSBieXRlIG9mIGlucHV0IGlzXG4vLyBpbnRlcnByZXRlZCBhcyBhbiBpbnRlZ2VyIGZyb20gMC0yNTUsIGFuZCB0aGVuIHJlc3VsdHMgaW4gdGhhdCBtYW55XG4vLyBieXRlcyBvZiBvdXRwdXQuICBXcml0aW5nIHRoZSA0IGJ5dGVzIHtmZixmZixmZixmZn0gd291bGQgcmVzdWx0IGluXG4vLyAxa2Igb2YgZGF0YSBiZWluZyBvdXRwdXQuICBJbiB0aGlzIGNhc2UsIHlvdSBjb3VsZCB3cml0ZSBhIHZlcnkgc21hbGxcbi8vIGFtb3VudCBvZiBpbnB1dCwgYW5kIGVuZCB1cCB3aXRoIGEgdmVyeSBsYXJnZSBhbW91bnQgb2Ygb3V0cHV0LiAgSW5cbi8vIHN1Y2ggYSBwYXRob2xvZ2ljYWwgaW5mbGF0aW5nIG1lY2hhbmlzbSwgdGhlcmUnZCBiZSBubyB3YXkgdG8gdGVsbFxuLy8gdGhlIHN5c3RlbSB0byBzdG9wIGRvaW5nIHRoZSB0cmFuc2Zvcm0uICBBIHNpbmdsZSA0TUIgd3JpdGUgY291bGRcbi8vIGNhdXNlIHRoZSBzeXN0ZW0gdG8gcnVuIG91dCBvZiBtZW1vcnkuXG4vL1xuLy8gSG93ZXZlciwgZXZlbiBpbiBzdWNoIGEgcGF0aG9sb2dpY2FsIGNhc2UsIG9ubHkgYSBzaW5nbGUgd3JpdHRlbiBjaHVua1xuLy8gd291bGQgYmUgY29uc3VtZWQsIGFuZCB0aGVuIHRoZSByZXN0IHdvdWxkIHdhaXQgKHVuLXRyYW5zZm9ybWVkKSB1bnRpbFxuLy8gdGhlIHJlc3VsdHMgb2YgdGhlIHByZXZpb3VzIHRyYW5zZm9ybWVkIGNodW5rIHdlcmUgY29uc3VtZWQuXG5cbm1vZHVsZS5leHBvcnRzID0gVHJhbnNmb3JtO1xuXG52YXIgRHVwbGV4ID0gcmVxdWlyZSgnLi9fc3RyZWFtX2R1cGxleCcpO1xuXG4vKjxyZXBsYWNlbWVudD4qL1xudmFyIHV0aWwgPSByZXF1aXJlKCdjb3JlLXV0aWwtaXMnKTtcbnV0aWwuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuLyo8L3JlcGxhY2VtZW50PiovXG5cbnV0aWwuaW5oZXJpdHMoVHJhbnNmb3JtLCBEdXBsZXgpO1xuXG5cbmZ1bmN0aW9uIFRyYW5zZm9ybVN0YXRlKG9wdGlvbnMsIHN0cmVhbSkge1xuICB0aGlzLmFmdGVyVHJhbnNmb3JtID0gZnVuY3Rpb24oZXIsIGRhdGEpIHtcbiAgICByZXR1cm4gYWZ0ZXJUcmFuc2Zvcm0oc3RyZWFtLCBlciwgZGF0YSk7XG4gIH07XG5cbiAgdGhpcy5uZWVkVHJhbnNmb3JtID0gZmFsc2U7XG4gIHRoaXMudHJhbnNmb3JtaW5nID0gZmFsc2U7XG4gIHRoaXMud3JpdGVjYiA9IG51bGw7XG4gIHRoaXMud3JpdGVjaHVuayA9IG51bGw7XG59XG5cbmZ1bmN0aW9uIGFmdGVyVHJhbnNmb3JtKHN0cmVhbSwgZXIsIGRhdGEpIHtcbiAgdmFyIHRzID0gc3RyZWFtLl90cmFuc2Zvcm1TdGF0ZTtcbiAgdHMudHJhbnNmb3JtaW5nID0gZmFsc2U7XG5cbiAgdmFyIGNiID0gdHMud3JpdGVjYjtcblxuICBpZiAoIWNiKVxuICAgIHJldHVybiBzdHJlYW0uZW1pdCgnZXJyb3InLCBuZXcgRXJyb3IoJ25vIHdyaXRlY2IgaW4gVHJhbnNmb3JtIGNsYXNzJykpO1xuXG4gIHRzLndyaXRlY2h1bmsgPSBudWxsO1xuICB0cy53cml0ZWNiID0gbnVsbDtcblxuICBpZiAoIXV0aWwuaXNOdWxsT3JVbmRlZmluZWQoZGF0YSkpXG4gICAgc3RyZWFtLnB1c2goZGF0YSk7XG5cbiAgaWYgKGNiKVxuICAgIGNiKGVyKTtcblxuICB2YXIgcnMgPSBzdHJlYW0uX3JlYWRhYmxlU3RhdGU7XG4gIHJzLnJlYWRpbmcgPSBmYWxzZTtcbiAgaWYgKHJzLm5lZWRSZWFkYWJsZSB8fCBycy5sZW5ndGggPCBycy5oaWdoV2F0ZXJNYXJrKSB7XG4gICAgc3RyZWFtLl9yZWFkKHJzLmhpZ2hXYXRlck1hcmspO1xuICB9XG59XG5cblxuZnVuY3Rpb24gVHJhbnNmb3JtKG9wdGlvbnMpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFRyYW5zZm9ybSkpXG4gICAgcmV0dXJuIG5ldyBUcmFuc2Zvcm0ob3B0aW9ucyk7XG5cbiAgRHVwbGV4LmNhbGwodGhpcywgb3B0aW9ucyk7XG5cbiAgdGhpcy5fdHJhbnNmb3JtU3RhdGUgPSBuZXcgVHJhbnNmb3JtU3RhdGUob3B0aW9ucywgdGhpcyk7XG5cbiAgLy8gd2hlbiB0aGUgd3JpdGFibGUgc2lkZSBmaW5pc2hlcywgdGhlbiBmbHVzaCBvdXQgYW55dGhpbmcgcmVtYWluaW5nLlxuICB2YXIgc3RyZWFtID0gdGhpcztcblxuICAvLyBzdGFydCBvdXQgYXNraW5nIGZvciBhIHJlYWRhYmxlIGV2ZW50IG9uY2UgZGF0YSBpcyB0cmFuc2Zvcm1lZC5cbiAgdGhpcy5fcmVhZGFibGVTdGF0ZS5uZWVkUmVhZGFibGUgPSB0cnVlO1xuXG4gIC8vIHdlIGhhdmUgaW1wbGVtZW50ZWQgdGhlIF9yZWFkIG1ldGhvZCwgYW5kIGRvbmUgdGhlIG90aGVyIHRoaW5nc1xuICAvLyB0aGF0IFJlYWRhYmxlIHdhbnRzIGJlZm9yZSB0aGUgZmlyc3QgX3JlYWQgY2FsbCwgc28gdW5zZXQgdGhlXG4gIC8vIHN5bmMgZ3VhcmQgZmxhZy5cbiAgdGhpcy5fcmVhZGFibGVTdGF0ZS5zeW5jID0gZmFsc2U7XG5cbiAgdGhpcy5vbmNlKCdwcmVmaW5pc2gnLCBmdW5jdGlvbigpIHtcbiAgICBpZiAodXRpbC5pc0Z1bmN0aW9uKHRoaXMuX2ZsdXNoKSlcbiAgICAgIHRoaXMuX2ZsdXNoKGZ1bmN0aW9uKGVyKSB7XG4gICAgICAgIGRvbmUoc3RyZWFtLCBlcik7XG4gICAgICB9KTtcbiAgICBlbHNlXG4gICAgICBkb25lKHN0cmVhbSk7XG4gIH0pO1xufVxuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbihjaHVuaywgZW5jb2RpbmcpIHtcbiAgdGhpcy5fdHJhbnNmb3JtU3RhdGUubmVlZFRyYW5zZm9ybSA9IGZhbHNlO1xuICByZXR1cm4gRHVwbGV4LnByb3RvdHlwZS5wdXNoLmNhbGwodGhpcywgY2h1bmssIGVuY29kaW5nKTtcbn07XG5cbi8vIFRoaXMgaXMgdGhlIHBhcnQgd2hlcmUgeW91IGRvIHN0dWZmIVxuLy8gb3ZlcnJpZGUgdGhpcyBmdW5jdGlvbiBpbiBpbXBsZW1lbnRhdGlvbiBjbGFzc2VzLlxuLy8gJ2NodW5rJyBpcyBhbiBpbnB1dCBjaHVuay5cbi8vXG4vLyBDYWxsIGBwdXNoKG5ld0NodW5rKWAgdG8gcGFzcyBhbG9uZyB0cmFuc2Zvcm1lZCBvdXRwdXRcbi8vIHRvIHRoZSByZWFkYWJsZSBzaWRlLiAgWW91IG1heSBjYWxsICdwdXNoJyB6ZXJvIG9yIG1vcmUgdGltZXMuXG4vL1xuLy8gQ2FsbCBgY2IoZXJyKWAgd2hlbiB5b3UgYXJlIGRvbmUgd2l0aCB0aGlzIGNodW5rLiAgSWYgeW91IHBhc3Ncbi8vIGFuIGVycm9yLCB0aGVuIHRoYXQnbGwgcHV0IHRoZSBodXJ0IG9uIHRoZSB3aG9sZSBvcGVyYXRpb24uICBJZiB5b3Vcbi8vIG5ldmVyIGNhbGwgY2IoKSwgdGhlbiB5b3UnbGwgbmV2ZXIgZ2V0IGFub3RoZXIgY2h1bmsuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLl90cmFuc2Zvcm0gPSBmdW5jdGlvbihjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gIHRocm93IG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJyk7XG59O1xuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLl93cml0ZSA9IGZ1bmN0aW9uKGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgdmFyIHRzID0gdGhpcy5fdHJhbnNmb3JtU3RhdGU7XG4gIHRzLndyaXRlY2IgPSBjYjtcbiAgdHMud3JpdGVjaHVuayA9IGNodW5rO1xuICB0cy53cml0ZWVuY29kaW5nID0gZW5jb2Rpbmc7XG4gIGlmICghdHMudHJhbnNmb3JtaW5nKSB7XG4gICAgdmFyIHJzID0gdGhpcy5fcmVhZGFibGVTdGF0ZTtcbiAgICBpZiAodHMubmVlZFRyYW5zZm9ybSB8fFxuICAgICAgICBycy5uZWVkUmVhZGFibGUgfHxcbiAgICAgICAgcnMubGVuZ3RoIDwgcnMuaGlnaFdhdGVyTWFyaylcbiAgICAgIHRoaXMuX3JlYWQocnMuaGlnaFdhdGVyTWFyayk7XG4gIH1cbn07XG5cbi8vIERvZXNuJ3QgbWF0dGVyIHdoYXQgdGhlIGFyZ3MgYXJlIGhlcmUuXG4vLyBfdHJhbnNmb3JtIGRvZXMgYWxsIHRoZSB3b3JrLlxuLy8gVGhhdCB3ZSBnb3QgaGVyZSBtZWFucyB0aGF0IHRoZSByZWFkYWJsZSBzaWRlIHdhbnRzIG1vcmUgZGF0YS5cblRyYW5zZm9ybS5wcm90b3R5cGUuX3JlYWQgPSBmdW5jdGlvbihuKSB7XG4gIHZhciB0cyA9IHRoaXMuX3RyYW5zZm9ybVN0YXRlO1xuXG4gIGlmICghdXRpbC5pc051bGwodHMud3JpdGVjaHVuaykgJiYgdHMud3JpdGVjYiAmJiAhdHMudHJhbnNmb3JtaW5nKSB7XG4gICAgdHMudHJhbnNmb3JtaW5nID0gdHJ1ZTtcbiAgICB0aGlzLl90cmFuc2Zvcm0odHMud3JpdGVjaHVuaywgdHMud3JpdGVlbmNvZGluZywgdHMuYWZ0ZXJUcmFuc2Zvcm0pO1xuICB9IGVsc2Uge1xuICAgIC8vIG1hcmsgdGhhdCB3ZSBuZWVkIGEgdHJhbnNmb3JtLCBzbyB0aGF0IGFueSBkYXRhIHRoYXQgY29tZXMgaW5cbiAgICAvLyB3aWxsIGdldCBwcm9jZXNzZWQsIG5vdyB0aGF0IHdlJ3ZlIGFza2VkIGZvciBpdC5cbiAgICB0cy5uZWVkVHJhbnNmb3JtID0gdHJ1ZTtcbiAgfVxufTtcblxuXG5mdW5jdGlvbiBkb25lKHN0cmVhbSwgZXIpIHtcbiAgaWYgKGVyKVxuICAgIHJldHVybiBzdHJlYW0uZW1pdCgnZXJyb3InLCBlcik7XG5cbiAgLy8gaWYgdGhlcmUncyBub3RoaW5nIGluIHRoZSB3cml0ZSBidWZmZXIsIHRoZW4gdGhhdCBtZWFuc1xuICAvLyB0aGF0IG5vdGhpbmcgbW9yZSB3aWxsIGV2ZXIgYmUgcHJvdmlkZWRcbiAgdmFyIHdzID0gc3RyZWFtLl93cml0YWJsZVN0YXRlO1xuICB2YXIgdHMgPSBzdHJlYW0uX3RyYW5zZm9ybVN0YXRlO1xuXG4gIGlmICh3cy5sZW5ndGgpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdjYWxsaW5nIHRyYW5zZm9ybSBkb25lIHdoZW4gd3MubGVuZ3RoICE9IDAnKTtcblxuICBpZiAodHMudHJhbnNmb3JtaW5nKVxuICAgIHRocm93IG5ldyBFcnJvcignY2FsbGluZyB0cmFuc2Zvcm0gZG9uZSB3aGVuIHN0aWxsIHRyYW5zZm9ybWluZycpO1xuXG4gIHJldHVybiBzdHJlYW0ucHVzaChudWxsKTtcbn1cbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyBBIGJpdCBzaW1wbGVyIHRoYW4gcmVhZGFibGUgc3RyZWFtcy5cbi8vIEltcGxlbWVudCBhbiBhc3luYyAuX3dyaXRlKGNodW5rLCBjYiksIGFuZCBpdCdsbCBoYW5kbGUgYWxsXG4vLyB0aGUgZHJhaW4gZXZlbnQgZW1pc3Npb24gYW5kIGJ1ZmZlcmluZy5cblxubW9kdWxlLmV4cG9ydHMgPSBXcml0YWJsZTtcblxuLyo8cmVwbGFjZW1lbnQ+Ki9cbnZhciBCdWZmZXIgPSByZXF1aXJlKCdidWZmZXInKS5CdWZmZXI7XG4vKjwvcmVwbGFjZW1lbnQ+Ki9cblxuV3JpdGFibGUuV3JpdGFibGVTdGF0ZSA9IFdyaXRhYmxlU3RhdGU7XG5cblxuLyo8cmVwbGFjZW1lbnQ+Ki9cbnZhciB1dGlsID0gcmVxdWlyZSgnY29yZS11dGlsLWlzJyk7XG51dGlsLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcbi8qPC9yZXBsYWNlbWVudD4qL1xuXG52YXIgU3RyZWFtID0gcmVxdWlyZSgnc3RyZWFtJyk7XG5cbnV0aWwuaW5oZXJpdHMoV3JpdGFibGUsIFN0cmVhbSk7XG5cbmZ1bmN0aW9uIFdyaXRlUmVxKGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgdGhpcy5jaHVuayA9IGNodW5rO1xuICB0aGlzLmVuY29kaW5nID0gZW5jb2Rpbmc7XG4gIHRoaXMuY2FsbGJhY2sgPSBjYjtcbn1cblxuZnVuY3Rpb24gV3JpdGFibGVTdGF0ZShvcHRpb25zLCBzdHJlYW0pIHtcbiAgdmFyIER1cGxleCA9IHJlcXVpcmUoJy4vX3N0cmVhbV9kdXBsZXgnKTtcblxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAvLyB0aGUgcG9pbnQgYXQgd2hpY2ggd3JpdGUoKSBzdGFydHMgcmV0dXJuaW5nIGZhbHNlXG4gIC8vIE5vdGU6IDAgaXMgYSB2YWxpZCB2YWx1ZSwgbWVhbnMgdGhhdCB3ZSBhbHdheXMgcmV0dXJuIGZhbHNlIGlmXG4gIC8vIHRoZSBlbnRpcmUgYnVmZmVyIGlzIG5vdCBmbHVzaGVkIGltbWVkaWF0ZWx5IG9uIHdyaXRlKClcbiAgdmFyIGh3bSA9IG9wdGlvbnMuaGlnaFdhdGVyTWFyaztcbiAgdmFyIGRlZmF1bHRId20gPSBvcHRpb25zLm9iamVjdE1vZGUgPyAxNiA6IDE2ICogMTAyNDtcbiAgdGhpcy5oaWdoV2F0ZXJNYXJrID0gKGh3bSB8fCBod20gPT09IDApID8gaHdtIDogZGVmYXVsdEh3bTtcblxuICAvLyBvYmplY3Qgc3RyZWFtIGZsYWcgdG8gaW5kaWNhdGUgd2hldGhlciBvciBub3QgdGhpcyBzdHJlYW1cbiAgLy8gY29udGFpbnMgYnVmZmVycyBvciBvYmplY3RzLlxuICB0aGlzLm9iamVjdE1vZGUgPSAhIW9wdGlvbnMub2JqZWN0TW9kZTtcblxuICBpZiAoc3RyZWFtIGluc3RhbmNlb2YgRHVwbGV4KVxuICAgIHRoaXMub2JqZWN0TW9kZSA9IHRoaXMub2JqZWN0TW9kZSB8fCAhIW9wdGlvbnMud3JpdGFibGVPYmplY3RNb2RlO1xuXG4gIC8vIGNhc3QgdG8gaW50cy5cbiAgdGhpcy5oaWdoV2F0ZXJNYXJrID0gfn50aGlzLmhpZ2hXYXRlck1hcms7XG5cbiAgdGhpcy5uZWVkRHJhaW4gPSBmYWxzZTtcbiAgLy8gYXQgdGhlIHN0YXJ0IG9mIGNhbGxpbmcgZW5kKClcbiAgdGhpcy5lbmRpbmcgPSBmYWxzZTtcbiAgLy8gd2hlbiBlbmQoKSBoYXMgYmVlbiBjYWxsZWQsIGFuZCByZXR1cm5lZFxuICB0aGlzLmVuZGVkID0gZmFsc2U7XG4gIC8vIHdoZW4gJ2ZpbmlzaCcgaXMgZW1pdHRlZFxuICB0aGlzLmZpbmlzaGVkID0gZmFsc2U7XG5cbiAgLy8gc2hvdWxkIHdlIGRlY29kZSBzdHJpbmdzIGludG8gYnVmZmVycyBiZWZvcmUgcGFzc2luZyB0byBfd3JpdGU/XG4gIC8vIHRoaXMgaXMgaGVyZSBzbyB0aGF0IHNvbWUgbm9kZS1jb3JlIHN0cmVhbXMgY2FuIG9wdGltaXplIHN0cmluZ1xuICAvLyBoYW5kbGluZyBhdCBhIGxvd2VyIGxldmVsLlxuICB2YXIgbm9EZWNvZGUgPSBvcHRpb25zLmRlY29kZVN0cmluZ3MgPT09IGZhbHNlO1xuICB0aGlzLmRlY29kZVN0cmluZ3MgPSAhbm9EZWNvZGU7XG5cbiAgLy8gQ3J5cHRvIGlzIGtpbmQgb2Ygb2xkIGFuZCBjcnVzdHkuICBIaXN0b3JpY2FsbHksIGl0cyBkZWZhdWx0IHN0cmluZ1xuICAvLyBlbmNvZGluZyBpcyAnYmluYXJ5JyBzbyB3ZSBoYXZlIHRvIG1ha2UgdGhpcyBjb25maWd1cmFibGUuXG4gIC8vIEV2ZXJ5dGhpbmcgZWxzZSBpbiB0aGUgdW5pdmVyc2UgdXNlcyAndXRmOCcsIHRob3VnaC5cbiAgdGhpcy5kZWZhdWx0RW5jb2RpbmcgPSBvcHRpb25zLmRlZmF1bHRFbmNvZGluZyB8fCAndXRmOCc7XG5cbiAgLy8gbm90IGFuIGFjdHVhbCBidWZmZXIgd2Uga2VlcCB0cmFjayBvZiwgYnV0IGEgbWVhc3VyZW1lbnRcbiAgLy8gb2YgaG93IG11Y2ggd2UncmUgd2FpdGluZyB0byBnZXQgcHVzaGVkIHRvIHNvbWUgdW5kZXJseWluZ1xuICAvLyBzb2NrZXQgb3IgZmlsZS5cbiAgdGhpcy5sZW5ndGggPSAwO1xuXG4gIC8vIGEgZmxhZyB0byBzZWUgd2hlbiB3ZSdyZSBpbiB0aGUgbWlkZGxlIG9mIGEgd3JpdGUuXG4gIHRoaXMud3JpdGluZyA9IGZhbHNlO1xuXG4gIC8vIHdoZW4gdHJ1ZSBhbGwgd3JpdGVzIHdpbGwgYmUgYnVmZmVyZWQgdW50aWwgLnVuY29yaygpIGNhbGxcbiAgdGhpcy5jb3JrZWQgPSAwO1xuXG4gIC8vIGEgZmxhZyB0byBiZSBhYmxlIHRvIHRlbGwgaWYgdGhlIG9ud3JpdGUgY2IgaXMgY2FsbGVkIGltbWVkaWF0ZWx5LFxuICAvLyBvciBvbiBhIGxhdGVyIHRpY2suICBXZSBzZXQgdGhpcyB0byB0cnVlIGF0IGZpcnN0LCBiZWNhdXNlIGFueVxuICAvLyBhY3Rpb25zIHRoYXQgc2hvdWxkbid0IGhhcHBlbiB1bnRpbCBcImxhdGVyXCIgc2hvdWxkIGdlbmVyYWxseSBhbHNvXG4gIC8vIG5vdCBoYXBwZW4gYmVmb3JlIHRoZSBmaXJzdCB3cml0ZSBjYWxsLlxuICB0aGlzLnN5bmMgPSB0cnVlO1xuXG4gIC8vIGEgZmxhZyB0byBrbm93IGlmIHdlJ3JlIHByb2Nlc3NpbmcgcHJldmlvdXNseSBidWZmZXJlZCBpdGVtcywgd2hpY2hcbiAgLy8gbWF5IGNhbGwgdGhlIF93cml0ZSgpIGNhbGxiYWNrIGluIHRoZSBzYW1lIHRpY2ssIHNvIHRoYXQgd2UgZG9uJ3RcbiAgLy8gZW5kIHVwIGluIGFuIG92ZXJsYXBwZWQgb253cml0ZSBzaXR1YXRpb24uXG4gIHRoaXMuYnVmZmVyUHJvY2Vzc2luZyA9IGZhbHNlO1xuXG4gIC8vIHRoZSBjYWxsYmFjayB0aGF0J3MgcGFzc2VkIHRvIF93cml0ZShjaHVuayxjYilcbiAgdGhpcy5vbndyaXRlID0gZnVuY3Rpb24oZXIpIHtcbiAgICBvbndyaXRlKHN0cmVhbSwgZXIpO1xuICB9O1xuXG4gIC8vIHRoZSBjYWxsYmFjayB0aGF0IHRoZSB1c2VyIHN1cHBsaWVzIHRvIHdyaXRlKGNodW5rLGVuY29kaW5nLGNiKVxuICB0aGlzLndyaXRlY2IgPSBudWxsO1xuXG4gIC8vIHRoZSBhbW91bnQgdGhhdCBpcyBiZWluZyB3cml0dGVuIHdoZW4gX3dyaXRlIGlzIGNhbGxlZC5cbiAgdGhpcy53cml0ZWxlbiA9IDA7XG5cbiAgdGhpcy5idWZmZXIgPSBbXTtcblxuICAvLyBudW1iZXIgb2YgcGVuZGluZyB1c2VyLXN1cHBsaWVkIHdyaXRlIGNhbGxiYWNrc1xuICAvLyB0aGlzIG11c3QgYmUgMCBiZWZvcmUgJ2ZpbmlzaCcgY2FuIGJlIGVtaXR0ZWRcbiAgdGhpcy5wZW5kaW5nY2IgPSAwO1xuXG4gIC8vIGVtaXQgcHJlZmluaXNoIGlmIHRoZSBvbmx5IHRoaW5nIHdlJ3JlIHdhaXRpbmcgZm9yIGlzIF93cml0ZSBjYnNcbiAgLy8gVGhpcyBpcyByZWxldmFudCBmb3Igc3luY2hyb25vdXMgVHJhbnNmb3JtIHN0cmVhbXNcbiAgdGhpcy5wcmVmaW5pc2hlZCA9IGZhbHNlO1xuXG4gIC8vIFRydWUgaWYgdGhlIGVycm9yIHdhcyBhbHJlYWR5IGVtaXR0ZWQgYW5kIHNob3VsZCBub3QgYmUgdGhyb3duIGFnYWluXG4gIHRoaXMuZXJyb3JFbWl0dGVkID0gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIFdyaXRhYmxlKG9wdGlvbnMpIHtcbiAgdmFyIER1cGxleCA9IHJlcXVpcmUoJy4vX3N0cmVhbV9kdXBsZXgnKTtcblxuICAvLyBXcml0YWJsZSBjdG9yIGlzIGFwcGxpZWQgdG8gRHVwbGV4ZXMsIHRob3VnaCB0aGV5J3JlIG5vdFxuICAvLyBpbnN0YW5jZW9mIFdyaXRhYmxlLCB0aGV5J3JlIGluc3RhbmNlb2YgUmVhZGFibGUuXG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBXcml0YWJsZSkgJiYgISh0aGlzIGluc3RhbmNlb2YgRHVwbGV4KSlcbiAgICByZXR1cm4gbmV3IFdyaXRhYmxlKG9wdGlvbnMpO1xuXG4gIHRoaXMuX3dyaXRhYmxlU3RhdGUgPSBuZXcgV3JpdGFibGVTdGF0ZShvcHRpb25zLCB0aGlzKTtcblxuICAvLyBsZWdhY3kuXG4gIHRoaXMud3JpdGFibGUgPSB0cnVlO1xuXG4gIFN0cmVhbS5jYWxsKHRoaXMpO1xufVxuXG4vLyBPdGhlcndpc2UgcGVvcGxlIGNhbiBwaXBlIFdyaXRhYmxlIHN0cmVhbXMsIHdoaWNoIGlzIGp1c3Qgd3JvbmcuXG5Xcml0YWJsZS5wcm90b3R5cGUucGlwZSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmVtaXQoJ2Vycm9yJywgbmV3IEVycm9yKCdDYW5ub3QgcGlwZS4gTm90IHJlYWRhYmxlLicpKTtcbn07XG5cblxuZnVuY3Rpb24gd3JpdGVBZnRlckVuZChzdHJlYW0sIHN0YXRlLCBjYikge1xuICB2YXIgZXIgPSBuZXcgRXJyb3IoJ3dyaXRlIGFmdGVyIGVuZCcpO1xuICAvLyBUT0RPOiBkZWZlciBlcnJvciBldmVudHMgY29uc2lzdGVudGx5IGV2ZXJ5d2hlcmUsIG5vdCBqdXN0IHRoZSBjYlxuICBzdHJlYW0uZW1pdCgnZXJyb3InLCBlcik7XG4gIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgY2IoZXIpO1xuICB9KTtcbn1cblxuLy8gSWYgd2UgZ2V0IHNvbWV0aGluZyB0aGF0IGlzIG5vdCBhIGJ1ZmZlciwgc3RyaW5nLCBudWxsLCBvciB1bmRlZmluZWQsXG4vLyBhbmQgd2UncmUgbm90IGluIG9iamVjdE1vZGUsIHRoZW4gdGhhdCdzIGFuIGVycm9yLlxuLy8gT3RoZXJ3aXNlIHN0cmVhbSBjaHVua3MgYXJlIGFsbCBjb25zaWRlcmVkIHRvIGJlIG9mIGxlbmd0aD0xLCBhbmQgdGhlXG4vLyB3YXRlcm1hcmtzIGRldGVybWluZSBob3cgbWFueSBvYmplY3RzIHRvIGtlZXAgaW4gdGhlIGJ1ZmZlciwgcmF0aGVyIHRoYW5cbi8vIGhvdyBtYW55IGJ5dGVzIG9yIGNoYXJhY3RlcnMuXG5mdW5jdGlvbiB2YWxpZENodW5rKHN0cmVhbSwgc3RhdGUsIGNodW5rLCBjYikge1xuICB2YXIgdmFsaWQgPSB0cnVlO1xuICBpZiAoIXV0aWwuaXNCdWZmZXIoY2h1bmspICYmXG4gICAgICAhdXRpbC5pc1N0cmluZyhjaHVuaykgJiZcbiAgICAgICF1dGlsLmlzTnVsbE9yVW5kZWZpbmVkKGNodW5rKSAmJlxuICAgICAgIXN0YXRlLm9iamVjdE1vZGUpIHtcbiAgICB2YXIgZXIgPSBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIG5vbi1zdHJpbmcvYnVmZmVyIGNodW5rJyk7XG4gICAgc3RyZWFtLmVtaXQoJ2Vycm9yJywgZXIpO1xuICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICBjYihlcik7XG4gICAgfSk7XG4gICAgdmFsaWQgPSBmYWxzZTtcbiAgfVxuICByZXR1cm4gdmFsaWQ7XG59XG5cbldyaXRhYmxlLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uKGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fd3JpdGFibGVTdGF0ZTtcbiAgdmFyIHJldCA9IGZhbHNlO1xuXG4gIGlmICh1dGlsLmlzRnVuY3Rpb24oZW5jb2RpbmcpKSB7XG4gICAgY2IgPSBlbmNvZGluZztcbiAgICBlbmNvZGluZyA9IG51bGw7XG4gIH1cblxuICBpZiAodXRpbC5pc0J1ZmZlcihjaHVuaykpXG4gICAgZW5jb2RpbmcgPSAnYnVmZmVyJztcbiAgZWxzZSBpZiAoIWVuY29kaW5nKVxuICAgIGVuY29kaW5nID0gc3RhdGUuZGVmYXVsdEVuY29kaW5nO1xuXG4gIGlmICghdXRpbC5pc0Z1bmN0aW9uKGNiKSlcbiAgICBjYiA9IGZ1bmN0aW9uKCkge307XG5cbiAgaWYgKHN0YXRlLmVuZGVkKVxuICAgIHdyaXRlQWZ0ZXJFbmQodGhpcywgc3RhdGUsIGNiKTtcbiAgZWxzZSBpZiAodmFsaWRDaHVuayh0aGlzLCBzdGF0ZSwgY2h1bmssIGNiKSkge1xuICAgIHN0YXRlLnBlbmRpbmdjYisrO1xuICAgIHJldCA9IHdyaXRlT3JCdWZmZXIodGhpcywgc3RhdGUsIGNodW5rLCBlbmNvZGluZywgY2IpO1xuICB9XG5cbiAgcmV0dXJuIHJldDtcbn07XG5cbldyaXRhYmxlLnByb3RvdHlwZS5jb3JrID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX3dyaXRhYmxlU3RhdGU7XG5cbiAgc3RhdGUuY29ya2VkKys7XG59O1xuXG5Xcml0YWJsZS5wcm90b3R5cGUudW5jb3JrID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX3dyaXRhYmxlU3RhdGU7XG5cbiAgaWYgKHN0YXRlLmNvcmtlZCkge1xuICAgIHN0YXRlLmNvcmtlZC0tO1xuXG4gICAgaWYgKCFzdGF0ZS53cml0aW5nICYmXG4gICAgICAgICFzdGF0ZS5jb3JrZWQgJiZcbiAgICAgICAgIXN0YXRlLmZpbmlzaGVkICYmXG4gICAgICAgICFzdGF0ZS5idWZmZXJQcm9jZXNzaW5nICYmXG4gICAgICAgIHN0YXRlLmJ1ZmZlci5sZW5ndGgpXG4gICAgICBjbGVhckJ1ZmZlcih0aGlzLCBzdGF0ZSk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGRlY29kZUNodW5rKHN0YXRlLCBjaHVuaywgZW5jb2RpbmcpIHtcbiAgaWYgKCFzdGF0ZS5vYmplY3RNb2RlICYmXG4gICAgICBzdGF0ZS5kZWNvZGVTdHJpbmdzICE9PSBmYWxzZSAmJlxuICAgICAgdXRpbC5pc1N0cmluZyhjaHVuaykpIHtcbiAgICBjaHVuayA9IG5ldyBCdWZmZXIoY2h1bmssIGVuY29kaW5nKTtcbiAgfVxuICByZXR1cm4gY2h1bms7XG59XG5cbi8vIGlmIHdlJ3JlIGFscmVhZHkgd3JpdGluZyBzb21ldGhpbmcsIHRoZW4ganVzdCBwdXQgdGhpc1xuLy8gaW4gdGhlIHF1ZXVlLCBhbmQgd2FpdCBvdXIgdHVybi4gIE90aGVyd2lzZSwgY2FsbCBfd3JpdGVcbi8vIElmIHdlIHJldHVybiBmYWxzZSwgdGhlbiB3ZSBuZWVkIGEgZHJhaW4gZXZlbnQsIHNvIHNldCB0aGF0IGZsYWcuXG5mdW5jdGlvbiB3cml0ZU9yQnVmZmVyKHN0cmVhbSwgc3RhdGUsIGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgY2h1bmsgPSBkZWNvZGVDaHVuayhzdGF0ZSwgY2h1bmssIGVuY29kaW5nKTtcbiAgaWYgKHV0aWwuaXNCdWZmZXIoY2h1bmspKVxuICAgIGVuY29kaW5nID0gJ2J1ZmZlcic7XG4gIHZhciBsZW4gPSBzdGF0ZS5vYmplY3RNb2RlID8gMSA6IGNodW5rLmxlbmd0aDtcblxuICBzdGF0ZS5sZW5ndGggKz0gbGVuO1xuXG4gIHZhciByZXQgPSBzdGF0ZS5sZW5ndGggPCBzdGF0ZS5oaWdoV2F0ZXJNYXJrO1xuICAvLyB3ZSBtdXN0IGVuc3VyZSB0aGF0IHByZXZpb3VzIG5lZWREcmFpbiB3aWxsIG5vdCBiZSByZXNldCB0byBmYWxzZS5cbiAgaWYgKCFyZXQpXG4gICAgc3RhdGUubmVlZERyYWluID0gdHJ1ZTtcblxuICBpZiAoc3RhdGUud3JpdGluZyB8fCBzdGF0ZS5jb3JrZWQpXG4gICAgc3RhdGUuYnVmZmVyLnB1c2gobmV3IFdyaXRlUmVxKGNodW5rLCBlbmNvZGluZywgY2IpKTtcbiAgZWxzZVxuICAgIGRvV3JpdGUoc3RyZWFtLCBzdGF0ZSwgZmFsc2UsIGxlbiwgY2h1bmssIGVuY29kaW5nLCBjYik7XG5cbiAgcmV0dXJuIHJldDtcbn1cblxuZnVuY3Rpb24gZG9Xcml0ZShzdHJlYW0sIHN0YXRlLCB3cml0ZXYsIGxlbiwgY2h1bmssIGVuY29kaW5nLCBjYikge1xuICBzdGF0ZS53cml0ZWxlbiA9IGxlbjtcbiAgc3RhdGUud3JpdGVjYiA9IGNiO1xuICBzdGF0ZS53cml0aW5nID0gdHJ1ZTtcbiAgc3RhdGUuc3luYyA9IHRydWU7XG4gIGlmICh3cml0ZXYpXG4gICAgc3RyZWFtLl93cml0ZXYoY2h1bmssIHN0YXRlLm9ud3JpdGUpO1xuICBlbHNlXG4gICAgc3RyZWFtLl93cml0ZShjaHVuaywgZW5jb2RpbmcsIHN0YXRlLm9ud3JpdGUpO1xuICBzdGF0ZS5zeW5jID0gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIG9ud3JpdGVFcnJvcihzdHJlYW0sIHN0YXRlLCBzeW5jLCBlciwgY2IpIHtcbiAgaWYgKHN5bmMpXG4gICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgIHN0YXRlLnBlbmRpbmdjYi0tO1xuICAgICAgY2IoZXIpO1xuICAgIH0pO1xuICBlbHNlIHtcbiAgICBzdGF0ZS5wZW5kaW5nY2ItLTtcbiAgICBjYihlcik7XG4gIH1cblxuICBzdHJlYW0uX3dyaXRhYmxlU3RhdGUuZXJyb3JFbWl0dGVkID0gdHJ1ZTtcbiAgc3RyZWFtLmVtaXQoJ2Vycm9yJywgZXIpO1xufVxuXG5mdW5jdGlvbiBvbndyaXRlU3RhdGVVcGRhdGUoc3RhdGUpIHtcbiAgc3RhdGUud3JpdGluZyA9IGZhbHNlO1xuICBzdGF0ZS53cml0ZWNiID0gbnVsbDtcbiAgc3RhdGUubGVuZ3RoIC09IHN0YXRlLndyaXRlbGVuO1xuICBzdGF0ZS53cml0ZWxlbiA9IDA7XG59XG5cbmZ1bmN0aW9uIG9ud3JpdGUoc3RyZWFtLCBlcikge1xuICB2YXIgc3RhdGUgPSBzdHJlYW0uX3dyaXRhYmxlU3RhdGU7XG4gIHZhciBzeW5jID0gc3RhdGUuc3luYztcbiAgdmFyIGNiID0gc3RhdGUud3JpdGVjYjtcblxuICBvbndyaXRlU3RhdGVVcGRhdGUoc3RhdGUpO1xuXG4gIGlmIChlcilcbiAgICBvbndyaXRlRXJyb3Ioc3RyZWFtLCBzdGF0ZSwgc3luYywgZXIsIGNiKTtcbiAgZWxzZSB7XG4gICAgLy8gQ2hlY2sgaWYgd2UncmUgYWN0dWFsbHkgcmVhZHkgdG8gZmluaXNoLCBidXQgZG9uJ3QgZW1pdCB5ZXRcbiAgICB2YXIgZmluaXNoZWQgPSBuZWVkRmluaXNoKHN0cmVhbSwgc3RhdGUpO1xuXG4gICAgaWYgKCFmaW5pc2hlZCAmJlxuICAgICAgICAhc3RhdGUuY29ya2VkICYmXG4gICAgICAgICFzdGF0ZS5idWZmZXJQcm9jZXNzaW5nICYmXG4gICAgICAgIHN0YXRlLmJ1ZmZlci5sZW5ndGgpIHtcbiAgICAgIGNsZWFyQnVmZmVyKHN0cmVhbSwgc3RhdGUpO1xuICAgIH1cblxuICAgIGlmIChzeW5jKSB7XG4gICAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgICBhZnRlcldyaXRlKHN0cmVhbSwgc3RhdGUsIGZpbmlzaGVkLCBjYik7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgYWZ0ZXJXcml0ZShzdHJlYW0sIHN0YXRlLCBmaW5pc2hlZCwgY2IpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBhZnRlcldyaXRlKHN0cmVhbSwgc3RhdGUsIGZpbmlzaGVkLCBjYikge1xuICBpZiAoIWZpbmlzaGVkKVxuICAgIG9ud3JpdGVEcmFpbihzdHJlYW0sIHN0YXRlKTtcbiAgc3RhdGUucGVuZGluZ2NiLS07XG4gIGNiKCk7XG4gIGZpbmlzaE1heWJlKHN0cmVhbSwgc3RhdGUpO1xufVxuXG4vLyBNdXN0IGZvcmNlIGNhbGxiYWNrIHRvIGJlIGNhbGxlZCBvbiBuZXh0VGljaywgc28gdGhhdCB3ZSBkb24ndFxuLy8gZW1pdCAnZHJhaW4nIGJlZm9yZSB0aGUgd3JpdGUoKSBjb25zdW1lciBnZXRzIHRoZSAnZmFsc2UnIHJldHVyblxuLy8gdmFsdWUsIGFuZCBoYXMgYSBjaGFuY2UgdG8gYXR0YWNoIGEgJ2RyYWluJyBsaXN0ZW5lci5cbmZ1bmN0aW9uIG9ud3JpdGVEcmFpbihzdHJlYW0sIHN0YXRlKSB7XG4gIGlmIChzdGF0ZS5sZW5ndGggPT09IDAgJiYgc3RhdGUubmVlZERyYWluKSB7XG4gICAgc3RhdGUubmVlZERyYWluID0gZmFsc2U7XG4gICAgc3RyZWFtLmVtaXQoJ2RyYWluJyk7XG4gIH1cbn1cblxuXG4vLyBpZiB0aGVyZSdzIHNvbWV0aGluZyBpbiB0aGUgYnVmZmVyIHdhaXRpbmcsIHRoZW4gcHJvY2VzcyBpdFxuZnVuY3Rpb24gY2xlYXJCdWZmZXIoc3RyZWFtLCBzdGF0ZSkge1xuICBzdGF0ZS5idWZmZXJQcm9jZXNzaW5nID0gdHJ1ZTtcblxuICBpZiAoc3RyZWFtLl93cml0ZXYgJiYgc3RhdGUuYnVmZmVyLmxlbmd0aCA+IDEpIHtcbiAgICAvLyBGYXN0IGNhc2UsIHdyaXRlIGV2ZXJ5dGhpbmcgdXNpbmcgX3dyaXRldigpXG4gICAgdmFyIGNicyA9IFtdO1xuICAgIGZvciAodmFyIGMgPSAwOyBjIDwgc3RhdGUuYnVmZmVyLmxlbmd0aDsgYysrKVxuICAgICAgY2JzLnB1c2goc3RhdGUuYnVmZmVyW2NdLmNhbGxiYWNrKTtcblxuICAgIC8vIGNvdW50IHRoZSBvbmUgd2UgYXJlIGFkZGluZywgYXMgd2VsbC5cbiAgICAvLyBUT0RPKGlzYWFjcykgY2xlYW4gdGhpcyB1cFxuICAgIHN0YXRlLnBlbmRpbmdjYisrO1xuICAgIGRvV3JpdGUoc3RyZWFtLCBzdGF0ZSwgdHJ1ZSwgc3RhdGUubGVuZ3RoLCBzdGF0ZS5idWZmZXIsICcnLCBmdW5jdGlvbihlcnIpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2JzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHN0YXRlLnBlbmRpbmdjYi0tO1xuICAgICAgICBjYnNbaV0oZXJyKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIENsZWFyIGJ1ZmZlclxuICAgIHN0YXRlLmJ1ZmZlciA9IFtdO1xuICB9IGVsc2Uge1xuICAgIC8vIFNsb3cgY2FzZSwgd3JpdGUgY2h1bmtzIG9uZS1ieS1vbmVcbiAgICBmb3IgKHZhciBjID0gMDsgYyA8IHN0YXRlLmJ1ZmZlci5sZW5ndGg7IGMrKykge1xuICAgICAgdmFyIGVudHJ5ID0gc3RhdGUuYnVmZmVyW2NdO1xuICAgICAgdmFyIGNodW5rID0gZW50cnkuY2h1bms7XG4gICAgICB2YXIgZW5jb2RpbmcgPSBlbnRyeS5lbmNvZGluZztcbiAgICAgIHZhciBjYiA9IGVudHJ5LmNhbGxiYWNrO1xuICAgICAgdmFyIGxlbiA9IHN0YXRlLm9iamVjdE1vZGUgPyAxIDogY2h1bmsubGVuZ3RoO1xuXG4gICAgICBkb1dyaXRlKHN0cmVhbSwgc3RhdGUsIGZhbHNlLCBsZW4sIGNodW5rLCBlbmNvZGluZywgY2IpO1xuXG4gICAgICAvLyBpZiB3ZSBkaWRuJ3QgY2FsbCB0aGUgb253cml0ZSBpbW1lZGlhdGVseSwgdGhlblxuICAgICAgLy8gaXQgbWVhbnMgdGhhdCB3ZSBuZWVkIHRvIHdhaXQgdW50aWwgaXQgZG9lcy5cbiAgICAgIC8vIGFsc28sIHRoYXQgbWVhbnMgdGhhdCB0aGUgY2h1bmsgYW5kIGNiIGFyZSBjdXJyZW50bHlcbiAgICAgIC8vIGJlaW5nIHByb2Nlc3NlZCwgc28gbW92ZSB0aGUgYnVmZmVyIGNvdW50ZXIgcGFzdCB0aGVtLlxuICAgICAgaWYgKHN0YXRlLndyaXRpbmcpIHtcbiAgICAgICAgYysrO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoYyA8IHN0YXRlLmJ1ZmZlci5sZW5ndGgpXG4gICAgICBzdGF0ZS5idWZmZXIgPSBzdGF0ZS5idWZmZXIuc2xpY2UoYyk7XG4gICAgZWxzZVxuICAgICAgc3RhdGUuYnVmZmVyLmxlbmd0aCA9IDA7XG4gIH1cblxuICBzdGF0ZS5idWZmZXJQcm9jZXNzaW5nID0gZmFsc2U7XG59XG5cbldyaXRhYmxlLnByb3RvdHlwZS5fd3JpdGUgPSBmdW5jdGlvbihjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gIGNiKG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkJykpO1xuXG59O1xuXG5Xcml0YWJsZS5wcm90b3R5cGUuX3dyaXRldiA9IG51bGw7XG5cbldyaXRhYmxlLnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbihjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX3dyaXRhYmxlU3RhdGU7XG5cbiAgaWYgKHV0aWwuaXNGdW5jdGlvbihjaHVuaykpIHtcbiAgICBjYiA9IGNodW5rO1xuICAgIGNodW5rID0gbnVsbDtcbiAgICBlbmNvZGluZyA9IG51bGw7XG4gIH0gZWxzZSBpZiAodXRpbC5pc0Z1bmN0aW9uKGVuY29kaW5nKSkge1xuICAgIGNiID0gZW5jb2Rpbmc7XG4gICAgZW5jb2RpbmcgPSBudWxsO1xuICB9XG5cbiAgaWYgKCF1dGlsLmlzTnVsbE9yVW5kZWZpbmVkKGNodW5rKSlcbiAgICB0aGlzLndyaXRlKGNodW5rLCBlbmNvZGluZyk7XG5cbiAgLy8gLmVuZCgpIGZ1bGx5IHVuY29ya3NcbiAgaWYgKHN0YXRlLmNvcmtlZCkge1xuICAgIHN0YXRlLmNvcmtlZCA9IDE7XG4gICAgdGhpcy51bmNvcmsoKTtcbiAgfVxuXG4gIC8vIGlnbm9yZSB1bm5lY2Vzc2FyeSBlbmQoKSBjYWxscy5cbiAgaWYgKCFzdGF0ZS5lbmRpbmcgJiYgIXN0YXRlLmZpbmlzaGVkKVxuICAgIGVuZFdyaXRhYmxlKHRoaXMsIHN0YXRlLCBjYik7XG59O1xuXG5cbmZ1bmN0aW9uIG5lZWRGaW5pc2goc3RyZWFtLCBzdGF0ZSkge1xuICByZXR1cm4gKHN0YXRlLmVuZGluZyAmJlxuICAgICAgICAgIHN0YXRlLmxlbmd0aCA9PT0gMCAmJlxuICAgICAgICAgICFzdGF0ZS5maW5pc2hlZCAmJlxuICAgICAgICAgICFzdGF0ZS53cml0aW5nKTtcbn1cblxuZnVuY3Rpb24gcHJlZmluaXNoKHN0cmVhbSwgc3RhdGUpIHtcbiAgaWYgKCFzdGF0ZS5wcmVmaW5pc2hlZCkge1xuICAgIHN0YXRlLnByZWZpbmlzaGVkID0gdHJ1ZTtcbiAgICBzdHJlYW0uZW1pdCgncHJlZmluaXNoJyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZmluaXNoTWF5YmUoc3RyZWFtLCBzdGF0ZSkge1xuICB2YXIgbmVlZCA9IG5lZWRGaW5pc2goc3RyZWFtLCBzdGF0ZSk7XG4gIGlmIChuZWVkKSB7XG4gICAgaWYgKHN0YXRlLnBlbmRpbmdjYiA9PT0gMCkge1xuICAgICAgcHJlZmluaXNoKHN0cmVhbSwgc3RhdGUpO1xuICAgICAgc3RhdGUuZmluaXNoZWQgPSB0cnVlO1xuICAgICAgc3RyZWFtLmVtaXQoJ2ZpbmlzaCcpO1xuICAgIH0gZWxzZVxuICAgICAgcHJlZmluaXNoKHN0cmVhbSwgc3RhdGUpO1xuICB9XG4gIHJldHVybiBuZWVkO1xufVxuXG5mdW5jdGlvbiBlbmRXcml0YWJsZShzdHJlYW0sIHN0YXRlLCBjYikge1xuICBzdGF0ZS5lbmRpbmcgPSB0cnVlO1xuICBmaW5pc2hNYXliZShzdHJlYW0sIHN0YXRlKTtcbiAgaWYgKGNiKSB7XG4gICAgaWYgKHN0YXRlLmZpbmlzaGVkKVxuICAgICAgcHJvY2Vzcy5uZXh0VGljayhjYik7XG4gICAgZWxzZVxuICAgICAgc3RyZWFtLm9uY2UoJ2ZpbmlzaCcsIGNiKTtcbiAgfVxuICBzdGF0ZS5lbmRlZCA9IHRydWU7XG59XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuLy8gTk9URTogVGhlc2UgdHlwZSBjaGVja2luZyBmdW5jdGlvbnMgaW50ZW50aW9uYWxseSBkb24ndCB1c2UgYGluc3RhbmNlb2ZgXG4vLyBiZWNhdXNlIGl0IGlzIGZyYWdpbGUgYW5kIGNhbiBiZSBlYXNpbHkgZmFrZWQgd2l0aCBgT2JqZWN0LmNyZWF0ZSgpYC5cbmZ1bmN0aW9uIGlzQXJyYXkoYXIpIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkoYXIpO1xufVxuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gaXNCb29sZWFuKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nO1xufVxuZXhwb3J0cy5pc0Jvb2xlYW4gPSBpc0Jvb2xlYW47XG5cbmZ1bmN0aW9uIGlzTnVsbChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsID0gaXNOdWxsO1xuXG5mdW5jdGlvbiBpc051bGxPclVuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGxPclVuZGVmaW5lZCA9IGlzTnVsbE9yVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyO1xuXG5mdW5jdGlvbiBpc1N0cmluZyhhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnO1xufVxuZXhwb3J0cy5pc1N0cmluZyA9IGlzU3RyaW5nO1xuXG5mdW5jdGlvbiBpc1N5bWJvbChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnO1xufVxuZXhwb3J0cy5pc1N5bWJvbCA9IGlzU3ltYm9sO1xuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuZXhwb3J0cy5pc1VuZGVmaW5lZCA9IGlzVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc1JlZ0V4cChyZSkge1xuICByZXR1cm4gaXNPYmplY3QocmUpICYmIG9iamVjdFRvU3RyaW5nKHJlKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59XG5leHBvcnRzLmlzUmVnRXhwID0gaXNSZWdFeHA7XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuZXhwb3J0cy5pc09iamVjdCA9IGlzT2JqZWN0O1xuXG5mdW5jdGlvbiBpc0RhdGUoZCkge1xuICByZXR1cm4gaXNPYmplY3QoZCkgJiYgb2JqZWN0VG9TdHJpbmcoZCkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cbmV4cG9ydHMuaXNEYXRlID0gaXNEYXRlO1xuXG5mdW5jdGlvbiBpc0Vycm9yKGUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGUpICYmXG4gICAgICAob2JqZWN0VG9TdHJpbmcoZSkgPT09ICdbb2JqZWN0IEVycm9yXScgfHwgZSBpbnN0YW5jZW9mIEVycm9yKTtcbn1cbmV4cG9ydHMuaXNFcnJvciA9IGlzRXJyb3I7XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcblxuZnVuY3Rpb24gaXNQcmltaXRpdmUoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGwgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ251bWJlcicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3ltYm9sJyB8fCAgLy8gRVM2IHN5bWJvbFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3VuZGVmaW5lZCc7XG59XG5leHBvcnRzLmlzUHJpbWl0aXZlID0gaXNQcmltaXRpdmU7XG5cbmZ1bmN0aW9uIGlzQnVmZmVyKGFyZykge1xuICByZXR1cm4gQnVmZmVyLmlzQnVmZmVyKGFyZyk7XG59XG5leHBvcnRzLmlzQnVmZmVyID0gaXNCdWZmZXI7XG5cbmZ1bmN0aW9uIG9iamVjdFRvU3RyaW5nKG8pIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKTtcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL2xpYi9fc3RyZWFtX3Bhc3N0aHJvdWdoLmpzXCIpXG4iLCJleHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2xpYi9fc3RyZWFtX3JlYWRhYmxlLmpzJyk7XG5leHBvcnRzLlN0cmVhbSA9IHJlcXVpcmUoJ3N0cmVhbScpO1xuZXhwb3J0cy5SZWFkYWJsZSA9IGV4cG9ydHM7XG5leHBvcnRzLldyaXRhYmxlID0gcmVxdWlyZSgnLi9saWIvX3N0cmVhbV93cml0YWJsZS5qcycpO1xuZXhwb3J0cy5EdXBsZXggPSByZXF1aXJlKCcuL2xpYi9fc3RyZWFtX2R1cGxleC5qcycpO1xuZXhwb3J0cy5UcmFuc2Zvcm0gPSByZXF1aXJlKCcuL2xpYi9fc3RyZWFtX3RyYW5zZm9ybS5qcycpO1xuZXhwb3J0cy5QYXNzVGhyb3VnaCA9IHJlcXVpcmUoJy4vbGliL19zdHJlYW1fcGFzc3Rocm91Z2guanMnKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vbGliL19zdHJlYW1fdHJhbnNmb3JtLmpzXCIpXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL2xpYi9fc3RyZWFtX3dyaXRhYmxlLmpzXCIpXG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxubW9kdWxlLmV4cG9ydHMgPSBTdHJlYW07XG5cbnZhciBFRSA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cbmluaGVyaXRzKFN0cmVhbSwgRUUpO1xuU3RyZWFtLlJlYWRhYmxlID0gcmVxdWlyZSgncmVhZGFibGUtc3RyZWFtL3JlYWRhYmxlLmpzJyk7XG5TdHJlYW0uV3JpdGFibGUgPSByZXF1aXJlKCdyZWFkYWJsZS1zdHJlYW0vd3JpdGFibGUuanMnKTtcblN0cmVhbS5EdXBsZXggPSByZXF1aXJlKCdyZWFkYWJsZS1zdHJlYW0vZHVwbGV4LmpzJyk7XG5TdHJlYW0uVHJhbnNmb3JtID0gcmVxdWlyZSgncmVhZGFibGUtc3RyZWFtL3RyYW5zZm9ybS5qcycpO1xuU3RyZWFtLlBhc3NUaHJvdWdoID0gcmVxdWlyZSgncmVhZGFibGUtc3RyZWFtL3Bhc3N0aHJvdWdoLmpzJyk7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuNC54XG5TdHJlYW0uU3RyZWFtID0gU3RyZWFtO1xuXG5cblxuLy8gb2xkLXN0eWxlIHN0cmVhbXMuICBOb3RlIHRoYXQgdGhlIHBpcGUgbWV0aG9kICh0aGUgb25seSByZWxldmFudFxuLy8gcGFydCBvZiB0aGlzIGNsYXNzKSBpcyBvdmVycmlkZGVuIGluIHRoZSBSZWFkYWJsZSBjbGFzcy5cblxuZnVuY3Rpb24gU3RyZWFtKCkge1xuICBFRS5jYWxsKHRoaXMpO1xufVxuXG5TdHJlYW0ucHJvdG90eXBlLnBpcGUgPSBmdW5jdGlvbihkZXN0LCBvcHRpb25zKSB7XG4gIHZhciBzb3VyY2UgPSB0aGlzO1xuXG4gIGZ1bmN0aW9uIG9uZGF0YShjaHVuaykge1xuICAgIGlmIChkZXN0LndyaXRhYmxlKSB7XG4gICAgICBpZiAoZmFsc2UgPT09IGRlc3Qud3JpdGUoY2h1bmspICYmIHNvdXJjZS5wYXVzZSkge1xuICAgICAgICBzb3VyY2UucGF1c2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBzb3VyY2Uub24oJ2RhdGEnLCBvbmRhdGEpO1xuXG4gIGZ1bmN0aW9uIG9uZHJhaW4oKSB7XG4gICAgaWYgKHNvdXJjZS5yZWFkYWJsZSAmJiBzb3VyY2UucmVzdW1lKSB7XG4gICAgICBzb3VyY2UucmVzdW1lKCk7XG4gICAgfVxuICB9XG5cbiAgZGVzdC5vbignZHJhaW4nLCBvbmRyYWluKTtcblxuICAvLyBJZiB0aGUgJ2VuZCcgb3B0aW9uIGlzIG5vdCBzdXBwbGllZCwgZGVzdC5lbmQoKSB3aWxsIGJlIGNhbGxlZCB3aGVuXG4gIC8vIHNvdXJjZSBnZXRzIHRoZSAnZW5kJyBvciAnY2xvc2UnIGV2ZW50cy4gIE9ubHkgZGVzdC5lbmQoKSBvbmNlLlxuICBpZiAoIWRlc3QuX2lzU3RkaW8gJiYgKCFvcHRpb25zIHx8IG9wdGlvbnMuZW5kICE9PSBmYWxzZSkpIHtcbiAgICBzb3VyY2Uub24oJ2VuZCcsIG9uZW5kKTtcbiAgICBzb3VyY2Uub24oJ2Nsb3NlJywgb25jbG9zZSk7XG4gIH1cblxuICB2YXIgZGlkT25FbmQgPSBmYWxzZTtcbiAgZnVuY3Rpb24gb25lbmQoKSB7XG4gICAgaWYgKGRpZE9uRW5kKSByZXR1cm47XG4gICAgZGlkT25FbmQgPSB0cnVlO1xuXG4gICAgZGVzdC5lbmQoKTtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gb25jbG9zZSgpIHtcbiAgICBpZiAoZGlkT25FbmQpIHJldHVybjtcbiAgICBkaWRPbkVuZCA9IHRydWU7XG5cbiAgICBpZiAodHlwZW9mIGRlc3QuZGVzdHJveSA9PT0gJ2Z1bmN0aW9uJykgZGVzdC5kZXN0cm95KCk7XG4gIH1cblxuICAvLyBkb24ndCBsZWF2ZSBkYW5nbGluZyBwaXBlcyB3aGVuIHRoZXJlIGFyZSBlcnJvcnMuXG4gIGZ1bmN0aW9uIG9uZXJyb3IoZXIpIHtcbiAgICBjbGVhbnVwKCk7XG4gICAgaWYgKEVFLmxpc3RlbmVyQ291bnQodGhpcywgJ2Vycm9yJykgPT09IDApIHtcbiAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgc3RyZWFtIGVycm9yIGluIHBpcGUuXG4gICAgfVxuICB9XG5cbiAgc291cmNlLm9uKCdlcnJvcicsIG9uZXJyb3IpO1xuICBkZXN0Lm9uKCdlcnJvcicsIG9uZXJyb3IpO1xuXG4gIC8vIHJlbW92ZSBhbGwgdGhlIGV2ZW50IGxpc3RlbmVycyB0aGF0IHdlcmUgYWRkZWQuXG4gIGZ1bmN0aW9uIGNsZWFudXAoKSB7XG4gICAgc291cmNlLnJlbW92ZUxpc3RlbmVyKCdkYXRhJywgb25kYXRhKTtcbiAgICBkZXN0LnJlbW92ZUxpc3RlbmVyKCdkcmFpbicsIG9uZHJhaW4pO1xuXG4gICAgc291cmNlLnJlbW92ZUxpc3RlbmVyKCdlbmQnLCBvbmVuZCk7XG4gICAgc291cmNlLnJlbW92ZUxpc3RlbmVyKCdjbG9zZScsIG9uY2xvc2UpO1xuXG4gICAgc291cmNlLnJlbW92ZUxpc3RlbmVyKCdlcnJvcicsIG9uZXJyb3IpO1xuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2Vycm9yJywgb25lcnJvcik7XG5cbiAgICBzb3VyY2UucmVtb3ZlTGlzdGVuZXIoJ2VuZCcsIGNsZWFudXApO1xuICAgIHNvdXJjZS5yZW1vdmVMaXN0ZW5lcignY2xvc2UnLCBjbGVhbnVwKTtcblxuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2Nsb3NlJywgY2xlYW51cCk7XG4gIH1cblxuICBzb3VyY2Uub24oJ2VuZCcsIGNsZWFudXApO1xuICBzb3VyY2Uub24oJ2Nsb3NlJywgY2xlYW51cCk7XG5cbiAgZGVzdC5vbignY2xvc2UnLCBjbGVhbnVwKTtcblxuICBkZXN0LmVtaXQoJ3BpcGUnLCBzb3VyY2UpO1xuXG4gIC8vIEFsbG93IGZvciB1bml4LWxpa2UgdXNhZ2U6IEEucGlwZShCKS5waXBlKEMpXG4gIHJldHVybiBkZXN0O1xufTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgQnVmZmVyID0gcmVxdWlyZSgnYnVmZmVyJykuQnVmZmVyO1xuXG52YXIgaXNCdWZmZXJFbmNvZGluZyA9IEJ1ZmZlci5pc0VuY29kaW5nXG4gIHx8IGZ1bmN0aW9uKGVuY29kaW5nKSB7XG4gICAgICAgc3dpdGNoIChlbmNvZGluZyAmJiBlbmNvZGluZy50b0xvd2VyQ2FzZSgpKSB7XG4gICAgICAgICBjYXNlICdoZXgnOiBjYXNlICd1dGY4JzogY2FzZSAndXRmLTgnOiBjYXNlICdhc2NpaSc6IGNhc2UgJ2JpbmFyeSc6IGNhc2UgJ2Jhc2U2NCc6IGNhc2UgJ3VjczInOiBjYXNlICd1Y3MtMic6IGNhc2UgJ3V0ZjE2bGUnOiBjYXNlICd1dGYtMTZsZSc6IGNhc2UgJ3Jhdyc6IHJldHVybiB0cnVlO1xuICAgICAgICAgZGVmYXVsdDogcmV0dXJuIGZhbHNlO1xuICAgICAgIH1cbiAgICAgfVxuXG5cbmZ1bmN0aW9uIGFzc2VydEVuY29kaW5nKGVuY29kaW5nKSB7XG4gIGlmIChlbmNvZGluZyAmJiAhaXNCdWZmZXJFbmNvZGluZyhlbmNvZGluZykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZyk7XG4gIH1cbn1cblxuLy8gU3RyaW5nRGVjb2RlciBwcm92aWRlcyBhbiBpbnRlcmZhY2UgZm9yIGVmZmljaWVudGx5IHNwbGl0dGluZyBhIHNlcmllcyBvZlxuLy8gYnVmZmVycyBpbnRvIGEgc2VyaWVzIG9mIEpTIHN0cmluZ3Mgd2l0aG91dCBicmVha2luZyBhcGFydCBtdWx0aS1ieXRlXG4vLyBjaGFyYWN0ZXJzLiBDRVNVLTggaXMgaGFuZGxlZCBhcyBwYXJ0IG9mIHRoZSBVVEYtOCBlbmNvZGluZy5cbi8vXG4vLyBAVE9ETyBIYW5kbGluZyBhbGwgZW5jb2RpbmdzIGluc2lkZSBhIHNpbmdsZSBvYmplY3QgbWFrZXMgaXQgdmVyeSBkaWZmaWN1bHRcbi8vIHRvIHJlYXNvbiBhYm91dCB0aGlzIGNvZGUsIHNvIGl0IHNob3VsZCBiZSBzcGxpdCB1cCBpbiB0aGUgZnV0dXJlLlxuLy8gQFRPRE8gVGhlcmUgc2hvdWxkIGJlIGEgdXRmOC1zdHJpY3QgZW5jb2RpbmcgdGhhdCByZWplY3RzIGludmFsaWQgVVRGLTggY29kZVxuLy8gcG9pbnRzIGFzIHVzZWQgYnkgQ0VTVS04LlxudmFyIFN0cmluZ0RlY29kZXIgPSBleHBvcnRzLlN0cmluZ0RlY29kZXIgPSBmdW5jdGlvbihlbmNvZGluZykge1xuICB0aGlzLmVuY29kaW5nID0gKGVuY29kaW5nIHx8ICd1dGY4JykudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9bLV9dLywgJycpO1xuICBhc3NlcnRFbmNvZGluZyhlbmNvZGluZyk7XG4gIHN3aXRjaCAodGhpcy5lbmNvZGluZykge1xuICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgLy8gQ0VTVS04IHJlcHJlc2VudHMgZWFjaCBvZiBTdXJyb2dhdGUgUGFpciBieSAzLWJ5dGVzXG4gICAgICB0aGlzLnN1cnJvZ2F0ZVNpemUgPSAzO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICAvLyBVVEYtMTYgcmVwcmVzZW50cyBlYWNoIG9mIFN1cnJvZ2F0ZSBQYWlyIGJ5IDItYnl0ZXNcbiAgICAgIHRoaXMuc3Vycm9nYXRlU2l6ZSA9IDI7XG4gICAgICB0aGlzLmRldGVjdEluY29tcGxldGVDaGFyID0gdXRmMTZEZXRlY3RJbmNvbXBsZXRlQ2hhcjtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAvLyBCYXNlLTY0IHN0b3JlcyAzIGJ5dGVzIGluIDQgY2hhcnMsIGFuZCBwYWRzIHRoZSByZW1haW5kZXIuXG4gICAgICB0aGlzLnN1cnJvZ2F0ZVNpemUgPSAzO1xuICAgICAgdGhpcy5kZXRlY3RJbmNvbXBsZXRlQ2hhciA9IGJhc2U2NERldGVjdEluY29tcGxldGVDaGFyO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHRoaXMud3JpdGUgPSBwYXNzVGhyb3VnaFdyaXRlO1xuICAgICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gRW5vdWdoIHNwYWNlIHRvIHN0b3JlIGFsbCBieXRlcyBvZiBhIHNpbmdsZSBjaGFyYWN0ZXIuIFVURi04IG5lZWRzIDRcbiAgLy8gYnl0ZXMsIGJ1dCBDRVNVLTggbWF5IHJlcXVpcmUgdXAgdG8gNiAoMyBieXRlcyBwZXIgc3Vycm9nYXRlKS5cbiAgdGhpcy5jaGFyQnVmZmVyID0gbmV3IEJ1ZmZlcig2KTtcbiAgLy8gTnVtYmVyIG9mIGJ5dGVzIHJlY2VpdmVkIGZvciB0aGUgY3VycmVudCBpbmNvbXBsZXRlIG11bHRpLWJ5dGUgY2hhcmFjdGVyLlxuICB0aGlzLmNoYXJSZWNlaXZlZCA9IDA7XG4gIC8vIE51bWJlciBvZiBieXRlcyBleHBlY3RlZCBmb3IgdGhlIGN1cnJlbnQgaW5jb21wbGV0ZSBtdWx0aS1ieXRlIGNoYXJhY3Rlci5cbiAgdGhpcy5jaGFyTGVuZ3RoID0gMDtcbn07XG5cblxuLy8gd3JpdGUgZGVjb2RlcyB0aGUgZ2l2ZW4gYnVmZmVyIGFuZCByZXR1cm5zIGl0IGFzIEpTIHN0cmluZyB0aGF0IGlzXG4vLyBndWFyYW50ZWVkIHRvIG5vdCBjb250YWluIGFueSBwYXJ0aWFsIG11bHRpLWJ5dGUgY2hhcmFjdGVycy4gQW55IHBhcnRpYWxcbi8vIGNoYXJhY3RlciBmb3VuZCBhdCB0aGUgZW5kIG9mIHRoZSBidWZmZXIgaXMgYnVmZmVyZWQgdXAsIGFuZCB3aWxsIGJlXG4vLyByZXR1cm5lZCB3aGVuIGNhbGxpbmcgd3JpdGUgYWdhaW4gd2l0aCB0aGUgcmVtYWluaW5nIGJ5dGVzLlxuLy9cbi8vIE5vdGU6IENvbnZlcnRpbmcgYSBCdWZmZXIgY29udGFpbmluZyBhbiBvcnBoYW4gc3Vycm9nYXRlIHRvIGEgU3RyaW5nXG4vLyBjdXJyZW50bHkgd29ya3MsIGJ1dCBjb252ZXJ0aW5nIGEgU3RyaW5nIHRvIGEgQnVmZmVyICh2aWEgYG5ldyBCdWZmZXJgLCBvclxuLy8gQnVmZmVyI3dyaXRlKSB3aWxsIHJlcGxhY2UgaW5jb21wbGV0ZSBzdXJyb2dhdGVzIHdpdGggdGhlIHVuaWNvZGVcbi8vIHJlcGxhY2VtZW50IGNoYXJhY3Rlci4gU2VlIGh0dHBzOi8vY29kZXJldmlldy5jaHJvbWl1bS5vcmcvMTIxMTczMDA5LyAuXG5TdHJpbmdEZWNvZGVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICB2YXIgY2hhclN0ciA9ICcnO1xuICAvLyBpZiBvdXIgbGFzdCB3cml0ZSBlbmRlZCB3aXRoIGFuIGluY29tcGxldGUgbXVsdGlieXRlIGNoYXJhY3RlclxuICB3aGlsZSAodGhpcy5jaGFyTGVuZ3RoKSB7XG4gICAgLy8gZGV0ZXJtaW5lIGhvdyBtYW55IHJlbWFpbmluZyBieXRlcyB0aGlzIGJ1ZmZlciBoYXMgdG8gb2ZmZXIgZm9yIHRoaXMgY2hhclxuICAgIHZhciBhdmFpbGFibGUgPSAoYnVmZmVyLmxlbmd0aCA+PSB0aGlzLmNoYXJMZW5ndGggLSB0aGlzLmNoYXJSZWNlaXZlZCkgP1xuICAgICAgICB0aGlzLmNoYXJMZW5ndGggLSB0aGlzLmNoYXJSZWNlaXZlZCA6XG4gICAgICAgIGJ1ZmZlci5sZW5ndGg7XG5cbiAgICAvLyBhZGQgdGhlIG5ldyBieXRlcyB0byB0aGUgY2hhciBidWZmZXJcbiAgICBidWZmZXIuY29weSh0aGlzLmNoYXJCdWZmZXIsIHRoaXMuY2hhclJlY2VpdmVkLCAwLCBhdmFpbGFibGUpO1xuICAgIHRoaXMuY2hhclJlY2VpdmVkICs9IGF2YWlsYWJsZTtcblxuICAgIGlmICh0aGlzLmNoYXJSZWNlaXZlZCA8IHRoaXMuY2hhckxlbmd0aCkge1xuICAgICAgLy8gc3RpbGwgbm90IGVub3VnaCBjaGFycyBpbiB0aGlzIGJ1ZmZlcj8gd2FpdCBmb3IgbW9yZSAuLi5cbiAgICAgIHJldHVybiAnJztcbiAgICB9XG5cbiAgICAvLyByZW1vdmUgYnl0ZXMgYmVsb25naW5nIHRvIHRoZSBjdXJyZW50IGNoYXJhY3RlciBmcm9tIHRoZSBidWZmZXJcbiAgICBidWZmZXIgPSBidWZmZXIuc2xpY2UoYXZhaWxhYmxlLCBidWZmZXIubGVuZ3RoKTtcblxuICAgIC8vIGdldCB0aGUgY2hhcmFjdGVyIHRoYXQgd2FzIHNwbGl0XG4gICAgY2hhclN0ciA9IHRoaXMuY2hhckJ1ZmZlci5zbGljZSgwLCB0aGlzLmNoYXJMZW5ndGgpLnRvU3RyaW5nKHRoaXMuZW5jb2RpbmcpO1xuXG4gICAgLy8gQ0VTVS04OiBsZWFkIHN1cnJvZ2F0ZSAoRDgwMC1EQkZGKSBpcyBhbHNvIHRoZSBpbmNvbXBsZXRlIGNoYXJhY3RlclxuICAgIHZhciBjaGFyQ29kZSA9IGNoYXJTdHIuY2hhckNvZGVBdChjaGFyU3RyLmxlbmd0aCAtIDEpO1xuICAgIGlmIChjaGFyQ29kZSA+PSAweEQ4MDAgJiYgY2hhckNvZGUgPD0gMHhEQkZGKSB7XG4gICAgICB0aGlzLmNoYXJMZW5ndGggKz0gdGhpcy5zdXJyb2dhdGVTaXplO1xuICAgICAgY2hhclN0ciA9ICcnO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIHRoaXMuY2hhclJlY2VpdmVkID0gdGhpcy5jaGFyTGVuZ3RoID0gMDtcblxuICAgIC8vIGlmIHRoZXJlIGFyZSBubyBtb3JlIGJ5dGVzIGluIHRoaXMgYnVmZmVyLCBqdXN0IGVtaXQgb3VyIGNoYXJcbiAgICBpZiAoYnVmZmVyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGNoYXJTdHI7XG4gICAgfVxuICAgIGJyZWFrO1xuICB9XG5cbiAgLy8gZGV0ZXJtaW5lIGFuZCBzZXQgY2hhckxlbmd0aCAvIGNoYXJSZWNlaXZlZFxuICB0aGlzLmRldGVjdEluY29tcGxldGVDaGFyKGJ1ZmZlcik7XG5cbiAgdmFyIGVuZCA9IGJ1ZmZlci5sZW5ndGg7XG4gIGlmICh0aGlzLmNoYXJMZW5ndGgpIHtcbiAgICAvLyBidWZmZXIgdGhlIGluY29tcGxldGUgY2hhcmFjdGVyIGJ5dGVzIHdlIGdvdFxuICAgIGJ1ZmZlci5jb3B5KHRoaXMuY2hhckJ1ZmZlciwgMCwgYnVmZmVyLmxlbmd0aCAtIHRoaXMuY2hhclJlY2VpdmVkLCBlbmQpO1xuICAgIGVuZCAtPSB0aGlzLmNoYXJSZWNlaXZlZDtcbiAgfVxuXG4gIGNoYXJTdHIgKz0gYnVmZmVyLnRvU3RyaW5nKHRoaXMuZW5jb2RpbmcsIDAsIGVuZCk7XG5cbiAgdmFyIGVuZCA9IGNoYXJTdHIubGVuZ3RoIC0gMTtcbiAgdmFyIGNoYXJDb2RlID0gY2hhclN0ci5jaGFyQ29kZUF0KGVuZCk7XG4gIC8vIENFU1UtODogbGVhZCBzdXJyb2dhdGUgKEQ4MDAtREJGRikgaXMgYWxzbyB0aGUgaW5jb21wbGV0ZSBjaGFyYWN0ZXJcbiAgaWYgKGNoYXJDb2RlID49IDB4RDgwMCAmJiBjaGFyQ29kZSA8PSAweERCRkYpIHtcbiAgICB2YXIgc2l6ZSA9IHRoaXMuc3Vycm9nYXRlU2l6ZTtcbiAgICB0aGlzLmNoYXJMZW5ndGggKz0gc2l6ZTtcbiAgICB0aGlzLmNoYXJSZWNlaXZlZCArPSBzaXplO1xuICAgIHRoaXMuY2hhckJ1ZmZlci5jb3B5KHRoaXMuY2hhckJ1ZmZlciwgc2l6ZSwgMCwgc2l6ZSk7XG4gICAgYnVmZmVyLmNvcHkodGhpcy5jaGFyQnVmZmVyLCAwLCAwLCBzaXplKTtcbiAgICByZXR1cm4gY2hhclN0ci5zdWJzdHJpbmcoMCwgZW5kKTtcbiAgfVxuXG4gIC8vIG9yIGp1c3QgZW1pdCB0aGUgY2hhclN0clxuICByZXR1cm4gY2hhclN0cjtcbn07XG5cbi8vIGRldGVjdEluY29tcGxldGVDaGFyIGRldGVybWluZXMgaWYgdGhlcmUgaXMgYW4gaW5jb21wbGV0ZSBVVEYtOCBjaGFyYWN0ZXIgYXRcbi8vIHRoZSBlbmQgb2YgdGhlIGdpdmVuIGJ1ZmZlci4gSWYgc28sIGl0IHNldHMgdGhpcy5jaGFyTGVuZ3RoIHRvIHRoZSBieXRlXG4vLyBsZW5ndGggdGhhdCBjaGFyYWN0ZXIsIGFuZCBzZXRzIHRoaXMuY2hhclJlY2VpdmVkIHRvIHRoZSBudW1iZXIgb2YgYnl0ZXNcbi8vIHRoYXQgYXJlIGF2YWlsYWJsZSBmb3IgdGhpcyBjaGFyYWN0ZXIuXG5TdHJpbmdEZWNvZGVyLnByb3RvdHlwZS5kZXRlY3RJbmNvbXBsZXRlQ2hhciA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAvLyBkZXRlcm1pbmUgaG93IG1hbnkgYnl0ZXMgd2UgaGF2ZSB0byBjaGVjayBhdCB0aGUgZW5kIG9mIHRoaXMgYnVmZmVyXG4gIHZhciBpID0gKGJ1ZmZlci5sZW5ndGggPj0gMykgPyAzIDogYnVmZmVyLmxlbmd0aDtcblxuICAvLyBGaWd1cmUgb3V0IGlmIG9uZSBvZiB0aGUgbGFzdCBpIGJ5dGVzIG9mIG91ciBidWZmZXIgYW5ub3VuY2VzIGFuXG4gIC8vIGluY29tcGxldGUgY2hhci5cbiAgZm9yICg7IGkgPiAwOyBpLS0pIHtcbiAgICB2YXIgYyA9IGJ1ZmZlcltidWZmZXIubGVuZ3RoIC0gaV07XG5cbiAgICAvLyBTZWUgaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9VVEYtOCNEZXNjcmlwdGlvblxuXG4gICAgLy8gMTEwWFhYWFhcbiAgICBpZiAoaSA9PSAxICYmIGMgPj4gNSA9PSAweDA2KSB7XG4gICAgICB0aGlzLmNoYXJMZW5ndGggPSAyO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgLy8gMTExMFhYWFhcbiAgICBpZiAoaSA8PSAyICYmIGMgPj4gNCA9PSAweDBFKSB7XG4gICAgICB0aGlzLmNoYXJMZW5ndGggPSAzO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgLy8gMTExMTBYWFhcbiAgICBpZiAoaSA8PSAzICYmIGMgPj4gMyA9PSAweDFFKSB7XG4gICAgICB0aGlzLmNoYXJMZW5ndGggPSA0O1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIHRoaXMuY2hhclJlY2VpdmVkID0gaTtcbn07XG5cblN0cmluZ0RlY29kZXIucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICB2YXIgcmVzID0gJyc7XG4gIGlmIChidWZmZXIgJiYgYnVmZmVyLmxlbmd0aClcbiAgICByZXMgPSB0aGlzLndyaXRlKGJ1ZmZlcik7XG5cbiAgaWYgKHRoaXMuY2hhclJlY2VpdmVkKSB7XG4gICAgdmFyIGNyID0gdGhpcy5jaGFyUmVjZWl2ZWQ7XG4gICAgdmFyIGJ1ZiA9IHRoaXMuY2hhckJ1ZmZlcjtcbiAgICB2YXIgZW5jID0gdGhpcy5lbmNvZGluZztcbiAgICByZXMgKz0gYnVmLnNsaWNlKDAsIGNyKS50b1N0cmluZyhlbmMpO1xuICB9XG5cbiAgcmV0dXJuIHJlcztcbn07XG5cbmZ1bmN0aW9uIHBhc3NUaHJvdWdoV3JpdGUoYnVmZmVyKSB7XG4gIHJldHVybiBidWZmZXIudG9TdHJpbmcodGhpcy5lbmNvZGluZyk7XG59XG5cbmZ1bmN0aW9uIHV0ZjE2RGV0ZWN0SW5jb21wbGV0ZUNoYXIoYnVmZmVyKSB7XG4gIHRoaXMuY2hhclJlY2VpdmVkID0gYnVmZmVyLmxlbmd0aCAlIDI7XG4gIHRoaXMuY2hhckxlbmd0aCA9IHRoaXMuY2hhclJlY2VpdmVkID8gMiA6IDA7XG59XG5cbmZ1bmN0aW9uIGJhc2U2NERldGVjdEluY29tcGxldGVDaGFyKGJ1ZmZlcikge1xuICB0aGlzLmNoYXJSZWNlaXZlZCA9IGJ1ZmZlci5sZW5ndGggJSAzO1xuICB0aGlzLmNoYXJMZW5ndGggPSB0aGlzLmNoYXJSZWNlaXZlZCA/IDMgOiAwO1xufVxuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciBwdW55Y29kZSA9IHJlcXVpcmUoJ3B1bnljb2RlJyk7XG5cbmV4cG9ydHMucGFyc2UgPSB1cmxQYXJzZTtcbmV4cG9ydHMucmVzb2x2ZSA9IHVybFJlc29sdmU7XG5leHBvcnRzLnJlc29sdmVPYmplY3QgPSB1cmxSZXNvbHZlT2JqZWN0O1xuZXhwb3J0cy5mb3JtYXQgPSB1cmxGb3JtYXQ7XG5cbmV4cG9ydHMuVXJsID0gVXJsO1xuXG5mdW5jdGlvbiBVcmwoKSB7XG4gIHRoaXMucHJvdG9jb2wgPSBudWxsO1xuICB0aGlzLnNsYXNoZXMgPSBudWxsO1xuICB0aGlzLmF1dGggPSBudWxsO1xuICB0aGlzLmhvc3QgPSBudWxsO1xuICB0aGlzLnBvcnQgPSBudWxsO1xuICB0aGlzLmhvc3RuYW1lID0gbnVsbDtcbiAgdGhpcy5oYXNoID0gbnVsbDtcbiAgdGhpcy5zZWFyY2ggPSBudWxsO1xuICB0aGlzLnF1ZXJ5ID0gbnVsbDtcbiAgdGhpcy5wYXRobmFtZSA9IG51bGw7XG4gIHRoaXMucGF0aCA9IG51bGw7XG4gIHRoaXMuaHJlZiA9IG51bGw7XG59XG5cbi8vIFJlZmVyZW5jZTogUkZDIDM5ODYsIFJGQyAxODA4LCBSRkMgMjM5NlxuXG4vLyBkZWZpbmUgdGhlc2UgaGVyZSBzbyBhdCBsZWFzdCB0aGV5IG9ubHkgaGF2ZSB0byBiZVxuLy8gY29tcGlsZWQgb25jZSBvbiB0aGUgZmlyc3QgbW9kdWxlIGxvYWQuXG52YXIgcHJvdG9jb2xQYXR0ZXJuID0gL14oW2EtejAtOS4rLV0rOikvaSxcbiAgICBwb3J0UGF0dGVybiA9IC86WzAtOV0qJC8sXG5cbiAgICAvLyBSRkMgMjM5NjogY2hhcmFjdGVycyByZXNlcnZlZCBmb3IgZGVsaW1pdGluZyBVUkxzLlxuICAgIC8vIFdlIGFjdHVhbGx5IGp1c3QgYXV0by1lc2NhcGUgdGhlc2UuXG4gICAgZGVsaW1zID0gWyc8JywgJz4nLCAnXCInLCAnYCcsICcgJywgJ1xccicsICdcXG4nLCAnXFx0J10sXG5cbiAgICAvLyBSRkMgMjM5NjogY2hhcmFjdGVycyBub3QgYWxsb3dlZCBmb3IgdmFyaW91cyByZWFzb25zLlxuICAgIHVud2lzZSA9IFsneycsICd9JywgJ3wnLCAnXFxcXCcsICdeJywgJ2AnXS5jb25jYXQoZGVsaW1zKSxcblxuICAgIC8vIEFsbG93ZWQgYnkgUkZDcywgYnV0IGNhdXNlIG9mIFhTUyBhdHRhY2tzLiAgQWx3YXlzIGVzY2FwZSB0aGVzZS5cbiAgICBhdXRvRXNjYXBlID0gWydcXCcnXS5jb25jYXQodW53aXNlKSxcbiAgICAvLyBDaGFyYWN0ZXJzIHRoYXQgYXJlIG5ldmVyIGV2ZXIgYWxsb3dlZCBpbiBhIGhvc3RuYW1lLlxuICAgIC8vIE5vdGUgdGhhdCBhbnkgaW52YWxpZCBjaGFycyBhcmUgYWxzbyBoYW5kbGVkLCBidXQgdGhlc2VcbiAgICAvLyBhcmUgdGhlIG9uZXMgdGhhdCBhcmUgKmV4cGVjdGVkKiB0byBiZSBzZWVuLCBzbyB3ZSBmYXN0LXBhdGhcbiAgICAvLyB0aGVtLlxuICAgIG5vbkhvc3RDaGFycyA9IFsnJScsICcvJywgJz8nLCAnOycsICcjJ10uY29uY2F0KGF1dG9Fc2NhcGUpLFxuICAgIGhvc3RFbmRpbmdDaGFycyA9IFsnLycsICc/JywgJyMnXSxcbiAgICBob3N0bmFtZU1heExlbiA9IDI1NSxcbiAgICBob3N0bmFtZVBhcnRQYXR0ZXJuID0gL15bYS16MC05QS1aXy1dezAsNjN9JC8sXG4gICAgaG9zdG5hbWVQYXJ0U3RhcnQgPSAvXihbYS16MC05QS1aXy1dezAsNjN9KSguKikkLyxcbiAgICAvLyBwcm90b2NvbHMgdGhhdCBjYW4gYWxsb3cgXCJ1bnNhZmVcIiBhbmQgXCJ1bndpc2VcIiBjaGFycy5cbiAgICB1bnNhZmVQcm90b2NvbCA9IHtcbiAgICAgICdqYXZhc2NyaXB0JzogdHJ1ZSxcbiAgICAgICdqYXZhc2NyaXB0Oic6IHRydWVcbiAgICB9LFxuICAgIC8vIHByb3RvY29scyB0aGF0IG5ldmVyIGhhdmUgYSBob3N0bmFtZS5cbiAgICBob3N0bGVzc1Byb3RvY29sID0ge1xuICAgICAgJ2phdmFzY3JpcHQnOiB0cnVlLFxuICAgICAgJ2phdmFzY3JpcHQ6JzogdHJ1ZVxuICAgIH0sXG4gICAgLy8gcHJvdG9jb2xzIHRoYXQgYWx3YXlzIGNvbnRhaW4gYSAvLyBiaXQuXG4gICAgc2xhc2hlZFByb3RvY29sID0ge1xuICAgICAgJ2h0dHAnOiB0cnVlLFxuICAgICAgJ2h0dHBzJzogdHJ1ZSxcbiAgICAgICdmdHAnOiB0cnVlLFxuICAgICAgJ2dvcGhlcic6IHRydWUsXG4gICAgICAnZmlsZSc6IHRydWUsXG4gICAgICAnaHR0cDonOiB0cnVlLFxuICAgICAgJ2h0dHBzOic6IHRydWUsXG4gICAgICAnZnRwOic6IHRydWUsXG4gICAgICAnZ29waGVyOic6IHRydWUsXG4gICAgICAnZmlsZTonOiB0cnVlXG4gICAgfSxcbiAgICBxdWVyeXN0cmluZyA9IHJlcXVpcmUoJ3F1ZXJ5c3RyaW5nJyk7XG5cbmZ1bmN0aW9uIHVybFBhcnNlKHVybCwgcGFyc2VRdWVyeVN0cmluZywgc2xhc2hlc0Rlbm90ZUhvc3QpIHtcbiAgaWYgKHVybCAmJiBpc09iamVjdCh1cmwpICYmIHVybCBpbnN0YW5jZW9mIFVybCkgcmV0dXJuIHVybDtcblxuICB2YXIgdSA9IG5ldyBVcmw7XG4gIHUucGFyc2UodXJsLCBwYXJzZVF1ZXJ5U3RyaW5nLCBzbGFzaGVzRGVub3RlSG9zdCk7XG4gIHJldHVybiB1O1xufVxuXG5VcmwucHJvdG90eXBlLnBhcnNlID0gZnVuY3Rpb24odXJsLCBwYXJzZVF1ZXJ5U3RyaW5nLCBzbGFzaGVzRGVub3RlSG9zdCkge1xuICBpZiAoIWlzU3RyaW5nKHVybCkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUGFyYW1ldGVyICd1cmwnIG11c3QgYmUgYSBzdHJpbmcsIG5vdCBcIiArIHR5cGVvZiB1cmwpO1xuICB9XG5cbiAgdmFyIHJlc3QgPSB1cmw7XG5cbiAgLy8gdHJpbSBiZWZvcmUgcHJvY2VlZGluZy5cbiAgLy8gVGhpcyBpcyB0byBzdXBwb3J0IHBhcnNlIHN0dWZmIGxpa2UgXCIgIGh0dHA6Ly9mb28uY29tICBcXG5cIlxuICByZXN0ID0gcmVzdC50cmltKCk7XG5cbiAgdmFyIHByb3RvID0gcHJvdG9jb2xQYXR0ZXJuLmV4ZWMocmVzdCk7XG4gIGlmIChwcm90bykge1xuICAgIHByb3RvID0gcHJvdG9bMF07XG4gICAgdmFyIGxvd2VyUHJvdG8gPSBwcm90by50b0xvd2VyQ2FzZSgpO1xuICAgIHRoaXMucHJvdG9jb2wgPSBsb3dlclByb3RvO1xuICAgIHJlc3QgPSByZXN0LnN1YnN0cihwcm90by5sZW5ndGgpO1xuICB9XG5cbiAgLy8gZmlndXJlIG91dCBpZiBpdCdzIGdvdCBhIGhvc3RcbiAgLy8gdXNlckBzZXJ2ZXIgaXMgKmFsd2F5cyogaW50ZXJwcmV0ZWQgYXMgYSBob3N0bmFtZSwgYW5kIHVybFxuICAvLyByZXNvbHV0aW9uIHdpbGwgdHJlYXQgLy9mb28vYmFyIGFzIGhvc3Q9Zm9vLHBhdGg9YmFyIGJlY2F1c2UgdGhhdCdzXG4gIC8vIGhvdyB0aGUgYnJvd3NlciByZXNvbHZlcyByZWxhdGl2ZSBVUkxzLlxuICBpZiAoc2xhc2hlc0Rlbm90ZUhvc3QgfHwgcHJvdG8gfHwgcmVzdC5tYXRjaCgvXlxcL1xcL1teQFxcL10rQFteQFxcL10rLykpIHtcbiAgICB2YXIgc2xhc2hlcyA9IHJlc3Quc3Vic3RyKDAsIDIpID09PSAnLy8nO1xuICAgIGlmIChzbGFzaGVzICYmICEocHJvdG8gJiYgaG9zdGxlc3NQcm90b2NvbFtwcm90b10pKSB7XG4gICAgICByZXN0ID0gcmVzdC5zdWJzdHIoMik7XG4gICAgICB0aGlzLnNsYXNoZXMgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIGlmICghaG9zdGxlc3NQcm90b2NvbFtwcm90b10gJiZcbiAgICAgIChzbGFzaGVzIHx8IChwcm90byAmJiAhc2xhc2hlZFByb3RvY29sW3Byb3RvXSkpKSB7XG5cbiAgICAvLyB0aGVyZSdzIGEgaG9zdG5hbWUuXG4gICAgLy8gdGhlIGZpcnN0IGluc3RhbmNlIG9mIC8sID8sIDssIG9yICMgZW5kcyB0aGUgaG9zdC5cbiAgICAvL1xuICAgIC8vIElmIHRoZXJlIGlzIGFuIEAgaW4gdGhlIGhvc3RuYW1lLCB0aGVuIG5vbi1ob3N0IGNoYXJzICphcmUqIGFsbG93ZWRcbiAgICAvLyB0byB0aGUgbGVmdCBvZiB0aGUgbGFzdCBAIHNpZ24sIHVubGVzcyBzb21lIGhvc3QtZW5kaW5nIGNoYXJhY3RlclxuICAgIC8vIGNvbWVzICpiZWZvcmUqIHRoZSBALXNpZ24uXG4gICAgLy8gVVJMcyBhcmUgb2Jub3hpb3VzLlxuICAgIC8vXG4gICAgLy8gZXg6XG4gICAgLy8gaHR0cDovL2FAYkBjLyA9PiB1c2VyOmFAYiBob3N0OmNcbiAgICAvLyBodHRwOi8vYUBiP0BjID0+IHVzZXI6YSBob3N0OmMgcGF0aDovP0BjXG5cbiAgICAvLyB2MC4xMiBUT0RPKGlzYWFjcyk6IFRoaXMgaXMgbm90IHF1aXRlIGhvdyBDaHJvbWUgZG9lcyB0aGluZ3MuXG4gICAgLy8gUmV2aWV3IG91ciB0ZXN0IGNhc2UgYWdhaW5zdCBicm93c2VycyBtb3JlIGNvbXByZWhlbnNpdmVseS5cblxuICAgIC8vIGZpbmQgdGhlIGZpcnN0IGluc3RhbmNlIG9mIGFueSBob3N0RW5kaW5nQ2hhcnNcbiAgICB2YXIgaG9zdEVuZCA9IC0xO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaG9zdEVuZGluZ0NoYXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgaGVjID0gcmVzdC5pbmRleE9mKGhvc3RFbmRpbmdDaGFyc1tpXSk7XG4gICAgICBpZiAoaGVjICE9PSAtMSAmJiAoaG9zdEVuZCA9PT0gLTEgfHwgaGVjIDwgaG9zdEVuZCkpXG4gICAgICAgIGhvc3RFbmQgPSBoZWM7XG4gICAgfVxuXG4gICAgLy8gYXQgdGhpcyBwb2ludCwgZWl0aGVyIHdlIGhhdmUgYW4gZXhwbGljaXQgcG9pbnQgd2hlcmUgdGhlXG4gICAgLy8gYXV0aCBwb3J0aW9uIGNhbm5vdCBnbyBwYXN0LCBvciB0aGUgbGFzdCBAIGNoYXIgaXMgdGhlIGRlY2lkZXIuXG4gICAgdmFyIGF1dGgsIGF0U2lnbjtcbiAgICBpZiAoaG9zdEVuZCA9PT0gLTEpIHtcbiAgICAgIC8vIGF0U2lnbiBjYW4gYmUgYW55d2hlcmUuXG4gICAgICBhdFNpZ24gPSByZXN0Lmxhc3RJbmRleE9mKCdAJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGF0U2lnbiBtdXN0IGJlIGluIGF1dGggcG9ydGlvbi5cbiAgICAgIC8vIGh0dHA6Ly9hQGIvY0BkID0+IGhvc3Q6YiBhdXRoOmEgcGF0aDovY0BkXG4gICAgICBhdFNpZ24gPSByZXN0Lmxhc3RJbmRleE9mKCdAJywgaG9zdEVuZCk7XG4gICAgfVxuXG4gICAgLy8gTm93IHdlIGhhdmUgYSBwb3J0aW9uIHdoaWNoIGlzIGRlZmluaXRlbHkgdGhlIGF1dGguXG4gICAgLy8gUHVsbCB0aGF0IG9mZi5cbiAgICBpZiAoYXRTaWduICE9PSAtMSkge1xuICAgICAgYXV0aCA9IHJlc3Quc2xpY2UoMCwgYXRTaWduKTtcbiAgICAgIHJlc3QgPSByZXN0LnNsaWNlKGF0U2lnbiArIDEpO1xuICAgICAgdGhpcy5hdXRoID0gZGVjb2RlVVJJQ29tcG9uZW50KGF1dGgpO1xuICAgIH1cblxuICAgIC8vIHRoZSBob3N0IGlzIHRoZSByZW1haW5pbmcgdG8gdGhlIGxlZnQgb2YgdGhlIGZpcnN0IG5vbi1ob3N0IGNoYXJcbiAgICBob3N0RW5kID0gLTE7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub25Ib3N0Q2hhcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBoZWMgPSByZXN0LmluZGV4T2Yobm9uSG9zdENoYXJzW2ldKTtcbiAgICAgIGlmIChoZWMgIT09IC0xICYmIChob3N0RW5kID09PSAtMSB8fCBoZWMgPCBob3N0RW5kKSlcbiAgICAgICAgaG9zdEVuZCA9IGhlYztcbiAgICB9XG4gICAgLy8gaWYgd2Ugc3RpbGwgaGF2ZSBub3QgaGl0IGl0LCB0aGVuIHRoZSBlbnRpcmUgdGhpbmcgaXMgYSBob3N0LlxuICAgIGlmIChob3N0RW5kID09PSAtMSlcbiAgICAgIGhvc3RFbmQgPSByZXN0Lmxlbmd0aDtcblxuICAgIHRoaXMuaG9zdCA9IHJlc3Quc2xpY2UoMCwgaG9zdEVuZCk7XG4gICAgcmVzdCA9IHJlc3Quc2xpY2UoaG9zdEVuZCk7XG5cbiAgICAvLyBwdWxsIG91dCBwb3J0LlxuICAgIHRoaXMucGFyc2VIb3N0KCk7XG5cbiAgICAvLyB3ZSd2ZSBpbmRpY2F0ZWQgdGhhdCB0aGVyZSBpcyBhIGhvc3RuYW1lLFxuICAgIC8vIHNvIGV2ZW4gaWYgaXQncyBlbXB0eSwgaXQgaGFzIHRvIGJlIHByZXNlbnQuXG4gICAgdGhpcy5ob3N0bmFtZSA9IHRoaXMuaG9zdG5hbWUgfHwgJyc7XG5cbiAgICAvLyBpZiBob3N0bmFtZSBiZWdpbnMgd2l0aCBbIGFuZCBlbmRzIHdpdGggXVxuICAgIC8vIGFzc3VtZSB0aGF0IGl0J3MgYW4gSVB2NiBhZGRyZXNzLlxuICAgIHZhciBpcHY2SG9zdG5hbWUgPSB0aGlzLmhvc3RuYW1lWzBdID09PSAnWycgJiZcbiAgICAgICAgdGhpcy5ob3N0bmFtZVt0aGlzLmhvc3RuYW1lLmxlbmd0aCAtIDFdID09PSAnXSc7XG5cbiAgICAvLyB2YWxpZGF0ZSBhIGxpdHRsZS5cbiAgICBpZiAoIWlwdjZIb3N0bmFtZSkge1xuICAgICAgdmFyIGhvc3RwYXJ0cyA9IHRoaXMuaG9zdG5hbWUuc3BsaXQoL1xcLi8pO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBob3N0cGFydHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHZhciBwYXJ0ID0gaG9zdHBhcnRzW2ldO1xuICAgICAgICBpZiAoIXBhcnQpIGNvbnRpbnVlO1xuICAgICAgICBpZiAoIXBhcnQubWF0Y2goaG9zdG5hbWVQYXJ0UGF0dGVybikpIHtcbiAgICAgICAgICB2YXIgbmV3cGFydCA9ICcnO1xuICAgICAgICAgIGZvciAodmFyIGogPSAwLCBrID0gcGFydC5sZW5ndGg7IGogPCBrOyBqKyspIHtcbiAgICAgICAgICAgIGlmIChwYXJ0LmNoYXJDb2RlQXQoaikgPiAxMjcpIHtcbiAgICAgICAgICAgICAgLy8gd2UgcmVwbGFjZSBub24tQVNDSUkgY2hhciB3aXRoIGEgdGVtcG9yYXJ5IHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAgIC8vIHdlIG5lZWQgdGhpcyB0byBtYWtlIHN1cmUgc2l6ZSBvZiBob3N0bmFtZSBpcyBub3RcbiAgICAgICAgICAgICAgLy8gYnJva2VuIGJ5IHJlcGxhY2luZyBub24tQVNDSUkgYnkgbm90aGluZ1xuICAgICAgICAgICAgICBuZXdwYXJ0ICs9ICd4JztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG5ld3BhcnQgKz0gcGFydFtqXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gd2UgdGVzdCBhZ2FpbiB3aXRoIEFTQ0lJIGNoYXIgb25seVxuICAgICAgICAgIGlmICghbmV3cGFydC5tYXRjaChob3N0bmFtZVBhcnRQYXR0ZXJuKSkge1xuICAgICAgICAgICAgdmFyIHZhbGlkUGFydHMgPSBob3N0cGFydHMuc2xpY2UoMCwgaSk7XG4gICAgICAgICAgICB2YXIgbm90SG9zdCA9IGhvc3RwYXJ0cy5zbGljZShpICsgMSk7XG4gICAgICAgICAgICB2YXIgYml0ID0gcGFydC5tYXRjaChob3N0bmFtZVBhcnRTdGFydCk7XG4gICAgICAgICAgICBpZiAoYml0KSB7XG4gICAgICAgICAgICAgIHZhbGlkUGFydHMucHVzaChiaXRbMV0pO1xuICAgICAgICAgICAgICBub3RIb3N0LnVuc2hpZnQoYml0WzJdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChub3RIb3N0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICByZXN0ID0gJy8nICsgbm90SG9zdC5qb2luKCcuJykgKyByZXN0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5ob3N0bmFtZSA9IHZhbGlkUGFydHMuam9pbignLicpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuaG9zdG5hbWUubGVuZ3RoID4gaG9zdG5hbWVNYXhMZW4pIHtcbiAgICAgIHRoaXMuaG9zdG5hbWUgPSAnJztcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gaG9zdG5hbWVzIGFyZSBhbHdheXMgbG93ZXIgY2FzZS5cbiAgICAgIHRoaXMuaG9zdG5hbWUgPSB0aGlzLmhvc3RuYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgfVxuXG4gICAgaWYgKCFpcHY2SG9zdG5hbWUpIHtcbiAgICAgIC8vIElETkEgU3VwcG9ydDogUmV0dXJucyBhIHB1bnkgY29kZWQgcmVwcmVzZW50YXRpb24gb2YgXCJkb21haW5cIi5cbiAgICAgIC8vIEl0IG9ubHkgY29udmVydHMgdGhlIHBhcnQgb2YgdGhlIGRvbWFpbiBuYW1lIHRoYXRcbiAgICAgIC8vIGhhcyBub24gQVNDSUkgY2hhcmFjdGVycy4gSS5lLiBpdCBkb3NlbnQgbWF0dGVyIGlmXG4gICAgICAvLyB5b3UgY2FsbCBpdCB3aXRoIGEgZG9tYWluIHRoYXQgYWxyZWFkeSBpcyBpbiBBU0NJSS5cbiAgICAgIHZhciBkb21haW5BcnJheSA9IHRoaXMuaG9zdG5hbWUuc3BsaXQoJy4nKTtcbiAgICAgIHZhciBuZXdPdXQgPSBbXTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZG9tYWluQXJyYXkubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIHMgPSBkb21haW5BcnJheVtpXTtcbiAgICAgICAgbmV3T3V0LnB1c2gocy5tYXRjaCgvW15BLVphLXowLTlfLV0vKSA/XG4gICAgICAgICAgICAneG4tLScgKyBwdW55Y29kZS5lbmNvZGUocykgOiBzKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuaG9zdG5hbWUgPSBuZXdPdXQuam9pbignLicpO1xuICAgIH1cblxuICAgIHZhciBwID0gdGhpcy5wb3J0ID8gJzonICsgdGhpcy5wb3J0IDogJyc7XG4gICAgdmFyIGggPSB0aGlzLmhvc3RuYW1lIHx8ICcnO1xuICAgIHRoaXMuaG9zdCA9IGggKyBwO1xuICAgIHRoaXMuaHJlZiArPSB0aGlzLmhvc3Q7XG5cbiAgICAvLyBzdHJpcCBbIGFuZCBdIGZyb20gdGhlIGhvc3RuYW1lXG4gICAgLy8gdGhlIGhvc3QgZmllbGQgc3RpbGwgcmV0YWlucyB0aGVtLCB0aG91Z2hcbiAgICBpZiAoaXB2Nkhvc3RuYW1lKSB7XG4gICAgICB0aGlzLmhvc3RuYW1lID0gdGhpcy5ob3N0bmFtZS5zdWJzdHIoMSwgdGhpcy5ob3N0bmFtZS5sZW5ndGggLSAyKTtcbiAgICAgIGlmIChyZXN0WzBdICE9PSAnLycpIHtcbiAgICAgICAgcmVzdCA9ICcvJyArIHJlc3Q7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gbm93IHJlc3QgaXMgc2V0IHRvIHRoZSBwb3N0LWhvc3Qgc3R1ZmYuXG4gIC8vIGNob3Agb2ZmIGFueSBkZWxpbSBjaGFycy5cbiAgaWYgKCF1bnNhZmVQcm90b2NvbFtsb3dlclByb3RvXSkge1xuXG4gICAgLy8gRmlyc3QsIG1ha2UgMTAwJSBzdXJlIHRoYXQgYW55IFwiYXV0b0VzY2FwZVwiIGNoYXJzIGdldFxuICAgIC8vIGVzY2FwZWQsIGV2ZW4gaWYgZW5jb2RlVVJJQ29tcG9uZW50IGRvZXNuJ3QgdGhpbmsgdGhleVxuICAgIC8vIG5lZWQgdG8gYmUuXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBhdXRvRXNjYXBlLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgdmFyIGFlID0gYXV0b0VzY2FwZVtpXTtcbiAgICAgIHZhciBlc2MgPSBlbmNvZGVVUklDb21wb25lbnQoYWUpO1xuICAgICAgaWYgKGVzYyA9PT0gYWUpIHtcbiAgICAgICAgZXNjID0gZXNjYXBlKGFlKTtcbiAgICAgIH1cbiAgICAgIHJlc3QgPSByZXN0LnNwbGl0KGFlKS5qb2luKGVzYyk7XG4gICAgfVxuICB9XG5cblxuICAvLyBjaG9wIG9mZiBmcm9tIHRoZSB0YWlsIGZpcnN0LlxuICB2YXIgaGFzaCA9IHJlc3QuaW5kZXhPZignIycpO1xuICBpZiAoaGFzaCAhPT0gLTEpIHtcbiAgICAvLyBnb3QgYSBmcmFnbWVudCBzdHJpbmcuXG4gICAgdGhpcy5oYXNoID0gcmVzdC5zdWJzdHIoaGFzaCk7XG4gICAgcmVzdCA9IHJlc3Quc2xpY2UoMCwgaGFzaCk7XG4gIH1cbiAgdmFyIHFtID0gcmVzdC5pbmRleE9mKCc/Jyk7XG4gIGlmIChxbSAhPT0gLTEpIHtcbiAgICB0aGlzLnNlYXJjaCA9IHJlc3Quc3Vic3RyKHFtKTtcbiAgICB0aGlzLnF1ZXJ5ID0gcmVzdC5zdWJzdHIocW0gKyAxKTtcbiAgICBpZiAocGFyc2VRdWVyeVN0cmluZykge1xuICAgICAgdGhpcy5xdWVyeSA9IHF1ZXJ5c3RyaW5nLnBhcnNlKHRoaXMucXVlcnkpO1xuICAgIH1cbiAgICByZXN0ID0gcmVzdC5zbGljZSgwLCBxbSk7XG4gIH0gZWxzZSBpZiAocGFyc2VRdWVyeVN0cmluZykge1xuICAgIC8vIG5vIHF1ZXJ5IHN0cmluZywgYnV0IHBhcnNlUXVlcnlTdHJpbmcgc3RpbGwgcmVxdWVzdGVkXG4gICAgdGhpcy5zZWFyY2ggPSAnJztcbiAgICB0aGlzLnF1ZXJ5ID0ge307XG4gIH1cbiAgaWYgKHJlc3QpIHRoaXMucGF0aG5hbWUgPSByZXN0O1xuICBpZiAoc2xhc2hlZFByb3RvY29sW2xvd2VyUHJvdG9dICYmXG4gICAgICB0aGlzLmhvc3RuYW1lICYmICF0aGlzLnBhdGhuYW1lKSB7XG4gICAgdGhpcy5wYXRobmFtZSA9ICcvJztcbiAgfVxuXG4gIC8vdG8gc3VwcG9ydCBodHRwLnJlcXVlc3RcbiAgaWYgKHRoaXMucGF0aG5hbWUgfHwgdGhpcy5zZWFyY2gpIHtcbiAgICB2YXIgcCA9IHRoaXMucGF0aG5hbWUgfHwgJyc7XG4gICAgdmFyIHMgPSB0aGlzLnNlYXJjaCB8fCAnJztcbiAgICB0aGlzLnBhdGggPSBwICsgcztcbiAgfVxuXG4gIC8vIGZpbmFsbHksIHJlY29uc3RydWN0IHRoZSBocmVmIGJhc2VkIG9uIHdoYXQgaGFzIGJlZW4gdmFsaWRhdGVkLlxuICB0aGlzLmhyZWYgPSB0aGlzLmZvcm1hdCgpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGZvcm1hdCBhIHBhcnNlZCBvYmplY3QgaW50byBhIHVybCBzdHJpbmdcbmZ1bmN0aW9uIHVybEZvcm1hdChvYmopIHtcbiAgLy8gZW5zdXJlIGl0J3MgYW4gb2JqZWN0LCBhbmQgbm90IGEgc3RyaW5nIHVybC5cbiAgLy8gSWYgaXQncyBhbiBvYmosIHRoaXMgaXMgYSBuby1vcC5cbiAgLy8gdGhpcyB3YXksIHlvdSBjYW4gY2FsbCB1cmxfZm9ybWF0KCkgb24gc3RyaW5nc1xuICAvLyB0byBjbGVhbiB1cCBwb3RlbnRpYWxseSB3b25reSB1cmxzLlxuICBpZiAoaXNTdHJpbmcob2JqKSkgb2JqID0gdXJsUGFyc2Uob2JqKTtcbiAgaWYgKCEob2JqIGluc3RhbmNlb2YgVXJsKSkgcmV0dXJuIFVybC5wcm90b3R5cGUuZm9ybWF0LmNhbGwob2JqKTtcbiAgcmV0dXJuIG9iai5mb3JtYXQoKTtcbn1cblxuVXJsLnByb3RvdHlwZS5mb3JtYXQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGF1dGggPSB0aGlzLmF1dGggfHwgJyc7XG4gIGlmIChhdXRoKSB7XG4gICAgYXV0aCA9IGVuY29kZVVSSUNvbXBvbmVudChhdXRoKTtcbiAgICBhdXRoID0gYXV0aC5yZXBsYWNlKC8lM0EvaSwgJzonKTtcbiAgICBhdXRoICs9ICdAJztcbiAgfVxuXG4gIHZhciBwcm90b2NvbCA9IHRoaXMucHJvdG9jb2wgfHwgJycsXG4gICAgICBwYXRobmFtZSA9IHRoaXMucGF0aG5hbWUgfHwgJycsXG4gICAgICBoYXNoID0gdGhpcy5oYXNoIHx8ICcnLFxuICAgICAgaG9zdCA9IGZhbHNlLFxuICAgICAgcXVlcnkgPSAnJztcblxuICBpZiAodGhpcy5ob3N0KSB7XG4gICAgaG9zdCA9IGF1dGggKyB0aGlzLmhvc3Q7XG4gIH0gZWxzZSBpZiAodGhpcy5ob3N0bmFtZSkge1xuICAgIGhvc3QgPSBhdXRoICsgKHRoaXMuaG9zdG5hbWUuaW5kZXhPZignOicpID09PSAtMSA/XG4gICAgICAgIHRoaXMuaG9zdG5hbWUgOlxuICAgICAgICAnWycgKyB0aGlzLmhvc3RuYW1lICsgJ10nKTtcbiAgICBpZiAodGhpcy5wb3J0KSB7XG4gICAgICBob3N0ICs9ICc6JyArIHRoaXMucG9ydDtcbiAgICB9XG4gIH1cblxuICBpZiAodGhpcy5xdWVyeSAmJlxuICAgICAgaXNPYmplY3QodGhpcy5xdWVyeSkgJiZcbiAgICAgIE9iamVjdC5rZXlzKHRoaXMucXVlcnkpLmxlbmd0aCkge1xuICAgIHF1ZXJ5ID0gcXVlcnlzdHJpbmcuc3RyaW5naWZ5KHRoaXMucXVlcnkpO1xuICB9XG5cbiAgdmFyIHNlYXJjaCA9IHRoaXMuc2VhcmNoIHx8IChxdWVyeSAmJiAoJz8nICsgcXVlcnkpKSB8fCAnJztcblxuICBpZiAocHJvdG9jb2wgJiYgcHJvdG9jb2wuc3Vic3RyKC0xKSAhPT0gJzonKSBwcm90b2NvbCArPSAnOic7XG5cbiAgLy8gb25seSB0aGUgc2xhc2hlZFByb3RvY29scyBnZXQgdGhlIC8vLiAgTm90IG1haWx0bzosIHhtcHA6LCBldGMuXG4gIC8vIHVubGVzcyB0aGV5IGhhZCB0aGVtIHRvIGJlZ2luIHdpdGguXG4gIGlmICh0aGlzLnNsYXNoZXMgfHxcbiAgICAgICghcHJvdG9jb2wgfHwgc2xhc2hlZFByb3RvY29sW3Byb3RvY29sXSkgJiYgaG9zdCAhPT0gZmFsc2UpIHtcbiAgICBob3N0ID0gJy8vJyArIChob3N0IHx8ICcnKTtcbiAgICBpZiAocGF0aG5hbWUgJiYgcGF0aG5hbWUuY2hhckF0KDApICE9PSAnLycpIHBhdGhuYW1lID0gJy8nICsgcGF0aG5hbWU7XG4gIH0gZWxzZSBpZiAoIWhvc3QpIHtcbiAgICBob3N0ID0gJyc7XG4gIH1cblxuICBpZiAoaGFzaCAmJiBoYXNoLmNoYXJBdCgwKSAhPT0gJyMnKSBoYXNoID0gJyMnICsgaGFzaDtcbiAgaWYgKHNlYXJjaCAmJiBzZWFyY2guY2hhckF0KDApICE9PSAnPycpIHNlYXJjaCA9ICc/JyArIHNlYXJjaDtcblxuICBwYXRobmFtZSA9IHBhdGhuYW1lLnJlcGxhY2UoL1s/I10vZywgZnVuY3Rpb24obWF0Y2gpIHtcbiAgICByZXR1cm4gZW5jb2RlVVJJQ29tcG9uZW50KG1hdGNoKTtcbiAgfSk7XG4gIHNlYXJjaCA9IHNlYXJjaC5yZXBsYWNlKCcjJywgJyUyMycpO1xuXG4gIHJldHVybiBwcm90b2NvbCArIGhvc3QgKyBwYXRobmFtZSArIHNlYXJjaCArIGhhc2g7XG59O1xuXG5mdW5jdGlvbiB1cmxSZXNvbHZlKHNvdXJjZSwgcmVsYXRpdmUpIHtcbiAgcmV0dXJuIHVybFBhcnNlKHNvdXJjZSwgZmFsc2UsIHRydWUpLnJlc29sdmUocmVsYXRpdmUpO1xufVxuXG5VcmwucHJvdG90eXBlLnJlc29sdmUgPSBmdW5jdGlvbihyZWxhdGl2ZSkge1xuICByZXR1cm4gdGhpcy5yZXNvbHZlT2JqZWN0KHVybFBhcnNlKHJlbGF0aXZlLCBmYWxzZSwgdHJ1ZSkpLmZvcm1hdCgpO1xufTtcblxuZnVuY3Rpb24gdXJsUmVzb2x2ZU9iamVjdChzb3VyY2UsIHJlbGF0aXZlKSB7XG4gIGlmICghc291cmNlKSByZXR1cm4gcmVsYXRpdmU7XG4gIHJldHVybiB1cmxQYXJzZShzb3VyY2UsIGZhbHNlLCB0cnVlKS5yZXNvbHZlT2JqZWN0KHJlbGF0aXZlKTtcbn1cblxuVXJsLnByb3RvdHlwZS5yZXNvbHZlT2JqZWN0ID0gZnVuY3Rpb24ocmVsYXRpdmUpIHtcbiAgaWYgKGlzU3RyaW5nKHJlbGF0aXZlKSkge1xuICAgIHZhciByZWwgPSBuZXcgVXJsKCk7XG4gICAgcmVsLnBhcnNlKHJlbGF0aXZlLCBmYWxzZSwgdHJ1ZSk7XG4gICAgcmVsYXRpdmUgPSByZWw7XG4gIH1cblxuICB2YXIgcmVzdWx0ID0gbmV3IFVybCgpO1xuICBPYmplY3Qua2V5cyh0aGlzKS5mb3JFYWNoKGZ1bmN0aW9uKGspIHtcbiAgICByZXN1bHRba10gPSB0aGlzW2tdO1xuICB9LCB0aGlzKTtcblxuICAvLyBoYXNoIGlzIGFsd2F5cyBvdmVycmlkZGVuLCBubyBtYXR0ZXIgd2hhdC5cbiAgLy8gZXZlbiBocmVmPVwiXCIgd2lsbCByZW1vdmUgaXQuXG4gIHJlc3VsdC5oYXNoID0gcmVsYXRpdmUuaGFzaDtcblxuICAvLyBpZiB0aGUgcmVsYXRpdmUgdXJsIGlzIGVtcHR5LCB0aGVuIHRoZXJlJ3Mgbm90aGluZyBsZWZ0IHRvIGRvIGhlcmUuXG4gIGlmIChyZWxhdGl2ZS5ocmVmID09PSAnJykge1xuICAgIHJlc3VsdC5ocmVmID0gcmVzdWx0LmZvcm1hdCgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvLyBocmVmcyBsaWtlIC8vZm9vL2JhciBhbHdheXMgY3V0IHRvIHRoZSBwcm90b2NvbC5cbiAgaWYgKHJlbGF0aXZlLnNsYXNoZXMgJiYgIXJlbGF0aXZlLnByb3RvY29sKSB7XG4gICAgLy8gdGFrZSBldmVyeXRoaW5nIGV4Y2VwdCB0aGUgcHJvdG9jb2wgZnJvbSByZWxhdGl2ZVxuICAgIE9iamVjdC5rZXlzKHJlbGF0aXZlKS5mb3JFYWNoKGZ1bmN0aW9uKGspIHtcbiAgICAgIGlmIChrICE9PSAncHJvdG9jb2wnKVxuICAgICAgICByZXN1bHRba10gPSByZWxhdGl2ZVtrXTtcbiAgICB9KTtcblxuICAgIC8vdXJsUGFyc2UgYXBwZW5kcyB0cmFpbGluZyAvIHRvIHVybHMgbGlrZSBodHRwOi8vd3d3LmV4YW1wbGUuY29tXG4gICAgaWYgKHNsYXNoZWRQcm90b2NvbFtyZXN1bHQucHJvdG9jb2xdICYmXG4gICAgICAgIHJlc3VsdC5ob3N0bmFtZSAmJiAhcmVzdWx0LnBhdGhuYW1lKSB7XG4gICAgICByZXN1bHQucGF0aCA9IHJlc3VsdC5wYXRobmFtZSA9ICcvJztcbiAgICB9XG5cbiAgICByZXN1bHQuaHJlZiA9IHJlc3VsdC5mb3JtYXQoKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgaWYgKHJlbGF0aXZlLnByb3RvY29sICYmIHJlbGF0aXZlLnByb3RvY29sICE9PSByZXN1bHQucHJvdG9jb2wpIHtcbiAgICAvLyBpZiBpdCdzIGEga25vd24gdXJsIHByb3RvY29sLCB0aGVuIGNoYW5naW5nXG4gICAgLy8gdGhlIHByb3RvY29sIGRvZXMgd2VpcmQgdGhpbmdzXG4gICAgLy8gZmlyc3QsIGlmIGl0J3Mgbm90IGZpbGU6LCB0aGVuIHdlIE1VU1QgaGF2ZSBhIGhvc3QsXG4gICAgLy8gYW5kIGlmIHRoZXJlIHdhcyBhIHBhdGhcbiAgICAvLyB0byBiZWdpbiB3aXRoLCB0aGVuIHdlIE1VU1QgaGF2ZSBhIHBhdGguXG4gICAgLy8gaWYgaXQgaXMgZmlsZTosIHRoZW4gdGhlIGhvc3QgaXMgZHJvcHBlZCxcbiAgICAvLyBiZWNhdXNlIHRoYXQncyBrbm93biB0byBiZSBob3N0bGVzcy5cbiAgICAvLyBhbnl0aGluZyBlbHNlIGlzIGFzc3VtZWQgdG8gYmUgYWJzb2x1dGUuXG4gICAgaWYgKCFzbGFzaGVkUHJvdG9jb2xbcmVsYXRpdmUucHJvdG9jb2xdKSB7XG4gICAgICBPYmplY3Qua2V5cyhyZWxhdGl2ZSkuZm9yRWFjaChmdW5jdGlvbihrKSB7XG4gICAgICAgIHJlc3VsdFtrXSA9IHJlbGF0aXZlW2tdO1xuICAgICAgfSk7XG4gICAgICByZXN1bHQuaHJlZiA9IHJlc3VsdC5mb3JtYXQoKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgcmVzdWx0LnByb3RvY29sID0gcmVsYXRpdmUucHJvdG9jb2w7XG4gICAgaWYgKCFyZWxhdGl2ZS5ob3N0ICYmICFob3N0bGVzc1Byb3RvY29sW3JlbGF0aXZlLnByb3RvY29sXSkge1xuICAgICAgdmFyIHJlbFBhdGggPSAocmVsYXRpdmUucGF0aG5hbWUgfHwgJycpLnNwbGl0KCcvJyk7XG4gICAgICB3aGlsZSAocmVsUGF0aC5sZW5ndGggJiYgIShyZWxhdGl2ZS5ob3N0ID0gcmVsUGF0aC5zaGlmdCgpKSk7XG4gICAgICBpZiAoIXJlbGF0aXZlLmhvc3QpIHJlbGF0aXZlLmhvc3QgPSAnJztcbiAgICAgIGlmICghcmVsYXRpdmUuaG9zdG5hbWUpIHJlbGF0aXZlLmhvc3RuYW1lID0gJyc7XG4gICAgICBpZiAocmVsUGF0aFswXSAhPT0gJycpIHJlbFBhdGgudW5zaGlmdCgnJyk7XG4gICAgICBpZiAocmVsUGF0aC5sZW5ndGggPCAyKSByZWxQYXRoLnVuc2hpZnQoJycpO1xuICAgICAgcmVzdWx0LnBhdGhuYW1lID0gcmVsUGF0aC5qb2luKCcvJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdC5wYXRobmFtZSA9IHJlbGF0aXZlLnBhdGhuYW1lO1xuICAgIH1cbiAgICByZXN1bHQuc2VhcmNoID0gcmVsYXRpdmUuc2VhcmNoO1xuICAgIHJlc3VsdC5xdWVyeSA9IHJlbGF0aXZlLnF1ZXJ5O1xuICAgIHJlc3VsdC5ob3N0ID0gcmVsYXRpdmUuaG9zdCB8fCAnJztcbiAgICByZXN1bHQuYXV0aCA9IHJlbGF0aXZlLmF1dGg7XG4gICAgcmVzdWx0Lmhvc3RuYW1lID0gcmVsYXRpdmUuaG9zdG5hbWUgfHwgcmVsYXRpdmUuaG9zdDtcbiAgICByZXN1bHQucG9ydCA9IHJlbGF0aXZlLnBvcnQ7XG4gICAgLy8gdG8gc3VwcG9ydCBodHRwLnJlcXVlc3RcbiAgICBpZiAocmVzdWx0LnBhdGhuYW1lIHx8IHJlc3VsdC5zZWFyY2gpIHtcbiAgICAgIHZhciBwID0gcmVzdWx0LnBhdGhuYW1lIHx8ICcnO1xuICAgICAgdmFyIHMgPSByZXN1bHQuc2VhcmNoIHx8ICcnO1xuICAgICAgcmVzdWx0LnBhdGggPSBwICsgcztcbiAgICB9XG4gICAgcmVzdWx0LnNsYXNoZXMgPSByZXN1bHQuc2xhc2hlcyB8fCByZWxhdGl2ZS5zbGFzaGVzO1xuICAgIHJlc3VsdC5ocmVmID0gcmVzdWx0LmZvcm1hdCgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICB2YXIgaXNTb3VyY2VBYnMgPSAocmVzdWx0LnBhdGhuYW1lICYmIHJlc3VsdC5wYXRobmFtZS5jaGFyQXQoMCkgPT09ICcvJyksXG4gICAgICBpc1JlbEFicyA9IChcbiAgICAgICAgICByZWxhdGl2ZS5ob3N0IHx8XG4gICAgICAgICAgcmVsYXRpdmUucGF0aG5hbWUgJiYgcmVsYXRpdmUucGF0aG5hbWUuY2hhckF0KDApID09PSAnLydcbiAgICAgICksXG4gICAgICBtdXN0RW5kQWJzID0gKGlzUmVsQWJzIHx8IGlzU291cmNlQWJzIHx8XG4gICAgICAgICAgICAgICAgICAgIChyZXN1bHQuaG9zdCAmJiByZWxhdGl2ZS5wYXRobmFtZSkpLFxuICAgICAgcmVtb3ZlQWxsRG90cyA9IG11c3RFbmRBYnMsXG4gICAgICBzcmNQYXRoID0gcmVzdWx0LnBhdGhuYW1lICYmIHJlc3VsdC5wYXRobmFtZS5zcGxpdCgnLycpIHx8IFtdLFxuICAgICAgcmVsUGF0aCA9IHJlbGF0aXZlLnBhdGhuYW1lICYmIHJlbGF0aXZlLnBhdGhuYW1lLnNwbGl0KCcvJykgfHwgW10sXG4gICAgICBwc3ljaG90aWMgPSByZXN1bHQucHJvdG9jb2wgJiYgIXNsYXNoZWRQcm90b2NvbFtyZXN1bHQucHJvdG9jb2xdO1xuXG4gIC8vIGlmIHRoZSB1cmwgaXMgYSBub24tc2xhc2hlZCB1cmwsIHRoZW4gcmVsYXRpdmVcbiAgLy8gbGlua3MgbGlrZSAuLi8uLiBzaG91bGQgYmUgYWJsZVxuICAvLyB0byBjcmF3bCB1cCB0byB0aGUgaG9zdG5hbWUsIGFzIHdlbGwuICBUaGlzIGlzIHN0cmFuZ2UuXG4gIC8vIHJlc3VsdC5wcm90b2NvbCBoYXMgYWxyZWFkeSBiZWVuIHNldCBieSBub3cuXG4gIC8vIExhdGVyIG9uLCBwdXQgdGhlIGZpcnN0IHBhdGggcGFydCBpbnRvIHRoZSBob3N0IGZpZWxkLlxuICBpZiAocHN5Y2hvdGljKSB7XG4gICAgcmVzdWx0Lmhvc3RuYW1lID0gJyc7XG4gICAgcmVzdWx0LnBvcnQgPSBudWxsO1xuICAgIGlmIChyZXN1bHQuaG9zdCkge1xuICAgICAgaWYgKHNyY1BhdGhbMF0gPT09ICcnKSBzcmNQYXRoWzBdID0gcmVzdWx0Lmhvc3Q7XG4gICAgICBlbHNlIHNyY1BhdGgudW5zaGlmdChyZXN1bHQuaG9zdCk7XG4gICAgfVxuICAgIHJlc3VsdC5ob3N0ID0gJyc7XG4gICAgaWYgKHJlbGF0aXZlLnByb3RvY29sKSB7XG4gICAgICByZWxhdGl2ZS5ob3N0bmFtZSA9IG51bGw7XG4gICAgICByZWxhdGl2ZS5wb3J0ID0gbnVsbDtcbiAgICAgIGlmIChyZWxhdGl2ZS5ob3N0KSB7XG4gICAgICAgIGlmIChyZWxQYXRoWzBdID09PSAnJykgcmVsUGF0aFswXSA9IHJlbGF0aXZlLmhvc3Q7XG4gICAgICAgIGVsc2UgcmVsUGF0aC51bnNoaWZ0KHJlbGF0aXZlLmhvc3QpO1xuICAgICAgfVxuICAgICAgcmVsYXRpdmUuaG9zdCA9IG51bGw7XG4gICAgfVxuICAgIG11c3RFbmRBYnMgPSBtdXN0RW5kQWJzICYmIChyZWxQYXRoWzBdID09PSAnJyB8fCBzcmNQYXRoWzBdID09PSAnJyk7XG4gIH1cblxuICBpZiAoaXNSZWxBYnMpIHtcbiAgICAvLyBpdCdzIGFic29sdXRlLlxuICAgIHJlc3VsdC5ob3N0ID0gKHJlbGF0aXZlLmhvc3QgfHwgcmVsYXRpdmUuaG9zdCA9PT0gJycpID9cbiAgICAgICAgICAgICAgICAgIHJlbGF0aXZlLmhvc3QgOiByZXN1bHQuaG9zdDtcbiAgICByZXN1bHQuaG9zdG5hbWUgPSAocmVsYXRpdmUuaG9zdG5hbWUgfHwgcmVsYXRpdmUuaG9zdG5hbWUgPT09ICcnKSA/XG4gICAgICAgICAgICAgICAgICAgICAgcmVsYXRpdmUuaG9zdG5hbWUgOiByZXN1bHQuaG9zdG5hbWU7XG4gICAgcmVzdWx0LnNlYXJjaCA9IHJlbGF0aXZlLnNlYXJjaDtcbiAgICByZXN1bHQucXVlcnkgPSByZWxhdGl2ZS5xdWVyeTtcbiAgICBzcmNQYXRoID0gcmVsUGF0aDtcbiAgICAvLyBmYWxsIHRocm91Z2ggdG8gdGhlIGRvdC1oYW5kbGluZyBiZWxvdy5cbiAgfSBlbHNlIGlmIChyZWxQYXRoLmxlbmd0aCkge1xuICAgIC8vIGl0J3MgcmVsYXRpdmVcbiAgICAvLyB0aHJvdyBhd2F5IHRoZSBleGlzdGluZyBmaWxlLCBhbmQgdGFrZSB0aGUgbmV3IHBhdGggaW5zdGVhZC5cbiAgICBpZiAoIXNyY1BhdGgpIHNyY1BhdGggPSBbXTtcbiAgICBzcmNQYXRoLnBvcCgpO1xuICAgIHNyY1BhdGggPSBzcmNQYXRoLmNvbmNhdChyZWxQYXRoKTtcbiAgICByZXN1bHQuc2VhcmNoID0gcmVsYXRpdmUuc2VhcmNoO1xuICAgIHJlc3VsdC5xdWVyeSA9IHJlbGF0aXZlLnF1ZXJ5O1xuICB9IGVsc2UgaWYgKCFpc051bGxPclVuZGVmaW5lZChyZWxhdGl2ZS5zZWFyY2gpKSB7XG4gICAgLy8ganVzdCBwdWxsIG91dCB0aGUgc2VhcmNoLlxuICAgIC8vIGxpa2UgaHJlZj0nP2ZvbycuXG4gICAgLy8gUHV0IHRoaXMgYWZ0ZXIgdGhlIG90aGVyIHR3byBjYXNlcyBiZWNhdXNlIGl0IHNpbXBsaWZpZXMgdGhlIGJvb2xlYW5zXG4gICAgaWYgKHBzeWNob3RpYykge1xuICAgICAgcmVzdWx0Lmhvc3RuYW1lID0gcmVzdWx0Lmhvc3QgPSBzcmNQYXRoLnNoaWZ0KCk7XG4gICAgICAvL29jY2F0aW9uYWx5IHRoZSBhdXRoIGNhbiBnZXQgc3R1Y2sgb25seSBpbiBob3N0XG4gICAgICAvL3RoaXMgZXNwZWNpYWx5IGhhcHBlbnMgaW4gY2FzZXMgbGlrZVxuICAgICAgLy91cmwucmVzb2x2ZU9iamVjdCgnbWFpbHRvOmxvY2FsMUBkb21haW4xJywgJ2xvY2FsMkBkb21haW4yJylcbiAgICAgIHZhciBhdXRoSW5Ib3N0ID0gcmVzdWx0Lmhvc3QgJiYgcmVzdWx0Lmhvc3QuaW5kZXhPZignQCcpID4gMCA/XG4gICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5ob3N0LnNwbGl0KCdAJykgOiBmYWxzZTtcbiAgICAgIGlmIChhdXRoSW5Ib3N0KSB7XG4gICAgICAgIHJlc3VsdC5hdXRoID0gYXV0aEluSG9zdC5zaGlmdCgpO1xuICAgICAgICByZXN1bHQuaG9zdCA9IHJlc3VsdC5ob3N0bmFtZSA9IGF1dGhJbkhvc3Quc2hpZnQoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmVzdWx0LnNlYXJjaCA9IHJlbGF0aXZlLnNlYXJjaDtcbiAgICByZXN1bHQucXVlcnkgPSByZWxhdGl2ZS5xdWVyeTtcbiAgICAvL3RvIHN1cHBvcnQgaHR0cC5yZXF1ZXN0XG4gICAgaWYgKCFpc051bGwocmVzdWx0LnBhdGhuYW1lKSB8fCAhaXNOdWxsKHJlc3VsdC5zZWFyY2gpKSB7XG4gICAgICByZXN1bHQucGF0aCA9IChyZXN1bHQucGF0aG5hbWUgPyByZXN1bHQucGF0aG5hbWUgOiAnJykgK1xuICAgICAgICAgICAgICAgICAgICAocmVzdWx0LnNlYXJjaCA/IHJlc3VsdC5zZWFyY2ggOiAnJyk7XG4gICAgfVxuICAgIHJlc3VsdC5ocmVmID0gcmVzdWx0LmZvcm1hdCgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBpZiAoIXNyY1BhdGgubGVuZ3RoKSB7XG4gICAgLy8gbm8gcGF0aCBhdCBhbGwuICBlYXN5LlxuICAgIC8vIHdlJ3ZlIGFscmVhZHkgaGFuZGxlZCB0aGUgb3RoZXIgc3R1ZmYgYWJvdmUuXG4gICAgcmVzdWx0LnBhdGhuYW1lID0gbnVsbDtcbiAgICAvL3RvIHN1cHBvcnQgaHR0cC5yZXF1ZXN0XG4gICAgaWYgKHJlc3VsdC5zZWFyY2gpIHtcbiAgICAgIHJlc3VsdC5wYXRoID0gJy8nICsgcmVzdWx0LnNlYXJjaDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0LnBhdGggPSBudWxsO1xuICAgIH1cbiAgICByZXN1bHQuaHJlZiA9IHJlc3VsdC5mb3JtYXQoKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLy8gaWYgYSB1cmwgRU5EcyBpbiAuIG9yIC4uLCB0aGVuIGl0IG11c3QgZ2V0IGEgdHJhaWxpbmcgc2xhc2guXG4gIC8vIGhvd2V2ZXIsIGlmIGl0IGVuZHMgaW4gYW55dGhpbmcgZWxzZSBub24tc2xhc2h5LFxuICAvLyB0aGVuIGl0IG11c3QgTk9UIGdldCBhIHRyYWlsaW5nIHNsYXNoLlxuICB2YXIgbGFzdCA9IHNyY1BhdGguc2xpY2UoLTEpWzBdO1xuICB2YXIgaGFzVHJhaWxpbmdTbGFzaCA9IChcbiAgICAgIChyZXN1bHQuaG9zdCB8fCByZWxhdGl2ZS5ob3N0KSAmJiAobGFzdCA9PT0gJy4nIHx8IGxhc3QgPT09ICcuLicpIHx8XG4gICAgICBsYXN0ID09PSAnJyk7XG5cbiAgLy8gc3RyaXAgc2luZ2xlIGRvdHMsIHJlc29sdmUgZG91YmxlIGRvdHMgdG8gcGFyZW50IGRpclxuICAvLyBpZiB0aGUgcGF0aCB0cmllcyB0byBnbyBhYm92ZSB0aGUgcm9vdCwgYHVwYCBlbmRzIHVwID4gMFxuICB2YXIgdXAgPSAwO1xuICBmb3IgKHZhciBpID0gc3JjUGF0aC5sZW5ndGg7IGkgPj0gMDsgaS0tKSB7XG4gICAgbGFzdCA9IHNyY1BhdGhbaV07XG4gICAgaWYgKGxhc3QgPT0gJy4nKSB7XG4gICAgICBzcmNQYXRoLnNwbGljZShpLCAxKTtcbiAgICB9IGVsc2UgaWYgKGxhc3QgPT09ICcuLicpIHtcbiAgICAgIHNyY1BhdGguc3BsaWNlKGksIDEpO1xuICAgICAgdXArKztcbiAgICB9IGVsc2UgaWYgKHVwKSB7XG4gICAgICBzcmNQYXRoLnNwbGljZShpLCAxKTtcbiAgICAgIHVwLS07XG4gICAgfVxuICB9XG5cbiAgLy8gaWYgdGhlIHBhdGggaXMgYWxsb3dlZCB0byBnbyBhYm92ZSB0aGUgcm9vdCwgcmVzdG9yZSBsZWFkaW5nIC4uc1xuICBpZiAoIW11c3RFbmRBYnMgJiYgIXJlbW92ZUFsbERvdHMpIHtcbiAgICBmb3IgKDsgdXAtLTsgdXApIHtcbiAgICAgIHNyY1BhdGgudW5zaGlmdCgnLi4nKTtcbiAgICB9XG4gIH1cblxuICBpZiAobXVzdEVuZEFicyAmJiBzcmNQYXRoWzBdICE9PSAnJyAmJlxuICAgICAgKCFzcmNQYXRoWzBdIHx8IHNyY1BhdGhbMF0uY2hhckF0KDApICE9PSAnLycpKSB7XG4gICAgc3JjUGF0aC51bnNoaWZ0KCcnKTtcbiAgfVxuXG4gIGlmIChoYXNUcmFpbGluZ1NsYXNoICYmIChzcmNQYXRoLmpvaW4oJy8nKS5zdWJzdHIoLTEpICE9PSAnLycpKSB7XG4gICAgc3JjUGF0aC5wdXNoKCcnKTtcbiAgfVxuXG4gIHZhciBpc0Fic29sdXRlID0gc3JjUGF0aFswXSA9PT0gJycgfHxcbiAgICAgIChzcmNQYXRoWzBdICYmIHNyY1BhdGhbMF0uY2hhckF0KDApID09PSAnLycpO1xuXG4gIC8vIHB1dCB0aGUgaG9zdCBiYWNrXG4gIGlmIChwc3ljaG90aWMpIHtcbiAgICByZXN1bHQuaG9zdG5hbWUgPSByZXN1bHQuaG9zdCA9IGlzQWJzb2x1dGUgPyAnJyA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcmNQYXRoLmxlbmd0aCA/IHNyY1BhdGguc2hpZnQoKSA6ICcnO1xuICAgIC8vb2NjYXRpb25hbHkgdGhlIGF1dGggY2FuIGdldCBzdHVjayBvbmx5IGluIGhvc3RcbiAgICAvL3RoaXMgZXNwZWNpYWx5IGhhcHBlbnMgaW4gY2FzZXMgbGlrZVxuICAgIC8vdXJsLnJlc29sdmVPYmplY3QoJ21haWx0bzpsb2NhbDFAZG9tYWluMScsICdsb2NhbDJAZG9tYWluMicpXG4gICAgdmFyIGF1dGhJbkhvc3QgPSByZXN1bHQuaG9zdCAmJiByZXN1bHQuaG9zdC5pbmRleE9mKCdAJykgPiAwID9cbiAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5ob3N0LnNwbGl0KCdAJykgOiBmYWxzZTtcbiAgICBpZiAoYXV0aEluSG9zdCkge1xuICAgICAgcmVzdWx0LmF1dGggPSBhdXRoSW5Ib3N0LnNoaWZ0KCk7XG4gICAgICByZXN1bHQuaG9zdCA9IHJlc3VsdC5ob3N0bmFtZSA9IGF1dGhJbkhvc3Quc2hpZnQoKTtcbiAgICB9XG4gIH1cblxuICBtdXN0RW5kQWJzID0gbXVzdEVuZEFicyB8fCAocmVzdWx0Lmhvc3QgJiYgc3JjUGF0aC5sZW5ndGgpO1xuXG4gIGlmIChtdXN0RW5kQWJzICYmICFpc0Fic29sdXRlKSB7XG4gICAgc3JjUGF0aC51bnNoaWZ0KCcnKTtcbiAgfVxuXG4gIGlmICghc3JjUGF0aC5sZW5ndGgpIHtcbiAgICByZXN1bHQucGF0aG5hbWUgPSBudWxsO1xuICAgIHJlc3VsdC5wYXRoID0gbnVsbDtcbiAgfSBlbHNlIHtcbiAgICByZXN1bHQucGF0aG5hbWUgPSBzcmNQYXRoLmpvaW4oJy8nKTtcbiAgfVxuXG4gIC8vdG8gc3VwcG9ydCByZXF1ZXN0Lmh0dHBcbiAgaWYgKCFpc051bGwocmVzdWx0LnBhdGhuYW1lKSB8fCAhaXNOdWxsKHJlc3VsdC5zZWFyY2gpKSB7XG4gICAgcmVzdWx0LnBhdGggPSAocmVzdWx0LnBhdGhuYW1lID8gcmVzdWx0LnBhdGhuYW1lIDogJycpICtcbiAgICAgICAgICAgICAgICAgIChyZXN1bHQuc2VhcmNoID8gcmVzdWx0LnNlYXJjaCA6ICcnKTtcbiAgfVxuICByZXN1bHQuYXV0aCA9IHJlbGF0aXZlLmF1dGggfHwgcmVzdWx0LmF1dGg7XG4gIHJlc3VsdC5zbGFzaGVzID0gcmVzdWx0LnNsYXNoZXMgfHwgcmVsYXRpdmUuc2xhc2hlcztcbiAgcmVzdWx0LmhyZWYgPSByZXN1bHQuZm9ybWF0KCk7XG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG5VcmwucHJvdG90eXBlLnBhcnNlSG9zdCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgaG9zdCA9IHRoaXMuaG9zdDtcbiAgdmFyIHBvcnQgPSBwb3J0UGF0dGVybi5leGVjKGhvc3QpO1xuICBpZiAocG9ydCkge1xuICAgIHBvcnQgPSBwb3J0WzBdO1xuICAgIGlmIChwb3J0ICE9PSAnOicpIHtcbiAgICAgIHRoaXMucG9ydCA9IHBvcnQuc3Vic3RyKDEpO1xuICAgIH1cbiAgICBob3N0ID0gaG9zdC5zdWJzdHIoMCwgaG9zdC5sZW5ndGggLSBwb3J0Lmxlbmd0aCk7XG4gIH1cbiAgaWYgKGhvc3QpIHRoaXMuaG9zdG5hbWUgPSBob3N0O1xufTtcblxuZnVuY3Rpb24gaXNTdHJpbmcoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSBcInN0cmluZ1wiO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNOdWxsKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsO1xufVxuZnVuY3Rpb24gaXNOdWxsT3JVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiAgYXJnID09IG51bGw7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQnVmZmVyKGFyZykge1xuICByZXR1cm4gYXJnICYmIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnXG4gICAgJiYgdHlwZW9mIGFyZy5jb3B5ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5maWxsID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5yZWFkVUludDggPT09ICdmdW5jdGlvbic7XG59IiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciBmb3JtYXRSZWdFeHAgPSAvJVtzZGolXS9nO1xuZXhwb3J0cy5mb3JtYXQgPSBmdW5jdGlvbihmKSB7XG4gIGlmICghaXNTdHJpbmcoZikpIHtcbiAgICB2YXIgb2JqZWN0cyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBvYmplY3RzLnB1c2goaW5zcGVjdChhcmd1bWVudHNbaV0pKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdHMuam9pbignICcpO1xuICB9XG5cbiAgdmFyIGkgPSAxO1xuICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgdmFyIGxlbiA9IGFyZ3MubGVuZ3RoO1xuICB2YXIgc3RyID0gU3RyaW5nKGYpLnJlcGxhY2UoZm9ybWF0UmVnRXhwLCBmdW5jdGlvbih4KSB7XG4gICAgaWYgKHggPT09ICclJScpIHJldHVybiAnJSc7XG4gICAgaWYgKGkgPj0gbGVuKSByZXR1cm4geDtcbiAgICBzd2l0Y2ggKHgpIHtcbiAgICAgIGNhc2UgJyVzJzogcmV0dXJuIFN0cmluZyhhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWQnOiByZXR1cm4gTnVtYmVyKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclaic6XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGFyZ3NbaSsrXSk7XG4gICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICByZXR1cm4gJ1tDaXJjdWxhcl0nO1xuICAgICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4geDtcbiAgICB9XG4gIH0pO1xuICBmb3IgKHZhciB4ID0gYXJnc1tpXTsgaSA8IGxlbjsgeCA9IGFyZ3NbKytpXSkge1xuICAgIGlmIChpc051bGwoeCkgfHwgIWlzT2JqZWN0KHgpKSB7XG4gICAgICBzdHIgKz0gJyAnICsgeDtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyICs9ICcgJyArIGluc3BlY3QoeCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG5cbi8vIE1hcmsgdGhhdCBhIG1ldGhvZCBzaG91bGQgbm90IGJlIHVzZWQuXG4vLyBSZXR1cm5zIGEgbW9kaWZpZWQgZnVuY3Rpb24gd2hpY2ggd2FybnMgb25jZSBieSBkZWZhdWx0LlxuLy8gSWYgLS1uby1kZXByZWNhdGlvbiBpcyBzZXQsIHRoZW4gaXQgaXMgYSBuby1vcC5cbmV4cG9ydHMuZGVwcmVjYXRlID0gZnVuY3Rpb24oZm4sIG1zZykge1xuICAvLyBBbGxvdyBmb3IgZGVwcmVjYXRpbmcgdGhpbmdzIGluIHRoZSBwcm9jZXNzIG9mIHN0YXJ0aW5nIHVwLlxuICBpZiAoaXNVbmRlZmluZWQoZ2xvYmFsLnByb2Nlc3MpKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGV4cG9ydHMuZGVwcmVjYXRlKGZuLCBtc2cpLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfVxuXG4gIGlmIChwcm9jZXNzLm5vRGVwcmVjYXRpb24gPT09IHRydWUpIHtcbiAgICByZXR1cm4gZm47XG4gIH1cblxuICB2YXIgd2FybmVkID0gZmFsc2U7XG4gIGZ1bmN0aW9uIGRlcHJlY2F0ZWQoKSB7XG4gICAgaWYgKCF3YXJuZWQpIHtcbiAgICAgIGlmIChwcm9jZXNzLnRocm93RGVwcmVjYXRpb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgICB9IGVsc2UgaWYgKHByb2Nlc3MudHJhY2VEZXByZWNhdGlvbikge1xuICAgICAgICBjb25zb2xlLnRyYWNlKG1zZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKG1zZyk7XG4gICAgICB9XG4gICAgICB3YXJuZWQgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIHJldHVybiBkZXByZWNhdGVkO1xufTtcblxuXG52YXIgZGVidWdzID0ge307XG52YXIgZGVidWdFbnZpcm9uO1xuZXhwb3J0cy5kZWJ1Z2xvZyA9IGZ1bmN0aW9uKHNldCkge1xuICBpZiAoaXNVbmRlZmluZWQoZGVidWdFbnZpcm9uKSlcbiAgICBkZWJ1Z0Vudmlyb24gPSBwcm9jZXNzLmVudi5OT0RFX0RFQlVHIHx8ICcnO1xuICBzZXQgPSBzZXQudG9VcHBlckNhc2UoKTtcbiAgaWYgKCFkZWJ1Z3Nbc2V0XSkge1xuICAgIGlmIChuZXcgUmVnRXhwKCdcXFxcYicgKyBzZXQgKyAnXFxcXGInLCAnaScpLnRlc3QoZGVidWdFbnZpcm9uKSkge1xuICAgICAgdmFyIHBpZCA9IHByb2Nlc3MucGlkO1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG1zZyA9IGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJyVzICVkOiAlcycsIHNldCwgcGlkLCBtc2cpO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHt9O1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVidWdzW3NldF07XG59O1xuXG5cbi8qKlxuICogRWNob3MgdGhlIHZhbHVlIG9mIGEgdmFsdWUuIFRyeXMgdG8gcHJpbnQgdGhlIHZhbHVlIG91dFxuICogaW4gdGhlIGJlc3Qgd2F5IHBvc3NpYmxlIGdpdmVuIHRoZSBkaWZmZXJlbnQgdHlwZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgb2JqZWN0IHRvIHByaW50IG91dC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIG9wdGlvbnMgb2JqZWN0IHRoYXQgYWx0ZXJzIHRoZSBvdXRwdXQuXG4gKi9cbi8qIGxlZ2FjeTogb2JqLCBzaG93SGlkZGVuLCBkZXB0aCwgY29sb3JzKi9cbmZ1bmN0aW9uIGluc3BlY3Qob2JqLCBvcHRzKSB7XG4gIC8vIGRlZmF1bHQgb3B0aW9uc1xuICB2YXIgY3R4ID0ge1xuICAgIHNlZW46IFtdLFxuICAgIHN0eWxpemU6IHN0eWxpemVOb0NvbG9yXG4gIH07XG4gIC8vIGxlZ2FjeS4uLlxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSAzKSBjdHguZGVwdGggPSBhcmd1bWVudHNbMl07XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDQpIGN0eC5jb2xvcnMgPSBhcmd1bWVudHNbM107XG4gIGlmIChpc0Jvb2xlYW4ob3B0cykpIHtcbiAgICAvLyBsZWdhY3kuLi5cbiAgICBjdHguc2hvd0hpZGRlbiA9IG9wdHM7XG4gIH0gZWxzZSBpZiAob3B0cykge1xuICAgIC8vIGdvdCBhbiBcIm9wdGlvbnNcIiBvYmplY3RcbiAgICBleHBvcnRzLl9leHRlbmQoY3R4LCBvcHRzKTtcbiAgfVxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmIChpc1VuZGVmaW5lZChjdHguc2hvd0hpZGRlbikpIGN0eC5zaG93SGlkZGVuID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguZGVwdGgpKSBjdHguZGVwdGggPSAyO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmNvbG9ycykpIGN0eC5jb2xvcnMgPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jdXN0b21JbnNwZWN0KSkgY3R4LmN1c3RvbUluc3BlY3QgPSB0cnVlO1xuICBpZiAoY3R4LmNvbG9ycykgY3R4LnN0eWxpemUgPSBzdHlsaXplV2l0aENvbG9yO1xuICByZXR1cm4gZm9ybWF0VmFsdWUoY3R4LCBvYmosIGN0eC5kZXB0aCk7XG59XG5leHBvcnRzLmluc3BlY3QgPSBpbnNwZWN0O1xuXG5cbi8vIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQU5TSV9lc2NhcGVfY29kZSNncmFwaGljc1xuaW5zcGVjdC5jb2xvcnMgPSB7XG4gICdib2xkJyA6IFsxLCAyMl0sXG4gICdpdGFsaWMnIDogWzMsIDIzXSxcbiAgJ3VuZGVybGluZScgOiBbNCwgMjRdLFxuICAnaW52ZXJzZScgOiBbNywgMjddLFxuICAnd2hpdGUnIDogWzM3LCAzOV0sXG4gICdncmV5JyA6IFs5MCwgMzldLFxuICAnYmxhY2snIDogWzMwLCAzOV0sXG4gICdibHVlJyA6IFszNCwgMzldLFxuICAnY3lhbicgOiBbMzYsIDM5XSxcbiAgJ2dyZWVuJyA6IFszMiwgMzldLFxuICAnbWFnZW50YScgOiBbMzUsIDM5XSxcbiAgJ3JlZCcgOiBbMzEsIDM5XSxcbiAgJ3llbGxvdycgOiBbMzMsIDM5XVxufTtcblxuLy8gRG9uJ3QgdXNlICdibHVlJyBub3QgdmlzaWJsZSBvbiBjbWQuZXhlXG5pbnNwZWN0LnN0eWxlcyA9IHtcbiAgJ3NwZWNpYWwnOiAnY3lhbicsXG4gICdudW1iZXInOiAneWVsbG93JyxcbiAgJ2Jvb2xlYW4nOiAneWVsbG93JyxcbiAgJ3VuZGVmaW5lZCc6ICdncmV5JyxcbiAgJ251bGwnOiAnYm9sZCcsXG4gICdzdHJpbmcnOiAnZ3JlZW4nLFxuICAnZGF0ZSc6ICdtYWdlbnRhJyxcbiAgLy8gXCJuYW1lXCI6IGludGVudGlvbmFsbHkgbm90IHN0eWxpbmdcbiAgJ3JlZ2V4cCc6ICdyZWQnXG59O1xuXG5cbmZ1bmN0aW9uIHN0eWxpemVXaXRoQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgdmFyIHN0eWxlID0gaW5zcGVjdC5zdHlsZXNbc3R5bGVUeXBlXTtcblxuICBpZiAoc3R5bGUpIHtcbiAgICByZXR1cm4gJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVswXSArICdtJyArIHN0ciArXG4gICAgICAgICAgICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMV0gKyAnbSc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHN0eWxpemVOb0NvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHJldHVybiBzdHI7XG59XG5cblxuZnVuY3Rpb24gYXJyYXlUb0hhc2goYXJyYXkpIHtcbiAgdmFyIGhhc2ggPSB7fTtcblxuICBhcnJheS5mb3JFYWNoKGZ1bmN0aW9uKHZhbCwgaWR4KSB7XG4gICAgaGFzaFt2YWxdID0gdHJ1ZTtcbiAgfSk7XG5cbiAgcmV0dXJuIGhhc2g7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0VmFsdWUoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzKSB7XG4gIC8vIFByb3ZpZGUgYSBob29rIGZvciB1c2VyLXNwZWNpZmllZCBpbnNwZWN0IGZ1bmN0aW9ucy5cbiAgLy8gQ2hlY2sgdGhhdCB2YWx1ZSBpcyBhbiBvYmplY3Qgd2l0aCBhbiBpbnNwZWN0IGZ1bmN0aW9uIG9uIGl0XG4gIGlmIChjdHguY3VzdG9tSW5zcGVjdCAmJlxuICAgICAgdmFsdWUgJiZcbiAgICAgIGlzRnVuY3Rpb24odmFsdWUuaW5zcGVjdCkgJiZcbiAgICAgIC8vIEZpbHRlciBvdXQgdGhlIHV0aWwgbW9kdWxlLCBpdCdzIGluc3BlY3QgZnVuY3Rpb24gaXMgc3BlY2lhbFxuICAgICAgdmFsdWUuaW5zcGVjdCAhPT0gZXhwb3J0cy5pbnNwZWN0ICYmXG4gICAgICAvLyBBbHNvIGZpbHRlciBvdXQgYW55IHByb3RvdHlwZSBvYmplY3RzIHVzaW5nIHRoZSBjaXJjdWxhciBjaGVjay5cbiAgICAgICEodmFsdWUuY29uc3RydWN0b3IgJiYgdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlID09PSB2YWx1ZSkpIHtcbiAgICB2YXIgcmV0ID0gdmFsdWUuaW5zcGVjdChyZWN1cnNlVGltZXMsIGN0eCk7XG4gICAgaWYgKCFpc1N0cmluZyhyZXQpKSB7XG4gICAgICByZXQgPSBmb3JtYXRWYWx1ZShjdHgsIHJldCwgcmVjdXJzZVRpbWVzKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIC8vIFByaW1pdGl2ZSB0eXBlcyBjYW5ub3QgaGF2ZSBwcm9wZXJ0aWVzXG4gIHZhciBwcmltaXRpdmUgPSBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSk7XG4gIGlmIChwcmltaXRpdmUpIHtcbiAgICByZXR1cm4gcHJpbWl0aXZlO1xuICB9XG5cbiAgLy8gTG9vayB1cCB0aGUga2V5cyBvZiB0aGUgb2JqZWN0LlxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlKTtcbiAgdmFyIHZpc2libGVLZXlzID0gYXJyYXlUb0hhc2goa2V5cyk7XG5cbiAgaWYgKGN0eC5zaG93SGlkZGVuKSB7XG4gICAga2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHZhbHVlKTtcbiAgfVxuXG4gIC8vIElFIGRvZXNuJ3QgbWFrZSBlcnJvciBmaWVsZHMgbm9uLWVudW1lcmFibGVcbiAgLy8gaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L2llL2R3dzUyc2J0KHY9dnMuOTQpLmFzcHhcbiAgaWYgKGlzRXJyb3IodmFsdWUpXG4gICAgICAmJiAoa2V5cy5pbmRleE9mKCdtZXNzYWdlJykgPj0gMCB8fCBrZXlzLmluZGV4T2YoJ2Rlc2NyaXB0aW9uJykgPj0gMCkpIHtcbiAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgLy8gU29tZSB0eXBlIG9mIG9iamVjdCB3aXRob3V0IHByb3BlcnRpZXMgY2FuIGJlIHNob3J0Y3V0dGVkLlxuICBpZiAoa2V5cy5sZW5ndGggPT09IDApIHtcbiAgICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgIHZhciBuYW1lID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tGdW5jdGlvbicgKyBuYW1lICsgJ10nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH1cbiAgICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKERhdGUucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAnZGF0ZScpO1xuICAgIH1cbiAgICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGJhc2UgPSAnJywgYXJyYXkgPSBmYWxzZSwgYnJhY2VzID0gWyd7JywgJ30nXTtcblxuICAvLyBNYWtlIEFycmF5IHNheSB0aGF0IHRoZXkgYXJlIEFycmF5XG4gIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgIGFycmF5ID0gdHJ1ZTtcbiAgICBicmFjZXMgPSBbJ1snLCAnXSddO1xuICB9XG5cbiAgLy8gTWFrZSBmdW5jdGlvbnMgc2F5IHRoYXQgdGhleSBhcmUgZnVuY3Rpb25zXG4gIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgIHZhciBuID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgYmFzZSA9ICcgW0Z1bmN0aW9uJyArIG4gKyAnXSc7XG4gIH1cblxuICAvLyBNYWtlIFJlZ0V4cHMgc2F5IHRoYXQgdGhleSBhcmUgUmVnRXhwc1xuICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGRhdGVzIHdpdGggcHJvcGVydGllcyBmaXJzdCBzYXkgdGhlIGRhdGVcbiAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgRGF0ZS5wcm90b3R5cGUudG9VVENTdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGVycm9yIHdpdGggbWVzc2FnZSBmaXJzdCBzYXkgdGhlIGVycm9yXG4gIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICBpZiAoa2V5cy5sZW5ndGggPT09IDAgJiYgKCFhcnJheSB8fCB2YWx1ZS5sZW5ndGggPT0gMCkpIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArIGJyYWNlc1sxXTtcbiAgfVxuXG4gIGlmIChyZWN1cnNlVGltZXMgPCAwKSB7XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbT2JqZWN0XScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG5cbiAgY3R4LnNlZW4ucHVzaCh2YWx1ZSk7XG5cbiAgdmFyIG91dHB1dDtcbiAgaWYgKGFycmF5KSB7XG4gICAgb3V0cHV0ID0gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cyk7XG4gIH0gZWxzZSB7XG4gICAgb3V0cHV0ID0ga2V5cy5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSk7XG4gICAgfSk7XG4gIH1cblxuICBjdHguc2Vlbi5wb3AoKTtcblxuICByZXR1cm4gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKSB7XG4gIGlmIChpc1VuZGVmaW5lZCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCd1bmRlZmluZWQnLCAndW5kZWZpbmVkJyk7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YXIgc2ltcGxlID0gJ1xcJycgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkucmVwbGFjZSgvXlwifFwiJC9nLCAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJykgKyAnXFwnJztcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoc2ltcGxlLCAnc3RyaW5nJyk7XG4gIH1cbiAgaWYgKGlzTnVtYmVyKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ251bWJlcicpO1xuICBpZiAoaXNCb29sZWFuKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ2Jvb2xlYW4nKTtcbiAgLy8gRm9yIHNvbWUgcmVhc29uIHR5cGVvZiBudWxsIGlzIFwib2JqZWN0XCIsIHNvIHNwZWNpYWwgY2FzZSBoZXJlLlxuICBpZiAoaXNOdWxsKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ251bGwnLCAnbnVsbCcpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEVycm9yKHZhbHVlKSB7XG4gIHJldHVybiAnWycgKyBFcnJvci5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgKyAnXSc7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cykge1xuICB2YXIgb3V0cHV0ID0gW107XG4gIGZvciAodmFyIGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYgKGhhc093blByb3BlcnR5KHZhbHVlLCBTdHJpbmcoaSkpKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIFN0cmluZyhpKSwgdHJ1ZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXQucHVzaCgnJyk7XG4gICAgfVxuICB9XG4gIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBpZiAoIWtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAga2V5LCB0cnVlKSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KSB7XG4gIHZhciBuYW1lLCBzdHIsIGRlc2M7XG4gIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHZhbHVlLCBrZXkpIHx8IHsgdmFsdWU6IHZhbHVlW2tleV0gfTtcbiAgaWYgKGRlc2MuZ2V0KSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlci9TZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoIWhhc093blByb3BlcnR5KHZpc2libGVLZXlzLCBrZXkpKSB7XG4gICAgbmFtZSA9ICdbJyArIGtleSArICddJztcbiAgfVxuICBpZiAoIXN0cikge1xuICAgIGlmIChjdHguc2Vlbi5pbmRleE9mKGRlc2MudmFsdWUpIDwgMCkge1xuICAgICAgaWYgKGlzTnVsbChyZWN1cnNlVGltZXMpKSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIHJlY3Vyc2VUaW1lcyAtIDEpO1xuICAgICAgfVxuICAgICAgaWYgKHN0ci5pbmRleE9mKCdcXG4nKSA+IC0xKSB7XG4gICAgICAgIGlmIChhcnJheSkge1xuICAgICAgICAgIHN0ciA9IHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKS5zdWJzdHIoMik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3RyID0gJ1xcbicgKyBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbQ2lyY3VsYXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKGlzVW5kZWZpbmVkKG5hbWUpKSB7XG4gICAgaWYgKGFycmF5ICYmIGtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICAgIG5hbWUgPSBKU09OLnN0cmluZ2lmeSgnJyArIGtleSk7XG4gICAgaWYgKG5hbWUubWF0Y2goL15cIihbYS16QS1aX11bYS16QS1aXzAtOV0qKVwiJC8pKSB7XG4gICAgICBuYW1lID0gbmFtZS5zdWJzdHIoMSwgbmFtZS5sZW5ndGggLSAyKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnbmFtZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvKF5cInxcIiQpL2csIFwiJ1wiKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnc3RyaW5nJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5hbWUgKyAnOiAnICsgc3RyO1xufVxuXG5cbmZ1bmN0aW9uIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKSB7XG4gIHZhciBudW1MaW5lc0VzdCA9IDA7XG4gIHZhciBsZW5ndGggPSBvdXRwdXQucmVkdWNlKGZ1bmN0aW9uKHByZXYsIGN1cikge1xuICAgIG51bUxpbmVzRXN0Kys7XG4gICAgaWYgKGN1ci5pbmRleE9mKCdcXG4nKSA+PSAwKSBudW1MaW5lc0VzdCsrO1xuICAgIHJldHVybiBwcmV2ICsgY3VyLnJlcGxhY2UoL1xcdTAwMWJcXFtcXGRcXGQ/bS9nLCAnJykubGVuZ3RoICsgMTtcbiAgfSwgMCk7XG5cbiAgaWYgKGxlbmd0aCA+IDYwKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArXG4gICAgICAgICAgIChiYXNlID09PSAnJyA/ICcnIDogYmFzZSArICdcXG4gJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBvdXRwdXQuam9pbignLFxcbiAgJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBicmFjZXNbMV07XG4gIH1cblxuICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArICcgJyArIG91dHB1dC5qb2luKCcsICcpICsgJyAnICsgYnJhY2VzWzFdO1xufVxuXG5cbi8vIE5PVEU6IFRoZXNlIHR5cGUgY2hlY2tpbmcgZnVuY3Rpb25zIGludGVudGlvbmFsbHkgZG9uJ3QgdXNlIGBpbnN0YW5jZW9mYFxuLy8gYmVjYXVzZSBpdCBpcyBmcmFnaWxlIGFuZCBjYW4gYmUgZWFzaWx5IGZha2VkIHdpdGggYE9iamVjdC5jcmVhdGUoKWAuXG5mdW5jdGlvbiBpc0FycmF5KGFyKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KGFyKTtcbn1cbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGlzQm9vbGVhbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJztcbn1cbmV4cG9ydHMuaXNCb29sZWFuID0gaXNCb29sZWFuO1xuXG5mdW5jdGlvbiBpc051bGwoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbCA9IGlzTnVsbDtcblxuZnVuY3Rpb24gaXNOdWxsT3JVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsT3JVbmRlZmluZWQgPSBpc051bGxPclVuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlcjtcblxuZnVuY3Rpb24gaXNTdHJpbmcoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3RyaW5nJztcbn1cbmV4cG9ydHMuaXNTdHJpbmcgPSBpc1N0cmluZztcblxuZnVuY3Rpb24gaXNTeW1ib2woYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3ltYm9sJztcbn1cbmV4cG9ydHMuaXNTeW1ib2wgPSBpc1N5bWJvbDtcblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbmV4cG9ydHMuaXNVbmRlZmluZWQgPSBpc1VuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNSZWdFeHAocmUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KHJlKSAmJiBvYmplY3RUb1N0cmluZyhyZSkgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufVxuZXhwb3J0cy5pc1JlZ0V4cCA9IGlzUmVnRXhwO1xuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdDtcblxuZnVuY3Rpb24gaXNEYXRlKGQpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGQpICYmIG9iamVjdFRvU3RyaW5nKGQpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5leHBvcnRzLmlzRGF0ZSA9IGlzRGF0ZTtcblxuZnVuY3Rpb24gaXNFcnJvcihlKSB7XG4gIHJldHVybiBpc09iamVjdChlKSAmJlxuICAgICAgKG9iamVjdFRvU3RyaW5nKGUpID09PSAnW29iamVjdCBFcnJvcl0nIHx8IGUgaW5zdGFuY2VvZiBFcnJvcik7XG59XG5leHBvcnRzLmlzRXJyb3IgPSBpc0Vycm9yO1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG5cbmZ1bmN0aW9uIGlzUHJpbWl0aXZlKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnYm9vbGVhbicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdudW1iZXInIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3RyaW5nJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCcgfHwgIC8vIEVTNiBzeW1ib2xcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICd1bmRlZmluZWQnO1xufVxuZXhwb3J0cy5pc1ByaW1pdGl2ZSA9IGlzUHJpbWl0aXZlO1xuXG5leHBvcnRzLmlzQnVmZmVyID0gcmVxdWlyZSgnLi9zdXBwb3J0L2lzQnVmZmVyJyk7XG5cbmZ1bmN0aW9uIG9iamVjdFRvU3RyaW5nKG8pIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKTtcbn1cblxuXG5mdW5jdGlvbiBwYWQobikge1xuICByZXR1cm4gbiA8IDEwID8gJzAnICsgbi50b1N0cmluZygxMCkgOiBuLnRvU3RyaW5nKDEwKTtcbn1cblxuXG52YXIgbW9udGhzID0gWydKYW4nLCAnRmViJywgJ01hcicsICdBcHInLCAnTWF5JywgJ0p1bicsICdKdWwnLCAnQXVnJywgJ1NlcCcsXG4gICAgICAgICAgICAgICdPY3QnLCAnTm92JywgJ0RlYyddO1xuXG4vLyAyNiBGZWIgMTY6MTk6MzRcbmZ1bmN0aW9uIHRpbWVzdGFtcCgpIHtcbiAgdmFyIGQgPSBuZXcgRGF0ZSgpO1xuICB2YXIgdGltZSA9IFtwYWQoZC5nZXRIb3VycygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0TWludXRlcygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0U2Vjb25kcygpKV0uam9pbignOicpO1xuICByZXR1cm4gW2QuZ2V0RGF0ZSgpLCBtb250aHNbZC5nZXRNb250aCgpXSwgdGltZV0uam9pbignICcpO1xufVxuXG5cbi8vIGxvZyBpcyBqdXN0IGEgdGhpbiB3cmFwcGVyIHRvIGNvbnNvbGUubG9nIHRoYXQgcHJlcGVuZHMgYSB0aW1lc3RhbXBcbmV4cG9ydHMubG9nID0gZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCclcyAtICVzJywgdGltZXN0YW1wKCksIGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cykpO1xufTtcblxuXG4vKipcbiAqIEluaGVyaXQgdGhlIHByb3RvdHlwZSBtZXRob2RzIGZyb20gb25lIGNvbnN0cnVjdG9yIGludG8gYW5vdGhlci5cbiAqXG4gKiBUaGUgRnVuY3Rpb24ucHJvdG90eXBlLmluaGVyaXRzIGZyb20gbGFuZy5qcyByZXdyaXR0ZW4gYXMgYSBzdGFuZGFsb25lXG4gKiBmdW5jdGlvbiAobm90IG9uIEZ1bmN0aW9uLnByb3RvdHlwZSkuIE5PVEU6IElmIHRoaXMgZmlsZSBpcyB0byBiZSBsb2FkZWRcbiAqIGR1cmluZyBib290c3RyYXBwaW5nIHRoaXMgZnVuY3Rpb24gbmVlZHMgdG8gYmUgcmV3cml0dGVuIHVzaW5nIHNvbWUgbmF0aXZlXG4gKiBmdW5jdGlvbnMgYXMgcHJvdG90eXBlIHNldHVwIHVzaW5nIG5vcm1hbCBKYXZhU2NyaXB0IGRvZXMgbm90IHdvcmsgYXNcbiAqIGV4cGVjdGVkIGR1cmluZyBib290c3RyYXBwaW5nIChzZWUgbWlycm9yLmpzIGluIHIxMTQ5MDMpLlxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gd2hpY2ggbmVlZHMgdG8gaW5oZXJpdCB0aGVcbiAqICAgICBwcm90b3R5cGUuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBzdXBlckN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gdG8gaW5oZXJpdCBwcm90b3R5cGUgZnJvbS5cbiAqL1xuZXhwb3J0cy5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cbmV4cG9ydHMuX2V4dGVuZCA9IGZ1bmN0aW9uKG9yaWdpbiwgYWRkKSB7XG4gIC8vIERvbid0IGRvIGFueXRoaW5nIGlmIGFkZCBpc24ndCBhbiBvYmplY3RcbiAgaWYgKCFhZGQgfHwgIWlzT2JqZWN0KGFkZCkpIHJldHVybiBvcmlnaW47XG5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhZGQpO1xuICB2YXIgaSA9IGtleXMubGVuZ3RoO1xuICB3aGlsZSAoaS0tKSB7XG4gICAgb3JpZ2luW2tleXNbaV1dID0gYWRkW2tleXNbaV1dO1xuICB9XG4gIHJldHVybiBvcmlnaW47XG59O1xuXG5mdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xufVxuIiwiLy8gdmFyIHdvcmRzID0gW1wiYVwiLCBcImJcIiwgXCJjXCIsIFwiRFwiLCBcImVcIiwgXCJmXCIsIFwiZ1wiXTtcbmZ1bmN0aW9uIHJhbmRvbW90cCgpIHtcbiAgICB2YXIgcnBjID0gcmVxdWlyZShcIi4uL3JwY1wiKTtcbiAgICB2YXIgY29uZmlnID0gcmVxdWlyZShcIi4uL2NvbmZpZ1wiKTtcbiAgICB2YXIgZGIgPSByZXF1aXJlKFwiLi4vZGJcIik7XG4gICAgdmFyIHdvcmRzID0gcmVxdWlyZShcIi4uL3dvcmRzXCIpO1xuICAgIHdvcmRzPXdvcmRzLldvcmRzO1xuICAgIHZhciByZW1vdGUgPSBjb25maWcuUmVtb3Rlc1s0XTtcbiAgICBycGMuUmVxdWVzdChyZW1vdGUsIFwic3RhdHVzXCIsIFtdLCBmdW5jdGlvbihyZXMsIGVycikge1xuXHR2YXIgaCA9IHJlc1tcIkxhdGVzdEJsb2NrSGVpZ2h0XCJdO1xuXHRjb25zb2xlLmxvZyhoKTtcblx0aCA9IE1hdGguZmxvb3IoaC8xMDApKjEwMDtcblx0Y29uc29sZS5sb2coaCk7XG5cdGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwiaGVpZ2h0XCIsIGgpO1xuICAgIH0pO1xuICAgIHZhciBoZWlnaHQgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImhlaWdodFwiKTtcbiAgICBjb25zb2xlLmxvZyhcIm5vdyBmZXRjaGluZ1wiLCBoZWlnaHQpO1xuICAgIGZ1bmN0aW9uIHJlZnJlc2goKSB7XG5cdHZhciBhZGRyZXNzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJpbnB1dFwiKS52YWx1ZTtcblx0dmFyIHJhbmRvbSA9IENyeXB0b0pTLlNIQTI1NihyZXNbXCJCbG9ja01ldGFcIl1bXCJIYXNoXCJdK2FkZHJlc3MpO1xuXHR2YXIgciA9IHBhcnNlSW50KFwiMHhcIityYW5kb20pO1xuXHRjb25zb2xlLmxvZyhcIndvcmRzXCIpXG5cdGNvbnNvbGUubG9nKHdvcmRzLmxlbmd0aClcblx0YSA9IFswLCAxLCAyLCAzLCA0XVxuXHRyID0gYS5tYXAoZnVuY3Rpb24oeCl7IHJldHVybiB3b3Jkc1tyJSh3b3Jkcy5sZW5ndGgteCldOyB9KTtcblx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0ZXh0XCIpLmlubmVySFRNTCA9IEpTT04uc3RyaW5naWZ5KHIsIG51bGwsIDQpOyAgXG4gICAgfVxuICAgIHJwYy5SZXF1ZXN0KHJlbW90ZSwgXCJnZXRfYmxvY2tcIiwgW3BhcnNlSW50KGhlaWdodCldLCBmdW5jdGlvbihyZXMsIGVycikge1xuXHRjb25zb2xlLmxvZyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImlucHV0XCIpLnZhbHVlKTtcblx0c2V0SW50ZXJ2YWwocmVmcmVzaCwgMTAwMCk7XG4gICAgfSk7XG59XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBSYW5kb21PVFA6IHJhbmRvbW90cCxcbn07XG4iLCJ2YXIgY29uZmlnID0gcmVxdWlyZShcIi4uL2NvbmZpZ1wiKTtcblxuLy8gbWV0aG9kOiAgIFRoZSBmdW5jdGlvbiB0byBjYWxsIG9uIHRoZSByZW1vdGUgZW5kIChub3QgR0VUL1BPU1QpXG4vLyBwYXJhbXM6ICAgQW4gYXJyYXkgb2YgcGFyYW1ldGVyc1xuLy8gY2FsbGJhY2s6IGZ1bmN0aW9uKHN0YXR1cywgZGF0YSwgZXJyb3Ipe31cbmZ1bmN0aW9uIFJlcXVlc3QocmVtb3RlLCBtZXRob2QsIHBhcmFtcywgY2FsbGJhY2spIHtcbiAgaWYgKGNvbmZpZy5Jc05vZGVKcygpKSB7XG4gICAgcmV0dXJuIHJlcXVlc3ROb2RlKHJlbW90ZSwgbWV0aG9kLCBwYXJhbXMsIGNhbGxiYWNrKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcmVxdWVzdEJyb3dzZXIocmVtb3RlLCBtZXRob2QsIHBhcmFtcywgY2FsbGJhY2spO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlcXVlc3ROb2RlKHJlbW90ZSwgbWV0aG9kLCBwYXJhbXMsIGNhbGxiYWNrKSB7XG4gIGNvbnNvbGUubG9nKFwicmVxdWVzdE5vZGUoXCIsIHJlbW90ZSwgbWV0aG9kLCBwYXJhbXMsIGNhbGxiYWNrLCBcIilcIik7XG4gIHZhciBycGNSZXF1ZXN0ID0gSlNPTi5zdHJpbmdpZnkoe1xuICAgIGpzb25ycGM6IFwiMi4wXCIsXG4gICAgbWV0aG9kOiBtZXRob2QsXG4gICAgcGFyYW1zOiBwYXJhbXMsXG4gICAgaWQ6IG51bGwsXG4gIH0pO1xuICB2YXIgb3B0aW9ucyA9IHtcbiAgICBob3N0OiByZW1vdGUuaG9zdCxcbiAgICBwb3J0OiByZW1vdGUucG9ydCxcbiAgICBwYXRoOiBcIi9cIixcbiAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgIGhlYWRlcnM6IHtcbiAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkXCIsXG4gICAgICBcIkNvbnRlbnQtTGVuZ3RoXCI6IHJwY1JlcXVlc3QubGVuZ3RoLFxuICAgIH0sXG4gIH07XG4gIHZhciByZXEgPSByZXF1aXJlKFwiaHR0cFwiKS5yZXF1ZXN0KG9wdGlvbnMsIGZ1bmN0aW9uKHJlcykge1xuICAgIHZhciByZXNEYXRhID0gXCJcIjtcbiAgICAvL3Jlcy5zZXRFbmNvZGluZyhcInV0ZjhcIik7XG4gICAgcmVzLm9uKFwiZGF0YVwiLCBmdW5jdGlvbihjaHVuaykge1xuICAgICAgcmVzRGF0YSArPSBjaHVuaztcbiAgICB9KTtcbiAgICByZXMub24oXCJlbmRcIiwgZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcmVzSlNPTiA9IEpTT04ucGFyc2UocmVzRGF0YSk7XG4gICAgICBpZiAocmVzSlNPTi5qc29ucnBjID09IFwiMi4wXCIpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKHJlc0pTT04ucmVzdWx0LCByZXNKU09OLmVycm9yKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhcIm5vZGUgZG93blwiLCBcIlJlc3BvbnNlIGlzIG5vdCBqc29ucnBjIDIuMFwiKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG4gIHJlcS53cml0ZShycGNSZXF1ZXN0KTtcbiAgcmVxLmVuZCgpO1xufVxuXG5mdW5jdGlvbiByZXF1ZXN0QnJvd3NlcihyZW1vdGUsIG1ldGhvZCwgcGFyYW1zLCBjYWxsYmFjaykge1xuICB2YXIgcnBjUmVxdWVzdCA9IEpTT04uc3RyaW5naWZ5KHtcbiAgICBqc29ucnBjOiBcIjIuMFwiLFxuICAgIG1ldGhvZDogbWV0aG9kLFxuICAgIHBhcmFtczogcGFyYW1zLFxuICAgIGlkOiBudWxsLFxuICB9KTtcbiAgdmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgcmVxdWVzdC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAocmVxdWVzdC5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICB2YXIgcmVzSlNPTiA9IEpTT04ucGFyc2UocmVxdWVzdC5yZXNwb25zZVRleHQpO1xuICAgICAgaWYgKHJlc0pTT04uanNvbnJwYyA9PSBcIjIuMFwiKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhyZXNKU09OLnJlc3VsdCwgcmVzSlNPTi5lcnJvcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2soXCJub2RlIGRvd25cIiwgXCJSZXNwb25zZSBpcyBub3QganNvbnJwYyAyLjBcIik7XG4gICAgICB9XG4gICAgfVxuICB9O1xuICByZXF1ZXN0Lm9wZW4oJ1BPU1QnLCBcImh0dHA6Ly9cIiArIHJlbW90ZS5ob3N0ICsgXCI6XCIgKyByZW1vdGUucG9ydCArIFwiL1wiLCB0cnVlKTtcbiAgcmVxdWVzdC5zZW5kKHJwY1JlcXVlc3QpO1xufVxuO1xuXG4vLyBwYXRoOiAgICAgVGhlIGZpbGUgcGF0aCB0byBkb3dubG9hZCBmcm9tIHRoZSBzZXJ2ZXIuXG4vLyBkZXN0OiAgICAgVGhlIGxvY2FsIGRlc3RpbmF0aW9uIG9mIHRoZSBkb3dubG9hZGVkIGZpbGUuXG4vLyBjYWxsYmFjazogZnVuY3Rpb24oZXJyb3Ipe31cbmZ1bmN0aW9uIERvd25sb2FkKHJlbW90ZSwgcGF0aCwgZGVzdCwgY2FsbGJhY2spIHtcbiAgaWYgKCFwYXRoIHx8ICFkZXN0KSB7XG4gICAgdGhyb3cgKFwicnBjLkRvd25sb2FkIHJlcXVpcmVzIHBhdGggYW5kIGRlc3RcIilcbiAgfVxuICBpZiAoIWNvbmZpZy5Jc05vZGVKcygpKSB7XG4gICAgdGhyb3cgKFwicnBjLkRvd25sb2FkIG5vdCBzdXBwb3J0ZWQgaW4gdGhlIGJyb3dzZXJcIik7XG4gIH0gZWxzZSB7XG4gICAgZG93bmxvYWROb2RlKHJlbW90ZSwgcGF0aCwgZGVzdCwgY2FsbGJhY2spO1xuICB9XG59XG5cbmZ1bmN0aW9uIGRvd25sb2FkTm9kZShyZW1vdGUsIHBhdGgsIGRlc3QsIGNhbGxiYWNrKSB7XG4gIHZhciBwb3N0RGF0YSA9IHJlcXVpcmUoXCJxdWVyeXN0cmluZ1wiKS5zdHJpbmdpZnkoe1xuICAgIHBhdGg6IHBhdGhcbiAgfSk7XG4gIHZhciBvcHRpb25zID0ge1xuICAgIGhvc3Q6IHJlbW90ZS5ob3N0LFxuICAgIHBvcnQ6IHJlbW90ZS5wb3J0LFxuICAgIHBhdGg6IFwiL2Rvd25sb2FkXCIsXG4gICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICBoZWFkZXJzOiB7XG4gICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZFwiLFxuICAgICAgXCJDb250ZW50LUxlbmd0aFwiOiBwb3N0RGF0YS5sZW5ndGgsXG4gICAgfSxcbiAgfTtcbiAgdmFyIHJlcSA9IHJlcXVpcmUoXCJodHRwXCIpLnJlcXVlc3Qob3B0aW9ucywgZnVuY3Rpb24ocmVzKSB7XG4gICAgLy8gSGFuZGxlIGVycm9yLlxuICAgIGlmIChyZXMuc3RhdHVzQ29kZSAhPSAyMDApIHtcbiAgICAgIHZhciByZXNEYXRhID0gXCJcIjtcbiAgICAgIHJlcy5zZXRFbmNvZGluZyhcInV0ZjhcIik7XG4gICAgICByZXMub24oXCJkYXRhXCIsIGZ1bmN0aW9uKGNodW5rKSB7XG4gICAgICAgIHJlc0RhdGEgKz0gY2h1bms7XG4gICAgICB9KTtcbiAgICAgIHJlcy5vbihcImVuZFwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKCFyZXNEYXRhKSB7XG4gICAgICAgICAgcmVzRGF0YSA9IFwiVW5rbm93biBlcnJvclwiO1xuICAgICAgICB9XG4gICAgICAgIGNhbGxiYWNrKHJlc0RhdGEpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIDIwMCBzdGF0dXMgY29kZS5cbiAgICB2YXIgc3RyZWFtID0gcmVxdWlyZShcImZzXCIpLmNyZWF0ZVdyaXRlU3RyZWFtKGRlc3QpO1xuICAgIHN0cmVhbS5vbmNlKFwib3BlblwiLCBmdW5jdGlvbihmZCkge1xuICAgICAgcmVzLm9uKFwiZGF0YVwiLCBmdW5jdGlvbihjaHVuaykge1xuICAgICAgICBzdHJlYW0ud3JpdGUoY2h1bmspO1xuICAgICAgfSk7XG4gICAgICByZXMub24oXCJlbmRcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgIHN0cmVhbS5lbmQoKTtcbiAgICAgICAgY2FsbGJhY2sobnVsbCk7XG4gICAgICB9KTtcbiAgICAgIHJlcy5vbihcImVycm9yXCIsIGZ1bmN0aW9uKGVycikge1xuICAgICAgICBjYWxsYmFjayhlcnIubWVzc2FnZSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG4gIHJlcS53cml0ZShwb3N0RGF0YSk7XG4gIHJlcS5lbmQoKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIFJlcXVlc3Q6IFJlcXVlc3QsXG4gIERvd25sb2FkOiBEb3dubG9hZCxcbn07XG4iLCIvLyBUWCBUWVBFU1xuZXhwb3J0cy5UeFR5cGVTZW5kID0gMHgwMTtcbmV4cG9ydHMuVHhUeXBlQ2FsbCA9IDB4MDI7XG5leHBvcnRzLlR4VHlwZUJvbmQgPSAweDExO1xuZXhwb3J0cy5UeFR5cGVVbmJvbmQgPSAweDEyO1xuZXhwb3J0cy5UeFR5cGVSZWJvbmQgPSAweDEzO1xuZXhwb3J0cy5UeFR5cGVEdXBlb3V0ID0gMHgxNDtcblxuLy8gUFVCS0VZIFRZUEVTXG5leHBvcnRzLlB1YktleVR5cGVOaWwgPSAweDAwO1xuZXhwb3J0cy5QdWJLZXlUeXBlRWQyNTUxOSA9IDB4MDE7XG5cbi8vIFBSSVZLRVkgVFlQRVNcbi8vZXhwb3J0cy5Qcml2S2V5VHlwZU5pbCA9ICAgICAweDAwO1xuZXhwb3J0cy5Qcml2S2V5VHlwZUVkMjU1MTkgPSAweDAxO1xuIiwidmFyIFdvcmRzID0gW1wiYVwiLCBcImJcIiwgXCJjXCIsIFwiZFwiXVxuLy8gdmFyIFdvcmRzPVsgXCJ0aGVcIiwgXCJvZlwiLCBcImFuZFwiLCBcInRvXCIsIFwiYVwiLCBcImluXCIsIFwiZm9yXCIsIFwiaXNcIiwgXCJvblwiLCBcInRoYXRcIiwgXCJieVwiLCBcInRoaXNcIiwgXCJ3aXRoXCIsIFwiaVwiLCBcInlvdVwiLCBcIml0XCIsIFwibm90XCIsIFwib3JcIiwgXCJiZVwiLCBcImFyZVwiLCBcImZyb21cIiwgXCJhdFwiLCBcImFzXCIsIFwieW91clwiLCBcImFsbFwiLCBcImhhdmVcIiwgXCJuZXdcIiwgXCJtb3JlXCIsIFwiYW5cIiwgXCJ3YXNcIiwgXCJ3ZVwiLCBcIndpbGxcIiwgXCJob21lXCIsIFwiY2FuXCIsIFwidXNcIiwgXCJhYm91dFwiLCBcImlmXCIsIFwicGFnZVwiLCBcIm15XCIsIFwiaGFzXCIsIFwic2VhcmNoXCIsIFwiZnJlZVwiLCBcImJ1dFwiLCBcIm91clwiLCBcIm9uZVwiLCBcIm90aGVyXCIsIFwiZG9cIiwgXCJub1wiLCBcImluZm9ybWF0aW9uXCIsIFwidGltZVwiLCBcInRoZXlcIiwgXCJzaXRlXCIsIFwiaGVcIiwgXCJ1cFwiLCBcIm1heVwiLCBcIndoYXRcIiwgXCJ3aGljaFwiLCBcInRoZWlyXCIsIFwibmV3c1wiLCBcIm91dFwiLCBcInVzZVwiLCBcImFueVwiLCBcInRoZXJlXCIsIFwic2VlXCIsIFwib25seVwiLCBcInNvXCIsIFwiaGlzXCIsIFwid2hlblwiLCBcImNvbnRhY3RcIiwgXCJoZXJlXCIsIFwiYnVzaW5lc3NcIiwgXCJ3aG9cIiwgXCJ3ZWJcIiwgXCJhbHNvXCIsIFwibm93XCIsIFwiaGVscFwiLCBcImdldFwiLCBcInBtXCIsIFwidmlld1wiLCBcIm9ubGluZVwiLCBcImNcIiwgXCJlXCIsIFwiZmlyc3RcIiwgXCJhbVwiLCBcImJlZW5cIiwgXCJ3b3VsZFwiLCBcImhvd1wiLCBcIndlcmVcIiwgXCJtZVwiLCBcInNcIiwgXCJzZXJ2aWNlc1wiLCBcInNvbWVcIiwgXCJ0aGVzZVwiLCBcImNsaWNrXCIsIFwiaXRzXCIsIFwibGlrZVwiLCBcInNlcnZpY2VcIiwgXCJ4XCIsIFwidGhhblwiLCBcImZpbmRcIiwgXCJwcmljZVwiLCBcImRhdGVcIiwgXCJiYWNrXCIsIFwidG9wXCIsIFwicGVvcGxlXCIsIFwiaGFkXCIsIFwibGlzdFwiLCBcIm5hbWVcIiwgXCJqdXN0XCIsIFwib3ZlclwiLCBcInN0YXRlXCIsIFwieWVhclwiLCBcImRheVwiLCBcImludG9cIiwgXCJlbWFpbFwiLCBcInR3b1wiLCBcImhlYWx0aFwiLCBcIm5cIiwgXCJ3b3JsZFwiLCBcInJlXCIsIFwibmV4dFwiLCBcInVzZWRcIiwgXCJnb1wiLCBcImJcIiwgXCJ3b3JrXCIsIFwibGFzdFwiLCBcIm1vc3RcIiwgXCJwcm9kdWN0c1wiLCBcIm11c2ljXCIsIFwiYnV5XCIsIFwiZGF0YVwiLCBcIm1ha2VcIiwgXCJ0aGVtXCIsIFwic2hvdWxkXCIsIFwicHJvZHVjdFwiLCBcInN5c3RlbVwiLCBcInBvc3RcIiwgXCJoZXJcIiwgXCJjaXR5XCIsIFwidFwiLCBcImFkZFwiLCBcInBvbGljeVwiLCBcIm51bWJlclwiLCBcInN1Y2hcIiwgXCJwbGVhc2VcIiwgXCJhdmFpbGFibGVcIiwgXCJjb3B5cmlnaHRcIiwgXCJzdXBwb3J0XCIsIFwibWVzc2FnZVwiLCBcImFmdGVyXCIsIFwiYmVzdFwiLCBcInNvZnR3YXJlXCIsIFwidGhlblwiLCBcImphblwiLCBcImdvb2RcIiwgXCJ2aWRlb1wiLCBcIndlbGxcIiwgXCJkXCIsIFwid2hlcmVcIiwgXCJpbmZvXCIsIFwicmlnaHRzXCIsIFwicHVibGljXCIsIFwiYm9va3NcIiwgXCJoaWdoXCIsIFwic2Nob29sXCIsIFwidGhyb3VnaFwiLCBcIm1cIiwgXCJlYWNoXCIsIFwibGlua3NcIiwgXCJzaGVcIiwgXCJyZXZpZXdcIiwgXCJ5ZWFyc1wiLCBcIm9yZGVyXCIsIFwidmVyeVwiLCBcInByaXZhY3lcIiwgXCJib29rXCIsIFwiaXRlbXNcIiwgXCJjb21wYW55XCIsIFwiclwiLCBcInJlYWRcIiwgXCJncm91cFwiLCBcInNleFwiLCBcIm5lZWRcIiwgXCJtYW55XCIsIFwidXNlclwiLCBcInNhaWRcIiwgXCJkZVwiLCBcImRvZXNcIiwgXCJzZXRcIiwgXCJ1bmRlclwiLCBcImdlbmVyYWxcIiwgXCJyZXNlYXJjaFwiLCBcInVuaXZlcnNpdHlcIiwgXCJqYW51YXJ5XCIsIFwibWFpbFwiLCBcImZ1bGxcIiwgXCJtYXBcIiwgXCJyZXZpZXdzXCIsIFwicHJvZ3JhbVwiLCBcImxpZmVcIiwgXCJrbm93XCIsIFwiZ2FtZXNcIiwgXCJ3YXlcIiwgXCJkYXlzXCIsIFwibWFuYWdlbWVudFwiLCBcInBcIiwgXCJwYXJ0XCIsIFwiY291bGRcIiwgXCJncmVhdFwiLCBcInVuaXRlZFwiLCBcImhvdGVsXCIsIFwicmVhbFwiLCBcImZcIiwgXCJpdGVtXCIsIFwiaW50ZXJuYXRpb25hbFwiLCBcImNlbnRlclwiLCBcImViYXlcIiwgXCJtdXN0XCIsIFwic3RvcmVcIiwgXCJ0cmF2ZWxcIiwgXCJjb21tZW50c1wiLCBcIm1hZGVcIiwgXCJkZXZlbG9wbWVudFwiLCBcInJlcG9ydFwiLCBcIm9mZlwiLCBcIm1lbWJlclwiLCBcImRldGFpbHNcIiwgXCJsaW5lXCIsIFwidGVybXNcIiwgXCJiZWZvcmVcIiwgXCJob3RlbHNcIiwgXCJkaWRcIiwgXCJzZW5kXCIsIFwicmlnaHRcIiwgXCJ0eXBlXCIsIFwiYmVjYXVzZVwiLCBcImxvY2FsXCIsIFwidGhvc2VcIiwgXCJ1c2luZ1wiLCBcInJlc3VsdHNcIiwgXCJvZmZpY2VcIiwgXCJlZHVjYXRpb25cIiwgXCJuYXRpb25hbFwiLCBcImNhclwiLCBcImRlc2lnblwiLCBcInRha2VcIiwgXCJwb3N0ZWRcIiwgXCJpbnRlcm5ldFwiLCBcImFkZHJlc3NcIiwgXCJjb21tdW5pdHlcIiwgXCJ3aXRoaW5cIiwgXCJzdGF0ZXNcIiwgXCJhcmVhXCIsIFwid2FudFwiLCBcInBob25lXCIsIFwiZHZkXCIsIFwic2hpcHBpbmdcIiwgXCJyZXNlcnZlZFwiLCBcInN1YmplY3RcIiwgXCJiZXR3ZWVuXCIsIFwiZm9ydW1cIiwgXCJmYW1pbHlcIiwgXCJsXCIsIFwibG9uZ1wiLCBcImJhc2VkXCIsIFwid1wiLCBcImNvZGVcIiwgXCJzaG93XCIsIFwib1wiLCBcImV2ZW5cIiwgXCJibGFja1wiLCBcImNoZWNrXCIsIFwic3BlY2lhbFwiLCBcInByaWNlc1wiLCBcIndlYnNpdGVcIiwgXCJpbmRleFwiLCBcImJlaW5nXCIsIFwid29tZW5cIiwgXCJtdWNoXCIsIFwic2lnblwiLCBcImZpbGVcIiwgXCJsaW5rXCIsIFwib3BlblwiLCBcInRvZGF5XCIsIFwidGVjaG5vbG9neVwiLCBcInNvdXRoXCIsIFwiY2FzZVwiLCBcInByb2plY3RcIiwgXCJzYW1lXCIsIFwicGFnZXNcIiwgXCJ1a1wiLCBcInZlcnNpb25cIiwgXCJzZWN0aW9uXCIsIFwib3duXCIsIFwiZm91bmRcIiwgXCJzcG9ydHNcIiwgXCJob3VzZVwiLCBcInJlbGF0ZWRcIiwgXCJzZWN1cml0eVwiLCBcImJvdGhcIiwgXCJnXCIsIFwiY291bnR5XCIsIFwiYW1lcmljYW5cIiwgXCJwaG90b1wiLCBcImdhbWVcIiwgXCJtZW1iZXJzXCIsIFwicG93ZXJcIiwgXCJ3aGlsZVwiLCBcImNhcmVcIiwgXCJuZXR3b3JrXCIsIFwiZG93blwiLCBcImNvbXB1dGVyXCIsIFwic3lzdGVtc1wiLCBcInRocmVlXCIsIFwidG90YWxcIiwgXCJwbGFjZVwiLCBcImVuZFwiLCBcImZvbGxvd2luZ1wiLCBcImRvd25sb2FkXCIsIFwiaFwiLCBcImhpbVwiLCBcIndpdGhvdXRcIiwgXCJwZXJcIiwgXCJhY2Nlc3NcIiwgXCJ0aGlua1wiLCBcIm5vcnRoXCIsIFwicmVzb3VyY2VzXCIsIFwiY3VycmVudFwiLCBcInBvc3RzXCIsIFwiYmlnXCIsIFwibWVkaWFcIiwgXCJsYXdcIiwgXCJjb250cm9sXCIsIFwid2F0ZXJcIiwgXCJoaXN0b3J5XCIsIFwicGljdHVyZXNcIiwgXCJzaXplXCIsIFwiYXJ0XCIsIFwicGVyc29uYWxcIiwgXCJzaW5jZVwiLCBcImluY2x1ZGluZ1wiLCBcImd1aWRlXCIsIFwic2hvcFwiLCBcImRpcmVjdG9yeVwiLCBcImJvYXJkXCIsIFwibG9jYXRpb25cIiwgXCJjaGFuZ2VcIiwgXCJ3aGl0ZVwiLCBcInRleHRcIiwgXCJzbWFsbFwiLCBcInJhdGluZ1wiLCBcInJhdGVcIiwgXCJnb3Zlcm5tZW50XCIsIFwiY2hpbGRyZW5cIiwgXCJkdXJpbmdcIiwgXCJ1c2FcIiwgXCJyZXR1cm5cIiwgXCJzdHVkZW50c1wiLCBcInZcIiwgXCJzaG9wcGluZ1wiLCBcImFjY291bnRcIiwgXCJ0aW1lc1wiLCBcInNpdGVzXCIsIFwibGV2ZWxcIiwgXCJkaWdpdGFsXCIsIFwicHJvZmlsZVwiLCBcInByZXZpb3VzXCIsIFwiZm9ybVwiLCBcImV2ZW50c1wiLCBcImxvdmVcIiwgXCJvbGRcIiwgXCJqb2huXCIsIFwibWFpblwiLCBcImNhbGxcIiwgXCJob3Vyc1wiLCBcImltYWdlXCIsIFwiZGVwYXJ0bWVudFwiLCBcInRpdGxlXCIsIFwiZGVzY3JpcHRpb25cIiwgXCJub25cIiwgXCJrXCIsIFwieVwiLCBcImluc3VyYW5jZVwiLCBcImFub3RoZXJcIiwgXCJ3aHlcIiwgXCJzaGFsbFwiLCBcInByb3BlcnR5XCIsIFwiY2xhc3NcIiwgXCJjZFwiLCBcInN0aWxsXCIsIFwibW9uZXlcIiwgXCJxdWFsaXR5XCIsIFwiZXZlcnlcIiwgXCJsaXN0aW5nXCIsIFwiY29udGVudFwiLCBcImNvdW50cnlcIiwgXCJwcml2YXRlXCIsIFwibGl0dGxlXCIsIFwidmlzaXRcIiwgXCJzYXZlXCIsIFwidG9vbHNcIiwgXCJsb3dcIiwgXCJyZXBseVwiLCBcImN1c3RvbWVyXCIsIFwiZGVjZW1iZXJcIiwgXCJjb21wYXJlXCIsIFwibW92aWVzXCIsIFwiaW5jbHVkZVwiLCBcImNvbGxlZ2VcIiwgXCJ2YWx1ZVwiLCBcImFydGljbGVcIiwgXCJ5b3JrXCIsIFwibWFuXCIsIFwiY2FyZFwiLCBcImpvYnNcIiwgXCJwcm92aWRlXCIsIFwialwiLCBcImZvb2RcIiwgXCJzb3VyY2VcIiwgXCJhdXRob3JcIiwgXCJkaWZmZXJlbnRcIiwgXCJwcmVzc1wiLCBcInVcIiwgXCJsZWFyblwiLCBcInNhbGVcIiwgXCJhcm91bmRcIiwgXCJwcmludFwiLCBcImNvdXJzZVwiLCBcImpvYlwiLCBcImNhbmFkYVwiLCBcInByb2Nlc3NcIiwgXCJ0ZWVuXCIsIFwicm9vbVwiLCBcInN0b2NrXCIsIFwidHJhaW5pbmdcIiwgXCJ0b29cIiwgXCJjcmVkaXRcIiwgXCJwb2ludFwiLCBcImpvaW5cIiwgXCJzY2llbmNlXCIsIFwibWVuXCIsIFwiY2F0ZWdvcmllc1wiLCBcImFkdmFuY2VkXCIsIFwid2VzdFwiLCBcInNhbGVzXCIsIFwibG9va1wiLCBcImVuZ2xpc2hcIiwgXCJsZWZ0XCIsIFwidGVhbVwiLCBcImVzdGF0ZVwiLCBcImJveFwiLCBcImNvbmRpdGlvbnNcIiwgXCJzZWxlY3RcIiwgXCJ3aW5kb3dzXCIsIFwicGhvdG9zXCIsIFwiZ2F5XCIsIFwidGhyZWFkXCIsIFwid2Vla1wiLCBcImNhdGVnb3J5XCIsIFwibm90ZVwiLCBcImxpdmVcIiwgXCJsYXJnZVwiLCBcImdhbGxlcnlcIiwgXCJ0YWJsZVwiLCBcInJlZ2lzdGVyXCIsIFwiaG93ZXZlclwiLCBcImp1bmVcIiwgXCJvY3RvYmVyXCIsIFwibm92ZW1iZXJcIiwgXCJtYXJrZXRcIiwgXCJsaWJyYXJ5XCIsIFwicmVhbGx5XCIsIFwiYWN0aW9uXCIsIFwic3RhcnRcIiwgXCJzZXJpZXNcIiwgXCJtb2RlbFwiLCBcImZlYXR1cmVzXCIsIFwiYWlyXCIsIFwiaW5kdXN0cnlcIiwgXCJwbGFuXCIsIFwiaHVtYW5cIiwgXCJwcm92aWRlZFwiLCBcInR2XCIsIFwieWVzXCIsIFwicmVxdWlyZWRcIiwgXCJzZWNvbmRcIiwgXCJob3RcIiwgXCJhY2Nlc3Nvcmllc1wiLCBcImNvc3RcIiwgXCJtb3ZpZVwiLCBcImZvcnVtc1wiLCBcIm1hcmNoXCIsIFwibGFcIiwgXCJzZXB0ZW1iZXJcIiwgXCJiZXR0ZXJcIiwgXCJzYXlcIiwgXCJxdWVzdGlvbnNcIiwgXCJqdWx5XCIsIFwieWFob29cIiwgXCJnb2luZ1wiLCBcIm1lZGljYWxcIiwgXCJ0ZXN0XCIsIFwiZnJpZW5kXCIsIFwiY29tZVwiLCBcImRlY1wiLCBcInNlcnZlclwiLCBcInBjXCIsIFwic3R1ZHlcIiwgXCJhcHBsaWNhdGlvblwiLCBcImNhcnRcIiwgXCJzdGFmZlwiLCBcImFydGljbGVzXCIsIFwic2FuXCIsIFwiZmVlZGJhY2tcIiwgXCJhZ2FpblwiLCBcInBsYXlcIiwgXCJsb29raW5nXCIsIFwiaXNzdWVzXCIsIFwiYXByaWxcIiwgXCJuZXZlclwiLCBcInVzZXJzXCIsIFwiY29tcGxldGVcIiwgXCJzdHJlZXRcIiwgXCJ0b3BpY1wiLCBcImNvbW1lbnRcIiwgXCJmaW5hbmNpYWxcIiwgXCJ0aGluZ3NcIiwgXCJ3b3JraW5nXCIsIFwiYWdhaW5zdFwiLCBcInN0YW5kYXJkXCIsIFwidGF4XCIsIFwicGVyc29uXCIsIFwiYmVsb3dcIiwgXCJtb2JpbGVcIiwgXCJsZXNzXCIsIFwiZ290XCIsIFwiYmxvZ1wiLCBcInBhcnR5XCIsIFwicGF5bWVudFwiLCBcImVxdWlwbWVudFwiLCBcImxvZ2luXCIsIFwic3R1ZGVudFwiLCBcImxldFwiLCBcInByb2dyYW1zXCIsIFwib2ZmZXJzXCIsIFwibGVnYWxcIiwgXCJhYm92ZVwiLCBcInJlY2VudFwiLCBcInBhcmtcIiwgXCJzdG9yZXNcIiwgXCJzaWRlXCIsIFwiYWN0XCIsIFwicHJvYmxlbVwiLCBcInJlZFwiLCBcImdpdmVcIiwgXCJtZW1vcnlcIiwgXCJwZXJmb3JtYW5jZVwiLCBcInNvY2lhbFwiLCBcInFcIiwgXCJhdWd1c3RcIiwgXCJxdW90ZVwiLCBcImxhbmd1YWdlXCIsIFwic3RvcnlcIiwgXCJzZWxsXCIsIFwib3B0aW9uc1wiLCBcImV4cGVyaWVuY2VcIiwgXCJyYXRlc1wiLCBcImNyZWF0ZVwiLCBcImtleVwiLCBcImJvZHlcIiwgXCJ5b3VuZ1wiLCBcImFtZXJpY2FcIiwgXCJpbXBvcnRhbnRcIiwgXCJmaWVsZFwiLCBcImZld1wiLCBcImVhc3RcIiwgXCJwYXBlclwiLCBcInNpbmdsZVwiLCBcImlpXCIsIFwiYWdlXCIsIFwiYWN0aXZpdGllc1wiLCBcImNsdWJcIiwgXCJleGFtcGxlXCIsIFwiZ2lybHNcIiwgXCJhZGRpdGlvbmFsXCIsIFwicGFzc3dvcmRcIiwgXCJ6XCIsIFwibGF0ZXN0XCIsIFwic29tZXRoaW5nXCIsIFwicm9hZFwiLCBcImdpZnRcIiwgXCJxdWVzdGlvblwiLCBcImNoYW5nZXNcIiwgXCJuaWdodFwiLCBcImNhXCIsIFwiaGFyZFwiLCBcInRleGFzXCIsIFwib2N0XCIsIFwicGF5XCIsIFwiZm91clwiLCBcInBva2VyXCIsIFwic3RhdHVzXCIsIFwiYnJvd3NlXCIsIFwiaXNzdWVcIiwgXCJyYW5nZVwiLCBcImJ1aWxkaW5nXCIsIFwic2VsbGVyXCIsIFwiY291cnRcIiwgXCJmZWJydWFyeVwiLCBcImFsd2F5c1wiLCBcInJlc3VsdFwiLCBcImF1ZGlvXCIsIFwibGlnaHRcIiwgXCJ3cml0ZVwiLCBcIndhclwiLCBcIm5vdlwiLCBcIm9mZmVyXCIsIFwiYmx1ZVwiLCBcImdyb3Vwc1wiLCBcImFsXCIsIFwiZWFzeVwiLCBcImdpdmVuXCIsIFwiZmlsZXNcIiwgXCJldmVudFwiLCBcInJlbGVhc2VcIiwgXCJhbmFseXNpc1wiLCBcInJlcXVlc3RcIiwgXCJmYXhcIiwgXCJjaGluYVwiLCBcIm1ha2luZ1wiLCBcInBpY3R1cmVcIiwgXCJuZWVkc1wiLCBcInBvc3NpYmxlXCIsIFwibWlnaHRcIiwgXCJwcm9mZXNzaW9uYWxcIiwgXCJ5ZXRcIiwgXCJtb250aFwiLCBcIm1ham9yXCIsIFwic3RhclwiLCBcImFyZWFzXCIsIFwiZnV0dXJlXCIsIFwic3BhY2VcIiwgXCJjb21taXR0ZWVcIiwgXCJoYW5kXCIsIFwic3VuXCIsIFwiY2FyZHNcIiwgXCJwcm9ibGVtc1wiLCBcImxvbmRvblwiLCBcIndhc2hpbmd0b25cIiwgXCJtZWV0aW5nXCIsIFwicnNzXCIsIFwiYmVjb21lXCIsIFwiaW50ZXJlc3RcIiwgXCJpZFwiLCBcImNoaWxkXCIsIFwia2VlcFwiLCBcImVudGVyXCIsIFwiY2FsaWZvcm5pYVwiLCBcInBvcm5cIiwgXCJzaGFyZVwiLCBcInNpbWlsYXJcIiwgXCJnYXJkZW5cIiwgXCJzY2hvb2xzXCIsIFwibWlsbGlvblwiLCBcImFkZGVkXCIsIFwicmVmZXJlbmNlXCIsIFwiY29tcGFuaWVzXCIsIFwibGlzdGVkXCIsIFwiYmFieVwiLCBcImxlYXJuaW5nXCIsIFwiZW5lcmd5XCIsIFwicnVuXCIsIFwiZGVsaXZlcnlcIiwgXCJuZXRcIiwgXCJwb3B1bGFyXCIsIFwidGVybVwiLCBcImZpbG1cIiwgXCJzdG9yaWVzXCIsIFwicHV0XCIsIFwiY29tcHV0ZXJzXCIsIFwiam91cm5hbFwiLCBcInJlcG9ydHNcIiwgXCJjb1wiLCBcInRyeVwiLCBcIndlbGNvbWVcIiwgXCJjZW50cmFsXCIsIFwiaW1hZ2VzXCIsIFwicHJlc2lkZW50XCIsIFwibm90aWNlXCIsIFwiZ29kXCIsIFwib3JpZ2luYWxcIiwgXCJoZWFkXCIsIFwicmFkaW9cIiwgXCJ1bnRpbFwiLCBcImNlbGxcIiwgXCJjb2xvclwiLCBcInNlbGZcIiwgXCJjb3VuY2lsXCIsIFwiYXdheVwiLCBcImluY2x1ZGVzXCIsIFwidHJhY2tcIiwgXCJhdXN0cmFsaWFcIiwgXCJkaXNjdXNzaW9uXCIsIFwiYXJjaGl2ZVwiLCBcIm9uY2VcIiwgXCJvdGhlcnNcIiwgXCJlbnRlcnRhaW5tZW50XCIsIFwiYWdyZWVtZW50XCIsIFwiZm9ybWF0XCIsIFwibGVhc3RcIiwgXCJzb2NpZXR5XCIsIFwibW9udGhzXCIsIFwibG9nXCIsIFwic2FmZXR5XCIsIFwiZnJpZW5kc1wiLCBcInN1cmVcIiwgXCJmYXFcIiwgXCJ0cmFkZVwiLCBcImVkaXRpb25cIiwgXCJjYXJzXCIsIFwibWVzc2FnZXNcIiwgXCJtYXJrZXRpbmdcIiwgXCJ0ZWxsXCIsIFwiZnVydGhlclwiLCBcInVwZGF0ZWRcIiwgXCJhc3NvY2lhdGlvblwiLCBcImFibGVcIiwgXCJoYXZpbmdcIiwgXCJwcm92aWRlc1wiLCBcImRhdmlkXCIsIFwiZnVuXCIsIFwiYWxyZWFkeVwiLCBcImdyZWVuXCIsIFwic3R1ZGllc1wiLCBcImNsb3NlXCIsIFwiY29tbW9uXCIsIFwiZHJpdmVcIiwgXCJzcGVjaWZpY1wiLCBcInNldmVyYWxcIiwgXCJnb2xkXCIsIFwiZmViXCIsIFwibGl2aW5nXCIsIFwic2VwXCIsIFwiY29sbGVjdGlvblwiLCBcImNhbGxlZFwiLCBcInNob3J0XCIsIFwiYXJ0c1wiLCBcImxvdFwiLCBcImFza1wiLCBcImRpc3BsYXlcIiwgXCJsaW1pdGVkXCIsIFwicG93ZXJlZFwiLCBcInNvbHV0aW9uc1wiLCBcIm1lYW5zXCIsIFwiZGlyZWN0b3JcIiwgXCJkYWlseVwiLCBcImJlYWNoXCIsIFwicGFzdFwiLCBcIm5hdHVyYWxcIiwgXCJ3aGV0aGVyXCIsIFwiZHVlXCIsIFwiZXRcIiwgXCJlbGVjdHJvbmljc1wiLCBcImZpdmVcIiwgXCJ1cG9uXCIsIFwicGVyaW9kXCIsIFwicGxhbm5pbmdcIiwgXCJkYXRhYmFzZVwiLCBcInNheXNcIiwgXCJvZmZpY2lhbFwiLCBcIndlYXRoZXJcIiwgXCJtYXJcIiwgXCJsYW5kXCIsIFwiYXZlcmFnZVwiLCBcImRvbmVcIiwgXCJ0ZWNobmljYWxcIiwgXCJ3aW5kb3dcIiwgXCJmcmFuY2VcIiwgXCJwcm9cIiwgXCJyZWdpb25cIiwgXCJpc2xhbmRcIiwgXCJyZWNvcmRcIiwgXCJkaXJlY3RcIiwgXCJtaWNyb3NvZnRcIiwgXCJjb25mZXJlbmNlXCIsIFwiZW52aXJvbm1lbnRcIiwgXCJyZWNvcmRzXCIsIFwic3RcIiwgXCJkaXN0cmljdFwiLCBcImNhbGVuZGFyXCIsIFwiY29zdHNcIiwgXCJzdHlsZVwiLCBcInVybFwiLCBcImZyb250XCIsIFwic3RhdGVtZW50XCIsIFwidXBkYXRlXCIsIFwicGFydHNcIiwgXCJhdWdcIiwgXCJldmVyXCIsIFwiZG93bmxvYWRzXCIsIFwiZWFybHlcIiwgXCJtaWxlc1wiLCBcInNvdW5kXCIsIFwicmVzb3VyY2VcIiwgXCJwcmVzZW50XCIsIFwiYXBwbGljYXRpb25zXCIsIFwiZWl0aGVyXCIsIFwiYWdvXCIsIFwiZG9jdW1lbnRcIiwgXCJ3b3JkXCIsIFwid29ya3NcIiwgXCJtYXRlcmlhbFwiLCBcImJpbGxcIiwgXCJhcHJcIiwgXCJ3cml0dGVuXCIsIFwidGFsa1wiLCBcImZlZGVyYWxcIiwgXCJob3N0aW5nXCIsIFwicnVsZXNcIiwgXCJmaW5hbFwiLCBcImFkdWx0XCIsIFwidGlja2V0c1wiLCBcInRoaW5nXCIsIFwiY2VudHJlXCIsIFwicmVxdWlyZW1lbnRzXCIsIFwidmlhXCIsIFwiY2hlYXBcIiwgXCJudWRlXCIsIFwia2lkc1wiLCBcImZpbmFuY2VcIiwgXCJ0cnVlXCIsIFwibWludXRlc1wiLCBcImVsc2VcIiwgXCJtYXJrXCIsIFwidGhpcmRcIiwgXCJyb2NrXCIsIFwiZ2lmdHNcIiwgXCJldXJvcGVcIiwgXCJyZWFkaW5nXCIsIFwidG9waWNzXCIsIFwiYmFkXCIsIFwiaW5kaXZpZHVhbFwiLCBcInRpcHNcIiwgXCJwbHVzXCIsIFwiYXV0b1wiLCBcImNvdmVyXCIsIFwidXN1YWxseVwiLCBcImVkaXRcIiwgXCJ0b2dldGhlclwiLCBcInZpZGVvc1wiLCBcInBlcmNlbnRcIiwgXCJmYXN0XCIsIFwiZnVuY3Rpb25cIiwgXCJmYWN0XCIsIFwidW5pdFwiLCBcImdldHRpbmdcIiwgXCJnbG9iYWxcIiwgXCJ0ZWNoXCIsIFwibWVldFwiLCBcImZhclwiLCBcImVjb25vbWljXCIsIFwiZW5cIiwgXCJwbGF5ZXJcIiwgXCJwcm9qZWN0c1wiLCBcImx5cmljc1wiLCBcIm9mdGVuXCIsIFwic3Vic2NyaWJlXCIsIFwic3VibWl0XCIsIFwiZ2VybWFueVwiLCBcImFtb3VudFwiLCBcIndhdGNoXCIsIFwiaW5jbHVkZWRcIiwgXCJmZWVsXCIsIFwidGhvdWdoXCIsIFwiYmFua1wiLCBcInJpc2tcIiwgXCJ0aGFua3NcIiwgXCJldmVyeXRoaW5nXCIsIFwiZGVhbHNcIiwgXCJ2YXJpb3VzXCIsIFwid29yZHNcIiwgXCJsaW51eFwiLCBcImp1bFwiLCBcInByb2R1Y3Rpb25cIiwgXCJjb21tZXJjaWFsXCIsIFwiamFtZXNcIiwgXCJ3ZWlnaHRcIiwgXCJ0b3duXCIsIFwiaGVhcnRcIiwgXCJhZHZlcnRpc2luZ1wiLCBcInJlY2VpdmVkXCIsIFwiY2hvb3NlXCIsIFwidHJlYXRtZW50XCIsIFwibmV3c2xldHRlclwiLCBcImFyY2hpdmVzXCIsIFwicG9pbnRzXCIsIFwia25vd2xlZGdlXCIsIFwibWFnYXppbmVcIiwgXCJlcnJvclwiLCBcImNhbWVyYVwiLCBcImp1blwiLCBcImdpcmxcIiwgXCJjdXJyZW50bHlcIiwgXCJjb25zdHJ1Y3Rpb25cIiwgXCJ0b3lzXCIsIFwicmVnaXN0ZXJlZFwiLCBcImNsZWFyXCIsIFwiZ29sZlwiLCBcInJlY2VpdmVcIiwgXCJkb21haW5cIiwgXCJtZXRob2RzXCIsIFwiY2hhcHRlclwiLCBcIm1ha2VzXCIsIFwicHJvdGVjdGlvblwiLCBcInBvbGljaWVzXCIsIFwibG9hblwiLCBcIndpZGVcIiwgXCJiZWF1dHlcIiwgXCJtYW5hZ2VyXCIsIFwiaW5kaWFcIiwgXCJwb3NpdGlvblwiLCBcInRha2VuXCIsIFwic29ydFwiLCBcImxpc3RpbmdzXCIsIFwibW9kZWxzXCIsIFwibWljaGFlbFwiLCBcImtub3duXCIsIFwiaGFsZlwiLCBcImNhc2VzXCIsIFwic3RlcFwiLCBcImVuZ2luZWVyaW5nXCIsIFwiZmxvcmlkYVwiLCBcInNpbXBsZVwiLCBcInF1aWNrXCIsIFwibm9uZVwiLCBcIndpcmVsZXNzXCIsIFwibGljZW5zZVwiLCBcInBhdWxcIiwgXCJmcmlkYXlcIiwgXCJsYWtlXCIsIFwid2hvbGVcIiwgXCJhbm51YWxcIiwgXCJwdWJsaXNoZWRcIiwgXCJsYXRlclwiLCBcImJhc2ljXCIsIFwic29ueVwiLCBcInNob3dzXCIsIFwiY29ycG9yYXRlXCIsIFwiZ29vZ2xlXCIsIFwiY2h1cmNoXCIsIFwibWV0aG9kXCIsIFwicHVyY2hhc2VcIiwgXCJjdXN0b21lcnNcIiwgXCJhY3RpdmVcIiwgXCJyZXNwb25zZVwiLCBcInByYWN0aWNlXCIsIFwiaGFyZHdhcmVcIiwgXCJmaWd1cmVcIiwgXCJtYXRlcmlhbHNcIiwgXCJmaXJlXCIsIFwiaG9saWRheVwiLCBcImNoYXRcIiwgXCJlbm91Z2hcIiwgXCJkZXNpZ25lZFwiLCBcImFsb25nXCIsIFwiYW1vbmdcIiwgXCJkZWF0aFwiLCBcIndyaXRpbmdcIiwgXCJzcGVlZFwiLCBcImh0bWxcIiwgXCJjb3VudHJpZXNcIiwgXCJsb3NzXCIsIFwiZmFjZVwiLCBcImJyYW5kXCIsIFwiZGlzY291bnRcIiwgXCJoaWdoZXJcIiwgXCJlZmZlY3RzXCIsIFwiY3JlYXRlZFwiLCBcInJlbWVtYmVyXCIsIFwic3RhbmRhcmRzXCIsIFwib2lsXCIsIFwiYml0XCIsIFwieWVsbG93XCIsIFwicG9saXRpY2FsXCIsIFwiaW5jcmVhc2VcIiwgXCJhZHZlcnRpc2VcIiwgXCJraW5nZG9tXCIsIFwiYmFzZVwiLCBcIm5lYXJcIiwgXCJlbnZpcm9ubWVudGFsXCIsIFwidGhvdWdodFwiLCBcInN0dWZmXCIsIFwiZnJlbmNoXCIsIFwic3RvcmFnZVwiLCBcIm9oXCIsIFwiamFwYW5cIiwgXCJkb2luZ1wiLCBcImxvYW5zXCIsIFwic2hvZXNcIiwgXCJlbnRyeVwiLCBcInN0YXlcIiwgXCJuYXR1cmVcIiwgXCJvcmRlcnNcIiwgXCJhdmFpbGFiaWxpdHlcIiwgXCJhZnJpY2FcIiwgXCJzdW1tYXJ5XCIsIFwidHVyblwiLCBcIm1lYW5cIiwgXCJncm93dGhcIiwgXCJub3Rlc1wiLCBcImFnZW5jeVwiLCBcImtpbmdcIiwgXCJtb25kYXlcIiwgXCJldXJvcGVhblwiLCBcImFjdGl2aXR5XCIsIFwiY29weVwiLCBcImFsdGhvdWdoXCIsIFwiZHJ1Z1wiLCBcInBpY3NcIiwgXCJ3ZXN0ZXJuXCIsIFwiaW5jb21lXCIsIFwiZm9yY2VcIiwgXCJjYXNoXCIsIFwiZW1wbG95bWVudFwiLCBcIm92ZXJhbGxcIiwgXCJiYXlcIiwgXCJyaXZlclwiLCBcImNvbW1pc3Npb25cIiwgXCJhZFwiLCBcInBhY2thZ2VcIiwgXCJjb250ZW50c1wiLCBcInNlZW5cIiwgXCJwbGF5ZXJzXCIsIFwiZW5naW5lXCIsIFwicG9ydFwiLCBcImFsYnVtXCIsIFwicmVnaW9uYWxcIiwgXCJzdG9wXCIsIFwic3VwcGxpZXNcIiwgXCJzdGFydGVkXCIsIFwiYWRtaW5pc3RyYXRpb25cIiwgXCJiYXJcIiwgXCJpbnN0aXR1dGVcIiwgXCJ2aWV3c1wiLCBcInBsYW5zXCIsIFwiZG91YmxlXCIsIFwiZG9nXCIsIFwiYnVpbGRcIiwgXCJzY3JlZW5cIiwgXCJleGNoYW5nZVwiLCBcInR5cGVzXCIsIFwic29vblwiLCBcInNwb25zb3JlZFwiLCBcImxpbmVzXCIsIFwiZWxlY3Ryb25pY1wiLCBcImNvbnRpbnVlXCIsIFwiYWNyb3NzXCIsIFwiYmVuZWZpdHNcIiwgXCJuZWVkZWRcIiwgXCJzZWFzb25cIiwgXCJhcHBseVwiLCBcInNvbWVvbmVcIiwgXCJoZWxkXCIsIFwibnlcIiwgXCJhbnl0aGluZ1wiLCBcInByaW50ZXJcIiwgXCJjb25kaXRpb25cIiwgXCJlZmZlY3RpdmVcIiwgXCJiZWxpZXZlXCIsIFwib3JnYW5pemF0aW9uXCIsIFwiZWZmZWN0XCIsIFwiYXNrZWRcIiwgXCJldXJcIiwgXCJtaW5kXCIsIFwic3VuZGF5XCIsIFwic2VsZWN0aW9uXCIsIFwiY2FzaW5vXCIsIFwicGRmXCIsIFwibG9zdFwiLCBcInRvdXJcIiwgXCJtZW51XCIsIFwidm9sdW1lXCIsIFwiY3Jvc3NcIiwgXCJhbnlvbmVcIiwgXCJtb3J0Z2FnZVwiLCBcImhvcGVcIiwgXCJzaWx2ZXJcIiwgXCJjb3Jwb3JhdGlvblwiLCBcIndpc2hcIiwgXCJpbnNpZGVcIiwgXCJzb2x1dGlvblwiLCBcIm1hdHVyZVwiLCBcInJvbGVcIiwgXCJyYXRoZXJcIiwgXCJ3ZWVrc1wiLCBcImFkZGl0aW9uXCIsIFwiY2FtZVwiLCBcInN1cHBseVwiLCBcIm5vdGhpbmdcIiwgXCJjZXJ0YWluXCIsIFwidXNyXCIsIFwiZXhlY3V0aXZlXCIsIFwicnVubmluZ1wiLCBcImxvd2VyXCIsIFwibmVjZXNzYXJ5XCIsIFwidW5pb25cIiwgXCJqZXdlbHJ5XCIsIFwiYWNjb3JkaW5nXCIsIFwiZGNcIiwgXCJjbG90aGluZ1wiLCBcIm1vblwiLCBcImNvbVwiLCBcInBhcnRpY3VsYXJcIiwgXCJmaW5lXCIsIFwibmFtZXNcIiwgXCJyb2JlcnRcIiwgXCJob21lcGFnZVwiLCBcImhvdXJcIiwgXCJnYXNcIiwgXCJza2lsbHNcIiwgXCJzaXhcIiwgXCJidXNoXCIsIFwiaXNsYW5kc1wiLCBcImFkdmljZVwiLCBcImNhcmVlclwiLCBcIm1pbGl0YXJ5XCIsIFwicmVudGFsXCIsIFwiZGVjaXNpb25cIiwgXCJsZWF2ZVwiLCBcImJyaXRpc2hcIiwgXCJ0ZWVuc1wiLCBcInByZVwiLCBcImh1Z2VcIiwgXCJzYXRcIiwgXCJ3b21hblwiLCBcImZhY2lsaXRpZXNcIiwgXCJ6aXBcIiwgXCJiaWRcIiwgXCJraW5kXCIsIFwic2VsbGVyc1wiLCBcIm1pZGRsZVwiLCBcIm1vdmVcIiwgXCJjYWJsZVwiLCBcIm9wcG9ydHVuaXRpZXNcIiwgXCJ0YWtpbmdcIiwgXCJ2YWx1ZXNcIiwgXCJkaXZpc2lvblwiLCBcImNvbWluZ1wiLCBcInR1ZXNkYXlcIiwgXCJvYmplY3RcIiwgXCJsZXNiaWFuXCIsIFwiYXBwcm9wcmlhdGVcIiwgXCJtYWNoaW5lXCIsIFwibG9nb1wiLCBcImxlbmd0aFwiLCBcImFjdHVhbGx5XCIsIFwibmljZVwiLCBcInNjb3JlXCIsIFwic3RhdGlzdGljc1wiLCBcImNsaWVudFwiLCBcIm9rXCIsIFwicmV0dXJuc1wiLCBcImNhcGl0YWxcIiwgXCJmb2xsb3dcIiwgXCJzYW1wbGVcIiwgXCJpbnZlc3RtZW50XCIsIFwic2VudFwiLCBcInNob3duXCIsIFwic2F0dXJkYXlcIiwgXCJjaHJpc3RtYXNcIiwgXCJlbmdsYW5kXCIsIFwiY3VsdHVyZVwiLCBcImJhbmRcIiwgXCJmbGFzaFwiLCBcIm1zXCIsIFwibGVhZFwiLCBcImdlb3JnZVwiLCBcImNob2ljZVwiLCBcIndlbnRcIiwgXCJzdGFydGluZ1wiLCBcInJlZ2lzdHJhdGlvblwiLCBcImZyaVwiLCBcInRodXJzZGF5XCIsIFwiY291cnNlc1wiLCBcImNvbnN1bWVyXCIsIFwiaGlcIiwgXCJhaXJwb3J0XCIsIFwiZm9yZWlnblwiLCBcImFydGlzdFwiLCBcIm91dHNpZGVcIiwgXCJmdXJuaXR1cmVcIiwgXCJsZXZlbHNcIiwgXCJjaGFubmVsXCIsIFwibGV0dGVyXCIsIFwibW9kZVwiLCBcInBob25lc1wiLCBcImlkZWFzXCIsIFwid2VkbmVzZGF5XCIsIFwic3RydWN0dXJlXCIsIFwiZnVuZFwiLCBcInN1bW1lclwiLCBcImFsbG93XCIsIFwiZGVncmVlXCIsIFwiY29udHJhY3RcIiwgXCJidXR0b25cIiwgXCJyZWxlYXNlc1wiLCBcIndlZFwiLCBcImhvbWVzXCIsIFwic3VwZXJcIiwgXCJtYWxlXCIsIFwibWF0dGVyXCIsIFwiY3VzdG9tXCIsIFwidmlyZ2luaWFcIiwgXCJhbG1vc3RcIiwgXCJ0b29rXCIsIFwibG9jYXRlZFwiLCBcIm11bHRpcGxlXCIsIFwiYXNpYW5cIiwgXCJkaXN0cmlidXRpb25cIiwgXCJlZGl0b3JcIiwgXCJpbm5cIiwgXCJpbmR1c3RyaWFsXCIsIFwiY2F1c2VcIiwgXCJwb3RlbnRpYWxcIiwgXCJzb25nXCIsIFwiY25ldFwiLCBcImx0ZFwiLCBcImxvc1wiLCBcImhwXCIsIFwiZm9jdXNcIiwgXCJsYXRlXCIsIFwiZmFsbFwiLCBcImZlYXR1cmVkXCIsIFwiaWRlYVwiLCBcInJvb21zXCIsIFwiZmVtYWxlXCIsIFwicmVzcG9uc2libGVcIiwgXCJpbmNcIiwgXCJjb21tdW5pY2F0aW9uc1wiLCBcIndpblwiLCBcImFzc29jaWF0ZWRcIiwgXCJ0aG9tYXNcIiwgXCJwcmltYXJ5XCIsIFwiY2FuY2VyXCIsIFwibnVtYmVyc1wiLCBcInJlYXNvblwiLCBcInRvb2xcIiwgXCJicm93c2VyXCIsIFwic3ByaW5nXCIsIFwiZm91bmRhdGlvblwiLCBcImFuc3dlclwiLCBcInZvaWNlXCIsIFwiZWdcIiwgXCJmcmllbmRseVwiLCBcInNjaGVkdWxlXCIsIFwiZG9jdW1lbnRzXCIsIFwiY29tbXVuaWNhdGlvblwiLCBcInB1cnBvc2VcIiwgXCJmZWF0dXJlXCIsIFwiYmVkXCIsIFwiY29tZXNcIiwgXCJwb2xpY2VcIiwgXCJldmVyeW9uZVwiLCBcImluZGVwZW5kZW50XCIsIFwiaXBcIiwgXCJhcHByb2FjaFwiLCBcImNhbWVyYXNcIiwgXCJicm93blwiLCBcInBoeXNpY2FsXCIsIFwib3BlcmF0aW5nXCIsIFwiaGlsbFwiLCBcIm1hcHNcIiwgXCJtZWRpY2luZVwiLCBcImRlYWxcIiwgXCJob2xkXCIsIFwicmF0aW5nc1wiLCBcImNoaWNhZ29cIiwgXCJmb3Jtc1wiLCBcImdsYXNzXCIsIFwiaGFwcHlcIiwgXCJ0dWVcIiwgXCJzbWl0aFwiLCBcIndhbnRlZFwiLCBcImRldmVsb3BlZFwiLCBcInRoYW5rXCIsIFwic2FmZVwiLCBcInVuaXF1ZVwiLCBcInN1cnZleVwiLCBcInByaW9yXCIsIFwidGVsZXBob25lXCIsIFwic3BvcnRcIiwgXCJyZWFkeVwiLCBcImZlZWRcIiwgXCJhbmltYWxcIiwgXCJzb3VyY2VzXCIsIFwibWV4aWNvXCIsIFwicG9wdWxhdGlvblwiLCBcInBhXCIsIFwicmVndWxhclwiLCBcInNlY3VyZVwiLCBcIm5hdmlnYXRpb25cIiwgXCJvcGVyYXRpb25zXCIsIFwidGhlcmVmb3JlXCIsIFwiYXNzXCIsIFwic2ltcGx5XCIsIFwiZXZpZGVuY2VcIiwgXCJzdGF0aW9uXCIsIFwiY2hyaXN0aWFuXCIsIFwicm91bmRcIiwgXCJwYXlwYWxcIiwgXCJmYXZvcml0ZVwiLCBcInVuZGVyc3RhbmRcIiwgXCJvcHRpb25cIiwgXCJtYXN0ZXJcIiwgXCJ2YWxsZXlcIiwgXCJyZWNlbnRseVwiLCBcInByb2JhYmx5XCIsIFwidGh1XCIsIFwicmVudGFsc1wiLCBcInNlYVwiLCBcImJ1aWx0XCIsIFwicHVibGljYXRpb25zXCIsIFwiYmxvb2RcIiwgXCJjdXRcIiwgXCJ3b3JsZHdpZGVcIiwgXCJpbXByb3ZlXCIsIFwiY29ubmVjdGlvblwiLCBcInB1Ymxpc2hlclwiLCBcImhhbGxcIiwgXCJsYXJnZXJcIiwgXCJhbnRpXCIsIFwibmV0d29ya3NcIiwgXCJlYXJ0aFwiLCBcInBhcmVudHNcIiwgXCJub2tpYVwiLCBcImltcGFjdFwiLCBcInRyYW5zZmVyXCIsIFwiaW50cm9kdWN0aW9uXCIsIFwia2l0Y2hlblwiLCBcInN0cm9uZ1wiLCBcInRlbFwiLCBcImNhcm9saW5hXCIsIFwid2VkZGluZ1wiLCBcInByb3BlcnRpZXNcIiwgXCJob3NwaXRhbFwiLCBcImdyb3VuZFwiLCBcIm92ZXJ2aWV3XCIsIFwic2hpcFwiLCBcImFjY29tbW9kYXRpb25cIiwgXCJvd25lcnNcIiwgXCJkaXNlYXNlXCIsIFwidHhcIiwgXCJleGNlbGxlbnRcIiwgXCJwYWlkXCIsIFwiaXRhbHlcIiwgXCJwZXJmZWN0XCIsIFwiaGFpclwiLCBcIm9wcG9ydHVuaXR5XCIsIFwia2l0XCIsIFwiY2xhc3NpY1wiLCBcImJhc2lzXCIsIFwiY29tbWFuZFwiLCBcImNpdGllc1wiLCBcIndpbGxpYW1cIiwgXCJleHByZXNzXCIsIFwiYW5hbFwiLCBcImF3YXJkXCIsIFwiZGlzdGFuY2VcIiwgXCJ0cmVlXCIsIFwicGV0ZXJcIiwgXCJhc3Nlc3NtZW50XCIsIFwiZW5zdXJlXCIsIFwidGh1c1wiLCBcIndhbGxcIiwgXCJpZVwiLCBcImludm9sdmVkXCIsIFwiZWxcIiwgXCJleHRyYVwiLCBcImVzcGVjaWFsbHlcIiwgXCJpbnRlcmZhY2VcIiwgXCJwdXNzeVwiLCBcInBhcnRuZXJzXCIsIFwiYnVkZ2V0XCIsIFwicmF0ZWRcIiwgXCJndWlkZXNcIiwgXCJzdWNjZXNzXCIsIFwibWF4aW11bVwiLCBcIm1hXCIsIFwib3BlcmF0aW9uXCIsIFwiZXhpc3RpbmdcIiwgXCJxdWl0ZVwiLCBcInNlbGVjdGVkXCIsIFwiYm95XCIsIFwiYW1hem9uXCIsIFwicGF0aWVudHNcIiwgXCJyZXN0YXVyYW50c1wiLCBcImJlYXV0aWZ1bFwiLCBcIndhcm5pbmdcIiwgXCJ3aW5lXCIsIFwibG9jYXRpb25zXCIsIFwiaG9yc2VcIiwgXCJ2b3RlXCIsIFwiZm9yd2FyZFwiLCBcImZsb3dlcnNcIiwgXCJzdGFyc1wiLCBcInNpZ25pZmljYW50XCIsIFwibGlzdHNcIiwgXCJ0ZWNobm9sb2dpZXNcIiwgXCJvd25lclwiLCBcInJldGFpbFwiLCBcImFuaW1hbHNcIiwgXCJ1c2VmdWxcIiwgXCJkaXJlY3RseVwiLCBcIm1hbnVmYWN0dXJlclwiLCBcIndheXNcIiwgXCJlc3RcIiwgXCJzb25cIiwgXCJwcm92aWRpbmdcIiwgXCJydWxlXCIsIFwibWFjXCIsIFwiaG91c2luZ1wiLCBcInRha2VzXCIsIFwiaWlpXCIsIFwiZ210XCIsIFwiYnJpbmdcIiwgXCJjYXRhbG9nXCIsIFwic2VhcmNoZXNcIiwgXCJtYXhcIiwgXCJ0cnlpbmdcIiwgXCJtb3RoZXJcIiwgXCJhdXRob3JpdHlcIiwgXCJjb25zaWRlcmVkXCIsIFwidG9sZFwiLCBcInhtbFwiLCBcInRyYWZmaWNcIiwgXCJwcm9ncmFtbWVcIiwgXCJqb2luZWRcIiwgXCJpbnB1dFwiLCBcInN0cmF0ZWd5XCIsIFwiZmVldFwiLCBcImFnZW50XCIsIFwidmFsaWRcIiwgXCJiaW5cIiwgXCJtb2Rlcm5cIiwgXCJzZW5pb3JcIiwgXCJpcmVsYW5kXCIsIFwic2V4eVwiLCBcInRlYWNoaW5nXCIsIFwiZG9vclwiLCBcImdyYW5kXCIsIFwidGVzdGluZ1wiLCBcInRyaWFsXCIsIFwiY2hhcmdlXCIsIFwidW5pdHNcIiwgXCJpbnN0ZWFkXCIsIFwiY2FuYWRpYW5cIiwgXCJjb29sXCIsIFwibm9ybWFsXCIsIFwid3JvdGVcIiwgXCJlbnRlcnByaXNlXCIsIFwic2hpcHNcIiwgXCJlbnRpcmVcIiwgXCJlZHVjYXRpb25hbFwiLCBcIm1kXCIsIFwibGVhZGluZ1wiLCBcIm1ldGFsXCIsIFwicG9zaXRpdmVcIiwgXCJmbFwiLCBcImZpdG5lc3NcIiwgXCJjaGluZXNlXCIsIFwib3BpbmlvblwiLCBcIm1iXCIsIFwiYXNpYVwiLCBcImZvb3RiYWxsXCIsIFwiYWJzdHJhY3RcIiwgXCJ1c2VzXCIsIFwib3V0cHV0XCIsIFwiZnVuZHNcIiwgXCJtclwiLCBcImdyZWF0ZXJcIiwgXCJsaWtlbHlcIiwgXCJkZXZlbG9wXCIsIFwiZW1wbG95ZWVzXCIsIFwiYXJ0aXN0c1wiLCBcImFsdGVybmF0aXZlXCIsIFwicHJvY2Vzc2luZ1wiLCBcInJlc3BvbnNpYmlsaXR5XCIsIFwicmVzb2x1dGlvblwiLCBcImphdmFcIiwgXCJndWVzdFwiLCBcInNlZW1zXCIsIFwicHVibGljYXRpb25cIiwgXCJwYXNzXCIsIFwicmVsYXRpb25zXCIsIFwidHJ1c3RcIiwgXCJ2YW5cIiwgXCJjb250YWluc1wiLCBcInNlc3Npb25cIiwgXCJtdWx0aVwiLCBcInBob3RvZ3JhcGh5XCIsIFwicmVwdWJsaWNcIiwgXCJmZWVzXCIsIFwiY29tcG9uZW50c1wiLCBcInZhY2F0aW9uXCIsIFwiY2VudHVyeVwiLCBcImFjYWRlbWljXCIsIFwiYXNzaXN0YW5jZVwiLCBcImNvbXBsZXRlZFwiLCBcInNraW5cIiwgXCJncmFwaGljc1wiLCBcImluZGlhblwiLCBcInByZXZcIiwgXCJhZHNcIiwgXCJtYXJ5XCIsIFwiaWxcIiwgXCJleHBlY3RlZFwiLCBcInJpbmdcIiwgXCJncmFkZVwiLCBcImRhdGluZ1wiLCBcInBhY2lmaWNcIiwgXCJtb3VudGFpblwiLCBcIm9yZ2FuaXphdGlvbnNcIiwgXCJwb3BcIiwgXCJmaWx0ZXJcIiwgXCJtYWlsaW5nXCIsIFwidmVoaWNsZVwiLCBcImxvbmdlclwiLCBcImNvbnNpZGVyXCIsIFwiaW50XCIsIFwibm9ydGhlcm5cIiwgXCJiZWhpbmRcIiwgXCJwYW5lbFwiLCBcImZsb29yXCIsIFwiZ2VybWFuXCIsIFwiYnV5aW5nXCIsIFwibWF0Y2hcIiwgXCJwcm9wb3NlZFwiLCBcImRlZmF1bHRcIiwgXCJyZXF1aXJlXCIsIFwiaXJhcVwiLCBcImJveXNcIiwgXCJvdXRkb29yXCIsIFwiZGVlcFwiLCBcIm1vcm5pbmdcIiwgXCJvdGhlcndpc2VcIiwgXCJhbGxvd3NcIiwgXCJyZXN0XCIsIFwicHJvdGVpblwiLCBcInBsYW50XCIsIFwicmVwb3J0ZWRcIiwgXCJoaXRcIiwgXCJ0cmFuc3BvcnRhdGlvblwiLCBcIm1tXCIsIFwicG9vbFwiLCBcIm1pbmlcIiwgXCJwb2xpdGljc1wiLCBcInBhcnRuZXJcIiwgXCJkaXNjbGFpbWVyXCIsIFwiYXV0aG9yc1wiLCBcImJvYXJkc1wiLCBcImZhY3VsdHlcIiwgXCJwYXJ0aWVzXCIsIFwiZmlzaFwiLCBcIm1lbWJlcnNoaXBcIiwgXCJtaXNzaW9uXCIsIFwiZXllXCIsIFwic3RyaW5nXCIsIFwic2Vuc2VcIiwgXCJtb2RpZmllZFwiLCBcInBhY2tcIiwgXCJyZWxlYXNlZFwiLCBcInN0YWdlXCIsIFwiaW50ZXJuYWxcIiwgXCJnb29kc1wiLCBcInJlY29tbWVuZGVkXCIsIFwiYm9yblwiLCBcInVubGVzc1wiLCBcInJpY2hhcmRcIiwgXCJkZXRhaWxlZFwiLCBcImphcGFuZXNlXCIsIFwicmFjZVwiLCBcImFwcHJvdmVkXCIsIFwiYmFja2dyb3VuZFwiLCBcInRhcmdldFwiLCBcImV4Y2VwdFwiLCBcImNoYXJhY3RlclwiLCBcInVzYlwiLCBcIm1haW50ZW5hbmNlXCIsIFwiYWJpbGl0eVwiLCBcIm1heWJlXCIsIFwiZnVuY3Rpb25zXCIsIFwiZWRcIiwgXCJtb3ZpbmdcIiwgXCJicmFuZHNcIiwgXCJwbGFjZXNcIiwgXCJwaHBcIiwgXCJwcmV0dHlcIiwgXCJ0cmFkZW1hcmtzXCIsIFwicGhlbnRlcm1pbmVcIiwgXCJzcGFpblwiLCBcInNvdXRoZXJuXCIsIFwieW91cnNlbGZcIiwgXCJldGNcIiwgXCJ3aW50ZXJcIiwgXCJyYXBlXCIsIFwiYmF0dGVyeVwiLCBcInlvdXRoXCIsIFwicHJlc3N1cmVcIiwgXCJzdWJtaXR0ZWRcIiwgXCJib3N0b25cIiwgXCJpbmNlc3RcIiwgXCJkZWJ0XCIsIFwia2V5d29yZHNcIiwgXCJtZWRpdW1cIiwgXCJ0ZWxldmlzaW9uXCIsIFwiaW50ZXJlc3RlZFwiLCBcImNvcmVcIiwgXCJicmVha1wiLCBcInB1cnBvc2VzXCIsIFwidGhyb3VnaG91dFwiLCBcInNldHNcIiwgXCJkYW5jZVwiLCBcIndvb2RcIiwgXCJtc25cIiwgXCJpdHNlbGZcIiwgXCJkZWZpbmVkXCIsIFwicGFwZXJzXCIsIFwicGxheWluZ1wiLCBcImF3YXJkc1wiLCBcImZlZVwiLCBcInN0dWRpb1wiLCBcInJlYWRlclwiLCBcInZpcnR1YWxcIiwgXCJkZXZpY2VcIiwgXCJlc3RhYmxpc2hlZFwiLCBcImFuc3dlcnNcIiwgXCJyZW50XCIsIFwibGFzXCIsIFwicmVtb3RlXCIsIFwiZGFya1wiLCBcInByb2dyYW1taW5nXCIsIFwiZXh0ZXJuYWxcIiwgXCJhcHBsZVwiLCBcImxlXCIsIFwicmVnYXJkaW5nXCIsIFwiaW5zdHJ1Y3Rpb25zXCIsIFwibWluXCIsIFwib2ZmZXJlZFwiLCBcInRoZW9yeVwiLCBcImVuam95XCIsIFwicmVtb3ZlXCIsIFwiYWlkXCIsIFwic3VyZmFjZVwiLCBcIm1pbmltdW1cIiwgXCJ2aXN1YWxcIiwgXCJob3N0XCIsIFwidmFyaWV0eVwiLCBcInRlYWNoZXJzXCIsIFwiaXNiblwiLCBcIm1hcnRpblwiLCBcIm1hbnVhbFwiLCBcImJsb2NrXCIsIFwic3ViamVjdHNcIiwgXCJhZ2VudHNcIiwgXCJpbmNyZWFzZWRcIiwgXCJyZXBhaXJcIiwgXCJmYWlyXCIsIFwiY2l2aWxcIiwgXCJzdGVlbFwiLCBcInVuZGVyc3RhbmRpbmdcIiwgXCJzb25nc1wiLCBcImZpeGVkXCIsIFwid3JvbmdcIiwgXCJiZWdpbm5pbmdcIiwgXCJoYW5kc1wiLCBcImFzc29jaWF0ZXNcIiwgXCJmaW5hbGx5XCIsIFwiYXpcIiwgXCJ1cGRhdGVzXCIsIFwiZGVza3RvcFwiLCBcImNsYXNzZXNcIiwgXCJwYXJpc1wiLCBcIm9oaW9cIiwgXCJnZXRzXCIsIFwic2VjdG9yXCIsIFwiY2FwYWNpdHlcIiwgXCJyZXF1aXJlc1wiLCBcImplcnNleVwiLCBcInVuXCIsIFwiZmF0XCIsIFwiZnVsbHlcIiwgXCJmYXRoZXJcIiwgXCJlbGVjdHJpY1wiLCBcInNhd1wiLCBcImluc3RydW1lbnRzXCIsIFwicXVvdGVzXCIsIFwib2ZmaWNlclwiLCBcImRyaXZlclwiLCBcImJ1c2luZXNzZXNcIiwgXCJkZWFkXCIsIFwicmVzcGVjdFwiLCBcInVua25vd25cIiwgXCJzcGVjaWZpZWRcIiwgXCJyZXN0YXVyYW50XCIsIFwibWlrZVwiLCBcInRyaXBcIiwgXCJwc3RcIiwgXCJ3b3J0aFwiLCBcIm1pXCIsIFwicHJvY2VkdXJlc1wiLCBcInBvb3JcIiwgXCJ0ZWFjaGVyXCIsIFwieHh4XCIsIFwiZXllc1wiLCBcInJlbGF0aW9uc2hpcFwiLCBcIndvcmtlcnNcIiwgXCJmYXJtXCIsIFwiZnVja2luZ1wiLCBcImdlb3JnaWFcIiwgXCJwZWFjZVwiLCBcInRyYWRpdGlvbmFsXCIsIFwiY2FtcHVzXCIsIFwidG9tXCIsIFwic2hvd2luZ1wiLCBcImNyZWF0aXZlXCIsIFwiY29hc3RcIiwgXCJiZW5lZml0XCIsIFwicHJvZ3Jlc3NcIiwgXCJmdW5kaW5nXCIsIFwiZGV2aWNlc1wiLCBcImxvcmRcIiwgXCJncmFudFwiLCBcInN1YlwiLCBcImFncmVlXCIsIFwiZmljdGlvblwiLCBcImhlYXJcIiwgXCJzb21ldGltZXNcIiwgXCJ3YXRjaGVzXCIsIFwiY2FyZWVyc1wiLCBcImJleW9uZFwiLCBcImdvZXNcIiwgXCJmYW1pbGllc1wiLCBcImxlZFwiLCBcIm11c2V1bVwiLCBcInRoZW1zZWx2ZXNcIiwgXCJmYW5cIiwgXCJ0cmFuc3BvcnRcIiwgXCJpbnRlcmVzdGluZ1wiLCBcImJsb2dzXCIsIFwid2lmZVwiLCBcImV2YWx1YXRpb25cIiwgXCJhY2NlcHRlZFwiLCBcImZvcm1lclwiLCBcImltcGxlbWVudGF0aW9uXCIsIFwidGVuXCIsIFwiaGl0c1wiLCBcInpvbmVcIiwgXCJjb21wbGV4XCIsIFwidGhcIiwgXCJjYXRcIiwgXCJnYWxsZXJpZXNcIiwgXCJyZWZlcmVuY2VzXCIsIFwiZGllXCIsIFwicHJlc2VudGVkXCIsIFwiamFja1wiLCBcImZsYXRcIiwgXCJmbG93XCIsIFwiYWdlbmNpZXNcIiwgXCJsaXRlcmF0dXJlXCIsIFwicmVzcGVjdGl2ZVwiLCBcInBhcmVudFwiLCBcInNwYW5pc2hcIiwgXCJtaWNoaWdhblwiLCBcImNvbHVtYmlhXCIsIFwic2V0dGluZ1wiLCBcImRyXCIsIFwic2NhbGVcIiwgXCJzdGFuZFwiLCBcImVjb25vbXlcIiwgXCJoaWdoZXN0XCIsIFwiaGVscGZ1bFwiLCBcIm1vbnRobHlcIiwgXCJjcml0aWNhbFwiLCBcImZyYW1lXCIsIFwibXVzaWNhbFwiLCBcImRlZmluaXRpb25cIiwgXCJzZWNyZXRhcnlcIiwgXCJhbmdlbGVzXCIsIFwibmV0d29ya2luZ1wiLCBcInBhdGhcIiwgXCJhdXN0cmFsaWFuXCIsIFwiZW1wbG95ZWVcIiwgXCJjaGllZlwiLCBcImdpdmVzXCIsIFwia2JcIiwgXCJib3R0b21cIiwgXCJtYWdhemluZXNcIiwgXCJwYWNrYWdlc1wiLCBcImRldGFpbFwiLCBcImZyYW5jaXNjb1wiLCBcImxhd3NcIiwgXCJjaGFuZ2VkXCIsIFwicGV0XCIsIFwiaGVhcmRcIiwgXCJiZWdpblwiLCBcImluZGl2aWR1YWxzXCIsIFwiY29sb3JhZG9cIiwgXCJyb3lhbFwiLCBcImNsZWFuXCIsIFwic3dpdGNoXCIsIFwicnVzc2lhblwiLCBcImxhcmdlc3RcIiwgXCJhZnJpY2FuXCIsIFwiZ3V5XCIsIFwidGl0bGVzXCIsIFwicmVsZXZhbnRcIiwgXCJndWlkZWxpbmVzXCIsIFwianVzdGljZVwiLCBcImNvbm5lY3RcIiwgXCJiaWJsZVwiLCBcImRldlwiLCBcImN1cFwiLCBcImJhc2tldFwiLCBcImFwcGxpZWRcIiwgXCJ3ZWVrbHlcIiwgXCJ2b2xcIiwgXCJpbnN0YWxsYXRpb25cIiwgXCJkZXNjcmliZWRcIiwgXCJkZW1hbmRcIiwgXCJwcFwiLCBcInN1aXRlXCIsIFwidmVnYXNcIiwgXCJuYVwiLCBcInNxdWFyZVwiLCBcImNocmlzXCIsIFwiYXR0ZW50aW9uXCIsIFwiYWR2YW5jZVwiLCBcInNraXBcIiwgXCJkaWV0XCIsIFwiYXJteVwiLCBcImF1Y3Rpb25cIiwgXCJnZWFyXCIsIFwibGVlXCIsIFwib3NcIiwgXCJkaWZmZXJlbmNlXCIsIFwiYWxsb3dlZFwiLCBcImNvcnJlY3RcIiwgXCJjaGFybGVzXCIsIFwibmF0aW9uXCIsIFwic2VsbGluZ1wiLCBcImxvdHNcIiwgXCJwaWVjZVwiLCBcInNoZWV0XCIsIFwiZmlybVwiLCBcInNldmVuXCIsIFwib2xkZXJcIiwgXCJpbGxpbm9pc1wiLCBcInJlZ3VsYXRpb25zXCIsIFwiZWxlbWVudHNcIiwgXCJzcGVjaWVzXCIsIFwianVtcFwiLCBcImNlbGxzXCIsIFwibW9kdWxlXCIsIFwicmVzb3J0XCIsIFwiZmFjaWxpdHlcIiwgXCJyYW5kb21cIiwgXCJwcmljaW5nXCIsIFwiZHZkc1wiLCBcImNlcnRpZmljYXRlXCIsIFwibWluaXN0ZXJcIiwgXCJtb3Rpb25cIiwgXCJsb29rc1wiLCBcImZhc2hpb25cIiwgXCJkaXJlY3Rpb25zXCIsIFwidmlzaXRvcnNcIiwgXCJkb2N1bWVudGF0aW9uXCIsIFwibW9uaXRvclwiLCBcInRyYWRpbmdcIiwgXCJmb3Jlc3RcIiwgXCJjYWxsc1wiLCBcIndob3NlXCIsIFwiY292ZXJhZ2VcIiwgXCJjb3VwbGVcIiwgXCJnaXZpbmdcIiwgXCJjaGFuY2VcIiwgXCJ2aXNpb25cIiwgXCJiYWxsXCIsIFwiZW5kaW5nXCIsIFwiY2xpZW50c1wiLCBcImFjdGlvbnNcIiwgXCJsaXN0ZW5cIiwgXCJkaXNjdXNzXCIsIFwiYWNjZXB0XCIsIFwiYXV0b21vdGl2ZVwiLCBcIm5ha2VkXCIsIFwiZ29hbFwiLCBcInN1Y2Nlc3NmdWxcIiwgXCJzb2xkXCIsIFwid2luZFwiLCBcImNvbW11bml0aWVzXCIsIFwiY2xpbmljYWxcIiwgXCJzaXR1YXRpb25cIiwgXCJzY2llbmNlc1wiLCBcIm1hcmtldHNcIiwgXCJsb3dlc3RcIiwgXCJoaWdobHlcIiwgXCJwdWJsaXNoaW5nXCIsIFwiYXBwZWFyXCIsIFwiZW1lcmdlbmN5XCIsIFwiZGV2ZWxvcGluZ1wiLCBcImxpdmVzXCIsIFwiY3VycmVuY3lcIiwgXCJsZWF0aGVyXCIsIFwiZGV0ZXJtaW5lXCIsIFwibWlsZlwiLCBcInRlbXBlcmF0dXJlXCIsIFwicGFsbVwiLCBcImFubm91bmNlbWVudHNcIiwgXCJwYXRpZW50XCIsIFwiYWN0dWFsXCIsIFwiaGlzdG9yaWNhbFwiLCBcInN0b25lXCIsIFwiYm9iXCIsIFwiY29tbWVyY2VcIiwgXCJyaW5ndG9uZXNcIiwgXCJwZXJoYXBzXCIsIFwicGVyc29uc1wiLCBcImRpZmZpY3VsdFwiLCBcInNjaWVudGlmaWNcIiwgXCJzYXRlbGxpdGVcIiwgXCJmaXRcIiwgXCJ0ZXN0c1wiLCBcInZpbGxhZ2VcIiwgXCJhY2NvdW50c1wiLCBcImFtYXRldXJcIiwgXCJleFwiLCBcIm1ldFwiLCBcInBhaW5cIiwgXCJ4Ym94XCIsIFwicGFydGljdWxhcmx5XCIsIFwiZmFjdG9yc1wiLCBcImNvZmZlZVwiLCBcInd3d1wiLCBcInNldHRpbmdzXCIsIFwiY3VtXCIsIFwiYnV5ZXJcIiwgXCJjdWx0dXJhbFwiLCBcInN0ZXZlXCIsIFwiZWFzaWx5XCIsIFwib3JhbFwiLCBcImZvcmRcIiwgXCJwb3N0ZXJcIiwgXCJlZGdlXCIsIFwiZnVuY3Rpb25hbFwiLCBcInJvb3RcIiwgXCJhdVwiLCBcImZpXCIsIFwiY2xvc2VkXCIsIFwiaG9saWRheXNcIiwgXCJpY2VcIiwgXCJwaW5rXCIsIFwiemVhbGFuZFwiLCBcImJhbGFuY2VcIiwgXCJtb25pdG9yaW5nXCIsIFwiZ3JhZHVhdGVcIiwgXCJyZXBsaWVzXCIsIFwic2hvdFwiLCBcIm5jXCIsIFwiYXJjaGl0ZWN0dXJlXCIsIFwiaW5pdGlhbFwiLCBcImxhYmVsXCIsIFwidGhpbmtpbmdcIiwgXCJzY290dFwiLCBcImxsY1wiLCBcInNlY1wiLCBcInJlY29tbWVuZFwiLCBcImNhbm9uXCIsIFwiaGFyZGNvcmVcIiwgXCJsZWFndWVcIiwgXCJ3YXN0ZVwiLCBcIm1pbnV0ZVwiLCBcImJ1c1wiLCBcInByb3ZpZGVyXCIsIFwib3B0aW9uYWxcIiwgXCJkaWN0aW9uYXJ5XCIsIFwiY29sZFwiLCBcImFjY291bnRpbmdcIiwgXCJtYW51ZmFjdHVyaW5nXCIsIFwic2VjdGlvbnNcIiwgXCJjaGFpclwiLCBcImZpc2hpbmdcIiwgXCJlZmZvcnRcIiwgXCJwaGFzZVwiLCBcImZpZWxkc1wiLCBcImJhZ1wiLCBcImZhbnRhc3lcIiwgXCJwb1wiLCBcImxldHRlcnNcIiwgXCJtb3RvclwiLCBcInZhXCIsIFwicHJvZmVzc29yXCIsIFwiY29udGV4dFwiLCBcImluc3RhbGxcIiwgXCJzaGlydFwiLCBcImFwcGFyZWxcIiwgXCJnZW5lcmFsbHlcIiwgXCJjb250aW51ZWRcIiwgXCJmb290XCIsIFwibWFzc1wiLCBcImNyaW1lXCIsIFwiY291bnRcIiwgXCJicmVhc3RcIiwgXCJ0ZWNobmlxdWVzXCIsIFwiaWJtXCIsIFwicmRcIiwgXCJqb2huc29uXCIsIFwic2NcIiwgXCJxdWlja2x5XCIsIFwiZG9sbGFyc1wiLCBcIndlYnNpdGVzXCIsIFwicmVsaWdpb25cIiwgXCJjbGFpbVwiLCBcImRyaXZpbmdcIiwgXCJwZXJtaXNzaW9uXCIsIFwic3VyZ2VyeVwiLCBcInBhdGNoXCIsIFwiaGVhdFwiLCBcIndpbGRcIiwgXCJtZWFzdXJlc1wiLCBcImdlbmVyYXRpb25cIiwgXCJrYW5zYXNcIiwgXCJtaXNzXCIsIFwiY2hlbWljYWxcIiwgXCJkb2N0b3JcIiwgXCJ0YXNrXCIsIFwicmVkdWNlXCIsIFwiYnJvdWdodFwiLCBcImhpbXNlbGZcIiwgXCJub3JcIiwgXCJjb21wb25lbnRcIiwgXCJlbmFibGVcIiwgXCJleGVyY2lzZVwiLCBcImJ1Z1wiLCBcInNhbnRhXCIsIFwibWlkXCIsIFwiZ3VhcmFudGVlXCIsIFwibGVhZGVyXCIsIFwiZGlhbW9uZFwiLCBcImlzcmFlbFwiLCBcInNlXCIsIFwicHJvY2Vzc2VzXCIsIFwic29mdFwiLCBcInNlcnZlcnNcIiwgXCJhbG9uZVwiLCBcIm1lZXRpbmdzXCIsIFwic2Vjb25kc1wiLCBcImpvbmVzXCIsIFwiYXJpem9uYVwiLCBcImtleXdvcmRcIiwgXCJpbnRlcmVzdHNcIiwgXCJmbGlnaHRcIiwgXCJjb25ncmVzc1wiLCBcImZ1ZWxcIiwgXCJ1c2VybmFtZVwiLCBcIndhbGtcIiwgXCJmdWNrXCIsIFwicHJvZHVjZWRcIiwgXCJpdGFsaWFuXCIsIFwicGFwZXJiYWNrXCIsIFwiY2xhc3NpZmllZHNcIiwgXCJ3YWl0XCIsIFwic3VwcG9ydGVkXCIsIFwicG9ja2V0XCIsIFwic2FpbnRcIiwgXCJyb3NlXCIsIFwiZnJlZWRvbVwiLCBcImFyZ3VtZW50XCIsIFwiY29tcGV0aXRpb25cIiwgXCJjcmVhdGluZ1wiLCBcImppbVwiLCBcImRydWdzXCIsIFwiam9pbnRcIiwgXCJwcmVtaXVtXCIsIFwicHJvdmlkZXJzXCIsIFwiZnJlc2hcIiwgXCJjaGFyYWN0ZXJzXCIsIFwiYXR0b3JuZXlcIiwgXCJ1cGdyYWRlXCIsIFwiZGlcIiwgXCJmYWN0b3JcIiwgXCJncm93aW5nXCIsIFwidGhvdXNhbmRzXCIsIFwia21cIiwgXCJzdHJlYW1cIiwgXCJhcGFydG1lbnRzXCIsIFwicGlja1wiLCBcImhlYXJpbmdcIiwgXCJlYXN0ZXJuXCIsIFwiYXVjdGlvbnNcIiwgXCJ0aGVyYXB5XCIsIFwiZW50cmllc1wiLCBcImRhdGVzXCIsIFwiZ2VuZXJhdGVkXCIsIFwic2lnbmVkXCIsIFwidXBwZXJcIiwgXCJhZG1pbmlzdHJhdGl2ZVwiLCBcInNlcmlvdXNcIiwgXCJwcmltZVwiLCBcInNhbXN1bmdcIiwgXCJsaW1pdFwiLCBcImJlZ2FuXCIsIFwibG91aXNcIiwgXCJzdGVwc1wiLCBcImVycm9yc1wiLCBcInNob3BzXCIsIFwiYm9uZGFnZVwiLCBcImRlbFwiLCBcImVmZm9ydHNcIiwgXCJpbmZvcm1lZFwiLCBcImdhXCIsIFwiYWNcIiwgXCJ0aG91Z2h0c1wiLCBcImNyZWVrXCIsIFwiZnRcIiwgXCJ3b3JrZWRcIiwgXCJxdWFudGl0eVwiLCBcInVyYmFuXCIsIFwicHJhY3RpY2VzXCIsIFwic29ydGVkXCIsIFwicmVwb3J0aW5nXCIsIFwiZXNzZW50aWFsXCIsIFwibXlzZWxmXCIsIFwidG91cnNcIiwgXCJwbGF0Zm9ybVwiLCBcImxvYWRcIiwgXCJhZmZpbGlhdGVcIiwgXCJsYWJvclwiLCBcImltbWVkaWF0ZWx5XCIsIFwiYWRtaW5cIiwgXCJudXJzaW5nXCIsIFwiZGVmZW5zZVwiLCBcIm1hY2hpbmVzXCIsIFwiZGVzaWduYXRlZFwiLCBcInRhZ3NcIiwgXCJoZWF2eVwiLCBcImNvdmVyZWRcIiwgXCJyZWNvdmVyeVwiLCBcImpvZVwiLCBcImd1eXNcIiwgXCJpbnRlZ3JhdGVkXCIsIFwiY29uZmlndXJhdGlvblwiLCBcImNvY2tcIiwgXCJtZXJjaGFudFwiLCBcImNvbXByZWhlbnNpdmVcIiwgXCJleHBlcnRcIiwgXCJ1bml2ZXJzYWxcIiwgXCJwcm90ZWN0XCIsIFwiZHJvcFwiLCBcInNvbGlkXCIsIFwiY2RzXCIsIFwicHJlc2VudGF0aW9uXCIsIFwibGFuZ3VhZ2VzXCIsIFwiYmVjYW1lXCIsIFwib3JhbmdlXCIsIFwiY29tcGxpYW5jZVwiLCBcInZlaGljbGVzXCIsIFwicHJldmVudFwiLCBcInRoZW1lXCIsIFwicmljaFwiLCBcImltXCIsIFwiY2FtcGFpZ25cIiwgXCJtYXJpbmVcIiwgXCJpbXByb3ZlbWVudFwiLCBcInZzXCIsIFwiZ3VpdGFyXCIsIFwiZmluZGluZ1wiLCBcInBlbm5zeWx2YW5pYVwiLCBcImV4YW1wbGVzXCIsIFwiaXBvZFwiLCBcInNheWluZ1wiLCBcInNwaXJpdFwiLCBcImFyXCIsIFwiY2xhaW1zXCIsIFwicG9ybm9cIiwgXCJjaGFsbGVuZ2VcIiwgXCJtb3Rvcm9sYVwiLCBcImFjY2VwdGFuY2VcIiwgXCJzdHJhdGVnaWVzXCIsIFwibW9cIiwgXCJzZWVtXCIsIFwiYWZmYWlyc1wiLCBcInRvdWNoXCIsIFwiaW50ZW5kZWRcIiwgXCJ0b3dhcmRzXCIsIFwic2FcIiwgXCJnb2Fsc1wiLCBcImhpcmVcIiwgXCJlbGVjdGlvblwiLCBcInN1Z2dlc3RcIiwgXCJicmFuY2hcIiwgXCJjaGFyZ2VzXCIsIFwic2VydmVcIiwgXCJhZmZpbGlhdGVzXCIsIFwicmVhc29uc1wiLCBcIm1hZ2ljXCIsIFwibW91bnRcIiwgXCJzbWFydFwiLCBcInRhbGtpbmdcIiwgXCJnYXZlXCIsIFwib25lc1wiLCBcImxhdGluXCIsIFwibXVsdGltZWRpYVwiLCBcInhwXCIsIFwidGl0c1wiLCBcImF2b2lkXCIsIFwiY2VydGlmaWVkXCIsIFwibWFuYWdlXCIsIFwiY29ybmVyXCIsIFwicmFua1wiLCBcImNvbXB1dGluZ1wiLCBcIm9yZWdvblwiLCBcImVsZW1lbnRcIiwgXCJiaXJ0aFwiLCBcInZpcnVzXCIsIFwiYWJ1c2VcIiwgXCJpbnRlcmFjdGl2ZVwiLCBcInJlcXVlc3RzXCIsIFwic2VwYXJhdGVcIiwgXCJxdWFydGVyXCIsIFwicHJvY2VkdXJlXCIsIFwibGVhZGVyc2hpcFwiLCBcInRhYmxlc1wiLCBcImRlZmluZVwiLCBcInJhY2luZ1wiLCBcInJlbGlnaW91c1wiLCBcImZhY3RzXCIsIFwiYnJlYWtmYXN0XCIsIFwia29uZ1wiLCBcImNvbHVtblwiLCBcInBsYW50c1wiLCBcImZhaXRoXCIsIFwiY2hhaW5cIiwgXCJkZXZlbG9wZXJcIiwgXCJpZGVudGlmeVwiLCBcImF2ZW51ZVwiLCBcIm1pc3NpbmdcIiwgXCJkaWVkXCIsIFwiYXBwcm94aW1hdGVseVwiLCBcImRvbWVzdGljXCIsIFwic2l0ZW1hcFwiLCBcInJlY29tbWVuZGF0aW9uc1wiLCBcIm1vdmVkXCIsIFwiaG91c3RvblwiLCBcInJlYWNoXCIsIFwiY29tcGFyaXNvblwiLCBcIm1lbnRhbFwiLCBcInZpZXdlZFwiLCBcIm1vbWVudFwiLCBcImV4dGVuZGVkXCIsIFwic2VxdWVuY2VcIiwgXCJpbmNoXCIsIFwiYXR0YWNrXCIsIFwic29ycnlcIiwgXCJjZW50ZXJzXCIsIFwib3BlbmluZ1wiLCBcImRhbWFnZVwiLCBcImxhYlwiLCBcInJlc2VydmVcIiwgXCJyZWNpcGVzXCIsIFwiY3ZzXCIsIFwiZ2FtbWFcIiwgXCJwbGFzdGljXCIsIFwicHJvZHVjZVwiLCBcInNub3dcIiwgXCJwbGFjZWRcIiwgXCJ0cnV0aFwiLCBcImNvdW50ZXJcIiwgXCJmYWlsdXJlXCIsIFwiZm9sbG93c1wiLCBcImV1XCIsIFwid2Vla2VuZFwiLCBcImRvbGxhclwiLCBcImNhbXBcIiwgXCJvbnRhcmlvXCIsIFwiYXV0b21hdGljYWxseVwiLCBcImRlc1wiLCBcIm1pbm5lc290YVwiLCBcImZpbG1zXCIsIFwiYnJpZGdlXCIsIFwibmF0aXZlXCIsIFwiZmlsbFwiLCBcIndpbGxpYW1zXCIsIFwibW92ZW1lbnRcIiwgXCJwcmludGluZ1wiLCBcImJhc2ViYWxsXCIsIFwib3duZWRcIiwgXCJhcHByb3ZhbFwiLCBcImRyYWZ0XCIsIFwiY2hhcnRcIiwgXCJwbGF5ZWRcIiwgXCJjb250YWN0c1wiLCBcImNjXCIsIFwiamVzdXNcIiwgXCJyZWFkZXJzXCIsIFwiY2x1YnNcIiwgXCJsY2RcIiwgXCJ3YVwiLCBcImphY2tzb25cIiwgXCJlcXVhbFwiLCBcImFkdmVudHVyZVwiLCBcIm1hdGNoaW5nXCIsIFwib2ZmZXJpbmdcIiwgXCJzaGlydHNcIiwgXCJwcm9maXRcIiwgXCJsZWFkZXJzXCIsIFwicG9zdGVyc1wiLCBcImluc3RpdHV0aW9uc1wiLCBcImFzc2lzdGFudFwiLCBcInZhcmlhYmxlXCIsIFwiYXZlXCIsIFwiZGpcIiwgXCJhZHZlcnRpc2VtZW50XCIsIFwiZXhwZWN0XCIsIFwicGFya2luZ1wiLCBcImhlYWRsaW5lc1wiLCBcInllc3RlcmRheVwiLCBcImNvbXBhcmVkXCIsIFwiZGV0ZXJtaW5lZFwiLCBcIndob2xlc2FsZVwiLCBcIndvcmtzaG9wXCIsIFwicnVzc2lhXCIsIFwiZ29uZVwiLCBcImNvZGVzXCIsIFwia2luZHNcIiwgXCJleHRlbnNpb25cIiwgXCJzZWF0dGxlXCIsIFwic3RhdGVtZW50c1wiLCBcImdvbGRlblwiLCBcImNvbXBsZXRlbHlcIiwgXCJ0ZWFtc1wiLCBcImZvcnRcIiwgXCJjbVwiLCBcIndpXCIsIFwibGlnaHRpbmdcIiwgXCJzZW5hdGVcIiwgXCJmb3JjZXNcIiwgXCJmdW5ueVwiLCBcImJyb3RoZXJcIiwgXCJnZW5lXCIsIFwidHVybmVkXCIsIFwicG9ydGFibGVcIiwgXCJ0cmllZFwiLCBcImVsZWN0cmljYWxcIiwgXCJhcHBsaWNhYmxlXCIsIFwiZGlzY1wiLCBcInJldHVybmVkXCIsIFwicGF0dGVyblwiLCBcImN0XCIsIFwiaGVudGFpXCIsIFwiYm9hdFwiLCBcIm5hbWVkXCIsIFwidGhlYXRyZVwiLCBcImxhc2VyXCIsIFwiZWFybGllclwiLCBcIm1hbnVmYWN0dXJlcnNcIiwgXCJzcG9uc29yXCIsIFwiY2xhc3NpY2FsXCIsIFwiaWNvblwiLCBcIndhcnJhbnR5XCIsIFwiZGVkaWNhdGVkXCIsIFwiaW5kaWFuYVwiLCBcImRpcmVjdGlvblwiLCBcImhhcnJ5XCIsIFwiYmFza2V0YmFsbFwiLCBcIm9iamVjdHNcIiwgXCJlbmRzXCIsIFwiZGVsZXRlXCIsIFwiZXZlbmluZ1wiLCBcImFzc2VtYmx5XCIsIFwibnVjbGVhclwiLCBcInRheGVzXCIsIFwibW91c2VcIiwgXCJzaWduYWxcIiwgXCJjcmltaW5hbFwiLCBcImlzc3VlZFwiLCBcImJyYWluXCIsIFwic2V4dWFsXCIsIFwid2lzY29uc2luXCIsIFwicG93ZXJmdWxcIiwgXCJkcmVhbVwiLCBcIm9idGFpbmVkXCIsIFwiZmFsc2VcIiwgXCJkYVwiLCBcImNhc3RcIiwgXCJmbG93ZXJcIiwgXCJmZWx0XCIsIFwicGVyc29ubmVsXCIsIFwicGFzc2VkXCIsIFwic3VwcGxpZWRcIiwgXCJpZGVudGlmaWVkXCIsIFwiZmFsbHNcIiwgXCJwaWNcIiwgXCJzb3VsXCIsIFwiYWlkc1wiLCBcIm9waW5pb25zXCIsIFwicHJvbW90ZVwiLCBcInN0YXRlZFwiLCBcInN0YXRzXCIsIFwiaGF3YWlpXCIsIFwicHJvZmVzc2lvbmFsc1wiLCBcImFwcGVhcnNcIiwgXCJjYXJyeVwiLCBcImZsYWdcIiwgXCJkZWNpZGVkXCIsIFwibmpcIiwgXCJjb3ZlcnNcIiwgXCJoclwiLCBcImVtXCIsIFwiYWR2YW50YWdlXCIsIFwiaGVsbG9cIiwgXCJkZXNpZ25zXCIsIFwibWFpbnRhaW5cIiwgXCJ0b3VyaXNtXCIsIFwicHJpb3JpdHlcIiwgXCJuZXdzbGV0dGVyc1wiLCBcImFkdWx0c1wiLCBcImNsaXBzXCIsIFwic2F2aW5nc1wiLCBcIml2XCIsIFwiZ3JhcGhpY1wiLCBcImF0b21cIiwgXCJwYXltZW50c1wiLCBcInJ3XCIsIFwiZXN0aW1hdGVkXCIsIFwiYmluZGluZ1wiLCBcImJyaWVmXCIsIFwiZW5kZWRcIiwgXCJ3aW5uaW5nXCIsIFwiZWlnaHRcIiwgXCJhbm9ueW1vdXNcIiwgXCJpcm9uXCIsIFwic3RyYWlnaHRcIiwgXCJzY3JpcHRcIiwgXCJzZXJ2ZWRcIiwgXCJ3YW50c1wiLCBcIm1pc2NlbGxhbmVvdXNcIiwgXCJwcmVwYXJlZFwiLCBcInZvaWRcIiwgXCJkaW5pbmdcIiwgXCJhbGVydFwiLCBcImludGVncmF0aW9uXCIsIFwiYXRsYW50YVwiLCBcImRha290YVwiLCBcInRhZ1wiLCBcImludGVydmlld1wiLCBcIm1peFwiLCBcImZyYW1ld29ya1wiLCBcImRpc2tcIiwgXCJpbnN0YWxsZWRcIiwgXCJxdWVlblwiLCBcInZoc1wiLCBcImNyZWRpdHNcIiwgXCJjbGVhcmx5XCIsIFwiZml4XCIsIFwiaGFuZGxlXCIsIFwic3dlZXRcIiwgXCJkZXNrXCIsIFwiY3JpdGVyaWFcIiwgXCJwdWJtZWRcIiwgXCJkYXZlXCIsIFwibWFzc2FjaHVzZXR0c1wiLCBcImRpZWdvXCIsIFwiaG9uZ1wiLCBcInZpY2VcIiwgXCJhc3NvY2lhdGVcIiwgXCJuZVwiLCBcInRydWNrXCIsIFwiYmVoYXZpb3JcIiwgXCJlbmxhcmdlXCIsIFwicmF5XCIsIFwiZnJlcXVlbnRseVwiLCBcInJldmVudWVcIiwgXCJtZWFzdXJlXCIsIFwiY2hhbmdpbmdcIiwgXCJ2b3Rlc1wiLCBcImR1XCIsIFwiZHV0eVwiLCBcImxvb2tlZFwiLCBcImRpc2N1c3Npb25zXCIsIFwiYmVhclwiLCBcImdhaW5cIiwgXCJmZXN0aXZhbFwiLCBcImxhYm9yYXRvcnlcIiwgXCJvY2VhblwiLCBcImZsaWdodHNcIiwgXCJleHBlcnRzXCIsIFwic2lnbnNcIiwgXCJsYWNrXCIsIFwiZGVwdGhcIiwgXCJpb3dhXCIsIFwid2hhdGV2ZXJcIiwgXCJsb2dnZWRcIiwgXCJsYXB0b3BcIiwgXCJ2aW50YWdlXCIsIFwidHJhaW5cIiwgXCJleGFjdGx5XCIsIFwiZHJ5XCIsIFwiZXhwbG9yZVwiLCBcIm1hcnlsYW5kXCIsIFwic3BhXCIsIFwiY29uY2VwdFwiLCBcIm5lYXJseVwiLCBcImVsaWdpYmxlXCIsIFwiY2hlY2tvdXRcIiwgXCJyZWFsaXR5XCIsIFwiZm9yZ290XCIsIFwiaGFuZGxpbmdcIiwgXCJvcmlnaW5cIiwgXCJrbmV3XCIsIFwiZ2FtaW5nXCIsIFwiZmVlZHNcIiwgXCJiaWxsaW9uXCIsIFwiZGVzdGluYXRpb25cIiwgXCJzY290bGFuZFwiLCBcImZhc3RlclwiLCBcImludGVsbGlnZW5jZVwiLCBcImRhbGxhc1wiLCBcImJvdWdodFwiLCBcImNvblwiLCBcInVwc1wiLCBcIm5hdGlvbnNcIiwgXCJyb3V0ZVwiLCBcImZvbGxvd2VkXCIsIFwic3BlY2lmaWNhdGlvbnNcIiwgXCJicm9rZW5cIiwgXCJ0cmlwYWR2aXNvclwiLCBcImZyYW5rXCIsIFwiYWxhc2thXCIsIFwiem9vbVwiLCBcImJsb3dcIiwgXCJiYXR0bGVcIiwgXCJyZXNpZGVudGlhbFwiLCBcImFuaW1lXCIsIFwic3BlYWtcIiwgXCJkZWNpc2lvbnNcIiwgXCJpbmR1c3RyaWVzXCIsIFwicHJvdG9jb2xcIiwgXCJxdWVyeVwiLCBcImNsaXBcIiwgXCJwYXJ0bmVyc2hpcFwiLCBcImVkaXRvcmlhbFwiLCBcIm50XCIsIFwiZXhwcmVzc2lvblwiLCBcImVzXCIsIFwiZXF1aXR5XCIsIFwicHJvdmlzaW9uc1wiLCBcInNwZWVjaFwiLCBcIndpcmVcIiwgXCJwcmluY2lwbGVzXCIsIFwic3VnZ2VzdGlvbnNcIiwgXCJydXJhbFwiLCBcInNoYXJlZFwiLCBcInNvdW5kc1wiLCBcInJlcGxhY2VtZW50XCIsIFwidGFwZVwiLCBcInN0cmF0ZWdpY1wiLCBcImp1ZGdlXCIsIFwic3BhbVwiLCBcImVjb25vbWljc1wiLCBcImFjaWRcIiwgXCJieXRlc1wiLCBcImNlbnRcIiwgXCJmb3JjZWRcIiwgXCJjb21wYXRpYmxlXCIsIFwiZmlnaHRcIiwgXCJhcGFydG1lbnRcIiwgXCJoZWlnaHRcIiwgXCJudWxsXCIsIFwiemVyb1wiLCBcInNwZWFrZXJcIiwgXCJmaWxlZFwiLCBcImdiXCIsIFwibmV0aGVybGFuZHNcIiwgXCJvYnRhaW5cIiwgXCJiY1wiLCBcImNvbnN1bHRpbmdcIiwgXCJyZWNyZWF0aW9uXCIsIFwib2ZmaWNlc1wiLCBcImRlc2lnbmVyXCIsIFwicmVtYWluXCIsIFwibWFuYWdlZFwiLCBcInByXCIsIFwiZmFpbGVkXCIsIFwibWFycmlhZ2VcIiwgXCJyb2xsXCIsIFwia29yZWFcIiwgXCJiYW5rc1wiLCBcImZyXCIsIFwicGFydGljaXBhbnRzXCIsIFwic2VjcmV0XCIsIFwiYmF0aFwiLCBcImFhXCIsIFwia2VsbHlcIiwgXCJsZWFkc1wiLCBcIm5lZ2F0aXZlXCIsIFwiYXVzdGluXCIsIFwiZmF2b3JpdGVzXCIsIFwidG9yb250b1wiLCBcInRoZWF0ZXJcIiwgXCJzcHJpbmdzXCIsIFwibWlzc291cmlcIiwgXCJhbmRyZXdcIiwgXCJ2YXJcIiwgXCJwZXJmb3JtXCIsIFwiaGVhbHRoeVwiLCBcInRyYW5zbGF0aW9uXCIsIFwiZXN0aW1hdGVzXCIsIFwiZm9udFwiLCBcImFzc2V0c1wiLCBcImluanVyeVwiLCBcIm10XCIsIFwiam9zZXBoXCIsIFwibWluaXN0cnlcIiwgXCJkcml2ZXJzXCIsIFwibGF3eWVyXCIsIFwiZmlndXJlc1wiLCBcIm1hcnJpZWRcIiwgXCJwcm90ZWN0ZWRcIiwgXCJwcm9wb3NhbFwiLCBcInNoYXJpbmdcIiwgXCJwaGlsYWRlbHBoaWFcIiwgXCJwb3J0YWxcIiwgXCJ3YWl0aW5nXCIsIFwiYmlydGhkYXlcIiwgXCJiZXRhXCIsIFwiZmFpbFwiLCBcImdyYXRpc1wiLCBcImJhbmtpbmdcIiwgXCJvZmZpY2lhbHNcIiwgXCJicmlhblwiLCBcInRvd2FyZFwiLCBcIndvblwiLCBcInNsaWdodGx5XCIsIFwiYXNzaXN0XCIsIFwiY29uZHVjdFwiLCBcImNvbnRhaW5lZFwiLCBcImxpbmdlcmllXCIsIFwic2hlbWFsZVwiLCBcImxlZ2lzbGF0aW9uXCIsIFwiY2FsbGluZ1wiLCBcInBhcmFtZXRlcnNcIiwgXCJqYXp6XCIsIFwic2VydmluZ1wiLCBcImJhZ3NcIiwgXCJwcm9maWxlc1wiLCBcIm1pYW1pXCIsIFwiY29taWNzXCIsIFwibWF0dGVyc1wiLCBcImhvdXNlc1wiLCBcImRvY1wiLCBcInBvc3RhbFwiLCBcInJlbGF0aW9uc2hpcHNcIiwgXCJ0ZW5uZXNzZWVcIiwgXCJ3ZWFyXCIsIFwiY29udHJvbHNcIiwgXCJicmVha2luZ1wiLCBcImNvbWJpbmVkXCIsIFwidWx0aW1hdGVcIiwgXCJ3YWxlc1wiLCBcInJlcHJlc2VudGF0aXZlXCIsIFwiZnJlcXVlbmN5XCIsIFwiaW50cm9kdWNlZFwiLCBcIm1pbm9yXCIsIFwiZmluaXNoXCIsIFwiZGVwYXJ0bWVudHNcIiwgXCJyZXNpZGVudHNcIiwgXCJub3RlZFwiLCBcImRpc3BsYXllZFwiLCBcIm1vbVwiLCBcInJlZHVjZWRcIiwgXCJwaHlzaWNzXCIsIFwicmFyZVwiLCBcInNwZW50XCIsIFwicGVyZm9ybWVkXCIsIFwiZXh0cmVtZVwiLCBcInNhbXBsZXNcIiwgXCJkYXZpc1wiLCBcImRhbmllbFwiLCBcImJhcnNcIiwgXCJyZXZpZXdlZFwiLCBcInJvd1wiLCBcIm96XCIsIFwiZm9yZWNhc3RcIiwgXCJyZW1vdmVkXCIsIFwiaGVscHNcIiwgXCJzaW5nbGVzXCIsIFwiYWRtaW5pc3RyYXRvclwiLCBcImN5Y2xlXCIsIFwiYW1vdW50c1wiLCBcImNvbnRhaW5cIiwgXCJhY2N1cmFjeVwiLCBcImR1YWxcIiwgXCJyaXNlXCIsIFwidXNkXCIsIFwic2xlZXBcIiwgXCJtZ1wiLCBcImJpcmRcIiwgXCJwaGFybWFjeVwiLCBcImJyYXppbFwiLCBcImNyZWF0aW9uXCIsIFwic3RhdGljXCIsIFwic2NlbmVcIiwgXCJodW50ZXJcIiwgXCJhZGRyZXNzZXNcIiwgXCJsYWR5XCIsIFwiY3J5c3RhbFwiLCBcImZhbW91c1wiLCBcIndyaXRlclwiLCBcImNoYWlybWFuXCIsIFwidmlvbGVuY2VcIiwgXCJmYW5zXCIsIFwib2tsYWhvbWFcIiwgXCJzcGVha2Vyc1wiLCBcImRyaW5rXCIsIFwiYWNhZGVteVwiLCBcImR5bmFtaWNcIiwgXCJnZW5kZXJcIiwgXCJlYXRcIiwgXCJwZXJtYW5lbnRcIiwgXCJhZ3JpY3VsdHVyZVwiLCBcImRlbGxcIiwgXCJjbGVhbmluZ1wiLCBcImNvbnN0aXR1dGVzXCIsIFwicG9ydGZvbGlvXCIsIFwicHJhY3RpY2FsXCIsIFwiZGVsaXZlcmVkXCIsIFwiY29sbGVjdGlibGVzXCIsIFwiaW5mcmFzdHJ1Y3R1cmVcIiwgXCJleGNsdXNpdmVcIiwgXCJzZWF0XCIsIFwiY29uY2VybnNcIiwgXCJjb2xvdXJcIiwgXCJ2ZW5kb3JcIiwgXCJvcmlnaW5hbGx5XCIsIFwiaW50ZWxcIiwgXCJ1dGlsaXRpZXNcIiwgXCJwaGlsb3NvcGh5XCIsIFwicmVndWxhdGlvblwiLCBcIm9mZmljZXJzXCIsIFwicmVkdWN0aW9uXCIsIFwiYWltXCIsIFwiYmlkc1wiLCBcInJlZmVycmVkXCIsIFwic3VwcG9ydHNcIiwgXCJudXRyaXRpb25cIiwgXCJyZWNvcmRpbmdcIiwgXCJyZWdpb25zXCIsIFwianVuaW9yXCIsIFwidG9sbFwiLCBcImxlc1wiLCBcImNhcGVcIiwgXCJhbm5cIiwgXCJyaW5nc1wiLCBcIm1lYW5pbmdcIiwgXCJ0aXBcIiwgXCJzZWNvbmRhcnlcIiwgXCJ3b25kZXJmdWxcIiwgXCJtaW5lXCIsIFwibGFkaWVzXCIsIFwiaGVucnlcIiwgXCJ0aWNrZXRcIiwgXCJhbm5vdW5jZWRcIiwgXCJndWVzc1wiLCBcImFncmVlZFwiLCBcInByZXZlbnRpb25cIiwgXCJ3aG9tXCIsIFwic2tpXCIsIFwic29jY2VyXCIsIFwibWF0aFwiLCBcImltcG9ydFwiLCBcInBvc3RpbmdcIiwgXCJwcmVzZW5jZVwiLCBcImluc3RhbnRcIiwgXCJtZW50aW9uZWRcIiwgXCJhdXRvbWF0aWNcIiwgXCJoZWFsdGhjYXJlXCIsIFwidmlld2luZ1wiLCBcIm1haW50YWluZWRcIiwgXCJjaFwiLCBcImluY3JlYXNpbmdcIiwgXCJtYWpvcml0eVwiLCBcImNvbm5lY3RlZFwiLCBcImNocmlzdFwiLCBcImRhblwiLCBcImRvZ3NcIiwgXCJzZFwiLCBcImRpcmVjdG9yc1wiLCBcImFzcGVjdHNcIiwgXCJhdXN0cmlhXCIsIFwiYWhlYWRcIiwgXCJtb29uXCIsIFwicGFydGljaXBhdGlvblwiLCBcInNjaGVtZVwiLCBcInV0aWxpdHlcIiwgXCJwcmV2aWV3XCIsIFwiZmx5XCIsIFwibWFubmVyXCIsIFwibWF0cml4XCIsIFwiY29udGFpbmluZ1wiLCBcImNvbWJpbmF0aW9uXCIsIFwiZGV2ZWxcIiwgXCJhbWVuZG1lbnRcIiwgXCJkZXNwaXRlXCIsIFwic3RyZW5ndGhcIiwgXCJndWFyYW50ZWVkXCIsIFwidHVya2V5XCIsIFwibGlicmFyaWVzXCIsIFwicHJvcGVyXCIsIFwiZGlzdHJpYnV0ZWRcIiwgXCJkZWdyZWVzXCIsIFwic2luZ2Fwb3JlXCIsIFwiZW50ZXJwcmlzZXNcIiwgXCJkZWx0YVwiLCBcImZlYXJcIiwgXCJzZWVraW5nXCIsIFwiaW5jaGVzXCIsIFwicGhvZW5peFwiLCBcInJzXCIsIFwiY29udmVudGlvblwiLCBcInNoYXJlc1wiLCBcInByaW5jaXBhbFwiLCBcImRhdWdodGVyXCIsIFwic3RhbmRpbmdcIiwgXCJ2b3lldXJcIiwgXCJjb21mb3J0XCIsIFwiY29sb3JzXCIsIFwid2Fyc1wiLCBcImNpc2NvXCIsIFwib3JkZXJpbmdcIiwgXCJrZXB0XCIsIFwiYWxwaGFcIiwgXCJhcHBlYWxcIiwgXCJjcnVpc2VcIiwgXCJib251c1wiLCBcImNlcnRpZmljYXRpb25cIiwgXCJwcmV2aW91c2x5XCIsIFwiaGV5XCIsIFwiYm9va21hcmtcIiwgXCJidWlsZGluZ3NcIiwgXCJzcGVjaWFsc1wiLCBcImJlYXRcIiwgXCJkaXNuZXlcIiwgXCJob3VzZWhvbGRcIiwgXCJiYXR0ZXJpZXNcIiwgXCJhZG9iZVwiLCBcInNtb2tpbmdcIiwgXCJiYmNcIiwgXCJiZWNvbWVzXCIsIFwiZHJpdmVzXCIsIFwiYXJtc1wiLCBcImFsYWJhbWFcIiwgXCJ0ZWFcIiwgXCJpbXByb3ZlZFwiLCBcInRyZWVzXCIsIFwiYXZnXCIsIFwiYWNoaWV2ZVwiLCBcInBvc2l0aW9uc1wiLCBcImRyZXNzXCIsIFwic3Vic2NyaXB0aW9uXCIsIFwiZGVhbGVyXCIsIFwiY29udGVtcG9yYXJ5XCIsIFwic2t5XCIsIFwidXRhaFwiLCBcIm5lYXJieVwiLCBcInJvbVwiLCBcImNhcnJpZWRcIiwgXCJoYXBwZW5cIiwgXCJleHBvc3VyZVwiLCBcInBhbmFzb25pY1wiLCBcImhpZGVcIiwgXCJwZXJtYWxpbmtcIiwgXCJzaWduYXR1cmVcIiwgXCJnYW1ibGluZ1wiLCBcInJlZmVyXCIsIFwibWlsbGVyXCIsIFwicHJvdmlzaW9uXCIsIFwib3V0ZG9vcnNcIiwgXCJjbG90aGVzXCIsIFwiY2F1c2VkXCIsIFwibHV4dXJ5XCIsIFwiYmFiZXNcIiwgXCJmcmFtZXNcIiwgXCJ2aWFncmFcIiwgXCJjZXJ0YWlubHlcIiwgXCJpbmRlZWRcIiwgXCJuZXdzcGFwZXJcIiwgXCJ0b3lcIiwgXCJjaXJjdWl0XCIsIFwibGF5ZXJcIiwgXCJwcmludGVkXCIsIFwic2xvd1wiLCBcInJlbW92YWxcIiwgXCJlYXNpZXJcIiwgXCJzcmNcIiwgXCJsaWFiaWxpdHlcIiwgXCJ0cmFkZW1hcmtcIiwgXCJoaXBcIiwgXCJwcmludGVyc1wiLCBcImZhcXNcIiwgXCJuaW5lXCIsIFwiYWRkaW5nXCIsIFwia2VudHVja3lcIiwgXCJtb3N0bHlcIiwgXCJlcmljXCIsIFwic3BvdFwiLCBcInRheWxvclwiLCBcInRyYWNrYmFja1wiLCBcInByaW50c1wiLCBcInNwZW5kXCIsIFwiZmFjdG9yeVwiLCBcImludGVyaW9yXCIsIFwicmV2aXNlZFwiLCBcImdyb3dcIiwgXCJhbWVyaWNhbnNcIiwgXCJvcHRpY2FsXCIsIFwicHJvbW90aW9uXCIsIFwicmVsYXRpdmVcIiwgXCJhbWF6aW5nXCIsIFwiY2xvY2tcIiwgXCJkb3RcIiwgXCJoaXZcIiwgXCJpZGVudGl0eVwiLCBcInN1aXRlc1wiLCBcImNvbnZlcnNpb25cIiwgXCJmZWVsaW5nXCIsIFwiaGlkZGVuXCIsIFwicmVhc29uYWJsZVwiLCBcInZpY3RvcmlhXCIsIFwic2VyaWFsXCIsIFwicmVsaWVmXCIsIFwicmV2aXNpb25cIiwgXCJicm9hZGJhbmRcIiwgXCJpbmZsdWVuY2VcIiwgXCJyYXRpb1wiLCBcInBkYVwiLCBcImltcG9ydGFuY2VcIiwgXCJyYWluXCIsIFwib250b1wiLCBcImRzbFwiLCBcInBsYW5ldFwiLCBcIndlYm1hc3RlclwiLCBcImNvcGllc1wiLCBcInJlY2lwZVwiLCBcInp1bVwiLCBcInBlcm1pdFwiLCBcInNlZWluZ1wiLCBcInByb29mXCIsIFwiZG5hXCIsIFwiZGlmZlwiLCBcInRlbm5pc1wiLCBcImJhc3NcIiwgXCJwcmVzY3JpcHRpb25cIiwgXCJiZWRyb29tXCIsIFwiZW1wdHlcIiwgXCJpbnN0YW5jZVwiLCBcImhvbGVcIiwgXCJwZXRzXCIsIFwicmlkZVwiLCBcImxpY2Vuc2VkXCIsIFwib3JsYW5kb1wiLCBcInNwZWNpZmljYWxseVwiLCBcInRpbVwiLCBcImJ1cmVhdVwiLCBcIm1haW5lXCIsIFwic3FsXCIsIFwicmVwcmVzZW50XCIsIFwiY29uc2VydmF0aW9uXCIsIFwicGFpclwiLCBcImlkZWFsXCIsIFwic3BlY3NcIiwgXCJyZWNvcmRlZFwiLCBcImRvblwiLCBcInBpZWNlc1wiLCBcImZpbmlzaGVkXCIsIFwicGFya3NcIiwgXCJkaW5uZXJcIiwgXCJsYXd5ZXJzXCIsIFwic3lkbmV5XCIsIFwic3RyZXNzXCIsIFwiY3JlYW1cIiwgXCJzc1wiLCBcInJ1bnNcIiwgXCJ0cmVuZHNcIiwgXCJ5ZWFoXCIsIFwiZGlzY292ZXJcIiwgXCJzZXhvXCIsIFwiYXBcIiwgXCJwYXR0ZXJuc1wiLCBcImJveGVzXCIsIFwibG91aXNpYW5hXCIsIFwiaGlsbHNcIiwgXCJqYXZhc2NyaXB0XCIsIFwiZm91cnRoXCIsIFwibm1cIiwgXCJhZHZpc29yXCIsIFwibW5cIiwgXCJtYXJrZXRwbGFjZVwiLCBcIm5kXCIsIFwiZXZpbFwiLCBcImF3YXJlXCIsIFwid2lsc29uXCIsIFwic2hhcGVcIiwgXCJldm9sdXRpb25cIiwgXCJpcmlzaFwiLCBcImNlcnRpZmljYXRlc1wiLCBcIm9iamVjdGl2ZXNcIiwgXCJzdGF0aW9uc1wiLCBcInN1Z2dlc3RlZFwiLCBcImdwc1wiLCBcIm9wXCIsIFwicmVtYWluc1wiLCBcImFjY1wiLCBcImdyZWF0ZXN0XCIsIFwiZmlybXNcIiwgXCJjb25jZXJuZWRcIiwgXCJldXJvXCIsIFwib3BlcmF0b3JcIiwgXCJzdHJ1Y3R1cmVzXCIsIFwiZ2VuZXJpY1wiLCBcImVuY3ljbG9wZWRpYVwiLCBcInVzYWdlXCIsIFwiY2FwXCIsIFwiaW5rXCIsIFwiY2hhcnRzXCIsIFwiY29udGludWluZ1wiLCBcIm1peGVkXCIsIFwiY2Vuc3VzXCIsIFwiaW50ZXJyYWNpYWxcIiwgXCJwZWFrXCIsIFwidG5cIiwgXCJjb21wZXRpdGl2ZVwiLCBcImV4aXN0XCIsIFwid2hlZWxcIiwgXCJ0cmFuc2l0XCIsIFwiZGlja1wiLCBcInN1cHBsaWVyc1wiLCBcInNhbHRcIiwgXCJjb21wYWN0XCIsIFwicG9ldHJ5XCIsIFwibGlnaHRzXCIsIFwidHJhY2tpbmdcIiwgXCJhbmdlbFwiLCBcImJlbGxcIiwgXCJrZWVwaW5nXCIsIFwicHJlcGFyYXRpb25cIiwgXCJhdHRlbXB0XCIsIFwicmVjZWl2aW5nXCIsIFwibWF0Y2hlc1wiLCBcImFjY29yZGFuY2VcIiwgXCJ3aWR0aFwiLCBcIm5vaXNlXCIsIFwiZW5naW5lc1wiLCBcImZvcmdldFwiLCBcImFycmF5XCIsIFwiZGlzY3Vzc2VkXCIsIFwiYWNjdXJhdGVcIiwgXCJzdGVwaGVuXCIsIFwiZWxpemFiZXRoXCIsIFwiY2xpbWF0ZVwiLCBcInJlc2VydmF0aW9uc1wiLCBcInBpblwiLCBcInBsYXlzdGF0aW9uXCIsIFwiYWxjb2hvbFwiLCBcImdyZWVrXCIsIFwiaW5zdHJ1Y3Rpb25cIiwgXCJtYW5hZ2luZ1wiLCBcImFubm90YXRpb25cIiwgXCJzaXN0ZXJcIiwgXCJyYXdcIiwgXCJkaWZmZXJlbmNlc1wiLCBcIndhbGtpbmdcIiwgXCJleHBsYWluXCIsIFwic21hbGxlclwiLCBcIm5ld2VzdFwiLCBcImVzdGFibGlzaFwiLCBcImdudVwiLCBcImhhcHBlbmVkXCIsIFwiZXhwcmVzc2VkXCIsIFwiamVmZlwiLCBcImV4dGVudFwiLCBcInNoYXJwXCIsIFwibGVzYmlhbnNcIiwgXCJiZW5cIiwgXCJsYW5lXCIsIFwicGFyYWdyYXBoXCIsIFwia2lsbFwiLCBcIm1hdGhlbWF0aWNzXCIsIFwiYW9sXCIsIFwiY29tcGVuc2F0aW9uXCIsIFwiY2VcIiwgXCJleHBvcnRcIiwgXCJtYW5hZ2Vyc1wiLCBcImFpcmNyYWZ0XCIsIFwibW9kdWxlc1wiLCBcInN3ZWRlblwiLCBcImNvbmZsaWN0XCIsIFwiY29uZHVjdGVkXCIsIFwidmVyc2lvbnNcIiwgXCJlbXBsb3llclwiLCBcIm9jY3VyXCIsIFwicGVyY2VudGFnZVwiLCBcImtub3dzXCIsIFwibWlzc2lzc2lwcGlcIiwgXCJkZXNjcmliZVwiLCBcImNvbmNlcm5cIiwgXCJiYWNrdXBcIiwgXCJyZXF1ZXN0ZWRcIiwgXCJjaXRpemVuc1wiLCBcImNvbm5lY3RpY3V0XCIsIFwiaGVyaXRhZ2VcIiwgXCJwZXJzb25hbHNcIiwgXCJpbW1lZGlhdGVcIiwgXCJob2xkaW5nXCIsIFwidHJvdWJsZVwiLCBcInNwcmVhZFwiLCBcImNvYWNoXCIsIFwia2V2aW5cIiwgXCJhZ3JpY3VsdHVyYWxcIiwgXCJleHBhbmRcIiwgXCJzdXBwb3J0aW5nXCIsIFwiYXVkaWVuY2VcIiwgXCJhc3NpZ25lZFwiLCBcImpvcmRhblwiLCBcImNvbGxlY3Rpb25zXCIsIFwiYWdlc1wiLCBcInBhcnRpY2lwYXRlXCIsIFwicGx1Z1wiLCBcInNwZWNpYWxpc3RcIiwgXCJjb29rXCIsIFwiYWZmZWN0XCIsIFwidmlyZ2luXCIsIFwiZXhwZXJpZW5jZWRcIiwgXCJpbnZlc3RpZ2F0aW9uXCIsIFwicmFpc2VkXCIsIFwiaGF0XCIsIFwiaW5zdGl0dXRpb25cIiwgXCJkaXJlY3RlZFwiLCBcImRlYWxlcnNcIiwgXCJzZWFyY2hpbmdcIiwgXCJzcG9ydGluZ1wiLCBcImhlbHBpbmdcIiwgXCJwZXJsXCIsIFwiYWZmZWN0ZWRcIiwgXCJsaWJcIiwgXCJiaWtlXCIsIFwidG90YWxseVwiLCBcInBsYXRlXCIsIFwiZXhwZW5zZXNcIiwgXCJpbmRpY2F0ZVwiLCBcImJsb25kZVwiLCBcImFiXCIsIFwicHJvY2VlZGluZ3NcIiwgXCJmYXZvdXJpdGVcIiwgXCJ0cmFuc21pc3Npb25cIiwgXCJhbmRlcnNvblwiLCBcInV0Y1wiLCBcImNoYXJhY3RlcmlzdGljc1wiLCBcImRlclwiLCBcImxvc2VcIiwgXCJvcmdhbmljXCIsIFwic2Vla1wiLCBcImV4cGVyaWVuY2VzXCIsIFwiYWxidW1zXCIsIFwiY2hlYXRzXCIsIFwiZXh0cmVtZWx5XCIsIFwidmVyemVpY2huaXNcIiwgXCJjb250cmFjdHNcIiwgXCJndWVzdHNcIiwgXCJob3N0ZWRcIiwgXCJkaXNlYXNlc1wiLCBcImNvbmNlcm5pbmdcIiwgXCJkZXZlbG9wZXJzXCIsIFwiZXF1aXZhbGVudFwiLCBcImNoZW1pc3RyeVwiLCBcInRvbnlcIiwgXCJuZWlnaGJvcmhvb2RcIiwgXCJuZXZhZGFcIiwgXCJraXRzXCIsIFwidGhhaWxhbmRcIiwgXCJ2YXJpYWJsZXNcIiwgXCJhZ2VuZGFcIiwgXCJhbnl3YXlcIiwgXCJjb250aW51ZXNcIiwgXCJ0cmFja3NcIiwgXCJhZHZpc29yeVwiLCBcImNhbVwiLCBcImN1cnJpY3VsdW1cIiwgXCJsb2dpY1wiLCBcInRlbXBsYXRlXCIsIFwicHJpbmNlXCIsIFwiY2lyY2xlXCIsIFwic29pbFwiLCBcImdyYW50c1wiLCBcImFueXdoZXJlXCIsIFwicHN5Y2hvbG9neVwiLCBcInJlc3BvbnNlc1wiLCBcImF0bGFudGljXCIsIFwid2V0XCIsIFwiY2lyY3Vtc3RhbmNlc1wiLCBcImVkd2FyZFwiLCBcImludmVzdG9yXCIsIFwiaWRlbnRpZmljYXRpb25cIiwgXCJyYW1cIiwgXCJsZWF2aW5nXCIsIFwid2lsZGxpZmVcIiwgXCJhcHBsaWFuY2VzXCIsIFwibWF0dFwiLCBcImVsZW1lbnRhcnlcIiwgXCJjb29raW5nXCIsIFwic3BlYWtpbmdcIiwgXCJzcG9uc29yc1wiLCBcImZveFwiLCBcInVubGltaXRlZFwiLCBcInJlc3BvbmRcIiwgXCJzaXplc1wiLCBcInBsYWluXCIsIFwiZXhpdFwiLCBcImVudGVyZWRcIiwgXCJpcmFuXCIsIFwiYXJtXCIsIFwia2V5c1wiLCBcImxhdW5jaFwiLCBcIndhdmVcIiwgXCJjaGVja2luZ1wiLCBcImNvc3RhXCIsIFwiYmVsZ2l1bVwiLCBcInByaW50YWJsZVwiLCBcImhvbHlcIiwgXCJhY3RzXCIsIFwiZ3VpZGFuY2VcIiwgXCJtZXNoXCIsIFwidHJhaWxcIiwgXCJlbmZvcmNlbWVudFwiLCBcInN5bWJvbFwiLCBcImNyYWZ0c1wiLCBcImhpZ2h3YXlcIiwgXCJidWRkeVwiLCBcImhhcmRjb3ZlclwiLCBcIm9ic2VydmVkXCIsIFwiZGVhblwiLCBcInNldHVwXCIsIFwicG9sbFwiLCBcImJvb2tpbmdcIiwgXCJnbG9zc2FyeVwiLCBcImZpc2NhbFwiLCBcImNlbGVicml0eVwiLCBcInN0eWxlc1wiLCBcImRlbnZlclwiLCBcInVuaXhcIiwgXCJmaWxsZWRcIiwgXCJib25kXCIsIFwiY2hhbm5lbHNcIiwgXCJlcmljc3NvblwiLCBcImFwcGVuZGl4XCIsIFwibm90aWZ5XCIsIFwiYmx1ZXNcIiwgXCJjaG9jb2xhdGVcIiwgXCJwdWJcIiwgXCJwb3J0aW9uXCIsIFwic2NvcGVcIiwgXCJoYW1wc2hpcmVcIiwgXCJzdXBwbGllclwiLCBcImNhYmxlc1wiLCBcImNvdHRvblwiLCBcImJsdWV0b290aFwiLCBcImNvbnRyb2xsZWRcIiwgXCJyZXF1aXJlbWVudFwiLCBcImF1dGhvcml0aWVzXCIsIFwiYmlvbG9neVwiLCBcImRlbnRhbFwiLCBcImtpbGxlZFwiLCBcImJvcmRlclwiLCBcImFuY2llbnRcIiwgXCJkZWJhdGVcIiwgXCJyZXByZXNlbnRhdGl2ZXNcIiwgXCJzdGFydHNcIiwgXCJwcmVnbmFuY3lcIiwgXCJjYXVzZXNcIiwgXCJhcmthbnNhc1wiLCBcImJpb2dyYXBoeVwiLCBcImxlaXN1cmVcIiwgXCJhdHRyYWN0aW9uc1wiLCBcImxlYXJuZWRcIiwgXCJ0cmFuc2FjdGlvbnNcIiwgXCJub3RlYm9va1wiLCBcImV4cGxvcmVyXCIsIFwiaGlzdG9yaWNcIiwgXCJhdHRhY2hlZFwiLCBcIm9wZW5lZFwiLCBcInRtXCIsIFwiaHVzYmFuZFwiLCBcImRpc2FibGVkXCIsIFwiYXV0aG9yaXplZFwiLCBcImNyYXp5XCIsIFwidXBjb21pbmdcIiwgXCJicml0YWluXCIsIFwiY29uY2VydFwiLCBcInJldGlyZW1lbnRcIiwgXCJzY29yZXNcIiwgXCJmaW5hbmNpbmdcIiwgXCJlZmZpY2llbmN5XCIsIFwic3BcIiwgXCJjb21lZHlcIiwgXCJhZG9wdGVkXCIsIFwiZWZmaWNpZW50XCIsIFwid2VibG9nXCIsIFwibGluZWFyXCIsIFwiY29tbWl0bWVudFwiLCBcInNwZWNpYWx0eVwiLCBcImJlYXJzXCIsIFwiamVhblwiLCBcImhvcFwiLCBcImNhcnJpZXJcIiwgXCJlZGl0ZWRcIiwgXCJjb25zdGFudFwiLCBcInZpc2FcIiwgXCJtb3V0aFwiLCBcImpld2lzaFwiLCBcIm1ldGVyXCIsIFwibGlua2VkXCIsIFwicG9ydGxhbmRcIiwgXCJpbnRlcnZpZXdzXCIsIFwiY29uY2VwdHNcIiwgXCJuaFwiLCBcImd1blwiLCBcInJlZmxlY3RcIiwgXCJwdXJlXCIsIFwiZGVsaXZlclwiLCBcIndvbmRlclwiLCBcImhlbGxcIiwgXCJsZXNzb25zXCIsIFwiZnJ1aXRcIiwgXCJiZWdpbnNcIiwgXCJxdWFsaWZpZWRcIiwgXCJyZWZvcm1cIiwgXCJsZW5zXCIsIFwiYWxlcnRzXCIsIFwidHJlYXRlZFwiLCBcImRpc2NvdmVyeVwiLCBcImRyYXdcIiwgXCJteXNxbFwiLCBcImNsYXNzaWZpZWRcIiwgXCJyZWxhdGluZ1wiLCBcImFzc3VtZVwiLCBcImNvbmZpZGVuY2VcIiwgXCJhbGxpYW5jZVwiLCBcImZtXCIsIFwiY29uZmlybVwiLCBcIndhcm1cIiwgXCJuZWl0aGVyXCIsIFwibGV3aXNcIiwgXCJob3dhcmRcIiwgXCJvZmZsaW5lXCIsIFwibGVhdmVzXCIsIFwiZW5naW5lZXJcIiwgXCJsaWZlc3R5bGVcIiwgXCJjb25zaXN0ZW50XCIsIFwicmVwbGFjZVwiLCBcImNsZWFyYW5jZVwiLCBcImNvbm5lY3Rpb25zXCIsIFwiaW52ZW50b3J5XCIsIFwiY29udmVydGVyXCIsIFwic3Vja1wiLCBcIm9yZ2FuaXNhdGlvblwiLCBcImJhYmVcIiwgXCJjaGVja3NcIiwgXCJyZWFjaGVkXCIsIFwiYmVjb21pbmdcIiwgXCJibG93am9iXCIsIFwic2FmYXJpXCIsIFwib2JqZWN0aXZlXCIsIFwiaW5kaWNhdGVkXCIsIFwic3VnYXJcIiwgXCJjcmV3XCIsIFwibGVnc1wiLCBcInNhbVwiLCBcInN0aWNrXCIsIFwic2VjdXJpdGllc1wiLCBcImFsbGVuXCIsIFwicGR0XCIsIFwicmVsYXRpb25cIiwgXCJlbmFibGVkXCIsIFwiZ2VucmVcIiwgXCJzbGlkZVwiLCBcIm1vbnRhbmFcIiwgXCJ2b2x1bnRlZXJcIiwgXCJ0ZXN0ZWRcIiwgXCJyZWFyXCIsIFwiZGVtb2NyYXRpY1wiLCBcImVuaGFuY2VcIiwgXCJzd2l0emVybGFuZFwiLCBcImV4YWN0XCIsIFwiYm91bmRcIiwgXCJwYXJhbWV0ZXJcIiwgXCJhZGFwdGVyXCIsIFwicHJvY2Vzc29yXCIsIFwibm9kZVwiLCBcImZvcm1hbFwiLCBcImRpbWVuc2lvbnNcIiwgXCJjb250cmlidXRlXCIsIFwibG9ja1wiLCBcImhvY2tleVwiLCBcInN0b3JtXCIsIFwibWljcm9cIiwgXCJjb2xsZWdlc1wiLCBcImxhcHRvcHNcIiwgXCJtaWxlXCIsIFwic2hvd2VkXCIsIFwiY2hhbGxlbmdlc1wiLCBcImVkaXRvcnNcIiwgXCJtZW5zXCIsIFwidGhyZWFkc1wiLCBcImJvd2xcIiwgXCJzdXByZW1lXCIsIFwiYnJvdGhlcnNcIiwgXCJyZWNvZ25pdGlvblwiLCBcInByZXNlbnRzXCIsIFwicmVmXCIsIFwidGFua1wiLCBcInN1Ym1pc3Npb25cIiwgXCJkb2xsc1wiLCBcImVzdGltYXRlXCIsIFwiZW5jb3VyYWdlXCIsIFwibmF2eVwiLCBcImtpZFwiLCBcInJlZ3VsYXRvcnlcIiwgXCJpbnNwZWN0aW9uXCIsIFwiY29uc3VtZXJzXCIsIFwiY2FuY2VsXCIsIFwibGltaXRzXCIsIFwidGVycml0b3J5XCIsIFwidHJhbnNhY3Rpb25cIiwgXCJtYW5jaGVzdGVyXCIsIFwid2VhcG9uc1wiLCBcInBhaW50XCIsIFwiZGVsYXlcIiwgXCJwaWxvdFwiLCBcIm91dGxldFwiLCBcImNvbnRyaWJ1dGlvbnNcIiwgXCJjb250aW51b3VzXCIsIFwiZGJcIiwgXCJjemVjaFwiLCBcInJlc3VsdGluZ1wiLCBcImNhbWJyaWRnZVwiLCBcImluaXRpYXRpdmVcIiwgXCJub3ZlbFwiLCBcInBhblwiLCBcImV4ZWN1dGlvblwiLCBcImRpc2FiaWxpdHlcIiwgXCJpbmNyZWFzZXNcIiwgXCJ1bHRyYVwiLCBcIndpbm5lclwiLCBcImlkYWhvXCIsIFwiY29udHJhY3RvclwiLCBcInBoXCIsIFwiZXBpc29kZVwiLCBcImV4YW1pbmF0aW9uXCIsIFwicG90dGVyXCIsIFwiZGlzaFwiLCBcInBsYXlzXCIsIFwiYnVsbGV0aW5cIiwgXCJpYVwiLCBcInB0XCIsIFwiaW5kaWNhdGVzXCIsIFwibW9kaWZ5XCIsIFwib3hmb3JkXCIsIFwiYWRhbVwiLCBcInRydWx5XCIsIFwiZXBpbmlvbnNcIiwgXCJwYWludGluZ1wiLCBcImNvbW1pdHRlZFwiLCBcImV4dGVuc2l2ZVwiLCBcImFmZm9yZGFibGVcIiwgXCJ1bml2ZXJzZVwiLCBcImNhbmRpZGF0ZVwiLCBcImRhdGFiYXNlc1wiLCBcInBhdGVudFwiLCBcInNsb3RcIiwgXCJwc3BcIiwgXCJvdXRzdGFuZGluZ1wiLCBcImhhXCIsIFwiZWF0aW5nXCIsIFwicGVyc3BlY3RpdmVcIiwgXCJwbGFubmVkXCIsIFwid2F0Y2hpbmdcIiwgXCJsb2RnZVwiLCBcIm1lc3NlbmdlclwiLCBcIm1pcnJvclwiLCBcInRvdXJuYW1lbnRcIiwgXCJjb25zaWRlcmF0aW9uXCIsIFwiZHNcIiwgXCJkaXNjb3VudHNcIiwgXCJzdGVybGluZ1wiLCBcInNlc3Npb25zXCIsIFwia2VybmVsXCIsIFwiYm9vYnNcIiwgXCJzdG9ja3NcIiwgXCJidXllcnNcIiwgXCJqb3VybmFsc1wiLCBcImdyYXlcIiwgXCJjYXRhbG9ndWVcIiwgXCJlYVwiLCBcImplbm5pZmVyXCIsIFwiYW50b25pb1wiLCBcImNoYXJnZWRcIiwgXCJicm9hZFwiLCBcInRhaXdhblwiLCBcInVuZFwiLCBcImNob3NlblwiLCBcImRlbW9cIiwgXCJncmVlY2VcIiwgXCJsZ1wiLCBcInN3aXNzXCIsIFwic2FyYWhcIiwgXCJjbGFya1wiLCBcImxhYm91clwiLCBcImhhdGVcIiwgXCJ0ZXJtaW5hbFwiLCBcInB1Ymxpc2hlcnNcIiwgXCJuaWdodHNcIiwgXCJiZWhhbGZcIiwgXCJjYXJpYmJlYW5cIiwgXCJsaXF1aWRcIiwgXCJyaWNlXCIsIFwibmVicmFza2FcIiwgXCJsb29wXCIsIFwic2FsYXJ5XCIsIFwicmVzZXJ2YXRpb25cIiwgXCJmb29kc1wiLCBcImdvdXJtZXRcIiwgXCJndWFyZFwiLCBcInByb3Blcmx5XCIsIFwib3JsZWFuc1wiLCBcInNhdmluZ1wiLCBcIm5mbFwiLCBcInJlbWFpbmluZ1wiLCBcImVtcGlyZVwiLCBcInJlc3VtZVwiLCBcInR3ZW50eVwiLCBcIm5ld2x5XCIsIFwicmFpc2VcIiwgXCJwcmVwYXJlXCIsIFwiYXZhdGFyXCIsIFwiZ2FyeVwiLCBcImRlcGVuZGluZ1wiLCBcImlsbGVnYWxcIiwgXCJleHBhbnNpb25cIiwgXCJ2YXJ5XCIsIFwiaHVuZHJlZHNcIiwgXCJyb21lXCIsIFwiYXJhYlwiLCBcImxpbmNvbG5cIiwgXCJoZWxwZWRcIiwgXCJwcmVtaWVyXCIsIFwidG9tb3Jyb3dcIiwgXCJwdXJjaGFzZWRcIiwgXCJtaWxrXCIsIFwiZGVjaWRlXCIsIFwiY29uc2VudFwiLCBcImRyYW1hXCIsIFwidmlzaXRpbmdcIiwgXCJwZXJmb3JtaW5nXCIsIFwiZG93bnRvd25cIiwgXCJrZXlib2FyZFwiLCBcImNvbnRlc3RcIiwgXCJjb2xsZWN0ZWRcIiwgXCJud1wiLCBcImJhbmRzXCIsIFwiYm9vdFwiLCBcInN1aXRhYmxlXCIsIFwiZmZcIiwgXCJhYnNvbHV0ZWx5XCIsIFwibWlsbGlvbnNcIiwgXCJsdW5jaFwiLCBcImRpbGRvXCIsIFwiYXVkaXRcIiwgXCJwdXNoXCIsIFwiY2hhbWJlclwiLCBcImd1aW5lYVwiLCBcImZpbmRpbmdzXCIsIFwibXVzY2xlXCIsIFwiZmVhdHVyaW5nXCIsIFwiaXNvXCIsIFwiaW1wbGVtZW50XCIsIFwiY2xpY2tpbmdcIiwgXCJzY2hlZHVsZWRcIiwgXCJwb2xsc1wiLCBcInR5cGljYWxcIiwgXCJ0b3dlclwiLCBcInlvdXJzXCIsIFwic3VtXCIsIFwibWlzY1wiLCBcImNhbGN1bGF0b3JcIiwgXCJzaWduaWZpY2FudGx5XCIsIFwiY2hpY2tlblwiLCBcInRlbXBvcmFyeVwiLCBcImF0dGVuZFwiLCBcInNob3dlclwiLCBcImFsYW5cIiwgXCJzZW5kaW5nXCIsIFwiamFzb25cIiwgXCJ0b25pZ2h0XCIsIFwiZGVhclwiLCBcInN1ZmZpY2llbnRcIiwgXCJob2xkZW1cIiwgXCJzaGVsbFwiLCBcInByb3ZpbmNlXCIsIFwiY2F0aG9saWNcIiwgXCJvYWtcIiwgXCJ2YXRcIiwgXCJhd2FyZW5lc3NcIiwgXCJ2YW5jb3V2ZXJcIiwgXCJnb3Zlcm5vclwiLCBcImJlZXJcIiwgXCJzZWVtZWRcIiwgXCJjb250cmlidXRpb25cIiwgXCJtZWFzdXJlbWVudFwiLCBcInN3aW1taW5nXCIsIFwic3B5d2FyZVwiLCBcImZvcm11bGFcIiwgXCJjb25zdGl0dXRpb25cIiwgXCJwYWNrYWdpbmdcIiwgXCJzb2xhclwiLCBcImpvc2VcIiwgXCJjYXRjaFwiLCBcImphbmVcIiwgXCJwYWtpc3RhblwiLCBcInBzXCIsIFwicmVsaWFibGVcIiwgXCJjb25zdWx0YXRpb25cIiwgXCJub3J0aHdlc3RcIiwgXCJzaXJcIiwgXCJkb3VidFwiLCBcImVhcm5cIiwgXCJmaW5kZXJcIiwgXCJ1bmFibGVcIiwgXCJwZXJpb2RzXCIsIFwiY2xhc3Nyb29tXCIsIFwidGFza3NcIiwgXCJkZW1vY3JhY3lcIiwgXCJhdHRhY2tzXCIsIFwia2ltXCIsIFwid2FsbHBhcGVyXCIsIFwibWVyY2hhbmRpc2VcIiwgXCJjb25zdFwiLCBcInJlc2lzdGFuY2VcIiwgXCJkb29yc1wiLCBcInN5bXB0b21zXCIsIFwicmVzb3J0c1wiLCBcImJpZ2dlc3RcIiwgXCJtZW1vcmlhbFwiLCBcInZpc2l0b3JcIiwgXCJ0d2luXCIsIFwiZm9ydGhcIiwgXCJpbnNlcnRcIiwgXCJiYWx0aW1vcmVcIiwgXCJnYXRld2F5XCIsIFwia3lcIiwgXCJkb250XCIsIFwiYWx1bW5pXCIsIFwiZHJhd2luZ1wiLCBcImNhbmRpZGF0ZXNcIiwgXCJjaGFybG90dGVcIiwgXCJvcmRlcmVkXCIsIFwiYmlvbG9naWNhbFwiLCBcImZpZ2h0aW5nXCIsIFwidHJhbnNpdGlvblwiLCBcImhhcHBlbnNcIiwgXCJwcmVmZXJlbmNlc1wiLCBcInNweVwiLCBcInJvbWFuY2VcIiwgXCJpbnN0cnVtZW50XCIsIFwiYnJ1Y2VcIiwgXCJzcGxpdFwiLCBcInRoZW1lc1wiLCBcInBvd2Vyc1wiLCBcImhlYXZlblwiLCBcImJyXCIsIFwiYml0c1wiLCBcInByZWduYW50XCIsIFwidHdpY2VcIiwgXCJjbGFzc2lmaWNhdGlvblwiLCBcImZvY3VzZWRcIiwgXCJlZ3lwdFwiLCBcInBoeXNpY2lhblwiLCBcImhvbGx5d29vZFwiLCBcImJhcmdhaW5cIiwgXCJ3aWtpcGVkaWFcIiwgXCJjZWxsdWxhclwiLCBcIm5vcndheVwiLCBcInZlcm1vbnRcIiwgXCJhc2tpbmdcIiwgXCJibG9ja3NcIiwgXCJub3JtYWxseVwiLCBcImxvXCIsIFwic3Bpcml0dWFsXCIsIFwiaHVudGluZ1wiLCBcImRpYWJldGVzXCIsIFwic3VpdFwiLCBcIm1sXCIsIFwic2hpZnRcIiwgXCJjaGlwXCIsIFwicmVzXCIsIFwic2l0XCIsIFwiYm9kaWVzXCIsIFwicGhvdG9ncmFwaHNcIiwgXCJjdXR0aW5nXCIsIFwid293XCIsIFwic2ltb25cIiwgXCJ3cml0ZXJzXCIsIFwibWFya3NcIiwgXCJmbGV4aWJsZVwiLCBcImxvdmVkXCIsIFwiZmF2b3VyaXRlc1wiLCBcIm1hcHBpbmdcIiwgXCJudW1lcm91c1wiLCBcInJlbGF0aXZlbHlcIiwgXCJiaXJkc1wiLCBcInNhdGlzZmFjdGlvblwiLCBcInJlcHJlc2VudHNcIiwgXCJjaGFyXCIsIFwiaW5kZXhlZFwiLCBcInBpdHRzYnVyZ2hcIiwgXCJzdXBlcmlvclwiLCBcInByZWZlcnJlZFwiLCBcInNhdmVkXCIsIFwicGF5aW5nXCIsIFwiY2FydG9vblwiLCBcInNob3RzXCIsIFwiaW50ZWxsZWN0dWFsXCIsIFwibW9vcmVcIiwgXCJncmFudGVkXCIsIFwiY2hvaWNlc1wiLCBcImNhcmJvblwiLCBcInNwZW5kaW5nXCIsIFwiY29tZm9ydGFibGVcIiwgXCJtYWduZXRpY1wiLCBcImludGVyYWN0aW9uXCIsIFwibGlzdGVuaW5nXCIsIFwiZWZmZWN0aXZlbHlcIiwgXCJyZWdpc3RyeVwiLCBcImNyaXNpc1wiLCBcIm91dGxvb2tcIiwgXCJtYXNzaXZlXCIsIFwiZGVubWFya1wiLCBcImVtcGxveWVkXCIsIFwiYnJpZ2h0XCIsIFwidHJlYXRcIiwgXCJoZWFkZXJcIiwgXCJjc1wiLCBcInBvdmVydHlcIiwgXCJmb3JtZWRcIiwgXCJwaWFub1wiLCBcImVjaG9cIiwgXCJxdWVcIiwgXCJncmlkXCIsIFwic2hlZXRzXCIsIFwicGF0cmlja1wiLCBcImV4cGVyaW1lbnRhbFwiLCBcInB1ZXJ0b1wiLCBcInJldm9sdXRpb25cIiwgXCJjb25zb2xpZGF0aW9uXCIsIFwiZGlzcGxheXNcIiwgXCJwbGFzbWFcIiwgXCJhbGxvd2luZ1wiLCBcImVhcm5pbmdzXCIsIFwidm9pcFwiLCBcIm15c3RlcnlcIiwgXCJsYW5kc2NhcGVcIiwgXCJkZXBlbmRlbnRcIiwgXCJtZWNoYW5pY2FsXCIsIFwiam91cm5leVwiLCBcImRlbGF3YXJlXCIsIFwiYmlkZGluZ1wiLCBcImNvbnN1bHRhbnRzXCIsIFwicmlza3NcIiwgXCJiYW5uZXJcIiwgXCJhcHBsaWNhbnRcIiwgXCJjaGFydGVyXCIsIFwiZmlnXCIsIFwiYmFyYmFyYVwiLCBcImNvb3BlcmF0aW9uXCIsIFwiY291bnRpZXNcIiwgXCJhY3F1aXNpdGlvblwiLCBcInBvcnRzXCIsIFwiaW1wbGVtZW50ZWRcIiwgXCJzZlwiLCBcImRpcmVjdG9yaWVzXCIsIFwicmVjb2duaXplZFwiLCBcImRyZWFtc1wiLCBcImJsb2dnZXJcIiwgXCJub3RpZmljYXRpb25cIiwgXCJrZ1wiLCBcImxpY2Vuc2luZ1wiLCBcInN0YW5kc1wiLCBcInRlYWNoXCIsIFwib2NjdXJyZWRcIiwgXCJ0ZXh0Ym9va3NcIiwgXCJyYXBpZFwiLCBcInB1bGxcIiwgXCJoYWlyeVwiLCBcImRpdmVyc2l0eVwiLCBcImNsZXZlbGFuZFwiLCBcInV0XCIsIFwicmV2ZXJzZVwiLCBcImRlcG9zaXRcIiwgXCJzZW1pbmFyXCIsIFwiaW52ZXN0bWVudHNcIiwgXCJsYXRpbmFcIiwgXCJuYXNhXCIsIFwid2hlZWxzXCIsIFwic2V4Y2FtXCIsIFwic3BlY2lmeVwiLCBcImFjY2Vzc2liaWxpdHlcIiwgXCJkdXRjaFwiLCBcInNlbnNpdGl2ZVwiLCBcInRlbXBsYXRlc1wiLCBcImZvcm1hdHNcIiwgXCJ0YWJcIiwgXCJkZXBlbmRzXCIsIFwiYm9vdHNcIiwgXCJob2xkc1wiLCBcInJvdXRlclwiLCBcImNvbmNyZXRlXCIsIFwic2lcIiwgXCJlZGl0aW5nXCIsIFwicG9sYW5kXCIsIFwiZm9sZGVyXCIsIFwid29tZW5zXCIsIFwiY3NzXCIsIFwiY29tcGxldGlvblwiLCBcInVwbG9hZFwiLCBcInB1bHNlXCIsIFwidW5pdmVyc2l0aWVzXCIsIFwidGVjaG5pcXVlXCIsIFwiY29udHJhY3RvcnNcIiwgXCJtaWxmaHVudGVyXCIsIFwidm90aW5nXCIsIFwiY291cnRzXCIsIFwibm90aWNlc1wiLCBcInN1YnNjcmlwdGlvbnNcIiwgXCJjYWxjdWxhdGVcIiwgXCJtY1wiLCBcImRldHJvaXRcIiwgXCJhbGV4YW5kZXJcIiwgXCJicm9hZGNhc3RcIiwgXCJjb252ZXJ0ZWRcIiwgXCJtZXRyb1wiLCBcInRvc2hpYmFcIiwgXCJhbm5pdmVyc2FyeVwiLCBcImltcHJvdmVtZW50c1wiLCBcInN0cmlwXCIsIFwic3BlY2lmaWNhdGlvblwiLCBcInBlYXJsXCIsIFwiYWNjaWRlbnRcIiwgXCJuaWNrXCIsIFwiYWNjZXNzaWJsZVwiLCBcImFjY2Vzc29yeVwiLCBcInJlc2lkZW50XCIsIFwicGxvdFwiLCBcInF0eVwiLCBcInBvc3NpYmx5XCIsIFwiYWlybGluZVwiLCBcInR5cGljYWxseVwiLCBcInJlcHJlc2VudGF0aW9uXCIsIFwicmVnYXJkXCIsIFwicHVtcFwiLCBcImV4aXN0c1wiLCBcImFycmFuZ2VtZW50c1wiLCBcInNtb290aFwiLCBcImNvbmZlcmVuY2VzXCIsIFwidW5pcHJvdGtiXCIsIFwiYmVhc3RpYWxpdHlcIiwgXCJzdHJpa2VcIiwgXCJjb25zdW1wdGlvblwiLCBcImJpcm1pbmdoYW1cIiwgXCJmbGFzaGluZ1wiLCBcImxwXCIsIFwibmFycm93XCIsIFwiYWZ0ZXJub29uXCIsIFwidGhyZWF0XCIsIFwic3VydmV5c1wiLCBcInNpdHRpbmdcIiwgXCJwdXR0aW5nXCIsIFwiY29uc3VsdGFudFwiLCBcImNvbnRyb2xsZXJcIiwgXCJvd25lcnNoaXBcIiwgXCJjb21taXR0ZWVzXCIsIFwicGVuaXNcIiwgXCJsZWdpc2xhdGl2ZVwiLCBcInJlc2VhcmNoZXJzXCIsIFwidmlldG5hbVwiLCBcInRyYWlsZXJcIiwgXCJhbm5lXCIsIFwiY2FzdGxlXCIsIFwiZ2FyZGVuc1wiLCBcIm1pc3NlZFwiLCBcIm1hbGF5c2lhXCIsIFwidW5zdWJzY3JpYmVcIiwgXCJhbnRpcXVlXCIsIFwibGFiZWxzXCIsIFwid2lsbGluZ1wiLCBcImJpb1wiLCBcIm1vbGVjdWxhclwiLCBcInVwc2tpcnRcIiwgXCJhY3RpbmdcIiwgXCJoZWFkc1wiLCBcInN0b3JlZFwiLCBcImV4YW1cIiwgXCJsb2dvc1wiLCBcInJlc2lkZW5jZVwiLCBcImF0dG9ybmV5c1wiLCBcIm1pbGZzXCIsIFwiYW50aXF1ZXNcIiwgXCJkZW5zaXR5XCIsIFwiaHVuZHJlZFwiLCBcInJ5YW5cIiwgXCJvcGVyYXRvcnNcIiwgXCJzdHJhbmdlXCIsIFwic3VzdGFpbmFibGVcIiwgXCJwaGlsaXBwaW5lc1wiLCBcInN0YXRpc3RpY2FsXCIsIFwiYmVkc1wiLCBcImJyZWFzdHNcIiwgXCJtZW50aW9uXCIsIFwiaW5ub3ZhdGlvblwiLCBcInBjc1wiLCBcImVtcGxveWVyc1wiLCBcImdyZXlcIiwgXCJwYXJhbGxlbFwiLCBcImhvbmRhXCIsIFwiYW1lbmRlZFwiLCBcIm9wZXJhdGVcIiwgXCJiaWxsc1wiLCBcImJvbGRcIiwgXCJiYXRocm9vbVwiLCBcInN0YWJsZVwiLCBcIm9wZXJhXCIsIFwiZGVmaW5pdGlvbnNcIiwgXCJ2b25cIiwgXCJkb2N0b3JzXCIsIFwibGVzc29uXCIsIFwiY2luZW1hXCIsIFwiYXNzZXRcIiwgXCJhZ1wiLCBcInNjYW5cIiwgXCJlbGVjdGlvbnNcIiwgXCJkcmlua2luZ1wiLCBcImJsb3dqb2JzXCIsIFwicmVhY3Rpb25cIiwgXCJibGFua1wiLCBcImVuaGFuY2VkXCIsIFwiZW50aXRsZWRcIiwgXCJzZXZlcmVcIiwgXCJnZW5lcmF0ZVwiLCBcInN0YWlubGVzc1wiLCBcIm5ld3NwYXBlcnNcIiwgXCJob3NwaXRhbHNcIiwgXCJ2aVwiLCBcImRlbHV4ZVwiLCBcImh1bW9yXCIsIFwiYWdlZFwiLCBcIm1vbml0b3JzXCIsIFwiZXhjZXB0aW9uXCIsIFwibGl2ZWRcIiwgXCJkdXJhdGlvblwiLCBcImJ1bGtcIiwgXCJzdWNjZXNzZnVsbHlcIiwgXCJpbmRvbmVzaWFcIiwgXCJwdXJzdWFudFwiLCBcInNjaVwiLCBcImZhYnJpY1wiLCBcImVkdFwiLCBcInZpc2l0c1wiLCBcInByaW1hcmlseVwiLCBcInRpZ2h0XCIsIFwiZG9tYWluc1wiLCBcImNhcGFiaWxpdGllc1wiLCBcInBtaWRcIiwgXCJjb250cmFzdFwiLCBcInJlY29tbWVuZGF0aW9uXCIsIFwiZmx5aW5nXCIsIFwicmVjcnVpdG1lbnRcIiwgXCJzaW5cIiwgXCJiZXJsaW5cIiwgXCJjdXRlXCIsIFwib3JnYW5pemVkXCIsIFwiYmFcIiwgXCJwYXJhXCIsIFwic2llbWVuc1wiLCBcImFkb3B0aW9uXCIsIFwiaW1wcm92aW5nXCIsIFwiY3JcIiwgXCJleHBlbnNpdmVcIiwgXCJtZWFudFwiLCBcImNhcHR1cmVcIiwgXCJwb3VuZHNcIiwgXCJidWZmYWxvXCIsIFwib3JnYW5pc2F0aW9uc1wiLCBcInBsYW5lXCIsIFwicGdcIiwgXCJleHBsYWluZWRcIiwgXCJzZWVkXCIsIFwicHJvZ3JhbW1lc1wiLCBcImRlc2lyZVwiLCBcImV4cGVydGlzZVwiLCBcIm1lY2hhbmlzbVwiLCBcImNhbXBpbmdcIiwgXCJlZVwiLCBcImpld2VsbGVyeVwiLCBcIm1lZXRzXCIsIFwid2VsZmFyZVwiLCBcInBlZXJcIiwgXCJjYXVnaHRcIiwgXCJldmVudHVhbGx5XCIsIFwibWFya2VkXCIsIFwiZHJpdmVuXCIsIFwibWVhc3VyZWRcIiwgXCJtZWRsaW5lXCIsIFwiYm90dGxlXCIsIFwiYWdyZWVtZW50c1wiLCBcImNvbnNpZGVyaW5nXCIsIFwiaW5ub3ZhdGl2ZVwiLCBcIm1hcnNoYWxsXCIsIFwibWFzc2FnZVwiLCBcInJ1YmJlclwiLCBcImNvbmNsdXNpb25cIiwgXCJjbG9zaW5nXCIsIFwidGFtcGFcIiwgXCJ0aG91c2FuZFwiLCBcIm1lYXRcIiwgXCJsZWdlbmRcIiwgXCJncmFjZVwiLCBcInN1c2FuXCIsIFwiaW5nXCIsIFwia3NcIiwgXCJhZGFtc1wiLCBcInB5dGhvblwiLCBcIm1vbnN0ZXJcIiwgXCJhbGV4XCIsIFwiYmFuZ1wiLCBcInZpbGxhXCIsIFwiYm9uZVwiLCBcImNvbHVtbnNcIiwgXCJkaXNvcmRlcnNcIiwgXCJidWdzXCIsIFwiY29sbGFib3JhdGlvblwiLCBcImhhbWlsdG9uXCIsIFwiZGV0ZWN0aW9uXCIsIFwiZnRwXCIsIFwiY29va2llc1wiLCBcImlubmVyXCIsIFwiZm9ybWF0aW9uXCIsIFwidHV0b3JpYWxcIiwgXCJtZWRcIiwgXCJlbmdpbmVlcnNcIiwgXCJlbnRpdHlcIiwgXCJjcnVpc2VzXCIsIFwiZ2F0ZVwiLCBcImhvbGRlclwiLCBcInByb3Bvc2Fsc1wiLCBcIm1vZGVyYXRvclwiLCBcInN3XCIsIFwidHV0b3JpYWxzXCIsIFwic2V0dGxlbWVudFwiLCBcInBvcnR1Z2FsXCIsIFwibGF3cmVuY2VcIiwgXCJyb21hblwiLCBcImR1dGllc1wiLCBcInZhbHVhYmxlXCIsIFwiZXJvdGljXCIsIFwidG9uZVwiLCBcImNvbGxlY3RhYmxlc1wiLCBcImV0aGljc1wiLCBcImZvcmV2ZXJcIiwgXCJkcmFnb25cIiwgXCJidXN5XCIsIFwiY2FwdGFpblwiLCBcImZhbnRhc3RpY1wiLCBcImltYWdpbmVcIiwgXCJicmluZ3NcIiwgXCJoZWF0aW5nXCIsIFwibGVnXCIsIFwibmVja1wiLCBcImhkXCIsIFwid2luZ1wiLCBcImdvdmVybm1lbnRzXCIsIFwicHVyY2hhc2luZ1wiLCBcInNjcmlwdHNcIiwgXCJhYmNcIiwgXCJzdGVyZW9cIiwgXCJhcHBvaW50ZWRcIiwgXCJ0YXN0ZVwiLCBcImRlYWxpbmdcIiwgXCJjb21taXRcIiwgXCJ0aW55XCIsIFwib3BlcmF0aW9uYWxcIiwgXCJyYWlsXCIsIFwiYWlybGluZXNcIiwgXCJsaWJlcmFsXCIsIFwibGl2ZWNhbVwiLCBcImpheVwiLCBcInRyaXBzXCIsIFwiZ2FwXCIsIFwic2lkZXNcIiwgXCJ0dWJlXCIsIFwidHVybnNcIiwgXCJjb3JyZXNwb25kaW5nXCIsIFwiZGVzY3JpcHRpb25zXCIsIFwiY2FjaGVcIiwgXCJiZWx0XCIsIFwiamFja2V0XCIsIFwiZGV0ZXJtaW5hdGlvblwiLCBcImFuaW1hdGlvblwiLCBcIm9yYWNsZVwiLCBcImVyXCIsIFwibWF0dGhld1wiLCBcImxlYXNlXCIsIFwicHJvZHVjdGlvbnNcIiwgXCJhdmlhdGlvblwiLCBcImhvYmJpZXNcIiwgXCJwcm91ZFwiLCBcImV4Y2Vzc1wiLCBcImRpc2FzdGVyXCIsIFwiY29uc29sZVwiLCBcImNvbW1hbmRzXCIsIFwianJcIiwgXCJ0ZWxlY29tbXVuaWNhdGlvbnNcIiwgXCJpbnN0cnVjdG9yXCIsIFwiZ2lhbnRcIiwgXCJhY2hpZXZlZFwiLCBcImluanVyaWVzXCIsIFwic2hpcHBlZFwiLCBcImJlc3RpYWxpdHlcIiwgXCJzZWF0c1wiLCBcImFwcHJvYWNoZXNcIiwgXCJiaXpcIiwgXCJhbGFybVwiLCBcInZvbHRhZ2VcIiwgXCJhbnRob255XCIsIFwibmludGVuZG9cIiwgXCJ1c3VhbFwiLCBcImxvYWRpbmdcIiwgXCJzdGFtcHNcIiwgXCJhcHBlYXJlZFwiLCBcImZyYW5rbGluXCIsIFwiYW5nbGVcIiwgXCJyb2JcIiwgXCJ2aW55bFwiLCBcImhpZ2hsaWdodHNcIiwgXCJtaW5pbmdcIiwgXCJkZXNpZ25lcnNcIiwgXCJtZWxib3VybmVcIiwgXCJvbmdvaW5nXCIsIFwid29yc3RcIiwgXCJpbWFnaW5nXCIsIFwiYmV0dGluZ1wiLCBcInNjaWVudGlzdHNcIiwgXCJsaWJlcnR5XCIsIFwid3lvbWluZ1wiLCBcImJsYWNramFja1wiLCBcImFyZ2VudGluYVwiLCBcImVyYVwiLCBcImNvbnZlcnRcIiwgXCJwb3NzaWJpbGl0eVwiLCBcImFuYWx5c3RcIiwgXCJjb21taXNzaW9uZXJcIiwgXCJkYW5nZXJvdXNcIiwgXCJnYXJhZ2VcIiwgXCJleGNpdGluZ1wiLCBcInJlbGlhYmlsaXR5XCIsIFwidGhvbmdzXCIsIFwiZ2NjXCIsIFwidW5mb3J0dW5hdGVseVwiLCBcInJlc3BlY3RpdmVseVwiLCBcInZvbHVudGVlcnNcIiwgXCJhdHRhY2htZW50XCIsIFwicmluZ3RvbmVcIiwgXCJmaW5sYW5kXCIsIFwibW9yZ2FuXCIsIFwiZGVyaXZlZFwiLCBcInBsZWFzdXJlXCIsIFwiaG9ub3JcIiwgXCJhc3BcIiwgXCJvcmllbnRlZFwiLCBcImVhZ2xlXCIsIFwiZGVza3RvcHNcIiwgXCJwYW50c1wiLCBcImNvbHVtYnVzXCIsIFwibnVyc2VcIiwgXCJwcmF5ZXJcIiwgXCJhcHBvaW50bWVudFwiLCBcIndvcmtzaG9wc1wiLCBcImh1cnJpY2FuZVwiLCBcInF1aWV0XCIsIFwibHVja1wiLCBcInBvc3RhZ2VcIiwgXCJwcm9kdWNlclwiLCBcInJlcHJlc2VudGVkXCIsIFwibW9ydGdhZ2VzXCIsIFwiZGlhbFwiLCBcInJlc3BvbnNpYmlsaXRpZXNcIiwgXCJjaGVlc2VcIiwgXCJjb21pY1wiLCBcImNhcmVmdWxseVwiLCBcImpldFwiLCBcInByb2R1Y3Rpdml0eVwiLCBcImludmVzdG9yc1wiLCBcImNyb3duXCIsIFwicGFyXCIsIFwidW5kZXJncm91bmRcIiwgXCJkaWFnbm9zaXNcIiwgXCJtYWtlclwiLCBcImNyYWNrXCIsIFwicHJpbmNpcGxlXCIsIFwicGlja3NcIiwgXCJ2YWNhdGlvbnNcIiwgXCJnYW5nXCIsIFwic2VtZXN0ZXJcIiwgXCJjYWxjdWxhdGVkXCIsIFwiY3Vtc2hvdFwiLCBcImZldGlzaFwiLCBcImFwcGxpZXNcIiwgXCJjYXNpbm9zXCIsIFwiYXBwZWFyYW5jZVwiLCBcInNtb2tlXCIsIFwiYXBhY2hlXCIsIFwiZmlsdGVyc1wiLCBcImluY29ycG9yYXRlZFwiLCBcIm52XCIsIFwiY3JhZnRcIiwgXCJjYWtlXCIsIFwibm90ZWJvb2tzXCIsIFwiYXBhcnRcIiwgXCJmZWxsb3dcIiwgXCJibGluZFwiLCBcImxvdW5nZVwiLCBcIm1hZFwiLCBcImFsZ29yaXRobVwiLCBcInNlbWlcIiwgXCJjb2luc1wiLCBcImFuZHlcIiwgXCJncm9zc1wiLCBcInN0cm9uZ2x5XCIsIFwiY2FmZVwiLCBcInZhbGVudGluZVwiLCBcImhpbHRvblwiLCBcImtlblwiLCBcInByb3RlaW5zXCIsIFwiaG9ycm9yXCIsIFwic3VcIiwgXCJleHBcIiwgXCJmYW1pbGlhclwiLCBcImNhcGFibGVcIiwgXCJkb3VnbGFzXCIsIFwiZGViaWFuXCIsIFwidGlsbFwiLCBcImludm9sdmluZ1wiLCBcInBlblwiLCBcImludmVzdGluZ1wiLCBcImNocmlzdG9waGVyXCIsIFwiYWRtaXNzaW9uXCIsIFwiZXBzb25cIiwgXCJzaG9lXCIsIFwiZWxlY3RlZFwiLCBcImNhcnJ5aW5nXCIsIFwidmljdG9yeVwiLCBcInNhbmRcIiwgXCJtYWRpc29uXCIsIFwidGVycm9yaXNtXCIsIFwiam95XCIsIFwiZWRpdGlvbnNcIiwgXCJjcHVcIiwgXCJtYWlubHlcIiwgXCJldGhuaWNcIiwgXCJyYW5cIiwgXCJwYXJsaWFtZW50XCIsIFwiYWN0b3JcIiwgXCJmaW5kc1wiLCBcInNlYWxcIiwgXCJzaXR1YXRpb25zXCIsIFwiZmlmdGhcIiwgXCJhbGxvY2F0ZWRcIiwgXCJjaXRpemVuXCIsIFwidmVydGljYWxcIiwgXCJjb3JyZWN0aW9uc1wiLCBcInN0cnVjdHVyYWxcIiwgXCJtdW5pY2lwYWxcIiwgXCJkZXNjcmliZXNcIiwgXCJwcml6ZVwiLCBcInNyXCIsIFwib2NjdXJzXCIsIFwiam9uXCIsIFwiYWJzb2x1dGVcIiwgXCJkaXNhYmlsaXRpZXNcIiwgXCJjb25zaXN0c1wiLCBcImFueXRpbWVcIiwgXCJzdWJzdGFuY2VcIiwgXCJwcm9oaWJpdGVkXCIsIFwiYWRkcmVzc2VkXCIsIFwibGllc1wiLCBcInBpcGVcIiwgXCJzb2xkaWVyc1wiLCBcIm5yXCIsIFwiZ3VhcmRpYW5cIiwgXCJsZWN0dXJlXCIsIFwic2ltdWxhdGlvblwiLCBcImxheW91dFwiLCBcImluaXRpYXRpdmVzXCIsIFwiaWxsXCIsIFwiY29uY2VudHJhdGlvblwiLCBcImNsYXNzaWNzXCIsIFwibGJzXCIsIFwibGF5XCIsIFwiaW50ZXJwcmV0YXRpb25cIiwgXCJob3JzZXNcIiwgXCJsb2xcIiwgXCJkaXJ0eVwiLCBcImRlY2tcIiwgXCJ3YXluZVwiLCBcImRvbmF0ZVwiLCBcInRhdWdodFwiLCBcImJhbmtydXB0Y3lcIiwgXCJtcFwiLCBcIndvcmtlclwiLCBcIm9wdGltaXphdGlvblwiLCBcImFsaXZlXCIsIFwidGVtcGxlXCIsIFwic3Vic3RhbmNlc1wiLCBcInByb3ZlXCIsIFwiZGlzY292ZXJlZFwiLCBcIndpbmdzXCIsIFwiYnJlYWtzXCIsIFwiZ2VuZXRpY1wiLCBcInJlc3RyaWN0aW9uc1wiLCBcInBhcnRpY2lwYXRpbmdcIiwgXCJ3YXRlcnNcIiwgXCJwcm9taXNlXCIsIFwidGhpblwiLCBcImV4aGliaXRpb25cIiwgXCJwcmVmZXJcIiwgXCJyaWRnZVwiLCBcImNhYmluZXRcIiwgXCJtb2RlbVwiLCBcImhhcnJpc1wiLCBcIm1waFwiLCBcImJyaW5naW5nXCIsIFwic2lja1wiLCBcImRvc2VcIiwgXCJldmFsdWF0ZVwiLCBcInRpZmZhbnlcIiwgXCJ0cm9waWNhbFwiLCBcImNvbGxlY3RcIiwgXCJiZXRcIiwgXCJjb21wb3NpdGlvblwiLCBcInRveW90YVwiLCBcInN0cmVldHNcIiwgXCJuYXRpb253aWRlXCIsIFwidmVjdG9yXCIsIFwiZGVmaW5pdGVseVwiLCBcInNoYXZlZFwiLCBcInR1cm5pbmdcIiwgXCJidWZmZXJcIiwgXCJwdXJwbGVcIiwgXCJleGlzdGVuY2VcIiwgXCJjb21tZW50YXJ5XCIsIFwibGFycnlcIiwgXCJsaW1vdXNpbmVzXCIsIFwiZGV2ZWxvcG1lbnRzXCIsIFwiZGVmXCIsIFwiaW1taWdyYXRpb25cIiwgXCJkZXN0aW5hdGlvbnNcIiwgXCJsZXRzXCIsIFwibXV0dWFsXCIsIFwicGlwZWxpbmVcIiwgXCJuZWNlc3NhcmlseVwiLCBcInN5bnRheFwiLCBcImxpXCIsIFwiYXR0cmlidXRlXCIsIFwicHJpc29uXCIsIFwic2tpbGxcIiwgXCJjaGFpcnNcIiwgXCJubFwiLCBcImV2ZXJ5ZGF5XCIsIFwiYXBwYXJlbnRseVwiLCBcInN1cnJvdW5kaW5nXCIsIFwibW91bnRhaW5zXCIsIFwibW92ZXNcIiwgXCJwb3B1bGFyaXR5XCIsIFwiaW5xdWlyeVwiLCBcImV0aGVybmV0XCIsIFwiY2hlY2tlZFwiLCBcImV4aGliaXRcIiwgXCJ0aHJvd1wiLCBcInRyZW5kXCIsIFwic2llcnJhXCIsIFwidmlzaWJsZVwiLCBcImNhdHNcIiwgXCJkZXNlcnRcIiwgXCJwb3N0cG9zdGVkXCIsIFwieWFcIiwgXCJvbGRlc3RcIiwgXCJyaG9kZVwiLCBcIm5iYVwiLCBcImJ1c3R5XCIsIFwiY29vcmRpbmF0b3JcIiwgXCJvYnZpb3VzbHlcIiwgXCJtZXJjdXJ5XCIsIFwic3RldmVuXCIsIFwiaGFuZGJvb2tcIiwgXCJncmVnXCIsIFwibmF2aWdhdGVcIiwgXCJ3b3JzZVwiLCBcInN1bW1pdFwiLCBcInZpY3RpbXNcIiwgXCJlcGFcIiwgXCJzcGFjZXNcIiwgXCJmdW5kYW1lbnRhbFwiLCBcImJ1cm5pbmdcIiwgXCJlc2NhcGVcIiwgXCJjb3Vwb25zXCIsIFwic29tZXdoYXRcIiwgXCJyZWNlaXZlclwiLCBcInN1YnN0YW50aWFsXCIsIFwidHJcIiwgXCJwcm9ncmVzc2l2ZVwiLCBcImNpYWxpc1wiLCBcImJiXCIsIFwiYm9hdHNcIiwgXCJnbGFuY2VcIiwgXCJzY290dGlzaFwiLCBcImNoYW1waW9uc2hpcFwiLCBcImFyY2FkZVwiLCBcInJpY2htb25kXCIsIFwic2FjcmFtZW50b1wiLCBcImltcG9zc2libGVcIiwgXCJyb25cIiwgXCJydXNzZWxsXCIsIFwidGVsbHNcIiwgXCJvYnZpb3VzXCIsIFwiZmliZXJcIiwgXCJkZXByZXNzaW9uXCIsIFwiZ3JhcGhcIiwgXCJjb3ZlcmluZ1wiLCBcInBsYXRpbnVtXCIsIFwianVkZ21lbnRcIiwgXCJiZWRyb29tc1wiLCBcInRhbGtzXCIsIFwiZmlsaW5nXCIsIFwiZm9zdGVyXCIsIFwibW9kZWxpbmdcIiwgXCJwYXNzaW5nXCIsIFwiYXdhcmRlZFwiLCBcInRlc3RpbW9uaWFsc1wiLCBcInRyaWFsc1wiLCBcInRpc3N1ZVwiLCBcIm56XCIsIFwibWVtb3JhYmlsaWFcIiwgXCJjbGludG9uXCIsIFwibWFzdGVyc1wiLCBcImJvbmRzXCIsIFwiY2FydHJpZGdlXCIsIFwiYWxiZXJ0YVwiLCBcImV4cGxhbmF0aW9uXCIsIFwiZm9sa1wiLCBcIm9yZ1wiLCBcImNvbW1vbnNcIiwgXCJjaW5jaW5uYXRpXCIsIFwic3Vic2VjdGlvblwiLCBcImZyYXVkXCIsIFwiZWxlY3RyaWNpdHlcIiwgXCJwZXJtaXR0ZWRcIiwgXCJzcGVjdHJ1bVwiLCBcImFycml2YWxcIiwgXCJva2F5XCIsIFwicG90dGVyeVwiLCBcImVtcGhhc2lzXCIsIFwicm9nZXJcIiwgXCJhc3BlY3RcIiwgXCJ3b3JrcGxhY2VcIiwgXCJhd2Vzb21lXCIsIFwibWV4aWNhblwiLCBcImNvbmZpcm1lZFwiLCBcImNvdW50c1wiLCBcInByaWNlZFwiLCBcIndhbGxwYXBlcnNcIiwgXCJoaXN0XCIsIFwiY3Jhc2hcIiwgXCJsaWZ0XCIsIFwiZGVzaXJlZFwiLCBcImludGVyXCIsIFwiY2xvc2VyXCIsIFwiYXNzdW1lc1wiLCBcImhlaWdodHNcIiwgXCJzaGFkb3dcIiwgXCJyaWRpbmdcIiwgXCJpbmZlY3Rpb25cIiwgXCJmaXJlZm94XCIsIFwibGlzYVwiLCBcImV4cGVuc2VcIiwgXCJncm92ZVwiLCBcImVsaWdpYmlsaXR5XCIsIFwidmVudHVyZVwiLCBcImNsaW5pY1wiLCBcImtvcmVhblwiLCBcImhlYWxpbmdcIiwgXCJwcmluY2Vzc1wiLCBcIm1hbGxcIiwgXCJlbnRlcmluZ1wiLCBcInBhY2tldFwiLCBcInNwcmF5XCIsIFwic3R1ZGlvc1wiLCBcImludm9sdmVtZW50XCIsIFwiZGFkXCIsIFwiYnV0dG9uc1wiLCBcInBsYWNlbWVudFwiLCBcIm9ic2VydmF0aW9uc1wiLCBcInZidWxsZXRpblwiLCBcImZ1bmRlZFwiLCBcInRob21wc29uXCIsIFwid2lubmVyc1wiLCBcImV4dGVuZFwiLCBcInJvYWRzXCIsIFwic3Vic2VxdWVudFwiLCBcInBhdFwiLCBcImR1YmxpblwiLCBcInJvbGxpbmdcIiwgXCJmZWxsXCIsIFwibW90b3JjeWNsZVwiLCBcInlhcmRcIiwgXCJkaXNjbG9zdXJlXCIsIFwiZXN0YWJsaXNobWVudFwiLCBcIm1lbW9yaWVzXCIsIFwibmVsc29uXCIsIFwidGVcIiwgXCJhcnJpdmVkXCIsIFwiY3JlYXRlc1wiLCBcImZhY2VzXCIsIFwidG91cmlzdFwiLCBcImNvY2tzXCIsIFwiYXZcIiwgXCJtYXlvclwiLCBcIm11cmRlclwiLCBcInNlYW5cIiwgXCJhZGVxdWF0ZVwiLCBcInNlbmF0b3JcIiwgXCJ5aWVsZFwiLCBcInByZXNlbnRhdGlvbnNcIiwgXCJncmFkZXNcIiwgXCJjYXJ0b29uc1wiLCBcInBvdXJcIiwgXCJkaWdlc3RcIiwgXCJyZWdcIiwgXCJsb2RnaW5nXCIsIFwidGlvblwiLCBcImR1c3RcIiwgXCJoZW5jZVwiLCBcIndpa2lcIiwgXCJlbnRpcmVseVwiLCBcInJlcGxhY2VkXCIsIFwicmFkYXJcIiwgXCJyZXNjdWVcIiwgXCJ1bmRlcmdyYWR1YXRlXCIsIFwibG9zc2VzXCIsIFwiY29tYmF0XCIsIFwicmVkdWNpbmdcIiwgXCJzdG9wcGVkXCIsIFwib2NjdXBhdGlvblwiLCBcImxha2VzXCIsIFwiYnV0dFwiLCBcImRvbmF0aW9uc1wiLCBcImFzc29jaWF0aW9uc1wiLCBcImNpdHlzZWFyY2hcIiwgXCJjbG9zZWx5XCIsIFwicmFkaWF0aW9uXCIsIFwiZGlhcnlcIiwgXCJzZXJpb3VzbHlcIiwgXCJraW5nc1wiLCBcInNob290aW5nXCIsIFwia2VudFwiLCBcImFkZHNcIiwgXCJuc3dcIiwgXCJlYXJcIiwgXCJmbGFnc1wiLCBcInBjaVwiLCBcImJha2VyXCIsIFwibGF1bmNoZWRcIiwgXCJlbHNld2hlcmVcIiwgXCJwb2xsdXRpb25cIiwgXCJjb25zZXJ2YXRpdmVcIiwgXCJndWVzdGJvb2tcIiwgXCJzaG9ja1wiLCBcImVmZmVjdGl2ZW5lc3NcIiwgXCJ3YWxsc1wiLCBcImFicm9hZFwiLCBcImVib255XCIsIFwidGllXCIsIFwid2FyZFwiLCBcImRyYXduXCIsIFwiYXJ0aHVyXCIsIFwiaWFuXCIsIFwidmlzaXRlZFwiLCBcInJvb2ZcIiwgXCJ3YWxrZXJcIiwgXCJkZW1vbnN0cmF0ZVwiLCBcImF0bW9zcGhlcmVcIiwgXCJzdWdnZXN0c1wiLCBcImtpc3NcIiwgXCJiZWFzdFwiLCBcInJhXCIsIFwib3BlcmF0ZWRcIiwgXCJleHBlcmltZW50XCIsIFwidGFyZ2V0c1wiLCBcIm92ZXJzZWFzXCIsIFwicHVyY2hhc2VzXCIsIFwiZG9kZ2VcIiwgXCJjb3Vuc2VsXCIsIFwiZmVkZXJhdGlvblwiLCBcInBpenphXCIsIFwiaW52aXRlZFwiLCBcInlhcmRzXCIsIFwiYXNzaWdubWVudFwiLCBcImNoZW1pY2Fsc1wiLCBcImdvcmRvblwiLCBcIm1vZFwiLCBcImZhcm1lcnNcIiwgXCJyY1wiLCBcInF1ZXJpZXNcIiwgXCJibXdcIiwgXCJydXNoXCIsIFwidWtyYWluZVwiLCBcImFic2VuY2VcIiwgXCJuZWFyZXN0XCIsIFwiY2x1c3RlclwiLCBcInZlbmRvcnNcIiwgXCJtcGVnXCIsIFwid2hlcmVhc1wiLCBcInlvZ2FcIiwgXCJzZXJ2ZXNcIiwgXCJ3b29kc1wiLCBcInN1cnByaXNlXCIsIFwibGFtcFwiLCBcInJpY29cIiwgXCJwYXJ0aWFsXCIsIFwic2hvcHBlcnNcIiwgXCJwaGlsXCIsIFwiZXZlcnlib2R5XCIsIFwiY291cGxlc1wiLCBcIm5hc2h2aWxsZVwiLCBcInJhbmtpbmdcIiwgXCJqb2tlc1wiLCBcImNzdFwiLCBcImh0dHBcIiwgXCJjZW9cIiwgXCJzaW1wc29uXCIsIFwidHdpa2lcIiwgXCJzdWJsaW1lXCIsIFwiY291bnNlbGluZ1wiLCBcInBhbGFjZVwiLCBcImFjY2VwdGFibGVcIiwgXCJzYXRpc2ZpZWRcIiwgXCJnbGFkXCIsIFwid2luc1wiLCBcIm1lYXN1cmVtZW50c1wiLCBcInZlcmlmeVwiLCBcImdsb2JlXCIsIFwidHJ1c3RlZFwiLCBcImNvcHBlclwiLCBcIm1pbHdhdWtlZVwiLCBcInJhY2tcIiwgXCJtZWRpY2F0aW9uXCIsIFwid2FyZWhvdXNlXCIsIFwic2hhcmV3YXJlXCIsIFwiZWNcIiwgXCJyZXBcIiwgXCJkaWNrZVwiLCBcImtlcnJ5XCIsIFwicmVjZWlwdFwiLCBcInN1cHBvc2VkXCIsIFwib3JkaW5hcnlcIiwgXCJub2JvZHlcIiwgXCJnaG9zdFwiLCBcInZpb2xhdGlvblwiLCBcImNvbmZpZ3VyZVwiLCBcInN0YWJpbGl0eVwiLCBcIm1pdFwiLCBcImFwcGx5aW5nXCIsIFwic291dGh3ZXN0XCIsIFwiYm9zc1wiLCBcInByaWRlXCIsIFwiaW5zdGl0dXRpb25hbFwiLCBcImV4cGVjdGF0aW9uc1wiLCBcImluZGVwZW5kZW5jZVwiLCBcImtub3dpbmdcIiwgXCJyZXBvcnRlclwiLCBcIm1ldGFib2xpc21cIiwgXCJrZWl0aFwiLCBcImNoYW1waW9uXCIsIFwiY2xvdWR5XCIsIFwibGluZGFcIiwgXCJyb3NzXCIsIFwicGVyc29uYWxseVwiLCBcImNoaWxlXCIsIFwiYW5uYVwiLCBcInBsZW50eVwiLCBcInNvbG9cIiwgXCJzZW50ZW5jZVwiLCBcInRocm9hdFwiLCBcImlnbm9yZVwiLCBcIm1hcmlhXCIsIFwidW5pZm9ybVwiLCBcImV4Y2VsbGVuY2VcIiwgXCJ3ZWFsdGhcIiwgXCJ0YWxsXCIsIFwicm1cIiwgXCJzb21ld2hlcmVcIiwgXCJ2YWN1dW1cIiwgXCJkYW5jaW5nXCIsIFwiYXR0cmlidXRlc1wiLCBcInJlY29nbml6ZVwiLCBcImJyYXNzXCIsIFwid3JpdGVzXCIsIFwicGxhemFcIiwgXCJwZGFzXCIsIFwib3V0Y29tZXNcIiwgXCJzdXJ2aXZhbFwiLCBcInF1ZXN0XCIsIFwicHVibGlzaFwiLCBcInNyaVwiLCBcInNjcmVlbmluZ1wiLCBcInRvZVwiLCBcInRodW1ibmFpbFwiLCBcInRyYW5zXCIsIFwiam9uYXRoYW5cIiwgXCJ3aGVuZXZlclwiLCBcIm5vdmFcIiwgXCJsaWZldGltZVwiLCBcImFwaVwiLCBcInBpb25lZXJcIiwgXCJib290eVwiLCBcImZvcmdvdHRlblwiLCBcImFjcm9iYXRcIiwgXCJwbGF0ZXNcIiwgXCJhY3Jlc1wiLCBcInZlbnVlXCIsIFwiYXRobGV0aWNcIiwgXCJ0aGVybWFsXCIsIFwiZXNzYXlzXCIsIFwiYmVoYXZpb3VyXCIsIFwidml0YWxcIiwgXCJ0ZWxsaW5nXCIsIFwiZmFpcmx5XCIsIFwiY29hc3RhbFwiLCBcImNvbmZpZ1wiLCBcImNmXCIsIFwiY2hhcml0eVwiLCBcImludGVsbGlnZW50XCIsIFwiZWRpbmJ1cmdoXCIsIFwidnRcIiwgXCJleGNlbFwiLCBcIm1vZGVzXCIsIFwib2JsaWdhdGlvblwiLCBcImNhbXBiZWxsXCIsIFwid2FrZVwiLCBcInN0dXBpZFwiLCBcImhhcmJvclwiLCBcImh1bmdhcnlcIiwgXCJ0cmF2ZWxlclwiLCBcInVyd1wiLCBcInNlZ21lbnRcIiwgXCJyZWFsaXplXCIsIFwicmVnYXJkbGVzc1wiLCBcImxhblwiLCBcImVuZW15XCIsIFwicHV6emxlXCIsIFwicmlzaW5nXCIsIFwiYWx1bWludW1cIiwgXCJ3ZWxsc1wiLCBcIndpc2hsaXN0XCIsIFwib3BlbnNcIiwgXCJpbnNpZ2h0XCIsIFwic21zXCIsIFwic2hpdFwiLCBcInJlc3RyaWN0ZWRcIiwgXCJyZXB1YmxpY2FuXCIsIFwic2VjcmV0c1wiLCBcImx1Y2t5XCIsIFwibGF0dGVyXCIsIFwibWVyY2hhbnRzXCIsIFwidGhpY2tcIiwgXCJ0cmFpbGVyc1wiLCBcInJlcGVhdFwiLCBcInN5bmRyb21lXCIsIFwicGhpbGlwc1wiLCBcImF0dGVuZGFuY2VcIiwgXCJwZW5hbHR5XCIsIFwiZHJ1bVwiLCBcImdsYXNzZXNcIiwgXCJlbmFibGVzXCIsIFwibmVjXCIsIFwiaXJhcWlcIiwgXCJidWlsZGVyXCIsIFwidmlzdGFcIiwgXCJqZXNzaWNhXCIsIFwiY2hpcHNcIiwgXCJ0ZXJyeVwiLCBcImZsb29kXCIsIFwiZm90b1wiLCBcImVhc2VcIiwgXCJhcmd1bWVudHNcIiwgXCJhbXN0ZXJkYW1cIiwgXCJvcmd5XCIsIFwiYXJlbmFcIiwgXCJhZHZlbnR1cmVzXCIsIFwicHVwaWxzXCIsIFwic3Rld2FydFwiLCBcImFubm91bmNlbWVudFwiLCBcInRhYnNcIiwgXCJvdXRjb21lXCIsIFwieHhcIiwgXCJhcHByZWNpYXRlXCIsIFwiZXhwYW5kZWRcIiwgXCJjYXN1YWxcIiwgXCJncm93blwiLCBcInBvbGlzaFwiLCBcImxvdmVseVwiLCBcImV4dHJhc1wiLCBcImdtXCIsIFwiY2VudHJlc1wiLCBcImplcnJ5XCIsIFwiY2xhdXNlXCIsIFwic21pbGVcIiwgXCJsYW5kc1wiLCBcInJpXCIsIFwidHJvb3BzXCIsIFwiaW5kb29yXCIsIFwiYnVsZ2FyaWFcIiwgXCJhcm1lZFwiLCBcImJyb2tlclwiLCBcImNoYXJnZXJcIiwgXCJyZWd1bGFybHlcIiwgXCJiZWxpZXZlZFwiLCBcInBpbmVcIiwgXCJjb29saW5nXCIsIFwidGVuZFwiLCBcImd1bGZcIiwgXCJydFwiLCBcInJpY2tcIiwgXCJ0cnVja3NcIiwgXCJjcFwiLCBcIm1lY2hhbmlzbXNcIiwgXCJkaXZvcmNlXCIsIFwibGF1cmFcIiwgXCJzaG9wcGVyXCIsIFwidG9reW9cIiwgXCJwYXJ0bHlcIiwgXCJuaWtvblwiLCBcImN1c3RvbWl6ZVwiLCBcInRyYWRpdGlvblwiLCBcImNhbmR5XCIsIFwicGlsbHNcIiwgXCJ0aWdlclwiLCBcImRvbmFsZFwiLCBcImZvbGtzXCIsIFwic2Vuc29yXCIsIFwiZXhwb3NlZFwiLCBcInRlbGVjb21cIiwgXCJodW50XCIsIFwiYW5nZWxzXCIsIFwiZGVwdXR5XCIsIFwiaW5kaWNhdG9yc1wiLCBcInNlYWxlZFwiLCBcInRoYWlcIiwgXCJlbWlzc2lvbnNcIiwgXCJwaHlzaWNpYW5zXCIsIFwibG9hZGVkXCIsIFwiZnJlZFwiLCBcImNvbXBsYWludFwiLCBcInNjZW5lc1wiLCBcImV4cGVyaW1lbnRzXCIsIFwiYmFsbHNcIiwgXCJhZmdoYW5pc3RhblwiLCBcImRkXCIsIFwiYm9vc3RcIiwgXCJzcGFua2luZ1wiLCBcInNjaG9sYXJzaGlwXCIsIFwiZ292ZXJuYW5jZVwiLCBcIm1pbGxcIiwgXCJmb3VuZGVkXCIsIFwic3VwcGxlbWVudHNcIiwgXCJjaHJvbmljXCIsIFwiaWNvbnNcIiwgXCJ0cmFubnlcIiwgXCJtb3JhbFwiLCBcImRlblwiLCBcImNhdGVyaW5nXCIsIFwiYXVkXCIsIFwiZmluZ2VyXCIsIFwia2VlcHNcIiwgXCJwb3VuZFwiLCBcImxvY2F0ZVwiLCBcImNhbWNvcmRlclwiLCBcInBsXCIsIFwidHJhaW5lZFwiLCBcImJ1cm5cIiwgXCJpbXBsZW1lbnRpbmdcIiwgXCJyb3Nlc1wiLCBcImxhYnNcIiwgXCJvdXJzZWx2ZXNcIiwgXCJicmVhZFwiLCBcInRvYmFjY29cIiwgXCJ3b29kZW5cIiwgXCJtb3RvcnNcIiwgXCJ0b3VnaFwiLCBcInJvYmVydHNcIiwgXCJpbmNpZGVudFwiLCBcImdvbm5hXCIsIFwiZHluYW1pY3NcIiwgXCJsaWVcIiwgXCJjcm1cIiwgXCJyZlwiLCBcImNvbnZlcnNhdGlvblwiLCBcImRlY3JlYXNlXCIsIFwiY3Vtc2hvdHNcIiwgXCJjaGVzdFwiLCBcInBlbnNpb25cIiwgXCJiaWxseVwiLCBcInJldmVudWVzXCIsIFwiZW1lcmdpbmdcIiwgXCJ3b3JzaGlwXCIsIFwiYnVra2FrZVwiLCBcImNhcGFiaWxpdHlcIiwgXCJha1wiLCBcImZlXCIsIFwiY3JhaWdcIiwgXCJoZXJzZWxmXCIsIFwicHJvZHVjaW5nXCIsIFwiY2h1cmNoZXNcIiwgXCJwcmVjaXNpb25cIiwgXCJkYW1hZ2VzXCIsIFwicmVzZXJ2ZXNcIiwgXCJjb250cmlidXRlZFwiLCBcInNvbHZlXCIsIFwic2hvcnRzXCIsIFwicmVwcm9kdWN0aW9uXCIsIFwibWlub3JpdHlcIiwgXCJ0ZFwiLCBcImRpdmVyc2VcIiwgXCJhbXBcIiwgXCJpbmdyZWRpZW50c1wiLCBcInNiXCIsIFwiYWhcIiwgXCJqb2hubnlcIiwgXCJzb2xlXCIsIFwiZnJhbmNoaXNlXCIsIFwicmVjb3JkZXJcIiwgXCJjb21wbGFpbnRzXCIsIFwiZmFjaW5nXCIsIFwic21cIiwgXCJuYW5jeVwiLCBcInByb21vdGlvbnNcIiwgXCJ0b25lc1wiLCBcInBhc3Npb25cIiwgXCJyZWhhYmlsaXRhdGlvblwiLCBcIm1haW50YWluaW5nXCIsIFwic2lnaHRcIiwgXCJsYWlkXCIsIFwiY2xheVwiLCBcImRlZmVuY2VcIiwgXCJwYXRjaGVzXCIsIFwid2Vha1wiLCBcInJlZnVuZFwiLCBcInVzY1wiLCBcInRvd25zXCIsIFwiZW52aXJvbm1lbnRzXCIsIFwidHJlbWJsXCIsIFwiZGl2aWRlZFwiLCBcImJsdmRcIiwgXCJyZWNlcHRpb25cIiwgXCJhbWRcIiwgXCJ3aXNlXCIsIFwiZW1haWxzXCIsIFwiY3lwcnVzXCIsIFwid3ZcIiwgXCJvZGRzXCIsIFwiY29ycmVjdGx5XCIsIFwiaW5zaWRlclwiLCBcInNlbWluYXJzXCIsIFwiY29uc2VxdWVuY2VzXCIsIFwibWFrZXJzXCIsIFwiaGVhcnRzXCIsIFwiZ2VvZ3JhcGh5XCIsIFwiYXBwZWFyaW5nXCIsIFwiaW50ZWdyaXR5XCIsIFwid29ycnlcIiwgXCJuc1wiLCBcImRpc2NyaW1pbmF0aW9uXCIsIFwiZXZlXCIsIFwiY2FydGVyXCIsIFwibGVnYWN5XCIsIFwibWFyY1wiLCBcInBsZWFzZWRcIiwgXCJkYW5nZXJcIiwgXCJ2aXRhbWluXCIsIFwid2lkZWx5XCIsIFwicHJvY2Vzc2VkXCIsIFwicGhyYXNlXCIsIFwiZ2VudWluZVwiLCBcInJhaXNpbmdcIiwgXCJpbXBsaWNhdGlvbnNcIiwgXCJmdW5jdGlvbmFsaXR5XCIsIFwicGFyYWRpc2VcIiwgXCJoeWJyaWRcIiwgXCJyZWFkc1wiLCBcInJvbGVzXCIsIFwiaW50ZXJtZWRpYXRlXCIsIFwiZW1vdGlvbmFsXCIsIFwic29uc1wiLCBcImxlYWZcIiwgXCJwYWRcIiwgXCJnbG9yeVwiLCBcInBsYXRmb3Jtc1wiLCBcImphXCIsIFwiYmlnZ2VyXCIsIFwiYmlsbGluZ1wiLCBcImRpZXNlbFwiLCBcInZlcnN1c1wiLCBcImNvbWJpbmVcIiwgXCJvdmVybmlnaHRcIiwgXCJnZW9ncmFwaGljXCIsIFwiZXhjZWVkXCIsIFwiYnNcIiwgXCJyb2RcIiwgXCJzYXVkaVwiLCBcImZhdWx0XCIsIFwiY3ViYVwiLCBcImhyc1wiLCBcInByZWxpbWluYXJ5XCIsIFwiZGlzdHJpY3RzXCIsIFwiaW50cm9kdWNlXCIsIFwic2lsa1wiLCBcInByb21vdGlvbmFsXCIsIFwia2F0ZVwiLCBcImNoZXZyb2xldFwiLCBcImJhYmllc1wiLCBcImJpXCIsIFwia2FyZW5cIiwgXCJjb21waWxlZFwiLCBcInJvbWFudGljXCIsIFwicmV2ZWFsZWRcIiwgXCJzcGVjaWFsaXN0c1wiLCBcImdlbmVyYXRvclwiLCBcImFsYmVydFwiLCBcImV4YW1pbmVcIiwgXCJqaW1teVwiLCBcImdyYWhhbVwiLCBcInN1c3BlbnNpb25cIiwgXCJicmlzdG9sXCIsIFwibWFyZ2FyZXRcIiwgXCJjb21wYXFcIiwgXCJzYWRcIiwgXCJjb3JyZWN0aW9uXCIsIFwid29sZlwiLCBcInNsb3dseVwiLCBcImF1dGhlbnRpY2F0aW9uXCIsIFwiY29tbXVuaWNhdGVcIiwgXCJydWdieVwiLCBcInN1cHBsZW1lbnRcIiwgXCJzaG93dGltZXNcIiwgXCJjYWxcIiwgXCJwb3J0aW9uc1wiLCBcImluZmFudFwiLCBcInByb21vdGluZ1wiLCBcInNlY3RvcnNcIiwgXCJzYW11ZWxcIiwgXCJmbHVpZFwiLCBcImdyb3VuZHNcIiwgXCJmaXRzXCIsIFwia2lja1wiLCBcInJlZ2FyZHNcIiwgXCJtZWFsXCIsIFwidGFcIiwgXCJodXJ0XCIsIFwibWFjaGluZXJ5XCIsIFwiYmFuZHdpZHRoXCIsIFwidW5saWtlXCIsIFwiZXF1YXRpb25cIiwgXCJiYXNrZXRzXCIsIFwicHJvYmFiaWxpdHlcIiwgXCJwb3RcIiwgXCJkaW1lbnNpb25cIiwgXCJ3cmlnaHRcIiwgXCJpbWdcIiwgXCJiYXJyeVwiLCBcInByb3ZlblwiLCBcInNjaGVkdWxlc1wiLCBcImFkbWlzc2lvbnNcIiwgXCJjYWNoZWRcIiwgXCJ3YXJyZW5cIiwgXCJzbGlwXCIsIFwic3R1ZGllZFwiLCBcInJldmlld2VyXCIsIFwiaW52b2x2ZXNcIiwgXCJxdWFydGVybHlcIiwgXCJycG1cIiwgXCJwcm9maXRzXCIsIFwiZGV2aWxcIiwgXCJncmFzc1wiLCBcImNvbXBseVwiLCBcIm1hcmllXCIsIFwiZmxvcmlzdFwiLCBcImlsbHVzdHJhdGVkXCIsIFwiY2hlcnJ5XCIsIFwiY29udGluZW50YWxcIiwgXCJhbHRlcm5hdGVcIiwgXCJkZXV0c2NoXCIsIFwiYWNoaWV2ZW1lbnRcIiwgXCJsaW1pdGF0aW9uc1wiLCBcImtlbnlhXCIsIFwid2ViY2FtXCIsIFwiY3V0c1wiLCBcImZ1bmVyYWxcIiwgXCJudXR0ZW5cIiwgXCJlYXJyaW5nc1wiLCBcImVuam95ZWRcIiwgXCJhdXRvbWF0ZWRcIiwgXCJjaGFwdGVyc1wiLCBcInBlZVwiLCBcImNoYXJsaWVcIiwgXCJxdWViZWNcIiwgXCJuaXBwbGVzXCIsIFwicGFzc2VuZ2VyXCIsIFwiY29udmVuaWVudFwiLCBcImRlbm5pc1wiLCBcIm1hcnNcIiwgXCJmcmFuY2lzXCIsIFwidHZzXCIsIFwic2l6ZWRcIiwgXCJtYW5nYVwiLCBcIm5vdGljZWRcIiwgXCJzb2NrZXRcIiwgXCJzaWxlbnRcIiwgXCJsaXRlcmFyeVwiLCBcImVnZ1wiLCBcIm1oelwiLCBcInNpZ25hbHNcIiwgXCJjYXBzXCIsIFwib3JpZW50YXRpb25cIiwgXCJwaWxsXCIsIFwidGhlZnRcIiwgXCJjaGlsZGhvb2RcIiwgXCJzd2luZ1wiLCBcInN5bWJvbHNcIiwgXCJsYXRcIiwgXCJtZXRhXCIsIFwiaHVtYW5zXCIsIFwiYW5hbG9nXCIsIFwiZmFjaWFsXCIsIFwiY2hvb3NpbmdcIiwgXCJ0YWxlbnRcIiwgXCJkYXRlZFwiLCBcImZsZXhpYmlsaXR5XCIsIFwic2Vla2VyXCIsIFwid2lzZG9tXCIsIFwic2hvb3RcIiwgXCJib3VuZGFyeVwiLCBcIm1pbnRcIiwgXCJwYWNrYXJkXCIsIFwib2Zmc2V0XCIsIFwicGF5ZGF5XCIsIFwicGhpbGlwXCIsIFwiZWxpdGVcIiwgXCJnaVwiLCBcInNwaW5cIiwgXCJob2xkZXJzXCIsIFwiYmVsaWV2ZXNcIiwgXCJzd2VkaXNoXCIsIFwicG9lbXNcIiwgXCJkZWFkbGluZVwiLCBcImp1cmlzZGljdGlvblwiLCBcInJvYm90XCIsIFwiZGlzcGxheWluZ1wiLCBcIndpdG5lc3NcIiwgXCJjb2xsaW5zXCIsIFwiZXF1aXBwZWRcIiwgXCJzdGFnZXNcIiwgXCJlbmNvdXJhZ2VkXCIsIFwic3VyXCIsIFwid2luZHNcIiwgXCJwb3dkZXJcIiwgXCJicm9hZHdheVwiLCBcImFjcXVpcmVkXCIsIFwiYXNzZXNzXCIsIFwid2FzaFwiLCBcImNhcnRyaWRnZXNcIiwgXCJzdG9uZXNcIiwgXCJlbnRyYW5jZVwiLCBcImdub21lXCIsIFwicm9vdHNcIiwgXCJkZWNsYXJhdGlvblwiLCBcImxvc2luZ1wiLCBcImF0dGVtcHRzXCIsIFwiZ2FkZ2V0c1wiLCBcIm5vYmxlXCIsIFwiZ2xhc2dvd1wiLCBcImF1dG9tYXRpb25cIiwgXCJpbXBhY3RzXCIsIFwicmV2XCIsIFwiZ29zcGVsXCIsIFwiYWR2YW50YWdlc1wiLCBcInNob3JlXCIsIFwibG92ZXNcIiwgXCJpbmR1Y2VkXCIsIFwibGxcIiwgXCJrbmlnaHRcIiwgXCJwcmVwYXJpbmdcIiwgXCJsb29zZVwiLCBcImFpbXNcIiwgXCJyZWNpcGllbnRcIiwgXCJsaW5raW5nXCIsIFwiZXh0ZW5zaW9uc1wiLCBcImFwcGVhbHNcIiwgXCJjbFwiLCBcImVhcm5lZFwiLCBcImlsbG5lc3NcIiwgXCJpc2xhbWljXCIsIFwiYXRobGV0aWNzXCIsIFwic291dGhlYXN0XCIsIFwiaWVlZVwiLCBcImhvXCIsIFwiYWx0ZXJuYXRpdmVzXCIsIFwicGVuZGluZ1wiLCBcInBhcmtlclwiLCBcImRldGVybWluaW5nXCIsIFwibGViYW5vblwiLCBcImNvcnBcIiwgXCJwZXJzb25hbGl6ZWRcIiwgXCJrZW5uZWR5XCIsIFwiZ3RcIiwgXCJzaFwiLCBcImNvbmRpdGlvbmluZ1wiLCBcInRlZW5hZ2VcIiwgXCJzb2FwXCIsIFwiYWVcIiwgXCJ0cmlwbGVcIiwgXCJjb29wZXJcIiwgXCJueWNcIiwgXCJ2aW5jZW50XCIsIFwiamFtXCIsIFwic2VjdXJlZFwiLCBcInVudXN1YWxcIiwgXCJhbnN3ZXJlZFwiLCBcInBhcnRuZXJzaGlwc1wiLCBcImRlc3RydWN0aW9uXCIsIFwic2xvdHNcIiwgXCJpbmNyZWFzaW5nbHlcIiwgXCJtaWdyYXRpb25cIiwgXCJkaXNvcmRlclwiLCBcInJvdXRpbmVcIiwgXCJ0b29sYmFyXCIsIFwiYmFzaWNhbGx5XCIsIFwicm9ja3NcIiwgXCJjb252ZW50aW9uYWxcIiwgXCJ0aXRhbnNcIiwgXCJhcHBsaWNhbnRzXCIsIFwid2VhcmluZ1wiLCBcImF4aXNcIiwgXCJzb3VnaHRcIiwgXCJnZW5lc1wiLCBcIm1vdW50ZWRcIiwgXCJoYWJpdGF0XCIsIFwiZmlyZXdhbGxcIiwgXCJtZWRpYW5cIiwgXCJndW5zXCIsIFwic2Nhbm5lclwiLCBcImhlcmVpblwiLCBcIm9jY3VwYXRpb25hbFwiLCBcImFuaW1hdGVkXCIsIFwiaG9ybnlcIiwgXCJqdWRpY2lhbFwiLCBcInJpb1wiLCBcImhzXCIsIFwiYWRqdXN0bWVudFwiLCBcImhlcm9cIiwgXCJpbnRlZ2VyXCIsIFwidHJlYXRtZW50c1wiLCBcImJhY2hlbG9yXCIsIFwiYXR0aXR1ZGVcIiwgXCJjYW1jb3JkZXJzXCIsIFwiZW5nYWdlZFwiLCBcImZhbGxpbmdcIiwgXCJiYXNpY3NcIiwgXCJtb250cmVhbFwiLCBcImNhcnBldFwiLCBcInJ2XCIsIFwic3RydWN0XCIsIFwibGVuc2VzXCIsIFwiYmluYXJ5XCIsIFwiZ2VuZXRpY3NcIiwgXCJhdHRlbmRlZFwiLCBcImRpZmZpY3VsdHlcIiwgXCJwdW5rXCIsIFwiY29sbGVjdGl2ZVwiLCBcImNvYWxpdGlvblwiLCBcInBpXCIsIFwiZHJvcHBlZFwiLCBcImVucm9sbG1lbnRcIiwgXCJkdWtlXCIsIFwid2FsdGVyXCIsIFwiYWlcIiwgXCJwYWNlXCIsIFwiYmVzaWRlc1wiLCBcIndhZ2VcIiwgXCJwcm9kdWNlcnNcIiwgXCJvdFwiLCBcImNvbGxlY3RvclwiLCBcImFyY1wiLCBcImhvc3RzXCIsIFwiaW50ZXJmYWNlc1wiLCBcImFkdmVydGlzZXJzXCIsIFwibW9tZW50c1wiLCBcImF0bGFzXCIsIFwic3RyaW5nc1wiLCBcImRhd25cIiwgXCJyZXByZXNlbnRpbmdcIiwgXCJvYnNlcnZhdGlvblwiLCBcImZlZWxzXCIsIFwidG9ydHVyZVwiLCBcImNhcmxcIiwgXCJkZWxldGVkXCIsIFwiY29hdFwiLCBcIm1pdGNoZWxsXCIsIFwibXJzXCIsIFwicmljYVwiLCBcInJlc3RvcmF0aW9uXCIsIFwiY29udmVuaWVuY2VcIiwgXCJyZXR1cm5pbmdcIiwgXCJyYWxwaFwiLCBcIm9wcG9zaXRpb25cIiwgXCJjb250YWluZXJcIiwgXCJ5clwiLCBcImRlZmVuZGFudFwiLCBcIndhcm5lclwiLCBcImNvbmZpcm1hdGlvblwiLCBcImFwcFwiLCBcImVtYmVkZGVkXCIsIFwiaW5ramV0XCIsIFwic3VwZXJ2aXNvclwiLCBcIndpemFyZFwiLCBcImNvcnBzXCIsIFwiYWN0b3JzXCIsIFwibGl2ZXJcIiwgXCJwZXJpcGhlcmFsc1wiLCBcImxpYWJsZVwiLCBcImJyb2NodXJlXCIsIFwibW9ycmlzXCIsIFwiYmVzdHNlbGxlcnNcIiwgXCJwZXRpdGlvblwiLCBcImVtaW5lbVwiLCBcInJlY2FsbFwiLCBcImFudGVubmFcIiwgXCJwaWNrZWRcIiwgXCJhc3N1bWVkXCIsIFwiZGVwYXJ0dXJlXCIsIFwibWlubmVhcG9saXNcIiwgXCJiZWxpZWZcIiwgXCJraWxsaW5nXCIsIFwiYmlraW5pXCIsIFwibWVtcGhpc1wiLCBcInNob3VsZGVyXCIsIFwiZGVjb3JcIiwgXCJsb29rdXBcIiwgXCJ0ZXh0c1wiLCBcImhhcnZhcmRcIiwgXCJicm9rZXJzXCIsIFwicm95XCIsIFwiaW9uXCIsIFwiZGlhbWV0ZXJcIiwgXCJvdHRhd2FcIiwgXCJkb2xsXCIsIFwiaWNcIiwgXCJwb2RjYXN0XCIsIFwidGl0XCIsIFwic2Vhc29uc1wiLCBcInBlcnVcIiwgXCJpbnRlcmFjdGlvbnNcIiwgXCJyZWZpbmVcIiwgXCJiaWRkZXJcIiwgXCJzaW5nZXJcIiwgXCJldmFuc1wiLCBcImhlcmFsZFwiLCBcImxpdGVyYWN5XCIsIFwiZmFpbHNcIiwgXCJhZ2luZ1wiLCBcIm5pa2VcIiwgXCJpbnRlcnZlbnRpb25cIiwgXCJwaXNzaW5nXCIsIFwiZmVkXCIsIFwicGx1Z2luXCIsIFwiYXR0cmFjdGlvblwiLCBcImRpdmluZ1wiLCBcImludml0ZVwiLCBcIm1vZGlmaWNhdGlvblwiLCBcImFsaWNlXCIsIFwibGF0aW5hc1wiLCBcInN1cHBvc2VcIiwgXCJjdXN0b21pemVkXCIsIFwicmVlZFwiLCBcImludm9sdmVcIiwgXCJtb2RlcmF0ZVwiLCBcInRlcnJvclwiLCBcInlvdW5nZXJcIiwgXCJ0aGlydHlcIiwgXCJtaWNlXCIsIFwib3Bwb3NpdGVcIiwgXCJ1bmRlcnN0b29kXCIsIFwicmFwaWRseVwiLCBcImRlYWx0aW1lXCIsIFwiYmFuXCIsIFwidGVtcFwiLCBcImludHJvXCIsIFwibWVyY2VkZXNcIiwgXCJ6dXNcIiwgXCJhc3N1cmFuY2VcIiwgXCJmaXN0aW5nXCIsIFwiY2xlcmtcIiwgXCJoYXBwZW5pbmdcIiwgXCJ2YXN0XCIsIFwibWlsbHNcIiwgXCJvdXRsaW5lXCIsIFwiYW1lbmRtZW50c1wiLCBcInRyYW1hZG9sXCIsIFwiaG9sbGFuZFwiLCBcInJlY2VpdmVzXCIsIFwiamVhbnNcIiwgXCJtZXRyb3BvbGl0YW5cIiwgXCJjb21waWxhdGlvblwiLCBcInZlcmlmaWNhdGlvblwiLCBcImZvbnRzXCIsIFwiZW50XCIsIFwib2RkXCIsIFwid3JhcFwiLCBcInJlZmVyc1wiLCBcIm1vb2RcIiwgXCJmYXZvclwiLCBcInZldGVyYW5zXCIsIFwicXVpelwiLCBcIm14XCIsIFwic2lnbWFcIiwgXCJnclwiLCBcImF0dHJhY3RpdmVcIiwgXCJ4aHRtbFwiLCBcIm9jY2FzaW9uXCIsIFwicmVjb3JkaW5nc1wiLCBcImplZmZlcnNvblwiLCBcInZpY3RpbVwiLCBcImRlbWFuZHNcIiwgXCJzbGVlcGluZ1wiLCBcImNhcmVmdWxcIiwgXCJleHRcIiwgXCJiZWFtXCIsIFwiZ2FyZGVuaW5nXCIsIFwib2JsaWdhdGlvbnNcIiwgXCJhcnJpdmVcIiwgXCJvcmNoZXN0cmFcIiwgXCJzdW5zZXRcIiwgXCJ0cmFja2VkXCIsIFwibW9yZW92ZXJcIiwgXCJtaW5pbWFsXCIsIFwicG9seXBob25pY1wiLCBcImxvdHRlcnlcIiwgXCJ0b3BzXCIsIFwiZnJhbWVkXCIsIFwiYXNpZGVcIiwgXCJvdXRzb3VyY2luZ1wiLCBcImxpY2VuY2VcIiwgXCJhZGp1c3RhYmxlXCIsIFwiYWxsb2NhdGlvblwiLCBcIm1pY2hlbGxlXCIsIFwiZXNzYXlcIiwgXCJkaXNjaXBsaW5lXCIsIFwiYW15XCIsIFwidHNcIiwgXCJkZW1vbnN0cmF0ZWRcIiwgXCJkaWFsb2d1ZVwiLCBcImlkZW50aWZ5aW5nXCIsIFwiYWxwaGFiZXRpY2FsXCIsIFwiY2FtcHNcIiwgXCJkZWNsYXJlZFwiLCBcImRpc3BhdGNoZWRcIiwgXCJhYXJvblwiLCBcImhhbmRoZWxkXCIsIFwidHJhY2VcIiwgXCJkaXNwb3NhbFwiLCBcInNodXRcIiwgXCJmbG9yaXN0c1wiLCBcInBhY2tzXCIsIFwiZ2VcIiwgXCJpbnN0YWxsaW5nXCIsIFwic3dpdGNoZXNcIiwgXCJyb21hbmlhXCIsIFwidm9sdW50YXJ5XCIsIFwibmNhYVwiLCBcInRob3VcIiwgXCJjb25zdWx0XCIsIFwicGhkXCIsIFwiZ3JlYXRseVwiLCBcImJsb2dnaW5nXCIsIFwibWFza1wiLCBcImN5Y2xpbmdcIiwgXCJtaWRuaWdodFwiLCBcIm5nXCIsIFwiY29tbW9ubHlcIiwgXCJwZVwiLCBcInBob3RvZ3JhcGhlclwiLCBcImluZm9ybVwiLCBcInR1cmtpc2hcIiwgXCJjb2FsXCIsIFwiY3J5XCIsIFwibWVzc2FnaW5nXCIsIFwicGVudGl1bVwiLCBcInF1YW50dW1cIiwgXCJtdXJyYXlcIiwgXCJpbnRlbnRcIiwgXCJ0dFwiLCBcInpvb1wiLCBcImxhcmdlbHlcIiwgXCJwbGVhc2FudFwiLCBcImFubm91bmNlXCIsIFwiY29uc3RydWN0ZWRcIiwgXCJhZGRpdGlvbnNcIiwgXCJyZXF1aXJpbmdcIiwgXCJzcG9rZVwiLCBcImFrYVwiLCBcImFycm93XCIsIFwiZW5nYWdlbWVudFwiLCBcInNhbXBsaW5nXCIsIFwicm91Z2hcIiwgXCJ3ZWlyZFwiLCBcInRlZVwiLCBcInJlZmluYW5jZVwiLCBcImxpb25cIiwgXCJpbnNwaXJlZFwiLCBcImhvbGVzXCIsIFwid2VkZGluZ3NcIiwgXCJibGFkZVwiLCBcInN1ZGRlbmx5XCIsIFwib3h5Z2VuXCIsIFwiY29va2llXCIsIFwibWVhbHNcIiwgXCJjYW55b25cIiwgXCJnb3RvXCIsIFwibWV0ZXJzXCIsIFwibWVyZWx5XCIsIFwiY2FsZW5kYXJzXCIsIFwiYXJyYW5nZW1lbnRcIiwgXCJjb25jbHVzaW9uc1wiLCBcInBhc3Nlc1wiLCBcImJpYmxpb2dyYXBoeVwiLCBcInBvaW50ZXJcIiwgXCJjb21wYXRpYmlsaXR5XCIsIFwic3RyZXRjaFwiLCBcImR1cmhhbVwiLCBcImZ1cnRoZXJtb3JlXCIsIFwicGVybWl0c1wiLCBcImNvb3BlcmF0aXZlXCIsIFwibXVzbGltXCIsIFwieGxcIiwgXCJuZWlsXCIsIFwic2xlZXZlXCIsIFwibmV0c2NhcGVcIiwgXCJjbGVhbmVyXCIsIFwiY3JpY2tldFwiLCBcImJlZWZcIiwgXCJmZWVkaW5nXCIsIFwic3Ryb2tlXCIsIFwidG93bnNoaXBcIiwgXCJyYW5raW5nc1wiLCBcIm1lYXN1cmluZ1wiLCBcImNhZFwiLCBcImhhdHNcIiwgXCJyb2JpblwiLCBcInJvYmluc29uXCIsIFwiamFja3NvbnZpbGxlXCIsIFwic3RyYXBcIiwgXCJoZWFkcXVhcnRlcnNcIiwgXCJzaGFyb25cIiwgXCJjcm93ZFwiLCBcInRjcFwiLCBcInRyYW5zZmVyc1wiLCBcInN1cmZcIiwgXCJvbHltcGljXCIsIFwidHJhbnNmb3JtYXRpb25cIiwgXCJyZW1haW5lZFwiLCBcImF0dGFjaG1lbnRzXCIsIFwiZHZcIiwgXCJkaXJcIiwgXCJlbnRpdGllc1wiLCBcImN1c3RvbXNcIiwgXCJhZG1pbmlzdHJhdG9yc1wiLCBcInBlcnNvbmFsaXR5XCIsIFwicmFpbmJvd1wiLCBcImhvb2tcIiwgXCJyb3VsZXR0ZVwiLCBcImRlY2xpbmVcIiwgXCJnbG92ZXNcIiwgXCJpc3JhZWxpXCIsIFwibWVkaWNhcmVcIiwgXCJjb3JkXCIsIFwic2tpaW5nXCIsIFwiY2xvdWRcIiwgXCJmYWNpbGl0YXRlXCIsIFwic3Vic2NyaWJlclwiLCBcInZhbHZlXCIsIFwidmFsXCIsIFwiaGV3bGV0dFwiLCBcImV4cGxhaW5zXCIsIFwicHJvY2VlZFwiLCBcImZsaWNrclwiLCBcImZlZWxpbmdzXCIsIFwia25pZmVcIiwgXCJqYW1haWNhXCIsIFwicHJpb3JpdGllc1wiLCBcInNoZWxmXCIsIFwiYm9va3N0b3JlXCIsIFwidGltaW5nXCIsIFwibGlrZWRcIiwgXCJwYXJlbnRpbmdcIiwgXCJhZG9wdFwiLCBcImRlbmllZFwiLCBcImZvdG9zXCIsIFwiaW5jcmVkaWJsZVwiLCBcImJyaXRuZXlcIiwgXCJmcmVld2FyZVwiLCBcImZ1Y2tlZFwiLCBcImRvbmF0aW9uXCIsIFwib3V0ZXJcIiwgXCJjcm9wXCIsIFwiZGVhdGhzXCIsIFwicml2ZXJzXCIsIFwiY29tbW9ud2VhbHRoXCIsIFwicGhhcm1hY2V1dGljYWxcIiwgXCJtYW5oYXR0YW5cIiwgXCJ0YWxlc1wiLCBcImthdHJpbmFcIiwgXCJ3b3JrZm9yY2VcIiwgXCJpc2xhbVwiLCBcIm5vZGVzXCIsIFwidHVcIiwgXCJmeVwiLCBcInRodW1ic1wiLCBcInNlZWRzXCIsIFwiY2l0ZWRcIiwgXCJsaXRlXCIsIFwiZ2h6XCIsIFwiaHViXCIsIFwidGFyZ2V0ZWRcIiwgXCJvcmdhbml6YXRpb25hbFwiLCBcInNreXBlXCIsIFwicmVhbGl6ZWRcIiwgXCJ0d2VsdmVcIiwgXCJmb3VuZGVyXCIsIFwiZGVjYWRlXCIsIFwiZ2FtZWN1YmVcIiwgXCJyclwiLCBcImRpc3B1dGVcIiwgXCJwb3J0dWd1ZXNlXCIsIFwidGlyZWRcIiwgXCJ0aXR0ZW5cIiwgXCJhZHZlcnNlXCIsIFwiZXZlcnl3aGVyZVwiLCBcImV4Y2VycHRcIiwgXCJlbmdcIiwgXCJzdGVhbVwiLCBcImRpc2NoYXJnZVwiLCBcImVmXCIsIFwiZHJpbmtzXCIsIFwiYWNlXCIsIFwidm9pY2VzXCIsIFwiYWN1dGVcIiwgXCJoYWxsb3dlZW5cIiwgXCJjbGltYmluZ1wiLCBcInN0b29kXCIsIFwic2luZ1wiLCBcInRvbnNcIiwgXCJwZXJmdW1lXCIsIFwiY2Fyb2xcIiwgXCJob25lc3RcIiwgXCJhbGJhbnlcIiwgXCJoYXphcmRvdXNcIiwgXCJyZXN0b3JlXCIsIFwic3RhY2tcIiwgXCJtZXRob2RvbG9neVwiLCBcInNvbWVib2R5XCIsIFwic3VlXCIsIFwiZXBcIiwgXCJob3VzZXdhcmVzXCIsIFwicmVwdXRhdGlvblwiLCBcInJlc2lzdGFudFwiLCBcImRlbW9jcmF0c1wiLCBcInJlY3ljbGluZ1wiLCBcImhhbmdcIiwgXCJnYnBcIiwgXCJjdXJ2ZVwiLCBcImNyZWF0b3JcIiwgXCJhbWJlclwiLCBcInF1YWxpZmljYXRpb25zXCIsIFwibXVzZXVtc1wiLCBcImNvZGluZ1wiLCBcInNsaWRlc2hvd1wiLCBcInRyYWNrZXJcIiwgXCJ2YXJpYXRpb25cIiwgXCJwYXNzYWdlXCIsIFwidHJhbnNmZXJyZWRcIiwgXCJ0cnVua1wiLCBcImhpa2luZ1wiLCBcImxiXCIsIFwiZGFtblwiLCBcInBpZXJyZVwiLCBcImplbHNvZnRcIiwgXCJoZWFkc2V0XCIsIFwicGhvdG9ncmFwaFwiLCBcIm9ha2xhbmRcIiwgXCJjb2xvbWJpYVwiLCBcIndhdmVzXCIsIFwiY2FtZWxcIiwgXCJkaXN0cmlidXRvclwiLCBcImxhbXBzXCIsIFwidW5kZXJseWluZ1wiLCBcImhvb2RcIiwgXCJ3cmVzdGxpbmdcIiwgXCJzdWljaWRlXCIsIFwiYXJjaGl2ZWRcIiwgXCJwaG90b3Nob3BcIiwgXCJqcFwiLCBcImNoaVwiLCBcImJ0XCIsIFwiYXJhYmlhXCIsIFwiZ2F0aGVyaW5nXCIsIFwicHJvamVjdGlvblwiLCBcImp1aWNlXCIsIFwiY2hhc2VcIiwgXCJtYXRoZW1hdGljYWxcIiwgXCJsb2dpY2FsXCIsIFwic2F1Y2VcIiwgXCJmYW1lXCIsIFwiZXh0cmFjdFwiLCBcInNwZWNpYWxpemVkXCIsIFwiZGlhZ25vc3RpY1wiLCBcInBhbmFtYVwiLCBcImluZGlhbmFwb2xpc1wiLCBcImFmXCIsIFwicGF5YWJsZVwiLCBcImNvcnBvcmF0aW9uc1wiLCBcImNvdXJ0ZXN5XCIsIFwiY3JpdGljaXNtXCIsIFwiYXV0b21vYmlsZVwiLCBcImNvbmZpZGVudGlhbFwiLCBcInJmY1wiLCBcInN0YXR1dG9yeVwiLCBcImFjY29tbW9kYXRpb25zXCIsIFwiYXRoZW5zXCIsIFwibm9ydGhlYXN0XCIsIFwiZG93bmxvYWRlZFwiLCBcImp1ZGdlc1wiLCBcInNsXCIsIFwic2VvXCIsIFwicmV0aXJlZFwiLCBcImlzcFwiLCBcInJlbWFya3NcIiwgXCJkZXRlY3RlZFwiLCBcImRlY2FkZXNcIiwgXCJwYWludGluZ3NcIiwgXCJ3YWxrZWRcIiwgXCJhcmlzaW5nXCIsIFwibmlzc2FuXCIsIFwiYnJhY2VsZXRcIiwgXCJpbnNcIiwgXCJlZ2dzXCIsIFwianV2ZW5pbGVcIiwgXCJpbmplY3Rpb25cIiwgXCJ5b3Jrc2hpcmVcIiwgXCJwb3B1bGF0aW9uc1wiLCBcInByb3RlY3RpdmVcIiwgXCJhZnJhaWRcIiwgXCJhY291c3RpY1wiLCBcInJhaWx3YXlcIiwgXCJjYXNzZXR0ZVwiLCBcImluaXRpYWxseVwiLCBcImluZGljYXRvclwiLCBcInBvaW50ZWRcIiwgXCJoYlwiLCBcImpwZ1wiLCBcImNhdXNpbmdcIiwgXCJtaXN0YWtlXCIsIFwibm9ydG9uXCIsIFwibG9ja2VkXCIsIFwiZWxpbWluYXRlXCIsIFwidGNcIiwgXCJmdXNpb25cIiwgXCJtaW5lcmFsXCIsIFwic3VuZ2xhc3Nlc1wiLCBcInJ1YnlcIiwgXCJzdGVlcmluZ1wiLCBcImJlYWRzXCIsIFwiZm9ydHVuZVwiLCBcInByZWZlcmVuY2VcIiwgXCJjYW52YXNcIiwgXCJ0aHJlc2hvbGRcIiwgXCJwYXJpc2hcIiwgXCJjbGFpbWVkXCIsIFwic2NyZWVuc1wiLCBcImNlbWV0ZXJ5XCIsIFwicGxhbm5lclwiLCBcImNyb2F0aWFcIiwgXCJmbG93c1wiLCBcInN0YWRpdW1cIiwgXCJ2ZW5lenVlbGFcIiwgXCJleHBsb3JhdGlvblwiLCBcIm1pbnNcIiwgXCJmZXdlclwiLCBcInNlcXVlbmNlc1wiLCBcImNvdXBvblwiLCBcIm51cnNlc1wiLCBcInNzbFwiLCBcInN0ZW1cIiwgXCJwcm94eVwiLCBcImdhbmdiYW5nXCIsIFwiYXN0cm9ub215XCIsIFwibGFua2FcIiwgXCJvcHRcIiwgXCJlZHdhcmRzXCIsIFwiZHJld1wiLCBcImNvbnRlc3RzXCIsIFwiZmx1XCIsIFwidHJhbnNsYXRlXCIsIFwiYW5ub3VuY2VzXCIsIFwibWxiXCIsIFwiY29zdHVtZVwiLCBcInRhZ2dlZFwiLCBcImJlcmtlbGV5XCIsIFwidm90ZWRcIiwgXCJraWxsZXJcIiwgXCJiaWtlc1wiLCBcImdhdGVzXCIsIFwiYWRqdXN0ZWRcIiwgXCJyYXBcIiwgXCJ0dW5lXCIsIFwiYmlzaG9wXCIsIFwicHVsbGVkXCIsIFwiY29yblwiLCBcImdwXCIsIFwic2hhcGVkXCIsIFwiY29tcHJlc3Npb25cIiwgXCJzZWFzb25hbFwiLCBcImVzdGFibGlzaGluZ1wiLCBcImZhcm1lclwiLCBcImNvdW50ZXJzXCIsIFwicHV0c1wiLCBcImNvbnN0aXR1dGlvbmFsXCIsIFwiZ3Jld1wiLCBcInBlcmZlY3RseVwiLCBcInRpblwiLCBcInNsYXZlXCIsIFwiaW5zdGFudGx5XCIsIFwiY3VsdHVyZXNcIiwgXCJub3Jmb2xrXCIsIFwiY29hY2hpbmdcIiwgXCJleGFtaW5lZFwiLCBcInRyZWtcIiwgXCJlbmNvZGluZ1wiLCBcImxpdGlnYXRpb25cIiwgXCJzdWJtaXNzaW9uc1wiLCBcIm9lbVwiLCBcImhlcm9lc1wiLCBcInBhaW50ZWRcIiwgXCJseWNvc1wiLCBcImlyXCIsIFwiemRuZXRcIiwgXCJicm9hZGNhc3RpbmdcIiwgXCJob3Jpem9udGFsXCIsIFwiYXJ0d29ya1wiLCBcImNvc21ldGljXCIsIFwicmVzdWx0ZWRcIiwgXCJwb3J0cmFpdFwiLCBcInRlcnJvcmlzdFwiLCBcImluZm9ybWF0aW9uYWxcIiwgXCJldGhpY2FsXCIsIFwiY2FycmllcnNcIiwgXCJlY29tbWVyY2VcIiwgXCJtb2JpbGl0eVwiLCBcImZsb3JhbFwiLCBcImJ1aWxkZXJzXCIsIFwidGllc1wiLCBcInN0cnVnZ2xlXCIsIFwic2NoZW1lc1wiLCBcInN1ZmZlcmluZ1wiLCBcIm5ldXRyYWxcIiwgXCJmaXNoZXJcIiwgXCJyYXRcIiwgXCJzcGVhcnNcIiwgXCJwcm9zcGVjdGl2ZVwiLCBcImRpbGRvc1wiLCBcImJlZGRpbmdcIiwgXCJ1bHRpbWF0ZWx5XCIsIFwiam9pbmluZ1wiLCBcImhlYWRpbmdcIiwgXCJlcXVhbGx5XCIsIFwiYXJ0aWZpY2lhbFwiLCBcImJlYXJpbmdcIiwgXCJzcGVjdGFjdWxhclwiLCBcImNvb3JkaW5hdGlvblwiLCBcImNvbm5lY3RvclwiLCBcImJyYWRcIiwgXCJjb21ib1wiLCBcInNlbmlvcnNcIiwgXCJ3b3JsZHNcIiwgXCJndWlsdHlcIiwgXCJhZmZpbGlhdGVkXCIsIFwiYWN0aXZhdGlvblwiLCBcIm5hdHVyYWxseVwiLCBcImhhdmVuXCIsIFwidGFibGV0XCIsIFwianVyeVwiLCBcImRvc1wiLCBcInRhaWxcIiwgXCJzdWJzY3JpYmVyc1wiLCBcImNoYXJtXCIsIFwibGF3blwiLCBcInZpb2xlbnRcIiwgXCJtaXRzdWJpc2hpXCIsIFwidW5kZXJ3ZWFyXCIsIFwiYmFzaW5cIiwgXCJzb3VwXCIsIFwicG90ZW50aWFsbHlcIiwgXCJyYW5jaFwiLCBcImNvbnN0cmFpbnRzXCIsIFwiY3Jvc3NpbmdcIiwgXCJpbmNsdXNpdmVcIiwgXCJkaW1lbnNpb25hbFwiLCBcImNvdHRhZ2VcIiwgXCJkcnVua1wiLCBcImNvbnNpZGVyYWJsZVwiLCBcImNyaW1lc1wiLCBcInJlc29sdmVkXCIsIFwibW96aWxsYVwiLCBcImJ5dGVcIiwgXCJ0b25lclwiLCBcIm5vc2VcIiwgXCJsYXRleFwiLCBcImJyYW5jaGVzXCIsIFwiYW55bW9yZVwiLCBcIm9jbGNcIiwgXCJkZWxoaVwiLCBcImhvbGRpbmdzXCIsIFwiYWxpZW5cIiwgXCJsb2NhdG9yXCIsIFwic2VsZWN0aW5nXCIsIFwicHJvY2Vzc29yc1wiLCBcInBhbnR5aG9zZVwiLCBcInBsY1wiLCBcImJyb2tlXCIsIFwibmVwYWxcIiwgXCJ6aW1iYWJ3ZVwiLCBcImRpZmZpY3VsdGllc1wiLCBcImp1YW5cIiwgXCJjb21wbGV4aXR5XCIsIFwibXNnXCIsIFwiY29uc3RhbnRseVwiLCBcImJyb3dzaW5nXCIsIFwicmVzb2x2ZVwiLCBcImJhcmNlbG9uYVwiLCBcInByZXNpZGVudGlhbFwiLCBcImRvY3VtZW50YXJ5XCIsIFwiY29kXCIsIFwidGVycml0b3JpZXNcIiwgXCJtZWxpc3NhXCIsIFwibW9zY293XCIsIFwidGhlc2lzXCIsIFwidGhydVwiLCBcImpld3NcIiwgXCJueWxvblwiLCBcInBhbGVzdGluaWFuXCIsIFwiZGlzY3NcIiwgXCJyb2NreVwiLCBcImJhcmdhaW5zXCIsIFwiZnJlcXVlbnRcIiwgXCJ0cmltXCIsIFwibmlnZXJpYVwiLCBcImNlaWxpbmdcIiwgXCJwaXhlbHNcIiwgXCJlbnN1cmluZ1wiLCBcImhpc3BhbmljXCIsIFwiY3ZcIiwgXCJjYlwiLCBcImxlZ2lzbGF0dXJlXCIsIFwiaG9zcGl0YWxpdHlcIiwgXCJnZW5cIiwgXCJhbnlib2R5XCIsIFwicHJvY3VyZW1lbnRcIiwgXCJkaWFtb25kc1wiLCBcImVzcG5cIiwgXCJmbGVldFwiLCBcInVudGl0bGVkXCIsIFwiYnVuY2hcIiwgXCJ0b3RhbHNcIiwgXCJtYXJyaW90dFwiLCBcInNpbmdpbmdcIiwgXCJ0aGVvcmV0aWNhbFwiLCBcImFmZm9yZFwiLCBcImV4ZXJjaXNlc1wiLCBcInN0YXJyaW5nXCIsIFwicmVmZXJyYWxcIiwgXCJuaGxcIiwgXCJzdXJ2ZWlsbGFuY2VcIiwgXCJvcHRpbWFsXCIsIFwicXVpdFwiLCBcImRpc3RpbmN0XCIsIFwicHJvdG9jb2xzXCIsIFwibHVuZ1wiLCBcImhpZ2hsaWdodFwiLCBcInN1YnN0aXR1dGVcIiwgXCJpbmNsdXNpb25cIiwgXCJob3BlZnVsbHlcIiwgXCJicmlsbGlhbnRcIiwgXCJ0dXJuZXJcIiwgXCJzdWNraW5nXCIsIFwiY2VudHNcIiwgXCJyZXV0ZXJzXCIsIFwidGlcIiwgXCJmY1wiLCBcImdlbFwiLCBcInRvZGRcIiwgXCJzcG9rZW5cIiwgXCJvbWVnYVwiLCBcImV2YWx1YXRlZFwiLCBcInN0YXllZFwiLCBcImNpdmljXCIsIFwiYXNzaWdubWVudHNcIiwgXCJmd1wiLCBcIm1hbnVhbHNcIiwgXCJkb3VnXCIsIFwic2Vlc1wiLCBcInRlcm1pbmF0aW9uXCIsIFwid2F0Y2hlZFwiLCBcInNhdmVyXCIsIFwidGhlcmVvZlwiLCBcImdyaWxsXCIsIFwiaG91c2Vob2xkc1wiLCBcImdzXCIsIFwicmVkZWVtXCIsIFwicm9nZXJzXCIsIFwiZ3JhaW5cIiwgXCJhYWFcIiwgXCJhdXRoZW50aWNcIiwgXCJyZWdpbWVcIiwgXCJ3YW5uYVwiLCBcIndpc2hlc1wiLCBcImJ1bGxcIiwgXCJtb250Z29tZXJ5XCIsIFwiYXJjaGl0ZWN0dXJhbFwiLCBcImxvdWlzdmlsbGVcIiwgXCJkZXBlbmRcIiwgXCJkaWZmZXJcIiwgXCJtYWNpbnRvc2hcIiwgXCJtb3ZlbWVudHNcIiwgXCJyYW5naW5nXCIsIFwibW9uaWNhXCIsIFwicmVwYWlyc1wiLCBcImJyZWF0aFwiLCBcImFtZW5pdGllc1wiLCBcInZpcnR1YWxseVwiLCBcImNvbGVcIiwgXCJtYXJ0XCIsIFwiY2FuZGxlXCIsIFwiaGFuZ2luZ1wiLCBcImNvbG9yZWRcIiwgXCJhdXRob3JpemF0aW9uXCIsIFwidGFsZVwiLCBcInZlcmlmaWVkXCIsIFwibHlublwiLCBcImZvcm1lcmx5XCIsIFwicHJvamVjdG9yXCIsIFwiYnBcIiwgXCJzaXR1YXRlZFwiLCBcImNvbXBhcmF0aXZlXCIsIFwic3RkXCIsIFwic2Vla3NcIiwgXCJoZXJiYWxcIiwgXCJsb3ZpbmdcIiwgXCJzdHJpY3RseVwiLCBcInJvdXRpbmdcIiwgXCJkb2NzXCIsIFwic3RhbmxleVwiLCBcInBzeWNob2xvZ2ljYWxcIiwgXCJzdXJwcmlzZWRcIiwgXCJyZXRhaWxlclwiLCBcInZpdGFtaW5zXCIsIFwiZWxlZ2FudFwiLCBcImdhaW5zXCIsIFwicmVuZXdhbFwiLCBcInZpZFwiLCBcImdlbmVhbG9neVwiLCBcIm9wcG9zZWRcIiwgXCJkZWVtZWRcIiwgXCJzY29yaW5nXCIsIFwiZXhwZW5kaXR1cmVcIiwgXCJwYW50aWVzXCIsIFwiYnJvb2tseW5cIiwgXCJsaXZlcnBvb2xcIiwgXCJzaXN0ZXJzXCIsIFwiY3JpdGljc1wiLCBcImNvbm5lY3Rpdml0eVwiLCBcInNwb3RzXCIsIFwib29cIiwgXCJhbGdvcml0aG1zXCIsIFwiaGFja2VyXCIsIFwibWFkcmlkXCIsIFwic2ltaWxhcmx5XCIsIFwibWFyZ2luXCIsIFwiY29pblwiLCBcImJid1wiLCBcInNvbGVseVwiLCBcImZha2VcIiwgXCJzYWxvblwiLCBcImNvbGxhYm9yYXRpdmVcIiwgXCJub3JtYW5cIiwgXCJmZGFcIiwgXCJleGNsdWRpbmdcIiwgXCJ0dXJib1wiLCBcImhlYWRlZFwiLCBcInZvdGVyc1wiLCBcImN1cmVcIiwgXCJtYWRvbm5hXCIsIFwiY29tbWFuZGVyXCIsIFwiYXJjaFwiLCBcIm5pXCIsIFwibXVycGh5XCIsIFwidGhpbmtzXCIsIFwidGhhdHNcIiwgXCJzdWdnZXN0aW9uXCIsIFwiaGR0dlwiLCBcInNvbGRpZXJcIiwgXCJwaGlsbGlwc1wiLCBcImFzaW5cIiwgXCJhaW1lZFwiLCBcImp1c3RpblwiLCBcImJvbWJcIiwgXCJoYXJtXCIsIFwiaW50ZXJ2YWxcIiwgXCJtaXJyb3JzXCIsIFwic3BvdGxpZ2h0XCIsIFwidHJpY2tzXCIsIFwicmVzZXRcIiwgXCJicnVzaFwiLCBcImludmVzdGlnYXRlXCIsIFwidGh5XCIsIFwiZXhwYW5zeXNcIiwgXCJwYW5lbHNcIiwgXCJyZXBlYXRlZFwiLCBcImFzc2F1bHRcIiwgXCJjb25uZWN0aW5nXCIsIFwic3BhcmVcIiwgXCJsb2dpc3RpY3NcIiwgXCJkZWVyXCIsIFwia29kYWtcIiwgXCJ0b25ndWVcIiwgXCJib3dsaW5nXCIsIFwidHJpXCIsIFwiZGFuaXNoXCIsIFwicGFsXCIsIFwibW9ua2V5XCIsIFwicHJvcG9ydGlvblwiLCBcImZpbGVuYW1lXCIsIFwic2tpcnRcIiwgXCJmbG9yZW5jZVwiLCBcImludmVzdFwiLCBcImhvbmV5XCIsIFwidW1cIiwgXCJhbmFseXNlc1wiLCBcImRyYXdpbmdzXCIsIFwic2lnbmlmaWNhbmNlXCIsIFwic2NlbmFyaW9cIiwgXCJ5ZVwiLCBcImZzXCIsIFwibG92ZXJzXCIsIFwiYXRvbWljXCIsIFwiYXBwcm94XCIsIFwic3ltcG9zaXVtXCIsIFwiYXJhYmljXCIsIFwiZ2F1Z2VcIiwgXCJlc3NlbnRpYWxzXCIsIFwianVuY3Rpb25cIiwgXCJwcm90ZWN0aW5nXCIsIFwibm5cIiwgXCJmYWNlZFwiLCBcIm1hdFwiLCBcInJhY2hlbFwiLCBcInNvbHZpbmdcIiwgXCJ0cmFuc21pdHRlZFwiLCBcIndlZWtlbmRzXCIsIFwic2NyZWVuc2hvdHNcIiwgXCJwcm9kdWNlc1wiLCBcIm92ZW5cIiwgXCJ0ZWRcIiwgXCJpbnRlbnNpdmVcIiwgXCJjaGFpbnNcIiwgXCJraW5nc3RvblwiLCBcInNpeHRoXCIsIFwiZW5nYWdlXCIsIFwiZGV2aWFudFwiLCBcIm5vb25cIiwgXCJzd2l0Y2hpbmdcIiwgXCJxdW90ZWRcIiwgXCJhZGFwdGVyc1wiLCBcImNvcnJlc3BvbmRlbmNlXCIsIFwiZmFybXNcIiwgXCJpbXBvcnRzXCIsIFwic3VwZXJ2aXNpb25cIiwgXCJjaGVhdFwiLCBcImJyb256ZVwiLCBcImV4cGVuZGl0dXJlc1wiLCBcInNhbmR5XCIsIFwic2VwYXJhdGlvblwiLCBcInRlc3RpbW9ueVwiLCBcInN1c3BlY3RcIiwgXCJjZWxlYnJpdGllc1wiLCBcIm1hY3JvXCIsIFwic2VuZGVyXCIsIFwibWFuZGF0b3J5XCIsIFwiYm91bmRhcmllc1wiLCBcImNydWNpYWxcIiwgXCJzeW5kaWNhdGlvblwiLCBcImd5bVwiLCBcImNlbGVicmF0aW9uXCIsIFwia2RlXCIsIFwiYWRqYWNlbnRcIiwgXCJmaWx0ZXJpbmdcIiwgXCJ0dWl0aW9uXCIsIFwic3BvdXNlXCIsIFwiZXhvdGljXCIsIFwidmlld2VyXCIsIFwic2lnbnVwXCIsIFwidGhyZWF0c1wiLCBcImx1eGVtYm91cmdcIiwgXCJwdXp6bGVzXCIsIFwicmVhY2hpbmdcIiwgXCJ2YlwiLCBcImRhbWFnZWRcIiwgXCJjYW1zXCIsIFwicmVjZXB0b3JcIiwgXCJwaXNzXCIsIFwibGF1Z2hcIiwgXCJqb2VsXCIsIFwic3VyZ2ljYWxcIiwgXCJkZXN0cm95XCIsIFwiY2l0YXRpb25cIiwgXCJwaXRjaFwiLCBcImF1dG9zXCIsIFwieW9cIiwgXCJwcmVtaXNlc1wiLCBcInBlcnJ5XCIsIFwicHJvdmVkXCIsIFwib2ZmZW5zaXZlXCIsIFwiaW1wZXJpYWxcIiwgXCJkb3plblwiLCBcImJlbmphbWluXCIsIFwiZGVwbG95bWVudFwiLCBcInRlZXRoXCIsIFwiY2xvdGhcIiwgXCJzdHVkeWluZ1wiLCBcImNvbGxlYWd1ZXNcIiwgXCJzdGFtcFwiLCBcImxvdHVzXCIsIFwic2FsbW9uXCIsIFwib2x5bXB1c1wiLCBcInNlcGFyYXRlZFwiLCBcInByb2NcIiwgXCJjYXJnb1wiLCBcInRhblwiLCBcImRpcmVjdGl2ZVwiLCBcImZ4XCIsIFwic2FsZW1cIiwgXCJtYXRlXCIsIFwiZGxcIiwgXCJzdGFydGVyXCIsIFwidXBncmFkZXNcIiwgXCJsaWtlc1wiLCBcImJ1dHRlclwiLCBcInBlcHBlclwiLCBcIndlYXBvblwiLCBcImx1Z2dhZ2VcIiwgXCJidXJkZW5cIiwgXCJjaGVmXCIsIFwidGFwZXNcIiwgXCJ6b25lc1wiLCBcInJhY2VzXCIsIFwiaXNsZVwiLCBcInN0eWxpc2hcIiwgXCJzbGltXCIsIFwibWFwbGVcIiwgXCJsdWtlXCIsIFwiZ3JvY2VyeVwiLCBcIm9mZnNob3JlXCIsIFwiZ292ZXJuaW5nXCIsIFwicmV0YWlsZXJzXCIsIFwiZGVwb3RcIiwgXCJrZW5uZXRoXCIsIFwiY29tcFwiLCBcImFsdFwiLCBcInBpZVwiLCBcImJsZW5kXCIsIFwiaGFycmlzb25cIiwgXCJsc1wiLCBcImp1bGllXCIsIFwib2NjYXNpb25hbGx5XCIsIFwiY2JzXCIsIFwiYXR0ZW5kaW5nXCIsIFwiZW1pc3Npb25cIiwgXCJwZXRlXCIsIFwic3BlY1wiLCBcImZpbmVzdFwiLCBcInJlYWx0eVwiLCBcImphbmV0XCIsIFwiYm93XCIsIFwicGVublwiLCBcInJlY3J1aXRpbmdcIiwgXCJhcHBhcmVudFwiLCBcImluc3RydWN0aW9uYWxcIiwgXCJwaHBiYlwiLCBcImF1dHVtblwiLCBcInRyYXZlbGluZ1wiLCBcInByb2JlXCIsIFwibWlkaVwiLCBcInBlcm1pc3Npb25zXCIsIFwiYmlvdGVjaG5vbG9neVwiLCBcInRvaWxldFwiLCBcInJhbmtlZFwiLCBcImphY2tldHNcIiwgXCJyb3V0ZXNcIiwgXCJwYWNrZWRcIiwgXCJleGNpdGVkXCIsIFwib3V0cmVhY2hcIiwgXCJoZWxlblwiLCBcIm1vdW50aW5nXCIsIFwicmVjb3ZlclwiLCBcInRpZWRcIiwgXCJsb3BlelwiLCBcImJhbGFuY2VkXCIsIFwicHJlc2NyaWJlZFwiLCBcImNhdGhlcmluZVwiLCBcInRpbWVseVwiLCBcInRhbGtlZFwiLCBcInVwc2tpcnRzXCIsIFwiZGVidWdcIiwgXCJkZWxheWVkXCIsIFwiY2h1Y2tcIiwgXCJyZXByb2R1Y2VkXCIsIFwiaG9uXCIsIFwiZGFsZVwiLCBcImV4cGxpY2l0XCIsIFwiY2FsY3VsYXRpb25cIiwgXCJ2aWxsYXNcIiwgXCJlYm9va1wiLCBcImNvbnNvbGlkYXRlZFwiLCBcImJvb2JcIiwgXCJleGNsdWRlXCIsIFwicGVlaW5nXCIsIFwib2NjYXNpb25zXCIsIFwiYnJvb2tzXCIsIFwiZXF1YXRpb25zXCIsIFwibmV3dG9uXCIsIFwib2lsc1wiLCBcInNlcHRcIiwgXCJleGNlcHRpb25hbFwiLCBcImFueGlldHlcIiwgXCJiaW5nb1wiLCBcIndoaWxzdFwiLCBcInNwYXRpYWxcIiwgXCJyZXNwb25kZW50c1wiLCBcInVudG9cIiwgXCJsdFwiLCBcImNlcmFtaWNcIiwgXCJwcm9tcHRcIiwgXCJwcmVjaW91c1wiLCBcIm1pbmRzXCIsIFwiYW5udWFsbHlcIiwgXCJjb25zaWRlcmF0aW9uc1wiLCBcInNjYW5uZXJzXCIsIFwiYXRtXCIsIFwieGFuYXhcIiwgXCJlcVwiLCBcInBheXNcIiwgXCJjb3hcIiwgXCJmaW5nZXJzXCIsIFwic3VubnlcIiwgXCJlYm9va3NcIiwgXCJkZWxpdmVyc1wiLCBcImplXCIsIFwicXVlZW5zbGFuZFwiLCBcIm5lY2tsYWNlXCIsIFwibXVzaWNpYW5zXCIsIFwibGVlZHNcIiwgXCJjb21wb3NpdGVcIiwgXCJ1bmF2YWlsYWJsZVwiLCBcImNlZGFyXCIsIFwiYXJyYW5nZWRcIiwgXCJsYW5nXCIsIFwidGhlYXRlcnNcIiwgXCJhZHZvY2FjeVwiLCBcInJhbGVpZ2hcIiwgXCJzdHVkXCIsIFwiZm9sZFwiLCBcImVzc2VudGlhbGx5XCIsIFwiZGVzaWduaW5nXCIsIFwidGhyZWFkZWRcIiwgXCJ1dlwiLCBcInF1YWxpZnlcIiwgXCJmaW5nZXJpbmdcIiwgXCJibGFpclwiLCBcImhvcGVzXCIsIFwiYXNzZXNzbWVudHNcIiwgXCJjbXNcIiwgXCJtYXNvblwiLCBcImRpYWdyYW1cIiwgXCJidXJuc1wiLCBcInB1bXBzXCIsIFwic2x1dFwiLCBcImVqYWN1bGF0aW9uXCIsIFwiZm9vdHdlYXJcIiwgXCJzZ1wiLCBcInZpY1wiLCBcImJlaWppbmdcIiwgXCJwZW9wbGVzXCIsIFwidmljdG9yXCIsIFwibWFyaW9cIiwgXCJwb3NcIiwgXCJhdHRhY2hcIiwgXCJsaWNlbnNlc1wiLCBcInV0aWxzXCIsIFwicmVtb3ZpbmdcIiwgXCJhZHZpc2VkXCIsIFwiYnJ1bnN3aWNrXCIsIFwic3BpZGVyXCIsIFwicGh5c1wiLCBcInJhbmdlc1wiLCBcInBhaXJzXCIsIFwic2Vuc2l0aXZpdHlcIiwgXCJ0cmFpbHNcIiwgXCJwcmVzZXJ2YXRpb25cIiwgXCJodWRzb25cIiwgXCJpc29sYXRlZFwiLCBcImNhbGdhcnlcIiwgXCJpbnRlcmltXCIsIFwiYXNzaXN0ZWRcIiwgXCJkaXZpbmVcIiwgXCJzdHJlYW1pbmdcIiwgXCJhcHByb3ZlXCIsIFwiY2hvc2VcIiwgXCJjb21wb3VuZFwiLCBcImludGVuc2l0eVwiLCBcInRlY2hub2xvZ2ljYWxcIiwgXCJzeW5kaWNhdGVcIiwgXCJhYm9ydGlvblwiLCBcImRpYWxvZ1wiLCBcInZlbnVlc1wiLCBcImJsYXN0XCIsIFwid2VsbG5lc3NcIiwgXCJjYWxjaXVtXCIsIFwibmV3cG9ydFwiLCBcImFudGl2aXJ1c1wiLCBcImFkZHJlc3NpbmdcIiwgXCJwb2xlXCIsIFwiZGlzY291bnRlZFwiLCBcImluZGlhbnNcIiwgXCJzaGllbGRcIiwgXCJoYXJ2ZXN0XCIsIFwibWVtYnJhbmVcIiwgXCJwcmFndWVcIiwgXCJwcmV2aWV3c1wiLCBcImJhbmdsYWRlc2hcIiwgXCJjb25zdGl0dXRlXCIsIFwibG9jYWxseVwiLCBcImNvbmNsdWRlZFwiLCBcInBpY2t1cFwiLCBcImRlc3BlcmF0ZVwiLCBcIm1vdGhlcnNcIiwgXCJuYXNjYXJcIiwgXCJpY2VsYW5kXCIsIFwiZGVtb25zdHJhdGlvblwiLCBcImdvdmVybm1lbnRhbFwiLCBcIm1hbnVmYWN0dXJlZFwiLCBcImNhbmRsZXNcIiwgXCJncmFkdWF0aW9uXCIsIFwibWVnYVwiLCBcImJlbmRcIiwgXCJzYWlsaW5nXCIsIFwidmFyaWF0aW9uc1wiLCBcIm1vbXNcIiwgXCJzYWNyZWRcIiwgXCJhZGRpY3Rpb25cIiwgXCJtb3JvY2NvXCIsIFwiY2hyb21lXCIsIFwidG9tbXlcIiwgXCJzcHJpbmdmaWVsZFwiLCBcInJlZnVzZWRcIiwgXCJicmFrZVwiLCBcImV4dGVyaW9yXCIsIFwiZ3JlZXRpbmdcIiwgXCJlY29sb2d5XCIsIFwib2xpdmVyXCIsIFwiY29uZ29cIiwgXCJnbGVuXCIsIFwiYm90c3dhbmFcIiwgXCJuYXZcIiwgXCJkZWxheXNcIiwgXCJzeW50aGVzaXNcIiwgXCJvbGl2ZVwiLCBcInVuZGVmaW5lZFwiLCBcInVuZW1wbG95bWVudFwiLCBcImN5YmVyXCIsIFwidmVyaXpvblwiLCBcInNjb3JlZFwiLCBcImVuaGFuY2VtZW50XCIsIFwibmV3Y2FzdGxlXCIsIFwiY2xvbmVcIiwgXCJkaWNrc1wiLCBcInZlbG9jaXR5XCIsIFwibGFtYmRhXCIsIFwicmVsYXlcIiwgXCJjb21wb3NlZFwiLCBcInRlYXJzXCIsIFwicGVyZm9ybWFuY2VzXCIsIFwib2FzaXNcIiwgXCJiYXNlbGluZVwiLCBcImNhYlwiLCBcImFuZ3J5XCIsIFwiZmFcIiwgXCJzb2NpZXRpZXNcIiwgXCJzaWxpY29uXCIsIFwiYnJhemlsaWFuXCIsIFwiaWRlbnRpY2FsXCIsIFwicGV0cm9sZXVtXCIsIFwiY29tcGV0ZVwiLCBcImlzdFwiLCBcIm5vcndlZ2lhblwiLCBcImxvdmVyXCIsIFwiYmVsb25nXCIsIFwiaG9ub2x1bHVcIiwgXCJiZWF0bGVzXCIsIFwibGlwc1wiLCBcImVzY29ydFwiLCBcInJldGVudGlvblwiLCBcImV4Y2hhbmdlc1wiLCBcInBvbmRcIiwgXCJyb2xsc1wiLCBcInRob21zb25cIiwgXCJiYXJuZXNcIiwgXCJzb3VuZHRyYWNrXCIsIFwid29uZGVyaW5nXCIsIFwibWFsdGFcIiwgXCJkYWRkeVwiLCBcImxjXCIsIFwiZmVycnlcIiwgXCJyYWJiaXRcIiwgXCJwcm9mZXNzaW9uXCIsIFwic2VhdGluZ1wiLCBcImRhbVwiLCBcImNublwiLCBcInNlcGFyYXRlbHlcIiwgXCJwaHlzaW9sb2d5XCIsIFwibGlsXCIsIFwiY29sbGVjdGluZ1wiLCBcImRhc1wiLCBcImV4cG9ydHNcIiwgXCJvbWFoYVwiLCBcInRpcmVcIiwgXCJwYXJ0aWNpcGFudFwiLCBcInNjaG9sYXJzaGlwc1wiLCBcInJlY3JlYXRpb25hbFwiLCBcImRvbWluaWNhblwiLCBcImNoYWRcIiwgXCJlbGVjdHJvblwiLCBcImxvYWRzXCIsIFwiZnJpZW5kc2hpcFwiLCBcImhlYXRoZXJcIiwgXCJwYXNzcG9ydFwiLCBcIm1vdGVsXCIsIFwidW5pb25zXCIsIFwidHJlYXN1cnlcIiwgXCJ3YXJyYW50XCIsIFwic3lzXCIsIFwic29sYXJpc1wiLCBcImZyb3plblwiLCBcIm9jY3VwaWVkXCIsIFwiam9zaFwiLCBcInJveWFsdHlcIiwgXCJzY2FsZXNcIiwgXCJyYWxseVwiLCBcIm9ic2VydmVyXCIsIFwic3Vuc2hpbmVcIiwgXCJzdHJhaW5cIiwgXCJkcmFnXCIsIFwiY2VyZW1vbnlcIiwgXCJzb21laG93XCIsIFwiYXJyZXN0ZWRcIiwgXCJleHBhbmRpbmdcIiwgXCJwcm92aW5jaWFsXCIsIFwiaW52ZXN0aWdhdGlvbnNcIiwgXCJpY3FcIiwgXCJyaXBlXCIsIFwieWFtYWhhXCIsIFwicmVseVwiLCBcIm1lZGljYXRpb25zXCIsIFwiaGVicmV3XCIsIFwiZ2FpbmVkXCIsIFwicm9jaGVzdGVyXCIsIFwiZHlpbmdcIiwgXCJsYXVuZHJ5XCIsIFwic3R1Y2tcIiwgXCJzb2xvbW9uXCIsIFwicGxhY2luZ1wiLCBcInN0b3BzXCIsIFwiaG9tZXdvcmtcIiwgXCJhZGp1c3RcIiwgXCJhc3Nlc3NlZFwiLCBcImFkdmVydGlzZXJcIiwgXCJlbmFibGluZ1wiLCBcImVuY3J5cHRpb25cIiwgXCJmaWxsaW5nXCIsIFwiZG93bmxvYWRhYmxlXCIsIFwic29waGlzdGljYXRlZFwiLCBcImltcG9zZWRcIiwgXCJzaWxlbmNlXCIsIFwic2NzaVwiLCBcImZvY3VzZXNcIiwgXCJzb3ZpZXRcIiwgXCJwb3NzZXNzaW9uXCIsIFwiY3VcIiwgXCJsYWJvcmF0b3JpZXNcIiwgXCJ0cmVhdHlcIiwgXCJ2b2NhbFwiLCBcInRyYWluZXJcIiwgXCJvcmdhblwiLCBcInN0cm9uZ2VyXCIsIFwidm9sdW1lc1wiLCBcImFkdmFuY2VzXCIsIFwidmVnZXRhYmxlc1wiLCBcImxlbW9uXCIsIFwidG94aWNcIiwgXCJkbnNcIiwgXCJ0aHVtYm5haWxzXCIsIFwiZGFya25lc3NcIiwgXCJwdHlcIiwgXCJ3c1wiLCBcIm51dHNcIiwgXCJuYWlsXCIsIFwiYml6cmF0ZVwiLCBcInZpZW5uYVwiLCBcImltcGxpZWRcIiwgXCJzcGFuXCIsIFwic3RhbmZvcmRcIiwgXCJzb3hcIiwgXCJzdG9ja2luZ3NcIiwgXCJqb2tlXCIsIFwicmVzcG9uZGVudFwiLCBcInBhY2tpbmdcIiwgXCJzdGF0dXRlXCIsIFwicmVqZWN0ZWRcIiwgXCJzYXRpc2Z5XCIsIFwiZGVzdHJveWVkXCIsIFwic2hlbHRlclwiLCBcImNoYXBlbFwiLCBcImdhbWVzcG90XCIsIFwibWFudWZhY3R1cmVcIiwgXCJsYXllcnNcIiwgXCJ3b3JkcHJlc3NcIiwgXCJndWlkZWRcIiwgXCJ2dWxuZXJhYmlsaXR5XCIsIFwiYWNjb3VudGFiaWxpdHlcIiwgXCJjZWxlYnJhdGVcIiwgXCJhY2NyZWRpdGVkXCIsIFwiYXBwbGlhbmNlXCIsIFwiY29tcHJlc3NlZFwiLCBcImJhaGFtYXNcIiwgXCJwb3dlbGxcIiwgXCJtaXh0dXJlXCIsIFwiem9vcGhpbGlhXCIsIFwiYmVuY2hcIiwgXCJ1bml2XCIsIFwidHViXCIsIFwicmlkZXJcIiwgXCJzY2hlZHVsaW5nXCIsIFwicmFkaXVzXCIsIFwicGVyc3BlY3RpdmVzXCIsIFwibW9ydGFsaXR5XCIsIFwibG9nZ2luZ1wiLCBcImhhbXB0b25cIiwgXCJjaHJpc3RpYW5zXCIsIFwiYm9yZGVyc1wiLCBcInRoZXJhcGV1dGljXCIsIFwicGFkc1wiLCBcImJ1dHRzXCIsIFwiaW5uc1wiLCBcImJvYmJ5XCIsIFwiaW1wcmVzc2l2ZVwiLCBcInNoZWVwXCIsIFwiYWNjb3JkaW5nbHlcIiwgXCJhcmNoaXRlY3RcIiwgXCJyYWlscm9hZFwiLCBcImxlY3R1cmVzXCIsIFwiY2hhbGxlbmdpbmdcIiwgXCJ3aW5lc1wiLCBcIm51cnNlcnlcIiwgXCJoYXJkZXJcIiwgXCJjdXBzXCIsIFwiYXNoXCIsIFwibWljcm93YXZlXCIsIFwiY2hlYXBlc3RcIiwgXCJhY2NpZGVudHNcIiwgXCJ0cmF2ZXN0aVwiLCBcInJlbG9jYXRpb25cIiwgXCJzdHVhcnRcIiwgXCJjb250cmlidXRvcnNcIiwgXCJzYWx2YWRvclwiLCBcImFsaVwiLCBcInNhbGFkXCIsIFwibnBcIiwgXCJtb25yb2VcIiwgXCJ0ZW5kZXJcIiwgXCJ2aW9sYXRpb25zXCIsIFwiZm9hbVwiLCBcInRlbXBlcmF0dXJlc1wiLCBcInBhc3RlXCIsIFwiY2xvdWRzXCIsIFwiY29tcGV0aXRpb25zXCIsIFwiZGlzY3JldGlvblwiLCBcInRmdFwiLCBcInRhbnphbmlhXCIsIFwicHJlc2VydmVcIiwgXCJqdmNcIiwgXCJwb2VtXCIsIFwidmlicmF0b3JcIiwgXCJ1bnNpZ25lZFwiLCBcInN0YXlpbmdcIiwgXCJjb3NtZXRpY3NcIiwgXCJlYXN0ZXJcIiwgXCJ0aGVvcmllc1wiLCBcInJlcG9zaXRvcnlcIiwgXCJwcmFpc2VcIiwgXCJqZXJlbXlcIiwgXCJ2ZW5pY2VcIiwgXCJqb1wiLCBcImNvbmNlbnRyYXRpb25zXCIsIFwidmlicmF0b3JzXCIsIFwiZXN0b25pYVwiLCBcImNocmlzdGlhbml0eVwiLCBcInZldGVyYW5cIiwgXCJzdHJlYW1zXCIsIFwibGFuZGluZ1wiLCBcInNpZ25pbmdcIiwgXCJleGVjdXRlZFwiLCBcImthdGllXCIsIFwibmVnb3RpYXRpb25zXCIsIFwicmVhbGlzdGljXCIsIFwiZHRcIiwgXCJjZ2lcIiwgXCJzaG93Y2FzZVwiLCBcImludGVncmFsXCIsIFwiYXNrc1wiLCBcInJlbGF4XCIsIFwibmFtaWJpYVwiLCBcImdlbmVyYXRpbmdcIiwgXCJjaHJpc3RpbmFcIiwgXCJjb25ncmVzc2lvbmFsXCIsIFwic3lub3BzaXNcIiwgXCJoYXJkbHlcIiwgXCJwcmFpcmllXCIsIFwicmV1bmlvblwiLCBcImNvbXBvc2VyXCIsIFwiYmVhblwiLCBcInN3b3JkXCIsIFwiYWJzZW50XCIsIFwicGhvdG9ncmFwaGljXCIsIFwic2VsbHNcIiwgXCJlY3VhZG9yXCIsIFwiaG9waW5nXCIsIFwiYWNjZXNzZWRcIiwgXCJzcGlyaXRzXCIsIFwibW9kaWZpY2F0aW9uc1wiLCBcImNvcmFsXCIsIFwicGl4ZWxcIiwgXCJmbG9hdFwiLCBcImNvbGluXCIsIFwiYmlhc1wiLCBcImltcG9ydGVkXCIsIFwicGF0aHNcIiwgXCJidWJibGVcIiwgXCJwb3JcIiwgXCJhY3F1aXJlXCIsIFwiY29udHJhcnlcIiwgXCJtaWxsZW5uaXVtXCIsIFwidHJpYnVuZVwiLCBcInZlc3NlbFwiLCBcImFjaWRzXCIsIFwiZm9jdXNpbmdcIiwgXCJ2aXJ1c2VzXCIsIFwiY2hlYXBlclwiLCBcImFkbWl0dGVkXCIsIFwiZGFpcnlcIiwgXCJhZG1pdFwiLCBcIm1lbVwiLCBcImZhbmN5XCIsIFwiZXF1YWxpdHlcIiwgXCJzYW1vYVwiLCBcImdjXCIsIFwiYWNoaWV2aW5nXCIsIFwidGFwXCIsIFwic3RpY2tlcnNcIiwgXCJmaXNoZXJpZXNcIiwgXCJleGNlcHRpb25zXCIsIFwicmVhY3Rpb25zXCIsIFwibGVhc2luZ1wiLCBcImxhdXJlblwiLCBcImJlbGllZnNcIiwgXCJjaVwiLCBcIm1hY3JvbWVkaWFcIiwgXCJjb21wYW5pb25cIiwgXCJzcXVhZFwiLCBcImFuYWx5emVcIiwgXCJhc2hsZXlcIiwgXCJzY3JvbGxcIiwgXCJyZWxhdGVcIiwgXCJkaXZpc2lvbnNcIiwgXCJzd2ltXCIsIFwid2FnZXNcIiwgXCJhZGRpdGlvbmFsbHlcIiwgXCJzdWZmZXJcIiwgXCJmb3Jlc3RzXCIsIFwiZmVsbG93c2hpcFwiLCBcIm5hbm9cIiwgXCJpbnZhbGlkXCIsIFwiY29uY2VydHNcIiwgXCJtYXJ0aWFsXCIsIFwibWFsZXNcIiwgXCJ2aWN0b3JpYW5cIiwgXCJyZXRhaW5cIiwgXCJjb2xvdXJzXCIsIFwiZXhlY3V0ZVwiLCBcInR1bm5lbFwiLCBcImdlbnJlc1wiLCBcImNhbWJvZGlhXCIsIFwicGF0ZW50c1wiLCBcImNvcHlyaWdodHNcIiwgXCJ5blwiLCBcImNoYW9zXCIsIFwibGl0aHVhbmlhXCIsIFwibWFzdGVyY2FyZFwiLCBcIndoZWF0XCIsIFwiY2hyb25pY2xlc1wiLCBcIm9idGFpbmluZ1wiLCBcImJlYXZlclwiLCBcInVwZGF0aW5nXCIsIFwiZGlzdHJpYnV0ZVwiLCBcInJlYWRpbmdzXCIsIFwiZGVjb3JhdGl2ZVwiLCBcImtpamlqaVwiLCBcImNvbmZ1c2VkXCIsIFwiY29tcGlsZXJcIiwgXCJlbmxhcmdlbWVudFwiLCBcImVhZ2xlc1wiLCBcImJhc2VzXCIsIFwidmlpXCIsIFwiYWNjdXNlZFwiLCBcImJlZVwiLCBcImNhbXBhaWduc1wiLCBcInVuaXR5XCIsIFwibG91ZFwiLCBcImNvbmp1bmN0aW9uXCIsIFwiYnJpZGVcIiwgXCJyYXRzXCIsIFwiZGVmaW5lc1wiLCBcImFpcnBvcnRzXCIsIFwiaW5zdGFuY2VzXCIsIFwiaW5kaWdlbm91c1wiLCBcImJlZ3VuXCIsIFwiY2ZyXCIsIFwiYnJ1bmV0dGVcIiwgXCJwYWNrZXRzXCIsIFwiYW5jaG9yXCIsIFwic29ja3NcIiwgXCJ2YWxpZGF0aW9uXCIsIFwicGFyYWRlXCIsIFwiY29ycnVwdGlvblwiLCBcInN0YXRcIiwgXCJ0cmlnZ2VyXCIsIFwiaW5jZW50aXZlc1wiLCBcImNob2xlc3Rlcm9sXCIsIFwiZ2F0aGVyZWRcIiwgXCJlc3NleFwiLCBcInNsb3ZlbmlhXCIsIFwibm90aWZpZWRcIiwgXCJkaWZmZXJlbnRpYWxcIiwgXCJiZWFjaGVzXCIsIFwiZm9sZGVyc1wiLCBcImRyYW1hdGljXCIsIFwic3VyZmFjZXNcIiwgXCJ0ZXJyaWJsZVwiLCBcInJvdXRlcnNcIiwgXCJjcnV6XCIsIFwicGVuZGFudFwiLCBcImRyZXNzZXNcIiwgXCJiYXB0aXN0XCIsIFwic2NpZW50aXN0XCIsIFwic3RhcnNtZXJjaGFudFwiLCBcImhpcmluZ1wiLCBcImNsb2Nrc1wiLCBcImFydGhyaXRpc1wiLCBcImJpb3NcIiwgXCJmZW1hbGVzXCIsIFwid2FsbGFjZVwiLCBcIm5ldmVydGhlbGVzc1wiLCBcInJlZmxlY3RzXCIsIFwidGF4YXRpb25cIiwgXCJmZXZlclwiLCBcInBtY1wiLCBcImN1aXNpbmVcIiwgXCJzdXJlbHlcIiwgXCJwcmFjdGl0aW9uZXJzXCIsIFwidHJhbnNjcmlwdFwiLCBcIm15c3BhY2VcIiwgXCJ0aGVvcmVtXCIsIFwiaW5mbGF0aW9uXCIsIFwidGhlZVwiLCBcIm5iXCIsIFwicnV0aFwiLCBcInByYXlcIiwgXCJzdHlsdXNcIiwgXCJjb21wb3VuZHNcIiwgXCJwb3BlXCIsIFwiZHJ1bXNcIiwgXCJjb250cmFjdGluZ1wiLCBcInRvcGxlc3NcIiwgXCJhcm5vbGRcIiwgXCJzdHJ1Y3R1cmVkXCIsIFwicmVhc29uYWJseVwiLCBcImplZXBcIiwgXCJjaGlja3NcIiwgXCJiYXJlXCIsIFwiaHVuZ1wiLCBcImNhdHRsZVwiLCBcIm1iYVwiLCBcInJhZGljYWxcIiwgXCJncmFkdWF0ZXNcIiwgXCJyb3ZlclwiLCBcInJlY29tbWVuZHNcIiwgXCJjb250cm9sbGluZ1wiLCBcInRyZWFzdXJlXCIsIFwicmVsb2FkXCIsIFwiZGlzdHJpYnV0b3JzXCIsIFwiZmxhbWVcIiwgXCJsZXZpdHJhXCIsIFwidGFua3NcIiwgXCJhc3N1bWluZ1wiLCBcIm1vbmV0YXJ5XCIsIFwiZWxkZXJseVwiLCBcInBpdFwiLCBcImFybGluZ3RvblwiLCBcIm1vbm9cIiwgXCJwYXJ0aWNsZXNcIiwgXCJmbG9hdGluZ1wiLCBcImV4dHJhb3JkaW5hcnlcIiwgXCJ0aWxlXCIsIFwiaW5kaWNhdGluZ1wiLCBcImJvbGl2aWFcIiwgXCJzcGVsbFwiLCBcImhvdHRlc3RcIiwgXCJzdGV2ZW5zXCIsIFwiY29vcmRpbmF0ZVwiLCBcImt1d2FpdFwiLCBcImV4Y2x1c2l2ZWx5XCIsIFwiZW1pbHlcIiwgXCJhbGxlZ2VkXCIsIFwibGltaXRhdGlvblwiLCBcIndpZGVzY3JlZW5cIiwgXCJjb21waWxlXCIsIFwic3F1aXJ0aW5nXCIsIFwid2Vic3RlclwiLCBcInN0cnVja1wiLCBcInJ4XCIsIFwiaWxsdXN0cmF0aW9uXCIsIFwicGx5bW91dGhcIiwgXCJ3YXJuaW5nc1wiLCBcImNvbnN0cnVjdFwiLCBcImFwcHNcIiwgXCJpbnF1aXJpZXNcIiwgXCJicmlkYWxcIiwgXCJhbm5leFwiLCBcIm1hZ1wiLCBcImdzbVwiLCBcImluc3BpcmF0aW9uXCIsIFwidHJpYmFsXCIsIFwiY3VyaW91c1wiLCBcImFmZmVjdGluZ1wiLCBcImZyZWlnaHRcIiwgXCJyZWJhdGVcIiwgXCJtZWV0dXBcIiwgXCJlY2xpcHNlXCIsIFwic3VkYW5cIiwgXCJkZHJcIiwgXCJkb3dubG9hZGluZ1wiLCBcInJlY1wiLCBcInNodXR0bGVcIiwgXCJhZ2dyZWdhdGVcIiwgXCJzdHVubmluZ1wiLCBcImN5Y2xlc1wiLCBcImFmZmVjdHNcIiwgXCJmb3JlY2FzdHNcIiwgXCJkZXRlY3RcIiwgXCJzbHV0c1wiLCBcImFjdGl2ZWx5XCIsIFwiY2lhb1wiLCBcImFtcGxhbmRcIiwgXCJrbmVlXCIsIFwicHJlcFwiLCBcInBiXCIsIFwiY29tcGxpY2F0ZWRcIiwgXCJjaGVtXCIsIFwiZmFzdGVzdFwiLCBcImJ1dGxlclwiLCBcInNob3B6aWxsYVwiLCBcImluanVyZWRcIiwgXCJkZWNvcmF0aW5nXCIsIFwicGF5cm9sbFwiLCBcImNvb2tib29rXCIsIFwiZXhwcmVzc2lvbnNcIiwgXCJ0b25cIiwgXCJjb3VyaWVyXCIsIFwidXBsb2FkZWRcIiwgXCJzaGFrZXNwZWFyZVwiLCBcImhpbnRzXCIsIFwiY29sbGFwc2VcIiwgXCJhbWVyaWNhc1wiLCBcImNvbm5lY3RvcnNcIiwgXCJ0d2lua3NcIiwgXCJ1bmxpa2VseVwiLCBcIm9lXCIsIFwiZ2lmXCIsIFwicHJvc1wiLCBcImNvbmZsaWN0c1wiLCBcInRlY2hub1wiLCBcImJldmVyYWdlXCIsIFwidHJpYnV0ZVwiLCBcIndpcmVkXCIsIFwiZWx2aXNcIiwgXCJpbW11bmVcIiwgXCJsYXR2aWFcIiwgXCJ0cmF2ZWxlcnNcIiwgXCJmb3Jlc3RyeVwiLCBcImJhcnJpZXJzXCIsIFwiY2FudFwiLCBcImpkXCIsIFwicmFyZWx5XCIsIFwiZ3BsXCIsIFwiaW5mZWN0ZWRcIiwgXCJvZmZlcmluZ3NcIiwgXCJtYXJ0aGFcIiwgXCJnZW5lc2lzXCIsIFwiYmFycmllclwiLCBcImFyZ3VlXCIsIFwiaW5jb3JyZWN0XCIsIFwidHJhaW5zXCIsIFwibWV0YWxzXCIsIFwiYmljeWNsZVwiLCBcImZ1cm5pc2hpbmdzXCIsIFwibGV0dGluZ1wiLCBcImFyaXNlXCIsIFwiZ3VhdGVtYWxhXCIsIFwiY2VsdGljXCIsIFwidGhlcmVieVwiLCBcImlyY1wiLCBcImphbWllXCIsIFwicGFydGljbGVcIiwgXCJwZXJjZXB0aW9uXCIsIFwibWluZXJhbHNcIiwgXCJhZHZpc2VcIiwgXCJodW1pZGl0eVwiLCBcImJvdHRsZXNcIiwgXCJib3hpbmdcIiwgXCJ3eVwiLCBcImRtXCIsIFwiYmFuZ2tva1wiLCBcInJlbmFpc3NhbmNlXCIsIFwicGF0aG9sb2d5XCIsIFwic2FyYVwiLCBcImJyYVwiLCBcIm9yZGluYW5jZVwiLCBcImh1Z2hlc1wiLCBcInBob3RvZ3JhcGhlcnNcIiwgXCJiaXRjaFwiLCBcImluZmVjdGlvbnNcIiwgXCJqZWZmcmV5XCIsIFwiY2hlc3NcIiwgXCJvcGVyYXRlc1wiLCBcImJyaXNiYW5lXCIsIFwiY29uZmlndXJlZFwiLCBcInN1cnZpdmVcIiwgXCJvc2NhclwiLCBcImZlc3RpdmFsc1wiLCBcIm1lbnVzXCIsIFwiam9hblwiLCBcInBvc3NpYmlsaXRpZXNcIiwgXCJkdWNrXCIsIFwicmV2ZWFsXCIsIFwiY2FuYWxcIiwgXCJhbWlub1wiLCBcInBoaVwiLCBcImNvbnRyaWJ1dGluZ1wiLCBcImhlcmJzXCIsIFwiY2xpbmljc1wiLCBcIm1sc1wiLCBcImNvd1wiLCBcIm1hbml0b2JhXCIsIFwiYW5hbHl0aWNhbFwiLCBcIm1pc3Npb25zXCIsIFwid2F0c29uXCIsIFwibHlpbmdcIiwgXCJjb3N0dW1lc1wiLCBcInN0cmljdFwiLCBcImRpdmVcIiwgXCJzYWRkYW1cIiwgXCJjaXJjdWxhdGlvblwiLCBcImRyaWxsXCIsIFwib2ZmZW5zZVwiLCBcInRocmVlc29tZVwiLCBcImJyeWFuXCIsIFwiY2V0XCIsIFwicHJvdGVzdFwiLCBcImhhbmRqb2JcIiwgXCJhc3N1bXB0aW9uXCIsIFwiamVydXNhbGVtXCIsIFwiaG9iYnlcIiwgXCJ0cmllc1wiLCBcInRyYW5zZXh1YWxlc1wiLCBcImludmVudGlvblwiLCBcIm5pY2tuYW1lXCIsIFwiZmlqaVwiLCBcInRlY2huaWNpYW5cIiwgXCJpbmxpbmVcIiwgXCJleGVjdXRpdmVzXCIsIFwiZW5xdWlyaWVzXCIsIFwid2FzaGluZ1wiLCBcImF1ZGlcIiwgXCJzdGFmZmluZ1wiLCBcImNvZ25pdGl2ZVwiLCBcImV4cGxvcmluZ1wiLCBcInRyaWNrXCIsIFwiZW5xdWlyeVwiLCBcImNsb3N1cmVcIiwgXCJyYWlkXCIsIFwicHBjXCIsIFwidGltYmVyXCIsIFwidm9sdFwiLCBcImludGVuc2VcIiwgXCJkaXZcIiwgXCJwbGF5bGlzdFwiLCBcInJlZ2lzdHJhclwiLCBcInNob3dlcnNcIiwgXCJzdXBwb3J0ZXJzXCIsIFwicnVsaW5nXCIsIFwic3RlYWR5XCIsIFwiZGlydFwiLCBcInN0YXR1dGVzXCIsIFwid2l0aGRyYXdhbFwiLCBcIm15ZXJzXCIsIFwiZHJvcHNcIiwgXCJwcmVkaWN0ZWRcIiwgXCJ3aWRlclwiLCBcInNhc2thdGNoZXdhblwiLCBcImpjXCIsIFwiY2FuY2VsbGF0aW9uXCIsIFwicGx1Z2luc1wiLCBcImVucm9sbGVkXCIsIFwic2Vuc29yc1wiLCBcInNjcmV3XCIsIFwibWluaXN0ZXJzXCIsIFwicHVibGljbHlcIiwgXCJob3VybHlcIiwgXCJibGFtZVwiLCBcImdlbmV2YVwiLCBcImZyZWVic2RcIiwgXCJ2ZXRlcmluYXJ5XCIsIFwiYWNlclwiLCBcInByb3N0b3Jlc1wiLCBcInJlc2VsbGVyXCIsIFwiZGlzdFwiLCBcImhhbmRlZFwiLCBcInN1ZmZlcmVkXCIsIFwiaW50YWtlXCIsIFwiaW5mb3JtYWxcIiwgXCJyZWxldmFuY2VcIiwgXCJpbmNlbnRpdmVcIiwgXCJidXR0ZXJmbHlcIiwgXCJ0dWNzb25cIiwgXCJtZWNoYW5pY3NcIiwgXCJoZWF2aWx5XCIsIFwic3dpbmdlcnNcIiwgXCJmaWZ0eVwiLCBcImhlYWRlcnNcIiwgXCJtaXN0YWtlc1wiLCBcIm51bWVyaWNhbFwiLCBcIm9uc1wiLCBcImdlZWtcIiwgXCJ1bmNsZVwiLCBcImRlZmluaW5nXCIsIFwieG54eFwiLCBcImNvdW50aW5nXCIsIFwicmVmbGVjdGlvblwiLCBcInNpbmtcIiwgXCJhY2NvbXBhbmllZFwiLCBcImFzc3VyZVwiLCBcImludml0YXRpb25cIiwgXCJkZXZvdGVkXCIsIFwicHJpbmNldG9uXCIsIFwiamFjb2JcIiwgXCJzb2RpdW1cIiwgXCJyYW5keVwiLCBcInNwaXJpdHVhbGl0eVwiLCBcImhvcm1vbmVcIiwgXCJtZWFud2hpbGVcIiwgXCJwcm9wcmlldGFyeVwiLCBcInRpbW90aHlcIiwgXCJjaGlsZHJlbnNcIiwgXCJicmlja1wiLCBcImdyaXBcIiwgXCJuYXZhbFwiLCBcInRodW1iemlsbGFcIiwgXCJtZWRpZXZhbFwiLCBcInBvcmNlbGFpblwiLCBcImF2aVwiLCBcImJyaWRnZXNcIiwgXCJwaWNodW50ZXJcIiwgXCJjYXB0dXJlZFwiLCBcIndhdHRcIiwgXCJ0aGVodW5cIiwgXCJkZWNlbnRcIiwgXCJjYXN0aW5nXCIsIFwiZGF5dG9uXCIsIFwidHJhbnNsYXRlZFwiLCBcInNob3J0bHlcIiwgXCJjYW1lcm9uXCIsIFwiY29sdW1uaXN0c1wiLCBcInBpbnNcIiwgXCJjYXJsb3NcIiwgXCJyZW5vXCIsIFwiZG9ubmFcIiwgXCJhbmRyZWFzXCIsIFwid2FycmlvclwiLCBcImRpcGxvbWFcIiwgXCJjYWJpblwiLCBcImlubm9jZW50XCIsIFwiYmRzbVwiLCBcInNjYW5uaW5nXCIsIFwiaWRlXCIsIFwiY29uc2Vuc3VzXCIsIFwicG9sb1wiLCBcInZhbGl1bVwiLCBcImNvcHlpbmdcIiwgXCJycGdcIiwgXCJkZWxpdmVyaW5nXCIsIFwiY29yZGxlc3NcIiwgXCJwYXRyaWNpYVwiLCBcImhvcm5cIiwgXCJlZGRpZVwiLCBcInVnYW5kYVwiLCBcImZpcmVkXCIsIFwiam91cm5hbGlzbVwiLCBcInBkXCIsIFwicHJvdFwiLCBcInRyaXZpYVwiLCBcImFkaWRhc1wiLCBcInBlcnRoXCIsIFwiZnJvZ1wiLCBcImdyYW1tYXJcIiwgXCJpbnRlbnRpb25cIiwgXCJzeXJpYVwiLCBcImRpc2FncmVlXCIsIFwia2xlaW5cIiwgXCJoYXJ2ZXlcIiwgXCJ0aXJlc1wiLCBcImxvZ3NcIiwgXCJ1bmRlcnRha2VuXCIsIFwidGdwXCIsIFwiaGF6YXJkXCIsIFwicmV0cm9cIiwgXCJsZW9cIiwgXCJsaXZlc2V4XCIsIFwic3RhdGV3aWRlXCIsIFwic2VtaWNvbmR1Y3RvclwiLCBcImdyZWdvcnlcIiwgXCJlcGlzb2Rlc1wiLCBcImJvb2xlYW5cIiwgXCJjaXJjdWxhclwiLCBcImFuZ2VyXCIsIFwiZGl5XCIsIFwibWFpbmxhbmRcIiwgXCJpbGx1c3RyYXRpb25zXCIsIFwic3VpdHNcIiwgXCJjaGFuY2VzXCIsIFwiaW50ZXJhY3RcIiwgXCJzbmFwXCIsIFwiaGFwcGluZXNzXCIsIFwiYXJnXCIsIFwic3Vic3RhbnRpYWxseVwiLCBcImJpemFycmVcIiwgXCJnbGVublwiLCBcInVyXCIsIFwiYXVja2xhbmRcIiwgXCJvbHltcGljc1wiLCBcImZydWl0c1wiLCBcImlkZW50aWZpZXJcIiwgXCJnZW9cIiwgXCJ3b3JsZHNleFwiLCBcInJpYmJvblwiLCBcImNhbGN1bGF0aW9uc1wiLCBcImRvZVwiLCBcImpwZWdcIiwgXCJjb25kdWN0aW5nXCIsIFwic3RhcnR1cFwiLCBcInN1enVraVwiLCBcInRyaW5pZGFkXCIsIFwiYXRpXCIsIFwia2lzc2luZ1wiLCBcIndhbFwiLCBcImhhbmR5XCIsIFwic3dhcFwiLCBcImV4ZW1wdFwiLCBcImNyb3BzXCIsIFwicmVkdWNlc1wiLCBcImFjY29tcGxpc2hlZFwiLCBcImNhbGN1bGF0b3JzXCIsIFwiZ2VvbWV0cnlcIiwgXCJpbXByZXNzaW9uXCIsIFwiYWJzXCIsIFwic2xvdmFraWFcIiwgXCJmbGlwXCIsIFwiZ3VpbGRcIiwgXCJjb3JyZWxhdGlvblwiLCBcImdvcmdlb3VzXCIsIFwiY2FwaXRvbFwiLCBcInNpbVwiLCBcImRpc2hlc1wiLCBcInJuYVwiLCBcImJhcmJhZG9zXCIsIFwiY2hyeXNsZXJcIiwgXCJuZXJ2b3VzXCIsIFwicmVmdXNlXCIsIFwiZXh0ZW5kc1wiLCBcImZyYWdyYW5jZVwiLCBcIm1jZG9uYWxkXCIsIFwicmVwbGljYVwiLCBcInBsdW1iaW5nXCIsIFwiYnJ1c3NlbHNcIiwgXCJ0cmliZVwiLCBcIm5laWdoYm9yc1wiLCBcInRyYWRlc1wiLCBcInN1cGVyYlwiLCBcImJ1enpcIiwgXCJ0cmFuc3BhcmVudFwiLCBcIm51a2VcIiwgXCJyaWRcIiwgXCJ0cmluaXR5XCIsIFwiY2hhcmxlc3RvblwiLCBcImhhbmRsZWRcIiwgXCJsZWdlbmRzXCIsIFwiYm9vbVwiLCBcImNhbG1cIiwgXCJjaGFtcGlvbnNcIiwgXCJmbG9vcnNcIiwgXCJzZWxlY3Rpb25zXCIsIFwicHJvamVjdG9yc1wiLCBcImluYXBwcm9wcmlhdGVcIiwgXCJleGhhdXN0XCIsIFwiY29tcGFyaW5nXCIsIFwic2hhbmdoYWlcIiwgXCJzcGVha3NcIiwgXCJidXJ0b25cIiwgXCJ2b2NhdGlvbmFsXCIsIFwiZGF2aWRzb25cIiwgXCJjb3BpZWRcIiwgXCJzY290aWFcIiwgXCJmYXJtaW5nXCIsIFwiZ2lic29uXCIsIFwicGhhcm1hY2llc1wiLCBcImZvcmtcIiwgXCJ0cm95XCIsIFwibG5cIiwgXCJyb2xsZXJcIiwgXCJpbnRyb2R1Y2luZ1wiLCBcImJhdGNoXCIsIFwib3JnYW5pemVcIiwgXCJhcHByZWNpYXRlZFwiLCBcImFsdGVyXCIsIFwibmljb2xlXCIsIFwibGF0aW5vXCIsIFwiZ2hhbmFcIiwgXCJlZGdlc1wiLCBcInVjXCIsIFwibWl4aW5nXCIsIFwiaGFuZGxlc1wiLCBcInNraWxsZWRcIiwgXCJmaXR0ZWRcIiwgXCJhbGJ1cXVlcnF1ZVwiLCBcImhhcm1vbnlcIiwgXCJkaXN0aW5ndWlzaGVkXCIsIFwiYXN0aG1hXCIsIFwicHJvamVjdGVkXCIsIFwiYXNzdW1wdGlvbnNcIiwgXCJzaGFyZWhvbGRlcnNcIiwgXCJ0d2luc1wiLCBcImRldmVsb3BtZW50YWxcIiwgXCJyaXBcIiwgXCJ6b3BlXCIsIFwicmVndWxhdGVkXCIsIFwidHJpYW5nbGVcIiwgXCJhbWVuZFwiLCBcImFudGljaXBhdGVkXCIsIFwib3JpZW50YWxcIiwgXCJyZXdhcmRcIiwgXCJ3aW5kc29yXCIsIFwiemFtYmlhXCIsIFwiY29tcGxldGluZ1wiLCBcImdtYmhcIiwgXCJidWZcIiwgXCJsZFwiLCBcImh5ZHJvZ2VuXCIsIFwid2Vic2hvdHNcIiwgXCJzcHJpbnRcIiwgXCJjb21wYXJhYmxlXCIsIFwiY2hpY2tcIiwgXCJhZHZvY2F0ZVwiLCBcInNpbXNcIiwgXCJjb25mdXNpb25cIiwgXCJjb3B5cmlnaHRlZFwiLCBcInRyYXlcIiwgXCJpbnB1dHNcIiwgXCJ3YXJyYW50aWVzXCIsIFwiZ2Vub21lXCIsIFwiZXNjb3J0c1wiLCBcImRvY3VtZW50ZWRcIiwgXCJ0aG9uZ1wiLCBcIm1lZGFsXCIsIFwicGFwZXJiYWNrc1wiLCBcImNvYWNoZXNcIiwgXCJ2ZXNzZWxzXCIsIFwiaGFyYm91clwiLCBcIndhbGtzXCIsIFwic3Vja3NcIiwgXCJzb2xcIiwgXCJrZXlib2FyZHNcIiwgXCJzYWdlXCIsIFwia25pdmVzXCIsIFwiZWNvXCIsIFwidnVsbmVyYWJsZVwiLCBcImFycmFuZ2VcIiwgXCJhcnRpc3RpY1wiLCBcImJhdFwiLCBcImhvbm9yc1wiLCBcImJvb3RoXCIsIFwiaW5kaWVcIiwgXCJyZWZsZWN0ZWRcIiwgXCJ1bmlmaWVkXCIsIFwiYm9uZXNcIiwgXCJicmVlZFwiLCBcImRldGVjdG9yXCIsIFwiaWdub3JlZFwiLCBcInBvbGFyXCIsIFwiZmFsbGVuXCIsIFwicHJlY2lzZVwiLCBcInN1c3NleFwiLCBcInJlc3BpcmF0b3J5XCIsIFwibm90aWZpY2F0aW9uc1wiLCBcIm1zZ2lkXCIsIFwidHJhbnNleHVhbFwiLCBcIm1haW5zdHJlYW1cIiwgXCJpbnZvaWNlXCIsIFwiZXZhbHVhdGluZ1wiLCBcImxpcFwiLCBcInN1YmNvbW1pdHRlZVwiLCBcInNhcFwiLCBcImdhdGhlclwiLCBcInN1c2VcIiwgXCJtYXRlcm5pdHlcIiwgXCJiYWNrZWRcIiwgXCJhbGZyZWRcIiwgXCJjb2xvbmlhbFwiLCBcIm1mXCIsIFwiY2FyZXlcIiwgXCJtb3RlbHNcIiwgXCJmb3JtaW5nXCIsIFwiZW1iYXNzeVwiLCBcImNhdmVcIiwgXCJqb3VybmFsaXN0c1wiLCBcImRhbm55XCIsIFwicmViZWNjYVwiLCBcInNsaWdodFwiLCBcInByb2NlZWRzXCIsIFwiaW5kaXJlY3RcIiwgXCJhbW9uZ3N0XCIsIFwid29vbFwiLCBcImZvdW5kYXRpb25zXCIsIFwibXNnc3RyXCIsIFwiYXJyZXN0XCIsIFwidm9sbGV5YmFsbFwiLCBcIm13XCIsIFwiYWRpcGV4XCIsIFwiaG9yaXpvblwiLCBcIm51XCIsIFwiZGVlcGx5XCIsIFwidG9vbGJveFwiLCBcImljdFwiLCBcIm1hcmluYVwiLCBcImxpYWJpbGl0aWVzXCIsIFwicHJpemVzXCIsIFwiYm9zbmlhXCIsIFwiYnJvd3NlcnNcIiwgXCJkZWNyZWFzZWRcIiwgXCJwYXRpb1wiLCBcImRwXCIsIFwidG9sZXJhbmNlXCIsIFwic3VyZmluZ1wiLCBcImNyZWF0aXZpdHlcIiwgXCJsbG95ZFwiLCBcImRlc2NyaWJpbmdcIiwgXCJvcHRpY3NcIiwgXCJwdXJzdWVcIiwgXCJsaWdodG5pbmdcIiwgXCJvdmVyY29tZVwiLCBcImV5ZWRcIiwgXCJvdVwiLCBcInF1b3RhdGlvbnNcIiwgXCJncmFiXCIsIFwiaW5zcGVjdG9yXCIsIFwiYXR0cmFjdFwiLCBcImJyaWdodG9uXCIsIFwiYmVhbnNcIiwgXCJib29rbWFya3NcIiwgXCJlbGxpc1wiLCBcImRpc2FibGVcIiwgXCJzbmFrZVwiLCBcInN1Y2NlZWRcIiwgXCJsZW9uYXJkXCIsIFwibGVuZGluZ1wiLCBcIm9vcHNcIiwgXCJyZW1pbmRlclwiLCBcIm5pcHBsZVwiLCBcInhpXCIsIFwic2VhcmNoZWRcIiwgXCJiZWhhdmlvcmFsXCIsIFwicml2ZXJzaWRlXCIsIFwiYmF0aHJvb21zXCIsIFwicGxhaW5zXCIsIFwic2t1XCIsIFwiaHRcIiwgXCJyYXltb25kXCIsIFwiaW5zaWdodHNcIiwgXCJhYmlsaXRpZXNcIiwgXCJpbml0aWF0ZWRcIiwgXCJzdWxsaXZhblwiLCBcInphXCIsIFwibWlkd2VzdFwiLCBcImthcmFva2VcIiwgXCJ0cmFwXCIsIFwibG9uZWx5XCIsIFwiZm9vbFwiLCBcInZlXCIsIFwibm9ucHJvZml0XCIsIFwibGFuY2FzdGVyXCIsIFwic3VzcGVuZGVkXCIsIFwiaGVyZWJ5XCIsIFwib2JzZXJ2ZVwiLCBcImp1bGlhXCIsIFwiY29udGFpbmVyc1wiLCBcImF0dGl0dWRlc1wiLCBcImthcmxcIiwgXCJiZXJyeVwiLCBcImNvbGxhclwiLCBcInNpbXVsdGFuZW91c2x5XCIsIFwicmFjaWFsXCIsIFwiaW50ZWdyYXRlXCIsIFwiYmVybXVkYVwiLCBcImFtYW5kYVwiLCBcInNvY2lvbG9neVwiLCBcIm1vYmlsZXNcIiwgXCJzY3JlZW5zaG90XCIsIFwiZXhoaWJpdGlvbnNcIiwgXCJrZWxrb29cIiwgXCJjb25maWRlbnRcIiwgXCJyZXRyaWV2ZWRcIiwgXCJleGhpYml0c1wiLCBcIm9mZmljaWFsbHlcIiwgXCJjb25zb3J0aXVtXCIsIFwiZGllc1wiLCBcInRlcnJhY2VcIiwgXCJiYWN0ZXJpYVwiLCBcInB0c1wiLCBcInJlcGxpZWRcIiwgXCJzZWFmb29kXCIsIFwibm92ZWxzXCIsIFwicmhcIiwgXCJycnBcIiwgXCJyZWNpcGllbnRzXCIsIFwicGxheWJveVwiLCBcIm91Z2h0XCIsIFwiZGVsaWNpb3VzXCIsIFwidHJhZGl0aW9uc1wiLCBcImZnXCIsIFwiamFpbFwiLCBcInNhZmVseVwiLCBcImZpbml0ZVwiLCBcImtpZG5leVwiLCBcInBlcmlvZGljYWxseVwiLCBcImZpeGVzXCIsIFwic2VuZHNcIiwgXCJkdXJhYmxlXCIsIFwibWF6ZGFcIiwgXCJhbGxpZWRcIiwgXCJ0aHJvd3NcIiwgXCJtb2lzdHVyZVwiLCBcImh1bmdhcmlhblwiLCBcInJvc3RlclwiLCBcInJlZmVycmluZ1wiLCBcInN5bWFudGVjXCIsIFwic3BlbmNlclwiLCBcIndpY2hpdGFcIiwgXCJuYXNkYXFcIiwgXCJ1cnVndWF5XCIsIFwib29vXCIsIFwiaHpcIiwgXCJ0cmFuc2Zvcm1cIiwgXCJ0aW1lclwiLCBcInRhYmxldHNcIiwgXCJ0dW5pbmdcIiwgXCJnb3R0ZW5cIiwgXCJlZHVjYXRvcnNcIiwgXCJ0eWxlclwiLCBcImZ1dHVyZXNcIiwgXCJ2ZWdldGFibGVcIiwgXCJ2ZXJzZVwiLCBcImhpZ2hzXCIsIFwiaHVtYW5pdGllc1wiLCBcImluZGVwZW5kZW50bHlcIiwgXCJ3YW50aW5nXCIsIFwiY3VzdG9keVwiLCBcInNjcmF0Y2hcIiwgXCJsYXVuY2hlc1wiLCBcImlwYXFcIiwgXCJhbGlnbm1lbnRcIiwgXCJtYXN0dXJiYXRpbmdcIiwgXCJoZW5kZXJzb25cIiwgXCJia1wiLCBcImJyaXRhbm5pY2FcIiwgXCJjb21tXCIsIFwiZWxsZW5cIiwgXCJjb21wZXRpdG9yc1wiLCBcIm5oc1wiLCBcInJvY2tldFwiLCBcImF5ZVwiLCBcImJ1bGxldFwiLCBcInRvd2Vyc1wiLCBcInJhY2tzXCIsIFwibGFjZVwiLCBcIm5hc3R5XCIsIFwidmlzaWJpbGl0eVwiLCBcImxhdGl0dWRlXCIsIFwiY29uc2Npb3VzbmVzc1wiLCBcInN0ZVwiLCBcInR1bW9yXCIsIFwidWdseVwiLCBcImRlcG9zaXRzXCIsIFwiYmV2ZXJseVwiLCBcIm1pc3RyZXNzXCIsIFwiZW5jb3VudGVyXCIsIFwidHJ1c3RlZXNcIiwgXCJ3YXR0c1wiLCBcImR1bmNhblwiLCBcInJlcHJpbnRzXCIsIFwiaGFydFwiLCBcImJlcm5hcmRcIiwgXCJyZXNvbHV0aW9uc1wiLCBcIm1lbnRcIiwgXCJhY2Nlc3NpbmdcIiwgXCJmb3J0eVwiLCBcInR1YmVzXCIsIFwiYXR0ZW1wdGVkXCIsIFwiY29sXCIsIFwibWlkbGFuZHNcIiwgXCJwcmllc3RcIiwgXCJmbG95ZFwiLCBcInJvbmFsZFwiLCBcImFuYWx5c3RzXCIsIFwicXVldWVcIiwgXCJkeFwiLCBcInNrXCIsIFwidHJhbmNlXCIsIFwibG9jYWxlXCIsIFwibmljaG9sYXNcIiwgXCJiaW9sXCIsIFwieXVcIiwgXCJidW5kbGVcIiwgXCJoYW1tZXJcIiwgXCJpbnZhc2lvblwiLCBcIndpdG5lc3Nlc1wiLCBcInJ1bm5lclwiLCBcInJvd3NcIiwgXCJhZG1pbmlzdGVyZWRcIiwgXCJub3Rpb25cIiwgXCJzcVwiLCBcInNraW5zXCIsIFwibWFpbGVkXCIsIFwib2NcIiwgXCJmdWppdHN1XCIsIFwic3BlbGxpbmdcIiwgXCJhcmN0aWNcIiwgXCJleGFtc1wiLCBcInJld2FyZHNcIiwgXCJiZW5lYXRoXCIsIFwic3RyZW5ndGhlblwiLCBcImRlZmVuZFwiLCBcImFqXCIsIFwiZnJlZGVyaWNrXCIsIFwibWVkaWNhaWRcIiwgXCJ0cmVvXCIsIFwiaW5mcmFyZWRcIiwgXCJzZXZlbnRoXCIsIFwiZ29kc1wiLCBcInVuZVwiLCBcIndlbHNoXCIsIFwiYmVsbHlcIiwgXCJhZ2dyZXNzaXZlXCIsIFwidGV4XCIsIFwiYWR2ZXJ0aXNlbWVudHNcIiwgXCJxdWFydGVyc1wiLCBcInN0b2xlblwiLCBcImNpYVwiLCBcInN1YmxpbWVkaXJlY3RvcnlcIiwgXCJzb29uZXN0XCIsIFwiaGFpdGlcIiwgXCJkaXN0dXJiZWRcIiwgXCJkZXRlcm1pbmVzXCIsIFwic2N1bHB0dXJlXCIsIFwicG9seVwiLCBcImVhcnNcIiwgXCJkb2RcIiwgXCJ3cFwiLCBcImZpc3RcIiwgXCJuYXR1cmFsc1wiLCBcIm5lb1wiLCBcIm1vdGl2YXRpb25cIiwgXCJsZW5kZXJzXCIsIFwicGhhcm1hY29sb2d5XCIsIFwiZml0dGluZ1wiLCBcImZpeHR1cmVzXCIsIFwiYmxvZ2dlcnNcIiwgXCJtZXJlXCIsIFwiYWdyZWVzXCIsIFwicGFzc2VuZ2Vyc1wiLCBcInF1YW50aXRpZXNcIiwgXCJwZXRlcnNidXJnXCIsIFwiY29uc2lzdGVudGx5XCIsIFwicG93ZXJwb2ludFwiLCBcImNvbnNcIiwgXCJzdXJwbHVzXCIsIFwiZWxkZXJcIiwgXCJzb25pY1wiLCBcIm9iaXR1YXJpZXNcIiwgXCJjaGVlcnNcIiwgXCJkaWdcIiwgXCJ0YXhpXCIsIFwicHVuaXNobWVudFwiLCBcImFwcHJlY2lhdGlvblwiLCBcInN1YnNlcXVlbnRseVwiLCBcIm9tXCIsIFwiYmVsYXJ1c1wiLCBcIm5hdFwiLCBcInpvbmluZ1wiLCBcImdyYXZpdHlcIiwgXCJwcm92aWRlbmNlXCIsIFwidGh1bWJcIiwgXCJyZXN0cmljdGlvblwiLCBcImluY29ycG9yYXRlXCIsIFwiYmFja2dyb3VuZHNcIiwgXCJ0cmVhc3VyZXJcIiwgXCJndWl0YXJzXCIsIFwiZXNzZW5jZVwiLCBcImZsb29yaW5nXCIsIFwibGlnaHR3ZWlnaHRcIiwgXCJldGhpb3BpYVwiLCBcInRwXCIsIFwibWlnaHR5XCIsIFwiYXRobGV0ZXNcIiwgXCJodW1hbml0eVwiLCBcInRyYW5zY3JpcHRpb25cIiwgXCJqbVwiLCBcImhvbG1lc1wiLCBcImNvbXBsaWNhdGlvbnNcIiwgXCJzY2hvbGFyc1wiLCBcImRwaVwiLCBcInNjcmlwdGluZ1wiLCBcImdpc1wiLCBcInJlbWVtYmVyZWRcIiwgXCJnYWxheHlcIiwgXCJjaGVzdGVyXCIsIFwic25hcHNob3RcIiwgXCJjYXJpbmdcIiwgXCJsb2NcIiwgXCJ3b3JuXCIsIFwic3ludGhldGljXCIsIFwic2hhd1wiLCBcInZwXCIsIFwic2VnbWVudHNcIiwgXCJ0ZXN0YW1lbnRcIiwgXCJleHBvXCIsIFwiZG9taW5hbnRcIiwgXCJ0d2lzdFwiLCBcInNwZWNpZmljc1wiLCBcIml0dW5lc1wiLCBcInN0b21hY2hcIiwgXCJwYXJ0aWFsbHlcIiwgXCJidXJpZWRcIiwgXCJjblwiLCBcIm5ld2JpZVwiLCBcIm1pbmltaXplXCIsIFwiZGFyd2luXCIsIFwicmFua3NcIiwgXCJ3aWxkZXJuZXNzXCIsIFwiZGVidXRcIiwgXCJnZW5lcmF0aW9uc1wiLCBcInRvdXJuYW1lbnRzXCIsIFwiYnJhZGxleVwiLCBcImRlbnlcIiwgXCJhbmF0b215XCIsIFwiYmFsaVwiLCBcImp1ZHlcIiwgXCJzcG9uc29yc2hpcFwiLCBcImhlYWRwaG9uZXNcIiwgXCJmcmFjdGlvblwiLCBcInRyaW9cIiwgXCJwcm9jZWVkaW5nXCIsIFwiY3ViZVwiLCBcImRlZmVjdHNcIiwgXCJ2b2xrc3dhZ2VuXCIsIFwidW5jZXJ0YWludHlcIiwgXCJicmVha2Rvd25cIiwgXCJtaWx0b25cIiwgXCJtYXJrZXJcIiwgXCJyZWNvbnN0cnVjdGlvblwiLCBcInN1YnNpZGlhcnlcIiwgXCJzdHJlbmd0aHNcIiwgXCJjbGFyaXR5XCIsIFwicnVnc1wiLCBcInNhbmRyYVwiLCBcImFkZWxhaWRlXCIsIFwiZW5jb3VyYWdpbmdcIiwgXCJmdXJuaXNoZWRcIiwgXCJtb25hY29cIiwgXCJzZXR0bGVkXCIsIFwiZm9sZGluZ1wiLCBcImVtaXJhdGVzXCIsIFwidGVycm9yaXN0c1wiLCBcImFpcmZhcmVcIiwgXCJjb21wYXJpc29uc1wiLCBcImJlbmVmaWNpYWxcIiwgXCJkaXN0cmlidXRpb25zXCIsIFwidmFjY2luZVwiLCBcImJlbGl6ZVwiLCBcImNyYXBcIiwgXCJmYXRlXCIsIFwidmlld3BpY3R1cmVcIiwgXCJwcm9taXNlZFwiLCBcInZvbHZvXCIsIFwicGVubnlcIiwgXCJyb2J1c3RcIiwgXCJib29raW5nc1wiLCBcInRocmVhdGVuZWRcIiwgXCJtaW5vbHRhXCIsIFwicmVwdWJsaWNhbnNcIiwgXCJkaXNjdXNzZXNcIiwgXCJndWlcIiwgXCJwb3J0ZXJcIiwgXCJncmFzXCIsIFwianVuZ2xlXCIsIFwidmVyXCIsIFwicm5cIiwgXCJyZXNwb25kZWRcIiwgXCJyaW1cIiwgXCJhYnN0cmFjdHNcIiwgXCJ6ZW5cIiwgXCJpdm9yeVwiLCBcImFscGluZVwiLCBcImRpc1wiLCBcInByZWRpY3Rpb25cIiwgXCJwaGFybWFjZXV0aWNhbHNcIiwgXCJhbmRhbGVcIiwgXCJmYWJ1bG91c1wiLCBcInJlbWl4XCIsIFwiYWxpYXNcIiwgXCJ0aGVzYXVydXNcIiwgXCJpbmRpdmlkdWFsbHlcIiwgXCJiYXR0bGVmaWVsZFwiLCBcImxpdGVyYWxseVwiLCBcIm5ld2VyXCIsIFwia2F5XCIsIFwiZWNvbG9naWNhbFwiLCBcInNwaWNlXCIsIFwib3ZhbFwiLCBcImltcGxpZXNcIiwgXCJjZ1wiLCBcInNvbWFcIiwgXCJzZXJcIiwgXCJjb29sZXJcIiwgXCJhcHByYWlzYWxcIiwgXCJjb25zaXN0aW5nXCIsIFwibWFyaXRpbWVcIiwgXCJwZXJpb2RpY1wiLCBcInN1Ym1pdHRpbmdcIiwgXCJvdmVyaGVhZFwiLCBcImFzY2lpXCIsIFwicHJvc3BlY3RcIiwgXCJzaGlwbWVudFwiLCBcImJyZWVkaW5nXCIsIFwiY2l0YXRpb25zXCIsIFwiZ2VvZ3JhcGhpY2FsXCIsIFwiZG9ub3JcIiwgXCJtb3phbWJpcXVlXCIsIFwidGVuc2lvblwiLCBcImhyZWZcIiwgXCJiZW56XCIsIFwidHJhc2hcIiwgXCJzaGFwZXNcIiwgXCJ3aWZpXCIsIFwidGllclwiLCBcImZ3ZFwiLCBcImVhcmxcIiwgXCJtYW5vclwiLCBcImVudmVsb3BlXCIsIFwiZGlhbmVcIiwgXCJob21lbGFuZFwiLCBcImRpc2NsYWltZXJzXCIsIFwiY2hhbXBpb25zaGlwc1wiLCBcImV4Y2x1ZGVkXCIsIFwiYW5kcmVhXCIsIFwiYnJlZWRzXCIsIFwicmFwaWRzXCIsIFwiZGlzY29cIiwgXCJzaGVmZmllbGRcIiwgXCJiYWlsZXlcIiwgXCJhdXNcIiwgXCJlbmRpZlwiLCBcImZpbmlzaGluZ1wiLCBcImVtb3Rpb25zXCIsIFwid2VsbGluZ3RvblwiLCBcImluY29taW5nXCIsIFwicHJvc3BlY3RzXCIsIFwibGV4bWFya1wiLCBcImNsZWFuZXJzXCIsIFwiYnVsZ2FyaWFuXCIsIFwiaHd5XCIsIFwiZXRlcm5hbFwiLCBcImNhc2hpZXJzXCIsIFwiZ3VhbVwiLCBcImNpdGVcIiwgXCJhYm9yaWdpbmFsXCIsIFwicmVtYXJrYWJsZVwiLCBcInJvdGF0aW9uXCIsIFwibmFtXCIsIFwicHJldmVudGluZ1wiLCBcInByb2R1Y3RpdmVcIiwgXCJib3VsZXZhcmRcIiwgXCJldWdlbmVcIiwgXCJpeFwiLCBcImdkcFwiLCBcInBpZ1wiLCBcIm1ldHJpY1wiLCBcImNvbXBsaWFudFwiLCBcIm1pbnVzXCIsIFwicGVuYWx0aWVzXCIsIFwiYmVubmV0dFwiLCBcImltYWdpbmF0aW9uXCIsIFwiaG90bWFpbFwiLCBcInJlZnVyYmlzaGVkXCIsIFwiam9zaHVhXCIsIFwiYXJtZW5pYVwiLCBcInZhcmllZFwiLCBcImdyYW5kZVwiLCBcImNsb3Nlc3RcIiwgXCJhY3RpdmF0ZWRcIiwgXCJhY3RyZXNzXCIsIFwibWVzc1wiLCBcImNvbmZlcmVuY2luZ1wiLCBcImFzc2lnblwiLCBcImFybXN0cm9uZ1wiLCBcInBvbGl0aWNpYW5zXCIsIFwidHJhY2tiYWNrc1wiLCBcImxpdFwiLCBcImFjY29tbW9kYXRlXCIsIFwidGlnZXJzXCIsIFwiYXVyb3JhXCIsIFwidW5hXCIsIFwic2xpZGVzXCIsIFwibWlsYW5cIiwgXCJwcmVtaWVyZVwiLCBcImxlbmRlclwiLCBcInZpbGxhZ2VzXCIsIFwic2hhZGVcIiwgXCJjaG9ydXNcIiwgXCJjaHJpc3RpbmVcIiwgXCJyaHl0aG1cIiwgXCJkaWdpdFwiLCBcImFyZ3VlZFwiLCBcImRpZXRhcnlcIiwgXCJzeW1waG9ueVwiLCBcImNsYXJrZVwiLCBcInN1ZGRlblwiLCBcImFjY2VwdGluZ1wiLCBcInByZWNpcGl0YXRpb25cIiwgXCJtYXJpbHluXCIsIFwibGlvbnNcIiwgXCJmaW5kbGF3XCIsIFwiYWRhXCIsIFwicG9vbHNcIiwgXCJ0YlwiLCBcImx5cmljXCIsIFwiY2xhaXJlXCIsIFwiaXNvbGF0aW9uXCIsIFwic3BlZWRzXCIsIFwic3VzdGFpbmVkXCIsIFwibWF0Y2hlZFwiLCBcImFwcHJveGltYXRlXCIsIFwicm9wZVwiLCBcImNhcnJvbGxcIiwgXCJyYXRpb25hbFwiLCBcInByb2dyYW1tZXJcIiwgXCJmaWdodGVyc1wiLCBcImNoYW1iZXJzXCIsIFwiZHVtcFwiLCBcImdyZWV0aW5nc1wiLCBcImluaGVyaXRlZFwiLCBcIndhcm1pbmdcIiwgXCJpbmNvbXBsZXRlXCIsIFwidm9jYWxzXCIsIFwiY2hyb25pY2xlXCIsIFwiZm91bnRhaW5cIiwgXCJjaHViYnlcIiwgXCJncmF2ZVwiLCBcImxlZ2l0aW1hdGVcIiwgXCJiaW9ncmFwaGllc1wiLCBcImJ1cm5lclwiLCBcInlyc1wiLCBcImZvb1wiLCBcImludmVzdGlnYXRvclwiLCBcImdiYVwiLCBcInBsYWludGlmZlwiLCBcImZpbm5pc2hcIiwgXCJnZW50bGVcIiwgXCJibVwiLCBcInByaXNvbmVyc1wiLCBcImRlZXBlclwiLCBcIm11c2xpbXNcIiwgXCJob3NlXCIsIFwibWVkaXRlcnJhbmVhblwiLCBcIm5pZ2h0bGlmZVwiLCBcImZvb3RhZ2VcIiwgXCJob3d0b1wiLCBcIndvcnRoeVwiLCBcInJldmVhbHNcIiwgXCJhcmNoaXRlY3RzXCIsIFwic2FpbnRzXCIsIFwiZW50cmVwcmVuZXVyXCIsIFwiY2Fycmllc1wiLCBcInNpZ1wiLCBcImZyZWVsYW5jZVwiLCBcImR1b1wiLCBcImV4Y2Vzc2l2ZVwiLCBcImRldm9uXCIsIFwic2NyZWVuc2F2ZXJcIiwgXCJoZWxlbmFcIiwgXCJzYXZlc1wiLCBcInJlZ2FyZGVkXCIsIFwidmFsdWF0aW9uXCIsIFwidW5leHBlY3RlZFwiLCBcImNpZ2FyZXR0ZVwiLCBcImZvZ1wiLCBcImNoYXJhY3RlcmlzdGljXCIsIFwibWFyaW9uXCIsIFwibG9iYnlcIiwgXCJlZ3lwdGlhblwiLCBcInR1bmlzaWFcIiwgXCJtZXRhbGxpY2FcIiwgXCJvdXRsaW5lZFwiLCBcImNvbnNlcXVlbnRseVwiLCBcImhlYWRsaW5lXCIsIFwidHJlYXRpbmdcIiwgXCJwdW5jaFwiLCBcImFwcG9pbnRtZW50c1wiLCBcInN0clwiLCBcImdvdHRhXCIsIFwiY293Ym95XCIsIFwibmFycmF0aXZlXCIsIFwiYmFocmFpblwiLCBcImVub3Jtb3VzXCIsIFwia2FybWFcIiwgXCJjb25zaXN0XCIsIFwiYmV0dHlcIiwgXCJxdWVlbnNcIiwgXCJhY2FkZW1pY3NcIiwgXCJwdWJzXCIsIFwicXVhbnRpdGF0aXZlXCIsIFwic2hlbWFsZXNcIiwgXCJsdWNhc1wiLCBcInNjcmVlbnNhdmVyc1wiLCBcInN1YmRpdmlzaW9uXCIsIFwidHJpYmVzXCIsIFwidmlwXCIsIFwiZGVmZWF0XCIsIFwiY2xpY2tzXCIsIFwiZGlzdGluY3Rpb25cIiwgXCJob25kdXJhc1wiLCBcIm5hdWdodHlcIiwgXCJoYXphcmRzXCIsIFwiaW5zdXJlZFwiLCBcImhhcnBlclwiLCBcImxpdmVzdG9ja1wiLCBcIm1hcmRpXCIsIFwiZXhlbXB0aW9uXCIsIFwidGVuYW50XCIsIFwic3VzdGFpbmFiaWxpdHlcIiwgXCJjYWJpbmV0c1wiLCBcInRhdHRvb1wiLCBcInNoYWtlXCIsIFwiYWxnZWJyYVwiLCBcInNoYWRvd3NcIiwgXCJob2xseVwiLCBcImZvcm1hdHRpbmdcIiwgXCJzaWxseVwiLCBcIm51dHJpdGlvbmFsXCIsIFwieWVhXCIsIFwibWVyY3lcIiwgXCJoYXJ0Zm9yZFwiLCBcImZyZWVseVwiLCBcIm1hcmN1c1wiLCBcInN1bnJpc2VcIiwgXCJ3cmFwcGluZ1wiLCBcIm1pbGRcIiwgXCJmdXJcIiwgXCJuaWNhcmFndWFcIiwgXCJ3ZWJsb2dzXCIsIFwidGltZWxpbmVcIiwgXCJ0YXJcIiwgXCJiZWxvbmdzXCIsIFwicmpcIiwgXCJyZWFkaWx5XCIsIFwiYWZmaWxpYXRpb25cIiwgXCJzb2NcIiwgXCJmZW5jZVwiLCBcIm51ZGlzdFwiLCBcImluZmluaXRlXCIsIFwiZGlhbmFcIiwgXCJlbnN1cmVzXCIsIFwicmVsYXRpdmVzXCIsIFwibGluZHNheVwiLCBcImNsYW5cIiwgXCJsZWdhbGx5XCIsIFwic2hhbWVcIiwgXCJzYXRpc2ZhY3RvcnlcIiwgXCJyZXZvbHV0aW9uYXJ5XCIsIFwiYnJhY2VsZXRzXCIsIFwic3luY1wiLCBcImNpdmlsaWFuXCIsIFwidGVsZXBob255XCIsIFwibWVzYVwiLCBcImZhdGFsXCIsIFwicmVtZWR5XCIsIFwicmVhbHRvcnNcIiwgXCJicmVhdGhpbmdcIiwgXCJicmllZmx5XCIsIFwidGhpY2tuZXNzXCIsIFwiYWRqdXN0bWVudHNcIiwgXCJncmFwaGljYWxcIiwgXCJnZW5pdXNcIiwgXCJkaXNjdXNzaW5nXCIsIFwiYWVyb3NwYWNlXCIsIFwiZmlnaHRlclwiLCBcIm1lYW5pbmdmdWxcIiwgXCJmbGVzaFwiLCBcInJldHJlYXRcIiwgXCJhZGFwdGVkXCIsIFwiYmFyZWx5XCIsIFwid2hlcmV2ZXJcIiwgXCJlc3RhdGVzXCIsIFwicnVnXCIsIFwiZGVtb2NyYXRcIiwgXCJib3JvdWdoXCIsIFwibWFpbnRhaW5zXCIsIFwiZmFpbGluZ1wiLCBcInNob3J0Y3V0c1wiLCBcImthXCIsIFwicmV0YWluZWRcIiwgXCJ2b3lldXJ3ZWJcIiwgXCJwYW1lbGFcIiwgXCJhbmRyZXdzXCIsIFwibWFyYmxlXCIsIFwiZXh0ZW5kaW5nXCIsIFwiamVzc2VcIiwgXCJzcGVjaWZpZXNcIiwgXCJodWxsXCIsIFwibG9naXRlY2hcIiwgXCJzdXJyZXlcIiwgXCJicmllZmluZ1wiLCBcImJlbGtpblwiLCBcImRlbVwiLCBcImFjY3JlZGl0YXRpb25cIiwgXCJ3YXZcIiwgXCJibGFja2JlcnJ5XCIsIFwiaGlnaGxhbmRcIiwgXCJtZWRpdGF0aW9uXCIsIFwibW9kdWxhclwiLCBcIm1pY3JvcGhvbmVcIiwgXCJtYWNlZG9uaWFcIiwgXCJjb21iaW5pbmdcIiwgXCJicmFuZG9uXCIsIFwiaW5zdHJ1bWVudGFsXCIsIFwiZ2lhbnRzXCIsIFwib3JnYW5pemluZ1wiLCBcInNoZWRcIiwgXCJiYWxsb29uXCIsIFwibW9kZXJhdG9yc1wiLCBcIndpbnN0b25cIiwgXCJtZW1vXCIsIFwiaGFtXCIsIFwic29sdmVkXCIsIFwidGlkZVwiLCBcImthemFraHN0YW5cIiwgXCJoYXdhaWlhblwiLCBcInN0YW5kaW5nc1wiLCBcInBhcnRpdGlvblwiLCBcImludmlzaWJsZVwiLCBcImdyYXR1aXRcIiwgXCJjb25zb2xlc1wiLCBcImZ1bmtcIiwgXCJmYmlcIiwgXCJxYXRhclwiLCBcIm1hZ25ldFwiLCBcInRyYW5zbGF0aW9uc1wiLCBcInBvcnNjaGVcIiwgXCJjYXltYW5cIiwgXCJqYWd1YXJcIiwgXCJyZWVsXCIsIFwic2hlZXJcIiwgXCJjb21tb2RpdHlcIiwgXCJwb3NpbmdcIiwgXCJ3YW5nXCIsIFwia2lsb21ldGVyc1wiLCBcInJwXCIsIFwiYmluZFwiLCBcInRoYW5rc2dpdmluZ1wiLCBcInJhbmRcIiwgXCJob3BraW5zXCIsIFwidXJnZW50XCIsIFwiZ3VhcmFudGVlc1wiLCBcImluZmFudHNcIiwgXCJnb3RoaWNcIiwgXCJjeWxpbmRlclwiLCBcIndpdGNoXCIsIFwiYnVja1wiLCBcImluZGljYXRpb25cIiwgXCJlaFwiLCBcImNvbmdyYXR1bGF0aW9uc1wiLCBcInRiYVwiLCBcImNvaGVuXCIsIFwic2llXCIsIFwidXNnc1wiLCBcInB1cHB5XCIsIFwia2F0aHlcIiwgXCJhY3JlXCIsIFwiZ3JhcGhzXCIsIFwic3Vycm91bmRcIiwgXCJjaWdhcmV0dGVzXCIsIFwicmV2ZW5nZVwiLCBcImV4cGlyZXNcIiwgXCJlbmVtaWVzXCIsIFwibG93c1wiLCBcImNvbnRyb2xsZXJzXCIsIFwiYXF1YVwiLCBcImNoZW5cIiwgXCJlbW1hXCIsIFwiY29uc3VsdGFuY3lcIiwgXCJmaW5hbmNlc1wiLCBcImFjY2VwdHNcIiwgXCJlbmpveWluZ1wiLCBcImNvbnZlbnRpb25zXCIsIFwiZXZhXCIsIFwicGF0cm9sXCIsIFwic21lbGxcIiwgXCJwZXN0XCIsIFwiaGNcIiwgXCJpdGFsaWFub1wiLCBcImNvb3JkaW5hdGVzXCIsIFwicmNhXCIsIFwiZnBcIiwgXCJjYXJuaXZhbFwiLCBcInJvdWdobHlcIiwgXCJzdGlja2VyXCIsIFwicHJvbWlzZXNcIiwgXCJyZXNwb25kaW5nXCIsIFwicmVlZlwiLCBcInBoeXNpY2FsbHlcIiwgXCJkaXZpZGVcIiwgXCJzdGFrZWhvbGRlcnNcIiwgXCJoeWRyb2NvZG9uZVwiLCBcImdzdFwiLCBcImNvbnNlY3V0aXZlXCIsIFwiY29ybmVsbFwiLCBcInNhdGluXCIsIFwiYm9uXCIsIFwiZGVzZXJ2ZVwiLCBcImF0dGVtcHRpbmdcIiwgXCJtYWlsdG9cIiwgXCJwcm9tb1wiLCBcImpqXCIsIFwicmVwcmVzZW50YXRpb25zXCIsIFwiY2hhblwiLCBcIndvcnJpZWRcIiwgXCJ0dW5lc1wiLCBcImdhcmJhZ2VcIiwgXCJjb21wZXRpbmdcIiwgXCJjb21iaW5lc1wiLCBcIm1hc1wiLCBcImJldGhcIiwgXCJicmFkZm9yZFwiLCBcImxlblwiLCBcInBocmFzZXNcIiwgXCJrYWlcIiwgXCJwZW5pbnN1bGFcIiwgXCJjaGVsc2VhXCIsIFwiYm9yaW5nXCIsIFwicmV5bm9sZHNcIiwgXCJkb21cIiwgXCJqaWxsXCIsIFwiYWNjdXJhdGVseVwiLCBcInNwZWVjaGVzXCIsIFwicmVhY2hlc1wiLCBcInNjaGVtYVwiLCBcImNvbnNpZGVyc1wiLCBcInNvZmFcIiwgXCJjYXRhbG9nc1wiLCBcIm1pbmlzdHJpZXNcIiwgXCJ2YWNhbmNpZXNcIiwgXCJxdWl6emVzXCIsIFwicGFybGlhbWVudGFyeVwiLCBcIm9ialwiLCBcInByZWZpeFwiLCBcImx1Y2lhXCIsIFwic2F2YW5uYWhcIiwgXCJiYXJyZWxcIiwgXCJ0eXBpbmdcIiwgXCJuZXJ2ZVwiLCBcImRhbnNcIiwgXCJwbGFuZXRzXCIsIFwiZGVmaWNpdFwiLCBcImJvdWxkZXJcIiwgXCJwb2ludGluZ1wiLCBcInJlbmV3XCIsIFwiY291cGxlZFwiLCBcInZpaWlcIiwgXCJteWFubWFyXCIsIFwibWV0YWRhdGFcIiwgXCJoYXJvbGRcIiwgXCJjaXJjdWl0c1wiLCBcImZsb3BweVwiLCBcInRleHR1cmVcIiwgXCJoYW5kYmFnc1wiLCBcImphclwiLCBcImV2XCIsIFwic29tZXJzZXRcIiwgXCJpbmN1cnJlZFwiLCBcImFja25vd2xlZGdlXCIsIFwidGhvcm91Z2hseVwiLCBcImFudGlndWFcIiwgXCJub3R0aW5naGFtXCIsIFwidGh1bmRlclwiLCBcInRlbnRcIiwgXCJjYXV0aW9uXCIsIFwiaWRlbnRpZmllc1wiLCBcInF1ZXN0aW9ubmFpcmVcIiwgXCJxdWFsaWZpY2F0aW9uXCIsIFwibG9ja3NcIiwgXCJtb2RlbGxpbmdcIiwgXCJuYW1lbHlcIiwgXCJtaW5pYXR1cmVcIiwgXCJkZXB0XCIsIFwiaGFja1wiLCBcImRhcmVcIiwgXCJldXJvc1wiLCBcImludGVyc3RhdGVcIiwgXCJwaXJhdGVzXCIsIFwiYWVyaWFsXCIsIFwiaGF3a1wiLCBcImNvbnNlcXVlbmNlXCIsIFwicmViZWxcIiwgXCJzeXN0ZW1hdGljXCIsIFwicGVyY2VpdmVkXCIsIFwib3JpZ2luc1wiLCBcImhpcmVkXCIsIFwibWFrZXVwXCIsIFwidGV4dGlsZVwiLCBcImxhbWJcIiwgXCJtYWRhZ2FzY2FyXCIsIFwibmF0aGFuXCIsIFwidG9iYWdvXCIsIFwicHJlc2VudGluZ1wiLCBcImNvc1wiLCBcInRyb3VibGVzaG9vdGluZ1wiLCBcInV6YmVraXN0YW5cIiwgXCJpbmRleGVzXCIsIFwicGFjXCIsIFwicmxcIiwgXCJlcnBcIiwgXCJjZW50dXJpZXNcIiwgXCJnbFwiLCBcIm1hZ25pdHVkZVwiLCBcInVpXCIsIFwicmljaGFyZHNvblwiLCBcImhpbmR1XCIsIFwiZGhcIiwgXCJmcmFncmFuY2VzXCIsIFwidm9jYWJ1bGFyeVwiLCBcImxpY2tpbmdcIiwgXCJlYXJ0aHF1YWtlXCIsIFwidnBuXCIsIFwiZnVuZHJhaXNpbmdcIiwgXCJmY2NcIiwgXCJtYXJrZXJzXCIsIFwid2VpZ2h0c1wiLCBcImFsYmFuaWFcIiwgXCJnZW9sb2dpY2FsXCIsIFwiYXNzZXNzaW5nXCIsIFwibGFzdGluZ1wiLCBcIndpY2tlZFwiLCBcImVkc1wiLCBcImludHJvZHVjZXNcIiwgXCJraWxsc1wiLCBcInJvb21tYXRlXCIsIFwid2ViY2Ftc1wiLCBcInB1c2hlZFwiLCBcIndlYm1hc3RlcnNcIiwgXCJyb1wiLCBcImRmXCIsIFwiY29tcHV0YXRpb25hbFwiLCBcImFjZGJlbnRpdHlcIiwgXCJwYXJ0aWNpcGF0ZWRcIiwgXCJqdW5rXCIsIFwiaGFuZGhlbGRzXCIsIFwid2F4XCIsIFwibHVjeVwiLCBcImFuc3dlcmluZ1wiLCBcImhhbnNcIiwgXCJpbXByZXNzZWRcIiwgXCJzbG9wZVwiLCBcInJlZ2dhZVwiLCBcImZhaWx1cmVzXCIsIFwicG9ldFwiLCBcImNvbnNwaXJhY3lcIiwgXCJzdXJuYW1lXCIsIFwidGhlb2xvZ3lcIiwgXCJuYWlsc1wiLCBcImV2aWRlbnRcIiwgXCJ3aGF0c1wiLCBcInJpZGVzXCIsIFwicmVoYWJcIiwgXCJlcGljXCIsIFwic2F0dXJuXCIsIFwib3JnYW5pemVyXCIsIFwibnV0XCIsIFwiYWxsZXJneVwiLCBcInNha2VcIiwgXCJ0d2lzdGVkXCIsIFwiY29tYmluYXRpb25zXCIsIFwicHJlY2VkaW5nXCIsIFwibWVyaXRcIiwgXCJlbnp5bWVcIiwgXCJjdW11bGF0aXZlXCIsIFwienNob3BzXCIsIFwicGxhbmVzXCIsIFwiZWRtb250b25cIiwgXCJ0YWNrbGVcIiwgXCJkaXNrc1wiLCBcImNvbmRvXCIsIFwicG9rZW1vblwiLCBcImFtcGxpZmllclwiLCBcImFtYmllblwiLCBcImFyYml0cmFyeVwiLCBcInByb21pbmVudFwiLCBcInJldHJpZXZlXCIsIFwibGV4aW5ndG9uXCIsIFwidmVybm9uXCIsIFwic2Fuc1wiLCBcIndvcmxkY2F0XCIsIFwidGl0YW5pdW1cIiwgXCJpcnNcIiwgXCJmYWlyeVwiLCBcImJ1aWxkc1wiLCBcImNvbnRhY3RlZFwiLCBcInNoYWZ0XCIsIFwibGVhblwiLCBcImJ5ZVwiLCBcImNkdFwiLCBcInJlY29yZGVyc1wiLCBcIm9jY2FzaW9uYWxcIiwgXCJsZXNsaWVcIiwgXCJjYXNpb1wiLCBcImRldXRzY2hlXCIsIFwiYW5hXCIsIFwicG9zdGluZ3NcIiwgXCJpbm5vdmF0aW9uc1wiLCBcImtpdHR5XCIsIFwicG9zdGNhcmRzXCIsIFwiZHVkZVwiLCBcImRyYWluXCIsIFwibW9udGVcIiwgXCJmaXJlc1wiLCBcImFsZ2VyaWFcIiwgXCJibGVzc2VkXCIsIFwibHVpc1wiLCBcInJldmlld2luZ1wiLCBcImNhcmRpZmZcIiwgXCJjb3Jud2FsbFwiLCBcImZhdm9yc1wiLCBcInBvdGF0b1wiLCBcInBhbmljXCIsIFwiZXhwbGljaXRseVwiLCBcInN0aWNrc1wiLCBcImxlb25lXCIsIFwidHJhbnNzZXh1YWxcIiwgXCJlelwiLCBcImNpdGl6ZW5zaGlwXCIsIFwiZXhjdXNlXCIsIFwicmVmb3Jtc1wiLCBcImJhc2VtZW50XCIsIFwib25pb25cIiwgXCJzdHJhbmRcIiwgXCJwZlwiLCBcInNhbmR3aWNoXCIsIFwidXdcIiwgXCJsYXdzdWl0XCIsIFwiYWx0b1wiLCBcImluZm9ybWF0aXZlXCIsIFwiZ2lybGZyaWVuZFwiLCBcImJsb29tYmVyZ1wiLCBcImNoZXF1ZVwiLCBcImhpZXJhcmNoeVwiLCBcImluZmx1ZW5jZWRcIiwgXCJiYW5uZXJzXCIsIFwicmVqZWN0XCIsIFwiZWF1XCIsIFwiYWJhbmRvbmVkXCIsIFwiYmRcIiwgXCJjaXJjbGVzXCIsIFwiaXRhbGljXCIsIFwiYmVhdHNcIiwgXCJtZXJyeVwiLCBcIm1pbFwiLCBcInNjdWJhXCIsIFwiZ29yZVwiLCBcImNvbXBsZW1lbnRcIiwgXCJjdWx0XCIsIFwiZGFzaFwiLCBcInBhc3NpdmVcIiwgXCJtYXVyaXRpdXNcIiwgXCJ2YWx1ZWRcIiwgXCJjYWdlXCIsIFwiY2hlY2tsaXN0XCIsIFwiYmFuZ2J1c1wiLCBcInJlcXVlc3RpbmdcIiwgXCJjb3VyYWdlXCIsIFwidmVyZGVcIiwgXCJsYXVkZXJkYWxlXCIsIFwic2NlbmFyaW9zXCIsIFwiZ2F6ZXR0ZVwiLCBcImhpdGFjaGlcIiwgXCJkaXZ4XCIsIFwiZXh0cmFjdGlvblwiLCBcImJhdG1hblwiLCBcImVsZXZhdGlvblwiLCBcImhlYXJpbmdzXCIsIFwiY29sZW1hblwiLCBcImh1Z2hcIiwgXCJsYXBcIiwgXCJ1dGlsaXphdGlvblwiLCBcImJldmVyYWdlc1wiLCBcImNhbGlicmF0aW9uXCIsIFwiamFrZVwiLCBcImV2YWxcIiwgXCJlZmZpY2llbnRseVwiLCBcImFuYWhlaW1cIiwgXCJwaW5nXCIsIFwidGV4dGJvb2tcIiwgXCJkcmllZFwiLCBcImVudGVydGFpbmluZ1wiLCBcInByZXJlcXVpc2l0ZVwiLCBcImx1dGhlclwiLCBcImZyb250aWVyXCIsIFwic2V0dGxlXCIsIFwic3RvcHBpbmdcIiwgXCJyZWZ1Z2Vlc1wiLCBcImtuaWdodHNcIiwgXCJoeXBvdGhlc2lzXCIsIFwicGFsbWVyXCIsIFwibWVkaWNpbmVzXCIsIFwiZmx1eFwiLCBcImRlcmJ5XCIsIFwic2FvXCIsIFwicGVhY2VmdWxcIiwgXCJhbHRlcmVkXCIsIFwicG9udGlhY1wiLCBcInJlZ3Jlc3Npb25cIiwgXCJkb2N0cmluZVwiLCBcInNjZW5pY1wiLCBcInRyYWluZXJzXCIsIFwibXV6ZVwiLCBcImVuaGFuY2VtZW50c1wiLCBcInJlbmV3YWJsZVwiLCBcImludGVyc2VjdGlvblwiLCBcInBhc3N3b3Jkc1wiLCBcInNld2luZ1wiLCBcImNvbnNpc3RlbmN5XCIsIFwiY29sbGVjdG9yc1wiLCBcImNvbmNsdWRlXCIsIFwicmVjb2duaXNlZFwiLCBcIm11bmljaFwiLCBcIm9tYW5cIiwgXCJjZWxlYnNcIiwgXCJnbWNcIiwgXCJwcm9wb3NlXCIsIFwiaGhcIiwgXCJhemVyYmFpamFuXCIsIFwibGlnaHRlclwiLCBcInJhZ2VcIiwgXCJhZHNsXCIsIFwidWhcIiwgXCJwcml4XCIsIFwiYXN0cm9sb2d5XCIsIFwiYWR2aXNvcnNcIiwgXCJwYXZpbGlvblwiLCBcInRhY3RpY3NcIiwgXCJ0cnVzdHNcIiwgXCJvY2N1cnJpbmdcIiwgXCJzdXBwbGVtZW50YWxcIiwgXCJ0cmF2ZWxsaW5nXCIsIFwidGFsZW50ZWRcIiwgXCJhbm5pZVwiLCBcInBpbGxvd1wiLCBcImluZHVjdGlvblwiLCBcImRlcmVrXCIsIFwicHJlY2lzZWx5XCIsIFwic2hvcnRlclwiLCBcImhhcmxleVwiLCBcInNwcmVhZGluZ1wiLCBcInByb3ZpbmNlc1wiLCBcInJlbHlpbmdcIiwgXCJmaW5hbHNcIiwgXCJwYXJhZ3VheVwiLCBcInN0ZWFsXCIsIFwicGFyY2VsXCIsIFwicmVmaW5lZFwiLCBcImZkXCIsIFwiYm9cIiwgXCJmaWZ0ZWVuXCIsIFwid2lkZXNwcmVhZFwiLCBcImluY2lkZW5jZVwiLCBcImZlYXJzXCIsIFwicHJlZGljdFwiLCBcImJvdXRpcXVlXCIsIFwiYWNyeWxpY1wiLCBcInJvbGxlZFwiLCBcInR1bmVyXCIsIFwiYXZvblwiLCBcImluY2lkZW50c1wiLCBcInBldGVyc29uXCIsIFwicmF5c1wiLCBcImFzblwiLCBcInNoYW5ub25cIiwgXCJ0b2RkbGVyXCIsIFwiZW5oYW5jaW5nXCIsIFwiZmxhdm9yXCIsIFwiYWxpa2VcIiwgXCJ3YWx0XCIsIFwiaG9tZWxlc3NcIiwgXCJob3JyaWJsZVwiLCBcImh1bmdyeVwiLCBcIm1ldGFsbGljXCIsIFwiYWNuZVwiLCBcImJsb2NrZWRcIiwgXCJpbnRlcmZlcmVuY2VcIiwgXCJ3YXJyaW9yc1wiLCBcInBhbGVzdGluZVwiLCBcImxpc3RwcmljZVwiLCBcImxpYnNcIiwgXCJ1bmRvXCIsIFwiY2FkaWxsYWNcIiwgXCJhdG1vc3BoZXJpY1wiLCBcIm1hbGF3aVwiLCBcIndtXCIsIFwicGtcIiwgXCJzYWdlbVwiLCBcImtub3dsZWRnZXN0b3JtXCIsIFwiZGFuYVwiLCBcImhhbG9cIiwgXCJwcG1cIiwgXCJjdXJ0aXNcIiwgXCJwYXJlbnRhbFwiLCBcInJlZmVyZW5jZWRcIiwgXCJzdHJpa2VzXCIsIFwibGVzc2VyXCIsIFwicHVibGljaXR5XCIsIFwibWFyYXRob25cIiwgXCJhbnRcIiwgXCJwcm9wb3NpdGlvblwiLCBcImdheXNcIiwgXCJwcmVzc2luZ1wiLCBcImdhc29saW5lXCIsIFwiYXB0XCIsIFwiZHJlc3NlZFwiLCBcInNjb3V0XCIsIFwiYmVsZmFzdFwiLCBcImV4ZWNcIiwgXCJkZWFsdFwiLCBcIm5pYWdhcmFcIiwgXCJpbmZcIiwgXCJlb3NcIiwgXCJ3YXJjcmFmdFwiLCBcImNoYXJtc1wiLCBcImNhdGFseXN0XCIsIFwidHJhZGVyXCIsIFwiYnVja3NcIiwgXCJhbGxvd2FuY2VcIiwgXCJ2Y3JcIiwgXCJkZW5pYWxcIiwgXCJ1cmlcIiwgXCJkZXNpZ25hdGlvblwiLCBcInRocm93blwiLCBcInByZXBhaWRcIiwgXCJyYWlzZXNcIiwgXCJnZW1cIiwgXCJkdXBsaWNhdGVcIiwgXCJlbGVjdHJvXCIsIFwiY3JpdGVyaW9uXCIsIFwiYmFkZ2VcIiwgXCJ3cmlzdFwiLCBcImNpdmlsaXphdGlvblwiLCBcImFuYWx5emVkXCIsIFwidmlldG5hbWVzZVwiLCBcImhlYXRoXCIsIFwidHJlbWVuZG91c1wiLCBcImJhbGxvdFwiLCBcImxleHVzXCIsIFwidmFyeWluZ1wiLCBcInJlbWVkaWVzXCIsIFwidmFsaWRpdHlcIiwgXCJ0cnVzdGVlXCIsIFwibWF1aVwiLCBcImhhbmRqb2JzXCIsIFwid2VpZ2h0ZWRcIiwgXCJhbmdvbGFcIiwgXCJzcXVpcnRcIiwgXCJwZXJmb3Jtc1wiLCBcInBsYXN0aWNzXCIsIFwicmVhbG1cIiwgXCJjb3JyZWN0ZWRcIiwgXCJqZW5ueVwiLCBcImhlbG1ldFwiLCBcInNhbGFyaWVzXCIsIFwicG9zdGNhcmRcIiwgXCJlbGVwaGFudFwiLCBcInllbWVuXCIsIFwiZW5jb3VudGVyZWRcIiwgXCJ0c3VuYW1pXCIsIFwic2Nob2xhclwiLCBcIm5pY2tlbFwiLCBcImludGVybmF0aW9uYWxseVwiLCBcInN1cnJvdW5kZWRcIiwgXCJwc2lcIiwgXCJidXNlc1wiLCBcImV4cGVkaWFcIiwgXCJnZW9sb2d5XCIsIFwicGN0XCIsIFwid2JcIiwgXCJjcmVhdHVyZXNcIiwgXCJjb2F0aW5nXCIsIFwiY29tbWVudGVkXCIsIFwid2FsbGV0XCIsIFwiY2xlYXJlZFwiLCBcInNtaWxpZXNcIiwgXCJ2aWRzXCIsIFwiYWNjb21wbGlzaFwiLCBcImJvYXRpbmdcIiwgXCJkcmFpbmFnZVwiLCBcInNoYWtpcmFcIiwgXCJjb3JuZXJzXCIsIFwiYnJvYWRlclwiLCBcInZlZ2V0YXJpYW5cIiwgXCJyb3VnZVwiLCBcInllYXN0XCIsIFwieWFsZVwiLCBcIm5ld2ZvdW5kbGFuZFwiLCBcInNuXCIsIFwicWxkXCIsIFwicGFzXCIsIFwiY2xlYXJpbmdcIiwgXCJpbnZlc3RpZ2F0ZWRcIiwgXCJka1wiLCBcImFtYmFzc2Fkb3JcIiwgXCJjb2F0ZWRcIiwgXCJpbnRlbmRcIiwgXCJzdGVwaGFuaWVcIiwgXCJjb250YWN0aW5nXCIsIFwidmVnZXRhdGlvblwiLCBcImRvb21cIiwgXCJmaW5kYXJ0aWNsZXNcIiwgXCJsb3Vpc2VcIiwgXCJrZW5ueVwiLCBcInNwZWNpYWxseVwiLCBcIm93ZW5cIiwgXCJyb3V0aW5lc1wiLCBcImhpdHRpbmdcIiwgXCJ5dWtvblwiLCBcImJlaW5nc1wiLCBcImJpdGVcIiwgXCJpc3NuXCIsIFwiYXF1YXRpY1wiLCBcInJlbGlhbmNlXCIsIFwiaGFiaXRzXCIsIFwic3RyaWtpbmdcIiwgXCJteXRoXCIsIFwiaW5mZWN0aW91c1wiLCBcInBvZGNhc3RzXCIsIFwic2luZ2hcIiwgXCJnaWdcIiwgXCJnaWxiZXJ0XCIsIFwic2FzXCIsIFwiZmVycmFyaVwiLCBcImNvbnRpbnVpdHlcIiwgXCJicm9va1wiLCBcImZ1XCIsIFwib3V0cHV0c1wiLCBcInBoZW5vbWVub25cIiwgXCJlbnNlbWJsZVwiLCBcImluc3VsaW5cIiwgXCJhc3N1cmVkXCIsIFwiYmlibGljYWxcIiwgXCJ3ZWVkXCIsIFwiY29uc2Npb3VzXCIsIFwiYWNjZW50XCIsIFwibXlzaW1vblwiLCBcImVsZXZlblwiLCBcIndpdmVzXCIsIFwiYW1iaWVudFwiLCBcInV0aWxpemVcIiwgXCJtaWxlYWdlXCIsIFwib2VjZFwiLCBcInByb3N0YXRlXCIsIFwiYWRhcHRvclwiLCBcImF1YnVyblwiLCBcInVubG9ja1wiLCBcImh5dW5kYWlcIiwgXCJwbGVkZ2VcIiwgXCJ2YW1waXJlXCIsIFwiYW5nZWxhXCIsIFwicmVsYXRlc1wiLCBcIm5pdHJvZ2VuXCIsIFwieGVyb3hcIiwgXCJkaWNlXCIsIFwibWVyZ2VyXCIsIFwic29mdGJhbGxcIiwgXCJyZWZlcnJhbHNcIiwgXCJxdWFkXCIsIFwiZG9ja1wiLCBcImRpZmZlcmVudGx5XCIsIFwiZmlyZXdpcmVcIiwgXCJtb2RzXCIsIFwibmV4dGVsXCIsIFwiZnJhbWluZ1wiLCBcIm9yZ2FuaXNlZFwiLCBcIm11c2ljaWFuXCIsIFwiYmxvY2tpbmdcIiwgXCJyd2FuZGFcIiwgXCJzb3J0c1wiLCBcImludGVncmF0aW5nXCIsIFwidnNuZXRcIiwgXCJsaW1pdGluZ1wiLCBcImRpc3BhdGNoXCIsIFwicmV2aXNpb25zXCIsIFwicGFwdWFcIiwgXCJyZXN0b3JlZFwiLCBcImhpbnRcIiwgXCJhcm1vclwiLCBcInJpZGVyc1wiLCBcImNoYXJnZXJzXCIsIFwicmVtYXJrXCIsIFwiZG96ZW5zXCIsIFwidmFyaWVzXCIsIFwibXNpZVwiLCBcInJlYXNvbmluZ1wiLCBcInduXCIsIFwibGl6XCIsIFwicmVuZGVyZWRcIiwgXCJwaWNraW5nXCIsIFwiY2hhcml0YWJsZVwiLCBcImd1YXJkc1wiLCBcImFubm90YXRlZFwiLCBcImNjZFwiLCBcInN2XCIsIFwiY29udmluY2VkXCIsIFwib3BlbmluZ3NcIiwgXCJidXlzXCIsIFwiYnVybGluZ3RvblwiLCBcInJlcGxhY2luZ1wiLCBcInJlc2VhcmNoZXJcIiwgXCJ3YXRlcnNoZWRcIiwgXCJjb3VuY2lsc1wiLCBcIm9jY3VwYXRpb25zXCIsIFwiYWNrbm93bGVkZ2VkXCIsIFwibnVkaXR5XCIsIFwia3J1Z2VyXCIsIFwicG9ja2V0c1wiLCBcImdyYW5ueVwiLCBcInBvcmtcIiwgXCJ6dVwiLCBcImVxdWlsaWJyaXVtXCIsIFwidmlyYWxcIiwgXCJpbnF1aXJlXCIsIFwicGlwZXNcIiwgXCJjaGFyYWN0ZXJpemVkXCIsIFwibGFkZW5cIiwgXCJhcnViYVwiLCBcImNvdHRhZ2VzXCIsIFwicmVhbHRvclwiLCBcIm1lcmdlXCIsIFwicHJpdmlsZWdlXCIsIFwiZWRnYXJcIiwgXCJkZXZlbG9wc1wiLCBcInF1YWxpZnlpbmdcIiwgXCJjaGFzc2lzXCIsIFwiZHViYWlcIiwgXCJlc3RpbWF0aW9uXCIsIFwiYmFyblwiLCBcInB1c2hpbmdcIiwgXCJsbHBcIiwgXCJmbGVlY2VcIiwgXCJwZWRpYXRyaWNcIiwgXCJib2NcIiwgXCJmYXJlXCIsIFwiZGdcIiwgXCJhc3VzXCIsIFwicGllcmNlXCIsIFwiYWxsYW5cIiwgXCJkcmVzc2luZ1wiLCBcInRlY2hyZXB1YmxpY1wiLCBcInNwZXJtXCIsIFwidmdcIiwgXCJiYWxkXCIsIFwiZmlsbWVcIiwgXCJjcmFwc1wiLCBcImZ1amlcIiwgXCJmcm9zdFwiLCBcImxlb25cIiwgXCJpbnN0aXR1dGVzXCIsIFwibW9sZFwiLCBcImRhbWVcIiwgXCJmb1wiLCBcInNhbGx5XCIsIFwieWFjaHRcIiwgXCJ0cmFjeVwiLCBcInByZWZlcnNcIiwgXCJkcmlsbGluZ1wiLCBcImJyb2NodXJlc1wiLCBcImhlcmJcIiwgXCJ0bXBcIiwgXCJhbG90XCIsIFwiYXRlXCIsIFwiYnJlYWNoXCIsIFwid2hhbGVcIiwgXCJ0cmF2ZWxsZXJcIiwgXCJhcHByb3ByaWF0aW9uc1wiLCBcInN1c3BlY3RlZFwiLCBcInRvbWF0b2VzXCIsIFwiYmVuY2htYXJrXCIsIFwiYmVnaW5uZXJzXCIsIFwiaW5zdHJ1Y3RvcnNcIiwgXCJoaWdobGlnaHRlZFwiLCBcImJlZGZvcmRcIiwgXCJzdGF0aW9uZXJ5XCIsIFwiaWRsZVwiLCBcIm11c3RhbmdcIiwgXCJ1bmF1dGhvcml6ZWRcIiwgXCJjbHVzdGVyc1wiLCBcImFudGlib2R5XCIsIFwiY29tcGV0ZW50XCIsIFwibW9tZW50dW1cIiwgXCJmaW5cIiwgXCJ3aXJpbmdcIiwgXCJpb1wiLCBcInBhc3RvclwiLCBcIm11ZFwiLCBcImNhbHZpblwiLCBcInVuaVwiLCBcInNoYXJrXCIsIFwiY29udHJpYnV0b3JcIiwgXCJkZW1vbnN0cmF0ZXNcIiwgXCJwaGFzZXNcIiwgXCJncmF0ZWZ1bFwiLCBcImVtZXJhbGRcIiwgXCJncmFkdWFsbHlcIiwgXCJsYXVnaGluZ1wiLCBcImdyb3dzXCIsIFwiY2xpZmZcIiwgXCJkZXNpcmFibGVcIiwgXCJ0cmFjdFwiLCBcInVsXCIsIFwiYmFsbGV0XCIsIFwib2xcIiwgXCJqb3VybmFsaXN0XCIsIFwiYWJyYWhhbVwiLCBcImpzXCIsIFwiYnVtcGVyXCIsIFwiYWZ0ZXJ3YXJkc1wiLCBcIndlYnBhZ2VcIiwgXCJyZWxpZ2lvbnNcIiwgXCJnYXJsaWNcIiwgXCJob3N0ZWxzXCIsIFwic2hpbmVcIiwgXCJzZW5lZ2FsXCIsIFwiZXhwbG9zaW9uXCIsIFwicG5cIiwgXCJiYW5uZWRcIiwgXCJ3ZW5keVwiLCBcImJyaWVmc1wiLCBcInNpZ25hdHVyZXNcIiwgXCJkaWZmc1wiLCBcImNvdmVcIiwgXCJtdW1iYWlcIiwgXCJvem9uZVwiLCBcImRpc2NpcGxpbmVzXCIsIFwiY2FzYVwiLCBcIm11XCIsIFwiZGF1Z2h0ZXJzXCIsIFwiY29udmVyc2F0aW9uc1wiLCBcInJhZGlvc1wiLCBcInRhcmlmZlwiLCBcIm52aWRpYVwiLCBcIm9wcG9uZW50XCIsIFwicGFzdGFcIiwgXCJzaW1wbGlmaWVkXCIsIFwibXVzY2xlc1wiLCBcInNlcnVtXCIsIFwid3JhcHBlZFwiLCBcInN3aWZ0XCIsIFwibW90aGVyYm9hcmRcIiwgXCJydW50aW1lXCIsIFwiaW5ib3hcIiwgXCJmb2NhbFwiLCBcImJpYmxpb2dyYXBoaWNcIiwgXCJ2YWdpbmFcIiwgXCJlZGVuXCIsIFwiZGlzdGFudFwiLCBcImluY2xcIiwgXCJjaGFtcGFnbmVcIiwgXCJhbGFcIiwgXCJkZWNpbWFsXCIsIFwiaHFcIiwgXCJkZXZpYXRpb25cIiwgXCJzdXBlcmludGVuZGVudFwiLCBcInByb3BlY2lhXCIsIFwiZGlwXCIsIFwibmJjXCIsIFwic2FtYmFcIiwgXCJob3N0ZWxcIiwgXCJob3VzZXdpdmVzXCIsIFwiZW1wbG95XCIsIFwibW9uZ29saWFcIiwgXCJwZW5ndWluXCIsIFwibWFnaWNhbFwiLCBcImluZmx1ZW5jZXNcIiwgXCJpbnNwZWN0aW9uc1wiLCBcImlycmlnYXRpb25cIiwgXCJtaXJhY2xlXCIsIFwibWFudWFsbHlcIiwgXCJyZXByaW50XCIsIFwicmVpZFwiLCBcInd0XCIsIFwiaHlkcmF1bGljXCIsIFwiY2VudGVyZWRcIiwgXCJyb2JlcnRzb25cIiwgXCJmbGV4XCIsIFwieWVhcmx5XCIsIFwicGVuZXRyYXRpb25cIiwgXCJ3b3VuZFwiLCBcImJlbGxlXCIsIFwicm9zYVwiLCBcImNvbnZpY3Rpb25cIiwgXCJoYXNoXCIsIFwib21pc3Npb25zXCIsIFwid3JpdGluZ3NcIiwgXCJoYW1idXJnXCIsIFwibGF6eVwiLCBcIm12XCIsIFwibXBnXCIsIFwicmV0cmlldmFsXCIsIFwicXVhbGl0aWVzXCIsIFwiY2luZHlcIiwgXCJsb2xpdGFcIiwgXCJmYXRoZXJzXCIsIFwiY2FyYlwiLCBcImNoYXJnaW5nXCIsIFwiY2FzXCIsIFwibWFydmVsXCIsIFwibGluZWRcIiwgXCJjaW9cIiwgXCJkb3dcIiwgXCJwcm90b3R5cGVcIiwgXCJpbXBvcnRhbnRseVwiLCBcInJiXCIsIFwicGV0aXRlXCIsIFwiYXBwYXJhdHVzXCIsIFwidXBjXCIsIFwidGVycmFpblwiLCBcImR1aVwiLCBcInBlbnNcIiwgXCJleHBsYWluaW5nXCIsIFwieWVuXCIsIFwic3RyaXBzXCIsIFwiZ29zc2lwXCIsIFwicmFuZ2Vyc1wiLCBcIm5vbWluYXRpb25cIiwgXCJlbXBpcmljYWxcIiwgXCJtaFwiLCBcInJvdGFyeVwiLCBcIndvcm1cIiwgXCJkZXBlbmRlbmNlXCIsIFwiZGlzY3JldGVcIiwgXCJiZWdpbm5lclwiLCBcImJveGVkXCIsIFwibGlkXCIsIFwic2V4dWFsaXR5XCIsIFwicG9seWVzdGVyXCIsIFwiY3ViaWNcIiwgXCJkZWFmXCIsIFwiY29tbWl0bWVudHNcIiwgXCJzdWdnZXN0aW5nXCIsIFwic2FwcGhpcmVcIiwgXCJraW5hc2VcIiwgXCJza2lydHNcIiwgXCJtYXRzXCIsIFwicmVtYWluZGVyXCIsIFwiY3Jhd2ZvcmRcIiwgXCJsYWJlbGVkXCIsIFwicHJpdmlsZWdlc1wiLCBcInRlbGV2aXNpb25zXCIsIFwic3BlY2lhbGl6aW5nXCIsIFwibWFya2luZ1wiLCBcImNvbW1vZGl0aWVzXCIsIFwicHZjXCIsIFwic2VyYmlhXCIsIFwic2hlcmlmZlwiLCBcImdyaWZmaW5cIiwgXCJkZWNsaW5lZFwiLCBcImd1eWFuYVwiLCBcInNwaWVzXCIsIFwiYmxhaFwiLCBcIm1pbWVcIiwgXCJuZWlnaGJvclwiLCBcIm1vdG9yY3ljbGVzXCIsIFwiZWxlY3RcIiwgXCJoaWdod2F5c1wiLCBcInRoaW5rcGFkXCIsIFwiY29uY2VudHJhdGVcIiwgXCJpbnRpbWF0ZVwiLCBcInJlcHJvZHVjdGl2ZVwiLCBcInByZXN0b25cIiwgXCJkZWFkbHlcIiwgXCJjdW50XCIsIFwiZmVvZlwiLCBcImJ1bm55XCIsIFwiY2hldnlcIiwgXCJtb2xlY3VsZXNcIiwgXCJyb3VuZHNcIiwgXCJsb25nZXN0XCIsIFwicmVmcmlnZXJhdG9yXCIsIFwidGlvbnNcIiwgXCJpbnRlcnZhbHNcIiwgXCJzZW50ZW5jZXNcIiwgXCJkZW50aXN0c1wiLCBcInVzZGFcIiwgXCJleGNsdXNpb25cIiwgXCJ3b3Jrc3RhdGlvblwiLCBcImhvbG9jYXVzdFwiLCBcImtlZW5cIiwgXCJmbHllclwiLCBcInBlYXNcIiwgXCJkb3NhZ2VcIiwgXCJyZWNlaXZlcnNcIiwgXCJ1cmxzXCIsIFwiY3VzdG9taXNlXCIsIFwiZGlzcG9zaXRpb25cIiwgXCJ2YXJpYW5jZVwiLCBcIm5hdmlnYXRvclwiLCBcImludmVzdGlnYXRvcnNcIiwgXCJjYW1lcm9vblwiLCBcImJha2luZ1wiLCBcIm1hcmlqdWFuYVwiLCBcImFkYXB0aXZlXCIsIFwiY29tcHV0ZWRcIiwgXCJuZWVkbGVcIiwgXCJiYXRoc1wiLCBcImVuYlwiLCBcImdnXCIsIFwiY2F0aGVkcmFsXCIsIFwiYnJha2VzXCIsIFwib2dcIiwgXCJuaXJ2YW5hXCIsIFwia29cIiwgXCJmYWlyZmllbGRcIiwgXCJvd25zXCIsIFwidGlsXCIsIFwiaW52aXNpb25cIiwgXCJzdGlja3lcIiwgXCJkZXN0aW55XCIsIFwiZ2VuZXJvdXNcIiwgXCJtYWRuZXNzXCIsIFwiZW1hY3NcIiwgXCJjbGltYlwiLCBcImJsb3dpbmdcIiwgXCJmYXNjaW5hdGluZ1wiLCBcImxhbmRzY2FwZXNcIiwgXCJoZWF0ZWRcIiwgXCJsYWZheWV0dGVcIiwgXCJqYWNraWVcIiwgXCJ3dG9cIiwgXCJjb21wdXRhdGlvblwiLCBcImhheVwiLCBcImNhcmRpb3Zhc2N1bGFyXCIsIFwid3dcIiwgXCJzcGFyY1wiLCBcImNhcmRpYWNcIiwgXCJzYWx2YXRpb25cIiwgXCJkb3ZlclwiLCBcImFkcmlhblwiLCBcInByZWRpY3Rpb25zXCIsIFwiYWNjb21wYW55aW5nXCIsIFwidmF0aWNhblwiLCBcImJydXRhbFwiLCBcImxlYXJuZXJzXCIsIFwiZ2RcIiwgXCJzZWxlY3RpdmVcIiwgXCJhcmJpdHJhdGlvblwiLCBcImNvbmZpZ3VyaW5nXCIsIFwidG9rZW5cIiwgXCJlZGl0b3JpYWxzXCIsIFwiemluY1wiLCBcInNhY3JpZmljZVwiLCBcInNlZWtlcnNcIiwgXCJndXJ1XCIsIFwiaXNhXCIsIFwicmVtb3ZhYmxlXCIsIFwiY29udmVyZ2VuY2VcIiwgXCJ5aWVsZHNcIiwgXCJnaWJyYWx0YXJcIiwgXCJsZXZ5XCIsIFwic3VpdGVkXCIsIFwibnVtZXJpY1wiLCBcImFudGhyb3BvbG9neVwiLCBcInNrYXRpbmdcIiwgXCJraW5kYVwiLCBcImFiZXJkZWVuXCIsIFwiZW1wZXJvclwiLCBcImdyYWRcIiwgXCJtYWxwcmFjdGljZVwiLCBcImR5bGFuXCIsIFwiYnJhc1wiLCBcImJlbHRzXCIsIFwiYmxhY2tzXCIsIFwiZWR1Y2F0ZWRcIiwgXCJyZWJhdGVzXCIsIFwicmVwb3J0ZXJzXCIsIFwiYnVya2VcIiwgXCJwcm91ZGx5XCIsIFwicGl4XCIsIFwibmVjZXNzaXR5XCIsIFwicmVuZGVyaW5nXCIsIFwibWljXCIsIFwiaW5zZXJ0ZWRcIiwgXCJwdWxsaW5nXCIsIFwiYmFzZW5hbWVcIiwgXCJreWxlXCIsIFwib2Jlc2l0eVwiLCBcImN1cnZlc1wiLCBcInN1YnVyYmFuXCIsIFwidG91cmluZ1wiLCBcImNsYXJhXCIsIFwidmVydGV4XCIsIFwiYndcIiwgXCJoZXBhdGl0aXNcIiwgXCJuYXRpb25hbGx5XCIsIFwidG9tYXRvXCIsIFwiYW5kb3JyYVwiLCBcIndhdGVycHJvb2ZcIiwgXCJleHBpcmVkXCIsIFwibWpcIiwgXCJ0cmF2ZWxzXCIsIFwiZmx1c2hcIiwgXCJ3YWl2ZXJcIiwgXCJwYWxlXCIsIFwic3BlY2lhbHRpZXNcIiwgXCJoYXllc1wiLCBcImh1bWFuaXRhcmlhblwiLCBcImludml0YXRpb25zXCIsIFwiZnVuY3Rpb25pbmdcIiwgXCJkZWxpZ2h0XCIsIFwic3Vydml2b3JcIiwgXCJnYXJjaWFcIiwgXCJjaW5ndWxhclwiLCBcImVjb25vbWllc1wiLCBcImFsZXhhbmRyaWFcIiwgXCJiYWN0ZXJpYWxcIiwgXCJtb3Nlc1wiLCBcImNvdW50ZWRcIiwgXCJ1bmRlcnRha2VcIiwgXCJkZWNsYXJlXCIsIFwiY29udGludW91c2x5XCIsIFwiam9obnNcIiwgXCJ2YWx2ZXNcIiwgXCJnYXBzXCIsIFwiaW1wYWlyZWRcIiwgXCJhY2hpZXZlbWVudHNcIiwgXCJkb25vcnNcIiwgXCJ0ZWFyXCIsIFwiamV3ZWxcIiwgXCJ0ZWRkeVwiLCBcImxmXCIsIFwiY29udmVydGlibGVcIiwgXCJhdGFcIiwgXCJ0ZWFjaGVzXCIsIFwidmVudHVyZXNcIiwgXCJuaWxcIiwgXCJidWZpbmdcIiwgXCJzdHJhbmdlclwiLCBcInRyYWdlZHlcIiwgXCJqdWxpYW5cIiwgXCJuZXN0XCIsIFwicGFtXCIsIFwiZHJ5ZXJcIiwgXCJwYWluZnVsXCIsIFwidmVsdmV0XCIsIFwidHJpYnVuYWxcIiwgXCJydWxlZFwiLCBcIm5hdG9cIiwgXCJwZW5zaW9uc1wiLCBcInByYXllcnNcIiwgXCJmdW5reVwiLCBcInNlY3JldGFyaWF0XCIsIFwibm93aGVyZVwiLCBcImNvcFwiLCBcInBhcmFncmFwaHNcIiwgXCJnYWxlXCIsIFwiam9pbnNcIiwgXCJhZG9sZXNjZW50XCIsIFwibm9taW5hdGlvbnNcIiwgXCJ3ZXNsZXlcIiwgXCJkaW1cIiwgXCJsYXRlbHlcIiwgXCJjYW5jZWxsZWRcIiwgXCJzY2FyeVwiLCBcIm1hdHRyZXNzXCIsIFwibXBlZ3NcIiwgXCJicnVuZWlcIiwgXCJsaWtld2lzZVwiLCBcImJhbmFuYVwiLCBcImludHJvZHVjdG9yeVwiLCBcInNsb3Zha1wiLCBcImNha2VzXCIsIFwic3RhblwiLCBcInJlc2Vydm9pclwiLCBcIm9jY3VycmVuY2VcIiwgXCJpZG9sXCIsIFwiYmxvb2R5XCIsIFwibWl4ZXJcIiwgXCJyZW1pbmRcIiwgXCJ3Y1wiLCBcIndvcmNlc3RlclwiLCBcInNiamN0XCIsIFwiZGVtb2dyYXBoaWNcIiwgXCJjaGFybWluZ1wiLCBcIm1haVwiLCBcInRvb3RoXCIsIFwiZGlzY2lwbGluYXJ5XCIsIFwiYW5ub3lpbmdcIiwgXCJyZXNwZWN0ZWRcIiwgXCJzdGF5c1wiLCBcImRpc2Nsb3NlXCIsIFwiYWZmYWlyXCIsIFwiZHJvdmVcIiwgXCJ3YXNoZXJcIiwgXCJ1cHNldFwiLCBcInJlc3RyaWN0XCIsIFwic3ByaW5nZXJcIiwgXCJiZXNpZGVcIiwgXCJtaW5lc1wiLCBcInBvcnRyYWl0c1wiLCBcInJlYm91bmRcIiwgXCJsb2dhblwiLCBcIm1lbnRvclwiLCBcImludGVycHJldGVkXCIsIFwiZXZhbHVhdGlvbnNcIiwgXCJmb3VnaHRcIiwgXCJiYWdoZGFkXCIsIFwiZWxpbWluYXRpb25cIiwgXCJtZXRyZXNcIiwgXCJoeXBvdGhldGljYWxcIiwgXCJpbW1pZ3JhbnRzXCIsIFwiY29tcGxpbWVudGFyeVwiLCBcImhlbGljb3B0ZXJcIiwgXCJwZW5jaWxcIiwgXCJmcmVlemVcIiwgXCJoa1wiLCBcInBlcmZvcm1lclwiLCBcImFidVwiLCBcInRpdGxlZFwiLCBcImNvbW1pc3Npb25zXCIsIFwic3BoZXJlXCIsIFwicG93ZXJzZWxsZXJcIiwgXCJtb3NzXCIsIFwicmF0aW9zXCIsIFwiY29uY29yZFwiLCBcImdyYWR1YXRlZFwiLCBcImVuZG9yc2VkXCIsIFwidHlcIiwgXCJzdXJwcmlzaW5nXCIsIFwid2FsbnV0XCIsIFwibGFuY2VcIiwgXCJsYWRkZXJcIiwgXCJpdGFsaWFcIiwgXCJ1bm5lY2Vzc2FyeVwiLCBcImRyYW1hdGljYWxseVwiLCBcImxpYmVyaWFcIiwgXCJzaGVybWFuXCIsIFwiY29ya1wiLCBcIm1heGltaXplXCIsIFwiY2pcIiwgXCJoYW5zZW5cIiwgXCJzZW5hdG9yc1wiLCBcIndvcmtvdXRcIiwgXCJtYWxpXCIsIFwieXVnb3NsYXZpYVwiLCBcImJsZWVkaW5nXCIsIFwiY2hhcmFjdGVyaXphdGlvblwiLCBcImNvbG9uXCIsIFwibGlrZWxpaG9vZFwiLCBcImxhbmVzXCIsIFwicHVyc2VcIiwgXCJmdW5kYW1lbnRhbHNcIiwgXCJjb250YW1pbmF0aW9uXCIsIFwibXR2XCIsIFwiZW5kYW5nZXJlZFwiLCBcImNvbXByb21pc2VcIiwgXCJtYXN0dXJiYXRpb25cIiwgXCJvcHRpbWl6ZVwiLCBcInN0YXRpbmdcIiwgXCJkb21lXCIsIFwiY2Fyb2xpbmVcIiwgXCJsZXVcIiwgXCJleHBpcmF0aW9uXCIsIFwibmFtZXNwYWNlXCIsIFwiYWxpZ25cIiwgXCJwZXJpcGhlcmFsXCIsIFwiYmxlc3NcIiwgXCJlbmdhZ2luZ1wiLCBcIm5lZ290aWF0aW9uXCIsIFwiY3Jlc3RcIiwgXCJvcHBvbmVudHNcIiwgXCJ0cml1bXBoXCIsIFwibm9taW5hdGVkXCIsIFwiY29uZmlkZW50aWFsaXR5XCIsIFwiZWxlY3RvcmFsXCIsIFwiY2hhbmdlbG9nXCIsIFwid2VsZGluZ1wiLCBcIm9yZ2FzbVwiLCBcImRlZmVycmVkXCIsIFwiYWx0ZXJuYXRpdmVseVwiLCBcImhlZWxcIiwgXCJhbGxveVwiLCBcImNvbmRvc1wiLCBcInBsb3RzXCIsIFwicG9saXNoZWRcIiwgXCJ5YW5nXCIsIFwiZ2VudGx5XCIsIFwiZ3JlZW5zYm9yb1wiLCBcInR1bHNhXCIsIFwibG9ja2luZ1wiLCBcImNhc2V5XCIsIFwiY29udHJvdmVyc2lhbFwiLCBcImRyYXdzXCIsIFwiZnJpZGdlXCIsIFwiYmxhbmtldFwiLCBcImJsb29tXCIsIFwicWNcIiwgXCJzaW1wc29uc1wiLCBcImxvdVwiLCBcImVsbGlvdHRcIiwgXCJyZWNvdmVyZWRcIiwgXCJmcmFzZXJcIiwgXCJqdXN0aWZ5XCIsIFwidXBncmFkaW5nXCIsIFwiYmxhZGVzXCIsIFwicGdwXCIsIFwibG9vcHNcIiwgXCJzdXJnZVwiLCBcImZyb250cGFnZVwiLCBcInRyYXVtYVwiLCBcImF3XCIsIFwidGFob2VcIiwgXCJhZHZlcnRcIiwgXCJwb3NzZXNzXCIsIFwiZGVtYW5kaW5nXCIsIFwiZGVmZW5zaXZlXCIsIFwic2lwXCIsIFwiZmxhc2hlcnNcIiwgXCJzdWJhcnVcIiwgXCJmb3JiaWRkZW5cIiwgXCJ0ZlwiLCBcInZhbmlsbGFcIiwgXCJwcm9ncmFtbWVyc1wiLCBcInBqXCIsIFwibW9uaXRvcmVkXCIsIFwiaW5zdGFsbGF0aW9uc1wiLCBcImRldXRzY2hsYW5kXCIsIFwicGljbmljXCIsIFwic291bHNcIiwgXCJhcnJpdmFsc1wiLCBcInNwYW5rXCIsIFwiY3dcIiwgXCJwcmFjdGl0aW9uZXJcIiwgXCJtb3RpdmF0ZWRcIiwgXCJ3clwiLCBcImR1bWJcIiwgXCJzbWl0aHNvbmlhblwiLCBcImhvbGxvd1wiLCBcInZhdWx0XCIsIFwic2VjdXJlbHlcIiwgXCJleGFtaW5pbmdcIiwgXCJmaW9yaWNldFwiLCBcImdyb292ZVwiLCBcInJldmVsYXRpb25cIiwgXCJyZ1wiLCBcInB1cnN1aXRcIiwgXCJkZWxlZ2F0aW9uXCIsIFwid2lyZXNcIiwgXCJibFwiLCBcImRpY3Rpb25hcmllc1wiLCBcIm1haWxzXCIsIFwiYmFja2luZ1wiLCBcImdyZWVuaG91c2VcIiwgXCJzbGVlcHNcIiwgXCJ2Y1wiLCBcImJsYWtlXCIsIFwidHJhbnNwYXJlbmN5XCIsIFwiZGVlXCIsIFwidHJhdmlzXCIsIFwid3hcIiwgXCJlbmRsZXNzXCIsIFwiZmlndXJlZFwiLCBcIm9yYml0XCIsIFwiY3VycmVuY2llc1wiLCBcIm5pZ2VyXCIsIFwiYmFjb25cIiwgXCJzdXJ2aXZvcnNcIiwgXCJwb3NpdGlvbmluZ1wiLCBcImhlYXRlclwiLCBcImNvbG9ueVwiLCBcImNhbm5vblwiLCBcImNpcmN1c1wiLCBcInByb21vdGVkXCIsIFwiZm9yYmVzXCIsIFwibWFlXCIsIFwibW9sZG92YVwiLCBcIm1lbFwiLCBcImRlc2NlbmRpbmdcIiwgXCJwYXhpbFwiLCBcInNwaW5lXCIsIFwidHJvdXRcIiwgXCJlbmNsb3NlZFwiLCBcImZlYXRcIiwgXCJ0ZW1wb3JhcmlseVwiLCBcIm50c2NcIiwgXCJjb29rZWRcIiwgXCJ0aHJpbGxlclwiLCBcInRyYW5zbWl0XCIsIFwiYXBuaWNcIiwgXCJmYXR0eVwiLCBcImdlcmFsZFwiLCBcInByZXNzZWRcIiwgXCJmcmVxdWVuY2llc1wiLCBcInNjYW5uZWRcIiwgXCJyZWZsZWN0aW9uc1wiLCBcImh1bmdlclwiLCBcIm1hcmlhaFwiLCBcInNpY1wiLCBcIm11bmljaXBhbGl0eVwiLCBcInVzcHNcIiwgXCJqb3ljZVwiLCBcImRldGVjdGl2ZVwiLCBcInN1cmdlb25cIiwgXCJjZW1lbnRcIiwgXCJleHBlcmllbmNpbmdcIiwgXCJmaXJlcGxhY2VcIiwgXCJlbmRvcnNlbWVudFwiLCBcImJnXCIsIFwicGxhbm5lcnNcIiwgXCJkaXNwdXRlc1wiLCBcInRleHRpbGVzXCIsIFwibWlzc2lsZVwiLCBcImludHJhbmV0XCIsIFwiY2xvc2VzXCIsIFwic2VxXCIsIFwicHN5Y2hpYXRyeVwiLCBcInBlcnNpc3RlbnRcIiwgXCJkZWJvcmFoXCIsIFwiY29uZlwiLCBcIm1hcmNvXCIsIFwiYXNzaXN0c1wiLCBcInN1bW1hcmllc1wiLCBcImdsb3dcIiwgXCJnYWJyaWVsXCIsIFwiYXVkaXRvclwiLCBcIndtYVwiLCBcImFxdWFyaXVtXCIsIFwidmlvbGluXCIsIFwicHJvcGhldFwiLCBcImNpclwiLCBcImJyYWNrZXRcIiwgXCJsb29rc21hcnRcIiwgXCJpc2FhY1wiLCBcIm94aWRlXCIsIFwib2Frc1wiLCBcIm1hZ25pZmljZW50XCIsIFwiZXJpa1wiLCBcImNvbGxlYWd1ZVwiLCBcIm5hcGxlc1wiLCBcInByb21wdGx5XCIsIFwibW9kZW1zXCIsIFwiYWRhcHRhdGlvblwiLCBcImh1XCIsIFwiaGFybWZ1bFwiLCBcInBhaW50YmFsbFwiLCBcInByb3phY1wiLCBcInNleHVhbGx5XCIsIFwiZW5jbG9zdXJlXCIsIFwiYWNtXCIsIFwiZGl2aWRlbmRcIiwgXCJuZXdhcmtcIiwgXCJrd1wiLCBcInBhc29cIiwgXCJnbHVjb3NlXCIsIFwicGhhbnRvbVwiLCBcIm5vcm1cIiwgXCJwbGF5YmFja1wiLCBcInN1cGVydmlzb3JzXCIsIFwid2VzdG1pbnN0ZXJcIiwgXCJ0dXJ0bGVcIiwgXCJpcHNcIiwgXCJkaXN0YW5jZXNcIiwgXCJhYnNvcnB0aW9uXCIsIFwidHJlYXN1cmVzXCIsIFwiZHNjXCIsIFwid2FybmVkXCIsIFwibmV1cmFsXCIsIFwid2FyZVwiLCBcImZvc3NpbFwiLCBcIm1pYVwiLCBcImhvbWV0b3duXCIsIFwiYmFkbHlcIiwgXCJ0cmFuc2NyaXB0c1wiLCBcImFwb2xsb1wiLCBcIndhblwiLCBcImRpc2FwcG9pbnRlZFwiLCBcInBlcnNpYW5cIiwgXCJjb250aW51YWxseVwiLCBcImNvbW11bmlzdFwiLCBcImNvbGxlY3RpYmxlXCIsIFwiaGFuZG1hZGVcIiwgXCJncmVlbmVcIiwgXCJlbnRyZXByZW5ldXJzXCIsIFwicm9ib3RzXCIsIFwiZ3JlbmFkYVwiLCBcImNyZWF0aW9uc1wiLCBcImphZGVcIiwgXCJzY29vcFwiLCBcImFjcXVpc2l0aW9uc1wiLCBcImZvdWxcIiwgXCJrZW5vXCIsIFwiZ3RrXCIsIFwiZWFybmluZ1wiLCBcIm1haWxtYW5cIiwgXCJzYW55b1wiLCBcIm5lc3RlZFwiLCBcImJpb2RpdmVyc2l0eVwiLCBcImV4Y2l0ZW1lbnRcIiwgXCJzb21hbGlhXCIsIFwibW92ZXJzXCIsIFwidmVyYmFsXCIsIFwiYmxpbmtcIiwgXCJwcmVzZW50bHlcIiwgXCJzZWFzXCIsIFwiY2FybG9cIiwgXCJ3b3JrZmxvd1wiLCBcIm15c3RlcmlvdXNcIiwgXCJub3ZlbHR5XCIsIFwiYnJ5YW50XCIsIFwidGlsZXNcIiwgXCJ2b3l1ZXJcIiwgXCJsaWJyYXJpYW5cIiwgXCJzdWJzaWRpYXJpZXNcIiwgXCJzd2l0Y2hlZFwiLCBcInN0b2NraG9sbVwiLCBcInRhbWlsXCIsIFwiZ2FybWluXCIsIFwicnVcIiwgXCJwb3NlXCIsIFwiZnV6enlcIiwgXCJpbmRvbmVzaWFuXCIsIFwiZ3JhbXNcIiwgXCJ0aGVyYXBpc3RcIiwgXCJyaWNoYXJkc1wiLCBcIm1ybmFcIiwgXCJidWRnZXRzXCIsIFwidG9vbGtpdFwiLCBcInByb21pc2luZ1wiLCBcInJlbGF4YXRpb25cIiwgXCJnb2F0XCIsIFwicmVuZGVyXCIsIFwiY2FybWVuXCIsIFwiaXJhXCIsIFwic2VuXCIsIFwidGhlcmVhZnRlclwiLCBcImhhcmR3b29kXCIsIFwiZXJvdGljYVwiLCBcInRlbXBvcmFsXCIsIFwic2FpbFwiLCBcImZvcmdlXCIsIFwiY29tbWlzc2lvbmVyc1wiLCBcImRlbnNlXCIsIFwiZHRzXCIsIFwiYnJhdmVcIiwgXCJmb3J3YXJkaW5nXCIsIFwicXRcIiwgXCJhd2Z1bFwiLCBcIm5pZ2h0bWFyZVwiLCBcImFpcnBsYW5lXCIsIFwicmVkdWN0aW9uc1wiLCBcInNvdXRoYW1wdG9uXCIsIFwiaXN0YW5idWxcIiwgXCJpbXBvc2VcIiwgXCJvcmdhbmlzbXNcIiwgXCJzZWdhXCIsIFwidGVsZXNjb3BlXCIsIFwidmlld2Vyc1wiLCBcImFzYmVzdG9zXCIsIFwicG9ydHNtb3V0aFwiLCBcImNkbmFcIiwgXCJtZXllclwiLCBcImVudGVyc1wiLCBcInBvZFwiLCBcInNhdmFnZVwiLCBcImFkdmFuY2VtZW50XCIsIFwid3VcIiwgXCJoYXJhc3NtZW50XCIsIFwid2lsbG93XCIsIFwicmVzdW1lc1wiLCBcImJvbHRcIiwgXCJnYWdlXCIsIFwidGhyb3dpbmdcIiwgXCJleGlzdGVkXCIsIFwid2hvcmVcIiwgXCJnZW5lcmF0b3JzXCIsIFwibHVcIiwgXCJ3YWdvblwiLCBcImJhcmJpZVwiLCBcImRhdFwiLCBcImZhdm91clwiLCBcInNvYVwiLCBcImtub2NrXCIsIFwidXJnZVwiLCBcInNtdHBcIiwgXCJnZW5lcmF0ZXNcIiwgXCJwb3RhdG9lc1wiLCBcInRob3JvdWdoXCIsIFwicmVwbGljYXRpb25cIiwgXCJpbmV4cGVuc2l2ZVwiLCBcImt1cnRcIiwgXCJyZWNlcHRvcnNcIiwgXCJwZWVyc1wiLCBcInJvbGFuZFwiLCBcIm9wdGltdW1cIiwgXCJuZW9uXCIsIFwiaW50ZXJ2ZW50aW9uc1wiLCBcInF1aWx0XCIsIFwiaHVudGluZ3RvblwiLCBcImNyZWF0dXJlXCIsIFwib3Vyc1wiLCBcIm1vdW50c1wiLCBcInN5cmFjdXNlXCIsIFwiaW50ZXJuc2hpcFwiLCBcImxvbmVcIiwgXCJyZWZyZXNoXCIsIFwiYWx1bWluaXVtXCIsIFwic25vd2JvYXJkXCIsIFwiYmVhc3RhbGl0eVwiLCBcIndlYmNhc3RcIiwgXCJtaWNoZWxcIiwgXCJldmFuZXNjZW5jZVwiLCBcInN1YnRsZVwiLCBcImNvb3JkaW5hdGVkXCIsIFwibm90cmVcIiwgXCJzaGlwbWVudHNcIiwgXCJtYWxkaXZlc1wiLCBcInN0cmlwZXNcIiwgXCJmaXJtd2FyZVwiLCBcImFudGFyY3RpY2FcIiwgXCJjb3BlXCIsIFwic2hlcGhlcmRcIiwgXCJsbVwiLCBcImNhbmJlcnJhXCIsIFwiY3JhZGxlXCIsIFwiY2hhbmNlbGxvclwiLCBcIm1hbWJvXCIsIFwibGltZVwiLCBcImtpcmtcIiwgXCJmbG91clwiLCBcImNvbnRyb3ZlcnN5XCIsIFwibGVnZW5kYXJ5XCIsIFwiYm9vbFwiLCBcInN5bXBhdGh5XCIsIFwiY2hvaXJcIiwgXCJhdm9pZGluZ1wiLCBcImJlYXV0aWZ1bGx5XCIsIFwiYmxvbmRcIiwgXCJleHBlY3RzXCIsIFwiY2hvXCIsIFwianVtcGluZ1wiLCBcImZhYnJpY3NcIiwgXCJhbnRpYm9kaWVzXCIsIFwicG9seW1lclwiLCBcImh5Z2llbmVcIiwgXCJ3aXRcIiwgXCJwb3VsdHJ5XCIsIFwidmlydHVlXCIsIFwiYnVyc3RcIiwgXCJleGFtaW5hdGlvbnNcIiwgXCJzdXJnZW9uc1wiLCBcImJvdXF1ZXRcIiwgXCJpbW11bm9sb2d5XCIsIFwicHJvbW90ZXNcIiwgXCJtYW5kYXRlXCIsIFwid2lsZXlcIiwgXCJkZXBhcnRtZW50YWxcIiwgXCJiYnNcIiwgXCJzcGFzXCIsIFwiaW5kXCIsIFwiY29ycHVzXCIsIFwiam9obnN0b25cIiwgXCJ0ZXJtaW5vbG9neVwiLCBcImdlbnRsZW1hblwiLCBcImZpYnJlXCIsIFwicmVwcm9kdWNlXCIsIFwiY29udmljdGVkXCIsIFwic2hhZGVzXCIsIFwiamV0c1wiLCBcImluZGljZXNcIiwgXCJyb29tbWF0ZXNcIiwgXCJhZHdhcmVcIiwgXCJxdWlcIiwgXCJpbnRsXCIsIFwidGhyZWF0ZW5pbmdcIiwgXCJzcG9rZXNtYW5cIiwgXCJ6b2xvZnRcIiwgXCJhY3RpdmlzdHNcIiwgXCJmcmFua2Z1cnRcIiwgXCJwcmlzb25lclwiLCBcImRhaXN5XCIsIFwiaGFsaWZheFwiLCBcImVuY291cmFnZXNcIiwgXCJ1bHRyYW1cIiwgXCJjdXJzb3JcIiwgXCJhc3NlbWJsZWRcIiwgXCJlYXJsaWVzdFwiLCBcImRvbmF0ZWRcIiwgXCJzdHVmZmVkXCIsIFwicmVzdHJ1Y3R1cmluZ1wiLCBcImluc2VjdHNcIiwgXCJ0ZXJtaW5hbHNcIiwgXCJjcnVkZVwiLCBcIm1vcnJpc29uXCIsIFwibWFpZGVuXCIsIFwic2ltdWxhdGlvbnNcIiwgXCJjelwiLCBcInN1ZmZpY2llbnRseVwiLCBcImV4YW1pbmVzXCIsIFwidmlraW5nXCIsIFwibXlydGxlXCIsIFwiYm9yZWRcIiwgXCJjbGVhbnVwXCIsIFwieWFyblwiLCBcImtuaXRcIiwgXCJjb25kaXRpb25hbFwiLCBcIm11Z1wiLCBcImNyb3Nzd29yZFwiLCBcImJvdGhlclwiLCBcImJ1ZGFwZXN0XCIsIFwiY29uY2VwdHVhbFwiLCBcImtuaXR0aW5nXCIsIFwiYXR0YWNrZWRcIiwgXCJobFwiLCBcImJodXRhblwiLCBcImxpZWNodGVuc3RlaW5cIiwgXCJtYXRpbmdcIiwgXCJjb21wdXRlXCIsIFwicmVkaGVhZFwiLCBcImFycml2ZXNcIiwgXCJ0cmFuc2xhdG9yXCIsIFwiYXV0b21vYmlsZXNcIiwgXCJ0cmFjdG9yXCIsIFwiYWxsYWhcIiwgXCJjb250aW5lbnRcIiwgXCJvYlwiLCBcInVud3JhcFwiLCBcImZhcmVzXCIsIFwibG9uZ2l0dWRlXCIsIFwicmVzaXN0XCIsIFwiY2hhbGxlbmdlZFwiLCBcInRlbGVjaGFyZ2VyXCIsIFwiaG9wZWRcIiwgXCJwaWtlXCIsIFwic2FmZXJcIiwgXCJpbnNlcnRpb25cIiwgXCJpbnN0cnVtZW50YXRpb25cIiwgXCJpZHNcIiwgXCJodWdvXCIsIFwid2FnbmVyXCIsIFwiY29uc3RyYWludFwiLCBcImdyb3VuZHdhdGVyXCIsIFwidG91Y2hlZFwiLCBcInN0cmVuZ3RoZW5pbmdcIiwgXCJjb2xvZ25lXCIsIFwiZ3ppcFwiLCBcIndpc2hpbmdcIiwgXCJyYW5nZXJcIiwgXCJzbWFsbGVzdFwiLCBcImluc3VsYXRpb25cIiwgXCJuZXdtYW5cIiwgXCJtYXJzaFwiLCBcInJpY2t5XCIsIFwiY3RybFwiLCBcInNjYXJlZFwiLCBcInRoZXRhXCIsIFwiaW5mcmluZ2VtZW50XCIsIFwiYmVudFwiLCBcImxhb3NcIiwgXCJzdWJqZWN0aXZlXCIsIFwibW9uc3RlcnNcIiwgXCJhc3lsdW1cIiwgXCJsaWdodGJveFwiLCBcInJvYmJpZVwiLCBcInN0YWtlXCIsIFwiY29ja3RhaWxcIiwgXCJvdXRsZXRzXCIsIFwic3dhemlsYW5kXCIsIFwidmFyaWV0aWVzXCIsIFwiYXJib3JcIiwgXCJtZWRpYXdpa2lcIiwgXCJjb25maWd1cmF0aW9uc1wiLCBcInBvaXNvblwiLCBdICBcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgICBXb3JkczogV29yZHMsXG59O1xuIl19
