#!/usr/bin/env bash
set -uo pipefail

cd "$(dirname "$0")/.." || exit 0
command -v bd >/dev/null 2>&1 || { echo "beads-sync: bd not installed, skipping"; exit 0; }

if [ -n "${DOLT_CREDS_JWK:-}" ] && [ -n "${DOLT_CREDS_KEY_ID:-}" ] && command -v dolt >/dev/null 2>&1; then
  creds_dir="${HOME}/.dolt/creds"
  key_file="${creds_dir}/${DOLT_CREDS_KEY_ID}.jwk"
  if [ ! -f "$key_file" ]; then
    mkdir -p "$creds_dir" && chmod 700 "$creds_dir"
    printf '%s' "$DOLT_CREDS_JWK" > "$key_file" && chmod 600 "$key_file"
  fi
  (cd "$HOME" && dolt creds use "$DOLT_CREDS_KEY_ID" >/dev/null 2>&1) || echo "beads-sync: could not select DoltHub key"
fi

chmod 700 .beads 2>/dev/null
git config beads.role maintainer 2>/dev/null

if [ ! -d .beads/embeddeddolt ] && [ ! -d .beads/dolt ]; then
  bd bootstrap -y >/dev/null 2>&1 && echo "beads-sync: database ready" || echo "beads-sync: bootstrap failed, run 'bd bootstrap' by hand"
else
  bd dolt pull >/dev/null 2>&1 && echo "beads-sync: pulled from DoltHub" || echo "beads-sync: pull skipped (offline or no DoltHub access)"
fi
exit 0
