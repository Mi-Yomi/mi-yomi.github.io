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

# Деплой серверного API (VPS)

`server/local-api.py` работает на VPS за reverse-proxy с TLS. После изменения
файла скопируй его на сервер и перезапусти сервис.

Переменные окружения сервера:

| Переменная | Назначение | По умолчанию |
|---|---|---|
| `HADES_DB_PATH` | путь к sqlite-базе | `/root/apps/hades-api/hades.sqlite` |
| `HADES_ADMIN_EMAIL` | email админа — только он получает `is_admin` | пусто |
| `HADES_WHITELIST` | `off` = авто-одобрение, иначе новые юзеры ждут одобрения (должно совпадать с `VITE_WHITELIST`) | `on` |
| `HADES_SESSION_TTL_DAYS` | срок жизни сессии в днях | `30` |
| `HADES_AUTH_RATE_LIMIT` / `HADES_AUTH_RATE_WINDOW` | лимит попыток логина на IP / окно (сек) | `20` / `600` |
| `HADES_ALLOWED_ORIGINS` | CORS-origins через запятую | prod + localhost |
| `GOOGLE_CLIENT_ID/SECRET`, `FIREBASE_PROJECT_ID` | Google/Firebase auth | пусто |

Локальная проверка: `python3 server/test_local_api.py`.
