import * as i18next from 'i18next';
import * as backend from 'i18next-node-fs-backend';
import * as path from 'path';

i18next
    .use(backend)
    .init({
        debug: true,
        load: 'languageOnly', // load languages without region consideration
        lng: 'es',
        fallbackLng: 'es',
        preload: ['es', 'en'],
        ns: 'translation',
        backend: {
            loadPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.json')
        }
    }, (err, t) => {
        if (err) console.log('i18next loading went wrong', err)
    });
export default i18next