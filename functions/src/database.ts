import * as removeAccents from 'remove-accents';
import { Street, StreetWithStops, StreetWithIntersections, Corner } from './models';

export function getBusDocument(db: FirebaseFirestore.Firestore, bus: string) {
    return db.collection('buses').doc(bus).get()
}

export function getBusStreetDocRef(db: FirebaseFirestore.Firestore, bus: string, street: Street) {
    return db.collection('buses').doc(bus).collection('streets').doc(street.id.toString())
}

export function getBusStopDocument(db: FirebaseFirestore.Firestore, bus: string, stop: string) {
    return db.collection('buses').doc(bus).collection('stops').doc(stop).get()
}

function streetDescPredicate(streetObject: Street, street: string) {
    const desc: string = streetObject.desc.toUpperCase()
    const regExp = RegExp(`(${street}|${removeAccents.remove(street)})`)
    // Return true if desc matches the given street name w/ and w/o accents
    return regExp.test(desc)
}

export async function findValidCorners(db: FirebaseFirestore.Firestore, bus: string, street: string, intersection: string) {
    // sorround w/ try/catch
    const document = await getBusDocument(db, bus)
    const data = document.data()
    const streets : Array<Street> = data.streets
    const validCorners: Array<Corner> = []

    // Find matching streets and construct promise
    const promises = []
    streets.filter(s => streetDescPredicate(s, street))
    .forEach(s => { // forEach street s
        promises.push(getBusStreetDocRef(db, bus, s).get())
        // const ints: Array<StreetWithStops> = s.intersections
        // ints.filter(i => streetDescPredicate(i, intersection))
        // .forEach(i => { // forEach intersection i
        //     i.stops.forEach(stop => { // forEach stop: make a corner with each stop
        //         validCorners.push(new Corner(new Street(s.id, s.desc), new Street(i.id, i.desc), stop))
        //     })
        // })
    });

    const streetDocs = await Promise.all(promises)

    streetDocs.forEach(snapshot => {
        const streetData : StreetWithIntersections = snapshot.data()
        streetData.intersections.filter(i => streetDescPredicate(i, intersection))
        .forEach(i => {
            i.stops.forEach(stop => {
                validCorners.push(new Corner(new Street(streetData.id, streetData.desc), new Street(i.id, i.desc), stop))
            })
        })
    })

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