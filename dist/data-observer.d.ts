declare namespace vm {
    var uid: number;
    /**
     * 递归遍历数组，进行ob对象的依赖记录。
     */
    function dependArray(value: any[]): void;
    class Dependency {
        /**
         * 当前正在收集依赖的对象
         */
        static collectTarget: Watcher | null;
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
        watcherList: Watcher[];
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
        $watcherList: Watcher[];
        /**
         * 当前是否已经释放
         */
        $isDestroyed: boolean;
        /**
         * 侦听一个数据发生的变化
         * @param expOrFn 访问的数据路径，或数据值的计算函数，当路径中的变量或计算函数所访问的值发生变化时，将会被重新执行
         * @param cb 重新执行后，发生变化则会出发回调函数
         */
        $watch(expOrFn: string | Function, cb: (oldValue: any, newValue: any) => void): void;
        /**
         * 释放host，包括所有watch
         */
        $destroy(): void;
    }
    class Host implements IHost {
        $watcherList: Watcher[];
        $isDestroyed: boolean;
        $watch(expOrFn: string | Function, cb: (oldValue: any, newValue: any) => void): Watcher | undefined;
        $destroy(): void;
    }
    /**
     * 向普通对象注入Host相关方法
     */
    function implementHost(obj: any): IHost;
}
declare namespace vm {
    function isObject(obj: any): boolean;
    function hasOwn(obj: any, key: string): boolean;
    function isPlainObject(obj: any): boolean;
    function def(obj: any, key: string, val: any, enumerable?: boolean): void;
    function remove(arr: any[], item: any): any[] | undefined;
    /**
     * 讲使用.分隔的路径访问转换为函数。
     * @param path
     */
    function parsePath(path: string): ((obj: any) => any) | undefined;
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
    /**
     * 将对象处理为可观察对象
     */
    function observe(value: any): void | Observer;
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
        dep: Dependency;
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
        deps: Array<Dependency>;
        depIds: IIdMap;
        /**
         * 本轮收集的依赖，在作为当前依赖前，需要用于差异对比
         */
        newDeps: Array<Dependency>;
        newDepIds: IIdMap;
        /**
         * 最终要执行的get函数
         */
        getter: Function;
        /**
         * 执行后的结果值
         */
        value: any;
        constructor(host: IHost, expOrFn: string | Function, cb: Function, options?: {
            sync?: boolean;
        });
        /**
         * 获取值，并重新收集依赖
         */
        get(): any;
        /**
         * 添加依赖
         * 在收集依赖的时候，触发 Dependency.collectTarget.addDep
         */
        addDep(dep: Dependency): void;
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
