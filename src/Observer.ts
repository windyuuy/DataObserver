/// <reference path="./utils.ts" />
namespace vm {

    //创建数组的函数代理
    var arrayProto = Array.prototype;
    var arrayMethods = Object.create(arrayProto);

    var methodsToPatch = [
        'push',
        'pop',
        'shift',
        'unshift',
        'splice',
        'sort',
        'reverse'
    ];

    methodsToPatch.forEach(function (method: string) {
        var original = (arrayProto as any)[method] as any;//缓存原始方法
        def(arrayMethods, method, function (this: Array<any> & { __ob__: Observer }) {
            var args = [], len = arguments.length;
            while (len--) args[len] = arguments[len];

            var result = original.apply(this, args);
            var ob = this.__ob__;
            var inserted;
            switch (method) {
                case 'push':
                case 'unshift':
                    inserted = args;
                    break
                case 'splice':
                    inserted = args.slice(2);
                    break
            }
            if (inserted) { ob.observeArray(inserted); }
            //通知刷新
            ob.dep.notify();
            return result
        });
    });

    /**
     * 将对象处理为可观察对象
     */
    export function observe(value: any) {
        if (!isObject(value)) {
            return;
        }
        let ob: Observer | void
        if (value.__ob__ instanceof Observer) {
            //对象已经绑定
            ob = value.__ob__;
        } else if (Object.isExtensible(value) && (Array.isArray(value) || isPlainObject(value))) {
            //只有普通的对象才可以进行观察
            return new Observer(value)
        }
        return ob;
    }

    /**
     * 拦截对象所有的key和value
     */
    export function defineReactive(
        obj: any,
        key: string,
        /**
         * 对象的默认值，也就是 obj[key]
         */
        val: any
    ) {
        //必包的中依赖，相当于是每一个属性的附加对象，用于记录属性的所有以来侦听。
        const dep = new Dependency()

        const property = Object.getOwnPropertyDescriptor(obj, key)
        if (property && property.configurable === false) {
            return
        }

        const getter = property && property.get
        const setter = property && property.set

        let valOb = observe(val)
        Object.defineProperty(obj, key, {
            enumerable: true,
            configurable: true,
            get: function reactiveGetter() {
                const value = getter ? getter.call(obj) : val

                //进行依赖收集，依赖收集前 Dep.target 会被赋值，收集完成后会置空。
                if (Dep.target) {
                    dep.depend()//自身的依赖
                    if (valOb) {
                        valOb.dep.depend()//属性值依赖
                    }
                    if (Array.isArray(value)) {
                        dependArray(value)
                    }
                }
                return value
            },
            set: function reactiveSetter(newVal) {
                const value = getter ? getter.call(obj) : val

                if (newVal === value || (newVal !== newVal && value !== value)) {
                    return//相等则无需进行后续处理
                }
                if (setter) {
                    setter.call(obj, newVal)
                } else {
                    val = newVal
                }
                valOb = observe(newVal)//如果是普通对象需要处理成可观察的

                dep.notify()//触发刷新
            }
        })
    }


    export class Observer {
        value: any;
        dep: Dependency;
        constructor(
            value: any,
        ) {
            this.value = value;
            this.dep = new Dependency();

            //实现双向绑定
            def(value, '__ob__', this);

            if (Array.isArray(value)) {
                //覆盖所有函数
                (value as any).__proto__ = arrayMethods;
                this.observeArray(value)
            } else {
                /*如果是对象则直接walk进行绑定*/
                this.walk(value)
            }
        }

        /**
         * 遍历所有属性，拦截get set
         */
        walk(obj: any) {
            const keys = Object.keys(obj)
            for (let i = 0; i < keys.length; i++) {
                defineReactive(obj, keys[i], obj[keys[i]])
            }
        }

        /**
         * 所以成员都替换成observe
         */
        observeArray(items: Array<any>) {
            for (let i = 0, l = items.length; i < l; i++) {
                observe(items[i])
            }
        }

    }
}