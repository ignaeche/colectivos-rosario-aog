import * as i18next from 'i18next';
import * as backend from 'i18next-node-fs-backend';
import * as path from 'path';
const join = require('join-array')

i18next
    .use(backend)
    .init({
        debug: true,
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
                    const fn = v => i18next.t('joinArticle', { value: v })
                    return join(value, ', ', i18next.t('andSeparator'), null, null, fn)
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