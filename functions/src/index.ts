import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { isNull } from 'util';
import { dialogflow } from 'actions-on-google';

admin.initializeApp(functions.config().firebase)
const db = admin.firestore()

const CUANDO_LLEGA_INTENT = "cuando_llega_intent"
const BUS_LINE_ARGUMENT = "bus-line"
const STREET_ARGUMENT = "street"
const INTERSECTION_ARGUMENT = "intersection"
const STOP_NUMBER_ARGUMENT = "stop-number"

const app = dialogflow({debug: true})

app.intent(CUANDO_LLEGA_INTENT, conv => {
    const bus = conv.parameters[BUS_LINE_ARGUMENT]
    const stop = conv.parameters[STOP_NUMBER_ARGUMENT]
    if (!isNull(stop)) {
        conv.ask(`La línea ${bus} llega a la parada ${stop} en 5 minutos.`)
    } else {
        const street = conv.parameters[STREET_ARGUMENT]
        const intersection = conv.parameters[INTERSECTION_ARGUMENT]
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
        conv.ask(`La línea ${bus} llega a la parada de ${street} y ${intersection} en 3 minutos.`)
    }
})

export const cuandoLlegaFulfillment = functions.https.onRequest(app)