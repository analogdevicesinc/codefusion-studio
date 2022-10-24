import e, { PureComponent as t, Component as n } from "react";
function o(e2, t2) {
  for (var n2 = 0; n2 < t2.length; n2++) {
    const o2 = t2[n2];
    if ("string" != typeof o2 && !Array.isArray(o2)) {
      for (const t3 in o2)
        if ("default" !== t3 && !(t3 in e2)) {
          const n3 = Object.getOwnPropertyDescriptor(o2, t3);
          n3 && Object.defineProperty(e2, t3, n3.get ? n3 : { enumerable: true, get: () => o2[t3] });
        }
    }
  }
  return Object.freeze(Object.defineProperty(e2, Symbol.toStringTag, { value: "Module" }));
}
var i = "undefined" != typeof globalThis ? globalThis : "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof self ? self : {};
function r(e2) {
  return e2 && e2.__esModule && Object.prototype.hasOwnProperty.call(e2, "default") ? e2.default : e2;
}
function s(e2) {
  if (e2.__esModule)
    return e2;
  var t2 = e2.default;
  if ("function" == typeof t2) {
    var n2 = function e3() {
      return this instanceof e3 ? Reflect.construct(t2, arguments, this.constructor) : t2.apply(this, arguments);
    };
    n2.prototype = t2.prototype;
  } else
    n2 = {};
  return Object.defineProperty(n2, "__esModule", { value: true }), Object.keys(e2).forEach(function(t3) {
    var o2 = Object.getOwnPropertyDescriptor(e2, t3);
    Object.defineProperty(n2, t3, o2.get ? o2 : { enumerable: true, get: function() {
      return e2[t3];
    } });
  }), n2;
}
var a, u, c, l, y = { exports: {} }, h = { exports: {} };
h.exports = function() {
  if (l)
    return c;
  l = 1;
  var e2 = u ? a : (u = 1, a = "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED");
  function t2() {
  }
  function n2() {
  }
  return n2.resetWarningCache = t2, c = function() {
    function o2(t3, n3, o3, i3, r3, s2) {
      if (s2 !== e2) {
        var a2 = new Error("Calling PropTypes validators directly is not supported by the `prop-types` package. Use PropTypes.checkPropTypes() to call them. Read more at http://fb.me/use-check-prop-types");
        throw a2.name = "Invariant Violation", a2;
      }
    }
    function i2() {
      return o2;
    }
    o2.isRequired = o2;
    var r2 = { array: o2, bigint: o2, bool: o2, func: o2, number: o2, object: o2, string: o2, symbol: o2, any: o2, arrayOf: i2, element: o2, elementType: o2, instanceOf: i2, node: o2, objectOf: i2, oneOf: i2, oneOfType: i2, shape: i2, exact: i2, checkPropTypes: n2, resetWarningCache: t2 };
    return r2.PropTypes = r2, r2;
  };
}()();
const f = r(h.exports);
function d(e2) {
  return d = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(e3) {
    return typeof e3;
  } : function(e3) {
    return e3 && "function" == typeof Symbol && e3.constructor === Symbol && e3 !== Symbol.prototype ? "symbol" : typeof e3;
  }, d(e2);
}
function p(e2, t2) {
  if (!(e2 instanceof t2))
    throw new TypeError("Cannot call a class as a function");
}
function g(e2, t2) {
  for (var n2 = 0; n2 < t2.length; n2++) {
    var o2 = t2[n2];
    o2.enumerable = o2.enumerable || false, o2.configurable = true, "value" in o2 && (o2.writable = true), Object.defineProperty(e2, o2.key, o2);
  }
}
function v(e2, t2, n2) {
  return t2 && g(e2.prototype, t2), n2 && g(e2, n2), e2;
}
function _(e2, t2, n2) {
  return t2 in e2 ? Object.defineProperty(e2, t2, { value: n2, enumerable: true, configurable: true, writable: true }) : e2[t2] = n2, e2;
}
function b() {
  return b = Object.assign || function(e2) {
    for (var t2 = 1; t2 < arguments.length; t2++) {
      var n2 = arguments[t2];
      for (var o2 in n2)
        Object.prototype.hasOwnProperty.call(n2, o2) && (e2[o2] = n2[o2]);
    }
    return e2;
  }, b.apply(this, arguments);
}
function m(e2) {
  for (var t2 = 1; t2 < arguments.length; t2++) {
    var n2 = null != arguments[t2] ? arguments[t2] : {}, o2 = Object.keys(n2);
    "function" == typeof Object.getOwnPropertySymbols && (o2 = o2.concat(Object.getOwnPropertySymbols(n2).filter(function(e3) {
      return Object.getOwnPropertyDescriptor(n2, e3).enumerable;
    }))), o2.forEach(function(t3) {
      _(e2, t3, n2[t3]);
    });
  }
  return e2;
}
function k(e2, t2) {
  if ("function" != typeof t2 && null !== t2)
    throw new TypeError("Super expression must either be null or a function");
  e2.prototype = Object.create(t2 && t2.prototype, { constructor: { value: e2, writable: true, configurable: true } }), t2 && E(e2, t2);
}
function K(e2) {
  return K = Object.setPrototypeOf ? Object.getPrototypeOf : function(e3) {
    return e3.__proto__ || Object.getPrototypeOf(e3);
  }, K(e2);
}
function E(e2, t2) {
  return E = Object.setPrototypeOf || function(e3, t3) {
    return e3.__proto__ = t3, e3;
  }, E(e2, t2);
}
function C(e2, t2, n2) {
  return C = function() {
    if ("undefined" == typeof Reflect || !Reflect.construct)
      return false;
    if (Reflect.construct.sham)
      return false;
    if ("function" == typeof Proxy)
      return true;
    try {
      return Date.prototype.toString.call(Reflect.construct(Date, [], function() {
      })), true;
    } catch (e3) {
      return false;
    }
  }() ? Reflect.construct : function(e3, t3, n3) {
    var o2 = [null];
    o2.push.apply(o2, t3);
    var i2 = new (Function.bind.apply(e3, o2))();
    return n3 && E(i2, n3.prototype), i2;
  }, C.apply(null, arguments);
}
function P(e2) {
  var t2 = "function" == typeof Map ? /* @__PURE__ */ new Map() : void 0;
  return P = function(e3) {
    if (null === e3 || (n2 = e3, -1 === Function.toString.call(n2).indexOf("[native code]")))
      return e3;
    var n2;
    if ("function" != typeof e3)
      throw new TypeError("Super expression must either be null or a function");
    if (void 0 !== t2) {
      if (t2.has(e3))
        return t2.get(e3);
      t2.set(e3, o2);
    }
    function o2() {
      return C(e3, arguments, K(this).constructor);
    }
    return o2.prototype = Object.create(e3.prototype, { constructor: { value: o2, enumerable: false, writable: true, configurable: true } }), E(o2, e3);
  }, P(e2);
}
function S(e2, t2) {
  if (null == e2)
    return {};
  var n2, o2, i2 = function(e3, t3) {
    if (null == e3)
      return {};
    var n3, o3, i3 = {}, r3 = Object.keys(e3);
    for (o3 = 0; o3 < r3.length; o3++)
      n3 = r3[o3], t3.indexOf(n3) >= 0 || (i3[n3] = e3[n3]);
    return i3;
  }(e2, t2);
  if (Object.getOwnPropertySymbols) {
    var r2 = Object.getOwnPropertySymbols(e2);
    for (o2 = 0; o2 < r2.length; o2++)
      n2 = r2[o2], t2.indexOf(n2) >= 0 || Object.prototype.propertyIsEnumerable.call(e2, n2) && (i2[n2] = e2[n2]);
  }
  return i2;
}
function w(e2) {
  if (void 0 === e2)
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  return e2;
}
function O(e2, t2) {
  return !t2 || "object" != typeof t2 && "function" != typeof t2 ? w(e2) : t2;
}
function I(e2, t2, n2) {
  return I = "undefined" != typeof Reflect && Reflect.get ? Reflect.get : function(e3, t3, n3) {
    var o2 = function(e4, t4) {
      for (; !Object.prototype.hasOwnProperty.call(e4, t4) && null !== (e4 = K(e4)); )
        ;
      return e4;
    }(e3, t3);
    if (o2) {
      var i2 = Object.getOwnPropertyDescriptor(o2, t3);
      return i2.get ? i2.get.call(n3) : i2.value;
    }
  }, I(e2, t2, n2 || e2);
}
function T(e2) {
  return function(e3) {
    if (Array.isArray(e3)) {
      for (var t2 = 0, n2 = new Array(e3.length); t2 < e3.length; t2++)
        n2[t2] = e3[t2];
      return n2;
    }
  }(e2) || function(e3) {
    if (Symbol.iterator in Object(e3) || "[object Arguments]" === Object.prototype.toString.call(e3))
      return Array.from(e3);
  }(e2) || function() {
    throw new TypeError("Invalid attempt to spread non-iterable instance");
  }();
}
function H(e2) {
  var t2 = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : null;
  return e2.reduce(function(e3, n2) {
    return e3[n2] = t2 || { value: n2 }, e3;
  }, {});
}
var j = { logLevel: "warn", defaultKeyEvent: "keydown", defaultComponent: "div", defaultTabIndex: "-1", ignoreTags: ["input", "select", "textarea"], enableHardSequences: false, ignoreKeymapAndHandlerChangesByDefault: true, ignoreEventsCondition: function(e2) {
  var t2 = e2.target;
  if (t2 && t2.tagName) {
    var n2 = t2.tagName.toLowerCase();
    return x.option("_ignoreTagsDict")[n2] || t2.isContentEditable;
  }
  return false;
}, ignoreRepeatedEventsWhenKeyHeldDown: true, simulateMissingKeyPressEvents: true, stopEventPropagationAfterHandling: true, stopEventPropagationAfterIgnoring: true, allowCombinationSubmatches: false, customKeyCodes: {} }, M = m({}, j);
M._ignoreTagsDict = H(M.ignoreTags, true);
var x = function() {
  function e2() {
    p(this, e2);
  }
  return v(e2, null, [{ key: "init", value: function(e3) {
    var t2 = this, n2 = e3.ignoreTags, o2 = e3.customKeyCodes;
    n2 && (e3._ignoreTagsDict = H(e3.ignoreTags)), o2 && (e3._customKeyNamesDict = H(Object.values(e3.customKeyCodes))), ["verbose", "debug", "info"].indexOf(e3.logLevel), Object.keys(e3).forEach(function(n3) {
      t2.set(n3, e3[n3]);
    });
  } }, { key: "set", value: function(e3, t2) {
    M[e3] = t2;
  } }, { key: "reset", value: function(e3) {
    M[e3] = j[e3];
  } }, { key: "option", value: function(e3) {
    return M[e3];
  } }]), e2;
}(), A = function() {
  function e2() {
    var t2 = this, n2 = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : "warn";
    p(this, e2), _(this, "verbose", this.noop), _(this, "debug", this.noop), _(this, "info", this.noop), _(this, "warn", this.noop), _(this, "error", this.noop), this.logLevel = this.constructor.levels[n2], this.logLevel >= this.constructor.levels.error && (this.error = console.error, this.logLevel >= this.constructor.levels.warn && (this.warn = console.warn, ["info", "debug", "verbose"].some(function(e3) {
      return !(t2.logLevel >= t2.constructor.levels[e3] && (t2[e3] = console.log, 1));
    })));
  }
  return v(e2, [{ key: "noop", value: function() {
  } }]), e2;
}();
_(A, "logIcons", ["📕", "📗", "📘", "📙"]), _(A, "componentIcons", ["🔺", "⭐️", "🔷", "🔶", "⬛️"]), _(A, "eventIcons", ["❤️", "💚", "💙", "💛", "💜", "🧡"]), _(A, "levels", { none: 0, error: 1, warn: 2, info: 3, debug: 4, verbose: 5 });
var L = { keydown: 0, keypress: 1, keyup: 2 }, D = { Shift: ["shiftKey"], Meta: ["metaKey"], Control: ["ctrlKey"], Alt: ["altKey"] }, F = { "`": ["~"], 1: ["!"], 2: ["@", '"'], 3: ["#", "£"], 4: ["$"], 5: ["%"], 6: ["^"], 7: ["&"], 8: ["*"], 9: ["("], 0: [")"], "-": ["_"], "=": ["plus"], ";": [":"], "'": ['"', "@"], ",": ["<"], ".": [">"], "/": ["?"], "\\": ["|"], "[": ["{"], "]": ["}"], "#": ["~"] };
function R(e2) {
  return F[e2] || [1 === e2.length ? e2.toUpperCase() : e2];
}
function q(e2, t2) {
  return e2.hasOwnProperty(t2);
}
function N(e2) {
  var t2 = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : {};
  return Object.keys(e2).reduce(function(n2, o2) {
    var i2 = e2[o2];
    return i2.forEach(function(e3) {
      q(n2, e3) || (n2[e3] = []), n2[e3].push(o2);
    }), t2.includeOriginal && (!q(n2, o2) && (n2[o2] = []), n2[o2] = [].concat(T(n2[o2]), T(i2))), n2;
  }, {});
}
var U = N(F);
function B(e2) {
  return U[e2] || [1 === e2.length ? e2.toLowerCase() : e2];
}
var G = N({}, { includeOriginal: true });
function z(e2) {
  return "string" == typeof e2;
}
var W = { tab: "Tab", capslock: "CapsLock", shift: "Shift", meta: "Meta", alt: "Alt", ctrl: "Control", space: " ", spacebar: " ", escape: "Escape", esc: "Escape", left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown", return: "Enter", del: "Delete", command: "Meta", option: "Alt", enter: "Enter", backspace: "Backspace", ins: "Insert", pageup: "PageUp", pagedown: "PageDown", end: "End", home: "Home", contextmenu: "ContextMenu", numlock: "Clear" }, J = { cmd: "Meta" };
function V(e2) {
  var t2 = e2.toLowerCase();
  return W[t2] || J[t2] || (e2.match(/^f\d+$/) ? e2.toUpperCase() : e2);
}
var $ = { 8: "Backspace", 9: "Tab", 12: "Clear", 13: "Enter", 16: "Shift", 17: "Control", 18: "Alt", 19: "Pause", 20: "CapsLock", 27: "Escape", 32: " ", 33: "PageUp", 34: "PageDown", 35: "End", 36: "Home", 37: "ArrowLeft", 38: "ArrowUp", 39: "ArrowRight", 40: "ArrowDown", 45: "Insert", 46: "Delete", 112: "F1", 113: "F2", 114: "F3", 115: "F4", 116: "F5", 117: "F6", 118: "F7", 119: "F8", 120: "F9", 121: "F10", 122: "F11", 123: "F12", 144: "NumLock", 145: "ScrollLock", 224: "Meta" }, Y = H(Object.values($), true);
function Q(e2) {
  return !!Y[e2];
}
function X(e2) {
  return Q(e2) || String.fromCharCode(e2.charCodeAt(0)) === e2 || function(e3) {
    return x.option("_customKeyNamesDict")[e3];
  }(e2);
}
var Z = function(e2) {
  function t2() {
    var e3, n2;
    p(this, t2);
    for (var o2 = arguments.length, i2 = Array(o2), r2 = 0; r2 < o2; r2++)
      i2[r2] = arguments[r2];
    return _(w(w(n2 = O(this, (e3 = K(t2)).call.apply(e3, [this].concat(i2))))), "name", "InvalidKeyNameError"), n2;
  }
  return k(t2, P(Error)), t2;
}();
function ee(e2) {
  return e2.sort().join("+");
}
var te = function() {
  function e2() {
    p(this, e2);
  }
  return v(e2, null, [{ key: "parse", value: function(e3) {
    var t2 = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : {}, n2 = function(e4) {
      return z(e4) ? e4.trim().replace(/\s+/g, " ") : e4;
    }(e3), o2 = n2.split(" ");
    try {
      var i2 = o2.slice(0, o2.length - 1), r2 = o2[o2.length - 1], s2 = i2.map(function(e4) {
        var n3 = ne(e4, t2);
        return ee(Object.keys(n3));
      }).join(" "), a2 = ne(r2, t2), u2 = { id: ee(Object.keys(a2)), keyDictionary: a2, keyEventType: t2.keyEventType, size: Object.keys(a2).length };
      return { sequence: { prefix: s2, size: i2.length + 1 }, combination: u2 };
    } catch (e4) {
      return { sequence: null, combination: null };
    }
  } }]), e2;
}();
function ne(e2) {
  var t2 = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : {};
  return e2.replace(/^\+|(\s|[^+]\+)\+/, "$1plus").split("+").reduce(function(e3, n2) {
    var o2 = V(n2);
    if (t2.ensureValidKeys && !X(o2))
      throw new Z();
    return e3[o2] = true, e3;
  }, {});
}
var oe = { "`": ["`"], 1: ["¡"], 2: ["™"], 3: ["£"], 4: ["¢"], 5: ["∞"], 6: ["§"], 7: ["¶"], 8: ["•"], 9: ["ª"], 0: ["º"], "-": ["–"], "=": ["≠"], a: ["å"], b: ["∫"], c: ["ç"], d: ["∂"], e: ["´"], f: ["ƒ"], g: ["©"], h: ["˙"], i: ["ˆ"], j: ["∆"], k: ["˚"], l: ["¬"], m: ["µ"], n: ["˜"], o: ["ø"], p: ["π"], q: ["œ"], r: ["®"], s: ["ß"], t: ["†"], u: ["¨"], v: ["√"], w: ["∑"], x: ["≈"], y: ["¥"], z: ["Ω"], "[": ["“"], "]": ["‘"], "\\": ["«"], "'": ["æ"], ";": ["…"], ",": ["≤"], ".": ["≥"], "/": ["÷"] }, ie = N(oe);
function re(e2) {
  return ie[e2] || [e2];
}
function se(e2) {
  return oe[e2] || [e2];
}
var ae = { "`": ["`"], 1: ["⁄"], 2: ["€"], 3: ["‹"], 4: ["›"], 5: ["ﬁ"], 6: ["ﬂ"], 7: ["‡"], 8: ["°"], 9: ["·"], 0: ["‚"], "-": ["—"], "=": ["±"], a: ["Å"], b: ["ı"], c: ["Ç"], d: ["Î"], e: ["´"], f: ["Ï"], g: ["˝"], h: ["Ó"], i: ["ˆ"], j: ["Ô"], k: [""], l: ["Ò"], m: ["Â"], n: ["˜"], o: ["Ø"], p: ["π"], q: ["Œ"], r: ["‰"], s: ["Í"], t: ["Î"], u: ["¨"], v: ["◊"], w: ["„"], x: ["˛"], y: ["Á"], z: ["¸"], "[": ["”"], "]": ["’"], "\\": ["»"], "'": ["Æ"], ";": ["Ú"], ",": ["¯"], ".": ["˘"] }, ue = N(ae);
function ce(e2) {
  return ue[e2] || B(e2);
}
function le(e2) {
  return ae[e2] || [e2];
}
var ye = function() {
  function e2() {
    p(this, e2);
  }
  return v(e2, null, [{ key: "serialize", value: function(e3) {
    var t2 = e3.Shift, n2 = e3.Alt, o2 = {};
    return Object.keys(e3).sort().forEach(function(e4) {
      var i2 = [];
      if (t2)
        if (n2) {
          var r2 = ce(e4), s2 = le(e4);
          i2 = [].concat(T(i2), [e4], T(r2), T(s2));
        } else {
          var a2 = B(e4), u2 = R(e4);
          i2 = [].concat(T(i2), [e4], T(a2), T(u2));
        }
      else if (n2) {
        var c2 = re(e4), l2 = se(e4);
        i2 = [].concat(T(i2), [e4], T(c2), T(l2));
      } else {
        i2.push(e4);
        var y2 = G[e4];
        y2 && (i2 = [].concat(T(i2), T(y2)));
      }
      var h2 = Object.keys(o2);
      0 < h2.length ? h2.forEach(function(e5) {
        i2.forEach(function(t3) {
          o2[e5 + "+".concat(t3)] = m({}, o2[e5], _({}, t3, true));
        }), delete o2[e5];
      }) : i2.forEach(function(e5) {
        o2[e5] = _({}, e5, true);
      });
    }), Object.values(o2).map(function(e4) {
      return Object.keys(e4).sort().join("+");
    });
  } }, { key: "isValidKeySerialization", value: function(e3) {
    return !!(0 < e3.length) && !!te.parse(e3, { ensureValidKeys: true }).combination;
  } }]), e2;
}(), he = 0, fe = 1;
function de(e2) {
  return void 0 === e2;
}
var pe = 0, ge = 1, ve = 2, _e = function() {
  function e2() {
    p(this, e2);
  }
  return v(e2, null, [{ key: "newRecord", value: function(e3, t2) {
    var n2 = [pe, pe, pe];
    if (!de(e3))
      for (var o2 = 0; o2 <= e3; o2++)
        n2[o2] = t2;
    return n2;
  } }, { key: "setBit", value: function(e3, t2, n2) {
    return e3[t2] = n2, e3;
  } }, { key: "clone", value: function(e3) {
    for (var t2 = this.newRecord(), n2 = 0; n2 < e3.length; n2++)
      t2[n2] = e3[n2];
    return t2;
  } }]), e2;
}();
function be(e2) {
  return !Array.isArray(e2) && "object" === d(e2) && null !== e2;
}
function me(e2) {
  return be(e2) ? 0 === Object.keys(e2).length : !e2 || 0 === e2.length;
}
function ke(e2) {
  return be(e2) ? Object.keys(e2).length : e2.length;
}
var Ke = function() {
  function e2() {
    var t2 = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {};
    p(this, e2), this._keys = t2, this._includesKeyUp = false, this._update();
  }
  return v(e2, [{ key: "getIds", value: function() {
    return this._ids;
  } }, { key: "getKeyAliases", value: function() {
    return this._keyAliases;
  } }, { key: "getNormalizedKeyName", value: function(e3) {
    if (this._keys[e3])
      return e3;
    var t2 = this._keyAliases[e3];
    return t2 || e3;
  } }, { key: "getNumberOfKeys", value: function() {
    return ke(this._keys);
  } }, { key: "any", value: function() {
    return 0 < Object.keys(this._getKeyStates()).length;
  } }, { key: "isEnding", value: function() {
    return this._includesKeyUp;
  } }, { key: "hasEnded", value: function() {
    return me(this.keysStillPressedDict());
  } }, { key: "addKey", value: function(e3, t2) {
    this._setKeyState(e3, [_e.newRecord(), _e.newRecord(L.keydown, t2)]);
  } }, { key: "setKeyState", value: function(e3, t2, n2) {
    var o2 = this._getKeyState(e3);
    if (this.isKeyIncluded(e3)) {
      var i2 = _e.clone(o2[1]), r2 = _e.clone(i2);
      _e.setBit(r2, t2, n2), this._setKeyState(e3, [i2, r2]);
    } else
      this.addKey(e3, n2);
    t2 === L.keyup && (this._includesKeyUp = true);
  } }, { key: "forEachKey", value: function(e3) {
    return Object.keys(this._keys).forEach(e3);
  } }, { key: "some", value: function(e3) {
    return Object.keys(this._keys).some(e3);
  } }, { key: "getKeyDictionary", value: function() {
    return H(Object.keys(this._getKeyStates()), true);
  } }, { key: "keysStillPressedDict", value: function() {
    var e3 = this;
    return Object.keys(this._keys).reduce(function(t2, n2) {
      return e3.isKeyStillPressed(n2) && (t2[n2] = e3._getKeyState(n2)), t2;
    }, {});
  } }, { key: "isKeyIncluded", value: function(e3) {
    return !!this._getKeyState(e3);
  } }, { key: "isKeyStillPressed", value: function(e3) {
    return this.isEventTriggered(e3, L.keypress) && !this.isKeyReleased(e3);
  } }, { key: "isKeyReleased", value: function(e3) {
    return this.isEventTriggered(e3, L.keyup);
  } }, { key: "isEventTriggered", value: function(e3, t2) {
    return this._getKeyStateType(e3, fe, t2);
  } }, { key: "wasEventPreviouslyTriggered", value: function(e3, t2) {
    return this._getKeyStateType(e3, he, t2);
  } }, { key: "isKeyPressSimulated", value: function(e3) {
    return this._isKeyEventSimulated(e3, L.keypress);
  } }, { key: "isKeyUpSimulated", value: function(e3) {
    return this._isKeyEventSimulated(e3, L.keyup);
  } }, { key: "describe", value: function() {
    return this.getIds()[0];
  } }, { key: "toJSON", value: function() {
    return { keys: this._getKeyStates(), ids: this.getIds(), keyAliases: this.getKeyAliases() };
  } }, { key: "_getKeyStateType", value: function(e3, t2, n2) {
    var o2 = this._getKeyState(e3);
    return o2 && o2[t2][n2];
  } }, { key: "_update", value: function() {
    this._ids = ye.serialize(this._keys), this._keyAliases = function(e3) {
      return Object.keys(e3).reduce(function(t2, n2) {
        return function(e4) {
          return G[e4] || [e4];
        }(n2).forEach(function(o2) {
          (function(e4) {
            if (e4.Shift)
              return e4.Alt ? [le, ce] : [R, B];
            if (e4.Alt)
              return [se, re];
            var t3 = function(e5) {
              return [e5];
            };
            return [t3, t3];
          })(e3).forEach(function(e4) {
            e4(o2).forEach(function(e5) {
              (e5 !== n2 || n2 !== o2) && (t2[e5] = n2);
            });
          });
        }), t2;
      }, {});
    }(this._keys);
  } }, { key: "_isKeyEventSimulated", value: function(e3, t2) {
    return this.isEventTriggered(e3, t2) === ve;
  } }, { key: "_getKeyStates", value: function() {
    return this._keys;
  } }, { key: "_getKeyState", value: function(e3) {
    var t2 = this._keys[e3];
    if (t2)
      return t2;
    var n2 = this._keyAliases[e3];
    return n2 ? this._keys[n2] : void 0;
  } }, { key: "_setKeyState", value: function(e3, t2) {
    var n2 = this.getNormalizedKeyName(e3);
    this._keys[n2] = t2, this._update();
  } }]), e2;
}();
var Ee = function() {
  function e2(t2) {
    var n2 = t2.maxLength, o2 = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : null;
    p(this, e2), this._records = [], this._maxLength = n2, o2 ? this._push(o2) : this._push(new Ke());
  }
  return v(e2, [{ key: "getMostRecentCombinations", value: function(e3) {
    return this._records.slice(-e3, -1);
  } }, { key: "any", value: function() {
    return this._records.some(function(e3) {
      return e3.any();
    });
  } }, { key: "getLength", value: function() {
    return this._records.length;
  } }, { key: "getCurrentCombination", value: function() {
    return this._records[this.getLength() - 1];
  } }, { key: "addKeyToCurrentCombination", value: function(e3, t2, n2) {
    this._ensureInitialKeyCombination(), this.getCurrentCombination().setKeyState(e3, t2, n2);
  } }, { key: "setMaxLength", value: function(e3) {
    this._maxLength = e3, this._trimHistory();
  } }, { key: "startNewKeyCombination", value: function(e3, t2) {
    this._ensureInitialKeyCombination();
    var n2 = new Ke(this.getCurrentCombination().keysStillPressedDict());
    n2.addKey(e3, t2), this._push(n2);
  } }, { key: "toJSON", value: function() {
    return this._records.map(function(e3) {
      return e3.toJSON();
    });
  } }, { key: "_ensureInitialKeyCombination", value: function() {
    0 === this.getLength() && this._push(new Ke());
  } }, { key: "_push", value: function(e3) {
    this._trimHistory(), this._records.push(e3);
  } }, { key: "_trimHistory", value: function() {
    for (; this.getLength() > this._maxLength; )
      this._shift();
  } }, { key: "_shift", value: function() {
    this._records.shift();
  } }]), e2;
}(), Ce = function() {
  function e2() {
    p(this, e2), this._registry = {};
  }
  return v(e2, [{ key: "get", value: function(e3) {
    return this._registry[e3];
  } }, { key: "set", value: function(e3, t2) {
    this._registry[e3] = t2;
  } }, { key: "remove", value: function(e3) {
    delete this._registry[e3];
  } }, { key: "toJSON", value: function() {
    return this._registry;
  } }]), e2;
}();
function Pe(e2) {
  return Array.isArray(e2) ? e2 : e2 ? [e2] : [];
}
var Se = function(e2) {
  function t2() {
    return p(this, t2), O(this, K(t2).apply(this, arguments));
  }
  return k(t2, Ce), v(t2, [{ key: "add", value: function(e3, n2) {
    I(K(t2.prototype), "set", this).call(this, e3, { childIds: [], parentId: null, keyMap: n2 });
  } }, { key: "update", value: function(e3, n2) {
    var o2 = I(K(t2.prototype), "get", this).call(this, e3);
    I(K(t2.prototype), "set", this).call(this, e3, m({}, o2, { keyMap: n2 }));
  } }, { key: "setParent", value: function(e3, t3) {
    this.get(e3).parentId = t3, this._addChildId(t3, e3);
  } }, { key: "remove", value: function(e3) {
    var n2 = this._getParentId(e3);
    this._removeChildId(n2, e3), I(K(t2.prototype), "remove", this).call(this, e3);
  } }, { key: "_getParentId", value: function(e3) {
    var t3 = this.get(e3);
    return t3 && t3.parentId;
  } }, { key: "_addChildId", value: function(e3, t3) {
    this.get(e3).childIds.push(t3);
  } }, { key: "_removeChildId", value: function(e3, t3) {
    var n2 = this.get(e3);
    n2 && (n2.childIds = function(e4) {
      var t4 = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : {}, n3 = H(Pe(1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : []));
      return Array.isArray(e4) ? e4.reduce(function(e5, o2) {
        return n3[o2] && (t4.stringifyFirst || n3[o2].value === o2) || e5.push(o2), e5;
      }, []) : be(e4) ? Object.keys(e4).reduce(function(t5, o2) {
        return n3[o2] || (t5[o2] = e4[o2]), t5;
      }, {}) : e4;
    }(n2.childIds, t3));
  } }]), t2;
}();
var we = function() {
  function e2(t2) {
    p(this, e2), this._list = t2, this._position = -1;
  }
  return v(e2, [{ key: "getPosition", value: function() {
    return this._position;
  } }, { key: "getComponent", value: function() {
    return this._list.getAtPosition(this.getPosition());
  } }, { key: "next", value: function() {
    return this.getPosition() + 1 < this._list.getLength() ? (this._position++, this.getComponent()) : null;
  } }]), e2;
}(), Oe = function() {
  function e2() {
    p(this, e2), this._list = [], this._idToIndex = {}, this._longestSequence = 1, this._longestSequenceComponentId = null, this._keyMapEventRecord = _e.newRecord();
  }
  return v(e2, [{ key: "getNewIterator", value: function() {
    return new we(this);
  } }, { key: "add", value: function(e3, t2, n2, o2) {
    if (this.containsId(e3))
      return this.update(e3, t2, n2, o2);
    var i2 = this._build(e3, t2, n2, o2);
    this._list.push(i2);
    var r2 = this._getLastIndex();
    return this._idToIndex[e3] = r2;
  } }, { key: "containsId", value: function(e3) {
    return !!this.get(e3);
  } }, { key: "get", value: function(e3) {
    return this.getAtPosition(this.getIndexById(e3));
  } }, { key: "getIndexById", value: function(e3) {
    return this._idToIndex[e3];
  } }, { key: "update", value: function(e3, t2, n2, o2) {
    var i2 = this._isUpdatingComponentWithLongestSequence(e3), r2 = this.getLongestSequence(), s2 = this._build(e3, t2, n2, o2);
    i2 && s2.sequenceLength !== r2 && (s2.sequenceLength > r2 ? this._longestSequence = s2.sequenceLength : this._recalculateLongestSequence()), this._list[this.getIndexById(e3)] = s2;
  } }, { key: "remove", value: function(e3) {
    var t2 = this._isUpdatingComponentWithLongestSequence(e3);
    this.removeAtPosition(this.getIndexById(e3)), t2 && this._recalculateLongestSequence();
  } }, { key: "any", value: function() {
    return 0 !== this.getLength();
  } }, { key: "isRoot", value: function(e3) {
    return this.getIndexById(e3) >= this.getLength() - 1;
  } }, { key: "getLongestSequence", value: function() {
    return this._longestSequence;
  } }, { key: "anyActionsForEventType", value: function(e3) {
    return !!this._keyMapEventRecord[e3];
  } }, { key: "getLength", value: function() {
    return this._list.length;
  } }, { key: "getAtPosition", value: function(e3) {
    return this._list[e3];
  } }, { key: "removeAtPosition", value: function(e3) {
    this._list = function(e4, t3) {
      return [].concat(T(e4.slice(0, t3)), T(e4.slice(t3 + 1)));
    }(this._list, e3);
    for (var t2 = e3; t2 < this.getLength(); )
      this._idToIndex[this.getAtPosition(t2).componentId] = t2, t2++;
  } }, { key: "toJSON", value: function() {
    return this._list;
  } }, { key: "_getLastIndex", value: function() {
    return this.getLength() - 1;
  } }, { key: "_build", value: function(e3, t2, n2, o2) {
    var i2 = this._applyHardSequences(t2, n2), r2 = i2.keyMap, s2 = i2.handlers;
    return { actions: this._buildActionDictionary(m({}, t2, r2), o2, e3), handlers: s2, componentId: e3, options: o2 };
  } }, { key: "_isUpdatingComponentWithLongestSequence", value: function(e3) {
    return e3 === this._getLongestSequenceComponentId();
  } }, { key: "_getLongestSequenceComponentId", value: function() {
    return this._longestSequenceComponentId;
  } }, { key: "_recalculateLongestSequence", value: function() {
    for (var e3 = this.getNewIterator(); e3.next(); ) {
      var t2 = e3.getComponent(), n2 = t2.longestSequence, o2 = t2.componentId;
      n2 > this.getLongestSequence() && (this._longestSequenceComponentId = o2, this._longestSequence = n2);
    }
  } }, { key: "_applyHardSequences", value: function(e3, t2) {
    return x.option("enableHardSequences") ? Object.keys(t2).reduce(function(n2, o2) {
      return !!!e3[o2] && ye.isValidKeySerialization(o2) && (n2.keyMap[o2] = o2), n2.handlers[o2] = t2[o2], n2;
    }, { keyMap: {}, handlers: {} }) : { keyMap: e3, handlers: t2 };
  } }, { key: "_buildActionDictionary", value: function(e3, t2, n2) {
    var o2 = this;
    return Object.keys(e3).reduce(function(i2, r2) {
      var s2 = e3[r2];
      return (be(s2) && q(s2, "sequences") ? Pe(s2.sequences) : Pe(s2)).forEach(function(e4) {
        var s3 = function(e5, t3) {
          if (be(e5)) {
            var n3 = e5.sequence, o3 = e5.action;
            return { keySequence: n3, keyEventType: de(o3) ? L[t3.defaultKeyEvent] : L[o3] };
          }
          return { keySequence: e5, keyEventType: L[t3.defaultKeyEvent] };
        }(e4, t2), a2 = s3.keySequence, u2 = s3.keyEventType;
        o2._addActionOptions(i2, n2, r2, a2, u2);
      }), i2;
    }, {});
  } }, { key: "_addActionOptions", value: function(e3, t2, n2, o2, i2) {
    var r2 = te.parse(o2, { keyEventType: i2 }), s2 = r2.sequence, a2 = r2.combination;
    s2.size > this.getLongestSequence() && (this._longestSequence = s2.size, this._longestSequenceComponentId = t2), this._keyMapEventRecord[i2] = ge, e3[n2] || (e3[n2] = []), e3[n2].push(m({ prefix: s2.prefix, actionName: n2, sequenceLength: s2.size }, a2));
  } }]), e2;
}();
function Ie(e2, t2) {
  return e2[e2.length - (t2 + 1)];
}
for (var Te = { Enter: true, Backspace: true, ArrowRight: true, ArrowLeft: true, ArrowUp: true, ArrowDown: true, CapsLock: true }, He = 1; 13 > He; He++)
  Te["F".concat(He)] = true;
function je(e2) {
  return 1 === e2.length || q(Te, e2);
}
var Me = function() {
  function e2() {
    p(this, e2), this._actionConfigs = {}, this._order = null;
  }
  return v(e2, [{ key: "addMatch", value: function(e3, t2) {
    if (this._includesMatcherForCombination(e3.id)) {
      var n2 = e3.keyEventType, o2 = e3.actionName, i2 = e3.id;
      this._addHandlerToActionConfig(i2, { keyEventType: n2, actionName: o2, handler: t2 });
    } else
      this._addNewActionConfig(e3, t2);
  } }, { key: "findMatch", value: function(e3, t2, n2) {
    this._order || this._setOrder();
    var o2 = true, i2 = false, r2 = void 0;
    try {
      for (var s2, a2 = this._order[Symbol.iterator](); !(o2 = (s2 = a2.next()).done); o2 = true) {
        var u2 = s2.value, c2 = this._actionConfigs[u2];
        if (this._matchesActionConfig(e3, t2, n2, c2))
          return c2;
      }
    } catch (e4) {
      i2 = true, r2 = e4;
    } finally {
      try {
        o2 || null == a2.return || a2.return();
      } finally {
        if (i2)
          throw r2;
      }
    }
    return null;
  } }, { key: "toJSON", value: function() {
    return { actionConfigs: this._actionConfigs, order: this._order };
  } }, { key: "_matchesActionConfig", value: function(e3, t2, n2, o2) {
    if (!function(e4, t3) {
      var n3 = ke(t3.keyDictionary);
      return x.option("allowCombinationSubmatches") || function(e5) {
        return !!e5.isKeyStillPressed("Meta") && e5.some(function(e6) {
          return je(e6);
        });
      }(e4) ? e4.getNumberOfKeys() >= n3 : e4.getNumberOfKeys() === n3;
    }(e3, o2))
      return false;
    if (!o2.events[n2])
      return false;
    var i2 = false;
    return Object.keys(o2.keyDictionary).every(function(o3) {
      return !!e3.isEventTriggered(o3, n2) && (t2 && t2 === e3.getNormalizedKeyName(o3) && (i2 = !e3.wasEventPreviouslyTriggered(o3, n2)), true);
    }) && i2;
  } }, { key: "_setOrder", value: function() {
    var e3 = Object.values(this._actionConfigs).reduce(function(e4, t2) {
      var n2 = t2.id, o2 = t2.size;
      return e4[o2] || (e4[o2] = []), e4[o2].push(n2), e4;
    }, {});
    this._order = Object.keys(e3).sort(function(e4, t2) {
      return t2 - e4;
    }).reduce(function(t2, n2) {
      return t2.concat(e3[n2]);
    }, []);
  } }, { key: "_addNewActionConfig", value: function(e3, t2) {
    var n2 = e3.prefix, o2 = e3.sequenceLength, i2 = e3.id, r2 = e3.keyDictionary, s2 = e3.size, a2 = e3.keyEventType, u2 = e3.actionName;
    this._setCombinationMatcher(i2, { prefix: n2, sequenceLength: o2, id: i2, keyDictionary: r2, size: s2, events: {} }), this._addHandlerToActionConfig(i2, { keyEventType: a2, actionName: u2, handler: t2 });
  } }, { key: "_addHandlerToActionConfig", value: function(e3, t2) {
    var n2 = t2.keyEventType, o2 = t2.actionName, i2 = t2.handler, r2 = this._getCombinationMatcher(e3);
    this._setCombinationMatcher(e3, m({}, r2, { events: m({}, r2.events, _({}, n2, { actionName: o2, handler: i2 })) }));
  } }, { key: "_setCombinationMatcher", value: function(e3, t2) {
    this._actionConfigs[e3] = t2;
  } }, { key: "_getCombinationMatcher", value: function(e3) {
    return this._actionConfigs[e3];
  } }, { key: "_includesMatcherForCombination", value: function(e3) {
    return !!this._getCombinationMatcher(e3);
  } }]), e2;
}();
var xe = function() {
  function e2() {
    p(this, e2), this._combinationMatchers = {}, this._eventRecord = _e.newRecord();
  }
  return v(e2, [{ key: "addMatch", value: function(e3, t2) {
    this._getOrCreateCombinationMatcher(e3.prefix).addMatch(e3, t2), _e.setBit(this._eventRecord, e3.keyEventType, ge), (!this._longestSequence || this._longestSequence < e3.sequenceLength) && (this._longestSequence = e3.sequenceLength);
  } }, { key: "findMatch", value: function(e3, t2, n2) {
    var o2 = this._findCombinationMatcher(e3);
    return o2 ? o2.findMatch(e3.getCurrentCombination(), e3.getCurrentCombination().getNormalizedKeyName(t2), n2) : null;
  } }, { key: "hasMatchesForEventType", value: function(e3) {
    return !!this._eventRecord[e3];
  } }, { key: "getLongestSequence", value: function() {
    return this._longestSequence;
  } }, { key: "toJSON", value: function() {
    var e3 = this;
    return Object.keys(this._combinationMatchers).reduce(function(t2, n2) {
      var o2 = e3._combinationMatchers[n2];
      return t2[n2] = o2.toJSON(), t2;
    }, {});
  } }, { key: "_getOrCreateCombinationMatcher", value: function(e3) {
    return this._combinationMatchers[e3] || (this._combinationMatchers[e3] = new Me()), this._combinationMatchers[e3];
  } }, { key: "_findCombinationMatcher", value: function(e3) {
    var t2 = e3.getMostRecentCombinations(this.getLongestSequence());
    if (0 === t2.length)
      return this._combinationMatchers[""];
    for (var n2 = t2.map(function(e4) {
      return e4.getIds();
    }), o2 = n2.map(function(e4) {
      return e4.length;
    }), i2 = Array(n2.length).fill(0), r2 = false; !r2; ) {
      var s2 = i2.map(function(e4, t3) {
        return n2[t3][e4];
      }), a2 = s2.join(" ");
      if (this._combinationMatchers[a2])
        return this._combinationMatchers[a2];
      for (var u2 = 0, c2 = true; c2 && u2 < i2.length; ) {
        var l2 = (Ie(i2, u2) + 1) % (Ie(o2, u2) || 1);
        i2[i2.length - (u2 + 1)] = l2, (c2 = 0 == l2) && u2++;
      }
      r2 = u2 === i2.length;
    }
  } }]), e2;
}(), Ae = function() {
  function e2(t2) {
    p(this, e2), this._keyMapMatchers = [], this._unmatchedHandlerStatus = [], this._handlersDictionary = {}, this._keySequencesDictionary = {};
    for (var n2 = t2.getNewIterator(); n2.next(); ) {
      var o2 = n2.getComponent().handlers;
      this._unmatchedHandlerStatus.push([Object.keys(o2).length, {}]), this._keyMapMatchers.push(new xe());
    }
    this._componentList = t2, this._componentListIterator = t2.getNewIterator();
  }
  return v(e2, [{ key: "getKeyHistoryMatcher", value: function(e3) {
    if (this._componentHasUnmatchedHandlers(e3))
      for (; this._componentListIterator.next(); )
        this._addHandlersFromComponent(), this._addActionsFromComponent();
    return this._getKeyHistoryMatcher(e3);
  } }, { key: "componentHasActionsBoundToEventType", value: function(e3, t2) {
    return this.getKeyHistoryMatcher(e3).hasMatchesForEventType(t2);
  } }, { key: "findMatchingKeySequenceInComponent", value: function(e3, t2, n2, o2) {
    return this.componentHasActionsBoundToEventType(e3, o2) ? this.getKeyHistoryMatcher(e3).findMatch(t2, n2, o2) : null;
  } }, { key: "_getKeyHistoryMatcher", value: function(e3) {
    return this._keyMapMatchers[e3];
  } }, { key: "_addActionsFromComponent", value: function() {
    var e3 = this, t2 = this._componentListIterator.getComponent().actions;
    Object.keys(t2).forEach(function(n2) {
      var o2 = e3._getHandlers(n2);
      if (o2) {
        var i2 = o2[0], r2 = e3._componentList.getAtPosition(i2).handlers[n2], s2 = e3._getKeyHistoryMatcher(i2);
        t2[n2].forEach(function(t3) {
          var n3 = [t3.prefix, t3.id].join(" ");
          e3._isClosestHandlerFound(n3, t3) || (s2.addMatch(t3, r2), e3._addKeySequence(n3, [i2, t3.keyEventType]));
        }), o2.forEach(function(t3) {
          var o3 = e3._getUnmatchedHandlerStatus(t3);
          o3[1][n2] || (o3[1][n2] = true, o3[0]--);
        });
      }
    });
  } }, { key: "_getHandlers", value: function(e3) {
    return this._handlersDictionary[e3];
  } }, { key: "_addHandlersFromComponent", value: function() {
    var e3 = this, t2 = this._componentListIterator.getComponent().handlers;
    Object.keys(t2).forEach(function(t3) {
      e3._addHandler(t3);
    });
  } }, { key: "_addHandler", value: function(e3) {
    this._handlersDictionary[e3] || (this._handlersDictionary[e3] = []), this._handlersDictionary[e3].push(this._componentListIterator.getPosition());
  } }, { key: "_addKeySequence", value: function(e3, t2) {
    this._keySequencesDictionary[e3] || (this._keySequencesDictionary[e3] = []), this._keySequencesDictionary[e3].push(t2);
  } }, { key: "_componentHasUnmatchedHandlers", value: function(e3) {
    return 0 < this._getUnmatchedHandlerStatus(e3)[0];
  } }, { key: "_getUnmatchedHandlerStatus", value: function(e3) {
    return this._unmatchedHandlerStatus[e3];
  } }, { key: "_isClosestHandlerFound", value: function(e3, t2) {
    return this._keySequencesDictionary[e3] && this._keySequencesDictionary[e3].some(function(e4) {
      return e4[1] === t2.keyEventType;
    });
  } }]), e2;
}();
function Le(e2, t2, n2) {
  return n2.forEach(function(n3) {
    q(e2, n3) && (t2[n3] = e2[n3]);
  }), t2;
}
function De(e2) {
  switch (parseInt(e2, 10)) {
    case 0:
      return "keydown";
    case 1:
      return "keypress";
    default:
      return "keyup";
  }
}
function Fe(e2) {
  return e2.simulated ? ve : ge;
}
var Re = ["sequence", "action"], qe = ["name", "description", "group"], Ne = function() {
  function e2() {
    var t2 = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {}, n2 = 1 < arguments.length ? arguments[1] : void 0;
    p(this, e2), this.logger = t2.logger || new A("warn"), this.componentId = -1, this.keyEventManager = n2, this._componentTree = new Se(), this.rootComponentId = null, this._reset(), this.resetKeyHistory();
  }
  return v(e2, [{ key: "_reset", value: function() {
    this.componentList = new Oe(), this._initHandlerResolutionState();
  } }, { key: "_newKeyHistory", value: function() {
    return new Ee({ maxLength: this.componentList.getLongestSequence() });
  } }, { key: "getKeyHistory", value: function() {
    return this._keyHistory || (this._keyHistory = this._newKeyHistory()), this._keyHistory;
  } }, { key: "_initHandlerResolutionState", value: function() {
    this._actionResolver = null;
  } }, { key: "resetKeyHistory", value: function() {
    var e3 = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {};
    this.keypressEventsToSimulate = [], this.keyupEventsToSimulate = [], this._keyHistory = this.getKeyHistory().any() && !e3.force ? new Ee({ maxLength: this.componentList.getLongestSequence() }, new Ke(this.getCurrentCombination().keysStillPressedDict())) : this._newKeyHistory();
  } }, { key: "getApplicationKeyMap", value: function() {
    return null === this.rootComponentId ? {} : this._buildApplicationKeyMap([this.rootComponentId], {});
  } }, { key: "_buildApplicationKeyMap", value: function(e3, t2) {
    var n2 = this;
    return e3.forEach(function(e4) {
      var o2 = n2._componentTree.get(e4), i2 = o2.childIds, r2 = o2.keyMap;
      r2 && Object.keys(r2).forEach(function(e5) {
        var o3 = r2[e5];
        t2[e5] = {}, be(o3) ? q(o3, "sequences") ? (Le(o3, t2[e5], qe), t2[e5].sequences = n2._createSequenceFromConfig(o3.sequences)) : (Le(o3, t2[e5], qe), t2[e5].sequences = [Le(o3, {}, Re)]) : t2[e5].sequences = n2._createSequenceFromConfig(o3);
      }), n2._buildApplicationKeyMap(i2, t2);
    }), t2;
  } }, { key: "_createSequenceFromConfig", value: function(e3) {
    return Pe(e3).map(function(e4) {
      return be(e4) ? Le(e4, {}, Re) : { sequence: e4 };
    });
  } }, { key: "registerKeyMap", value: function(e3) {
    return this.componentId += 1, this._componentTree.add(this.componentId, e3), this.componentId;
  } }, { key: "reregisterKeyMap", value: function(e3, t2) {
    this._componentTree.update(e3, t2);
  } }, { key: "registerComponentMount", value: function(e3, t2) {
    de(t2) ? this.rootComponentId = e3 : this._componentTree.setParent(e3, t2);
  } }, { key: "deregisterKeyMap", value: function(e3) {
    this._componentTree.remove(e3), e3 === this.rootComponentId && (this.rootComponentId = null);
  } }, { key: "_addComponent", value: function(e3) {
    var t2 = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : {}, n2 = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : {}, o2 = 3 < arguments.length ? arguments[3] : void 0;
    this.componentList.add(e3, t2, n2, o2), this.getKeyHistory().setMaxLength(this.componentList.getLongestSequence());
  } }, { key: "_allKeysAreReleased", value: function() {
    return this.getCurrentCombination().hasEnded();
  } }, { key: "getCurrentCombination", value: function() {
    return this.getKeyHistory().getCurrentCombination();
  } }, { key: "_shouldSimulate", value: function(e3, t2) {
    var n2 = function(e4) {
      return !Q(e4);
    }(t2), o2 = this.getCurrentCombination();
    return e3 === L.keypress ? !n2 || n2 && o2.isKeyStillPressed("Meta") : e3 === L.keyup && je(t2) && o2.isKeyReleased("Meta");
  } }, { key: "_cloneAndMergeEvent", value: function(e3, t2) {
    var n2 = Object.keys(D).reduce(function(t3, n3) {
      return t3[n3] = e3[n3], t3;
    }, {});
    return m({}, n2, t2);
  } }, { key: "_callClosestMatchingHandler", value: function(e3, t2, n2, o2, i2) {
    for (this._actionResolver || (this._actionResolver = new Ae(this.componentList)); i2 <= o2; ) {
      this._actionResolver.getKeyHistoryMatcher(i2);
      var r2 = this._actionResolver.findMatchingKeySequenceInComponent(i2, this.getKeyHistory(), t2, n2);
      if (this.getCurrentCombination(), r2) {
        var s2 = r2.events[n2];
        return x.option("allowCombinationSubmatches") && ye.serialize(r2.keyDictionary), s2.handler(e3), this._stopEventPropagationAfterHandlingIfEnabled(e3, i2), true;
      }
      this._actionResolver.componentHasActionsBoundToEventType(i2, n2), i2++;
    }
  } }, { key: "_stopEventPropagationAfterHandlingIfEnabled", value: function(e3, t2) {
    return !!x.option("stopEventPropagationAfterHandling") && (this._stopEventPropagation(e3, t2), true);
  } }, { key: "_stopEventPropagation", value: function() {
    throw new Error("_stopEventPropagation must be overridden by a subclass");
  } }, { key: "_checkForModifierFlagDiscrepancies", value: function(e3, t2, n2) {
    var o2 = this;
    Object.keys(D).forEach(function(i2) {
      if (t2 !== i2 || n2 !== L.keyup) {
        var r2 = o2.getCurrentCombination(), s2 = r2.isKeyStillPressed(i2);
        D[i2].forEach(function(t3) {
          false === e3[t3] && s2 && r2.setKeyState(i2, L.keyup, Fe(e3));
        });
      }
    });
  } }, { key: "_logPrefix", value: function() {
  } }]), e2;
}(), Ue = function() {
  function e2() {
    p(this, e2);
  }
  return v(e2, null, [{ key: "getId", value: function() {
    return de(this._id) && (this._id = 0), this._id;
  } }, { key: "incrementId", value: function() {
    this._id = this.getId() + 1;
  } }]), e2;
}();
var Be = { Esc: "Escape", Spacebar: " ", Left: "ArrowLeft", Up: "ArrowUp", Right: "ArrowRight", Down: "ArrowDown", Del: "Delete", Win: "OS", Menu: "ContextMenu", Apps: "ContextMenu", Scroll: "ScrollLock", MozPrintableKey: "Unidentified" };
function Ge(e2) {
  var t2 = function() {
    var t3 = x.option("customKeyCodes"), n2 = e2.keyCode || e2.charCode;
    return q(t3, n2) ? t3[n2] : e2.nativeEvent ? e2.key : function(e3) {
      if (e3.key) {
        var t4 = Be[e3.key] || e3.key;
        if ("Unidentified" !== t4)
          return t4;
      }
      if ("keypress" === e3.type) {
        var n3 = function(e4) {
          var t5, n4 = e4.keyCode;
          return "charCode" in e4 ? 0 === (t5 = e4.charCode) && 13 === n4 && (t5 = 13) : t5 = n4, 10 === t5 && (t5 = 13), 32 <= t5 || 13 === t5 ? t5 : 0;
        }(e3);
        return 13 === n3 ? "Enter" : String.fromCharCode(n3);
      }
      return "keydown" === e3.type || "keyup" === e3.type ? $[e3.keyCode] || "Unidentified" : "";
    }(e2);
  }();
  return "+" === t2 ? "plus" : t2;
}
function ze(e2) {
  return "Meta" === e2;
}
var We = 0, Je = 1, Ve = 2, $e = 4, Ye = function() {
  function e2(t2, n2) {
    var o2 = n2.logger, i2 = n2.logPrefix;
    p(this, e2), this._componentList = t2, this._previousPropagation = null, this.logger = o2, this._logPrefix = i2, this._reset();
  }
  return v(e2, [{ key: "_reset", value: function() {
    this._previousPosition = -1, this._position = -1, this._actionHandled = false, this._ignoreEvent = false, this._observeIgnoredEvents = false, this._stopping = false, this._componentId = null, this._key = null, this._type = null;
  } }, { key: "isFirstPropagationStep", value: function() {
    var e3 = this.getPreviousPosition();
    return -1 === e3 || e3 >= this._position;
  } }, { key: "isForKey", value: function(e3) {
    return this._key === e3;
  } }, { key: "isForEventType", value: function(e3) {
    return this._type === e3;
  } }, { key: "startNewPropagationStep", value: function(e3, t2, n2, o2) {
    return this._position = this._componentList.getIndexById(e3), this._componentId = e3, this.isFirstPropagationStep() && (Ue.incrementId(), this._key = t2.key, this._type = o2), !(t2.repeat && x.option("ignoreRepeatedEventsWhenKeyHeldDown") && (this.ignoreEvent(t2), 1));
  } }, { key: "finishPropagationStep", value: function() {
    this.isStopped() || this._componentList.isRoot(this._componentId) ? (this._previousPropagation = this._clone(), this._reset()) : this._previousPosition = this._position;
  } }, { key: "getPreviousPropagation", value: function() {
    return this._previousPropagation || (this._previousPropagation = this._clone({ copyState: false })), this._previousPropagation;
  } }, { key: "getPreviousPosition", value: function() {
    return this._previousPosition;
  } }, { key: "observeIgnoredEvents", value: function() {
    this._observeIgnoredEvents = true;
  } }, { key: "ignoreEvent", value: function(e3) {
    return this.setIgnoreEvent(true), !(!this.isIgnoringEvent() || !x.option("stopEventPropagationAfterIgnoring") || (this.stop(e3), this.finishPropagationStep(), 0));
  } }, { key: "setIgnoreEvent", value: function(e3) {
    this._ignoreEvent = e3;
  } }, { key: "isIgnoringEvent", value: function() {
    return !this._observeIgnoredEvents && this._ignoreEvent;
  } }, { key: "isStopped", value: function() {
    return this._stopping;
  } }, { key: "stop", value: function(e3) {
    return !this.isStopped() && (this._stopping = true, e3.simulated || e3.stopPropagation(), true);
  } }, { key: "isPendingPropagation", value: function() {
    var e3 = this.getPreviousPosition();
    return -1 !== e3 && e3 + 1 < this._position;
  } }, { key: "isHandled", value: function() {
    return this._actionHandled;
  } }, { key: "setHandled", value: function() {
    this._actionHandled = true;
  } }, { key: "_clone", value: function() {
    var t2 = (0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {}).copyState, n2 = new e2(this._componentList, { logger: this.logger, logPrefix: this._logPrefix });
    return (void 0 === t2 || t2) && Object.assign(n2, this), n2;
  } }]), e2;
}(), Qe = function(e2) {
  function t2() {
    var e3, n2 = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {}, o2 = 1 < arguments.length ? arguments[1] : void 0;
    return p(this, t2), (e3 = O(this, K(t2).call(this, n2, o2))).focusTreeId = 0, e3;
  }
  return k(t2, Ne), v(t2, [{ key: "_reset", value: function() {
    I(K(t2.prototype), "_reset", this).call(this), this.keypressEventsToSimulate = [], this.focusTreeId += 1, this.eventPropagator = new Ye(this.componentList, { logger: this.logger, logPrefix: this._logPrefix.bind(this) });
  } }, { key: "enableHotKeys", value: function(e3) {
    var t3 = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : {}, n2 = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : {}, o2 = 3 < arguments.length ? arguments[3] : void 0;
    if (this.resetOnNextFocus && (this._reset(), this.resetOnNextFocus = false), !this.componentList.containsId(e3))
      return this._addComponent(e3, t3, n2, o2), this.focusTreeId;
  } }, { key: "updateEnabledHotKeys", value: function(e3, t3) {
    var n2 = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : {}, o2 = 3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : {}, i2 = 4 < arguments.length ? arguments[4] : void 0;
    e3 === this.focusTreeId && this.componentList.containsId(t3) && (this.componentList.update(t3, n2, o2, i2), this.getKeyHistory().setMaxLength(this.componentList.getLongestSequence()), this._initHandlerResolutionState());
  } }, { key: "disableHotKeys", value: function(e3, t3) {
    return this.resetOnNextFocus || (this.resetOnNextFocus = true), this.eventPropagator.isPendingPropagation();
  } }, { key: "handleKeydown", value: function(e3, t3, n2) {
    var o2 = 3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : {}, i2 = Ge(e3);
    if (t3 !== this.focusTreeId)
      return this.eventPropagator.ignoreEvent(e3), true;
    if (this.eventPropagator.startNewPropagationStep(n2, e3, i2, L.keydown)) {
      if (this._howToHandleKeyEvent(e3, t3, n2, i2, o2, L.keydown) === $e) {
        var r2 = Fe(e3), s2 = this.getCurrentCombination();
        s2.isKeyIncluded(i2) || s2.isEnding() ? this._startAndLogNewKeyCombination(i2, t3, n2, r2) : this._addToAndLogCurrentKeyCombination(i2, L.keydown, t3, n2, r2), this._callHandlerIfActionNotHandled(e3, i2, L.keydown, n2, t3);
      }
      return this._simulateKeyPressForNonPrintableKeys(e3, i2, t3, n2, o2), this.eventPropagator.finishPropagationStep(), false;
    }
  } }, { key: "_howToHandleKeyEvent", value: function(e3, t3, n2, o2, i2, r2) {
    if (this.eventPropagator.isFirstPropagationStep()) {
      if (i2.ignoreEventsCondition(e3) && this.eventPropagator.ignoreEvent(e3))
        return this._eventIsToBeIgnored(e3, n2, o2, r2);
      this._checkForModifierFlagDiscrepancies(e3, o2, r2);
    } else if (this.eventPropagator.isIgnoringEvent())
      return this._eventIsToBeIgnored(e3, n2, o2, r2);
    return $e;
  } }, { key: "_eventIsToBeIgnored", value: function(e3, t3, n2, o2) {
    return Je;
  } }, { key: "handleKeyPress", value: function(e3, t3, n2, o2) {
    var i2 = Ge(e3), r2 = this.getCurrentCombination();
    if (r2.isKeyPressSimulated(i2))
      return this.eventPropagator.ignoreEvent(e3), true;
    if (this.eventPropagator.startNewPropagationStep(n2, e3, i2, L.keypress)) {
      var s2 = t3 !== this.focusTreeId, a2 = this._howToHandleKeyEvent(e3, t3, n2, i2, o2, L.keypress);
      return this.eventPropagator.isFirstPropagationStep(n2) && r2.isKeyIncluded(i2) && this._addToAndLogCurrentKeyCombination(i2, L.keypress, t3, n2, Fe(e3)), a2 === $e && this._callHandlerIfActionNotHandled(e3, i2, L.keypress, n2, t3), this.eventPropagator.finishPropagationStep(), s2;
    }
  } }, { key: "handleKeyUp", value: function(e3, t3, n2, o2) {
    var i2 = Ge(e3), r2 = this.getCurrentCombination();
    if (r2.isKeyUpSimulated(i2))
      return this.eventPropagator.ignoreEvent(e3), true;
    if (this.eventPropagator.startNewPropagationStep(n2, e3, i2, L.keyup)) {
      var s2 = t3 !== this.focusTreeId, a2 = this._howToHandleKeyEvent(e3, t3, n2, i2, o2, L.keyup);
      return this.eventPropagator.isFirstPropagationStep(n2) && r2.isKeyIncluded(i2) && this._addToAndLogCurrentKeyCombination(i2, L.keyup, t3, n2, Fe(e3)), a2 === $e && this._callHandlerIfActionNotHandled(e3, i2, L.keyup, n2, t3), this._simulateKeyUpEventsHiddenByCmd(e3, i2, t3, n2, o2), this.eventPropagator.finishPropagationStep(), s2;
    }
  } }, { key: "closeHangingKeyCombination", value: function(e3, t3) {
    var n2 = this.getCurrentCombination();
    n2.isKeyIncluded(e3) && !n2.isEventTriggered(e3, t3) && n2.setKeyState(e3, t3, ve);
  } }, { key: "_simulateKeyPressForNonPrintableKeys", value: function(e3, t3, n2, o2, i2) {
    this._handleEventSimulation("keypressEventsToSimulate", "simulatePendingKeyPressEvents", this._shouldSimulate(L.keypress, t3), { event: e3, key: t3, focusTreeId: n2, componentId: o2, options: i2 });
  } }, { key: "_simulateKeyUpEventsHiddenByCmd", value: function(e3, t3, n2, o2, i2) {
    var r2 = this;
    ze(t3) && this.getCurrentCombination().forEachKey(function(t4) {
      ze(t4) || r2._handleEventSimulation("keyupEventsToSimulate", "simulatePendingKeyUpEvents", r2._shouldSimulate(L.keyup, t4), { event: e3, key: t4, focusTreeId: n2, componentId: o2, options: i2 });
    });
  } }, { key: "_stopEventPropagation", value: function(e3, t3) {
    this.eventPropagator.stop(e3);
  } }, { key: "getEventPropagator", value: function() {
    return this.eventPropagator;
  } }, { key: "_startAndLogNewKeyCombination", value: function(e3, t3, n2, o2) {
    this.getKeyHistory().startNewKeyCombination(e3, o2);
  } }, { key: "_addToAndLogCurrentKeyCombination", value: function(e3, t3, n2, o2, i2) {
    this.getKeyHistory().addKeyToCurrentCombination(e3, t3, i2);
  } }, { key: "_handleEventSimulation", value: function(e3, t3, n2, o2) {
    var i2 = o2.event, r2 = o2.key, s2 = o2.focusTreeId, a2 = o2.componentId, u2 = o2.options;
    if (n2 && x.option("simulateMissingKeyPressEvents")) {
      var c2 = this._cloneAndMergeEvent(i2, { key: r2, simulated: true });
      this[e3].push({ event: c2, focusTreeId: s2, componentId: a2, options: u2 });
    }
    (this.componentList.isRoot(a2) || this.eventPropagator.isStopped()) && !this.keyEventManager.isGlobalListenersBound() && this[t3]();
  } }, { key: "simulatePendingKeyPressEvents", value: function() {
    this._simulatePendingKeyEvents("keypressEventsToSimulate", "handleKeyPress");
  } }, { key: "simulatePendingKeyUpEvents", value: function() {
    this._simulatePendingKeyEvents("keyupEventsToSimulate", "handleKeyUp");
  } }, { key: "_simulatePendingKeyEvents", value: function(e3, t3) {
    var n2 = this;
    0 < this[e3].length && Ue.incrementId(), this[e3].forEach(function(e4) {
      var o2 = e4.event, i2 = e4.focusTreeId, r2 = e4.componentId, s2 = e4.options;
      n2[t3](o2, i2, r2, s2);
    }), this[e3] = [];
  } }, { key: "_callHandlerIfActionNotHandled", value: function(e3, t3, n2, o2, i2) {
    if (this.getCurrentCombination().describe(), this.componentList.anyActionsForEventType(n2))
      if (this.eventPropagator.isHandled())
        ;
      else {
        var r2 = this.eventPropagator.getPreviousPosition(), s2 = this.componentList.getIndexById(o2);
        this._callClosestMatchingHandler(e3, t3, n2, s2, -1 === r2 ? 0 : r2) && this.eventPropagator.setHandled();
      }
  } }, { key: "_logPrefix", value: function(e3) {
    var t3 = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : {}, n2 = A.logIcons, o2 = A.eventIcons, i2 = A.componentIcons, r2 = "HotKeys (";
    if (false !== t3.focusTreeId) {
      var s2 = de(t3.focusTreeId) ? this.focusTreeId : t3.focusTreeId;
      r2 += "F".concat(s2).concat(n2[s2 % n2.length], "-");
    }
    if (false !== t3.eventId) {
      var a2 = de(t3.eventId) ? Ue.getId() : t3.eventId;
      r2 += "E".concat(a2).concat(o2[a2 % o2.length], "-");
    }
    r2 += "C".concat(e3).concat(i2[e3 % i2.length]);
    var u2 = this.componentList.getIndexById(e3);
    return de(u2) || (r2 += "-P".concat(u2).concat(i2[u2 % i2.length], ":")), "".concat(r2, ")");
  } }]), t2;
}();
function Xe(e2, t2) {
  var n2 = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : {};
  return Array.isArray(e2) || z(e2) ? n2.stringifyFirst ? !de(e2.find(function(e3) {
    return e3.toString() === t2.toString();
  })) : -1 !== e2.indexOf(t2) : be(e2) ? q(e2, t2) : n2.stringifyFirst ? e2.toString() === t2.toString() : e2 === t2;
}
function Ze(e2) {
  return e2.replace(/\b\w/g, function(e3) {
    return e3.toUpperCase();
  });
}
var et = function(e2) {
  function t2() {
    var e3, n2 = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {}, o2 = 1 < arguments.length ? arguments[1] : void 0;
    return p(this, t2), (e3 = O(this, K(t2).call(this, n2, o2))).listenersBound = false, e3.eventOptions = { ignoreEventsCondition: x.option("ignoreEventsCondition") }, e3.listeners = {}, e3;
  }
  return k(t2, Ne), v(t2, [{ key: "enableHotKeys", value: function(e3) {
    var t3 = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : {}, n2 = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : {}, o2 = 3 < arguments.length ? arguments[3] : void 0, i2 = 4 < arguments.length ? arguments[4] : void 0;
    this.eventOptions = i2, this._addComponent(e3, t3, n2, o2), this._updateDocumentHandlers(), this._initHandlerResolutionState();
  } }, { key: "updateEnabledHotKeys", value: function(e3) {
    var t3 = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : {}, n2 = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : {}, o2 = 3 < arguments.length ? arguments[3] : void 0, i2 = 4 < arguments.length ? arguments[4] : void 0;
    this.eventOptions = i2, this.componentList.update(e3, t3, n2, o2), this.getKeyHistory().setMaxLength(this.componentList.getLongestSequence()), this._updateDocumentHandlers(), this._initHandlerResolutionState();
  } }, { key: "disableHotKeys", value: function(e3) {
    this.componentList.remove(e3), this.getKeyHistory().setMaxLength(this.componentList.getLongestSequence()), this._updateDocumentHandlers(), this._initHandlerResolutionState();
  } }, { key: "_updateDocumentHandlers", value: function() {
    var e3 = this, t3 = this._listenersShouldBeBound();
    !this.listenersBound && t3 ? (Object.values(L).forEach(function(t4) {
      var n2 = De(t4);
      document["on".concat(n2)] = function(t5) {
        e3.keyEventManager["handleGlobal".concat(function(e4) {
          return "".concat(Ze(e4.slice(0, 3))).concat(Ze(e4.slice(3)));
        }(n2))](t5);
      };
    }), this.listenersBound = true) : this.listenersBound && !t3 && (Object.values(L).forEach(function(e4) {
      var t4 = De(e4);
      delete document["on".concat(t4)];
    }), this.listenersBound = false);
  } }, { key: "_listenersShouldBeBound", value: function() {
    return this.componentList.any() || this.listeners.keyCombination;
  } }, { key: "handleKeydown", value: function(e3) {
    var t3 = Ge(e3);
    if (e3.repeat && x.option("ignoreRepeatedEventsWhenKeyHeldDown"))
      return true;
    this._checkForModifierFlagDiscrepancies(e3, t3, L.keydown);
    var n2 = this._howReactAppRespondedTo(e3, t3, L.keydown);
    if (n2 !== We || !this.eventOptions.ignoreEventsCondition(e3)) {
      if (n2 !== Je) {
        var o2 = Fe(e3), i2 = this.getCurrentCombination();
        i2.isKeyIncluded(t3) || i2.isEnding() ? this._startAndLogNewKeyCombination(t3, o2) : this._addToAndLogCurrentKeyCombination(t3, L.keydown, o2);
      }
      Xe([Je, $e], n2) || this._callHandlerIfExists(e3, t3, L.keydown), this._simulateKeyPressForNonPrintableKeys(e3, t3);
    }
  } }, { key: "_howReactAppRespondedTo", value: function(e3, t3, n2) {
    var o2 = this.keyEventManager.reactAppHistoryWithEvent(t3, n2);
    return o2 === $e || o2 === Je || o2 === Ve || Ue.incrementId(), o2;
  } }, { key: "handleKeyPress", value: function(e3) {
    var t3 = Ge(e3);
    if (e3.repeat && x.option("ignoreRepeatedEventsWhenKeyHeldDown"))
      return true;
    var n2 = this.getCurrentCombination();
    if (n2.isKeyPressSimulated(t3))
      return true;
    var o2 = this._howReactAppRespondedTo(e3, t3, L.keypress);
    return n2.isKeyIncluded(t3) && this._addToAndLogCurrentKeyCombination(t3, L.keypress, Fe(e3)), o2 === We && (this.keyEventManager.closeHangingKeyCombination(t3, L.keypress), this.eventOptions.ignoreEventsCondition(e3)) ? void 0 : void (!Xe([Je, $e], o2) && this._callHandlerIfExists(e3, t3, L.keypress));
  } }, { key: "handleKeyUp", value: function(e3) {
    var t3 = Ge(e3), n2 = this.getCurrentCombination();
    if (n2.isKeyUpSimulated(t3))
      return true;
    var o2 = this._howReactAppRespondedTo(e3, t3, L.keyup);
    n2.isKeyIncluded(t3) && this._addToAndLogCurrentKeyCombination(t3, L.keyup, Fe(e3)), o2 === We ? (this.keyEventManager.closeHangingKeyCombination(t3, L.keyup), this.eventOptions.ignoreEventsCondition(e3) || !Xe([Je, $e], o2) && this._callHandlerIfExists(e3, t3, L.keyup)) : !Xe([Je, $e], o2) && this._callHandlerIfExists(e3, t3, L.keyup), this._simulateKeyUpEventsHiddenByCmd(e3, t3), this.listeners.keyCombination && this._allKeysAreReleased() && this.listeners.keyCombination({ keys: n2.getKeyDictionary(), id: n2.describe() });
  } }, { key: "_simulateKeyPressForNonPrintableKeys", value: function(e3, t3) {
    this.keyEventManager.simulatePendingKeyPressEvents(), this._handleEventSimulation("handleKeyPress", this._shouldSimulate(L.keypress, t3), { event: e3, key: t3 });
  } }, { key: "_simulateKeyUpEventsHiddenByCmd", value: function(e3, t3) {
    var n2 = this;
    ze(t3) && (this.keyEventManager.simulatePendingKeyUpEvents(), this.getCurrentCombination().forEachKey(function(t4) {
      ze(t4) || n2._handleEventSimulation("handleKeyUp", n2._shouldSimulate(L.keyup, t4), { event: e3, key: t4 });
    }));
  } }, { key: "_startAndLogNewKeyCombination", value: function(e3, t3) {
    this.getKeyHistory().startNewKeyCombination(e3, t3);
  } }, { key: "_addToAndLogCurrentKeyCombination", value: function(e3, t3, n2) {
    this.getKeyHistory().addKeyToCurrentCombination(e3, t3, n2);
  } }, { key: "_handleEventSimulation", value: function(e3, t3, n2) {
    var o2 = n2.event, i2 = n2.key;
    if (t3 && x.option("simulateMissingKeyPressEvents")) {
      var r2 = this._cloneAndMergeEvent(o2, { key: i2, simulated: true });
      this[e3](r2);
    }
  } }, { key: "_callHandlerIfExists", value: function(e3, t3, n2) {
    return this.getCurrentCombination().describe(), this.componentList.anyActionsForEventType(n2) ? void this._callClosestMatchingHandler(e3, t3, n2) : void 0;
  } }, { key: "_callClosestMatchingHandler", value: function(e3, n2, o2) {
    for (var i2 = this.componentList.getNewIterator(); i2.next(); )
      if (I(K(t2.prototype), "_callClosestMatchingHandler", this).call(this, e3, n2, o2, i2.getPosition(), 0))
        return;
  } }, { key: "_stopEventPropagation", value: function(e3, t3) {
    e3.simulated || e3.stopPropagation();
  } }, { key: "addKeyCombinationListener", value: function(e3) {
    var t3 = this, n2 = function() {
      delete t3.listeners.keyCombination;
    };
    return this.listeners.keyCombination = function(t4) {
      e3(t4), n2();
    }, this._updateDocumentHandlers(), n2;
  } }, { key: "_logPrefix", value: function(e3) {
    var t3 = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : {}, n2 = A.eventIcons, o2 = A.componentIcons, i2 = "HotKeys (GLOBAL";
    if (false !== t3.eventId) {
      var r2 = de(t3.eventId) ? Ue.getId() : t3.eventId;
      i2 = "".concat(i2, "-E").concat(r2).concat(n2[r2 % n2.length]);
    }
    return de(e3) ? "".concat(i2, "):") : "".concat(i2, "-C").concat(e3).concat(o2[e3 % o2.length], "):");
  } }]), t2;
}();
function tt(e2) {
  return !de(e2);
}
var nt = function() {
  function e2() {
    var t2 = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {};
    p(this, e2), this.logger = t2.logger || new A(x.option("logLevel")), this._focusOnlyEventStrategy = new Qe({ configuration: t2, logger: this.logger }, this), this._globalEventStrategy = new et({ configuration: t2, logger: this.logger }, this), this.mountedComponentsCount = 0;
  }
  return v(e2, null, [{ key: "getInstance", value: function() {
    var t2 = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {};
    return this.instance || (this.instance = new e2(t2)), this.instance;
  } }, { key: "clear", value: function() {
    delete this.instance;
  } }]), v(e2, [{ key: "getApplicationKeyMap", value: function() {
    return Object.assign(this._globalEventStrategy.getApplicationKeyMap(), this._focusOnlyEventStrategy.getApplicationKeyMap());
  } }, { key: "registerKeyMap", value: function() {
    var e3 = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {};
    return this._focusOnlyEventStrategy.registerKeyMap(e3);
  } }, { key: "reregisterKeyMap", value: function(e3) {
    var t2 = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : {};
    this._focusOnlyEventStrategy.reregisterKeyMap(e3, t2);
  } }, { key: "deregisterKeyMap", value: function(e3) {
    this._focusOnlyEventStrategy.deregisterKeyMap(e3);
  } }, { key: "registerComponentMount", value: function(e3, t2) {
    return this._incrementComponentCount(), this._focusOnlyEventStrategy.registerComponentMount(e3, t2);
  } }, { key: "registerComponentUnmount", value: function() {
    this._decrementComponentCount();
  } }, { key: "_incrementComponentCount", value: function() {
    var e3 = this, t2 = this.mountedComponentsCount;
    this.mountedComponentsCount += 1, 0 === t2 && 1 === this.mountedComponentsCount && (window.onblur = function() {
      return e3._clearKeyHistory();
    });
  } }, { key: "_decrementComponentCount", value: function() {
    var e3 = this.mountedComponentsCount;
    this.mountedComponentsCount -= 1, 1 === e3 && 0 === this.mountedComponentsCount && delete window.onblur;
  } }, { key: "_clearKeyHistory", value: function() {
    this._focusOnlyEventStrategy.resetKeyHistory({ force: true }), this._globalEventStrategy.resetKeyHistory({ force: true });
  } }, { key: "registerGlobalKeyMap", value: function() {
    var e3 = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {};
    return this._globalEventStrategy.registerKeyMap(e3);
  } }, { key: "registerGlobalComponentUnmount", value: function() {
    this._decrementComponentCount();
  } }, { key: "registerGlobalComponentMount", value: function(e3, t2) {
    return this._incrementComponentCount(), this._globalEventStrategy.registerComponentMount(e3, t2);
  } }, { key: "reregisterGlobalKeyMap", value: function(e3, t2) {
    this._globalEventStrategy.reregisterKeyMap(e3, t2);
  } }, { key: "deregisterGlobalKeyMap", value: function(e3) {
    this._globalEventStrategy.deregisterKeyMap(e3);
  } }, { key: "addKeyCombinationListener", value: function(e3) {
    return this._globalEventStrategy.addKeyCombinationListener(e3);
  } }, { key: "enableHotKeys", value: function(e3) {
    var t2 = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : {}, n2 = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : {}, o2 = 3 < arguments.length ? arguments[3] : void 0;
    return this._focusOnlyEventStrategy.enableHotKeys(e3, t2, n2, o2);
  } }, { key: "updateEnabledHotKeys", value: function(e3, t2) {
    var n2 = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : {}, o2 = 3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : {}, i2 = 4 < arguments.length ? arguments[4] : void 0;
    return this._focusOnlyEventStrategy.updateEnabledHotKeys(e3, t2, n2, o2, i2);
  } }, { key: "disableHotKeys", value: function(e3, t2) {
    return this._focusOnlyEventStrategy.disableHotKeys(e3, t2);
  } }, { key: "handleKeydown", value: function(e3, t2, n2, o2) {
    if (tt(t2))
      return this._focusOnlyEventStrategy.handleKeydown(e3, t2, n2, o2);
  } }, { key: "handleKeyPress", value: function(e3, t2, n2, o2) {
    if (tt(t2))
      return this._focusOnlyEventStrategy.handleKeyPress(e3, t2, n2, o2);
  } }, { key: "handleKeyUp", value: function(e3, t2, n2, o2) {
    if (tt(t2))
      return this._focusOnlyEventStrategy.handleKeyUp(e3, t2, n2, o2);
  } }, { key: "enableGlobalHotKeys", value: function(e3) {
    var t2 = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : {}, n2 = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : {}, o2 = 3 < arguments.length ? arguments[3] : void 0, i2 = 4 < arguments.length ? arguments[4] : void 0;
    return this._globalEventStrategy.enableHotKeys(e3, t2, n2, o2, i2);
  } }, { key: "updateEnabledGlobalHotKeys", value: function(e3) {
    var t2 = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : {}, n2 = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : {}, o2 = 3 < arguments.length ? arguments[3] : void 0, i2 = 4 < arguments.length ? arguments[4] : void 0;
    return this._globalEventStrategy.updateEnabledHotKeys(e3, t2, n2, o2, i2);
  } }, { key: "disableGlobalHotKeys", value: function(e3) {
    return this._globalEventStrategy.disableHotKeys(e3);
  } }, { key: "handleGlobalKeyDown", value: function(e3) {
    return this._globalEventStrategy.handleKeydown(e3);
  } }, { key: "handleGlobalKeyPress", value: function(e3) {
    return this._globalEventStrategy.handleKeyPress(e3);
  } }, { key: "handleGlobalKeyUp", value: function(e3) {
    return this._globalEventStrategy.handleKeyUp(e3);
  } }, { key: "ignoreEvent", value: function(e3) {
    this._focusOnlyEventStrategy.getEventPropagator().ignoreEvent(e3);
  } }, { key: "observeIgnoredEvents", value: function(e3) {
    this._focusOnlyEventStrategy.getEventPropagator().observeIgnoredEvents(e3);
  } }, { key: "closeHangingKeyCombination", value: function(e3, t2) {
    this._focusOnlyEventStrategy.closeHangingKeyCombination(e3, t2);
  } }, { key: "reactAppHistoryWithEvent", value: function(e3, t2) {
    var n2 = this._focusOnlyEventStrategy.eventPropagator.getPreviousPropagation();
    return n2.isForKey(e3) && n2.isForEventType(t2) ? n2.isHandled() ? $e : n2.isIgnoringEvent() ? Je : Ve : We;
  } }, { key: "simulatePendingKeyPressEvents", value: function() {
    this._focusOnlyEventStrategy.simulatePendingKeyPressEvents();
  } }, { key: "simulatePendingKeyUpEvents", value: function() {
    this._focusOnlyEventStrategy.simulatePendingKeyUpEvents();
  } }, { key: "isGlobalListenersBound", value: function() {
    return this._globalEventStrategy.listenersBound;
  } }]), e2;
}();
function ot(t2, n2) {
  var o2 = n2.deprecatedAPI, i2 = o2.contextTypes, r2 = o2.childContextTypes, s2 = n2.newAPI.contextType;
  if (void 0 === e.createContext)
    t2.contextTypes = i2, t2.childContextTypes = r2, t2.prototype.getChildContext = function() {
      return this._childContext;
    };
  else {
    var a2 = e.createContext(s2);
    t2.contextType = a2, t2.prototype._originalRender = t2.prototype.render, t2.prototype.render = function() {
      var t3 = this._originalRender();
      return t3 ? e.createElement(a2.Provider, { value: this._childContext }, t3) : null;
    };
  }
  return t2;
}
function it(n2) {
  function o2(e2, t2) {
    return m({}, s2[e2] || {}, t2[e2] || {});
  }
  function i2(e2) {
    return o2("handlers", e2);
  }
  function r2(e2) {
    return o2("keyMap", e2);
  }
  var s2 = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : {}, a2 = function(o3) {
    function s3(e2) {
      var t2;
      return p(this, s3), (t2 = O(this, K(s3).call(this, e2)))._handleFocus = t2._handleFocus.bind(w(w(t2))), t2._handleBlur = t2._handleBlur.bind(w(w(t2))), t2._handleKeyDown = t2._handleKeyDown.bind(w(w(t2))), t2._handleKeyPress = t2._handleKeyPress.bind(w(w(t2))), t2._handleKeyUp = t2._handleKeyUp.bind(w(w(t2))), t2._componentIsFocused = t2._componentIsFocused.bind(w(w(t2))), t2._id = nt.getInstance().registerKeyMap(e2.keyMap), t2._childContext = { hotKeysParentId: t2._id }, t2;
    }
    return k(s3, t), v(s3, [{ key: "render", value: function() {
      var t2 = this.props;
      t2.keyMap, t2.handlers, t2.allowChanges, t2.root;
      var o4 = S(t2, ["keyMap", "handlers", "allowChanges", "root"]), i3 = { onFocus: this._wrapFunction("onFocus", this._handleFocus), onBlur: this._wrapFunction("onBlur", this._handleBlur), tabIndex: x.option("defaultTabIndex") };
      return this._shouldBindKeyListeners() && (i3.onKeyDown = this._handleKeyDown, i3.onKeyPress = this._handleKeyPress, i3.onKeyUp = this._handleKeyUp), e.createElement(n2, b({ hotKeys: i3 }, o4));
    } }, { key: "_shouldBindKeyListeners", value: function() {
      var e2 = r2(this.props);
      return !me(e2) || this.props.root || x.option("enableHardSequences") && this._handlersIncludeHardSequences(e2, i2(this.props));
    } }, { key: "_handlersIncludeHardSequences", value: function(e2, t2) {
      return Object.keys(t2).some(function(t3) {
        return !e2[t3] && ye.isValidKeySerialization(t3);
      });
    } }, { key: "_wrapFunction", value: function(e2, t2) {
      var n3 = this;
      return "function" == typeof this.props[e2] ? function(o4) {
        n3.props[e2](o4), t2(o4);
      } : t2;
    } }, { key: "_focusTreeIdsPush", value: function(e2) {
      this._focusTreeIds || (this._focusTreeIds = []), this._focusTreeIds.push(e2);
    } }, { key: "_focusTreeIdsShift", value: function() {
      this._focusTreeIds && this._focusTreeIds.shift();
    } }, { key: "_getFocusTreeId", value: function() {
      if (this._focusTreeIds)
        return this._focusTreeIds[0];
    } }, { key: "componentDidUpdate", value: function() {
      var e2 = nt.getInstance();
      if (e2.reregisterKeyMap(this._id, this.props.keyMap), this._componentIsFocused() && (this.props.allowChanges || !x.option("ignoreKeymapAndHandlerChangesByDefault"))) {
        var t2 = this.props, n3 = t2.keyMap, o4 = t2.handlers;
        e2.updateEnabledHotKeys(this._getFocusTreeId(), this._id, n3, o4, this._getComponentOptions());
      }
    } }, { key: "_componentIsFocused", value: function() {
      return true === this._focused;
    } }, { key: "componentDidMount", value: function() {
      var e2 = nt.getInstance(), t2 = this.context.hotKeysParentId;
      e2.registerComponentMount(this._id, t2);
    } }, { key: "_handleFocus", value: function() {
      var e2;
      this.props.onFocus && (e2 = this.props).onFocus.apply(e2, arguments);
      var t2 = nt.getInstance().enableHotKeys(this._id, r2(this.props), i2(this.props), this._getComponentOptions());
      de(t2) || this._focusTreeIdsPush(t2), this._focused = true;
    } }, { key: "componentWillUnmount", value: function() {
      var e2 = nt.getInstance();
      e2.deregisterKeyMap(this._id), e2.registerComponentUnmount(), this._handleBlur();
    } }, { key: "_handleBlur", value: function() {
      var e2;
      this.props.onBlur && (e2 = this.props).onBlur.apply(e2, arguments);
      nt.getInstance().disableHotKeys(this._getFocusTreeId(), this._id) || this._focusTreeIdsShift(), this._focused = false;
    } }, { key: "_handleKeyDown", value: function(e2) {
      nt.getInstance().handleKeydown(e2, this._getFocusTreeId(), this._id, this._getEventOptions()) && this._focusTreeIdsShift();
    } }, { key: "_handleKeyPress", value: function(e2) {
      nt.getInstance().handleKeyPress(e2, this._getFocusTreeId(), this._id, this._getEventOptions()) && this._focusTreeIdsShift();
    } }, { key: "_handleKeyUp", value: function(e2) {
      nt.getInstance().handleKeyUp(e2, this._getFocusTreeId(), this._id, this._getEventOptions()) && this._focusTreeIdsShift();
    } }, { key: "_getComponentOptions", value: function() {
      return { defaultKeyEvent: x.option("defaultKeyEvent") };
    } }, { key: "_getEventOptions", value: function() {
      return { ignoreEventsCondition: x.option("ignoreEventsCondition") };
    } }]), s3;
  }();
  return _(a2, "propTypes", { keyMap: f.object, handlers: f.object, onFocus: f.func, onBlur: f.func, allowChanges: f.bool, root: f.bool }), ot(a2, { deprecatedAPI: { contextTypes: { hotKeysParentId: f.number }, childContextTypes: { hotKeysParentId: f.number } }, newAPI: { contextType: { hotKeysParentId: void 0 } } });
}
var rt = it(function(t2) {
  function o2() {
    return p(this, o2), O(this, K(o2).apply(this, arguments));
  }
  return k(o2, n), v(o2, [{ key: "render", value: function() {
    var t3 = this.props, n2 = t3.hotKeys, o3 = t3.innerRef, i2 = t3.component, r2 = S(t3, ["hotKeys", "innerRef", "component"]), s2 = i2 || x.option("defaultComponent");
    return e.createElement(s2, m({}, n2, { ref: o3 }, r2));
  } }]), o2;
}());
rt.propTypes = { innerRef: f.oneOfType([f.object, f.func]) };
var st = function(e2) {
  function t2(e3) {
    var n2;
    return p(this, t2), (n2 = O(this, K(t2).call(this, e3)))._id = nt.getInstance().registerGlobalKeyMap(e3.keyMap), n2._childContext = { globalHotKeysParentId: n2._id }, n2;
  }
  return k(t2, n), v(t2, [{ key: "render", value: function() {
    return this.props.children || null;
  } }, { key: "componentDidUpdate", value: function() {
    var e3 = nt.getInstance();
    if (e3.reregisterGlobalKeyMap(this._id, this.props.keyMap), this.props.allowChanges || !x.option("ignoreKeymapAndHandlerChangesByDefault")) {
      var t3 = this.props, n2 = t3.keyMap, o2 = t3.handlers;
      e3.updateEnabledGlobalHotKeys(this._id, n2, o2, this._getComponentOptions(), this._getEventOptions());
    }
  } }, { key: "componentDidMount", value: function() {
    var e3 = this.props, t3 = e3.keyMap, n2 = e3.handlers, o2 = this.context.globalHotKeysParentId, i2 = nt.getInstance();
    i2.registerGlobalComponentMount(this._id, o2), i2.enableGlobalHotKeys(this._id, t3, n2, this._getComponentOptions(), this._getEventOptions());
  } }, { key: "componentWillUnmount", value: function() {
    var e3 = nt.getInstance();
    e3.deregisterGlobalKeyMap(this._id), e3.disableGlobalHotKeys(this._id), e3.registerGlobalComponentUnmount();
  } }, { key: "_getComponentOptions", value: function() {
    return { defaultKeyEvent: x.option("defaultKeyEvent") };
  } }, { key: "_getEventOptions", value: function() {
    return { ignoreEventsCondition: x.option("ignoreEventsCondition") };
  } }]), t2;
}();
_(st, "propTypes", { keyMap: f.object, handlers: f.object, allowChanges: f.bool });
var at = ot(st, { deprecatedAPI: { contextTypes: { globalHotKeysParentId: f.number }, childContextTypes: { globalHotKeysParentId: f.number } }, newAPI: { contextType: { globalHotKeysParentId: void 0 } } });
function ut(n2) {
  var o2, i2, r2 = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : { only: [], except: [] }, s2 = 2 < arguments.length ? arguments[2] : void 0;
  return i2 = o2 = function(o3) {
    function i3(e2) {
      var t2;
      return p(this, i3), (t2 = O(this, K(i3).call(this, e2)))._handleKeyEvent = t2._handleKeyEvent.bind(w(w(t2))), t2._reloadDictionaries = t2._reloadDictionaries.bind(w(w(t2))), t2;
    }
    return k(i3, t), v(i3, [{ key: "render", value: function() {
      var t2 = this.props;
      t2.only, t2.except;
      var o4 = S(t2, ["only", "except"]), i4 = { onKeyDown: this._handleKeyEvent, onKeyPress: this._handleKeyEvent, onKeyUp: this._handleKeyEvent, onFocus: this._reloadDictionaries };
      return e.createElement(n2, b({ hotKeys: i4 }, o4));
    } }, { key: "_reloadDictionaries", value: function() {
      var e2 = this.props, t2 = e2.only, n3 = e2.except;
      this._onlyDict = ct(t2), this._exceptDict = ct(n3);
    } }, { key: "_shouldIgnoreEvent", value: function(e2) {
      var t2 = e2.key;
      return me(this._onlyDict) ? !!me(this._exceptDict) || !q(this._exceptDict, t2) : me(this._exceptDict) ? q(this._onlyDict, t2) : q(this._onlyDict, t2) && !q(this._exceptDict, t2);
    } }, { key: "_handleKeyEvent", value: function(e2) {
      this._shouldIgnoreEvent(e2) && nt.getInstance()[s2](e2);
    } }]), i3;
  }(), _(o2, "propTypes", { only: f.oneOfType([f.string, f.arrayOf(f.string)]), except: f.oneOfType([f.string, f.arrayOf(f.string)]) }), _(o2, "defaultProps", r2), i2;
}
function ct(e2) {
  return Pe(e2).reduce(function(e3, t2) {
    var n2 = V(t2);
    if (!X(n2))
      throw new Z(t2);
    return [le, ce, R, B, se, re].forEach(function(t3) {
      e3[t3(n2)] = true;
    }), e3;
  }, {});
}
var lt = ut(function(t2) {
  function o2() {
    return p(this, o2), O(this, K(o2).apply(this, arguments));
  }
  return k(o2, n), v(o2, [{ key: "render", value: function() {
    var t3 = this.props, n2 = t3.hotKeys, o3 = S(t3, ["hotKeys"]), i2 = o3.component || x.option("defaultComponent");
    return e.createElement(i2, m({}, n2, o3));
  } }]), o2;
}(), {}, "ignoreEvent"), yt = ut(function(t2) {
  function o2() {
    return p(this, o2), O(this, K(o2).apply(this, arguments));
  }
  return k(o2, n), v(o2, [{ key: "render", value: function() {
    var t3 = this.props, n2 = t3.hotKeys, o3 = S(t3, ["hotKeys"]), i2 = o3.component || x.option("defaultComponent");
    return e.createElement(i2, m({}, n2, o3));
  } }]), o2;
}(), {}, "observeIgnoredEvents");
const ht = s(Object.freeze(Object.defineProperty({ __proto__: null, GlobalHotKeys: at, HotKeys: rt, IgnoreKeys: lt, ObserveKeys: yt, configure: function() {
  var e2 = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : {};
  x.init(e2);
}, getApplicationKeyMap: function() {
  return nt.getInstance().getApplicationKeyMap();
}, recordKeyCombination: function(e2) {
  return nt.getInstance().addKeyCombinationListener(e2);
}, withHotKeys: it, withIgnoreKeys: function(e2) {
  return ut(e2, 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : { only: [], except: [] }, "ignoreEvent");
}, withObserveKeys: function(e2) {
  return ut(e2, 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : { only: [], except: [] }, "observeIgnoredEvents");
} }, Symbol.toStringTag, { value: "Module" })));
function ft(e2) {
  var t2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null;
  return e2.reduce(function(e3, n2) {
    return e3[n2] = t2 || { value: n2 }, e3;
  }, {});
}
function dt(e2, t2, n2) {
  return n2 && function(e3, t3) {
    for (var n3 = 0; n3 < t3.length; n3++) {
      var o2 = t3[n3];
      o2.enumerable = o2.enumerable || false, o2.configurable = true, "value" in o2 && (o2.writable = true), Object.defineProperty(e3, o2.key, o2);
    }
  }(e2, n2), e2;
}
function pt(e2, t2, n2) {
  return t2 in e2 ? Object.defineProperty(e2, t2, { value: n2, enumerable: true, configurable: true, writable: true }) : e2[t2] = n2, e2;
}
var gt = { logLevel: "warn", defaultKeyEvent: "keydown", defaultComponent: "div", defaultTabIndex: "-1", ignoreTags: ["input", "select", "textarea"], enableHardSequences: false, ignoreKeymapAndHandlerChangesByDefault: true, ignoreEventsCondition: function(e2) {
  var t2 = e2.target;
  if (t2 && t2.tagName) {
    var n2 = t2.tagName.toLowerCase();
    return _t.option("_ignoreTagsDict")[n2] || t2.isContentEditable;
  }
  return false;
}, ignoreRepeatedEventsWhenKeyHeldDown: true, simulateMissingKeyPressEvents: true, stopEventPropagationAfterHandling: true, stopEventPropagationAfterIgnoring: true, allowCombinationSubmatches: false, customKeyCodes: {} }, vt = function(e2) {
  for (var t2 = 1; t2 < arguments.length; t2++) {
    var n2 = null != arguments[t2] ? arguments[t2] : {}, o2 = Object.keys(n2);
    "function" == typeof Object.getOwnPropertySymbols && (o2 = o2.concat(Object.getOwnPropertySymbols(n2).filter(function(e3) {
      return Object.getOwnPropertyDescriptor(n2, e3).enumerable;
    }))), o2.forEach(function(t3) {
      pt(e2, t3, n2[t3]);
    });
  }
  return e2;
}({}, gt);
vt._ignoreTagsDict = ft(vt.ignoreTags, true);
var _t = function() {
  function e2() {
    !function(e3, t2) {
      if (!(e3 instanceof t2))
        throw new TypeError("Cannot call a class as a function");
    }(this, e2);
  }
  return dt(e2, 0, [{ key: "init", value: function(e3) {
    var t2 = this, n2 = e3.ignoreTags, o2 = e3.customKeyCodes;
    n2 && (e3._ignoreTagsDict = ft(e3.ignoreTags)), o2 && (e3._customKeyNamesDict = ft(Object.values(e3.customKeyCodes))), Object.keys(e3).forEach(function(n3) {
      t2.set(n3, e3[n3]);
    });
  } }, { key: "set", value: function(e3, t2) {
    vt[e3] = t2;
  } }, { key: "reset", value: function(e3) {
    vt[e3] = gt[e3];
  } }, { key: "option", value: function(e3) {
    return vt[e3];
  } }]), e2;
}();
function bt(e2, t2, n2) {
  return t2 && function(e3, t3) {
    for (var n3 = 0; n3 < t3.length; n3++) {
      var o2 = t3[n3];
      o2.enumerable = o2.enumerable || false, o2.configurable = true, "value" in o2 && (o2.writable = true), Object.defineProperty(e3, o2.key, o2);
    }
  }(e2.prototype, t2), e2;
}
function mt(e2, t2, n2) {
  return t2 in e2 ? Object.defineProperty(e2, t2, { value: n2, enumerable: true, configurable: true, writable: true }) : e2[t2] = n2, e2;
}
var kt = function() {
  function e2() {
    var t2 = this, n2 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : "warn";
    !function(e3, t3) {
      if (!(e3 instanceof t3))
        throw new TypeError("Cannot call a class as a function");
    }(this, e2), mt(this, "verbose", this.noop), mt(this, "debug", this.noop), mt(this, "info", this.noop), mt(this, "warn", this.noop), mt(this, "error", this.noop), this.logLevel = this.constructor.levels[n2], this.logLevel >= this.constructor.levels.error && (this.error = console.error, this.logLevel >= this.constructor.levels.warn && (this.warn = console.warn, ["info", "debug", "verbose"].some(function(e3) {
      return !(t2.logLevel >= t2.constructor.levels[e3]) || (t2[e3] = console.log, false);
    })));
  }
  return bt(e2, [{ key: "noop", value: function() {
  } }]), e2;
}();
mt(kt, "logIcons", ["📕", "📗", "📘", "📙"]), mt(kt, "componentIcons", ["🔺", "⭐️", "🔷", "🔶", "⬛️"]), mt(kt, "eventIcons", ["❤️", "💚", "💙", "💛", "💜", "🧡"]), mt(kt, "levels", { none: 0, error: 1, warn: 2, info: 3, debug: 4, verbose: 5 });
var Kt = { keydown: 0, keypress: 1, keyup: 2 }, Et = { Shift: ["shiftKey"], Meta: ["metaKey"], Control: ["ctrlKey"], Alt: ["altKey"] }, Ct = { "`": ["~"], 1: ["!"], 2: ["@", '"'], 3: ["#", "£"], 4: ["$"], 5: ["%"], 6: ["^"], 7: ["&"], 8: ["*"], 9: ["("], 0: [")"], "-": ["_"], "=": ["plus"], ";": [":"], "'": ['"', "@"], ",": ["<"], ".": [">"], "/": ["?"], "\\": ["|"], "[": ["{"], "]": ["}"], "#": ["~"] };
function Pt(e2) {
  return Ct[e2] || [1 === e2.length ? e2.toUpperCase() : e2];
}
function St(e2, t2) {
  return e2.hasOwnProperty(t2);
}
function wt(e2) {
  return function(e3) {
    if (Array.isArray(e3)) {
      for (var t2 = 0, n2 = new Array(e3.length); t2 < e3.length; t2++)
        n2[t2] = e3[t2];
      return n2;
    }
  }(e2) || function(e3) {
    if (Symbol.iterator in Object(e3) || "[object Arguments]" === Object.prototype.toString.call(e3))
      return Array.from(e3);
  }(e2) || function() {
    throw new TypeError("Invalid attempt to spread non-iterable instance");
  }();
}
function Ot(e2) {
  var t2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
  return Object.keys(e2).reduce(function(n2, o2) {
    var i2 = e2[o2];
    return i2.forEach(function(e3) {
      St(n2, e3) || (n2[e3] = []), n2[e3].push(o2);
    }), t2.includeOriginal && (St(n2, o2) || (n2[o2] = []), n2[o2] = [].concat(wt(n2[o2]), wt(i2))), n2;
  }, {});
}
var It = Ot(Ct);
function Tt(e2) {
  return It[e2] || [1 === e2.length ? e2.toLowerCase() : e2];
}
const Ht = Ot({}, { includeOriginal: true });
function jt(e2) {
  return "string" == typeof e2;
}
var Mt = { tab: "Tab", capslock: "CapsLock", shift: "Shift", meta: "Meta", alt: "Alt", ctrl: "Control", space: " ", spacebar: " ", escape: "Escape", esc: "Escape", left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown", return: "Enter", del: "Delete", command: "Meta", option: "Alt", enter: "Enter", backspace: "Backspace", ins: "Insert", pageup: "PageUp", pagedown: "PageDown", end: "End", home: "Home", contextmenu: "ContextMenu", numlock: "Clear" }, xt = { cmd: "Meta" };
function At(e2) {
  var t2 = e2.toLowerCase();
  return Mt[t2] || xt[t2] || (e2.match(/^f\d+$/) ? e2.toUpperCase() : e2);
}
var Lt = { 8: "Backspace", 9: "Tab", 12: "Clear", 13: "Enter", 16: "Shift", 17: "Control", 18: "Alt", 19: "Pause", 20: "CapsLock", 27: "Escape", 32: " ", 33: "PageUp", 34: "PageDown", 35: "End", 36: "Home", 37: "ArrowLeft", 38: "ArrowUp", 39: "ArrowRight", 40: "ArrowDown", 45: "Insert", 46: "Delete", 112: "F1", 113: "F2", 114: "F3", 115: "F4", 116: "F5", 117: "F6", 118: "F7", 119: "F8", 120: "F9", 121: "F10", 122: "F11", 123: "F12", 144: "NumLock", 145: "ScrollLock", 224: "Meta" }, Dt = ft(Object.values(Lt), true);
function Ft(e2) {
  return !!Dt[e2];
}
function Rt(e2) {
  return Rt = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(e3) {
    return typeof e3;
  } : function(e3) {
    return e3 && "function" == typeof Symbol && e3.constructor === Symbol && e3 !== Symbol.prototype ? "symbol" : typeof e3;
  }, Rt(e2);
}
function qt(e2) {
  if (void 0 === e2)
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  return e2;
}
function Nt(e2) {
  var t2 = "function" == typeof Map ? /* @__PURE__ */ new Map() : void 0;
  return Nt = function(e3) {
    if (null === e3 || (n2 = e3, -1 === Function.toString.call(n2).indexOf("[native code]")))
      return e3;
    var n2;
    if ("function" != typeof e3)
      throw new TypeError("Super expression must either be null or a function");
    if (void 0 !== t2) {
      if (t2.has(e3))
        return t2.get(e3);
      t2.set(e3, o2);
    }
    function o2() {
      return Ut(e3, arguments, Gt(this).constructor);
    }
    return o2.prototype = Object.create(e3.prototype, { constructor: { value: o2, enumerable: false, writable: true, configurable: true } }), Bt(o2, e3);
  }, Nt(e2);
}
function Ut(e2, t2, n2) {
  return Ut = function() {
    if ("undefined" == typeof Reflect || !Reflect.construct)
      return false;
    if (Reflect.construct.sham)
      return false;
    if ("function" == typeof Proxy)
      return true;
    try {
      return Date.prototype.toString.call(Reflect.construct(Date, [], function() {
      })), true;
    } catch (e3) {
      return false;
    }
  }() ? Reflect.construct : function(e3, t3, n3) {
    var o2 = [null];
    o2.push.apply(o2, t3);
    var i2 = new (Function.bind.apply(e3, o2))();
    return n3 && Bt(i2, n3.prototype), i2;
  }, Ut.apply(null, arguments);
}
function Bt(e2, t2) {
  return Bt = Object.setPrototypeOf || function(e3, t3) {
    return e3.__proto__ = t3, e3;
  }, Bt(e2, t2);
}
function Gt(e2) {
  return Gt = Object.setPrototypeOf ? Object.getPrototypeOf : function(e3) {
    return e3.__proto__ || Object.getPrototypeOf(e3);
  }, Gt(e2);
}
function zt(e2) {
  return Ft(e2) || String.fromCharCode(e2.charCodeAt(0)) === e2 || function(e3) {
    return _t.option("_customKeyNamesDict")[e3];
  }(e2);
}
var Wt = function(e2) {
  function t2() {
    var e3, n2, o2, i2, r2;
    !function(e4, t3) {
      if (!(e4 instanceof t3))
        throw new TypeError("Cannot call a class as a function");
    }(this, t2);
    for (var s2 = arguments.length, a2 = new Array(s2), u2 = 0; u2 < s2; u2++)
      a2[u2] = arguments[u2];
    return n2 = function(e4, t3) {
      return !t3 || "object" !== Rt(t3) && "function" != typeof t3 ? qt(e4) : t3;
    }(this, (e3 = Gt(t2)).call.apply(e3, [this].concat(a2))), o2 = qt(qt(n2)), r2 = "InvalidKeyNameError", (i2 = "name") in o2 ? Object.defineProperty(o2, i2, { value: r2, enumerable: true, configurable: true, writable: true }) : o2[i2] = r2, n2;
  }
  return function(e3, t3) {
    if ("function" != typeof t3 && null !== t3)
      throw new TypeError("Super expression must either be null or a function");
    e3.prototype = Object.create(t3 && t3.prototype, { constructor: { value: e3, writable: true, configurable: true } }), t3 && Bt(e3, t3);
  }(t2, Nt(Error)), t2;
}();
function Jt(e2, t2, n2) {
  return n2 && function(e3, t3) {
    for (var n3 = 0; n3 < t3.length; n3++) {
      var o2 = t3[n3];
      o2.enumerable = o2.enumerable || false, o2.configurable = true, "value" in o2 && (o2.writable = true), Object.defineProperty(e3, o2.key, o2);
    }
  }(e2, n2), e2;
}
function Vt(e2) {
  return e2.sort().join("+");
}
var $t = function() {
  function e2() {
    !function(e3, t2) {
      if (!(e3 instanceof t2))
        throw new TypeError("Cannot call a class as a function");
    }(this, e2);
  }
  return Jt(e2, 0, [{ key: "parse", value: function(e3) {
    var t2, n2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}, o2 = (jt(t2 = e3) ? t2.trim().replace(/\s+/g, " ") : t2).split(" ");
    try {
      var i2 = o2.slice(0, o2.length - 1), r2 = o2[o2.length - 1], s2 = i2.map(function(e4) {
        var t3 = Yt(e4, n2);
        return Vt(Object.keys(t3));
      }).join(" "), a2 = Yt(r2, n2), u2 = { id: Vt(Object.keys(a2)), keyDictionary: a2, keyEventType: n2.keyEventType, size: Object.keys(a2).length };
      return { sequence: { prefix: s2, size: i2.length + 1 }, combination: u2 };
    } catch (e4) {
      return { sequence: null, combination: null };
    }
  } }]), e2;
}();
function Yt(e2) {
  var t2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
  return e2.replace(/^\+|(\s|[^+]\+)\+/, "$1plus").split("+").reduce(function(e3, n2) {
    var o2 = At(n2);
    if (t2.ensureValidKeys && !zt(o2))
      throw new Wt();
    return e3[o2] = true, e3;
  }, {});
}
var Qt = { "`": ["`"], 1: ["¡"], 2: ["™"], 3: ["£"], 4: ["¢"], 5: ["∞"], 6: ["§"], 7: ["¶"], 8: ["•"], 9: ["ª"], 0: ["º"], "-": ["–"], "=": ["≠"], a: ["å"], b: ["∫"], c: ["ç"], d: ["∂"], e: ["´"], f: ["ƒ"], g: ["©"], h: ["˙"], i: ["ˆ"], j: ["∆"], k: ["˚"], l: ["¬"], m: ["µ"], n: ["˜"], o: ["ø"], p: ["π"], q: ["œ"], r: ["®"], s: ["ß"], t: ["†"], u: ["¨"], v: ["√"], w: ["∑"], x: ["≈"], y: ["¥"], z: ["Ω"], "[": ["“"], "]": ["‘"], "\\": ["«"], "'": ["æ"], ";": ["…"], ",": ["≤"], ".": ["≥"], "/": ["÷"] }, Xt = Ot(Qt);
function Zt(e2) {
  return Xt[e2] || [e2];
}
function en(e2) {
  return Qt[e2] || [e2];
}
var tn = { "`": ["`"], 1: ["⁄"], 2: ["€"], 3: ["‹"], 4: ["›"], 5: ["ﬁ"], 6: ["ﬂ"], 7: ["‡"], 8: ["°"], 9: ["·"], 0: ["‚"], "-": ["—"], "=": ["±"], a: ["Å"], b: ["ı"], c: ["Ç"], d: ["Î"], e: ["´"], f: ["Ï"], g: ["˝"], h: ["Ó"], i: ["ˆ"], j: ["Ô"], k: [""], l: ["Ò"], m: ["Â"], n: ["˜"], o: ["Ø"], p: ["π"], q: ["Œ"], r: ["‰"], s: ["Í"], t: ["Î"], u: ["¨"], v: ["◊"], w: ["„"], x: ["˛"], y: ["Á"], z: ["¸"], "[": ["”"], "]": ["’"], "\\": ["»"], "'": ["Æ"], ";": ["Ú"], ",": ["¯"], ".": ["˘"] }, nn = Ot(tn);
function on(e2) {
  return nn[e2] || Tt(e2);
}
function rn(e2) {
  return tn[e2] || [e2];
}
function sn(e2, t2, n2) {
  return t2 in e2 ? Object.defineProperty(e2, t2, { value: n2, enumerable: true, configurable: true, writable: true }) : e2[t2] = n2, e2;
}
function an(e2) {
  return function(e3) {
    if (Array.isArray(e3)) {
      for (var t2 = 0, n2 = new Array(e3.length); t2 < e3.length; t2++)
        n2[t2] = e3[t2];
      return n2;
    }
  }(e2) || function(e3) {
    if (Symbol.iterator in Object(e3) || "[object Arguments]" === Object.prototype.toString.call(e3))
      return Array.from(e3);
  }(e2) || function() {
    throw new TypeError("Invalid attempt to spread non-iterable instance");
  }();
}
function un(e2, t2, n2) {
  return n2 && function(e3, t3) {
    for (var n3 = 0; n3 < t3.length; n3++) {
      var o2 = t3[n3];
      o2.enumerable = o2.enumerable || false, o2.configurable = true, "value" in o2 && (o2.writable = true), Object.defineProperty(e3, o2.key, o2);
    }
  }(e2, n2), e2;
}
var cn = function() {
  function e2() {
    !function(e3, t2) {
      if (!(e3 instanceof t2))
        throw new TypeError("Cannot call a class as a function");
    }(this, e2);
  }
  return un(e2, 0, [{ key: "serialize", value: function(e3) {
    var t2 = e3.Shift, n2 = e3.Alt, o2 = {};
    return Object.keys(e3).sort().forEach(function(e4) {
      var i2 = [];
      if (t2)
        if (n2) {
          var r2 = on(e4), s2 = rn(e4);
          i2 = [].concat(an(i2), [e4], an(r2), an(s2));
        } else {
          var a2 = Tt(e4), u2 = Pt(e4);
          i2 = [].concat(an(i2), [e4], an(a2), an(u2));
        }
      else if (n2) {
        var c2 = Zt(e4), l2 = en(e4);
        i2 = [].concat(an(i2), [e4], an(c2), an(l2));
      } else {
        i2.push(e4);
        var y2 = Ht[e4];
        y2 && (i2 = [].concat(an(i2), an(y2)));
      }
      var h2 = Object.keys(o2);
      h2.length > 0 ? h2.forEach(function(e5) {
        i2.forEach(function(t3) {
          o2[e5 + "+".concat(t3)] = function(e6) {
            for (var t4 = 1; t4 < arguments.length; t4++) {
              var n3 = null != arguments[t4] ? arguments[t4] : {}, o3 = Object.keys(n3);
              "function" == typeof Object.getOwnPropertySymbols && (o3 = o3.concat(Object.getOwnPropertySymbols(n3).filter(function(e7) {
                return Object.getOwnPropertyDescriptor(n3, e7).enumerable;
              }))), o3.forEach(function(t5) {
                sn(e6, t5, n3[t5]);
              });
            }
            return e6;
          }({}, o2[e5], sn({}, t3, true));
        }), delete o2[e5];
      }) : i2.forEach(function(e5) {
        o2[e5] = sn({}, e5, true);
      });
    }), Object.values(o2).map(function(e4) {
      return Object.keys(e4).sort().join("+");
    });
  } }, { key: "isValidKeySerialization", value: function(e3) {
    return e3.length > 0 && !!$t.parse(e3, { ensureValidKeys: true }).combination;
  } }]), e2;
}(), ln = 0, yn = 1;
function hn(e2) {
  return void 0 === e2;
}
var fn = 0, dn = 1, pn = 2;
function gn(e2, t2, n2) {
  return n2 && function(e3, t3) {
    for (var n3 = 0; n3 < t3.length; n3++) {
      var o2 = t3[n3];
      o2.enumerable = o2.enumerable || false, o2.configurable = true, "value" in o2 && (o2.writable = true), Object.defineProperty(e3, o2.key, o2);
    }
  }(e2, n2), e2;
}
var vn = function() {
  function e2() {
    !function(e3, t2) {
      if (!(e3 instanceof t2))
        throw new TypeError("Cannot call a class as a function");
    }(this, e2);
  }
  return gn(e2, 0, [{ key: "newRecord", value: function(e3, t2) {
    var n2 = [fn, fn, fn];
    if (!hn(e3))
      for (var o2 = 0; o2 <= e3; o2++)
        n2[o2] = t2;
    return n2;
  } }, { key: "setBit", value: function(e3, t2, n2) {
    return e3[t2] = n2, e3;
  } }, { key: "clone", value: function(e3) {
    for (var t2 = this.newRecord(), n2 = 0; n2 < e3.length; n2++)
      t2[n2] = e3[n2];
    return t2;
  } }]), e2;
}();
function _n(e2) {
  return _n = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(e3) {
    return typeof e3;
  } : function(e3) {
    return e3 && "function" == typeof Symbol && e3.constructor === Symbol && e3 !== Symbol.prototype ? "symbol" : typeof e3;
  }, _n(e2);
}
function bn(e2) {
  return !Array.isArray(e2) && "object" === _n(e2) && null !== e2;
}
function mn(e2) {
  return bn(e2) ? 0 === Object.keys(e2).length : !e2 || 0 === e2.length;
}
function kn(e2) {
  return bn(e2) ? Object.keys(e2).length : e2.length;
}
function Kn(e2, t2, n2) {
  return t2 && function(e3, t3) {
    for (var n3 = 0; n3 < t3.length; n3++) {
      var o2 = t3[n3];
      o2.enumerable = o2.enumerable || false, o2.configurable = true, "value" in o2 && (o2.writable = true), Object.defineProperty(e3, o2.key, o2);
    }
  }(e2.prototype, t2), e2;
}
var En = function() {
  function e2() {
    var t2 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
    !function(e3, t3) {
      if (!(e3 instanceof t3))
        throw new TypeError("Cannot call a class as a function");
    }(this, e2), this._keys = t2, this._includesKeyUp = false, this._update();
  }
  return Kn(e2, [{ key: "getIds", value: function() {
    return this._ids;
  } }, { key: "getKeyAliases", value: function() {
    return this._keyAliases;
  } }, { key: "getNormalizedKeyName", value: function(e3) {
    if (this._keys[e3])
      return e3;
    var t2 = this._keyAliases[e3];
    return t2 || e3;
  } }, { key: "getNumberOfKeys", value: function() {
    return kn(this._keys);
  } }, { key: "any", value: function() {
    return Object.keys(this._getKeyStates()).length > 0;
  } }, { key: "isEnding", value: function() {
    return this._includesKeyUp;
  } }, { key: "hasEnded", value: function() {
    return mn(this.keysStillPressedDict());
  } }, { key: "addKey", value: function(e3, t2) {
    this._setKeyState(e3, [vn.newRecord(), vn.newRecord(Kt.keydown, t2)]);
  } }, { key: "setKeyState", value: function(e3, t2, n2) {
    var o2 = this._getKeyState(e3);
    if (this.isKeyIncluded(e3)) {
      var i2 = vn.clone(o2[1]), r2 = vn.clone(i2);
      vn.setBit(r2, t2, n2), this._setKeyState(e3, [i2, r2]);
    } else
      this.addKey(e3, n2);
    t2 === Kt.keyup && (this._includesKeyUp = true);
  } }, { key: "forEachKey", value: function(e3) {
    return Object.keys(this._keys).forEach(e3);
  } }, { key: "some", value: function(e3) {
    return Object.keys(this._keys).some(e3);
  } }, { key: "getKeyDictionary", value: function() {
    return ft(Object.keys(this._getKeyStates()), true);
  } }, { key: "keysStillPressedDict", value: function() {
    var e3 = this;
    return Object.keys(this._keys).reduce(function(t2, n2) {
      return e3.isKeyStillPressed(n2) && (t2[n2] = e3._getKeyState(n2)), t2;
    }, {});
  } }, { key: "isKeyIncluded", value: function(e3) {
    return !!this._getKeyState(e3);
  } }, { key: "isKeyStillPressed", value: function(e3) {
    return this.isEventTriggered(e3, Kt.keypress) && !this.isKeyReleased(e3);
  } }, { key: "isKeyReleased", value: function(e3) {
    return this.isEventTriggered(e3, Kt.keyup);
  } }, { key: "isEventTriggered", value: function(e3, t2) {
    return this._getKeyStateType(e3, yn, t2);
  } }, { key: "wasEventPreviouslyTriggered", value: function(e3, t2) {
    return this._getKeyStateType(e3, ln, t2);
  } }, { key: "isKeyPressSimulated", value: function(e3) {
    return this._isKeyEventSimulated(e3, Kt.keypress);
  } }, { key: "isKeyUpSimulated", value: function(e3) {
    return this._isKeyEventSimulated(e3, Kt.keyup);
  } }, { key: "describe", value: function() {
    return this.getIds()[0];
  } }, { key: "toJSON", value: function() {
    return { keys: this._getKeyStates(), ids: this.getIds(), keyAliases: this.getKeyAliases() };
  } }, { key: "_getKeyStateType", value: function(e3, t2, n2) {
    var o2 = this._getKeyState(e3);
    return o2 && o2[t2][n2];
  } }, { key: "_update", value: function() {
    this._ids = cn.serialize(this._keys), this._keyAliases = function(e3) {
      return Object.keys(e3).reduce(function(t2, n2) {
        return function(e4) {
          return Ht[e4] || [e4];
        }(n2).forEach(function(o2) {
          (function(e4) {
            if (e4.Shift)
              return e4.Alt ? [rn, on] : [Pt, Tt];
            if (e4.Alt)
              return [en, Zt];
            var t3 = function(e5) {
              return [e5];
            };
            return [t3, t3];
          })(e3).forEach(function(e4) {
            e4(o2).forEach(function(e5) {
              e5 === n2 && n2 === o2 || (t2[e5] = n2);
            });
          });
        }), t2;
      }, {});
    }(this._keys);
  } }, { key: "_isKeyEventSimulated", value: function(e3, t2) {
    return this.isEventTriggered(e3, t2) === pn;
  } }, { key: "_getKeyStates", value: function() {
    return this._keys;
  } }, { key: "_getKeyState", value: function(e3) {
    var t2 = this._keys[e3];
    if (t2)
      return t2;
    var n2 = this._keyAliases[e3];
    return n2 ? this._keys[n2] : void 0;
  } }, { key: "_setKeyState", value: function(e3, t2) {
    var n2 = this.getNormalizedKeyName(e3);
    this._keys[n2] = t2, this._update();
  } }]), e2;
}();
function Cn(e2, t2, n2) {
  return t2 && function(e3, t3) {
    for (var n3 = 0; n3 < t3.length; n3++) {
      var o2 = t3[n3];
      o2.enumerable = o2.enumerable || false, o2.configurable = true, "value" in o2 && (o2.writable = true), Object.defineProperty(e3, o2.key, o2);
    }
  }(e2.prototype, t2), e2;
}
var Pn = function() {
  function e2(t2) {
    var n2 = t2.maxLength, o2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : null;
    !function(e3, t3) {
      if (!(e3 instanceof t3))
        throw new TypeError("Cannot call a class as a function");
    }(this, e2), this._records = [], this._maxLength = n2, o2 ? this._push(o2) : this._push(new En());
  }
  return Cn(e2, [{ key: "getMostRecentCombinations", value: function(e3) {
    return this._records.slice(-e3, -1);
  } }, { key: "any", value: function() {
    return this._records.some(function(e3) {
      return e3.any();
    });
  } }, { key: "getLength", value: function() {
    return this._records.length;
  } }, { key: "getCurrentCombination", value: function() {
    return this._records[this.getLength() - 1];
  } }, { key: "addKeyToCurrentCombination", value: function(e3, t2, n2) {
    this._ensureInitialKeyCombination(), this.getCurrentCombination().setKeyState(e3, t2, n2);
  } }, { key: "setMaxLength", value: function(e3) {
    this._maxLength = e3, this._trimHistory();
  } }, { key: "startNewKeyCombination", value: function(e3, t2) {
    this._ensureInitialKeyCombination();
    var n2 = new En(this.getCurrentCombination().keysStillPressedDict());
    n2.addKey(e3, t2), this._push(n2);
  } }, { key: "toJSON", value: function() {
    return this._records.map(function(e3) {
      return e3.toJSON();
    });
  } }, { key: "_ensureInitialKeyCombination", value: function() {
    0 === this.getLength() && this._push(new En());
  } }, { key: "_push", value: function(e3) {
    this._trimHistory(), this._records.push(e3);
  } }, { key: "_trimHistory", value: function() {
    for (; this.getLength() > this._maxLength; )
      this._shift();
  } }, { key: "_shift", value: function() {
    this._records.shift();
  } }]), e2;
}();
function Sn(e2, t2, n2) {
  return t2 && function(e3, t3) {
    for (var n3 = 0; n3 < t3.length; n3++) {
      var o2 = t3[n3];
      o2.enumerable = o2.enumerable || false, o2.configurable = true, "value" in o2 && (o2.writable = true), Object.defineProperty(e3, o2.key, o2);
    }
  }(e2.prototype, t2), e2;
}
var wn = function() {
  function e2() {
    !function(e3, t2) {
      if (!(e3 instanceof t2))
        throw new TypeError("Cannot call a class as a function");
    }(this, e2), this._registry = {};
  }
  return Sn(e2, [{ key: "get", value: function(e3) {
    return this._registry[e3];
  } }, { key: "set", value: function(e3, t2) {
    this._registry[e3] = t2;
  } }, { key: "remove", value: function(e3) {
    delete this._registry[e3];
  } }, { key: "toJSON", value: function() {
    return this._registry;
  } }]), e2;
}();
function On(e2) {
  return Array.isArray(e2) ? e2 : e2 ? [e2] : [];
}
function In(e2) {
  return In = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(e3) {
    return typeof e3;
  } : function(e3) {
    return e3 && "function" == typeof Symbol && e3.constructor === Symbol && e3 !== Symbol.prototype ? "symbol" : typeof e3;
  }, In(e2);
}
function Tn(e2, t2, n2) {
  return t2 in e2 ? Object.defineProperty(e2, t2, { value: n2, enumerable: true, configurable: true, writable: true }) : e2[t2] = n2, e2;
}
function Hn(e2, t2, n2) {
  return t2 && function(e3, t3) {
    for (var n3 = 0; n3 < t3.length; n3++) {
      var o2 = t3[n3];
      o2.enumerable = o2.enumerable || false, o2.configurable = true, "value" in o2 && (o2.writable = true), Object.defineProperty(e3, o2.key, o2);
    }
  }(e2.prototype, t2), e2;
}
function jn(e2, t2) {
  return !t2 || "object" !== In(t2) && "function" != typeof t2 ? function(e3) {
    if (void 0 === e3)
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    return e3;
  }(e2) : t2;
}
function Mn(e2, t2, n2) {
  return Mn = "undefined" != typeof Reflect && Reflect.get ? Reflect.get : function(e3, t3, n3) {
    var o2 = function(e4, t4) {
      for (; !Object.prototype.hasOwnProperty.call(e4, t4) && null !== (e4 = xn(e4)); )
        ;
      return e4;
    }(e3, t3);
    if (o2) {
      var i2 = Object.getOwnPropertyDescriptor(o2, t3);
      return i2.get ? i2.get.call(n3) : i2.value;
    }
  }, Mn(e2, t2, n2 || e2);
}
function xn(e2) {
  return xn = Object.setPrototypeOf ? Object.getPrototypeOf : function(e3) {
    return e3.__proto__ || Object.getPrototypeOf(e3);
  }, xn(e2);
}
function An(e2, t2) {
  return An = Object.setPrototypeOf || function(e3, t3) {
    return e3.__proto__ = t3, e3;
  }, An(e2, t2);
}
var Ln = function(e2) {
  function t2() {
    return function(e3, t3) {
      if (!(e3 instanceof t3))
        throw new TypeError("Cannot call a class as a function");
    }(this, t2), jn(this, xn(t2).apply(this, arguments));
  }
  return function(e3, t3) {
    if ("function" != typeof t3 && null !== t3)
      throw new TypeError("Super expression must either be null or a function");
    e3.prototype = Object.create(t3 && t3.prototype, { constructor: { value: e3, writable: true, configurable: true } }), t3 && An(e3, t3);
  }(t2, wn), Hn(t2, [{ key: "add", value: function(e3, n2) {
    Mn(xn(t2.prototype), "set", this).call(this, e3, { childIds: [], parentId: null, keyMap: n2 });
  } }, { key: "update", value: function(e3, n2) {
    var o2 = Mn(xn(t2.prototype), "get", this).call(this, e3);
    Mn(xn(t2.prototype), "set", this).call(this, e3, function(e4) {
      for (var t3 = 1; t3 < arguments.length; t3++) {
        var n3 = null != arguments[t3] ? arguments[t3] : {}, o3 = Object.keys(n3);
        "function" == typeof Object.getOwnPropertySymbols && (o3 = o3.concat(Object.getOwnPropertySymbols(n3).filter(function(e5) {
          return Object.getOwnPropertyDescriptor(n3, e5).enumerable;
        }))), o3.forEach(function(t4) {
          Tn(e4, t4, n3[t4]);
        });
      }
      return e4;
    }({}, o2, { keyMap: n2 }));
  } }, { key: "setParent", value: function(e3, t3) {
    this.get(e3).parentId = t3, this._addChildId(t3, e3);
  } }, { key: "remove", value: function(e3) {
    var n2 = this._getParentId(e3);
    this._removeChildId(n2, e3), Mn(xn(t2.prototype), "remove", this).call(this, e3);
  } }, { key: "_getParentId", value: function(e3) {
    var t3 = this.get(e3);
    return t3 && t3.parentId;
  } }, { key: "_addChildId", value: function(e3, t3) {
    this.get(e3).childIds.push(t3);
  } }, { key: "_removeChildId", value: function(e3, t3) {
    var n2 = this.get(e3);
    n2 && (n2.childIds = function(e4) {
      var t4 = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {}, n3 = ft(On(arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : []));
      return Array.isArray(e4) ? e4.reduce(function(e5, o2) {
        return n3[o2] && (t4.stringifyFirst || n3[o2].value === o2) || e5.push(o2), e5;
      }, []) : bn(e4) ? Object.keys(e4).reduce(function(t5, o2) {
        return n3[o2] || (t5[o2] = e4[o2]), t5;
      }, {}) : e4;
    }(n2.childIds, t3));
  } }]), t2;
}();
function Dn(e2) {
  return function(e3) {
    if (Array.isArray(e3)) {
      for (var t2 = 0, n2 = new Array(e3.length); t2 < e3.length; t2++)
        n2[t2] = e3[t2];
      return n2;
    }
  }(e2) || function(e3) {
    if (Symbol.iterator in Object(e3) || "[object Arguments]" === Object.prototype.toString.call(e3))
      return Array.from(e3);
  }(e2) || function() {
    throw new TypeError("Invalid attempt to spread non-iterable instance");
  }();
}
function Fn(e2, t2, n2) {
  return t2 && function(e3, t3) {
    for (var n3 = 0; n3 < t3.length; n3++) {
      var o2 = t3[n3];
      o2.enumerable = o2.enumerable || false, o2.configurable = true, "value" in o2 && (o2.writable = true), Object.defineProperty(e3, o2.key, o2);
    }
  }(e2.prototype, t2), e2;
}
var Rn = function() {
  function e2(t2) {
    !function(e3, t3) {
      if (!(e3 instanceof t3))
        throw new TypeError("Cannot call a class as a function");
    }(this, e2), this._list = t2, this._position = -1;
  }
  return Fn(e2, [{ key: "getPosition", value: function() {
    return this._position;
  } }, { key: "getComponent", value: function() {
    return this._list.getAtPosition(this.getPosition());
  } }, { key: "next", value: function() {
    return this.getPosition() + 1 < this._list.getLength() ? (this._position++, this.getComponent()) : null;
  } }]), e2;
}();
function qn(e2) {
  for (var t2 = 1; t2 < arguments.length; t2++) {
    var n2 = null != arguments[t2] ? arguments[t2] : {}, o2 = Object.keys(n2);
    "function" == typeof Object.getOwnPropertySymbols && (o2 = o2.concat(Object.getOwnPropertySymbols(n2).filter(function(e3) {
      return Object.getOwnPropertyDescriptor(n2, e3).enumerable;
    }))), o2.forEach(function(t3) {
      Nn(e2, t3, n2[t3]);
    });
  }
  return e2;
}
function Nn(e2, t2, n2) {
  return t2 in e2 ? Object.defineProperty(e2, t2, { value: n2, enumerable: true, configurable: true, writable: true }) : e2[t2] = n2, e2;
}
function Un(e2, t2, n2) {
  return t2 && function(e3, t3) {
    for (var n3 = 0; n3 < t3.length; n3++) {
      var o2 = t3[n3];
      o2.enumerable = o2.enumerable || false, o2.configurable = true, "value" in o2 && (o2.writable = true), Object.defineProperty(e3, o2.key, o2);
    }
  }(e2.prototype, t2), e2;
}
var Bn = function() {
  function e2() {
    !function(e3, t2) {
      if (!(e3 instanceof t2))
        throw new TypeError("Cannot call a class as a function");
    }(this, e2), this._list = [], this._idToIndex = {}, this._longestSequence = 1, this._longestSequenceComponentId = null, this._keyMapEventRecord = vn.newRecord();
  }
  return Un(e2, [{ key: "getNewIterator", value: function() {
    return new Rn(this);
  } }, { key: "add", value: function(e3, t2, n2, o2) {
    if (this.containsId(e3))
      return this.update(e3, t2, n2, o2);
    var i2 = this._build(e3, t2, n2, o2);
    this._list.push(i2);
    var r2 = this._getLastIndex();
    return this._idToIndex[e3] = r2;
  } }, { key: "containsId", value: function(e3) {
    return !!this.get(e3);
  } }, { key: "get", value: function(e3) {
    return this.getAtPosition(this.getIndexById(e3));
  } }, { key: "getIndexById", value: function(e3) {
    return this._idToIndex[e3];
  } }, { key: "update", value: function(e3, t2, n2, o2) {
    var i2 = this._isUpdatingComponentWithLongestSequence(e3), r2 = this.getLongestSequence(), s2 = this._build(e3, t2, n2, o2);
    i2 && s2.sequenceLength !== r2 && (s2.sequenceLength > r2 ? this._longestSequence = s2.sequenceLength : this._recalculateLongestSequence()), this._list[this.getIndexById(e3)] = s2;
  } }, { key: "remove", value: function(e3) {
    var t2 = this._isUpdatingComponentWithLongestSequence(e3);
    this.removeAtPosition(this.getIndexById(e3)), t2 && this._recalculateLongestSequence();
  } }, { key: "any", value: function() {
    return 0 !== this.getLength();
  } }, { key: "isRoot", value: function(e3) {
    return this.getIndexById(e3) >= this.getLength() - 1;
  } }, { key: "getLongestSequence", value: function() {
    return this._longestSequence;
  } }, { key: "anyActionsForEventType", value: function(e3) {
    return !!this._keyMapEventRecord[e3];
  } }, { key: "getLength", value: function() {
    return this._list.length;
  } }, { key: "getAtPosition", value: function(e3) {
    return this._list[e3];
  } }, { key: "removeAtPosition", value: function(e3) {
    var t2, n2;
    this._list = (t2 = this._list, n2 = e3, [].concat(Dn(t2.slice(0, n2)), Dn(t2.slice(n2 + 1))));
    for (var o2 = e3; o2 < this.getLength(); )
      this._idToIndex[this.getAtPosition(o2).componentId] = o2, o2++;
  } }, { key: "toJSON", value: function() {
    return this._list;
  } }, { key: "_getLastIndex", value: function() {
    return this.getLength() - 1;
  } }, { key: "_build", value: function(e3, t2, n2, o2) {
    var i2 = this._applyHardSequences(t2, n2), r2 = i2.keyMap, s2 = i2.handlers;
    return { actions: this._buildActionDictionary(qn({}, t2, r2), o2, e3), handlers: s2, componentId: e3, options: o2 };
  } }, { key: "_isUpdatingComponentWithLongestSequence", value: function(e3) {
    return e3 === this._getLongestSequenceComponentId();
  } }, { key: "_getLongestSequenceComponentId", value: function() {
    return this._longestSequenceComponentId;
  } }, { key: "_recalculateLongestSequence", value: function() {
    for (var e3 = this.getNewIterator(); e3.next(); ) {
      var t2 = e3.getComponent(), n2 = t2.longestSequence, o2 = t2.componentId;
      n2 > this.getLongestSequence() && (this._longestSequenceComponentId = o2, this._longestSequence = n2);
    }
  } }, { key: "_applyHardSequences", value: function(e3, t2) {
    return _t.option("enableHardSequences") ? Object.keys(t2).reduce(function(n2, o2) {
      return !!!e3[o2] && cn.isValidKeySerialization(o2) && (n2.keyMap[o2] = o2), n2.handlers[o2] = t2[o2], n2;
    }, { keyMap: {}, handlers: {} }) : { keyMap: e3, handlers: t2 };
  } }, { key: "_buildActionDictionary", value: function(e3, t2, n2) {
    var o2 = this;
    return Object.keys(e3).reduce(function(i2, r2) {
      var s2 = e3[r2];
      return (bn(s2) && St(s2, "sequences") ? On(s2.sequences) : On(s2)).forEach(function(e4) {
        var s3 = function(e5, t3) {
          if (bn(e5)) {
            var n3 = e5.sequence, o3 = e5.action;
            return { keySequence: n3, keyEventType: hn(o3) ? Kt[t3.defaultKeyEvent] : Kt[o3] };
          }
          return { keySequence: e5, keyEventType: Kt[t3.defaultKeyEvent] };
        }(e4, t2), a2 = s3.keySequence, u2 = s3.keyEventType;
        o2._addActionOptions(i2, n2, r2, a2, u2);
      }), i2;
    }, {});
  } }, { key: "_addActionOptions", value: function(e3, t2, n2, o2, i2) {
    var r2 = $t.parse(o2, { keyEventType: i2 }), s2 = r2.sequence, a2 = r2.combination;
    s2.size > this.getLongestSequence() && (this._longestSequence = s2.size, this._longestSequenceComponentId = t2), this._keyMapEventRecord[i2] = dn, e3[n2] || (e3[n2] = []), e3[n2].push(qn({ prefix: s2.prefix, actionName: n2, sequenceLength: s2.size }, a2));
  } }]), e2;
}();
function Gn(e2, t2) {
  return e2[e2.length - (t2 + 1)];
}
for (var zn = { Enter: true, Backspace: true, ArrowRight: true, ArrowLeft: true, ArrowUp: true, ArrowDown: true, CapsLock: true }, Wn = 1; Wn < 13; Wn++)
  zn["F".concat(Wn)] = true;
function Jn(e2) {
  return 1 === e2.length || St(zn, e2);
}
function Vn(e2) {
  for (var t2 = 1; t2 < arguments.length; t2++) {
    var n2 = null != arguments[t2] ? arguments[t2] : {}, o2 = Object.keys(n2);
    "function" == typeof Object.getOwnPropertySymbols && (o2 = o2.concat(Object.getOwnPropertySymbols(n2).filter(function(e3) {
      return Object.getOwnPropertyDescriptor(n2, e3).enumerable;
    }))), o2.forEach(function(t3) {
      $n(e2, t3, n2[t3]);
    });
  }
  return e2;
}
function $n(e2, t2, n2) {
  return t2 in e2 ? Object.defineProperty(e2, t2, { value: n2, enumerable: true, configurable: true, writable: true }) : e2[t2] = n2, e2;
}
function Yn(e2, t2, n2) {
  return t2 && function(e3, t3) {
    for (var n3 = 0; n3 < t3.length; n3++) {
      var o2 = t3[n3];
      o2.enumerable = o2.enumerable || false, o2.configurable = true, "value" in o2 && (o2.writable = true), Object.defineProperty(e3, o2.key, o2);
    }
  }(e2.prototype, t2), e2;
}
var Qn = function() {
  function e2() {
    !function(e3, t2) {
      if (!(e3 instanceof t2))
        throw new TypeError("Cannot call a class as a function");
    }(this, e2), this._actionConfigs = {}, this._order = null;
  }
  return Yn(e2, [{ key: "addMatch", value: function(e3, t2) {
    if (this._includesMatcherForCombination(e3.id)) {
      var n2 = e3.keyEventType, o2 = e3.actionName, i2 = e3.id;
      this._addHandlerToActionConfig(i2, { keyEventType: n2, actionName: o2, handler: t2 });
    } else
      this._addNewActionConfig(e3, t2);
  } }, { key: "findMatch", value: function(e3, t2, n2) {
    this._order || this._setOrder();
    var o2 = true, i2 = false, r2 = void 0;
    try {
      for (var s2, a2 = this._order[Symbol.iterator](); !(o2 = (s2 = a2.next()).done); o2 = true) {
        var u2 = s2.value, c2 = this._actionConfigs[u2];
        if (this._matchesActionConfig(e3, t2, n2, c2))
          return c2;
      }
    } catch (e4) {
      i2 = true, r2 = e4;
    } finally {
      try {
        o2 || null == a2.return || a2.return();
      } finally {
        if (i2)
          throw r2;
      }
    }
    return null;
  } }, { key: "toJSON", value: function() {
    return { actionConfigs: this._actionConfigs, order: this._order };
  } }, { key: "_matchesActionConfig", value: function(e3, t2, n2, o2) {
    if (!function(e4, t3) {
      var n3 = kn(t3.keyDictionary);
      return _t.option("allowCombinationSubmatches") || function(e5) {
        if (e5.isKeyStillPressed("Meta"))
          return e5.some(function(e6) {
            return Jn(e6);
          });
        return false;
      }(e4) ? e4.getNumberOfKeys() >= n3 : e4.getNumberOfKeys() === n3;
    }(e3, o2))
      return false;
    if (!o2.events[n2])
      return false;
    var i2 = false;
    return Object.keys(o2.keyDictionary).every(function(o3) {
      return !!e3.isEventTriggered(o3, n2) && (t2 && t2 === e3.getNormalizedKeyName(o3) && (i2 = !e3.wasEventPreviouslyTriggered(o3, n2)), true);
    }) && i2;
  } }, { key: "_setOrder", value: function() {
    var e3 = Object.values(this._actionConfigs).reduce(function(e4, t2) {
      var n2 = t2.id, o2 = t2.size;
      return e4[o2] || (e4[o2] = []), e4[o2].push(n2), e4;
    }, {});
    this._order = Object.keys(e3).sort(function(e4, t2) {
      return t2 - e4;
    }).reduce(function(t2, n2) {
      return t2.concat(e3[n2]);
    }, []);
  } }, { key: "_addNewActionConfig", value: function(e3, t2) {
    var n2 = e3.prefix, o2 = e3.sequenceLength, i2 = e3.id, r2 = e3.keyDictionary, s2 = e3.size, a2 = e3.keyEventType, u2 = e3.actionName;
    this._setCombinationMatcher(i2, { prefix: n2, sequenceLength: o2, id: i2, keyDictionary: r2, size: s2, events: {} }), this._addHandlerToActionConfig(i2, { keyEventType: a2, actionName: u2, handler: t2 });
  } }, { key: "_addHandlerToActionConfig", value: function(e3, t2) {
    var n2 = t2.keyEventType, o2 = t2.actionName, i2 = t2.handler, r2 = this._getCombinationMatcher(e3);
    this._setCombinationMatcher(e3, Vn({}, r2, { events: Vn({}, r2.events, $n({}, n2, { actionName: o2, handler: i2 })) }));
  } }, { key: "_setCombinationMatcher", value: function(e3, t2) {
    this._actionConfigs[e3] = t2;
  } }, { key: "_getCombinationMatcher", value: function(e3) {
    return this._actionConfigs[e3];
  } }, { key: "_includesMatcherForCombination", value: function(e3) {
    return !!this._getCombinationMatcher(e3);
  } }]), e2;
}();
function Xn(e2, t2, n2) {
  return t2 && function(e3, t3) {
    for (var n3 = 0; n3 < t3.length; n3++) {
      var o2 = t3[n3];
      o2.enumerable = o2.enumerable || false, o2.configurable = true, "value" in o2 && (o2.writable = true), Object.defineProperty(e3, o2.key, o2);
    }
  }(e2.prototype, t2), e2;
}
var Zn = function() {
  function e2() {
    !function(e3, t2) {
      if (!(e3 instanceof t2))
        throw new TypeError("Cannot call a class as a function");
    }(this, e2), this._combinationMatchers = {}, this._eventRecord = vn.newRecord();
  }
  return Xn(e2, [{ key: "addMatch", value: function(e3, t2) {
    this._getOrCreateCombinationMatcher(e3.prefix).addMatch(e3, t2), vn.setBit(this._eventRecord, e3.keyEventType, dn), (!this._longestSequence || this._longestSequence < e3.sequenceLength) && (this._longestSequence = e3.sequenceLength);
  } }, { key: "findMatch", value: function(e3, t2, n2) {
    var o2 = this._findCombinationMatcher(e3);
    return o2 ? o2.findMatch(e3.getCurrentCombination(), e3.getCurrentCombination().getNormalizedKeyName(t2), n2) : null;
  } }, { key: "hasMatchesForEventType", value: function(e3) {
    return !!this._eventRecord[e3];
  } }, { key: "getLongestSequence", value: function() {
    return this._longestSequence;
  } }, { key: "toJSON", value: function() {
    var e3 = this;
    return Object.keys(this._combinationMatchers).reduce(function(t2, n2) {
      var o2 = e3._combinationMatchers[n2];
      return t2[n2] = o2.toJSON(), t2;
    }, {});
  } }, { key: "_getOrCreateCombinationMatcher", value: function(e3) {
    return this._combinationMatchers[e3] || (this._combinationMatchers[e3] = new Qn()), this._combinationMatchers[e3];
  } }, { key: "_findCombinationMatcher", value: function(e3) {
    var t2 = e3.getMostRecentCombinations(this.getLongestSequence());
    if (0 === t2.length)
      return this._combinationMatchers[""];
    for (var n2 = t2.map(function(e4) {
      return e4.getIds();
    }), o2 = n2.map(function(e4) {
      return e4.length;
    }), i2 = new Array(n2.length).fill(0), r2 = false; !r2; ) {
      var s2 = i2.map(function(e4, t3) {
        return n2[t3][e4];
      }).join(" ");
      if (this._combinationMatchers[s2])
        return this._combinationMatchers[s2];
      for (var a2 = 0, u2 = true; u2 && a2 < i2.length; ) {
        var c2 = (Gn(i2, a2) + 1) % (Gn(o2, a2) || 1);
        i2[i2.length - (a2 + 1)] = c2, (u2 = 0 === c2) && a2++;
      }
      r2 = a2 === i2.length;
    }
  } }]), e2;
}();
function eo(e2, t2, n2) {
  return t2 && function(e3, t3) {
    for (var n3 = 0; n3 < t3.length; n3++) {
      var o2 = t3[n3];
      o2.enumerable = o2.enumerable || false, o2.configurable = true, "value" in o2 && (o2.writable = true), Object.defineProperty(e3, o2.key, o2);
    }
  }(e2.prototype, t2), e2;
}
var to = function() {
  function e2(t2) {
    !function(e3, t3) {
      if (!(e3 instanceof t3))
        throw new TypeError("Cannot call a class as a function");
    }(this, e2), this._keyMapMatchers = [], this._unmatchedHandlerStatus = [], this._handlersDictionary = {}, this._keySequencesDictionary = {};
    for (var n2 = t2.getNewIterator(); n2.next(); ) {
      var o2 = n2.getComponent().handlers;
      this._unmatchedHandlerStatus.push([Object.keys(o2).length, {}]), this._keyMapMatchers.push(new Zn());
    }
    this._componentList = t2, this._componentListIterator = t2.getNewIterator();
  }
  return eo(e2, [{ key: "getKeyHistoryMatcher", value: function(e3) {
    if (this._componentHasUnmatchedHandlers(e3))
      for (; this._componentListIterator.next(); )
        this._addHandlersFromComponent(), this._addActionsFromComponent();
    return this._getKeyHistoryMatcher(e3);
  } }, { key: "componentHasActionsBoundToEventType", value: function(e3, t2) {
    return this.getKeyHistoryMatcher(e3).hasMatchesForEventType(t2);
  } }, { key: "findMatchingKeySequenceInComponent", value: function(e3, t2, n2, o2) {
    return this.componentHasActionsBoundToEventType(e3, o2) ? this.getKeyHistoryMatcher(e3).findMatch(t2, n2, o2) : null;
  } }, { key: "_getKeyHistoryMatcher", value: function(e3) {
    return this._keyMapMatchers[e3];
  } }, { key: "_addActionsFromComponent", value: function() {
    var e3 = this, t2 = this._componentListIterator.getComponent().actions;
    Object.keys(t2).forEach(function(n2) {
      var o2 = e3._getHandlers(n2);
      if (o2) {
        var i2 = o2[0], r2 = e3._componentList.getAtPosition(i2).handlers[n2], s2 = e3._getKeyHistoryMatcher(i2);
        t2[n2].forEach(function(t3) {
          var n3 = [t3.prefix, t3.id].join(" ");
          e3._isClosestHandlerFound(n3, t3) || (s2.addMatch(t3, r2), e3._addKeySequence(n3, [i2, t3.keyEventType]));
        }), o2.forEach(function(t3) {
          var o3 = e3._getUnmatchedHandlerStatus(t3);
          o3[1][n2] || (o3[1][n2] = true, o3[0]--);
        });
      }
    });
  } }, { key: "_getHandlers", value: function(e3) {
    return this._handlersDictionary[e3];
  } }, { key: "_addHandlersFromComponent", value: function() {
    var e3 = this, t2 = this._componentListIterator.getComponent().handlers;
    Object.keys(t2).forEach(function(t3) {
      e3._addHandler(t3);
    });
  } }, { key: "_addHandler", value: function(e3) {
    this._handlersDictionary[e3] || (this._handlersDictionary[e3] = []), this._handlersDictionary[e3].push(this._componentListIterator.getPosition());
  } }, { key: "_addKeySequence", value: function(e3, t2) {
    this._keySequencesDictionary[e3] || (this._keySequencesDictionary[e3] = []), this._keySequencesDictionary[e3].push(t2);
  } }, { key: "_componentHasUnmatchedHandlers", value: function(e3) {
    return this._getUnmatchedHandlerStatus(e3)[0] > 0;
  } }, { key: "_getUnmatchedHandlerStatus", value: function(e3) {
    return this._unmatchedHandlerStatus[e3];
  } }, { key: "_isClosestHandlerFound", value: function(e3, t2) {
    return this._keySequencesDictionary[e3] && this._keySequencesDictionary[e3].some(function(e4) {
      return e4[1] === t2.keyEventType;
    });
  } }]), e2;
}();
function no(e2, t2, n2) {
  return n2.forEach(function(n3) {
    St(e2, n3) && (t2[n3] = e2[n3]);
  }), t2;
}
function oo(e2) {
  switch (parseInt(e2, 10)) {
    case 0:
      return "keydown";
    case 1:
      return "keypress";
    default:
      return "keyup";
  }
}
function io(e2) {
  return JSON.stringify(e2, ro, 4);
}
function ro(e2, t2) {
  return "function" == typeof t2 ? t2.toString() : t2;
}
function so(e2) {
  return e2.simulated ? pn : dn;
}
function ao(e2, t2, n2) {
  return t2 in e2 ? Object.defineProperty(e2, t2, { value: n2, enumerable: true, configurable: true, writable: true }) : e2[t2] = n2, e2;
}
function uo(e2, t2, n2) {
  return t2 && function(e3, t3) {
    for (var n3 = 0; n3 < t3.length; n3++) {
      var o2 = t3[n3];
      o2.enumerable = o2.enumerable || false, o2.configurable = true, "value" in o2 && (o2.writable = true), Object.defineProperty(e3, o2.key, o2);
    }
  }(e2.prototype, t2), e2;
}
var co = ["sequence", "action"], lo = ["name", "description", "group"], yo = function() {
  function e2() {
    var t2 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {}, n2 = arguments.length > 1 ? arguments[1] : void 0;
    !function(e3, t3) {
      if (!(e3 instanceof t3))
        throw new TypeError("Cannot call a class as a function");
    }(this, e2), this.logger = t2.logger || new kt("warn"), this.componentId = -1, this.keyEventManager = n2, this._componentTree = new Ln(), this.rootComponentId = null, this._reset(), this.resetKeyHistory();
  }
  return uo(e2, [{ key: "_reset", value: function() {
    this.componentList = new Bn(), this._initHandlerResolutionState();
  } }, { key: "_newKeyHistory", value: function() {
    return new Pn({ maxLength: this.componentList.getLongestSequence() });
  } }, { key: "getKeyHistory", value: function() {
    return this._keyHistory || (this._keyHistory = this._newKeyHistory()), this._keyHistory;
  } }, { key: "_initHandlerResolutionState", value: function() {
    this._actionResolver = null;
  } }, { key: "resetKeyHistory", value: function() {
    var e3 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
    this.keypressEventsToSimulate = [], this.keyupEventsToSimulate = [], this.getKeyHistory().any() && !e3.force ? this._keyHistory = new Pn({ maxLength: this.componentList.getLongestSequence() }, new En(this.getCurrentCombination().keysStillPressedDict())) : this._keyHistory = this._newKeyHistory();
  } }, { key: "getApplicationKeyMap", value: function() {
    return null === this.rootComponentId ? {} : this._buildApplicationKeyMap([this.rootComponentId], {});
  } }, { key: "_buildApplicationKeyMap", value: function(e3, t2) {
    var n2 = this;
    return e3.forEach(function(e4) {
      var o2 = n2._componentTree.get(e4), i2 = o2.childIds, r2 = o2.keyMap;
      r2 && Object.keys(r2).forEach(function(e5) {
        var o3 = r2[e5];
        t2[e5] = {}, bn(o3) ? St(o3, "sequences") ? (no(o3, t2[e5], lo), t2[e5].sequences = n2._createSequenceFromConfig(o3.sequences)) : (no(o3, t2[e5], lo), t2[e5].sequences = [no(o3, {}, co)]) : t2[e5].sequences = n2._createSequenceFromConfig(o3);
      }), n2._buildApplicationKeyMap(i2, t2);
    }), t2;
  } }, { key: "_createSequenceFromConfig", value: function(e3) {
    return On(e3).map(function(e4) {
      return bn(e4) ? no(e4, {}, co) : { sequence: e4 };
    });
  } }, { key: "registerKeyMap", value: function(e3) {
    return this.componentId += 1, this._componentTree.add(this.componentId, e3), this.logger.verbose(this._logPrefix(this.componentId), "Registered component:\n", "".concat(io(this._componentTree.get(this.componentId)))), this.componentId;
  } }, { key: "reregisterKeyMap", value: function(e3, t2) {
    this._componentTree.update(e3, t2);
  } }, { key: "registerComponentMount", value: function(e3, t2) {
    hn(t2) ? this.rootComponentId = e3 : this._componentTree.setParent(e3, t2), this.logger.verbose(this._logPrefix(e3), "Registered component mount:\n", "".concat(io(this._componentTree.get(e3))));
  } }, { key: "deregisterKeyMap", value: function(e3) {
    this._componentTree.remove(e3), this.logger.verbose(this._logPrefix(e3), "De-registered component. Remaining component Registry:\n", "".concat(io(this._componentTree.toJSON()))), e3 === this.rootComponentId && (this.rootComponentId = null);
  } }, { key: "_addComponent", value: function(e3) {
    var t2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}, n2 = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {}, o2 = arguments.length > 3 ? arguments[3] : void 0;
    this.componentList.add(e3, t2, n2, o2), this.getKeyHistory().setMaxLength(this.componentList.getLongestSequence());
  } }, { key: "_allKeysAreReleased", value: function() {
    return this.getCurrentCombination().hasEnded();
  } }, { key: "getCurrentCombination", value: function() {
    return this.getKeyHistory().getCurrentCombination();
  } }, { key: "_shouldSimulate", value: function(e3, t2) {
    var n2 = function(e4) {
      return !Ft(e4);
    }(t2), o2 = this.getCurrentCombination();
    return e3 === Kt.keypress ? !n2 || n2 && o2.isKeyStillPressed("Meta") : e3 === Kt.keyup && (Jn(t2) && o2.isKeyReleased("Meta"));
  } }, { key: "_cloneAndMergeEvent", value: function(e3, t2) {
    return function(e4) {
      for (var t3 = 1; t3 < arguments.length; t3++) {
        var n2 = null != arguments[t3] ? arguments[t3] : {}, o2 = Object.keys(n2);
        "function" == typeof Object.getOwnPropertySymbols && (o2 = o2.concat(Object.getOwnPropertySymbols(n2).filter(function(e5) {
          return Object.getOwnPropertyDescriptor(n2, e5).enumerable;
        }))), o2.forEach(function(t4) {
          ao(e4, t4, n2[t4]);
        });
      }
      return e4;
    }({}, Object.keys(Et).reduce(function(t3, n2) {
      return t3[n2] = e3[n2], t3;
    }, {}), t2);
  } }, { key: "_callClosestMatchingHandler", value: function(e3, t2, n2, o2, i2) {
    for (this._actionResolver || (this._actionResolver = new to(this.componentList)); i2 <= o2; ) {
      var r2 = this._actionResolver.getKeyHistoryMatcher(i2);
      this.logger.verbose(this._logPrefix(i2), "Internal key mapping:\n", "".concat(io(r2.toJSON())));
      var s2 = this._actionResolver.findMatchingKeySequenceInComponent(i2, this.getKeyHistory(), t2, n2), a2 = this.getCurrentCombination();
      if (s2) {
        var u2 = s2.events[n2];
        if (_t.option("allowCombinationSubmatches")) {
          var c2 = cn.serialize(s2.keyDictionary);
          this.logger.debug(this._logPrefix(i2), "Found action that matches '".concat(a2.describe(), "' (sub-match: '").concat(c2, "'): ").concat(u2.actionName, ". Calling handler . . ."));
        } else
          this.logger.debug(this._logPrefix(i2), "Found action that matches '".concat(a2.describe(), "': ").concat(u2.actionName, ". Calling handler . . ."));
        return u2.handler(e3), this._stopEventPropagationAfterHandlingIfEnabled(e3, i2), true;
      }
      if (this._actionResolver.componentHasActionsBoundToEventType(i2, n2)) {
        var l2 = oo(n2);
        this.logger.debug(this._logPrefix(i2), "No matching actions found for '".concat(a2.describe(), "' ").concat(l2, "."));
      } else
        this.logger.debug(this._logPrefix(i2), "Doesn't define a handler for '".concat(a2.describe(), "' ").concat(oo(n2), "."));
      i2++;
    }
  } }, { key: "_stopEventPropagationAfterHandlingIfEnabled", value: function(e3, t2) {
    return !!_t.option("stopEventPropagationAfterHandling") && (this._stopEventPropagation(e3, t2), true);
  } }, { key: "_stopEventPropagation", value: function(e3, t2) {
    throw new Error("_stopEventPropagation must be overridden by a subclass");
  } }, { key: "_checkForModifierFlagDiscrepancies", value: function(e3, t2, n2) {
    var o2 = this;
    Object.keys(Et).forEach(function(i2) {
      if (t2 !== i2 || n2 !== Kt.keyup) {
        var r2 = o2.getCurrentCombination(), s2 = r2.isKeyStillPressed(i2);
        Et[i2].forEach(function(t3) {
          false === e3[t3] && s2 && r2.setKeyState(i2, Kt.keyup, so(e3));
        });
      }
    });
  } }, { key: "_logPrefix", value: function() {
  } }]), e2;
}();
function ho(e2, t2, n2) {
  return n2 && function(e3, t3) {
    for (var n3 = 0; n3 < t3.length; n3++) {
      var o2 = t3[n3];
      o2.enumerable = o2.enumerable || false, o2.configurable = true, "value" in o2 && (o2.writable = true), Object.defineProperty(e3, o2.key, o2);
    }
  }(e2, n2), e2;
}
var fo = function() {
  function e2() {
    !function(e3, t2) {
      if (!(e3 instanceof t2))
        throw new TypeError("Cannot call a class as a function");
    }(this, e2);
  }
  return ho(e2, 0, [{ key: "getId", value: function() {
    return hn(this._id) && (this._id = 0), this._id;
  } }, { key: "incrementId", value: function() {
    this._id = this.getId() + 1;
  } }]), e2;
}();
var po = { Esc: "Escape", Spacebar: " ", Left: "ArrowLeft", Up: "ArrowUp", Right: "ArrowRight", Down: "ArrowDown", Del: "Delete", Win: "OS", Menu: "ContextMenu", Apps: "ContextMenu", Scroll: "ScrollLock", MozPrintableKey: "Unidentified" };
function go(e2) {
  var t2, n2, o2 = (t2 = _t.option("customKeyCodes"), n2 = e2.keyCode || e2.charCode, St(t2, n2) ? t2[n2] : e2.nativeEvent ? e2.key : function(e3) {
    if (e3.key) {
      var t3 = po[e3.key] || e3.key;
      if ("Unidentified" !== t3)
        return t3;
    }
    if ("keypress" === e3.type) {
      var n3 = function(e4) {
        var t4, n4 = e4.keyCode;
        return "charCode" in e4 ? 0 === (t4 = e4.charCode) && 13 === n4 && (t4 = 13) : t4 = n4, 10 === t4 && (t4 = 13), t4 >= 32 || 13 === t4 ? t4 : 0;
      }(e3);
      return 13 === n3 ? "Enter" : String.fromCharCode(n3);
    }
    return "keydown" === e3.type || "keyup" === e3.type ? Lt[e3.keyCode] || "Unidentified" : "";
  }(e2));
  return "+" === o2 ? "plus" : o2;
}
function vo(e2) {
  return "Meta" === e2;
}
function _o(e2, t2, n2) {
  var o2 = "'".concat(t2, "' ").concat(oo(n2));
  return e2.simulated ? "(simulated) ".concat(o2) : o2;
}
var bo = 0, mo = 1, ko = 2, Ko = 4;
function Eo(e2, t2, n2) {
  return t2 && function(e3, t3) {
    for (var n3 = 0; n3 < t3.length; n3++) {
      var o2 = t3[n3];
      o2.enumerable = o2.enumerable || false, o2.configurable = true, "value" in o2 && (o2.writable = true), Object.defineProperty(e3, o2.key, o2);
    }
  }(e2.prototype, t2), e2;
}
var Co = function() {
  function e2(t2, n2) {
    var o2 = n2.logger, i2 = n2.logPrefix;
    !function(e3, t3) {
      if (!(e3 instanceof t3))
        throw new TypeError("Cannot call a class as a function");
    }(this, e2), this._componentList = t2, this._previousPropagation = null, this.logger = o2, this._logPrefix = i2, this._reset();
  }
  return Eo(e2, [{ key: "_reset", value: function() {
    this._previousPosition = -1, this._position = -1, this._actionHandled = false, this._ignoreEvent = false, this._observeIgnoredEvents = false, this._stopping = false, this._componentId = null, this._key = null, this._type = null;
  } }, { key: "isFirstPropagationStep", value: function() {
    var e3 = this.getPreviousPosition();
    return -1 === e3 || e3 >= this._position;
  } }, { key: "isForKey", value: function(e3) {
    return this._key === e3;
  } }, { key: "isForEventType", value: function(e3) {
    return this._type === e3;
  } }, { key: "startNewPropagationStep", value: function(e3, t2, n2, o2) {
    return this._position = this._componentList.getIndexById(e3), this._componentId = e3, this.isFirstPropagationStep() && (fo.incrementId(), this._key = t2.key, this._type = o2), !t2.repeat || !_t.option("ignoreRepeatedEventsWhenKeyHeldDown") || (this.logger.debug(this._logPrefix(e3), "Ignored repeated ".concat(_o(t2, n2, Kt.keydown), " event.")), this.ignoreEvent(t2), false);
  } }, { key: "finishPropagationStep", value: function() {
    this.isStopped() || this._componentList.isRoot(this._componentId) ? (this._previousPropagation = this._clone(), this._reset()) : this._previousPosition = this._position;
  } }, { key: "getPreviousPropagation", value: function() {
    return this._previousPropagation || (this._previousPropagation = this._clone({ copyState: false })), this._previousPropagation;
  } }, { key: "getPreviousPosition", value: function() {
    return this._previousPosition;
  } }, { key: "observeIgnoredEvents", value: function() {
    this._observeIgnoredEvents = true;
  } }, { key: "ignoreEvent", value: function(e3) {
    return this.setIgnoreEvent(true), !(!this.isIgnoringEvent() || !_t.option("stopEventPropagationAfterIgnoring")) && (this.logger.debug(this._logPrefix(this._componentId), "Stopping further event propagation."), this.stop(e3), this.finishPropagationStep(), true);
  } }, { key: "setIgnoreEvent", value: function(e3) {
    this._ignoreEvent = e3;
  } }, { key: "isIgnoringEvent", value: function() {
    return !this._observeIgnoredEvents && this._ignoreEvent;
  } }, { key: "isStopped", value: function() {
    return this._stopping;
  } }, { key: "stop", value: function(e3) {
    return !this.isStopped() && (this._stopping = true, e3.simulated || e3.stopPropagation(), true);
  } }, { key: "isPendingPropagation", value: function() {
    var e3 = this.getPreviousPosition();
    return -1 !== e3 && e3 + 1 < this._position;
  } }, { key: "isHandled", value: function() {
    return this._actionHandled;
  } }, { key: "setHandled", value: function() {
    this._actionHandled = true;
  } }, { key: "_clone", value: function() {
    var t2 = (arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {}).copyState, n2 = void 0 === t2 || t2, o2 = new e2(this._componentList, { logger: this.logger, logPrefix: this._logPrefix });
    return n2 && Object.assign(o2, this), o2;
  } }]), e2;
}();
function Po(e2) {
  return Po = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(e3) {
    return typeof e3;
  } : function(e3) {
    return e3 && "function" == typeof Symbol && e3.constructor === Symbol && e3 !== Symbol.prototype ? "symbol" : typeof e3;
  }, Po(e2);
}
function So(e2, t2, n2) {
  return t2 && function(e3, t3) {
    for (var n3 = 0; n3 < t3.length; n3++) {
      var o2 = t3[n3];
      o2.enumerable = o2.enumerable || false, o2.configurable = true, "value" in o2 && (o2.writable = true), Object.defineProperty(e3, o2.key, o2);
    }
  }(e2.prototype, t2), e2;
}
function wo(e2, t2) {
  return !t2 || "object" !== Po(t2) && "function" != typeof t2 ? function(e3) {
    if (void 0 === e3)
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    return e3;
  }(e2) : t2;
}
function Oo(e2, t2, n2) {
  return Oo = "undefined" != typeof Reflect && Reflect.get ? Reflect.get : function(e3, t3, n3) {
    var o2 = function(e4, t4) {
      for (; !Object.prototype.hasOwnProperty.call(e4, t4) && null !== (e4 = Io(e4)); )
        ;
      return e4;
    }(e3, t3);
    if (o2) {
      var i2 = Object.getOwnPropertyDescriptor(o2, t3);
      return i2.get ? i2.get.call(n3) : i2.value;
    }
  }, Oo(e2, t2, n2 || e2);
}
function Io(e2) {
  return Io = Object.setPrototypeOf ? Object.getPrototypeOf : function(e3) {
    return e3.__proto__ || Object.getPrototypeOf(e3);
  }, Io(e2);
}
function To(e2, t2) {
  return To = Object.setPrototypeOf || function(e3, t3) {
    return e3.__proto__ = t3, e3;
  }, To(e2, t2);
}
var Ho = function(e2) {
  function t2() {
    var e3, n2 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {}, o2 = arguments.length > 1 ? arguments[1] : void 0;
    return function(e4, t3) {
      if (!(e4 instanceof t3))
        throw new TypeError("Cannot call a class as a function");
    }(this, t2), (e3 = wo(this, Io(t2).call(this, n2, o2))).focusTreeId = 0, e3;
  }
  return function(e3, t3) {
    if ("function" != typeof t3 && null !== t3)
      throw new TypeError("Super expression must either be null or a function");
    e3.prototype = Object.create(t3 && t3.prototype, { constructor: { value: e3, writable: true, configurable: true } }), t3 && To(e3, t3);
  }(t2, yo), So(t2, [{ key: "_reset", value: function() {
    Oo(Io(t2.prototype), "_reset", this).call(this), this.keypressEventsToSimulate = [], this.focusTreeId += 1, this.eventPropagator = new Co(this.componentList, { logger: this.logger, logPrefix: this._logPrefix.bind(this) });
  } }, { key: "enableHotKeys", value: function(e3) {
    var t3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}, n2 = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {}, o2 = arguments.length > 3 ? arguments[3] : void 0;
    if (this.resetOnNextFocus && (this._reset(), this.resetOnNextFocus = false), !this.componentList.containsId(e3))
      return this._addComponent(e3, t3, n2, o2), this.logger.debug(this._logPrefix(e3, { eventId: false }), "Focused. \n"), this.logger.verbose(this._logPrefix(e3, { eventId: false }), "Component options:\n", io(this.componentList.get(e3))), this.focusTreeId;
  } }, { key: "updateEnabledHotKeys", value: function(e3, t3) {
    var n2 = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {}, o2 = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : {}, i2 = arguments.length > 4 ? arguments[4] : void 0;
    e3 === this.focusTreeId && this.componentList.containsId(t3) && (this.componentList.update(t3, n2, o2, i2), this.getKeyHistory().setMaxLength(this.componentList.getLongestSequence()), this.logger.debug(this._logPrefix(t3, { focusTreeId: e3, eventId: false }), "Received new props."), this._initHandlerResolutionState(), this.logger.verbose(this._logPrefix(t3, { focusTreeId: e3, eventId: false }), "Component options:\n", io(this.componentList.get(t3))));
  } }, { key: "disableHotKeys", value: function(e3, t3) {
    this.resetOnNextFocus || (this.resetOnNextFocus = true);
    var n2 = this.eventPropagator.isPendingPropagation();
    return this.logger.debug("".concat(this._logPrefix(t3, { focusTreeId: e3, eventId: false })), "Lost focus".concat(n2 ? " (Key event has yet to propagate through it)" : "", ".")), n2;
  } }, { key: "handleKeydown", value: function(e3, t3, n2) {
    var o2 = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : {}, i2 = go(e3);
    if (t3 !== this.focusTreeId)
      return this.logger.debug(this._logPrefix(n2), "Ignored ".concat(_o(e3, i2, Kt.keydown), " event because it had an old focus tree id: ").concat(t3, ".")), this.eventPropagator.ignoreEvent(e3), true;
    if (this.eventPropagator.startNewPropagationStep(n2, e3, i2, Kt.keydown)) {
      if (this._howToHandleKeyEvent(e3, t3, n2, i2, o2, Kt.keydown) === Ko) {
        var r2 = so(e3), s2 = this.getCurrentCombination();
        s2.isKeyIncluded(i2) || s2.isEnding() ? this._startAndLogNewKeyCombination(i2, t3, n2, r2) : this._addToAndLogCurrentKeyCombination(i2, Kt.keydown, t3, n2, r2), this._callHandlerIfActionNotHandled(e3, i2, Kt.keydown, n2, t3);
      }
      return this._simulateKeyPressForNonPrintableKeys(e3, i2, t3, n2, o2), this.eventPropagator.finishPropagationStep(), false;
    }
  } }, { key: "_howToHandleKeyEvent", value: function(e3, t3, n2, o2, i2, r2) {
    if (this.eventPropagator.isFirstPropagationStep()) {
      if (i2.ignoreEventsCondition(e3) && this.eventPropagator.ignoreEvent(e3))
        return this._eventIsToBeIgnored(e3, n2, o2, r2);
      this.logger.debug(this._logPrefix(n2), "New ".concat(_o(e3, o2, r2), " event.")), this._checkForModifierFlagDiscrepancies(e3, o2, r2);
    } else if (this.eventPropagator.isIgnoringEvent())
      return this._eventIsToBeIgnored(e3, n2, o2, r2);
    return Ko;
  } }, { key: "_eventIsToBeIgnored", value: function(e3, t3, n2, o2) {
    return this.logger.debug(this._logPrefix(t3), "Ignored ".concat(_o(e3, n2, o2), " event because ignoreEventsFilter rejected it.")), mo;
  } }, { key: "handleKeyPress", value: function(e3, t3, n2, o2) {
    var i2 = go(e3), r2 = this.getCurrentCombination();
    if (r2.isKeyPressSimulated(i2))
      return this.logger.debug(this._logPrefix(n2), "Ignored ".concat(_o(e3, i2, Kt.keypress), " as it was not expected, and has already been simulated.")), this.eventPropagator.ignoreEvent(e3), true;
    if (this.eventPropagator.startNewPropagationStep(n2, e3, i2, Kt.keypress)) {
      var s2 = t3 !== this.focusTreeId, a2 = this._howToHandleKeyEvent(e3, t3, n2, i2, o2, Kt.keypress);
      return this.eventPropagator.isFirstPropagationStep(n2) && r2.isKeyIncluded(i2) && this._addToAndLogCurrentKeyCombination(i2, Kt.keypress, t3, n2, so(e3)), a2 === Ko && this._callHandlerIfActionNotHandled(e3, i2, Kt.keypress, n2, t3), this.eventPropagator.finishPropagationStep(), s2;
    }
  } }, { key: "handleKeyUp", value: function(e3, t3, n2, o2) {
    var i2 = go(e3), r2 = this.getCurrentCombination();
    if (r2.isKeyUpSimulated(i2))
      return this.logger.debug(this._logPrefix(n2), "Ignored ".concat(_o(e3, i2, Kt.keyup), " as it was not expected, and has already been simulated.")), this.eventPropagator.ignoreEvent(e3), true;
    if (this.eventPropagator.startNewPropagationStep(n2, e3, i2, Kt.keyup)) {
      var s2 = t3 !== this.focusTreeId, a2 = this._howToHandleKeyEvent(e3, t3, n2, i2, o2, Kt.keyup);
      return this.eventPropagator.isFirstPropagationStep(n2) && r2.isKeyIncluded(i2) && this._addToAndLogCurrentKeyCombination(i2, Kt.keyup, t3, n2, so(e3)), a2 === Ko && this._callHandlerIfActionNotHandled(e3, i2, Kt.keyup, n2, t3), this._simulateKeyUpEventsHiddenByCmd(e3, i2, t3, n2, o2), this.eventPropagator.finishPropagationStep(), s2;
    }
  } }, { key: "closeHangingKeyCombination", value: function(e3, t3) {
    var n2 = this.getCurrentCombination();
    n2.isKeyIncluded(e3) && !n2.isEventTriggered(e3, t3) && n2.setKeyState(e3, t3, pn);
  } }, { key: "_simulateKeyPressForNonPrintableKeys", value: function(e3, t3, n2, o2, i2) {
    this._handleEventSimulation("keypressEventsToSimulate", "simulatePendingKeyPressEvents", this._shouldSimulate(Kt.keypress, t3), { event: e3, key: t3, focusTreeId: n2, componentId: o2, options: i2 });
  } }, { key: "_simulateKeyUpEventsHiddenByCmd", value: function(e3, t3, n2, o2, i2) {
    var r2 = this;
    vo(t3) && this.getCurrentCombination().forEachKey(function(t4) {
      vo(t4) || r2._handleEventSimulation("keyupEventsToSimulate", "simulatePendingKeyUpEvents", r2._shouldSimulate(Kt.keyup, t4), { event: e3, key: t4, focusTreeId: n2, componentId: o2, options: i2 });
    });
  } }, { key: "_stopEventPropagation", value: function(e3, t3) {
    this.eventPropagator.stop(e3) && this.logger.debug(this._logPrefix(t3), "Stopping further event propagation.");
  } }, { key: "getEventPropagator", value: function() {
    return this.eventPropagator;
  } }, { key: "_startAndLogNewKeyCombination", value: function(e3, t3, n2, o2) {
    this.getKeyHistory().startNewKeyCombination(e3, o2), this.logger.verbose(this._logPrefix(n2, { focusTreeId: t3 }), "Started a new combination with '".concat(e3, "'.")), this.logger.verbose(this._logPrefix(n2, { focusTreeId: t3 }), "Key history: ".concat(io(this.getKeyHistory().toJSON()), "."));
  } }, { key: "_addToAndLogCurrentKeyCombination", value: function(e3, t3, n2, o2, i2) {
    this.getKeyHistory().addKeyToCurrentCombination(e3, t3, i2), t3 === Kt.keydown && this.logger.verbose(this._logPrefix(o2, { focusTreeId: n2 }), "Added '".concat(e3, "' to current combination: '").concat(this.getCurrentCombination().describe(), "'.")), this.logger.verbose(this._logPrefix(o2, { focusTreeId: n2 }), "Key history: ".concat(io(this.getKeyHistory().toJSON()), "."));
  } }, { key: "_handleEventSimulation", value: function(e3, t3, n2, o2) {
    var i2 = o2.event, r2 = o2.key, s2 = o2.focusTreeId, a2 = o2.componentId, u2 = o2.options;
    if (n2 && _t.option("simulateMissingKeyPressEvents")) {
      var c2 = this._cloneAndMergeEvent(i2, { key: r2, simulated: true });
      this[e3].push({ event: c2, focusTreeId: s2, componentId: a2, options: u2 });
    }
    (this.componentList.isRoot(a2) || this.eventPropagator.isStopped()) && (this.keyEventManager.isGlobalListenersBound() || this[t3]());
  } }, { key: "simulatePendingKeyPressEvents", value: function() {
    this._simulatePendingKeyEvents("keypressEventsToSimulate", "handleKeyPress");
  } }, { key: "simulatePendingKeyUpEvents", value: function() {
    this._simulatePendingKeyEvents("keyupEventsToSimulate", "handleKeyUp");
  } }, { key: "_simulatePendingKeyEvents", value: function(e3, t3) {
    var n2 = this;
    this[e3].length > 0 && fo.incrementId(), this[e3].forEach(function(e4) {
      var o2 = e4.event, i2 = e4.focusTreeId, r2 = e4.componentId, s2 = e4.options;
      n2[t3](o2, i2, r2, s2);
    }), this[e3] = [];
  } }, { key: "_callHandlerIfActionNotHandled", value: function(e3, t3, n2, o2, i2) {
    var r2 = oo(n2), s2 = this.getCurrentCombination().describe();
    if (this.componentList.anyActionsForEventType(n2))
      if (this.eventPropagator.isHandled())
        this.logger.debug(this._logPrefix(o2, { focusTreeId: i2 }), "Ignored '".concat(s2, "' ").concat(r2, " as it has already been handled."));
      else {
        this.logger.verbose(this._logPrefix(o2, { focusTreeId: i2 }), "Attempting to find action matching '".concat(s2, "' ").concat(r2, " . . ."));
        var a2 = this.eventPropagator.getPreviousPosition(), u2 = this.componentList.getIndexById(o2);
        this._callClosestMatchingHandler(e3, t3, n2, u2, -1 === a2 ? 0 : a2) && this.eventPropagator.setHandled();
      }
    else
      this.logger.verbose(this._logPrefix(o2, { focusTreeId: i2 }), "Ignored '".concat(s2, "' ").concat(r2, " because it doesn't have any ").concat(r2, " handlers."));
  } }, { key: "_logPrefix", value: function(e3) {
    var t3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}, n2 = kt.logIcons, o2 = kt.eventIcons, i2 = kt.componentIcons, r2 = "HotKeys (";
    if (false !== t3.focusTreeId) {
      var s2 = hn(t3.focusTreeId) ? this.focusTreeId : t3.focusTreeId;
      r2 += "F".concat(s2).concat(n2[s2 % n2.length], "-");
    }
    if (false !== t3.eventId) {
      var a2 = hn(t3.eventId) ? fo.getId() : t3.eventId;
      r2 += "E".concat(a2).concat(o2[a2 % o2.length], "-");
    }
    r2 += "C".concat(e3).concat(i2[e3 % i2.length]);
    var u2 = this.componentList.getIndexById(e3);
    return hn(u2) || (r2 += "-P".concat(u2).concat(i2[u2 % i2.length], ":")), "".concat(r2, ")");
  } }]), t2;
}();
function jo(e2, t2) {
  var n2 = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {};
  return Array.isArray(e2) || jt(e2) ? n2.stringifyFirst ? !hn(e2.find(function(e3) {
    return e3.toString() === t2.toString();
  })) : -1 !== e2.indexOf(t2) : bn(e2) ? St(e2, t2) : n2.stringifyFirst ? e2.toString() === t2.toString() : e2 === t2;
}
function Mo(e2) {
  return e2.replace(/\b\w/g, function(e3) {
    return e3.toUpperCase();
  });
}
function xo(e2) {
  return "".concat(Mo(e2.slice(0, 3))).concat(Mo(e2.slice(3)));
}
function Ao(e2) {
  return Ao = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(e3) {
    return typeof e3;
  } : function(e3) {
    return e3 && "function" == typeof Symbol && e3.constructor === Symbol && e3 !== Symbol.prototype ? "symbol" : typeof e3;
  }, Ao(e2);
}
function Lo(e2, t2, n2) {
  return t2 && function(e3, t3) {
    for (var n3 = 0; n3 < t3.length; n3++) {
      var o2 = t3[n3];
      o2.enumerable = o2.enumerable || false, o2.configurable = true, "value" in o2 && (o2.writable = true), Object.defineProperty(e3, o2.key, o2);
    }
  }(e2.prototype, t2), e2;
}
function Do(e2, t2) {
  return !t2 || "object" !== Ao(t2) && "function" != typeof t2 ? function(e3) {
    if (void 0 === e3)
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    return e3;
  }(e2) : t2;
}
function Fo(e2, t2, n2) {
  return Fo = "undefined" != typeof Reflect && Reflect.get ? Reflect.get : function(e3, t3, n3) {
    var o2 = function(e4, t4) {
      for (; !Object.prototype.hasOwnProperty.call(e4, t4) && null !== (e4 = Ro(e4)); )
        ;
      return e4;
    }(e3, t3);
    if (o2) {
      var i2 = Object.getOwnPropertyDescriptor(o2, t3);
      return i2.get ? i2.get.call(n3) : i2.value;
    }
  }, Fo(e2, t2, n2 || e2);
}
function Ro(e2) {
  return Ro = Object.setPrototypeOf ? Object.getPrototypeOf : function(e3) {
    return e3.__proto__ || Object.getPrototypeOf(e3);
  }, Ro(e2);
}
function qo(e2, t2) {
  return qo = Object.setPrototypeOf || function(e3, t3) {
    return e3.__proto__ = t3, e3;
  }, qo(e2, t2);
}
var No = function(e2) {
  function t2() {
    var e3, n2 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {}, o2 = arguments.length > 1 ? arguments[1] : void 0;
    return function(e4, t3) {
      if (!(e4 instanceof t3))
        throw new TypeError("Cannot call a class as a function");
    }(this, t2), (e3 = Do(this, Ro(t2).call(this, n2, o2))).listenersBound = false, e3.eventOptions = { ignoreEventsCondition: _t.option("ignoreEventsCondition") }, e3.listeners = {}, e3;
  }
  return function(e3, t3) {
    if ("function" != typeof t3 && null !== t3)
      throw new TypeError("Super expression must either be null or a function");
    e3.prototype = Object.create(t3 && t3.prototype, { constructor: { value: e3, writable: true, configurable: true } }), t3 && qo(e3, t3);
  }(t2, yo), Lo(t2, [{ key: "enableHotKeys", value: function(e3) {
    var t3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}, n2 = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {}, o2 = arguments.length > 3 ? arguments[3] : void 0, i2 = arguments.length > 4 ? arguments[4] : void 0;
    this.eventOptions = i2, this._addComponent(e3, t3, n2, o2), this._updateDocumentHandlers(), this._initHandlerResolutionState(), this.logger.debug(this._logPrefix(e3, { eventId: false }), "Mounted."), this.logger.verbose(this._logPrefix(e3, { eventId: false }), "Component options: \n", io(this.componentList.get(e3)));
  } }, { key: "updateEnabledHotKeys", value: function(e3) {
    var t3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}, n2 = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {}, o2 = arguments.length > 3 ? arguments[3] : void 0, i2 = arguments.length > 4 ? arguments[4] : void 0;
    this.eventOptions = i2, this.componentList.update(e3, t3, n2, o2), this.getKeyHistory().setMaxLength(this.componentList.getLongestSequence()), this._updateDocumentHandlers(), this._initHandlerResolutionState(), this.logger.debug(this._logPrefix(e3, { eventId: false }), "Global component ".concat(e3, " updated.")), this.logger.verbose(this._logPrefix(e3, { eventId: false }), "Component options: \n", io(this.componentList.get(e3)));
  } }, { key: "disableHotKeys", value: function(e3) {
    this.componentList.remove(e3), this.getKeyHistory().setMaxLength(this.componentList.getLongestSequence()), this._updateDocumentHandlers(), this._initHandlerResolutionState(), this.logger.debug(this._logPrefix(e3, { eventId: false }), "Unmounted global component ".concat(e3));
  } }, { key: "_updateDocumentHandlers", value: function() {
    var e3 = this, t3 = this._listenersShouldBeBound();
    !this.listenersBound && t3 ? (Object.values(Kt).forEach(function(t4) {
      var n2 = oo(t4);
      document["on".concat(n2)] = function(t5) {
        e3.keyEventManager["handleGlobal".concat(xo(n2))](t5);
      }, e3.logger.debug(e3._logPrefix(e3.componentId, { eventId: false }), "Bound handler handleGlobal".concat(xo(n2), "() to document.on").concat(n2, "()"));
    }), this.listenersBound = true) : this.listenersBound && !t3 && (Object.values(Kt).forEach(function(t4) {
      var n2 = oo(t4);
      delete document["on".concat(n2)], e3.logger.debug(e3._logPrefix(e3.componentId, { eventId: false }), "Removed handler handleGlobal".concat(xo(n2), "() from document.on").concat(n2, "()"));
    }), this.listenersBound = false);
  } }, { key: "_listenersShouldBeBound", value: function() {
    return this.componentList.any() || this.listeners.keyCombination;
  } }, { key: "handleKeydown", value: function(e3) {
    var t3 = go(e3);
    if (e3.repeat && _t.option("ignoreRepeatedEventsWhenKeyHeldDown"))
      return this.logger.debug(this._logPrefix(), "Ignored repeated ".concat(_o(e3, t3, Kt.keydown), " event.")), true;
    this._checkForModifierFlagDiscrepancies(e3, t3, Kt.keydown);
    var n2 = this._howReactAppRespondedTo(e3, t3, Kt.keydown);
    if (n2 === bo && this.eventOptions.ignoreEventsCondition(e3))
      this.logger.debug(this._logPrefix(), "Ignored ".concat(_o(e3, t3, Kt.keydown), " event because ignoreEventsFilter rejected it."));
    else {
      if (n2 !== mo) {
        var o2 = so(e3), i2 = this.getCurrentCombination();
        i2.isKeyIncluded(t3) || i2.isEnding() ? this._startAndLogNewKeyCombination(t3, o2) : this._addToAndLogCurrentKeyCombination(t3, Kt.keydown, o2);
      }
      jo([mo, Ko], n2) || this._callHandlerIfExists(e3, t3, Kt.keydown), this._simulateKeyPressForNonPrintableKeys(e3, t3);
    }
  } }, { key: "_howReactAppRespondedTo", value: function(e3, t3, n2) {
    var o2 = this.keyEventManager.reactAppHistoryWithEvent(t3, n2);
    switch (o2) {
      case Ko:
        this.logger.debug(this._logPrefix(), "Ignored ".concat(_o(e3, t3, n2), " event because React app has already handled it."));
        break;
      case mo:
        this.logger.debug(this._logPrefix(), "Ignored ".concat(_o(e3, t3, n2), " event because React app has declared it should be ignored."));
        break;
      case ko:
        this.logger.debug(this._logPrefix(), "Received ".concat(_o(e3, t3, n2), " event (that has already passed through React app)."));
        break;
      default:
        fo.incrementId(), this.logger.debug(this._logPrefix(), "New ".concat(_o(e3, t3, n2), " event (that has NOT passed through React app)."));
    }
    return o2;
  } }, { key: "handleKeyPress", value: function(e3) {
    var t3 = go(e3);
    if (e3.repeat && _t.option("ignoreRepeatedEventsWhenKeyHeldDown"))
      return this.logger.debug(this._logPrefix(), "Ignored repeated ".concat(_o(e3, t3, Kt.keypress), " event.")), true;
    var n2 = this.getCurrentCombination();
    if (n2.isKeyPressSimulated(t3))
      return this.logger.debug(this._logPrefix(), "Ignored ".concat(_o(e3, t3, Kt.keypress), " as it was not expected, and has already been simulated.")), true;
    var o2 = this._howReactAppRespondedTo(e3, t3, Kt.keypress);
    n2.isKeyIncluded(t3) && this._addToAndLogCurrentKeyCombination(t3, Kt.keypress, so(e3)), o2 === bo && (this.keyEventManager.closeHangingKeyCombination(t3, Kt.keypress), this.eventOptions.ignoreEventsCondition(e3)) ? this.logger.debug(this._logPrefix(), "Ignored ".concat(_o(e3, t3, Kt.keypress), " event because ignoreEventsFilter rejected it.")) : jo([mo, Ko], o2) || this._callHandlerIfExists(e3, t3, Kt.keypress);
  } }, { key: "handleKeyUp", value: function(e3) {
    var t3 = go(e3), n2 = this.getCurrentCombination();
    if (n2.isKeyUpSimulated(t3))
      return this.logger.debug(this._logPrefix(), "Ignored ".concat(_o(e3, t3, Kt.keyup), " as it was not expected, and has already been simulated.")), true;
    var o2 = this._howReactAppRespondedTo(e3, t3, Kt.keyup);
    n2.isKeyIncluded(t3) && this._addToAndLogCurrentKeyCombination(t3, Kt.keyup, so(e3)), o2 === bo ? (this.keyEventManager.closeHangingKeyCombination(t3, Kt.keyup), this.eventOptions.ignoreEventsCondition(e3) ? this.logger.debug(this._logPrefix(), "Ignored ".concat(_o(e3, t3, Kt.keyup), " event because ignoreEventsFilter rejected it.")) : jo([mo, Ko], o2) || this._callHandlerIfExists(e3, t3, Kt.keyup)) : jo([mo, Ko], o2) || this._callHandlerIfExists(e3, t3, Kt.keyup), this._simulateKeyUpEventsHiddenByCmd(e3, t3), this.listeners.keyCombination && this._allKeysAreReleased() && this.listeners.keyCombination({ keys: n2.getKeyDictionary(), id: n2.describe() });
  } }, { key: "_simulateKeyPressForNonPrintableKeys", value: function(e3, t3) {
    this.keyEventManager.simulatePendingKeyPressEvents(), this._handleEventSimulation("handleKeyPress", this._shouldSimulate(Kt.keypress, t3), { event: e3, key: t3 });
  } }, { key: "_simulateKeyUpEventsHiddenByCmd", value: function(e3, t3) {
    var n2 = this;
    vo(t3) && (this.keyEventManager.simulatePendingKeyUpEvents(), this.getCurrentCombination().forEachKey(function(t4) {
      vo(t4) || n2._handleEventSimulation("handleKeyUp", n2._shouldSimulate(Kt.keyup, t4), { event: e3, key: t4 });
    }));
  } }, { key: "_startAndLogNewKeyCombination", value: function(e3, t3) {
    this.getKeyHistory().startNewKeyCombination(e3, t3), this.logger.verbose(this._logPrefix(), "Started a new combination with '".concat(e3, "'.")), this.logger.verbose(this._logPrefix(), "Key history: ".concat(io(this.getKeyHistory().toJSON()), "."));
  } }, { key: "_addToAndLogCurrentKeyCombination", value: function(e3, t3, n2) {
    this.getKeyHistory().addKeyToCurrentCombination(e3, t3, n2), t3 === Kt.keydown && this.logger.verbose(this._logPrefix(), "Added '".concat(e3, "' to current combination: '").concat(this.getCurrentCombination().describe(), "'.")), this.logger.verbose(this._logPrefix(), "Key history: ".concat(io(this.getKeyHistory().toJSON()), "."));
  } }, { key: "_handleEventSimulation", value: function(e3, t3, n2) {
    var o2 = n2.event, i2 = n2.key;
    if (t3 && _t.option("simulateMissingKeyPressEvents")) {
      var r2 = this._cloneAndMergeEvent(o2, { key: i2, simulated: true });
      this[e3](r2);
    }
  } }, { key: "_callHandlerIfExists", value: function(e3, t3, n2) {
    var o2 = oo(n2), i2 = this.getCurrentCombination().describe();
    this.componentList.anyActionsForEventType(n2) ? (this.logger.verbose(this._logPrefix(), "Attempting to find action matching '".concat(i2, "' ").concat(o2, " . . .")), this._callClosestMatchingHandler(e3, t3, n2)) : this.logger.debug(this._logPrefix(), "Ignored '".concat(i2, "' ").concat(o2, " because it doesn't have any ").concat(o2, " handlers."));
  } }, { key: "_callClosestMatchingHandler", value: function(e3, n2, o2) {
    for (var i2 = this.componentList.getNewIterator(); i2.next(); ) {
      if (Fo(Ro(t2.prototype), "_callClosestMatchingHandler", this).call(this, e3, n2, o2, i2.getPosition(), 0))
        return void this.logger.debug(this._logPrefix(), "Searching no further, as handler has been found (and called).");
    }
  } }, { key: "_stopEventPropagation", value: function(e3, t3) {
    this.logger.debug(this._logPrefix(t3), "Stopping further event propagation."), e3.simulated || e3.stopPropagation();
  } }, { key: "addKeyCombinationListener", value: function(e3) {
    var t3 = this, n2 = function() {
      delete t3.listeners.keyCombination;
    };
    return this.listeners.keyCombination = function(t4) {
      e3(t4), n2();
    }, this._updateDocumentHandlers(), n2;
  } }, { key: "_logPrefix", value: function(e3) {
    var t3 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}, n2 = kt.eventIcons, o2 = kt.componentIcons, i2 = "HotKeys (GLOBAL";
    if (false !== t3.eventId) {
      var r2 = hn(t3.eventId) ? fo.getId() : t3.eventId;
      i2 = "".concat(i2, "-E").concat(r2).concat(n2[r2 % n2.length]);
    }
    return hn(e3) ? "".concat(i2, "):") : "".concat(i2, "-C").concat(e3).concat(o2[e3 % o2.length], "):");
  } }]), t2;
}();
function Uo(e2) {
  return !hn(e2);
}
function Bo(e2, t2) {
  for (var n2 = 0; n2 < t2.length; n2++) {
    var o2 = t2[n2];
    o2.enumerable = o2.enumerable || false, o2.configurable = true, "value" in o2 && (o2.writable = true), Object.defineProperty(e2, o2.key, o2);
  }
}
function Go(e2, t2, n2) {
  return t2 && Bo(e2.prototype, t2), n2 && Bo(e2, n2), e2;
}
var zo = function() {
  function e2() {
    var t2 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
    !function(e3, t3) {
      if (!(e3 instanceof t3))
        throw new TypeError("Cannot call a class as a function");
    }(this, e2), this.logger = t2.logger || new kt(_t.option("logLevel")), this._focusOnlyEventStrategy = new Ho({ configuration: t2, logger: this.logger }, this), this._globalEventStrategy = new No({ configuration: t2, logger: this.logger }, this), this.mountedComponentsCount = 0;
  }
  return Go(e2, null, [{ key: "getInstance", value: function() {
    var t2 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
    return this.instance || (this.instance = new e2(t2)), this.instance;
  } }, { key: "clear", value: function() {
    delete this.instance;
  } }]), Go(e2, [{ key: "getApplicationKeyMap", value: function() {
    return Object.assign(this._globalEventStrategy.getApplicationKeyMap(), this._focusOnlyEventStrategy.getApplicationKeyMap());
  } }, { key: "registerKeyMap", value: function() {
    var e3 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
    return this._focusOnlyEventStrategy.registerKeyMap(e3);
  } }, { key: "reregisterKeyMap", value: function(e3) {
    var t2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
    this._focusOnlyEventStrategy.reregisterKeyMap(e3, t2);
  } }, { key: "deregisterKeyMap", value: function(e3) {
    this._focusOnlyEventStrategy.deregisterKeyMap(e3);
  } }, { key: "registerComponentMount", value: function(e3, t2) {
    return this._incrementComponentCount(), this._focusOnlyEventStrategy.registerComponentMount(e3, t2);
  } }, { key: "registerComponentUnmount", value: function() {
    this._decrementComponentCount();
  } }, { key: "_incrementComponentCount", value: function() {
    var e3 = this, t2 = this.mountedComponentsCount;
    this.mountedComponentsCount += 1, 0 === t2 && 1 === this.mountedComponentsCount && (window.onblur = function() {
      return e3._clearKeyHistory();
    });
  } }, { key: "_decrementComponentCount", value: function() {
    var e3 = this.mountedComponentsCount;
    this.mountedComponentsCount -= 1, 1 === e3 && 0 === this.mountedComponentsCount && delete window.onblur;
  } }, { key: "_clearKeyHistory", value: function() {
    this.logger.info("HotKeys: Window focused - clearing key history"), this._focusOnlyEventStrategy.resetKeyHistory({ force: true }), this._globalEventStrategy.resetKeyHistory({ force: true });
  } }, { key: "registerGlobalKeyMap", value: function() {
    var e3 = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
    return this._globalEventStrategy.registerKeyMap(e3);
  } }, { key: "registerGlobalComponentUnmount", value: function() {
    this._decrementComponentCount();
  } }, { key: "registerGlobalComponentMount", value: function(e3, t2) {
    return this._incrementComponentCount(), this._globalEventStrategy.registerComponentMount(e3, t2);
  } }, { key: "reregisterGlobalKeyMap", value: function(e3, t2) {
    this._globalEventStrategy.reregisterKeyMap(e3, t2);
  } }, { key: "deregisterGlobalKeyMap", value: function(e3) {
    this._globalEventStrategy.deregisterKeyMap(e3);
  } }, { key: "addKeyCombinationListener", value: function(e3) {
    return this._globalEventStrategy.addKeyCombinationListener(e3);
  } }, { key: "enableHotKeys", value: function(e3) {
    var t2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}, n2 = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {}, o2 = arguments.length > 3 ? arguments[3] : void 0;
    return this._focusOnlyEventStrategy.enableHotKeys(e3, t2, n2, o2);
  } }, { key: "updateEnabledHotKeys", value: function(e3, t2) {
    var n2 = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {}, o2 = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : {}, i2 = arguments.length > 4 ? arguments[4] : void 0;
    return this._focusOnlyEventStrategy.updateEnabledHotKeys(e3, t2, n2, o2, i2);
  } }, { key: "disableHotKeys", value: function(e3, t2) {
    return this._focusOnlyEventStrategy.disableHotKeys(e3, t2);
  } }, { key: "handleKeydown", value: function(e3, t2, n2, o2) {
    if (Uo(t2))
      return this._focusOnlyEventStrategy.handleKeydown(e3, t2, n2, o2);
  } }, { key: "handleKeyPress", value: function(e3, t2, n2, o2) {
    if (Uo(t2))
      return this._focusOnlyEventStrategy.handleKeyPress(e3, t2, n2, o2);
  } }, { key: "handleKeyUp", value: function(e3, t2, n2, o2) {
    if (Uo(t2))
      return this._focusOnlyEventStrategy.handleKeyUp(e3, t2, n2, o2);
  } }, { key: "enableGlobalHotKeys", value: function(e3) {
    var t2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}, n2 = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {}, o2 = arguments.length > 3 ? arguments[3] : void 0, i2 = arguments.length > 4 ? arguments[4] : void 0;
    return this._globalEventStrategy.enableHotKeys(e3, t2, n2, o2, i2);
  } }, { key: "updateEnabledGlobalHotKeys", value: function(e3) {
    var t2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {}, n2 = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {}, o2 = arguments.length > 3 ? arguments[3] : void 0, i2 = arguments.length > 4 ? arguments[4] : void 0;
    return this._globalEventStrategy.updateEnabledHotKeys(e3, t2, n2, o2, i2);
  } }, { key: "disableGlobalHotKeys", value: function(e3) {
    return this._globalEventStrategy.disableHotKeys(e3);
  } }, { key: "handleGlobalKeyDown", value: function(e3) {
    return this._globalEventStrategy.handleKeydown(e3);
  } }, { key: "handleGlobalKeyPress", value: function(e3) {
    return this._globalEventStrategy.handleKeyPress(e3);
  } }, { key: "handleGlobalKeyUp", value: function(e3) {
    return this._globalEventStrategy.handleKeyUp(e3);
  } }, { key: "ignoreEvent", value: function(e3) {
    this._focusOnlyEventStrategy.getEventPropagator().ignoreEvent(e3);
  } }, { key: "observeIgnoredEvents", value: function(e3) {
    this._focusOnlyEventStrategy.getEventPropagator().observeIgnoredEvents(e3);
  } }, { key: "closeHangingKeyCombination", value: function(e3, t2) {
    this._focusOnlyEventStrategy.closeHangingKeyCombination(e3, t2);
  } }, { key: "reactAppHistoryWithEvent", value: function(e3, t2) {
    var n2 = this._focusOnlyEventStrategy.eventPropagator.getPreviousPropagation();
    return n2.isForKey(e3) && n2.isForEventType(t2) ? n2.isHandled() ? Ko : n2.isIgnoringEvent() ? mo : ko : bo;
  } }, { key: "simulatePendingKeyPressEvents", value: function() {
    this._focusOnlyEventStrategy.simulatePendingKeyPressEvents();
  } }, { key: "simulatePendingKeyUpEvents", value: function() {
    this._focusOnlyEventStrategy.simulatePendingKeyUpEvents();
  } }, { key: "isGlobalListenersBound", value: function() {
    return this._globalEventStrategy.listenersBound;
  } }]), e2;
}();
function Wo(t2, n2) {
  var o2 = n2.deprecatedAPI, i2 = o2.contextTypes, r2 = o2.childContextTypes, s2 = n2.newAPI.contextType;
  if (void 0 === e.createContext)
    t2.contextTypes = i2, t2.childContextTypes = r2, t2.prototype.getChildContext = function() {
      return this._childContext;
    };
  else {
    var a2 = e.createContext(s2);
    t2.contextType = a2, t2.prototype._originalRender = t2.prototype.render, t2.prototype.render = function() {
      var t3 = this._originalRender();
      return t3 ? e.createElement(a2.Provider, { value: this._childContext }, t3) : null;
    };
  }
  return t2;
}
function Jo(e2) {
  return Jo = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(e3) {
    return typeof e3;
  } : function(e3) {
    return e3 && "function" == typeof Symbol && e3.constructor === Symbol && e3 !== Symbol.prototype ? "symbol" : typeof e3;
  }, Jo(e2);
}
function Vo() {
  return Vo = Object.assign || function(e2) {
    for (var t2 = 1; t2 < arguments.length; t2++) {
      var n2 = arguments[t2];
      for (var o2 in n2)
        Object.prototype.hasOwnProperty.call(n2, o2) && (e2[o2] = n2[o2]);
    }
    return e2;
  }, Vo.apply(this, arguments);
}
function $o(e2, t2) {
  if (null == e2)
    return {};
  var n2, o2, i2 = function(e3, t3) {
    if (null == e3)
      return {};
    var n3, o3, i3 = {}, r3 = Object.keys(e3);
    for (o3 = 0; o3 < r3.length; o3++)
      n3 = r3[o3], t3.indexOf(n3) >= 0 || (i3[n3] = e3[n3]);
    return i3;
  }(e2, t2);
  if (Object.getOwnPropertySymbols) {
    var r2 = Object.getOwnPropertySymbols(e2);
    for (o2 = 0; o2 < r2.length; o2++)
      n2 = r2[o2], t2.indexOf(n2) >= 0 || Object.prototype.propertyIsEnumerable.call(e2, n2) && (i2[n2] = e2[n2]);
  }
  return i2;
}
function Yo(e2, t2, n2) {
  return t2 && function(e3, t3) {
    for (var n3 = 0; n3 < t3.length; n3++) {
      var o2 = t3[n3];
      o2.enumerable = o2.enumerable || false, o2.configurable = true, "value" in o2 && (o2.writable = true), Object.defineProperty(e3, o2.key, o2);
    }
  }(e2.prototype, t2), e2;
}
function Qo(e2) {
  return Qo = Object.setPrototypeOf ? Object.getPrototypeOf : function(e3) {
    return e3.__proto__ || Object.getPrototypeOf(e3);
  }, Qo(e2);
}
function Xo(e2, t2) {
  return Xo = Object.setPrototypeOf || function(e3, t3) {
    return e3.__proto__ = t3, e3;
  }, Xo(e2, t2);
}
function Zo(e2) {
  if (void 0 === e2)
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  return e2;
}
function ei(e2, t2, n2) {
  return t2 in e2 ? Object.defineProperty(e2, t2, { value: n2, enumerable: true, configurable: true, writable: true }) : e2[t2] = n2, e2;
}
function ti(e2) {
  return ti = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(e3) {
    return typeof e3;
  } : function(e3) {
    return e3 && "function" == typeof Symbol && e3.constructor === Symbol && e3 !== Symbol.prototype ? "symbol" : typeof e3;
  }, ti(e2);
}
function ni(e2, t2, n2) {
  return t2 in e2 ? Object.defineProperty(e2, t2, { value: n2, enumerable: true, configurable: true, writable: true }) : e2[t2] = n2, e2;
}
function oi(e2, t2) {
  if (null == e2)
    return {};
  var n2, o2, i2 = function(e3, t3) {
    if (null == e3)
      return {};
    var n3, o3, i3 = {}, r3 = Object.keys(e3);
    for (o3 = 0; o3 < r3.length; o3++)
      n3 = r3[o3], t3.indexOf(n3) >= 0 || (i3[n3] = e3[n3]);
    return i3;
  }(e2, t2);
  if (Object.getOwnPropertySymbols) {
    var r2 = Object.getOwnPropertySymbols(e2);
    for (o2 = 0; o2 < r2.length; o2++)
      n2 = r2[o2], t2.indexOf(n2) >= 0 || Object.prototype.propertyIsEnumerable.call(e2, n2) && (i2[n2] = e2[n2]);
  }
  return i2;
}
function ii(e2, t2, n2) {
  return t2 && function(e3, t3) {
    for (var n3 = 0; n3 < t3.length; n3++) {
      var o2 = t3[n3];
      o2.enumerable = o2.enumerable || false, o2.configurable = true, "value" in o2 && (o2.writable = true), Object.defineProperty(e3, o2.key, o2);
    }
  }(e2.prototype, t2), e2;
}
function ri(e2, t2) {
  return !t2 || "object" !== ti(t2) && "function" != typeof t2 ? function(e3) {
    if (void 0 === e3)
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    return e3;
  }(e2) : t2;
}
function si(e2) {
  return si = Object.setPrototypeOf ? Object.getPrototypeOf : function(e3) {
    return e3.__proto__ || Object.getPrototypeOf(e3);
  }, si(e2);
}
function ai(e2, t2) {
  return ai = Object.setPrototypeOf || function(e3, t3) {
    return e3.__proto__ = t3, e3;
  }, ai(e2, t2);
}
var ui = function(t2) {
  function o2() {
    return function(e2, t3) {
      if (!(e2 instanceof t3))
        throw new TypeError("Cannot call a class as a function");
    }(this, o2), ri(this, si(o2).apply(this, arguments));
  }
  return function(e2, t3) {
    if ("function" != typeof t3 && null !== t3)
      throw new TypeError("Super expression must either be null or a function");
    e2.prototype = Object.create(t3 && t3.prototype, { constructor: { value: e2, writable: true, configurable: true } }), t3 && ai(e2, t3);
  }(o2, n), ii(o2, [{ key: "render", value: function() {
    var t3 = this.props, n2 = t3.hotKeys, o3 = t3.innerRef, i2 = t3.component, r2 = oi(t3, ["hotKeys", "innerRef", "component"]), s2 = i2 || _t.option("defaultComponent");
    return e.createElement(s2, function(e2) {
      for (var t4 = 1; t4 < arguments.length; t4++) {
        var n3 = null != arguments[t4] ? arguments[t4] : {}, o4 = Object.keys(n3);
        "function" == typeof Object.getOwnPropertySymbols && (o4 = o4.concat(Object.getOwnPropertySymbols(n3).filter(function(e3) {
          return Object.getOwnPropertyDescriptor(n3, e3).enumerable;
        }))), o4.forEach(function(t5) {
          ni(e2, t5, n3[t5]);
        });
      }
      return e2;
    }({}, n2, { ref: o3 }, r2));
  } }]), o2;
}(), ci = function(n2) {
  var o2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
  function i2(e2, t2) {
    return function(e3) {
      for (var t3 = 1; t3 < arguments.length; t3++) {
        var n3 = null != arguments[t3] ? arguments[t3] : {}, o3 = Object.keys(n3);
        "function" == typeof Object.getOwnPropertySymbols && (o3 = o3.concat(Object.getOwnPropertySymbols(n3).filter(function(e4) {
          return Object.getOwnPropertyDescriptor(n3, e4).enumerable;
        }))), o3.forEach(function(t4) {
          ei(e3, t4, n3[t4]);
        });
      }
      return e3;
    }({}, o2[e2] || {}, t2[e2] || {});
  }
  function r2(e2) {
    return i2("handlers", e2);
  }
  function s2(e2) {
    return i2("keyMap", e2);
  }
  var a2 = function(o3) {
    function i3(e2) {
      var t2;
      return function(e3, t3) {
        if (!(e3 instanceof t3))
          throw new TypeError("Cannot call a class as a function");
      }(this, i3), (t2 = function(e3, t3) {
        return !t3 || "object" !== Jo(t3) && "function" != typeof t3 ? Zo(e3) : t3;
      }(this, Qo(i3).call(this, e2)))._handleFocus = t2._handleFocus.bind(Zo(Zo(t2))), t2._handleBlur = t2._handleBlur.bind(Zo(Zo(t2))), t2._handleKeyDown = t2._handleKeyDown.bind(Zo(Zo(t2))), t2._handleKeyPress = t2._handleKeyPress.bind(Zo(Zo(t2))), t2._handleKeyUp = t2._handleKeyUp.bind(Zo(Zo(t2))), t2._componentIsFocused = t2._componentIsFocused.bind(Zo(Zo(t2))), t2._id = zo.getInstance().registerKeyMap(e2.keyMap), t2._childContext = { hotKeysParentId: t2._id }, t2;
    }
    return function(e2, t2) {
      if ("function" != typeof t2 && null !== t2)
        throw new TypeError("Super expression must either be null or a function");
      e2.prototype = Object.create(t2 && t2.prototype, { constructor: { value: e2, writable: true, configurable: true } }), t2 && Xo(e2, t2);
    }(i3, t), Yo(i3, [{ key: "render", value: function() {
      var t2 = this.props;
      t2.keyMap, t2.handlers, t2.allowChanges, t2.root;
      var o4 = $o(t2, ["keyMap", "handlers", "allowChanges", "root"]), i4 = { onFocus: this._wrapFunction("onFocus", this._handleFocus), onBlur: this._wrapFunction("onBlur", this._handleBlur), tabIndex: _t.option("defaultTabIndex") };
      return this._shouldBindKeyListeners() && (i4.onKeyDown = this._handleKeyDown, i4.onKeyPress = this._handleKeyPress, i4.onKeyUp = this._handleKeyUp), e.createElement(n2, Vo({ hotKeys: i4 }, o4));
    } }, { key: "_shouldBindKeyListeners", value: function() {
      var e2 = s2(this.props);
      return !mn(e2) || this.props.root || _t.option("enableHardSequences") && this._handlersIncludeHardSequences(e2, r2(this.props));
    } }, { key: "_handlersIncludeHardSequences", value: function(e2, t2) {
      return Object.keys(t2).some(function(t3) {
        return !e2[t3] && cn.isValidKeySerialization(t3);
      });
    } }, { key: "_wrapFunction", value: function(e2, t2) {
      var n3 = this;
      return "function" == typeof this.props[e2] ? function(o4) {
        n3.props[e2](o4), t2(o4);
      } : t2;
    } }, { key: "_focusTreeIdsPush", value: function(e2) {
      this._focusTreeIds || (this._focusTreeIds = []), this._focusTreeIds.push(e2);
    } }, { key: "_focusTreeIdsShift", value: function() {
      this._focusTreeIds && this._focusTreeIds.shift();
    } }, { key: "_getFocusTreeId", value: function() {
      if (this._focusTreeIds)
        return this._focusTreeIds[0];
    } }, { key: "componentDidUpdate", value: function() {
      var e2 = zo.getInstance();
      if (e2.reregisterKeyMap(this._id, this.props.keyMap), this._componentIsFocused() && (this.props.allowChanges || !_t.option("ignoreKeymapAndHandlerChangesByDefault"))) {
        var t2 = this.props, n3 = t2.keyMap, o4 = t2.handlers;
        e2.updateEnabledHotKeys(this._getFocusTreeId(), this._id, n3, o4, this._getComponentOptions());
      }
    } }, { key: "_componentIsFocused", value: function() {
      return true === this._focused;
    } }, { key: "componentDidMount", value: function() {
      var e2 = zo.getInstance(), t2 = this.context.hotKeysParentId;
      e2.registerComponentMount(this._id, t2);
    } }, { key: "_handleFocus", value: function() {
      var e2;
      this.props.onFocus && (e2 = this.props).onFocus.apply(e2, arguments);
      var t2 = zo.getInstance().enableHotKeys(this._id, s2(this.props), r2(this.props), this._getComponentOptions());
      hn(t2) || this._focusTreeIdsPush(t2), this._focused = true;
    } }, { key: "componentWillUnmount", value: function() {
      var e2 = zo.getInstance();
      e2.deregisterKeyMap(this._id), e2.registerComponentUnmount(), this._handleBlur();
    } }, { key: "_handleBlur", value: function() {
      var e2;
      this.props.onBlur && (e2 = this.props).onBlur.apply(e2, arguments);
      zo.getInstance().disableHotKeys(this._getFocusTreeId(), this._id) || this._focusTreeIdsShift(), this._focused = false;
    } }, { key: "_handleKeyDown", value: function(e2) {
      zo.getInstance().handleKeydown(e2, this._getFocusTreeId(), this._id, this._getEventOptions()) && this._focusTreeIdsShift();
    } }, { key: "_handleKeyPress", value: function(e2) {
      zo.getInstance().handleKeyPress(e2, this._getFocusTreeId(), this._id, this._getEventOptions()) && this._focusTreeIdsShift();
    } }, { key: "_handleKeyUp", value: function(e2) {
      zo.getInstance().handleKeyUp(e2, this._getFocusTreeId(), this._id, this._getEventOptions()) && this._focusTreeIdsShift();
    } }, { key: "_getComponentOptions", value: function() {
      return { defaultKeyEvent: _t.option("defaultKeyEvent") };
    } }, { key: "_getEventOptions", value: function() {
      return { ignoreEventsCondition: _t.option("ignoreEventsCondition") };
    } }]), i3;
  }();
  return ei(a2, "propTypes", { keyMap: f.object, handlers: f.object, onFocus: f.func, onBlur: f.func, allowChanges: f.bool, root: f.bool }), Wo(a2, { deprecatedAPI: { contextTypes: { hotKeysParentId: f.number }, childContextTypes: { hotKeysParentId: f.number } }, newAPI: { contextType: { hotKeysParentId: void 0 } } });
}(ui);
function li(e2) {
  return li = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(e3) {
    return typeof e3;
  } : function(e3) {
    return e3 && "function" == typeof Symbol && e3.constructor === Symbol && e3 !== Symbol.prototype ? "symbol" : typeof e3;
  }, li(e2);
}
function yi(e2, t2, n2) {
  return t2 && function(e3, t3) {
    for (var n3 = 0; n3 < t3.length; n3++) {
      var o2 = t3[n3];
      o2.enumerable = o2.enumerable || false, o2.configurable = true, "value" in o2 && (o2.writable = true), Object.defineProperty(e3, o2.key, o2);
    }
  }(e2.prototype, t2), e2;
}
function hi(e2, t2) {
  return !t2 || "object" !== li(t2) && "function" != typeof t2 ? function(e3) {
    if (void 0 === e3)
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    return e3;
  }(e2) : t2;
}
function fi(e2) {
  return fi = Object.setPrototypeOf ? Object.getPrototypeOf : function(e3) {
    return e3.__proto__ || Object.getPrototypeOf(e3);
  }, fi(e2);
}
function di(e2, t2) {
  return di = Object.setPrototypeOf || function(e3, t3) {
    return e3.__proto__ = t3, e3;
  }, di(e2, t2);
}
ci.propTypes = { innerRef: f.oneOfType([f.object, f.func]) };
var pi, gi, vi, _i = function(e2) {
  function t2(e3) {
    var n2;
    return function(e4, t3) {
      if (!(e4 instanceof t3))
        throw new TypeError("Cannot call a class as a function");
    }(this, t2), (n2 = hi(this, fi(t2).call(this, e3)))._id = zo.getInstance().registerGlobalKeyMap(e3.keyMap), n2._childContext = { globalHotKeysParentId: n2._id }, n2;
  }
  return function(e3, t3) {
    if ("function" != typeof t3 && null !== t3)
      throw new TypeError("Super expression must either be null or a function");
    e3.prototype = Object.create(t3 && t3.prototype, { constructor: { value: e3, writable: true, configurable: true } }), t3 && di(e3, t3);
  }(t2, n), yi(t2, [{ key: "render", value: function() {
    return this.props.children || null;
  } }, { key: "componentDidUpdate", value: function() {
    var e3 = zo.getInstance();
    if (e3.reregisterGlobalKeyMap(this._id, this.props.keyMap), this.props.allowChanges || !_t.option("ignoreKeymapAndHandlerChangesByDefault")) {
      var t3 = this.props, n2 = t3.keyMap, o2 = t3.handlers;
      e3.updateEnabledGlobalHotKeys(this._id, n2, o2, this._getComponentOptions(), this._getEventOptions());
    }
  } }, { key: "componentDidMount", value: function() {
    var e3 = this.props, t3 = e3.keyMap, n2 = e3.handlers, o2 = this.context.globalHotKeysParentId, i2 = zo.getInstance();
    i2.registerGlobalComponentMount(this._id, o2), i2.enableGlobalHotKeys(this._id, t3, n2, this._getComponentOptions(), this._getEventOptions());
  } }, { key: "componentWillUnmount", value: function() {
    var e3 = zo.getInstance();
    e3.deregisterGlobalKeyMap(this._id), e3.disableGlobalHotKeys(this._id), e3.registerGlobalComponentUnmount();
  } }, { key: "_getComponentOptions", value: function() {
    return { defaultKeyEvent: _t.option("defaultKeyEvent") };
  } }, { key: "_getEventOptions", value: function() {
    return { ignoreEventsCondition: _t.option("ignoreEventsCondition") };
  } }]), t2;
}();
function bi(e2) {
  return bi = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(e3) {
    return typeof e3;
  } : function(e3) {
    return e3 && "function" == typeof Symbol && e3.constructor === Symbol && e3 !== Symbol.prototype ? "symbol" : typeof e3;
  }, bi(e2);
}
function mi() {
  return mi = Object.assign || function(e2) {
    for (var t2 = 1; t2 < arguments.length; t2++) {
      var n2 = arguments[t2];
      for (var o2 in n2)
        Object.prototype.hasOwnProperty.call(n2, o2) && (e2[o2] = n2[o2]);
    }
    return e2;
  }, mi.apply(this, arguments);
}
function ki(e2, t2) {
  if (null == e2)
    return {};
  var n2, o2, i2 = function(e3, t3) {
    if (null == e3)
      return {};
    var n3, o3, i3 = {}, r3 = Object.keys(e3);
    for (o3 = 0; o3 < r3.length; o3++)
      n3 = r3[o3], t3.indexOf(n3) >= 0 || (i3[n3] = e3[n3]);
    return i3;
  }(e2, t2);
  if (Object.getOwnPropertySymbols) {
    var r2 = Object.getOwnPropertySymbols(e2);
    for (o2 = 0; o2 < r2.length; o2++)
      n2 = r2[o2], t2.indexOf(n2) >= 0 || Object.prototype.propertyIsEnumerable.call(e2, n2) && (i2[n2] = e2[n2]);
  }
  return i2;
}
function Ki(e2, t2, n2) {
  return t2 && function(e3, t3) {
    for (var n3 = 0; n3 < t3.length; n3++) {
      var o2 = t3[n3];
      o2.enumerable = o2.enumerable || false, o2.configurable = true, "value" in o2 && (o2.writable = true), Object.defineProperty(e3, o2.key, o2);
    }
  }(e2.prototype, t2), e2;
}
function Ei(e2) {
  return Ei = Object.setPrototypeOf ? Object.getPrototypeOf : function(e3) {
    return e3.__proto__ || Object.getPrototypeOf(e3);
  }, Ei(e2);
}
function Ci(e2, t2) {
  return Ci = Object.setPrototypeOf || function(e3, t3) {
    return e3.__proto__ = t3, e3;
  }, Ci(e2, t2);
}
function Pi(e2) {
  if (void 0 === e2)
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  return e2;
}
function Si(e2, t2, n2) {
  return t2 in e2 ? Object.defineProperty(e2, t2, { value: n2, enumerable: true, configurable: true, writable: true }) : e2[t2] = n2, e2;
}
function wi(n2) {
  var o2, i2, r2 = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : { only: [], except: [] }, s2 = arguments.length > 2 ? arguments[2] : void 0;
  return i2 = o2 = function(o3) {
    function i3(e2) {
      var t2;
      return function(e3, t3) {
        if (!(e3 instanceof t3))
          throw new TypeError("Cannot call a class as a function");
      }(this, i3), (t2 = function(e3, t3) {
        return !t3 || "object" !== bi(t3) && "function" != typeof t3 ? Pi(e3) : t3;
      }(this, Ei(i3).call(this, e2)))._handleKeyEvent = t2._handleKeyEvent.bind(Pi(Pi(t2))), t2._reloadDictionaries = t2._reloadDictionaries.bind(Pi(Pi(t2))), t2;
    }
    return function(e2, t2) {
      if ("function" != typeof t2 && null !== t2)
        throw new TypeError("Super expression must either be null or a function");
      e2.prototype = Object.create(t2 && t2.prototype, { constructor: { value: e2, writable: true, configurable: true } }), t2 && Ci(e2, t2);
    }(i3, t), Ki(i3, [{ key: "render", value: function() {
      var t2 = this.props;
      t2.only, t2.except;
      var o4 = ki(t2, ["only", "except"]), i4 = { onKeyDown: this._handleKeyEvent, onKeyPress: this._handleKeyEvent, onKeyUp: this._handleKeyEvent, onFocus: this._reloadDictionaries };
      return e.createElement(n2, mi({ hotKeys: i4 }, o4));
    } }, { key: "_reloadDictionaries", value: function() {
      var e2 = this.props, t2 = e2.only, n3 = e2.except;
      this._onlyDict = Oi(t2), this._exceptDict = Oi(n3);
    } }, { key: "_shouldIgnoreEvent", value: function(e2) {
      var t2 = e2.key;
      return mn(this._onlyDict) ? !!mn(this._exceptDict) || !St(this._exceptDict, t2) : mn(this._exceptDict) ? St(this._onlyDict, t2) : St(this._onlyDict, t2) && !St(this._exceptDict, t2);
    } }, { key: "_handleKeyEvent", value: function(e2) {
      this._shouldIgnoreEvent(e2) && zo.getInstance()[s2](e2);
    } }]), i3;
  }(), Si(o2, "propTypes", { only: f.oneOfType([f.string, f.arrayOf(f.string)]), except: f.oneOfType([f.string, f.arrayOf(f.string)]) }), Si(o2, "defaultProps", r2), i2;
}
function Oi(e2) {
  return On(e2).reduce(function(e3, t2) {
    var n2 = At(t2);
    if (!zt(n2))
      throw new Wt(t2);
    return [rn, on, Pt, Tt, en, Zt].forEach(function(t3) {
      e3[t3(n2)] = true;
    }), e3;
  }, {});
}
function Ii(e2) {
  return Ii = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(e3) {
    return typeof e3;
  } : function(e3) {
    return e3 && "function" == typeof Symbol && e3.constructor === Symbol && e3 !== Symbol.prototype ? "symbol" : typeof e3;
  }, Ii(e2);
}
function Ti(e2, t2, n2) {
  return t2 in e2 ? Object.defineProperty(e2, t2, { value: n2, enumerable: true, configurable: true, writable: true }) : e2[t2] = n2, e2;
}
function Hi(e2, t2) {
  if (null == e2)
    return {};
  var n2, o2, i2 = function(e3, t3) {
    if (null == e3)
      return {};
    var n3, o3, i3 = {}, r3 = Object.keys(e3);
    for (o3 = 0; o3 < r3.length; o3++)
      n3 = r3[o3], t3.indexOf(n3) >= 0 || (i3[n3] = e3[n3]);
    return i3;
  }(e2, t2);
  if (Object.getOwnPropertySymbols) {
    var r2 = Object.getOwnPropertySymbols(e2);
    for (o2 = 0; o2 < r2.length; o2++)
      n2 = r2[o2], t2.indexOf(n2) >= 0 || Object.prototype.propertyIsEnumerable.call(e2, n2) && (i2[n2] = e2[n2]);
  }
  return i2;
}
function ji(e2, t2, n2) {
  return t2 && function(e3, t3) {
    for (var n3 = 0; n3 < t3.length; n3++) {
      var o2 = t3[n3];
      o2.enumerable = o2.enumerable || false, o2.configurable = true, "value" in o2 && (o2.writable = true), Object.defineProperty(e3, o2.key, o2);
    }
  }(e2.prototype, t2), e2;
}
function Mi(e2, t2) {
  return !t2 || "object" !== Ii(t2) && "function" != typeof t2 ? function(e3) {
    if (void 0 === e3)
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    return e3;
  }(e2) : t2;
}
function xi(e2) {
  return xi = Object.setPrototypeOf ? Object.getPrototypeOf : function(e3) {
    return e3.__proto__ || Object.getPrototypeOf(e3);
  }, xi(e2);
}
function Ai(e2, t2) {
  return Ai = Object.setPrototypeOf || function(e3, t3) {
    return e3.__proto__ = t3, e3;
  }, Ai(e2, t2);
}
pi = _i, gi = "propTypes", vi = { keyMap: f.object, handlers: f.object, allowChanges: f.bool }, gi in pi ? Object.defineProperty(pi, gi, { value: vi, enumerable: true, configurable: true, writable: true }) : pi[gi] = vi, Wo(_i, { deprecatedAPI: { contextTypes: { globalHotKeysParentId: f.number }, childContextTypes: { globalHotKeysParentId: f.number } }, newAPI: { contextType: { globalHotKeysParentId: void 0 } } });
var Li = function(t2) {
  function o2() {
    return function(e2, t3) {
      if (!(e2 instanceof t3))
        throw new TypeError("Cannot call a class as a function");
    }(this, o2), Mi(this, xi(o2).apply(this, arguments));
  }
  return function(e2, t3) {
    if ("function" != typeof t3 && null !== t3)
      throw new TypeError("Super expression must either be null or a function");
    e2.prototype = Object.create(t3 && t3.prototype, { constructor: { value: e2, writable: true, configurable: true } }), t3 && Ai(e2, t3);
  }(o2, n), ji(o2, [{ key: "render", value: function() {
    var t3 = this.props, n2 = t3.hotKeys, o3 = Hi(t3, ["hotKeys"]), i2 = o3.component || _t.option("defaultComponent");
    return e.createElement(i2, function(e2) {
      for (var t4 = 1; t4 < arguments.length; t4++) {
        var n3 = null != arguments[t4] ? arguments[t4] : {}, o4 = Object.keys(n3);
        "function" == typeof Object.getOwnPropertySymbols && (o4 = o4.concat(Object.getOwnPropertySymbols(n3).filter(function(e3) {
          return Object.getOwnPropertyDescriptor(n3, e3).enumerable;
        }))), o4.forEach(function(t5) {
          Ti(e2, t5, n3[t5]);
        });
      }
      return e2;
    }({}, n2, o3));
  } }]), o2;
}();
function Di(e2) {
  return Di = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(e3) {
    return typeof e3;
  } : function(e3) {
    return e3 && "function" == typeof Symbol && e3.constructor === Symbol && e3 !== Symbol.prototype ? "symbol" : typeof e3;
  }, Di(e2);
}
function Fi(e2, t2, n2) {
  return t2 in e2 ? Object.defineProperty(e2, t2, { value: n2, enumerable: true, configurable: true, writable: true }) : e2[t2] = n2, e2;
}
function Ri(e2, t2) {
  if (null == e2)
    return {};
  var n2, o2, i2 = function(e3, t3) {
    if (null == e3)
      return {};
    var n3, o3, i3 = {}, r3 = Object.keys(e3);
    for (o3 = 0; o3 < r3.length; o3++)
      n3 = r3[o3], t3.indexOf(n3) >= 0 || (i3[n3] = e3[n3]);
    return i3;
  }(e2, t2);
  if (Object.getOwnPropertySymbols) {
    var r2 = Object.getOwnPropertySymbols(e2);
    for (o2 = 0; o2 < r2.length; o2++)
      n2 = r2[o2], t2.indexOf(n2) >= 0 || Object.prototype.propertyIsEnumerable.call(e2, n2) && (i2[n2] = e2[n2]);
  }
  return i2;
}
function qi(e2, t2, n2) {
  return t2 && function(e3, t3) {
    for (var n3 = 0; n3 < t3.length; n3++) {
      var o2 = t3[n3];
      o2.enumerable = o2.enumerable || false, o2.configurable = true, "value" in o2 && (o2.writable = true), Object.defineProperty(e3, o2.key, o2);
    }
  }(e2.prototype, t2), e2;
}
function Ni(e2, t2) {
  return !t2 || "object" !== Di(t2) && "function" != typeof t2 ? function(e3) {
    if (void 0 === e3)
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    return e3;
  }(e2) : t2;
}
function Ui(e2) {
  return Ui = Object.setPrototypeOf ? Object.getPrototypeOf : function(e3) {
    return e3.__proto__ || Object.getPrototypeOf(e3);
  }, Ui(e2);
}
function Bi(e2, t2) {
  return Bi = Object.setPrototypeOf || function(e3, t3) {
    return e3.__proto__ = t3, e3;
  }, Bi(e2, t2);
}
wi(Li, {}, "ignoreEvent");
var Gi = function(t2) {
  function o2() {
    return function(e2, t3) {
      if (!(e2 instanceof t3))
        throw new TypeError("Cannot call a class as a function");
    }(this, o2), Ni(this, Ui(o2).apply(this, arguments));
  }
  return function(e2, t3) {
    if ("function" != typeof t3 && null !== t3)
      throw new TypeError("Super expression must either be null or a function");
    e2.prototype = Object.create(t3 && t3.prototype, { constructor: { value: e2, writable: true, configurable: true } }), t3 && Bi(e2, t3);
  }(o2, n), qi(o2, [{ key: "render", value: function() {
    var t3 = this.props, n2 = t3.hotKeys, o3 = Ri(t3, ["hotKeys"]), i2 = o3.component || _t.option("defaultComponent");
    return e.createElement(i2, function(e2) {
      for (var t4 = 1; t4 < arguments.length; t4++) {
        var n3 = null != arguments[t4] ? arguments[t4] : {}, o4 = Object.keys(n3);
        "function" == typeof Object.getOwnPropertySymbols && (o4 = o4.concat(Object.getOwnPropertySymbols(n3).filter(function(e3) {
          return Object.getOwnPropertyDescriptor(n3, e3).enumerable;
        }))), o4.forEach(function(t5) {
          Fi(e2, t5, n3[t5]);
        });
      }
      return e2;
    }({}, n2, o3));
  } }]), o2;
}();
wi(Gi, {}, "observeIgnoredEvents"), y.exports = ht;
var zi = y.exports;
const Wi = o({ __proto__: null, default: r(zi) }, [zi]);
export {
  s as a,
  i as c,
  r as g,
  Wi as i
};
