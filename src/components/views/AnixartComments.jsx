import { useEffect, useRef, useState } from 'react';
import { I } from '../../lib/icons.jsx';
import { anixartFindRelease, anixartComments } from '../../lib/api/anixart.js';

/**
 * Anixart discussion for anime — finds the release by title and shows the top
 * community comments (with avatars, likes and spoiler blur). Renders nothing if
 * the title isn't on Anixart or has no comments.
 */
export default function AnixartComments({ media }) {
    const [status, setStatus] = useState('loading'); // loading | ready | hidden
    const [comments, setComments] = useState([]);
    const [revealed, setRevealed] = useState({});
    const reqRef = useRef(0);

    useEffect(() => {
        let cancelled = false;
        const myReq = ++reqRef.current;
        (async () => {
            setStatus('loading'); setComments([]); setRevealed({});
            const rel = await anixartFindRelease(media);
            if (cancelled || myReq !== reqRef.current) return;
            if (!rel) { setStatus('hidden'); return; }
            const list = await anixartComments(rel.id, 0, 2);
            if (cancelled || myReq !== reqRef.current) return;
            setComments(list);
            setStatus(list.length ? 'ready' : 'hidden');
        })();
        return () => { cancelled = true; };
    }, [media?.id]);

    if (status === 'loading') return <div className="ax-comments-status"><span className="player-tab-dot" /> Загрузка обсуждения с Anixart…</div>;
    if (status === 'hidden') return null;

    return (
        <div className="ax-comments">
            <div className="ax-comments-title">{I.msg} Обсуждение на Anixart <span className="comments-count">{comments.length}</span></div>
            {comments.map(c => {
                const date = c.timestamp ? new Date(c.timestamp * 1000).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
                const spoiler = c.is_spoiler && !revealed[c.id];
                return (
                    <div key={c.id} className="ax-comment">
                        <div className="ax-comment-head">
                            <div className="ax-comment-avatar">
                                {c.profile?.avatar ? <img src={c.profile.avatar} alt="" loading="lazy" /> : (c.profile?.login?.[0]?.toUpperCase() || '?')}
                            </div>
                            <div className="ax-comment-meta">
                                <div className="ax-comment-author">{c.profile?.login || 'Аноним'}{c.posted_at_episode ? <span className="ax-comment-ep"> · {c.posted_at_episode} серия</span> : null}</div>
                                <div className="ax-comment-date">{date}</div>
                            </div>
                            {c.likes_count > 0 && <div className="ax-comment-likes">{I.thumbsUp} {c.likes_count}</div>}
                        </div>
                        <div className={`ax-comment-text ${spoiler ? 'spoiler' : ''}`} onClick={() => spoiler && setRevealed(p => ({ ...p, [c.id]: true }))}>
                            {spoiler ? '⚠ Спойлер — нажмите, чтобы показать' : c.message}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
