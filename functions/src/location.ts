import * as admin from 'firebase-admin'
import { GoogleTypeLatLng } from 'actions-on-google';
import { StopLocation } from './models';
// import * as util from 'util'
const GeoFire = require('geofire')

const QUERY_LIMIT = 6
const RADIUS_LIMIT = 1

function getClosestStopsCallback(db: admin.database.Database, coordinates: GoogleTypeLatLng, limit: number, callback) {
    const sort = (array: Array<any>) => array.sort((a, b) => a.distanceInMeters - b.distanceInMeters)
    try {
        const locationRef = db.ref('stops_location')
        const geofire = new GeoFire(locationRef)
        const geoQuery = geofire.query({
            center: [coordinates.latitude, coordinates.longitude],
            radius: 0.1
        })
        let limitCounter = 0
        const results: Array<StopLocation> = []

        geoQuery.on('ready', _ => {
            if (limitCounter < limit && geoQuery.radius() <= RADIUS_LIMIT) {
                geoQuery.updateCriteria({
                    radius: geoQuery.radius() + 0.1
                })
            } else {
                geoQuery.cancel()
                callback(null, sort(results).slice(0, limit))
            }
        })
        geoQuery.on('key_entered', (key, location, distance) => {
            results.push({ stop: key, location, distanceInMeters: Math.floor(distance * 1000) })
            limitCounter++
            // if (limitCounter >= limit) {
            //     geoQuery.cancel()
            //     callback(null, sort(results))
            // }
        })
    } catch (error) {
        callback(error, null)
    }
}

// export const getClosestStops = util.promisify<admin.database.Database, GoogleTypeLatLng, Array<any>>(getClosestStopsCallback)
export const getClosestStops = (db, coords, limit = QUERY_LIMIT) => {
    return new Promise<Array<StopLocation>>((resolve, reject) => {
        getClosestStopsCallback(db, coords, limit, (err, data) => {
            if (data !== null) resolve(data)
            else reject(err)
        });
    })
}

const cityBox = {
    min: {
        latitude: -33.055451,
        longitude: -60.875507
    },
    max: {
        latitude: -32.823311,
        longitude: -60.583285
    }
}

export function isInCity(coordinates: GoogleTypeLatLng) {
    const { latitude, longitude } = coordinates
    return (latitude > cityBox.min.latitude && latitude < cityBox.max.latitude) &&
        (longitude > cityBox.min.longitude && longitude < cityBox.max.longitude)
}