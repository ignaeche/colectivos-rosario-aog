import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { dialogflow, List, Permission, DialogflowConversation, Contexts } from 'actions-on-google';

import * as database from './database';
import { Corner, Bus, Stop, StopLocation } from './models';
import * as responses from './responses';
import { Intents, IntentGroups, AppContexts, Parameters, Events, Payload } from './dialogflow-constants';
import { getClosestStops } from './location';
import { SingleBusArrivalTime } from './arrivals';

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

        const size = validCorners.length
        if (size === 0) {
            return conv.ask(responses.negatives.noStopsFound(bus, street, intersection))
        } else if (size === 1) {
            const corner = validCorners[0]
            // Probable solution; may make request here in order to keep corner context
            // conv.followup(Events.STOP_SEARCH_EVENT, { [Parameters.BUS_LINE]: bus, [Parameters.STOP_NUMBER]: corner.stop.number })
            const arrival = await SingleBusArrivalTime.get(corner.bus, corner.stop.number)
            if (arrival === 'NO_ARRIVALS') {
                return conv.ask(responses.arrivals.noneFound(corner))
        } else {
                return conv.ask(...responses.arrivals.completeAnswer(corner, arrival))
            }
        } else {
            const items = {}
            validCorners.forEach(corner => {
                items[`STOP_${corner.stop.number}`] = responses.items.stop(corner.stop)
            });
            conv.ask(responses.i18next.t('stop.pickOne'))
            return conv.ask(new List({
                title: responses.i18next.t('stops'),
                items
            }));
        }
    } catch (error) {
        console.error(error)
        return conv.ask(responses.negatives.generalError())
    }
})

app.intent(Intents.STOP_LIST_SELECTION_INTENT, (conv, params, option) => {
    if (!option) {
        return conv.ask(responses.negatives.noOption())
    }
    const stop = option.toString().split('_')
    switch (stop[0]) {
        case "STOP":
            // If bus-followup context is not present, present stop information
            const context = conv.contexts.get(AppContexts.BUS_FOLLOWUP)
            if (context !== undefined) {
                const followupParams = {
                    [Parameters.BUS_LINE]: context.parameters[Parameters.BUS_LINE],
                    [Parameters.STOP_NUMBER]: stop[1]
                }
                return conv.followup(Events.STOP_SEARCH_EVENT, followupParams)
            } else {
                return conv.followup(Events.STOP_INFORMATION_EVENT, { [Parameters.STOP_NUMBER]: stop[1] })
            }
        case "STOPINFO":
            return conv.followup(Events.STOP_INFORMATION_EVENT, { [Parameters.STOP_NUMBER]: stop[1] })
        default:
            return conv.ask(responses.negatives.invalidOption())
    }
})

app.intent(IntentGroups.STOP_INTENTS, async (conv, params) => {
    const bus = params[Parameters.BUS_LINE] as string
    const stop = params[Parameters.STOP_NUMBER] as string

    // If this intent is invoked then a stop-number-followup context is outputted
    // Remove corner-followup context in order for dialogflow to match followups to 'stop' intents
    conv.contexts.delete(AppContexts.CORNER_FOLLOWUP)
    
    try {
        const doc = await database.getBusStopDocument(db, bus, stop)
        if (doc.exists) {
            // Get bus document
            const busDoc = await database.getBusDocument(db, bus)
            const busData = busDoc.data() as Bus
            // Get stop data
            const stopData = doc.data() as Stop
            // request
            const corner = new Corner(busData, stopData)
            const arrival = await SingleBusArrivalTime.get(busData, stopData.number)
            if (arrival === 'NO_ARRIVALS') {
                return conv.ask(responses.arrivals.noneFound(corner))
            } else {
                conv.ask(responses.suggestions.buses(stopData.otherBuses, 2))
                return conv.ask(...responses.arrivals.completeAnswer(corner, arrival))
            }
        } else {
            return conv.ask(responses.negatives.invalidStop(bus, stop))
        }
    } catch (error) {
        console.error(error)
        return conv.ask(responses.negatives.generalError())
    }
})

const showStopLocationList = async (conv: DialogflowConversation<{}, {}, Contexts>) => {
    try {
        // @ts-ignore: Property does not exist
        const { coordinates } = conv.data
        const locations: Array<StopLocation> = await getClosestStops(rtdb, coordinates)

        if (locations.length === 0) {
            return conv.ask(responses.negatives.noStopsNearYou())
        }
        if (locations.length === 1) {
            return conv.followup(Events.STOP_INFORMATION_EVENT, { [Parameters.STOP_NUMBER]: locations.pop().stop, [Parameters.PAYLOAD]: 'ONE_STOP_FOUND' })
        }

        const stops: Array<Stop> = await database.getStops(db, locations.map(o => o.stop))

        const items = {}
        stops.forEach(stop => {
            const distance = locations.find(o => o.stop === stop.number).distanceInMeters
            items[`STOPINFO_${stop.number}`] = responses.items.stopDistanceAway(stop, distance)
        })
        conv.ask(responses.i18next.t('stop.foundThese'))
        return conv.ask(new List({
            title: responses.i18next.t('stops'),
            items
        }))
    } catch (error) {
        console.error(error)
        return conv.ask(responses.negatives.generalError())
    }
}

app.intent(Intents.CLOSEST_STOPS_INTENT, async conv => {
    // @ts-ignore: Property does not exist
    if (!conv.data.coordinates) {
        return conv.ask(new Permission({
            context: responses.i18next.t('location.permissionReason'),
            permissions: 'DEVICE_PRECISE_LOCATION'
        }))
    }
    return showStopLocationList(conv)
})

app.intent(Intents.HANDLE_PERMISSION_INTENT, async (conv, params, granted) => {
    if (granted) {
        const { coordinates } = conv.device.location
        // @ts-ignore: Property does not exit
        conv.data.coordinates = coordinates
        return showStopLocationList(conv)
    } else {
        return conv.ask(responses.negatives.locationNotGranted())
    }
})

app.intent(IntentGroups.STOP_INFORMATION_INTENTS, async (conv, params) => {
    const stop = params[Parameters.STOP_NUMBER] as string
    const payload = params[Parameters.PAYLOAD] as Payload

    conv.contexts.delete(AppContexts.CORNER_FOLLOWUP)

    try {
        const doc = await database.getStopDocument(db, stop)
        if (doc.exists) {
            const data = doc.data() as Stop
            conv.ask(...responses.rich.stop_card(data, payload && payload === 'ONE_STOP_FOUND'))
            return conv.ask(responses.suggestions.buses(data.buses, 5))
        } else {
            return conv.ask(responses.negatives.nonExistentStop(stop))
        }
    } catch (error) {
        console.error(error)
        return conv.ask(responses.negatives.generalError())
    }
})

export const cuandoLlegaFulfillment = functions.https.onRequest(app)