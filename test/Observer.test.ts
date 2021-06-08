import "../dist/data-observer"

test("observe", () => {

    var obj: any = {}
    var obj2 = vm.observe(obj)

    expect(obj2 instanceof vm.Observer).toBe(true);
    expect(obj['__ob__']).toBe(obj2);

    var obj3 = vm.observe(obj)
    expect(obj2).toBe(obj3);

    expect(vm.observe(123)).toBe(undefined);

});

test("defineReactive", () => {
    var o: any = { a: 1, b: 2, c: 3 }
    vm.defineReactive(o, "a", 1);
    expect(o.a).toBe(1);
    o.a = 123
    expect(o.a).toBe(123);

    //细节逻辑结合watch测试
});

test("Observer", () => {
    var obj: any = {}
    var ob = vm.observe(obj)
    expect(ob?.value).toBe(obj);

    //细节逻辑结合watch测试
});


test("defineCompute", () => {
    var obj: any = { a: 1, b: 2 }
    var ob = vm.observe(obj)

    vm.defineCompute(obj, 'a', () => {
        return 10;
    })
    expect(obj.a).toBe(10);

    //细节逻辑结合watch测试
});