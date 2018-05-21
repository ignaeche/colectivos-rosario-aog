import * as request from 'request-promise-native';
import { Response } from 'request';
import { JSDOM } from 'jsdom';
import { Bus, BusArrival, ArrivalTime } from './models';

export class SingleBusArrivalTime {
    private static fetch(bus: Bus, stop: string) {
        const formData = {
            parada: stop,
            linea: bus.id,
            entidad: bus.entity,
            adaptado: false,
            accion: 'getSmsEfisat'
        }
        const options = {
            method: 'POST',
            uri: 'http://www.etr.gov.ar/ajax/cuandollega/getSmsResponseEfisat.php',
            form: formData,
            resolveWithFullResponse: true,
            time: true,
            gzip: true
        }
        return request(options)
    }

    private static parse(arrival: string): ArrivalTime {
        const regexp = /(llegando)|(\d+)\s*min\s*(\(Hora Programada\))?/i;
        const match = arrival.match(regexp)
        if (match[1] !== undefined) {
            return { arriving: true }
        } else {
            return {
                arriving: false,
                minutes: match[2],
                scheduled: match[3] !== undefined
            }
        }
    }

    private static parseFlag(flag: string) {
        return flag.replace(/\s\(Adaptado\)/i, "").trim()
    }

    private static process(html: string): Map<string, BusArrival[]> | 'NO_ARRIVALS' {
        const frag = JSDOM.fragment(html)
        const rows = Array.from(frag.querySelectorAll('.tablaArribos tbody tr'))
        const times = new Map<string, BusArrival[]>()
        rows.forEach(row => {
            const cells = row.children
            
            const extract = n => cells.item(n).textContent.trim()

            const flag = SingleBusArrivalTime.parseFlag(extract(0))
            times[flag] = times[flag] || []
            times[flag].push({
                flag: flag,
                time: SingleBusArrivalTime.parse(extract(1)),
                interno: extract(2)
            })
        })
        // Only return times if not empty
        if (Object.keys(times).length > 0) {
            return times
        } else {
            return 'NO_ARRIVALS'
        }
    }

    static async get(bus: Bus, stop: string) {
        try {
            const response: Response = await SingleBusArrivalTime.fetch(bus, stop)
            console.log(`Arrival time request: code ${response.statusCode}, elapsed ${response.elapsedTime}`)
            return SingleBusArrivalTime.process(response.body)
        } catch (error) {
            console.error(error)
            return 'NO_ARRIVALS'
        }
    }
}

// tslint:disable-next-line
class AllBusesArrivalTime {
    private static fetch(stop: string) {
        const formData = {
            idParada: stop
        }
        const options = {
            method: 'POST',
            uri: 'http://www.etr.gov.ar/ajax/cuandollega/getProximosArribosParadaWeb.php',
            form: formData,
            resolveWithFullResponse: true,
            time: true,
            gzip: true
        }
        return request(options)
    }

    private static parse(arrival: string): BusArrival {
        const regexp = /linea:\s(.*)\s(?:(llegando)|(\d+)\smin\s?(\(Hora Programada\))?){1}/i;
        const match = arrival.match(regexp)
        // Group 1 is flag
        const flag = match[1]

        if (match[2] !== undefined) {
            // llegando was matched
            return { flag, time: { arriving: true } }
        } else {
            // N min was matched, N is in group 3; group 4 is 'hora programada'
            return {
                flag,
                time: {
                    arriving: false,
                    minutes: match[3],
                    scheduled: match[4] !== undefined
                }
            }
        }
    }

    private static process(html: string): Map<string, BusArrival[]> | 'NO_ARRIVALS' {
        const frag = JSDOM.fragment(html)
        const rows = Array.from(frag.querySelectorAll('h3'))
        const times = new Map<string, BusArrival[]>()

        rows.forEach(row => {
            const text = row.textContent.trim()
            const arrival = AllBusesArrivalTime.parse(text)

            times[arrival.flag] = times[arrival.flag] || []
            times[arrival.flag].push(arrival)
        })
        // Only return times if not empty
        if (Object.keys(times).length > 0) {
            return times
        } else {
            return 'NO_ARRIVALS'
        }
    }

    static async get(stop: string) {
        try {
            const response: Response = await AllBusesArrivalTime.fetch(stop)
            console.log(`All buses arrival time request: code ${response.statusCode}, elapsed ${response.elapsedTime}`)
            return AllBusesArrivalTime.process(response.body)
        } catch (error) {
            console.error(error)
            return 'NO_ARRIVALS'
        }
    }
}