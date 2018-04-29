import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { dialogflow, List } from 'actions-on-google';

import * as database from './database';
import { Corner } from './models';

admin.initializeApp(functions.config().firebase)
const db = admin.firestore()

const Intents = {
    CUANDO_LLEGA_CORNER_INTENT: "cuando_llega_corner_intent",
    CUANDO_LLEGA_STOP_INTENT: "cuando_llega_stop_intent",
    BUS_CORNER_INTENT: "bus_corner_intent",
    BUS_STOP_INTENT: "bus_stop_intent",
    STOP_LIST_SELECTION_INTENT: "stop_list_selection_intent"
};

// const Events = {
// 
// }

const Contexts = {
    BUS_FOLLOWUP_CONTEXT: "bus-followup"
}

const Args = {
    BUS_LINE_ARGUMENT: "bus-line",
    STREET_ARGUMENT: "street",
    INTERSECTION_ARGUMENT: "intersection",
    STOP_NUMBER_ARGUMENT: "stop-number"
}

const app = dialogflow()

function logIntent(conv) {
    console.log(`${conv.intent} intent with params ${JSON.stringify(conv.parameters)}`)
}

app.intent(Intents.CUANDO_LLEGA_CORNER_INTENT, async conv => {
    logIntent(conv)
    const bus = conv.parameters[Args.BUS_LINE_ARGUMENT].toString()
    const street = conv.parameters[Args.STREET_ARGUMENT].toString()
    const intersection = conv.parameters[Args.INTERSECTION_ARGUMENT].toString()
    const validCorners : Array<Corner> = await database.findValidCorners(db, bus, street, intersection)
    // const stops = await database.findStops(db, validCorner)
    // console.log("Stops: " + stops)
    // Ask which stop when there are multiple stops o just spit out arrival times for each stop. Do list.
    // stops.forEach(it => {
    //     conv.ask(`La línea ${bus} llega a la parada de ${street} y ${intersection} (parada ${it.number}) en X minutos.`)
    // })

    const numberOfStops = validCorners.length
    if (numberOfStops === 0) {
        conv.ask(`No se encontraron paradas en la esquina de ${street} y ${intersection} para la línea ${bus}`)
    } else if (validCorners.length === 1) {
        const corner = validCorners[0]
        // request here
        conv.ask(`La línea ${bus} llega a la parada de ${corner.street.desc} y ${corner.intersection.desc}` +
            ` (parada ${corner.stop}) en 10 minutos.`)
    } else {
        const items = {}
        validCorners.forEach(corner => {
            const cornerStreet = corner.street.desc
            const cornerIntersection = corner.intersection.desc
            const stop = corner.stop
            items['STOP_' + stop] = {
                title: `Parada ${stop}`,
                description: `${cornerStreet} y ${cornerIntersection}`
            }
        });
        //conv.contexts.set(Contexts.BUS_FOLLOWUP_CONTEXT, 1, { 'bus-line': bus })
        conv.ask('Escoja una parada')
        conv.ask(new List({
            title: 'Paradas',
            items: items
        }));
    }
})

// Handler redirect
app.intent(Intents.BUS_CORNER_INTENT, Intents.CUANDO_LLEGA_CORNER_INTENT)

app.intent(Intents.STOP_LIST_SELECTION_INTENT, (conv, params, option) => {
    logIntent(conv)
    if (!option) {
        conv.ask('No seleccionaste ninguna opción')
        return
    }
    const stop = option.toString().split('_')
    switch (stop[0]) {
        case "STOP":
            // do conv.followup with event
            conv.ask('Seleccionaste la parada ' + stop[1])
            break;
        default:
            conv.ask('Seleccionaste una opción no válida')
            break;
    }
})

app.intent(Intents.CUANDO_LLEGA_STOP_INTENT, async conv => {
    logIntent(conv)
    // console.log(JSON.stringify(conv.contexts))
    const bus = conv.parameters[Args.BUS_LINE_ARGUMENT].toString()
    const stop = conv.parameters[Args.STOP_NUMBER_ARGUMENT].toString()
    
    // const busDoc = await database.getBusDocument(db, bus)
    // const data = busDoc.data()

    return database.getBusStopDocument(db, bus, stop)
    .then(doc => {
        if (doc.exists) {
            conv.ask(`La línea ${bus} llega a la parada ${stop} en 5 minutos`)
        } else {
            conv.ask(`La parada ${stop} no es válida para la línea ${bus}`)
        }
    })
    .catch(error => {
        console.log(error)
        conv.ask(`No se pudo obtener consultar el horario`)
    })

    // if (stop in data.stops) {
        // do request for arrival time
        // conv.ask(`La línea ${bus} llega a la parada ${stop} en 5 minutos`)
        // conv.contexts.delete(Contexts.BUS_FOLLOWUP_CONTEXT)
    // } else {
    //     conv.ask(`La parada ${stop} no es válida para la línea ${bus}`)

        // const context = conv.contexts.get(Contexts.BUS_FOLLOWUP_CONTEXT)
        // if (context !== undefined && context.lifespan > 0) {
        //     conv.ask('Intente nuevamente')
        // }
    // }
})

// Handler redirect
app.intent(Intents.BUS_STOP_INTENT, Intents.CUANDO_LLEGA_STOP_INTENT)

export const cuandoLlegaFulfillment = functions.https.onRequest(app)