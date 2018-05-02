import i18next from './i18next';
import { SimpleResponse } from 'actions-on-google';

export { default as i18next } from './i18next';

function createSimpleResponse(key: string, data) {
    return new SimpleResponse({
        speech: i18next.t(`${key}.speech`, data),
        text: i18next.t(`${key}.text`, data)
    })
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
    }
}