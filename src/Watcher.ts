namespace vm {
    export class Watcher {

        /**
         * 宿主
         */
        host: Host;

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

        constructor(
            host: Host,
            expOrFn: string | Function,
            cb: Function,
            options?: { sync?: boolean }
        ) {
            this.host = host;
            // options
            if (options) {
                this.sync = !!options.sync
            } else {
                this.sync = false
            }
            this.cb = cb
            this.id = ++uid
            this.active = true
            this.deps = []
            this.newDeps = []
            this.depIds = new IdMap();
            this.newDepIds = new IdMap();

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
            this.value = this.get()
        }

        /**
         * 获取值，并重新收集依赖
         */
        get() {
            /*开始收集依赖*/
            Dependency.pushCollectTarget(this)

            let value
            value = this.getter.call(this.host, this.host)

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
            if (!this.newDepIds.has(id)) {
                this.newDepIds.add(id)
                this.newDeps.push(dep)

                //向dep添加自己，实现双向访问，depIds用作重复添加的缓存
                if (!this.depIds.has(id)) {
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
                if (!this.newDepIds.has(dep.id)) {
                    dep.remove(this)
                }
            }

            //让new作为当前记录的依赖，并清空旧的
            this.depIds = this.newDepIds
            this.newDepIds.clear();

            let tmp = this.deps
            this.deps = this.newDeps
            this.newDeps = tmp
            this.newDeps.length = 0
        }

        /**
         * 当依赖发生变化就会被执行
         */
        update() {
            if (this.sync) {
                //立即渲染
                this.run()
            } else {
                //下一帧渲染，可以降低重复渲染的概率
                Tick.add(this);
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
                remove(this.host._watcherList, this);
                let i = this.deps.length
                while (i--) {
                    this.deps[i].remove(this)
                }
                this.active = false
            }
        }
    }

}