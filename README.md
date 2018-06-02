# Colectivos Rosario
[Colectivos Rosario](https://assistant.google.com/services/a/uid/0000003a99e26c39?hl=es) (also known as [Rosario Buses](https://assistant.google.com/services/a/uid/0000003a99e26c39?hl=en)) is an _Action on Google_ that allows you to search for arrival times for buses in the city of Rosario, Santa Fe, Argentina using the _Google Assistant_.

Read in [Spanish](README.es.md)

## Features
You can, for example:
- Search arrival times by stop, corner or closest stop:
  - "When does the 102 arrive to stop 1587?"
  - "When does the 102 arrive to Ayacucho and Montevideo?"
  - "When does the 102 arrive to the closest stop?"
- List stops near your location
  - "Stops near me"
- Get information on a certain stop
  - "Info on stop 1587"

## Built using
- [Dialogflow](https://dialogflow.com/)
- [Firebase](https://firebase.google.com/)
  - Cloud Functions for the webhook in Dialogflow
  - Cloud Firestore to store bus, street and stop information
  - Realtime Database for geoqueries (since geoqueries are not exposed in Firestore at the time of development)
- [TypeScript](https://www.typescriptlang.org/)
- [i18next](https://www.i18next.com/) for localization
- and more...

## Setup

### Actions on Google Console

1. Create a new project in the [Actions on Google Console](https://console.actions.google.com/).
2. Create a new Dialogflow agent.
3. Under settings, go to _Export and Import_, select _Restore from ZIP_ and upload the [agent](dialogflow-agent.zip) included in this repository.
4. Under _Fulfillment > Webhook_ use the URL of your cloud function (created in the next section).

### Firebase Cloud Functions

1. Install [Node.js](http://nodejs.org/) and [npm](https://npmjs.org/)
2. Install the [Firebase CLI](https://github.com/firebase/firebase-tools)
```
npm install -g firebase-tools
```
3. Clone this repository.
4. Login to Firebase and initialize the project.
```
firebase login
firebase init
```
5. Deploy and get the URL of your cloud function and paste it in the _Fulfillment > Webhook_ section of Dialogflow.
```
npm run deploy
```

### Test your action

1. Make sure the agent is propagated to the Actions Console. In the Dialogflow console, under _Integrations_ changes to your agent can be set to automatically propagate.
2. Go to the _Actions Console simulator_ or any device logged in with your account and test your action.

## Resources

- [Actions on Google documentation](https://developers.google.com/actions/extending-the-assistant)
- [Cloud Functions for Firebase documentation](https://firebase.google.com/docs/functions/)
- [Actions on Google Client Library](https://github.com/actions-on-google/actions-on-google-nodejs)

## License
[MIT License](LICENSE)