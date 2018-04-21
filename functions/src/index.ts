import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { dialogflow } from 'actions-on-google';

import * as database from './database';

admin.initializeApp(functions.config().firebase)
const db = admin.firestore()

const CUANDO_LLEGA_INTENT = "cuando_llega_intent"
const BUS_LINE_ARGUMENT = "bus-line"
const STREET_ARGUMENT = "street"
const INTERSECTION_ARGUMENT = "intersection"
const STOP_NUMBER_ARGUMENT = "stop-number"

const app = dialogflow()

app.intent(CUANDO_LLEGA_INTENT, async conv => {
    const bus = conv.parameters[BUS_LINE_ARGUMENT].toString()
    console.log("Bus line: " + bus)
    const stop = conv.parameters[STOP_NUMBER_ARGUMENT]
    if (stop.toString() !== "") {
        conv.ask(`La línea ${bus} llega a la parada ${stop} en 5 minutos.`)
    } else {
        const street = conv.parameters[STREET_ARGUMENT].toString()
        const intersection = conv.parameters[INTERSECTION_ARGUMENT].toString()
        const validCorner = await database.findValidCorners(db, bus, street, intersection)
        const stops = await database.findStops(db, validCorner)
        console.log(stops)
        conv.ask(`La línea ${bus} llega a la parada de ${street} y ${intersection} (parada ${stops[0].number}) en 3 minutos.`)
    }
})

export const cuandoLlegaFulfillment = functions.https.onRequest(app)