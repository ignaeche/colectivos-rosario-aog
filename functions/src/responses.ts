import * as i18next from 'i18next';
import { SimpleResponse, Suggestions, BasicCard, BasicCardOptions, Image, Button, OptionItem, SimpleResponseOptions } from 'actions-on-google';
import { BusArrival, ArrivalTranslation, Corner, ArrivalTime, Bus, Stop, Street } from './models';
import { randomPop, takeRandom } from './util';
import { getStopLocationImage, getStopMapsLink } from './maps';

function createSimpleResponse(key: string, data) {
    return new SimpleResponse(i18next.t(key, data))
}

function determineArrival(key: string, time: ArrivalTime) {
    const deepKeys = ['arriving', 'arrivesInScheduled', 'arrivesIn'].map(k => `${key}.${k}`)
    if (time.arriving) {
        return i18next.t(deepKeys[0])
    } else {
        return i18next.t(time.scheduled ? deepKeys[1] : deepKeys[2], { minutes: time.minutes })
    }
}

const stopMapImage = (stop: Stop, size?) => {
    return new Image({
        url: getStopLocationImage(stop.location, i18next.language, size),
        alt: i18next.t('stop.number', { stop: stop.number }),
    })
}

function makeRandomResponse(list: Array<Array<string>>) {
    const response = list.map(l => randomPop(l))
    const speech = response.map(s => wrapTag(s, 's')).join('')
    return {
        speech: wrapTag(speech, 'speak'),
        text: response.join(' ')
    }
}

export const welcome = {
    'welcome': () => {
        const response = [
            i18next.t('welcome.greeting'),
            i18next.t('welcome.question')
        ]
        return new SimpleResponse(makeRandomResponse(response))
    },
    'welcome_fallback': () => {
        const response = [
            i18next.t('welcome.greeting'),
            i18next.t('welcome.unknownSpeech'),
            i18next.t('welcome.suggestAction'),
            i18next.t('welcome.question')
        ]
        return new SimpleResponse(makeRandomResponse(response))
    },
    'suggestions': () => {
        return new Suggestions(i18next.t('welcome.suggestionsChips'))
    }
}

export const negatives = {
    'noStopsFound': (bus: string, street: string, intersection: string) => {
        return createSimpleResponse('stop.noneFoundOnCorner', { bus, street, intersection })
    },
    'invalidStop': (bus: string, stop: string) => {
        return createSimpleResponse('stop.invalid', { bus, stop })
    },
    'nonExistentStop': (stop: string) => {
        return createSimpleResponse('stop.nonExistent', { stop })
    },
    'noStopsNearYou': () => {
        return createSimpleResponse('stop.noneNearYou', undefined)
    },
    'noStopsNearYouForBus': (bus: string) => {
        return createSimpleResponse('stop.noneNearYouForBus', { bus })
    },
    'generalError': () => {
        const response = [
            i18next.t('errorOccurred'),
            i18next.t('goodbye.message')
        ]
        return new SimpleResponse(makeRandomResponse(response))
    },
    'locationNotGranted': () => {
        return createSimpleResponse('location.couldntAccess', undefined)
    },
    'invalidOption': () => {
        return createSimpleResponse('options.invalid', undefined)
    },
    'noOption': () => {
        return createSimpleResponse('options.none', undefined)
    }
}

export const items = {
    'genericStop': (descriptionKey: string, stop: Stop, distance?: number) => {
        const tOptions = { street: stop.street.desc, intersection: stop.intersection.desc }
        if (distance) {
            tOptions['distance'] = distance
        }
        const item: OptionItem = {
            title: i18next.t('stop.number', { stop: stop.number }),
            description: i18next.t(descriptionKey, tOptions)
        }
        if (stop.location) {
            item.image = stopMapImage(stop, 'LIST_SIZE')
        }
        return item
    },
    'stop': (stop: Stop) => {
        return items.genericStop('corner', stop)
    },
    'stopDistanceAway': (stop: Stop, distance: number) => {
        return items.genericStop('distance.awayCorner', stop, distance)
    }
}

export const arrivals = {
    'noneFound': (corner: Corner) => {
        return createSimpleResponse('arrivals.noneFound', {
            bus: corner.bus.name,
            street: corner.stop.street.desc,
            intersection: corner.stop.intersection.desc,
            stop: corner.stop.number
        })
    },
    'foundTimes': (corner: Corner) => {
        return createSimpleResponse('arrivals.foundTimes', {
            bus: corner.bus.name,
            street: corner.stop.street.desc,
            intersection: corner.stop.intersection.desc,
            stop: corner.stop.number
        })
    },
    'times': (times: Map<string, BusArrival[]>) => {
        const response: Array<Array<SimpleResponseOptions>> = []
        Object.keys(times).forEach(flag => {
            const busArrivals: BusArrival[] = times[flag]
            const line = []
            // Get first arrival
            const arrival = busArrivals.shift()
            const data = {
                flag,
                arrivesIn: determineArrival('arrivals.bus', arrival.time) // get arrival string
            }
            line.push(i18next.t('arrivals.sentences.firstBus', data))
            // Get next arrival, if exists will append to message
            const next = busArrivals.shift()
            if (next !== undefined) {
                line.push(i18next.t('arrivals.sentences.nextBus', { arrivesIn: determineArrival('arrivals.nextBus', next.time) }))
            }
            // Push line to final response
            response.push(line)
        })
        const flatten = (key, inner, outer) => response.map(l => l.map(o => o[key]).join(inner)).join(outer)
        return new SimpleResponse({
            speech: wrapTag(flatten('speech', '', '<break time=\"400ms\"/>'), 'speak'),
            text: flatten('text', ' ', ' ')
        })
    },
    'completeAnswer': (corner: Corner, times: Map<string, BusArrival[]>) => {
        return [arrivals.foundTimes(corner), arrivals.times(times)]
    }
}

export const rich = {
    'stop_card': (stop: Stop, onlyOneStop: boolean = false) => {
        const options: BasicCardOptions = {
            title: i18next.t('stop.number', { stop: stop.number }),
            subtitle: i18next.t('corner', { street: stop.street.desc, intersection: stop.intersection.desc }),
            text: i18next.t('stop.card.text', { stop })
        }
        if (stop.location) {
            options.image = stopMapImage(stop)
            options.display = 'CROPPED'
            options.buttons = new Button({
                title: i18next.t('viewOnGoogleMaps'),
                url: getStopMapsLink(stop.location)
            })
        }
        return [
            new SimpleResponse({
                speech: i18next.t('stop.card.speech', { stop }),
                text: i18next.t(onlyOneStop ? 'stop.onlyOneNearYou': 'hereYouGo')
            }),
            new BasicCard(options)
        ]
    }
}

export const suggestions = {
    'busesList': (buses: Array<string>, howMany: number) => {
        const list = takeRandom(buses, howMany)
        return list.sort().map(bus => i18next.t('suggestions.otherBus', { bus }))
    },
    'stopsList': (stops: Array<string>, howMany: number) => {
        const list = takeRandom(stops, howMany)
        return list.sort().map(stop => i18next.t('suggestions.otherStop', { stop }))
    },
    'closestStop': () => {
        return i18next.t('suggestions.closestStop')
    },
    'stop': (stop: Stop, stopInContext: boolean = true) => {
        return new Suggestions(
            stopInContext ? i18next.t('suggestions.infoThis') : i18next.t('suggestions.info', { stop: stop.number }),
            suggestions.closestStop(),
            suggestions.stopsList(stop.nearbyStops, 3),
            suggestions.busesList(stop.buses, 3)
        )
    },
    'bus': (bus: Bus) => {
        return new Suggestions(
            suggestions.closestStop(),
            suggestions.stopsList(bus.stopSelection, 3),
        )
    }
}

export const prompts = {
    'anythingElse': () => {
        return createSimpleResponse('anythingElse', undefined)
    }
}

function wrapTag(string: string, tag: string) {
    return `<${tag}>${string}</${tag}>`
}