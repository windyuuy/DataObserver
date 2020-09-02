import "../dist/data-observer"
test("isObject", () => {
    expect(vm.isObject(null)).toBe(false);
    expect(vm.isObject(123)).toBe(false);
    expect(vm.isObject(true)).toBe(false);
    expect(vm.isObject(Object.create(null))).toBe(true);
    expect(vm.isObject({})).toBe(true);
    expect(vm.isObject({ a: 1, b: 2 })).toBe(true);
})

test("hasOwn", () => {
    expect(vm.hasOwn({}, "xxx")).toBe(false);
    expect(vm.hasOwn({ xxx: "" }, "xxx")).toBe(true);
    expect(vm.hasOwn({ xxx: function () { } }, "xxx")).toBe(true);

    class TestHasOwn {
        a: number = 1;

        b() {

        }
    }
    class TestHasOwn2 extends TestHasOwn {
    }

    var t1 = new TestHasOwn()
    var t2 = new TestHasOwn2()

    expect(vm.hasOwn(t1, "a")).toBe(true);
    expect(vm.hasOwn(t1, "b")).toBe(false);//注意hasOwn无法判断函数
    expect("b" in t1).toBe(true);
    expect(t1["b"] != null).toBe(true);

    expect(vm.hasOwn(t2, "a")).toBe(true);
    expect(vm.hasOwn(t2, "b")).toBe(false);//注意hasOwn无法判断函数
    expect("b" in t2).toBe(true);
    expect(t2["b"] != null).toBe(true);

    expect(vm.hasOwn(TestHasOwn.prototype, "a")).toBe(false);//原型中不会有class的变量
    expect(vm.hasOwn(TestHasOwn.prototype, "b")).toBe(true);//函数在原型中作为属性出现

})

test("isPlainObject", () => {
    expect(vm.isPlainObject({})).toBe(true);
    expect(vm.isPlainObject(Object.create(null))).toBe(true);
    expect(vm.isPlainObject(new Object())).toBe(true);
    class TestPlainObject { a = 1 }
    expect(vm.isPlainObject(new TestPlainObject())).toBe(true);

    expect(vm.isPlainObject([])).toBe(false);
    expect(vm.isPlainObject(0)).toBe(false);
    expect(vm.isPlainObject(false)).toBe(false);

})

test("def", () => {
    var a: any = {}
    vm.def(a, "b", 13);
    expect(a["b"]).toBe(13);
    expect(Object.keys(a).length).toBe(0);

    function aa() { }
    vm.def(a, "aa", aa);
    expect(a["aa"]).toBe(aa);

    vm.def(a, "c", 14, true);

    expect(Object.keys(a).length).toBe(1);

})

test("remove", () => {
    var a = {}
    var b = {}
    var c = {}
    var d = {}
    var list = [a, b, c, d]

    vm.remove(list, c);
    expect(list.length).toBe(3);
    expect(list.indexOf(c)).toBe(-1);
})

test("parsePath", () => {
    var a = {
        b: { c: { e: 100 } }
    }

    var fun = vm.parsePath("b.c.e")
    expect(fun).not.toBe(null);

    expect(fun!(a)).toBe(100);

})

test("isNative", () => {
    expect(vm.isNative(Array.prototype.fill)).toBe(true);
    expect(vm.isNative(function () { })).toBe(false);
})