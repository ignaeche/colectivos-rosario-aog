export class Street {
    constructor(public id: number, public desc: string) { }
}

export class StreetWithIntersections extends Street {
    constructor(public id: number, public desc: string, public intersections: Array<StreetWithStops>) {
        super(id, desc)
     }
}

export class StreetWithStops extends Street {
    constructor(public id: number, public desc: string, public stops: Array<string>) {
        super(id, desc)
    }
}

export class Corner {
    constructor(public street: Street, public intersection: Street, public stop: string) { }
}