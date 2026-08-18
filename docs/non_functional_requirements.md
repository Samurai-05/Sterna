# Requirements non fonctionnels

## 1. Plateforme et compatibilité

### NFR-01 - Progressive Web App
L'application doit être développée sous forme de **PWA**.

### NFR-02 - Mobile-first
L'interface doit être conçue prioritairement pour une utilisation sur smartphone.

### NFR-03 - Responsive design
L'application doit rester utilisable sur différentes tailles d'écran, notamment smartphone, tablette et ordinateur.

### NFR-04 - Navigateurs modernes
La PWA doit fonctionner sur les versions récentes des principaux navigateurs modernes compatibles avec les fonctionnalités nécessaires.

---

## 2. Utilisabilité

### NFR-05 - Ajout rapide d'une observation
Le nombre d'étapes nécessaires entre la sélection d'une photo et son enregistrement doit être réduit au minimum.

### NFR-06 - Catégories non bloquantes
La sélection d'une catégorie ne doit jamais empêcher l'enregistrement d'une observation.

### NFR-07 - Correction de localisation
L'utilisateur doit pouvoir corriger facilement une localisation proposée automatiquement.

### NFR-08 - Interface tactile
Les éléments interactifs principaux doivent être suffisamment grands et espacés pour une utilisation tactile sur smartphone.

---

## 3. Performance

### NFR-09 - Chargement initial
La page principale doit rester suffisamment légère pour être utilisable sur une connexion mobile classique.

### NFR-10 - Chargement des images
Les images affichées sur la carte ne doivent pas nécessiter systématiquement le téléchargement de leur version originale en pleine résolution.

### NFR-11 - Chargement progressif
Les photos et observations devraient être chargées progressivement lorsque cela est pertinent afin d'éviter de charger inutilement toutes les données d'un utilisateur ou d'un groupe.

### NFR-12 - Carte fluide
Le déplacement et le zoom sur la carte doivent rester fluides pour un nombre raisonnable d'observations correspondant au périmètre du MVP.

---

## 4. Stockage des données

### NFR-13 - Séparation des médias et des métadonnées
Les fichiers photo doivent être séparés des données structurées des observations.

La base relationnelle peut par exemple conserver une URL, un chemin ou un identifiant vers le média.

### NFR-14 - Indépendance vis-à-vis du cloud
L'architecture ne doit pas imposer l'utilisation d'un fournisseur cloud.

Le stockage des photos doit pouvoir être réalisé :

- sur le système de fichiers du serveur ;
- dans un object storage auto-hébergé ;
- ou dans un service cloud si nécessaire.

### NFR-15 - Données géographiques
Le système de persistance doit permettre de stocker proprement des coordonnées géographiques et d'effectuer les traitements nécessaires à la carte.

---

## 5. Sécurité

### NFR-16 - Authentification
Les routes et données privées doivent être accessibles uniquement aux utilisateurs authentifiés lorsque cela est nécessaire.

### NFR-17 - Autorisation des groupes
Un utilisateur ne doit pas pouvoir accéder aux données d'un groupe dont il n'est pas membre.

### NFR-18 - Modification des observations
Un utilisateur ne doit pas pouvoir modifier ou supprimer une observation appartenant à un autre utilisateur sans règle explicite l'y autorisant.

### NFR-19 - Validation des fichiers
Le backend doit vérifier les fichiers envoyés afin de limiter l'upload à des formats d'image acceptés et à une taille raisonnable.

### NFR-20 - Gestion des secrets
Les mots de passe, clés API et autres secrets ne doivent pas être stockés directement dans le code source ou dans le dépôt Git.

---

## 6. Protection des données et vie privée

### NFR-21 - Données de localisation
Les coordonnées GPS doivent être considérées comme des données potentiellement sensibles.

### NFR-22 - Contrôle de la visibilité
Une observation personnelle ne doit pas être rendue accessible à d'autres utilisateurs par défaut.

### NFR-23 - Partage volontaire
Une observation ne doit apparaître sur une carte de groupe que si elle a été explicitement associée à ce groupe.

### NFR-24 - Métadonnées des images
Les métadonnées EXIF non nécessaires au fonctionnement de l'application devraient être supprimées ou ignorées lors du stockage final.

---

## 7. Maintenabilité

### NFR-25 - Séparation des responsabilités
L'application doit séparer clairement :

- le frontend ;
- l'API/backend ;
- la base de données ;
- le stockage des photos.

### NFR-26 - API
Les principales opérations de l'application doivent être accessibles au frontend via une API clairement définie.

### NFR-27 - Versionnement
Le code source doit être versionné avec Git.

### NFR-28 - Documentation
Le dépôt doit contenir une documentation permettant au minimum :

- d'installer le projet ;
- de configurer les dépendances ;
- de lancer l'application ;
- de comprendre l'architecture générale.

### NFR-29 - Configuration externe
Les paramètres dépendant de l'environnement doivent pouvoir être configurés sans modifier le code source.

---

## 8. Fiabilité

### NFR-30 - Cohérence entre média et observation
Le système doit éviter qu'une observation référence une photo inexistante ou qu'un fichier inutilisé reste stocké après une opération échouée.

### NFR-31 - Gestion des erreurs d'upload
Une erreur lors de l'envoi d'une photo doit être signalée clairement à l'utilisateur sans créer une observation incomplète.

### NFR-32 - Erreur de géolocalisation
L'absence de coordonnées GPS ou le refus de l'accès à la localisation ne doit pas empêcher l'utilisateur d'ajouter une observation grâce à la sélection manuelle du lieu.

---

## 9. Accessibilité

### NFR-33 - Lisibilité
Les textes, icônes et informations importantes doivent présenter un contraste suffisant et rester lisibles sur smartphone.

### NFR-34 - Information non dépendante uniquement de la couleur
L'état d'une observation ou d'une catégorie ne doit pas être communiqué uniquement par une couleur lorsque cette information est essentielle.

---

## 10. Contraintes de projet

### NFR-35 - Périmètre maîtrisé
La première version doit rester réalisable dans le temps disponible pour le projet.

Les fonctionnalités avancées doivent être conçues comme des extensions et ne doivent pas compromettre le fonctionnement du cœur du MVP.

### NFR-36 - Architecture extensible
L'architecture doit permettre d'ajouter ultérieurement des fonctionnalités telles que :

- grille d'exploration plus précise ;
- recommandations personalisées ;
- défis ;
- reconnaissance automatique des catégories ;
- statistiques avancées ;
- fonctionnalités sociales supplémentaires.
