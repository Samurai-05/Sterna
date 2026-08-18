# ADR-001 — Frontend Platform

## Status

Accepted

## Context

Sterna doit cibler le web et les appareils mobiles avec une base de code largement partagée. L'interface doit rester adaptée à une application interactive, tout en pouvant accéder à certaines capacités natives comme la géolocalisation, l'appareil photo et les permissions.

Le projet cherche un compromis entre partage de code, vitesse d'itération, qualité de l'expérience web et accès aux plateformes mobiles. Une solution mobile entièrement native maximiserait le contrôle, mais augmenterait fortement le coût de développement et de maintenance.

## Decision

La plateforme frontend retenue est composée de :

- React pour l'interface et le modèle de composants ;
- TypeScript pour le typage statique ;
- Vite pour le développement et le build web ;
- PWA comme cible web installable ;
- Capacitor pour empaqueter l'application web sur mobile et accéder aux capacités natives.

### Raisonnement et compromis

React fournit un modèle de composants adapté à une interface riche et interactive. Son écosystème est mature, notamment pour les interfaces web et la cartographie. En contrepartie, les briques complémentaires — navigation, gestion des données, formulaires et intégration native — doivent être choisies et maintenues séparément.

TypeScript rend les contrats entre composants, données géographiques et appels backend plus explicites. Il réduit certaines erreurs lors de l'évolution du projet, au prix d'une configuration supplémentaire et d'un effort de maintenance des types.

Vite offre un démarrage rapide en développement et une chaîne de build simple pour React et TypeScript. Le projet doit toutefois configurer lui-même des aspects comme le service worker, le déploiement et l'intégration Capacitor.

La PWA fournit une cible web installable et partage la même base de code entre desktop et mobile. Une PWA seule ne garantit cependant pas un accès homogène aux fonctions natives ni une distribution mobile équivalente à celle d'une application de store.

Capacitor conserve l'interface et la logique web dans une application mobile et fournit un pont vers les API natives. Le compromis est un rendu dans une WebView, ainsi que la maintenance des plugins, des configurations Android/iOS et des tests sur appareils réels.

## Alternatives considered

| Approche | Avantages | Inconvénients |
|---|---|---|
| PWA seule | Base de code et déploiement simples ; accès immédiat depuis le web | Accès plus limité ou variable aux fonctions natives ; distribution mobile moins complète |
| Expo / React Native | Expérience mobile plus proche du natif ; accès mobile bien intégré | Partage moindre avec la cible web ; adaptations nécessaires pour le rendu web et la cartographie |
| Développement natif Android/iOS | Contrôle maximal des plateformes et des performances | Deux implémentations à maintenir ; coût plus élevé ; faible partage de code |

## Consequences

### Positives

- une interface et une logique principalement partagées entre le web et le mobile ;
- une vitesse d'itération adaptée à un projet étudiant ;
- une cible web installable via la PWA ;
- un accès aux capacités mobiles nécessaires sans réécrire l'interface en natif.

### Négatives

- les performances et l'accès aux API natives sont moins directs qu'en développement natif ;
- les plugins et configurations des plateformes mobiles doivent être maintenus ;
- la chaîne frontend doit intégrer plusieurs briques plutôt qu'un framework mobile unique ;
- cette décision devra être réévaluée si les performances cartographiques ou les exigences des stores deviennent incompatibles avec une WebView.

