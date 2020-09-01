namespace vm {
    export class Watcher {

        id: number;

        /**
         * update的时候的回调函数
         */
        cb: Function;

        /**
         * 延迟到下一帧刷新
         */
        lazy: boolean;

        /**
         * 立即执行
         */
        sync: boolean;

        /**
         * 当前是否为脏数据
         */
        dirty: boolean;

        /**
         * 控制watch的开关
         */
        active: boolean;

        /**
         * 当前收集的依赖，用于与新的依赖差异对比
         */
        deps: Array<Dependency>;
        depIds: { [key: string]: boolean };

        /**
         * 本轮收集的依赖，在作为当前依赖前，需要用于差异对比
         */
        newDeps: Array<Dependency>;
        newDepIds: { [key: string]: boolean };

        /**
         * 最终要执行的get函数
         */
        getter: Function;

        /**
         * 执行后的结果值
         */
        value: any;

        constructor(
            expOrFn: string | Function,
            cb: Function,
            options?: { lazy?: boolean, sync?: boolean }
        ) {
            // options
            if (options) {
                this.lazy = !!options.lazy
                this.sync = !!options.sync
            } else {
                this.lazy = this.sync = false
            }
            this.cb = cb
            this.id = ++uid
            this.active = true
            this.dirty = this.lazy
            this.deps = []
            this.newDeps = []
            this.depIds = Object.create(null)
            this.newDepIds = Object.create(null)

            if (typeof expOrFn === 'function') {
                this.getter = expOrFn as any
            } else {
                this.getter = parsePath(expOrFn) as any
                if (!this.getter) {
                    this.getter = function () { }
                    console.warn(
                        `expOrFn 路径异常: "${expOrFn}" `
                    )
                }
            }
            this.value = this.lazy
                ? undefined
                : this.get()
        }

        /**
         * 获取值，并重新收集依赖
         */
        get() {
            /*开始收集依赖*/
            Dependency.pushCollectTarget(this)

            let value
            value = this.getter.call(vm, vm)

            /*结束收集*/
            Dependency.popCollectTarget()

            this.cleanupDeps()
            return value
        }

        /**
         * 添加依赖
         * 在收集依赖的时候，触发 Dependency.collectTarget.addDep
         */
        addDep(dep: Dependency) {
            const id = dep.id
            if (!this.newDepIds[id]) {
                this.newDepIds[id] = true
                this.newDeps.push(dep)

                //向dep添加自己，实现双向访问，depIds用作重复添加的缓存
                if (!this.depIds[id]) {
                    dep.add(this)
                }
            }
        }

        /**
         * 清理依赖收集
         */
        cleanupDeps() {
            //移除本次收集后，不需要的依赖（通过差异对比）
            let i = this.deps.length
            while (i--) {
                const dep = this.deps[i]
                if (!this.newDepIds[dep.id]) {
                    dep.remove(this)
                }
            }

            //让new作为当前记录的依赖，并清空旧的
            this.depIds = this.newDepIds
            this.newDepIds = Object.create(null)

            let tmp = this.deps
            this.deps = this.newDeps
            this.newDeps = tmp
            this.newDeps.length = 0
        }

        /**
         * 当依赖发生变化就会被执行
         */
        update() {
            /* istanbul ignore else */
            if (this.lazy) {
                this.dirty = true
            } else if (this.sync) {
                /*同步则执行run直接渲染视图*/
                // 基本不会用到sync
                this.run()
            } else {
                /*异步推送到观察者队列中，由调度者调用。*/
                queueWatcher(this)
            }
        }

        /**
         * 执行watch
         */
        run() {
            if (this.active) {
                const value = this.get()
                //如果数值不想等，或者是复杂对象就需要更新视图
                if (value !== this.value || isObject(value)) {
                    const oldValue = this.value
                    this.value = value
                    /*触发回调渲染视图*/
                    this.cb.call(value, oldValue)
                }
            }
        }

        /**
         * 获取观察者的值，只可以在 lazy 的时候调用
         */
        evaluate() {
            this.value = this.get()
            this.dirty = false
        }

        /**
         * 收集该watcher的所有deps依赖
         */
        depend() {
            let i = this.deps.length
            while (i--) {
                this.deps[i].depend()
            }
        }

        /**
         * 将自身从所有依赖收集订阅列表删除
         */
        teardown() {
            if (this.active) {
                let i = this.deps.length
                while (i--) {
                    this.deps[i].remove(this)
                }
                this.active = false
            }
        }
    }

}