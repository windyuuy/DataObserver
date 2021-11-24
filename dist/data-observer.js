"use strict";
var vm;
(function (vm) {
    vm.uid = 0;
    /**
     * 递归遍历数组，进行ob对象的依赖记录。
     */
    function dependArray(value) {
        var obj = null;
        for (var i = 0, l = value.length; i < l; i++) {
            obj = value[i];
            if (obj && obj.__ob__) {
                obj.__ob__.dep.depend();
            }
            if (Array.isArray(obj)) {
                dependArray(obj);
            }
        }
    }
    vm.dependArray = dependArray;
    var Dep = /** @class */ (function () {
        function Dep() {
            /**
             * 唯一id，方便hashmap判断是否存在
             */
            this.id = vm.uid++;
            /**
             * 侦听者
             */
            this.watchers = [];
        }
        Dep.pushCollectTarget = function (target) {
            this.collectTargetStack.push(target);
            Dep.target = target;
        };
        Dep.popCollectTarget = function () {
            this.collectTargetStack.pop();
            Dep.target = this.collectTargetStack[this.collectTargetStack.length - 1];
        };
        Dep.prototype.add = function (sub) {
            this.watchers.push(sub);
        };
        /*移除一个观察者对象*/
        Dep.prototype.remove = function (sub) {
            vm.remove(this.watchers, sub);
        };
        /**
         * 收集依赖
         */
        Dep.prototype.depend = function () {
            if (Dep.target) {
                // Dep.target指向的是一个watcher
                Dep.target.addDep(this);
            }
        };
        /**
         * 通知所有侦听者
         */
        Dep.prototype.notify = function () {
            var ws = this.watchers.slice();
            for (var i = 0, l = ws.length; i < l; i++) {
                ws[i].update();
            }
        };
        /**
         * 当前正在收集依赖的对象
         */
        Dep.target = null;
        /**
         * 当前正在收集以来的列队
         */
        Dep.collectTargetStack = [];
        return Dep;
    }());
    vm.Dep = Dep;
})(vm || (vm = {}));
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var vm;
(function (vm) {
    var Host = /** @class */ (function () {
        function Host() {
            //防止产生枚举
            vm.def(this, "$watchers", []);
            vm.def(this, "$isDestroyed", false);
            //实现基础方法，用于表达式中方便得调用
            vm.implementEnvironment(this);
        }
        Host.prototype.$watch = function (expOrFn, cb, loseValue, sync) {
            if (this.$isDestroyed) {
                console.error("the host is destroyed", this);
                return;
            }
            if (!(this.__ob__ instanceof vm.Observer)) {
                vm.observe(this);
            }
            var watcher = new vm.Watcher(this, expOrFn, cb, { loseValue: loseValue, sync: sync });
            this.$watchers.push(watcher);
            return watcher;
        };
        Host.prototype.$destroy = function () {
            var temp = this.$watchers;
            this.$watchers = [];
            for (var _i = 0, temp_1 = temp; _i < temp_1.length; _i++) {
                var w = temp_1[_i];
                w.teardown();
            }
            this.$isDestroyed = true;
        };
        return Host;
    }());
    vm.Host = Host;
    /**
     * 向普通对象注入Host相关方法
     */
    function implementHost(obj) {
        if (vm.hasOwn(obj, "$watchers")) {
            return obj;
        }
        vm.def(obj, "$watchers", []);
        vm.def(obj, "$isDestroyed", false);
        vm.def(obj, "$watch", Host.prototype.$watch);
        vm.def(obj, "$destroy", Host.prototype.$destroy);
        //实现基础方法，用于表达式中方便得调用
        vm.implementEnvironment(obj);
        vm.observe(obj);
        return obj;
    }
    vm.implementHost = implementHost;
    /**
     * 设置或添加某个对象的某个属性
     * @param target 对象，也可以是数组
     * @param key
     * @param value
     */
    function set(target, key, val) {
        if (vm.isUndef(target) || vm.isPrimitive(target)) {
            console.warn(("无法设置属性到 undefined, null, 或 primitive 值: " + ((target))));
            return;
        }
        if (Array.isArray(target) && vm.isValidArrayIndex(key)) {
            target.length = Math.max(target.length, key);
            target.splice(key, 1, val);
            return val;
        }
        if (key in target && !(key in Object.prototype)) {
            target[key] = val;
            return val;
        }
        var ob = (target).__ob__;
        if (!ob) {
            target[key] = val;
            return val;
        }
        vm.defineReactive(ob.value, key, val);
        ob.dep.notify();
        return val;
    }
    vm.set = set;
    /**
     * 删除某个对象的某个属性
     * @param target 对象，也可以是数组
     * @param key
     */
    function del(target, key) {
        if (vm.isUndef(target) || vm.isPrimitive(target)) {
            console.warn(("无法删除属性到 undefined, null, 或 primitive 值: " + ((target))));
            return;
        }
        if (Array.isArray(target) && vm.isValidArrayIndex(key)) {
            target.splice(key, 1);
            return;
        }
        var ob = (target).__ob__;
        if (!vm.hasOwn(target, key)) {
            return;
        }
        delete target[key];
        if (!ob) {
            return;
        }
        ob.dep.notify();
    }
    vm.del = del;
    /**
     * 注解，标注当前侦听的变量或表达式
     * @param expOrFn 路径或取值函数
     */
    function watch(expOrFn) {
        return function (target, propertyKey, descriptor) {
            if (!vm.hasOwn(target, "$watchAnnotations")) {
                target["$watchAnnotations"] = [];
            }
            var list = target["$watchAnnotations"];
            var cb = target[propertyKey];
            list.push({ expOrFn: expOrFn, cb: cb });
        };
    }
    vm.watch = watch;
    /**
     * 注解，标注当前需要访问的类
     */
    function host(constructor) {
        return /** @class */ (function (_super) {
            __extends(class_1, _super);
            function class_1() {
                var _this = _super.call(this) || this;
                vm.observe(_this);
                var list = _this.__proto__["$watchAnnotations"];
                if (list != null) {
                    for (var _i = 0, list_1 = list; _i < list_1.length; _i++) {
                        var w = list_1[_i];
                        _this.$watch(w.expOrFn, w.cb.bind(_this));
                    }
                }
                return _this;
            }
            return class_1;
        }(constructor));
    }
    vm.host = host;
})(vm || (vm = {}));
var vm;
(function (vm) {
    var _toString = Object.prototype.toString;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function isObject(obj) {
        return obj !== null && typeof obj === 'object';
    }
    vm.isObject = isObject;
    function hasOwn(obj, key) {
        return hasOwnProperty.call(obj, key);
    }
    vm.hasOwn = hasOwn;
    function isPlainObject(obj) {
        return _toString.call(obj) === '[object Object]';
    }
    vm.isPlainObject = isPlainObject;
    function def(obj, key, val, enumerable) {
        Object.defineProperty(obj, key, {
            value: val,
            enumerable: !!enumerable,
            writable: true,
            configurable: true
        });
    }
    vm.def = def;
    function isUndef(v) {
        return v === undefined || v === null;
    }
    vm.isUndef = isUndef;
    function isDef(v) {
        return v !== undefined && v !== null;
    }
    vm.isDef = isDef;
    function isTrue(v) {
        return v === true;
    }
    vm.isTrue = isTrue;
    function isFalse(v) {
        return v === false;
    }
    vm.isFalse = isFalse;
    /**
     * 判断是否为单纯的数据类型
     */
    function isPrimitive(value) {
        return (typeof value === 'string' ||
            typeof value === 'number' ||
            // $flow-disable-line
            typeof value === 'symbol' ||
            typeof value === 'boolean');
    }
    vm.isPrimitive = isPrimitive;
    function isValidArrayIndex(val) {
        var n = parseFloat(String(val));
        return n >= 0 && Math.floor(n) === n && isFinite(val);
    }
    vm.isValidArrayIndex = isValidArrayIndex;
    function remove(arr, item) {
        if (arr.length) {
            var index = arr.indexOf(item);
            if (index > -1) {
                return arr.splice(index, 1);
            }
        }
    }
    vm.remove = remove;
    var unicodeRegExp = /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/;
    // const bailRE = new RegExp("[^" + (unicodeRegExp.source) + ".$_\\d]");
    var pathCacheMap = {};
    /**
     * 讲使用.分隔的路径访问转换为函数。
     * @param path
     */
    function parsePath(path) {
        var func = pathCacheMap[path];
        if (func) {
            return func;
        }
        // if (bailRE.test(path)) {
        //复杂表达式
        var i = new vm.Interpreter(path);
        func = function (env) {
            return i.run(env);
        };
        // } else {
        //     //简单的.属性访问逻辑
        //     var segments = path.split('.');
        //     func = function (obj: any) {
        //         for (var i = 0; i < segments.length; i++) {
        //             if (!obj) { return }
        //             obj = obj[segments[i]];
        //         }
        //         return obj
        //     }
        // }
        pathCacheMap[path] = func;
        return func;
    }
    vm.parsePath = parsePath;
    function isNative(Ctor) {
        return typeof Ctor === 'function' && /native code/.test(Ctor.toString());
    }
    vm.isNative = isNative;
})(vm || (vm = {}));
/// <reference path="./utils.ts" />
var vm;
(function (vm) {
    var _Set;
    if (typeof Set !== 'undefined' && vm.isNative(Set)) {
        _Set = Set;
    }
    else {
        var _IdMap = /** @class */ (function () {
            function _IdMap() {
                this.set = Object.create(null);
            }
            _IdMap.prototype.has = function (key) {
                return this.set[key] === true;
            };
            _IdMap.prototype.add = function (key) {
                this.set[key] = true;
            };
            _IdMap.prototype.clear = function () {
                this.set = Object.create(null);
            };
            return _IdMap;
        }());
        _Set = _IdMap;
    }
    vm.IdMap = _Set;
})(vm || (vm = {}));
var vm;
(function (vm) {
    var symbolList = [
        "(", ")", "[", "]", "{", "}", ".",
        "!",
        "**",
        "*", "/", "%",
        "+", "-",
        ">", "<", ">=", "<=",
        "!=", "==",
        "&&", "||",
        ",",
    ];
    var NodeType;
    (function (NodeType) {
        //运算符
        NodeType[NodeType["P0"] = 0] = "P0";
        NodeType[NodeType["["] = 1] = "[";
        NodeType[NodeType["("] = 2] = "(";
        NodeType[NodeType["{"] = 3] = "{";
        NodeType[NodeType["."] = 4] = ".";
        NodeType[NodeType["P1"] = 5] = "P1";
        NodeType[NodeType["!"] = 6] = "!";
        NodeType[NodeType["P2"] = 7] = "P2";
        NodeType[NodeType["**"] = 8] = "**";
        NodeType[NodeType["P3"] = 9] = "P3";
        NodeType[NodeType["*"] = 10] = "*";
        NodeType[NodeType["/"] = 11] = "/";
        NodeType[NodeType["%"] = 12] = "%";
        NodeType[NodeType["P4"] = 13] = "P4";
        NodeType[NodeType["+"] = 14] = "+";
        NodeType[NodeType["-"] = 15] = "-";
        NodeType[NodeType["P5"] = 16] = "P5";
        NodeType[NodeType[">"] = 17] = ">";
        NodeType[NodeType["<"] = 18] = "<";
        NodeType[NodeType[">="] = 19] = ">=";
        NodeType[NodeType["<="] = 20] = "<=";
        NodeType[NodeType["P6"] = 21] = "P6";
        NodeType[NodeType["!="] = 22] = "!=";
        NodeType[NodeType["=="] = 23] = "==";
        NodeType[NodeType["P7"] = 24] = "P7";
        NodeType[NodeType["&&"] = 25] = "&&";
        NodeType[NodeType["P8"] = 26] = "P8";
        NodeType[NodeType["||"] = 27] = "||";
        NodeType[NodeType["P9"] = 28] = "P9";
        NodeType[NodeType[","] = 29] = ",";
        NodeType[NodeType["P10"] = 30] = "P10";
        NodeType[NodeType["]"] = 31] = "]";
        NodeType[NodeType[")"] = 32] = ")";
        NodeType[NodeType["}"] = 33] = "}";
        NodeType[NodeType["P11"] = 34] = "P11";
        //值
        NodeType[NodeType["number"] = 35] = "number";
        NodeType[NodeType["word"] = 36] = "word";
        NodeType[NodeType["string"] = 37] = "string";
        NodeType[NodeType["boolean"] = 38] = "boolean";
        NodeType[NodeType["null"] = 39] = "null";
        NodeType[NodeType["P12"] = 40] = "P12";
        NodeType[NodeType["annotation"] = 41] = "annotation";
        //组合，只会在AST中出现
        NodeType[NodeType["call"] = 42] = "call";
        NodeType[NodeType["lambda"] = 43] = "lambda";
    })(NodeType = vm.NodeType || (vm.NodeType = {}));
    var WordNode = /** @class */ (function () {
        function WordNode(type, value, lineStart, columnStart, columnEnd) {
            this.type = type;
            this.value = value;
            this.lineStart = lineStart;
            this.columnStart = columnStart;
            this.columnEnd = columnEnd;
            //父节点
            this.parent = null;
            this.lineEnd = lineStart;
        }
        return WordNode;
    }());
    vm.WordNode = WordNode;
    var ASTNodeBase = /** @class */ (function () {
        function ASTNodeBase(
        /**
         * 操作符
         */
        operator) {
            this.operator = operator;
            //父节点
            this.parent = null;
        }
        return ASTNodeBase;
    }());
    vm.ASTNodeBase = ASTNodeBase;
    var ValueASTNode = /** @class */ (function (_super) {
        __extends(ValueASTNode, _super);
        function ValueASTNode(value) {
            var _this = _super.call(this, value.type) || this;
            _this.value = value;
            return _this;
        }
        return ValueASTNode;
    }(ASTNodeBase));
    vm.ValueASTNode = ValueASTNode;
    var BracketASTNode = /** @class */ (function (_super) {
        __extends(BracketASTNode, _super);
        function BracketASTNode(operator, node) {
            var _this = _super.call(this, operator) || this;
            _this.operator = operator;
            _this.node = node;
            return _this;
        }
        return BracketASTNode;
    }(ASTNodeBase));
    vm.BracketASTNode = BracketASTNode;
    var UnitaryASTNode = /** @class */ (function (_super) {
        __extends(UnitaryASTNode, _super);
        function UnitaryASTNode(operator, 
        /**
         * 一元表达式的右值
         */
        right) {
            var _this = _super.call(this, operator) || this;
            _this.operator = operator;
            _this.right = right;
            _this.right.parent = _this;
            return _this;
        }
        return UnitaryASTNode;
    }(ASTNodeBase));
    vm.UnitaryASTNode = UnitaryASTNode;
    var BinaryASTNode = /** @class */ (function (_super) {
        __extends(BinaryASTNode, _super);
        function BinaryASTNode(
        /**
         * 二元表达式的左值
         */
        left, 
        /**
         * 运算符
         */
        operator, 
        /**
         * 二元表达式的左值
         */
        right) {
            var _this = _super.call(this, operator) || this;
            _this.left = left;
            _this.operator = operator;
            _this.right = right;
            _this.left.parent = _this;
            _this.right.parent = _this;
            return _this;
        }
        return BinaryASTNode;
    }(ASTNodeBase));
    vm.BinaryASTNode = BinaryASTNode;
    var CallASTNode = /** @class */ (function (_super) {
        __extends(CallASTNode, _super);
        function CallASTNode(
        /**
         * 函数访问节点
         */
        left, 
        /**
         * 函数参数列表
         */
        parameters) {
            var _this = _super.call(this, NodeType.call) || this;
            _this.left = left;
            _this.parameters = parameters;
            _this.left.parent = _this;
            _this.parameters.forEach(function (a) { return a.parent = _this; });
            return _this;
        }
        return CallASTNode;
    }(ASTNodeBase));
    vm.CallASTNode = CallASTNode;
    var zeroCode = "0".charCodeAt(0);
    var nineCode = "9".charCodeAt(0);
    var operatorCharMap = {};
    symbolList.forEach(function (a) { return operatorCharMap[a.charAt(0)] = true; });
    var markMap = {};
    ["\"", "'", "`"].forEach(function (a) { return markMap[a] = true; });
    var doubleOpMap = {};
    symbolList.forEach(function (a) {
        if (a.length > 1) {
            doubleOpMap[a.charAt(0)] = true;
        }
    });
    var spaceMap = {};
    [" ", "\n", "\r", "\t"].forEach(function (a) { return spaceMap[a] = true; });
    var Interpreter = /** @class */ (function () {
        function Interpreter(expression) {
            this.expression = expression;
            this.astErrorList = [];
            this.ast = Interpreter.toAST(Interpreter.toWords(this.expression), this.expression, this.astErrorList);
        }
        Interpreter.toWords = function (expression) {
            var line = 0;
            var column = 0;
            var startColum = -1; //仅仅在多行的处理中使用
            var temp = "";
            var lastChar = "";
            var state = 0; //0初始状态；1数字；2运算符；3引号字符串；4单词；5行注释；6块注释
            var markType;
            var nodeList = [];
            var reset = function () {
                state = 0;
                temp = '';
            };
            var run = function (char) {
                var _a, _b;
                if (state == 0) {
                    if (spaceMap[char]) {
                        return;
                    }
                    var code = char.charCodeAt(0);
                    if (code >= zeroCode && code <= nineCode) {
                        //数字
                        state = 1;
                        temp += char;
                    }
                    else if (operatorCharMap[char]) {
                        //运算符
                        temp += char;
                        if (doubleOpMap[char] || char == "/") { //有// 和 /* 等两种注释的情况
                            //可能是多运算符
                            state = 2;
                        }
                        else if (char == "-" && (nodeList.length != 0 && nodeList[nodeList.length - 1].type < NodeType.P10 || nodeList.length == 0)) {
                            //负数数字
                            state = 1;
                        }
                        else {
                            if (NodeType[temp] == undefined) {
                                throw "表达式编译失败" + expression + " 不支持的运算符: " + temp;
                            }
                            nodeList.push(new WordNode(NodeType[temp], null, line, column - temp.length + 1, column));
                            reset();
                        }
                    }
                    else if (markMap[char]) {
                        //引号
                        markType = char;
                        startColum = column;
                        state = 3;
                    }
                    else {
                        //单词
                        temp += char;
                        state = 4;
                    }
                }
                else if (state == 1) {
                    //数字
                    var code = char.charCodeAt(0);
                    if (code >= zeroCode && code <= nineCode || char == ".") {
                        temp += char;
                    }
                    else {
                        nodeList.push(new WordNode(NodeType.number, parseFloat(temp), line, column - temp.length, column - 1));
                        reset();
                        run(char); //重新执行
                    }
                }
                else if (state == 2) {
                    //运算符
                    var mg = temp + char;
                    if (mg == "//") {
                        //行注释
                        temp += char;
                        state = 5;
                    }
                    else if (mg == "/*") {
                        //块注释
                        temp += char;
                        startColum = column - 1;
                        state = 6;
                    }
                    else if (NodeType[(mg)] != undefined) {
                        //识别到运算符
                        temp += char;
                        nodeList.push(new WordNode(NodeType[temp], null, line, column - temp.length + 1, column));
                        reset();
                    }
                    else {
                        nodeList.push(new WordNode(NodeType[temp], null, line, column - temp.length, column - 1));
                        reset();
                        run(char); //重新执行
                    }
                }
                else if (state == 3) {
                    //引号
                    if (char == markType && lastChar != "\\") {
                        if (markType == "`") {
                            var node = new WordNode(NodeType.string, temp, line, startColum, column);
                            node.lineStart = line - ((_a = (temp.match(/\n/g) || [])) === null || _a === void 0 ? void 0 : _a.length);
                            nodeList.push(node);
                        }
                        else {
                            nodeList.push(new WordNode(NodeType.string, temp, line, startColum, column));
                        }
                        reset();
                    }
                    else {
                        temp += char;
                    }
                }
                else if (state == 4) {
                    //单词
                    if (spaceMap[char] || operatorCharMap[char] || markMap[char]) {
                        if (temp == "true" || temp == "false") {
                            nodeList.push(new WordNode(NodeType.boolean, temp == "true", line, column - temp.length, column - 1));
                        }
                        else if (temp == "null") {
                            nodeList.push(new WordNode(NodeType.null, null, line, column - temp.length, column - 1));
                        }
                        else {
                            nodeList.push(new WordNode(NodeType.word, temp, line, column - temp.length, column - 1));
                        }
                        reset();
                        run(char); //重新执行
                    }
                    else {
                        temp += char;
                    }
                }
                else if (state == 5) {
                    //行注释
                    if (char == "\n" || char == "\r") {
                        nodeList.push(new WordNode(NodeType.annotation, temp, line, column - temp.length, column));
                        reset();
                        //不需要重新执行，换行可以丢弃
                    }
                    else {
                        temp += char;
                    }
                }
                else if (state == 6) {
                    //块注释
                    if (lastChar + char == "*/") {
                        temp += char;
                        var node = new WordNode(NodeType.annotation, temp, line, startColum, column);
                        node.lineStart = line - ((_b = (temp.match(/\n/g) || [])) === null || _b === void 0 ? void 0 : _b.length);
                        nodeList.push(node);
                        reset();
                    }
                    else {
                        temp += char;
                    }
                }
            };
            for (var _i = 0, expression_1 = expression; _i < expression_1.length; _i++) {
                var char = expression_1[_i];
                run(char);
                lastChar = char;
                if (char == "\n") {
                    line++;
                    column = 0;
                }
                else {
                    column++;
                }
            }
            run(" "); //传入空格，使其收集最后的结束点
            return nodeList;
        };
        Interpreter.toAST = function (nodeList, expression, errorList) {
            var bracketList = [];
            var bracketMap = {};
            [NodeType["("], NodeType["["], NodeType["{"]].forEach(function (k) { return bracketMap[k] = true; });
            var getWordNode = function (node) {
                while (node instanceof Array) {
                    node = node[0];
                }
                if (node instanceof WordNode) {
                    return node;
                }
            };
            var pushError = function (node, msg) {
                var errorPos = getWordNode(node);
                var errorMsg = expression + msg;
                if (errorPos) {
                    errorMsg += "\uFF0C\u5728" + (errorPos.lineEnd + 1) + ":" + (errorPos.columnEnd + 1) + "\u3002";
                }
                errorList.push(errorMsg);
            };
            /**
             * 将括号按层级分组成数组
             */
            var convertBracket = function (start, list, endType) {
                for (var i = start; i < nodeList.length; i++) {
                    var current = nodeList[i];
                    if (bracketMap[current.type] !== undefined) {
                        //发现括号
                        var nextEndType = void 0;
                        switch (current.type) {
                            case NodeType["("]:
                                nextEndType = NodeType[")"];
                                break;
                            case NodeType["["]:
                                nextEndType = NodeType["]"];
                                break;
                            case NodeType["{"]:
                                nextEndType = NodeType["}"];
                                break;
                            default:
                                throw expression + "括号分析异常异常'" + NodeType[current.type] + "' " + current.lineStart + ":" + current.columnStart;
                        }
                        var newList = [current];
                        i = convertBracket(i + 1, newList, nextEndType);
                        list.push(newList);
                    }
                    else if (endType != null && endType == current.type) {
                        list.push(current);
                        return i;
                    }
                    else {
                        list.push(current);
                    }
                }
                if (endType != null && list[list.length - 1].type != endType) {
                    pushError(list[list.length - 1], "\u7F3A\u5C11\u95ED\u5408\u62EC\u53F7'" + NodeType[endType] + "'");
                    //自动补充一个符号
                    list.push(new WordNode(endType, null, 0, 0, 0));
                }
                return nodeList.length;
            };
            var unaryExp = function (list, startPriority, endPriority) {
                if (list.length <= 1) {
                    return list;
                }
                //当前环境下单目运算符只会在值的左边
                //连续多个单目运算符从右往左组合运算
                var rlist = [];
                var currentAST;
                for (var i = list.length - 1; i >= 0; i--) {
                    var a = list[i];
                    var b = list[i - 1];
                    if (b instanceof WordNode && b.type > startPriority && b.type < endPriority) {
                        if (a == null) {
                            pushError(a, "一元运算符" + NodeType[b.type] + "缺少右值");
                            a = new WordNode(NodeType.boolean, true, 0, 0, 0); //自动补充
                        }
                        if (currentAST == null) {
                            //第一次发现
                            currentAST = new UnitaryASTNode(b.type, genAST(a instanceof Array ? a : [a]));
                        }
                        else {
                            //多个单目运算符连续
                            currentAST = new UnitaryASTNode(b.type, currentAST);
                        }
                    }
                    else {
                        if (currentAST) {
                            //一轮连续的单目运算符组合完毕
                            rlist.push(currentAST);
                            currentAST = undefined;
                        }
                        else {
                            rlist.push(a); //上次必然已经被加入了ast中，因此不需要push
                        }
                    }
                }
                if (currentAST) {
                    //边界对象不要遗留
                    rlist.push(currentAST);
                }
                return rlist.reverse(); //转为正常的顺序
            };
            var binaryExp = function (list, startPriority, endPriority) {
                if (list.length <= 1) {
                    return list;
                }
                var rlist = [];
                var currentAST;
                for (var i = 1, l = list.length; i < l; i++) {
                    var a = list[i - 1];
                    var b = list[i];
                    var c = list[i + 1];
                    if (b instanceof WordNode && b.type > startPriority && b.type < endPriority) {
                        if (c == null) {
                            pushError(a, "二元运算符" + NodeType[b.type] + "缺少右值");
                            c = new WordNode(NodeType.number, 0, 0, 0, 0); //自动补充
                        }
                        if (currentAST == null) {
                            //第一次发现
                            rlist.pop(); //删除上次循环所插入的b
                            currentAST = new BinaryASTNode(genAST(a instanceof Array ? a : [a]), b.type, genAST(c instanceof Array ? c : [c]));
                        }
                        else {
                            //多次双目运算符连续
                            currentAST = new BinaryASTNode(currentAST, b.type, genAST(c instanceof Array ? c : [c]));
                        }
                        //特殊处理 . 和 [] 后续逻辑，可能会紧跟着函数调用
                        var d = list[i + 2];
                        if (endPriority == NodeType.P1 && d instanceof Array && d[0] instanceof WordNode && d[0].type == NodeType["("]) {
                            currentAST = new CallASTNode(currentAST, genParamList(d));
                            i++; //跳过d的遍历
                        }
                        i++; //跳过c的遍历
                    }
                    //特殊处理，仅处理a['b']中括号的访问方式。
                    else if (b instanceof Array && b[0] instanceof WordNode && b[0].type == NodeType["["]) {
                        //中括号方式访问属性
                        if (currentAST) {
                            currentAST = new BinaryASTNode(currentAST, NodeType["["], genAST(b));
                        }
                        else {
                            rlist.pop(); //删除上次循环所插入的b
                            currentAST = new BinaryASTNode(genAST(a instanceof Array ? a : [a]), NodeType["["], genAST(b));
                        }
                        //特殊处理 . 和 [] 后续逻辑，可能会紧跟着函数调用
                        if (endPriority == NodeType.P1 && c instanceof Array && c[0] instanceof WordNode && c[0].type == NodeType["("]) {
                            currentAST = new CallASTNode(currentAST, genParamList(c));
                            i++; //跳过c的遍历
                        }
                    }
                    else {
                        if (currentAST) {
                            if (endPriority == NodeType.P1 && b instanceof Array && b[0] instanceof WordNode && b[0].type == NodeType["("]) {
                                currentAST = new CallASTNode(currentAST, genParamList(b));
                                continue;
                            }
                            else {
                                //一轮连续的双目运算符组合完毕
                                rlist.push(currentAST);
                                currentAST = undefined;
                            }
                        }
                        else if (endPriority == NodeType.P1 && a instanceof WordNode && a.type == NodeType.word && b instanceof Array && b[0] instanceof WordNode && b[0].type == NodeType["("]) {
                            //特殊处理 . 和 [] 后续逻辑，可能会紧跟着函数调用
                            currentAST = new CallASTNode(genAST(a instanceof Array ? a : [a]), genParamList(b));
                            rlist.pop(); //删除上次循环所插入的b
                            continue; //a和b都需要插入到rlist
                        }
                        if (i == 1) { //由于是从1开始遍历的，因此需要保留0的值
                            rlist.push(a);
                        }
                        rlist.push(b);
                    }
                }
                if (currentAST) {
                    //边界对象不要遗留
                    rlist.push(currentAST);
                }
                return rlist;
            };
            var splice = function (list, sp) {
                var r = [];
                var current = [];
                for (var _i = 0, list_2 = list; _i < list_2.length; _i++) {
                    var l = list_2[_i];
                    //这里会忽略括号
                    if (l instanceof WordNode) {
                        if (l.type == sp) {
                            //产生切割
                            if (current.length > 0) {
                                r.push(current);
                                current = [];
                            }
                        }
                        else if (l.type == NodeType["("] || l.type == NodeType[")"] || l.type == NodeType["["] || l.type == NodeType["]"] || l.type == NodeType["{"] || l.type == NodeType["}"]) {
                            //跳过该字符
                        }
                        else {
                            current.push(l);
                        }
                    }
                    else {
                        current.push(l);
                    }
                }
                if (current.length > 0) {
                    r.push(current);
                }
                return r;
            };
            var genParamList = function (list) {
                var paramList = splice(list, NodeType[","]);
                var rlist = [];
                for (var _i = 0, paramList_1 = paramList; _i < paramList_1.length; _i++) {
                    var p = paramList_1[_i];
                    rlist.push(genAST(p));
                }
                return rlist;
            };
            var genAST = function (sourcelist) {
                if (sourcelist.length == 1 && sourcelist[0] instanceof ASTNodeBase) {
                    return sourcelist[0];
                }
                if (sourcelist.length == 1 && sourcelist[0] instanceof Array) {
                    return genAST(sourcelist[0]);
                }
                var list = sourcelist;
                //进行括号处理
                var bracketType;
                var a = list[0];
                var b = list[list.length - 1];
                if (a instanceof WordNode && b instanceof WordNode &&
                    (a.type == NodeType["("] && b.type == NodeType[")"] ||
                        a.type == NodeType["["] && b.type == NodeType["]"] ||
                        a.type == NodeType["{"] && b.type == NodeType["}"])) {
                    bracketType = a.type;
                    list = list.slice(1, list.length - 1);
                }
                list = binaryExp(list, NodeType.P0, NodeType.P1); //分组  . 和 [] 形成访问连接，包括后面的函数
                list = unaryExp(list, NodeType.P1, NodeType.P2); //分组  ! ，进行一元表达式分组
                list = binaryExp(list, NodeType.P2, NodeType.P3); //分组  **，进行2元表达式分组
                list = binaryExp(list, NodeType.P3, NodeType.P4); //分组  * / %，进行2元表达式分组
                list = binaryExp(list, NodeType.P4, NodeType.P5); //分组  + -，进行2元表达式分组
                list = binaryExp(list, NodeType.P5, NodeType.P6); //分组  > < >= <=，进行2元表达式分组
                list = binaryExp(list, NodeType.P6, NodeType.P7); //分组  != ==，进行2元表达式分组
                list = binaryExp(list, NodeType.P7, NodeType.P8); //分组  && ，进行2元表达式分组
                list = binaryExp(list, NodeType.P8, NodeType.P9); //分组  ||，进行2元表达式分组
                var result;
                if (list.length == 1 && list[0] instanceof ASTNodeBase) {
                    //正常返回
                    result = list[0];
                }
                else if (list.length == 1 && list[0] instanceof WordNode) {
                    //单纯的数值
                    result = new ValueASTNode(list[0]);
                }
                else if (list.length > 1) {
                    pushError(sourcelist[0], "解析后节点列表无法归一");
                    result = new ValueASTNode(new WordNode(NodeType.number, 0, 0, 0, 0));
                }
                else {
                    pushError(sourcelist[0], "无法正确解析列表");
                    result = new ValueASTNode(new WordNode(NodeType.number, 0, 0, 0, 0));
                }
                if (bracketType !== undefined) {
                    if (bracketType == NodeType["{"]) {
                        return new BracketASTNode(NodeType.lambda, result);
                    }
                    else {
                        return new BracketASTNode(bracketType, result);
                    }
                }
                else {
                    return result;
                }
            };
            nodeList = nodeList.filter(function (a) { return a.type != NodeType.annotation; });
            convertBracket(0, bracketList); //分组括号
            return genAST(bracketList);
        };
        Interpreter.toStringAST = function (ast, addBracket) {
            var _this = this;
            var r = "";
            if (addBracket && !(ast instanceof ValueASTNode || ast instanceof BracketASTNode)) {
                r += "(";
            }
            if (ast instanceof ValueASTNode) {
                if (ast.value.type == NodeType.string) {
                    r += "\"" + ast.value.value + "\"";
                }
                else {
                    r += "" + ast.value.value;
                }
            }
            else if (ast instanceof BracketASTNode) {
                if (ast.operator == NodeType["("]) {
                    r += "(" + this.toStringAST(ast.node, addBracket) + ")";
                }
                else if (ast.operator == NodeType["["]) {
                    r += "[" + this.toStringAST(ast.node, addBracket) + "]";
                }
                else if (ast.operator == NodeType["{"] || ast.operator == NodeType.lambda) {
                    r += "{" + this.toStringAST(ast.node, addBracket) + "}";
                }
            }
            else if (ast instanceof UnitaryASTNode) {
                r += "" + NodeType[ast.operator] + this.toStringAST(ast.right, addBracket);
            }
            else if (ast instanceof BinaryASTNode) {
                if (ast.operator == NodeType["["]) {
                    r += "" + this.toStringAST(ast.left, addBracket) + this.toStringAST(ast.right, addBracket);
                }
                else if (ast.operator == NodeType["."]) {
                    r += "" + this.toStringAST(ast.left, addBracket) + NodeType[ast.operator] + this.toStringAST(ast.right, addBracket);
                }
                else {
                    r += this.toStringAST(ast.left, addBracket) + " " + NodeType[ast.operator] + " " + this.toStringAST(ast.right, addBracket);
                }
            }
            else if (ast instanceof CallASTNode) {
                r += this.toStringAST(ast.left, addBracket) + "( " + ast.parameters.map(function (a) { return _this.toStringAST(a, addBracket); }).join(", ") + ")";
            }
            if (addBracket && !(ast instanceof ValueASTNode || ast instanceof BracketASTNode)) {
                r += ")";
            }
            return r;
        };
        Interpreter.prototype.toString = function () {
            return Interpreter.toStringAST(this.ast);
        };
        /**
         * 该函数所执行的表达式将自动进行容错处理
         * 1. 当访问属性产生null值时，其将不参与计算 例如：a.b+13 当a或b为空时，结果将返回13
         * 2. 当访问的表达式完全为null时，表达式将最终返回结果0，例如：a.b+c 则返回0
         * @param environment
         * @param ast
         */
        Interpreter.run = function (environment, ast) {
            var _this = this;
            if (ast instanceof ValueASTNode) {
                if (ast.operator == vm.NodeType.word) {
                    if (ast.value.value == "this") {
                        return environment;
                    }
                    else {
                        return environment[ast.value.value];
                    }
                }
                else {
                    return ast.value.value;
                }
            }
            else if (ast instanceof BracketASTNode) {
                return this.run(environment, ast.node); //括号内必然是个整体
            }
            else if (ast instanceof UnitaryASTNode) {
                var b = this.run(environment, ast.right);
                switch (ast.operator) {
                    case NodeType["!"]:
                        return !b;
                    default:
                        throw "\u610F\u5916\u7684\u4E00\u5143\u8FD0\u7B97\u7B26" + NodeType[ast.operator] + "}]";
                }
            }
            else if (ast instanceof BinaryASTNode) {
                if (ast.operator == NodeType["."] || ast.operator == NodeType["["]) {
                    var a_1 = this.run(environment, ast.left);
                    if (a_1 == null) {
                        console.error(Interpreter.toStringAST(ast) + "\n" + "属性访问异常" + Interpreter.toStringAST(ast.left));
                        return null; //访问运算遇到null则不执行
                    }
                    if (ast.right instanceof ValueASTNode) {
                        return a_1[ast.right.value.value];
                    }
                    else {
                        return a_1[this.run(environment, ast.right)];
                    }
                }
                if (ast.operator == NodeType["&&"]) {
                    //先左，后右
                    var a_2 = this.run(environment, ast.left);
                    if (!a_2) {
                        return a_2;
                    }
                    return a_2 && this.run(environment, ast.right);
                }
                else if (ast.operator == NodeType["||"]) {
                    var a_3 = this.run(environment, ast.left);
                    if (a_3) {
                        return a_3;
                    }
                    return a_3 || this.run(environment, ast.right);
                }
                var a = this.run(environment, ast.left);
                var b = this.run(environment, ast.right);
                if (!(ast.operator == NodeType["=="] || ast.operator == NodeType["!="])) {
                    if (a == null && b == null) {
                        return null;
                    }
                    else if (a == null && b != null) {
                        return b;
                    }
                    else if (a != null && b == null) {
                        return a;
                    }
                }
                switch (ast.operator) {
                    case NodeType["**"]:
                        return Math.pow(a, b);
                    case NodeType["*"]:
                        return a * b;
                    case NodeType["/"]:
                        return a / b;
                    case NodeType["%"]:
                        return a % b;
                    case NodeType["+"]:
                        return a + b;
                    case NodeType["-"]:
                        return a - b;
                    case NodeType[">"]:
                        return a > b;
                    case NodeType["<"]:
                        return a < b;
                    case NodeType[">="]:
                        return a >= b;
                    case NodeType["<="]:
                        return a <= b;
                    case NodeType["!="]:
                        return a != b;
                    case NodeType["=="]:
                        return a == b;
                    default:
                        throw "\u610F\u5916\u7684\u4E8C\u5143\u8FD0\u7B97\u7B26" + NodeType[ast.operator] + "}]";
                }
            }
            else if (ast instanceof CallASTNode) {
                var obj = this.run(environment, ast.left);
                var self_1;
                var func = void 0;
                if (ast.left instanceof ValueASTNode) {
                    //全局函数
                    func = environment[ast.left.value.value];
                }
                else if (ast.left instanceof BinaryASTNode) {
                    self_1 = this.run(environment, ast.left.left);
                    if (self_1 == null) {
                        console.error(Interpreter.toStringAST(ast) + "\n" + "函数无法访问" + Interpreter.toStringAST(ast.left.left));
                        return null; //self无法获取
                    }
                    if (ast.left.right instanceof ValueASTNode) {
                        func = self_1[ast.left.right.value.value];
                    }
                    else {
                        func = self_1[this.run(environment, ast.left.right)];
                    }
                }
                if (func == null) {
                    console.error(Interpreter.toStringAST(ast) + "\n" + "函数无法访问");
                    return null; //func无法获取
                }
                if (obj == null) {
                    //函数无法执行
                    console.error(Interpreter.toStringAST(ast) + "\n" + "函数无法执行" + Interpreter.toStringAST(ast.left));
                    return null;
                }
                var paramList = ast.parameters.map(function (p) {
                    if (p instanceof BracketASTNode && p.operator == NodeType.lambda) {
                        return function (a) {
                            var newEv;
                            if (vm.isPrimitive(a)) {
                                newEv = { value: a };
                            }
                            else {
                                newEv = a;
                            }
                            newEv.__proto__ = environment;
                            newEv._ = environment;
                            return Interpreter.run(newEv, p.node);
                        };
                    }
                    else {
                        return _this.run(environment, p);
                    }
                });
                return func.apply(self_1 || environment, paramList);
            }
        };
        Interpreter.prototype.run = function (environment) {
            try {
                return Interpreter.run(environment, this.ast);
            }
            catch (e) {
                throw this.expression + "\n" + (e instanceof Error ? e.message : e);
            }
        };
        return Interpreter;
    }());
    vm.Interpreter = Interpreter;
    /**
     * 基础环境
     */
    vm.environment = {};
    //加入数学基础库
    Object.getOwnPropertyNames(Math).forEach(function (k) { return vm.def(vm.environment, k.toUpperCase(), Math[k]); });
    /**
     * 继承自基础属性
     */
    function extendsEnvironment(obj) {
        obj.__proto__ = vm.environment;
    }
    vm.extendsEnvironment = extendsEnvironment;
    /**
     * 向目标对象实现所有基础属性
     */
    function implementEnvironment(obj) {
        var ks = Object.getOwnPropertyNames(vm.environment);
        for (var _i = 0, ks_1 = ks; _i < ks_1.length; _i++) {
            var k = ks_1[_i];
            if (k == "__ob__")
                continue;
            vm.def(obj, k, vm.environment[k]);
        }
        return obj;
    }
    vm.implementEnvironment = implementEnvironment;
})(vm || (vm = {}));
var vm;
(function (vm) {
    //创建数组的函数代理
    var arrayProto = Array.prototype;
    var arrayMethods = Object.create(arrayProto);
    var methodsToPatch = [
        'push',
        'pop',
        'shift',
        'unshift',
        'splice',
        'sort',
        'reverse'
    ];
    methodsToPatch.forEach(function (method) {
        var original = arrayProto[method]; //缓存原始方法
        vm.def(arrayMethods, method, function () {
            var args = [], len = arguments.length;
            while (len--)
                args[len] = arguments[len];
            var result = original.apply(this, args);
            var ob = this.__ob__;
            var inserted;
            switch (method) {
                case 'push':
                case 'unshift':
                    inserted = args;
                    break;
                case 'splice':
                    inserted = args.slice(2);
                    break;
            }
            if (inserted) {
                ob.observeArray(inserted);
            }
            //通知刷新
            ob.dep.notify();
            return result;
        });
    });
    /**
     * 将对象处理为可观察对象
     */
    function observe(value) {
        if (!vm.isObject(value)) {
            return;
        }
        var ob;
        if (value.__ob__ instanceof Observer) {
            //对象已经绑定
            ob = value.__ob__;
        }
        else if (Object.isExtensible(value) && (Array.isArray(value) || vm.isPlainObject(value))) {
            //只有普通的对象才可以进行观察
            return new Observer(value);
        }
        return ob;
    }
    vm.observe = observe;
    /**
     * 拦截对象所有的key和value
     */
    function defineReactive(obj, key, 
    /**
     * 对象的默认值，也就是 obj[key]
     */
    val) {
        //必包的中依赖，相当于是每一个属性的附加对象，用于记录属性的所有以来侦听。
        var dep = new vm.Dep();
        var property = Object.getOwnPropertyDescriptor(obj, key);
        if (property && property.configurable === false) {
            return;
        }
        var getter = property && property.get;
        var setter = property && property.set;
        var valOb = observe(val);
        Object.defineProperty(obj, key, {
            enumerable: true,
            configurable: true,
            get: function reactiveGetter() {
                var value = getter ? getter.call(obj) : val;
                //进行依赖收集，依赖收集前 Dependency.collectTarget 会被赋值，收集完成后会置空。
                if (vm.Dep.target) {
                    dep.depend(); //将自身加入到Dependency.collectTarget中
                    if (valOb) {
                        valOb.dep.depend(); //属性值依赖
                    }
                    if (Array.isArray(value)) {
                        vm.dependArray(value);
                    }
                }
                return value;
            },
            set: function reactiveSetter(newVal) {
                var value = getter ? getter.call(obj) : val;
                if (newVal === value || (newVal !== newVal && value !== value)) {
                    return; //相等则无需进行后续处理
                }
                if (setter) {
                    setter.call(obj, newVal);
                }
                else {
                    val = newVal;
                }
                valOb = observe(newVal); //如果是普通对象需要处理成可观察的
                dep.notify(); //触发刷新
            }
        });
    }
    vm.defineReactive = defineReactive;
    /**
     * 拦截对象所有的key和value
     */
    function defineCompute(obj, key, compute) {
        Object.defineProperty(obj, key, {
            enumerable: true,
            configurable: true,
            get: function reactiveGetter() {
                return compute();
            },
        });
    }
    vm.defineCompute = defineCompute;
    var Observer = /** @class */ (function () {
        function Observer(value) {
            this.value = value;
            this.dep = new vm.Dep();
            //实现双向绑定
            vm.def(value, '__ob__', this);
            if (Array.isArray(value)) {
                //覆盖所有函数
                value.__proto__ = arrayMethods;
                this.observeArray(value);
            }
            else {
                /*如果是对象则直接walk进行绑定*/
                this.walk(value);
            }
        }
        /**
         * 遍历所有属性，拦截get set
         */
        Observer.prototype.walk = function (obj) {
            var keys = Object.keys(obj);
            for (var i = 0; i < keys.length; i++) {
                defineReactive(obj, keys[i], obj[keys[i]]);
            }
        };
        /**
         * 所以成员都替换成observe
         */
        Observer.prototype.observeArray = function (items) {
            for (var i = 0, l = items.length; i < l; i++) {
                observe(items[i]);
            }
        };
        return Observer;
    }());
    vm.Observer = Observer;
})(vm || (vm = {}));
var vm;
(function (vm) {
    var Tick = /** @class */ (function () {
        function Tick() {
        }
        Tick.add = function (w) {
            if (!this.queueMap.has(w.id)) {
                this.queueMap.add(w.id);
                this.queue.push(w);
            }
        };
        Tick.next = function () {
            this.queueMap.clear();
            var temp = this.queue;
            this.queue = this.temp;
            this.temp = temp;
            for (var _i = 0, temp_2 = temp; _i < temp_2.length; _i++) {
                var w = temp_2[_i];
                w.run();
            }
            temp.length = 0;
        };
        Tick.temp = [];
        Tick.queue = [];
        Tick.queueMap = new vm.IdMap();
        return Tick;
    }());
    vm.Tick = Tick;
})(vm || (vm = {}));
var vm;
(function (vm) {
    var Watcher = /** @class */ (function () {
        function Watcher(host, expOrFn, cb, options) {
            this.host = host;
            // options
            if (options) {
                this.sync = !!options.sync;
                this.loseValue = options.loseValue;
            }
            else {
                this.sync = false;
                this.loseValue = undefined;
            }
            this.cb = cb;
            this.id = ++vm.uid;
            this.active = true;
            this.deps = [];
            this.newDeps = [];
            this.depIds = new vm.IdMap();
            this.newDepIds = new vm.IdMap();
            if (typeof expOrFn === 'function') {
                this.getter = expOrFn;
            }
            else {
                this.getter = vm.parsePath(expOrFn);
                if (!this.getter) {
                    this.getter = function () { };
                    console.warn("expOrFn \u8DEF\u5F84\u5F02\u5E38: \"" + expOrFn + "\" ");
                }
            }
            this.value = this.get();
        }
        /**
         * 获取值，并重新收集依赖
         */
        Watcher.prototype.get = function () {
            /*开始收集依赖*/
            vm.Dep.pushCollectTarget(this);
            var value;
            try {
                value = this.getter.call(this.host, this.host);
            }
            catch (e) {
                console.error(e);
                value = null;
            }
            //当get失败，则使用loseValue的值
            if (this.loseValue !== undefined && value == null) {
                value = this.loseValue;
            }
            /*结束收集*/
            vm.Dep.popCollectTarget();
            this.cleanupDeps();
            return value;
        };
        /**
         * 添加依赖
         * 在收集依赖的时候，触发 Dependency.collectTarget.addDep
         */
        Watcher.prototype.addDep = function (dep) {
            var id = dep.id;
            if (!this.newDepIds.has(id)) {
                this.newDepIds.add(id);
                this.newDeps.push(dep);
                //向dep添加自己，实现双向访问，depIds用作重复添加的缓存
                if (!this.depIds.has(id)) {
                    dep.add(this);
                }
            }
        };
        /**
         * 清理依赖收集
         */
        Watcher.prototype.cleanupDeps = function () {
            //移除本次收集后，不需要的依赖（通过差异对比）
            var i = this.deps.length;
            while (i--) {
                var dep = this.deps[i];
                if (!this.newDepIds.has(dep.id)) {
                    dep.remove(this);
                }
            }
            //让new作为当前记录的依赖，并清空旧的
            var tmp = this.depIds;
            this.depIds = this.newDepIds;
            this.newDepIds = tmp;
            this.newDepIds.clear();
            tmp = this.deps;
            this.deps = this.newDeps;
            this.newDeps = tmp;
            this.newDeps.length = 0;
        };
        /**
         * 当依赖发生变化就会被执行
         */
        Watcher.prototype.update = function () {
            if (this.sync) {
                //立即渲染
                this.run();
            }
            else {
                //下一帧渲染，可以降低重复渲染的概率
                vm.Tick.add(this);
            }
        };
        /**
         * 执行watch
         */
        Watcher.prototype.run = function () {
            if (this.active) {
                var value = this.get();
                //如果数值不想等，或者是复杂对象就需要更新视图
                if (value !== this.value || vm.isObject(value)) {
                    var oldValue = this.value;
                    this.value = value;
                    /*触发回调渲染视图*/
                    this.cb.call(this.host, value, oldValue);
                }
            }
        };
        /**
         * 收集该watcher的所有deps依赖
         */
        Watcher.prototype.depend = function () {
            var i = this.deps.length;
            while (i--) {
                this.deps[i].depend();
            }
        };
        /**
         * 将自身从所有依赖收集订阅列表删除
         */
        Watcher.prototype.teardown = function () {
            if (this.active) {
                vm.remove(this.host.$watchers, this);
                var i = this.deps.length;
                while (i--) {
                    this.deps[i].remove(this);
                }
                this.active = false;
            }
        };
        return Watcher;
    }());
    vm.Watcher = Watcher;
})(vm || (vm = {}));
var vm;
(function (vm) {
    window["vm"] = vm;
})(vm || (vm = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1vYnNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9EZXBlbmRlbmN5LnRzIiwiLi4vc3JjL0hvc3QudHMiLCIuLi9zcmMvdXRpbHMudHMiLCIuLi9zcmMvSWRNYXAudHMiLCIuLi9zcmMvSW50ZXJwcmV0ZXIudHMiLCIuLi9zcmMvT2JzZXJ2ZXIudHMiLCIuLi9zcmMvVGljay50cyIsIi4uL3NyYy9XYXRjaGVyLnRzIiwiLi4vc3JjL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxJQUFVLEVBQUUsQ0FnRlg7QUFoRkQsV0FBVSxFQUFFO0lBQ0csTUFBRyxHQUFHLENBQUMsQ0FBQztJQUVuQjs7T0FFRztJQUNILFNBQWdCLFdBQVcsQ0FBQyxLQUFZO1FBQ3BDLElBQUksR0FBRyxHQUFRLElBQUksQ0FBQztRQUNwQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzFDLEdBQUcsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDZixJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsTUFBTSxFQUFFO2dCQUNuQixHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQzthQUMzQjtZQUNELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDcEIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ3BCO1NBQ0o7SUFDTCxDQUFDO0lBWGUsY0FBVyxjQVcxQixDQUFBO0lBRUQ7UUFBQTtZQXNCSTs7ZUFFRztZQUNILE9BQUUsR0FBVyxHQUFBLEdBQUcsRUFBRSxDQUFDO1lBRW5COztlQUVHO1lBQ0gsYUFBUSxHQUFjLEVBQUUsQ0FBQztRQThCN0IsQ0FBQztRQWhEVSxxQkFBaUIsR0FBeEIsVUFBeUIsTUFBZTtZQUNwQyxJ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QztJQWpOWSxVQUFPLFVBaU5uQixDQUFBO0FBRUwsQ0FBQyxFQXBOUyxFQUFFLEtBQUYsRUFBRSxRQW9OWDtBQ3BORCxJQUFVLEVBQUUsQ0FFWDtBQUZELFdBQVUsRUFBRTtJQUNYLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDbkIsQ0FBQyxFQUZTLEVBQUUsS0FBRixFQUFFLFFBRVgiLCJzb3VyY2VzQ29udGVudCI6WyJuYW1lc3BhY2Ugdm0ge1xuICAgIGV4cG9ydCB2YXIgdWlkID0gMDtcblxuICAgIC8qKlxuICAgICAqIOmAkuW9kumBjeWOhuaVsOe7hO+8jOi/m+ihjG9i5a+56LGh55qE5L6d6LWW6K6w5b2V44CCXG4gICAgICovXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGRlcGVuZEFycmF5KHZhbHVlOiBhbnlbXSkge1xuICAgICAgICB2YXIgb2JqOiBhbnkgPSBudWxsO1xuICAgICAgICBmb3IgKGxldCBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgb2JqID0gdmFsdWVbaV07XG4gICAgICAgICAgICBpZiAob2JqICYmIG9iai5fX29iX18pIHtcbiAgICAgICAgICAgICAgICBvYmouX19vYl9fLmRlcC5kZXBlbmQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KG9iaikpIHtcbiAgICAgICAgICAgICAgICBkZXBlbmRBcnJheShvYmopO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZXhwb3J0IGNsYXNzIERlcCB7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIOW9k+WJjeato+WcqOaUtumbhuS+nei1lueahOWvueixoVxuICAgICAgICAgKi9cbiAgICAgICAgc3RhdGljIHRhcmdldDogV2F0Y2hlciB8IG51bGwgPSBudWxsO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiDlvZPliY3mraPlnKjmlLbpm4bku6XmnaXnmoTliJfpmJ9cbiAgICAgICAgICovXG4gICAgICAgIHN0YXRpYyBjb2xsZWN0VGFyZ2V0U3RhY2s6IFdhdGNoZXJbXSA9IFtdO1xuXG4gICAgICAgIHN0YXRpYyBwdXNoQ29sbGVjdFRhcmdldCh0YXJnZXQ6IFdhdGNoZXIpIHtcbiAgICAgICAgICAgIHRoaXMuY29sbGVjdFRhcmdldFN0YWNrLnB1c2godGFyZ2V0KTtcbiAgICAgICAgICAgIERlcC50YXJnZXQgPSB0YXJnZXQ7XG4gICAgICAgIH1cblxuICAgICAgICBzdGF0aWMgcG9wQ29sbGVjdFRhcmdldCgpIHtcbiAgICAgICAgICAgIHRoaXMuY29sbGVjdFRhcmdldFN0YWNrLnBvcCgpO1xuICAgICAgICAgICAgRGVwLnRhcmdldCA9IHRoaXMuY29sbGVjdFRhcmdldFN0YWNrW3RoaXMuY29sbGVjdFRhcmdldFN0YWNrLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIOWUr+S4gGlk77yM5pa55L6/aGFzaG1hcOWIpOaWreaYr+WQpuWtmOWcqFxuICAgICAgICAgKi9cbiAgICAgICAgaWQ6IG51bWJlciA9IHVpZCsrO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiDkvqblkKzogIVcbiAgICAgICAgICovXG4gICAgICAgIHdhdGNoZXJzOiBXYXRjaGVyW10gPSBbXTtcblxuICAgICAgICBhZGQoc3ViOiBXYXRjaGVyKSB7XG4gICAgICAgICAgICB0aGlzLndhdGNoZXJzLnB1c2goc3ViKVxuICAgICAgICB9XG5cbiAgICAgICAgLyrnp7vpmaTkuIDkuKrop4Llr5/ogIXlr7nosaEqL1xuICAgICAgICByZW1vdmUoc3ViOiBXYXRjaGVyKSB7XG4gICAgICAgICAgICByZW1vdmUodGhpcy53YXRjaGVycywgc3ViKVxuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIOaUtumbhuS+nei1llxuICAgICAgICAgKi9cbiAgICAgICAgZGVwZW5kKCkge1xuICAgICAgICAgICAgaWYgKERlcC50YXJnZXQpIHtcbiAgICAgICAgICAgICAgICAvLyBEZXAudGFyZ2V05oyH5ZCR55qE5piv5LiA5Liqd2F0Y2hlclxuICAgICAgICAgICAgICAgIERlcC50YXJnZXQuYWRkRGVwKHRoaXMpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICog6YCa55+l5omA5pyJ5L6m5ZCs6ICFXG4gICAgICAgICAqL1xuICAgICAgICBub3RpZnkoKSB7XG4gICAgICAgICAgICBjb25zdCB3cyA9IHRoaXMud2F0Y2hlcnMuc2xpY2UoKVxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDAsIGwgPSB3cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICB3c1tpXS51cGRhdGUoKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSIsIm5hbWVzcGFjZSB2bSB7XG4gICAgZXhwb3J0IGludGVyZmFjZSBJSG9zdCB7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIOW9k+WJjeaJgOaciXdhdGNo5YiX6KGoXG4gICAgICAgICAqL1xuICAgICAgICAkd2F0Y2hlcnM6IFdhdGNoZXJbXTtcblxuICAgICAgICAvKipcbiAgICAgICAgICog5b2T5YmN5piv5ZCm5bey57uP6YeK5pS+XG4gICAgICAgICAqL1xuICAgICAgICAkaXNEZXN0cm95ZWQ6IGJvb2xlYW47XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIOS+puWQrOS4gOS4quaVsOaNruWPkeeUn+eahOWPmOWMllxuICAgICAgICAgKiBAcGFyYW0gZXhwT3JGbiDorr/pl67nmoTmlbDmja7ot6/lvoTvvIzmiJbmlbDmja7lgLznmoTorqHnrpflh73mlbDvvIzlvZPot6/lvoTkuK3nmoTlj5jph4/miJborqHnrpflh73mlbDmiYDorr/pl67nmoTlgLzlj5HnlJ/lj5jljJbml7bvvIzlsIbkvJrooqvph43mlrDmiafooYxcbiAgICAgICAgICogQHBhcmFtIGNiIOmHjeaWsOaJp+ihjOWQju+8jOWPkeeUn+WPmOWMluWImeS8muWHuuWPkeWbnuiwg+WHveaVsFxuICAgICAgICAgKi9cbiAgICAgICAgJHdhdGNoKGV4cE9yRm46IHN0cmluZyB8IEZ1bmN0aW9uLCBjYjogKG9sZFZhbHVlOiBhbnksIG5ld1ZhbHVlOiBhbnkpID0+IHZvaWQsIGxvc2VWYWx1ZT86IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCB1bmRlZmluZWQsIHN5bmM/OiBib29sZWFuIHwgdW5kZWZpbmVkKTogV2F0Y2hlciB8IHVuZGVmaW5lZDtcblxuICAgICAgICAvKipcbiAgICAgICAgICog6YeK5pS+aG9zdO+8jOWMheaLrOaJgOaciXdhdGNoXG4gICAgICAgICAqL1xuICAgICAgICAkZGVzdHJveSgpOiB2b2lkO1xuICAgIH1cblxuICAgIGV4cG9ydCBjbGFzcyBIb3N0IGltcGxlbWVudHMgSUhvc3Qge1xuXG4gICAgICAgICR3YXRjaGVycyE6IFdhdGNoZXJbXTtcbiAgICAgICAgJGlzRGVzdHJveWVkITogYm9vbGVhbjtcblxuICAgICAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgICAgIC8v6Ziy5q2i5Lqn55Sf5p6a5Li+XG4gICAgICAgICAgICBkZWYodGhpcywgXCIkd2F0Y2hlcnNcIiwgW10pO1xuICAgICAgICAgICAgZGVmKHRoaXMsIFwiJGlzRGVzdHJveWVkXCIsIGZhbHNlKTtcblxuICAgICAgICAgICAgLy/lrp7njrDln7rnoYDmlrnms5XvvIznlKjkuo7ooajovr7lvI/kuK3mlrnkvr/lvpfosIPnlKhcbiAgICAgICAgICAgIGltcGxlbWVudEVudmlyb25tZW50KHRoaXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgJHdhdGNoKGV4cE9yRm46IHN0cmluZyB8IEZ1bmN0aW9uLCBjYjogKG9sZFZhbHVlOiBhbnksIG5ld1ZhbHVlOiBhbnkpID0+IHZvaWQsIGxvc2VWYWx1ZT86IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCB1bmRlZmluZWQsIHN5bmM/OiBib29sZWFuIHwgdW5kZWZpbmVkKTogV2F0Y2hlciB8IHVuZGVmaW5lZCB7XG4gICAgICAgICAgICBpZiAodGhpcy4kaXNEZXN0cm95ZWQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwidGhlIGhvc3QgaXMgZGVzdHJveWVkXCIsIHRoaXMpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghKCh0aGlzIGFzIGFueSkuX19vYl9fIGluc3RhbmNlb2YgT2JzZXJ2ZXIpKSB7XG4gICAgICAgICAgICAgICAgdm0ub2JzZXJ2ZSh0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxldCB3YXRjaGVyID0gbmV3IFdhdGNoZXIodGhpcywgZXhwT3JGbiwgY2IsIHsgbG9zZVZhbHVlLCBzeW5jIH0pXG4gICAgICAgICAgICB0aGlzLiR3YXRjaGVycy5wdXNoKHdhdGNoZXIpO1xuICAgICAgICAgICAgcmV0dXJuIHdhdGNoZXI7XG4gICAgICAgIH1cblxuICAgICAgICAkZGVzdHJveSgpIHtcbiAgICAgICAgICAgIHZhciB0ZW1wID0gdGhpcy4kd2F0Y2hlcnM7XG4gICAgICAgICAgICB0aGlzLiR3YXRjaGVycyA9IFtdO1xuICAgICAgICAgICAgZm9yIChsZXQgdyBvZiB0ZW1wKSB7XG4gICAgICAgICAgICAgICAgdy50ZWFyZG93bigpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLiRpc0Rlc3Ryb3llZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDlkJHmma7pgJrlr7nosaHms6jlhaVIb3N055u45YWz5pa55rOVXG4gICAgICovXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGltcGxlbWVudEhvc3Q8VD4ob2JqOiBUKTogVCAmIElIb3N0IHtcbiAgICAgICAgaWYgKGhhc093bihvYmosIFwiJHdhdGNoZXJzXCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gb2JqIGFzIGFueTtcbiAgICAgICAgfVxuICAgICAgICBkZWYob2JqLCBcIiR3YXRjaGVyc1wiLCBbXSk7XG4gICAgICAgIGRlZihvYmosIFwiJGlzRGVzdHJveWVkXCIsIGZhbHNlKTtcbiAgICAgICAgZGVmKG9iaiwgXCIkd2F0Y2hcIiwgSG9zdC5wcm90b3R5cGUuJHdhdGNoKTtcbiAgICAgICAgZGVmKG9iaiwgXCIkZGVzdHJveVwiLCBIb3N0LnByb3RvdHlwZS4kZGVzdHJveSk7XG5cbiAgICAgICAgLy/lrp7njrDln7rnoYDmlrnms5XvvIznlKjkuo7ooajovr7lvI/kuK3mlrnkvr/lvpfosIPnlKhcbiAgICAgICAgaW1wbGVtZW50RW52aXJvbm1lbnQob2JqKTtcblxuICAgICAgICBvYnNlcnZlKG9iaik7XG4gICAgICAgIHJldHVybiBvYmogYXMgYW55O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOiuvue9ruaIlua3u+WKoOafkOS4quWvueixoeeahOafkOS4quWxnuaAp1xuICAgICAqIEBwYXJhbSB0YXJnZXQg5a+56LGh77yM5Lmf5Y+v5Lul5piv5pWw57uEXG4gICAgICogQHBhcmFtIGtleSBcbiAgICAgKiBAcGFyYW0gdmFsdWUgXG4gICAgICovXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNldCh0YXJnZXQ6IGFueSwga2V5OiBzdHJpbmcgfCBudW1iZXIsIHZhbDogYW55KSB7XG4gICAgICAgIGlmIChpc1VuZGVmKHRhcmdldCkgfHwgaXNQcmltaXRpdmUodGFyZ2V0KSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKChcIuaXoOazleiuvue9ruWxnuaAp+WIsCB1bmRlZmluZWQsIG51bGwsIOaIliBwcmltaXRpdmUg5YC8OiBcIiArICgodGFyZ2V0KSkpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh0YXJnZXQpICYmIGlzVmFsaWRBcnJheUluZGV4KGtleSkpIHtcbiAgICAgICAgICAgIHRhcmdldC5sZW5ndGggPSBNYXRoLm1heCh0YXJnZXQubGVuZ3RoLCBrZXkgYXMgbnVtYmVyKTtcbiAgICAgICAgICAgIHRhcmdldC5zcGxpY2Uoa2V5IGFzIG51bWJlciwgMSwgdmFsKTtcbiAgICAgICAgICAgIHJldHVybiB2YWxcbiAgICAgICAgfVxuICAgICAgICBpZiAoa2V5IGluIHRhcmdldCAmJiAhKGtleSBpbiBPYmplY3QucHJvdG90eXBlKSkge1xuICAgICAgICAgICAgdGFyZ2V0W2tleV0gPSB2YWw7XG4gICAgICAgICAgICByZXR1cm4gdmFsXG4gICAgICAgIH1cbiAgICAgICAgdmFyIG9iID0gKHRhcmdldCkuX19vYl9fO1xuICAgICAgICBpZiAoIW9iKSB7XG4gICAgICAgICAgICB0YXJnZXRba2V5XSA9IHZhbDtcbiAgICAgICAgICAgIHJldHVybiB2YWxcbiAgICAgICAgfVxuICAgICAgICBkZWZpbmVSZWFjdGl2ZShvYi52YWx1ZSwga2V5IGFzIHN0cmluZywgdmFsKTtcbiAgICAgICAgb2IuZGVwLm5vdGlmeSgpO1xuICAgICAgICByZXR1cm4gdmFsXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5Yig6Zmk5p+Q5Liq5a+56LGh55qE5p+Q5Liq5bGe5oCnXG4gICAgICogQHBhcmFtIHRhcmdldCDlr7nosaHvvIzkuZ/lj6/ku6XmmK/mlbDnu4RcbiAgICAgKiBAcGFyYW0ga2V5IFxuICAgICAqL1xuICAgIGV4cG9ydCBmdW5jdGlvbiBkZWwodGFyZ2V0OiBhbnksIGtleTogc3RyaW5nIHwgbnVtYmVyKSB7XG4gICAgICAgIGlmIChpc1VuZGVmKHRhcmdldCkgfHwgaXNQcmltaXRpdmUodGFyZ2V0KSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKChcIuaXoOazleWIoOmZpOWxnuaAp+WIsCB1bmRlZmluZWQsIG51bGwsIOaIliBwcmltaXRpdmUg5YC8OiBcIiArICgodGFyZ2V0KSkpKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh0YXJnZXQpICYmIGlzVmFsaWRBcnJheUluZGV4KGtleSkpIHtcbiAgICAgICAgICAgIHRhcmdldC5zcGxpY2Uoa2V5IGFzIG51bWJlciwgMSk7XG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuICAgICAgICB2YXIgb2IgPSAodGFyZ2V0KS5fX29iX187XG4gICAgICAgIGlmICghaGFzT3duKHRhcmdldCwga2V5IGFzIHN0cmluZykpIHtcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSB0YXJnZXRba2V5XTtcbiAgICAgICAgaWYgKCFvYikge1xuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgICAgb2IuZGVwLm5vdGlmeSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOazqOino++8jOagh+azqOW9k+WJjeS+puWQrOeahOWPmOmHj+aIluihqOi+vuW8j1xuICAgICAqIEBwYXJhbSBleHBPckZuIOi3r+W+hOaIluWPluWAvOWHveaVsFxuICAgICAqL1xuICAgIGV4cG9ydCBmdW5jdGlvbiB3YXRjaChleHBPckZuOiBzdHJpbmcgfCBGdW5jdGlvbikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldDogSG9zdCwgcHJvcGVydHlLZXk6IHN0cmluZywgZGVzY3JpcHRvcjogUHJvcGVydHlEZXNjcmlwdG9yKSB7XG4gICAgICAgICAgICBpZiAoIWhhc093bih0YXJnZXQsIFwiJHdhdGNoQW5ub3RhdGlvbnNcIikpIHtcbiAgICAgICAgICAgICAgICAodGFyZ2V0IGFzIGFueSlbXCIkd2F0Y2hBbm5vdGF0aW9uc1wiXSA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGxpc3QgPSAodGFyZ2V0IGFzIGFueSlbXCIkd2F0Y2hBbm5vdGF0aW9uc1wiXSBhcyB7XG4gICAgICAgICAgICAgICAgZXhwT3JGbjogc3RyaW5nIHwgRnVuY3Rpb24sXG4gICAgICAgICAgICAgICAgY2I6IChvbGRWYWx1ZTogYW55LCBuZXdWYWx1ZTogYW55KSA9PiB2b2lkXG4gICAgICAgICAgICB9W11cbiAgICAgICAgICAgIHZhciBjYiA9ICh0YXJnZXQgYXMgYW55KVtwcm9wZXJ0eUtleV0gYXMgKG9sZFZhbHVlOiBhbnksIG5ld1ZhbHVlOiBhbnkpID0+IHZvaWRcblxuICAgICAgICAgICAgbGlzdC5wdXNoKHsgZXhwT3JGbiwgY2IgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDms6jop6PvvIzmoIfms6jlvZPliY3pnIDopoHorr/pl67nmoTnsbtcbiAgICAgKi9cbiAgICBleHBvcnQgZnVuY3Rpb24gaG9zdChjb25zdHJ1Y3RvcjogbmV3ICgpID0+IEhvc3QpOiBhbnkge1xuICAgICAgICByZXR1cm4gY2xhc3MgZXh0ZW5kcyBjb25zdHJ1Y3RvciB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgICAgICAgICBzdXBlcigpXG5cbiAgICAgICAgICAgICAgICBvYnNlcnZlKHRoaXMpO1xuXG4gICAgICAgICAgICAgICAgdmFyIGxpc3QgPSAodGhpcyBhcyBhbnkpLl9fcHJvdG9fX1tcIiR3YXRjaEFubm90YXRpb25zXCJdIGFzIHtcbiAgICAgICAgICAgICAgICAgICAgZXhwT3JGbjogc3RyaW5nIHwgRnVuY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIGNiOiAob2xkVmFsdWU6IGFueSwgbmV3VmFsdWU6IGFueSkgPT4gdm9pZFxuICAgICAgICAgICAgICAgIH1bXVxuXG4gICAgICAgICAgICAgICAgaWYgKGxpc3QgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCB3IG9mIGxpc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuJHdhdGNoKHcuZXhwT3JGbiwgdy5jYi5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbn0iLCJuYW1lc3BhY2Ugdm0ge1xuXG4gICAgY29uc3QgX3RvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbiAgICBjb25zdCBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbiAgICBleHBvcnQgZnVuY3Rpb24gaXNPYmplY3Qob2JqOiBhbnkpIHtcbiAgICAgICAgcmV0dXJuIG9iaiAhPT0gbnVsbCAmJiB0eXBlb2Ygb2JqID09PSAnb2JqZWN0J1xuICAgIH1cblxuICAgIGV4cG9ydCBmdW5jdGlvbiBoYXNPd24ob2JqOiBhbnksIGtleTogc3RyaW5nKSB7XG4gICAgICAgIHJldHVybiBoYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KVxuICAgIH1cblxuICAgIGV4cG9ydCBmdW5jdGlvbiBpc1BsYWluT2JqZWN0KG9iajogYW55KSB7XG4gICAgICAgIHJldHVybiBfdG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBPYmplY3RdJztcbiAgICB9XG5cbiAgICBleHBvcnQgZnVuY3Rpb24gZGVmKG9iajogYW55LCBrZXk6IHN0cmluZywgdmFsOiBhbnksIGVudW1lcmFibGU/OiBib29sZWFuKSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmosIGtleSwge1xuICAgICAgICAgICAgdmFsdWU6IHZhbCxcbiAgICAgICAgICAgIGVudW1lcmFibGU6ICEhZW51bWVyYWJsZSxcbiAgICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGV4cG9ydCBmdW5jdGlvbiBpc1VuZGVmKHY6IGFueSkge1xuICAgICAgICByZXR1cm4gdiA9PT0gdW5kZWZpbmVkIHx8IHYgPT09IG51bGxcbiAgICB9XG5cbiAgICBleHBvcnQgZnVuY3Rpb24gaXNEZWYodjogYW55KSB7XG4gICAgICAgIHJldHVybiB2ICE9PSB1bmRlZmluZWQgJiYgdiAhPT0gbnVsbFxuICAgIH1cblxuICAgIGV4cG9ydCBmdW5jdGlvbiBpc1RydWUodjogYW55KSB7XG4gICAgICAgIHJldHVybiB2ID09PSB0cnVlXG4gICAgfVxuXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGlzRmFsc2UodjogYW55KSB7XG4gICAgICAgIHJldHVybiB2ID09PSBmYWxzZVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOWIpOaWreaYr+WQpuS4uuWNlee6r+eahOaVsOaNruexu+Wei1xuICAgICAqL1xuICAgIGV4cG9ydCBmdW5jdGlvbiBpc1ByaW1pdGl2ZSh2YWx1ZTogYW55KSB7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICAgICB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInIHx8XG4gICAgICAgICAgICAvLyAkZmxvdy1kaXNhYmxlLWxpbmVcbiAgICAgICAgICAgIHR5cGVvZiB2YWx1ZSA9PT0gJ3N5bWJvbCcgfHxcbiAgICAgICAgICAgIHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nXG4gICAgICAgIClcbiAgICB9XG5cbiAgICBleHBvcnQgZnVuY3Rpb24gaXNWYWxpZEFycmF5SW5kZXgodmFsOiBhbnkpIHtcbiAgICAgICAgdmFyIG4gPSBwYXJzZUZsb2F0KFN0cmluZyh2YWwpKTtcbiAgICAgICAgcmV0dXJuIG4gPj0gMCAmJiBNYXRoLmZsb29yKG4pID09PSBuICYmIGlzRmluaXRlKHZhbClcbiAgICB9XG5cblxuXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZShhcnI6IGFueVtdLCBpdGVtOiBhbnkpIHtcbiAgICAgICAgaWYgKGFyci5sZW5ndGgpIHtcbiAgICAgICAgICAgIHZhciBpbmRleCA9IGFyci5pbmRleE9mKGl0ZW0pO1xuICAgICAgICAgICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJyLnNwbGljZShpbmRleCwgMSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgY29uc3QgdW5pY29kZVJlZ0V4cCA9IC9hLXpBLVpcXHUwMEI3XFx1MDBDMC1cXHUwMEQ2XFx1MDBEOC1cXHUwMEY2XFx1MDBGOC1cXHUwMzdEXFx1MDM3Ri1cXHUxRkZGXFx1MjAwQy1cXHUyMDBEXFx1MjAzRi1cXHUyMDQwXFx1MjA3MC1cXHUyMThGXFx1MkMwMC1cXHUyRkVGXFx1MzAwMS1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkZELztcbiAgICAvLyBjb25zdCBiYWlsUkUgPSBuZXcgUmVnRXhwKFwiW15cIiArICh1bmljb2RlUmVnRXhwLnNvdXJjZSkgKyBcIi4kX1xcXFxkXVwiKTtcblxuICAgIGNvbnN0IHBhdGhDYWNoZU1hcDogeyBba2V5OiBzdHJpbmddOiAob2JqOiBhbnkpID0+IGFueSB9ID0ge31cblxuICAgIC8qKlxuICAgICAqIOiusuS9v+eUqC7liIbpmpTnmoTot6/lvoTorr/pl67ovazmjaLkuLrlh73mlbDjgIJcbiAgICAgKiBAcGFyYW0gcGF0aCBcbiAgICAgKi9cbiAgICBleHBvcnQgZnVuY3Rpb24gcGFyc2VQYXRoKHBhdGg6IHN0cmluZyk6ICgob2JqOiBhbnkpID0+IGFueSkge1xuICAgICAgICBsZXQgZnVuYyA9IHBhdGhDYWNoZU1hcFtwYXRoXVxuICAgICAgICBpZiAoZnVuYykge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmM7XG4gICAgICAgIH1cbiAgICAgICAgLy8gaWYgKGJhaWxSRS50ZXN0KHBhdGgpKSB7XG4gICAgICAgICAgICAvL+WkjeadguihqOi+vuW8j1xuICAgICAgICAgICAgdmFyIGkgPSBuZXcgSW50ZXJwcmV0ZXIocGF0aClcbiAgICAgICAgICAgIGZ1bmMgPSBmdW5jdGlvbiAoZW52OiBhbnkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gaS5ydW4oZW52KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgLy8gfSBlbHNlIHtcbiAgICAgICAgLy8gICAgIC8v566A5Y2V55qELuWxnuaAp+iuv+mXrumAu+i+kVxuICAgICAgICAvLyAgICAgdmFyIHNlZ21lbnRzID0gcGF0aC5zcGxpdCgnLicpO1xuICAgICAgICAvLyAgICAgZnVuYyA9IGZ1bmN0aW9uIChvYmo6IGFueSkge1xuICAgICAgICAvLyAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2VnbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgLy8gICAgICAgICAgICAgaWYgKCFvYmopIHsgcmV0dXJuIH1cbiAgICAgICAgLy8gICAgICAgICAgICAgb2JqID0gb2JqW3NlZ21lbnRzW2ldXTtcbiAgICAgICAgLy8gICAgICAgICB9XG4gICAgICAgIC8vICAgICAgICAgcmV0dXJuIG9ialxuICAgICAgICAvLyAgICAgfVxuICAgICAgICAvLyB9XG4gICAgICAgIHBhdGhDYWNoZU1hcFtwYXRoXSA9IGZ1bmM7XG4gICAgICAgIHJldHVybiBmdW5jO1xuICAgIH1cblxuICAgIGV4cG9ydCBmdW5jdGlvbiBpc05hdGl2ZShDdG9yOiBhbnkpIHtcbiAgICAgICAgcmV0dXJuIHR5cGVvZiBDdG9yID09PSAnZnVuY3Rpb24nICYmIC9uYXRpdmUgY29kZS8udGVzdChDdG9yLnRvU3RyaW5nKCkpXG4gICAgfVxuXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vdXRpbHMudHNcIiAvPlxubmFtZXNwYWNlIHZtIHtcbiAgICBleHBvcnQgaW50ZXJmYWNlIElJZE1hcCB7XG4gICAgICAgIGFkZCh2YWx1ZTogbnVtYmVyKTogdGhpcztcbiAgICAgICAgY2xlYXIoKTogdm9pZDtcbiAgICAgICAgaGFzKHZhbHVlOiBudW1iZXIpOiBib29sZWFuO1xuICAgIH1cbiAgICB2YXIgX1NldDogbmV3ICgpID0+IElJZE1hcDtcbiAgICBpZiAodHlwZW9mIFNldCAhPT0gJ3VuZGVmaW5lZCcgJiYgaXNOYXRpdmUoU2V0KSkge1xuICAgICAgICBfU2V0ID0gU2V0IGFzIGFueTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjbGFzcyBfSWRNYXAge1xuICAgICAgICAgICAgc2V0OiB7IFtrZXk6IG51bWJlcl06IGJvb2xlYW4gfSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICAgICAgICBoYXMoa2V5OiBudW1iZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zZXRba2V5XSA9PT0gdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYWRkKGtleTogbnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRba2V5XSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjbGVhcigpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgX1NldCA9IF9JZE1hcCBhcyBhbnk7XG4gICAgfVxuXG4gICAgZXhwb3J0IHZhciBJZE1hcCA9IF9TZXQ7XG59XG4iLCJuYW1lc3BhY2Ugdm0ge1xuICAgIGNvbnN0IHN5bWJvbExpc3QgPSBbXG4gICAgICAgIFwiKFwiLCBcIilcIiwgXCJbXCIsIFwiXVwiLCBcIntcIiwgXCJ9XCIsIFwiLlwiLFxuICAgICAgICBcIiFcIixcbiAgICAgICAgXCIqKlwiLFxuICAgICAgICBcIipcIiwgXCIvXCIsIFwiJVwiLFxuICAgICAgICBcIitcIiwgXCItXCIsXG4gICAgICAgIFwiPlwiLCBcIjxcIiwgXCI+PVwiLCBcIjw9XCIsXG4gICAgICAgIFwiIT1cIiwgXCI9PVwiLFxuICAgICAgICBcIiYmXCIsIFwifHxcIixcbiAgICAgICAgXCIsXCIsXG4gICAgXVxuXG4gICAgZXhwb3J0IGVudW0gTm9kZVR5cGUge1xuICAgICAgICAvL+i/kOeul+esplxuICAgICAgICBQMCxcbiAgICAgICAgXCJbXCIsIFwiKFwiLCBcIntcIiwgXCIuXCIsIFAxLFxuICAgICAgICBcIiFcIiwgUDIsXG4gICAgICAgIFwiKipcIiwgUDMsXG4gICAgICAgIFwiKlwiLCBcIi9cIiwgXCIlXCIsIFA0LFxuICAgICAgICBcIitcIiwgXCItXCIsIFA1LFxuICAgICAgICBcIj5cIiwgXCI8XCIsIFwiPj1cIiwgXCI8PVwiLCBQNixcbiAgICAgICAgXCIhPVwiLCBcIj09XCIsIFA3LFxuICAgICAgICBcIiYmXCIsIFA4LCBcInx8XCIsIFA5LFxuICAgICAgICBcIixcIiwgUDEwLFxuXG4gICAgICAgIFwiXVwiLCBcIilcIiwgXCJ9XCIsIFAxMSwvL+e7k+adn+espuWPt1xuXG4gICAgICAgIC8v5YC8XG4gICAgICAgIFwibnVtYmVyXCIsXG4gICAgICAgIFwid29yZFwiLFxuICAgICAgICBcInN0cmluZ1wiLFxuICAgICAgICBcImJvb2xlYW5cIixcbiAgICAgICAgXCJudWxsXCIsXG4gICAgICAgIFAxMixcbiAgICAgICAgXCJhbm5vdGF0aW9uXCIsXG5cbiAgICAgICAgLy/nu4TlkIjvvIzlj6rkvJrlnKhBU1TkuK3lh7rnjrBcbiAgICAgICAgXCJjYWxsXCIsXG4gICAgICAgIFwibGFtYmRhXCJcblxuICAgIH1cblxuICAgIGV4cG9ydCBjbGFzcyBXb3JkTm9kZSB7XG4gICAgICAgIHB1YmxpYyBsaW5lRW5kOiBudW1iZXI7XG4gICAgICAgIC8v54i26IqC54K5XG4gICAgICAgIHB1YmxpYyBwYXJlbnQ6IEFTVE5vZGUgfCBudWxsID0gbnVsbDtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIOebuOWFs+azqOmHilxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGljIGZyb250QW5ub3RhdGlvbjogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBwdWJsaWMgYmVoaW5kQW5ub3RhdGlvbjogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgICAgIHB1YmxpYyB0eXBlOiBOb2RlVHlwZSxcbiAgICAgICAgICAgIHB1YmxpYyB2YWx1ZTogYW55LFxuICAgICAgICAgICAgcHVibGljIGxpbmVTdGFydDogbnVtYmVyLFxuICAgICAgICAgICAgcHVibGljIGNvbHVtblN0YXJ0OiBudW1iZXIsXG4gICAgICAgICAgICBwdWJsaWMgY29sdW1uRW5kOiBudW1iZXIsXG4gICAgICAgICkgeyB0aGlzLmxpbmVFbmQgPSBsaW5lU3RhcnQgfVxuICAgIH1cblxuICAgIGV4cG9ydCB0eXBlIEFTVE5vZGUgPSBWYWx1ZUFTVE5vZGUgfCBCcmFja2V0QVNUTm9kZSB8IFVuaXRhcnlBU1ROb2RlIHwgQmluYXJ5QVNUTm9kZSB8IENhbGxBU1ROb2RlXG5cbiAgICBleHBvcnQgY2xhc3MgQVNUTm9kZUJhc2Uge1xuICAgICAgICAvL+eItuiKgueCuVxuICAgICAgICBwdWJsaWMgcGFyZW50OiBBU1ROb2RlIHwgbnVsbCA9IG51bGw7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiDnm7jlhbPms6jph4pcbiAgICAgICAgICovXG4gICAgICAgIHB1YmxpYyBmcm9udEFubm90YXRpb246IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgcHVibGljIGJlaGluZEFubm90YXRpb246IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICAgICAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICog5pON5L2c56ymXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHB1YmxpYyBvcGVyYXRvcjogTm9kZVR5cGVcbiAgICAgICAgKSB7XG5cbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgZXhwb3J0IGNsYXNzIFZhbHVlQVNUTm9kZSBleHRlbmRzIEFTVE5vZGVCYXNlIHtcbiAgICAgICAgY29uc3RydWN0b3IoXG4gICAgICAgICAgICBwdWJsaWMgdmFsdWU6IFdvcmROb2RlXG5cbiAgICAgICAgKSB7XG4gICAgICAgICAgICBzdXBlcih2YWx1ZS50eXBlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGV4cG9ydCBjbGFzcyBCcmFja2V0QVNUTm9kZSBleHRlbmRzIEFTVE5vZGVCYXNlIHtcbiAgICAgICAgY29uc3RydWN0b3IoXG4gICAgICAgICAgICBwdWJsaWMgb3BlcmF0b3I6IE5vZGVUeXBlLFxuICAgICAgICAgICAgcHVibGljIG5vZGU6IEFTVE5vZGVcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBzdXBlcihvcGVyYXRvcik7XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIGV4cG9ydCBjbGFzcyBVbml0YXJ5QVNUTm9kZSBleHRlbmRzIEFTVE5vZGVCYXNlIHtcbiAgICAgICAgY29uc3RydWN0b3IoXG4gICAgICAgICAgICBwdWJsaWMgb3BlcmF0b3I6IE5vZGVUeXBlLFxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiDkuIDlhYPooajovr7lvI/nmoTlj7PlgLxcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcHVibGljIHJpZ2h0OiBBU1ROb2RlXG4gICAgICAgICkge1xuICAgICAgICAgICAgc3VwZXIob3BlcmF0b3IpO1xuICAgICAgICAgICAgdGhpcy5yaWdodC5wYXJlbnQgPSB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZXhwb3J0IGNsYXNzIEJpbmFyeUFTVE5vZGUgZXh0ZW5kcyBBU1ROb2RlQmFzZSB7XG4gICAgICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiDkuozlhYPooajovr7lvI/nmoTlt6blgLxcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcHVibGljIGxlZnQ6IEFTVE5vZGUsXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIOi/kOeul+esplxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBwdWJsaWMgb3BlcmF0b3I6IE5vZGVUeXBlLFxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiDkuozlhYPooajovr7lvI/nmoTlt6blgLxcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcHVibGljIHJpZ2h0OiBBU1ROb2RlXG4gICAgICAgICkge1xuICAgICAgICAgICAgc3VwZXIob3BlcmF0b3IpO1xuICAgICAgICAgICAgdGhpcy5sZWZ0LnBhcmVudCA9IHRoaXM7XG4gICAgICAgICAgICB0aGlzLnJpZ2h0LnBhcmVudCA9IHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBleHBvcnQgY2xhc3MgQ2FsbEFTVE5vZGUgZXh0ZW5kcyBBU1ROb2RlQmFzZSB7XG4gICAgICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiDlh73mlbDorr/pl67oioLngrlcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcHVibGljIGxlZnQ6IEFTVE5vZGUsXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIOWHveaVsOWPguaVsOWIl+ihqFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBwdWJsaWMgcGFyYW1ldGVyczogQVNUTm9kZVtdXG4gICAgICAgICkge1xuICAgICAgICAgICAgc3VwZXIoTm9kZVR5cGUuY2FsbCk7XG4gICAgICAgICAgICB0aGlzLmxlZnQucGFyZW50ID0gdGhpcztcbiAgICAgICAgICAgIHRoaXMucGFyYW1ldGVycy5mb3JFYWNoKGEgPT4gYS5wYXJlbnQgPSB0aGlzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHplcm9Db2RlID0gXCIwXCIuY2hhckNvZGVBdCgwKTtcbiAgICBjb25zdCBuaW5lQ29kZSA9IFwiOVwiLmNoYXJDb2RlQXQoMCk7XG5cbiAgICBjb25zdCBvcGVyYXRvckNoYXJNYXA6IHsgW2tleTogc3RyaW5nXTogYm9vbGVhbiB9ID0ge307XG4gICAgc3ltYm9sTGlzdC5mb3JFYWNoKGEgPT4gb3BlcmF0b3JDaGFyTWFwW2EuY2hhckF0KDApXSA9IHRydWUpO1xuXG4gICAgY29uc3QgbWFya01hcDogeyBba2V5OiBzdHJpbmddOiBib29sZWFuIH0gPSB7fTtcbiAgICBbXCJcXFwiXCIsIFwiJ1wiLCBcImBcIl0uZm9yRWFjaChhID0+IG1hcmtNYXBbYV0gPSB0cnVlKVxuXG4gICAgY29uc3QgZG91YmxlT3BNYXA6IHsgW2tleTogc3RyaW5nXTogYm9vbGVhbiB9ID0ge307XG4gICAgc3ltYm9sTGlzdC5mb3JFYWNoKGEgPT4ge1xuICAgICAgICBpZiAoYS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICBkb3VibGVPcE1hcFthLmNoYXJBdCgwKV0gPSB0cnVlO1xuICAgICAgICB9XG4gICAgfSlcblxuICAgIGNvbnN0IHNwYWNlTWFwOiB7IFtrZXk6IHN0cmluZ106IGJvb2xlYW4gfSA9IHt9O1xuICAgIFtcIiBcIiwgXCJcXG5cIiwgXCJcXHJcIiwgXCJcXHRcIl0uZm9yRWFjaChhID0+IHNwYWNlTWFwW2FdID0gdHJ1ZSlcblxuICAgIGV4cG9ydCBjbGFzcyBJbnRlcnByZXRlciB7XG5cbiAgICAgICAgYXN0OiBBU1ROb2RlO1xuXG4gICAgICAgIGFzdEVycm9yTGlzdDogc3RyaW5nW10gPSBbXTtcblxuICAgICAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgICAgIHB1YmxpYyBleHByZXNzaW9uOiBzdHJpbmdcbiAgICAgICAgKSB7XG5cbiAgICAgICAgICAgIHRoaXMuYXN0ID0gSW50ZXJwcmV0ZXIudG9BU1QoSW50ZXJwcmV0ZXIudG9Xb3Jkcyh0aGlzLmV4cHJlc3Npb24pLCB0aGlzLmV4cHJlc3Npb24sIHRoaXMuYXN0RXJyb3JMaXN0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXRpYyB0b1dvcmRzKGV4cHJlc3Npb246IHN0cmluZykge1xuICAgICAgICAgICAgdmFyIGxpbmU6IG51bWJlciA9IDA7XG4gICAgICAgICAgICB2YXIgY29sdW1uOiBudW1iZXIgPSAwO1xuICAgICAgICAgICAgbGV0IHN0YXJ0Q29sdW06IG51bWJlciA9IC0xOy8v5LuF5LuF5Zyo5aSa6KGM55qE5aSE55CG5Lit5L2/55SoXG4gICAgICAgICAgICB2YXIgdGVtcCA9IFwiXCI7XG4gICAgICAgICAgICB2YXIgbGFzdENoYXIgPSBcIlwiO1xuICAgICAgICAgICAgdmFyIHN0YXRlOiBudW1iZXIgPSAwOy8vMOWIneWni+eKtuaAge+8mzHmlbDlrZfvvJsy6L+Q566X56ym77ybM+W8leWPt+Wtl+espuS4su+8mzTljZXor43vvJs16KGM5rOo6YeK77ybNuWdl+azqOmHilxuICAgICAgICAgICAgdmFyIG1hcmtUeXBlOiBzdHJpbmc7XG5cbiAgICAgICAgICAgIHZhciBub2RlTGlzdDogV29yZE5vZGVbXSA9IFtdO1xuXG4gICAgICAgICAgICB2YXIgcmVzZXQgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgc3RhdGUgPSAwO1xuICAgICAgICAgICAgICAgIHRlbXAgPSAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBydW4gPSAoY2hhcjogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHN0YXRlID09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNwYWNlTWFwW2NoYXJdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbGV0IGNvZGUgPSBjaGFyLmNoYXJDb2RlQXQoMCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb2RlID49IHplcm9Db2RlICYmIGNvZGUgPD0gbmluZUNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8v5pWw5a2XXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZSA9IDFcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXAgKz0gY2hhcjtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChvcGVyYXRvckNoYXJNYXBbY2hhcl0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8v6L+Q566X56ymXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wICs9IGNoYXI7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZG91YmxlT3BNYXBbY2hhcl0gfHwgY2hhciA9PSBcIi9cIikgey8v5pyJLy8g5ZKMIC8qIOetieS4pOenjeazqOmHiueahOaDheWGtVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8v5Y+v6IO95piv5aSa6L+Q566X56ymXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUgPSAyO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjaGFyID09IFwiLVwiICYmIChub2RlTGlzdC5sZW5ndGggIT0gMCAmJiBub2RlTGlzdFtub2RlTGlzdC5sZW5ndGggLSAxXS50eXBlIDwgTm9kZVR5cGUuUDEwIHx8IG5vZGVMaXN0Lmxlbmd0aCA9PSAwKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8v6LSf5pWw5pWw5a2XXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUgPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoTm9kZVR5cGVbdGVtcCBhcyBhbnldID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBcIuihqOi+vuW8j+e8luivkeWksei0pVwiICsgZXhwcmVzc2lvbiArIFwiIOS4jeaUr+aMgeeahOi/kOeul+espjogXCIgKyB0ZW1wO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlTGlzdC5wdXNoKG5ldyBXb3JkTm9kZShOb2RlVHlwZVt0ZW1wIGFzIGFueV0gYXMgYW55LCBudWxsLCBsaW5lLCBjb2x1bW4gLSB0ZW1wLmxlbmd0aCArIDEsIGNvbHVtbikpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzZXQoKVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobWFya01hcFtjaGFyXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy/lvJXlj7dcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmtUeXBlID0gY2hhcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0Q29sdW0gPSBjb2x1bW5cbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlID0gM1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy/ljZXor41cbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXAgKz0gY2hhcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlID0gNDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT0gMSkge1xuICAgICAgICAgICAgICAgICAgICAvL+aVsOWtl1xuICAgICAgICAgICAgICAgICAgICBsZXQgY29kZSA9IGNoYXIuY2hhckNvZGVBdCgwKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvZGUgPj0gemVyb0NvZGUgJiYgY29kZSA8PSBuaW5lQ29kZSB8fCBjaGFyID09IFwiLlwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wICs9IGNoYXJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVMaXN0LnB1c2gobmV3IFdvcmROb2RlKE5vZGVUeXBlLm51bWJlciwgcGFyc2VGbG9hdCh0ZW1wKSwgbGluZSwgY29sdW1uIC0gdGVtcC5sZW5ndGgsIGNvbHVtbiAtIDEpKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzZXQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bihjaGFyKTsvL+mHjeaWsOaJp+ihjFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8v6L+Q566X56ymXG4gICAgICAgICAgICAgICAgICAgIGxldCBtZyA9IHRlbXAgKyBjaGFyO1xuICAgICAgICAgICAgICAgICAgICBpZiAobWcgPT0gXCIvL1wiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL+ihjOazqOmHilxuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcCArPSBjaGFyO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUgPSA1O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG1nID09IFwiLypcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy/lnZfms6jph4pcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXAgKz0gY2hhcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0Q29sdW0gPSBjb2x1bW4gLSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUgPSA2O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKE5vZGVUeXBlWyhtZykgYXMgYW55XSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8v6K+G5Yir5Yiw6L+Q566X56ymXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wICs9IGNoYXI7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlTGlzdC5wdXNoKG5ldyBXb3JkTm9kZShOb2RlVHlwZVt0ZW1wIGFzIGFueV0gYXMgYW55LCBudWxsLCBsaW5lLCBjb2x1bW4gLSB0ZW1wLmxlbmd0aCArIDEsIGNvbHVtbikpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNldCgpXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlTGlzdC5wdXNoKG5ldyBXb3JkTm9kZShOb2RlVHlwZVt0ZW1wIGFzIGFueV0gYXMgYW55LCBudWxsLCBsaW5lLCBjb2x1bW4gLSB0ZW1wLmxlbmd0aCwgY29sdW1uIC0gMSkpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNldCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcnVuKGNoYXIpOy8v6YeN5paw5omn6KGMXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT0gMykge1xuICAgICAgICAgICAgICAgICAgICAvL+W8leWPt1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2hhciA9PSBtYXJrVHlwZSAmJiBsYXN0Q2hhciAhPSBcIlxcXFxcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1hcmtUeXBlID09IFwiYFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5vZGUgPSBuZXcgV29yZE5vZGUoTm9kZVR5cGUuc3RyaW5nLCB0ZW1wLCBsaW5lLCBzdGFydENvbHVtLCBjb2x1bW4pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5saW5lU3RhcnQgPSBsaW5lIC0gKHRlbXAubWF0Y2goL1xcbi9nKSB8fCBbXSk/Lmxlbmd0aFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVMaXN0LnB1c2gobm9kZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZUxpc3QucHVzaChuZXcgV29yZE5vZGUoTm9kZVR5cGUuc3RyaW5nLCB0ZW1wLCBsaW5lLCBzdGFydENvbHVtLCBjb2x1bW4pKVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzZXQoKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXAgKz0gY2hhcjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT0gNCkge1xuICAgICAgICAgICAgICAgICAgICAvL+WNleivjVxuICAgICAgICAgICAgICAgICAgICBpZiAoc3BhY2VNYXBbY2hhcl0gfHwgb3BlcmF0b3JDaGFyTWFwW2NoYXJdIHx8IG1hcmtNYXBbY2hhcl0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0ZW1wID09IFwidHJ1ZVwiIHx8IHRlbXAgPT0gXCJmYWxzZVwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZUxpc3QucHVzaChuZXcgV29yZE5vZGUoTm9kZVR5cGUuYm9vbGVhbiwgdGVtcCA9PSBcInRydWVcIiwgbGluZSwgY29sdW1uIC0gdGVtcC5sZW5ndGgsIGNvbHVtbiAtIDEpKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0ZW1wID09IFwibnVsbFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZUxpc3QucHVzaChuZXcgV29yZE5vZGUoTm9kZVR5cGUubnVsbCwgbnVsbCwgbGluZSwgY29sdW1uIC0gdGVtcC5sZW5ndGgsIGNvbHVtbiAtIDEpKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlTGlzdC5wdXNoKG5ldyBXb3JkTm9kZShOb2RlVHlwZS53b3JkLCB0ZW1wLCBsaW5lLCBjb2x1bW4gLSB0ZW1wLmxlbmd0aCwgY29sdW1uIC0gMSkpXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNldCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcnVuKGNoYXIpOy8v6YeN5paw5omn6KGMXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wICs9IGNoYXI7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09IDUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy/ooYzms6jph4pcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoYXIgPT0gXCJcXG5cIiB8fCBjaGFyID09IFwiXFxyXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVMaXN0LnB1c2gobmV3IFdvcmROb2RlKE5vZGVUeXBlLmFubm90YXRpb24sIHRlbXAsIGxpbmUsIGNvbHVtbiAtIHRlbXAubGVuZ3RoLCBjb2x1bW4pKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzZXQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8v5LiN6ZyA6KaB6YeN5paw5omn6KGM77yM5o2i6KGM5Y+v5Lul5Lii5byDXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wICs9IGNoYXJcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT0gNikge1xuICAgICAgICAgICAgICAgICAgICAvL+Wdl+azqOmHilxuICAgICAgICAgICAgICAgICAgICBpZiAobGFzdENoYXIgKyBjaGFyID09IFwiKi9cIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcCArPSBjaGFyO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbm9kZSA9IG5ldyBXb3JkTm9kZShOb2RlVHlwZS5hbm5vdGF0aW9uLCB0ZW1wLCBsaW5lLCBzdGFydENvbHVtLCBjb2x1bW4pXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLmxpbmVTdGFydCA9IGxpbmUgLSAodGVtcC5tYXRjaCgvXFxuL2cpIHx8IFtdKT8ubGVuZ3RoXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlTGlzdC5wdXNoKG5vZGUpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNldCgpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcCArPSBjaGFyXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNoYXIgb2YgZXhwcmVzc2lvbikge1xuICAgICAgICAgICAgICAgIHJ1bihjaGFyKVxuICAgICAgICAgICAgICAgIGxhc3RDaGFyID0gY2hhcjtcbiAgICAgICAgICAgICAgICBpZiAoY2hhciA9PSBcIlxcblwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpbmUrKztcbiAgICAgICAgICAgICAgICAgICAgY29sdW1uID0gMDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb2x1bW4rKztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBydW4oXCIgXCIpLy/kvKDlhaXnqbrmoLzvvIzkvb/lhbbmlLbpm4bmnIDlkI7nmoTnu5PmnZ/ngrlcblxuICAgICAgICAgICAgcmV0dXJuIG5vZGVMaXN0O1xuICAgICAgICB9XG5cbiAgICAgICAgc3RhdGljIHRvQVNUKG5vZGVMaXN0OiBXb3JkTm9kZVtdLCBleHByZXNzaW9uOiBzdHJpbmcsIGVycm9yTGlzdDogc3RyaW5nW10pIHtcbiAgICAgICAgICAgIC8v5qC55o2u6L+Q566X56ym5LyY5YWI57qn6L+b6KGM5YiG57uEXG4gICAgICAgICAgICB0eXBlIE5vZGUgPSBXb3JkTm9kZVtdIHwgV29yZE5vZGUgfCBBU1ROb2RlO1xuICAgICAgICAgICAgbGV0IGJyYWNrZXRMaXN0OiBOb2RlW10gPSBbXTtcblxuICAgICAgICAgICAgbGV0IGJyYWNrZXRNYXA6IHsgW2tleTogc3RyaW5nXTogYm9vbGVhbiB9ID0ge307XG4gICAgICAgICAgICBbTm9kZVR5cGVbXCIoXCJdLCBOb2RlVHlwZVtcIltcIl0sIE5vZGVUeXBlW1wie1wiXV0uZm9yRWFjaChrID0+IGJyYWNrZXRNYXBba10gPSB0cnVlKTtcblxuICAgICAgICAgICAgbGV0IGdldFdvcmROb2RlID0gKG5vZGU6IE5vZGUpID0+IHtcbiAgICAgICAgICAgICAgICB3aGlsZSAobm9kZSBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUgPSBub2RlWzBdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobm9kZSBpbnN0YW5jZW9mIFdvcmROb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBub2RlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IHB1c2hFcnJvciA9IChub2RlOiBOb2RlLCBtc2c6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBlcnJvclBvcyA9IGdldFdvcmROb2RlKG5vZGUpITtcbiAgICAgICAgICAgICAgICBsZXQgZXJyb3JNc2cgPSBleHByZXNzaW9uICsgbXNnO1xuICAgICAgICAgICAgICAgIGlmIChlcnJvclBvcykge1xuICAgICAgICAgICAgICAgICAgICBlcnJvck1zZyArPSBg77yM5ZyoJHtlcnJvclBvcy5saW5lRW5kICsgMX06JHtlcnJvclBvcy5jb2x1bW5FbmQgKyAxfeOAgmBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZXJyb3JMaXN0LnB1c2goZXJyb3JNc2cpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICog5bCG5ous5Y+35oyJ5bGC57qn5YiG57uE5oiQ5pWw57uEXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGxldCBjb252ZXJ0QnJhY2tldCA9IChzdGFydDogbnVtYmVyLCBsaXN0OiBOb2RlW10sIGVuZFR5cGU/OiBOb2RlVHlwZSkgPT4ge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSBzdGFydDsgaSA8IG5vZGVMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBjdXJyZW50ID0gbm9kZUxpc3RbaV07XG4gICAgICAgICAgICAgICAgICAgIGlmIChicmFja2V0TWFwW2N1cnJlbnQudHlwZV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy/lj5HnjrDmi6zlj7dcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXh0RW5kVHlwZTogTm9kZVR5cGU7XG4gICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGN1cnJlbnQudHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgTm9kZVR5cGVbXCIoXCJdOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXh0RW5kVHlwZSA9IE5vZGVUeXBlW1wiKVwiXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBOb2RlVHlwZVtcIltcIl06XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5leHRFbmRUeXBlID0gTm9kZVR5cGVbXCJdXCJdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIE5vZGVUeXBlW1wie1wiXTpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV4dEVuZFR5cGUgPSBOb2RlVHlwZVtcIn1cIl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IGV4cHJlc3Npb24gKyBcIuaLrOWPt+WIhuaekOW8guW4uOW8guW4uCdcIiArIE5vZGVUeXBlW2N1cnJlbnQudHlwZV0gKyBcIicgXCIgKyBjdXJyZW50LmxpbmVTdGFydCArIFwiOlwiICsgY3VycmVudC5jb2x1bW5TdGFydDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuZXdMaXN0OiBXb3JkTm9kZVtdID0gW2N1cnJlbnRdXG4gICAgICAgICAgICAgICAgICAgICAgICBpID0gY29udmVydEJyYWNrZXQoaSArIDEsIG5ld0xpc3QsIG5leHRFbmRUeXBlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3QucHVzaChuZXdMaXN0KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChlbmRUeXBlICE9IG51bGwgJiYgZW5kVHlwZSA9PSBjdXJyZW50LnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3QucHVzaChjdXJyZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdC5wdXNoKGN1cnJlbnQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChlbmRUeXBlICE9IG51bGwgJiYgKGxpc3RbbGlzdC5sZW5ndGggLSAxXSBhcyBXb3JkTm9kZSkudHlwZSAhPSBlbmRUeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIHB1c2hFcnJvcihsaXN0W2xpc3QubGVuZ3RoIC0gMV0sIGDnvLrlsJHpl63lkIjmi6zlj7cnJHtOb2RlVHlwZVtlbmRUeXBlXX0nYCk7XG4gICAgICAgICAgICAgICAgICAgIC8v6Ieq5Yqo6KGl5YWF5LiA5Liq56ym5Y+3XG4gICAgICAgICAgICAgICAgICAgIGxpc3QucHVzaChuZXcgV29yZE5vZGUoZW5kVHlwZSwgbnVsbCwgMCwgMCwgMCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbm9kZUxpc3QubGVuZ3RoO1xuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIHZhciB1bmFyeUV4cCA9IChsaXN0OiBOb2RlW10sIHN0YXJ0UHJpb3JpdHk6IG51bWJlciwgZW5kUHJpb3JpdHk6IG51bWJlcikgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChsaXN0Lmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsaXN0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvL+W9k+WJjeeOr+Wig+S4i+WNleebrui/kOeul+espuWPquS8muWcqOWAvOeahOW3pui+uVxuICAgICAgICAgICAgICAgIC8v6L+e57ut5aSa5Liq5Y2V55uu6L+Q566X56ym5LuO5Y+z5b6A5bem57uE5ZCI6L+Q566XXG4gICAgICAgICAgICAgICAgbGV0IHJsaXN0OiBOb2RlW10gPSBbXVxuICAgICAgICAgICAgICAgIGxldCBjdXJyZW50QVNUOiBBU1ROb2RlIHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSBsaXN0Lmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBhID0gbGlzdFtpXVxuICAgICAgICAgICAgICAgICAgICBsZXQgYiA9IGxpc3RbaSAtIDFdXG4gICAgICAgICAgICAgICAgICAgIGlmIChiIGluc3RhbmNlb2YgV29yZE5vZGUgJiYgYi50eXBlID4gc3RhcnRQcmlvcml0eSAmJiBiLnR5cGUgPCBlbmRQcmlvcml0eSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGEgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHB1c2hFcnJvcihhLCBcIuS4gOWFg+i/kOeul+esplwiICsgTm9kZVR5cGVbYi50eXBlXSArIFwi57y65bCR5Y+z5YC8XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGEgPSBuZXcgV29yZE5vZGUoTm9kZVR5cGUuYm9vbGVhbiwgdHJ1ZSwgMCwgMCwgMCk7Ly/oh6rliqjooaXlhYVcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJyZW50QVNUID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL+esrOS4gOasoeWPkeeOsFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRBU1QgPSBuZXcgVW5pdGFyeUFTVE5vZGUoYi50eXBlLCBnZW5BU1QoYSBpbnN0YW5jZW9mIEFycmF5ID8gYSA6IFthXSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL+WkmuS4quWNleebrui/kOeul+espui/nue7rVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRBU1QgPSBuZXcgVW5pdGFyeUFTVE5vZGUoYi50eXBlLCBjdXJyZW50QVNUKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJyZW50QVNUKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy/kuIDova7ov57nu63nmoTljZXnm67ov5DnrpfnrKbnu4TlkIjlrozmr5VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBybGlzdC5wdXNoKGN1cnJlbnRBU1QpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRBU1QgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJsaXN0LnB1c2goYSk7Ly/kuIrmrKHlv4XnhLblt7Lnu4/ooqvliqDlhaXkuoZhc3TkuK3vvIzlm6DmraTkuI3pnIDopoFwdXNoXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRBU1QpIHtcbiAgICAgICAgICAgICAgICAgICAgLy/ovrnnlYzlr7nosaHkuI3opoHpgZfnlZlcbiAgICAgICAgICAgICAgICAgICAgcmxpc3QucHVzaChjdXJyZW50QVNUKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJsaXN0LnJldmVyc2UoKTsvL+i9rOS4uuato+W4uOeahOmhuuW6j1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgYmluYXJ5RXhwID0gKGxpc3Q6IE5vZGVbXSwgc3RhcnRQcmlvcml0eTogbnVtYmVyLCBlbmRQcmlvcml0eTogbnVtYmVyKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGxpc3QubGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGxldCBybGlzdDogTm9kZVtdID0gW11cbiAgICAgICAgICAgICAgICBsZXQgY3VycmVudEFTVDogQVNUTm9kZSB8IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMSwgbCA9IGxpc3QubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBhID0gbGlzdFtpIC0gMV07XG4gICAgICAgICAgICAgICAgICAgIGxldCBiID0gbGlzdFtpXTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGMgPSBsaXN0W2kgKyAxXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGIgaW5zdGFuY2VvZiBXb3JkTm9kZSAmJiBiLnR5cGUgPiBzdGFydFByaW9yaXR5ICYmIGIudHlwZSA8IGVuZFByaW9yaXR5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYyA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHVzaEVycm9yKGEsIFwi5LqM5YWD6L+Q566X56ymXCIgKyBOb2RlVHlwZVtiLnR5cGVdICsgXCLnvLrlsJHlj7PlgLxcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYyA9IG5ldyBXb3JkTm9kZShOb2RlVHlwZS5udW1iZXIsIDAsIDAsIDAsIDApOy8v6Ieq5Yqo6KGl5YWFXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VycmVudEFTVCA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy/nrKzkuIDmrKHlj5HnjrBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBybGlzdC5wb3AoKS8v5Yig6Zmk5LiK5qyh5b6q546v5omA5o+S5YWl55qEYlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRBU1QgPSBuZXcgQmluYXJ5QVNUTm9kZShnZW5BU1QoYSBpbnN0YW5jZW9mIEFycmF5ID8gYSA6IFthXSksIGIudHlwZSwgZ2VuQVNUKGMgaW5zdGFuY2VvZiBBcnJheSA/IGMgOiBbY10pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy/lpJrmrKHlj4znm67ov5DnrpfnrKbov57nu61cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50QVNUID0gbmV3IEJpbmFyeUFTVE5vZGUoY3VycmVudEFTVCwgYi50eXBlLCBnZW5BU1QoYyBpbnN0YW5jZW9mIEFycmF5ID8gYyA6IFtjXSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8v54m55q6K5aSE55CGIC4g5ZKMIFtdIOWQjue7remAu+i+ke+8jOWPr+iDveS8mue0p+i3n+edgOWHveaVsOiwg+eUqFxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGQgPSBsaXN0W2kgKyAyXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbmRQcmlvcml0eSA9PSBOb2RlVHlwZS5QMSAmJiBkIGluc3RhbmNlb2YgQXJyYXkgJiYgZFswXSBpbnN0YW5jZW9mIFdvcmROb2RlICYmIGRbMF0udHlwZSA9PSBOb2RlVHlwZVtcIihcIl0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50QVNUID0gbmV3IENhbGxBU1ROb2RlKGN1cnJlbnRBU1QsIGdlblBhcmFtTGlzdChkKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpKys7Ly/ot7Pov4dk55qE6YGN5Y6GXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpKys7Ly/ot7Pov4dj55qE6YGN5Y6GXG5cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8v54m55q6K5aSE55CG77yM5LuF5aSE55CGYVsnYidd5Lit5ous5Y+355qE6K6/6Zeu5pa55byP44CCXG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGIgaW5zdGFuY2VvZiBBcnJheSAmJiBiWzBdIGluc3RhbmNlb2YgV29yZE5vZGUgJiYgYlswXS50eXBlID09IE5vZGVUeXBlW1wiW1wiXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy/kuK3mi6zlj7fmlrnlvI/orr/pl67lsZ7mgKdcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJyZW50QVNUKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudEFTVCA9IG5ldyBCaW5hcnlBU1ROb2RlKGN1cnJlbnRBU1QsIE5vZGVUeXBlW1wiW1wiXSwgZ2VuQVNUKGIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmxpc3QucG9wKCkvL+WIoOmZpOS4iuasoeW+queOr+aJgOaPkuWFpeeahGJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50QVNUID0gbmV3IEJpbmFyeUFTVE5vZGUoZ2VuQVNUKGEgaW5zdGFuY2VvZiBBcnJheSA/IGEgOiBbYV0pLCBOb2RlVHlwZVtcIltcIl0sIGdlbkFTVChiKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8v54m55q6K5aSE55CGIC4g5ZKMIFtdIOWQjue7remAu+i+ke+8jOWPr+iDveS8mue0p+i3n+edgOWHveaVsOiwg+eUqFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVuZFByaW9yaXR5ID09IE5vZGVUeXBlLlAxICYmIGMgaW5zdGFuY2VvZiBBcnJheSAmJiBjWzBdIGluc3RhbmNlb2YgV29yZE5vZGUgJiYgY1swXS50eXBlID09IE5vZGVUeXBlW1wiKFwiXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRBU1QgPSBuZXcgQ2FsbEFTVE5vZGUoY3VycmVudEFTVCwgZ2VuUGFyYW1MaXN0KGMpKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGkrKy8v6Lez6L+HY+eahOmBjeWOhlxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VycmVudEFTVCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbmRQcmlvcml0eSA9PSBOb2RlVHlwZS5QMSAmJiBiIGluc3RhbmNlb2YgQXJyYXkgJiYgYlswXSBpbnN0YW5jZW9mIFdvcmROb2RlICYmIGJbMF0udHlwZSA9PSBOb2RlVHlwZVtcIihcIl0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudEFTVCA9IG5ldyBDYWxsQVNUTm9kZShjdXJyZW50QVNULCBnZW5QYXJhbUxpc3QoYikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL+S4gOi9rui/nue7reeahOWPjOebrui/kOeul+espue7hOWQiOWujOavlVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBybGlzdC5wdXNoKGN1cnJlbnRBU1QpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50QVNUID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZW5kUHJpb3JpdHkgPT0gTm9kZVR5cGUuUDEgJiYgYSBpbnN0YW5jZW9mIFdvcmROb2RlICYmIGEudHlwZSA9PSBOb2RlVHlwZS53b3JkICYmIGIgaW5zdGFuY2VvZiBBcnJheSAmJiBiWzBdIGluc3RhbmNlb2YgV29yZE5vZGUgJiYgYlswXS50eXBlID09IE5vZGVUeXBlW1wiKFwiXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8v54m55q6K5aSE55CGIC4g5ZKMIFtdIOWQjue7remAu+i+ke+8jOWPr+iDveS8mue0p+i3n+edgOWHveaVsOiwg+eUqFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRBU1QgPSBuZXcgQ2FsbEFTVE5vZGUoZ2VuQVNUKGEgaW5zdGFuY2VvZiBBcnJheSA/IGEgOiBbYV0pLCBnZW5QYXJhbUxpc3QoYikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJsaXN0LnBvcCgpIC8v5Yig6Zmk5LiK5qyh5b6q546v5omA5o+S5YWl55qEYlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlOy8vYeWSjGLpg73pnIDopoHmj5LlhaXliLBybGlzdFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGkgPT0gMSkgey8v55Sx5LqO5piv5LuOMeW8gOWni+mBjeWOhueahO+8jOWboOatpOmcgOimgeS/neeVmTDnmoTlgLxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBybGlzdC5wdXNoKGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmxpc3QucHVzaChiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRBU1QpIHtcbiAgICAgICAgICAgICAgICAgICAgLy/ovrnnlYzlr7nosaHkuI3opoHpgZfnlZlcbiAgICAgICAgICAgICAgICAgICAgcmxpc3QucHVzaChjdXJyZW50QVNUKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gcmxpc3Q7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCBzcGxpY2UgPSAobGlzdDogTm9kZVtdLCBzcDogTm9kZVR5cGUpOiBOb2RlW11bXSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHI6IE5vZGVbXVtdID0gW107XG4gICAgICAgICAgICAgICAgbGV0IGN1cnJlbnQ6IE5vZGVbXSA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGwgb2YgbGlzdCkge1xuICAgICAgICAgICAgICAgICAgICAvL+i/memHjOS8muW/veeVpeaLrOWPt1xuICAgICAgICAgICAgICAgICAgICBpZiAobCBpbnN0YW5jZW9mIFdvcmROb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobC50eXBlID09IHNwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy/kuqfnlJ/liIflibJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VycmVudC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHIucHVzaChjdXJyZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudCA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobC50eXBlID09IE5vZGVUeXBlW1wiKFwiXSB8fCBsLnR5cGUgPT0gTm9kZVR5cGVbXCIpXCJdIHx8IGwudHlwZSA9PSBOb2RlVHlwZVtcIltcIl0gfHwgbC50eXBlID09IE5vZGVUeXBlW1wiXVwiXSB8fCBsLnR5cGUgPT0gTm9kZVR5cGVbXCJ7XCJdIHx8IGwudHlwZSA9PSBOb2RlVHlwZVtcIn1cIl0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL+i3s+i/h+ivpeWtl+esplxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50LnB1c2gobCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50LnB1c2gobCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICByLnB1c2goY3VycmVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsZXQgZ2VuUGFyYW1MaXN0ID0gKGxpc3Q6IE5vZGVbXSk6IEFTVE5vZGVbXSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHBhcmFtTGlzdCA9IHNwbGljZShsaXN0LCBOb2RlVHlwZVtcIixcIl0pO1xuICAgICAgICAgICAgICAgIGxldCBybGlzdDogQVNUTm9kZVtdID0gW107XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgcCBvZiBwYXJhbUxpc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgcmxpc3QucHVzaChnZW5BU1QocCkpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBybGlzdDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IGdlbkFTVCA9IChzb3VyY2VsaXN0OiBOb2RlW10pOiBBU1ROb2RlID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoc291cmNlbGlzdC5sZW5ndGggPT0gMSAmJiBzb3VyY2VsaXN0WzBdIGluc3RhbmNlb2YgQVNUTm9kZUJhc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNvdXJjZWxpc3RbMF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzb3VyY2VsaXN0Lmxlbmd0aCA9PSAxICYmIHNvdXJjZWxpc3RbMF0gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2VuQVNUKHNvdXJjZWxpc3RbMF0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGxldCBsaXN0ID0gc291cmNlbGlzdDtcblxuICAgICAgICAgICAgICAgIC8v6L+b6KGM5ous5Y+35aSE55CGXG4gICAgICAgICAgICAgICAgbGV0IGJyYWNrZXRUeXBlOiBOb2RlVHlwZSB8IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBsZXQgYSA9IGxpc3RbMF07IGxldCBiID0gbGlzdFtsaXN0Lmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgIGlmIChhIGluc3RhbmNlb2YgV29yZE5vZGUgJiYgYiBpbnN0YW5jZW9mIFdvcmROb2RlICYmXG4gICAgICAgICAgICAgICAgICAgIChhLnR5cGUgPT0gTm9kZVR5cGVbXCIoXCJdICYmIGIudHlwZSA9PSBOb2RlVHlwZVtcIilcIl0gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIGEudHlwZSA9PSBOb2RlVHlwZVtcIltcIl0gJiYgYi50eXBlID09IE5vZGVUeXBlW1wiXVwiXSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgYS50eXBlID09IE5vZGVUeXBlW1wie1wiXSAmJiBiLnR5cGUgPT0gTm9kZVR5cGVbXCJ9XCJdKVxuICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICBicmFja2V0VHlwZSA9IGEudHlwZTtcbiAgICAgICAgICAgICAgICAgICAgbGlzdCA9IGxpc3Quc2xpY2UoMSwgbGlzdC5sZW5ndGggLSAxKVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGxpc3QgPSBiaW5hcnlFeHAobGlzdCwgTm9kZVR5cGUuUDAsIE5vZGVUeXBlLlAxKS8v5YiG57uEICAuIOWSjCBbXSDlvaLmiJDorr/pl67ov57mjqXvvIzljIXmi6zlkI7pnaLnmoTlh73mlbBcbiAgICAgICAgICAgICAgICBsaXN0ID0gdW5hcnlFeHAobGlzdCwgTm9kZVR5cGUuUDEsIE5vZGVUeXBlLlAyKS8v5YiG57uEICAhIO+8jOi/m+ihjOS4gOWFg+ihqOi+vuW8j+WIhue7hFxuICAgICAgICAgICAgICAgIGxpc3QgPSBiaW5hcnlFeHAobGlzdCwgTm9kZVR5cGUuUDIsIE5vZGVUeXBlLlAzKS8v5YiG57uEICAqKu+8jOi/m+ihjDLlhYPooajovr7lvI/liIbnu4RcbiAgICAgICAgICAgICAgICBsaXN0ID0gYmluYXJ5RXhwKGxpc3QsIE5vZGVUeXBlLlAzLCBOb2RlVHlwZS5QNCkvL+WIhue7hCAgKiAvICXvvIzov5vooYwy5YWD6KGo6L6+5byP5YiG57uEXG4gICAgICAgICAgICAgICAgbGlzdCA9IGJpbmFyeUV4cChsaXN0LCBOb2RlVHlwZS5QNCwgTm9kZVR5cGUuUDUpLy/liIbnu4QgICsgLe+8jOi/m+ihjDLlhYPooajovr7lvI/liIbnu4RcbiAgICAgICAgICAgICAgICBsaXN0ID0gYmluYXJ5RXhwKGxpc3QsIE5vZGVUeXBlLlA1LCBOb2RlVHlwZS5QNikvL+WIhue7hCAgPiA8ID49IDw977yM6L+b6KGMMuWFg+ihqOi+vuW8j+WIhue7hFxuICAgICAgICAgICAgICAgIGxpc3QgPSBiaW5hcnlFeHAobGlzdCwgTm9kZVR5cGUuUDYsIE5vZGVUeXBlLlA3KS8v5YiG57uEICAhPSA9Pe+8jOi/m+ihjDLlhYPooajovr7lvI/liIbnu4RcbiAgICAgICAgICAgICAgICBsaXN0ID0gYmluYXJ5RXhwKGxpc3QsIE5vZGVUeXBlLlA3LCBOb2RlVHlwZS5QOCkvL+WIhue7hCAgJiYg77yM6L+b6KGMMuWFg+ihqOi+vuW8j+WIhue7hFxuICAgICAgICAgICAgICAgIGxpc3QgPSBiaW5hcnlFeHAobGlzdCwgTm9kZVR5cGUuUDgsIE5vZGVUeXBlLlA5KS8v5YiG57uEICB8fO+8jOi/m+ihjDLlhYPooajovr7lvI/liIbnu4RcblxuICAgICAgICAgICAgICAgIGxldCByZXN1bHQ6IEFTVE5vZGU7XG4gICAgICAgICAgICAgICAgaWYgKGxpc3QubGVuZ3RoID09IDEgJiYgbGlzdFswXSBpbnN0YW5jZW9mIEFTVE5vZGVCYXNlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8v5q2j5bi46L+U5ZueXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IGxpc3RbMF07XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChsaXN0Lmxlbmd0aCA9PSAxICYmIGxpc3RbMF0gaW5zdGFuY2VvZiBXb3JkTm9kZSkge1xuICAgICAgICAgICAgICAgICAgICAvL+WNlee6r+eahOaVsOWAvFxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBuZXcgVmFsdWVBU1ROb2RlKGxpc3RbMF0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobGlzdC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHB1c2hFcnJvcihzb3VyY2VsaXN0WzBdLCBcIuino+aekOWQjuiKgueCueWIl+ihqOaXoOazleW9kuS4gFwiKVxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBuZXcgVmFsdWVBU1ROb2RlKG5ldyBXb3JkTm9kZShOb2RlVHlwZS5udW1iZXIsIDAsIDAsIDAsIDApKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwdXNoRXJyb3Ioc291cmNlbGlzdFswXSwgXCLml6Dms5XmraPnoa7op6PmnpDliJfooahcIilcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gbmV3IFZhbHVlQVNUTm9kZShuZXcgV29yZE5vZGUoTm9kZVR5cGUubnVtYmVyLCAwLCAwLCAwLCAwKSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGJyYWNrZXRUeXBlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJyYWNrZXRUeXBlID09IE5vZGVUeXBlW1wie1wiXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBCcmFja2V0QVNUTm9kZShOb2RlVHlwZS5sYW1iZGEsIHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEJyYWNrZXRBU1ROb2RlKGJyYWNrZXRUeXBlLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG5vZGVMaXN0ID0gbm9kZUxpc3QuZmlsdGVyKGEgPT4gYS50eXBlICE9IE5vZGVUeXBlLmFubm90YXRpb24pXG4gICAgICAgICAgICBjb252ZXJ0QnJhY2tldCgwLCBicmFja2V0TGlzdCkvL+WIhue7hOaLrOWPt1xuICAgICAgICAgICAgcmV0dXJuIGdlbkFTVChicmFja2V0TGlzdCk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIHN0YXRpYyB0b1N0cmluZ0FTVChhc3Q6IEFTVE5vZGUsIGFkZEJyYWNrZXQ/OiBib29sZWFuKTogc3RyaW5nIHtcbiAgICAgICAgICAgIHZhciByID0gXCJcIlxuICAgICAgICAgICAgaWYgKGFkZEJyYWNrZXQgJiYgIShhc3QgaW5zdGFuY2VvZiBWYWx1ZUFTVE5vZGUgfHwgYXN0IGluc3RhbmNlb2YgQnJhY2tldEFTVE5vZGUpKSB7XG4gICAgICAgICAgICAgICAgciArPSBcIihcIlxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGFzdCBpbnN0YW5jZW9mIFZhbHVlQVNUTm9kZSkge1xuICAgICAgICAgICAgICAgIGlmIChhc3QudmFsdWUudHlwZSA9PSBOb2RlVHlwZS5zdHJpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgciArPSBgXCIke2FzdC52YWx1ZS52YWx1ZX1cImBcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByICs9IGAke2FzdC52YWx1ZS52YWx1ZX1gXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChhc3QgaW5zdGFuY2VvZiBCcmFja2V0QVNUTm9kZSkge1xuICAgICAgICAgICAgICAgIGlmIChhc3Qub3BlcmF0b3IgPT0gTm9kZVR5cGVbXCIoXCJdKSB7XG4gICAgICAgICAgICAgICAgICAgIHIgKz0gYCgke3RoaXMudG9TdHJpbmdBU1QoYXN0Lm5vZGUsIGFkZEJyYWNrZXQpfSlgXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhc3Qub3BlcmF0b3IgPT0gTm9kZVR5cGVbXCJbXCJdKSB7XG4gICAgICAgICAgICAgICAgICAgIHIgKz0gYFske3RoaXMudG9TdHJpbmdBU1QoYXN0Lm5vZGUsIGFkZEJyYWNrZXQpfV1gXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhc3Qub3BlcmF0b3IgPT0gTm9kZVR5cGVbXCJ7XCJdIHx8IGFzdC5vcGVyYXRvciA9PSBOb2RlVHlwZS5sYW1iZGEpIHtcbiAgICAgICAgICAgICAgICAgICAgciArPSBgeyR7dGhpcy50b1N0cmluZ0FTVChhc3Qubm9kZSwgYWRkQnJhY2tldCl9fWBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGFzdCBpbnN0YW5jZW9mIFVuaXRhcnlBU1ROb2RlKSB7XG4gICAgICAgICAgICAgICAgciArPSBgJHtOb2RlVHlwZVthc3Qub3BlcmF0b3JdfSR7dGhpcy50b1N0cmluZ0FTVChhc3QucmlnaHQsIGFkZEJyYWNrZXQpfWBcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYXN0IGluc3RhbmNlb2YgQmluYXJ5QVNUTm9kZSkge1xuICAgICAgICAgICAgICAgIGlmIChhc3Qub3BlcmF0b3IgPT0gTm9kZVR5cGVbXCJbXCJdKSB7XG4gICAgICAgICAgICAgICAgICAgIHIgKz0gYCR7dGhpcy50b1N0cmluZ0FTVChhc3QubGVmdCwgYWRkQnJhY2tldCl9JHt0aGlzLnRvU3RyaW5nQVNUKGFzdC5yaWdodCwgYWRkQnJhY2tldCl9YFxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYXN0Lm9wZXJhdG9yID09IE5vZGVUeXBlW1wiLlwiXSkge1xuICAgICAgICAgICAgICAgICAgICByICs9IGAke3RoaXMudG9TdHJpbmdBU1QoYXN0LmxlZnQsIGFkZEJyYWNrZXQpfSR7Tm9kZVR5cGVbYXN0Lm9wZXJhdG9yXX0ke3RoaXMudG9TdHJpbmdBU1QoYXN0LnJpZ2h0LCBhZGRCcmFja2V0KX1gXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgciArPSBgJHt0aGlzLnRvU3RyaW5nQVNUKGFzdC5sZWZ0LCBhZGRCcmFja2V0KX0gJHtOb2RlVHlwZVthc3Qub3BlcmF0b3JdfSAke3RoaXMudG9TdHJpbmdBU1QoYXN0LnJpZ2h0LCBhZGRCcmFja2V0KX1gXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChhc3QgaW5zdGFuY2VvZiBDYWxsQVNUTm9kZSkge1xuICAgICAgICAgICAgICAgIHIgKz0gYCR7dGhpcy50b1N0cmluZ0FTVChhc3QubGVmdCwgYWRkQnJhY2tldCl9KCAke2FzdC5wYXJhbWV0ZXJzLm1hcChhID0+IHRoaXMudG9TdHJpbmdBU1QoYSwgYWRkQnJhY2tldCkpLmpvaW4oXCIsIFwiKX0pYFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGFkZEJyYWNrZXQgJiYgIShhc3QgaW5zdGFuY2VvZiBWYWx1ZUFTVE5vZGUgfHwgYXN0IGluc3RhbmNlb2YgQnJhY2tldEFTVE5vZGUpKSB7XG4gICAgICAgICAgICAgICAgciArPSBcIilcIlxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJcbiAgICAgICAgfVxuXG4gICAgICAgIHRvU3RyaW5nKCkge1xuICAgICAgICAgICAgcmV0dXJuIEludGVycHJldGVyLnRvU3RyaW5nQVNUKHRoaXMuYXN0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiDor6Xlh73mlbDmiYDmiafooYznmoTooajovr7lvI/lsIboh6rliqjov5vooYzlrrnplJnlpITnkIZcbiAgICAgICAgICogMS4g5b2T6K6/6Zeu5bGe5oCn5Lqn55SfbnVsbOWAvOaXtu+8jOWFtuWwhuS4jeWPguS4juiuoeeulyDkvovlpoLvvJphLmIrMTMg5b2TYeaIlmLkuLrnqbrml7bvvIznu5PmnpzlsIbov5Tlm54xM1xuICAgICAgICAgKiAyLiDlvZPorr/pl67nmoTooajovr7lvI/lrozlhajkuLpudWxs5pe277yM6KGo6L6+5byP5bCG5pyA57uI6L+U5Zue57uT5p6cMO+8jOS+i+Wmgu+8mmEuYitjIOWImei/lOWbnjBcbiAgICAgICAgICogQHBhcmFtIGVudmlyb25tZW50IFxuICAgICAgICAgKiBAcGFyYW0gYXN0IFxuICAgICAgICAgKi9cbiAgICAgICAgc3RhdGljIHJ1bihlbnZpcm9ubWVudDogeyBba2V5OiBzdHJpbmddOiBhbnkgfSwgYXN0OiBBU1ROb2RlKTogYW55IHtcblxuICAgICAgICAgICAgaWYgKGFzdCBpbnN0YW5jZW9mIFZhbHVlQVNUTm9kZSkge1xuICAgICAgICAgICAgICAgIGlmIChhc3Qub3BlcmF0b3IgPT0gdm0uTm9kZVR5cGUud29yZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXN0LnZhbHVlLnZhbHVlID09IFwidGhpc1wiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZW52aXJvbm1lbnRcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlbnZpcm9ubWVudFthc3QudmFsdWUudmFsdWVdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFzdC52YWx1ZS52YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGFzdCBpbnN0YW5jZW9mIEJyYWNrZXRBU1ROb2RlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucnVuKGVudmlyb25tZW50LCBhc3Qubm9kZSkvL+aLrOWPt+WGheW/heeEtuaYr+S4quaVtOS9k1xuICAgICAgICAgICAgfSBlbHNlIGlmIChhc3QgaW5zdGFuY2VvZiBVbml0YXJ5QVNUTm9kZSkge1xuICAgICAgICAgICAgICAgIGxldCBiID0gdGhpcy5ydW4oZW52aXJvbm1lbnQsIGFzdC5yaWdodClcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGFzdC5vcGVyYXRvcikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIE5vZGVUeXBlW1wiIVwiXTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAhYjtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IGDmhI/lpJbnmoTkuIDlhYPov5DnrpfnrKYke05vZGVUeXBlW2FzdC5vcGVyYXRvcl19fV1gXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChhc3QgaW5zdGFuY2VvZiBCaW5hcnlBU1ROb2RlKSB7XG5cbiAgICAgICAgICAgICAgICBpZiAoYXN0Lm9wZXJhdG9yID09IE5vZGVUeXBlW1wiLlwiXSB8fCBhc3Qub3BlcmF0b3IgPT0gTm9kZVR5cGVbXCJbXCJdKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBhOiBhbnkgPSB0aGlzLnJ1bihlbnZpcm9ubWVudCwgYXN0LmxlZnQpXG4gICAgICAgICAgICAgICAgICAgIGlmIChhID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoSW50ZXJwcmV0ZXIudG9TdHJpbmdBU1QoYXN0KSArIFwiXFxuXCIgKyBcIuWxnuaAp+iuv+mXruW8guW4uFwiICsgSW50ZXJwcmV0ZXIudG9TdHJpbmdBU1QoYXN0LmxlZnQpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsOy8v6K6/6Zeu6L+Q566X6YGH5YiwbnVsbOWImeS4jeaJp+ihjFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChhc3QucmlnaHQgaW5zdGFuY2VvZiBWYWx1ZUFTVE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhW2FzdC5yaWdodC52YWx1ZS52YWx1ZV07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYVt0aGlzLnJ1bihlbnZpcm9ubWVudCwgYXN0LnJpZ2h0KV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoYXN0Lm9wZXJhdG9yID09IE5vZGVUeXBlW1wiJiZcIl0pIHtcbiAgICAgICAgICAgICAgICAgICAgLy/lhYjlt6bvvIzlkI7lj7NcbiAgICAgICAgICAgICAgICAgICAgbGV0IGEgPSB0aGlzLnJ1bihlbnZpcm9ubWVudCwgYXN0LmxlZnQpXG4gICAgICAgICAgICAgICAgICAgIGlmICghYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYSAmJiB0aGlzLnJ1bihlbnZpcm9ubWVudCwgYXN0LnJpZ2h0KVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYXN0Lm9wZXJhdG9yID09IE5vZGVUeXBlW1wifHxcIl0pIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGEgPSB0aGlzLnJ1bihlbnZpcm9ubWVudCwgYXN0LmxlZnQpXG4gICAgICAgICAgICAgICAgICAgIGlmIChhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYSB8fCB0aGlzLnJ1bihlbnZpcm9ubWVudCwgYXN0LnJpZ2h0KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsZXQgYSA9IHRoaXMucnVuKGVudmlyb25tZW50LCBhc3QubGVmdClcbiAgICAgICAgICAgICAgICBsZXQgYiA9IHRoaXMucnVuKGVudmlyb25tZW50LCBhc3QucmlnaHQpXG5cbiAgICAgICAgICAgICAgICBpZiAoIShhc3Qub3BlcmF0b3IgPT0gTm9kZVR5cGVbXCI9PVwiXSB8fCBhc3Qub3BlcmF0b3IgPT0gTm9kZVR5cGVbXCIhPVwiXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGEgPT0gbnVsbCAmJiBiID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGEgPT0gbnVsbCAmJiBiICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBiO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGEgIT0gbnVsbCAmJiBiID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN3aXRjaCAoYXN0Lm9wZXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgTm9kZVR5cGVbXCIqKlwiXTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhICoqIGJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBOb2RlVHlwZVtcIipcIl06XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYSAqIGI7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgTm9kZVR5cGVbXCIvXCJdOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEgLyBiXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgTm9kZVR5cGVbXCIlXCJdOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEgJSBiXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgTm9kZVR5cGVbXCIrXCJdOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEgKyBiXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgTm9kZVR5cGVbXCItXCJdOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEgLSBiXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgTm9kZVR5cGVbXCI+XCJdOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEgPiBiXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgTm9kZVR5cGVbXCI8XCJdOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEgPCBiXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgTm9kZVR5cGVbXCI+PVwiXTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhID49IGJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBOb2RlVHlwZVtcIjw9XCJdOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEgPD0gYlxuICAgICAgICAgICAgICAgICAgICBjYXNlIE5vZGVUeXBlW1wiIT1cIl06XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYSAhPSBiXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgTm9kZVR5cGVbXCI9PVwiXTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhID09IGJcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IGDmhI/lpJbnmoTkuozlhYPov5DnrpfnrKYke05vZGVUeXBlW2FzdC5vcGVyYXRvcl19fV1gXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChhc3QgaW5zdGFuY2VvZiBDYWxsQVNUTm9kZSkge1xuICAgICAgICAgICAgICAgIGxldCBvYmogPSB0aGlzLnJ1bihlbnZpcm9ubWVudCwgYXN0LmxlZnQpO1xuXG4gICAgICAgICAgICAgICAgbGV0IHNlbGY6IGFueSB8IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBsZXQgZnVuYzogRnVuY3Rpb24gfCB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAgICAgICBpZiAoYXN0LmxlZnQgaW5zdGFuY2VvZiBWYWx1ZUFTVE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy/lhajlsYDlh73mlbBcbiAgICAgICAgICAgICAgICAgICAgZnVuYyA9IGVudmlyb25tZW50W2FzdC5sZWZ0LnZhbHVlLnZhbHVlXTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFzdC5sZWZ0IGluc3RhbmNlb2YgQmluYXJ5QVNUTm9kZSkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmID0gdGhpcy5ydW4oZW52aXJvbm1lbnQsIGFzdC5sZWZ0LmxlZnQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZiA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKEludGVycHJldGVyLnRvU3RyaW5nQVNUKGFzdCkgKyBcIlxcblwiICsgXCLlh73mlbDml6Dms5Xorr/pl65cIiArIEludGVycHJldGVyLnRvU3RyaW5nQVNUKGFzdC5sZWZ0LmxlZnQpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsOy8vc2VsZuaXoOazleiOt+WPllxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChhc3QubGVmdC5yaWdodCBpbnN0YW5jZW9mIFZhbHVlQVNUTm9kZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZnVuYyA9IHNlbGZbYXN0LmxlZnQucmlnaHQudmFsdWUudmFsdWVdO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZnVuYyA9IHNlbGZbdGhpcy5ydW4oZW52aXJvbm1lbnQsIGFzdC5sZWZ0LnJpZ2h0KV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGZ1bmMgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKEludGVycHJldGVyLnRvU3RyaW5nQVNUKGFzdCkgKyBcIlxcblwiICsgXCLlh73mlbDml6Dms5Xorr/pl65cIik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsOy8vZnVuY+aXoOazleiOt+WPllxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChvYmogPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAvL+WHveaVsOaXoOazleaJp+ihjFxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKEludGVycHJldGVyLnRvU3RyaW5nQVNUKGFzdCkgKyBcIlxcblwiICsgXCLlh73mlbDml6Dms5XmiafooYxcIiArIEludGVycHJldGVyLnRvU3RyaW5nQVNUKGFzdC5sZWZ0KSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsZXQgcGFyYW1MaXN0ID0gYXN0LnBhcmFtZXRlcnMubWFwKHAgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAocCBpbnN0YW5jZW9mIEJyYWNrZXRBU1ROb2RlICYmIHAub3BlcmF0b3IgPT0gTm9kZVR5cGUubGFtYmRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKGE6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuZXdFdjogeyBba2V5OiBzdHJpbmddOiBhbnkgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNQcmltaXRpdmUoYSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3RXYgPSB7IHZhbHVlOiBhIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdFdiA9IGE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0V2Ll9fcHJvdG9fXyA9IGVudmlyb25tZW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0V2Ll8gPSBlbnZpcm9ubWVudDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBJbnRlcnByZXRlci5ydW4obmV3RXYsIHAubm9kZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnJ1bihlbnZpcm9ubWVudCwgcClcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jLmFwcGx5KHNlbGYgfHwgZW52aXJvbm1lbnQsIHBhcmFtTGlzdCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuXG4gICAgICAgIHJ1bihlbnZpcm9ubWVudDogeyBba2V5OiBzdHJpbmddOiBhbnkgfSkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gSW50ZXJwcmV0ZXIucnVuKGVudmlyb25tZW50LCB0aGlzLmFzdClcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyB0aGlzLmV4cHJlc3Npb24gKyBcIlxcblwiICsgKGUgaW5zdGFuY2VvZiBFcnJvciA/IGUubWVzc2FnZSA6IGUpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDln7rnoYDnjq/looNcbiAgICAgKi9cbiAgICBleHBvcnQgdmFyIGVudmlyb25tZW50OiB7IFtrZXk6IHN0cmluZ106IGFueSB9ID0ge31cblxuICAgIC8v5Yqg5YWl5pWw5a2m5Z+656GA5bqTXG4gICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoTWF0aCkuZm9yRWFjaChrID0+IGRlZihlbnZpcm9ubWVudCwgay50b1VwcGVyQ2FzZSgpLCAoTWF0aCBhcyBhbnkpW2tdKSk7XG5cbiAgICAvKipcbiAgICAgKiDnu6fmib/oh6rln7rnoYDlsZ7mgKdcbiAgICAgKi9cbiAgICBleHBvcnQgZnVuY3Rpb24gZXh0ZW5kc0Vudmlyb25tZW50KG9iajogYW55KSB7XG4gICAgICAgIG9iai5fX3Byb3RvX18gPSBlbnZpcm9ubWVudDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDlkJHnm67moIflr7nosaHlrp7njrDmiYDmnInln7rnoYDlsZ7mgKdcbiAgICAgKi9cbiAgICBleHBvcnQgZnVuY3Rpb24gaW1wbGVtZW50RW52aXJvbm1lbnQob2JqOiBhbnkpIHtcbiAgICAgICAgbGV0IGtzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoZW52aXJvbm1lbnQpO1xuICAgICAgICBmb3IgKGxldCBrIG9mIGtzKSB7XG4gICAgICAgICAgICBpZiAoayA9PSBcIl9fb2JfX1wiKSBjb250aW51ZTtcbiAgICAgICAgICAgIGRlZihvYmosIGssIGVudmlyb25tZW50W2tdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH1cbn0iLCJuYW1lc3BhY2Ugdm0ge1xuXG4gICAgLy/liJvlu7rmlbDnu4TnmoTlh73mlbDku6PnkIZcbiAgICB2YXIgYXJyYXlQcm90byA9IEFycmF5LnByb3RvdHlwZTtcbiAgICB2YXIgYXJyYXlNZXRob2RzID0gT2JqZWN0LmNyZWF0ZShhcnJheVByb3RvKTtcblxuICAgIHZhciBtZXRob2RzVG9QYXRjaCA9IFtcbiAgICAgICAgJ3B1c2gnLFxuICAgICAgICAncG9wJyxcbiAgICAgICAgJ3NoaWZ0JyxcbiAgICAgICAgJ3Vuc2hpZnQnLFxuICAgICAgICAnc3BsaWNlJyxcbiAgICAgICAgJ3NvcnQnLFxuICAgICAgICAncmV2ZXJzZSdcbiAgICBdO1xuXG4gICAgbWV0aG9kc1RvUGF0Y2guZm9yRWFjaChmdW5jdGlvbiAobWV0aG9kOiBzdHJpbmcpIHtcbiAgICAgICAgdmFyIG9yaWdpbmFsID0gKGFycmF5UHJvdG8gYXMgYW55KVttZXRob2RdIGFzIGFueTsvL+e8k+WtmOWOn+Wni+aWueazlVxuICAgICAgICBkZWYoYXJyYXlNZXRob2RzLCBtZXRob2QsIGZ1bmN0aW9uICh0aGlzOiBBcnJheTxhbnk+ICYgeyBfX29iX186IE9ic2VydmVyIH0pIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gW10sIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgICAgICB3aGlsZSAobGVuLS0pIGFyZ3NbbGVuXSA9IGFyZ3VtZW50c1tsZW5dO1xuXG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gb3JpZ2luYWwuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgICAgICB2YXIgb2IgPSB0aGlzLl9fb2JfXztcbiAgICAgICAgICAgIHZhciBpbnNlcnRlZDtcbiAgICAgICAgICAgIHN3aXRjaCAobWV0aG9kKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAncHVzaCc6XG4gICAgICAgICAgICAgICAgY2FzZSAndW5zaGlmdCc6XG4gICAgICAgICAgICAgICAgICAgIGluc2VydGVkID0gYXJncztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgICAgICBjYXNlICdzcGxpY2UnOlxuICAgICAgICAgICAgICAgICAgICBpbnNlcnRlZCA9IGFyZ3Muc2xpY2UoMik7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaW5zZXJ0ZWQpIHsgb2Iub2JzZXJ2ZUFycmF5KGluc2VydGVkKTsgfVxuICAgICAgICAgICAgLy/pgJrnn6XliLfmlrBcbiAgICAgICAgICAgIG9iLmRlcC5ub3RpZnkoKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHRcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiDlsIblr7nosaHlpITnkIbkuLrlj6/op4Llr5/lr7nosaFcbiAgICAgKi9cbiAgICBleHBvcnQgZnVuY3Rpb24gb2JzZXJ2ZSh2YWx1ZTogYW55KSB7XG4gICAgICAgIGlmICghaXNPYmplY3QodmFsdWUpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbGV0IG9iOiBPYnNlcnZlciB8IHVuZGVmaW5lZFxuICAgICAgICBpZiAodmFsdWUuX19vYl9fIGluc3RhbmNlb2YgT2JzZXJ2ZXIpIHtcbiAgICAgICAgICAgIC8v5a+56LGh5bey57uP57uR5a6aXG4gICAgICAgICAgICBvYiA9IHZhbHVlLl9fb2JfXztcbiAgICAgICAgfSBlbHNlIGlmIChPYmplY3QuaXNFeHRlbnNpYmxlKHZhbHVlKSAmJiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkgfHwgaXNQbGFpbk9iamVjdCh2YWx1ZSkpKSB7XG4gICAgICAgICAgICAvL+WPquacieaZrumAmueahOWvueixoeaJjeWPr+S7pei/m+ihjOinguWvn1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBPYnNlcnZlcih2YWx1ZSlcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2I7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5oum5oiq5a+56LGh5omA5pyJ55qEa2V55ZKMdmFsdWVcbiAgICAgKi9cbiAgICBleHBvcnQgZnVuY3Rpb24gZGVmaW5lUmVhY3RpdmUoXG4gICAgICAgIG9iajogYW55LFxuICAgICAgICBrZXk6IHN0cmluZyxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIOWvueixoeeahOm7mOiupOWAvO+8jOS5n+WwseaYryBvYmpba2V5XVxuICAgICAgICAgKi9cbiAgICAgICAgdmFsOiBhbnlcbiAgICApIHtcbiAgICAgICAgLy/lv4XljIXnmoTkuK3kvp3otZbvvIznm7jlvZPkuo7mmK/mr4/kuIDkuKrlsZ7mgKfnmoTpmYTliqDlr7nosaHvvIznlKjkuo7orrDlvZXlsZ7mgKfnmoTmiYDmnInku6XmnaXkvqblkKzjgIJcbiAgICAgICAgY29uc3QgZGVwID0gbmV3IERlcCgpXG5cbiAgICAgICAgY29uc3QgcHJvcGVydHkgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iaiwga2V5KVxuICAgICAgICBpZiAocHJvcGVydHkgJiYgcHJvcGVydHkuY29uZmlndXJhYmxlID09PSBmYWxzZSkge1xuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBnZXR0ZXIgPSBwcm9wZXJ0eSAmJiBwcm9wZXJ0eS5nZXRcbiAgICAgICAgY29uc3Qgc2V0dGVyID0gcHJvcGVydHkgJiYgcHJvcGVydHkuc2V0XG5cbiAgICAgICAgbGV0IHZhbE9iID0gb2JzZXJ2ZSh2YWwpXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmosIGtleSwge1xuICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24gcmVhY3RpdmVHZXR0ZXIoKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBnZXR0ZXIgPyBnZXR0ZXIuY2FsbChvYmopIDogdmFsXG5cbiAgICAgICAgICAgICAgICAvL+i/m+ihjOS+nei1luaUtumbhu+8jOS+nei1luaUtumbhuWJjSBEZXBlbmRlbmN5LmNvbGxlY3RUYXJnZXQg5Lya6KKr6LWL5YC877yM5pS26ZuG5a6M5oiQ5ZCO5Lya572u56m644CCXG4gICAgICAgICAgICAgICAgaWYgKERlcC50YXJnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVwLmRlcGVuZCgpLy/lsIboh6rouqvliqDlhaXliLBEZXBlbmRlbmN5LmNvbGxlY3RUYXJnZXTkuK1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbE9iKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxPYi5kZXAuZGVwZW5kKCkvL+WxnuaAp+WAvOS+nei1llxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVwZW5kQXJyYXkodmFsdWUpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbiByZWFjdGl2ZVNldHRlcihuZXdWYWwpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGdldHRlciA/IGdldHRlci5jYWxsKG9iaikgOiB2YWxcblxuICAgICAgICAgICAgICAgIGlmIChuZXdWYWwgPT09IHZhbHVlIHx8IChuZXdWYWwgIT09IG5ld1ZhbCAmJiB2YWx1ZSAhPT0gdmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybi8v55u4562J5YiZ5peg6ZyA6L+b6KGM5ZCO57ut5aSE55CGXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzZXR0ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0dGVyLmNhbGwob2JqLCBuZXdWYWwpXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsID0gbmV3VmFsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhbE9iID0gb2JzZXJ2ZShuZXdWYWwpLy/lpoLmnpzmmK/mma7pgJrlr7nosaHpnIDopoHlpITnkIbmiJDlj6/op4Llr5/nmoRcblxuICAgICAgICAgICAgICAgIGRlcC5ub3RpZnkoKS8v6Kem5Y+R5Yi35pawXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5oum5oiq5a+56LGh5omA5pyJ55qEa2V55ZKMdmFsdWVcbiAgICAgKi9cbiAgICBleHBvcnQgZnVuY3Rpb24gZGVmaW5lQ29tcHV0ZShcbiAgICAgICAgb2JqOiBhbnksXG4gICAgICAgIGtleTogc3RyaW5nLFxuICAgICAgICBjb21wdXRlOiAoKSA9PiBhbnlcbiAgICApIHtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwga2V5LCB7XG4gICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbiByZWFjdGl2ZUdldHRlcigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29tcHV0ZSgpXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KVxuICAgIH1cbiAgICBleHBvcnQgY2xhc3MgT2JzZXJ2ZXIge1xuICAgICAgICB2YWx1ZTogYW55O1xuICAgICAgICBkZXA6IERlcDtcbiAgICAgICAgY29uc3RydWN0b3IoXG4gICAgICAgICAgICB2YWx1ZTogYW55LFxuICAgICAgICApIHtcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgIHRoaXMuZGVwID0gbmV3IERlcCgpO1xuXG4gICAgICAgICAgICAvL+WunueOsOWPjOWQkee7keWumlxuICAgICAgICAgICAgZGVmKHZhbHVlLCAnX19vYl9fJywgdGhpcyk7XG5cbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIC8v6KaG55uW5omA5pyJ5Ye95pWwXG4gICAgICAgICAgICAgICAgKHZhbHVlIGFzIGFueSkuX19wcm90b19fID0gYXJyYXlNZXRob2RzO1xuICAgICAgICAgICAgICAgIHRoaXMub2JzZXJ2ZUFycmF5KHZhbHVlKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvKuWmguaenOaYr+WvueixoeWImeebtOaOpXdhbGvov5vooYznu5HlrpoqL1xuICAgICAgICAgICAgICAgIHRoaXMud2Fsayh2YWx1ZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiDpgY3ljobmiYDmnInlsZ7mgKfvvIzmi6bmiKpnZXQgc2V0XG4gICAgICAgICAqL1xuICAgICAgICB3YWxrKG9iajogYW55KSB7XG4gICAgICAgICAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMob2JqKVxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgZGVmaW5lUmVhY3RpdmUob2JqLCBrZXlzW2ldLCBvYmpba2V5c1tpXV0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICog5omA5Lul5oiQ5ZGY6YO95pu/5o2i5oiQb2JzZXJ2ZVxuICAgICAgICAgKi9cbiAgICAgICAgb2JzZXJ2ZUFycmF5KGl0ZW1zOiBBcnJheTxhbnk+KSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMCwgbCA9IGl0ZW1zLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgIG9ic2VydmUoaXRlbXNbaV0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgIH1cbn0iLCJuYW1lc3BhY2Ugdm0ge1xuXG4gICAgZXhwb3J0IGNsYXNzIFRpY2sge1xuICAgICAgICBwcm90ZWN0ZWQgc3RhdGljIHRlbXA6IFdhdGNoZXJbXSA9IFtdO1xuICAgICAgICBzdGF0aWMgcXVldWU6IFdhdGNoZXJbXSA9IFtdO1xuICAgICAgICBzdGF0aWMgcXVldWVNYXA6IElJZE1hcCA9IG5ldyBJZE1hcCgpO1xuXG4gICAgICAgIHN0YXRpYyBhZGQodzogV2F0Y2hlcikge1xuICAgICAgICAgICAgaWYgKCF0aGlzLnF1ZXVlTWFwLmhhcyh3LmlkKSkge1xuICAgICAgICAgICAgICAgIHRoaXMucXVldWVNYXAuYWRkKHcuaWQpO1xuICAgICAgICAgICAgICAgIHRoaXMucXVldWUucHVzaCh3KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXRpYyBuZXh0KCkge1xuICAgICAgICAgICAgdGhpcy5xdWV1ZU1hcC5jbGVhcigpO1xuICAgICAgICAgICAgY29uc3QgdGVtcCA9IHRoaXMucXVldWU7XG4gICAgICAgICAgICB0aGlzLnF1ZXVlID0gdGhpcy50ZW1wO1xuICAgICAgICAgICAgdGhpcy50ZW1wID0gdGVtcDtcblxuICAgICAgICAgICAgZm9yIChsZXQgdyBvZiB0ZW1wKSB7XG4gICAgICAgICAgICAgICAgdy5ydW4oKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGVtcC5sZW5ndGggPSAwO1xuICAgICAgICB9XG5cbiAgICB9XG5cblxufSIsIm5hbWVzcGFjZSB2bSB7XG4gICAgZXhwb3J0IGNsYXNzIFdhdGNoZXIge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiDlrr/kuLtcbiAgICAgICAgICovXG4gICAgICAgIGhvc3Q6IElIb3N0O1xuXG4gICAgICAgIGlkOiBudW1iZXI7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIHVwZGF0ZeeahOaXtuWAmeeahOWbnuiwg+WHveaVsFxuICAgICAgICAgKi9cbiAgICAgICAgY2I6IEZ1bmN0aW9uO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiDnq4vljbPmiafooYxcbiAgICAgICAgICovXG4gICAgICAgIHN5bmM6IGJvb2xlYW47XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIOaOp+WItndhdGNo55qE5byA5YWzXG4gICAgICAgICAqL1xuICAgICAgICBhY3RpdmU6IGJvb2xlYW47XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIOW9k+WJjeaUtumbhueahOS+nei1lu+8jOeUqOS6juS4juaWsOeahOS+nei1luW3ruW8guWvueavlFxuICAgICAgICAgKi9cbiAgICAgICAgZGVwczogQXJyYXk8RGVwPjtcbiAgICAgICAgZGVwSWRzOiBJSWRNYXA7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIOacrOi9ruaUtumbhueahOS+nei1lu+8jOWcqOS9nOS4uuW9k+WJjeS+nei1luWJje+8jOmcgOimgeeUqOS6juW3ruW8guWvueavlFxuICAgICAgICAgKi9cbiAgICAgICAgbmV3RGVwczogQXJyYXk8RGVwPjtcbiAgICAgICAgbmV3RGVwSWRzOiBJSWRNYXA7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIOacgOe7iOimgeaJp+ihjOeahGdldOWHveaVsFxuICAgICAgICAgKi9cbiAgICAgICAgZ2V0dGVyOiBGdW5jdGlvbjtcblxuICAgICAgICAvKipcbiAgICAgICAgICog5omn6KGM5ZCO55qE57uT5p6c5YC8XG4gICAgICAgICAqL1xuICAgICAgICB2YWx1ZTogYW55O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiDlvZPmiafooYzlpLHotKXml7bmiYDopoHooajovr7lgLxcbiAgICAgICAgICovXG4gICAgICAgIGxvc2VWYWx1ZT86IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCB1bmRlZmluZWQ7XG5cbiAgICAgICAgY29uc3RydWN0b3IoXG4gICAgICAgICAgICBob3N0OiBJSG9zdCxcbiAgICAgICAgICAgIGV4cE9yRm46IHN0cmluZyB8IEZ1bmN0aW9uLFxuICAgICAgICAgICAgY2I6IEZ1bmN0aW9uLFxuICAgICAgICAgICAgb3B0aW9ucz86IHsgc3luYz86IGJvb2xlYW4sIGxvc2VWYWx1ZT86IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCB1bmRlZmluZWQgfVxuICAgICAgICApIHtcbiAgICAgICAgICAgIHRoaXMuaG9zdCA9IGhvc3Q7XG4gICAgICAgICAgICAvLyBvcHRpb25zXG4gICAgICAgICAgICBpZiAob3B0aW9ucykge1xuICAgICAgICAgICAgICAgIHRoaXMuc3luYyA9ICEhb3B0aW9ucy5zeW5jXG4gICAgICAgICAgICAgICAgdGhpcy5sb3NlVmFsdWUgPSBvcHRpb25zLmxvc2VWYWx1ZVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnN5bmMgPSBmYWxzZVxuICAgICAgICAgICAgICAgIHRoaXMubG9zZVZhbHVlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5jYiA9IGNiXG4gICAgICAgICAgICB0aGlzLmlkID0gKyt1aWRcbiAgICAgICAgICAgIHRoaXMuYWN0aXZlID0gdHJ1ZVxuICAgICAgICAgICAgdGhpcy5kZXBzID0gW11cbiAgICAgICAgICAgIHRoaXMubmV3RGVwcyA9IFtdXG4gICAgICAgICAgICB0aGlzLmRlcElkcyA9IG5ldyBJZE1hcCgpO1xuICAgICAgICAgICAgdGhpcy5uZXdEZXBJZHMgPSBuZXcgSWRNYXAoKTtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBleHBPckZuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5nZXR0ZXIgPSBleHBPckZuIGFzIGFueVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmdldHRlciA9IHBhcnNlUGF0aChleHBPckZuKSBhcyBhbnlcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZ2V0dGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ2V0dGVyID0gZnVuY3Rpb24gKCkgeyB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAgICAgICAgICAgICAgIGBleHBPckZuIOi3r+W+hOW8guW4uDogXCIke2V4cE9yRm59XCIgYFxuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IHRoaXMuZ2V0KClcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiDojrflj5blgLzvvIzlubbph43mlrDmlLbpm4bkvp3otZZcbiAgICAgICAgICovXG4gICAgICAgIGdldCgpIHtcbiAgICAgICAgICAgIC8q5byA5aeL5pS26ZuG5L6d6LWWKi9cbiAgICAgICAgICAgIERlcC5wdXNoQ29sbGVjdFRhcmdldCh0aGlzKVxuXG4gICAgICAgICAgICBsZXQgdmFsdWVcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLmdldHRlci5jYWxsKHRoaXMuaG9zdCwgdGhpcy5ob3N0KVxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL+W9k2dldOWksei0pe+8jOWImeS9v+eUqGxvc2VWYWx1ZeeahOWAvFxuICAgICAgICAgICAgaWYgKHRoaXMubG9zZVZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gdGhpcy5sb3NlVmFsdWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8q57uT5p2f5pS26ZuGKi9cbiAgICAgICAgICAgIERlcC5wb3BDb2xsZWN0VGFyZ2V0KClcblxuICAgICAgICAgICAgdGhpcy5jbGVhbnVwRGVwcygpXG4gICAgICAgICAgICByZXR1cm4gdmFsdWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiDmt7vliqDkvp3otZZcbiAgICAgICAgICog5Zyo5pS26ZuG5L6d6LWW55qE5pe25YCZ77yM6Kem5Y+RIERlcGVuZGVuY3kuY29sbGVjdFRhcmdldC5hZGREZXBcbiAgICAgICAgICovXG4gICAgICAgIGFkZERlcChkZXA6IERlcCkge1xuICAgICAgICAgICAgY29uc3QgaWQgPSBkZXAuaWRcbiAgICAgICAgICAgIGlmICghdGhpcy5uZXdEZXBJZHMuaGFzKGlkKSkge1xuICAgICAgICAgICAgICAgIHRoaXMubmV3RGVwSWRzLmFkZChpZClcbiAgICAgICAgICAgICAgICB0aGlzLm5ld0RlcHMucHVzaChkZXApXG5cbiAgICAgICAgICAgICAgICAvL+WQkWRlcOa3u+WKoOiHquW3se+8jOWunueOsOWPjOWQkeiuv+mXru+8jGRlcElkc+eUqOS9nOmHjeWkjea3u+WKoOeahOe8k+WtmFxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5kZXBJZHMuaGFzKGlkKSkge1xuICAgICAgICAgICAgICAgICAgICBkZXAuYWRkKHRoaXMpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIOa4heeQhuS+nei1luaUtumbhlxuICAgICAgICAgKi9cbiAgICAgICAgY2xlYW51cERlcHMoKSB7XG4gICAgICAgICAgICAvL+enu+mZpOacrOasoeaUtumbhuWQju+8jOS4jemcgOimgeeahOS+nei1lu+8iOmAmui/h+W3ruW8guWvueavlO+8iVxuICAgICAgICAgICAgbGV0IGkgPSB0aGlzLmRlcHMubGVuZ3RoXG4gICAgICAgICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGVwID0gdGhpcy5kZXBzW2ldXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLm5ld0RlcElkcy5oYXMoZGVwLmlkKSkge1xuICAgICAgICAgICAgICAgICAgICBkZXAucmVtb3ZlKHRoaXMpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL+iuqW5ld+S9nOS4uuW9k+WJjeiusOW9leeahOS+nei1lu+8jOW5tua4heepuuaXp+eahFxuICAgICAgICAgICAgbGV0IHRtcDogYW55ID0gdGhpcy5kZXBJZHNcbiAgICAgICAgICAgIHRoaXMuZGVwSWRzID0gdGhpcy5uZXdEZXBJZHNcbiAgICAgICAgICAgIHRoaXMubmV3RGVwSWRzID0gdG1wO1xuICAgICAgICAgICAgdGhpcy5uZXdEZXBJZHMuY2xlYXIoKTtcblxuICAgICAgICAgICAgdG1wID0gdGhpcy5kZXBzXG4gICAgICAgICAgICB0aGlzLmRlcHMgPSB0aGlzLm5ld0RlcHNcbiAgICAgICAgICAgIHRoaXMubmV3RGVwcyA9IHRtcFxuICAgICAgICAgICAgdGhpcy5uZXdEZXBzLmxlbmd0aCA9IDBcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiDlvZPkvp3otZblj5HnlJ/lj5jljJblsLHkvJrooqvmiafooYxcbiAgICAgICAgICovXG4gICAgICAgIHVwZGF0ZSgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnN5bmMpIHtcbiAgICAgICAgICAgICAgICAvL+eri+WNs+a4suafk1xuICAgICAgICAgICAgICAgIHRoaXMucnVuKClcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy/kuIvkuIDluKfmuLLmn5PvvIzlj6/ku6XpmY3kvY7ph43lpI3muLLmn5PnmoTmpoLnjodcbiAgICAgICAgICAgICAgICBUaWNrLmFkZCh0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiDmiafooYx3YXRjaFxuICAgICAgICAgKi9cbiAgICAgICAgcnVuKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuYWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLmdldCgpXG4gICAgICAgICAgICAgICAgLy/lpoLmnpzmlbDlgLzkuI3mg7PnrYnvvIzmiJbogIXmmK/lpI3mnYLlr7nosaHlsLHpnIDopoHmm7TmlrDop4blm75cbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgIT09IHRoaXMudmFsdWUgfHwgaXNPYmplY3QodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG9sZFZhbHVlID0gdGhpcy52YWx1ZVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgLyrop6blj5Hlm57osIPmuLLmn5Pop4blm74qL1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNiLmNhbGwodGhpcy5ob3N0LCB2YWx1ZSwgb2xkVmFsdWUpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIOaUtumbhuivpXdhdGNoZXLnmoTmiYDmnIlkZXBz5L6d6LWWXG4gICAgICAgICAqL1xuICAgICAgICBkZXBlbmQoKSB7XG4gICAgICAgICAgICBsZXQgaSA9IHRoaXMuZGVwcy5sZW5ndGhcbiAgICAgICAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRlcHNbaV0uZGVwZW5kKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiDlsIboh6rouqvku47miYDmnInkvp3otZbmlLbpm4borqLpmIXliJfooajliKDpmaRcbiAgICAgICAgICovXG4gICAgICAgIHRlYXJkb3duKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuYWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgcmVtb3ZlKHRoaXMuaG9zdC4kd2F0Y2hlcnMsIHRoaXMpO1xuICAgICAgICAgICAgICAgIGxldCBpID0gdGhpcy5kZXBzLmxlbmd0aFxuICAgICAgICAgICAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kZXBzW2ldLnJlbW92ZSh0aGlzKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLmFjdGl2ZSA9IGZhbHNlXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbn0iLCJuYW1lc3BhY2Ugdm0ge1xuXHR3aW5kb3dbXCJ2bVwiXSA9IHZtO1xufVxuIl19