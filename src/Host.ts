namespace vm {
    export interface IHost {

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

    export class Host implements IHost {

        $watcherList: Watcher[] = [];
        $isDestroyed: boolean = false;

        $watch(expOrFn: string | Function, cb: (oldValue: any, newValue: any) => void) {
            if (this.$isDestroyed) {
                console.error("the host is destroyed", this);
                return;
            }
            let watcher = new Watcher(this, expOrFn, cb)
            this.$watcherList.push(watcher);
            return watcher;
        }

        $destroy() {
            var temp = this.$watcherList;
            this.$watcherList = [];
            for (let w of temp) {
                w.teardown();
            }

            this.$isDestroyed = true;
        }
    }

    /**
     * 向普通对象注入Host相关方法
     */
    export function implementHost(obj: any): IHost {
        if (hasOwn(obj, "$watcherList")) {
            return obj;
        }
        def(obj, "$watcherList", []);
        def(obj, "$isDestroyed", false);
        def(obj, "$watch", Host.prototype.$watch);
        def(obj, "$destroy", Host.prototype.$destroy);
        return obj;
    }
}