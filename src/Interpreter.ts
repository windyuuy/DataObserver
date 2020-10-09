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
        P0,
        "[", "(", "{", ".", P1,
        "!", P2,
        "**", P3,
        "*", "/", "%", P4,
        "+", "-", P5,
        ">", "<", ">=", "<=", P6,
        "!=", "==", P7,
        "&&", P8, "||", P9,
        ",", P10,

        "]", ")", "}", P11,//结束符号

        //值
        "number",
        "word",
        "string",
        "boolean",
        "null",
        P12,
        "annotation",

        //组合，只会在AST中出现
        "call",
        "lambda"

    }

    export class WordNode {
        public lineEnd: number;
        //父节点
        public parent: ASTNode | null = null;
        /**
         * 相关注释
         */
        public frontAnnotation: string | undefined;
        public behindAnnotation: string | undefined;
        constructor(
            public type: NodeType,
            public value: any,
            public lineStart: number,
            public columnStart: number,
            public columnEnd: number,
        ) { this.lineEnd = lineStart }
    }

    export type ASTNode = ValueASTNode | BracketASTNode | UnitaryASTNode | BinaryASTNode | CallASTNode

    export class ASTNodeBase {
        //父节点
        public parent: ASTNode | null = null;
        /**
         * 相关注释
         */
        public frontAnnotation: string | undefined;
        public behindAnnotation: string | undefined;

        constructor(
            /**
             * 操作符
             */
            public operator: NodeType
        ) {

        }

    }

    export class ValueASTNode extends ASTNodeBase {
        constructor(
            public value: WordNode

        ) {
            super(value.type);
        }
    }

    export class BracketASTNode extends ASTNodeBase {
        constructor(
            public operator: NodeType,
            public node: ASTNode
        ) {
            super(operator);
        }

    }

    export class UnitaryASTNode extends ASTNodeBase {
        constructor(
            public operator: NodeType,
            /**
             * 一元表达式的右值
             */
            public right: ASTNode
        ) {
            super(operator);
            this.right.parent = this;
        }
    }

    export class BinaryASTNode extends ASTNodeBase {
        constructor(
            /**
             * 二元表达式的左值
             */
            public left: ASTNode,
            /**
             * 运算符
             */
            public operator: NodeType,
            /**
             * 二元表达式的左值
             */
            public right: ASTNode
        ) {
            super(operator);
            this.left.parent = this;
            this.right.parent = this;
        }
    }

    export class CallASTNode extends ASTNodeBase {
        constructor(
            /**
             * 函数访问节点
             */
            public left: ASTNode,
            /**
             * 函数参数列表
             */
            public parameters: ASTNode[]
        ) {
            super(NodeType.call);
            this.left.parent = this;
            this.parameters.forEach(a => a.parent = this);
        }
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

        astErrorList: string[] = [];

        constructor(
            public expression: string
        ) {

            this.ast = Interpreter.toAST(Interpreter.toWords(this.expression), this.expression, this.astErrorList);
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
                        } else if (char == "-" && (nodeList.length != 0 && nodeList[nodeList.length - 1].type < NodeType.P10 || nodeList.length == 0)) {
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
                        } else if (temp == "null") {
                            nodeList.push(new WordNode(NodeType.null, null, line, column - temp.length, column - 1))
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

        static toAST(nodeList: WordNode[], expression: string, errorList: string[]) {
            //根据运算符优先级进行分组
            type Node = WordNode[] | WordNode | ASTNode;
            let bracketList: Node[] = [];

            let bracketMap: { [key: string]: boolean } = {};
            [NodeType["("], NodeType["["], NodeType["{"]].forEach(k => bracketMap[k] = true);

            let getWordNode = (node: Node) => {
                while (node instanceof Array) {
                    node = node[0];
                }
                if (node instanceof WordNode) {
                    return node;
                }
            }

            let pushError = (node: Node, msg: string) => {
                let errorPos = getWordNode(node)!;
                let errorMsg = expression + msg;
                if (errorPos) {
                    errorMsg += `，在${errorPos.lineEnd + 1}:${errorPos.columnEnd + 1}。`
                }
                errorList.push(errorMsg)
            }

            /**
             * 将括号按层级分组成数组
             */
            let convertBracket = (start: number, list: Node[], endType?: NodeType) => {
                for (let i = start; i < nodeList.length; i++) {
                    let current = nodeList[i];
                    if (bracketMap[current.type] !== undefined) {
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
                                throw expression + "括号分析异常异常'" + NodeType[current.type] + "' " + current.lineStart + ":" + current.columnStart;
                        }
                        var newList: WordNode[] = [current]
                        i = convertBracket(i + 1, newList, nextEndType);
                        list.push(newList);
                    } else if (endType != null && endType == current.type) {
                        list.push(current);
                        return i;
                    } else {
                        list.push(current);
                    }
                }
                if (endType != null && (list[list.length - 1] as WordNode).type != endType) {
                    pushError(list[list.length - 1], `缺少闭合括号'${NodeType[endType]}'`);
                    //自动补充一个符号
                    list.push(new WordNode(endType, null, 0, 0, 0));
                }
                return nodeList.length;
            }


            var unaryExp = (list: Node[], startPriority: number, endPriority: number) => {
                if (list.length <= 1) {
                    return list;
                }
                //当前环境下单目运算符只会在值的左边
                //连续多个单目运算符从右往左组合运算
                let rlist: Node[] = []
                let currentAST: ASTNode | undefined;
                for (let i = list.length - 1; i >= 0; i--) {
                    let a = list[i]
                    let b = list[i - 1]
                    if (b instanceof WordNode && b.type > startPriority && b.type < endPriority) {
                        if (a == null) {
                            pushError(a, "一元运算符" + NodeType[b.type] + "缺少右值");
                            a = new WordNode(NodeType.boolean, true, 0, 0, 0);//自动补充
                        }
                        if (currentAST == null) {
                            //第一次发现
                            currentAST = new UnitaryASTNode(b.type, genAST(a instanceof Array ? a : [a]));
                        } else {
                            //多个单目运算符连续
                            currentAST = new UnitaryASTNode(b.type, currentAST);
                        }
                    } else {
                        if (currentAST) {
                            //一轮连续的单目运算符组合完毕
                            rlist.push(currentAST);
                            currentAST = undefined;
                        } else {
                            rlist.push(a);//上次必然已经被加入了ast中，因此不需要push
                        }
                    }
                }
                if (currentAST) {
                    //边界对象不要遗留
                    rlist.push(currentAST);
                }
                return rlist.reverse();//转为正常的顺序
            }

            var binaryExp = (list: Node[], startPriority: number, endPriority: number) => {
                if (list.length <= 1) {
                    return list;
                }
                let rlist: Node[] = []
                let currentAST: ASTNode | undefined;
                for (let i = 1, l = list.length; i < l; i++) {
                    let a = list[i - 1];
                    let b = list[i];
                    let c = list[i + 1];
                    if (b instanceof WordNode && b.type > startPriority && b.type < endPriority) {
                        if (c == null) {
                            pushError(a, "二元运算符" + NodeType[b.type] + "缺少右值");
                            c = new WordNode(NodeType.number, 0, 0, 0, 0);//自动补充
                        }
                        if (currentAST == null) {
                            //第一次发现
                            rlist.pop()//删除上次循环所插入的b
                            currentAST = new BinaryASTNode(genAST(a instanceof Array ? a : [a]), b.type, genAST(c instanceof Array ? c : [c]));
                        } else {
                            //多次双目运算符连续
                            currentAST = new BinaryASTNode(currentAST, b.type, genAST(c instanceof Array ? c : [c]));
                        }


                        //特殊处理 . 和 [] 后续逻辑，可能会紧跟着函数调用
                        let d = list[i + 2];
                        if (endPriority == NodeType.P1 && d instanceof Array && d[0] instanceof WordNode && d[0].type == NodeType["("]) {
                            currentAST = new CallASTNode(currentAST, genParamList(d));

                            i++;//跳过d的遍历
                        }
                        i++;//跳过c的遍历

                    }

                    //特殊处理，仅处理a['b']中括号的访问方式。
                    else if (b instanceof Array && b[0] instanceof WordNode && b[0].type == NodeType["["]) {
                        //中括号方式访问属性
                        if (currentAST) {
                            currentAST = new BinaryASTNode(currentAST, NodeType["["], genAST(b));
                        } else {
                            rlist.pop()//删除上次循环所插入的b
                            currentAST = new BinaryASTNode(genAST(a instanceof Array ? a : [a]), NodeType["["], genAST(b));
                        }

                        //特殊处理 . 和 [] 后续逻辑，可能会紧跟着函数调用
                        if (endPriority == NodeType.P1 && c instanceof Array && c[0] instanceof WordNode && c[0].type == NodeType["("]) {
                            currentAST = new CallASTNode(currentAST, genParamList(c));

                            i++//跳过c的遍历
                        }

                    } else {
                        if (currentAST) {
                            if (endPriority == NodeType.P1 && b instanceof Array && b[0] instanceof WordNode && b[0].type == NodeType["("]) {
                                currentAST = new CallASTNode(currentAST, genParamList(b));
                                continue;
                            } else {
                                //一轮连续的双目运算符组合完毕
                                rlist.push(currentAST);
                                currentAST = undefined;
                            }
                        } else if (endPriority == NodeType.P1 && a instanceof WordNode && a.type == NodeType.word && b instanceof Array && b[0] instanceof WordNode && b[0].type == NodeType["("]) {
                            //特殊处理 . 和 [] 后续逻辑，可能会紧跟着函数调用
                            currentAST = new CallASTNode(genAST(a instanceof Array ? a : [a]), genParamList(b));
                            rlist.pop() //删除上次循环所插入的b
                            continue;//a和b都需要插入到rlist
                        }
                        if (i == 1) {//由于是从1开始遍历的，因此需要保留0的值
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
            }

            let splice = (list: Node[], sp: NodeType): Node[][] => {
                let r: Node[][] = [];
                let current: Node[] = [];
                for (let l of list) {
                    //这里会忽略括号
                    if (l instanceof WordNode) {
                        if (l.type == sp) {
                            //产生切割
                            if (current.length > 0) {
                                r.push(current);
                                current = [];
                            }
                        } else if (l.type == NodeType["("] || l.type == NodeType[")"] || l.type == NodeType["["] || l.type == NodeType["]"] || l.type == NodeType["{"] || l.type == NodeType["}"]) {
                            //跳过该字符
                        } else {
                            current.push(l);
                        }
                    } else {
                        current.push(l);
                    }
                }
                if (current.length > 0) {
                    r.push(current);
                }
                return r;
            }

            let genParamList = (list: Node[]): ASTNode[] => {
                let paramList = splice(list, NodeType[","]);
                let rlist: ASTNode[] = [];
                for (let p of paramList) {
                    rlist.push(genAST(p))
                }
                return rlist;
            }

            let genAST = (sourcelist: Node[]): ASTNode => {
                if (sourcelist.length == 1 && sourcelist[0] instanceof ASTNodeBase) {
                    return sourcelist[0];
                }
                if (sourcelist.length == 1 && sourcelist[0] instanceof Array) {
                    return genAST(sourcelist[0]);
                }

                let list = sourcelist;

                //进行括号处理
                let bracketType: NodeType | undefined;
                let a = list[0]; let b = list[list.length - 1];
                if (a instanceof WordNode && b instanceof WordNode &&
                    (a.type == NodeType["("] && b.type == NodeType[")"] ||
                        a.type == NodeType["["] && b.type == NodeType["]"] ||
                        a.type == NodeType["{"] && b.type == NodeType["}"])
                ) {
                    bracketType = a.type;
                    list = list.slice(1, list.length - 1)
                }

                list = binaryExp(list, NodeType.P0, NodeType.P1)//分组  . 和 [] 形成访问连接，包括后面的函数
                list = unaryExp(list, NodeType.P1, NodeType.P2)//分组  ! ，进行一元表达式分组
                list = binaryExp(list, NodeType.P2, NodeType.P3)//分组  **，进行2元表达式分组
                list = binaryExp(list, NodeType.P3, NodeType.P4)//分组  * / %，进行2元表达式分组
                list = binaryExp(list, NodeType.P4, NodeType.P5)//分组  + -，进行2元表达式分组
                list = binaryExp(list, NodeType.P5, NodeType.P6)//分组  > < >= <=，进行2元表达式分组
                list = binaryExp(list, NodeType.P6, NodeType.P7)//分组  != ==，进行2元表达式分组
                list = binaryExp(list, NodeType.P7, NodeType.P8)//分组  && ，进行2元表达式分组
                list = binaryExp(list, NodeType.P8, NodeType.P9)//分组  ||，进行2元表达式分组

                let result: ASTNode;
                if (list.length == 1 && list[0] instanceof ASTNodeBase) {
                    //正常返回
                    result = list[0];
                } else if (list.length == 1 && list[0] instanceof WordNode) {
                    //单纯的数值
                    result = new ValueASTNode(list[0]);
                } else if (list.length > 1) {
                    pushError(sourcelist[0], "解析后节点列表无法归一")
                    result = new ValueASTNode(new WordNode(NodeType.number, 0, 0, 0, 0));
                } else {
                    pushError(sourcelist[0], "无法正确解析列表")
                    result = new ValueASTNode(new WordNode(NodeType.number, 0, 0, 0, 0));
                }

                if (bracketType !== undefined) {
                    if (bracketType == NodeType["{"]) {
                        return new BracketASTNode(NodeType.lambda, result);
                    } else {
                        return new BracketASTNode(bracketType, result);
                    }
                } else {
                    return result;
                }
            }

            nodeList = nodeList.filter(a => a.type != NodeType.annotation)
            convertBracket(0, bracketList)//分组括号
            return genAST(bracketList);
        }


        static toStringAST(ast: ASTNode, addBracket?: boolean): string {
            var r = ""
            if (addBracket && !(ast instanceof ValueASTNode || ast instanceof BracketASTNode)) {
                r += "("
            }
            if (ast instanceof ValueASTNode) {
                if (ast.value.type == NodeType.string) {
                    r += `"${ast.value.value}"`
                } else {
                    r += `${ast.value.value}`
                }
            } else if (ast instanceof BracketASTNode) {
                if (ast.operator == NodeType["("]) {
                    r += `(${this.toStringAST(ast.node, addBracket)})`
                } else if (ast.operator == NodeType["["]) {
                    r += `[${this.toStringAST(ast.node, addBracket)}]`
                } else if (ast.operator == NodeType["{"] || ast.operator == NodeType.lambda) {
                    r += `{${this.toStringAST(ast.node, addBracket)}}`
                }
            } else if (ast instanceof UnitaryASTNode) {
                r += `${NodeType[ast.operator]}${this.toStringAST(ast.right, addBracket)}`
            } else if (ast instanceof BinaryASTNode) {
                if (ast.operator == NodeType["["]) {
                    r += `${this.toStringAST(ast.left, addBracket)}${this.toStringAST(ast.right, addBracket)}`
                } else if (ast.operator == NodeType["."]) {
                    r += `${this.toStringAST(ast.left, addBracket)}${NodeType[ast.operator]}${this.toStringAST(ast.right, addBracket)}`
                } else {
                    r += `${this.toStringAST(ast.left, addBracket)} ${NodeType[ast.operator]} ${this.toStringAST(ast.right, addBracket)}`
                }
            } else if (ast instanceof CallASTNode) {
                r += `${this.toStringAST(ast.left, addBracket)}( ${ast.parameters.map(a => this.toStringAST(a, addBracket)).join(", ")})`
            }
            if (addBracket && !(ast instanceof ValueASTNode || ast instanceof BracketASTNode)) {
                r += ")"
            }
            return r
        }

        toString() {
            return Interpreter.toStringAST(this.ast);
        }

        /**
         * 该函数所执行的表达式将自动进行容错处理
         * 1. 当访问属性产生null值时，其将不参与计算 例如：a.b+13 当a或b为空时，结果将返回13
         * 2. 当访问的表达式完全为null时，表达式将最终返回结果0，例如：a.b+c 则返回0
         * @param environment 
         * @param ast 
         */
        static run(environment: { [key: string]: any }, ast: ASTNode): any {

            if (ast instanceof ValueASTNode) {
                if (ast.operator == vm.NodeType.word) {
                    return environment[ast.value.value];
                } else {
                    return ast.value.value;
                }
            } else if (ast instanceof BracketASTNode) {
                return this.run(environment, ast.node)//括号内必然是个整体
            } else if (ast instanceof UnitaryASTNode) {
                let b = this.run(environment, ast.right)
                switch (ast.operator) {
                    case NodeType["!"]:
                        return !b;
                    default:
                        throw `意外的一元运算符${NodeType[ast.operator]}}]`
                }
            } else if (ast instanceof BinaryASTNode) {

                if (ast.operator == NodeType["."] || ast.operator == NodeType["["]) {
                    let a: any = this.run(environment, ast.left)
                    if (a == null) {
                        return null;//访问运算遇到null则不执行
                    }
                    if (ast.right instanceof ValueASTNode) {
                        return a[ast.right.value.value];
                    } else {
                        return a[this.run(environment, ast.right)];
                    }
                }
                let a = this.run(environment, ast.left)
                let b = this.run(environment, ast.right)

                if (!(ast.operator == NodeType["&&"] || ast.operator == NodeType["||"] || ast.operator == NodeType["=="] || ast.operator == NodeType["!="])) {
                    if (a == null && b == null) {
                        return null;
                    } else if (a == null && b != null) {
                        return b;
                    } else if (a != null && b == null) {
                        return a;
                    }
                }
                switch (ast.operator) {
                    case NodeType["**"]:
                        return a ** b
                    case NodeType["*"]:
                        return a * b;
                    case NodeType["/"]:
                        return a / b
                    case NodeType["%"]:
                        return a % b
                    case NodeType["+"]:
                        return a + b
                    case NodeType["-"]:
                        return a - b
                    case NodeType[">"]:
                        return a > b
                    case NodeType["<"]:
                        return a < b
                    case NodeType[">="]:
                        return a >= b
                    case NodeType["<="]:
                        return a <= b
                    case NodeType["!="]:
                        return a != b
                    case NodeType["=="]:
                        return a == b
                    case NodeType["&&"]:
                        return a && b
                    case NodeType["||"]:
                        return a || b
                    default:
                        throw `意外的二元运算符${NodeType[ast.operator]}}]`
                }
            } else if (ast instanceof CallASTNode) {
                let obj = this.run(environment, ast.left);

                let self: any | undefined;
                let func: Function | undefined;

                if (ast.left instanceof ValueASTNode) {
                    //全局函数
                    func = environment[ast.left.value.value];
                } else if (ast.left instanceof BinaryASTNode) {
                    self = this.run(environment, ast.left.left);
                    if (self == null) {
                        return null;//self无法获取
                    }
                    if (ast.left.right instanceof ValueASTNode) {
                        func = self[ast.left.right.value.value];
                    } else {
                        func = self[this.run(environment, ast.left.right)];
                    }
                }
                if (func == null) {
                    return null;//func无法获取
                }

                if (obj == null) {
                    //函数无法执行
                    return null;
                }
                let paramList = ast.parameters.map(p => {
                    if (p instanceof BracketASTNode && p.operator == NodeType.lambda) {
                        return (a: any) => {
                            var newEv: { [key: string]: any };
                            if (isPrimitive(a)) {
                                newEv = { value: a }
                            } else {
                                newEv = a;
                            }
                            newEv.__proto__ = environment;
                            newEv._ = environment;

                            return Interpreter.run(newEv, p.node)
                        }
                    } else {
                        return this.run(environment, p)
                    }
                });
                return func.apply(self || environment, paramList);
            }

        }

        run(environment: { [key: string]: any }) {
            try {
                return Interpreter.run(environment, this.ast)
            } catch (e) {
                throw this.expression + "\n" + (e instanceof Error ? e.message : e)
            }
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
            if (k == "__ob__") continue;
            def(obj, k, environment[k]);
        }
        return obj;
    }
}