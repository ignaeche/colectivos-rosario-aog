import i18next from './i18next';
import { SimpleResponse, Suggestions } from 'actions-on-google';
import { BusArrival, ArrivalTranslation, Corner, ArrivalTime, Bus } from './models';
import { randomPop, takeRandom } from './util';

export { default as i18next } from './i18next';

function createSimpleResponse(key: string, data) {
    return new SimpleResponse(i18next.t(key, data))
}

function determineArrival(keys: string[], time: ArrivalTime) {
    if (time.arriving) {
        return i18next.t(keys[0])
    } else {
        let key;
        if (time.scheduled) {
            key = keys[1]
        } else {
            key = keys[2]
        }
        return i18next.t(key, { minutes: time.minutes })
    }
}

export const prompts = {
    'noStopsFound': (bus, street, intersection) => {
        return createSimpleResponse('noStopsFound', { bus, street, intersection })
    },
    'invalidStop': (bus, stop) => {
        return createSimpleResponse('invalidStop', { bus, stop })
    },
    'stopListItem': (stop, street, intersection) => {
        return {
            title: i18next.t('stopNumber', { stop }),
            description: i18next.t('corner', { street, intersection })
        }
    },
    'foundArrivalTimes': (bus: Bus, corner: Corner) => {
        return new SimpleResponse(i18next.t('foundArrivalTime', {
            bus: bus.name,
            street: corner.street.desc,
            intersection: corner.intersection.desc,
            stop: corner.stop
        }))
    },
    'arrivalTimes': (arrivalTimes: Map<string, BusArrival[]>) => {
        const response = []
        Object.keys(arrivalTimes).forEach(flag => { 
        // arrivalTimes.forEach((arrivals: BusArrival[], flag: string) => {
            const arrivals = arrivalTimes[flag]
            const responseLine = []
            const data: ArrivalTranslation = {} as ArrivalTranslation
            data.flag = flag
            // Get first arrival
            const arrival = arrivals.shift()
            // Get arrival string
            data.arrivesIn = determineArrival(['arrivalIsArriving', 'arrivalInMinutesScheduled', 'arrivalInMinutes'], arrival.time)
            responseLine.push(i18next.t('arrival', data))

            // Get next arrival, if exists will append to message
            const next = arrivals.shift()
            if (next !== undefined) {
                const nextData = { arrivesIn: determineArrival(['arrivalNextIsArriving', 'arrivalNextScheduled', 'arrivalNext'], next.time) }
                responseLine.push(i18next.t('nextBus', nextData))
            }
            response.push(responseLine)
        })
        return new SimpleResponse({
            speech: addSSMLTag(response.map(l => l.map(o => o.speech).join("")).join("<break time=\"400ms\"/>"), 'speak'),
            text: response.map(l => l.map(o => o.text).join(" ")).join(" ")
        })
    }
}
export const suggestions = {
    'buses': (buses: Array<string>, howMany: number) => {
        const list = takeRandom(buses, howMany)
        return new Suggestions(list.sort().map(bus => i18next.t('otherBusSuggestion', { bus })))
    }
}

function addSSMLTag(string: string, tag: string) {
    return `<${tag}>${string}</${tag}>`
}