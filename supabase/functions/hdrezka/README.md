# HDRezka Edge Function

Resolves an HDRezka title to its embeddable player and redirects the app's `<iframe>`
to it. Targets the **kz.rezka.biz / rezka.biz** family, which embeds a **cinemar.cc**
balancer (no stream decryption needed — we just extract the iframe URL). Runs
server-side because the mirror blocks browser/CORS access, but it's reachable from far
more regions than `rezka.ag`.

✅ Validated end-to-end against `https://kz.rezka.biz` (movies + series resolve to a
cinemar.cc player). The user is in KZ, where this mirror works.

## Deploy

```bash
npm i -g supabase
supabase login
supabase link --project-ref iofadiwrrbzrdnxajgrm
supabase functions deploy hdrezka --no-verify-jwt   # public, so the iframe can load it
```

Then point the app at it (in `.env` and your build/deploy env):

```
VITE_HDREZKA_FN=https://iofadiwrrbzrdnxajgrm.supabase.co/functions/v1/hdrezka
```

Rebuild — an **"RU HDRezka"** tab appears on every title.

## If it can't reach the mirror

Supabase functions run in your project's region. If the tab shows
*"Ни одно зеркало HDRezka недоступно…"*, set secrets and redeploy:

```bash
supabase secrets set HDREZKA_MIRRORS="https://kz.rezka.biz,https://rezka.biz"
# optional proxy in a reachable region ("{url}" is replaced with the encoded target,
# or a plain prefix proxy):
supabase secrets set HDREZKA_PROXY="https://your-proxy/{url}"
```

## Debug endpoints

- `?action=resolve&title=Матрица&year=1999&type=movie` → `{ ok, embed, picked }`
- `?action=search&q=Матрица` → `{ ok, results[] }`
- *(no action)* `?title=..&year=..&type=movie|tv` → 302 → the balancer player (iframe target)
