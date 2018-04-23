export class Street {
    constructor(public id: number, public desc: string) { }
}

export class StreetWithIntersections extends Street {
    constructor(public id: number, public desc: string, public intersections: Array<Street>) {
        super(id, desc)
     }
}

export class Corner {
    constructor(public street: Street, public intersection: Street) { }
}