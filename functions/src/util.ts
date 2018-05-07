const random = a => a[Math.floor(Math.random() * a.length)]

export const randomPop = (array: Array<any>) => {
    if (!array.length) return null;
    const element = random(array)
    array.splice(array.indexOf(element), 1)
    return element
}

export const takeRandom = (array: Array<any>, n: number): Array<any> => {
    const arr = array.slice()
    const result = []
    const range = [...Array(n).keys()]
    range.forEach(_ => {
        const element = randomPop(arr)
        if (element !== null) result.push(element)
    })
    return result
}