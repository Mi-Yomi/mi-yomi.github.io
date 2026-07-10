import { useRef } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import useDialogFocus from '../../hooks/useDialogFocus.js';

export default function ReviewModal() {
  const {
    reviewOpen,
    setReviewOpen,
    reviewRating,
    setReviewRating,
    tg,
    reviewText,
    setReviewText,
    reviewEditing,
    setReviewEditing,
    addReview,
  } = useApp();
  const dialogRef = useRef(null);
  const textareaRef = useRef(null);
  useDialogFocus(reviewOpen, dialogRef, textareaRef);

  const close = () => { setReviewOpen(false); setReviewEditing(null); setReviewText(''); setReviewRating(7); };

  return (
    <>
      {reviewOpen && (
          <div className="modal-overlay" onClick={close}>
              <div ref={dialogRef} className="modal-box" role="dialog" aria-modal="true" aria-labelledby="review-modal-title" tabIndex={-1} onClick={e => e.stopPropagation()}>
                  <div className="modal-title" id="review-modal-title">{reviewEditing ? 'Изменить отзыв' : 'Ваш отзыв'}</div>
                  <div style={{ textAlign: 'center', marginBottom: 6 }}>
                      <div style={{ fontSize: 36, fontWeight: 900, color: reviewRating >= 7 ? 'var(--green)' : reviewRating >= 5 ? 'var(--gold)' : 'var(--accent)' }}>{reviewRating}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>из 10</div>
                  </div>
                  <div className="review-rating-grid" role="group" aria-label="Оценка от 1 до 10">{[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <button key={n} className="review-rating-btn" aria-pressed={reviewRating === n} onClick={() => { setReviewRating(n); tg?.HapticFeedback?.impactOccurred?.('light'); }} style={{
                          background: reviewRating >= n ? (reviewRating >= 7 ? 'var(--green)' : reviewRating >= 5 ? 'var(--gold)' : 'var(--accent)') : 'var(--surface-2)',
                          color: reviewRating >= n ? (reviewRating >= 7 ? 'white' : 'black') : 'var(--text-muted)',
                      }}>{n}</button>
                  ))}</div>
                  <textarea ref={textareaRef} className="modal-textarea" aria-label="Текст отзыва" value={reviewText} onChange={e => { if (e.target.value.length <= 500) setReviewText(e.target.value); }} placeholder="Что вам понравилось? Что нет?" maxLength={500} />
                  <div className={`char-counter ${reviewText.length > 450 ? (reviewText.length >= 500 ? 'over' : 'warn') : ''}`}>{reviewText.length}/500</div>
                  <div className="modal-actions">
                      <button className="modal-btn secondary" onClick={close}>Отмена</button>
                      <button className="modal-btn primary" onClick={addReview} disabled={!reviewText.trim()}>{reviewEditing ? 'Сохранить' : 'Опубликовать'}</button>
                  </div>
              </div>
          </div>
      )}
    </>
  );
}
