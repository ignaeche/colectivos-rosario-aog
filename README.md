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
- [Typescript](https://www.typescriptlang.org/)
- [i18next](https://www.i18next.com/) for localization
- and more...

## License
[MIT License](LICENSE)