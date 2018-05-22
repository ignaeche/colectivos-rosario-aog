import * as i18next from 'i18next';
import * as path from 'path';
const backend = require('i18next-sync-fs-backend')
const join = require('join-array')

i18next
    .use(backend)
    .init({
        debug: false,
        initImmediate: false,
        load: 'languageOnly', // load languages without region consideration
        lng: 'es',
        fallbackLng: 'es',
        preload: ['es', 'en'],
        ns: 'translation',
        returnObjects: true,
        backend: {
            loadPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.json')
        },
        interpolation: {
            format: function (value, format, lng) {
                if (format === 'lowercase') {
                    return value.toLowerCase()
                }
                if (format === 'fixFlag') {
                    const replacements = {
                        'UNICO': 'ÚNICO'
                    }
                    let result = value
                    Object.keys(replacements).forEach(key => {
                        result = result.replace(key, replacements[key])
                    })
                    return result
                }
                if (format === 'join') {
                    const fn = v => i18next.t('joinArray.buses.article', { value: v })
                    return join(value, ', ', i18next.t('joinArray.buses.and'), null, null, fn)
                }
                if (format === 'joinStops') {
                    const fn = v => i18next.t('joinArray.stops.article', { stop: v })
                    return join(value, ', ', i18next.t('joinArray.stops.and'), null, null, fn)
                }
                if (format === 'count') {
                    return value.length
                }
                if (format === 'shortenBus') {
                    // quick hack to shorten bus name in suggestion chip
                    const strip = [' OESTE']
                    let result = value
                    strip.forEach(r => {
                        result = result.replace(r, '')
                    })
                    return result
                }
                return value
            }
        }
    }, (err, t) => {
        if (err) console.log('i18next loading went wrong', err)
    });
export default i18next