# VoiceScribe

VoiceScribe est une application web de dictée vocale construite avec React, Vite et Tailwind CSS. Elle transcrit la voix directement dans le navigateur, permet de relire et corriger le texte, puis d'enregistrer les notes localement sur l'appareil sans compte, sans backend applicatif et sans base de données.

L'application est désormais entièrement locale pour tout ce qui concerne la persistance des notes. Les fonctionnalités auparavant liées à Supabase et à l'authentification ont été retirées du runtime.

## Résumé technique

Constats vérifiés dans le code courant:

- La transcription utilise soit la Web Speech API du navigateur, soit des modèles Whisper exécutés côté client via Transformers.js.
- La sauvegarde des notes repose sur le stockage navigateur, avec `localStorage` comme support principal et `sessionStorage` comme repli si `localStorage` n'est pas disponible.
- Il n'y a plus de logique d'authentification dans l'application.
- Il n'y a plus de dépendance active à Supabase dans le code exécuté par l'application.
- Le projet reste un front-end pur servi par Vite.

## Démarche d'analyse

Ce README reflète l'état du dépôt après suppression du couplage à Supabase. Il s'appuie sur l'observation directe des fichiers structurants du projet et sur une vérification croisée entre architecture, implémentation et flux utilisateur.

Méthode suivie:

1. Identifier les dépendances externes réellement utilisées au runtime.
2. Repérer les flux qui exigeaient un compte ou une base distante.
3. Remplacer ces flux par des mécanismes équivalents fondés sur les API navigateur.
4. Revalider la cohérence du dépôt, des scripts et de la documentation.

## Fonctionnalités disponibles

- Transcription vocale depuis le navigateur.
- Sélection du moteur de reconnaissance vocale.
- Affichage de l'état courant du moteur: prêt, chargement, écoute, traitement, erreur.
- Affichage de la progression de chargement des modèles Whisper.
- Édition manuelle du transcript avant sauvegarde.
- Copie du transcript dans le presse-papiers.
- Sauvegarde des notes localement sur l'appareil.
- Liste locale des notes avec copie et suppression.
- Fenêtre flottante de prise de notes, déplaçable et minimisable.
- Thème clair, sombre ou système.
- Injection du texte transcrit dans le champ texte actif de la page lorsqu'il ne s'agit pas d'un champ interne VoiceScribe.

Fonctionnalités absentes dans l'état actuel:

- Aucun compte utilisateur.
- Aucune synchronisation entre appareils.
- Aucun backend, aucune API métier distante.
- Aucune base de données.
- Aucune édition d'une note déjà sauvegardée.
- Aucun moteur de recherche dans les notes.
- Aucun export de note au format fichier.
- Aucun système de tests automatisés dans le dépôt.

## Flux utilisateur

1. Ouvrir l'application.
2. Choisir un moteur de transcription dans l'onglet `Settings`.
3. Autoriser le microphone si le navigateur le demande.
4. Démarrer la dictée via le bouton microphone.
5. Relire et corriger le texte transcrit.
6. Copier le texte ou l'enregistrer comme note locale.
7. Consulter l'onglet `Notes` pour revoir, copier ou supprimer les notes stockées sur l'appareil.

## Architecture

### Vue d'ensemble

```text
Navigateur
  ├─ UI React + composants shadcn/ui
  ├─ Hook useSTT
  ├─ STTEngine
  │    ├─ Web Speech API
  │    └─ Transformers.js + Whisper
  └─ Notes service
    └─ Browser Storage
      ├─ localStorage
      └─ sessionStorage (fallback)
```

### Répartition des responsabilités

| Fichier                               | Rôle                                                                                          |
| ------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/main.tsx`                        | Monte l'application avec le provider de thème.                                                |
| `src/App.tsx`                         | Coordonne l'UI principale, les actions de transcription, la sauvegarde locale et les onglets. |
| `src/hooks/use-stt.ts`                | Expose l'API de transcription à l'interface React.                                            |
| `src/lib/stt-engine.ts`               | Implémente le moteur STT et choisit entre Web Speech API et Whisper.                          |
| `src/lib/stt-models.ts`               | Déclare les modèles disponibles.                                                              |
| `src/lib/notes-service.ts`            | Gère la lecture, l'écriture et la suppression des notes dans le stockage navigateur.          |
| `src/components/saved-notes-list.tsx` | Affiche les notes locales et leurs actions.                                                   |
| `src/components/floating-note.tsx`    | Gère la note flottante pendant la dictée.                                                     |
| `src/components/theme-provider.tsx`   | Gère le thème clair, sombre ou système.                                                       |

## Stockage local des notes

Les notes sont stockées côté navigateur sous une clé versionnée:

- Clé principale: `voicescribe.notes.v1`

Stratégie observée dans le code:

1. L'application tente d'utiliser `localStorage`.
2. Si `localStorage` n'est pas disponible, elle essaie `sessionStorage`.
3. Si aucun stockage navigateur n'est accessible, la sauvegarde échoue proprement.

Chaque note contient actuellement:

- `id`
- `title`
- `content`
- `source_model`
- `duration_seconds`
- `created_at`
- `updated_at`

Remarques importantes:

- Les notes sont locales à l'appareil et au navigateur utilisés.
- En mode `localStorage`, elles persistent entre les sessions.
- En mode `sessionStorage`, elles disparaissent à la fermeture de l'onglet ou de la session navigateur.
- Les données ne sont pas synchronisées entre navigateurs ni entre machines.

## Moteurs de transcription

Les modèles observés dans le projet sont:

| Identifiant     | Type            | Taille annoncée | Comportement                                                                        |
| --------------- | --------------- | --------------- | ----------------------------------------------------------------------------------- |
| `web-speech`    | API navigateur  | `0 MB`          | Démarrage rapide, résultats intermédiaires et finaux, dépend du support navigateur. |
| `whisper-tiny`  | Transformers.js | `~40 MB`        | Modèle local léger, transcription principalement après arrêt de l'enregistrement.   |
| `whisper-base`  | Transformers.js | `~75 MB`        | Modèle intermédiaire.                                                               |
| `whisper-small` | Transformers.js | `~250 MB`       | Modèle plus lourd, potentiellement plus précis mais plus coûteux en ressources.     |

Différence importante entre les moteurs:

- `Web Speech API` produit du texte intermédiaire en cours de dictée.
- Les modèles Whisper actuels enregistrent l'audio puis transcrivent surtout à l'arrêt via `MediaRecorder`.

## Installation

### Prérequis

- Node.js LTS récent
- npm
- Un navigateur moderne avec accès micro

### Installation des dépendances

```bash
npm install
```

### Variables d'environnement

Aucune variable d'environnement n'est nécessaire pour faire fonctionner l'application dans son état local-only actuel.

Le fichier `.env` du dépôt sert désormais uniquement à signaler cette absence de configuration requise.

## Lancement

### Développement

```bash
npm run dev
```

### Vérification de types

```bash
npm run typecheck
```

### Build de production

```bash
npm run build
```

### Prévisualisation

```bash
npm run preview
```

## Compatibilité navigateur

Le code suppose la disponibilité de plusieurs API navigateur:

- `navigator.mediaDevices.getUserMedia`
- `MediaRecorder`
- `SpeechRecognition` ou `webkitSpeechRecognition` pour le moteur natif
- `localStorage` ou `sessionStorage`
- `Clipboard API`

Conséquences pratiques:

- L'application est mieux adaptée aux navigateurs modernes.
- La Web Speech API ne doit pas être considérée comme uniformément disponible selon les moteurs et plateformes, ni comme un vrai moteur hors ligne garanti.
- Les modèles Whisper sont plus exigeants en CPU, mémoire et temps de chargement.

## Hors ligne

Le comportement hors ligne doit être compris précisément:

- Le moteur `Web Speech API` dépend fortement du navigateur et ne doit pas être considéré comme fiable hors ligne.
- Les modèles Whisper sont les seuls moteurs du projet conçus pour une exécution locale réelle.
- Un modèle Whisper doit d'abord être téléchargé avec succès une première fois.
- Une fois mis en cache par le navigateur, il peut être réutilisé sans connexion, sous réserve que le cache navigateur soit toujours disponible.
- Si le cache a été vidé, si le navigateur bloque ce cache, ou si le premier chargement n'a jamais abouti, une connexion est encore nécessaire.

## Particularités d'interface

### Injection dans le champ actif

L'application surveille le focus de la page et peut injecter le transcript final dans un champ texte actif s'il n'est pas identifié comme champ interne VoiceScribe.

Cela implique que:

- le comportement reste limité au document web courant;
- l'application ne se substitue pas à une dictée système globale;
- les champs internes sont exclus via des attributs `data-voicescribe-*`.

### Note flottante

La note flottante:

- peut être ouverte ou fermée depuis l'écran principal;
- peut être déplacée à la souris;
- peut être minimisée;
- reflète le contenu transcrit courant;
- permet copier, effacer ou sauvegarder la note.

### Thème

Le thème peut être changé:

- via le bouton de thème dans l'en-tête;
- via le mode système;
- via la touche `d` si le focus n'est pas dans un champ éditable.

## Structure actuelle du projet

```text
project/
├─ public/
│  └─ vite.svg
├─ src/
│  ├─ components/
│  │  ├─ floating-note.tsx
│  │  ├─ mode-toggle.tsx
│  │  ├─ model-info-panel.tsx
│  │  ├─ model-selector.tsx
│  │  ├─ recording-button.tsx
│  │  ├─ saved-notes-list.tsx
│  │  ├─ status-indicator.tsx
│  │  ├─ theme-provider.tsx
│  │  └─ ui/
│  ├─ hooks/
│  │  ├─ use-mobile.ts
│  │  └─ use-stt.ts
│  ├─ lib/
│  │  ├─ notes-service.ts
│  │  ├─ stt-engine.ts
│  │  ├─ stt-models.ts
│  │  └─ utils.ts
│  ├─ types/
│  │  └─ speech-recognition.d.ts
│  ├─ App.tsx
│  ├─ index.css
│  └─ main.tsx
├─ components.json
├─ index.html
├─ package.json
├─ tsconfig.json
└─ vite.config.ts
```

## Dette technique et limites connues

Points observés:

- Le nom du package reste `shadcn-ui-template`, ce qui ne reflète pas encore le produit VoiceScribe.
- Le dépôt ne contient ni tests automatisés, ni CI, ni script de lint dédié.
- `duration_seconds` existe dans le modèle de note mais n'est pas encore alimenté par l'enregistrement réel.
- Le transcript courant n'est pas sauvegardé automatiquement entre deux rechargements de page.
- Le dépôt contient encore de nombreux composants `shadcn/ui` non utilisés par la fonctionnalité principale.
- `index.html` conserve encore des éléments de branding génériques Vite/Bolt.

Ce que le code permet d'affirmer aujourd'hui:

- La persistance des notes est locale et ne dépend plus d'un service externe.
- L'authentification a été retirée du parcours utilisateur.
- La transcription Whisper n'est pas un flux mot à mot strictement temps réel dans l'implémentation actuelle.

Ce que le code ne garantit pas sans tests complémentaires:

- Une compatibilité homogène entre tous les navigateurs desktop et mobile.
- Un fonctionnement hors ligne totalement stable sur tous les moteurs STT.
- Des performances constantes avec les modèles Whisper lourds sur des machines modestes.

## Pistes d'amélioration

1. Sauvegarder automatiquement le brouillon courant dans `sessionStorage` ou `localStorage`.
2. Ajouter l'édition des notes déjà enregistrées.
3. Ajouter un export texte ou Markdown.
4. Ajouter des tests pour `useSTT`, `notes-service` et les composants critiques.
5. Renommer le package et finir le branding du projet.
6. Nettoyer les composants UI inutilisés pour réduire la surface de maintenance.

## Scripts disponibles

| Commande            | Effet                                                      |
| ------------------- | ---------------------------------------------------------- |
| `npm run dev`       | Démarre le serveur Vite de développement.                  |
| `npm run build`     | Compile TypeScript puis construit le bundle de production. |
| `npm run typecheck` | Vérifie les types TypeScript sans produire de build.       |
| `npm run preview`   | Prévisualise localement le build de production.            |

## Résumé exécutif

VoiceScribe est maintenant une application de dictée entièrement locale pour ce qui concerne les notes. Le projet conserve ses deux stratégies de transcription côté navigateur, mais supprime tout couplage fonctionnel à une authentification ou à une base distante.

Le bénéfice immédiat est une expérience plus simple, sans friction de connexion et sans dépendance à une infrastructure externe pour sauvegarder les notes. En contrepartie, la persistance devient locale au navigateur et ne fournit aucune synchronisation entre appareils.
