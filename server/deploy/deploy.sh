#!/usr/bin/env bash
# Push the current server/ tree to the VM and re-run the provisioning script
# (updates local-api.py, requirements, systemd units, Caddyfile; restarts hades).
# Usage: server/deploy/deploy.sh [user@host]
set -euo pipefail
HOST="${1:-azureuser@20.235.109.146}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
tar -C "$ROOT" -cf - server/local-api.py server/requirements.txt server/deploy \
    | ssh "$HOST" 'rm -rf ~/hades-deploy && mkdir -p ~/hades-deploy && tar -C ~/hades-deploy -xf - && sudo bash ~/hades-deploy/server/deploy/install.sh && systemctl --no-pager --lines=3 status hades'
