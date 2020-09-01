namespace vm {

    var _toString = Object.prototype.toString;
    var hasOwnProperty = Object.prototype.hasOwnProperty;

    export function isObject(obj: any) {
        return obj !== null && typeof obj === 'object'
    }

    export function hasOwn(obj: any, key: string) {
        return hasOwnProperty.call(obj, key)
    }

    export function isPlainObject(obj: any) {
        return _toString.call(obj) === '[object Object]';
    }

    export function def(obj: any, key: string, val: any, enumerable?: boolean) {
        Object.defineProperty(obj, key, {
            value: val,
            enumerable: !!enumerable,
            writable: true,
            configurable: true
        });
    }

}