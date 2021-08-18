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
                    return environment[ast.value.value];
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
