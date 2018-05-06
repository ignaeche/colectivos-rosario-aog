export const Intents = {
    CUANDO_LLEGA_CORNER_INTENT: 'cuando_llega_corner_intent',
    CUANDO_LLEGA_STOP_INTENT: 'cuando_llega_stop_intent',
    // with bus-followup context
    BUS_CORNER_INTENT: 'bus_corner_intent',
    BUS_STOP_INTENT: 'bus_stop_intent',
    // with corner-followup context
    CORNER_OTHER_BUS_INTENT: 'corner_other_bus_intent',
    // with stop-number-followup context
    STOP_OTHER_BUS_INTENT: 'stop_other_bus_intent',
    // triggered by event stop_search_event
    STOP_SEARCH_INTENT: 'stop_search_intent',
    // triggered by event actions_intent_OPTION
    STOP_LIST_SELECTION_INTENT: 'stop_list_selection_intent'
}

export const IntentsRedirect = {
    [Intents.CUANDO_LLEGA_STOP_INTENT]: [
        Intents.BUS_STOP_INTENT,
        Intents.STOP_OTHER_BUS_INTENT,
        Intents.STOP_SEARCH_INTENT
    ],
    [Intents.CUANDO_LLEGA_CORNER_INTENT]: [
        Intents.BUS_CORNER_INTENT,
        Intents.CORNER_OTHER_BUS_INTENT
    ]
}

export const Events = {
    STOP_SEARCH_EVENT: 'stop_search_event'
}

export const Contexts = {
    BUS_FOLLOWUP_CONTEXT: 'bus-followup',
    STOP_FOLLOWUP_CONTEXT: 'stop-number-followup',
    CORNER_FOLLOWUP_CONTEXT: 'corner-followup'
}

export const Parameters = {
    BUS_LINE_ARGUMENT: 'bus-line',
    STREET_ARGUMENT: 'street',
    INTERSECTION_ARGUMENT: 'intersection',
    STOP_NUMBER_ARGUMENT: 'stop-number'
}