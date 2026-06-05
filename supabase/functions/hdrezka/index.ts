// Supabase Edge Function — HDRezka resolver (kz.rezka.biz / rezka.biz family).
//
// These mirrors embed a balancer player (cinemar.cc) as an <iframe> rather than
// HDRezka's native encrypted CDN — so no decryption is needed. We fetch the film
// page server-side (the mirror is reachable from more regions than rezka.ag) and
// redirect the app's <iframe> straight to the balancer player. The balancer handles
// quality / voiceover / episodes inside itself.
//
// Deploy:  supabase functions deploy hdrezka --no-verify-jwt
//
// Endpoints (?action=):
//   (no action)        -> 302 redirect to the balancer player (the iframe target)
//   action=resolve     -> { ok, embed, picked } (debug)
//   action=search      -> { ok, results[] }       (debug)

const MIRRORS = (Deno.env.get('HDREZKA_MIRRORS') || 'https://kz.rezka.biz,https://rezka.biz,https://hdrezka.tv')
  .split(',').map((s) => s.trim()).filter(Boolean);
const PROXY = Deno.env.get('HDREZKA_PROXY') || ''; // optional; "...{url}" or a plain prefix
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' } });
const errHtml = (msg: string) =>
  new Response(`<!doctype html><meta charset="utf-8"><body style="margin:0;background:#000;color:#bbb;font:14px/1.5 system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;padding:24px">${msg}</body>`,
    { headers: { ...CORS, 'Content-Type': 'text/html; charset=utf-8' } });

function proxied(url: string) {
  if (!PROXY) return url;
  return PROXY.includes('{url}') ? PROXY.replace('{url}', encodeURIComponent(url)) : PROXY + url;
}
async function fetchPage(url: string, ajax = false) {
  const headers: Record<string, string> = { 'User-Agent': UA, 'Accept-Language': 'ru,en;q=0.8' };
  if (ajax) headers['X-Requested-With'] = 'XMLHttpRequest'; // ONLY for ajax — on a page GET it returns a fragment
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try { return await fetch(proxied(url), { headers, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

let activeMirror = '';
async function mirror(): Promise<string> {
  if (activeMirror) return activeMirror;
  for (const m of MIRRORS) {
    try {
      const r = await fetchPage(m + '/');
      const h = await r.text();
      if (r.ok && /b-content__inline|postItem|HDREZKA|hdrezka|rezka/i.test(h)) { activeMirror = m; return m; }
    } catch { /* next */ }
  }
  throw new Error('Ни одно зеркало HDRezka недоступно с этого сервера (гео-блок). Задайте HDREZKA_MIRRORS / HDREZKA_PROXY.');
}

type Item = { url: string; isSeries: boolean; year: string };
async function search(query: string): Promise<Item[]> {
  const base = await mirror();
  const r = await fetchPage(`${base}/search/?do=search&subaction=search&q=${encodeURIComponent(query)}`);
  const html = await r.text();
  const items: Item[] = [];
  for (const chunk of html.split('class="postItem"').slice(1)) {
    const url = (chunk.match(/data-link="([^"]+)"/) || chunk.match(/href="(https?:\/\/[^"]+\/\d+-[^"]+\.html)"/) || [])[1];
    if (!url) continue;
    const entity = (chunk.match(/class="entity">\s*([^<]+)/) || [])[1] || '';
    // year that's visible text (avoid years inside poster paths like /2021-06/)
    const year = (chunk.match(/[>\s(]((?:19|20)\d{2})[<\s)]/) || [])[1] || '';
    items.push({ url, isSeries: /сериал|серии/i.test(entity), year });
  }
  if (!items.length) {
    const seen = new Set<string>();
    for (const m of html.matchAll(/href="(https?:\/\/[^"]+\/\d+-[^"]+\.html)"/g)) {
      if (!seen.has(m[1])) { seen.add(m[1]); items.push({ url: m[1], isSeries: false, year: '' }); }
    }
  }
  return items;
}

async function resolveEmbed(pageUrl: string): Promise<string | null> {
  const r = await fetchPage(pageUrl);
  const html = await r.text();
  const m =
    html.match(/<iframe[^>]+src="(https?:\/\/[^"]*(?:cinemar|\/embed\/|cdnvideo|voidboost|hdvb|collaps|player)[^"]*)"/i) ||
    html.match(/<iframe[^>]+src="(https?:\/\/[^"]+)"/i);
  if (!m) return null;
  let u = m[1].replace(/&amp;/g, '&');
  if (u.startsWith('//')) u = 'https:' + u;
  return u;
}

async function resolve(title: string, year: string, type: string): Promise<{ embed: string | null; picked?: Item }> {
  const items = await search(title);
  if (!items.length) return { embed: null };
  const wantSeries = type === 'tv';
  const pick =
    (year && items.find((i) => i.year === String(year) && (!type || i.isSeries === wantSeries))) ||
    (year && items.find((i) => i.year === String(year))) ||
    (type && items.find((i) => i.isSeries === wantSeries)) ||
    items[0];
  return { embed: await resolveEmbed(pick.url), picked: pick };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const p = new URL(req.url).searchParams;
  const action = p.get('action');
  const title = p.get('title') || '';
  const year = p.get('year') || '';
  const type = p.get('type') || '';
  try {
    if (action === 'search') return json({ ok: true, results: await search(p.get('q') || title) });
    if (action === 'resolve') { const { embed, picked } = await resolve(title, year, type); return json({ ok: !!embed, embed, picked }); }
    if (!title) return errHtml('Нет параметра title');
    const { embed } = await resolve(title, year, type);
    if (!embed) return errHtml('На HDRezka не найдено: ' + title);
    // 302 straight to the balancer. (Supabase forces text/html responses to text/plain,
    // so we can't serve a wrapper page.) cinemar.cc 404s — with X-Frame-Options, which
    // is what made the iframe hang — when it gets NO referer, so the app loads the
    // HDRezka iframe with referrerPolicy other than no-referrer (cinemar accepts any).
    return new Response(null, { status: 302, headers: { ...CORS, Location: embed } });
  } catch (e) {
    const msg = String((e as Error)?.message || e);
    return action ? json({ ok: false, error: msg }) : errHtml('HDRezka: ' + msg);
  }
});
