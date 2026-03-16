import { useApp } from '../../context/AppContext.jsx';

export default function ReviewModal() {
  const {
    reviewOpen,
    setReviewOpen,
    reviewRating,
    setReviewRating,
    tg,
    reviewText,
    setReviewText,
    addReview,
  } = useApp();

  return (
    <>
      {reviewOpen && (
          <div className="modal-overlay" onClick={() => setReviewOpen(false)}>
              <div className="modal-box" onClick={e => e.stopPropagation()}>
                  <div className="modal-title">Ваш отзыв</div>
                  <div style={{ textAlign: 'center', marginBottom: 6 }}>
                      <div style={{ fontSize: 36, fontWeight: 900, color: reviewRating >= 7 ? 'var(--green)' : reviewRating >= 5 ? 'var(--gold)' : 'var(--accent)' }}>{reviewRating}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>из 10</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 20 }}>{[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <button key={n} onClick={() => { setReviewRating(n); tg?.HapticFeedback?.impactOccurred?.('light'); }} style={{ 
                          width: 28, height: 28, borderRadius: 8, 
                          background: reviewRating >= n ? (reviewRating >= 7 ? 'var(--green)' : reviewRating >= 5 ? 'var(--gold)' : 'var(--accent)') : 'var(--surface-2)', 
                          border: 'none', color: reviewRating >= n ? (reviewRating >= 7 ? 'white' : 'black') : 'var(--text-muted)', 
                          fontWeight: 800, fontSize: 11, cursor: 'pointer', transition: 'all 0.15s',
                          fontFamily: 'inherit'
                      }}>{n}</button>
                  ))}</div>
                  <textarea className="modal-textarea" value={reviewText} onChange={e => { if (e.target.value.length <= 500) setReviewText(e.target.value); }} placeholder="Что вам понравилось? Что нет?" maxLength={500} />
                  <div className={`char-counter ${reviewText.length > 450 ? (reviewText.length >= 500 ? 'over' : 'warn') : ''}`}>{reviewText.length}/500</div>
                  <div className="modal-actions">
                      <button className="modal-btn secondary" onClick={() => setReviewOpen(false)}>Отмена</button>
                      <button className="modal-btn primary" onClick={addReview} disabled={!reviewText.trim()}>Опубликовать</button>
                  </div>
              </div>
          </div>
      )}
    </>
  );
}
