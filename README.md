# Generation du calendrier des matchs de l'Azurea Basket

## 1. Objectif

L'objectif de ce projet est de proposer une génération automatique du calendrier de tous les matchs des équipes de Basket de l'Azurea en se basant sur l'API de la FFBB.

## 2. Workflow
- Le NAS exécute tous les jours un script qui interroge l'API FFBB, génère les rencontres (`matchs.json`) et les nouvelles competitions (`ajout-competition.json`), puis publie les modifications sur GitHub. 

- Le fichier `index.html` s'appuie sur le fichier `matchs.json` pour mettre à jour le calendrier.

- Le dépôt Git local du NAS est le répertoire de travail unique. Le fichier `matchs.json` est généré directement à la racine du projet.

- 2 workflow GithubAction pour gérer les anomalies:
    - Envoyer une notification si le fichier `matchs.json` n'est pas généré toutes les 24h
    - Envoyer une notification si une nouvelle competition est trouvée via le fichier `ajout-competition.json`

## 2. Configuration 

- Le guide développeur pour la publication automatique depuis le `NAS` se trouve sous [Guide Developpeur](./GuideDeveloppeur.md):
    - Configuration du NAS
    - Configuration Github
    - Gestion de l'API FFBB
    - Explication du fichier `publication-automatique.sh` 
- La configuration de `GithubAction` se trouve sous [Configuration GithubAction](./Config-GithubAction.md)
- La configuration du `PC Windows` pour le developpement:
    - Installation de VsCode
    - Installation d'un client Git
    - Utilisation de Git bash pour executer le script `publication-automatique.sh`
        - bien penser a faire un git Pull avant de l'executer

## index.html

- Le fichier `index.html` a été généré par l'IA
- A retenir:
    - Création de plusieurs tableau correspondant:
        - Aux rencontres des équipes engagées (par exemple: const U15_MATCHES = [];). Les tableaux de rencontres sont alimentés automatiquement par `matchs.json`
            - Lz tableau `DIVERS` permet de récupérer toutes les rencontres non catégorisées dans `CATEGORY_CONSTANTS`. Normalement on ne récupère que les matchs de Coupe
        - EVENTS : événements du club. A renseigner à la main
        - HOLIDAYS : jours fériés. A renseigner à la main
        - SCHOOL_HOLIDAYS : vacances scolairesAux evenements du club. A renseigner à la main
        - CATEGORY_CONSTANTS: Ce tableau est un tableau de correspondance entre les tableaux des rencontres des equipes engagées et les competitions remontées par l'API FFBB. 
            - A mettre à jour des qu'une nouvelle competition est detectée par le script `generate-matchs.json`.

## generate-matchs.mjs
- Création du fichier des rencontres dans `matchs.json`
- Mise à jour du fihcier `ajout-competition.json` si une nouvelle competition est detectée
- A retenir:
    - les tableaux `engagements_golfe` et `engagements_ctc` correspondent à toutes les competitions référencées dans le tableau CATEGORY_CONSTANT et les matchs de coupe.
    - Le script detecte une nouvelle competition non référencée dans les tableaux et va le renseigner dans une log et dans le fichier `ajout-competition.json`. 

## workflow github Action
- 2 workflow GithubAction pour gérer les anomalies:
    - **matchs-erreurGeneration.yml**: Envoyer une notification si le fichier `matchs.json` n'est pas généré toutes les 24h
    - **ajout-competition.yml**:Envoyer une notification si une nouvelle competition est trouvée via le fichier `ajout-competition.json`