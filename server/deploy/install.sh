#!/usr/bin/env bash
# Provision (or re-provision) the HADES API on Ubuntu 22.04. Idempotent.
# Prerequisites: apt install python3-venv sqlite3 caddy   (see DEPLOY.md)
# Usage, from a copy of the server/ directory on the VM:
#   sudo bash server/deploy/install.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
APP_DIR=/opt/hades/app
VENV=/opt/hades/venv
DATA_DIR=/var/lib/hades
ENV_DIR=/etc/hades
BACKUP_DIR=/var/backups/hades

id -u hades >/dev/null 2>&1 || useradd --system --home-dir "$DATA_DIR" --shell /usr/sbin/nologin hades
install -d -o root  -g hades -m 750 /opt/hades "$APP_DIR" "$ENV_DIR"
install -d -o hades -g hades -m 750 "$DATA_DIR" "$BACKUP_DIR"

install -o root -g hades -m 640 "$HERE/../local-api.py"      "$APP_DIR/local-api.py"
install -o root -g hades -m 640 "$HERE/../requirements.txt"  "$APP_DIR/requirements.txt"

[ -x "$VENV/bin/python" ] || python3 -m venv "$VENV"
"$VENV/bin/pip" install --quiet --upgrade pip
"$VENV/bin/pip" install --quiet -r "$APP_DIR/requirements.txt"

if [ ! -f "$ENV_DIR/hades.env" ]; then
    install -o root -g hades -m 640 "$HERE/hades.env.example" "$ENV_DIR/hades.env"
    echo "NOTE: $ENV_DIR/hades.env was created from the example — edit it, then: systemctl restart hades"
fi

install -o root -g root -m 644 "$HERE/hades.service"        /etc/systemd/system/hades.service
install -o root -g root -m 755 "$HERE/hades-backup"         /usr/local/bin/hades-backup
install -o root -g root -m 644 "$HERE/hades-backup.service" /etc/systemd/system/hades-backup.service
install -o root -g root -m 644 "$HERE/hades-backup.timer"   /etc/systemd/system/hades-backup.timer
install -o root -g root -m 644 "$HERE/Caddyfile"            /etc/caddy/Caddyfile

systemctl daemon-reload
systemctl enable --now hades.service hades-backup.timer
systemctl restart hades.service
systemctl reload caddy || systemctl restart caddy
echo "install.sh: done"
