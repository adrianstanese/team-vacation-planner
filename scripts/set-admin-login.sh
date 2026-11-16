#!/bin/bash
# Replaces the super admin login (ADMIN_USERNAME + ADMIN_PASSWORD_HASH) on Vercel production, then redeploys.
# The password is typed hidden and only its scrypt hash leaves this machine. Run from the repo folder:
#   bash scripts/set-admin-login.sh
set -euo pipefail
cd "$(dirname "$0")/.."

read -r -p "New admin username: " U
U="$(echo "$U" | tr -d '[:space:]')"
[ -n "$U" ] || { echo "Username is empty."; exit 1; }

HASH="$(node scripts/admin-password-hash.mjs)"
[ -n "$HASH" ] || { echo "No password set, nothing changed."; exit 1; }

echo "Saving to Vercel (production)…"
npx vercel env rm ADMIN_USERNAME production --yes >/dev/null 2>&1 || true
npx vercel env rm ADMIN_PASSWORD_HASH production --yes >/dev/null 2>&1 || true
printf '%s' "$U" | npx vercel env add ADMIN_USERNAME production --sensitive >/dev/null
printf '%s' "$HASH" | npx vercel env add ADMIN_PASSWORD_HASH production --sensitive >/dev/null
unset HASH

echo "Redeploying so the new login takes effect…"
LAST="$(npx vercel ls --prod 2>/dev/null | grep -o 'https://team-vacation-planner-[a-z0-9]*-adrianstaneses-projects.vercel.app' | head -1)"
npx vercel redeploy "$LAST" --target production >/dev/null
echo "Done. Sign in at https://www.vacationplanner.team/admin with username: $U"
