var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _DependencyTracker_config, _ComputedDependencyTracker_config;
var stateObjectConfig = { writable: false, configurable: false, enumerable: false };
var isPureObject = function (o) {
    var _a;
    return null !== o &&
        typeof o === 'object' &&
        ((_a = Object === null || Object === void 0 ? void 0 : Object.getPrototypeOf(o)) === null || _a === void 0 ? void 0 : _a.isPrototypeOf(Object)) &&
        !Object.isFrozen(o);
};
var DependencyTracker = /** @class */ (function () {
    function DependencyTracker(config) {
        _DependencyTracker_config.set(this, void 0);
        __classPrivateFieldSet(this, _DependencyTracker_config, config, "f");
    }
    DependencyTracker.prototype.addEventListener = function (propSymbol, callback) {
        if (__classPrivateFieldGet(this, _DependencyTracker_config, "f").callbacks.has(propSymbol)) {
            __classPrivateFieldGet(this, _DependencyTracker_config, "f").callbacks.get(propSymbol).add(callback);
        }
        else {
            __classPrivateFieldGet(this, _DependencyTracker_config, "f").callbacks.set(propSymbol, new Set([callback]));
        }
    };
    DependencyTracker.prototype.recordGetters = function (func) {
        __classPrivateFieldGet(this, _DependencyTracker_config, "f").watcherOn = true;
        __classPrivateFieldGet(this, _DependencyTracker_config, "f").tempAccessedProperties.length = 0;
        var res = func();
        __classPrivateFieldGet(this, _DependencyTracker_config, "f").watcherOn = false;
        var accessedProps = [];
        var curr_index = -1;
        for (var i = 0; i < __classPrivateFieldGet(this, _DependencyTracker_config, "f").tempAccessedProperties.length; i++) {
            if (__classPrivateFieldGet(this, _DependencyTracker_config, "f").tempAccessedProperties[i].target.description === '%root') {
                curr_index++;
                accessedProps.push(__classPrivateFieldGet(this, _DependencyTracker_config, "f").tempAccessedProperties[i].property);
            }
            else {
                accessedProps[curr_index] = __classPrivateFieldGet(this, _DependencyTracker_config, "f").tempAccessedProperties[i].property;
            }
        }
        return {
            result: res,
            getters: accessedProps
        };
    };
    return DependencyTracker;
}());
_DependencyTracker_config = new WeakMap();
export var $makeState = function (stateObj) {
    var config = {
        callbacks: new Map(),
        tempAccessedProperties: [],
        watcherOn: false
    };
    var depTracker = {
        tracker: new DependencyTracker(config),
        accessed: function (symbols) {
            config.tempAccessedProperties.push(symbols);
        },
        onChanged: function (symbol, value) {
            var _a;
            (_a = config.callbacks.get(symbol)) === null || _a === void 0 ? void 0 : _a.forEach(function (cb) { if (cb)
                cb(value); });
        }
    };
    var _makeStateInner = function (stateObject, keyName) {
        if (isPureObject(stateObject)) {
            for (var key in stateObject) {
                stateObject[key] = _makeStateInner(stateObject[key], key);
            }
        }
        else {
            stateObject = { $: typeof stateObject === 'function' ? stateObject() : stateObject };
        }
        Object.defineProperty(stateObject, '__symbol', __assign(__assign({}, stateObjectConfig), { value: Symbol(keyName) }));
        Object.defineProperty(stateObject, '__tracker', __assign(__assign({}, stateObjectConfig), { value: depTracker.tracker }));
        var inherentProps = ['__symbol', '__tracker', '$'];
        return new Proxy(stateObject, {
            get: function (target, property) {
                var _a;
                if (!inherentProps.includes(property) && config.watcherOn) {
                    depTracker.accessed({ target: target === null || target === void 0 ? void 0 : target.__symbol, property: (_a = target[property]) === null || _a === void 0 ? void 0 : _a.__symbol });
                }
                return Reflect.get(target, property);
            },
            set: function (target, property, value) {
                if (Object.prototype.hasOwnProperty.call(target, property)) {
                    if (property === '$') {
                        Reflect.set(target, property, value);
                        depTracker.onChanged(target.__symbol, value);
                        return true;
                    }
                    else {
                        throw Error("Can't directly assign value to ".concat(property, ", did you mean ").concat(property, ".$ ?"));
                    }
                }
                else {
                    throw Error("State objects don't allow addition or deletion of state object keys!");
                }
            }
        });
    };
    return _makeStateInner(stateObj, '%root');
};
var ComputedDependencyTracker = /** @class */ (function () {
    function ComputedDependencyTracker(config) {
        _ComputedDependencyTracker_config.set(this, void 0);
        __classPrivateFieldSet(this, _ComputedDependencyTracker_config, config, "f");
    }
    ComputedDependencyTracker.prototype.addEventListener = function (propSymbol, callback) {
        if (__classPrivateFieldGet(this, _ComputedDependencyTracker_config, "f").callbacks.has(propSymbol)) {
            __classPrivateFieldGet(this, _ComputedDependencyTracker_config, "f").callbacks.get(propSymbol).add(callback);
        }
        else {
            __classPrivateFieldGet(this, _ComputedDependencyTracker_config, "f").callbacks.set(propSymbol, new Set([callback]));
        }
    };
    return ComputedDependencyTracker;
}());
_ComputedDependencyTracker_config = new WeakMap();
export var $makeComputed = function (computedObject, dependencyTracker) {
    var config = { callbacks: new Map() };
    var computedState = {};
    var computedDepTracker = new ComputedDependencyTracker(config);
    var onChanged = function (symbol, value) {
        var _a;
        (_a = config.callbacks.get(symbol)) === null || _a === void 0 ? void 0 : _a.forEach(function (cb) { if (cb)
            cb(value); });
    };
    var _loop_1 = function (key) {
        var _a = dependencyTracker.recordGetters(computedObject[key]), result = _a.result, getters = _a.getters;
        var keySymbol = Symbol(key);
        Object.defineProperty(computedState, key, { value: {} });
        Object.defineProperties(computedState[key], {
            $: __assign(__assign({}, stateObjectConfig), { value: result }),
            __symbol: __assign(__assign({}, stateObjectConfig), { value: keySymbol }),
            __tracker: __assign(__assign({}, stateObjectConfig), { value: computedDepTracker })
        });
        getters === null || getters === void 0 ? void 0 : getters.forEach(function (symbol) { return dependencyTracker.addEventListener(symbol, function () { return onChanged(keySymbol, computedObject[key]()); }); });
    };
    for (var key in computedObject) {
        _loop_1(key);
    }
    Object.defineProperty(computedState, '__tracker', { value: computedDepTracker });
    return computedState;
};
