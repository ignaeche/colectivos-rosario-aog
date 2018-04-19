import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { isNull } from 'util';
const { DialogflowApp } = require('actions-on-google');

admin.initializeApp(functions.config().firebase)
const db = admin.firestore()

process.env.DEBUG = 'actions-on-google:*'

const CUANDOLLEGA_ACTION = "cuandollega"
const BUS_LINE_ARGUMENT = "bus-line"
const STREET_ARGUMENT = "street"
const INTERSECTION_ARGUMENT = "intersection"
const STOP_NUMBER_ARGUMENT = "stop-number"

export const cuandoLlegaFulfillment = functions.https.onRequest((request, response) => {
    const agent = new DialogflowApp({request, response})
    console.log("cuandoLlegaFulfillment started")

    function cuandollegaAction(app) {
        console.log("Function cuandollegaAction called")
        const bus = app.getArgument(BUS_LINE_ARGUMENT)
        const stop = app.getArgument(STOP_NUMBER_ARGUMENT)
        if (!isNull(stop)) {
            app.ask(`La línea ${bus} llega a la parada ${stop} en 5 minutos.`)
        } else {
            const street = app.getArgument(STREET_ARGUMENT)
            const intersection = app.getArgument(INTERSECTION_ARGUMENT)
            db.collection('streets').where('desc', '==', street).get()
                .then(snapshot => {
                    if (snapshot.size === 0) {
                        console.log(`Street not found in collection: ${street}`)
                    } else {
                        snapshot.forEach(doc => {
                            console.log("Street found in streets collection: ", doc.data())
                        })
                    }
                })
                .catch(error => console.error(error))
            // search for stop number...
            app.ask(`La línea ${bus} llega a la parada de ${street} y ${intersection} en 3 minutos.`)
        }
    }

    const actionMap = new Map()
    actionMap.set(CUANDOLLEGA_ACTION, cuandollegaAction)
    agent.handleRequest(actionMap)
});