export interface Bus {
    name: string,
    id: number,
    entity: number,
    streets?: Street[]
}

export interface Street {
    id: number,
    desc: string,
    intersections?: Street[]
    stops?: string[]
}

export class Corner {
    constructor(public street: Street, public intersection: Street, public stop: string) { }
}