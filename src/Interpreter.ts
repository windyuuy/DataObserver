namespace vm {
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
    ]

    export enum NodeType {
        //运算符
        "[", "(", ".", P1,
        "!", P2,
        "**", P3,
        "*", "/", "%", P4,
        "+", "-", P5,
        ">", "<", ">=", "<=", P6,
        "!=", "==", P7,
        "&&", "||", P8,
        ",", P9,

        "]", ")", P10,//结束符号

        //值
        "number",
        "word",
        "string",
        "boolean",

        //组合，只会在AST中出现
        "function"

    }

    class WordNode {
        constructor(
            public type: NodeType,
            public value: any
        ) { }
    }

    class ASTNode {
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
            var temp = "";
            var lastChar = "";
            var state: number = 0;//0初始状态；1数字；2运算符；3引号字符串；4单词
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
                        if (doubleOpMap[char]) {
                            //可能是多运算符
                            state = 2;
                        } else {
                            if (NodeType[temp as any] == undefined) {
                                throw "表达式编译失败" + expression + " 不支持的运算符: " + temp;
                            }
                            nodeList.push(new WordNode(NodeType[temp as any] as any, null))
                            reset()
                        }

                    } else if (markMap[char]) {
                        //引号
                        markType = char;
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
                        nodeList.push(new WordNode(NodeType.number, parseFloat(temp)))
                        reset();
                        run(char);//重新执行
                    }
                } else if (state == 2) {
                    //运算符
                    if (NodeType[(temp + char) as any] != undefined) {
                        //识别到运算符
                        temp += char;
                        nodeList.push(new WordNode(NodeType[temp as any] as any, null))
                        reset()
                    } else {
                        nodeList.push(new WordNode(NodeType[temp as any] as any, null))
                        reset();
                        run(char);//重新执行
                    }

                } else if (state == 3) {
                    //引号
                    if (char == markType && lastChar != "\\") {
                        nodeList.push(new WordNode(NodeType.string, temp))
                        reset();
                    } else {
                        temp += char;
                    }
                } else if (state == 4) {
                    //单词
                    if (spaceMap[char] || operatorCharMap[char] || markMap[char]) {
                        if (temp == "true" || temp == "false") {
                            nodeList.push(new WordNode(NodeType.boolean, temp == "true"))
                        } else {
                            nodeList.push(new WordNode(NodeType.word, temp))
                        }
                        reset();
                        run(char);//重新执行
                    } else {
                        temp += char;
                    }
                }

            }

            for (const char of expression) {
                run(char)
                lastChar = char;
            }
            run(" ")//传入空格，使其收集最后的结束点

            return nodeList;
        }

        static toAST(nodeList: WordNode[], expression: string) {
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
                    throw "目标不是运算符" + NodeType[op.type] + " " + String(op.value);
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
            var startRead = (/*左值的位置，既开始位置*/pos: number, isRoot: boolean = false): { pos: number, node: ASTNode } => {
                let currentPos = pos;
                let endPos = nodeList.length - 1;

                let currentNode: ASTNode;

                let linkNode = (left: ASTNode | WordNode | null, op: NodeType, right: ASTNode | WordNode | ASTNode[] | null) => {
                    if (currentNode != null && right == null) {
                        return;//right为空则表示单值，不应该记录
                    }
                    if (currentNode == null) {
                        if (right instanceof ASTNode && right.right == null) {
                            currentNode = new ASTNode(left, op, right.left);
                        } else {
                            currentNode = new ASTNode(left, op, right);
                        }
                    } else {
                        if (right instanceof ASTNode && right.right == null) {
                            var newNode = new ASTNode(currentNode, op, right.left);
                        } else {
                            var newNode = new ASTNode(currentNode, op, right);
                        }
                        currentNode = newNode;
                    }
                }
                let joinNode = (node: ASTNode) => {
                    if (currentNode == null) {
                        currentNode = node;
                    } else {
                        node.left = currentNode;
                        currentNode = node;
                    }
                }

                let maxCount = 10000
                let count = 0;
                while (currentPos <= endPos) {
                    if (count++ >= maxCount) {
                        throw "死循环"
                    }
                    let left = nodeList[currentPos];
                    if (left.type < NodeType.P9) {
                        //一开始就是运算符，直接计算返回
                        if (left.type == NodeType["!"]) {
                            let right = nodeList[currentPos + 1]
                            if (right == null) {
                                throw "语法错误，" + expression + "，无法找到运算符右值 '" + NodeType[left.type] + "' "
                            }
                            if (right.type < NodeType.P9) {
                                //右值也是运算符
                                if (right.type == NodeType["("]) {
                                    let r = startRead(currentPos + 1)
                                    linkNode(null, NodeType["!"], r.node)
                                    currentPos = r.pos;
                                } else {
                                    throw "语法错误，" + expression + "，运算符'" + NodeType[left.type] + "'的右值不合理，竟然是 '" + NodeType[right.type] + "' ";
                                }
                            } else {
                                //验证优先级
                                let right2 = nodeList[currentPos + 2];
                                if (right2 != null && right2.type > NodeType.P10) {
                                    throw "语法错误，" + expression + "，期待是一个运算符但却是 '" + NodeType[right2.type] + "' "
                                }
                                if (right2 != null && getPN(right2) < getPN(left)) {
                                    //右侧运算符优先
                                    var r = startRead(currentPos + 1);
                                    linkNode(null, left.type, r.node);
                                    currentPos = r.pos;
                                } else {
                                    //从左到右的顺序
                                    linkNode(null, left.type, right);
                                    currentPos = currentPos + 1;
                                }
                            }

                        } else if (left.type == NodeType["("]) {
                            let r = startRead(currentPos + 1)
                            let next = nodeList[r.pos];
                            if (next == null || next.type != NodeType[")"]) {
                                throw "语法错误，" + expression + "，缺少闭合符号 ')'"
                            }
                            joinNode(r.node)
                            currentPos = r.pos;
                            if (!isRoot) {
                                break;
                            }

                        } else if (left.type == NodeType["["]) {
                            let r = startRead(currentPos + 1)
                            let next = nodeList[r.pos];
                            if (next == null || next.type != NodeType["]"]) {
                                throw "语法错误，" + expression + "，缺少闭合符号 ']'"
                            }
                            joinNode(r.node);
                            currentPos = r.pos;
                            if (!isRoot) {
                                break;
                            }
                        } else {
                            throw "语法错误，" + expression + "，无法匹配的运算符 '" + NodeType[left.type] + "' "
                        }
                    } else {
                        let op = nodeList[currentPos + 1];
                        if (op == null || op.type > NodeType.P9 && op.type < NodeType.P10 || op.type == NodeType[","]) {
                            //left依然要输出
                            linkNode(left, left.type, null);
                            if (op != null) {
                                currentPos += 1;
                            }
                            break;//已结束
                        }

                        if (op.type > NodeType.P9) {
                            throw "语法错误，" + expression + "，期待是一个运算符但却是 '" + NodeType[op.type] + "' "
                        }

                        if (op.type == NodeType["("]) {
                            //函数调用
                            let right2 = nodeList[currentPos + 2];
                            if (right2 == null) {
                                throw "语法错误，" + expression + "，函数调用缺少右括号 "
                            }
                            if (right2.type == NodeType[")"]) {
                                //无参函数
                                linkNode(left, NodeType.function, []);
                                currentPos += 2;
                            } else {
                                //开始读取参数
                                let parList: ASTNode[] = [];
                                let r = startRead(currentPos + 2)//读取括号里的内容
                                parList.push(r.node.right ? r.node : r.node.left as any);
                                while (nodeList[r.pos] && nodeList[r.pos].type == NodeType[","]) {
                                    r = startRead(r.pos + 1)//读取括号里的内容
                                    parList.push(r.node.right ? r.node : r.node.left as any);
                                }
                                if (nodeList[r.pos] == undefined || nodeList[r.pos].type != NodeType[")"]) {
                                    throw "语法错误，" + expression + "，缺少闭合符号 ')'"
                                }
                                linkNode(left, NodeType.function, parList);
                                currentPos = r.pos;
                            }
                            continue;
                        } else if (op.type == NodeType["["]) {
                            //属性访问
                            let right2 = nodeList[currentPos + 2];
                            if (right2 == null) {
                                throw "语法错误，" + expression + "，属性访问调用缺少右括号 ";
                            } else if (right2.type == NodeType["]"]) {
                                throw "语法错误，" + expression + "，[]中必须传入访问变量 ";
                            }
                            let r = startRead(currentPos + 2)//读取括号里的内容
                            if (nodeList[r.pos] == null || nodeList[r.pos].type != NodeType["]"]) {
                                throw "语法错误，" + expression + "，属性访问调用缺少右括号 ";
                            }
                            linkNode(left, NodeType["."], r.node);
                            currentPos = r.pos;
                            continue;
                        }

                        let right = nodeList[currentPos + 2];
                        if (right == null) {
                            throw "语法错误，" + expression + "，无法找到运算符右值 '" + NodeType[op.type] + "' "
                        }
                        if (right.type < NodeType.P9) {
                            //右值也是运算符
                            if (right.type == NodeType["!"] || right.type == NodeType["("] || right.type == NodeType["["]) {
                                let r = startRead(currentPos + 2)
                                linkNode(left, op.type, r.node)
                                currentPos = r.pos;
                            } else {
                                throw "语法错误，" + expression + "，运算符'" + NodeType[op.type] + "'的右值不合理，竟然是 '" + NodeType[right.type] + "' ";
                            }
                        } else {
                            //验证优先级
                            let right2 = nodeList[currentPos + 3];
                            if (right2 != null && right2.type > NodeType.P10) {
                                throw "语法错误，" + expression + "，期待是一个运算符但却是 '" + NodeType[right2.type] + "' "
                            }
                            if (right2 != null && getPN(right2) < getPN(op)) {
                                //右侧运算符优先
                                var r = startRead(currentPos + 2);
                                linkNode(left, op.type, r.node);
                                currentPos = r.pos;
                            } else {
                                //从左到右的顺序
                                linkNode(left, op.type, right);
                                currentPos = currentPos + 2;
                            }
                        }
                    }
                }
                return { node: currentNode!, pos: currentPos }
            }

            return startRead(0, true).node;
        }

        static toStringAST(ast: ASTNode | WordNode | ASTNode[]): string {
            if (ast instanceof ASTNode) {
                if (ast.operator == NodeType.function) {
                    return `(${this.toStringAST(ast.left!)}(${this.toStringAST(ast.right!)}))`
                } else if (ast.left == null) {
                    return `(${NodeType[ast.operator]} ${this.toStringAST(ast.right!)})`
                } else if (ast.right == null) {
                    return `(${this.toStringAST(ast.left)})`
                } else {
                    return `(${this.toStringAST(ast.left)} ${NodeType[ast.operator]} ${this.toStringAST(ast.right)})`
                }
            } else if (ast instanceof WordNode) {
                return ast.type == NodeType.string ? `"${ast.value}"` : `${ast.value}`
            } else if (ast instanceof Array) {
                return ast.map(a => this.toStringAST(a)).join(",")
            }
            return "error"
        }

        toString() {
            return Interpreter.toStringAST(this.ast);
        }

        run(environment: { [key: string]: any }): any {
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
                        case NodeType["function"]:
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
                                paramList.push(runLogic(p));
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
            return runLogic(this.ast);
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