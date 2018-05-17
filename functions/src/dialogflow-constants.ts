export const Intents = {
    // welcome intent
    WELCOME_INTENT: 'welcome_intent',
    WELCOME_DEEP_LINK_FALLBACK_INTENT: 'welcome_deep_link_fallback_intent',
    // main intents
    CUANDO_LLEGA_CORNER_INTENT: 'cuando_llega_corner_intent',
    CUANDO_LLEGA_STOP_INTENT: 'cuando_llega_stop_intent',
    CUANDO_LLEGA_CLOSEST_STOP_INTENT: 'cuando_llega_closest_stop_intent',
    CLOSEST_STOPS_INTENT: 'closest_stops_intent',
    STOP_INFORMATION_INTENT: 'stop_information_intent',
    HANDLE_PERMISSION_INTENT: 'handle_permission_intent',
    // with bus-followup context
    BUS_CORNER_INTENT: 'bus_corner_intent',
    BUS_STOP_INTENT: 'bus_stop_intent',
    BUS_CLOSEST_STOP_INTENT: 'bus_closest_stop_intent',
    // with corner-followup context
    CORNER_OTHER_BUS_INTENT: 'corner_other_bus_intent',
    // with stop-number-followup context
    STOP_OTHER_BUS_INTENT: 'stop_other_bus_intent',
    STOP_INFORMATION_FOLLOWUP_INTENT: 'stop_information_followup_intent',
    // triggered by event stop_search_event
    STOP_SEARCH_INTENT: 'stop_search_intent',
    // triggered by event actions_intent_OPTION
    STOP_LIST_SELECTION_INTENT: 'stop_list_selection_intent',
    // triggered by event stop_information_event
    STOP_INFORMATION_TRIGGER_INTENT: 'stop_information_trigger_intent'
}

export const IntentGroups = {
    WELCOME_INTENTS: [
        Intents.WELCOME_INTENT,
        Intents.WELCOME_DEEP_LINK_FALLBACK_INTENT
    ],
    STOP_INTENTS: [
        Intents.CUANDO_LLEGA_STOP_INTENT,
        Intents.BUS_STOP_INTENT,
        Intents.STOP_OTHER_BUS_INTENT,
        Intents.STOP_SEARCH_INTENT
    ],
    CLOSEST_STOP_INTENTS: [
        Intents.CUANDO_LLEGA_CLOSEST_STOP_INTENT,
        Intents.BUS_CLOSEST_STOP_INTENT
    ],
    CORNER_INTENTS: [
        Intents.CUANDO_LLEGA_CORNER_INTENT,
        Intents.BUS_CORNER_INTENT,
        Intents.CORNER_OTHER_BUS_INTENT
    ],
    STOP_INFORMATION_INTENTS: [
        Intents.STOP_INFORMATION_INTENT,
        Intents.STOP_INFORMATION_TRIGGER_INTENT,
        Intents.STOP_INFORMATION_FOLLOWUP_INTENT
    ]
}

export const Actions = {
    WELCOME: 'input.welcome',
    WELCOME_UNKNOWN: 'input.welcome.unknown',
    STOPS_CLOSEST: 'action.stops.closest',
    BUS_STOP_CLOSEST: 'action.bus.stop.closest'
}

export const Events = {
    STOP_SEARCH_EVENT: 'stop_search_event',
    STOP_INFORMATION_EVENT: 'stop_information_event'
}

export const AppContexts = {
    BUS_FOLLOWUP: 'bus-followup',
    STOP_FOLLOWUP: 'stop-number-followup',
    CORNER_FOLLOWUP: 'corner-followup'
}

export const Parameters = {
    BUS_LINE: 'bus-line',
    STREET: 'street',
    INTERSECTION: 'intersection',
    STOP_NUMBER: 'stop-number',
    PAYLOAD: 'payload'
}

export type Payload = 'ONE_STOP_FOUND'