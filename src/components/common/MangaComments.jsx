export default function MangaComments({ comments, loading, emptyText = 'Комментариев пока нет' }) {
    if (loading) return <div className="manga-comments-loading">Загрузка комментариев…</div>;
    if (!comments?.length) return <div className="manga-comments-empty">{emptyText}</div>;
    return (
        <div className="manga-comments">
            {comments.map((c) => (
                <div key={c.id} className="manga-comment">
                    <div className="manga-comment-avatar">
                        {c.avatar
                            ? <img src={c.avatar} alt="" loading="lazy" referrerPolicy="origin" />
                            : (c.user[0] || '?').toUpperCase()}
                    </div>
                    <div className="manga-comment-body">
                        <div className="manga-comment-head">
                            <span className="manga-comment-user">{c.user}</span>
                            {c.date && <span className="manga-comment-date">{new Date(c.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                        </div>
                        <div className="manga-comment-text">{c.text}</div>
                        {(c.up > 0 || c.down > 0) && (
                            <div className="manga-comment-votes">▲ {c.up} · ▼ {c.down}</div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
