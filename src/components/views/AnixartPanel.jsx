import { useCallback, useEffect, useRef, useState } from 'react';
import { I } from '../../lib/icons.jsx';
import { anixartFindRelease, anixartTypes, anixartSources, anixartEpisodes } from '../../lib/api/anixart.js';

/**
 * Anixart anime panel: finds the release by title, lets the user pick a voiceover
 * (озвучка) and an episode, and feeds the chosen episode URL to the shared player
 * via onPlay(). Shown only when the "Anixart" source tab is active.
 */
export default function AnixartPanel({ media, onPlay }) {
    const [status, setStatus] = useState('searching'); // searching | ready | notfound
    const [types, setTypes] = useState([]);
    const [typeId, setTypeId] = useState(null);
    const [episodes, setEpisodes] = useState([]);
    const [activeUrl, setActiveUrl] = useState(null);
    const [epLoading, setEpLoading] = useState(false);
    const releaseRef = useRef(null);
    const reqRef = useRef(0);
    // Keep onPlay current without making effects/callbacks depend on it
    const onPlayRef = useRef(onPlay);
    onPlayRef.current = onPlay;

    const loadType = useCallback(async (releaseId, tId, autoplay) => {
        setTypeId(tId);
        setEpLoading(true);
        const srcs = await anixartSources(releaseId, tId);
        const src = srcs[0];
        if (!src) { setEpisodes([]); setEpLoading(false); return; }
        const eps = await anixartEpisodes(releaseId, tId, src.id);
        setEpisodes(eps);
        setEpLoading(false);
        if (autoplay && eps[0]) { setActiveUrl(eps[0].url); onPlayRef.current(eps[0].url); }
    }, []);

    useEffect(() => {
        let cancelled = false;
        const myReq = ++reqRef.current;
        (async () => {
            setStatus('searching'); setTypes([]); setTypeId(null); setEpisodes([]); setActiveUrl(null);
            const rel = await anixartFindRelease(media);
            if (cancelled || myReq !== reqRef.current) return;
            if (!rel) { setStatus('notfound'); return; }
            releaseRef.current = rel;
            const t = await anixartTypes(rel.id);
            if (cancelled || myReq !== reqRef.current) return;
            if (!t.length) { setStatus('notfound'); return; }
            setTypes(t);
            setStatus('ready');
            loadType(rel.id, t[0].id, true);
        })();
        return () => { cancelled = true; };
    }, [media?.id, loadType]);

    if (status === 'searching') {
        return <div className="anixart-panel"><div className="anixart-status"><span className="player-tab-dot" /> Ищем на Anixart…</div></div>;
    }
    if (status === 'notfound') {
        return <div className="anixart-panel"><div className="anixart-status">На Anixart не найдено — выберите другой плеер выше</div></div>;
    }

    return (
        <div className="anixart-panel">
            <div className="anixart-row-label">{I.users} Озвучка</div>
            <div className="anixart-voices">
                {types.map(t => (
                    <button key={t.id} className={`anixart-voice ${typeId === t.id ? 'active' : ''}`} onClick={() => loadType(releaseRef.current.id, t.id, true)}>
                        {t.name}{t.episodes_count ? <span className="anixart-voice-count">{t.episodes_count}</span> : null}
                    </button>
                ))}
            </div>

            <div className="anixart-row-label">{I.film} Серия {epLoading && <span className="player-tab-dot" />}</div>
            <div className="anixart-episodes">
                {episodes.map(ep => (
                    <button key={ep.position} className={`episode-btn ${activeUrl === ep.url ? 'active' : ''}`} onClick={() => { setActiveUrl(ep.url); onPlay(ep.url); }}>
                        {ep.position}
                    </button>
                ))}
                {!epLoading && episodes.length === 0 && <span className="anixart-status">Серии не найдены</span>}
            </div>
        </div>
    );
}
