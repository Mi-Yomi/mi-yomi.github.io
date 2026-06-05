# HDRezka Edge Function

Server-side HDRezka parser + self-contained player. The app embeds it as an `<iframe>`,
so no extra frontend deps. It exists because HDRezka has **no CORS API and blocks
datacenter IPs** — it must be fetched from a place where Rezka is reachable.

## Deploy

```bash
# one-time
npm i -g supabase
supabase login                       # opens browser, paste your access token
supabase link --project-ref iofadiwrrbzrdnxajgrm   # your project ref

# deploy (must be public so the iframe can load it)
supabase functions deploy hdrezka --no-verify-jwt
```

Then point the app at it — add to `.env` (and to your build env / GitHub secret):

```
VITE_HDREZKA_FN=https://iofadiwrrbzrdnxajgrm.supabase.co/functions/v1/hdrezka
```

Rebuild the app. An **"RU HDRezka"** tab now appears on every title.

## ⚠️ Geo-block

Supabase Edge Functions run in your project's region (often US/EU). HDRezka frequently
blocks those IPs. If the tab shows *"HDRezka недоступна с этого сервера"*:

1. Set a working mirror list:
   `supabase secrets set HDREZKA_MIRRORS="https://hdrezka.ag,https://rezka.ag"`
2. And/or route through a CIS/residential proxy:
   `supabase secrets set HDREZKA_PROXY="https://your-proxy/{url}"`
   (`{url}` is replaced with the URL-encoded target; or a plain prefix proxy.)
3. Redeploy. If your region simply can't reach Rezka, run the same parser on a small
   VPS in RU/CIS instead and set `VITE_HDREZKA_FN` to that host.

## Endpoints (one function, by `?action=`)

- *(no action)* → the HTML player page (what the app iframes): `?title=..&year=..&type=..`
- `?action=info&title=..&year=..` → `{ id, isSeries, translators[], seasons[] }`
- `?action=stream&id=..&translator=..&series=0|1&season=&episode=` → `{ qualities{label:url} }`
- `?action=search&q=..` → `{ results[] }`
