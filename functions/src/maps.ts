import * as functions from 'firebase-functions'
import * as url from 'url'
import * as crypto from 'crypto'

const STATIC_MAPS_URL = 'https://maps.googleapis.com/maps/api/staticmap'
const STATIC_MAPS_SIZE = {
    CARD_SIZE: '544x272',
    LIST_SIZE: '144x144'
}

type ImageSize = 'CARD_SIZE' | 'LIST_SIZE'

export function getStopLocationImage(coordinates: FirebaseFirestore.GeoPoint, language: string, size: ImageSize = 'CARD_SIZE') {
    const uri = url.parse(STATIC_MAPS_URL, true)
    const coords = [coordinates.latitude, coordinates.longitude].join(',')
    uri.query = {
        key: functions.config().maps.key,
        center: coords,
        size: STATIC_MAPS_SIZE[size],
        zoom: '18',
        scale: '2',
        format: 'png',
        language: language,
        markers: coords
    }
    if (size === 'CARD_SIZE') {
        uri.query.style = 'feature:poi|element:labels.text|visibility:off'
    }
    if (size === 'LIST_SIZE') {
        uri.query.style = 'feature:poi|element:labels|visibility:off'
    }
    return sign(url.format(uri), functions.config().maps.secret)
}

const MAPS_URL = 'https://www.google.com/maps/search/'

export function getStopMapsLink(coordinates: FirebaseFirestore.GeoPoint) {
    const uri = url.parse(MAPS_URL, true)
    const coords = [coordinates.latitude, coordinates.longitude].join(',')
    uri.query = {
        api: '1',
        query: coords
    }
    return url.format(uri)
}

/**
 * Taken from http://googlemaps.github.io/url-signing/
 * Sign a URL using a secret key.
 *
 * @param  {string} path   The url you want to sign.
 * @param  {string} secret Your unique secret key.
 * @return {string}
 */
function sign(path: string, secret: string): string {
    const uri = url.parse(path);
    const safeSecret = decodeBase64Hash(removeWebSafe(secret));
    const hashedSignature = makeWebSafe(encodeBase64Hash(safeSecret, uri.path));
    return url.format(uri) + '&signature=' + hashedSignature;
}

function removeWebSafe(safeEncodedString) {
    return safeEncodedString.replace(/-/g, '+').replace(/_/g, '/');
}
function makeWebSafe(encodedString) {
    return encodedString.replace(/\+/g, '-').replace(/\//g, '_');
}
function decodeBase64Hash(code) {
    return Buffer.from ? Buffer.from(code, 'base64') : new Buffer(code, 'base64');
}
function encodeBase64Hash(key, data) {
    return crypto.createHmac('sha1', key).update(data).digest('base64');
}