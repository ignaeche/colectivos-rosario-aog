import i18next from './i18next';
import { SimpleResponse } from 'actions-on-google';
import { BusArrival, ArrivalTranslation, Corner, ArrivalTime } from './models';

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
    'arrivalTimes': (corner: Corner, arrivalTimes: Map<string, BusArrival[]>) => {
        const response = []
        Object.keys(arrivalTimes).forEach(flag => { 
        // arrivalTimes.forEach((arrivals: BusArrival[], flag: string) => {
            const arrivals = arrivalTimes[flag]
            const responseLine = []
            const data: ArrivalTranslation = {} as ArrivalTranslation
            data.bus = flag
            data.street = corner.street.desc
            data.intersection = corner.intersection.desc
            data.stop = corner.stop
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

function addSSMLTag(string: string, tag: string) {
    return `<${tag}>${string}</${tag}>`
}