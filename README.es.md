# Colectivos Rosario
[Colectivos Rosario](https://assistant.google.com/services/a/uid/0000003a99e26c39?hl=es) (publicada en inglés como [Rosario Buses](https://assistant.google.com/services/a/uid/0000003a99e26c39?hl=en)) es una _Action on Google_ que permite buscar los horarios de llegada de colectivos en la ciudad de Rosario, Santa Fe, Argentina usando el _Google Assistant_.

Leer en [inglés](README.md)

## Usos
Por ejemplo, puedes:
- Ver horarios de llegada por parada, esquina o la parada más cercana:
  - "¿Cuándo llega el 102 a la parada 1587?"
  - "¿Cuándo llega el 102 a Ayacucho y Montevideo?"
  - "¿Cuándo llega el 102 a la parada más cercana?"
- Ver las paradas más cercanas a tu ubicación
  - "Paradas más cercanas"
- Pedir información sobre una parada
  - "Info de la parada 1587"

## Desarrollado con
- [Dialogflow](https://dialogflow.com/)
- [Firebase](https://firebase.google.com/)
  - Cloud Functions para el webhook en Dialogflow
  - Cloud Firestore para guardar la información de colectivos, calles y paradas
  - Realtime Database para las búsquedas por ubicación (debido a que las geoqueries todavía no están disponibles en Firestore)
- [Typescript](https://www.typescriptlang.org/)
- [i18next](https://www.i18next.com/) para la localización
- y más...

## Licencia
[MIT License](LICENSE)