import * as removeAccents from 'remove-accents';
import { Street, Corner, Bus, Stop } from './models';

export function getBusDocument(db: FirebaseFirestore.Firestore, bus: string) {
    return db.collection('buses').doc(bus).get()
}

export function getBusStreetDocument(db: FirebaseFirestore.Firestore, bus: string, street: Street) {
    return db.collection('buses').doc(bus).collection('streets').doc(street.id.toString()).get()
}

export function getBusStopDocument(db: FirebaseFirestore.Firestore, bus: string, stop: string) {
    return db.collection('buses').doc(bus).collection('stops').doc(stop).get()
}

export function getStopDocument(db: FirebaseFirestore.Firestore, stop: string) {
    return db.collection('stops').doc(stop).get()
}

export async function getStops(db: FirebaseFirestore.Firestore, stops: Array<string>) {
    const promises = []
    const promiseSnapshot = stop => db.collection('stops').doc(stop).get()
    stops.forEach(stop => promises.push(promiseSnapshot(stop)))

    const docs = await Promise.all(promises)

    const results: Array<Stop> = []
    docs.forEach(doc => {
        if (doc.exists) {
            const data = doc.data()
            results.push(data)
        }
    })

    return results
}

function wildcardRegExp(string: string) {
    // Replace whitespaces with wildcards on regexp
    const test = string.replace(" ", ".*")
    return RegExp(`(${test}|${removeAccents.remove(test)})`, 'i')
}

function predicateStreetName(street: Street, regExp: RegExp) {
    // Return true if desc matches the given street name w/ and w/o accents
    const desc: string = removeAccents.remove(street.desc)
    return regExp.test(desc)
}

export async function findValidCorners(db: FirebaseFirestore.Firestore, bus: string, street: string, intersection: string) {
    const document = await getBusDocument(db, bus)
    const busData = document.data() as Bus
    const streets: Array<Street> = busData.streets
    const validCorners: Array<Corner> = []

    // Find matching streets and construct promise
    const promises = []
    let regExp = wildcardRegExp(street)
    streets.filter(s => predicateStreetName(s, regExp))
    .forEach(s => { // forEach street s
        promises.push(getBusStreetDocument(db, bus, s))
    });

    const docs = await Promise.all(promises)

    regExp = wildcardRegExp(intersection)
    docs.forEach(doc => {
        if (doc.exists) {
            const streetData: Street = doc.data()
            // If intersection name matches, add corner to valid corners
            streetData.intersections.filter(i => predicateStreetName(i, regExp))
            .forEach(i => {
                i.stops.forEach(stop => {
                    validCorners.push(new Corner(busData, streetData, i, stop))
                })
            })
        }
    })

    return validCorners
}