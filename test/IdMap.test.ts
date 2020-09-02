import "../dist/data-observer"

test("idMap", () => {
    var map = new vm.IdMap();
    expect(map.has(10)).toBe(false)
    map.add(10)
    expect(map.has(10)).toBe(true)
    map.add(10);
    expect(map.has(10)).toBe(true)
    map.clear();
    expect(map.has(10)).toBe(false)
})