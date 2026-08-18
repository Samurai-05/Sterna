# Requirements fonctionnels

## 1. Priorités

Les exigences utilisent les priorités suivantes :

* **MUST** : nécessaire au MVP ;
* **SHOULD** : souhaitable si le temps le permet ;
* **COULD** : extension optionnelle.

---

## 2. Gestion des utilisateurs

### FR-01 - Création de compte

**Priorité : MUST**

Le système doit permettre à un utilisateur de créer un compte.

### FR-02 - Authentification

**Priorité : MUST**

Le système doit permettre à un utilisateur de se connecter et de se déconnecter.

### FR-03 - Profil

**Priorité : SHOULD**

Le système devrait afficher un profil contenant au minimum les principales statistiques d'exploration de l'utilisateur.

---

## 3. Gestion des photos et observations

### FR-04 - Import depuis la galerie

**Priorité : MUST**

L'utilisateur doit pouvoir sélectionner une photo depuis la galerie de son téléphone ou depuis le système de fichiers de son appareil directement depuis la PWA.

### FR-05 - Prise de photo

**Priorité : MUST**

L'utilisateur doit pouvoir prendre une photo depuis l'application lorsque le navigateur et l'appareil le permettent.

### FR-06 - Création d'une observation

**Priorité : MUST**

Une photo enregistrée doit pouvoir être transformée en observation contenant au minimum :

* la photo ;
* la latitude ;
* la longitude ;
* la date ;
* l'utilisateur ayant créé l'observation.

### FR-07 - Lecture des coordonnées GPS

**Priorité : MUST**

Lorsqu'une photo contient des coordonnées GPS exploitables dans ses métadonnées, l'application doit tenter de les utiliser pour proposer automatiquement la localisation de l'observation.

### FR-08 - Localisation manuelle

**Priorité : MUST**

Si aucune position GPS n'est disponible, ou si l'utilisateur souhaite la corriger, il doit pouvoir sélectionner manuellement une position sur la carte.

### FR-09 - Recherche d'un lieu

**Priorité : SHOULD**

Lors de la sélection manuelle d'une localisation, l'utilisateur devrait pouvoir rechercher une ville, une région ou un lieu afin de positionner plus facilement le marqueur.

### FR-10 - Source de la localisation

**Priorité : SHOULD**

Le système devrait enregistrer l'origine de la localisation :

* `exif` ;
* `current_gps` ;
* `manual`.

### FR-11 - Catégorie facultative

**Priorité : MUST**

Lors de la création d'une observation, l'utilisateur peut sélectionner facultativement une catégorie en une seule action. Si aucune catégorie n'est sélectionnée, l'observation est enregistrée comme « Non catégorisée ».

Catégories proposées :

* Paysages ;
* Monuments ;
* Gastronomie ;
* Faune ;
* Flore ;
* Culture ;
* Autre.

### FR-12 - Informations facultatives

**Priorité : SHOULD**

L'utilisateur devrait pouvoir ajouter un titre et une courte description à une observation.

### FR-13 - Suppression d'une observation

**Priorité : SHOULD**

L'utilisateur devrait pouvoir supprimer une observation qu'il a créée.

---

## 4. Carte

### FR-14 - Affichage de la carte

**Priorité : MUST**

L'application doit proposer une carte interactive constituant l'écran principal.

### FR-15 - Affichage des observations

**Priorité : MUST**

Les observations doivent être visibles sous forme de marqueurs sur la carte.

### FR-16 - Consultation d'une observation

**Priorité : MUST**

Un clic ou un toucher sur un marqueur doit permettre d'afficher au minimum :

* la photo ;
* l'auteur ;
* la date ;
* la catégorie.

### FR-17 - Pays visités

**Priorité : MUST**

Lorsqu'un utilisateur ajoute une observation dans un pays, ce pays doit être considéré comme visité et être marqué visuellement sur la carte.

Une seule observation dans un pays suffit à le considérer comme visité dans le cadre du MVP.

### FR-18 - Recentrage sur la position actuelle

**Priorité : SHOULD**

L'utilisateur devrait pouvoir recentrer la carte sur sa position actuelle.

### FR-19 - Filtrage par catégorie

**Priorité : SHOULD**

L'utilisateur devrait pouvoir filtrer les observations affichées selon leur catégorie.

---

## 5. Exploration et gamification

### FR-20 - Statistiques d'exploration

**Priorité : SHOULD**

Le système devrait afficher des statistiques simples, par exemple :

* nombre de découvertes ;
* nombre de pays visités ;
* nombre de points d'intérêt visités ;
* nombre de découvertes par catégorie.

### FR-21 - Progression d'exploration

**Priorité : SHOULD**

Le système devrait fournir une représentation simple de la progression d'exploration de l'utilisateur.

### FR-22 - Badges

**Priorité : SHOULD**

Le système devrait attribuer quelques badges simples lorsque certains objectifs sont atteints.

### FR-23 - Défis

**Priorité : COULD**

Le système pourrait proposer des défis incitant l'utilisateur à découvrir de nouveaux lieux ou de nouvelles catégories.

---

## 6. Gestion des groupes

### FR-24 - Création d'un groupe

**Priorité : MUST**

Un utilisateur doit pouvoir créer un groupe et lui attribuer un nom.

### FR-25 - Invitation

**Priorité : MUST**

Le créateur d'un groupe doit pouvoir inviter d'autres utilisateurs via un code ou un lien d'invitation.

### FR-26 - Rejoindre un groupe

**Priorité : MUST**

Un utilisateur doit pouvoir rejoindre un groupe à partir d'une invitation valide.

### FR-27 - Contexte de carte actif

**Priorité : MUST**

L'application doit maintenir un contexte de carte actif, correspondant soit à la carte personnelle de l'utilisateur, soit à la carte d'un des groupes auxquels il appartient.

### FR-28 - Liste des groupes

**Priorité : MUST**

L'utilisateur doit pouvoir consulter la liste des groupes auxquels il appartient, identifier le groupe actuellement actif et sélectionner un groupe afin d'en faire la carte active.

### FR-29 - Synchronisation du groupe actif

**Priorité : MUST**

Lorsqu'un utilisateur sélectionne une carte via l'écran des groupes, la Map doit automatiquement afficher les observations et les pays visités correspondants.

### FR-30 - Changement de carte depuis l'écran Map

**Priorité : MUST**

L'utilisateur doit pouvoir changer directement de carte depuis l'écran principal Map via un sélecteur, sans devoir passer par l'écran des groupes.

### FR-31 - Liste des membres

**Priorité : SHOULD**

Les membres d'un groupe devraient pouvoir consulter la liste des utilisateurs appartenant au groupe.

### FR-32 - Carte de groupe

**Priorité : MUST**

Chaque groupe doit disposer d'une carte commune affichant les observations associées au groupe.

### FR-33 - Ajout à une carte de groupe

**Priorité : MUST**

Un membre doit pouvoir ajouter une observation à la carte d'un groupe auquel il appartient.

### FR-34 - Destination lors de l'ajout d'une observation

**Priorité : MUST**

Lors de l'ajout d'une observation, l'application doit indiquer dans quelle carte elle sera enregistrée. L'utilisateur doit pouvoir modifier cette destination avant l'enregistrement.

### FR-35 - Auteur d'une observation

**Priorité : MUST**

Une observation de groupe doit conserver et afficher l'identité de son auteur.

### FR-36 - Quitter un groupe

**Priorité : SHOULD**

Un utilisateur devrait pouvoir quitter un groupe.

---

## 7. Stockage et accès aux médias

### FR-37 - Stockage des photos

**Priorité : MUST**

Les photos doivent être stockées dans un espace accessible au backend afin qu'elles puissent être affichées sur les cartes personnelles et de groupe.

### FR-38 - Référence des médias

**Priorité : MUST**

La base de données doit stocker une référence vers le fichier photo plutôt que dépendre du fichier local du téléphone de l'utilisateur.

### FR-39 - Optimisation des images

**Priorité : SHOULD**

Les photos devraient être redimensionnées ou compressées afin de limiter l'espace de stockage et le trafic réseau.

---

## 8. Recherche et navigation

### FR-40 - Recherche géographique

**Priorité : SHOULD**

L'utilisateur devrait pouvoir rechercher un lieu depuis l'écran de carte.

### FR-41 - Navigation principale

**Priorité : MUST**

La PWA doit proposer un accès clair aux sections principales :

* Carte ;
* Explorer ;
* Ajouter ;
* Groupes ;
* Profil.
