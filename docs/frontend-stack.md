# Sterna — Scope

## Objectif du MVP

Le MVP doit valider le concept principal de Sterna :

> Un utilisateur peut enregistrer les endroits qu'il visite et voir progressivement sa carte du monde se révéler.

---

# MVP — Must Have

Ces fonctionnalités doivent fonctionner.

## Carte à débloquer

- afficher une carte ;
- représenter visuellement les zones non explorées ;
- représenter visuellement les zones explorées ;
- mettre à jour la carte lorsqu'une nouvelle visite est enregistrée.

## Localisation GPS

- obtenir la position actuelle de l'utilisateur ;
- demander les permissions Android nécessaires ;
- utiliser cette position lors de l'enregistrement d'une visite.

## Enregistrer une visite

- permettre à l'utilisateur d'enregistrer une nouvelle visite ;
- conserver la localisation ;
- conserver la date ;
- retrouver ensuite cette visite.

## Photos

- permettre d'ajouter une ou plusieurs photos à une visite ;
- associer correctement les photos à la visite.

## Photos et visites sur la carte

- afficher les visites sur la carte ;
- sélectionner une visite ;
- retrouver les photos liées à cette visite.

## Profil

- posséder un profil utilisateur ;
- consulter les informations principales liées à son exploration.

## Progression / statistiques

Afficher au minimum quelques statistiques simples, par exemple :

- nombre de visites ;
- nombre de lieux découverts ;
- nombre de zones explorées.

---

# Nice to Have

Ces fonctionnalités peuvent être développées si le MVP principal est suffisamment avancé.

## Groupes

- créer un groupe ;
- rejoindre un groupe ;
- voir ses membres.

## Collections

Créer des collections de lieux.

Exemple :

**Châteaux du canton de Vaud : 8 / 54**

## Quêtes

Proposer des objectifs d'exploration.

## POI à proximité

Afficher les lieux intéressants situés autour de l'utilisateur.

## POI visités

Permettre de marquer un POI précis comme visité.

## Carte commune

Fusionner les visites des membres d'un groupe sur une carte.

## Progression collective

Afficher des statistiques calculées à partir des découvertes de tous les membres du groupe.

## Partage

Permettre aux utilisateurs de partager certaines visites avec leurs amis.

---

# Hors scope

Ne sont pas nécessaires au MVP :

- iOS ;
- tracking GPS permanent ;
- reconnaissance automatique des plantes ;
- reconnaissance automatique des animaux ;
- reconnaissance automatique de nourriture ;
- reconnaissance automatique universelle des monuments ;
- feed social complet ;
- chat ;
- recommandations avancées ;
- génération automatique de quêtes ;
- classements globaux ;
- système avancé de badges.

---

# Scénario minimum à faire fonctionner

Le MVP est considéré comme fonctionnel si ce scénario fonctionne correctement :

1. L'utilisateur ouvre Sterna.
2. Sa carte est affichée.
3. L'utilisateur se trouve dans un nouvel endroit.
4. Il enregistre sa visite.
5. Sa position GPS est utilisée.
6. Il ajoute une photo.
7. La visite apparaît sur sa carte.
8. La zone correspondante devient explorée.
9. Ses statistiques sont mises à jour.

---

# Règle de priorité

En cas de manque de temps :

**MVP stable > nouvelles fonctionnalités.**

Les fonctionnalités Nice to Have ne doivent jamais mettre en danger le fonctionnement de la boucle principale.





# Sterna — Product Vision

## Vision

Sterna veut transformer l'exploration du monde réel en une expérience de progression.

L'utilisateur ne doit pas simplement regarder une carte.

Il doit avoir envie de la **compléter**.

---

# Promesse

> Explore le monde et construis progressivement la carte de tout ce que tu as réellement découvert.

---

# Piliers du produit

## 1. Explore

Découvrir physiquement de nouveaux endroits.

## 2. Remember

Conserver les visites et leurs photos.

## 3. Progress

Voir sa carte se remplir progressivement.

## 4. Collect

Compléter des ensembles de lieux ou de découvertes.

## 5. Challenge

Recevoir des objectifs donnant envie d'explorer davantage.

## 6. Together

Partager et combiner son exploration avec celle de ses amis.

---

# Exemple d'expérience

Un utilisateur part passer une journée dans le canton de Vaud.

Il ouvre Sterna au Château de Chillon.

Il enregistre sa visite et ajoute trois photos.

Sterna lui indique :

**Nouveau lieu découvert**

Château de Chillon

Sa carte est mise à jour.

Dans une version disposant des collections :

**Châteaux du canton de Vaud**

8 / 54 visités

Il continue ensuite son voyage.

Quelques mois plus tard, il peut ouvrir sa carte et retrouver immédiatement :

- le Château de Chillon ;
- la date de sa visite ;
- ses photos ;
- sa progression.

---

# Motivation utilisateur

Sterna doit exploiter plusieurs motivations.

## Curiosité

> Qu'est-ce que je n'ai pas encore découvert autour de moi ?

## Progression

> J'ai exploré cette région à 62 %.

## Complétion

> Il ne me manque que deux châteaux.

## Souvenir

> Qu'avais-je visité ici ?

## Social

> Quel groupe d'amis a découvert le plus d'endroits ?

## Coopération

> Ensemble, nous avons visité tous les cantons suisses.

---

# Carte comme interface principale

La carte n'est pas seulement un moyen de naviguer.

Elle représente la progression de l'utilisateur.

La différence entre :

**non exploré**

et

**exploré**

doit être immédiatement compréhensible.

La révélation progressive de la carte constitue l'une des principales récompenses visuelles du produit.

---

# Collections

Les collections permettent de transformer des données géographiques en objectifs.

Exemples :

### Géographiques

- cantons suisses ;
- capitales européennes ;
- parcs nationaux ;
- sites UNESCO.

### Culturelles

- châteaux ;
- monuments ;
- musées.

### Nature

- sommets ;
- lacs ;
- cascades.

### Lifestyle

- restaurants ;
- cafés ;
- marchés.

### Computer Vision — futur

- plantes ;
- animaux ;
- oiseaux ;
- plats.

---

# Social

La dimension sociale doit principalement renforcer l'exploration.

Sterna ne cherche pas prioritairement à créer un nouveau feed social.

Les fonctionnalités sociales intéressantes sont plutôt :

- voir les découvertes d'un ami ;
- comparer les cartes ;
- créer un groupe ;
- fusionner les cartes ;
- compléter une collection ensemble ;
- participer à des quêtes communes.

---

# Groupes

Un groupe possède potentiellement :

- membres ;
- carte collective ;
- statistiques ;
- collections ;
- quêtes.

Exemple :

## Groupe — Roadtrip 2026

Pays visités : 11

Lieux : 126

Châteaux du canton de Vaud : 32 / 54

Carte explorée : ...

---

# Direction Data Science

Sterna peut progressivement exploiter plusieurs domaines de Data Science.

## Géospatial

- analyse spatiale ;
- clustering ;
- couverture géographique ;
- recommandation de lieux ;
- scoring d'exploration.

## Computer Vision

Reconnaissance de :

- plantes ;
- animaux ;
- monuments ;
- nourriture.

## Recommandation

À partir des visites précédentes :

> Tu sembles aimer les châteaux et les lieux historiques. Voici trois endroits non visités à proximité.

## Génération de quêtes

Créer des objectifs adaptés à :

- localisation ;
- historique ;
- collections ;
- préférences ;
- niveau de progression.

Ces fonctionnalités sont des extensions possibles et ne doivent pas être artificiellement ajoutées uniquement pour pouvoir dire que Sterna utilise de l'IA.

---

# Principes produit

## Simple avant intelligent

Une fonctionnalité simple et fiable est préférable à une fonctionnalité IA complexe qui fonctionne mal.

## Le GPS détermine où se trouve l'utilisateur

La Computer Vision n'est pas nécessaire pour géolocaliser une visite.

## Une photo est un souvenir avant d'être une donnée ML

L'utilisateur doit pouvoir apprécier Sterna même sans reconnaissance d'image.

## Exploration volontaire

Sterna n'est pas un tracker permanent des déplacements.

## Progression visible

Chaque nouvelle visite doit produire une conséquence visible dans l'application.

## Monde réel avant feed

L'objectif principal est d'inciter l'utilisateur à explorer, pas à rester longtemps dans l'application.

---

# Vision long terme

À terme, un utilisateur pourrait posséder plusieurs progressions simultanées.

Exemple :

## François

**World Explorer**
12 pays

**Castles**
84 découverts

**Plants**
132 espèces

**Animals**
47 espèces

**Food**
86 plats

**UNESCO**
19 sites

Chaque nouvelle expérience réelle enrichit ainsi son profil Sterna.

---

# Idée fondamentale

Sterna doit progressivement répondre à trois questions :

> **Où suis-je allé ?**

> **Qu'est-ce que j'y ai découvert ?**

> **Qu'est-ce qu'il me reste à explorer ?**
