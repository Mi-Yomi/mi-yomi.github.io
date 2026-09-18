# HADES Cinema — мобильное приложение

Expo-приложение (expo-router). Бэкенд общий с сайтом: самостоятельный HADES API
(`server/local-api.py`), а не Supabase. Каталог и постеры приходят из TMDB,
видео открывается во внешних плеерах — через наш сервер поток не проксируется.

## Запуск

```bash
npm install
cp .env.example .env    # заполни ключи
npx expo start
```

Переменные окружения — в `.env.example`. Главная:
`EXPO_PUBLIC_HADES_API_URL` (по умолчанию боевой адрес из `lib/config.js`).

## Как устроен доступ к данным

`lib/supabase.js` — тонкий клиент HADES API, повторяющий форму вызовов Supabase
(`supabase.from(...).select().eq()`, `supabase.auth.*`), поэтому экраны не знают
о смене бэкенда. Отличия от настоящего Supabase:

| Возможность | Как сейчас |
|---|---|
| сессия | токен HADES в `AsyncStorage`, ключ `hades_local_api_token` |
| вход по паролю | `/api/auth/signin`, работает сразу |
| вход через Google | `/api/auth/google/start` в системном браузере, возврат в `myapp://auth`; нужен `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` на сервере |
| realtime | заглушка, уведомления обновляются при загрузке экрана |
| хранилище файлов | нет, аватары лежат в профиле как `data:`-URI |

Таблицы, которые отдаёт сервер, перечислены в `TABLE_RULES` в
`server/local-api.py`. Права проверяет сервер: чужие строки изменить нельзя,
статус одобрения и `is_admin` клиент задать не может.

## Сборка

EAS-профили — в `eas.json`. Схема диплинков (`myapp`) задана в `app.json` и
должна совпадать с `HADES_OAUTH_REDIRECT_PREFIXES` на сервере, иначе возврат
после входа через Google будет отклонён.
