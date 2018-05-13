import * as i18next from 'i18next';
import * as path from 'path';
const backend = require('i18next-sync-fs-backend')
const join = require('join-array')

i18next
    .use(backend)
    .init({
        debug: true,
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
                if (format === 'join') {
                    const fn = v => i18next.t('joinArray.buses.article', { value: v })
                    return join(value, ', ', i18next.t('joinArray.buses.and'), null, null, fn)
                }
                if (format === 'count') {
                    return value.length
                }
                return value
            }
        }
    }, (err, t) => {
        if (err) console.log('i18next loading went wrong', err)
    });
export default i18next