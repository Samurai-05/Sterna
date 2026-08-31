# Sterna frontend

Base technique React, TypeScript et Vite pour Sterna. Elle comprend le routing
temporaire, TanStack Query, Tailwind CSS v4, shadcn/ui, Capacitor Android,
MapLibre GL JS, une PWA et les outils de qualité.

## Prérequis

- Node.js 22 ou plus récent
- npm
- JDK 21 et Android SDK (API 36) pour produire l’APK Android
- Android Studio, uniquement pour ouvrir le projet Android (facultatif pour le build)

## Commandes

Installer les dépendances :

```bash
npm install
```

Démarrer le frontend :

```bash
npm run dev
```

Exécuter les tests :

```bash
npm run test
```

Linter le code et appliquer le formatage :

```bash
npm run lint
npm run format
```

Produire le build web/PWA :

```bash
npm run build
```

Ce build laisse `VITE_API_BASE_URL` vide. Les appels `/api/...` restent donc
relatifs et passent par Nginx, aussi bien en production que via le proxy Vite
pendant `npm run dev`.

Produire le build Android et synchroniser les assets vers Android :

```bash
npm run build:android
npx cap sync android
```

`build:android` utilise le mode Vite `android` et le fichier versionné
`../.env.android`, qui pointe vers `https://labo-iot1.iict-heig-vd.ch`. Cette
adresse est publique et n'est pas un secret. Pour une cible de test, elle peut
être remplacée sans modifier un fichier :

```bash
VITE_API_BASE_URL=https://example.test npm run build:android
```

Produire un APK debug depuis WSL ou un environnement sans Android Studio :

```bash
cd android
./gradlew assembleDebug
```

L’APK est généré dans `android/app/build/outputs/apk/debug/app-debug.apk`.
Le fichier `android/local.properties`, qui configure le chemin local du SDK, est
ignoré par Git et ne doit pas être ajouté au dépôt.

L'APK requiert un certificat TLS valide et normalement reconnu par Android pour
`labo-iot1.iict-heig-vd.ch`. Le certificat auto-signé temporaire utilisé par le
conteneur Nginx au premier démarrage ne convient pas à l'application Android;
un vrai certificat doit être installé avant un test de production.

Ouvrir le projet Android dans Android Studio :

```bash
npx cap open android
```

## Smoke tests techniques

- `/`, `/map` et `/profile` vérifient l’intégration de React Router.
- `/map` affiche une carte MapLibre avec le style public OpenFreeMap Liberty.
- Le `QueryClientProvider` est installé à la racine, sans API de démonstration.
- Le manifeste et le service worker sont générés pendant `npm run build`.

Ces routes et la carte sont volontaires et temporaires : elles ne constituent pas
les écrans ni les fonctionnalités métier de Sterna.
