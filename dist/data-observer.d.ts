declare namespace vm {
    var uid: number;
    /**
     * 递归遍历数组，进行ob对象的依赖记录。
     */
    function dependArray(value: any[]): void;
    class Dep {
        /**
         * 当前正在收集依赖的对象
         */
        static target: Watcher | null;
        /**
         * 当前正在收集以来的列队
         */
        static collectTargetStack: Watcher[];
        static pushCollectTarget(target: Watcher): void;
        static popCollectTarget(): void;
        /**
         * 唯一id，方便hashmap判断是否存在
         */
        id: number;
        /**
         * 侦听者
         */
        watchers: Watcher[];
        add(sub: Watcher): void;
        remove(sub: Watcher): void;
        /**
         * 收集依赖
         */
        depend(): void;
        /**
         * 通知所有侦听者
         */
        notify(): void;
    }
}
declare namespace vm {
    interface IHost {
        /**
         * 当前所有watch列表
         */
        $watchers: Watcher[];
        /**
         * 当前是否已经释放
         */
        $isDestroyed: boolean;
        /**
         * 侦听一个数据发生的变化
         * @param expOrFn 访问的数据路径，或数据值的计算函数，当路径中的变量或计算函数所访问的值发生变化时，将会被重新执行
         * @param cb 重新执行后，发生变化则会出发回调函数
         */
        $watch(expOrFn: string | Function, cb: (oldValue: any, newValue: any) => void, loseValue?: string | number | boolean | undefined): Watcher | undefined;
        /**
         * 释放host，包括所有watch
         */
        $destroy(): void;
    }
    class Host implements IHost {
        $watchers: Watcher[];
        $isDestroyed: boolean;
        constructor();
        $watch(expOrFn: string | Function, cb: (oldValue: any, newValue: any) => void, loseValue?: string | number | boolean | undefined): Watcher | undefined;
        $destroy(): void;
    }
    /**
     * 向普通对象注入Host相关方法
     */
    function implementHost<T>(obj: T): T & IHost;
    /**
     * 设置或添加某个对象的某个属性
     * @param target 对象，也可以是数组
     * @param key
     * @param value
     */
    function set(target: any, key: string | number, val: any): any;
    /**
     * 删除某个对象的某个属性
     * @param target 对象，也可以是数组
     * @param key
     */
    function del(target: any, key: string | number): void;
    /**
     * 注解，标注当前侦听的变量或表达式
     * @param expOrFn 路径或取值函数
     */
    function watch(expOrFn: string | Function): (target: Host, propertyKey: string, descriptor: PropertyDescriptor) => void;
    /**
     * 注解，标注当前需要访问的类
     */
    function host(constructor: new () => Host): any;
}
declare namespace vm {
    function isObject(obj: any): boolean;
    function hasOwn(obj: any, key: string): boolean;
    function isPlainObject(obj: any): boolean;
    function def(obj: any, key: string, val: any, enumerable?: boolean): void;
    function isUndef(v: any): boolean;
    function isDef(v: any): boolean;
    function isTrue(v: any): boolean;
    function isFalse(v: any): boolean;
    /**
     * 判断是否为单纯的数据类型
     */
    function isPrimitive(value: any): boolean;
    function isValidArrayIndex(val: any): boolean;
    function remove(arr: any[], item: any): any[] | undefined;
    /**
     * 讲使用.分隔的路径访问转换为函数。
     * @param path
     */
    function parsePath(path: string): ((obj: any) => any);
    function isNative(Ctor: any): boolean;
}
declare namespace vm {
    interface IIdMap {
        add(value: number): this;
        clear(): void;
        has(value: number): boolean;
    }
    var IdMap: new () => IIdMap;
}
declare namespace vm {
    enum NodeType {
        P0 = 0,
        "[" = 1,
        "(" = 2,
        "{" = 3,
        "." = 4,
        P1 = 5,
        "!" = 6,
        P2 = 7,
        "**" = 8,
        P3 = 9,
        "*" = 10,
        "/" = 11,
        "%" = 12,
        P4 = 13,
        "+" = 14,
        "-" = 15,
        P5 = 16,
        ">" = 17,
        "<" = 18,
        ">=" = 19,
        "<=" = 20,
        P6 = 21,
        "!=" = 22,
        "==" = 23,
        P7 = 24,
        "&&" = 25,
        P8 = 26,
        "||" = 27,
        P9 = 28,
        "," = 29,
        P10 = 30,
        "]" = 31,
        ")" = 32,
        "}" = 33,
        P11 = 34,
        "number" = 35,
        "word" = 36,
        "string" = 37,
        "boolean" = 38,
        "null" = 39,
        P12 = 40,
        "annotation" = 41,
        "call" = 42,
        "lambda" = 43
    }
    class WordNode {
        type: NodeType;
        value: any;
        lineStart: number;
        columnStart: number;
        columnEnd: number;
        lineEnd: number;
        parent: ASTNode | null;
        /**
         * 相关注释
         */
        frontAnnotation: string | undefined;
        behindAnnotation: string | undefined;
        constructor(type: NodeType, value: any, lineStart: number, columnStart: number, columnEnd: number);
    }
    type ASTNode = ValueASTNode | BracketASTNode | UnitaryASTNode | BinaryASTNode | CallASTNode;
    class ASTNodeBase {
        /**
         * 操作符
         */
        operator: NodeType;
        parent: ASTNode | null;
        /**
         * 相关注释
         */
        frontAnnotation: string | undefined;
        behindAnnotation: string | undefined;
        constructor(
        /**
         * 操作符
         */
        operator: NodeType);
    }
    class ValueASTNode extends ASTNodeBase {
        value: WordNode;
        constructor(value: WordNode);
    }
    class BracketASTNode extends ASTNodeBase {
        operator: NodeType;
        node: ASTNode;
        constructor(operator: NodeType, node: ASTNode);
    }
    class UnitaryASTNode extends ASTNodeBase {
        operator: NodeType;
        /**
         * 一元表达式的右值
         */
        right: ASTNode;
        constructor(operator: NodeType, 
        /**
         * 一元表达式的右值
         */
        right: ASTNode);
    }
    class BinaryASTNode extends ASTNodeBase {
        /**
         * 二元表达式的左值
         */
        left: ASTNode;
        /**
         * 运算符
         */
        operator: NodeType;
        /**
         * 二元表达式的左值
         */
        right: ASTNode;
        constructor(
        /**
         * 二元表达式的左值
         */
        left: ASTNode, 
        /**
         * 运算符
         */
        operator: NodeType, 
        /**
         * 二元表达式的左值
         */
        right: ASTNode);
    }
    class CallASTNode extends ASTNodeBase {
        /**
         * 函数访问节点
         */
        left: ASTNode;
        /**
         * 函数参数列表
         */
        parameters: ASTNode[];
        constructor(
        /**
         * 函数访问节点
         */
        left: ASTNode, 
        /**
         * 函数参数列表
         */
        parameters: ASTNode[]);
    }
    class Interpreter {
        expression: string;
        ast: ASTNode;
        astErrorList: string[];
        constructor(expression: string);
        static toWords(expression: string): WordNode[];
        static toAST(nodeList: WordNode[], expression: string, errorList: string[]): ASTNode;
        static toStringAST(ast: ASTNode, addBracket?: boolean): string;
        toString(): string;
        /**
         * 该函数所执行的表达式将自动进行容错处理
         * 1. 当访问属性产生null值时，其将不参与计算 例如：a.b+13 当a或b为空时，结果将返回13
         * 2. 当访问的表达式完全为null时，表达式将最终返回结果0，例如：a.b+c 则返回0
         * @param environment
         * @param ast
         */
        static run(environment: {
            [key: string]: any;
        }, ast: ASTNode): any;
        run(environment: {
            [key: string]: any;
        }): any;
    }
    /**
     * 基础环境
     */
    var environment: {
        [key: string]: any;
    };
    /**
     * 继承自基础属性
     */
    function extendsEnvironment(obj: any): void;
    /**
     * 向目标对象实现所有基础属性
     */
    function implementEnvironment(obj: any): any;
}
declare namespace vm {
    /**
     * 将对象处理为可观察对象
     */
    function observe(value: any): Observer | undefined;
    /**
     * 拦截对象所有的key和value
     */
    function defineReactive(obj: any, key: string, 
    /**
     * 对象的默认值，也就是 obj[key]
     */
    val: any): void;
    class Observer {
        value: any;
        dep: Dep;
        constructor(value: any);
        /**
         * 遍历所有属性，拦截get set
         */
        walk(obj: any): void;
        /**
         * 所以成员都替换成observe
         */
        observeArray(items: Array<any>): void;
    }
}
declare namespace vm {
    class Tick {
        protected static temp: Watcher[];
        static queue: Watcher[];
        static queueMap: IIdMap;
        static add(w: Watcher): void;
        static next(): void;
    }
}
declare namespace vm {
    class Watcher {
        /**
         * 宿主
         */
        host: IHost;
        id: number;
        /**
         * update的时候的回调函数
         */
        cb: Function;
        /**
         * 立即执行
         */
        sync: boolean;
        /**
         * 控制watch的开关
         */
        active: boolean;
        /**
         * 当前收集的依赖，用于与新的依赖差异对比
         */
        deps: Array<Dep>;
        depIds: IIdMap;
        /**
         * 本轮收集的依赖，在作为当前依赖前，需要用于差异对比
         */
        newDeps: Array<Dep>;
        newDepIds: IIdMap;
        /**
         * 最终要执行的get函数
         */
        getter: Function;
        /**
         * 执行后的结果值
         */
        value: any;
        /**
         * 当执行失败时所要表达值
         */
        loseValue?: string | number | boolean | undefined;
        constructor(host: IHost, expOrFn: string | Function, cb: Function, options?: {
            sync?: boolean;
            loseValue?: string | number | boolean | undefined;
        });
        /**
         * 获取值，并重新收集依赖
         */
        get(): any;
        /**
         * 添加依赖
         * 在收集依赖的时候，触发 Dependency.collectTarget.addDep
         */
        addDep(dep: Dep): void;
        /**
         * 清理依赖收集
         */
        cleanupDeps(): void;
        /**
         * 当依赖发生变化就会被执行
         */
        update(): void;
        /**
         * 执行watch
         */
        run(): void;
        /**
         * 收集该watcher的所有deps依赖
         */
        depend(): void;
        /**
         * 将自身从所有依赖收集订阅列表删除
         */
        teardown(): void;
    }
}
declare namespace vm { }
