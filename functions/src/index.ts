import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { dialogflow } from 'actions-on-google';

import * as database from './database';

admin.initializeApp(functions.config().firebase)
const db = admin.firestore()

const CUANDO_LLEGA_CORNER_INTENT = "cuando_llega_corner_intent"
const CUANDO_LLEGA_STOP_INTENT = "cuando_llega_stop_intent"
const CUANDO_LLEGA_STOP_EVENT = "cuando-llega-stop-event"
const BUS_STOP_INTENT = "stop"
const BUS_FOLLOWUP_CONTEXT = "bus-followup"
const BUS_LINE_ARGUMENT = "bus-line"
const STREET_ARGUMENT = "street"
const INTERSECTION_ARGUMENT = "intersection"
const STOP_NUMBER_ARGUMENT = "stop-number"

const app = dialogflow()

function logIntent(conv) {
    console.log(`${conv.intent} intent with params ${JSON.stringify(conv.parameters)}`)
}

app.intent(CUANDO_LLEGA_CORNER_INTENT, async conv => {
    logIntent(conv)
    const bus = conv.parameters[BUS_LINE_ARGUMENT].toString()
    const street = conv.parameters[STREET_ARGUMENT].toString()
    const intersection = conv.parameters[INTERSECTION_ARGUMENT].toString()
    const validCorner = await database.findValidCorners(db, bus, street, intersection)
    const stops = await database.findStops(db, validCorner)
    console.log("Stops: " + stops)
    // Ask which stop when there are multiple stops o just spit out arrival times for each stop. Do list.
    stops.forEach(it => {
        conv.ask(`La línea ${bus} llega a la parada de ${street} y ${intersection} (parada ${it.number}) en X minutos.`)
    })
})

app.intent(CUANDO_LLEGA_STOP_INTENT, async conv => {
    logIntent(conv)
    console.log(JSON.stringify(conv.contexts))
    const bus = conv.parameters[BUS_LINE_ARGUMENT].toString()
    const stop = conv.parameters[STOP_NUMBER_ARGUMENT].toString()
    
    const doc = await database.getBusDocument(db, bus)
    const data = doc.data()
    if (stop in data.stops) {
        // do request for arrival time
        conv.ask(`La línea ${bus} llega a la parada ${stop} en 5 minutos`)
    } else {
        conv.ask(`La parada ${stop} no es válida para la línea ${bus}`)
    }
})

app.intent(BUS_STOP_INTENT, async conv => {
    logIntent(conv)
    console.log(`Context: ${JSON.stringify(conv.contexts.get(BUS_FOLLOWUP_CONTEXT).parameters)}`)
    const bus = conv.contexts.get(BUS_FOLLOWUP_CONTEXT).parameters[BUS_LINE_ARGUMENT].toString()
    const stop = conv.parameters[STOP_NUMBER_ARGUMENT].toString()
    
    const doc = await database.getBusDocument(db, bus)
    const data = doc.data()
    if (stop in data.stops) {
        // do request for arrival time
        conv.ask(`La línea ${bus} llega a la parada ${stop} en 5 minutos`)
        conv.contexts.delete(BUS_FOLLOWUP_CONTEXT)
    } else {
        conv.ask(`La parada ${stop} no es válida para la línea ${bus}`)
        // lifespan allows for 1 retry (adjustable in dialogflow)
        if (conv.contexts.get(BUS_FOLLOWUP_CONTEXT).lifespan > 0) {
            conv.ask('Intente nuevamente')
        }
    }
})

export const cuandoLlegaFulfillment = functions.https.onRequest(app)