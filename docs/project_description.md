# Description du projet

## 1. Problématique

Lors de voyages ou de sorties, les utilisateurs prennent de nombreuses photos de paysages, monuments, plats animaux ou plantes. Cependant, ces photos sont généralement stockées dans une galerie sans réelle mise en contexte géographique et deviennent difficiles à retrouver ou à visualiser selon les endroits visités.

Les solutions existantes permettent souvent de consulter les photos individuellement ou de les classer chronologiquement, mais elles mettent peu en valeur la notion d’exploration géographique. Il est également difficile de visualiser simplement les régions déjà découvertes, de conserver une trace collective d’un voyage entre amis ou d’être encouragé à explorer de nouveaux endroits.

## 2. Solution proposée

Le projet consiste à développer une application mobile permettant aux utilisateurs de conserver, visualiser et partager leurs découvertes sur une carte interactive.

L'utilisateur peut prendre une photo directement depuis l'application ou importer une photo depuis la galerie de son téléphone. Chaque photo est associée à une position géographique et apparaît ensuite sur une carte.

L'application transforme ainsi les photos en découvertes géolocalisées. Les zones visitées sont mises en évidence sur la carte afin de visualiser progressivement son exploration du monde. Une dimension ludique encourage également l'utilisateur à découvrir de nouvelles régions.

Enfin, les utilisateurs peuvent créer des groupes afin de disposer d'une carte commune regroupant les découvertes réalisées lors d'un voyage ou d'une activité partagée.

## 3. Objectifs

Les objectifs principaux du projet sont :

- permettre à un utilisateur de construire une carte personnelle de ses découvertes ;
- permettre l'ajout de photos depuis l'appareil photo ou la galerie ;
- géolocaliser automatiquement une photo lorsque des coordonnées GPS sont disponibles ;
- permettre à l'utilisateur de choisir manuellement le lieu lorsque la géolocalisation est absente ou incorrecte ;
- visualiser les zones déjà explorées directement sur la carte ;
- permettre à l'utilisateur de classer les découvertes dans des catégories simples ;
- permettre à plusieurs utilisateurs de créer une carte collaborative via des groupes ;
- ajouter une dimension ludique afin d'encourager l'exploration de nouvelles régions.

## 4. Concepts principaux

### Observations

Une **observation** correspond à une découverte enregistrée par un utilisateur.

Une observation contient au minimum :

- une photo ;
- une latitude ;
- une longitude ;
- une date ;
- un auteur.

Elle peut également contenir :

- une catégorie ;
- un titre ;
- une description ;
- une appartenance à un groupe.

### Catégories

Les catégories sont facultatives et doivent pouvoir être sélectionnées en un clic :

- Faune ;
- Flore ;
- Gastronomie ;
- Patrimoine ;
- Paysages ;
- Culture ;
- Autre.

L'utilisateur peut ainsi enregistrer rapidement une photo sans être obligé de compléter plusieurs champs.

## 5. Carte et exploration

La carte constitue l’écran principal de l’application.

Chaque observation y est représentée par un marqueur. Lorsqu’un utilisateur ajoute une observation dans un pays, ce pays est considéré comme visité et est coloré sur la carte.

Pour le MVP, une seule observation suffit donc à marquer l’ensemble du pays comme exploré.

À terme, cette représentation pourra évoluer vers un système plus précis, basé par exemple sur les régions visitées ou un découpage en cellules.

## 6. Dimension ludique

L'application a pour but d'encourager l'utilisateur à découvrir de nouveaux lieux plutôt qu'à simplement accumuler des photos.

Pour renforcer cette dimension ludique, l'application affiche sur la carte une sélection de points d’intérêt emblématiques prédéfinis. Ces lieux servent d’objectifs de découverte visibles directement sur la carte.

Lorsqu’un utilisateur ajoute une observation suffisamment proche d’un point d’intérêt, celui-ci peut être considéré comme visité et contribuer à sa progression.

La première version pourra notamment afficher dans le profil de l’utilisateur les statistiques suivantes :

- le nombre de pays visités ;
- le nombre de points d’intérêt visités ;
- le nombre de découvertes par catégorie ;
- une progression globale d’exploration ;
- quelques badges simples.

Pour le MVP, seule une sélection limitée de points d’intérêt connus sera intégrée. Cette liste pourra être enrichie ultérieurement.

Les défis, recommandations, classements avancés ou collections spécifiques à une région sont considérés comme des extensions possibles.

## 7. Gestion des groupes

Un utilisateur peut créer ou rejoindre un groupe afin de partager une carte avec plusieurs personnes.

Chaque membre du groupe peut ajouter des observations à la carte commune. Une observation conserve son auteur afin de savoir qui l'a ajoutée.

Les fonctionnalités de groupe prévues pour le MVP sont :

- création d'un groupe ;
- invitation via un lien ou un code ;
- rejoindre un groupe ;
- afficher les membres ;
- ajouter une observation sur la carte du groupe ;
- visualiser les observations des autres membres ;
- quitter un groupe.

Les fonctionnalités de réseau social telles que commentaires, likes ou notifications ne font pas partie du MVP.

## 8. Parcours utilisateur principal

### Ajouter une découverte

1. L'utilisateur ouvre une carte.
2. Il sélectionne **Ajouter**.
3. Il choisit entre :
   - prendre une photo ;
   - importer une photo depuis sa galerie.
4. L'application tente de récupérer les coordonnées GPS de la photo.
5. Si les coordonnées sont disponibles, elles sont proposées à l'utilisateur.
6. Si elles sont absentes ou incorrectes, l'utilisateur sélectionne manuellement le lieu sur la carte.
7. Il peut éventuellement choisir une catégorie.
8. Il enregistre l'observation.
9. La photo apparaît sur la carte personnelle ou sur la carte du groupe sélectionné.

### Consulter une découverte

1. L'utilisateur ouvre une carte.
2. Il sélectionne un marqueur.
3. L'application affiche la photo et les principales informations de l'observation.

## 9. Interface utilisateur

Une barre de navigation regroupant les principales fonctionnalités de l’application permettra à l’utilisateur d’accéder rapidement aux différents espaces :

- Carte ;
- Explorer ;
- Ajouter ;
- Groupes ;
- Profil.

Sur la carte, des actions contextuelles peuvent également être proposées :

- recherche d'un lieu ;
- filtres par catégorie ;
- recentrage sur la position actuelle.

## 10. Périmètre du MVP

Le MVP doit prioritairement permettre :

- authentification des utilisateurs ;
- ajout et stockage de photos ;
- récupération ou saisie manuelle de la localisation ;
- affichage des observations sur une carte ;
- visualisation des zones explorées ;
- catégories facultatives ;
- carte personnelle ;
- création et utilisation d'une carte de groupe ;
- statistiques simples d'exploration.

## 11. Hors périmètre du MVP

Les éléments suivants sont volontairement exclus de la première version :

- exploration plus détaillée de la carte (basée sur les régions) ;
- recommandations personnalisées ;
- défis avancés ;
- reconnaissance automatique détaillée des catégories ;
- réseau social public ;
- commentaires et likes ;
- fonctionnement hors ligne complet ;
- application mobile native distribuée sur les stores ;
