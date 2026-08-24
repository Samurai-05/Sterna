# Sterna frontend

Base technique React, TypeScript et Vite pour Sterna. Elle comprend le routing
temporaire, TanStack Query, Tailwind CSS v4, shadcn/ui, Capacitor Android,
MapLibre GL JS, une PWA et les outils de qualité.

## Prérequis

- Node.js 22 ou plus récent
- npm
- Android Studio, uniquement pour ouvrir ou exécuter le projet Android

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

Produire le build web et synchroniser les assets vers Android :

```bash
npm run build
npx cap sync android
```

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
