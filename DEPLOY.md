# Деплой на GitHub Pages

## Настройка (один раз)
1. Открой **Settings** → **Pages** в репозитории
2. **Build and deployment** → **Source**: Deploy from a branch
3. **Branch**: main, **Folder**: /docs
4. **Save**

## После изменений в коде
```bash
npm run build
git add docs
git commit -m "build: update"
git push
```

CI (`.github/workflows/ci.yml`) на каждый push гоняет линт, JS-тесты,
тестовую сборку и юнит-тесты серверного API (`server/test_local_api.py`).

# Деплой серверного API (Azure VM)

Backend (`server/local-api.py` + SQLite) работает на Azure VM `hADES`
(Ubuntu 22.04, публичный IP `20.235.109.146`) и доступен как
`https://hades.20-235-109-146.sslip.io/api` (sslip.io резолвит имя в IP, свой
домен не нужен). Фронтенд на GitHub Pages ходит туда через `VITE_HADES_API_URL`.
Видео-потоки и iframe-плееры через сервер не проксируются — только auth,
пользовательские данные и HDRezka resolver.

## Структура на сервере

| Путь | Что |
|---|---|
| `/opt/hades/app/local-api.py` | код API (root:hades, 640) |
| `/opt/hades/venv/` | Python venv с `server/requirements.txt` |
| `/etc/hades/hades.env` | переменные окружения (root:hades, 640, **не в git**) |
| `/var/lib/hades/hades.sqlite` | база, владелец `hades` |
| `/var/backups/hades/` | ежедневные копии базы (7 последних) |
| `/etc/systemd/system/hades.service` | сервис, `User=hades`, слушает только `127.0.0.1:3101` |
| `/etc/caddy/Caddyfile` | Caddy: HTTPS (Let's Encrypt) → `127.0.0.1:3101` |

Шаблоны всех файлов — в `server/deploy/`. Снаружи открыты только TCP 22, 80 и 443
(правила Azure NSG; 80/443 нужны Caddy для ACME и HTTPS).

## Первичная установка (один раз)

```bash
# на VM: базовые пакеты + Caddy из официального репозитория (caddyserver.com/docs/install)
sudo apt install -y python3-venv python3-pip sqlite3 caddy
```

```bash
# с локального checkout: скопировать server/ и запустить провижининг
server/deploy/deploy.sh azureuser@20.235.109.146
```

`install.sh` создаёт пользователя `hades`, каталоги, venv, ставит зависимости,
юниты systemd, Caddyfile и таймер бэкапа. После первого запуска заполни
`/etc/hades/hades.env` (шаблон — `server/deploy/hades.env.example`) и выполни
`sudo systemctl restart hades`.

## Обновление кода API

```bash
server/deploy/deploy.sh            # tar server/ → VM, install.sh, restart hades
```

или вручную: скопировать `server/local-api.py` в `/opt/hades/app/` и
`sudo systemctl restart hades`.

## Проверка

```bash
curl https://hades.20-235-109-146.sslip.io/api/health
ssh azureuser@20.235.109.146 'systemctl status hades caddy hades-backup.timer; sudo journalctl -u hades -n 50'
```

## Переменные окружения сервера

| Переменная | Назначение | По умолчанию |
|---|---|---|
| `HADES_DB_PATH` | путь к sqlite-базе | `/root/apps/hades-api/hades.sqlite` (на VM: `/var/lib/hades/hades.sqlite`) |
| `HADES_API_HOST` / `HADES_API_PORT` | адрес/порт, на котором слушает API (за Caddy — только localhost) | `127.0.0.1` / `3101` |
| `HADES_PUBLIC_URL` | внешний URL API (используется для Google OAuth callback) | `https://hades.20-235-109-146.sslip.io` |
| `HADES_ADMIN_EMAIL` | email админа — только он получает `is_admin` (= `VITE_ADMIN_EMAIL`) | пусто |
| `HADES_WHITELIST` | `off` = авто-одобрение, иначе новые юзеры ждут одобрения (= `VITE_WHITELIST`) | `on` |
| `HADES_SESSION_TTL_DAYS` | срок жизни сессии в днях | `30` |
| `HADES_AUTH_RATE_LIMIT` / `HADES_AUTH_RATE_WINDOW` | лимит попыток логина на IP / окно (сек) | `20` / `600` |
| `HADES_ALLOWED_ORIGINS` | CORS-origins через запятую | prod + localhost |
| `FIREBASE_PROJECT_ID` | проект Firebase, чьи ID-токены принимает `/api/auth/firebase` (= `VITE_FIREBASE_PROJECT_ID`) | пусто |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | серверный Google OAuth (`/api/auth/google/*`); фронтенд его не использует | пусто |
| `HADES_OAUTH_STATE_SECRET` | подпись OAuth state (`openssl rand -base64 32`) | случайный при старте |
| `HDREZKA_MIRRORS` | зеркала HDRezka через запятую | `kz.rezka.biz, rezka.biz, hdrezka.tv` |

## Бэкапы и перенос базы

`hades-backup.timer` раз в сутки запускает `/usr/local/bin/hades-backup`:
консистентная копия через sqlite3 `.backup`, `integrity_check`, gzip, хранятся
7 последних в `/var/backups/hades/`. Вручную: `sudo systemctl start hades-backup.service`.

Восстановление или перенос базы с другого сервера:

```bash
sqlite3 /path/to/hades.sqlite ".backup '/tmp/hades-migration.sqlite'"   # на старом сервере
sudo systemctl stop hades
sudo install -o hades -g hades -m 640 hades-migration.sqlite /var/lib/hades/hades.sqlite
sudo -u hades sqlite3 /var/lib/hades/hades.sqlite 'pragma integrity_check;'   # → ok
sudo systemctl start hades
```

Локальная проверка кода: `python3 server/test_local_api.py`.
