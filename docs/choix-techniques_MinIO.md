# Choix techniques — Sterna

Ce document présente les choix d'architecture et de technologies retenus pour le projet Sterna, ainsi que leur justification. Il est amené à évoluer au fil du projet.

---

## Vue d'ensemble

Sterna est déployé sous forme de conteneurs Docker orchestrés via `docker-compose`, hébergés sur une VM fournie par l'école. 
Cette approche a été privilégiée pour sa simplicité de mise en place et sa cohérence avec les livrables attendus.

```
┌─────────────┐      upload photo          ┌─────────────┐
│   Frontend  │ ───────────────────────▶  │   Backend   │
│    (PWA)    │                            │  (Node.js)  │
└─────────────┘                            └──────┬──────┘
                                                  │
                                    ┌─────────────┼─────────────┐
                                    ▼                           ▼
                            ┌───────────────┐          ┌────────────────┐
                            │  PostgreSQL   │          │      MinIO     │
                            │ (métadonnées) │          │    (photos)    │
                            └───────────────┘          └────────────────┘
```

---

## Stockage des photos : MinIO

**Choix retenu : MinIO (self-hosted, compatible API S3), conteneurisé**

**Pourquoi :**
- **API standard S3** : n'importe quel SDK compatible S3 fonctionne (client `minio`, `@aws-sdk/client-s3`), donc le code applicatif resterait quasi identique en cas de migration future vers un vrai service cloud (AWS S3, Scaleway, etc.).
- **Séparation des responsabilités** : les fichiers binaires (photos) sont gérés indépendamment de la base de données, qui ne stocke que les métadonnées (user, coordonnées GPS, pays détecté, clé du fichier). Architecture plus propre et plus facile à défendre techniquement à l'oral qu'un simple stockage de fichiers bruts sur disque.
- **Interface d'administration incluse** : console web pratique pour visualiser/gérer les fichiers uploadés, utile en démo.
- **Léger et rapide à déployer** : une seule image Docker, démarre en quelques secondes, s'intègre facilement dans `docker-compose.yml` aux côtés du backend et de PostgreSQL.
- **URLs présignées** : permettent de donner un accès temporaire et sécurisé aux photos sans rendre le bucket public — pertinent si les photos ne doivent être visibles que par les membres d'un groupe.

**Alternative envisagée (écartée) :** stockage des photos comme fichiers bruts dans un volume Docker. Plus simple à mettre en place, mais moins scalable et moins pertinent à présenter comme choix d'architecture dans le cadre de l'évaluation.

---

## Conteneurisation : Docker

**Choix retenu : Docker + docker-compose**

**Pourquoi :**
- Permet de faire tourner l'ensemble de la stack (frontend, backend, PostgreSQL, MinIO) de façon reproductible, en local comme sur la VM de déploiement.
- Répond directement aux exigences du cours : environnement de déploiement et pipeline CI/CD fonctionnel avec démo.
- Facilite l'intégration continue : chaque service peut être testé indépendamment ou ensemble via GitLab CI.

---

## Déploiement : VM de l'école

**Choix retenu : VM fournie par l'école, exécutant les conteneurs via docker-compose**

**Pourquoi :**
- Solution simple et gratuite, suffisante pour les besoins du projet (MVP sur 3 semaines).
- Docker installé sur la VM permet de reproduire l'environnement de développement à l'identique en production.

**Points de vigilance identifiés :**
- Espace disque disponible (quota potentiellement limité pour le stockage des photos).
- Persistance du volume MinIO en cas de redémarrage/reset de la VM entre sessions.
- Configuration des variables d'environnement (`MINIO_ENDPOINT`, etc.) adaptée à l'IP/DNS de la VM plutôt qu'en dur dans le code.

---

## Base de données : PostgreSQL

**Choix retenu : PostgreSQL**

**Pourquoi :**
- Base de données relationnelle robuste et largement utilisée, suffisante pour les besoins du projet (utilisateurs, pays visités, groupes, métadonnées photos).
- Pas besoin d'extension géospatiale type PostGIS : le calcul "point dans polygone" (détection du pays visité à partir des coordonnées GPS) est fait en amont côté backend via `turf.js`, pas en base de données.

---

## Détection du pays visité

**Choix retenu : GeoJSON statique + calcul géométrique via `turf.js` (`@turf/boolean-point-in-polygon`) côté backend**

**Pourquoi :**
- Un jeu de données GeoJSON des contours de pays (type "geo-countries" sur GitHub ou Natural Earth) est chargé une fois dans le projet — pas besoin d'appel réseau à un service externe à chaque photo.
- Le calcul se fait au niveau du **pays** (et non d'une grille type H3), afin de garantir que les frontières soient toujours respectées : une photo prise près d'une frontière ne colore jamais deux pays à la fois.
- Alternative écartée : appel à un service externe type Overpass API, jugé trop complexe à mettre en place pour un MVP sur 3 semaines et introduisant une dépendance réseau externe non nécessaire.

---
