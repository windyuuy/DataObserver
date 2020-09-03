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
        "[", "]", "(", ")", ".", P1,
        "!", P2,
        "**", P3,
        "*", "/", "%", P4,
        "+", "-", P5,
        ">", "<", ">=", "<=", P6,
        "!=", "==", P7,
        "&&", "||", P8,
        ",", P9,

        //值
        "number",
        "word",
        "string",
        "boolean",

        //组合，只会在AST中出现
        "()", "[]",
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
            public right: ASTNode | WordNode | ASTNode[],//如果是函数调用会是一个列表
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
    [" ", "\n", "\r", "\t", "\s"].forEach(a => spaceMap[a] = true)

    export class Interpreter {


        constructor(
            public environment: { [key: string]: any },
            public expression: string
        ) {

            Interpreter.toAST(Interpreter.toWords(this.expression), this.expression);
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
                        nodeList.push(new WordNode(NodeType.word, temp))
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

            var error = (op: WordNode, v?: WordNode) => {
                if (v) {
                    throw `语法错误，${expression}，运算符'${NodeType[op.type]}'无法与'${NodeType[v.type]}'${v.value}匹配。`
                } else {
                    throw `语法错误，${expression}，运算符'${NodeType[op.type]}'无法合适的左值或右值`
                }
            }

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
                } else {
                    throw "目标不是运算符" + NodeType[op.type] + " " + String(op.value);
                }
            }

            //永远都是从左往右读取
            var read = (/*运算符的位置*/pos: number): ASTNode | undefined => {
                let op = nodeList[pos];

                if (op.type < NodeType.P9) {
                    throw "请确保read函数传入的是运算符" + NodeType[op.type] + " " + String(op.value);
                }

                if (op.type == NodeType["("]) {
                    //读取括号
                    let left = nodeList[pos - 1];
                    if (left && (left.type == NodeType.word || left.type == NodeType[")"] || left.type == NodeType["]"])) {
                        //左边的为函数调用
                    } else {
                        //仅仅只是一个组合
                        return loopRead(pos + 1);
                    }

                } else if (op.type == NodeType["["]) {

                } else if (op.type == NodeType["!"]) {
                    //一元运算符
                    let right = nodeList[pos + 1];
                    if (right == null) {
                        error(op);
                    }
                    if (right.type < NodeType.P9) {
                        //是运算符,且只可能是括号，否则肯定不正常
                        if (right.type == NodeType["("]) {
                            return new ASTNode(null, op.type, loopRead(pos + 1));
                        } else {
                            error(op, right);
                        }
                    } else {
                        //值
                        if (right.type == NodeType.string) {
                            error(op, right);//叹号后面怎么能是字符串
                        }

                        //验证right2
                        let right2 = nodeList[pos + 2];
                        if (right2 && right2.type < NodeType.P1) {
                            //优先right2,如果是(则有可能是函数调用
                            return new ASTNode(null, op.type, read(pos + 2)!);
                        } else {
                            //直接返回
                            return new ASTNode(null, op.type, right);
                        }
                    }

                } else {
                    //二元运算符
                    let left = nodeList[pos - 1];
                    let right = nodeList[pos + 1];

                    if (left.type < NodeType.P9) {
                        //左值不可以是运算符
                        error(op, left)
                    }

                    if (right.type < NodeType.P9) {
                        //是运算符,且只可能是括号，否则肯定不正常
                        if (right.type == NodeType["("]) {
                            return new ASTNode(null, op.type, loopRead(pos + 1));
                        } else {
                            error(op, right);
                        }
                    } else {
                        //验证right2
                        let right2 = nodeList[pos + 2];
                        if (right2 && right2.type < NodeType.P9 && getPN(right2) < getPN(op)) {
                            //优先右侧
                            return new ASTNode(left, op.type, read(pos + 2)!);
                        } else {
                            //直接返回
                            return new ASTNode(left, op.type, right);
                        }
                    }
                }
            }

            var loopRead = (/*开始循环的位置*/pos: number) => {
                return new NodeType()
            }

            return loopRead(0);
        }

        run(data: any): any {

        }
    }

    /**
     * 当前环境列表
     */
    export var environment: { [key: string]: any } = {}
    environment["Math"] = Math;//数学库
}