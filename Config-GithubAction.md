# Configuration de GitHub Actions -- Notification par e-mail

## 1. Objectif

Configuration de githubAction pour une notification par e-mail .

L'envoi utilise GitHub Actions et le serveur SMTP de Yahoo Mail.

## 2. Prérequis

-   Un accès avec droits suffisants au dépôt GitHub.
-   Un compte Yahoo Mail.
-   Un mot de passe d'application Yahoo.
-   Une branche `main` dans le dépôt.

## 3. Paramètres SMTP Yahoo

  Paramètre          Valeur
  ------------------ ----------------------------------
  Serveur SMTP       `smtp.mail.yahoo.com`
  Port               `465`
  Sécurité           SSL/TLS
  Authentification   Activée
  Identifiant        Adresse Yahoo complète
  Mot de passe       Mot de passe d'application Yahoo

**Important :** utiliser un mot de passe d'application Yahoo, et non le
mot de passe habituel du compte.

### Générer le mot de passe d'application

1.  Se connecter au compte Yahoo.
2.  Ouvrir la page [Sécurité du compte
    Yahoo](https://login.yahoo.com/account/security).
3.  Rechercher la rubrique des mots de passe d'application (*App
    passwords*).
4.  Générer un mot de passe pour une application tierce.
5.  Lui donner un nom explicite, par exemple `GitHub Actions`.
6.  Copier le mot de passe et le conserver de manière sécurisée.

La disponibilité et le libellé de cette fonctionnalité peuvent dépendre
des paramètres du compte Yahoo.

## 4. Enregistrer les secrets dans GitHub

Dans le dépôt `azureabasketgolfe/Test` :

1.  Ouvrir **Settings**.
2.  Aller dans **Secrets and variables → Actions**.
3.  Cliquer sur **New repository secret**.
4.  Créer les secrets suivants :

  Nom du secret     Valeur
  ----------------- -------------------------------------
  `SMTP_USERNAME`   Adresse Yahoo utilisée pour l'envoi
  `SMTP_PASSWORD`   Mot de passe d'application Yahoo
  `MAIL_TO`         Adresse destinataire

Si l'adresse Yahoo reçoit elle-même les notifications, `SMTP_USERNAME`
et `MAIL_TO` peuvent avoir la même valeur.

**Sécurité :** ne jamais inscrire le mot de passe dans le fichier YAML,
dans le dépôt ou dans un commit. Il doit rester dans les secrets GitHub.

## 5. Créer le workflow

Créer le fichier YML sous :

`.github/workflows`

Contenu :

``` yaml
name: Notification par e-mail

......

jobs:
  notification:
    runs-on: ubuntu-latest

    steps:
      - name: Envoyer un email
        uses: dawidd6/action-send-mail@v6
        with:
          server_address: smtp.mail.yahoo.com
          server_port: 465
          secure: true

          username: ${{ secrets.SMTP_USERNAME }}
          password: ${{ secrets.SMTP_PASSWORD }}

          subject: "[Azurea Basket] Calendrier des matchs mis à jour"
          to: ${{ secrets.MAIL_TO }}
          from: ${{ secrets.SMTP_USERNAME }}

          body: |
            Bonjour,

           .....
```

## 6. Dépannage

### Erreur SMTP `535 5.7.0 (#AUTH005) Too many bad auth attempts`

Cette erreur peut apparaître après plusieurs tentatives
d'authentification échouées.

À vérifier :

1.  Utiliser l'adresse Yahoo complète comme `SMTP_USERNAME`.
2.  Vérifier que `SMTP_PASSWORD` contient le mot de passe d'application
    Yahoo, sans espace ajouté.
3.  Vérifier que le mot de passe d'application est toujours valide.
4.  Éviter de multiplier les tentatives successives. En cas de blocage
    temporaire, attendre avant de réessayer.
5.  Vérifier que le compte Yahoo autorise toujours l'envoi depuis une
    application tierce.

## 8. Ressources

-   [Sécurité du compte Yahoo](https://login.yahoo.com/account/security)
-   [Documentation GitHub -- Secrets dans GitHub
    Actions](https://docs.github.com/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions)
-   [Dépôt de l'action d'envoi
    d'e-mail](https://github.com/dawidd6/action-send-mail)
