import * as removeAccents from 'remove-accents';

class Street {
    constructor(public id: number, public desc: string) { }
}

class StreetWithIntersections extends Street {
    constructor(public id: number, public desc: string, public intersections: Array<Street>) {
        super(id, desc)
     }
}

class Corner {
    constructor(public street: Street, public intersection: Street) { }
}

function getBusDocument(db: FirebaseFirestore.Firestore, bus: string) {
    return db.collection('buses').doc(bus).get()
}

function streetDescPredicate(streetObject: Street, street: string) {
    const desc: string = streetObject.desc
    const regExp = RegExp(`(${street}|${removeAccents.remove(street)})`)
    // Return true if desc matches the given street name w/ and w/o accents
    return regExp.test(desc)
}

export async function findValidCorners(db: FirebaseFirestore.Firestore, bus: string, street: string, intersection: string) {
    // sorround w/ try/catch
    const document = await getBusDocument(db, bus)
    const data = document.data()
    const streets : Array<StreetWithIntersections> = data.streets
    const validCorners: Array<Corner> = []

    streets.filter(s => streetDescPredicate(s, street))
    .forEach(s => { // forEach street s
        const ints: Array<Street> = s.intersections
        ints.filter(i => streetDescPredicate(i, intersection))
        .forEach(i => { // forEach intersection i
            validCorners.push(new Corner(new Street(s.id, s.desc), i))
        })
    });

    return validCorners
}

function getStopByStreets(db: FirebaseFirestore.Firestore, street_id: number, intersection_id: number) {
    return db.collection('stops').where('street', '==', street_id).where('intersection', '==', intersection_id).get()
}

export async function findStops(db: FirebaseFirestore.Firestore, validCorners: Array<Corner>) {
    const promises: Array<Promise<any>> = []
    validCorners.forEach(vc => {
        promises.push(
            getStopByStreets(db, vc.street.id, vc.intersection.id)
        )
    })
    const stops = []
    const promise = await Promise.all(promises)
    promise.forEach(snapshots => {
        snapshots.forEach(snapshot => {
            const stop = snapshot.data()
            stops.push(stop)
        })
    })
    return stops
}