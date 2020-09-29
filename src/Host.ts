namespace vm {
    export interface IHost {

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

    export class Host implements IHost {

        $watchers!: Watcher[];
        $isDestroyed!: boolean;

        constructor() {
            //防止产生枚举
            def(this, "$watchers", []);
            def(this, "$isDestroyed", false);

            //实现基础方法，用于表达式中方便得调用
            implementEnvironment(this);
        }

        $watch(expOrFn: string | Function, cb: (oldValue: any, newValue: any) => void, loseValue?: string | number | boolean | undefined): Watcher | undefined {
            if (this.$isDestroyed) {
                console.error("the host is destroyed", this);
                return;
            }
            if (!((this as any).__ob__ instanceof Observer)) {
                vm.observe(this);
            }
            let watcher = new Watcher(this, expOrFn, cb, { loseValue: loseValue })
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

    /**
     * 向普通对象注入Host相关方法
     */
    export function implementHost<T>(obj: T): T & IHost {
        if (hasOwn(obj, "$watchers")) {
            return obj as any;
        }
        def(obj, "$watchers", []);
        def(obj, "$isDestroyed", false);
        def(obj, "$watch", Host.prototype.$watch);
        def(obj, "$destroy", Host.prototype.$destroy);

        //实现基础方法，用于表达式中方便得调用
        implementEnvironment(obj);

        observe(obj);
        return obj as any;
    }

    /**
     * 设置或添加某个对象的某个属性
     * @param target 对象，也可以是数组
     * @param key 
     * @param value 
     */
    export function set(target: any, key: string | number, val: any) {
        if (isUndef(target) || isPrimitive(target)) {
            console.warn(("无法设置属性到 undefined, null, 或 primitive 值: " + ((target))));
            return;
        }
        if (Array.isArray(target) && isValidArrayIndex(key)) {
            target.length = Math.max(target.length, key as number);
            target.splice(key as number, 1, val);
            return val
        }
        if (key in target && !(key in Object.prototype)) {
            target[key] = val;
            return val
        }
        var ob = (target).__ob__;
        if (!ob) {
            target[key] = val;
            return val
        }
        defineReactive(ob.value, key as string, val);
        ob.dep.notify();
        return val
    }

    /**
     * 删除某个对象的某个属性
     * @param target 对象，也可以是数组
     * @param key 
     */
    export function del(target: any, key: string | number) {
        if (isUndef(target) || isPrimitive(target)) {
            console.warn(("无法删除属性到 undefined, null, 或 primitive 值: " + ((target))));
            return;
        }
        if (Array.isArray(target) && isValidArrayIndex(key)) {
            target.splice(key as number, 1);
            return
        }
        var ob = (target).__ob__;
        if (!hasOwn(target, key as string)) {
            return
        }
        delete target[key];
        if (!ob) {
            return
        }
        ob.dep.notify();
    }

    /**
     * 注解，标注当前侦听的变量或表达式
     * @param expOrFn 路径或取值函数
     */
    export function watch(expOrFn: string | Function) {
        return function (target: Host, propertyKey: string, descriptor: PropertyDescriptor) {
            if (!hasOwn(target, "$watchAnnotations")) {
                (target as any)["$watchAnnotations"] = [];
            }
            var list = (target as any)["$watchAnnotations"] as {
                expOrFn: string | Function,
                cb: (oldValue: any, newValue: any) => void
            }[]
            var cb = (target as any)[propertyKey] as (oldValue: any, newValue: any) => void

            list.push({ expOrFn, cb });
        }
    }

    /**
     * 注解，标注当前需要访问的类
     */
    export function host(constructor: new () => Host): any {
        return class extends constructor {
            constructor() {
                super()

                observe(this);

                var list = (this as any).__proto__["$watchAnnotations"] as {
                    expOrFn: string | Function,
                    cb: (oldValue: any, newValue: any) => void
                }[]

                if (list != null) {
                    for (let w of list) {
                        this.$watch(w.expOrFn, w.cb.bind(this));
                    }
                }


            }
        }
    }

}