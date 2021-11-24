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
    host.$watch("testString", (newVal, oldVal) => {
        view.testString = newVal;
    })
    host.$watch("tstNumber", (newVal, oldVal) => {
        view.tstNumber = newVal;
    })

    host.testString = "哈哈哈"
    vm.Tick.next();
    expect(view.testString).toEqual("哈哈哈")

    host.tstNumber = 22
    vm.Tick.next();
    expect(view.tstNumber).toEqual(22)

})

test("深层数据绑定", () => {
    class Host extends vm.Host {
        a = {
            testString: "a",
            tstNumber: 1,
            subObj: {
                testString: "a",
                tstNumber: 1,
            }
        }
    }

    var view = {
        testString: "",
        tstNumber: 0,
        subTestString: "",
        subTstNumber: 0,
        computValue: 0
    }

    var host = new Host()
    host.$watch("a.testString", (newVal, oldVal) => {
        view.testString = newVal;
    })
    host.$watch("a.tstNumber", (newVal, oldVal) => {
        view.tstNumber = newVal;
    })
    host.$watch("a.subObj.testString", (newVal, oldVal) => {
        view.subTestString = newVal;
    })
    host.$watch("a.subObj.tstNumber", (newVal, oldVal) => {
        view.subTstNumber = newVal;
    })

    var w = host.$watch((host: Host) => {
        return host.a.tstNumber + host.a.subObj.tstNumber
    }, (newVal, oldVal) => {
        view.computValue = newVal;
    })
    view.computValue = w?.value;
    expect(view.computValue).toEqual(2)


    host.a.testString = "哈哈哈"
    vm.Tick.next();
    expect(view.testString).toEqual("哈哈哈")

    host.a.tstNumber = 13
    vm.Tick.next();
    expect(view.tstNumber).toEqual(13)
    expect(view.computValue).toEqual(14)

    host.a.subObj.testString = "哈哈哈2"
    vm.Tick.next();
    expect(view.subTestString).toEqual("哈哈哈2")

    host.a.subObj.tstNumber = 333
    vm.Tick.next();
    expect(view.subTstNumber).toEqual(333)

    host.a.subObj = {
        testString: "测试对象",
        tstNumber: 666,
    }
    vm.Tick.next();
    expect(view.subTestString).toEqual("测试对象")
    expect(view.subTstNumber).toEqual(666)


    host.a = {
        testString: "测试1",
        tstNumber: 3,
        subObj: {
            testString: "测试2",
            tstNumber: 4,
        }
    }
    vm.Tick.next();
    expect(view.testString).toEqual("测试1")
    expect(view.tstNumber).toEqual(3)
    expect(view.subTestString).toEqual("测试2")
    expect(view.subTstNumber).toEqual(4)



    var Boos = {
        boss: {
            active: false,
            hpMax: 10,
            hp: 0,
        }
    }
    var newHost = vm.implementHost(Boos);

    var progress = 0;

    var w = newHost.$watch("boss.hp/boss.hpMax", (newVal, oldVal) => {
        progress = newVal;
    })
    progress = w?.value;

    vm.Tick.next();
    Boos.boss = {
        active: false,
        hpMax: 10,
        hp: 0,
    }
    vm.Tick.next();
    expect(progress).toBe(0);

    Boos.boss.hpMax = 10
    Boos.boss.hp = 5;
    vm.Tick.next();
    expect(progress).toBe(0.5);


})


test("深层数组", () => {
    class Host extends vm.Host {
        list: string[] = []
    }

    var view = {
        length: 0,
        list0: null,
        list1: null,
        list2: null
    }

    var host = new Host()
    host.$watch("list", (newVal, oldVal) => {
        view.length = newVal.length;
        view.list0 = newVal[0];
        view.list1 = newVal[1];
        view.list2 = newVal[2];
    })

    host.list.push("对象1")
    vm.Tick.next();
    expect(view.length).toEqual(1)
    expect(view.list0).toEqual("对象1")

    host.list.push("对象2")
    vm.Tick.next();
    expect(view.length).toEqual(2)
    expect(view.list1).toEqual("对象2")

    host.list.push("对象3")
    vm.Tick.next();
    expect(view.length).toEqual(3)
    expect(view.list2).toEqual("对象3")

    host.list.push("对象4")
    vm.Tick.next();
    expect(view.length).toEqual(4)


    vm.set(host.list, 1, "修改对象2");
    vm.Tick.next();
    expect(view.list1).toEqual("修改对象2")

    vm.del(host.list, 2);
    vm.Tick.next();
    expect(view.list1).toEqual("修改对象2")


})

test("this解释", () => {
    class Host extends vm.Host {
        testString: string = "a"
        tstNumber: number = 1
        testObj = {
            num1: 2,
        }
        testArr = [
            1,
            2,
        ]
    }

    var view = {
        testString: "",
        tstNumber: 0,
        testObj_num1: 0,
        testArr_1: 0,
    }

    var host = new Host()
    host.$watch("this.testString", (newVal, oldVal) => {
        view.testString = newVal;
    })
    host.$watch("this.tstNumber", (newVal, oldVal) => {
        view.tstNumber = newVal;
    })
    host.$watch("this.testObj.num1", (newVal, oldVal) => {
        view.testObj_num1 = newVal;
    })
    host.$watch("this.testArr[1]", (newVal, oldVal) => {
        view.testArr_1 = newVal;
    })

    host.testString = "哈哈哈"
    host.tstNumber = 22
    host.testObj.num1 = 33
    // host.testArr[1] = 44
    vm.set(host.testArr, 1, 44)

    vm.Tick.next();

    expect(view.testString).toEqual("哈哈哈")
    expect(view.tstNumber).toEqual(22)
    expect(view.testObj_num1).toEqual(33)
    expect(view.testArr_1).toEqual(44)

})

// test("this解释Array", () => {

//     var view = [
//         0,
//         "",
//     ]

//     var host0 = [
//         1,
//         "1",
//     ]
//     var host = vm.implementHost(host0)
//     host.$watch("this[0]", (newVal, oldVal) => {
//         view[0] = newVal;
//     })
//     host.$watch("this[1]", (newVal, oldVal) => {
//         view[1] = newVal;
//     })

//     vm.set(host, 0, 234)
//     vm.set(host, 1, "235")

//     vm.Tick.next();

//     expect(view[0]).toEqual(234)
//     expect(view[1]).toEqual("235")

// })

test("watch注解", () => {

    var view = {
        testString: "",
        testNum: 0,
        testNum2: 0,
        newValue: ""
    }

    @vm.host
    class TestHost extends vm.Host {
        a = {
            testString: "a",
            tstNumber: 1,
            subObj: {
                tstNumber: 1,
            }
        }

        @vm.watch("a.testString")
        onTestStringChange(newVal: string, oldVal: string) {
            view.testString = newVal;
        }

        @vm.watch((host: TestHost) => host.a.tstNumber + host.a.subObj.tstNumber)
        onTestNumberChange(newVal: number, oldVal: number) {
            view.testNum = newVal
        }

        @vm.watch("a.tstNumber + a.subObj.tstNumber")
        onTestNumber2Change(newVal: number, oldVal: number) {
            view.testNum2 = newVal
        }


        get newTestString() {
            return this.a.testString + "666"
        }

        @vm.watch("newTestString")
        onNewStringChange(newVal: string, oldVal: string) {
            view.newValue = newVal;
        }

    }

    var h = new TestHost();

    h.a.tstNumber = 12
    h.a.testString = "哈哈哈"

    vm.Tick.next();

    expect(view.testString).toBe("哈哈哈")
    expect(view.testNum).toBe(13)
    expect(view.testNum2).toBe(13)
    expect(view.newValue).toBe("哈哈哈666")

})

test("tick", () => {
    var Boos = {
        boss: {
            active: false,
            hpMax: 10,
            hp: 5,
        }
    }
    var newHost = vm.implementHost(Boos);

    var progress = 0;

    var w = newHost.$watch("boss.hp/boss.hpMax", (newVal, oldVal) => {
        progress = newVal;
    }, -1)
    progress = w?.value;

    vm.Tick.next();
    expect(progress).toBe(0.5);

    Boos.boss = null as any;
    vm.Tick.next();
    expect(progress).toBe(-1);

    Boos.boss = {
        active: false,
        hpMax: 10,
        hp: 1,
    }
    vm.Tick.next();
    expect(progress).toBe(0.1);

})