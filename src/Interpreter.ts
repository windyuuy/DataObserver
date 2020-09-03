namespace vm {
    const symbolList = [
        "(", ")", "[", "]", ".",
        "**",
        "*", "/", "%",
        "+", "-",
        ">", "<", ">=", "<=",
        "!=", "==",
        "&&", "||", "!",
        ",",
    ]

    export enum NodeType {
        //运算符
        "[", "]", "(", ")", ".",
        "**",
        "*", "/", "%",
        "+", "-",
        ">", "<", ">=", "<=",
        "!=", "==",
        "&&", "||", "!",
        ",",

        //值
        "number",
        "word",
        "string",
        "boolean",

        //组合
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
            public left: ASTNode | null,//一元运算符允许为空
            public operator: NodeType,
            public right: ASTNode | ASTNode[],//如果是函数调用会是一个列表
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
            var root: ASTNode

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