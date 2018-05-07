import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { dialogflow, List } from 'actions-on-google';

import * as database from './database';
import { Corner } from './models';
import * as responses from './responses';
import { Intents, IntentsRedirect, AppContexts, Parameters, Events } from './dialogflow-constants';

admin.initializeApp(functions.config().firebase)
const db = admin.firestore()

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

    // If this intent is invoked then a corner-followup context is outputted
    // Remove stop-number-followup context in order for dialogflow to match followups to 'corner' intents
    conv.contexts.delete(AppContexts.STOP_FOLLOWUP_CONTEXT)

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
                items[`STOP_${corner.stop}`] = responses.prompts.stopListItem(corner.stop, corner.street.desc, corner.intersection.desc)
            });
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
            const context = conv.contexts.get(AppContexts.BUS_FOLLOWUP_CONTEXT)
            if (context !== undefined) {
                const followupParams = {
                    [Parameters.BUS_LINE_ARGUMENT]: context.parameters[Parameters.BUS_LINE_ARGUMENT],
                    [Parameters.STOP_NUMBER_ARGUMENT]: stop[1]
                }
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
    
    // If this intent is invoked then a stop-number-followup context is outputted
    // Remove corner-followup context in order for dialogflow to match followups to 'stop' intents
    conv.contexts.delete(AppContexts.CORNER_FOLLOWUP_CONTEXT)
    
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
Object.keys(IntentsRedirect).forEach(key => {
    const intents = IntentsRedirect[key]
    intents.forEach(i => app.intent(i, key))
})

export const cuandoLlegaFulfillment = functions.https.onRequest(app)