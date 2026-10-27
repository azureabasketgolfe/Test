# Guide utilisateur — Automatisation du calendrier FFBB avec un NAS Synology et GitHub

**Projet :** Azuréa Basket Golfe-Juan  
**Dépôt GitHub :** [`azureabasketgolfe/Test`](https://github.com/azureabasketgolfe/Test)  
**NAS :** Synology DS214play — DSM 6.2  
**Objectif :** générer automatiquement le calendrier des matchs FFBB et publier le fichier `matchs.json` sur GitHub, sans intervention manuelle.

---

## Sommaire

1. [Objectif et fonctionnement général](#1-objectif-et-fonctionnement-général)
2. [Configuration du dépôt GitHub](#2-configuration-du-dépôt-github)
3. [Configuration du NAS](#3-configuration-du-nas)
4. [Préparer la génération FFBB](#4-préparer-la-génération-ffbb)
5. [Script de publication automatique](#5-script-de-publication-automatique)
6. [Format du script et permissions](#6-format-du-script-et-permissions)
7. [Configurer le Planificateur de tâches DSM](#7-configurer-le-planificateur-de-tâches-dsm)
8. [Journal et diagnostic](#8-journal-et-diagnostic)
9. [Vérifications périodiques](#9-vérifications-périodiques)
10. [Paramètres de référence](#10-paramètres-de-référence)

---

# 1. Objectif et fonctionnement général

Le NAS exécute périodiquement un script qui interroge l'API FFBB, génère les rencontres, puis publie les modifications sur GitHub.

Le dépôt Git local du NAS est le répertoire de travail unique. Le fichier `matchs.json` est généré directement à la racine du projet.

### Architecture générale

```text
API FFBB
   |
   v
Synology DS214play
   |
   |-- scripts/generate-matchs.mjs
   |       |
   |       v
   |   matchs.json
   |
   |-- scripts/publication-automatique.sh
           |
           |-- Vérification des modifications
           |-- git add
           |-- git commit
           |-- git push
                   |
                   v
             GitHub : azureabasketgolfe/Test
                   |
                   v
             Publication du site
             selon la configuration GitHub
```

### Principes de fonctionnement

- Le NAS récupère les données auprès de l'API FFBB.
- Le fichier `matchs.json` est généré directement dans le dépôt Git local.
- Si le fichier n'a pas changé, aucun nouveau commit n'est créé.
- Si le fichier a changé, le NAS crée un commit puis l'envoie sur GitHub.
- La connexion GitHub utilise une clé SSH dédiée au dépôt.
- Les opérations sont exécutées avec un compte technique non administrateur.
- Un journal conserve la trace des exécutions.

> **Important :** l'envoi vers GitHub ne garantit pas, à lui seul, que le site est publié. Le déploiement du site dépend de la configuration du dépôt, par exemple GitHub Pages.

# 2. Configuration du dépôt GitHub

## 2.1. Préparer le dépôt

Le dépôt utilisé est :

<https://github.com/azureabasketgolfe/Test>

Il contient notamment les fichiers suivants :

```text
Test/
├── .github/
├── index.html
├── matchs.json
└── scripts/
    ├── generate-matchs.mjs
    └── publication-automatique.sh
```

Le dossier `.github` contient la configuration GitHub éventuelle, notamment les workflows. Il doit être conservé.

Le fichier `matchs.json` est le fichier de données exploité par le site.

Le script `generate-matchs.mjs` récupère et transforme les données FFBB.

## 2.2. Créer une clé SSH sur le NAS

La clé SSH permet au NAS de s'authentifier auprès de GitHub sans saisir de mot de passe à chaque publication.

La clé doit être créée sous le compte technique qui exécutera la tâche planifiée.

Dans notre configuration, le compte est `github_azurea`, et son répertoire personnel est :

```text
/var/services/homes/github_azurea
```

Le répertoire SSH est :

```text
/var/services/homes/github_azurea/.ssh
```

La clé privée utilisée est :

```text
/var/services/homes/github_azurea/.ssh/azurea_github
```

La clé publique correspondante est :

```text
/var/services/homes/github_azurea/.ssh/azurea_github.pub
```

Si une nouvelle clé doit être créée, la commande standard est :

```sh
/usr/bin/ssh-keygen -t ed25519 \
  -f /var/services/homes/github_azurea/.ssh/azurea_github
```

Si le fichier existe déjà, ne le remplace pas sans raison : la clé actuellement fonctionnelle doit être conservée.

La clé privée doit rester confidentielle. Elle ne doit jamais être ajoutée au dépôt Git.

### Vérifier les permissions

```sh
chmod 700 /var/services/homes/github_azurea/.ssh
chmod 600 /var/services/homes/github_azurea/.ssh/azurea_github
chmod 644 /var/services/homes/github_azurea/.ssh/azurea_github.pub
```

## 2.3. Ajouter la clé publique à GitHub

1. Afficher la clé publique sur le NAS :

   ```sh
   cat /var/services/homes/github_azurea/.ssh/azurea_github.pub
   ```

2. Copier l'intégralité de la clé affichée.
3. Ouvrir le dépôt GitHub `azureabasketgolfe/Test`.
4. Accéder à **Settings → Deploy keys**.
5. Cliquer sur **Add deploy key**.
6. Donner un nom explicite, par exemple `Synology Azurea Basket`.
7. Coller la clé publique.
8. Cocher **Allow write access**.
9. Valider.

L'autorisation d'écriture est indispensable pour permettre au NAS d'effectuer un `git push`.

Une deploy key est associée à un dépôt. Elle permet ici de limiter l'accès de cette clé au dépôt `Test`.

## 2.4. Configurer les clés d'hôte SSH de GitHub

SSH doit également vérifier l'identité du serveur GitHub auquel le NAS se connecte.

Le fichier utilisé est :

```text
/var/services/homes/github_azurea/.ssh/known_hosts
```

La clé d'hôte ED25519 de GitHub a été ajoutée manuellement, car la commande `ssh-keyscan` n'était pas disponible sur le NAS.

La ligne utilisée était :

```text
github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl
```

Cette clé doit être vérifiée à partir d'une source officielle de GitHub avant toute nouvelle installation ou mise à jour.

Documentation officielle : [GitHub — SSH key fingerprints](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints).

Il ne faut pas désactiver la vérification de l'identité du serveur avec `StrictHostKeyChecking=no`.

## 2.5. Tester la connexion SSH

Exécuter le test sous le compte `github_azurea` :

```sh
HOME=/var/services/homes/github_azurea
export HOME

/bin/ssh -T \
  -i "$HOME/.ssh/azurea_github" \
  -o IdentitiesOnly=yes \
  -o StrictHostKeyChecking=yes \
  git@github.com
```

Le résultat attendu est similaire à :

```text
Hi azureabasketgolfe/Test! You've successfully authenticated,
but GitHub does not provide shell access.
```

Le code de retour peut être `1`, car GitHub n'offre pas de terminal shell via cette commande. Le message confirme néanmoins que l'authentification a réussi.

## 2.6. Cloner le dépôt sur le NAS

Le dépôt est cloné dans le répertoire de travail du projet :

```text
/volume1/AzureaBasket/depot
```

Commande utilisée :

```sh
HOME=/var/services/homes/github_azurea
export HOME

REPO_DIR="/volume1/AzureaBasket/depot"

GIT_SSH_COMMAND="/bin/ssh -i $HOME/.ssh/azurea_github -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes" \
/bin/git clone git@github.com:azureabasketgolfe/Test.git "$REPO_DIR"
```

Cette opération n'est à réaliser qu'une seule fois.

Si le dépôt est déjà cloné, ne relance pas cette commande sur le même répertoire.

## 2.7. Vérifier le dépôt local

```sh
cd /volume1/AzureaBasket/depot

/bin/git status
/bin/git branch -a
/bin/git log -1 --oneline
```

Les éléments attendus sont :

- la branche `main` ;
- une branche distante `origin/main` ;
- un dépôt propre, sans modification inattendue ;
- un historique de commits accessible.

# 3. Configuration du NAS

## 3.1. Créer le compte technique

Les opérations automatiques doivent être exécutées par un compte dédié, et non par `root` ou par un administrateur du NAS.

Le compte utilisé est :

```text
github_azurea
```

Il est non administrateur et possède son propre répertoire personnel.

Dans DSM, le compte est géré depuis le panneau de configuration, dans la section des utilisateurs.

Vérifier que ce compte dispose des permissions nécessaires pour :

- lire et exécuter Node.js ;
- lire et modifier les fichiers du projet ;
- exécuter Git ;
- accéder à sa clé privée SSH et à son fichier `known_hosts` ;
- écrire le journal d'exécution.

Il ne faut pas accorder de privilèges administrateur simplement pour permettre la publication GitHub.

## 3.2. Vérifier les versions des outils

Les versions constatées pendant la configuration étaient :

| Outil | Version ou chemin |
|---|---|
| DSM | 6.2 |
| Node.js | 12.22.12 |
| Exécutable Node.js | `/usr/local/bin/node` |
| Git | 2.33.0 |
| Exécutable Git | `/bin/git` |
| SSH | `/bin/ssh` |

Pour vérifier les outils sous le compte technique :

```sh
/usr/local/bin/node --version
/bin/git --version
/bin/ssh -V
```

Le script de génération a été adapté à Node.js 12.

En cas de remplacement du NAS ou de mise à jour du système, vérifier la disponibilité et la compatibilité de ces outils.

## 3.3. Organisation des fichiers sur le NAS

Le répertoire de travail est :

```text
/volume1/AzureaBasket/depot
```

Son organisation est la suivante :

```text
depot/
├── .git/
├── .github/
├── index.html
├── matchs.json
└── scripts/
    ├── generate-matchs.mjs
    └── publication-automatique.sh
```

Les deux scripts sont versionnés dans le dépôt Git.

Le fichier `matchs.json` est à la racine du dépôt.

Le répertoire supérieur `/volume1/AzureaBasket` sert notamment à conserver le journal d'exécution.

Le script de publication retrouve automatiquement la racine du projet à partir de son propre emplacement. Il n'a donc pas besoin de connaître le chemin absolu du répertoire du projet.

# 4. Préparer la génération FFBB

## 4.1. Vérifier le générateur

Le script de génération doit être présent ici :

```text
scripts/generate-matchs.mjs
```

Il interroge l'API FFBB, transforme les données et écrit le fichier `matchs.json` à la racine du dépôt.

Vérifier les chemins utilisés dans le script :

```sh
grep -nE 'matchs\.json|writeFile|writeFileSync' \
  /volume1/AzureaBasket/depot/scripts/generate-matchs.mjs
```

Le générateur doit écrire directement dans le dépôt Git. Aucune copie intermédiaire ne doit être nécessaire.

Il faut également vérifier que le générateur retourne un code d'erreur en cas d'échec de récupération ou de traitement des données. Un simple fichier existant ne garantit pas que son contenu est à jour.

## 4.2. Configurer le jeton FFBB

Le générateur utilise la variable d'environnement :

```text
FFBB_TOKEN
```

Dans la configuration retenue, le jeton est défini directement dans le script de publication, puis exporté afin que Node.js puisse le lire.

Exemple de principe :

```sh
FFBB_TOKEN="REMPLACER_PAR_LE_JETON"
export FFBB_TOKEN
```

Cette valeur doit être remplacée par le jeton réel.

### Précaution de sécurité

Le jeton ne doit pas être enregistré dans le dépôt Git. Si le dépôt est public, un jeton ajouté en clair au script peut être lu par n'importe qui. Même dans un dépôt privé, tous les utilisateurs ayant accès au code peuvent potentiellement le récupérer.

La solution recommandée reste de conserver le jeton dans une configuration externe au dépôt, protégée par les permissions du compte technique.

Si un véritable jeton a déjà été publié dans un dépôt accessible à des tiers, il faut le révoquer ou le renouveler auprès du fournisseur concerné.

# 5. Script de publication automatique

## 5.1. Rôle du script

Le fichier :

```text
scripts/publication-automatique.sh
```

orchestre l'ensemble du traitement.

Il doit réaliser les opérations dans cet ordre :

1. déterminer la racine du dépôt ;
2. configurer les paramètres nécessaires à SSH ;
3. définir le jeton FFBB ;
4. exécuter le générateur ;
5. vérifier que le fichier généré existe et n'est pas vide ;
6. ajouter `matchs.json` à l'index Git ;
7. vérifier si le contenu a changé ;
8. créer un commit si nécessaire ;
9. envoyer le commit sur `origin/main` ;
10. consigner le résultat dans le journal.

Le script doit s'arrêter dès qu'une opération indispensable échoue.

Il ne doit pas publier un ancien fichier lorsque la génération a échoué.

## 5.2. Détection automatique de la racine du projet

Le script est situé dans `scripts/`. La racine du projet se déduit de son emplacement :

```sh
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)" || exit 1
REPO="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)" || exit 1
```

Cette méthode évite de coder en dur le chemin absolu du projet.

Elle suppose que le script reste dans le sous-répertoire `scripts/`.

## 5.3. Configurer SSH dans le script

Le script utilise la clé privée existante :

```text
$HOME/.ssh/azurea_github
```

La commande SSH doit préciser la clé à utiliser et imposer la vérification de l'hôte :

```sh
export GIT_SSH_COMMAND="ssh -i $HOME/.ssh/azurea_github -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes"
```

Le `HOME` doit correspondre au répertoire personnel du compte technique.

## 5.4. Exécuter la génération

Le script doit se positionner dans la racine du dépôt, puis exécuter le générateur :

```sh
cd "$REPO" || exit 1

/usr/local/bin/node "$REPO/scripts/generate-matchs.mjs"
RESULT=$?

if [ "$RESULT" -ne 0 ]; then
    echo "ERREUR : génération FFBB échouée."
    exit 1
fi
```

Il est préférable d'utiliser le chemin absolu de Node.js dans une tâche DSM, car l'environnement `PATH` peut être différent de celui d'une session interactive.

Après la génération, le fichier doit être vérifié :

```sh
if [ ! -s "$REPO/matchs.json" ]; then
    echo "ERREUR : matchs.json absent ou vide."
    exit 1
fi
```

Cette vérification détecte un fichier absent ou vide. Elle ne remplace pas les contrôles de cohérence des données FFBB.

## 5.5. Publier uniquement en cas de changement

Une fois la génération réussie, le script doit exécuter :

```sh
git add matchs.json
```

Puis vérifier si le contenu préparé diffère du dernier commit :

```sh
if git diff --cached --quiet -- matchs.json; then
    echo "Aucune modification : rien à publier."
    exit 0
fi
```

Si le fichier a changé, le script crée un commit :

```sh
git commit -m "Mise a jour automatique des matchs"
```

Puis publie la branche :

```sh
git push origin main
```

Chaque commande doit être contrôlée : un échec de commit ou de push doit être signalé dans le journal.

Le script ne doit ajouter et publier que `matchs.json`, afin de ne pas envoyer accidentellement d'autres modifications locales du dépôt.

**Précaution :** si plusieurs utilisateurs modifient simultanément la branche `main`, le push peut être rejeté. Dans ce cas, il faut récupérer les changements distants et résoudre les éventuels conflits avant de relancer la publication.

# 6. Format du script et permissions

## 6.1. Corriger les fins de ligne Windows

Un script créé sous Windows peut utiliser des fins de ligne CRLF. Sous Linux, cela peut provoquer des erreurs telles que :

```text
/bin/sh^M: bad interpreter
```

Sur le NAS, convertir le script en format Unix :

```sh
sed -i 's/\r$//' /volume1/AzureaBasket/depot/scripts/publication-automatique.sh
```

Cette commande supprime le caractère CR final de chaque ligne.

Si `dos2unix` est installé, il est également possible de l'utiliser :

```sh
dos2unix /volume1/AzureaBasket/depot/scripts/publication-automatique.sh
```

## 6.2. Rendre le script exécutable

```sh
chmod 700 /volume1/AzureaBasket/depot/scripts/publication-automatique.sh
```

Cette commande donne les droits de lecture, d'écriture et d'exécution au propriétaire, sans les accorder aux autres utilisateurs.

Le fichier doit appartenir au compte technique ou être accessible à ce compte selon les permissions du NAS.

# 7. Configurer le Planificateur de tâches DSM

## 7.1. Créer la tâche

Dans DSM :

1. Ouvrir **Panneau de configuration**.
2. Ouvrir **Planificateur de tâches**.
3. Cliquer sur **Créer**.
4. Choisir **Tâche planifiée**, puis **Script défini par l'utilisateur**.
5. Donner un nom explicite, par exemple `Actualisation calendrier FFBB et publication GitHub`.
6. Choisir l'utilisateur `github_azurea`.
7. Configurer la fréquence souhaitée.
8. Dans l'onglet de définition du script, saisir :

   ```sh
   /bin/sh /volume1/AzureaBasket/depot/scripts/publication-automatique.sh
   ```

9. Enregistrer la tâche.

La commande appelle explicitement `/bin/sh`, ce qui évite de dépendre du répertoire courant utilisé par le Planificateur de tâches.

Le script retrouve ensuite automatiquement la racine du dépôt.

## 7.2. Effectuer un premier lancement manuel

Avant de programmer l'exécution récurrente :

1. Sélectionner la tâche.
2. Cliquer sur **Exécuter**.
3. Attendre la fin du traitement.
4. Ouvrir le journal pour vérifier le résultat.
5. Contrôler le fichier `matchs.json` sur GitHub.

Il est recommandé de vérifier également le site qui exploite ce fichier.

## 7.3. Programmer l'exécution récurrente

Une fois le test validé, choisir la fréquence adaptée aux mises à jour du calendrier FFBB.

Par exemple, une exécution chaque samedi matin peut être envisagée si l'objectif est d'actualiser les rencontres avant le week-end.

La fréquence doit être adaptée à la disponibilité des données et aux besoins du club. Elle ne garantit pas que la FFBB aura déjà publié toutes les modifications.

# 8. Journal et diagnostic

## 8.1. Consulter le journal

Le journal est conservé dans le répertoire supérieur du projet :

```text
/volume1/AzureaBasket/publication-automatique.log
```

Il permet de connaître :

- la date et l'heure de début ;
- le répertoire de travail utilisé ;
- le résultat de la génération ;
- la présence et la taille de `matchs.json` ;
- les modifications détectées par Git ;
- le résultat du commit ;
- le résultat du push.

Il est conseillé de vérifier régulièrement sa taille et de mettre en place une rotation si le journal grossit au fil du temps.

## 8.2. Problèmes courants

### Erreur de jeton FFBB

**Symptôme :** la génération échoue lors de l'appel à l'API FFBB.

À vérifier :

- le jeton est présent et valide ;
- la variable `FFBB_TOKEN` est bien exportée ;
- le script de génération utilise bien cette variable ;
- les droits et conditions d'accès à l'API n'ont pas changé.

### Erreur SSH ou authentification GitHub

**Symptôme :** `git push` échoue avec une erreur d'authentification.

À vérifier :

- la clé privée est toujours présente ;
- le fichier `known_hosts` est présent ;
- la clé publique est toujours enregistrée comme deploy key ;
- l'option **Allow write access** est activée ;
- la tâche s'exécute bien avec `github_azurea`.

### Erreur de permission

**Symptôme :** le script ne peut pas modifier `matchs.json`, le journal ou les fichiers Git.

À vérifier :

- le propriétaire et les permissions des fichiers ;
- les droits sur le répertoire du dépôt ;
- les droits du compte technique sur le journal ;
- les permissions du répertoire `.ssh`.

### Erreur liée aux fins de ligne

**Symptôme :** le script ne s'exécute pas et mentionne `^M` ou `bad interpreter`.

Exécuter à nouveau :

```sh
sed -i 's/\r$//' /volume1/AzureaBasket/depot/scripts/publication-automatique.sh
```

### Erreur Git `Author identity unknown`

**Symptôme :** Git refuse de créer un commit faute d'identité.

L'identité a été configurée localement dans le dépôt :

```sh
cd /volume1/AzureaBasket/depot

git config user.name "Azurea Basket Bot"
git config user.email "azurea-basket-bot@users.noreply.github.com"
```

Cette configuration est propre au dépôt. L'adresse utilisée doit être adaptée si une identité GitHub personnelle ou une adresse `noreply` spécifique est souhaitée.

### Aucun changement à publier

**Symptôme :** le journal indique qu'aucune modification n'est nécessaire.

Ce n'est pas une erreur. Cela signifie que le fichier généré est identique à la version déjà enregistrée dans Git.

### Push rejeté

**Symptôme :** GitHub refuse le push parce que la branche distante a évolué.

Vérifier l'état du dépôt et récupérer les changements distants avant de retenter l'opération. Ne pas forcer le push sans avoir vérifié les modifications existantes.

# 9. Vérifications périodiques

Après la mise en place, effectuer régulièrement les contrôles suivants :

- [ ] La tâche DSM s'exécute à la fréquence prévue.
- [ ] Le journal ne contient pas d'erreur.
- [ ] Le générateur récupère les données FFBB.
- [ ] Le nombre de rencontres est cohérent.
- [ ] Le fichier `matchs.json` est mis à jour lorsque les données changent.
- [ ] Les commits sont présents sur GitHub.
- [ ] Le site exploite bien la dernière version du fichier.
- [ ] La clé SSH reste fonctionnelle.
- [ ] Le jeton FFBB reste valide.
- [ ] Le journal et l'espace disque sont surveillés.
- [ ] Le jeton et la clé privée ne sont pas publiés dans le dépôt.

# 10. Paramètres de référence

| Paramètre | Valeur |
|---|---|
| NAS | Synology DS214play |
| DSM | 6.2 |
| Compte technique | `github_azurea` |
| Répertoire personnel | `/var/services/homes/github_azurea` |
| Clé privée SSH | `.ssh/azurea_github` |
| Fichier `known_hosts` | `.ssh/known_hosts` |
| Dépôt GitHub | `azureabasketgolfe/Test` |
| Branche publiée | `main` |
| Répertoire local du dépôt | `/volume1/AzureaBasket/depot` |
| Générateur FFBB | `scripts/generate-matchs.mjs` |
| Script de publication | `scripts/publication-automatique.sh` |
| Fichier de données | `matchs.json` |
| Journal | `/volume1/AzureaBasket/publication-automatique.log` |
| Node.js | `/usr/local/bin/node` |
| Git | `/bin/git` |
| SSH | `/bin/ssh` |

---

## Conclusion

L'automatisation repose sur trois éléments : le générateur FFBB, le script de publication et la tâche planifiée DSM. Le dépôt Git local est l'unique espace de travail, tandis que la clé SSH autorise la publication vers GitHub.

Cette organisation permet de limiter les interventions manuelles, de conserver un historique des mises à jour et de diagnostiquer les échecs à partir du journal d'exécution.