System.registerDynamic("lib:crypto.js", [], false, function($__require, $__exports, $__module) {
  var _retrieveGlobal = System.get("@@global-helpers").prepareGlobal($__module.id, null, null);
  (function() {
    var CryptoJS = this["CryptoJS"];
    var CryptoJS = CryptoJS || (function(Math, undefined) {
      var C = {};
      var C_lib = C.lib = {};
      var Base = C_lib.Base = (function() {
        function F() {}
        return {
          extend: function(overrides) {
            F.prototype = this;
            var subtype = new F();
            if (overrides) {
              subtype.mixIn(overrides);
            }
            if (!subtype.hasOwnProperty('init')) {
              subtype.init = function() {
                subtype.$super.init.apply(this, arguments);
              };
            }
            subtype.init.prototype = subtype;
            subtype.$super = this;
            return subtype;
          },
          create: function() {
            var instance = this.extend();
            instance.init.apply(instance, arguments);
            return instance;
          },
          init: function() {},
          mixIn: function(properties) {
            for (var propertyName in properties) {
              if (properties.hasOwnProperty(propertyName)) {
                this[propertyName] = properties[propertyName];
              }
            }
            if (properties.hasOwnProperty('toString')) {
              this.toString = properties.toString;
            }
          },
          clone: function() {
            return this.init.prototype.extend(this);
          }
        };
      }());
      var WordArray = C_lib.WordArray = Base.extend({
        init: function(words, sigBytes) {
          words = this.words = words || [];
          if (sigBytes != undefined) {
            this.sigBytes = sigBytes;
          } else {
            this.sigBytes = words.length * 4;
          }
        },
        toString: function(encoder) {
          return (encoder || Hex).stringify(this);
        },
        concat: function(wordArray) {
          var thisWords = this.words;
          var thatWords = wordArray.words;
          var thisSigBytes = this.sigBytes;
          var thatSigBytes = wordArray.sigBytes;
          this.clamp();
          if (thisSigBytes % 4) {
            for (var i = 0; i < thatSigBytes; i++) {
              var thatByte = (thatWords[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
              thisWords[(thisSigBytes + i) >>> 2] |= thatByte << (24 - ((thisSigBytes + i) % 4) * 8);
            }
          } else if (thatWords.length > 0xffff) {
            for (var i = 0; i < thatSigBytes; i += 4) {
              thisWords[(thisSigBytes + i) >>> 2] = thatWords[i >>> 2];
            }
          } else {
            thisWords.push.apply(thisWords, thatWords);
          }
          this.sigBytes += thatSigBytes;
          return this;
        },
        clamp: function() {
          var words = this.words;
          var sigBytes = this.sigBytes;
          words[sigBytes >>> 2] &= 0xffffffff << (32 - (sigBytes % 4) * 8);
          words.length = Math.ceil(sigBytes / 4);
        },
        clone: function() {
          var clone = Base.clone.call(this);
          clone.words = this.words.slice(0);
          return clone;
        },
        random: function(nBytes) {
          var words = [];
          for (var i = 0; i < nBytes; i += 4) {
            words.push((Math.random() * 0x100000000) | 0);
          }
          return new WordArray.init(words, nBytes);
        }
      });
      var C_enc = C.enc = {};
      var Hex = C_enc.Hex = {
        stringify: function(wordArray) {
          var words = wordArray.words;
          var sigBytes = wordArray.sigBytes;
          var hexChars = [];
          for (var i = 0; i < sigBytes; i++) {
            var bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
            hexChars.push((bite >>> 4).toString(16));
            hexChars.push((bite & 0x0f).toString(16));
          }
          return hexChars.join('');
        },
        parse: function(hexStr) {
          var hexStrLength = hexStr.length;
          var words = [];
          for (var i = 0; i < hexStrLength; i += 2) {
            words[i >>> 3] |= parseInt(hexStr.substr(i, 2), 16) << (24 - (i % 8) * 4);
          }
          return new WordArray.init(words, hexStrLength / 2);
        }
      };
      var Latin1 = C_enc.Latin1 = {
        stringify: function(wordArray) {
          var words = wordArray.words;
          var sigBytes = wordArray.sigBytes;
          var latin1Chars = [];
          for (var i = 0; i < sigBytes; i++) {
            var bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
            latin1Chars.push(String.fromCharCode(bite));
          }
          return latin1Chars.join('');
        },
        parse: function(latin1Str) {
          var latin1StrLength = latin1Str.length;
          var words = [];
          for (var i = 0; i < latin1StrLength; i++) {
            words[i >>> 2] |= (latin1Str.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
          }
          return new WordArray.init(words, latin1StrLength);
        }
      };
      var Utf8 = C_enc.Utf8 = {
        stringify: function(wordArray) {
          try {
            return decodeURIComponent(escape(Latin1.stringify(wordArray)));
          } catch (e) {
            throw new Error('Malformed UTF-8 data');
          }
        },
        parse: function(utf8Str) {
          return Latin1.parse(unescape(encodeURIComponent(utf8Str)));
        }
      };
      var BufferedBlockAlgorithm = C_lib.BufferedBlockAlgorithm = Base.extend({
        reset: function() {
          this._data = new WordArray.init();
          this._nDataBytes = 0;
        },
        _append: function(data) {
          if (typeof data == 'string') {
            data = Utf8.parse(data);
          }
          this._data.concat(data);
          this._nDataBytes += data.sigBytes;
        },
        _process: function(doFlush) {
          var data = this._data;
          var dataWords = data.words;
          var dataSigBytes = data.sigBytes;
          var blockSize = this.blockSize;
          var blockSizeBytes = blockSize * 4;
          var nBlocksReady = dataSigBytes / blockSizeBytes;
          if (doFlush) {
            nBlocksReady = Math.ceil(nBlocksReady);
          } else {
            nBlocksReady = Math.max((nBlocksReady | 0) - this._minBufferSize, 0);
          }
          var nWordsReady = nBlocksReady * blockSize;
          var nBytesReady = Math.min(nWordsReady * 4, dataSigBytes);
          if (nWordsReady) {
            for (var offset = 0; offset < nWordsReady; offset += blockSize) {
              this._doProcessBlock(dataWords, offset);
            }
            var processedWords = dataWords.splice(0, nWordsReady);
            data.sigBytes -= nBytesReady;
          }
          return new WordArray.init(processedWords, nBytesReady);
        },
        clone: function() {
          var clone = Base.clone.call(this);
          clone._data = this._data.clone();
          return clone;
        },
        _minBufferSize: 0
      });
      var Hasher = C_lib.Hasher = BufferedBlockAlgorithm.extend({
        cfg: Base.extend(),
        init: function(cfg) {
          this.cfg = this.cfg.extend(cfg);
          this.reset();
        },
        reset: function() {
          BufferedBlockAlgorithm.reset.call(this);
          this._doReset();
        },
        update: function(messageUpdate) {
          this._append(messageUpdate);
          this._process();
          return this;
        },
        finalize: function(messageUpdate) {
          if (messageUpdate) {
            this._append(messageUpdate);
          }
          var hash = this._doFinalize();
          return hash;
        },
        blockSize: 512 / 32,
        _createHelper: function(hasher) {
          return function(message, cfg) {
            return new hasher.init(cfg).finalize(message);
          };
        },
        _createHmacHelper: function(hasher) {
          return function(message, key) {
            return new C_algo.HMAC.init(hasher, key).finalize(message);
          };
        }
      });
      var C_algo = C.algo = {};
      return C;
    }(Math));
    (function() {
      var C = CryptoJS;
      var C_lib = C.lib;
      var WordArray = C_lib.WordArray;
      var Hasher = C_lib.Hasher;
      var C_algo = C.algo;
      var W = [];
      var SHA1 = C_algo.SHA1 = Hasher.extend({
        _doReset: function() {
          this._hash = new WordArray.init([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0]);
        },
        _doProcessBlock: function(M, offset) {
          var H = this._hash.words;
          var a = H[0];
          var b = H[1];
          var c = H[2];
          var d = H[3];
          var e = H[4];
          for (var i = 0; i < 80; i++) {
            if (i < 16) {
              W[i] = M[offset + i] | 0;
            } else {
              var n = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16];
              W[i] = (n << 1) | (n >>> 31);
            }
            var t = ((a << 5) | (a >>> 27)) + e + W[i];
            if (i < 20) {
              t += ((b & c) | (~b & d)) + 0x5a827999;
            } else if (i < 40) {
              t += (b ^ c ^ d) + 0x6ed9eba1;
            } else if (i < 60) {
              t += ((b & c) | (b & d) | (c & d)) - 0x70e44324;
            } else {
              t += (b ^ c ^ d) - 0x359d3e2a;
            }
            e = d;
            d = c;
            c = (b << 30) | (b >>> 2);
            b = a;
            a = t;
          }
          H[0] = (H[0] + a) | 0;
          H[1] = (H[1] + b) | 0;
          H[2] = (H[2] + c) | 0;
          H[3] = (H[3] + d) | 0;
          H[4] = (H[4] + e) | 0;
        },
        _doFinalize: function() {
          var data = this._data;
          var dataWords = data.words;
          var nBitsTotal = this._nDataBytes * 8;
          var nBitsLeft = data.sigBytes * 8;
          dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
          dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = Math.floor(nBitsTotal / 0x100000000);
          dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 15] = nBitsTotal;
          data.sigBytes = dataWords.length * 4;
          this._process();
          return this._hash;
        },
        clone: function() {
          var clone = Hasher.clone.call(this);
          clone._hash = this._hash.clone();
          return clone;
        }
      });
      C.SHA1 = Hasher._createHelper(SHA1);
      C.HmacSHA1 = Hasher._createHmacHelper(SHA1);
    }());
    (function(Math) {
      var C = CryptoJS;
      var C_lib = C.lib;
      var WordArray = C_lib.WordArray;
      var Hasher = C_lib.Hasher;
      var C_algo = C.algo;
      var H = [];
      var K = [];
      (function() {
        function isPrime(n) {
          var sqrtN = Math.sqrt(n);
          for (var factor = 2; factor <= sqrtN; factor++) {
            if (!(n % factor)) {
              return false;
            }
          }
          return true;
        }
        function getFractionalBits(n) {
          return ((n - (n | 0)) * 0x100000000) | 0;
        }
        var n = 2;
        var nPrime = 0;
        while (nPrime < 64) {
          if (isPrime(n)) {
            if (nPrime < 8) {
              H[nPrime] = getFractionalBits(Math.pow(n, 1 / 2));
            }
            K[nPrime] = getFractionalBits(Math.pow(n, 1 / 3));
            nPrime++;
          }
          n++;
        }
      }());
      var W = [];
      var SHA256 = C_algo.SHA256 = Hasher.extend({
        _doReset: function() {
          this._hash = new WordArray.init(H.slice(0));
        },
        _doProcessBlock: function(M, offset) {
          var H = this._hash.words;
          var a = H[0];
          var b = H[1];
          var c = H[2];
          var d = H[3];
          var e = H[4];
          var f = H[5];
          var g = H[6];
          var h = H[7];
          for (var i = 0; i < 64; i++) {
            if (i < 16) {
              W[i] = M[offset + i] | 0;
            } else {
              var gamma0x = W[i - 15];
              var gamma0 = ((gamma0x << 25) | (gamma0x >>> 7)) ^ ((gamma0x << 14) | (gamma0x >>> 18)) ^ (gamma0x >>> 3);
              var gamma1x = W[i - 2];
              var gamma1 = ((gamma1x << 15) | (gamma1x >>> 17)) ^ ((gamma1x << 13) | (gamma1x >>> 19)) ^ (gamma1x >>> 10);
              W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16];
            }
            var ch = (e & f) ^ (~e & g);
            var maj = (a & b) ^ (a & c) ^ (b & c);
            var sigma0 = ((a << 30) | (a >>> 2)) ^ ((a << 19) | (a >>> 13)) ^ ((a << 10) | (a >>> 22));
            var sigma1 = ((e << 26) | (e >>> 6)) ^ ((e << 21) | (e >>> 11)) ^ ((e << 7) | (e >>> 25));
            var t1 = h + sigma1 + ch + K[i] + W[i];
            var t2 = sigma0 + maj;
            h = g;
            g = f;
            f = e;
            e = (d + t1) | 0;
            d = c;
            c = b;
            b = a;
            a = (t1 + t2) | 0;
          }
          H[0] = (H[0] + a) | 0;
          H[1] = (H[1] + b) | 0;
          H[2] = (H[2] + c) | 0;
          H[3] = (H[3] + d) | 0;
          H[4] = (H[4] + e) | 0;
          H[5] = (H[5] + f) | 0;
          H[6] = (H[6] + g) | 0;
          H[7] = (H[7] + h) | 0;
        },
        _doFinalize: function() {
          var data = this._data;
          var dataWords = data.words;
          var nBitsTotal = this._nDataBytes * 8;
          var nBitsLeft = data.sigBytes * 8;
          dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
          dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = Math.floor(nBitsTotal / 0x100000000);
          dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 15] = nBitsTotal;
          data.sigBytes = dataWords.length * 4;
          this._process();
          return this._hash;
        },
        clone: function() {
          var clone = Hasher.clone.call(this);
          clone._hash = this._hash.clone();
          return clone;
        }
      });
      C.SHA256 = Hasher._createHelper(SHA256);
      C.HmacSHA256 = Hasher._createHmacHelper(SHA256);
    }(Math));
    (function(undefined) {
      var C = CryptoJS;
      var C_lib = C.lib;
      var Base = C_lib.Base;
      var X32WordArray = C_lib.WordArray;
      var C_x64 = C.x64 = {};
      var X64Word = C_x64.Word = Base.extend({init: function(high, low) {
          this.high = high;
          this.low = low;
        }});
      var X64WordArray = C_x64.WordArray = Base.extend({
        init: function(words, sigBytes) {
          words = this.words = words || [];
          if (sigBytes != undefined) {
            this.sigBytes = sigBytes;
          } else {
            this.sigBytes = words.length * 8;
          }
        },
        toX32: function() {
          var x64Words = this.words;
          var x64WordsLength = x64Words.length;
          var x32Words = [];
          for (var i = 0; i < x64WordsLength; i++) {
            var x64Word = x64Words[i];
            x32Words.push(x64Word.high);
            x32Words.push(x64Word.low);
          }
          return X32WordArray.create(x32Words, this.sigBytes);
        },
        clone: function() {
          var clone = Base.clone.call(this);
          var words = clone.words = this.words.slice(0);
          var wordsLength = words.length;
          for (var i = 0; i < wordsLength; i++) {
            words[i] = words[i].clone();
          }
          return clone;
        }
      });
    }());
    (function() {
      var C = CryptoJS;
      var C_lib = C.lib;
      var Hasher = C_lib.Hasher;
      var C_x64 = C.x64;
      var X64Word = C_x64.Word;
      var X64WordArray = C_x64.WordArray;
      var C_algo = C.algo;
      function X64Word_create() {
        return X64Word.create.apply(X64Word, arguments);
      }
      var K = [X64Word_create(0x428a2f98, 0xd728ae22), X64Word_create(0x71374491, 0x23ef65cd), X64Word_create(0xb5c0fbcf, 0xec4d3b2f), X64Word_create(0xe9b5dba5, 0x8189dbbc), X64Word_create(0x3956c25b, 0xf348b538), X64Word_create(0x59f111f1, 0xb605d019), X64Word_create(0x923f82a4, 0xaf194f9b), X64Word_create(0xab1c5ed5, 0xda6d8118), X64Word_create(0xd807aa98, 0xa3030242), X64Word_create(0x12835b01, 0x45706fbe), X64Word_create(0x243185be, 0x4ee4b28c), X64Word_create(0x550c7dc3, 0xd5ffb4e2), X64Word_create(0x72be5d74, 0xf27b896f), X64Word_create(0x80deb1fe, 0x3b1696b1), X64Word_create(0x9bdc06a7, 0x25c71235), X64Word_create(0xc19bf174, 0xcf692694), X64Word_create(0xe49b69c1, 0x9ef14ad2), X64Word_create(0xefbe4786, 0x384f25e3), X64Word_create(0x0fc19dc6, 0x8b8cd5b5), X64Word_create(0x240ca1cc, 0x77ac9c65), X64Word_create(0x2de92c6f, 0x592b0275), X64Word_create(0x4a7484aa, 0x6ea6e483), X64Word_create(0x5cb0a9dc, 0xbd41fbd4), X64Word_create(0x76f988da, 0x831153b5), X64Word_create(0x983e5152, 0xee66dfab), X64Word_create(0xa831c66d, 0x2db43210), X64Word_create(0xb00327c8, 0x98fb213f), X64Word_create(0xbf597fc7, 0xbeef0ee4), X64Word_create(0xc6e00bf3, 0x3da88fc2), X64Word_create(0xd5a79147, 0x930aa725), X64Word_create(0x06ca6351, 0xe003826f), X64Word_create(0x14292967, 0x0a0e6e70), X64Word_create(0x27b70a85, 0x46d22ffc), X64Word_create(0x2e1b2138, 0x5c26c926), X64Word_create(0x4d2c6dfc, 0x5ac42aed), X64Word_create(0x53380d13, 0x9d95b3df), X64Word_create(0x650a7354, 0x8baf63de), X64Word_create(0x766a0abb, 0x3c77b2a8), X64Word_create(0x81c2c92e, 0x47edaee6), X64Word_create(0x92722c85, 0x1482353b), X64Word_create(0xa2bfe8a1, 0x4cf10364), X64Word_create(0xa81a664b, 0xbc423001), X64Word_create(0xc24b8b70, 0xd0f89791), X64Word_create(0xc76c51a3, 0x0654be30), X64Word_create(0xd192e819, 0xd6ef5218), X64Word_create(0xd6990624, 0x5565a910), X64Word_create(0xf40e3585, 0x5771202a), X64Word_create(0x106aa070, 0x32bbd1b8), X64Word_create(0x19a4c116, 0xb8d2d0c8), X64Word_create(0x1e376c08, 0x5141ab53), X64Word_create(0x2748774c, 0xdf8eeb99), X64Word_create(0x34b0bcb5, 0xe19b48a8), X64Word_create(0x391c0cb3, 0xc5c95a63), X64Word_create(0x4ed8aa4a, 0xe3418acb), X64Word_create(0x5b9cca4f, 0x7763e373), X64Word_create(0x682e6ff3, 0xd6b2b8a3), X64Word_create(0x748f82ee, 0x5defb2fc), X64Word_create(0x78a5636f, 0x43172f60), X64Word_create(0x84c87814, 0xa1f0ab72), X64Word_create(0x8cc70208, 0x1a6439ec), X64Word_create(0x90befffa, 0x23631e28), X64Word_create(0xa4506ceb, 0xde82bde9), X64Word_create(0xbef9a3f7, 0xb2c67915), X64Word_create(0xc67178f2, 0xe372532b), X64Word_create(0xca273ece, 0xea26619c), X64Word_create(0xd186b8c7, 0x21c0c207), X64Word_create(0xeada7dd6, 0xcde0eb1e), X64Word_create(0xf57d4f7f, 0xee6ed178), X64Word_create(0x06f067aa, 0x72176fba), X64Word_create(0x0a637dc5, 0xa2c898a6), X64Word_create(0x113f9804, 0xbef90dae), X64Word_create(0x1b710b35, 0x131c471b), X64Word_create(0x28db77f5, 0x23047d84), X64Word_create(0x32caab7b, 0x40c72493), X64Word_create(0x3c9ebe0a, 0x15c9bebc), X64Word_create(0x431d67c4, 0x9c100d4c), X64Word_create(0x4cc5d4be, 0xcb3e42b6), X64Word_create(0x597f299c, 0xfc657e2a), X64Word_create(0x5fcb6fab, 0x3ad6faec), X64Word_create(0x6c44198c, 0x4a475817)];
      var W = [];
      (function() {
        for (var i = 0; i < 80; i++) {
          W[i] = X64Word_create();
        }
      }());
      var SHA512 = C_algo.SHA512 = Hasher.extend({
        _doReset: function() {
          this._hash = new X64WordArray.init([new X64Word.init(0x6a09e667, 0xf3bcc908), new X64Word.init(0xbb67ae85, 0x84caa73b), new X64Word.init(0x3c6ef372, 0xfe94f82b), new X64Word.init(0xa54ff53a, 0x5f1d36f1), new X64Word.init(0x510e527f, 0xade682d1), new X64Word.init(0x9b05688c, 0x2b3e6c1f), new X64Word.init(0x1f83d9ab, 0xfb41bd6b), new X64Word.init(0x5be0cd19, 0x137e2179)]);
        },
        _doProcessBlock: function(M, offset) {
          var H = this._hash.words;
          var H0 = H[0];
          var H1 = H[1];
          var H2 = H[2];
          var H3 = H[3];
          var H4 = H[4];
          var H5 = H[5];
          var H6 = H[6];
          var H7 = H[7];
          var H0h = H0.high;
          var H0l = H0.low;
          var H1h = H1.high;
          var H1l = H1.low;
          var H2h = H2.high;
          var H2l = H2.low;
          var H3h = H3.high;
          var H3l = H3.low;
          var H4h = H4.high;
          var H4l = H4.low;
          var H5h = H5.high;
          var H5l = H5.low;
          var H6h = H6.high;
          var H6l = H6.low;
          var H7h = H7.high;
          var H7l = H7.low;
          var ah = H0h;
          var al = H0l;
          var bh = H1h;
          var bl = H1l;
          var ch = H2h;
          var cl = H2l;
          var dh = H3h;
          var dl = H3l;
          var eh = H4h;
          var el = H4l;
          var fh = H5h;
          var fl = H5l;
          var gh = H6h;
          var gl = H6l;
          var hh = H7h;
          var hl = H7l;
          for (var i = 0; i < 80; i++) {
            var Wi = W[i];
            if (i < 16) {
              var Wih = Wi.high = M[offset + i * 2] | 0;
              var Wil = Wi.low = M[offset + i * 2 + 1] | 0;
            } else {
              var gamma0x = W[i - 15];
              var gamma0xh = gamma0x.high;
              var gamma0xl = gamma0x.low;
              var gamma0h = ((gamma0xh >>> 1) | (gamma0xl << 31)) ^ ((gamma0xh >>> 8) | (gamma0xl << 24)) ^ (gamma0xh >>> 7);
              var gamma0l = ((gamma0xl >>> 1) | (gamma0xh << 31)) ^ ((gamma0xl >>> 8) | (gamma0xh << 24)) ^ ((gamma0xl >>> 7) | (gamma0xh << 25));
              var gamma1x = W[i - 2];
              var gamma1xh = gamma1x.high;
              var gamma1xl = gamma1x.low;
              var gamma1h = ((gamma1xh >>> 19) | (gamma1xl << 13)) ^ ((gamma1xh << 3) | (gamma1xl >>> 29)) ^ (gamma1xh >>> 6);
              var gamma1l = ((gamma1xl >>> 19) | (gamma1xh << 13)) ^ ((gamma1xl << 3) | (gamma1xh >>> 29)) ^ ((gamma1xl >>> 6) | (gamma1xh << 26));
              var Wi7 = W[i - 7];
              var Wi7h = Wi7.high;
              var Wi7l = Wi7.low;
              var Wi16 = W[i - 16];
              var Wi16h = Wi16.high;
              var Wi16l = Wi16.low;
              var Wil = gamma0l + Wi7l;
              var Wih = gamma0h + Wi7h + ((Wil >>> 0) < (gamma0l >>> 0) ? 1 : 0);
              var Wil = Wil + gamma1l;
              var Wih = Wih + gamma1h + ((Wil >>> 0) < (gamma1l >>> 0) ? 1 : 0);
              var Wil = Wil + Wi16l;
              var Wih = Wih + Wi16h + ((Wil >>> 0) < (Wi16l >>> 0) ? 1 : 0);
              Wi.high = Wih;
              Wi.low = Wil;
            }
            var chh = (eh & fh) ^ (~eh & gh);
            var chl = (el & fl) ^ (~el & gl);
            var majh = (ah & bh) ^ (ah & ch) ^ (bh & ch);
            var majl = (al & bl) ^ (al & cl) ^ (bl & cl);
            var sigma0h = ((ah >>> 28) | (al << 4)) ^ ((ah << 30) | (al >>> 2)) ^ ((ah << 25) | (al >>> 7));
            var sigma0l = ((al >>> 28) | (ah << 4)) ^ ((al << 30) | (ah >>> 2)) ^ ((al << 25) | (ah >>> 7));
            var sigma1h = ((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9));
            var sigma1l = ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9));
            var Ki = K[i];
            var Kih = Ki.high;
            var Kil = Ki.low;
            var t1l = hl + sigma1l;
            var t1h = hh + sigma1h + ((t1l >>> 0) < (hl >>> 0) ? 1 : 0);
            var t1l = t1l + chl;
            var t1h = t1h + chh + ((t1l >>> 0) < (chl >>> 0) ? 1 : 0);
            var t1l = t1l + Kil;
            var t1h = t1h + Kih + ((t1l >>> 0) < (Kil >>> 0) ? 1 : 0);
            var t1l = t1l + Wil;
            var t1h = t1h + Wih + ((t1l >>> 0) < (Wil >>> 0) ? 1 : 0);
            var t2l = sigma0l + majl;
            var t2h = sigma0h + majh + ((t2l >>> 0) < (sigma0l >>> 0) ? 1 : 0);
            hh = gh;
            hl = gl;
            gh = fh;
            gl = fl;
            fh = eh;
            fl = el;
            el = (dl + t1l) | 0;
            eh = (dh + t1h + ((el >>> 0) < (dl >>> 0) ? 1 : 0)) | 0;
            dh = ch;
            dl = cl;
            ch = bh;
            cl = bl;
            bh = ah;
            bl = al;
            al = (t1l + t2l) | 0;
            ah = (t1h + t2h + ((al >>> 0) < (t1l >>> 0) ? 1 : 0)) | 0;
          }
          H0l = H0.low = (H0l + al);
          H0.high = (H0h + ah + ((H0l >>> 0) < (al >>> 0) ? 1 : 0));
          H1l = H1.low = (H1l + bl);
          H1.high = (H1h + bh + ((H1l >>> 0) < (bl >>> 0) ? 1 : 0));
          H2l = H2.low = (H2l + cl);
          H2.high = (H2h + ch + ((H2l >>> 0) < (cl >>> 0) ? 1 : 0));
          H3l = H3.low = (H3l + dl);
          H3.high = (H3h + dh + ((H3l >>> 0) < (dl >>> 0) ? 1 : 0));
          H4l = H4.low = (H4l + el);
          H4.high = (H4h + eh + ((H4l >>> 0) < (el >>> 0) ? 1 : 0));
          H5l = H5.low = (H5l + fl);
          H5.high = (H5h + fh + ((H5l >>> 0) < (fl >>> 0) ? 1 : 0));
          H6l = H6.low = (H6l + gl);
          H6.high = (H6h + gh + ((H6l >>> 0) < (gl >>> 0) ? 1 : 0));
          H7l = H7.low = (H7l + hl);
          H7.high = (H7h + hh + ((H7l >>> 0) < (hl >>> 0) ? 1 : 0));
        },
        _doFinalize: function() {
          var data = this._data;
          var dataWords = data.words;
          var nBitsTotal = this._nDataBytes * 8;
          var nBitsLeft = data.sigBytes * 8;
          dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
          dataWords[(((nBitsLeft + 128) >>> 10) << 5) + 30] = Math.floor(nBitsTotal / 0x100000000);
          dataWords[(((nBitsLeft + 128) >>> 10) << 5) + 31] = nBitsTotal;
          data.sigBytes = dataWords.length * 4;
          this._process();
          var hash = this._hash.toX32();
          return hash;
        },
        clone: function() {
          var clone = Hasher.clone.call(this);
          clone._hash = this._hash.clone();
          return clone;
        },
        blockSize: 1024 / 32
      });
      C.SHA512 = Hasher._createHelper(SHA512);
      C.HmacSHA512 = Hasher._createHmacHelper(SHA512);
    }());
    this["CryptoJS"] = CryptoJS;
  })();
  return _retrieveGlobal();
});

System.registerDynamic("lib:rsa.js", [], false, function($__require, $__exports, $__module) {
  var _retrieveGlobal = System.get("@@global-helpers").prepareGlobal($__module.id, null, null);
  (function() {
    this["hex2b64"] = hex2b64;
    this["b64tohex"] = b64tohex;
    this["b64toBA"] = b64toBA;
    this["BigInteger"] = BigInteger;
    this["nbi"] = nbi;
    this["am1"] = am1;
    this["am2"] = am2;
    this["am3"] = am3;
    this["int2char"] = int2char;
    this["intAt"] = intAt;
    this["bnpCopyTo"] = bnpCopyTo;
    this["bnpFromInt"] = bnpFromInt;
    this["nbv"] = nbv;
    this["bnpFromString"] = bnpFromString;
    this["bnpClamp"] = bnpClamp;
    this["bnToString"] = bnToString;
    this["bnNegate"] = bnNegate;
    this["bnAbs"] = bnAbs;
    this["bnCompareTo"] = bnCompareTo;
    this["nbits"] = nbits;
    this["bnBitLength"] = bnBitLength;
    this["bnpDLShiftTo"] = bnpDLShiftTo;
    this["bnpDRShiftTo"] = bnpDRShiftTo;
    this["bnpLShiftTo"] = bnpLShiftTo;
    this["bnpRShiftTo"] = bnpRShiftTo;
    this["bnpSubTo"] = bnpSubTo;
    this["bnpMultiplyTo"] = bnpMultiplyTo;
    this["bnpSquareTo"] = bnpSquareTo;
    this["bnpDivRemTo"] = bnpDivRemTo;
    this["bnMod"] = bnMod;
    this["Classic"] = Classic;
    this["cConvert"] = cConvert;
    this["cRevert"] = cRevert;
    this["cReduce"] = cReduce;
    this["cMulTo"] = cMulTo;
    this["cSqrTo"] = cSqrTo;
    this["bnpInvDigit"] = bnpInvDigit;
    this["Montgomery"] = Montgomery;
    this["montConvert"] = montConvert;
    this["montRevert"] = montRevert;
    this["montReduce"] = montReduce;
    this["montSqrTo"] = montSqrTo;
    this["montMulTo"] = montMulTo;
    this["bnpIsEven"] = bnpIsEven;
    this["bnpExp"] = bnpExp;
    this["bnModPowInt"] = bnModPowInt;
    this["bnClone"] = bnClone;
    this["bnIntValue"] = bnIntValue;
    this["bnByteValue"] = bnByteValue;
    this["bnShortValue"] = bnShortValue;
    this["bnpChunkSize"] = bnpChunkSize;
    this["bnSigNum"] = bnSigNum;
    this["bnpToRadix"] = bnpToRadix;
    this["bnpFromRadix"] = bnpFromRadix;
    this["bnpFromNumber"] = bnpFromNumber;
    this["bnToByteArray"] = bnToByteArray;
    this["bnEquals"] = bnEquals;
    this["bnMin"] = bnMin;
    this["bnMax"] = bnMax;
    this["bnpBitwiseTo"] = bnpBitwiseTo;
    this["op_and"] = op_and;
    this["bnAnd"] = bnAnd;
    this["op_or"] = op_or;
    this["bnOr"] = bnOr;
    this["op_xor"] = op_xor;
    this["bnXor"] = bnXor;
    this["op_andnot"] = op_andnot;
    this["bnAndNot"] = bnAndNot;
    this["bnNot"] = bnNot;
    this["bnShiftLeft"] = bnShiftLeft;
    this["bnShiftRight"] = bnShiftRight;
    this["lbit"] = lbit;
    this["bnGetLowestSetBit"] = bnGetLowestSetBit;
    this["cbit"] = cbit;
    this["bnBitCount"] = bnBitCount;
    this["bnTestBit"] = bnTestBit;
    this["bnpChangeBit"] = bnpChangeBit;
    this["bnSetBit"] = bnSetBit;
    this["bnClearBit"] = bnClearBit;
    this["bnFlipBit"] = bnFlipBit;
    this["bnpAddTo"] = bnpAddTo;
    this["bnAdd"] = bnAdd;
    this["bnSubtract"] = bnSubtract;
    this["bnMultiply"] = bnMultiply;
    this["bnSquare"] = bnSquare;
    this["bnDivide"] = bnDivide;
    this["bnRemainder"] = bnRemainder;
    this["bnDivideAndRemainder"] = bnDivideAndRemainder;
    this["bnpDMultiply"] = bnpDMultiply;
    this["bnpDAddOffset"] = bnpDAddOffset;
    this["NullExp"] = NullExp;
    this["nNop"] = nNop;
    this["nMulTo"] = nMulTo;
    this["nSqrTo"] = nSqrTo;
    this["bnPow"] = bnPow;
    this["bnpMultiplyLowerTo"] = bnpMultiplyLowerTo;
    this["bnpMultiplyUpperTo"] = bnpMultiplyUpperTo;
    this["Barrett"] = Barrett;
    this["barrettConvert"] = barrettConvert;
    this["barrettRevert"] = barrettRevert;
    this["barrettReduce"] = barrettReduce;
    this["barrettSqrTo"] = barrettSqrTo;
    this["barrettMulTo"] = barrettMulTo;
    this["bnModPow"] = bnModPow;
    this["bnGCD"] = bnGCD;
    this["bnpModInt"] = bnpModInt;
    this["bnModInverse"] = bnModInverse;
    this["bnIsProbablePrime"] = bnIsProbablePrime;
    this["bnpMillerRabin"] = bnpMillerRabin;
    this["parseBigInt"] = parseBigInt;
    this["linebrk"] = linebrk;
    this["byte2Hex"] = byte2Hex;
    this["pkcs1pad2"] = pkcs1pad2;
    this["oaep_mgf1_arr"] = oaep_mgf1_arr;
    this["oaep_pad"] = oaep_pad;
    this["RSAKey"] = RSAKey;
    this["RSASetPublic"] = RSASetPublic;
    this["RSADoPublic"] = RSADoPublic;
    this["RSAEncrypt"] = RSAEncrypt;
    this["RSAEncryptOAEP"] = RSAEncryptOAEP;
    this["pkcs1unpad2"] = pkcs1unpad2;
    this["oaep_mgf1_str"] = oaep_mgf1_str;
    this["oaep_unpad"] = oaep_unpad;
    this["RSASetPrivate"] = RSASetPrivate;
    this["RSASetPrivateEx"] = RSASetPrivateEx;
    this["RSAGenerate"] = RSAGenerate;
    this["RSADoPrivate"] = RSADoPrivate;
    this["RSADecrypt"] = RSADecrypt;
    this["RSADecryptOAEP"] = RSADecryptOAEP;
    this["_rsapem_pemToBase64"] = _rsapem_pemToBase64;
    this["_rsapem_getPosArrayOfChildrenFromHex"] = _rsapem_getPosArrayOfChildrenFromHex;
    this["_rsapem_getHexValueArrayOfChildrenFromHex"] = _rsapem_getHexValueArrayOfChildrenFromHex;
    this["_rsapem_readPrivateKeyFromASN1HexString"] = _rsapem_readPrivateKeyFromASN1HexString;
    this["_rsapem_readPrivateKeyFromPEMString"] = _rsapem_readPrivateKeyFromPEMString;
    this["_rsasign_getHexPaddedDigestInfoForString"] = _rsasign_getHexPaddedDigestInfoForString;
    this["_zeroPaddingOfSignature"] = _zeroPaddingOfSignature;
    this["_rsasign_signString"] = _rsasign_signString;
    this["_rsasign_signWithMessageHash"] = _rsasign_signWithMessageHash;
    this["_rsasign_signStringWithSHA1"] = _rsasign_signStringWithSHA1;
    this["_rsasign_signStringWithSHA256"] = _rsasign_signStringWithSHA256;
    this["pss_mgf1_str"] = pss_mgf1_str;
    this["_rsasign_signStringPSS"] = _rsasign_signStringPSS;
    this["_rsasign_signWithMessageHashPSS"] = _rsasign_signWithMessageHashPSS;
    this["_rsasign_getDecryptSignatureBI"] = _rsasign_getDecryptSignatureBI;
    this["_rsasign_getHexDigestInfoFromSig"] = _rsasign_getHexDigestInfoFromSig;
    this["_rsasign_getAlgNameAndHashFromHexDisgestInfo"] = _rsasign_getAlgNameAndHashFromHexDisgestInfo;
    this["_rsasign_verifySignatureWithArgs"] = _rsasign_verifySignatureWithArgs;
    this["_rsasign_verifyHexSignatureForMessage"] = _rsasign_verifyHexSignatureForMessage;
    this["_rsasign_verifyString"] = _rsasign_verifyString;
    this["_rsasign_verifyWithMessageHash"] = _rsasign_verifyWithMessageHash;
    this["_rsasign_verifyStringPSS"] = _rsasign_verifyStringPSS;
    this["_rsasign_verifyWithMessageHashPSS"] = _rsasign_verifyWithMessageHashPSS;
    this["X509"] = X509;
    this["Base64x"] = Base64x;
    this["stoBA"] = stoBA;
    this["BAtos"] = BAtos;
    this["BAtohex"] = BAtohex;
    this["stohex"] = stohex;
    this["stob64"] = stob64;
    this["stob64u"] = stob64u;
    this["b64utos"] = b64utos;
    this["b64tob64u"] = b64tob64u;
    this["b64utob64"] = b64utob64;
    this["hextob64u"] = hextob64u;
    this["b64utohex"] = b64utohex;
    this["utf8tob64"] = utf8tob64;
    this["b64toutf8"] = b64toutf8;
    this["utf8tohex"] = utf8tohex;
    this["hextoutf8"] = hextoutf8;
    this["hextorstr"] = hextorstr;
    this["rstrtohex"] = rstrtohex;
    this["hextob64"] = hextob64;
    this["hextob64nl"] = hextob64nl;
    this["b64nltohex"] = b64nltohex;
    this["uricmptohex"] = uricmptohex;
    this["hextouricmp"] = hextouricmp;
    this["encodeURIComponentAll"] = encodeURIComponentAll;
    this["newline_toUnix"] = newline_toUnix;
    this["newline_toDos"] = newline_toDos;
    var b64map = this["b64map"];
    var b64pad = this["b64pad"];
    var dbits = this["dbits"];
    var canary = this["canary"];
    var j_lm = this["j_lm"];
    var BI_FP = this["BI_FP"];
    var BI_RM = this["BI_RM"];
    var BI_RC = this["BI_RC"];
    var rr = this["rr"];
    var vv = this["vv"];
    var lowprimes = this["lowprimes"];
    var lplim = this["lplim"];
    var SHA1_SIZE = this["SHA1_SIZE"];
    var _RE_HEXDECONLY = this["_RE_HEXDECONLY"];
    var ASN1HEX = this["ASN1HEX"];
    var utf8tob64u = this["utf8tob64u"];
    var b64utoutf8 = this["b64utoutf8"];
    var b64map = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var b64pad = "=";
    function hex2b64(h) {
      var i;
      var c;
      var ret = "";
      for (i = 0; i + 3 <= h.length; i += 3) {
        c = parseInt(h.substring(i, i + 3), 16);
        ret += b64map.charAt(c >> 6) + b64map.charAt(c & 63);
      }
      if (i + 1 == h.length) {
        c = parseInt(h.substring(i, i + 1), 16);
        ret += b64map.charAt(c << 2);
      } else if (i + 2 == h.length) {
        c = parseInt(h.substring(i, i + 2), 16);
        ret += b64map.charAt(c >> 2) + b64map.charAt((c & 3) << 4);
      }
      if (b64pad)
        while ((ret.length & 3) > 0)
          ret += b64pad;
      return ret;
    }
    function b64tohex(s) {
      var ret = "";
      var i;
      var k = 0;
      var slop;
      var v;
      for (i = 0; i < s.length; ++i) {
        if (s.charAt(i) == b64pad)
          break;
        v = b64map.indexOf(s.charAt(i));
        if (v < 0)
          continue;
        if (k == 0) {
          ret += int2char(v >> 2);
          slop = v & 3;
          k = 1;
        } else if (k == 1) {
          ret += int2char((slop << 2) | (v >> 4));
          slop = v & 0xf;
          k = 2;
        } else if (k == 2) {
          ret += int2char(slop);
          ret += int2char(v >> 2);
          slop = v & 3;
          k = 3;
        } else {
          ret += int2char((slop << 2) | (v >> 4));
          ret += int2char(v & 0xf);
          k = 0;
        }
      }
      if (k == 1)
        ret += int2char(slop << 2);
      return ret;
    }
    function b64toBA(s) {
      var h = b64tohex(s);
      var i;
      var a = new Array();
      for (i = 0; 2 * i < h.length; ++i) {
        a[i] = parseInt(h.substring(2 * i, 2 * i + 2), 16);
      }
      return a;
    }
    var dbits;
    var canary = 0xdeadbeefcafe;
    var j_lm = ((canary & 0xffffff) == 0xefcafe);
    function BigInteger(a, b, c) {
      if (a != null)
        if ("number" == typeof a)
          this.fromNumber(a, b, c);
        else if (b == null && "string" != typeof a)
          this.fromString(a, 256);
        else
          this.fromString(a, b);
    }
    function nbi() {
      return new BigInteger(null);
    }
    function am1(i, x, w, j, c, n) {
      while (--n >= 0) {
        var v = x * this[i++] + w[j] + c;
        c = Math.floor(v / 0x4000000);
        w[j++] = v & 0x3ffffff;
      }
      return c;
    }
    function am2(i, x, w, j, c, n) {
      var xl = x & 0x7fff,
          xh = x >> 15;
      while (--n >= 0) {
        var l = this[i] & 0x7fff;
        var h = this[i++] >> 15;
        var m = xh * l + h * xl;
        l = xl * l + ((m & 0x7fff) << 15) + w[j] + (c & 0x3fffffff);
        c = (l >>> 30) + (m >>> 15) + xh * h + (c >>> 30);
        w[j++] = l & 0x3fffffff;
      }
      return c;
    }
    function am3(i, x, w, j, c, n) {
      var xl = x & 0x3fff,
          xh = x >> 14;
      while (--n >= 0) {
        var l = this[i] & 0x3fff;
        var h = this[i++] >> 14;
        var m = xh * l + h * xl;
        l = xl * l + ((m & 0x3fff) << 14) + w[j] + c;
        c = (l >> 28) + (m >> 14) + xh * h;
        w[j++] = l & 0xfffffff;
      }
      return c;
    }
    if (j_lm && (navigator.appName == "Microsoft Internet Explorer")) {
      BigInteger.prototype.am = am2;
      dbits = 30;
    } else if (j_lm && (navigator.appName != "Netscape")) {
      BigInteger.prototype.am = am1;
      dbits = 26;
    } else {
      BigInteger.prototype.am = am3;
      dbits = 28;
    }
    BigInteger.prototype.DB = dbits;
    BigInteger.prototype.DM = ((1 << dbits) - 1);
    BigInteger.prototype.DV = (1 << dbits);
    var BI_FP = 52;
    BigInteger.prototype.FV = Math.pow(2, BI_FP);
    BigInteger.prototype.F1 = BI_FP - dbits;
    BigInteger.prototype.F2 = 2 * dbits - BI_FP;
    var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
    var BI_RC = new Array();
    var rr,
        vv;
    rr = "0".charCodeAt(0);
    for (vv = 0; vv <= 9; ++vv)
      BI_RC[rr++] = vv;
    rr = "a".charCodeAt(0);
    for (vv = 10; vv < 36; ++vv)
      BI_RC[rr++] = vv;
    rr = "A".charCodeAt(0);
    for (vv = 10; vv < 36; ++vv)
      BI_RC[rr++] = vv;
    function int2char(n) {
      return BI_RM.charAt(n);
    }
    function intAt(s, i) {
      var c = BI_RC[s.charCodeAt(i)];
      return (c == null) ? -1 : c;
    }
    function bnpCopyTo(r) {
      for (var i = this.t - 1; i >= 0; --i)
        r[i] = this[i];
      r.t = this.t;
      r.s = this.s;
    }
    function bnpFromInt(x) {
      this.t = 1;
      this.s = (x < 0) ? -1 : 0;
      if (x > 0)
        this[0] = x;
      else if (x < -1)
        this[0] = x + this.DV;
      else
        this.t = 0;
    }
    function nbv(i) {
      var r = nbi();
      r.fromInt(i);
      return r;
    }
    function bnpFromString(s, b) {
      var k;
      if (b == 16)
        k = 4;
      else if (b == 8)
        k = 3;
      else if (b == 256)
        k = 8;
      else if (b == 2)
        k = 1;
      else if (b == 32)
        k = 5;
      else if (b == 4)
        k = 2;
      else {
        this.fromRadix(s, b);
        return;
      }
      this.t = 0;
      this.s = 0;
      var i = s.length,
          mi = false,
          sh = 0;
      while (--i >= 0) {
        var x = (k == 8) ? s[i] & 0xff : intAt(s, i);
        if (x < 0) {
          if (s.charAt(i) == "-")
            mi = true;
          continue;
        }
        mi = false;
        if (sh == 0)
          this[this.t++] = x;
        else if (sh + k > this.DB) {
          this[this.t - 1] |= (x & ((1 << (this.DB - sh)) - 1)) << sh;
          this[this.t++] = (x >> (this.DB - sh));
        } else
          this[this.t - 1] |= x << sh;
        sh += k;
        if (sh >= this.DB)
          sh -= this.DB;
      }
      if (k == 8 && (s[0] & 0x80) != 0) {
        this.s = -1;
        if (sh > 0)
          this[this.t - 1] |= ((1 << (this.DB - sh)) - 1) << sh;
      }
      this.clamp();
      if (mi)
        BigInteger.ZERO.subTo(this, this);
    }
    function bnpClamp() {
      var c = this.s & this.DM;
      while (this.t > 0 && this[this.t - 1] == c)
        --this.t;
    }
    function bnToString(b) {
      if (this.s < 0)
        return "-" + this.negate().toString(b);
      var k;
      if (b == 16)
        k = 4;
      else if (b == 8)
        k = 3;
      else if (b == 2)
        k = 1;
      else if (b == 32)
        k = 5;
      else if (b == 4)
        k = 2;
      else
        return this.toRadix(b);
      var km = (1 << k) - 1,
          d,
          m = false,
          r = "",
          i = this.t;
      var p = this.DB - (i * this.DB) % k;
      if (i-- > 0) {
        if (p < this.DB && (d = this[i] >> p) > 0) {
          m = true;
          r = int2char(d);
        }
        while (i >= 0) {
          if (p < k) {
            d = (this[i] & ((1 << p) - 1)) << (k - p);
            d |= this[--i] >> (p += this.DB - k);
          } else {
            d = (this[i] >> (p -= k)) & km;
            if (p <= 0) {
              p += this.DB;
              --i;
            }
          }
          if (d > 0)
            m = true;
          if (m)
            r += int2char(d);
        }
      }
      return m ? r : "0";
    }
    function bnNegate() {
      var r = nbi();
      BigInteger.ZERO.subTo(this, r);
      return r;
    }
    function bnAbs() {
      return (this.s < 0) ? this.negate() : this;
    }
    function bnCompareTo(a) {
      var r = this.s - a.s;
      if (r != 0)
        return r;
      var i = this.t;
      r = i - a.t;
      if (r != 0)
        return (this.s < 0) ? -r : r;
      while (--i >= 0)
        if ((r = this[i] - a[i]) != 0)
          return r;
      return 0;
    }
    function nbits(x) {
      var r = 1,
          t;
      if ((t = x >>> 16) != 0) {
        x = t;
        r += 16;
      }
      if ((t = x >> 8) != 0) {
        x = t;
        r += 8;
      }
      if ((t = x >> 4) != 0) {
        x = t;
        r += 4;
      }
      if ((t = x >> 2) != 0) {
        x = t;
        r += 2;
      }
      if ((t = x >> 1) != 0) {
        x = t;
        r += 1;
      }
      return r;
    }
    function bnBitLength() {
      if (this.t <= 0)
        return 0;
      return this.DB * (this.t - 1) + nbits(this[this.t - 1] ^ (this.s & this.DM));
    }
    function bnpDLShiftTo(n, r) {
      var i;
      for (i = this.t - 1; i >= 0; --i)
        r[i + n] = this[i];
      for (i = n - 1; i >= 0; --i)
        r[i] = 0;
      r.t = this.t + n;
      r.s = this.s;
    }
    function bnpDRShiftTo(n, r) {
      for (var i = n; i < this.t; ++i)
        r[i - n] = this[i];
      r.t = Math.max(this.t - n, 0);
      r.s = this.s;
    }
    function bnpLShiftTo(n, r) {
      var bs = n % this.DB;
      var cbs = this.DB - bs;
      var bm = (1 << cbs) - 1;
      var ds = Math.floor(n / this.DB),
          c = (this.s << bs) & this.DM,
          i;
      for (i = this.t - 1; i >= 0; --i) {
        r[i + ds + 1] = (this[i] >> cbs) | c;
        c = (this[i] & bm) << bs;
      }
      for (i = ds - 1; i >= 0; --i)
        r[i] = 0;
      r[ds] = c;
      r.t = this.t + ds + 1;
      r.s = this.s;
      r.clamp();
    }
    function bnpRShiftTo(n, r) {
      r.s = this.s;
      var ds = Math.floor(n / this.DB);
      if (ds >= this.t) {
        r.t = 0;
        return;
      }
      var bs = n % this.DB;
      var cbs = this.DB - bs;
      var bm = (1 << bs) - 1;
      r[0] = this[ds] >> bs;
      for (var i = ds + 1; i < this.t; ++i) {
        r[i - ds - 1] |= (this[i] & bm) << cbs;
        r[i - ds] = this[i] >> bs;
      }
      if (bs > 0)
        r[this.t - ds - 1] |= (this.s & bm) << cbs;
      r.t = this.t - ds;
      r.clamp();
    }
    function bnpSubTo(a, r) {
      var i = 0,
          c = 0,
          m = Math.min(a.t, this.t);
      while (i < m) {
        c += this[i] - a[i];
        r[i++] = c & this.DM;
        c >>= this.DB;
      }
      if (a.t < this.t) {
        c -= a.s;
        while (i < this.t) {
          c += this[i];
          r[i++] = c & this.DM;
          c >>= this.DB;
        }
        c += this.s;
      } else {
        c += this.s;
        while (i < a.t) {
          c -= a[i];
          r[i++] = c & this.DM;
          c >>= this.DB;
        }
        c -= a.s;
      }
      r.s = (c < 0) ? -1 : 0;
      if (c < -1)
        r[i++] = this.DV + c;
      else if (c > 0)
        r[i++] = c;
      r.t = i;
      r.clamp();
    }
    function bnpMultiplyTo(a, r) {
      var x = this.abs(),
          y = a.abs();
      var i = x.t;
      r.t = i + y.t;
      while (--i >= 0)
        r[i] = 0;
      for (i = 0; i < y.t; ++i)
        r[i + x.t] = x.am(0, y[i], r, i, 0, x.t);
      r.s = 0;
      r.clamp();
      if (this.s != a.s)
        BigInteger.ZERO.subTo(r, r);
    }
    function bnpSquareTo(r) {
      var x = this.abs();
      var i = r.t = 2 * x.t;
      while (--i >= 0)
        r[i] = 0;
      for (i = 0; i < x.t - 1; ++i) {
        var c = x.am(i, x[i], r, 2 * i, 0, 1);
        if ((r[i + x.t] += x.am(i + 1, 2 * x[i], r, 2 * i + 1, c, x.t - i - 1)) >= x.DV) {
          r[i + x.t] -= x.DV;
          r[i + x.t + 1] = 1;
        }
      }
      if (r.t > 0)
        r[r.t - 1] += x.am(i, x[i], r, 2 * i, 0, 1);
      r.s = 0;
      r.clamp();
    }
    function bnpDivRemTo(m, q, r) {
      var pm = m.abs();
      if (pm.t <= 0)
        return;
      var pt = this.abs();
      if (pt.t < pm.t) {
        if (q != null)
          q.fromInt(0);
        if (r != null)
          this.copyTo(r);
        return;
      }
      if (r == null)
        r = nbi();
      var y = nbi(),
          ts = this.s,
          ms = m.s;
      var nsh = this.DB - nbits(pm[pm.t - 1]);
      if (nsh > 0) {
        pm.lShiftTo(nsh, y);
        pt.lShiftTo(nsh, r);
      } else {
        pm.copyTo(y);
        pt.copyTo(r);
      }
      var ys = y.t;
      var y0 = y[ys - 1];
      if (y0 == 0)
        return;
      var yt = y0 * (1 << this.F1) + ((ys > 1) ? y[ys - 2] >> this.F2 : 0);
      var d1 = this.FV / yt,
          d2 = (1 << this.F1) / yt,
          e = 1 << this.F2;
      var i = r.t,
          j = i - ys,
          t = (q == null) ? nbi() : q;
      y.dlShiftTo(j, t);
      if (r.compareTo(t) >= 0) {
        r[r.t++] = 1;
        r.subTo(t, r);
      }
      BigInteger.ONE.dlShiftTo(ys, t);
      t.subTo(y, y);
      while (y.t < ys)
        y[y.t++] = 0;
      while (--j >= 0) {
        var qd = (r[--i] == y0) ? this.DM : Math.floor(r[i] * d1 + (r[i - 1] + e) * d2);
        if ((r[i] += y.am(0, qd, r, j, 0, ys)) < qd) {
          y.dlShiftTo(j, t);
          r.subTo(t, r);
          while (r[i] < --qd)
            r.subTo(t, r);
        }
      }
      if (q != null) {
        r.drShiftTo(ys, q);
        if (ts != ms)
          BigInteger.ZERO.subTo(q, q);
      }
      r.t = ys;
      r.clamp();
      if (nsh > 0)
        r.rShiftTo(nsh, r);
      if (ts < 0)
        BigInteger.ZERO.subTo(r, r);
    }
    function bnMod(a) {
      var r = nbi();
      this.abs().divRemTo(a, null, r);
      if (this.s < 0 && r.compareTo(BigInteger.ZERO) > 0)
        a.subTo(r, r);
      return r;
    }
    function Classic(m) {
      this.m = m;
    }
    function cConvert(x) {
      if (x.s < 0 || x.compareTo(this.m) >= 0)
        return x.mod(this.m);
      else
        return x;
    }
    function cRevert(x) {
      return x;
    }
    function cReduce(x) {
      x.divRemTo(this.m, null, x);
    }
    function cMulTo(x, y, r) {
      x.multiplyTo(y, r);
      this.reduce(r);
    }
    function cSqrTo(x, r) {
      x.squareTo(r);
      this.reduce(r);
    }
    Classic.prototype.convert = cConvert;
    Classic.prototype.revert = cRevert;
    Classic.prototype.reduce = cReduce;
    Classic.prototype.mulTo = cMulTo;
    Classic.prototype.sqrTo = cSqrTo;
    function bnpInvDigit() {
      if (this.t < 1)
        return 0;
      var x = this[0];
      if ((x & 1) == 0)
        return 0;
      var y = x & 3;
      y = (y * (2 - (x & 0xf) * y)) & 0xf;
      y = (y * (2 - (x & 0xff) * y)) & 0xff;
      y = (y * (2 - (((x & 0xffff) * y) & 0xffff))) & 0xffff;
      y = (y * (2 - x * y % this.DV)) % this.DV;
      return (y > 0) ? this.DV - y : -y;
    }
    function Montgomery(m) {
      this.m = m;
      this.mp = m.invDigit();
      this.mpl = this.mp & 0x7fff;
      this.mph = this.mp >> 15;
      this.um = (1 << (m.DB - 15)) - 1;
      this.mt2 = 2 * m.t;
    }
    function montConvert(x) {
      var r = nbi();
      x.abs().dlShiftTo(this.m.t, r);
      r.divRemTo(this.m, null, r);
      if (x.s < 0 && r.compareTo(BigInteger.ZERO) > 0)
        this.m.subTo(r, r);
      return r;
    }
    function montRevert(x) {
      var r = nbi();
      x.copyTo(r);
      this.reduce(r);
      return r;
    }
    function montReduce(x) {
      while (x.t <= this.mt2)
        x[x.t++] = 0;
      for (var i = 0; i < this.m.t; ++i) {
        var j = x[i] & 0x7fff;
        var u0 = (j * this.mpl + (((j * this.mph + (x[i] >> 15) * this.mpl) & this.um) << 15)) & x.DM;
        j = i + this.m.t;
        x[j] += this.m.am(0, u0, x, i, 0, this.m.t);
        while (x[j] >= x.DV) {
          x[j] -= x.DV;
          x[++j]++;
        }
      }
      x.clamp();
      x.drShiftTo(this.m.t, x);
      if (x.compareTo(this.m) >= 0)
        x.subTo(this.m, x);
    }
    function montSqrTo(x, r) {
      x.squareTo(r);
      this.reduce(r);
    }
    function montMulTo(x, y, r) {
      x.multiplyTo(y, r);
      this.reduce(r);
    }
    Montgomery.prototype.convert = montConvert;
    Montgomery.prototype.revert = montRevert;
    Montgomery.prototype.reduce = montReduce;
    Montgomery.prototype.mulTo = montMulTo;
    Montgomery.prototype.sqrTo = montSqrTo;
    function bnpIsEven() {
      return ((this.t > 0) ? (this[0] & 1) : this.s) == 0;
    }
    function bnpExp(e, z) {
      if (e > 0xffffffff || e < 1)
        return BigInteger.ONE;
      var r = nbi(),
          r2 = nbi(),
          g = z.convert(this),
          i = nbits(e) - 1;
      g.copyTo(r);
      while (--i >= 0) {
        z.sqrTo(r, r2);
        if ((e & (1 << i)) > 0)
          z.mulTo(r2, g, r);
        else {
          var t = r;
          r = r2;
          r2 = t;
        }
      }
      return z.revert(r);
    }
    function bnModPowInt(e, m) {
      var z;
      if (e < 256 || m.isEven())
        z = new Classic(m);
      else
        z = new Montgomery(m);
      return this.exp(e, z);
    }
    BigInteger.prototype.copyTo = bnpCopyTo;
    BigInteger.prototype.fromInt = bnpFromInt;
    BigInteger.prototype.fromString = bnpFromString;
    BigInteger.prototype.clamp = bnpClamp;
    BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
    BigInteger.prototype.drShiftTo = bnpDRShiftTo;
    BigInteger.prototype.lShiftTo = bnpLShiftTo;
    BigInteger.prototype.rShiftTo = bnpRShiftTo;
    BigInteger.prototype.subTo = bnpSubTo;
    BigInteger.prototype.multiplyTo = bnpMultiplyTo;
    BigInteger.prototype.squareTo = bnpSquareTo;
    BigInteger.prototype.divRemTo = bnpDivRemTo;
    BigInteger.prototype.invDigit = bnpInvDigit;
    BigInteger.prototype.isEven = bnpIsEven;
    BigInteger.prototype.exp = bnpExp;
    BigInteger.prototype.toString = bnToString;
    BigInteger.prototype.negate = bnNegate;
    BigInteger.prototype.abs = bnAbs;
    BigInteger.prototype.compareTo = bnCompareTo;
    BigInteger.prototype.bitLength = bnBitLength;
    BigInteger.prototype.mod = bnMod;
    BigInteger.prototype.modPowInt = bnModPowInt;
    BigInteger.ZERO = nbv(0);
    BigInteger.ONE = nbv(1);
    function bnClone() {
      var r = nbi();
      this.copyTo(r);
      return r;
    }
    function bnIntValue() {
      if (this.s < 0) {
        if (this.t == 1)
          return this[0] - this.DV;
        else if (this.t == 0)
          return -1;
      } else if (this.t == 1)
        return this[0];
      else if (this.t == 0)
        return 0;
      return ((this[1] & ((1 << (32 - this.DB)) - 1)) << this.DB) | this[0];
    }
    function bnByteValue() {
      return (this.t == 0) ? this.s : (this[0] << 24) >> 24;
    }
    function bnShortValue() {
      return (this.t == 0) ? this.s : (this[0] << 16) >> 16;
    }
    function bnpChunkSize(r) {
      return Math.floor(Math.LN2 * this.DB / Math.log(r));
    }
    function bnSigNum() {
      if (this.s < 0)
        return -1;
      else if (this.t <= 0 || (this.t == 1 && this[0] <= 0))
        return 0;
      else
        return 1;
    }
    function bnpToRadix(b) {
      if (b == null)
        b = 10;
      if (this.signum() == 0 || b < 2 || b > 36)
        return "0";
      var cs = this.chunkSize(b);
      var a = Math.pow(b, cs);
      var d = nbv(a),
          y = nbi(),
          z = nbi(),
          r = "";
      this.divRemTo(d, y, z);
      while (y.signum() > 0) {
        r = (a + z.intValue()).toString(b).substr(1) + r;
        y.divRemTo(d, y, z);
      }
      return z.intValue().toString(b) + r;
    }
    function bnpFromRadix(s, b) {
      this.fromInt(0);
      if (b == null)
        b = 10;
      var cs = this.chunkSize(b);
      var d = Math.pow(b, cs),
          mi = false,
          j = 0,
          w = 0;
      for (var i = 0; i < s.length; ++i) {
        var x = intAt(s, i);
        if (x < 0) {
          if (s.charAt(i) == "-" && this.signum() == 0)
            mi = true;
          continue;
        }
        w = b * w + x;
        if (++j >= cs) {
          this.dMultiply(d);
          this.dAddOffset(w, 0);
          j = 0;
          w = 0;
        }
      }
      if (j > 0) {
        this.dMultiply(Math.pow(b, j));
        this.dAddOffset(w, 0);
      }
      if (mi)
        BigInteger.ZERO.subTo(this, this);
    }
    function bnpFromNumber(a, b, c) {
      if ("number" == typeof b) {
        if (a < 2)
          this.fromInt(1);
        else {
          this.fromNumber(a, c);
          if (!this.testBit(a - 1))
            this.bitwiseTo(BigInteger.ONE.shiftLeft(a - 1), op_or, this);
          if (this.isEven())
            this.dAddOffset(1, 0);
          while (!this.isProbablePrime(b)) {
            this.dAddOffset(2, 0);
            if (this.bitLength() > a)
              this.subTo(BigInteger.ONE.shiftLeft(a - 1), this);
          }
        }
      } else {
        var x = new Array(),
            t = a & 7;
        x.length = (a >> 3) + 1;
        b.nextBytes(x);
        if (t > 0)
          x[0] &= ((1 << t) - 1);
        else
          x[0] = 0;
        this.fromString(x, 256);
      }
    }
    function bnToByteArray() {
      var i = this.t,
          r = new Array();
      r[0] = this.s;
      var p = this.DB - (i * this.DB) % 8,
          d,
          k = 0;
      if (i-- > 0) {
        if (p < this.DB && (d = this[i] >> p) != (this.s & this.DM) >> p)
          r[k++] = d | (this.s << (this.DB - p));
        while (i >= 0) {
          if (p < 8) {
            d = (this[i] & ((1 << p) - 1)) << (8 - p);
            d |= this[--i] >> (p += this.DB - 8);
          } else {
            d = (this[i] >> (p -= 8)) & 0xff;
            if (p <= 0) {
              p += this.DB;
              --i;
            }
          }
          if ((d & 0x80) != 0)
            d |= -256;
          if (k == 0 && (this.s & 0x80) != (d & 0x80))
            ++k;
          if (k > 0 || d != this.s)
            r[k++] = d;
        }
      }
      return r;
    }
    function bnEquals(a) {
      return (this.compareTo(a) == 0);
    }
    function bnMin(a) {
      return (this.compareTo(a) < 0) ? this : a;
    }
    function bnMax(a) {
      return (this.compareTo(a) > 0) ? this : a;
    }
    function bnpBitwiseTo(a, op, r) {
      var i,
          f,
          m = Math.min(a.t, this.t);
      for (i = 0; i < m; ++i)
        r[i] = op(this[i], a[i]);
      if (a.t < this.t) {
        f = a.s & this.DM;
        for (i = m; i < this.t; ++i)
          r[i] = op(this[i], f);
        r.t = this.t;
      } else {
        f = this.s & this.DM;
        for (i = m; i < a.t; ++i)
          r[i] = op(f, a[i]);
        r.t = a.t;
      }
      r.s = op(this.s, a.s);
      r.clamp();
    }
    function op_and(x, y) {
      return x & y;
    }
    function bnAnd(a) {
      var r = nbi();
      this.bitwiseTo(a, op_and, r);
      return r;
    }
    function op_or(x, y) {
      return x | y;
    }
    function bnOr(a) {
      var r = nbi();
      this.bitwiseTo(a, op_or, r);
      return r;
    }
    function op_xor(x, y) {
      return x ^ y;
    }
    function bnXor(a) {
      var r = nbi();
      this.bitwiseTo(a, op_xor, r);
      return r;
    }
    function op_andnot(x, y) {
      return x & ~y;
    }
    function bnAndNot(a) {
      var r = nbi();
      this.bitwiseTo(a, op_andnot, r);
      return r;
    }
    function bnNot() {
      var r = nbi();
      for (var i = 0; i < this.t; ++i)
        r[i] = this.DM & ~this[i];
      r.t = this.t;
      r.s = ~this.s;
      return r;
    }
    function bnShiftLeft(n) {
      var r = nbi();
      if (n < 0)
        this.rShiftTo(-n, r);
      else
        this.lShiftTo(n, r);
      return r;
    }
    function bnShiftRight(n) {
      var r = nbi();
      if (n < 0)
        this.lShiftTo(-n, r);
      else
        this.rShiftTo(n, r);
      return r;
    }
    function lbit(x) {
      if (x == 0)
        return -1;
      var r = 0;
      if ((x & 0xffff) == 0) {
        x >>= 16;
        r += 16;
      }
      if ((x & 0xff) == 0) {
        x >>= 8;
        r += 8;
      }
      if ((x & 0xf) == 0) {
        x >>= 4;
        r += 4;
      }
      if ((x & 3) == 0) {
        x >>= 2;
        r += 2;
      }
      if ((x & 1) == 0)
        ++r;
      return r;
    }
    function bnGetLowestSetBit() {
      for (var i = 0; i < this.t; ++i)
        if (this[i] != 0)
          return i * this.DB + lbit(this[i]);
      if (this.s < 0)
        return this.t * this.DB;
      return -1;
    }
    function cbit(x) {
      var r = 0;
      while (x != 0) {
        x &= x - 1;
        ++r;
      }
      return r;
    }
    function bnBitCount() {
      var r = 0,
          x = this.s & this.DM;
      for (var i = 0; i < this.t; ++i)
        r += cbit(this[i] ^ x);
      return r;
    }
    function bnTestBit(n) {
      var j = Math.floor(n / this.DB);
      if (j >= this.t)
        return (this.s != 0);
      return ((this[j] & (1 << (n % this.DB))) != 0);
    }
    function bnpChangeBit(n, op) {
      var r = BigInteger.ONE.shiftLeft(n);
      this.bitwiseTo(r, op, r);
      return r;
    }
    function bnSetBit(n) {
      return this.changeBit(n, op_or);
    }
    function bnClearBit(n) {
      return this.changeBit(n, op_andnot);
    }
    function bnFlipBit(n) {
      return this.changeBit(n, op_xor);
    }
    function bnpAddTo(a, r) {
      var i = 0,
          c = 0,
          m = Math.min(a.t, this.t);
      while (i < m) {
        c += this[i] + a[i];
        r[i++] = c & this.DM;
        c >>= this.DB;
      }
      if (a.t < this.t) {
        c += a.s;
        while (i < this.t) {
          c += this[i];
          r[i++] = c & this.DM;
          c >>= this.DB;
        }
        c += this.s;
      } else {
        c += this.s;
        while (i < a.t) {
          c += a[i];
          r[i++] = c & this.DM;
          c >>= this.DB;
        }
        c += a.s;
      }
      r.s = (c < 0) ? -1 : 0;
      if (c > 0)
        r[i++] = c;
      else if (c < -1)
        r[i++] = this.DV + c;
      r.t = i;
      r.clamp();
    }
    function bnAdd(a) {
      var r = nbi();
      this.addTo(a, r);
      return r;
    }
    function bnSubtract(a) {
      var r = nbi();
      this.subTo(a, r);
      return r;
    }
    function bnMultiply(a) {
      var r = nbi();
      this.multiplyTo(a, r);
      return r;
    }
    function bnSquare() {
      var r = nbi();
      this.squareTo(r);
      return r;
    }
    function bnDivide(a) {
      var r = nbi();
      this.divRemTo(a, r, null);
      return r;
    }
    function bnRemainder(a) {
      var r = nbi();
      this.divRemTo(a, null, r);
      return r;
    }
    function bnDivideAndRemainder(a) {
      var q = nbi(),
          r = nbi();
      this.divRemTo(a, q, r);
      return new Array(q, r);
    }
    function bnpDMultiply(n) {
      this[this.t] = this.am(0, n - 1, this, 0, 0, this.t);
      ++this.t;
      this.clamp();
    }
    function bnpDAddOffset(n, w) {
      if (n == 0)
        return;
      while (this.t <= w)
        this[this.t++] = 0;
      this[w] += n;
      while (this[w] >= this.DV) {
        this[w] -= this.DV;
        if (++w >= this.t)
          this[this.t++] = 0;
        ++this[w];
      }
    }
    function NullExp() {}
    function nNop(x) {
      return x;
    }
    function nMulTo(x, y, r) {
      x.multiplyTo(y, r);
    }
    function nSqrTo(x, r) {
      x.squareTo(r);
    }
    NullExp.prototype.convert = nNop;
    NullExp.prototype.revert = nNop;
    NullExp.prototype.mulTo = nMulTo;
    NullExp.prototype.sqrTo = nSqrTo;
    function bnPow(e) {
      return this.exp(e, new NullExp());
    }
    function bnpMultiplyLowerTo(a, n, r) {
      var i = Math.min(this.t + a.t, n);
      r.s = 0;
      r.t = i;
      while (i > 0)
        r[--i] = 0;
      var j;
      for (j = r.t - this.t; i < j; ++i)
        r[i + this.t] = this.am(0, a[i], r, i, 0, this.t);
      for (j = Math.min(a.t, n); i < j; ++i)
        this.am(0, a[i], r, i, 0, n - i);
      r.clamp();
    }
    function bnpMultiplyUpperTo(a, n, r) {
      --n;
      var i = r.t = this.t + a.t - n;
      r.s = 0;
      while (--i >= 0)
        r[i] = 0;
      for (i = Math.max(n - this.t, 0); i < a.t; ++i)
        r[this.t + i - n] = this.am(n - i, a[i], r, 0, 0, this.t + i - n);
      r.clamp();
      r.drShiftTo(1, r);
    }
    function Barrett(m) {
      this.r2 = nbi();
      this.q3 = nbi();
      BigInteger.ONE.dlShiftTo(2 * m.t, this.r2);
      this.mu = this.r2.divide(m);
      this.m = m;
    }
    function barrettConvert(x) {
      if (x.s < 0 || x.t > 2 * this.m.t)
        return x.mod(this.m);
      else if (x.compareTo(this.m) < 0)
        return x;
      else {
        var r = nbi();
        x.copyTo(r);
        this.reduce(r);
        return r;
      }
    }
    function barrettRevert(x) {
      return x;
    }
    function barrettReduce(x) {
      x.drShiftTo(this.m.t - 1, this.r2);
      if (x.t > this.m.t + 1) {
        x.t = this.m.t + 1;
        x.clamp();
      }
      this.mu.multiplyUpperTo(this.r2, this.m.t + 1, this.q3);
      this.m.multiplyLowerTo(this.q3, this.m.t + 1, this.r2);
      while (x.compareTo(this.r2) < 0)
        x.dAddOffset(1, this.m.t + 1);
      x.subTo(this.r2, x);
      while (x.compareTo(this.m) >= 0)
        x.subTo(this.m, x);
    }
    function barrettSqrTo(x, r) {
      x.squareTo(r);
      this.reduce(r);
    }
    function barrettMulTo(x, y, r) {
      x.multiplyTo(y, r);
      this.reduce(r);
    }
    Barrett.prototype.convert = barrettConvert;
    Barrett.prototype.revert = barrettRevert;
    Barrett.prototype.reduce = barrettReduce;
    Barrett.prototype.mulTo = barrettMulTo;
    Barrett.prototype.sqrTo = barrettSqrTo;
    function bnModPow(e, m) {
      var i = e.bitLength(),
          k,
          r = nbv(1),
          z;
      if (i <= 0)
        return r;
      else if (i < 18)
        k = 1;
      else if (i < 48)
        k = 3;
      else if (i < 144)
        k = 4;
      else if (i < 768)
        k = 5;
      else
        k = 6;
      if (i < 8)
        z = new Classic(m);
      else if (m.isEven())
        z = new Barrett(m);
      else
        z = new Montgomery(m);
      var g = new Array(),
          n = 3,
          k1 = k - 1,
          km = (1 << k) - 1;
      g[1] = z.convert(this);
      if (k > 1) {
        var g2 = nbi();
        z.sqrTo(g[1], g2);
        while (n <= km) {
          g[n] = nbi();
          z.mulTo(g2, g[n - 2], g[n]);
          n += 2;
        }
      }
      var j = e.t - 1,
          w,
          is1 = true,
          r2 = nbi(),
          t;
      i = nbits(e[j]) - 1;
      while (j >= 0) {
        if (i >= k1)
          w = (e[j] >> (i - k1)) & km;
        else {
          w = (e[j] & ((1 << (i + 1)) - 1)) << (k1 - i);
          if (j > 0)
            w |= e[j - 1] >> (this.DB + i - k1);
        }
        n = k;
        while ((w & 1) == 0) {
          w >>= 1;
          --n;
        }
        if ((i -= n) < 0) {
          i += this.DB;
          --j;
        }
        if (is1) {
          g[w].copyTo(r);
          is1 = false;
        } else {
          while (n > 1) {
            z.sqrTo(r, r2);
            z.sqrTo(r2, r);
            n -= 2;
          }
          if (n > 0)
            z.sqrTo(r, r2);
          else {
            t = r;
            r = r2;
            r2 = t;
          }
          z.mulTo(r2, g[w], r);
        }
        while (j >= 0 && (e[j] & (1 << i)) == 0) {
          z.sqrTo(r, r2);
          t = r;
          r = r2;
          r2 = t;
          if (--i < 0) {
            i = this.DB - 1;
            --j;
          }
        }
      }
      return z.revert(r);
    }
    function bnGCD(a) {
      var x = (this.s < 0) ? this.negate() : this.clone();
      var y = (a.s < 0) ? a.negate() : a.clone();
      if (x.compareTo(y) < 0) {
        var t = x;
        x = y;
        y = t;
      }
      var i = x.getLowestSetBit(),
          g = y.getLowestSetBit();
      if (g < 0)
        return x;
      if (i < g)
        g = i;
      if (g > 0) {
        x.rShiftTo(g, x);
        y.rShiftTo(g, y);
      }
      while (x.signum() > 0) {
        if ((i = x.getLowestSetBit()) > 0)
          x.rShiftTo(i, x);
        if ((i = y.getLowestSetBit()) > 0)
          y.rShiftTo(i, y);
        if (x.compareTo(y) >= 0) {
          x.subTo(y, x);
          x.rShiftTo(1, x);
        } else {
          y.subTo(x, y);
          y.rShiftTo(1, y);
        }
      }
      if (g > 0)
        y.lShiftTo(g, y);
      return y;
    }
    function bnpModInt(n) {
      if (n <= 0)
        return 0;
      var d = this.DV % n,
          r = (this.s < 0) ? n - 1 : 0;
      if (this.t > 0)
        if (d == 0)
          r = this[0] % n;
        else
          for (var i = this.t - 1; i >= 0; --i)
            r = (d * r + this[i]) % n;
      return r;
    }
    function bnModInverse(m) {
      var ac = m.isEven();
      if ((this.isEven() && ac) || m.signum() == 0)
        return BigInteger.ZERO;
      var u = m.clone(),
          v = this.clone();
      var a = nbv(1),
          b = nbv(0),
          c = nbv(0),
          d = nbv(1);
      while (u.signum() != 0) {
        while (u.isEven()) {
          u.rShiftTo(1, u);
          if (ac) {
            if (!a.isEven() || !b.isEven()) {
              a.addTo(this, a);
              b.subTo(m, b);
            }
            a.rShiftTo(1, a);
          } else if (!b.isEven())
            b.subTo(m, b);
          b.rShiftTo(1, b);
        }
        while (v.isEven()) {
          v.rShiftTo(1, v);
          if (ac) {
            if (!c.isEven() || !d.isEven()) {
              c.addTo(this, c);
              d.subTo(m, d);
            }
            c.rShiftTo(1, c);
          } else if (!d.isEven())
            d.subTo(m, d);
          d.rShiftTo(1, d);
        }
        if (u.compareTo(v) >= 0) {
          u.subTo(v, u);
          if (ac)
            a.subTo(c, a);
          b.subTo(d, b);
        } else {
          v.subTo(u, v);
          if (ac)
            c.subTo(a, c);
          d.subTo(b, d);
        }
      }
      if (v.compareTo(BigInteger.ONE) != 0)
        return BigInteger.ZERO;
      if (d.compareTo(m) >= 0)
        return d.subtract(m);
      if (d.signum() < 0)
        d.addTo(m, d);
      else
        return d;
      if (d.signum() < 0)
        return d.add(m);
      else
        return d;
    }
    var lowprimes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313, 317, 331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397, 401, 409, 419, 421, 431, 433, 439, 443, 449, 457, 461, 463, 467, 479, 487, 491, 499, 503, 509, 521, 523, 541, 547, 557, 563, 569, 571, 577, 587, 593, 599, 601, 607, 613, 617, 619, 631, 641, 643, 647, 653, 659, 661, 673, 677, 683, 691, 701, 709, 719, 727, 733, 739, 743, 751, 757, 761, 769, 773, 787, 797, 809, 811, 821, 823, 827, 829, 839, 853, 857, 859, 863, 877, 881, 883, 887, 907, 911, 919, 929, 937, 941, 947, 953, 967, 971, 977, 983, 991, 997];
    var lplim = (1 << 26) / lowprimes[lowprimes.length - 1];
    function bnIsProbablePrime(t) {
      var i,
          x = this.abs();
      if (x.t == 1 && x[0] <= lowprimes[lowprimes.length - 1]) {
        for (i = 0; i < lowprimes.length; ++i)
          if (x[0] == lowprimes[i])
            return true;
        return false;
      }
      if (x.isEven())
        return false;
      i = 1;
      while (i < lowprimes.length) {
        var m = lowprimes[i],
            j = i + 1;
        while (j < lowprimes.length && m < lplim)
          m *= lowprimes[j++];
        m = x.modInt(m);
        while (i < j)
          if (m % lowprimes[i++] == 0)
            return false;
      }
      return x.millerRabin(t);
    }
    function bnpMillerRabin(t) {
      var n1 = this.subtract(BigInteger.ONE);
      var k = n1.getLowestSetBit();
      if (k <= 0)
        return false;
      var r = n1.shiftRight(k);
      t = (t + 1) >> 1;
      if (t > lowprimes.length)
        t = lowprimes.length;
      var a = nbi();
      for (var i = 0; i < t; ++i) {
        a.fromInt(lowprimes[Math.floor(Math.random() * lowprimes.length)]);
        var y = a.modPow(r, this);
        if (y.compareTo(BigInteger.ONE) != 0 && y.compareTo(n1) != 0) {
          var j = 1;
          while (j++ < k && y.compareTo(n1) != 0) {
            y = y.modPowInt(2, this);
            if (y.compareTo(BigInteger.ONE) == 0)
              return false;
          }
          if (y.compareTo(n1) != 0)
            return false;
        }
      }
      return true;
    }
    BigInteger.prototype.chunkSize = bnpChunkSize;
    BigInteger.prototype.toRadix = bnpToRadix;
    BigInteger.prototype.fromRadix = bnpFromRadix;
    BigInteger.prototype.fromNumber = bnpFromNumber;
    BigInteger.prototype.bitwiseTo = bnpBitwiseTo;
    BigInteger.prototype.changeBit = bnpChangeBit;
    BigInteger.prototype.addTo = bnpAddTo;
    BigInteger.prototype.dMultiply = bnpDMultiply;
    BigInteger.prototype.dAddOffset = bnpDAddOffset;
    BigInteger.prototype.multiplyLowerTo = bnpMultiplyLowerTo;
    BigInteger.prototype.multiplyUpperTo = bnpMultiplyUpperTo;
    BigInteger.prototype.modInt = bnpModInt;
    BigInteger.prototype.millerRabin = bnpMillerRabin;
    BigInteger.prototype.clone = bnClone;
    BigInteger.prototype.intValue = bnIntValue;
    BigInteger.prototype.byteValue = bnByteValue;
    BigInteger.prototype.shortValue = bnShortValue;
    BigInteger.prototype.signum = bnSigNum;
    BigInteger.prototype.toByteArray = bnToByteArray;
    BigInteger.prototype.equals = bnEquals;
    BigInteger.prototype.min = bnMin;
    BigInteger.prototype.max = bnMax;
    BigInteger.prototype.and = bnAnd;
    BigInteger.prototype.or = bnOr;
    BigInteger.prototype.xor = bnXor;
    BigInteger.prototype.andNot = bnAndNot;
    BigInteger.prototype.not = bnNot;
    BigInteger.prototype.shiftLeft = bnShiftLeft;
    BigInteger.prototype.shiftRight = bnShiftRight;
    BigInteger.prototype.getLowestSetBit = bnGetLowestSetBit;
    BigInteger.prototype.bitCount = bnBitCount;
    BigInteger.prototype.testBit = bnTestBit;
    BigInteger.prototype.setBit = bnSetBit;
    BigInteger.prototype.clearBit = bnClearBit;
    BigInteger.prototype.flipBit = bnFlipBit;
    BigInteger.prototype.add = bnAdd;
    BigInteger.prototype.subtract = bnSubtract;
    BigInteger.prototype.multiply = bnMultiply;
    BigInteger.prototype.divide = bnDivide;
    BigInteger.prototype.remainder = bnRemainder;
    BigInteger.prototype.divideAndRemainder = bnDivideAndRemainder;
    BigInteger.prototype.modPow = bnModPow;
    BigInteger.prototype.modInverse = bnModInverse;
    BigInteger.prototype.pow = bnPow;
    BigInteger.prototype.gcd = bnGCD;
    BigInteger.prototype.isProbablePrime = bnIsProbablePrime;
    BigInteger.prototype.square = bnSquare;
    function parseBigInt(str, r) {
      return new BigInteger(str, r);
    }
    function linebrk(s, n) {
      var ret = "";
      var i = 0;
      while (i + n < s.length) {
        ret += s.substring(i, i + n) + "\n";
        i += n;
      }
      return ret + s.substring(i, s.length);
    }
    function byte2Hex(b) {
      if (b < 0x10)
        return "0" + b.toString(16);
      else
        return b.toString(16);
    }
    function pkcs1pad2(s, n) {
      if (n < s.length + 11) {
        alert("Message too long for RSA");
        return null;
      }
      var ba = new Array();
      var i = s.length - 1;
      while (i >= 0 && n > 0) {
        var c = s.charCodeAt(i--);
        if (c < 128) {
          ba[--n] = c;
        } else if ((c > 127) && (c < 2048)) {
          ba[--n] = (c & 63) | 128;
          ba[--n] = (c >> 6) | 192;
        } else {
          ba[--n] = (c & 63) | 128;
          ba[--n] = ((c >> 6) & 63) | 128;
          ba[--n] = (c >> 12) | 224;
        }
      }
      ba[--n] = 0;
      var rng = new SecureRandom();
      var x = new Array();
      while (n > 2) {
        x[0] = 0;
        while (x[0] == 0)
          rng.nextBytes(x);
        ba[--n] = x[0];
      }
      ba[--n] = 2;
      ba[--n] = 0;
      return new BigInteger(ba);
    }
    function oaep_mgf1_arr(seed, len, hash) {
      var mask = '',
          i = 0;
      while (mask.length < len) {
        mask += hash(String.fromCharCode.apply(String, seed.concat([(i & 0xff000000) >> 24, (i & 0x00ff0000) >> 16, (i & 0x0000ff00) >> 8, i & 0x000000ff])));
        i += 1;
      }
      return mask;
    }
    var SHA1_SIZE = 20;
    function oaep_pad(s, n, hash) {
      if (s.length + 2 * SHA1_SIZE + 2 > n) {
        throw "Message too long for RSA";
      }
      var PS = '',
          i;
      for (i = 0; i < n - s.length - 2 * SHA1_SIZE - 2; i += 1) {
        PS += '\x00';
      }
      var DB = rstr_sha1('') + PS + '\x01' + s;
      var seed = new Array(SHA1_SIZE);
      new SecureRandom().nextBytes(seed);
      var dbMask = oaep_mgf1_arr(seed, DB.length, hash || rstr_sha1);
      var maskedDB = [];
      for (i = 0; i < DB.length; i += 1) {
        maskedDB[i] = DB.charCodeAt(i) ^ dbMask.charCodeAt(i);
      }
      var seedMask = oaep_mgf1_arr(maskedDB, seed.length, rstr_sha1);
      var maskedSeed = [0];
      for (i = 0; i < seed.length; i += 1) {
        maskedSeed[i + 1] = seed[i] ^ seedMask.charCodeAt(i);
      }
      return new BigInteger(maskedSeed.concat(maskedDB));
    }
    function RSAKey() {
      this.n = null;
      this.e = 0;
      this.d = null;
      this.p = null;
      this.q = null;
      this.dmp1 = null;
      this.dmq1 = null;
      this.coeff = null;
    }
    function RSASetPublic(N, E) {
      this.isPublic = true;
      if (typeof N !== "string") {
        this.n = N;
        this.e = E;
      } else if (N != null && E != null && N.length > 0 && E.length > 0) {
        this.n = parseBigInt(N, 16);
        this.e = parseInt(E, 16);
      } else
        alert("Invalid RSA public key");
    }
    function RSADoPublic(x) {
      return x.modPowInt(this.e, this.n);
    }
    function RSAEncrypt(text) {
      var m = pkcs1pad2(text, (this.n.bitLength() + 7) >> 3);
      if (m == null)
        return null;
      var c = this.doPublic(m);
      if (c == null)
        return null;
      var h = c.toString(16);
      if ((h.length & 1) == 0)
        return h;
      else
        return "0" + h;
    }
    function RSAEncryptOAEP(text, hash) {
      var m = oaep_pad(text, (this.n.bitLength() + 7) >> 3, hash);
      if (m == null)
        return null;
      var c = this.doPublic(m);
      if (c == null)
        return null;
      var h = c.toString(16);
      if ((h.length & 1) == 0)
        return h;
      else
        return "0" + h;
    }
    RSAKey.prototype.doPublic = RSADoPublic;
    RSAKey.prototype.setPublic = RSASetPublic;
    RSAKey.prototype.encrypt = RSAEncrypt;
    RSAKey.prototype.encryptOAEP = RSAEncryptOAEP;
    RSAKey.prototype.type = "RSA";
    function pkcs1unpad2(d, n) {
      var b = d.toByteArray();
      var i = 0;
      while (i < b.length && b[i] == 0)
        ++i;
      if (b.length - i != n - 1 || b[i] != 2)
        return null;
      ++i;
      while (b[i] != 0)
        if (++i >= b.length)
          return null;
      var ret = "";
      while (++i < b.length) {
        var c = b[i] & 255;
        if (c < 128) {
          ret += String.fromCharCode(c);
        } else if ((c > 191) && (c < 224)) {
          ret += String.fromCharCode(((c & 31) << 6) | (b[i + 1] & 63));
          ++i;
        } else {
          ret += String.fromCharCode(((c & 15) << 12) | ((b[i + 1] & 63) << 6) | (b[i + 2] & 63));
          i += 2;
        }
      }
      return ret;
    }
    function oaep_mgf1_str(seed, len, hash) {
      var mask = '',
          i = 0;
      while (mask.length < len) {
        mask += hash(seed + String.fromCharCode.apply(String, [(i & 0xff000000) >> 24, (i & 0x00ff0000) >> 16, (i & 0x0000ff00) >> 8, i & 0x000000ff]));
        i += 1;
      }
      return mask;
    }
    var SHA1_SIZE = 20;
    function oaep_unpad(d, n, hash) {
      d = d.toByteArray();
      var i;
      for (i = 0; i < d.length; i += 1) {
        d[i] &= 0xff;
      }
      while (d.length < n) {
        d.unshift(0);
      }
      d = String.fromCharCode.apply(String, d);
      if (d.length < 2 * SHA1_SIZE + 2) {
        throw "Cipher too short";
      }
      var maskedSeed = d.substr(1, SHA1_SIZE);
      var maskedDB = d.substr(SHA1_SIZE + 1);
      var seedMask = oaep_mgf1_str(maskedDB, SHA1_SIZE, hash || rstr_sha1);
      var seed = [],
          i;
      for (i = 0; i < maskedSeed.length; i += 1) {
        seed[i] = maskedSeed.charCodeAt(i) ^ seedMask.charCodeAt(i);
      }
      var dbMask = oaep_mgf1_str(String.fromCharCode.apply(String, seed), d.length - SHA1_SIZE, rstr_sha1);
      var DB = [];
      for (i = 0; i < maskedDB.length; i += 1) {
        DB[i] = maskedDB.charCodeAt(i) ^ dbMask.charCodeAt(i);
      }
      DB = String.fromCharCode.apply(String, DB);
      if (DB.substr(0, SHA1_SIZE) !== rstr_sha1('')) {
        throw "Hash mismatch";
      }
      DB = DB.substr(SHA1_SIZE);
      var first_one = DB.indexOf('\x01');
      var last_zero = (first_one != -1) ? DB.substr(0, first_one).lastIndexOf('\x00') : -1;
      if (last_zero + 1 != first_one) {
        throw "Malformed data";
      }
      return DB.substr(first_one + 1);
    }
    function RSASetPrivate(N, E, D) {
      this.isPrivate = true;
      if (typeof N !== "string") {
        this.n = N;
        this.e = E;
        this.d = D;
      } else if (N != null && E != null && N.length > 0 && E.length > 0) {
        this.n = parseBigInt(N, 16);
        this.e = parseInt(E, 16);
        this.d = parseBigInt(D, 16);
      } else
        alert("Invalid RSA private key");
    }
    function RSASetPrivateEx(N, E, D, P, Q, DP, DQ, C) {
      this.isPrivate = true;
      if (N == null)
        throw "RSASetPrivateEx N == null";
      if (E == null)
        throw "RSASetPrivateEx E == null";
      if (N.length == 0)
        throw "RSASetPrivateEx N.length == 0";
      if (E.length == 0)
        throw "RSASetPrivateEx E.length == 0";
      if (N != null && E != null && N.length > 0 && E.length > 0) {
        this.n = parseBigInt(N, 16);
        this.e = parseInt(E, 16);
        this.d = parseBigInt(D, 16);
        this.p = parseBigInt(P, 16);
        this.q = parseBigInt(Q, 16);
        this.dmp1 = parseBigInt(DP, 16);
        this.dmq1 = parseBigInt(DQ, 16);
        this.coeff = parseBigInt(C, 16);
      } else {
        alert("Invalid RSA private key in RSASetPrivateEx");
      }
    }
    function RSAGenerate(B, E) {
      var rng = new SecureRandom();
      var qs = B >> 1;
      this.e = parseInt(E, 16);
      var ee = new BigInteger(E, 16);
      for (; ; ) {
        for (; ; ) {
          this.p = new BigInteger(B - qs, 1, rng);
          if (this.p.subtract(BigInteger.ONE).gcd(ee).compareTo(BigInteger.ONE) == 0 && this.p.isProbablePrime(10))
            break;
        }
        for (; ; ) {
          this.q = new BigInteger(qs, 1, rng);
          if (this.q.subtract(BigInteger.ONE).gcd(ee).compareTo(BigInteger.ONE) == 0 && this.q.isProbablePrime(10))
            break;
        }
        if (this.p.compareTo(this.q) <= 0) {
          var t = this.p;
          this.p = this.q;
          this.q = t;
        }
        var p1 = this.p.subtract(BigInteger.ONE);
        var q1 = this.q.subtract(BigInteger.ONE);
        var phi = p1.multiply(q1);
        if (phi.gcd(ee).compareTo(BigInteger.ONE) == 0) {
          this.n = this.p.multiply(this.q);
          this.d = ee.modInverse(phi);
          this.dmp1 = this.d.mod(p1);
          this.dmq1 = this.d.mod(q1);
          this.coeff = this.q.modInverse(this.p);
          break;
        }
      }
      this.isPrivate = true;
    }
    function RSADoPrivate(x) {
      if (this.p == null || this.q == null)
        return x.modPow(this.d, this.n);
      var xp = x.mod(this.p).modPow(this.dmp1, this.p);
      var xq = x.mod(this.q).modPow(this.dmq1, this.q);
      while (xp.compareTo(xq) < 0)
        xp = xp.add(this.p);
      return xp.subtract(xq).multiply(this.coeff).mod(this.p).multiply(this.q).add(xq);
    }
    function RSADecrypt(ctext) {
      var c = parseBigInt(ctext, 16);
      var m = this.doPrivate(c);
      if (m == null)
        return null;
      return pkcs1unpad2(m, (this.n.bitLength() + 7) >> 3);
    }
    function RSADecryptOAEP(ctext, hash) {
      var c = parseBigInt(ctext, 16);
      var m = this.doPrivate(c);
      if (m == null)
        return null;
      return oaep_unpad(m, (this.n.bitLength() + 7) >> 3, hash);
    }
    RSAKey.prototype.doPrivate = RSADoPrivate;
    RSAKey.prototype.setPrivate = RSASetPrivate;
    RSAKey.prototype.setPrivateEx = RSASetPrivateEx;
    RSAKey.prototype.generate = RSAGenerate;
    RSAKey.prototype.decrypt = RSADecrypt;
    RSAKey.prototype.decryptOAEP = RSADecryptOAEP;
    function _rsapem_pemToBase64(sPEMPrivateKey) {
      var s = sPEMPrivateKey;
      s = s.replace("-----BEGIN RSA PRIVATE KEY-----", "");
      s = s.replace("-----END RSA PRIVATE KEY-----", "");
      s = s.replace(/[ \n]+/g, "");
      return s;
    }
    function _rsapem_getPosArrayOfChildrenFromHex(hPrivateKey) {
      var a = new Array();
      var v1 = ASN1HEX.getStartPosOfV_AtObj(hPrivateKey, 0);
      var n1 = ASN1HEX.getPosOfNextSibling_AtObj(hPrivateKey, v1);
      var e1 = ASN1HEX.getPosOfNextSibling_AtObj(hPrivateKey, n1);
      var d1 = ASN1HEX.getPosOfNextSibling_AtObj(hPrivateKey, e1);
      var p1 = ASN1HEX.getPosOfNextSibling_AtObj(hPrivateKey, d1);
      var q1 = ASN1HEX.getPosOfNextSibling_AtObj(hPrivateKey, p1);
      var dp1 = ASN1HEX.getPosOfNextSibling_AtObj(hPrivateKey, q1);
      var dq1 = ASN1HEX.getPosOfNextSibling_AtObj(hPrivateKey, dp1);
      var co1 = ASN1HEX.getPosOfNextSibling_AtObj(hPrivateKey, dq1);
      a.push(v1, n1, e1, d1, p1, q1, dp1, dq1, co1);
      return a;
    }
    function _rsapem_getHexValueArrayOfChildrenFromHex(hPrivateKey) {
      var posArray = _rsapem_getPosArrayOfChildrenFromHex(hPrivateKey);
      var v = ASN1HEX.getHexOfV_AtObj(hPrivateKey, posArray[0]);
      var n = ASN1HEX.getHexOfV_AtObj(hPrivateKey, posArray[1]);
      var e = ASN1HEX.getHexOfV_AtObj(hPrivateKey, posArray[2]);
      var d = ASN1HEX.getHexOfV_AtObj(hPrivateKey, posArray[3]);
      var p = ASN1HEX.getHexOfV_AtObj(hPrivateKey, posArray[4]);
      var q = ASN1HEX.getHexOfV_AtObj(hPrivateKey, posArray[5]);
      var dp = ASN1HEX.getHexOfV_AtObj(hPrivateKey, posArray[6]);
      var dq = ASN1HEX.getHexOfV_AtObj(hPrivateKey, posArray[7]);
      var co = ASN1HEX.getHexOfV_AtObj(hPrivateKey, posArray[8]);
      var a = new Array();
      a.push(v, n, e, d, p, q, dp, dq, co);
      return a;
    }
    function _rsapem_readPrivateKeyFromASN1HexString(keyHex) {
      var a = _rsapem_getHexValueArrayOfChildrenFromHex(keyHex);
      this.setPrivateEx(a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8]);
    }
    function _rsapem_readPrivateKeyFromPEMString(keyPEM) {
      var keyB64 = _rsapem_pemToBase64(keyPEM);
      var keyHex = b64tohex(keyB64);
      var a = _rsapem_getHexValueArrayOfChildrenFromHex(keyHex);
      this.setPrivateEx(a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8]);
    }
    RSAKey.prototype.readPrivateKeyFromPEMString = _rsapem_readPrivateKeyFromPEMString;
    RSAKey.prototype.readPrivateKeyFromASN1HexString = _rsapem_readPrivateKeyFromASN1HexString;
    var _RE_HEXDECONLY = new RegExp("");
    _RE_HEXDECONLY.compile("[^0-9a-f]", "gi");
    function _rsasign_getHexPaddedDigestInfoForString(d, e, a) {
      var b = function(f) {
        return KJUR.crypto.Util.hashString(f, a);
      };
      var c = b(d);
      return KJUR.crypto.Util.getPaddedDigestInfoHex(c, a, e);
    }
    function _zeroPaddingOfSignature(e, d) {
      var c = "";
      var a = d / 4 - e.length;
      for (var b = 0; b < a; b++) {
        c = c + "0";
      }
      return c + e;
    }
    function _rsasign_signString(d, a) {
      var b = function(e) {
        return KJUR.crypto.Util.hashString(e, a);
      };
      var c = b(d);
      return this.signWithMessageHash(c, a);
    }
    function _rsasign_signWithMessageHash(e, c) {
      var f = KJUR.crypto.Util.getPaddedDigestInfoHex(e, c, this.n.bitLength());
      var b = parseBigInt(f, 16);
      var d = this.doPrivate(b);
      var a = d.toString(16);
      return _zeroPaddingOfSignature(a, this.n.bitLength());
    }
    function _rsasign_signStringWithSHA1(a) {
      return _rsasign_signString.call(this, a, "sha1");
    }
    function _rsasign_signStringWithSHA256(a) {
      return _rsasign_signString.call(this, a, "sha256");
    }
    function pss_mgf1_str(c, a, e) {
      var b = "",
          d = 0;
      while (b.length < a) {
        b += hextorstr(e(rstrtohex(c + String.fromCharCode.apply(String, [(d & 4278190080) >> 24, (d & 16711680) >> 16, (d & 65280) >> 8, d & 255]))));
        d += 1;
      }
      return b;
    }
    function _rsasign_signStringPSS(e, a, d) {
      var c = function(f) {
        return KJUR.crypto.Util.hashHex(f, a);
      };
      var b = c(rstrtohex(e));
      if (d === undefined) {
        d = -1;
      }
      return this.signWithMessageHashPSS(b, a, d);
    }
    function _rsasign_signWithMessageHashPSS(l, a, k) {
      var b = hextorstr(l);
      var g = b.length;
      var m = this.n.bitLength() - 1;
      var c = Math.ceil(m / 8);
      var d;
      var o = function(i) {
        return KJUR.crypto.Util.hashHex(i, a);
      };
      if (k === -1 || k === undefined) {
        k = g;
      } else {
        if (k === -2) {
          k = c - g - 2;
        } else {
          if (k < -2) {
            throw "invalid salt length";
          }
        }
      }
      if (c < (g + k + 2)) {
        throw "data too long";
      }
      var f = "";
      if (k > 0) {
        f = new Array(k);
        new SecureRandom().nextBytes(f);
        f = String.fromCharCode.apply(String, f);
      }
      var n = hextorstr(o(rstrtohex("\x00\x00\x00\x00\x00\x00\x00\x00" + b + f)));
      var j = [];
      for (d = 0; d < c - k - g - 2; d += 1) {
        j[d] = 0;
      }
      var e = String.fromCharCode.apply(String, j) + "\x01" + f;
      var h = pss_mgf1_str(n, e.length, o);
      var q = [];
      for (d = 0; d < e.length; d += 1) {
        q[d] = e.charCodeAt(d) ^ h.charCodeAt(d);
      }
      var p = (65280 >> (8 * c - m)) & 255;
      q[0] &= ~p;
      for (d = 0; d < g; d++) {
        q.push(n.charCodeAt(d));
      }
      q.push(188);
      return _zeroPaddingOfSignature(this.doPrivate(new BigInteger(q)).toString(16), this.n.bitLength());
    }
    function _rsasign_getDecryptSignatureBI(a, d, c) {
      var b = new RSAKey();
      b.setPublic(d, c);
      var e = b.doPublic(a);
      return e;
    }
    function _rsasign_getHexDigestInfoFromSig(a, c, b) {
      var e = _rsasign_getDecryptSignatureBI(a, c, b);
      var d = e.toString(16).replace(/^1f+00/, "");
      return d;
    }
    function _rsasign_getAlgNameAndHashFromHexDisgestInfo(f) {
      for (var e in KJUR.crypto.Util.DIGESTINFOHEAD) {
        var d = KJUR.crypto.Util.DIGESTINFOHEAD[e];
        var b = d.length;
        if (f.substring(0, b) == d) {
          var c = [e, f.substring(b)];
          return c;
        }
      }
      return [];
    }
    function _rsasign_verifySignatureWithArgs(f, b, g, j) {
      var e = _rsasign_getHexDigestInfoFromSig(b, g, j);
      var h = _rsasign_getAlgNameAndHashFromHexDisgestInfo(e);
      if (h.length == 0) {
        return false;
      }
      var d = h[0];
      var i = h[1];
      var a = function(k) {
        return KJUR.crypto.Util.hashString(k, d);
      };
      var c = a(f);
      return (i == c);
    }
    function _rsasign_verifyHexSignatureForMessage(c, b) {
      var d = parseBigInt(c, 16);
      var a = _rsasign_verifySignatureWithArgs(b, d, this.n.toString(16), this.e.toString(16));
      return a;
    }
    function _rsasign_verifyString(f, j) {
      j = j.replace(_RE_HEXDECONLY, "");
      j = j.replace(/[ \n]+/g, "");
      var b = parseBigInt(j, 16);
      if (b.bitLength() > this.n.bitLength()) {
        return 0;
      }
      var i = this.doPublic(b);
      var e = i.toString(16).replace(/^1f+00/, "");
      var g = _rsasign_getAlgNameAndHashFromHexDisgestInfo(e);
      if (g.length == 0) {
        return false;
      }
      var d = g[0];
      var h = g[1];
      var a = function(k) {
        return KJUR.crypto.Util.hashString(k, d);
      };
      var c = a(f);
      return (h == c);
    }
    function _rsasign_verifyWithMessageHash(e, a) {
      a = a.replace(_RE_HEXDECONLY, "");
      a = a.replace(/[ \n]+/g, "");
      var b = parseBigInt(a, 16);
      if (b.bitLength() > this.n.bitLength()) {
        return 0;
      }
      var h = this.doPublic(b);
      var g = h.toString(16).replace(/^1f+00/, "");
      var c = _rsasign_getAlgNameAndHashFromHexDisgestInfo(g);
      if (c.length == 0) {
        return false;
      }
      var d = c[0];
      var f = c[1];
      return (f == e);
    }
    function _rsasign_verifyStringPSS(c, b, a, f) {
      var e = function(g) {
        return KJUR.crypto.Util.hashHex(g, a);
      };
      var d = e(rstrtohex(c));
      if (f === undefined) {
        f = -1;
      }
      return this.verifyWithMessageHashPSS(d, b, a, f);
    }
    function _rsasign_verifyWithMessageHashPSS(f, s, l, c) {
      var k = new BigInteger(s, 16);
      if (k.bitLength() > this.n.bitLength()) {
        return false;
      }
      var r = function(i) {
        return KJUR.crypto.Util.hashHex(i, l);
      };
      var j = hextorstr(f);
      var h = j.length;
      var g = this.n.bitLength() - 1;
      var m = Math.ceil(g / 8);
      var q;
      if (c === -1 || c === undefined) {
        c = h;
      } else {
        if (c === -2) {
          c = m - h - 2;
        } else {
          if (c < -2) {
            throw "invalid salt length";
          }
        }
      }
      if (m < (h + c + 2)) {
        throw "data too long";
      }
      var a = this.doPublic(k).toByteArray();
      for (q = 0; q < a.length; q += 1) {
        a[q] &= 255;
      }
      while (a.length < m) {
        a.unshift(0);
      }
      if (a[m - 1] !== 188) {
        throw "encoded message does not end in 0xbc";
      }
      a = String.fromCharCode.apply(String, a);
      var d = a.substr(0, m - h - 1);
      var e = a.substr(d.length, h);
      var p = (65280 >> (8 * m - g)) & 255;
      if ((d.charCodeAt(0) & p) !== 0) {
        throw "bits beyond keysize not zero";
      }
      var n = pss_mgf1_str(e, d.length, r);
      var o = [];
      for (q = 0; q < d.length; q += 1) {
        o[q] = d.charCodeAt(q) ^ n.charCodeAt(q);
      }
      o[0] &= ~p;
      var b = m - h - c - 2;
      for (q = 0; q < b; q += 1) {
        if (o[q] !== 0) {
          throw "leftmost octets not zero";
        }
      }
      if (o[b] !== 1) {
        throw "0x01 marker not found";
      }
      return e === hextorstr(r(rstrtohex("\x00\x00\x00\x00\x00\x00\x00\x00" + j + String.fromCharCode.apply(String, o.slice(-c)))));
    }
    RSAKey.prototype.signWithMessageHash = _rsasign_signWithMessageHash;
    RSAKey.prototype.signString = _rsasign_signString;
    RSAKey.prototype.signStringWithSHA1 = _rsasign_signStringWithSHA1;
    RSAKey.prototype.signStringWithSHA256 = _rsasign_signStringWithSHA256;
    RSAKey.prototype.sign = _rsasign_signString;
    RSAKey.prototype.signWithSHA1 = _rsasign_signStringWithSHA1;
    RSAKey.prototype.signWithSHA256 = _rsasign_signStringWithSHA256;
    RSAKey.prototype.signWithMessageHashPSS = _rsasign_signWithMessageHashPSS;
    RSAKey.prototype.signStringPSS = _rsasign_signStringPSS;
    RSAKey.prototype.signPSS = _rsasign_signStringPSS;
    RSAKey.SALT_LEN_HLEN = -1;
    RSAKey.SALT_LEN_MAX = -2;
    RSAKey.prototype.verifyWithMessageHash = _rsasign_verifyWithMessageHash;
    RSAKey.prototype.verifyString = _rsasign_verifyString;
    RSAKey.prototype.verifyHexSignatureForMessage = _rsasign_verifyHexSignatureForMessage;
    RSAKey.prototype.verify = _rsasign_verifyString;
    RSAKey.prototype.verifyHexSignatureForByteArrayMessage = _rsasign_verifyHexSignatureForMessage;
    RSAKey.prototype.verifyWithMessageHashPSS = _rsasign_verifyWithMessageHashPSS;
    RSAKey.prototype.verifyStringPSS = _rsasign_verifyStringPSS;
    RSAKey.prototype.verifyPSS = _rsasign_verifyStringPSS;
    RSAKey.SALT_LEN_RECOVER = -2;
    var ASN1HEX = new function() {
      this.getByteLengthOfL_AtObj = function(s, pos) {
        if (s.substring(pos + 2, pos + 3) != '8')
          return 1;
        var i = parseInt(s.substring(pos + 3, pos + 4));
        if (i == 0)
          return -1;
        if (0 < i && i < 10)
          return i + 1;
        return -2;
      };
      this.getHexOfL_AtObj = function(s, pos) {
        var len = this.getByteLengthOfL_AtObj(s, pos);
        if (len < 1)
          return '';
        return s.substring(pos + 2, pos + 2 + len * 2);
      };
      this.getIntOfL_AtObj = function(s, pos) {
        var hLength = this.getHexOfL_AtObj(s, pos);
        if (hLength == '')
          return -1;
        var bi;
        if (parseInt(hLength.substring(0, 1)) < 8) {
          bi = new BigInteger(hLength, 16);
        } else {
          bi = new BigInteger(hLength.substring(2), 16);
        }
        return bi.intValue();
      };
      this.getStartPosOfV_AtObj = function(s, pos) {
        var l_len = this.getByteLengthOfL_AtObj(s, pos);
        if (l_len < 0)
          return l_len;
        return pos + (l_len + 1) * 2;
      };
      this.getHexOfV_AtObj = function(s, pos) {
        var pos1 = this.getStartPosOfV_AtObj(s, pos);
        var len = this.getIntOfL_AtObj(s, pos);
        return s.substring(pos1, pos1 + len * 2);
      };
      this.getHexOfTLV_AtObj = function(s, pos) {
        var hT = s.substr(pos, 2);
        var hL = this.getHexOfL_AtObj(s, pos);
        var hV = this.getHexOfV_AtObj(s, pos);
        return hT + hL + hV;
      };
      this.getPosOfNextSibling_AtObj = function(s, pos) {
        var pos1 = this.getStartPosOfV_AtObj(s, pos);
        var len = this.getIntOfL_AtObj(s, pos);
        return pos1 + len * 2;
      };
      this.getPosArrayOfChildren_AtObj = function(h, pos) {
        var a = new Array();
        var p0 = this.getStartPosOfV_AtObj(h, pos);
        a.push(p0);
        var len = this.getIntOfL_AtObj(h, pos);
        var p = p0;
        var k = 0;
        while (1) {
          var pNext = this.getPosOfNextSibling_AtObj(h, p);
          if (pNext == null || (pNext - p0 >= (len * 2)))
            break;
          if (k >= 200)
            break;
          a.push(pNext);
          p = pNext;
          k++;
        }
        return a;
      };
      this.getNthChildIndex_AtObj = function(h, idx, nth) {
        var a = this.getPosArrayOfChildren_AtObj(h, idx);
        return a[nth];
      };
      this.getDecendantIndexByNthList = function(h, currentIndex, nthList) {
        if (nthList.length == 0) {
          return currentIndex;
        }
        var firstNth = nthList.shift();
        var a = this.getPosArrayOfChildren_AtObj(h, currentIndex);
        return this.getDecendantIndexByNthList(h, a[firstNth], nthList);
      };
      this.getDecendantHexTLVByNthList = function(h, currentIndex, nthList) {
        var idx = this.getDecendantIndexByNthList(h, currentIndex, nthList);
        return this.getHexOfTLV_AtObj(h, idx);
      };
      this.getDecendantHexVByNthList = function(h, currentIndex, nthList) {
        var idx = this.getDecendantIndexByNthList(h, currentIndex, nthList);
        return this.getHexOfV_AtObj(h, idx);
      };
    };
    ASN1HEX.getVbyList = function(h, currentIndex, nthList, checkingTag) {
      var idx = this.getDecendantIndexByNthList(h, currentIndex, nthList);
      if (idx === undefined) {
        throw "can't find nthList object";
      }
      if (checkingTag !== undefined) {
        if (h.substr(idx, 2) != checkingTag) {
          throw "checking tag doesn't match: " + h.substr(idx, 2) + "!=" + checkingTag;
        }
      }
      return this.getHexOfV_AtObj(h, idx);
    };
    ASN1HEX.hextooidstr = function(hex) {
      var zeroPadding = function(s, len) {
        if (s.length >= len)
          return s;
        return new Array(len - s.length + 1).join('0') + s;
      };
      var a = [];
      var hex0 = hex.substr(0, 2);
      var i0 = parseInt(hex0, 16);
      a[0] = new String(Math.floor(i0 / 40));
      a[1] = new String(i0 % 40);
      var hex1 = hex.substr(2);
      var b = [];
      for (var i = 0; i < hex1.length / 2; i++) {
        b.push(parseInt(hex1.substr(i * 2, 2), 16));
      }
      var c = [];
      var cbin = "";
      for (var i = 0; i < b.length; i++) {
        if (b[i] & 0x80) {
          cbin = cbin + zeroPadding((b[i] & 0x7f).toString(2), 7);
        } else {
          cbin = cbin + zeroPadding((b[i] & 0x7f).toString(2), 7);
          c.push(new String(parseInt(cbin, 2)));
          cbin = "";
        }
      }
      var s = a.join(".");
      if (c.length > 0)
        s = s + "." + c.join(".");
      return s;
    };
    function X509() {
      this.subjectPublicKeyRSA = null;
      this.subjectPublicKeyRSA_hN = null;
      this.subjectPublicKeyRSA_hE = null;
      this.hex = null;
      this.getSerialNumberHex = function() {
        return ASN1HEX.getDecendantHexVByNthList(this.hex, 0, [0, 1]);
      };
      this.getIssuerHex = function() {
        return ASN1HEX.getDecendantHexTLVByNthList(this.hex, 0, [0, 3]);
      };
      this.getIssuerString = function() {
        return X509.hex2dn(ASN1HEX.getDecendantHexTLVByNthList(this.hex, 0, [0, 3]));
      };
      this.getSubjectHex = function() {
        return ASN1HEX.getDecendantHexTLVByNthList(this.hex, 0, [0, 5]);
      };
      this.getSubjectString = function() {
        return X509.hex2dn(ASN1HEX.getDecendantHexTLVByNthList(this.hex, 0, [0, 5]));
      };
      this.getNotBefore = function() {
        var s = ASN1HEX.getDecendantHexVByNthList(this.hex, 0, [0, 4, 0]);
        s = s.replace(/(..)/g, "%$1");
        s = decodeURIComponent(s);
        return s;
      };
      this.getNotAfter = function() {
        var s = ASN1HEX.getDecendantHexVByNthList(this.hex, 0, [0, 4, 1]);
        s = s.replace(/(..)/g, "%$1");
        s = decodeURIComponent(s);
        return s;
      };
      this.readCertPEM = function(sCertPEM) {
        var hCert = X509.pemToHex(sCertPEM);
        var a = X509.getPublicKeyHexArrayFromCertHex(hCert);
        var rsa = new RSAKey();
        rsa.setPublic(a[0], a[1]);
        this.subjectPublicKeyRSA = rsa;
        this.subjectPublicKeyRSA_hN = a[0];
        this.subjectPublicKeyRSA_hE = a[1];
        this.hex = hCert;
      };
      this.readCertPEMWithoutRSAInit = function(sCertPEM) {
        var hCert = X509.pemToHex(sCertPEM);
        var a = X509.getPublicKeyHexArrayFromCertHex(hCert);
        this.subjectPublicKeyRSA.setPublic(a[0], a[1]);
        this.subjectPublicKeyRSA_hN = a[0];
        this.subjectPublicKeyRSA_hE = a[1];
        this.hex = hCert;
      };
    }
    ;
    X509.pemToBase64 = function(sCertPEM) {
      var s = sCertPEM;
      s = s.replace("-----BEGIN CERTIFICATE-----", "");
      s = s.replace("-----END CERTIFICATE-----", "");
      s = s.replace(/[ \n]+/g, "");
      return s;
    };
    X509.pemToHex = function(sCertPEM) {
      var b64Cert = X509.pemToBase64(sCertPEM);
      var hCert = b64tohex(b64Cert);
      return hCert;
    };
    X509.getSubjectPublicKeyPosFromCertHex = function(hCert) {
      var pInfo = X509.getSubjectPublicKeyInfoPosFromCertHex(hCert);
      if (pInfo == -1)
        return -1;
      var a = ASN1HEX.getPosArrayOfChildren_AtObj(hCert, pInfo);
      if (a.length != 2)
        return -1;
      var pBitString = a[1];
      if (hCert.substring(pBitString, pBitString + 2) != '03')
        return -1;
      var pBitStringV = ASN1HEX.getStartPosOfV_AtObj(hCert, pBitString);
      if (hCert.substring(pBitStringV, pBitStringV + 2) != '00')
        return -1;
      return pBitStringV + 2;
    };
    X509.getSubjectPublicKeyInfoPosFromCertHex = function(hCert) {
      var pTbsCert = ASN1HEX.getStartPosOfV_AtObj(hCert, 0);
      var a = ASN1HEX.getPosArrayOfChildren_AtObj(hCert, pTbsCert);
      if (a.length < 1)
        return -1;
      if (hCert.substring(a[0], a[0] + 10) == "a003020102") {
        if (a.length < 6)
          return -1;
        return a[6];
      } else {
        if (a.length < 5)
          return -1;
        return a[5];
      }
    };
    X509.getPublicKeyHexArrayFromCertHex = function(hCert) {
      var p = X509.getSubjectPublicKeyPosFromCertHex(hCert);
      var a = ASN1HEX.getPosArrayOfChildren_AtObj(hCert, p);
      if (a.length != 2)
        return [];
      var hN = ASN1HEX.getHexOfV_AtObj(hCert, a[0]);
      var hE = ASN1HEX.getHexOfV_AtObj(hCert, a[1]);
      if (hN != null && hE != null) {
        return [hN, hE];
      } else {
        return [];
      }
    };
    X509.getHexTbsCertificateFromCert = function(hCert) {
      var pTbsCert = ASN1HEX.getStartPosOfV_AtObj(hCert, 0);
      return pTbsCert;
    };
    X509.getPublicKeyHexArrayFromCertPEM = function(sCertPEM) {
      var hCert = X509.pemToHex(sCertPEM);
      var a = X509.getPublicKeyHexArrayFromCertHex(hCert);
      return a;
    };
    X509.hex2dn = function(hDN) {
      var s = "";
      var a = ASN1HEX.getPosArrayOfChildren_AtObj(hDN, 0);
      for (var i = 0; i < a.length; i++) {
        var hRDN = ASN1HEX.getHexOfTLV_AtObj(hDN, a[i]);
        s = s + "/" + X509.hex2rdn(hRDN);
      }
      return s;
    };
    X509.hex2rdn = function(hRDN) {
      var hType = ASN1HEX.getDecendantHexTLVByNthList(hRDN, 0, [0, 0]);
      var hValue = ASN1HEX.getDecendantHexVByNthList(hRDN, 0, [0, 1]);
      var type = "";
      try {
        type = X509.DN_ATTRHEX[hType];
      } catch (ex) {
        type = hType;
      }
      hValue = hValue.replace(/(..)/g, "%$1");
      var value = decodeURIComponent(hValue);
      return type + "=" + value;
    };
    X509.DN_ATTRHEX = {
      "0603550406": "C",
      "060355040a": "O",
      "060355040b": "OU",
      "0603550403": "CN",
      "0603550405": "SN",
      "0603550408": "ST",
      "0603550407": "L"
    };
    X509.getPublicKeyFromCertPEM = function(sCertPEM) {
      var info = X509.getPublicKeyInfoPropOfCertPEM(sCertPEM);
      if (info.algoid == "2a864886f70d010101") {
        var aRSA = KEYUTIL.parsePublicRawRSAKeyHex(info.keyhex);
        var key = new RSAKey();
        key.setPublic(aRSA.n, aRSA.e);
        return key;
      } else if (info.algoid == "2a8648ce3d0201") {
        var curveName = KJUR.crypto.OID.oidhex2name[info.algparam];
        var key = new KJUR.crypto.ECDSA({
          'curve': curveName,
          'info': info.keyhex
        });
        key.setPublicKeyHex(info.keyhex);
        return key;
      } else if (info.algoid == "2a8648ce380401") {
        var p = ASN1HEX.getVbyList(info.algparam, 0, [0], "02");
        var q = ASN1HEX.getVbyList(info.algparam, 0, [1], "02");
        var g = ASN1HEX.getVbyList(info.algparam, 0, [2], "02");
        var y = ASN1HEX.getHexOfV_AtObj(info.keyhex, 0);
        y = y.substr(2);
        var key = new KJUR.crypto.DSA();
        key.setPublic(new BigInteger(p, 16), new BigInteger(q, 16), new BigInteger(g, 16), new BigInteger(y, 16));
        return key;
      } else {
        throw "unsupported key";
      }
    };
    X509.getPublicKeyInfoPropOfCertPEM = function(sCertPEM) {
      var result = {};
      result.algparam = null;
      var hCert = X509.pemToHex(sCertPEM);
      var a1 = ASN1HEX.getPosArrayOfChildren_AtObj(hCert, 0);
      if (a1.length != 3)
        throw "malformed X.509 certificate PEM (code:001)";
      if (hCert.substr(a1[0], 2) != "30")
        throw "malformed X.509 certificate PEM (code:002)";
      var a2 = ASN1HEX.getPosArrayOfChildren_AtObj(hCert, a1[0]);
      if (a2.length < 7)
        throw "malformed X.509 certificate PEM (code:003)";
      var a3 = ASN1HEX.getPosArrayOfChildren_AtObj(hCert, a2[6]);
      if (a3.length != 2)
        throw "malformed X.509 certificate PEM (code:004)";
      var a4 = ASN1HEX.getPosArrayOfChildren_AtObj(hCert, a3[0]);
      if (a4.length != 2)
        throw "malformed X.509 certificate PEM (code:005)";
      result.algoid = ASN1HEX.getHexOfV_AtObj(hCert, a4[0]);
      if (hCert.substr(a4[1], 2) == "06") {
        result.algparam = ASN1HEX.getHexOfV_AtObj(hCert, a4[1]);
      } else if (hCert.substr(a4[1], 2) == "30") {
        result.algparam = ASN1HEX.getHexOfTLV_AtObj(hCert, a4[1]);
      }
      if (hCert.substr(a3[1], 2) != "03")
        throw "malformed X.509 certificate PEM (code:006)";
      var unusedBitAndKeyHex = ASN1HEX.getHexOfV_AtObj(hCert, a3[1]);
      result.keyhex = unusedBitAndKeyHex.substr(2);
      return result;
    };
    if (typeof KJUR == "undefined" || !KJUR)
      KJUR = {};
    if (typeof KJUR.crypto == "undefined" || !KJUR.crypto)
      KJUR.crypto = {};
    KJUR.crypto.Util = new function() {
      this.DIGESTINFOHEAD = {
        'sha1': "3021300906052b0e03021a05000414",
        'sha224': "302d300d06096086480165030402040500041c",
        'sha256': "3031300d060960864801650304020105000420",
        'sha384': "3041300d060960864801650304020205000430",
        'sha512': "3051300d060960864801650304020305000440",
        'md2': "3020300c06082a864886f70d020205000410",
        'md5': "3020300c06082a864886f70d020505000410",
        'ripemd160': "3021300906052b2403020105000414"
      };
      this.DEFAULTPROVIDER = {
        'md5': 'cryptojs',
        'sha1': 'cryptojs',
        'sha224': 'cryptojs',
        'sha256': 'cryptojs',
        'sha384': 'cryptojs',
        'sha512': 'cryptojs',
        'ripemd160': 'cryptojs',
        'hmacmd5': 'cryptojs',
        'hmacsha1': 'cryptojs',
        'hmacsha224': 'cryptojs',
        'hmacsha256': 'cryptojs',
        'hmacsha384': 'cryptojs',
        'hmacsha512': 'cryptojs',
        'hmacripemd160': 'cryptojs',
        'MD5withRSA': 'cryptojs/jsrsa',
        'SHA1withRSA': 'cryptojs/jsrsa',
        'SHA224withRSA': 'cryptojs/jsrsa',
        'SHA256withRSA': 'cryptojs/jsrsa',
        'SHA384withRSA': 'cryptojs/jsrsa',
        'SHA512withRSA': 'cryptojs/jsrsa',
        'RIPEMD160withRSA': 'cryptojs/jsrsa',
        'MD5withECDSA': 'cryptojs/jsrsa',
        'SHA1withECDSA': 'cryptojs/jsrsa',
        'SHA224withECDSA': 'cryptojs/jsrsa',
        'SHA256withECDSA': 'cryptojs/jsrsa',
        'SHA384withECDSA': 'cryptojs/jsrsa',
        'SHA512withECDSA': 'cryptojs/jsrsa',
        'RIPEMD160withECDSA': 'cryptojs/jsrsa',
        'SHA1withDSA': 'cryptojs/jsrsa',
        'SHA224withDSA': 'cryptojs/jsrsa',
        'SHA256withDSA': 'cryptojs/jsrsa',
        'MD5withRSAandMGF1': 'cryptojs/jsrsa',
        'SHA1withRSAandMGF1': 'cryptojs/jsrsa',
        'SHA224withRSAandMGF1': 'cryptojs/jsrsa',
        'SHA256withRSAandMGF1': 'cryptojs/jsrsa',
        'SHA384withRSAandMGF1': 'cryptojs/jsrsa',
        'SHA512withRSAandMGF1': 'cryptojs/jsrsa',
        'RIPEMD160withRSAandMGF1': 'cryptojs/jsrsa'
      };
      this.CRYPTOJSMESSAGEDIGESTNAME = {
        'md5': 'CryptoJS.algo.MD5',
        'sha1': 'CryptoJS.algo.SHA1',
        'sha224': 'CryptoJS.algo.SHA224',
        'sha256': 'CryptoJS.algo.SHA256',
        'sha384': 'CryptoJS.algo.SHA384',
        'sha512': 'CryptoJS.algo.SHA512',
        'ripemd160': 'CryptoJS.algo.RIPEMD160'
      };
      this.getDigestInfoHex = function(hHash, alg) {
        if (typeof this.DIGESTINFOHEAD[alg] == "undefined")
          throw "alg not supported in Util.DIGESTINFOHEAD: " + alg;
        return this.DIGESTINFOHEAD[alg] + hHash;
      };
      this.getPaddedDigestInfoHex = function(hHash, alg, keySize) {
        var hDigestInfo = this.getDigestInfoHex(hHash, alg);
        var pmStrLen = keySize / 4;
        if (hDigestInfo.length + 22 > pmStrLen)
          throw "key is too short for SigAlg: keylen=" + keySize + "," + alg;
        var hHead = "0001";
        var hTail = "00" + hDigestInfo;
        var hMid = "";
        var fLen = pmStrLen - hHead.length - hTail.length;
        for (var i = 0; i < fLen; i += 2) {
          hMid += "ff";
        }
        var hPaddedMessage = hHead + hMid + hTail;
        return hPaddedMessage;
      };
      this.hashString = function(s, alg) {
        var md = new KJUR.crypto.MessageDigest({'alg': alg});
        return md.digestString(s);
      };
      this.hashHex = function(sHex, alg) {
        var md = new KJUR.crypto.MessageDigest({'alg': alg});
        return md.digestHex(sHex);
      };
      this.sha1 = function(s) {
        var md = new KJUR.crypto.MessageDigest({
          'alg': 'sha1',
          'prov': 'cryptojs'
        });
        return md.digestString(s);
      };
      this.sha256 = function(s) {
        var md = new KJUR.crypto.MessageDigest({
          'alg': 'sha256',
          'prov': 'cryptojs'
        });
        return md.digestString(s);
      };
      this.sha256Hex = function(s) {
        var md = new KJUR.crypto.MessageDigest({
          'alg': 'sha256',
          'prov': 'cryptojs'
        });
        return md.digestHex(s);
      };
      this.sha512 = function(s) {
        var md = new KJUR.crypto.MessageDigest({
          'alg': 'sha512',
          'prov': 'cryptojs'
        });
        return md.digestString(s);
      };
      this.sha512Hex = function(s) {
        var md = new KJUR.crypto.MessageDigest({
          'alg': 'sha512',
          'prov': 'cryptojs'
        });
        return md.digestHex(s);
      };
      this.md5 = function(s) {
        var md = new KJUR.crypto.MessageDigest({
          'alg': 'md5',
          'prov': 'cryptojs'
        });
        return md.digestString(s);
      };
      this.ripemd160 = function(s) {
        var md = new KJUR.crypto.MessageDigest({
          'alg': 'ripemd160',
          'prov': 'cryptojs'
        });
        return md.digestString(s);
      };
      this.getCryptoJSMDByName = function(s) {};
    };
    KJUR.crypto.MessageDigest = function(params) {
      var md = null;
      var algName = null;
      var provName = null;
      this.setAlgAndProvider = function(alg, prov) {
        if (alg != null && prov === undefined)
          prov = KJUR.crypto.Util.DEFAULTPROVIDER[alg];
        if (':md5:sha1:sha224:sha256:sha384:sha512:ripemd160:'.indexOf(alg) != -1 && prov == 'cryptojs') {
          try {
            this.md = eval(KJUR.crypto.Util.CRYPTOJSMESSAGEDIGESTNAME[alg]).create();
          } catch (ex) {
            throw "setAlgAndProvider hash alg set fail alg=" + alg + "/" + ex;
          }
          this.updateString = function(str) {
            this.md.update(str);
          };
          this.updateHex = function(hex) {
            var wHex = CryptoJS.enc.Hex.parse(hex);
            this.md.update(wHex);
          };
          this.digest = function() {
            var hash = this.md.finalize();
            return hash.toString(CryptoJS.enc.Hex);
          };
          this.digestString = function(str) {
            this.updateString(str);
            return this.digest();
          };
          this.digestHex = function(hex) {
            this.updateHex(hex);
            return this.digest();
          };
        }
        if (':sha256:'.indexOf(alg) != -1 && prov == 'sjcl') {
          try {
            this.md = new sjcl.hash.sha256();
          } catch (ex) {
            throw "setAlgAndProvider hash alg set fail alg=" + alg + "/" + ex;
          }
          this.updateString = function(str) {
            this.md.update(str);
          };
          this.updateHex = function(hex) {
            var baHex = sjcl.codec.hex.toBits(hex);
            this.md.update(baHex);
          };
          this.digest = function() {
            var hash = this.md.finalize();
            return sjcl.codec.hex.fromBits(hash);
          };
          this.digestString = function(str) {
            this.updateString(str);
            return this.digest();
          };
          this.digestHex = function(hex) {
            this.updateHex(hex);
            return this.digest();
          };
        }
      };
      this.updateString = function(str) {
        throw "updateString(str) not supported for this alg/prov: " + this.algName + "/" + this.provName;
      };
      this.updateHex = function(hex) {
        throw "updateHex(hex) not supported for this alg/prov: " + this.algName + "/" + this.provName;
      };
      this.digest = function() {
        throw "digest() not supported for this alg/prov: " + this.algName + "/" + this.provName;
      };
      this.digestString = function(str) {
        throw "digestString(str) not supported for this alg/prov: " + this.algName + "/" + this.provName;
      };
      this.digestHex = function(hex) {
        throw "digestHex(hex) not supported for this alg/prov: " + this.algName + "/" + this.provName;
      };
      if (params !== undefined) {
        if (params['alg'] !== undefined) {
          this.algName = params['alg'];
          if (params['prov'] === undefined)
            this.provName = KJUR.crypto.Util.DEFAULTPROVIDER[this.algName];
          this.setAlgAndProvider(this.algName, this.provName);
        }
      }
    };
    KJUR.crypto.Mac = function(params) {
      var mac = null;
      var pass = null;
      var algName = null;
      var provName = null;
      var algProv = null;
      this.setAlgAndProvider = function(alg, prov) {
        if (alg == null)
          alg = "hmacsha1";
        alg = alg.toLowerCase();
        if (alg.substr(0, 4) != "hmac") {
          throw "setAlgAndProvider unsupported HMAC alg: " + alg;
        }
        if (prov === undefined)
          prov = KJUR.crypto.Util.DEFAULTPROVIDER[alg];
        this.algProv = alg + "/" + prov;
        var hashAlg = alg.substr(4);
        if (':md5:sha1:sha224:sha256:sha384:sha512:ripemd160:'.indexOf(hashAlg) != -1 && prov == 'cryptojs') {
          try {
            var mdObj = eval(KJUR.crypto.Util.CRYPTOJSMESSAGEDIGESTNAME[hashAlg]);
            this.mac = CryptoJS.algo.HMAC.create(mdObj, this.pass);
          } catch (ex) {
            throw "setAlgAndProvider hash alg set fail hashAlg=" + hashAlg + "/" + ex;
          }
          this.updateString = function(str) {
            this.mac.update(str);
          };
          this.updateHex = function(hex) {
            var wHex = CryptoJS.enc.Hex.parse(hex);
            this.mac.update(wHex);
          };
          this.doFinal = function() {
            var hash = this.mac.finalize();
            return hash.toString(CryptoJS.enc.Hex);
          };
          this.doFinalString = function(str) {
            this.updateString(str);
            return this.doFinal();
          };
          this.doFinalHex = function(hex) {
            this.updateHex(hex);
            return this.doFinal();
          };
        }
      };
      this.updateString = function(str) {
        throw "updateString(str) not supported for this alg/prov: " + this.algProv;
      };
      this.updateHex = function(hex) {
        throw "updateHex(hex) not supported for this alg/prov: " + this.algProv;
      };
      this.doFinal = function() {
        throw "digest() not supported for this alg/prov: " + this.algProv;
      };
      this.doFinalString = function(str) {
        throw "digestString(str) not supported for this alg/prov: " + this.algProv;
      };
      this.doFinalHex = function(hex) {
        throw "digestHex(hex) not supported for this alg/prov: " + this.algProv;
      };
      if (params !== undefined) {
        if (params['pass'] !== undefined) {
          this.pass = params['pass'];
        }
        if (params['alg'] !== undefined) {
          this.algName = params['alg'];
          if (params['prov'] === undefined)
            this.provName = KJUR.crypto.Util.DEFAULTPROVIDER[this.algName];
          this.setAlgAndProvider(this.algName, this.provName);
        }
      }
    };
    KJUR.crypto.Signature = function(params) {
      var prvKey = null;
      var pubKey = null;
      var md = null;
      var sig = null;
      var algName = null;
      var provName = null;
      var algProvName = null;
      var mdAlgName = null;
      var pubkeyAlgName = null;
      var state = null;
      var pssSaltLen = -1;
      var initParams = null;
      var sHashHex = null;
      var hDigestInfo = null;
      var hPaddedDigestInfo = null;
      var hSign = null;
      this._setAlgNames = function() {
        if (this.algName.match(/^(.+)with(.+)$/)) {
          this.mdAlgName = RegExp.$1.toLowerCase();
          this.pubkeyAlgName = RegExp.$2.toLowerCase();
        }
      };
      this._zeroPaddingOfSignature = function(hex, bitLength) {
        var s = "";
        var nZero = bitLength / 4 - hex.length;
        for (var i = 0; i < nZero; i++) {
          s = s + "0";
        }
        return s + hex;
      };
      this.setAlgAndProvider = function(alg, prov) {
        this._setAlgNames();
        if (prov != 'cryptojs/jsrsa')
          throw "provider not supported: " + prov;
        if (':md5:sha1:sha224:sha256:sha384:sha512:ripemd160:'.indexOf(this.mdAlgName) != -1) {
          try {
            this.md = new KJUR.crypto.MessageDigest({'alg': this.mdAlgName});
          } catch (ex) {
            throw "setAlgAndProvider hash alg set fail alg=" + this.mdAlgName + "/" + ex;
          }
          this.init = function(keyparam, pass) {
            var keyObj = null;
            try {
              if (pass === undefined) {
                keyObj = KEYUTIL.getKey(keyparam);
              } else {
                keyObj = KEYUTIL.getKey(keyparam, pass);
              }
            } catch (ex) {
              throw "init failed:" + ex;
            }
            if (keyObj.isPrivate === true) {
              this.prvKey = keyObj;
              this.state = "SIGN";
            } else if (keyObj.isPublic === true) {
              this.pubKey = keyObj;
              this.state = "VERIFY";
            } else {
              throw "init failed.:" + keyObj;
            }
          };
          this.initSign = function(params) {
            if (typeof params['ecprvhex'] == 'string' && typeof params['eccurvename'] == 'string') {
              this.ecprvhex = params['ecprvhex'];
              this.eccurvename = params['eccurvename'];
            } else {
              this.prvKey = params;
            }
            this.state = "SIGN";
          };
          this.initVerifyByPublicKey = function(params) {
            if (typeof params['ecpubhex'] == 'string' && typeof params['eccurvename'] == 'string') {
              this.ecpubhex = params['ecpubhex'];
              this.eccurvename = params['eccurvename'];
            } else if (params instanceof KJUR.crypto.ECDSA) {
              this.pubKey = params;
            } else if (params instanceof RSAKey) {
              this.pubKey = params;
            }
            this.state = "VERIFY";
          };
          this.initVerifyByCertificatePEM = function(certPEM) {
            var x509 = new X509();
            x509.readCertPEM(certPEM);
            this.pubKey = x509.subjectPublicKeyRSA;
            this.state = "VERIFY";
          };
          this.updateString = function(str) {
            this.md.updateString(str);
          };
          this.updateHex = function(hex) {
            this.md.updateHex(hex);
          };
          this.sign = function() {
            this.sHashHex = this.md.digest();
            if (typeof this.ecprvhex != "undefined" && typeof this.eccurvename != "undefined") {
              var ec = new KJUR.crypto.ECDSA({'curve': this.eccurvename});
              this.hSign = ec.signHex(this.sHashHex, this.ecprvhex);
            } else if (this.pubkeyAlgName == "rsaandmgf1") {
              this.hSign = this.prvKey.signWithMessageHashPSS(this.sHashHex, this.mdAlgName, this.pssSaltLen);
            } else if (this.pubkeyAlgName == "rsa") {
              this.hSign = this.prvKey.signWithMessageHash(this.sHashHex, this.mdAlgName);
            } else if (this.prvKey instanceof KJUR.crypto.ECDSA) {
              this.hSign = this.prvKey.signWithMessageHash(this.sHashHex);
            } else if (this.prvKey instanceof KJUR.crypto.DSA) {
              this.hSign = this.prvKey.signWithMessageHash(this.sHashHex);
            } else {
              throw "Signature: unsupported public key alg: " + this.pubkeyAlgName;
            }
            return this.hSign;
          };
          this.signString = function(str) {
            this.updateString(str);
            return this.sign();
          };
          this.signHex = function(hex) {
            this.updateHex(hex);
            return this.sign();
          };
          this.verify = function(hSigVal) {
            this.sHashHex = this.md.digest();
            if (typeof this.ecpubhex != "undefined" && typeof this.eccurvename != "undefined") {
              var ec = new KJUR.crypto.ECDSA({curve: this.eccurvename});
              return ec.verifyHex(this.sHashHex, hSigVal, this.ecpubhex);
            } else if (this.pubkeyAlgName == "rsaandmgf1") {
              return this.pubKey.verifyWithMessageHashPSS(this.sHashHex, hSigVal, this.mdAlgName, this.pssSaltLen);
            } else if (this.pubkeyAlgName == "rsa") {
              return this.pubKey.verifyWithMessageHash(this.sHashHex, hSigVal);
            } else if (this.pubKey instanceof KJUR.crypto.ECDSA) {
              return this.pubKey.verifyWithMessageHash(this.sHashHex, hSigVal);
            } else if (this.pubKey instanceof KJUR.crypto.DSA) {
              return this.pubKey.verifyWithMessageHash(this.sHashHex, hSigVal);
            } else {
              throw "Signature: unsupported public key alg: " + this.pubkeyAlgName;
            }
          };
        }
      };
      this.init = function(key, pass) {
        throw "init(key, pass) not supported for this alg:prov=" + this.algProvName;
      };
      this.initVerifyByPublicKey = function(rsaPubKey) {
        throw "initVerifyByPublicKey(rsaPubKeyy) not supported for this alg:prov=" + this.algProvName;
      };
      this.initVerifyByCertificatePEM = function(certPEM) {
        throw "initVerifyByCertificatePEM(certPEM) not supported for this alg:prov=" + this.algProvName;
      };
      this.initSign = function(prvKey) {
        throw "initSign(prvKey) not supported for this alg:prov=" + this.algProvName;
      };
      this.updateString = function(str) {
        throw "updateString(str) not supported for this alg:prov=" + this.algProvName;
      };
      this.updateHex = function(hex) {
        throw "updateHex(hex) not supported for this alg:prov=" + this.algProvName;
      };
      this.sign = function() {
        throw "sign() not supported for this alg:prov=" + this.algProvName;
      };
      this.signString = function(str) {
        throw "digestString(str) not supported for this alg:prov=" + this.algProvName;
      };
      this.signHex = function(hex) {
        throw "digestHex(hex) not supported for this alg:prov=" + this.algProvName;
      };
      this.verify = function(hSigVal) {
        throw "verify(hSigVal) not supported for this alg:prov=" + this.algProvName;
      };
      this.initParams = params;
      if (params !== undefined) {
        if (params['alg'] !== undefined) {
          this.algName = params['alg'];
          if (params['prov'] === undefined) {
            this.provName = KJUR.crypto.Util.DEFAULTPROVIDER[this.algName];
          } else {
            this.provName = params['prov'];
          }
          this.algProvName = this.algName + ":" + this.provName;
          this.setAlgAndProvider(this.algName, this.provName);
          this._setAlgNames();
        }
        if (params['psssaltlen'] !== undefined)
          this.pssSaltLen = params['psssaltlen'];
        if (params['prvkeypem'] !== undefined) {
          if (params['prvkeypas'] !== undefined) {
            throw "both prvkeypem and prvkeypas parameters not supported";
          } else {
            try {
              var prvKey = new RSAKey();
              prvKey.readPrivateKeyFromPEMString(params['prvkeypem']);
              this.initSign(prvKey);
            } catch (ex) {
              throw "fatal error to load pem private key: " + ex;
            }
          }
        }
      }
    };
    KJUR.crypto.OID = new function() {
      this.oidhex2name = {
        '2a864886f70d010101': 'rsaEncryption',
        '2a8648ce3d0201': 'ecPublicKey',
        '2a8648ce380401': 'dsa',
        '2a8648ce3d030107': 'secp256r1',
        '2b8104001f': 'secp192k1',
        '2b81040021': 'secp224r1',
        '2b8104000a': 'secp256k1',
        '2b81040023': 'secp521r1',
        '2b81040022': 'secp384r1',
        '2a8648ce380403': 'SHA1withDSA',
        '608648016503040301': 'SHA224withDSA',
        '608648016503040302': 'SHA256withDSA'
      };
    };
    function Base64x() {}
    function stoBA(s) {
      var a = new Array();
      for (var i = 0; i < s.length; i++) {
        a[i] = s.charCodeAt(i);
      }
      return a;
    }
    function BAtos(a) {
      var s = "";
      for (var i = 0; i < a.length; i++) {
        s = s + String.fromCharCode(a[i]);
      }
      return s;
    }
    function BAtohex(a) {
      var s = "";
      for (var i = 0; i < a.length; i++) {
        var hex1 = a[i].toString(16);
        if (hex1.length == 1)
          hex1 = "0" + hex1;
        s = s + hex1;
      }
      return s;
    }
    function stohex(s) {
      return BAtohex(stoBA(s));
    }
    function stob64(s) {
      return hex2b64(stohex(s));
    }
    function stob64u(s) {
      return b64tob64u(hex2b64(stohex(s)));
    }
    function b64utos(s) {
      return BAtos(b64toBA(b64utob64(s)));
    }
    function b64tob64u(s) {
      s = s.replace(/\=/g, "");
      s = s.replace(/\+/g, "-");
      s = s.replace(/\//g, "_");
      return s;
    }
    function b64utob64(s) {
      if (s.length % 4 == 2)
        s = s + "==";
      else if (s.length % 4 == 3)
        s = s + "=";
      s = s.replace(/-/g, "+");
      s = s.replace(/_/g, "/");
      return s;
    }
    function hextob64u(s) {
      return b64tob64u(hex2b64(s));
    }
    function b64utohex(s) {
      return b64tohex(b64utob64(s));
    }
    var utf8tob64u,
        b64utoutf8;
    if (typeof Buffer === 'function') {
      utf8tob64u = function(s) {
        return b64tob64u(new Buffer(s, 'utf8').toString('base64'));
      };
      b64utoutf8 = function(s) {
        return new Buffer(b64utob64(s), 'base64').toString('utf8');
      };
    } else {
      utf8tob64u = function(s) {
        return hextob64u(uricmptohex(encodeURIComponentAll(s)));
      };
      b64utoutf8 = function(s) {
        return decodeURIComponent(hextouricmp(b64utohex(s)));
      };
    }
    function utf8tob64(s) {
      return hex2b64(uricmptohex(encodeURIComponentAll(s)));
    }
    function b64toutf8(s) {
      return decodeURIComponent(hextouricmp(b64tohex(s)));
    }
    function utf8tohex(s) {
      return uricmptohex(encodeURIComponentAll(s));
    }
    function hextoutf8(s) {
      return decodeURIComponent(hextouricmp(s));
    }
    function hextorstr(sHex) {
      var s = "";
      for (var i = 0; i < sHex.length - 1; i += 2) {
        s += String.fromCharCode(parseInt(sHex.substr(i, 2), 16));
      }
      return s;
    }
    function rstrtohex(s) {
      var result = "";
      for (var i = 0; i < s.length; i++) {
        result += ("0" + s.charCodeAt(i).toString(16)).slice(-2);
      }
      return result;
    }
    function hextob64(s) {
      return hex2b64(s);
    }
    function hextob64nl(s) {
      var b64 = hextob64(s);
      var b64nl = b64.replace(/(.{64})/g, "$1\r\n");
      b64nl = b64nl.replace(/\r\n$/, '');
      return b64nl;
    }
    function b64nltohex(s) {
      var b64 = s.replace(/[^0-9A-Za-z\/+=]*/g, '');
      var hex = b64tohex(b64);
      return hex;
    }
    function uricmptohex(s) {
      return s.replace(/%/g, "");
    }
    function hextouricmp(s) {
      return s.replace(/(..)/g, "%$1");
    }
    function encodeURIComponentAll(u8) {
      var s = encodeURIComponent(u8);
      var s2 = "";
      for (var i = 0; i < s.length; i++) {
        if (s[i] == "%") {
          s2 = s2 + s.substr(i, 3);
          i = i + 2;
        } else {
          s2 = s2 + "%" + stohex(s[i]);
        }
      }
      return s2;
    }
    function newline_toUnix(s) {
      s = s.replace(/\r\n/mg, "\n");
      return s;
    }
    function newline_toDos(s) {
      s = s.replace(/\r\n/mg, "\n");
      s = s.replace(/\n/mg, "\r\n");
      return s;
    }
    this["b64map"] = b64map;
    this["b64pad"] = b64pad;
    this["dbits"] = dbits;
    this["canary"] = canary;
    this["j_lm"] = j_lm;
    this["BI_FP"] = BI_FP;
    this["BI_RM"] = BI_RM;
    this["BI_RC"] = BI_RC;
    this["rr"] = rr;
    this["vv"] = vv;
    this["lowprimes"] = lowprimes;
    this["lplim"] = lplim;
    this["SHA1_SIZE"] = SHA1_SIZE;
    this["_RE_HEXDECONLY"] = _RE_HEXDECONLY;
    this["ASN1HEX"] = ASN1HEX;
    this["utf8tob64u"] = utf8tob64u;
    this["b64utoutf8"] = b64utoutf8;
  })();
  return _retrieveGlobal();
});

System.registerDynamic("lib:json-sans-eval.js", [], false, function($__require, $__exports, $__module) {
  var _retrieveGlobal = System.get("@@global-helpers").prepareGlobal($__module.id, null, null);
  (function() {
    var jsonParse = this["jsonParse"];
    var jsonParse = (function() {
      var number = '(?:-?\\b(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?(?:[eE][+-]?[0-9]+)?\\b)';
      var oneChar = '(?:[^\\0-\\x08\\x0a-\\x1f\"\\\\]' + '|\\\\(?:[\"/\\\\bfnrt]|u[0-9A-Fa-f]{4}))';
      var string = '(?:\"' + oneChar + '*\")';
      var jsonToken = new RegExp('(?:false|true|null|[\\{\\}\\[\\]]' + '|' + number + '|' + string + ')', 'g');
      var escapeSequence = new RegExp('\\\\(?:([^u])|u(.{4}))', 'g');
      var escapes = {
        '"': '"',
        '/': '/',
        '\\': '\\',
        'b': '\b',
        'f': '\f',
        'n': '\n',
        'r': '\r',
        't': '\t'
      };
      function unescapeOne(_, ch, hex) {
        return ch ? escapes[ch] : String.fromCharCode(parseInt(hex, 16));
      }
      var EMPTY_STRING = new String('');
      var SLASH = '\\';
      var firstTokenCtors = {
        '{': Object,
        '[': Array
      };
      var hop = Object.hasOwnProperty;
      return function(json, opt_reviver) {
        var toks = json.match(jsonToken);
        var result;
        var tok = toks[0];
        var topLevelPrimitive = false;
        if ('{' === tok) {
          result = {};
        } else if ('[' === tok) {
          result = [];
        } else {
          result = [];
          topLevelPrimitive = true;
        }
        var key;
        var stack = [result];
        for (var i = 1 - topLevelPrimitive,
            n = toks.length; i < n; ++i) {
          tok = toks[i];
          var cont;
          switch (tok.charCodeAt(0)) {
            default:
              cont = stack[0];
              cont[key || cont.length] = +(tok);
              key = void 0;
              break;
            case 0x22:
              tok = tok.substring(1, tok.length - 1);
              if (tok.indexOf(SLASH) !== -1) {
                tok = tok.replace(escapeSequence, unescapeOne);
              }
              cont = stack[0];
              if (!key) {
                if (cont instanceof Array) {
                  key = cont.length;
                } else {
                  key = tok || EMPTY_STRING;
                  break;
                }
              }
              cont[key] = tok;
              key = void 0;
              break;
            case 0x5b:
              cont = stack[0];
              stack.unshift(cont[key || cont.length] = []);
              key = void 0;
              break;
            case 0x5d:
              stack.shift();
              break;
            case 0x66:
              cont = stack[0];
              cont[key || cont.length] = false;
              key = void 0;
              break;
            case 0x6e:
              cont = stack[0];
              cont[key || cont.length] = null;
              key = void 0;
              break;
            case 0x74:
              cont = stack[0];
              cont[key || cont.length] = true;
              key = void 0;
              break;
            case 0x7b:
              cont = stack[0];
              stack.unshift(cont[key || cont.length] = {});
              key = void 0;
              break;
            case 0x7d:
              stack.shift();
              break;
          }
        }
        if (topLevelPrimitive) {
          if (stack.length !== 1) {
            throw new Error();
          }
          result = result[0];
        } else {
          if (stack.length) {
            throw new Error();
          }
        }
        if (opt_reviver) {
          var walk = function(holder, key) {
            var value = holder[key];
            if (value && typeof value === 'object') {
              var toDelete = null;
              for (var k in value) {
                if (hop.call(value, k) && value !== holder) {
                  var v = walk(value, k);
                  if (v !== void 0) {
                    value[k] = v;
                  } else {
                    if (!toDelete) {
                      toDelete = [];
                    }
                    toDelete.push(k);
                  }
                }
              }
              if (toDelete) {
                for (var i = toDelete.length; --i >= 0; ) {
                  delete value[toDelete[i]];
                }
              }
            }
            return opt_reviver.call(holder, key, value);
          };
          result = walk({'': result}, '');
        }
        return result;
      };
    })();
    this["jsonParse"] = jsonParse;
  })();
  return _retrieveGlobal();
});

System.registerDynamic("lib:jws-3.0.js", [], false, function($__require, $__exports, $__module) {
  var _retrieveGlobal = System.get("@@global-helpers").prepareGlobal($__module.id, null, null);
  (function() {
    if (typeof KJUR == "undefined" || !KJUR)
      KJUR = {};
    if (typeof KJUR.jws == "undefined" || !KJUR.jws)
      KJUR.jws = {};
    KJUR.jws.JWS = function() {
      this.parseJWS = function(sJWS, sigValNotNeeded) {
        if ((this.parsedJWS !== undefined) && (sigValNotNeeded || (this.parsedJWS.sigvalH !== undefined))) {
          return;
        }
        if (sJWS.match(/^([^.]+)\.([^.]+)\.([^.]+)$/) == null) {
          throw "JWS signature is not a form of 'Head.Payload.SigValue'.";
        }
        var b6Head = RegExp.$1;
        var b6Payload = RegExp.$2;
        var b6SigVal = RegExp.$3;
        var sSI = b6Head + "." + b6Payload;
        this.parsedJWS = {};
        this.parsedJWS.headB64U = b6Head;
        this.parsedJWS.payloadB64U = b6Payload;
        this.parsedJWS.sigvalB64U = b6SigVal;
        this.parsedJWS.si = sSI;
        if (!sigValNotNeeded) {
          var hSigVal = b64utohex(b6SigVal);
          var biSigVal = parseBigInt(hSigVal, 16);
          this.parsedJWS.sigvalH = hSigVal;
          this.parsedJWS.sigvalBI = biSigVal;
        }
        var sHead = b64utoutf8(b6Head);
        var sPayload = b64utoutf8(b6Payload);
        this.parsedJWS.headS = sHead;
        this.parsedJWS.payloadS = sPayload;
        if (!KJUR.jws.JWS.isSafeJSONString(sHead, this.parsedJWS, 'headP'))
          throw "malformed JSON string for JWS Head: " + sHead;
      };
      function _getSignatureInputByString(sHead, sPayload) {
        return utf8tob64u(sHead) + "." + utf8tob64u(sPayload);
      }
      ;
      function _getHashBySignatureInput(sSignatureInput, sHashAlg) {
        var hashfunc = function(s) {
          return KJUR.crypto.Util.hashString(s, sHashAlg);
        };
        if (hashfunc == null)
          throw "hash function not defined in jsrsasign: " + sHashAlg;
        return hashfunc(sSignatureInput);
      }
      ;
      function _jws_verifySignature(sHead, sPayload, hSig, hN, hE) {
        var sSignatureInput = _getSignatureInputByString(sHead, sPayload);
        var biSig = parseBigInt(hSig, 16);
        return _rsasign_verifySignatureWithArgs(sSignatureInput, biSig, hN, hE);
      }
      ;
      this.verifyJWSByNE = function(sJWS, hN, hE) {
        this.parseJWS(sJWS);
        return _rsasign_verifySignatureWithArgs(this.parsedJWS.si, this.parsedJWS.sigvalBI, hN, hE);
      };
      this.verifyJWSByKey = function(sJWS, key) {
        this.parseJWS(sJWS);
        var hashAlg = _jws_getHashAlgFromParsedHead(this.parsedJWS.headP);
        var isPSS = this.parsedJWS.headP['alg'].substr(0, 2) == "PS";
        if (key.hashAndVerify) {
          return key.hashAndVerify(hashAlg, new Buffer(this.parsedJWS.si, 'utf8').toString('base64'), b64utob64(this.parsedJWS.sigvalB64U), 'base64', isPSS);
        } else if (isPSS) {
          return key.verifyStringPSS(this.parsedJWS.si, this.parsedJWS.sigvalH, hashAlg);
        } else {
          return key.verifyString(this.parsedJWS.si, this.parsedJWS.sigvalH);
        }
      };
      this.verifyJWSByPemX509Cert = function(sJWS, sPemX509Cert) {
        this.parseJWS(sJWS);
        var x509 = new X509();
        x509.readCertPEM(sPemX509Cert);
        return x509.subjectPublicKeyRSA.verifyString(this.parsedJWS.si, this.parsedJWS.sigvalH);
      };
      function _jws_getHashAlgFromParsedHead(head) {
        var sigAlg = head["alg"];
        var hashAlg = "";
        if (sigAlg != "RS256" && sigAlg != "RS512" && sigAlg != "PS256" && sigAlg != "PS512")
          throw "JWS signature algorithm not supported: " + sigAlg;
        if (sigAlg.substr(2) == "256")
          hashAlg = "sha256";
        if (sigAlg.substr(2) == "512")
          hashAlg = "sha512";
        return hashAlg;
      }
      ;
      function _jws_getHashAlgFromHead(sHead) {
        return _jws_getHashAlgFromParsedHead(jsonParse(sHead));
      }
      ;
      function _jws_generateSignatureValueBySI_NED(sHead, sPayload, sSI, hN, hE, hD) {
        var rsa = new RSAKey();
        rsa.setPrivate(hN, hE, hD);
        var hashAlg = _jws_getHashAlgFromHead(sHead);
        var sigValue = rsa.signString(sSI, hashAlg);
        return sigValue;
      }
      ;
      function _jws_generateSignatureValueBySI_Key(sHead, sPayload, sSI, key, head) {
        var hashAlg = null;
        if (typeof head == "undefined") {
          hashAlg = _jws_getHashAlgFromHead(sHead);
        } else {
          hashAlg = _jws_getHashAlgFromParsedHead(head);
        }
        var isPSS = head['alg'].substr(0, 2) == "PS";
        if (key.hashAndSign) {
          return b64tob64u(key.hashAndSign(hashAlg, sSI, 'binary', 'base64', isPSS));
        } else if (isPSS) {
          return hextob64u(key.signStringPSS(sSI, hashAlg));
        } else {
          return hextob64u(key.signString(sSI, hashAlg));
        }
      }
      ;
      function _jws_generateSignatureValueByNED(sHead, sPayload, hN, hE, hD) {
        var sSI = _getSignatureInputByString(sHead, sPayload);
        return _jws_generateSignatureValueBySI_NED(sHead, sPayload, sSI, hN, hE, hD);
      }
      ;
      this.generateJWSByNED = function(sHead, sPayload, hN, hE, hD) {
        if (!KJUR.jws.JWS.isSafeJSONString(sHead))
          throw "JWS Head is not safe JSON string: " + sHead;
        var sSI = _getSignatureInputByString(sHead, sPayload);
        var hSigValue = _jws_generateSignatureValueBySI_NED(sHead, sPayload, sSI, hN, hE, hD);
        var b64SigValue = hextob64u(hSigValue);
        this.parsedJWS = {};
        this.parsedJWS.headB64U = sSI.split(".")[0];
        this.parsedJWS.payloadB64U = sSI.split(".")[1];
        this.parsedJWS.sigvalB64U = b64SigValue;
        return sSI + "." + b64SigValue;
      };
      this.generateJWSByKey = function(sHead, sPayload, key) {
        var obj = {};
        if (!KJUR.jws.JWS.isSafeJSONString(sHead, obj, 'headP'))
          throw "JWS Head is not safe JSON string: " + sHead;
        var sSI = _getSignatureInputByString(sHead, sPayload);
        var b64SigValue = _jws_generateSignatureValueBySI_Key(sHead, sPayload, sSI, key, obj.headP);
        this.parsedJWS = {};
        this.parsedJWS.headB64U = sSI.split(".")[0];
        this.parsedJWS.payloadB64U = sSI.split(".")[1];
        this.parsedJWS.sigvalB64U = b64SigValue;
        return sSI + "." + b64SigValue;
      };
      function _jws_generateSignatureValueBySI_PemPrvKey(sHead, sPayload, sSI, sPemPrvKey) {
        var rsa = new RSAKey();
        rsa.readPrivateKeyFromPEMString(sPemPrvKey);
        var hashAlg = _jws_getHashAlgFromHead(sHead);
        var sigValue = rsa.signString(sSI, hashAlg);
        return sigValue;
      }
      ;
      this.generateJWSByP1PrvKey = function(sHead, sPayload, sPemPrvKey) {
        if (!KJUR.jws.JWS.isSafeJSONString(sHead))
          throw "JWS Head is not safe JSON string: " + sHead;
        var sSI = _getSignatureInputByString(sHead, sPayload);
        var hSigValue = _jws_generateSignatureValueBySI_PemPrvKey(sHead, sPayload, sSI, sPemPrvKey);
        var b64SigValue = hextob64u(hSigValue);
        this.parsedJWS = {};
        this.parsedJWS.headB64U = sSI.split(".")[0];
        this.parsedJWS.payloadB64U = sSI.split(".")[1];
        this.parsedJWS.sigvalB64U = b64SigValue;
        return sSI + "." + b64SigValue;
      };
    };
    KJUR.jws.JWS.sign = function(alg, sHeader, sPayload, key, pass) {
      var ns1 = KJUR.jws.JWS;
      if (!ns1.isSafeJSONString(sHeader))
        throw "JWS Head is not safe JSON string: " + sHead;
      var pHeader = ns1.readSafeJSONString(sHeader);
      if ((alg == '' || alg == null) && pHeader['alg'] !== undefined) {
        alg = pHeader['alg'];
      }
      if ((alg != '' && alg != null) && pHeader['alg'] === undefined) {
        pHeader['alg'] = alg;
        sHeader = JSON.stringify(pHeader);
      }
      var sigAlg = null;
      if (ns1.jwsalg2sigalg[alg] === undefined) {
        throw "unsupported alg name: " + alg;
      } else {
        sigAlg = ns1.jwsalg2sigalg[alg];
      }
      var uHeader = utf8tob64u(sHeader);
      var uPayload = utf8tob64u(sPayload);
      var uSignatureInput = uHeader + "." + uPayload;
      var hSig = "";
      if (sigAlg.substr(0, 4) == "Hmac") {
        if (key === undefined)
          throw "hexadecimal key shall be specified for HMAC";
        var mac = new KJUR.crypto.Mac({
          'alg': sigAlg,
          'pass': hextorstr(key)
        });
        mac.updateString(uSignatureInput);
        hSig = mac.doFinal();
      } else if (sigAlg.indexOf("withECDSA") != -1) {
        var sig = new KJUR.crypto.Signature({'alg': sigAlg});
        sig.init(key, pass);
        sig.updateString(uSignatureInput);
        hASN1Sig = sig.sign();
        hSig = KJUR.crypto.ECDSA.asn1SigToConcatSig(hASN1Sig);
      } else if (sigAlg != "none") {
        var sig = new KJUR.crypto.Signature({'alg': sigAlg});
        sig.init(key, pass);
        sig.updateString(uSignatureInput);
        hSig = sig.sign();
      }
      var uSig = hextob64u(hSig);
      return uSignatureInput + "." + uSig;
    };
    KJUR.jws.JWS.verify = function(sJWS, key) {
      var jws = KJUR.jws.JWS;
      var a = sJWS.split(".");
      var uHeader = a[0];
      var uPayload = a[1];
      var uSignatureInput = uHeader + "." + uPayload;
      var hSig = b64utohex(a[2]);
      var pHeader = jws.readSafeJSONString(b64utoutf8(a[0]));
      var alg = null;
      if (pHeader.alg === undefined) {
        throw "algorithm not specified in header";
      } else {
        alg = pHeader.alg;
      }
      var sigAlg = null;
      if (jws.jwsalg2sigalg[pHeader.alg] === undefined) {
        throw "unsupported alg name: " + alg;
      } else {
        sigAlg = jws.jwsalg2sigalg[alg];
      }
      if (sigAlg == "none") {
        return true;
      } else if (sigAlg.substr(0, 4) == "Hmac") {
        if (key === undefined)
          throw "hexadecimal key shall be specified for HMAC";
        var mac = new KJUR.crypto.Mac({
          'alg': sigAlg,
          'pass': hextorstr(key)
        });
        mac.updateString(uSignatureInput);
        hSig2 = mac.doFinal();
        return hSig == hSig2;
      } else if (sigAlg.indexOf("withECDSA") != -1) {
        var hASN1Sig = null;
        try {
          hASN1Sig = KJUR.crypto.ECDSA.concatSigToASN1Sig(hSig);
        } catch (ex) {
          return false;
        }
        var sig = new KJUR.crypto.Signature({'alg': sigAlg});
        sig.init(key);
        sig.updateString(uSignatureInput);
        return sig.verify(hASN1Sig);
      } else {
        var sig = new KJUR.crypto.Signature({'alg': sigAlg});
        sig.init(key);
        sig.updateString(uSignatureInput);
        return sig.verify(hSig);
      }
    };
    KJUR.jws.JWS.jwsalg2sigalg = {
      "HS256": "HmacSHA256",
      "HS512": "HmacSHA512",
      "RS256": "SHA256withRSA",
      "RS384": "SHA384withRSA",
      "RS512": "SHA512withRSA",
      "ES256": "SHA256withECDSA",
      "ES384": "SHA384withECDSA",
      "PS256": "SHA256withRSAandMGF1",
      "PS384": "SHA384withRSAandMGF1",
      "PS512": "SHA512withRSAandMGF1",
      "none": "none"
    };
    KJUR.jws.JWS.isSafeJSONString = function(s, h, p) {
      var o = null;
      try {
        o = jsonParse(s);
        if (typeof o != "object")
          return 0;
        if (o.constructor === Array)
          return 0;
        if (h)
          h[p] = o;
        return 1;
      } catch (ex) {
        return 0;
      }
    };
    KJUR.jws.JWS.readSafeJSONString = function(s) {
      var o = null;
      try {
        o = jsonParse(s);
        if (typeof o != "object")
          return null;
        if (o.constructor === Array)
          return null;
        return o;
      } catch (ex) {
        return null;
      }
    };
    KJUR.jws.JWS.getEncodedSignatureValueFromJWS = function(sJWS) {
      if (sJWS.match(/^[^.]+\.[^.]+\.([^.]+)$/) == null) {
        throw "JWS signature is not a form of 'Head.Payload.SigValue'.";
      }
      return RegExp.$1;
    };
    KJUR.jws.IntDate = function() {};
    KJUR.jws.IntDate.get = function(s) {
      if (s == "now") {
        return KJUR.jws.IntDate.getNow();
      } else if (s == "now + 1hour") {
        return KJUR.jws.IntDate.getNow() + 60 * 60;
      } else if (s == "now + 1day") {
        return KJUR.jws.IntDate.getNow() + 60 * 60 * 24;
      } else if (s == "now + 1month") {
        return KJUR.jws.IntDate.getNow() + 60 * 60 * 24 * 30;
      } else if (s == "now + 1year") {
        return KJUR.jws.IntDate.getNow() + 60 * 60 * 24 * 365;
      } else if (s.match(/Z$/)) {
        return KJUR.jws.IntDate.getZulu(s);
      } else if (s.match(/^[0-9]+$/)) {
        return parseInt(s);
      }
      throw "unsupported format: " + s;
    };
    KJUR.jws.IntDate.getZulu = function(s) {
      if (a = s.match(/(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)Z/)) {
        var year = parseInt(RegExp.$1);
        var month = parseInt(RegExp.$2) - 1;
        var day = parseInt(RegExp.$3);
        var hour = parseInt(RegExp.$4);
        var min = parseInt(RegExp.$5);
        var sec = parseInt(RegExp.$6);
        var d = new Date(Date.UTC(year, month, day, hour, min, sec));
        return ~~(d / 1000);
      }
      throw "unsupported format: " + s;
    };
    KJUR.jws.IntDate.getNow = function() {
      var d = ~~(new Date() / 1000);
      return d;
    };
    KJUR.jws.IntDate.intDate2UTCString = function(intDate) {
      var d = new Date(intDate * 1000);
      return d.toUTCString();
    };
    KJUR.jws.IntDate.intDate2Zulu = function(intDate) {
      var d = new Date(intDate * 1000);
      var year = ("0000" + d.getUTCFullYear()).slice(-4);
      var mon = ("00" + (d.getUTCMonth() + 1)).slice(-2);
      var day = ("00" + d.getUTCDate()).slice(-2);
      var hour = ("00" + d.getUTCHours()).slice(-2);
      var min = ("00" + d.getUTCMinutes()).slice(-2);
      var sec = ("00" + d.getUTCSeconds()).slice(-2);
      return year + mon + day + hour + min + sec + "Z";
    };
  })();
  return _retrieveGlobal();
});

System.register("src/Utils.ts", [], function(exports_1, context_1) {
  "use strict";
  var __moduleName = context_1 && context_1.id;
  var Utils;
  return {
    setters: [],
    execute: function() {
      Utils = (function() {
        function Utils() {}
        Utils.copy = function(obj, target) {
          target = target || {};
          for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
              target[key] = obj[key];
            }
          }
          return target;
        };
        Utils.rand = function() {
          return ((Date.now() + Math.random()) * Math.random()).toString().replace(".", "");
        };
        Utils.parseOidcResult = function(queryString) {
          queryString = queryString || location.hash;
          var idx = queryString.lastIndexOf("#");
          if (idx >= 0) {
            queryString = queryString.substr(idx + 1);
          }
          var params = {},
              regex = /([^&=]+)=([^&]*)/g,
              m;
          var counter = 0;
          while (m = regex.exec(queryString)) {
            params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
            if (counter++ > 50) {
              return {error: "Response exceeded expected number of parameters"};
            }
          }
          for (var prop in params) {
            return params;
          }
        };
        return Utils;
      }());
      exports_1("Utils", Utils);
    }
  };
});

System.registerDynamic("npm:process@0.11.2/browser.js", [], true, function($__require, exports, module) {
  ;
  var define;
  var global = this;
  var GLOBAL = this;
  var process = module.exports = {};
  var queue = [];
  var draining = false;
  var currentQueue;
  var queueIndex = -1;
  function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
      queue = currentQueue.concat(queue);
    } else {
      queueIndex = -1;
    }
    if (queue.length) {
      drainQueue();
    }
  }
  function drainQueue() {
    if (draining) {
      return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;
    var len = queue.length;
    while (len) {
      currentQueue = queue;
      queue = [];
      while (++queueIndex < len) {
        if (currentQueue) {
          currentQueue[queueIndex].run();
        }
      }
      queueIndex = -1;
      len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
  }
  process.nextTick = function(fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
      for (var i = 1; i < arguments.length; i++) {
        args[i - 1] = arguments[i];
      }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
      setTimeout(drainQueue, 0);
    }
  };
  function Item(fun, array) {
    this.fun = fun;
    this.array = array;
  }
  Item.prototype.run = function() {
    this.fun.apply(null, this.array);
  };
  process.title = 'browser';
  process.browser = true;
  process.env = {};
  process.argv = [];
  process.version = '';
  process.versions = {};
  function noop() {}
  process.on = noop;
  process.addListener = noop;
  process.once = noop;
  process.off = noop;
  process.removeListener = noop;
  process.removeAllListeners = noop;
  process.emit = noop;
  process.binding = function(name) {
    throw new Error('process.binding is not supported');
  };
  process.cwd = function() {
    return '/';
  };
  process.chdir = function(dir) {
    throw new Error('process.chdir is not supported');
  };
  process.umask = function() {
    return 0;
  };
  return module.exports;
});

System.registerDynamic("npm:process@0.11.2.js", ["npm:process@0.11.2/browser.js"], true, function($__require, exports, module) {
  ;
  var define;
  var global = this;
  var GLOBAL = this;
  module.exports = $__require('npm:process@0.11.2/browser.js');
  return module.exports;
});

System.registerDynamic("github:jspm/nodelibs-process@0.1.2/index.js", ["process"], true, function($__require, exports, module) {
  ;
  var define;
  var global = this;
  var GLOBAL = this;
  module.exports = System._nodeRequire ? process : $__require('process');
  return module.exports;
});

System.registerDynamic("github:jspm/nodelibs-process@0.1.2.js", ["github:jspm/nodelibs-process@0.1.2/index"], true, function($__require, exports, module) {
  ;
  var define;
  var global = this;
  var GLOBAL = this;
  module.exports = $__require('github:jspm/nodelibs-process@0.1.2/index');
  return module.exports;
});

System.registerDynamic("npm:es6-promise@3.1.2/dist/es6-promise.js", ["process"], true, function($__require, exports, module) {
  ;
  var define;
  var global = this;
  var GLOBAL = this;
  "format cjs";
  (function(process) {
    (function() {
      "use strict";
      function lib$es6$promise$utils$$objectOrFunction(x) {
        return typeof x === 'function' || (typeof x === 'object' && x !== null);
      }
      function lib$es6$promise$utils$$isFunction(x) {
        return typeof x === 'function';
      }
      function lib$es6$promise$utils$$isMaybeThenable(x) {
        return typeof x === 'object' && x !== null;
      }
      var lib$es6$promise$utils$$_isArray;
      if (!Array.isArray) {
        lib$es6$promise$utils$$_isArray = function(x) {
          return Object.prototype.toString.call(x) === '[object Array]';
        };
      } else {
        lib$es6$promise$utils$$_isArray = Array.isArray;
      }
      var lib$es6$promise$utils$$isArray = lib$es6$promise$utils$$_isArray;
      var lib$es6$promise$asap$$len = 0;
      var lib$es6$promise$asap$$vertxNext;
      var lib$es6$promise$asap$$customSchedulerFn;
      var lib$es6$promise$asap$$asap = function asap(callback, arg) {
        lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len] = callback;
        lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len + 1] = arg;
        lib$es6$promise$asap$$len += 2;
        if (lib$es6$promise$asap$$len === 2) {
          if (lib$es6$promise$asap$$customSchedulerFn) {
            lib$es6$promise$asap$$customSchedulerFn(lib$es6$promise$asap$$flush);
          } else {
            lib$es6$promise$asap$$scheduleFlush();
          }
        }
      };
      function lib$es6$promise$asap$$setScheduler(scheduleFn) {
        lib$es6$promise$asap$$customSchedulerFn = scheduleFn;
      }
      function lib$es6$promise$asap$$setAsap(asapFn) {
        lib$es6$promise$asap$$asap = asapFn;
      }
      var lib$es6$promise$asap$$browserWindow = (typeof window !== 'undefined') ? window : undefined;
      var lib$es6$promise$asap$$browserGlobal = lib$es6$promise$asap$$browserWindow || {};
      var lib$es6$promise$asap$$BrowserMutationObserver = lib$es6$promise$asap$$browserGlobal.MutationObserver || lib$es6$promise$asap$$browserGlobal.WebKitMutationObserver;
      var lib$es6$promise$asap$$isNode = typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';
      var lib$es6$promise$asap$$isWorker = typeof Uint8ClampedArray !== 'undefined' && typeof importScripts !== 'undefined' && typeof MessageChannel !== 'undefined';
      function lib$es6$promise$asap$$useNextTick() {
        return function() {
          process.nextTick(lib$es6$promise$asap$$flush);
        };
      }
      function lib$es6$promise$asap$$useVertxTimer() {
        return function() {
          lib$es6$promise$asap$$vertxNext(lib$es6$promise$asap$$flush);
        };
      }
      function lib$es6$promise$asap$$useMutationObserver() {
        var iterations = 0;
        var observer = new lib$es6$promise$asap$$BrowserMutationObserver(lib$es6$promise$asap$$flush);
        var node = document.createTextNode('');
        observer.observe(node, {characterData: true});
        return function() {
          node.data = (iterations = ++iterations % 2);
        };
      }
      function lib$es6$promise$asap$$useMessageChannel() {
        var channel = new MessageChannel();
        channel.port1.onmessage = lib$es6$promise$asap$$flush;
        return function() {
          channel.port2.postMessage(0);
        };
      }
      function lib$es6$promise$asap$$useSetTimeout() {
        return function() {
          setTimeout(lib$es6$promise$asap$$flush, 1);
        };
      }
      var lib$es6$promise$asap$$queue = new Array(1000);
      function lib$es6$promise$asap$$flush() {
        for (var i = 0; i < lib$es6$promise$asap$$len; i += 2) {
          var callback = lib$es6$promise$asap$$queue[i];
          var arg = lib$es6$promise$asap$$queue[i + 1];
          callback(arg);
          lib$es6$promise$asap$$queue[i] = undefined;
          lib$es6$promise$asap$$queue[i + 1] = undefined;
        }
        lib$es6$promise$asap$$len = 0;
      }
      function lib$es6$promise$asap$$attemptVertx() {
        try {
          var r = $__require;
          var vertx = r('vertx');
          lib$es6$promise$asap$$vertxNext = vertx.runOnLoop || vertx.runOnContext;
          return lib$es6$promise$asap$$useVertxTimer();
        } catch (e) {
          return lib$es6$promise$asap$$useSetTimeout();
        }
      }
      var lib$es6$promise$asap$$scheduleFlush;
      if (lib$es6$promise$asap$$isNode) {
        lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useNextTick();
      } else if (lib$es6$promise$asap$$BrowserMutationObserver) {
        lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMutationObserver();
      } else if (lib$es6$promise$asap$$isWorker) {
        lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMessageChannel();
      } else if (lib$es6$promise$asap$$browserWindow === undefined && typeof $__require === 'function') {
        lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$attemptVertx();
      } else {
        lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useSetTimeout();
      }
      function lib$es6$promise$then$$then(onFulfillment, onRejection) {
        var parent = this;
        var state = parent._state;
        if (state === lib$es6$promise$$internal$$FULFILLED && !onFulfillment || state === lib$es6$promise$$internal$$REJECTED && !onRejection) {
          return this;
        }
        var child = new this.constructor(lib$es6$promise$$internal$$noop);
        var result = parent._result;
        if (state) {
          var callback = arguments[state - 1];
          lib$es6$promise$asap$$asap(function() {
            lib$es6$promise$$internal$$invokeCallback(state, child, callback, result);
          });
        } else {
          lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection);
        }
        return child;
      }
      var lib$es6$promise$then$$default = lib$es6$promise$then$$then;
      function lib$es6$promise$promise$resolve$$resolve(object) {
        var Constructor = this;
        if (object && typeof object === 'object' && object.constructor === Constructor) {
          return object;
        }
        var promise = new Constructor(lib$es6$promise$$internal$$noop);
        lib$es6$promise$$internal$$resolve(promise, object);
        return promise;
      }
      var lib$es6$promise$promise$resolve$$default = lib$es6$promise$promise$resolve$$resolve;
      function lib$es6$promise$$internal$$noop() {}
      var lib$es6$promise$$internal$$PENDING = void 0;
      var lib$es6$promise$$internal$$FULFILLED = 1;
      var lib$es6$promise$$internal$$REJECTED = 2;
      var lib$es6$promise$$internal$$GET_THEN_ERROR = new lib$es6$promise$$internal$$ErrorObject();
      function lib$es6$promise$$internal$$selfFulfillment() {
        return new TypeError("You cannot resolve a promise with itself");
      }
      function lib$es6$promise$$internal$$cannotReturnOwn() {
        return new TypeError('A promises callback cannot return that same promise.');
      }
      function lib$es6$promise$$internal$$getThen(promise) {
        try {
          return promise.then;
        } catch (error) {
          lib$es6$promise$$internal$$GET_THEN_ERROR.error = error;
          return lib$es6$promise$$internal$$GET_THEN_ERROR;
        }
      }
      function lib$es6$promise$$internal$$tryThen(then, value, fulfillmentHandler, rejectionHandler) {
        try {
          then.call(value, fulfillmentHandler, rejectionHandler);
        } catch (e) {
          return e;
        }
      }
      function lib$es6$promise$$internal$$handleForeignThenable(promise, thenable, then) {
        lib$es6$promise$asap$$asap(function(promise) {
          var sealed = false;
          var error = lib$es6$promise$$internal$$tryThen(then, thenable, function(value) {
            if (sealed) {
              return;
            }
            sealed = true;
            if (thenable !== value) {
              lib$es6$promise$$internal$$resolve(promise, value);
            } else {
              lib$es6$promise$$internal$$fulfill(promise, value);
            }
          }, function(reason) {
            if (sealed) {
              return;
            }
            sealed = true;
            lib$es6$promise$$internal$$reject(promise, reason);
          }, 'Settle: ' + (promise._label || ' unknown promise'));
          if (!sealed && error) {
            sealed = true;
            lib$es6$promise$$internal$$reject(promise, error);
          }
        }, promise);
      }
      function lib$es6$promise$$internal$$handleOwnThenable(promise, thenable) {
        if (thenable._state === lib$es6$promise$$internal$$FULFILLED) {
          lib$es6$promise$$internal$$fulfill(promise, thenable._result);
        } else if (thenable._state === lib$es6$promise$$internal$$REJECTED) {
          lib$es6$promise$$internal$$reject(promise, thenable._result);
        } else {
          lib$es6$promise$$internal$$subscribe(thenable, undefined, function(value) {
            lib$es6$promise$$internal$$resolve(promise, value);
          }, function(reason) {
            lib$es6$promise$$internal$$reject(promise, reason);
          });
        }
      }
      function lib$es6$promise$$internal$$handleMaybeThenable(promise, maybeThenable, then) {
        if (maybeThenable.constructor === promise.constructor && then === lib$es6$promise$then$$default && constructor.resolve === lib$es6$promise$promise$resolve$$default) {
          lib$es6$promise$$internal$$handleOwnThenable(promise, maybeThenable);
        } else {
          if (then === lib$es6$promise$$internal$$GET_THEN_ERROR) {
            lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$GET_THEN_ERROR.error);
          } else if (then === undefined) {
            lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
          } else if (lib$es6$promise$utils$$isFunction(then)) {
            lib$es6$promise$$internal$$handleForeignThenable(promise, maybeThenable, then);
          } else {
            lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
          }
        }
      }
      function lib$es6$promise$$internal$$resolve(promise, value) {
        if (promise === value) {
          lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$selfFulfillment());
        } else if (lib$es6$promise$utils$$objectOrFunction(value)) {
          lib$es6$promise$$internal$$handleMaybeThenable(promise, value, lib$es6$promise$$internal$$getThen(value));
        } else {
          lib$es6$promise$$internal$$fulfill(promise, value);
        }
      }
      function lib$es6$promise$$internal$$publishRejection(promise) {
        if (promise._onerror) {
          promise._onerror(promise._result);
        }
        lib$es6$promise$$internal$$publish(promise);
      }
      function lib$es6$promise$$internal$$fulfill(promise, value) {
        if (promise._state !== lib$es6$promise$$internal$$PENDING) {
          return;
        }
        promise._result = value;
        promise._state = lib$es6$promise$$internal$$FULFILLED;
        if (promise._subscribers.length !== 0) {
          lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publish, promise);
        }
      }
      function lib$es6$promise$$internal$$reject(promise, reason) {
        if (promise._state !== lib$es6$promise$$internal$$PENDING) {
          return;
        }
        promise._state = lib$es6$promise$$internal$$REJECTED;
        promise._result = reason;
        lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publishRejection, promise);
      }
      function lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection) {
        var subscribers = parent._subscribers;
        var length = subscribers.length;
        parent._onerror = null;
        subscribers[length] = child;
        subscribers[length + lib$es6$promise$$internal$$FULFILLED] = onFulfillment;
        subscribers[length + lib$es6$promise$$internal$$REJECTED] = onRejection;
        if (length === 0 && parent._state) {
          lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publish, parent);
        }
      }
      function lib$es6$promise$$internal$$publish(promise) {
        var subscribers = promise._subscribers;
        var settled = promise._state;
        if (subscribers.length === 0) {
          return;
        }
        var child,
            callback,
            detail = promise._result;
        for (var i = 0; i < subscribers.length; i += 3) {
          child = subscribers[i];
          callback = subscribers[i + settled];
          if (child) {
            lib$es6$promise$$internal$$invokeCallback(settled, child, callback, detail);
          } else {
            callback(detail);
          }
        }
        promise._subscribers.length = 0;
      }
      function lib$es6$promise$$internal$$ErrorObject() {
        this.error = null;
      }
      var lib$es6$promise$$internal$$TRY_CATCH_ERROR = new lib$es6$promise$$internal$$ErrorObject();
      function lib$es6$promise$$internal$$tryCatch(callback, detail) {
        try {
          return callback(detail);
        } catch (e) {
          lib$es6$promise$$internal$$TRY_CATCH_ERROR.error = e;
          return lib$es6$promise$$internal$$TRY_CATCH_ERROR;
        }
      }
      function lib$es6$promise$$internal$$invokeCallback(settled, promise, callback, detail) {
        var hasCallback = lib$es6$promise$utils$$isFunction(callback),
            value,
            error,
            succeeded,
            failed;
        if (hasCallback) {
          value = lib$es6$promise$$internal$$tryCatch(callback, detail);
          if (value === lib$es6$promise$$internal$$TRY_CATCH_ERROR) {
            failed = true;
            error = value.error;
            value = null;
          } else {
            succeeded = true;
          }
          if (promise === value) {
            lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$cannotReturnOwn());
            return;
          }
        } else {
          value = detail;
          succeeded = true;
        }
        if (promise._state !== lib$es6$promise$$internal$$PENDING) {} else if (hasCallback && succeeded) {
          lib$es6$promise$$internal$$resolve(promise, value);
        } else if (failed) {
          lib$es6$promise$$internal$$reject(promise, error);
        } else if (settled === lib$es6$promise$$internal$$FULFILLED) {
          lib$es6$promise$$internal$$fulfill(promise, value);
        } else if (settled === lib$es6$promise$$internal$$REJECTED) {
          lib$es6$promise$$internal$$reject(promise, value);
        }
      }
      function lib$es6$promise$$internal$$initializePromise(promise, resolver) {
        try {
          resolver(function resolvePromise(value) {
            lib$es6$promise$$internal$$resolve(promise, value);
          }, function rejectPromise(reason) {
            lib$es6$promise$$internal$$reject(promise, reason);
          });
        } catch (e) {
          lib$es6$promise$$internal$$reject(promise, e);
        }
      }
      function lib$es6$promise$promise$all$$all(entries) {
        return new lib$es6$promise$enumerator$$default(this, entries).promise;
      }
      var lib$es6$promise$promise$all$$default = lib$es6$promise$promise$all$$all;
      function lib$es6$promise$promise$race$$race(entries) {
        var Constructor = this;
        var promise = new Constructor(lib$es6$promise$$internal$$noop);
        if (!lib$es6$promise$utils$$isArray(entries)) {
          lib$es6$promise$$internal$$reject(promise, new TypeError('You must pass an array to race.'));
          return promise;
        }
        var length = entries.length;
        function onFulfillment(value) {
          lib$es6$promise$$internal$$resolve(promise, value);
        }
        function onRejection(reason) {
          lib$es6$promise$$internal$$reject(promise, reason);
        }
        for (var i = 0; promise._state === lib$es6$promise$$internal$$PENDING && i < length; i++) {
          lib$es6$promise$$internal$$subscribe(Constructor.resolve(entries[i]), undefined, onFulfillment, onRejection);
        }
        return promise;
      }
      var lib$es6$promise$promise$race$$default = lib$es6$promise$promise$race$$race;
      function lib$es6$promise$promise$reject$$reject(reason) {
        var Constructor = this;
        var promise = new Constructor(lib$es6$promise$$internal$$noop);
        lib$es6$promise$$internal$$reject(promise, reason);
        return promise;
      }
      var lib$es6$promise$promise$reject$$default = lib$es6$promise$promise$reject$$reject;
      var lib$es6$promise$promise$$counter = 0;
      function lib$es6$promise$promise$$needsResolver() {
        throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
      }
      function lib$es6$promise$promise$$needsNew() {
        throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
      }
      var lib$es6$promise$promise$$default = lib$es6$promise$promise$$Promise;
      function lib$es6$promise$promise$$Promise(resolver) {
        this._id = lib$es6$promise$promise$$counter++;
        this._state = undefined;
        this._result = undefined;
        this._subscribers = [];
        if (lib$es6$promise$$internal$$noop !== resolver) {
          typeof resolver !== 'function' && lib$es6$promise$promise$$needsResolver();
          this instanceof lib$es6$promise$promise$$Promise ? lib$es6$promise$$internal$$initializePromise(this, resolver) : lib$es6$promise$promise$$needsNew();
        }
      }
      lib$es6$promise$promise$$Promise.all = lib$es6$promise$promise$all$$default;
      lib$es6$promise$promise$$Promise.race = lib$es6$promise$promise$race$$default;
      lib$es6$promise$promise$$Promise.resolve = lib$es6$promise$promise$resolve$$default;
      lib$es6$promise$promise$$Promise.reject = lib$es6$promise$promise$reject$$default;
      lib$es6$promise$promise$$Promise._setScheduler = lib$es6$promise$asap$$setScheduler;
      lib$es6$promise$promise$$Promise._setAsap = lib$es6$promise$asap$$setAsap;
      lib$es6$promise$promise$$Promise._asap = lib$es6$promise$asap$$asap;
      lib$es6$promise$promise$$Promise.prototype = {
        constructor: lib$es6$promise$promise$$Promise,
        then: lib$es6$promise$then$$default,
        'catch': function(onRejection) {
          return this.then(null, onRejection);
        }
      };
      var lib$es6$promise$enumerator$$default = lib$es6$promise$enumerator$$Enumerator;
      function lib$es6$promise$enumerator$$Enumerator(Constructor, input) {
        this._instanceConstructor = Constructor;
        this.promise = new Constructor(lib$es6$promise$$internal$$noop);
        if (Array.isArray(input)) {
          this._input = input;
          this.length = input.length;
          this._remaining = input.length;
          this._result = new Array(this.length);
          if (this.length === 0) {
            lib$es6$promise$$internal$$fulfill(this.promise, this._result);
          } else {
            this.length = this.length || 0;
            this._enumerate();
            if (this._remaining === 0) {
              lib$es6$promise$$internal$$fulfill(this.promise, this._result);
            }
          }
        } else {
          lib$es6$promise$$internal$$reject(this.promise, this._validationError());
        }
      }
      lib$es6$promise$enumerator$$Enumerator.prototype._validationError = function() {
        return new Error('Array Methods must be provided an Array');
      };
      lib$es6$promise$enumerator$$Enumerator.prototype._enumerate = function() {
        var length = this.length;
        var input = this._input;
        for (var i = 0; this._state === lib$es6$promise$$internal$$PENDING && i < length; i++) {
          this._eachEntry(input[i], i);
        }
      };
      lib$es6$promise$enumerator$$Enumerator.prototype._eachEntry = function(entry, i) {
        var c = this._instanceConstructor;
        var resolve = c.resolve;
        if (resolve === lib$es6$promise$promise$resolve$$default) {
          var then = lib$es6$promise$$internal$$getThen(entry);
          if (then === lib$es6$promise$then$$default && entry._state !== lib$es6$promise$$internal$$PENDING) {
            this._settledAt(entry._state, i, entry._result);
          } else if (typeof then !== 'function') {
            this._remaining--;
            this._result[i] = entry;
          } else if (c === lib$es6$promise$promise$$default) {
            var promise = new c(lib$es6$promise$$internal$$noop);
            lib$es6$promise$$internal$$handleMaybeThenable(promise, entry, then);
            this._willSettleAt(promise, i);
          } else {
            this._willSettleAt(new c(function(resolve) {
              resolve(entry);
            }), i);
          }
        } else {
          this._willSettleAt(resolve(entry), i);
        }
      };
      lib$es6$promise$enumerator$$Enumerator.prototype._settledAt = function(state, i, value) {
        var promise = this.promise;
        if (promise._state === lib$es6$promise$$internal$$PENDING) {
          this._remaining--;
          if (state === lib$es6$promise$$internal$$REJECTED) {
            lib$es6$promise$$internal$$reject(promise, value);
          } else {
            this._result[i] = value;
          }
        }
        if (this._remaining === 0) {
          lib$es6$promise$$internal$$fulfill(promise, this._result);
        }
      };
      lib$es6$promise$enumerator$$Enumerator.prototype._willSettleAt = function(promise, i) {
        var enumerator = this;
        lib$es6$promise$$internal$$subscribe(promise, undefined, function(value) {
          enumerator._settledAt(lib$es6$promise$$internal$$FULFILLED, i, value);
        }, function(reason) {
          enumerator._settledAt(lib$es6$promise$$internal$$REJECTED, i, reason);
        });
      };
      function lib$es6$promise$polyfill$$polyfill() {
        var local;
        if (typeof global !== 'undefined') {
          local = global;
        } else if (typeof self !== 'undefined') {
          local = self;
        } else {
          try {
            local = Function('return this')();
          } catch (e) {
            throw new Error('polyfill failed because global object is unavailable in this environment');
          }
        }
        var P = local.Promise;
        if (P && Object.prototype.toString.call(P.resolve()) === '[object Promise]' && !P.cast) {
          return;
        }
        local.Promise = lib$es6$promise$promise$$default;
      }
      var lib$es6$promise$polyfill$$default = lib$es6$promise$polyfill$$polyfill;
      var lib$es6$promise$umd$$ES6Promise = {
        'Promise': lib$es6$promise$promise$$default,
        'polyfill': lib$es6$promise$polyfill$$default
      };
      if (typeof define === 'function' && define['amd']) {
        define(function() {
          return lib$es6$promise$umd$$ES6Promise;
        });
      } else if (typeof module !== 'undefined' && module['exports']) {
        module['exports'] = lib$es6$promise$umd$$ES6Promise;
      } else if (typeof this !== 'undefined') {
        this['ES6Promise'] = lib$es6$promise$umd$$ES6Promise;
      }
      lib$es6$promise$polyfill$$default();
    }).call(this);
  })($__require('process'));
  return module.exports;
});

System.registerDynamic("npm:es6-promise@3.1.2.js", ["npm:es6-promise@3.1.2/dist/es6-promise.js"], true, function($__require, exports, module) {
  ;
  var define;
  var global = this;
  var GLOBAL = this;
  module.exports = $__require('npm:es6-promise@3.1.2/dist/es6-promise.js');
  return module.exports;
});

System.register("src/DefaultHttpRequest.ts", ["es6-promise"], function(exports_1, context_1) {
  "use strict";
  var __moduleName = context_1 && context_1.id;
  var es6_promise_1;
  var DefaultHttpRequest;
  return {
    setters: [function(es6_promise_1_1) {
      es6_promise_1 = es6_promise_1_1;
    }],
    execute: function() {
      DefaultHttpRequest = (function() {
        function DefaultHttpRequest() {}
        DefaultHttpRequest.prototype.setHeaders = function(xhr, headers) {
          var keys = Object.keys(headers);
          for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var value = headers[key];
            xhr.setRequestHeader(key, value);
          }
        };
        DefaultHttpRequest.prototype.getJSON = function(url, config) {
          var _this = this;
          return new es6_promise_1.default(function(resolve, reject) {
            try {
              var xhr = new XMLHttpRequest();
              xhr.open("GET", url);
              xhr.responseType = "json";
              if (config) {
                if (config.headers) {
                  _this.setHeaders(xhr, config.headers);
                }
              }
              xhr.onload = function() {
                try {
                  if (xhr.status === 200) {
                    var response = "";
                    if (window['XDomainRequest']) {
                      response = xhr.responseText;
                    } else {
                      response = xhr.response;
                    }
                    if (typeof response === "string") {
                      response = JSON.parse(response);
                    }
                    resolve(response);
                  } else {
                    reject(Error(xhr.statusText + "(" + xhr.status + ")"));
                  }
                } catch (err) {
                  reject(err);
                }
              };
              xhr.onerror = function() {
                reject(Error("Network error"));
              };
              xhr.send();
            } catch (err) {
              return reject(err);
            }
          });
        };
        return DefaultHttpRequest;
      }());
      exports_1("DefaultHttpRequest", DefaultHttpRequest);
    }
  };
});

System.register("src/OidcClient.ts", ["crypto-lib", "rsa-lib", "json-sans-eval-lib", "jws-lib", "es6-promise", "./Utils", "./DefaultHttpRequest"], function(exports_1, context_1) {
  "use strict";
  var __moduleName = context_1 && context_1.id;
  var es6_promise_1,
      Utils_1,
      DefaultHttpRequest_1;
  var OidcClient;
  return {
    setters: [function(_1) {}, function(_2) {}, function(_3) {}, function(_4) {}, function(es6_promise_1_1) {
      es6_promise_1 = es6_promise_1_1;
    }, function(Utils_1_1) {
      Utils_1 = Utils_1_1;
    }, function(DefaultHttpRequest_1_1) {
      DefaultHttpRequest_1 = DefaultHttpRequest_1_1;
    }],
    execute: function() {
      OidcClient = (function() {
        function OidcClient(settings) {
          this.httpRequest = new DefaultHttpRequest_1.DefaultHttpRequest();
          this._settings = settings || {};
          if (!this._settings.request_state_key) {
            this._settings.request_state_key = "OidcClient.request_state";
          }
          if (!this._settings.request_state_store) {
            this._settings.request_state_store = window.localStorage;
          }
          if (typeof this._settings.load_user_profile === 'undefined') {
            this._settings.load_user_profile = true;
          }
          if (typeof this._settings.filter_protocol_claims === 'undefined') {
            this._settings.filter_protocol_claims = true;
          }
          if (this._settings.authority && this._settings.authority.indexOf('.well-known/openid-configuration') < 0) {
            if (this._settings.authority[this._settings.authority.length - 1] !== '/') {
              this._settings.authority += '/';
            }
            this._settings.authority += '.well-known/openid-configuration';
          }
          if (!this._settings.response_type) {
            this._settings.response_type = "id_token token";
          }
        }
        Object.defineProperty(OidcClient.prototype, "_httpRequest", {
          get: function() {
            if (typeof(this.httpRequest) === "undefined" || this.httpRequest === null) {
              this.httpRequest = new DefaultHttpRequest_1.DefaultHttpRequest();
            }
            ;
            return this.httpRequest;
          },
          enumerable: true,
          configurable: true
        });
        Object.defineProperty(OidcClient.prototype, "isOidc", {
          get: function() {
            if (this._settings.response_type) {
              var result = this._settings.response_type.split(/\s+/g).filter(function(item) {
                return item === "id_token";
              });
              return !!(result[0]);
            }
            return false;
          },
          enumerable: true,
          configurable: true
        });
        Object.defineProperty(OidcClient.prototype, "isOAuth", {
          get: function() {
            if (this._settings.response_type) {
              var result = this._settings.response_type.split(/\s+/g).filter(function(item) {
                return item === "token";
              });
              return !!(result[0]);
            }
            return false;
          },
          enumerable: true,
          configurable: true
        });
        OidcClient.prototype.getJson = function(url, token) {
          var config = {};
          if (token) {
            config['headers'] = {"Authorization": "Bearer " + token};
          }
          return this._httpRequest.getJSON(url, config);
        };
        OidcClient.prototype.loadMetadataAsync = function() {
          var settings = this._settings;
          if (settings.metadata) {
            return es6_promise_1.Promise.resolve(settings.metadata);
          }
          if (!settings.authority) {
            return es6_promise_1.Promise.reject("No authority configured");
          }
          return this.getJson(settings.authority).then(function(metadata) {
            settings.metadata = metadata;
            return metadata;
          }).catch(function(err) {
            return es6_promise_1.Promise.reject("Failed to load metadata (" + err && err.message + ")");
          });
        };
        OidcClient.prototype.loadX509SigningKeyAsync = function() {
          var _this = this;
          var settings = this._settings;
          function getKeyAsync(jwks) {
            if (!jwks.keys || !jwks.keys.length) {
              return es6_promise_1.Promise.reject("Signing keys empty");
            }
            var key = jwks.keys[0];
            if (key.kty !== "RSA") {
              return es6_promise_1.Promise.reject("Signing key not RSA");
            }
            if (!key.x5c || !key.x5c.length) {
              return es6_promise_1.Promise.reject("RSA keys empty");
            }
            return es6_promise_1.Promise.resolve(key.x5c[0]);
          }
          if (settings.jwks) {
            return getKeyAsync(settings.jwks);
          }
          return this.loadMetadataAsync().then(function(metadata) {
            if (!metadata.jwks_uri) {
              return es6_promise_1.Promise.reject("Metadata does not contain jwks_uri");
            }
            return _this.getJson(metadata.jwks_uri).then(function(jwks) {
              settings.jwks = jwks;
              return getKeyAsync(jwks);
            }).catch(function(err) {
              return es6_promise_1.Promise.reject("Failed to load signing keys (" + err && err.message + ")");
            });
          });
        };
        OidcClient.prototype.loadUserProfile = function(accessToken, obj) {
          var _this = this;
          return this.loadMetadataAsync().then(function(metadata) {
            if (!metadata.userinfo_endpoint) {
              return es6_promise_1.Promise.reject("Metadata does not contain userinfo_endpoint");
            }
            return _this.getJson(metadata.userinfo_endpoint, accessToken);
          });
        };
        OidcClient.prototype.loadAuthorizationEndpoint = function() {
          if (this._settings.authorization_endpoint) {
            return es6_promise_1.Promise.resolve(this._settings.authorization_endpoint);
          }
          if (!this._settings.authority) {
            return es6_promise_1.Promise.reject("No authorization_endpoint configured");
          }
          return this.loadMetadataAsync().then(function(metadata) {
            if (!metadata.authorization_endpoint) {
              return es6_promise_1.Promise.reject("Metadata does not contain authorization_endpoint");
            }
            return metadata.authorization_endpoint;
          });
        };
        OidcClient.prototype.createTokenRequestAsync = function() {
          var _this = this;
          var settings = this._settings;
          return this.loadAuthorizationEndpoint().then(function(authorization_endpoint) {
            var state = Utils_1.Utils.rand();
            var url = authorization_endpoint + "?state=" + encodeURIComponent(state);
            if (_this.isOidc) {
              var nonce = Utils_1.Utils.rand();
              url += "&nonce=" + encodeURIComponent(nonce);
            }
            var required = ["client_id", "redirect_uri", "response_type", "scope"];
            required.forEach(function(key) {
              var value = settings[key];
              if (value) {
                url += "&" + key + "=" + encodeURIComponent(value);
              }
            });
            var optional = ["prompt", "display", "max_age", "ui_locales", "id_token_hint", "login_hint", "acr_values"];
            optional.forEach(function(key) {
              var value = settings[key];
              if (value) {
                url += "&" + key + "=" + encodeURIComponent(value);
              }
            });
            var request_state = {
              oidc: _this.isOidc,
              oauth: _this.isOAuth,
              state: state
            };
            if (nonce) {
              request_state["nonce"] = nonce;
            }
            settings.request_state_store.setItem(settings.request_state_key, JSON.stringify(request_state));
            return {
              request_state: request_state,
              url: url
            };
          });
        };
        OidcClient.prototype.createLogoutRequestAsync = function(idTokenHint) {
          var settings = this._settings;
          return this.loadMetadataAsync().then(function(metadata) {
            if (!metadata.end_session_endpoint) {
              return es6_promise_1.Promise.reject("No end_session_endpoint in metadata");
            }
            var url = metadata.end_session_endpoint;
            if (idTokenHint && settings.post_logout_redirect_uri) {
              url += "?post_logout_redirect_uri=" + encodeURIComponent(settings.post_logout_redirect_uri);
              url += "&id_token_hint=" + encodeURIComponent(idTokenHint);
            }
            return url;
          });
        };
        OidcClient.prototype.validateIdTokenAsync = function(idToken, nonce, accessToken) {
          var client = this;
          var settings = client._settings;
          return client.loadX509SigningKeyAsync().then(function(cert) {
            var jws = new KJUR.jws.JWS();
            if (jws.verifyJWSByPemX509Cert(idToken, cert)) {
              var id_token_contents = JSON.parse(jws.parsedJWS.payloadS);
              if (nonce !== id_token_contents.nonce) {
                return es6_promise_1.Promise.reject("Invalid nonce");
              }
              return client.loadMetadataAsync().then(function(metadata) {
                if (id_token_contents.iss !== metadata.issuer) {
                  return es6_promise_1.Promise.reject("Invalid issuer");
                }
                if (id_token_contents.aud !== settings.client_id) {
                  return es6_promise_1.Promise.reject("Invalid audience");
                }
                var now = parseInt((Date.now() / 1000).toString());
                var diff = now - id_token_contents.iat;
                if (diff > (5 * 60)) {
                  return es6_promise_1.Promise.reject("Token issued too long ago");
                }
                if (id_token_contents.exp < now) {
                  return es6_promise_1.Promise.reject("Token expired");
                }
                if (accessToken && settings.load_user_profile) {
                  return client.loadUserProfile(accessToken, id_token_contents).then(function(profile) {
                    return Utils_1.Utils.copy(profile, id_token_contents);
                  });
                } else {
                  return id_token_contents;
                }
              });
            } else {
              return es6_promise_1.Promise.reject("JWT failed to validate");
            }
          });
        };
        OidcClient.prototype.validateAccessTokenAsync = function(id_token_contents, access_token) {
          if (!id_token_contents.at_hash) {
            return es6_promise_1.Promise.reject("No at_hash in id_token");
          }
          var hash = KJUR.crypto.Util.sha256(access_token);
          var left = hash.substr(0, hash.length / 2);
          var left_b64u = hextob64u(left);
          if (left_b64u !== id_token_contents.at_hash) {
            return es6_promise_1.Promise.reject("at_hash failed to validate");
          }
          return es6_promise_1.Promise.resolve();
        };
        OidcClient.prototype.validateIdTokenAndAccessTokenAsync = function(id_token, nonce, access_token) {
          var _this = this;
          return this.validateIdTokenAsync(id_token, nonce, access_token).then(function(id_token_contents) {
            return _this.validateAccessTokenAsync(id_token_contents, access_token).then(function() {
              return id_token_contents;
            });
          });
        };
        OidcClient.prototype.processResponseAsync = function(queryString) {
          var settings = this._settings;
          var request_state = settings.request_state_store.getItem(settings.request_state_key);
          settings.request_state_store.removeItem(settings.request_state_key);
          if (!request_state) {
            return es6_promise_1.Promise.reject("No request state loaded");
          }
          request_state = JSON.parse(request_state);
          if (!request_state) {
            return es6_promise_1.Promise.reject("No request state loaded");
          }
          if (!request_state.state) {
            return es6_promise_1.Promise.reject("No state loaded");
          }
          var result = Utils_1.Utils.parseOidcResult(queryString);
          if (!result) {
            return es6_promise_1.Promise.reject("No OIDC response");
          }
          if (result.error) {
            return es6_promise_1.Promise.reject(result.error);
          }
          if (result.state !== request_state.state) {
            return es6_promise_1.Promise.reject("Invalid state");
          }
          if (request_state.oidc) {
            if (!result.id_token) {
              return es6_promise_1.Promise.reject("No identity token");
            }
            if (!request_state.nonce) {
              return es6_promise_1.Promise.reject("No nonce loaded");
            }
          }
          if (request_state.oauth) {
            if (!result.access_token) {
              return es6_promise_1.Promise.reject("No access token");
            }
            if (!result.token_type || result.token_type.toLowerCase() !== "bearer") {
              return es6_promise_1.Promise.reject("Invalid token type");
            }
            if (!result.expires_in) {
              return es6_promise_1.Promise.reject("No token expiration");
            }
          }
          var promise = es6_promise_1.Promise.resolve();
          if (request_state.oidc && request_state.oauth) {
            promise = this.validateIdTokenAndAccessTokenAsync(result.id_token, request_state.nonce, result.access_token);
          } else if (request_state.oidc) {
            promise = this.validateIdTokenAsync(result.id_token, request_state.nonce);
          }
          return promise.then(function(profile) {
            if (profile && settings.filter_protocol_claims) {
              var remove = ["nonce", "at_hash", "iat", "nbf", "exp", "aud", "iss"];
              remove.forEach(function(key) {
                delete profile[key];
              });
            }
            return {
              profile: profile,
              id_token: result.id_token,
              access_token: result.access_token,
              expires_in: result.expires_in,
              scope: result.scope,
              session_state: result.session_state
            };
          });
        };
        OidcClient.parseOidcResult = Utils_1.Utils.parseOidcResult;
        return OidcClient;
      }());
      exports_1("OidcClient", OidcClient);
    }
  };
});

System.register("src/index.ts", ["./OidcClient"], function(exports_1, context_1) {
  "use strict";
  var __moduleName = context_1 && context_1.id;
  var OidcClient_1;
  return {
    setters: [function(OidcClient_1_1) {
      OidcClient_1 = OidcClient_1_1;
    }],
    execute: function() {
      exports_1("OidcClient", OidcClient_1.OidcClient);
    }
  };
});
