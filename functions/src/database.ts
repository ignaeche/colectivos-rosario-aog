import * as removeAccents from 'remove-accents';
import { Street, Corner } from './models';

export function getBusDocument(db: FirebaseFirestore.Firestore, bus: string) {
    return db.collection('buses').doc(bus).get()
}

export function getBusStreetDocRef(db: FirebaseFirestore.Firestore, bus: string, street: Street) {
    return db.collection('buses').doc(bus).collection('streets').doc(street.id.toString())
}

export function getBusStopDocument(db: FirebaseFirestore.Firestore, bus: string, stop: string) {
    return db.collection('buses').doc(bus).collection('stops').doc(stop).get()
}

export async function getStopDocuments(db: FirebaseFirestore.Firestore, stops: Array<string>) {
    const promises = []
    const promise = stop => db.collection('stops').doc(stop).get()
    stops.forEach(stop => promises.push(promise(stop)))

    const docs = await Promise.all(promises)

    const results = []
    docs.forEach(snapshot => {
        const doc = snapshot.data()
        results.push(doc)
    })

    return results
}

function wildcardRegExp(string: string) {
    // Replace whitespaces with wildcards on regexp
    const test = string.replace(" ", ".*")
    return RegExp(`(${test}|${removeAccents.remove(test)})`, 'i')
}

function streetDescPredicate(streetDoc: Street, regExp: RegExp) {
    // Return true if desc matches the given street name w/ and w/o accents
    const desc: string = removeAccents.remove(streetDoc.desc)
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
    let regExp = wildcardRegExp(street)
    streets.filter(s => streetDescPredicate(s, regExp))
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

    regExp = wildcardRegExp(intersection)
    streetDocs.forEach(snapshot => {
        const streetData: Street = snapshot.data()
        streetData.intersections.filter(i => streetDescPredicate(i, regExp))
        .forEach(i => {
            i.stops.forEach(stop => {
                validCorners.push(new Corner(streetData, i, stop))
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