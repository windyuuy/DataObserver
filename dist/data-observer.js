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
        Host.prototype.$watch = function (expOrFn, cb) {
            if (this.$isDestroyed) {
                console.error("the host is destroyed", this);
                return;
            }
            var watcher = new vm.Watcher(this, expOrFn, cb);
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
    var bailRE = new RegExp("[^" + (unicodeRegExp.source) + ".$_\\d]");
    /**
     * 讲使用.分隔的路径访问转换为函数。
     * @param path
     */
    function parsePath(path) {
        if (bailRE.test(path)) {
            //复杂表达式
            var i = new vm.Interpreter(path);
            return function (env) {
                return i.run(env);
            };
        }
        else {
            //简单的.属性访问逻辑
            var segments = path.split('.');
            return function (obj) {
                for (var i = 0; i < segments.length; i++) {
                    if (!obj) {
                        return;
                    }
                    obj = obj[segments[i]];
                }
                return obj;
            };
        }
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
        NodeType[NodeType["["] = 0] = "[";
        NodeType[NodeType["("] = 1] = "(";
        NodeType[NodeType["{"] = 2] = "{";
        NodeType[NodeType["."] = 3] = ".";
        NodeType[NodeType["P1"] = 4] = "P1";
        NodeType[NodeType["!"] = 5] = "!";
        NodeType[NodeType["P2"] = 6] = "P2";
        NodeType[NodeType["**"] = 7] = "**";
        NodeType[NodeType["P3"] = 8] = "P3";
        NodeType[NodeType["*"] = 9] = "*";
        NodeType[NodeType["/"] = 10] = "/";
        NodeType[NodeType["%"] = 11] = "%";
        NodeType[NodeType["P4"] = 12] = "P4";
        NodeType[NodeType["+"] = 13] = "+";
        NodeType[NodeType["-"] = 14] = "-";
        NodeType[NodeType["P5"] = 15] = "P5";
        NodeType[NodeType[">"] = 16] = ">";
        NodeType[NodeType["<"] = 17] = "<";
        NodeType[NodeType[">="] = 18] = ">=";
        NodeType[NodeType["<="] = 19] = "<=";
        NodeType[NodeType["P6"] = 20] = "P6";
        NodeType[NodeType["!="] = 21] = "!=";
        NodeType[NodeType["=="] = 22] = "==";
        NodeType[NodeType["P7"] = 23] = "P7";
        NodeType[NodeType["&&"] = 24] = "&&";
        NodeType[NodeType["||"] = 25] = "||";
        NodeType[NodeType["P8"] = 26] = "P8";
        NodeType[NodeType[","] = 27] = ",";
        NodeType[NodeType["P9"] = 28] = "P9";
        NodeType[NodeType["]"] = 29] = "]";
        NodeType[NodeType[")"] = 30] = ")";
        NodeType[NodeType["}"] = 31] = "}";
        NodeType[NodeType["P10"] = 32] = "P10";
        //值
        NodeType[NodeType["number"] = 33] = "number";
        NodeType[NodeType["word"] = 34] = "word";
        NodeType[NodeType["string"] = 35] = "string";
        NodeType[NodeType["boolean"] = 36] = "boolean";
        NodeType[NodeType["P11"] = 37] = "P11";
        NodeType[NodeType["annotation"] = 38] = "annotation";
        //组合，只会在AST中出现
        NodeType[NodeType["call"] = 39] = "call";
        NodeType[NodeType["lambda"] = 40] = "lambda";
    })(NodeType = vm.NodeType || (vm.NodeType = {}));
    var WordNode = /** @class */ (function () {
        function WordNode(type, value, lineStart, columnStart, columnEnd) {
            this.type = type;
            this.value = value;
            this.lineStart = lineStart;
            this.columnStart = columnStart;
            this.columnEnd = columnEnd;
            this.lineEnd = lineStart;
        }
        return WordNode;
    }());
    var ASTNode = /** @class */ (function () {
        function ASTNode(left, //一元运算符允许为空
        operator, right) {
            this.left = left;
            this.operator = operator;
            this.right = right;
            //父节点
            this.parent = null;
        }
        return ASTNode;
    }());
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
            this.ast = Interpreter.toAST(Interpreter.toWords(this.expression), this.expression);
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
                        else if (char == "-" && nodeList.length != 0 && nodeList[nodeList.length - 1].type < NodeType.P8) {
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
        Interpreter.toAST = function (nodeList, expression) {
            var groupList = [];
            var sumMap = [NodeType["("], NodeType["["], NodeType["{"]];
            var readBracket = function (start, list, endType) {
                for (var i = start; i < nodeList.length; i++) {
                    var current = nodeList[i];
                    if (sumMap[current.type] !== undefined) {
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
                                throw "异常";
                        }
                        var newList = [current];
                        i = readBracket(i + 1, newList, nextEndType);
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
                    var errorPos = list[list.length - 1];
                    while (!(errorPos instanceof WordNode)) {
                        errorPos = errorPos[0];
                    }
                    throw "\u7F3A\u5C11\u95ED\u5408\u62EC\u53F7'" + NodeType[endType] + "'\uFF0C\u5728" + (errorPos.lineEnd + 1) + ":" + (errorPos.columnEnd + 1);
                }
                return nodeList.length;
            };
            readBracket(0, groupList);
            //1、读取左值
            //2、读取运算符
            //3、读取右值，如果右值右边的运算符顺序>当前运算符，则递归读取右边完整的值
            //4、最终形成可直接执行的树
            var getPN = function (op) {
                if (op.type < NodeType.P1) {
                    return NodeType.P1;
                }
                else if (op.type < NodeType.P2) {
                    return NodeType.P2;
                }
                else if (op.type < NodeType.P3) {
                    return NodeType.P3;
                }
                else if (op.type < NodeType.P4) {
                    return NodeType.P4;
                }
                else if (op.type < NodeType.P5) {
                    return NodeType.P5;
                }
                else if (op.type < NodeType.P6) {
                    return NodeType.P6;
                }
                else if (op.type < NodeType.P7) {
                    return NodeType.P7;
                }
                else if (op.type < NodeType.P8) {
                    return NodeType.P8;
                }
                else if (op.type < NodeType.P9) {
                    return NodeType.P9;
                }
                else if (op.type < NodeType.P10) {
                    return NodeType.P10;
                }
                else {
                    throw "目标不是运算符" + NodeType[op.type] + " " + String(op.value) + ("\u5728 " + op.lineStart + ":" + op.columnStart + " - " + op.lineEnd + ":" + op.columnEnd);
                }
            };
            /**
             * 解析的起点，此时会产生左值，并向下持续链接。
             * 一般为：
             * 1. 语句的一开始 例如： a+b+c 的 a
             * 2. 运算符优先级的一开始 例如： a+b*c+d 的 b
             * 3. 括号内的一开始 例如 a*(b+c) 的 b
             * 4. 函数调用参数的一开始，例如 a(b+c,d+e) 中的 b 和 d
             *
             * 所有需要重新开始的地方都应该调用该函数
             *
             * 计算后返回ASTNode和新的开始点
             */
            var readGroup = function (group) {
                var startRead = function (pos, endPos) {
                    var currentPos = pos;
                    var currentNode;
                    var joinNode = function (node) {
                        if (currentNode != null) {
                            if (currentNode.operator > NodeType.P10 && currentNode.operator < NodeType.P11) {
                                node.left = currentNode.left;
                            }
                            else {
                                node.left = currentNode;
                            }
                        }
                        if (node.right instanceof ASTNode && node.right.operator > NodeType.P10 && node.right.operator < NodeType.P11) {
                            node.right = node.right.left;
                        }
                        currentNode = node;
                    };
                    var readFunc = function (nameNode, paramNodeList) {
                        //函数调用
                        if (paramNodeList.length == 2) {
                            //无参函数
                            return new ASTNode(nameNode, NodeType.call, []);
                        }
                        else {
                            //开始读取参数
                            var parList = [];
                            var s = 1;
                            var stopList_2 = [];
                            paramNodeList.forEach(function (a, index) {
                                if (a.type == NodeType[","] || a.type == NodeType[")"]) {
                                    stopList_2.push(index);
                                }
                            });
                            for (var _i = 0, stopList_1 = stopList_2; _i < stopList_1.length; _i++) {
                                var v = stopList_1[_i];
                                var p = readGroup(paramNodeList.slice(s, v));
                                if (p.operator > NodeType.P10 && p.operator < NodeType.P11) {
                                    parList.push(p.left);
                                }
                                else {
                                    parList.push(p);
                                }
                                s = v + 1;
                            }
                            return new ASTNode(nameNode, NodeType.call, parList);
                        }
                    };
                    var maxCount = 10000;
                    var count = 0;
                    while (currentPos <= endPos) {
                        if (count++ >= maxCount) {
                            throw "死循环";
                        }
                        var op = group[currentPos];
                        if (op instanceof Array) {
                            joinNode(readGroup(op));
                            currentPos++;
                        }
                        else if (op.type == NodeType.word && group[currentPos + 1] instanceof Array && group[currentPos + 1][0] instanceof WordNode && group[currentPos + 1][0].type == NodeType["("]) {
                            //函数调用
                            joinNode(readFunc(op, group[currentPos + 1]));
                            currentPos += 2;
                        }
                        else {
                            if (op.type < NodeType.P9) {
                                //运算符
                                var right = group[currentPos + 1];
                                var rightOp = group[currentPos + 2];
                                if (right instanceof WordNode && right.type == NodeType.word && rightOp instanceof Array && rightOp[0] instanceof WordNode && rightOp[0].type == NodeType["("]) {
                                    var funcNode = readFunc(right, rightOp);
                                    joinNode(new ASTNode(null, op.type, right)); //插入名字
                                    joinNode(funcNode); //插入函数执行块
                                    currentPos += 3;
                                }
                                else if ((right && right instanceof WordNode && right.type < NodeType.P9) // + !a 的情况
                                    ||
                                        (rightOp && rightOp instanceof WordNode && rightOp.type < NodeType.P9 && getPN(rightOp) < getPN(op)) // + b * c 的情况
                                    ||
                                        (rightOp && rightOp instanceof Array && rightOp[0] instanceof WordNode && rightOp[0].type == NodeType["["] && getPN(rightOp[0]) < getPN(op)) // + a["c"] 的情况
                                ) {
                                    //右侧运算符优先
                                    var r = startRead(currentPos + 1, endPos);
                                    joinNode(new ASTNode(null, op.type, r.node));
                                    currentPos = r.pos;
                                }
                                else {
                                    //从左到右的顺序
                                    joinNode(new ASTNode(null, op.type, right instanceof Array ? readGroup(right) : right));
                                    currentPos = currentPos + 2;
                                }
                            }
                            else if (op.type > NodeType.P10 && op.type < NodeType.P11) {
                                joinNode(new ASTNode(op, op.type, null));
                                currentPos++;
                            }
                            else {
                                throw "意外的错误";
                            }
                        }
                    }
                    return { node: currentNode, pos: currentPos };
                };
                var first = group[0];
                if (first instanceof WordNode && first.type == NodeType["("]) {
                    //只是个group，可以忽略前后的()
                    return startRead(1, group.length - 2).node;
                }
                else if (first instanceof WordNode && first.type == NodeType["["]) {
                    //.的另一种访问形式
                    return new ASTNode(null, NodeType["."], startRead(1, group.length - 2).node);
                }
                else if (first instanceof WordNode && first.type == NodeType["{"]) {
                    //子表达式
                    return new ASTNode(null, NodeType.lambda, startRead(1, group.length - 2).node);
                }
                else {
                    return startRead(0, group.length - 1).node;
                }
            };
            return readGroup(groupList);
        };
        Interpreter.toStringAST = function (ast, isRoot) {
            var _this = this;
            if (isRoot === void 0) { isRoot = true; }
            var r = "";
            if (!isRoot && ast instanceof ASTNode) {
                r += "(";
            }
            if (ast instanceof ASTNode) {
                if (ast.operator == NodeType.call) {
                    r += this.toStringAST(ast.left) + "(" + this.toStringAST(ast.right, false) + ")";
                }
                else if (ast.left == null) {
                    if (ast.operator == NodeType.lambda) {
                        r += "{" + this.toStringAST(ast.right, true) + "}";
                    }
                    else {
                        r += NodeType[ast.operator] + " " + this.toStringAST(ast.right, false);
                    }
                }
                else if (ast.right == null) {
                    r += "" + this.toStringAST(ast.left, false);
                }
                else {
                    r += this.toStringAST(ast.left, false) + " " + NodeType[ast.operator] + " " + this.toStringAST(ast.right, false);
                }
            }
            else if (ast instanceof WordNode) {
                r += ast.type == NodeType.string ? "\"" + ast.value + "\"" : "" + ast.value;
            }
            else if (ast instanceof Array) {
                r += ast.map(function (a) { return _this.toStringAST(a, true); }).join(", ");
            }
            if (!isRoot && ast instanceof ASTNode) {
                r += ")";
            }
            return r;
        };
        Interpreter.prototype.toString = function () {
            return Interpreter.toStringAST(this.ast);
        };
        Interpreter.run = function (environment, ast) {
            var runLogic = function (ast) {
                if (!ast) {
                    return null;
                }
                if (ast instanceof ASTNode) {
                    switch (ast.operator) {
                        case NodeType["."]:
                            var left = void 0;
                            if (ast.left instanceof WordNode) {
                                if (ast.left.type == NodeType.word) {
                                    left = environment[ast.left.value];
                                }
                                else {
                                    left = ast.left.value;
                                }
                            }
                            else {
                                left = runLogic(ast.left);
                            }
                            var rightWord = void 0;
                            if (ast.right instanceof WordNode) {
                                rightWord = ast.right.value;
                            }
                            else {
                                rightWord = runLogic(ast.right);
                            }
                            return left[rightWord];
                        case NodeType["!"]:
                            return !runLogic(ast.right);
                        case NodeType["**"]:
                            return Math.pow(runLogic(ast.left), runLogic(ast.right));
                        case NodeType["*"]:
                            return runLogic(ast.left) * runLogic(ast.right);
                        case NodeType["/"]:
                            return runLogic(ast.left) / runLogic(ast.right);
                        case NodeType["%"]:
                            return runLogic(ast.left) % runLogic(ast.right);
                        case NodeType["+"]:
                            return runLogic(ast.left) + runLogic(ast.right);
                        case NodeType["-"]:
                            return runLogic(ast.left) - runLogic(ast.right);
                        case NodeType[">"]:
                            return runLogic(ast.left) > runLogic(ast.right);
                        case NodeType["<"]:
                            return runLogic(ast.left) < runLogic(ast.right);
                        case NodeType[">="]:
                            return runLogic(ast.left) >= runLogic(ast.right);
                        case NodeType["<="]:
                            return runLogic(ast.left) <= runLogic(ast.right);
                        case NodeType["!="]:
                            return runLogic(ast.left) != runLogic(ast.right);
                        case NodeType["=="]:
                            return runLogic(ast.left) == runLogic(ast.right);
                        case NodeType["&&"]:
                            return runLogic(ast.left) && runLogic(ast.right);
                        case NodeType["||"]:
                            return runLogic(ast.left) || runLogic(ast.right);
                        case NodeType["word"]:
                        case NodeType["number"]:
                        case NodeType["string"]:
                        case NodeType["boolean"]:
                            return runLogic(ast.left);
                        case NodeType["call"]:
                            var self_1;
                            var target = void 0;
                            if (ast.left instanceof ASTNode) {
                                self_1 = runLogic(ast.left.left);
                                var rightWord_1;
                                if (ast.left.right instanceof WordNode) {
                                    rightWord_1 = ast.left.right.value;
                                }
                                else {
                                    rightWord_1 = runLogic(ast.left.right);
                                }
                                target = self_1[rightWord_1];
                            }
                            else {
                                target = runLogic(ast.left);
                            }
                            var func = void 0;
                            if (typeof target == "function") {
                                func = target;
                            }
                            else {
                                func = environment[target];
                            }
                            var paramList = [];
                            var _loop_1 = function (p) {
                                if (p.operator == NodeType.lambda) {
                                    //生成新的环境
                                    var func_1 = function (a) {
                                        var newEv;
                                        if (vm.isPrimitive(a)) {
                                            newEv = { value: a };
                                        }
                                        else {
                                            newEv = a;
                                        }
                                        newEv.__proto__ = environment;
                                        newEv._ = environment;
                                        return Interpreter.run(newEv, p.right);
                                    };
                                    paramList.push(func_1);
                                }
                                else {
                                    paramList.push(runLogic(p));
                                }
                            };
                            for (var _i = 0, _a = ast.right; _i < _a.length; _i++) {
                                var p = _a[_i];
                                _loop_1(p);
                            }
                            return func.apply(self_1 || environment, paramList);
                    }
                }
                else if (ast instanceof WordNode) {
                    if (ast.type == NodeType.word) {
                        return environment[ast.value];
                    }
                    return ast.value;
                }
                throw "AST异常" + JSON.stringify(ast);
            };
            return runLogic(ast);
        };
        Interpreter.prototype.run = function (environment) {
            return Interpreter.run(environment, this.ast);
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
            }
            else {
                this.sync = false;
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
            value = this.getter.call(this.host, this.host);
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
            this.depIds = this.newDepIds;
            this.newDepIds.clear();
            var tmp = this.deps;
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
window["vm"] = vm;
