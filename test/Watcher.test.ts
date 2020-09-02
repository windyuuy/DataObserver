import "../dist/data-observer"

test("简单数值绑定", () => {
    class Host extends vm.Host {
        testString: string = "a"
        tstNumber: number = 1
    }

    var view = {
        testString: "",
        tstNumber: 0
    }

    var host = new Host()
    vm.observe(host)
    host.$watch("testString", (newVal, oldVal) => {
        view.testString = newVal;
    })
    host.$watch("tstNumber", (newVal, oldVal) => {
        view.tstNumber = newVal;
    })

    host.testString = "哈哈哈"
    vm.Tick.next();
    expect(view.testString).toEqual("哈哈哈")
})

test("深层数据绑定", () => {
    class Host extends vm.Host {
        a: any = {
            testString: "a",
            tstNumber: 1
        }
    }

})