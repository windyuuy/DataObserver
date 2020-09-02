/// <reference path="./utils.ts" />
namespace vm {
    export interface IIdMap {
        add(value: number): this;
        clear(): void;
        has(value: number): boolean;
    }
    var _Set: new () => IIdMap;
    if (typeof Set !== 'undefined' && isNative(Set)) {
        _Set = Set as any;
    } else {
        class _IdMap {
            set: { [key: number]: boolean } = Object.create(null);
            has(key: number) {
                return this.set[key] === true
            }
            add(key: number) {
                this.set[key] = true;
            }
            clear() {
                this.set = Object.create(null);
            }
        }
        _Set = _IdMap as any;
    }

    export var IdMap = _Set;
}
