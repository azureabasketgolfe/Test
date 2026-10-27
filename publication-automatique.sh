#!/bin/sh
# ==================================================
# 1. Configuration
# ==================================================

# Jeton API FFBB
FFBB_TOKEN="bvBdsqADOnQmvFNzDRQnzYYw2g2J1ad6"
export FFBB_TOKEN

# ==================================================
# Déterminer automatiquement la racine du projet Git
# ==================================================
REPO="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)" || exit 1
REPOLOG="$(CDPATH= cd -- "$REPO/.." && pwd)" || exit 1

HOME_DIR="${HOME:?ERREUR : variable HOME absente}"

export GIT_SSH_COMMAND="ssh -i $HOME_DIR/.ssh/azurea_github -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes"

LOG="$REPOLOG/publication-automatique.log"
exec >> "$LOG" 2>&1
echo
echo "=================================================="
echo "DEBUT AUTOMATISATION : $(date)"
echo "Projet : $REPO"
echo "=================================================="

# ==================================================
# 2. Générer les matchs
# ==================================================
cd "$REPO" || exit 1

echo "=== GENERATION FFBB ==="
node "$REPO/scripts/generate-matchs.mjs"
RESULT=$?

if [ "$RESULT" -ne 0 ]; then
    echo "ERREUR : génération FFBB échouée."
    exit 1
fi

if [ ! -s "$REPO/matchs.json" ]; then
    echo "ERREUR : matchs.json absent ou vide."
    exit 1
fi

echo "=== GENERATION TERMINEE ==="
ls -l "$REPO/matchs.json"

# ==================================================
# 3. Commit et publication
# ==================================================
echo "=== VERIFICATION DES MODIFICATIONS ==="
git status --short

git add matchs.json || exit 1

if git diff --cached --quiet -- matchs.json; then
    echo "Aucune modification : rien à publier."
    echo "FIN AUTOMATISATION : $(date)"
    exit 0
fi

echo "=== COMMIT ==="
git commit -m "Mise a jour automatique des matchs" || exit 1

echo "=== PUSH GITHUB ==="
git push origin main || exit 1

echo "=== PUBLICATION REUSSIE ==="
echo "FIN AUTOMATISATION : $(date)"
