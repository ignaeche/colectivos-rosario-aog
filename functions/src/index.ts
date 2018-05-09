import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { dialogflow, List, Permission, DialogflowConversation, Contexts } from 'actions-on-google';

import * as database from './database';
import { Corner, Bus, Stop, StopLocation } from './models';
import * as responses from './responses';
import { Intents, IntentGroups, AppContexts, Parameters, Events } from './dialogflow-constants';
import { getClosestStops } from './location';

admin.initializeApp(functions.config().firebase)
const db = admin.firestore()
const rtdb = admin.database()

const app = dialogflow()

app.middleware(conv => {
    responses.i18next.changeLanguage(conv.user.locale)
    console.log(`Intent ${conv.intent} matched with params ${JSON.stringify(conv.parameters)}`)
})

app.intent(IntentGroups.CORNER_INTENTS, async (conv, params) => {
    const bus = params[Parameters.BUS_LINE] as string
    const street = params[Parameters.STREET] as string
    const intersection = params[Parameters.INTERSECTION] as string

    // If this intent is invoked then a corner-followup context is outputted
    // Remove stop-number-followup context in order for dialogflow to match followups to 'corner' intents
    conv.contexts.delete(AppContexts.STOP_FOLLOWUP)

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
    if (!option) {
        conv.ask(responses.i18next.t('noOption'))
        return
    }
    const stop = option.toString().split('_')
    switch (stop[0]) {
        case "STOP":
            // do conv.followup with event
            const context = conv.contexts.get(AppContexts.BUS_FOLLOWUP)
            if (context !== undefined) {
                const followupParams = {
                    [Parameters.BUS_LINE]: context.parameters[Parameters.BUS_LINE],
                    [Parameters.STOP_NUMBER]: stop[1]
                }
                conv.followup(Events.STOP_SEARCH_EVENT, followupParams)
            } else {
                conv.followup(Events.STOP_INFORMATION_EVENT, { [Parameters.STOP_NUMBER]: stop[1] })
                // conv.ask(responses.i18next.t('errorOccurred'))
            }
            break;
        case "STOPINFO":
            conv.followup(Events.STOP_INFORMATION_EVENT, { [Parameters.STOP_NUMBER]: stop[1] })
            break;
        default:
            conv.ask(responses.i18next.t('invalidOption'))
            break;
    }
})

app.intent(IntentGroups.STOP_INTENTS, async (conv, params) => {
    const bus = params[Parameters.BUS_LINE] as string
    const stop = params[Parameters.STOP_NUMBER] as string

    // If this intent is invoked then a stop-number-followup context is outputted
    // Remove corner-followup context in order for dialogflow to match followups to 'stop' intents
    conv.contexts.delete(AppContexts.CORNER_FOLLOWUP)
    
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

const showStopLocationList = async (conv: DialogflowConversation<{}, {}, Contexts>) => {
    try {
        // @ts-ignore: Property does not exist
        const { coordinates } = conv.data
        const locations: Array<StopLocation> = await getClosestStops(rtdb, coordinates)
        const stopDocs: Array<Stop> = await database.getStopDocuments(db, locations.map(o => o.stop))

        const items = {}
        stopDocs.forEach(stop => {
            const distance = locations.find(o => o.stop === stop.number).distanceInMeters
            items[`STOPINFO_${stop.number}`] = responses.prompts.stopLocationListItem(stop, distance)
        })
        conv.ask(responses.i18next.t('foundTheseStops'))
        conv.ask(new List({
            title: responses.i18next.t('stops'),
            items
        }))
    } catch (error) {
        conv.ask(responses.i18next.t('errorOccurred'))
    }
}

app.intent(Intents.CLOSEST_STOPS_INTENT, async conv => {
    // @ts-ignore: Property does not exist
    if (!conv.data.coordinates) {
        conv.ask(new Permission({
            context: responses.i18next.t('locationPermissionReason'),
            permissions: 'DEVICE_PRECISE_LOCATION'
        }))
    } else {
        await showStopLocationList(conv)
    }
})

app.intent(Intents.HANDLE_PERMISSION_INTENT, async (conv, params, granted) => {
    if (granted) {
        const { coordinates } = conv.device.location
        // @ts-ignore: Property does not exit
        conv.data.coordinates = coordinates
        await showStopLocationList(conv)
    } else {
        conv.ask(responses.i18next.t('couldntAccessLocation'))
    }
})

app.intent(IntentGroups.STOP_INFORMATION_INTENTS, async (conv, params) => {
    const stop = params[Parameters.STOP_NUMBER] as string

    conv.contexts.delete(AppContexts.CORNER_FOLLOWUP)

    try {
        const doc = await database.getStopDocument(db, stop)
        if (doc.exists) {
            const data = doc.data() as Stop
            conv.ask(...responses.prompts.stopCard(data))
            conv.ask(responses.suggestions.buses(data.buses, 3))
        } else {
            conv.ask(responses.i18next.t('stopDoesNotExist', { stop }))
        }
    } catch (error) {
        conv.ask(responses.i18next.t('errorOccurred'))
    }
})

export const cuandoLlegaFulfillment = functions.https.onRequest(app)