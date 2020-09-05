"use strict";
var vm;
(function (vm) {
    vm.uid = 0;
    /**
     * 递归遍历数组，进行ob对象的依赖记录。
     */
    function dependArray(value) {
        var obj = null;
        for (let i = 0, l = value.length; i < l; i++) {
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
    class Dep {
        constructor() {
            /**
             * 唯一id，方便hashmap判断是否存在
             */
            this.id = vm.uid++;
            /**
             * 侦听者
             */
            this.watchers = [];
        }
        static pushCollectTarget(target) {
            this.collectTargetStack.push(target);
            Dep.target = target;
        }
        static popCollectTarget() {
            this.collectTargetStack.pop();
            Dep.target = this.collectTargetStack[this.collectTargetStack.length - 1];
        }
        add(sub) {
            this.watchers.push(sub);
        }
        /*移除一个观察者对象*/
        remove(sub) {
            vm.remove(this.watchers, sub);
        }
        /**
         * 收集依赖
         */
        depend() {
            if (Dep.target) {
                // Dep.target指向的是一个watcher
                Dep.target.addDep(this);
            }
        }
        /**
         * 通知所有侦听者
         */
        notify() {
            const ws = this.watchers.slice();
            for (let i = 0, l = ws.length; i < l; i++) {
                ws[i].update();
            }
        }
    }
    /**
     * 当前正在收集依赖的对象
     */
    Dep.target = null;
    /**
     * 当前正在收集以来的列队
     */
    Dep.collectTargetStack = [];
    vm.Dep = Dep;
})(vm || (vm = {}));
var vm;
(function (vm) {
    class Host {
        constructor() {
            //防止产生枚举
            vm.def(this, "$watchers", []);
            vm.def(this, "$isDestroyed", false);
            //实现基础方法，用于表达式中方便得调用
            vm.implementEnvironment(this);
        }
        $watch(expOrFn, cb) {
            if (this.$isDestroyed) {
                console.error("the host is destroyed", this);
                return;
            }
            let watcher = new vm.Watcher(this, expOrFn, cb);
            this.$watchers.push(watcher);
            return watcher;
        }
        $destroy() {
            var temp = this.$watchers;
            this.$watchers = [];
            for (let w of temp) {
                w.teardown();
            }
            this.$isDestroyed = true;
        }
    }
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
            list.push({ expOrFn, cb });
        };
    }
    vm.watch = watch;
    /**
     * 注解，标注当前需要访问的类
     */
    function host(constructor) {
        return class extends constructor {
            constructor() {
                super();
                vm.observe(this);
                var list = this.__proto__["$watchAnnotations"];
                if (list != null) {
                    for (let w of list) {
                        this.$watch(w.expOrFn, w.cb.bind(this));
                    }
                }
            }
        };
    }
    vm.host = host;
})(vm || (vm = {}));
var vm;
(function (vm) {
    const _toString = Object.prototype.toString;
    const hasOwnProperty = Object.prototype.hasOwnProperty;
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
    const unicodeRegExp = /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/;
    const bailRE = new RegExp("[^" + (unicodeRegExp.source) + ".$_\\d]");
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
        class _IdMap {
            constructor() {
                this.set = Object.create(null);
            }
            has(key) {
                return this.set[key] === true;
            }
            add(key) {
                this.set[key] = true;
            }
            clear() {
                this.set = Object.create(null);
            }
        }
        _Set = _IdMap;
    }
    vm.IdMap = _Set;
})(vm || (vm = {}));
var vm;
(function (vm) {
    const symbolList = [
        "(", ")", "[", "]", ".",
        "!",
        "**",
        "*", "/", "%",
        "+", "-",
        ">", "<", ">=", "<=",
        "!=", "==",
        "&&", "||",
        ",",
    ];
    let NodeType;
    (function (NodeType) {
        //运算符
        NodeType[NodeType["["] = 0] = "[";
        NodeType[NodeType["("] = 1] = "(";
        NodeType[NodeType["."] = 2] = ".";
        NodeType[NodeType["P1"] = 3] = "P1";
        NodeType[NodeType["!"] = 4] = "!";
        NodeType[NodeType["P2"] = 5] = "P2";
        NodeType[NodeType["**"] = 6] = "**";
        NodeType[NodeType["P3"] = 7] = "P3";
        NodeType[NodeType["*"] = 8] = "*";
        NodeType[NodeType["/"] = 9] = "/";
        NodeType[NodeType["%"] = 10] = "%";
        NodeType[NodeType["P4"] = 11] = "P4";
        NodeType[NodeType["+"] = 12] = "+";
        NodeType[NodeType["-"] = 13] = "-";
        NodeType[NodeType["P5"] = 14] = "P5";
        NodeType[NodeType[">"] = 15] = ">";
        NodeType[NodeType["<"] = 16] = "<";
        NodeType[NodeType[">="] = 17] = ">=";
        NodeType[NodeType["<="] = 18] = "<=";
        NodeType[NodeType["P6"] = 19] = "P6";
        NodeType[NodeType["!="] = 20] = "!=";
        NodeType[NodeType["=="] = 21] = "==";
        NodeType[NodeType["P7"] = 22] = "P7";
        NodeType[NodeType["&&"] = 23] = "&&";
        NodeType[NodeType["||"] = 24] = "||";
        NodeType[NodeType["P8"] = 25] = "P8";
        NodeType[NodeType[","] = 26] = ",";
        NodeType[NodeType["P9"] = 27] = "P9";
        NodeType[NodeType["]"] = 28] = "]";
        NodeType[NodeType[")"] = 29] = ")";
        NodeType[NodeType["P10"] = 30] = "P10";
        //值
        NodeType[NodeType["number"] = 31] = "number";
        NodeType[NodeType["word"] = 32] = "word";
        NodeType[NodeType["string"] = 33] = "string";
        NodeType[NodeType["boolean"] = 34] = "boolean";
        //组合，只会在AST中出现
        NodeType[NodeType["function"] = 35] = "function";
    })(NodeType = vm.NodeType || (vm.NodeType = {}));
    class WordNode {
        constructor(type, value) {
            this.type = type;
            this.value = value;
        }
    }
    class ASTNode {
        constructor(left, //一元运算符允许为空
        operator, right) {
            this.left = left;
            this.operator = operator;
            this.right = right;
        }
    }
    const zeroCode = "0".charCodeAt(0);
    const nineCode = "9".charCodeAt(0);
    const operatorCharMap = {};
    symbolList.forEach(a => operatorCharMap[a.charAt(0)] = true);
    const markMap = {};
    ["\"", "'", "`"].forEach(a => markMap[a] = true);
    const doubleOpMap = {};
    symbolList.forEach(a => {
        if (a.length > 1) {
            doubleOpMap[a.charAt(0)] = true;
        }
    });
    const spaceMap = {};
    [" ", "\n", "\r", "\t"].forEach(a => spaceMap[a] = true);
    class Interpreter {
        constructor(expression) {
            this.expression = expression;
            this.ast = Interpreter.toAST(Interpreter.toWords(this.expression), this.expression);
        }
        static toWords(expression) {
            var temp = "";
            var lastChar = "";
            var state = 0; //0初始状态；1数字；2运算符；3引号字符串；4单词
            var markType;
            var nodeList = [];
            var reset = () => {
                state = 0;
                temp = '';
            };
            var run = (char) => {
                if (state == 0) {
                    if (spaceMap[char]) {
                        return;
                    }
                    let code = char.charCodeAt(0);
                    if (code >= zeroCode && code <= nineCode) {
                        //数字
                        state = 1;
                        temp += char;
                    }
                    else if (operatorCharMap[char]) {
                        //运算符
                        temp += char;
                        if (doubleOpMap[char]) {
                            //可能是多运算符
                            state = 2;
                        }
                        else {
                            if (NodeType[temp] == undefined) {
                                throw "表达式编译失败" + expression + " 不支持的运算符: " + temp;
                            }
                            nodeList.push(new WordNode(NodeType[temp], null));
                            reset();
                        }
                    }
                    else if (markMap[char]) {
                        //引号
                        markType = char;
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
                    let code = char.charCodeAt(0);
                    if (code >= zeroCode && code <= nineCode || char == ".") {
                        temp += char;
                    }
                    else {
                        nodeList.push(new WordNode(NodeType.number, parseFloat(temp)));
                        reset();
                        run(char); //重新执行
                    }
                }
                else if (state == 2) {
                    //运算符
                    if (NodeType[(temp + char)] != undefined) {
                        //识别到运算符
                        temp += char;
                        nodeList.push(new WordNode(NodeType[temp], null));
                        reset();
                    }
                    else {
                        nodeList.push(new WordNode(NodeType[temp], null));
                        reset();
                        run(char); //重新执行
                    }
                }
                else if (state == 3) {
                    //引号
                    if (char == markType && lastChar != "\\") {
                        nodeList.push(new WordNode(NodeType.string, temp));
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
                            nodeList.push(new WordNode(NodeType.boolean, temp == "true"));
                        }
                        else {
                            nodeList.push(new WordNode(NodeType.word, temp));
                        }
                        reset();
                        run(char); //重新执行
                    }
                    else {
                        temp += char;
                    }
                }
            };
            for (const char of expression) {
                run(char);
                lastChar = char;
            }
            run(" "); //传入空格，使其收集最后的结束点
            return nodeList;
        }
        static toAST(nodeList, expression) {
            //1、读取左值
            //2、读取运算符
            //3、读取右值，如果右值右边的运算符顺序>当前运算符，则递归读取右边完整的值
            //4、最终形成可直接执行的树
            var getPN = (op) => {
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
                    throw "目标不是运算符" + NodeType[op.type] + " " + String(op.value);
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
            var startRead = (/*左值的位置，既开始位置*/ pos, isRoot = false) => {
                let currentPos = pos;
                let endPos = nodeList.length - 1;
                let currentNode;
                let linkNode = (left, op, right) => {
                    if (currentNode != null && right == null) {
                        return; //right为空则表示单值，不应该记录
                    }
                    if (currentNode == null) {
                        if (right instanceof ASTNode && right.right == null) {
                            currentNode = new ASTNode(left, op, right.left);
                        }
                        else {
                            currentNode = new ASTNode(left, op, right);
                        }
                    }
                    else {
                        if (right instanceof ASTNode && right.right == null) {
                            var newNode = new ASTNode(currentNode, op, right.left);
                        }
                        else {
                            var newNode = new ASTNode(currentNode, op, right);
                        }
                        currentNode = newNode;
                    }
                };
                let joinNode = (node) => {
                    if (currentNode == null) {
                        currentNode = node;
                    }
                    else {
                        node.left = currentNode;
                        currentNode = node;
                    }
                };
                let maxCount = 10000;
                let count = 0;
                while (currentPos <= endPos) {
                    if (count++ >= maxCount) {
                        throw "死循环";
                    }
                    let left = nodeList[currentPos];
                    if (left.type < NodeType.P9) {
                        //一开始就是运算符，直接计算返回
                        if (left.type == NodeType["!"]) {
                            let right = nodeList[currentPos + 1];
                            if (right == null) {
                                throw "语法错误，" + expression + "，无法找到运算符右值 '" + NodeType[left.type] + "' ";
                            }
                            if (right.type < NodeType.P9) {
                                //右值也是运算符
                                if (right.type == NodeType["("]) {
                                    let r = startRead(currentPos + 1);
                                    linkNode(null, NodeType["!"], r.node);
                                    currentPos = r.pos;
                                }
                                else {
                                    throw "语法错误，" + expression + "，运算符'" + NodeType[left.type] + "'的右值不合理，竟然是 '" + NodeType[right.type] + "' ";
                                }
                            }
                            else {
                                //验证优先级
                                let right2 = nodeList[currentPos + 2];
                                if (right2 != null && right2.type > NodeType.P10) {
                                    throw "语法错误，" + expression + "，期待是一个运算符但却是 '" + NodeType[right2.type] + "' ";
                                }
                                if (right2 != null && getPN(right2) < getPN(left)) {
                                    //右侧运算符优先
                                    var r = startRead(currentPos + 1);
                                    linkNode(null, left.type, r.node);
                                    currentPos = r.pos;
                                }
                                else {
                                    //从左到右的顺序
                                    linkNode(null, left.type, right);
                                    currentPos = currentPos + 1;
                                }
                            }
                        }
                        else if (left.type == NodeType["("]) {
                            let r = startRead(currentPos + 1);
                            let next = nodeList[r.pos];
                            if (next == null || next.type != NodeType[")"]) {
                                throw "语法错误，" + expression + "，缺少闭合符号 ')'";
                            }
                            joinNode(r.node);
                            currentPos = r.pos;
                            if (!isRoot) {
                                break;
                            }
                        }
                        else if (left.type == NodeType["["]) {
                            let r = startRead(currentPos + 1);
                            let next = nodeList[r.pos];
                            if (next == null || next.type != NodeType["]"]) {
                                throw "语法错误，" + expression + "，缺少闭合符号 ']'";
                            }
                            joinNode(r.node);
                            currentPos = r.pos;
                            if (!isRoot) {
                                break;
                            }
                        }
                        else {
                            throw "语法错误，" + expression + "，无法匹配的运算符 '" + NodeType[left.type] + "' ";
                        }
                    }
                    else {
                        let op = nodeList[currentPos + 1];
                        if (op == null || op.type > NodeType.P9 && op.type < NodeType.P10 || op.type == NodeType[","]) {
                            //left依然要输出
                            linkNode(left, left.type, null);
                            if (op != null) {
                                currentPos += 1;
                            }
                            break; //已结束
                        }
                        if (op.type > NodeType.P9) {
                            throw "语法错误，" + expression + "，期待是一个运算符但却是 '" + NodeType[op.type] + "' ";
                        }
                        if (op.type == NodeType["("]) {
                            //函数调用
                            let right2 = nodeList[currentPos + 2];
                            if (right2 == null) {
                                throw "语法错误，" + expression + "，函数调用缺少右括号 ";
                            }
                            if (right2.type == NodeType[")"]) {
                                //无参函数
                                linkNode(left, NodeType.function, []);
                                currentPos += 2;
                            }
                            else {
                                //开始读取参数
                                let parList = [];
                                let r = startRead(currentPos + 2); //读取括号里的内容
                                parList.push(r.node.right ? r.node : r.node.left);
                                while (nodeList[r.pos] && nodeList[r.pos].type == NodeType[","]) {
                                    r = startRead(r.pos + 1); //读取括号里的内容
                                    parList.push(r.node.right ? r.node : r.node.left);
                                }
                                if (nodeList[r.pos] == undefined || nodeList[r.pos].type != NodeType[")"]) {
                                    throw "语法错误，" + expression + "，缺少闭合符号 ')'";
                                }
                                linkNode(left, NodeType.function, parList);
                                currentPos = r.pos;
                            }
                            continue;
                        }
                        else if (op.type == NodeType["["]) {
                            //属性访问
                            let right2 = nodeList[currentPos + 2];
                            if (right2 == null) {
                                throw "语法错误，" + expression + "，属性访问调用缺少右括号 ";
                            }
                            else if (right2.type == NodeType["]"]) {
                                throw "语法错误，" + expression + "，[]中必须传入访问变量 ";
                            }
                            let r = startRead(currentPos + 2); //读取括号里的内容
                            if (nodeList[r.pos] == null || nodeList[r.pos].type != NodeType["]"]) {
                                throw "语法错误，" + expression + "，属性访问调用缺少右括号 ";
                            }
                            linkNode(left, NodeType["."], r.node);
                            currentPos = r.pos;
                            continue;
                        }
                        let right = nodeList[currentPos + 2];
                        if (right == null) {
                            throw "语法错误，" + expression + "，无法找到运算符右值 '" + NodeType[op.type] + "' ";
                        }
                        if (right.type < NodeType.P9) {
                            //右值也是运算符
                            if (right.type == NodeType["!"] || right.type == NodeType["("] || right.type == NodeType["["]) {
                                let r = startRead(currentPos + 2);
                                linkNode(left, op.type, r.node);
                                currentPos = r.pos;
                            }
                            else {
                                throw "语法错误，" + expression + "，运算符'" + NodeType[op.type] + "'的右值不合理，竟然是 '" + NodeType[right.type] + "' ";
                            }
                        }
                        else {
                            //验证优先级
                            let right2 = nodeList[currentPos + 3];
                            if (right2 != null && right2.type > NodeType.P10) {
                                throw "语法错误，" + expression + "，期待是一个运算符但却是 '" + NodeType[right2.type] + "' ";
                            }
                            if (right2 != null && getPN(right2) < getPN(op)) {
                                //右侧运算符优先
                                var r = startRead(currentPos + 2);
                                linkNode(left, op.type, r.node);
                                currentPos = r.pos;
                            }
                            else {
                                //从左到右的顺序
                                linkNode(left, op.type, right);
                                currentPos = currentPos + 2;
                            }
                        }
                    }
                }
                return { node: currentNode, pos: currentPos };
            };
            return startRead(0, true).node;
        }
        static toStringAST(ast) {
            if (ast instanceof ASTNode) {
                if (ast.operator == NodeType.function) {
                    return `(${this.toStringAST(ast.left)}(${this.toStringAST(ast.right)}))`;
                }
                else if (ast.left == null) {
                    return `(${NodeType[ast.operator]} ${this.toStringAST(ast.right)})`;
                }
                else if (ast.right == null) {
                    return `(${this.toStringAST(ast.left)})`;
                }
                else {
                    return `(${this.toStringAST(ast.left)} ${NodeType[ast.operator]} ${this.toStringAST(ast.right)})`;
                }
            }
            else if (ast instanceof WordNode) {
                return ast.type == NodeType.string ? `"${ast.value}"` : `${ast.value}`;
            }
            else if (ast instanceof Array) {
                return ast.map(a => this.toStringAST(a)).join(",");
            }
            return "error";
        }
        toString() {
            return Interpreter.toStringAST(this.ast);
        }
        run(environment) {
            var runLogic = (ast) => {
                if (!ast) {
                    return null;
                }
                if (ast instanceof ASTNode) {
                    switch (ast.operator) {
                        case NodeType["."]:
                            let left;
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
                            let rightWord;
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
                        case NodeType["function"]:
                            let self;
                            let target;
                            if (ast.left instanceof ASTNode) {
                                self = runLogic(ast.left.left);
                                let rightWord;
                                if (ast.left.right instanceof WordNode) {
                                    rightWord = ast.left.right.value;
                                }
                                else {
                                    rightWord = runLogic(ast.left.right);
                                }
                                target = self[rightWord];
                            }
                            else {
                                target = runLogic(ast.left);
                            }
                            let func;
                            if (typeof target == "function") {
                                func = target;
                            }
                            else {
                                func = environment[target];
                            }
                            let paramList = [];
                            for (let p of ast.right) {
                                paramList.push(runLogic(p));
                            }
                            return func.apply(self || environment, paramList);
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
            return runLogic(this.ast);
        }
    }
    vm.Interpreter = Interpreter;
    /**
     * 基础环境
     */
    vm.environment = {};
    //加入数学基础库
    Object.getOwnPropertyNames(Math).forEach(k => vm.def(vm.environment, k.toUpperCase(), Math[k]));
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
        let ks = Object.getOwnPropertyNames(vm.environment);
        for (let k of ks) {
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
        let ob;
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
        const dep = new vm.Dep();
        const property = Object.getOwnPropertyDescriptor(obj, key);
        if (property && property.configurable === false) {
            return;
        }
        const getter = property && property.get;
        const setter = property && property.set;
        let valOb = observe(val);
        Object.defineProperty(obj, key, {
            enumerable: true,
            configurable: true,
            get: function reactiveGetter() {
                const value = getter ? getter.call(obj) : val;
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
                const value = getter ? getter.call(obj) : val;
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
    class Observer {
        constructor(value) {
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
        walk(obj) {
            const keys = Object.keys(obj);
            for (let i = 0; i < keys.length; i++) {
                defineReactive(obj, keys[i], obj[keys[i]]);
            }
        }
        /**
         * 所以成员都替换成observe
         */
        observeArray(items) {
            for (let i = 0, l = items.length; i < l; i++) {
                observe(items[i]);
            }
        }
    }
    vm.Observer = Observer;
})(vm || (vm = {}));
var vm;
(function (vm) {
    class Tick {
        static add(w) {
            if (!this.queueMap.has(w.id)) {
                this.queueMap.add(w.id);
                this.queue.push(w);
            }
        }
        static next() {
            this.queueMap.clear();
            const temp = this.queue;
            this.queue = this.temp;
            this.temp = temp;
            for (let w of temp) {
                w.run();
            }
            temp.length = 0;
        }
    }
    Tick.temp = [];
    Tick.queue = [];
    Tick.queueMap = new vm.IdMap();
    vm.Tick = Tick;
})(vm || (vm = {}));
var vm;
(function (vm) {
    class Watcher {
        constructor(host, expOrFn, cb, options) {
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
                    console.warn(`expOrFn 路径异常: "${expOrFn}" `);
                }
            }
            this.value = this.get();
        }
        /**
         * 获取值，并重新收集依赖
         */
        get() {
            /*开始收集依赖*/
            vm.Dep.pushCollectTarget(this);
            let value;
            value = this.getter.call(this.host, this.host);
            /*结束收集*/
            vm.Dep.popCollectTarget();
            this.cleanupDeps();
            return value;
        }
        /**
         * 添加依赖
         * 在收集依赖的时候，触发 Dependency.collectTarget.addDep
         */
        addDep(dep) {
            const id = dep.id;
            if (!this.newDepIds.has(id)) {
                this.newDepIds.add(id);
                this.newDeps.push(dep);
                //向dep添加自己，实现双向访问，depIds用作重复添加的缓存
                if (!this.depIds.has(id)) {
                    dep.add(this);
                }
            }
        }
        /**
         * 清理依赖收集
         */
        cleanupDeps() {
            //移除本次收集后，不需要的依赖（通过差异对比）
            let i = this.deps.length;
            while (i--) {
                const dep = this.deps[i];
                if (!this.newDepIds.has(dep.id)) {
                    dep.remove(this);
                }
            }
            //让new作为当前记录的依赖，并清空旧的
            this.depIds = this.newDepIds;
            this.newDepIds.clear();
            let tmp = this.deps;
            this.deps = this.newDeps;
            this.newDeps = tmp;
            this.newDeps.length = 0;
        }
        /**
         * 当依赖发生变化就会被执行
         */
        update() {
            if (this.sync) {
                //立即渲染
                this.run();
            }
            else {
                //下一帧渲染，可以降低重复渲染的概率
                vm.Tick.add(this);
            }
        }
        /**
         * 执行watch
         */
        run() {
            if (this.active) {
                const value = this.get();
                //如果数值不想等，或者是复杂对象就需要更新视图
                if (value !== this.value || vm.isObject(value)) {
                    const oldValue = this.value;
                    this.value = value;
                    /*触发回调渲染视图*/
                    this.cb.call(this.host, value, oldValue);
                }
            }
        }
        /**
         * 收集该watcher的所有deps依赖
         */
        depend() {
            let i = this.deps.length;
            while (i--) {
                this.deps[i].depend();
            }
        }
        /**
         * 将自身从所有依赖收集订阅列表删除
         */
        teardown() {
            if (this.active) {
                vm.remove(this.host.$watchers, this);
                let i = this.deps.length;
                while (i--) {
                    this.deps[i].remove(this);
                }
                this.active = false;
            }
        }
    }
    vm.Watcher = Watcher;
})(vm || (vm = {}));
window["vm"] = vm;
