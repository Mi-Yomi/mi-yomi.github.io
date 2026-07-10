import { useCallback, useEffect, useRef, useState } from 'react';
import { I } from '../../lib/icons.jsx';
import { anixartFindRelease, anixartRelease, anixartTypes, anixartSources, anixartEpisodes } from '../../lib/api/anixart.js';

/**
 * Anixart anime controls — a compact row of selects (season/part, voiceover, episode)
 * shown just above the player, plus the Anixart rating. Picking any of them feeds the
 * chosen episode URL to the shared iframe via onPlay().
 */
export default function AnixartPanel({ media, onPlay }) {
    const [status, setStatus] = useState('searching'); // searching | ready | notfound
    const [seasons, setSeasons] = useState([]);         // [{ id, label }] from related_releases
    const [activeReleaseId, setActiveReleaseId] = useState(null);
    const [grade, setGrade] = useState(null);
    const [types, setTypes] = useState([]);             // voiceovers
    const [typeId, setTypeId] = useState(null);
    const [episodes, setEpisodes] = useState([]);
    const [activeEp, setActiveEp] = useState(null);
    const [epLoading, setEpLoading] = useState(false);
    const onPlayRef = useRef(onPlay);
    onPlayRef.current = onPlay;
    const reqRef = useRef(0);

    const loadType = useCallback(async (releaseId, tId, autoplay) => {
        setTypeId(tId);
        setEpLoading(true);
        const srcs = await anixartSources(releaseId, tId);
        // prefer a non-Kodik balancer when the voiceover offers one (Kodik is flaky)
        const src = srcs.find(s => !/kodik/i.test(s.name)) || srcs[0];
        if (!src) { setEpisodes([]); setEpLoading(false); return; }
        const eps = await anixartEpisodes(releaseId, tId, src.id);
        setEpisodes(eps);
        setEpLoading(false);
        if (autoplay && eps[0]) { setActiveEp(eps[0].position); onPlayRef.current(eps[0].url); }
    }, []);

    // media -> find release, seasons (related parts) and rating
    useEffect(() => {
        let cancelled = false;
        const myReq = ++reqRef.current;
        (async () => {
            setStatus('searching'); setSeasons([]); setActiveReleaseId(null); setGrade(null);
            setTypes([]); setTypeId(null); setEpisodes([]); setActiveEp(null);
            const lite = await anixartFindRelease(media);
            if (cancelled || myReq !== reqRef.current) return;
            if (!lite) { setStatus('notfound'); return; }
            const full = await anixartRelease(lite.id);
            if (cancelled || myReq !== reqRef.current) return;
            const rel = full || lite;
            setGrade(typeof rel.grade === 'number' && rel.grade > 0 ? rel.grade : null);
            let list = (rel.related_releases && rel.related_releases.length)
                ? rel.related_releases
                : [{ id: lite.id, title_ru: lite.title_ru, title_original: lite.title_original, year: lite.year }];
            const seen = new Set();
            list = list.filter(r => !seen.has(r.id) && seen.add(r.id));
            setSeasons(list.map(r => ({ id: r.id, label: (r.title_ru || r.title_original || `#${r.id}`) + (r.year ? ` (${r.year})` : '') })));
            setActiveReleaseId(lite.id);
            setStatus('ready');
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- re-search only when the title actually changes, not on object identity churn
    }, [media?.id]);

    // active release (season) -> voiceovers, auto-select the first
    useEffect(() => {
        if (!activeReleaseId) return;
        let cancelled = false;
        (async () => {
            setTypes([]); setTypeId(null); setEpisodes([]); setActiveEp(null);
            const t = await anixartTypes(activeReleaseId);
            if (cancelled) return;
            setTypes(t);
            if (t[0]) loadType(activeReleaseId, t[0].id, true);
        })();
        return () => { cancelled = true; };
    }, [activeReleaseId, loadType]);

    if (status === 'searching') return <div className="anixart-bar"><span className="player-tab-dot" /> Ищем на Anixart…</div>;
    if (status === 'notfound') return <div className="anixart-bar anixart-bar-muted">На Anixart не найдено — выберите другой плеер выше</div>;

    const playEp = (pos) => {
        const ep = episodes.find(e => String(e.position) === String(pos));
        if (ep) { setActiveEp(ep.position); onPlay(ep.url); }
    };

    return (
        <div className="anixart-controls">
            {seasons.length > 1 && (
                <label className="anixart-field">
                    <span className="anixart-field-label">Сезон / часть</span>
                    <select className="anixart-select" value={activeReleaseId || ''} onChange={e => setActiveReleaseId(Number(e.target.value))}>
                        {seasons.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                </label>
            )}
            <label className="anixart-field">
                <span className="anixart-field-label">Озвучка</span>
                <select className="anixart-select" value={typeId || ''} onChange={e => loadType(activeReleaseId, Number(e.target.value), true)}>
                    {types.map(t => <option key={t.id} value={t.id}>{t.name}{t.episodes_count ? ` · ${t.episodes_count}` : ''}</option>)}
                </select>
            </label>
            <label className="anixart-field">
                <span className="anixart-field-label">Серия{epLoading ? ' …' : ''}</span>
                <select className="anixart-select" value={activeEp || ''} onChange={e => playEp(e.target.value)} disabled={epLoading || episodes.length === 0}>
                    {episodes.map(ep => <option key={ep.position} value={ep.position}>{ep.name || `Серия ${ep.position}`}</option>)}
                </select>
            </label>
            {grade ? <span className="anixart-grade">{I.star} {grade.toFixed(2)}</span> : null}
        </div>
    );
}
