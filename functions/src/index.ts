import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { dialogflow, List } from 'actions-on-google';

import * as database from './database';
import { Corner } from './models';
import * as responses from './responses';

admin.initializeApp(functions.config().firebase)
const db = admin.firestore()

const Intents = {
    CUANDO_LLEGA_CORNER_INTENT: 'cuando_llega_corner_intent',
    CUANDO_LLEGA_STOP_INTENT: 'cuando_llega_stop_intent',
    // with bus-followup context
    BUS_CORNER_INTENT: 'bus_corner_intent',
    BUS_STOP_INTENT: 'bus_stop_intent',
    // with corner-followup context
    CORNER_OTHER_BUS_INTENT: 'corner_other_bus_intent',
    // with stop-number-followup context
    STOP_OTHER_BUS_INTENT: 'stop_other_bus_intent',
    // triggered by event stop_search_event
    STOP_SEARCH_INTENT: 'stop_search_intent',
    // triggered by event actions_intent_OPTION
    STOP_LIST_SELECTION_INTENT: 'stop_list_selection_intent'
};

const Events = {
    STOP_SEARCH_EVENT: 'stop_search_event'
}

const Contexts = {
    BUS_FOLLOWUP_CONTEXT: 'bus-followup',
    STOP_FOLLOWUP_CONTEXT: 'stop-number-followup',
    CORNER_FOLLOWUP_CONTEXT: 'corner-followup',
    // webhook-only context
    STOP_LIST_CONTEXT: 'stop-list-followup'
}

const Parameters = {
    BUS_LINE_ARGUMENT: 'bus-line',
    STREET_ARGUMENT: 'street',
    INTERSECTION_ARGUMENT: 'intersection',
    STOP_NUMBER_ARGUMENT: 'stop-number'
}

const app = dialogflow()

function logIntent(conv) {
    console.log(`${conv.intent} intent with params ${JSON.stringify(conv.parameters)}`)
}

app.middleware(conv => {
    responses.i18next.changeLanguage(conv.user.locale)
})

app.intent(Intents.CUANDO_LLEGA_CORNER_INTENT, async (conv, params) => {
    logIntent(conv)
    const bus = params[Parameters.BUS_LINE_ARGUMENT] as string
    const street = params[Parameters.STREET_ARGUMENT] as string
    const intersection = params[Parameters.INTERSECTION_ARGUMENT] as string

    try {
        const validCorners : Array<Corner> = await database.findValidCorners(db, bus, street, intersection)

        const numberOfStops = validCorners.length
        if (numberOfStops === 0) {
            conv.ask(responses.prompts.noStopsFound(bus, street, intersection))
        } else if (numberOfStops === 1) {
            const corner = validCorners[0]
            // request here
            conv.ask(`La línea ${bus} llega a la parada de ${corner.street.desc} y ${corner.intersection.desc}` +
                ` (parada ${corner.stop}) en 10 minutos.`)
        } else {
            const items = {}
            validCorners.forEach(corner => {
                items[`STOP_${stop}`] = responses.prompts.stopListItem(corner.stop, corner.street.desc, corner.intersection.desc)
            });
            conv.contexts.set(Contexts.STOP_LIST_CONTEXT, 1, { [Parameters.BUS_LINE_ARGUMENT]: bus })
            conv.ask(responses.i18next.t('pickStop'))
            conv.ask(new List({
                title: responses.i18next.t('stops'),
                items
            }));
        }
    } catch (error) {
        console.error(error)
        conv.ask(responses.i18next.t('errorOccurred'))
    }
})

// Handler redirect
app.intent(Intents.BUS_CORNER_INTENT, Intents.CUANDO_LLEGA_CORNER_INTENT)
app.intent(Intents.CORNER_OTHER_BUS_INTENT, Intents.CUANDO_LLEGA_CORNER_INTENT)

app.intent(Intents.STOP_LIST_SELECTION_INTENT, (conv, params, option) => {
    logIntent(conv)
    if (!option) {
        conv.ask(responses.i18next.t('noOption'))
        return
    }
    const stop = option.toString().split('_')
    switch (stop[0]) {
        case "STOP":
            // do conv.followup with event
            if (conv.contexts.get(Contexts.STOP_LIST_CONTEXT) !== undefined) {
                const followupParams = conv.contexts.get(Contexts.STOP_LIST_CONTEXT).parameters
                followupParams[Parameters.STOP_NUMBER_ARGUMENT] = stop[1]
                conv.followup(Events.STOP_SEARCH_EVENT, followupParams)
            } else {
                conv.ask(responses.i18next.t('errorOccurred'))
            }
            break;
        default:
            conv.ask(responses.i18next.t('invalidOption'))
            break;
    }
})

app.intent(Intents.CUANDO_LLEGA_STOP_INTENT, async (conv, params) => {
    logIntent(conv)
    // console.log(JSON.stringify(conv.contexts))
    const bus = params[Parameters.BUS_LINE_ARGUMENT] as string
    const stop = params[Parameters.STOP_NUMBER_ARGUMENT] as string
    
    // const busDoc = await database.getBusDocument(db, bus)
    // const data = busDoc.data()

    try {
        const doc = await database.getBusStopDocument(db, bus, stop)
        if (doc.exists) {
            // request
            conv.ask(`La línea ${bus} llega a la parada ${stop} en 5 minutos`)
        } else {
            conv.ask(responses.prompts.invalidStop(bus, stop))
        }
    } catch (error) {
        console.error(error)
        conv.ask(responses.i18next.t('errorOccurred'))
    }
})

// Handler redirect
app.intent(Intents.BUS_STOP_INTENT, Intents.CUANDO_LLEGA_STOP_INTENT)
app.intent(Intents.STOP_OTHER_BUS_INTENT, Intents.CUANDO_LLEGA_STOP_INTENT)
app.intent(Intents.STOP_SEARCH_INTENT, Intents.CUANDO_LLEGA_STOP_INTENT)

export const cuandoLlegaFulfillment = functions.https.onRequest(app)