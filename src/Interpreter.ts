namespace vm {
    const symbolList = [
        "(", ")", "[", "]", "{", "}", ".",
        "!",
        "**",
        "*", "/", "%",
        "+", "-",
        ">", "<", ">=", "<=",
        "!=", "==",
        "&&", "||",
        ",",
    ]

    export enum NodeType {
        //运算符
        "[", "(", "{", ".", P1,
        "!", P2,
        "**", P3,
        "*", "/", "%", P4,
        "+", "-", P5,
        ">", "<", ">=", "<=", P6,
        "!=", "==", P7,
        "&&", "||", P8,
        ",", P9,

        "]", ")", "}", P10,//结束符号

        //值
        "number",
        "word",
        "string",
        "boolean",
        P11,
        "annotation",

        //组合，只会在AST中出现
        "call",
        "lambda"

    }

    class WordNode {
        public lineEnd: number;
        constructor(
            public type: NodeType,
            public value: any,
            public lineStart: number,
            public columnStart: number,
            public columnEnd: number,
        ) { this.lineEnd = lineStart }
    }

    class ASTNode {
        //父节点
        public parent: ASTNode | null = null;
        constructor(
            public left: ASTNode | WordNode | null,//一元运算符允许为空
            public operator: NodeType,
            public right: ASTNode | WordNode | ASTNode[] | null,//如果是函数调用会是一个列表
        ) { }
    }

    const zeroCode = "0".charCodeAt(0);
    const nineCode = "9".charCodeAt(0);

    const operatorCharMap: { [key: string]: boolean } = {};
    symbolList.forEach(a => operatorCharMap[a.charAt(0)] = true);

    const markMap: { [key: string]: boolean } = {};
    ["\"", "'", "`"].forEach(a => markMap[a] = true)

    const doubleOpMap: { [key: string]: boolean } = {};
    symbolList.forEach(a => {
        if (a.length > 1) {
            doubleOpMap[a.charAt(0)] = true;
        }
    })

    const spaceMap: { [key: string]: boolean } = {};
    [" ", "\n", "\r", "\t"].forEach(a => spaceMap[a] = true)

    export class Interpreter {

        ast: ASTNode;

        constructor(
            public expression: string
        ) {

            this.ast = Interpreter.toAST(Interpreter.toWords(this.expression), this.expression);
        }

        static toWords(expression: string) {
            var line: number = 0;
            var column: number = 0;
            let startColum: number = -1;//仅仅在多行的处理中使用
            var temp = "";
            var lastChar = "";
            var state: number = 0;//0初始状态；1数字；2运算符；3引号字符串；4单词；5行注释；6块注释
            var markType: string;

            var nodeList: WordNode[] = [];

            var reset = () => {
                state = 0;
                temp = '';
            }
            var run = (char: string) => {
                if (state == 0) {
                    if (spaceMap[char]) {
                        return;
                    }
                    let code = char.charCodeAt(0);
                    if (code >= zeroCode && code <= nineCode) {
                        //数字
                        state = 1
                        temp += char;
                    } else if (operatorCharMap[char]) {
                        //运算符
                        temp += char;
                        if (doubleOpMap[char] || char == "/") {//有// 和 /* 等两种注释的情况
                            //可能是多运算符
                            state = 2;
                        } else if (char == "-" && nodeList.length != 0 && nodeList[nodeList.length - 1].type < NodeType.P8) {
                            //负数数字
                            state = 1;
                        } else {
                            if (NodeType[temp as any] == undefined) {
                                throw "表达式编译失败" + expression + " 不支持的运算符: " + temp;
                            }
                            nodeList.push(new WordNode(NodeType[temp as any] as any, null, line, column - temp.length + 1, column))
                            reset()
                        }

                    } else if (markMap[char]) {
                        //引号
                        markType = char;
                        startColum = column
                        state = 3
                    } else {
                        //单词
                        temp += char;
                        state = 4;
                    }
                } else if (state == 1) {
                    //数字
                    let code = char.charCodeAt(0);
                    if (code >= zeroCode && code <= nineCode || char == ".") {
                        temp += char
                    } else {
                        nodeList.push(new WordNode(NodeType.number, parseFloat(temp), line, column - temp.length, column - 1))
                        reset();
                        run(char);//重新执行
                    }
                } else if (state == 2) {
                    //运算符
                    let mg = temp + char;
                    if (mg == "//") {
                        //行注释
                        temp += char;
                        state = 5;
                    } else if (mg == "/*") {
                        //块注释
                        temp += char;
                        startColum = column - 1;
                        state = 6;
                    } else if (NodeType[(mg) as any] != undefined) {
                        //识别到运算符
                        temp += char;
                        nodeList.push(new WordNode(NodeType[temp as any] as any, null, line, column - temp.length + 1, column))
                        reset()
                    } else {
                        nodeList.push(new WordNode(NodeType[temp as any] as any, null, line, column - temp.length, column - 1))
                        reset();
                        run(char);//重新执行
                    }

                } else if (state == 3) {
                    //引号
                    if (char == markType && lastChar != "\\") {
                        if (markType == "`") {
                            let node = new WordNode(NodeType.string, temp, line, startColum, column)
                            node.lineStart = line - (temp.match(/\n/g) || [])?.length
                            nodeList.push(node)
                        } else {
                            nodeList.push(new WordNode(NodeType.string, temp, line, startColum, column))
                        }
                        reset();
                    } else {
                        temp += char;
                    }
                } else if (state == 4) {
                    //单词
                    if (spaceMap[char] || operatorCharMap[char] || markMap[char]) {
                        if (temp == "true" || temp == "false") {
                            nodeList.push(new WordNode(NodeType.boolean, temp == "true", line, column - temp.length, column - 1))
                        } else {
                            nodeList.push(new WordNode(NodeType.word, temp, line, column - temp.length, column - 1))
                        }
                        reset();
                        run(char);//重新执行
                    } else {
                        temp += char;
                    }
                } else if (state == 5) {
                    //行注释
                    if (char == "\n" || char == "\r") {
                        nodeList.push(new WordNode(NodeType.annotation, temp, line, column - temp.length, column))
                        reset();
                        //不需要重新执行，换行可以丢弃
                    } else {
                        temp += char
                    }
                } else if (state == 6) {
                    //块注释
                    if (lastChar + char == "*/") {
                        temp += char;

                        let node = new WordNode(NodeType.annotation, temp, line, startColum, column)
                        node.lineStart = line - (temp.match(/\n/g) || [])?.length
                        nodeList.push(node)
                        reset();
                    } else {
                        temp += char
                    }

                }

            }

            for (const char of expression) {
                run(char)
                lastChar = char;
                if (char == "\n") {
                    line++;
                    column = 0;
                } else {
                    column++;
                }
            }
            run(" ")//传入空格，使其收集最后的结束点

            return nodeList;
        }


        static toAST(nodeList: WordNode[], expression: string) {
            //生成括号关系
            type R = WordNode | WordNode[]
            var groupList: (R | R[])[] = []
            var sumMap = [NodeType["("], NodeType["["], NodeType["{"]]
            var readBracket = (start: number, list: (R | R[])[], endType?: NodeType) => {
                for (let i = start; i < nodeList.length; i++) {
                    let current = nodeList[i];
                    if (sumMap[current.type] !== undefined) {
                        //发现括号
                        let nextEndType: NodeType;
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
                        var newList: WordNode[] = [current]
                        i = readBracket(i + 1, newList, nextEndType);
                        list.push(newList);
                    } else if (endType != null && endType == current.type) {
                        list.push(current);
                        return i;
                    } else {
                        list.push(current);
                    }
                }
                return nodeList.length;
            }
            readBracket(0, groupList);


            //1、读取左值
            //2、读取运算符
            //3、读取右值，如果右值右边的运算符顺序>当前运算符，则递归读取右边完整的值
            //4、最终形成可直接执行的树

            var getPN = (op: WordNode) => {
                if (op.type < NodeType.P1) {
                    return NodeType.P1
                } else if (op.type < NodeType.P2) {
                    return NodeType.P2
                } else if (op.type < NodeType.P3) {
                    return NodeType.P3
                } else if (op.type < NodeType.P4) {
                    return NodeType.P4
                } else if (op.type < NodeType.P5) {
                    return NodeType.P5
                } else if (op.type < NodeType.P6) {
                    return NodeType.P6
                } else if (op.type < NodeType.P7) {
                    return NodeType.P7
                } else if (op.type < NodeType.P8) {
                    return NodeType.P8
                } else if (op.type < NodeType.P9) {
                    return NodeType.P9
                } else if (op.type < NodeType.P10) {
                    return NodeType.P10
                } else {
                    throw "目标不是运算符" + NodeType[op.type] + " " + String(op.value) + `在 ${op.lineStart}:${op.columnStart} - ${op.lineEnd}:${op.columnEnd}`;
                }
            }

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
            var readGroup = (group: (WordNode | any[])[]): ASTNode => {

                let startRead = (pos: number, endPos: number): { pos: number, node: ASTNode } => {
                    let currentPos = pos;
                    let currentNode: ASTNode;

                    let joinNode = (node: ASTNode) => {
                        if (currentNode != null) {
                            if (currentNode.operator > NodeType.P10 && currentNode.operator < NodeType.P11) {
                                node.left = currentNode.left;
                            } else {
                                node.left = currentNode;
                            }
                        }
                        if (node.right instanceof ASTNode && node.right.operator > NodeType.P10 && node.right.operator < NodeType.P11) {
                            node.right = node.right.left;
                        }
                        currentNode = node;
                    }
                    let maxCount = 10000
                    let count = 0;
                    while (currentPos <= endPos) {
                        if (count++ >= maxCount) {
                            throw "死循环"
                        }
                        let op = group[currentPos];
                        if (op instanceof Array) {
                            joinNode(readGroup(op));
                            currentPos++;
                        } else {
                            if (op.type < NodeType.P9) {
                                //运算符
                                let right = group[currentPos + 1];
                                let rightOp = group[currentPos + 2];

                                if (right instanceof WordNode && right.type == NodeType.word && rightOp instanceof Array && rightOp[0] instanceof WordNode && rightOp[0].type == NodeType["("]) {
                                    //函数调用
                                    if (rightOp.length == 2) {
                                        //无参函数
                                        joinNode(new ASTNode(null, op.type, new ASTNode(right, NodeType.call, [])));
                                    } else {
                                        //开始读取参数
                                        let parList: ASTNode[] = [];
                                        let s = 1;
                                        let stopList: number[] = []
                                        rightOp.forEach((a, index) => {
                                            if ((a as any).type == NodeType[","] || (a as any).type == NodeType[")"]) {
                                                stopList.push(index);
                                            }
                                        })
                                        for (let v of stopList) {
                                            parList.push(readGroup(rightOp.slice(s, v - 1)))
                                            s = v + 1;
                                        }
                                        joinNode(new ASTNode(null, op.type, new ASTNode(right, NodeType.call, parList)));
                                    }
                                    currentPos += 3;

                                } else if (
                                    (right && right instanceof WordNode && right.type < NodeType.P9) // + !a 的情况
                                    ||
                                    (rightOp && rightOp instanceof WordNode && rightOp.type < NodeType.P9 && getPN(rightOp) < getPN(op)) // + b * c 的情况
                                    ||
                                    (rightOp && rightOp instanceof Array && rightOp[0] instanceof WordNode && rightOp[0].type == NodeType["["] && getPN(rightOp[0]) < getPN(op)) // + a["c"] 的情况
                                ) {
                                    //右侧运算符优先
                                    var r = startRead(currentPos + 1, endPos);
                                    joinNode(new ASTNode(null, op.type, r.node));
                                    currentPos = r.pos;
                                } else {
                                    //从左到右的顺序
                                    joinNode(new ASTNode(null, op.type, right instanceof Array ? readGroup(right) : right))
                                    currentPos = currentPos + 2;
                                }
                            } else if (op.type > NodeType.P10 && op.type < NodeType.P11) {
                                joinNode(new ASTNode(op, op.type, null))
                                currentPos++;
                            } else {
                                throw "意外的错误"
                            }
                        }
                    }
                    return { node: currentNode!, pos: currentPos };
                }

                let first = group[0];
                if (first instanceof WordNode && first.type == NodeType["("]) {
                    //只是个group，可以忽略前后的()
                    return startRead(1, group.length - 2).node
                } else if (first instanceof WordNode && first.type == NodeType["["]) {
                    //.的另一种访问形式
                    return new ASTNode(null, NodeType["."], startRead(1, group.length - 2).node);
                } else if (first instanceof WordNode && first.type == NodeType["{"]) {
                    //子表达式
                    return new ASTNode(null, NodeType.lambda, startRead(1, group.length - 2).node);
                } else {
                    return startRead(0, group.length - 1).node;
                }
            }

            return readGroup(groupList);
        }

        static toStringAST(ast: ASTNode | WordNode | ASTNode[], isRoot = true): string {
            var r = ""
            if (!isRoot && ast instanceof ASTNode) {
                r += "("
            }
            if (ast instanceof ASTNode) {
                if (ast.operator == NodeType.call) {
                    r += `${this.toStringAST(ast.left!)}(${this.toStringAST(ast.right!, false)})`
                } else if (ast.left == null) {
                    if (ast.operator == NodeType.lambda) {
                        r += `{${this.toStringAST(ast.right!, true)}}`
                    } else {
                        r += `${NodeType[ast.operator]} ${this.toStringAST(ast.right!, false)}`
                    }
                } else if (ast.right == null) {
                    r += `${this.toStringAST(ast.left, false)}`
                } else {
                    r += `${this.toStringAST(ast.left, false)} ${NodeType[ast.operator]} ${this.toStringAST(ast.right, false)}`
                }
            } else if (ast instanceof WordNode) {
                r += ast.type == NodeType.string ? `"${ast.value}"` : `${ast.value}`
            } else if (ast instanceof Array) {
                r += ast.map(a => this.toStringAST(a, true)).join(", ")
            }
            if (!isRoot && ast instanceof ASTNode) {
                r += ")"
            }
            return r
        }

        toString() {
            return Interpreter.toStringAST(this.ast);
        }

        static run(environment: { [key: string]: any }, ast: WordNode | ASTNode | null): any {
            var runLogic = (ast: WordNode | ASTNode | null): any => {
                if (!ast) {
                    return null;
                }
                if (ast instanceof ASTNode) {
                    switch (ast.operator) {
                        case NodeType["."]:
                            let left: any;
                            if (ast.left instanceof WordNode) {
                                if (ast.left.type == NodeType.word) {
                                    left = environment[ast.left.value]
                                } else {
                                    left = ast.left.value;
                                }
                            } else {
                                left = runLogic(ast.left)
                            }
                            let rightWord: string
                            if (ast.right instanceof WordNode) {
                                rightWord = ast.right.value;
                            } else {
                                rightWord = runLogic(ast.right as any)
                            }
                            return left[rightWord];
                        case NodeType["!"]:
                            return !runLogic(ast.right as any)
                        case NodeType["**"]:
                            return runLogic(ast.left) ** runLogic(ast.right as any)
                        case NodeType["*"]:
                            return runLogic(ast.left) * runLogic(ast.right as any);
                        case NodeType["/"]:
                            return runLogic(ast.left) / runLogic(ast.right as any)
                        case NodeType["%"]:
                            return runLogic(ast.left) % runLogic(ast.right as any)
                        case NodeType["+"]:
                            return runLogic(ast.left) + runLogic(ast.right as any)
                        case NodeType["-"]:
                            return runLogic(ast.left) - runLogic(ast.right as any)
                        case NodeType[">"]:
                            return runLogic(ast.left) > runLogic(ast.right as any)
                        case NodeType["<"]:
                            return runLogic(ast.left) < runLogic(ast.right as any)
                        case NodeType[">="]:
                            return runLogic(ast.left) >= runLogic(ast.right as any)
                        case NodeType["<="]:
                            return runLogic(ast.left) <= runLogic(ast.right as any)
                        case NodeType["!="]:
                            return runLogic(ast.left) != runLogic(ast.right as any)
                        case NodeType["=="]:
                            return runLogic(ast.left) == runLogic(ast.right as any)
                        case NodeType["&&"]:
                            return runLogic(ast.left) && runLogic(ast.right as any)
                        case NodeType["||"]:
                            return runLogic(ast.left) || runLogic(ast.right as any)
                        case NodeType["word"]:
                        case NodeType["number"]:
                        case NodeType["string"]:
                        case NodeType["boolean"]:
                            return runLogic(ast.left)
                        case NodeType["call"]:
                            let self: any;
                            let target: any;
                            if (ast.left instanceof ASTNode) {
                                self = runLogic(ast.left.left);

                                let rightWord: any;
                                if (ast.left.right instanceof WordNode) {
                                    rightWord = ast.left.right.value;
                                }
                                else {
                                    rightWord = runLogic(ast.left.right as any);
                                }

                                target = self[rightWord];
                            } else {
                                target = runLogic(ast.left);
                            }
                            let func: Function
                            if (typeof target == "function") {
                                func = target;
                            } else {
                                func = environment[target];
                            }
                            let paramList = [];
                            for (let p of ast.right as ASTNode[]) {
                                if (p.operator == NodeType.lambda) {
                                    //生成新的环境
                                    let func = (a: any) => {
                                        var newEv: { [key: string]: any };
                                        if (isPrimitive(a)) {
                                            newEv = { value: a }
                                        } else {
                                            newEv = a;
                                        }
                                        newEv.__proto__ = environment;
                                        newEv._ = environment;

                                        Interpreter.run(newEv, p.right as any)
                                    }
                                    paramList.push(func);
                                } else {
                                    paramList.push(runLogic(p));
                                }
                            }
                            return func.apply(self || environment, paramList);
                    }
                } else if (ast instanceof WordNode) {
                    if (ast.type == NodeType.word) {
                        return environment[ast.value];
                    }
                    return ast.value;
                }
                throw "AST异常" + JSON.stringify(ast);
            }
            return runLogic(ast);
        }

        run(environment: { [key: string]: any }) {
            return Interpreter.run(environment, this.ast)
        }
    }

    /**
     * 基础环境
     */
    export var environment: { [key: string]: any } = {}

    //加入数学基础库
    Object.getOwnPropertyNames(Math).forEach(k => def(environment, k.toUpperCase(), (Math as any)[k]));

    /**
     * 继承自基础属性
     */
    export function extendsEnvironment(obj: any) {
        obj.__proto__ = environment;
    }

    /**
     * 向目标对象实现所有基础属性
     */
    export function implementEnvironment(obj: any) {
        let ks = Object.getOwnPropertyNames(environment);
        for (let k of ks) {
            def(obj, k, environment[k]);
        }
        return obj;
    }
}