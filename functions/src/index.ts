import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { dialogflow, List, Permission, DialogflowConversation, Contexts, Suggestions } from 'actions-on-google';

import i18next from './i18next'
import * as database from './database';
import { Corner, Bus, Stop, StopLocation } from './models';
import * as responses from './responses';
import { Intents, IntentGroups, AppContexts, Parameters, Events, Payload, Actions } from './dialogflow-constants';
import { getClosestStops, isInCity } from './location';
import { SingleBusArrivalTime } from './arrivals';

const STREET_MIN_LENGTH = 4
const STOP_LENGTH = 4

admin.initializeApp(functions.config().firebase)
const db = admin.firestore()
const rtdb = admin.database()

const app = dialogflow()

app.middleware(conv => {
    i18next.changeLanguage(conv.user.locale)
    console.log(`Intent ${conv.intent} matched with params ${JSON.stringify(conv.parameters)}`)
})

app.intent(IntentGroups.CORNER_INTENTS, async (conv, params) => {
    const bus = params[Parameters.BUS_LINE] as string
    const street = params[Parameters.STREET] as string
    const intersection = params[Parameters.INTERSECTION] as string

    // If this intent is invoked then a corner-followup context is outputted
    // Remove stop-number-followup context in order for dialogflow to match followups to 'corner' intents
    conv.contexts.delete(AppContexts.STOP_FOLLOWUP)

    if (street.length < STREET_MIN_LENGTH || intersection.length < STREET_MIN_LENGTH) {
        conv.contexts.delete(AppContexts.CORNER_FOLLOWUP)
        conv.ask(responses.negatives.invalidStreetLength(STREET_MIN_LENGTH))
        return conv.ask(responses.prompts.anythingElse())
    }

    try {
        // Get bus document
        const busDoc = await database.getBusDocument(db, bus)
        const busData = busDoc.data() as Bus

        // Find corners where street name and intersection name match
        const validCorners: Array<Corner> = await database.findValidCorners(db, busData, street, intersection)

        const size = validCorners.length
        if (size === 0) {
            // No stops found, suggest other stops for this bus
            conv.ask(responses.suggestions.bus(busData))
            conv.ask(responses.negatives.noStopsFound(bus, street, intersection))
            return conv.ask(responses.prompts.anythingElse())
        } else if (size === 1) {
            // Only one stop found, 
            const corner = validCorners[0]

            // Get bus stop document
            const stopDoc = await database.getBusStopDocument(db, bus, corner.stop.number)
            const stopData = stopDoc.data() as Stop
            // Replace stop data with data from the stop document found in subcollection /buses/{bus}/stops/{stop}
            corner.stop = stopData

            // Request
            const arrival = await SingleBusArrivalTime.get(corner.bus, corner.stop.number)

            // Suggest other stops and buses from stop data
            conv.ask(responses.suggestions.stop(corner.stop, false))
            // Return response
            if (arrival === 'NO_ARRIVALS') {
                conv.ask(responses.arrivals.noneFound(corner))
            } else {
                conv.ask(...responses.arrivals.completeAnswer(corner, arrival))
            }
            return conv.ask(responses.prompts.anythingElse())
        } else {
            // More than 2 stops found, construct list for user
            const items = {}
            validCorners.forEach(corner => {
                items[`STOP_${corner.stop.number}`] = responses.items.stop(corner.stop)
            });
            if (!conv.screen) {
                conv.ask(responses.sayList.stops(validCorners.map(c => c.stop)))
            } else {
                conv.ask(i18next.t('stop.pickOne'))
            }
            return conv.ask(new List({
                title: i18next.t('stops'),
                items
            }));
        }
    } catch (error) {
        console.error(error)
        return conv.close(responses.negatives.generalError())
    }
})

app.intent(Intents.STOP_LIST_SELECTION_INTENT, (conv, params, option) => {
    if (!option) {
        return conv.ask(responses.negatives.noOption())
    }
    // Split key
    const stop = option.toString().split('_')
    switch (stop[0]) {
        case "STOP":
            // If bus-followup context is not present, present stop information, otherwise followup with search
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

    if (stop.length !== STOP_LENGTH) {
        conv.contexts.delete(AppContexts.STOP_FOLLOWUP)
        conv.ask(responses.negatives.invalidStopLength(STOP_LENGTH))
        return conv.ask(responses.prompts.anythingElse())
    }

    try {
        // Get bus document
        const busDoc = await database.getBusDocument(db, bus)
        const busData = busDoc.data() as Bus

        // Get stop document; if it exists do search
        const doc = await database.getBusStopDocument(db, bus, stop)
        if (doc.exists) {
            // Get stop data
            const stopData = doc.data() as Stop
            // Request
            const arrival = await SingleBusArrivalTime.get(busData, stopData.number)

            // Make corner out of bus and stop for responses functions
            const corner = new Corner(busData, stopData)
            conv.ask(responses.suggestions.stop(corner.stop))
            if (arrival === 'NO_ARRIVALS') {
                conv.ask(responses.arrivals.noneFound(corner))
            } else {
                conv.ask(...responses.arrivals.completeAnswer(corner, arrival))
            }
            return conv.ask(responses.prompts.anythingElse())
        } else {
            // Invalid stop, suggest other stops from bus
            conv.ask(responses.suggestions.bus(busData))
            conv.ask(responses.negatives.invalidStop(bus, stop))
            return conv.ask(responses.prompts.anythingElse())
        }
    } catch (error) {
        console.error(error)
        return conv.close(responses.negatives.generalError())
    }
})

const showStopLocationList = async (conv: DialogflowConversation<{}, {}, Contexts>) => {
    try {
        // @ts-ignore: Property does not exist
        const { coordinates } = conv.device.location
        if (!isInCity(coordinates)) {
            conv.ask(responses.negatives.notInCity())
            return conv.ask(responses.prompts.anythingElse())
        }
        // Get stop locations in range of user location
        const locations: Array<StopLocation> = await getClosestStops(rtdb, coordinates)

        if (locations.length === 0) {
            // None found, suggest other actions
            conv.ask(responses.welcome.suggestions())
            conv.ask(responses.negatives.noStopsNearYou())
            return conv.ask(responses.prompts.anythingElse())
        }
        if (locations.length === 1) {
            // One found, present stop information with message (payload flag)
            return conv.followup(Events.STOP_INFORMATION_EVENT, { [Parameters.STOP_NUMBER]: locations.pop().stop, [Parameters.PAYLOAD]: 'ONE_STOP_FOUND' })
        }

        // More than 2 found, get stops information
        const stops: Array<Stop> = await database.getStops(db, locations.map(o => o.stop))

        // Make list and send it to the user
        const items = {}
        stops.forEach(stop => {
            const distance = locations.find(o => o.stop === stop.number).distanceInMeters
            items[`STOPINFO_${stop.number}`] = responses.items.stopDistanceAway(stop, distance)
        })
        if (!conv.screen) {
            conv.ask(responses.sayList.stops(stops))
        } else {
            conv.ask(i18next.t('stop.foundThese'))
        }
        return conv.ask(new List({
            title: i18next.t('stops'),
            items
        }))
    } catch (error) {
        console.error(error)
        return conv.close(responses.negatives.generalError())
    }
}

const searchClosestStop = async (conv: DialogflowConversation<{}, {}, Contexts>) => {
    try {
        // @ts-ignore: Property does not exist
        const { coordinates } = conv.device.location
        if (!isInCity(coordinates)) {
            conv.ask(responses.negatives.notInCity())
            return conv.ask(responses.prompts.anythingElse())
        }
        // Get bus from context (means call from handle_permission) or parameters (call from regular intent)
        const bus = (conv.contexts.get(AppContexts.BUS_FOLLOWUP).parameters[Parameters.BUS_LINE] || conv.parameters[Parameters.BUS_LINE]) as string
        // Get up to 20 stops in a 1km circle
        const locations: Array<StopLocation> = await getClosestStops(rtdb, coordinates, 20)

        // Find the information for the closest stop, locations is ordered by distance
        const stop = await database.findFirstStop(db, bus, locations.map(s => s.stop))

        if (stop === 'NO_STOPS') {
            // No stops found, suggest other actions
            conv.ask(responses.welcome.suggestions())
            conv.ask(responses.negatives.noStopsNearYouForBus(bus))
            return conv.ask(responses.prompts.anythingElse())
        } else {
            // One found, followup with arrival time search
            const followupParams = {
                [Parameters.BUS_LINE]: bus,
                [Parameters.STOP_NUMBER]: stop.number
            }
            return conv.followup(Events.STOP_SEARCH_EVENT, followupParams)
        }
    } catch (error) {
        console.error(error)
        return conv.close(responses.negatives.generalError())
    }
}

app.intent(Intents.CLOSEST_STOPS_INTENT, async conv => {
    // Ask permission if location not available
    if (!conv.device.location) {
        // @ts-ignore: Property does not exist
        conv.data.locationAction = conv.action
        return conv.ask(new Permission({
            context: i18next.t('location.permissionReason'),
            permissions: 'DEVICE_PRECISE_LOCATION'
        }))
    }
    // If location available, show stop list
    return showStopLocationList(conv)
})

app.intent(IntentGroups.CLOSEST_STOP_INTENTS, (conv, params) => {
    const bus = params[Parameters.BUS_LINE]
    // Ask permission if location not available
    if (!conv.device.location) {
        // @ts-ignore: Property does not exist
        conv.data.locationAction = conv.action
        return conv.ask(new Permission({
            context: i18next.t('location.searchPermissionReason', { bus }),
            permissions: 'DEVICE_PRECISE_LOCATION'
        }))
    }
    // If location available, search for closest stop
    return searchClosestStop(conv)
})

app.intent(Intents.HANDLE_PERMISSION_INTENT, async (conv, params, granted) => {
    if (granted) {
        // Location was granted, answer according to action from requesting intent (saved in conv.data)
        // @ts-ignore: Property does not exit
        const action = conv.data.locationAction
        switch (action) {
            case Actions.STOPS_CLOSEST:
                return showStopLocationList(conv)
            case Actions.BUS_STOP_CLOSEST:
                return searchClosestStop(conv)
            default:
                return conv.close(responses.negatives.generalError())
        }
    } else {
        // Location not granted, suggest other actions to the user
        conv.ask(responses.welcome.suggestions())
        conv.ask(responses.negatives.locationNotGranted())
        return conv.ask(responses.prompts.anythingElse())
    }
})

app.intent(IntentGroups.STOP_INFORMATION_INTENTS, async (conv, params) => {
    const stop = params[Parameters.STOP_NUMBER] as string
    const payload = params[Parameters.PAYLOAD] as Payload

    conv.contexts.delete(AppContexts.CORNER_FOLLOWUP)

    if (stop.length !== STOP_LENGTH) {
        conv.contexts.delete(AppContexts.STOP_FOLLOWUP)
        conv.ask(responses.negatives.invalidStopLength(STOP_LENGTH))
        return conv.ask(responses.prompts.anythingElse())
    }

    try {
        const doc = await database.getStopDocument(db, stop)
        // If stop exists, show info card; otherwise suggest other actions
        if (doc.exists) {
            const data = doc.data() as Stop
            conv.ask(...responses.rich.stop_card(data, payload && payload === 'ONE_STOP_FOUND'))
            conv.ask(new Suggestions(responses.suggestions.busesList(data.buses, 5)))
        } else {
            conv.contexts.delete(AppContexts.STOP_FOLLOWUP)
            conv.ask(responses.welcome.suggestions())
            conv.ask(responses.negatives.nonExistentStop(stop))
        }
        return conv.ask(responses.prompts.anythingElse())
    } catch (error) {
        console.error(error)
        return conv.close(responses.negatives.generalError())
    }
})

app.intent(IntentGroups.WELCOME_INTENTS, conv => {
    const { action } = conv
    conv.ask(responses.welcome.suggestions())
    if (action === Actions.WELCOME_UNKNOWN) {
        // Deep invocation failed, show fallback message
        return conv.ask(responses.welcome.welcome_fallback())
    } else {
        return conv.ask(responses.welcome.welcome())
    }
})

app.intent(Intents.ANYTHING_ELSE_YES_INTENT, conv => {
    conv.ask(responses.welcome.suggestions())
    return conv.ask(conv.incoming.get('string'))
})

app.fallback(conv => {
    console.error(`Fallback handler called. ${conv.intent} does not have a handler.`)
    return conv.close(responses.negatives.generalError())
})

app.catch(conv => {
    console.error(`Catch handler called. ${conv.intent} has an uncaught error.`)
    return conv.close(responses.negatives.generalError())
})

export const cuandoLlegaFulfillment = functions.https.onRequest(app)