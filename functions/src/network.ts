import * as request from 'request-promise-native';
import { Response } from 'request';
import { JSDOM } from 'jsdom';
import { Bus, BusArrival, ArrivalTime } from './models';

function requestArrivalTime(bus: Bus, stop: string) {
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

function parseArrivalTime(arrival: string): ArrivalTime {
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

function parseFlag(flag: string) {
    return flag.replace(/\s\(Adaptado\)/i, "").trim()
}

function processArrivalTimes(html: string) {
    const frag = JSDOM.fragment(html)
    const rows = Array.from(frag.querySelectorAll('.tablaArribos tbody tr'))
    const times = new Map<string, BusArrival[]>()
    rows.forEach(row => {
        const cells = row.children
        
        const extract = n => cells.item(n).textContent.trim()

        const flag = parseFlag(extract(0))
        times[flag] = times[flag] || []
        times[flag].push({
            flag: flag,
            time: parseArrivalTime(extract(1)),
            interno: extract(2)
        })
    })
    // Only return times if not empty
    if (Object.keys(times).length > 0) {
        return times
    } else {
        return undefined
    }
}

export async function getArrivalTimes(bus: Bus, stop: string) {
    const response: Response = await requestArrivalTime(bus, stop)
    console.log(`Arrival time request: code ${response.statusCode}, elapsed ${response.elapsedTime}`)
    try {
        return processArrivalTimes(response.body)
    } catch (error) {
        return undefined
    }
}