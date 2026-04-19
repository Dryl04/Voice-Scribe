# VoiceScribe

VoiceScribe est une application web de dictée vocale construite avec React, Vite, Tailwind CSS et Supabase. Elle permet de transcrire la voix en texte depuis le navigateur, de relire le résultat, de le copier, puis de le sauvegarder dans une base Supabase si l'utilisateur est authentifié.

Le projet fonctionne comme une SPA front-end. Il n'y a pas de serveur applicatif dédié dans ce dépôt: la logique métier vit dans le navigateur, tandis que l'authentification et la persistance des notes sont déléguées à Supabase.

## État du projet

Analyse réalisée le 19 avril 2026 à partir de l'inspection directe du code source, de la configuration Vite/TypeScript, des composants React, des hooks métiers, du service Supabase et de la migration SQL présente dans le dépôt.

Conclusion synthétique:

- Le projet est un MVP fonctionnel de speech-to-text côté client.
- La transcription locale est prise en charge via Transformers.js pour les modèles Whisper.
- La sauvegarde des notes dépend d'une authentification Supabase.
- L'application est exploitable en développement, mais il reste plusieurs points de durcissement avant un usage production large.

## Méthode d'analyse

Cette documentation suit une démarche volontairement rigoureuse:

1. Observation: lecture des fichiers structurants du dépôt, notamment `package.json`, `src/App.tsx`, `src/hooks/use-stt.ts`, `src/lib/stt-engine.ts`, `src/lib/notes-service.ts`, `src/lib/supabase.ts` et la migration SQL Supabase.
2. Vérification croisée: comparaison entre ce que l'interface suggère et ce que le code exécute réellement.
3. Distinction entre faits et inférences: ce README évite d'affirmer des comportements qui ne sont pas directement observables dans le dépôt.
4. Signalement des limites: quand un point n'est pas implémenté, testé ou garanti par le code, il est indiqué comme tel.

## Ce que fait réellement l'application

Fonctionnalités observées dans le code:

- Transcription vocale depuis le navigateur.
- Sélection d'un moteur de reconnaissance vocale.
- Affichage de l'état courant: prêt, chargement, écoute, traitement, erreur.
- Affichage d'une progression de chargement pour les modèles Whisper.
- Zone de transcription éditable manuellement.
- Copie du texte transcrit dans le presse-papiers.
- Sauvegarde des notes dans Supabase pour les utilisateurs connectés.
- Liste des notes sauvegardées avec copie et suppression.
- Authentification email/mot de passe via Supabase.
- Thème clair, sombre ou système.
- Fenêtre flottante de prise de notes, déplaçable et minimisable.

Fonctionnalités non observées dans le code:

- Aucun backend Node ou API propriétaire.
- Aucun système de tests automatisés.
- Aucun script de linting.
- Aucune édition de note déjà sauvegardée.
- Aucun partage, export de fichier, tags, recherche ou pagination des notes.
- Aucune synchronisation temps réel.

## Flux fonctionnel

Le flux principal est le suivant:

1. L'utilisateur ouvre l'application.
2. Il choisit un moteur de transcription dans l'onglet `Settings`.
3. Il clique sur le bouton microphone.
4. L'application demande l'accès au micro via `navigator.mediaDevices.getUserMedia`.
5. Le texte transcrit s'affiche dans la zone principale.
6. L'utilisateur peut corriger manuellement le texte, le copier, l'effacer ou le sauvegarder.
7. S'il sauvegarde sans être connecté, une boîte de dialogue d'authentification s'ouvre.
8. Une fois connecté, il peut consulter ses notes dans l'onglet `Notes`.

## Architecture

### Vue d'ensemble

```text
Navigateur
  ├─ UI React + composants shadcn/ui
  ├─ Hook métier useSTT
  ├─ Moteur STTEngine
  │    ├─ Web Speech API
  │    └─ Transformers.js + modèles Whisper
  ├─ AuthProvider
  │    └─ Supabase Auth
  └─ Notes service
       └─ Supabase Postgres (table notes)
```

### Responsabilités des fichiers clés

| Fichier                                                     | Rôle observé                                                                                                                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/main.tsx`                                              | Monte l'application et injecte les providers de thème et d'authentification.                                                                                             |
| `src/App.tsx`                                               | Orchestration UI principale, gestion de l'état local, actions utilisateur, injection de transcription dans les champs actifs, rendu des onglets et de la note flottante. |
| `src/hooks/use-stt.ts`                                      | Expose l'API applicative de transcription: statut, modèle, progression, texte final, texte intermédiaire, démarrage, arrêt, changement de modèle et nettoyage.           |
| `src/lib/stt-engine.ts`                                     | Contient le coeur métier STT et choisit entre Web Speech API et Whisper via Transformers.js.                                                                             |
| `src/lib/stt-models.ts`                                     | Déclare les modèles disponibles et leur métadonnée d'affichage.                                                                                                          |
| `src/lib/notes-service.ts`                                  | Gère la sauvegarde, la lecture et la suppression des notes dans Supabase.                                                                                                |
| `src/lib/supabase.ts`                                       | Instancie le client Supabase à partir des variables d'environnement Vite.                                                                                                |
| `src/components/auth-provider.tsx`                          | Fournit le contexte d'authentification et l'état de session.                                                                                                             |
| `src/components/auth-dialog.tsx`                            | Implémente l'interface de connexion et de création de compte.                                                                                                            |
| `src/components/saved-notes-list.tsx`                       | Liste les notes de l'utilisateur connecté.                                                                                                                               |
| `supabase/migrations/20260418191449_create_notes_table.sql` | Définit la table `notes`, active la RLS et crée les politiques d'accès.                                                                                                  |

## Pile technique

### Front-end

- React 19
- TypeScript 5.9
- Vite 7
- Tailwind CSS 4
- shadcn/ui
- Lucide React
- Sonner pour les notifications

### Speech-to-text

- Web Speech API du navigateur
- `@huggingface/transformers` pour les modèles Whisper exécutés côté client

### Persistance et authentification

- `@supabase/supabase-js`
- Supabase Auth
- Supabase Postgres

## Moteurs de transcription

Les modèles déclarés dans le dépôt sont les suivants:

| Identifiant     | Type            | Taille annoncée | Comportement observé                                                                       |
| --------------- | --------------- | --------------- | ------------------------------------------------------------------------------------------ |
| `web-speech`    | API navigateur  | `0 MB`          | Démarre rapidement, fournit du texte intermédiaire et final, dépend du support navigateur. |
| `whisper-tiny`  | Transformers.js | `~40 MB`        | Chargement local d'un modèle Whisper, transcription après arrêt de l'enregistrement.       |
| `whisper-base`  | Transformers.js | `~75 MB`        | Même principe avec un compromis précision/poids différent.                                 |
| `whisper-small` | Transformers.js | `~250 MB`       | Modèle plus lourd, potentiellement plus précis, plus coûteux au chargement.                |

### Point important sur le temps réel

Le code ne donne pas le même comportement selon le moteur choisi:

- Avec `Web Speech API`, l'application affiche du texte intermédiaire pendant la dictée.
- Avec `Whisper`, l'application enregistre l'audio via `MediaRecorder`, puis lance la transcription surtout à l'arrêt. Il n'y a pas de flux partiel équivalent dans l'implémentation actuelle.

### Point important sur le mode hors ligne

L'interface affirme que l'application "works offline", mais il faut préciser ce que le code garantit réellement:

- La branche Whisper exécute bien l'inférence côté client, sans backend du dépôt.
- Le premier chargement d'un modèle Whisper reste coûteux et dépend de la disponibilité des artefacts du modèle.
- Le dépôt ne contient pas de stratégie applicative explicite de cache documentaire ou de préchargement.
- La branche `Web Speech API` dépend du navigateur et de son implémentation, donc son comportement hors ligne ne peut pas être garanti uniformément à partir du seul code source.

## Authentification et persistance

### Authentification

L'authentification repose sur Supabase avec email et mot de passe.

Comportement observé:

- L'application charge la session au démarrage.
- Elle écoute les changements d'état d'authentification via `supabase.auth.onAuthStateChange`.
- L'inscription est suivie d'une tentative de connexion automatique.
- Le bouton utilisateur affiche le préfixe de l'email lorsque l'utilisateur est connecté.

### Notes sauvegardées

La sauvegarde n'est disponible que pour les utilisateurs authentifiés.

Comportement observé:

- Le titre est généré à partir des deux premiers mots du transcript.
- Le modèle source est enregistré.
- Les notes sont listées par date décroissante.
- Les notes peuvent être copiées ou supprimées.
- Les notes ne peuvent pas être modifiées depuis l'interface actuelle.

### Sécurité des accès aux notes

Le service client `getNotes()` n'applique pas de filtre `user_id` côté front. L'isolation des données repose donc sur la Row Level Security Supabase, ce qui est cohérent avec la migration SQL fournie.

## Schéma de données observé

La migration SQL crée une table `notes` avec les colonnes suivantes:

| Colonne            | Type          | Observation                                                                                    |
| ------------------ | ------------- | ---------------------------------------------------------------------------------------------- |
| `id`               | `uuid`        | Clé primaire générée automatiquement.                                                          |
| `user_id`          | `uuid`        | Référence `auth.users(id)`, suppression en cascade.                                            |
| `title`            | `text`        | Par défaut chaîne vide.                                                                        |
| `content`          | `text`        | Contenu transcrit.                                                                             |
| `source_model`     | `text`        | Nom ou identifiant du moteur utilisé.                                                          |
| `duration_seconds` | `integer`     | Présente dans le schéma, mais non renseignée par le code actuel, donc reste à `0` par défaut.  |
| `created_at`       | `timestamptz` | Remplie automatiquement à l'insertion.                                                         |
| `updated_at`       | `timestamptz` | Valeur initiale définie, mais aucun trigger d'auto-mise à jour n'est fourni dans la migration. |

Politiques observées:

- Lecture: un utilisateur authentifié peut lire ses propres notes.
- Insertion: un utilisateur authentifié peut insérer ses propres notes.
- Mise à jour: un utilisateur authentifié peut mettre à jour ses propres notes.
- Suppression: un utilisateur authentifié peut supprimer ses propres notes.

## Particularités d'interface importantes

### Injection de texte dans le champ actif

`src/App.tsx` contient une logique qui surveille le focus du document. Si un champ texte est actif et qu'il n'est pas marqué comme champ interne VoiceScribe, le transcript final est fusionné dans ce champ.

Implications pratiques:

- Le comportement est limité au document courant.
- Ce n'est pas un outil de dictée globale au niveau système d'exploitation.
- Les champs internes de l'application sont exclus via des attributs `data-voicescribe-*`.
- Tout autre champ texte présent dans la page peut théoriquement devenir la cible de la dictée.

### Note flottante

La note flottante:

- peut être affichée ou masquée depuis l'interface principale;
- est déplaçable à la souris;
- peut être minimisée;
- affiche le texte final, ainsi que le texte intermédiaire lorsqu'il existe;
- permet copier, sauvegarder ou effacer le contenu.

### Thème

Le thème peut être changé de trois manières observées:

- via le menu de thème en haut de l'interface;
- via la préférence système si le mode `system` est choisi;
- via la touche `d` lorsque le focus n'est pas dans un champ éditable.

## Structure du projet

```text
project/
├─ public/
│  └─ vite.svg
├─ src/
│  ├─ components/
│  │  ├─ auth-dialog.tsx
│  │  ├─ auth-provider.tsx
│  │  ├─ floating-note.tsx
│  │  ├─ model-info-panel.tsx
│  │  ├─ model-selector.tsx
│  │  ├─ recording-button.tsx
│  │  ├─ saved-notes-list.tsx
│  │  ├─ status-indicator.tsx
│  │  ├─ theme-provider.tsx
│  │  ├─ user-menu.tsx
│  │  └─ ui/
│  ├─ hooks/
│  │  ├─ use-auth.ts
│  │  ├─ use-mobile.ts
│  │  └─ use-stt.ts
│  ├─ lib/
│  │  ├─ notes-service.ts
│  │  ├─ stt-engine.ts
│  │  ├─ stt-models.ts
│  │  ├─ supabase.ts
│  │  └─ utils.ts
│  ├─ types/
│  │  └─ speech-recognition.d.ts
│  ├─ App.tsx
│  ├─ index.css
│  └─ main.tsx
├─ supabase/
│  └─ migrations/
│     └─ 20260418191449_create_notes_table.sql
├─ components.json
├─ index.html
├─ package.json
├─ tsconfig.json
└─ vite.config.ts
```

## Installation

### Prérequis

- Node.js LTS récent
- npm
- Un projet Supabase actif si vous voulez utiliser l'authentification et la sauvegarde
- Un navigateur moderne avec accès micro

### Dépendances

```bash
npm install
```

### Variables d'environnement

L'application attend au minimum:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Remarques importantes:

- Un fichier `.env` existe déjà dans le dépôt au moment de l'analyse.
- Pour un dépôt partagé ou public, il est préférable de remplacer ce fichier par un `.env.example` et de gérer les vraies valeurs via l'environnement local ou la plateforme de déploiement.
- La clé `anon` Supabase est pensée pour être publique côté client, mais sa sécurité dépend de la configuration RLS et des règles du projet Supabase.

### Base de données Supabase

Le dépôt contient une migration SQL, mais pas une initialisation Supabase locale complète avec configuration CLI observable.

Approche minimale:

1. Créer un projet Supabase.
2. Activer l'authentification email/mot de passe.
3. Exécuter le contenu de `supabase/migrations/20260418191449_create_notes_table.sql` dans l'éditeur SQL Supabase.
4. Renseigner les variables d'environnement Vite.

## Lancement

### Développement

```bash
npm run dev
```

Par défaut, Vite exposera l'application sur une URL du type `http://localhost:5173`.

### Vérification de types

```bash
npm run typecheck
```

### Build de production

```bash
npm run build
```

### Prévisualisation du build

```bash
npm run preview
```

## Guide d'utilisation

1. Ouvrir l'application.
2. Choisir le moteur souhaité dans `Settings`.
3. Autoriser le microphone si le navigateur le demande.
4. Cliquer sur le bouton micro pour démarrer.
5. Parler.
6. Relire et corriger le transcript si nécessaire.
7. Utiliser `Copy` pour copier le texte.
8. Utiliser `Save Note` pour enregistrer la note dans Supabase après connexion.
9. Consulter l'onglet `Notes` pour revoir, copier ou supprimer les notes sauvegardées.

## Compatibilité et prérequis navigateur

Le code suppose la disponibilité de plusieurs API navigateur:

- `navigator.mediaDevices.getUserMedia`
- `MediaRecorder`
- `SpeechRecognition` ou `webkitSpeechRecognition` pour le moteur Web Speech
- `localStorage`
- `Clipboard API`

Conséquences:

- Le comportement sera meilleur sur des navigateurs modernes.
- Le moteur `Web Speech API` ne doit pas être considéré comme universellement portable.
- Les modèles Whisper seront plus exigeants en CPU, mémoire et temps de chargement.

## Observations qualité et dette technique

Points observés pendant l'analyse:

- Le nom du package est encore `shadcn-ui-template`, ce qui ne reflète pas le produit `VoiceScribe`.
- Le dépôt ne contient ni tests automatisés, ni pipeline CI, ni script de lint.
- `duration_seconds` est prévu côté base mais pas encore alimenté par l'application.
- `updated_at` n'est pas maintenu par trigger SQL dans la migration fournie.
- Le dépôt contient de nombreux composants `shadcn/ui` générés mais non utilisés par la fonctionnalité actuelle.
- `index.html` utilise encore l'icône Vite par défaut et une image Open Graph Bolt, ce qui suggère un branding inachevé.
- Le client Supabase est créé directement à partir des variables d'environnement, sans garde explicite si elles sont absentes.

## Limites connues

Ce que le code permet d'affirmer aujourd'hui:

- La transcription Whisper n'est pas implémentée comme un flux mot à mot en temps réel.
- La sauvegarde des notes est strictement liée à l'authentification.
- Le transcript en cours n'est pas persisté localement au rechargement de page.
- L'application repose fortement sur les API du navigateur et sur la disponibilité des ressources nécessaires au chargement des modèles.

Ce que le code ne permet pas d'affirmer sans test complémentaire:

- Une compatibilité homogène entre Chrome, Edge, Firefox et Safari.
- Une expérience mobile stable.
- Une vraie robustesse hors ligne dans tous les cas d'usage.
- Des performances constantes avec les modèles Whisper les plus lourds sur des machines modestes.

## Pistes d'amélioration prioritaires

Si l'objectif est de faire évoluer ce MVP vers un produit plus robuste, les axes les plus rationnels sont:

1. Ajouter un `.env.example` et retirer les valeurs d'environnement du dépôt versionné.
2. Ajouter une suite minimale de tests pour le hook STT, les services Supabase et les composants critiques.
3. Ajouter un vrai script de linting et une CI.
4. Gérer explicitement les erreurs de configuration Supabase au démarrage.
5. Enregistrer `duration_seconds` et éventuellement la langue détectée.
6. Ajouter une persistance locale du transcript en cours.
7. Clarifier l'expérience hors ligne et les comportements spécifiques à chaque moteur.
8. Nettoyer les composants UI non utilisés pour réduire la dette de maintenance.

## Scripts disponibles

| Commande            | Effet                                                   |
| ------------------- | ------------------------------------------------------- |
| `npm run dev`       | Démarre le serveur de développement Vite.               |
| `npm run build`     | Compile TypeScript puis construit le bundle Vite.       |
| `npm run typecheck` | Exécute la vérification de types TypeScript sans build. |
| `npm run preview`   | Sert localement le build de production.                 |

## Résumé exécutif

VoiceScribe est un projet front-end cohérent pour expérimenter la dictée vocale dans le navigateur avec deux stratégies complémentaires: une API native du navigateur pour la rapidité, et Whisper local pour plus d'autonomie côté client. Le coeur métier est clair et la structure générale est saine pour un MVP.

La principale valeur du dépôt est sa simplicité: une seule application, peu de couches d'abstraction, un flux utilisateur compréhensible et une intégration Supabase directe. Sa principale faiblesse est le manque de durcissement: tests absents, documentation initialement absente, configuration sensible versionnée et quelques détails techniques encore inachevés.
