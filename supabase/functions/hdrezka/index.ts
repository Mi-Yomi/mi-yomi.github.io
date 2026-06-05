// Supabase Edge Function — HDRezka parser + self-contained player.
//
// WHY THIS EXISTS: HDRezka has no CORS-open API AND blocks datacenter IPs, so it
// must be fetched server-side from a location where Rezka is reachable. This runs
// on Supabase; if your Supabase region is geo-blocked, set HDREZKA_PROXY to a
// CIS/residential proxy (see bottom) and requests are routed through it.
//
// Endpoints (same function, by ?action=):
//   (no action)        -> serves the HTML player page (this is what the app iframes)
//   action=info        -> { ok, found, page, isSeries, translators[], seasons[] }
//   action=stream      -> { ok, qualities{label:url}, subtitles? }
//
// Deploy:
//   supabase functions deploy hdrezka --no-verify-jwt
// (no-verify-jwt is required so the <iframe> can load it without an auth header)

const MIRRORS = (Deno.env.get('HDREZKA_MIRRORS') || 'https://hdrezka.ag,https://rezka.ag,https://hdrezka.me')
  .split(',').map((s) => s.trim()).filter(Boolean);
const PROXY = Deno.env.get('HDREZKA_PROXY') || ''; // e.g. https://user:pass@host:port  (prefixed onto requests)
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' } });

function proxied(url: string) {
  // Simple prefix-style proxy support (e.g. a CORS/region proxy that takes ?url=)
  if (!PROXY) return url;
  return PROXY.includes('{url}') ? PROXY.replace('{url}', encodeURIComponent(url)) : PROXY + url;
}

async function rezkaFetch(url: string, init: RequestInit = {}) {
  const headers = { 'User-Agent': UA, 'X-Requested-With': 'XMLHttpRequest', ...(init.headers || {}) } as Record<string, string>;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    return await fetch(proxied(url), { ...init, headers, signal: ctrl.signal });
  } finally { clearTimeout(t); }
}

let activeMirror = '';
async function mirror(): Promise<string> {
  if (activeMirror) return activeMirror;
  for (const m of MIRRORS) {
    try {
      const r = await rezkaFetch(m + '/');
      const h = await r.text();
      if (r.ok && /b-content__inline|HDREZKA|hdrezka/i.test(h)) { activeMirror = m; return m; }
    } catch { /* try next */ }
  }
  throw new Error('Ни один рабочий зеркал HDRezka недоступен с этого сервера (гео-блок). Задайте HDREZKA_PROXY.');
}

// --- "trash" URL de-obfuscation (the well-known HdRezka algorithm) ---
const TRASH = ['@', '#', '!', '^', '$'];
const trashCodes: string[] = [];
for (let n = 2; n <= 3; n++) {
  const rec = (prefix: string, depth: number) => {
    if (depth === 0) { trashCodes.push(prefix); return; }
    for (const c of TRASH) rec(prefix + c, depth - 1);
  };
  rec('', n);
}
function b64(s: string) { return btoa(unescape(encodeURIComponent(s))); }
function clearTrash(data: string): string {
  let s = data.replace('#h', '').split('//_//').join('');
  for (const code of trashCodes) s = s.split(b64(code)).join('');
  try { return decodeURIComponent(escape(atob(s + '=='))); } catch { return atob(s + '=='); }
}
// "[360p]https://a.mp4 or https://a.m3u8,[480p]https://b.mp4" -> { "360p": url, ... }
function parseQualities(decoded: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const block of decoded.split(',')) {
    const m = block.match(/\[([^\]]+)\](.+)/);
    if (!m) continue;
    const label = m[1].replace(/<[^>]+>/g, '').trim();
    const urls = m[2].split(/\s+or\s+|\s+/).filter((u) => /^https?:\/\//.test(u));
    const best = urls.find((u) => u.includes('.mp4')) || urls[urls.length - 1];
    if (best) out[label] = best;
  }
  return out;
}

function stripTags(s: string) { return s.replace(/<[^>]+>/g, '').trim(); }

async function search(query: string) {
  const base = await mirror();
  const r = await rezkaFetch(`${base}/search/?do=search&subaction=search&q=${encodeURIComponent(query)}`);
  const html = await r.text();
  const items: { title: string; url: string; year: string }[] = [];
  const re = /<a href="(https?:\/\/[^"]+\/\d+-[^"]+\.html)">\s*(?:<span[^>]*>[\s\S]*?<\/span>)?\s*<div class="b-content__inline_item-cover">[\s\S]*?<div class="b-content__inline_item-link">\s*<a[^>]*>([^<]+)<\/a>\s*<div>([^<]*)<\/div>/g;
  let m;
  while ((m = re.exec(html))) items.push({ url: m[1], title: stripTags(m[2]), year: stripTags(m[3]) });
  if (!items.length) {
    // looser fallback: any result links
    const re2 = /href="(https?:\/\/[^"]+\/(?:films|series|cartoons|animation)\/[^"]+\/\d+-[^"]+\.html)"/g;
    const seen = new Set<string>();
    while ((m = re2.exec(html))) { if (!seen.has(m[1])) { seen.add(m[1]); items.push({ url: m[1], title: '', year: '' }); } }
  }
  return items;
}

async function pageInfo(pageUrl: string) {
  const r = await rezkaFetch(pageUrl);
  const html = await r.text();
  const init = html.match(/sof\.tv\.initCDN(Movies|Series)Events\((\d+),\s*(\d+)/);
  const isSeries = !!init && init[1] === 'Series';
  const id = init?.[2] || html.match(/data-id="(\d+)"/)?.[1] || '';
  const defaultTranslator = init?.[3] || '';
  const translators: { id: string; name: string }[] = [];
  const tre = /<li[^>]*class="b-translator__item[^"]*"[^>]*data-translator_id="(\d+)"[^>]*>([\s\S]*?)<\/li>/g;
  let m;
  while ((m = tre.exec(html))) translators.push({ id: m[1], name: stripTags(m[2]) || ('Озвучка ' + m[1]) });
  if (!translators.length && defaultTranslator) translators.push({ id: defaultTranslator, name: 'По умолчанию' });
  // seasons/episodes (series)
  const seasons: { id: string; episodes: string[] }[] = [];
  if (isSeries) {
    const epMap: Record<string, Set<string>> = {};
    const ere = /data-season_id="(\d+)"\s+data-episode_id="(\d+)"/g;
    while ((m = ere.exec(html))) { (epMap[m[1]] ||= new Set()).add(m[2]); }
    for (const s of Object.keys(epMap).sort((a, b) => +a - +b)) {
      seasons.push({ id: s, episodes: [...epMap[s]].sort((a, b) => +a - +b) });
    }
  }
  return { id, isSeries, defaultTranslator, translators, seasons, title: stripTags(html.match(/<h1[^>]*itemprop="name"[^>]*>([^<]+)/)?.[1] || '') };
}

async function getStream(id: string, translator: string, isSeries: boolean, season?: string, episode?: string) {
  const base = await mirror();
  const body = new URLSearchParams({ id, translator_id: translator, action: isSeries ? 'get_stream' : 'get_movie' });
  if (isSeries) { body.set('season', season || '1'); body.set('episode', episode || '1'); }
  const r = await rezkaFetch(`${base}/ajax/get_cdn_series/?t=${Date.now()}`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString(),
  });
  const data = await r.json().catch(() => null);
  if (!data?.success || !data?.url) return { qualities: {}, subtitles: data?.subtitle || '' };
  return { qualities: parseQualities(clearTrash(data.url)), subtitles: data?.subtitle || '' };
}

async function resolveBest(title: string, year: string) {
  const results = await search(title);
  if (!results.length) return null;
  const hit = (year && results.find((r) => r.year && r.year.includes(year))) || results[0];
  return hit;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const url = new URL(req.url);
  const p = url.searchParams;
  const action = p.get('action');

  try {
    if (action === 'info') {
      let page = p.get('page');
      if (!page) {
        const hit = await resolveBest(p.get('title') || '', p.get('year') || '');
        if (!hit) return json({ ok: true, found: false });
        page = hit.url;
      }
      const info = await pageInfo(page!);
      return json({ ok: true, found: !!info.id, page, ...info });
    }
    if (action === 'stream') {
      const out = await getStream(
        p.get('id') || '', p.get('translator') || '',
        p.get('series') === '1', p.get('season') || undefined, p.get('episode') || undefined,
      );
      return json({ ok: true, ...out });
    }
    if (action === 'search') {
      return json({ ok: true, results: await search(p.get('q') || p.get('title') || '') });
    }
    // default: the player page (this is the iframe target)
    return new Response(PLAYER_HTML, { headers: { ...CORS, 'Content-Type': 'text/html; charset=utf-8' } });
  } catch (e) {
    if (action) return json({ ok: false, error: String(e?.message || e) }, 200);
    return new Response(`<body style="background:#000;color:#bbb;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;padding:20px">HDRezka недоступна с этого сервера.<br>${String(e?.message || e)}</body>`, { headers: { ...CORS, 'Content-Type': 'text/html; charset=utf-8' } });
  }
});

// --- Self-contained player page (the app iframes "<fn-url>?title=..&year=..&type=..") ---
const PLAYER_HTML = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  :root{color-scheme:dark}
  *{box-sizing:border-box}body{margin:0;background:#000;color:#eee;font-family:Inter,system-ui,sans-serif;height:100vh;display:flex;flex-direction:column}
  video{flex:1;width:100%;height:100%;background:#000;min-height:0}
  .bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:8px 10px;background:#111;border-top:1px solid #222}
  select{background:#1c1c1c;color:#fff;border:1px solid #333;border-radius:8px;padding:7px 10px;font:inherit;font-weight:600;max-width:46vw}
  .msg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;color:#aaa;font-size:14px}
  .lbl{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-right:2px}
</style></head><body>
<div style="position:relative;flex:1;min-height:0;display:flex"><video id="v" controls playsinline autoplay></video><div class="msg" id="msg">Поиск на HDRezka…</div></div>
<div class="bar" id="bar" style="display:none">
  <span class="lbl">Озвучка</span><select id="tr"></select>
  <span class="lbl" id="slbl" style="display:none">Сезон</span><select id="se" style="display:none"></select>
  <span class="lbl" id="elbl" style="display:none">Серия</span><select id="ep" style="display:none"></select>
  <span class="lbl">Качество</span><select id="q"></select>
</div>
<script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js"></script>
<script>
(function(){
  var P=new URLSearchParams(location.search), FN=location.pathname;
  var v=document.getElementById('v'),msg=document.getElementById('msg'),bar=document.getElementById('bar');
  var trS=document.getElementById('tr'),seS=document.getElementById('se'),epS=document.getElementById('ep'),qS=document.getElementById('q');
  var info=null,hls=null;
  function show(t){msg.textContent=t;msg.style.display='flex';}
  function hide(){msg.style.display='none';}
  function api(params){return fetch(FN+'?'+params).then(function(r){return r.json();});}
  function fill(sel,arr,val,label){sel.innerHTML='';arr.forEach(function(o){var op=document.createElement('option');op.value=o.value;op.textContent=label?label(o):o.label;if(o.value==val)op.selected=true;sel.appendChild(op);});}
  function play(u){
    hide();if(hls){hls.destroy();hls=null;}
    if(/\\.m3u8/.test(u)&&window.Hls&&Hls.isSupported()){hls=new Hls({maxBufferLength:30});hls.loadSource(u);hls.attachMedia(v);}
    else{v.src=u;}
    v.play().catch(function(){});
  }
  function loadStream(){
    show('Загрузка потока…');
    var s=info.isSeries;
    var qp='action=stream&id='+info.id+'&translator='+trS.value+'&series='+(s?1:0);
    if(s)qp+='&season='+seS.value+'&episode='+epS.value;
    api(qp).then(function(d){
      if(!d.ok||!d.qualities||!Object.keys(d.qualities).length){show('Поток не найден — смените озвучку/серию');return;}
      var qs=Object.keys(d.qualities).map(function(k){return {value:d.qualities[k],label:k};});
      // prefer 1080/720
      qs.sort(function(a,b){return (parseInt(b.label)||0)-(parseInt(a.label)||0);});
      window._q=d.qualities;fill(qS,qs,qs[0].value);play(qs[0].value);
    }).catch(function(){show('Ошибка загрузки потока');});
  }
  function buildEpisodes(){
    var s=info.seasons||[];
    if(!s.length){seS.style.display=epS.style.display='none';document.getElementById('slbl').style.display=document.getElementById('elbl').style.display='none';return;}
    document.getElementById('slbl').style.display=document.getElementById('elbl').style.display='';seS.style.display=epS.style.display='';
    fill(seS,s.map(function(x){return {value:x.id,label:x.id+' сезон'};}),s[0].id);
    function eps(){var cur=s.find(function(x){return x.id==seS.value;})||s[0];fill(epS,cur.episodes.map(function(e){return {value:e,label:e+' серия'};}),cur.episodes[0]);}
    eps();seS.onchange=function(){eps();loadStream();};epS.onchange=loadStream;
  }
  qS.onchange=function(){play(qS.value);};
  trS.onchange=loadStream;
  // boot
  api('action=info&title='+encodeURIComponent(P.get('title')||'')+'&year='+encodeURIComponent(P.get('year')||'')).then(function(d){
    if(!d.ok||!d.found){show('На HDRezka не найдено');return;}
    info=d;bar.style.display='flex';
    fill(trS,(d.translators||[]).map(function(t){return {value:t.id,label:t.name};}),d.defaultTranslator);
    buildEpisodes();loadStream();
  }).catch(function(e){show('HDRezka недоступна: '+e);});
})();
</script>
</body></html>`;
