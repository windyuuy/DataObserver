namespace vm {
    export var uid = 0;

    /**
     * 递归遍历数组，进行ob对象的依赖记录。
     */
    export function dependArray(value: any[]) {
        var obj: any = null;
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

    export class Dependency {

        /**
         * 当前正在收集依赖的对象
         */
        static collectTarget: Watcher | null = null;

        /**
         * 当前正在收集以来的列队
         */
        static collectTargetStack: Watcher[] = [];

        static pushCollectTarget(target: Watcher) {
            this.collectTargetStack.push(target);
            Dependency.collectTarget = target;
        }

        static popCollectTarget() {
            this.collectTargetStack.pop();
            Dependency.collectTarget = this.collectTargetStack[this.collectTargetStack.length - 1];
        }

        /**
         * 唯一id，方便hashmap判断是否存在
         */
        id: number = uid++;

        /**
         * 侦听者
         */
        watcherList: Watcher[] = [];

        add(sub: Watcher) {
            this.watcherList.push(sub)
        }

        /*移除一个观察者对象*/
        remove(sub: Watcher) {
            remove(this.watcherList, sub)
        }

        /**
         * 收集依赖
         */
        depend() {
            if (Dependency.collectTarget) {
                // Dep.target指向的是一个watcher
                Dependency.collectTarget.addDep(this)
            }
        }

        /**
         * 通知所有侦听者
         */
        notify() {
            const ws = this.watcherList.slice()
            for (let i = 0, l = ws.length; i < l; i++) {
                ws[i].update()
            }
        }
    }
}