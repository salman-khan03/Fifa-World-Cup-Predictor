import React, { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase.js';
import './index.scss';

function getSessionKey() {
  let k = localStorage.getItem('wc26_sk');
  if (!k) { k = crypto.randomUUID(); localStorage.setItem('wc26_sk', k); }
  return k;
}

function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="star-picker">
      {[1,2,3,4,5].map(n => (
        <button
          key={n}
          className={`star-btn${n <= (hover || value) ? ' star-btn--filled' : ''}`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          aria-label={`${n} star`}
        >★</button>
      ))}
    </div>
  );
}

function StarDisplay({ value }) {
  return (
    <div className="star-display">
      {[1,2,3,4,5].map(n => (
        <span key={n} className={n <= value ? 'star--filled' : 'star--empty'}>★</span>
      ))}
    </div>
  );
}

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const sessionKey = getSessionKey();

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setReviews(JSON.parse(localStorage.getItem('wc26_reviews') || '[]'));
      setLoading(false);
      return;
    }
    const { data } = await supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(50);
    if (data) setReviews(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const ch = supabase.channel('reviews-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [load]);

  async function submit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError('');
    const review = {
      user_name: name.trim() || 'Anonymous',
      rating,
      content: content.trim(),
      session_key: sessionKey,
      created_at: new Date().toISOString(),
    };
    if (!isSupabaseConfigured) {
      const local = JSON.parse(localStorage.getItem('wc26_reviews') || '[]');
      local.unshift({ ...review, id: crypto.randomUUID() });
      localStorage.setItem('wc26_reviews', JSON.stringify(local));
      setReviews(local);
    } else {
      const { error: err } = await supabase.from('reviews').insert([review]);
      if (err) { setError(err.message); setSubmitting(false); return; }
      load();
    }
    setContent('');
    setName('');
    setRating(5);
    setSubmitting(false);
  }

  async function deleteReview(id) {
    if (!isSupabaseConfigured) {
      const local = JSON.parse(localStorage.getItem('wc26_reviews') || '[]').filter(r => r.id !== id);
      localStorage.setItem('wc26_reviews', JSON.stringify(local));
      setReviews(local);
      return;
    }
    await supabase.from('reviews').delete().eq('id', id).eq('session_key', sessionKey);
    load();
  }

  return (
    <div className="reviews-page">
      <div className="page-header">
        <h1 className="page-title">Community Reviews</h1>
        <p className="page-sub">Share your thoughts on the predictor</p>
      </div>

      <div className="reviews-layout">
        {/* Form */}
        <div className="review-form-card">
          <h2 className="review-form-card__title">Write a Review</h2>
          <form onSubmit={submit}>
            <div className="form-group">
              <label>Your Rating</label>
              <StarPicker value={rating} onChange={setRating} />
            </div>
            <div className="form-group">
              <label htmlFor="r-name">Name (optional)</label>
              <input
                id="r-name"
                className="form-input"
                type="text"
                placeholder="Anonymous"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={50}
              />
            </div>
            <div className="form-group">
              <label htmlFor="r-content">Review</label>
              <textarea
                id="r-content"
                className="form-input form-textarea"
                placeholder="What do you think of the predictions?"
                value={content}
                onChange={e => setContent(e.target.value)}
                maxLength={500}
                required
              />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button className="form-submit" type="submit" disabled={submitting || !content.trim()}>
              {submitting ? 'Posting…' : 'Post Review'}
            </button>
          </form>
        </div>

        {/* Feed */}
        <div className="review-feed">
          {loading ? (
            <div className="feed-loading">Loading reviews…</div>
          ) : reviews.length === 0 ? (
            <div className="feed-empty">No reviews yet. Be the first!</div>
          ) : (
            reviews.map(r => (
              <div key={r.id} className="review-card">
                <div className="review-card__header">
                  <div>
                    <div className="review-card__author">{r.user_name || 'Anonymous'}</div>
                    <StarDisplay value={r.rating} />
                  </div>
                  <div className="review-card__meta">
                    <span className="review-card__date">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                    {r.session_key === sessionKey && (
                      <button className="review-card__delete" onClick={() => deleteReview(r.id)}>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                <p className="review-card__content">{r.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}