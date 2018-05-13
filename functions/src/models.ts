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
    stops?: Stop[]
}

export interface BusArrival {
    flag: string,
    time: ArrivalTime,
    interno?: string
}

export interface ArrivalTime {
    arriving: boolean,
    minutes?: string,
    scheduled?: boolean
}

export interface ArrivalTranslation {
    flag: string,
    arrivesIn: string,
}

export interface Stop {
    number: string,
    street: Street,
    intersection: Street,
    buses?: Array<string>,
    otherBuses?: Array<string>,
    location?: FirebaseFirestore.GeoPoint
}

export interface StopLocation {
    stop: string,
    location: Array<number>,
    distanceInMeters: number
}

export class Corner {
    constructor(public bus: Bus, public stop: Stop) { }
}