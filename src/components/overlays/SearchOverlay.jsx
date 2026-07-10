import { useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { I } from '../../lib/icons.jsx';
import Card from '../common/Card.jsx';
import useDialogFocus from '../../hooks/useDialogFocus.js';
import '../../styles/search.css';

export default function SearchOverlay() {
  const {
    searchOpen,
    query,
    setQuery,
    setSearchOpen,
    setResults,
    setSearchFiltersOpen,
    setDiscoverResults,
    searchFiltersOpen,
    searchFilterType,
    setSearchFilterType,
    searchFilterGenre,
    setSearchFilterGenre,
    searchFilterYearFrom,
    setSearchFilterYearFrom,
    searchFilterYearTo,
    setSearchFilterYearTo,
    searchFilterRating,
    setSearchFilterRating,
    searchFilterSort,
    setSearchFilterSort,
    runDiscover,
    searchLoading,
    discoverResults,
    results,
    openDetails,
    searchHistory,
    clearSearchHistory,
  } = useApp();

  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const maxReleaseYear = new Date().getFullYear() + 2;
  useDialogFocus(searchOpen, dialogRef, inputRef);

  useEffect(() => {
    if (searchOpen) inputRef.current?.select();
  }, [searchOpen]);

  return (
    <div ref={dialogRef} className={`overlay search-view ${searchOpen ? 'open' : ''}`}
        role="dialog" aria-modal="true" aria-label="Поиск" tabIndex={-1} inert={searchOpen ? undefined : ''}>
        <div className="search-header">
            <input ref={inputRef} className="search-input" aria-label="Поиск фильмов и сериалов" placeholder="Поиск фильмов и сериалов..." value={query} onChange={e => setQuery(e.target.value)} />
            <button className="search-cancel" onClick={() => { setSearchOpen(false); setQuery(''); setResults([]); setSearchFiltersOpen(false); setDiscoverResults([]); }}>Отмена</button>
        </div>

        {/* Quick type filter (always visible) */}
        <div className="search-quick-filter">
            {[{id:'all',label:'Все'},{id:'movie',label:'Фильмы'},{id:'tv',label:'Сериалы'}].map(t => (
                <button key={t.id} className={`search-quick-btn ${searchFilterType === t.id ? 'active' : ''}`}
                    aria-pressed={searchFilterType === t.id} onClick={() => setSearchFilterType(t.id)}>{t.label}</button>
            ))}
        </div>

        {/* Filter Toggle */}
        <button className={`search-filters-toggle ${searchFiltersOpen ? 'active' : ''}`} aria-expanded={searchFiltersOpen} aria-controls="search-advanced-filters" onClick={() => setSearchFiltersOpen(!searchFiltersOpen)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
            {searchFiltersOpen ? 'Скрыть фильтры' : 'Фильтры'}
        </button>

        {searchFiltersOpen && (
            <div className="search-filters-panel" id="search-advanced-filters">
                <div className="filter-row">
                    <div className="filter-label">Тип</div>
                    <div className="filter-chips">
                        {[{id:'all',label:'Все'},{id:'movie',label:'Фильмы'},{id:'tv',label:'Сериалы'}].map(t => (
                            <button key={t.id} className={`filter-chip ${searchFilterType === t.id ? 'active' : ''}`} aria-pressed={searchFilterType === t.id} onClick={() => setSearchFilterType(t.id)}>{t.label}</button>
                        ))}
                    </div>
                </div>
                <div className="filter-row">
                    <div className="filter-label">Жанр</div>
                    <div className="filter-chips">
                        {[{id:'',label:'Все'},{id:'28',label:'Экшн'},{id:'35',label:'Комедия'},{id:'18',label:'Драма'},{id:'27',label:'Хоррор'},{id:'878',label:'Sci-Fi'},{id:'10749',label:'Романтика'},{id:'53',label:'Триллер'}].map(g => (
                            <button key={g.id} className={`filter-chip ${searchFilterGenre === g.id ? 'active' : ''}`} aria-pressed={searchFilterGenre === g.id} onClick={() => setSearchFilterGenre(g.id)}>{g.label}</button>
                        ))}
                    </div>
                </div>
                <div className="filter-row">
                    <div className="filter-label">Год</div>
                    <div className="filter-year-row">
                        <input className="filter-year-input" aria-label="Год выпуска от" placeholder="от" value={searchFilterYearFrom} onChange={e => setSearchFilterYearFrom(e.target.value)} type="number" min="1970" max={maxReleaseYear} />
                        <span style={{color:'var(--text-muted)'}}>—</span>
                        <input className="filter-year-input" aria-label="Год выпуска до" placeholder="до" value={searchFilterYearTo} onChange={e => setSearchFilterYearTo(e.target.value)} type="number" min="1970" max={maxReleaseYear} />
                    </div>
                </div>
                <div className="filter-row">
                    <div className="filter-label">Минимальный рейтинг</div>
                    <div className="filter-rating-row">
                        {[0,5,6,7,8,9].map(n => (
                            <button key={n} className={`filter-rating-btn ${searchFilterRating === n ? 'active' : ''}`} aria-pressed={searchFilterRating === n} onClick={() => setSearchFilterRating(n)}>{n === 0 ? 'Все' : `${n}+`}</button>
                        ))}
                    </div>
                </div>
                <div className="filter-row">
                    <div className="filter-label">Сортировка</div>
                    <div className="filter-sort-row">
                        {[{id:'popularity.desc',label:'Популярные'},{id:'vote_average.desc',label:'Рейтинг'},{id:'primary_release_date.desc',label:'Новые'}].map(s => (
                            <button key={s.id} className={`filter-sort-btn ${searchFilterSort === s.id ? 'active' : ''}`} aria-pressed={searchFilterSort === s.id} onClick={() => setSearchFilterSort(s.id)}>{s.label}</button>
                        ))}
                    </div>
                </div>
                <button className="filter-apply" onClick={runDiscover}>{I.search} Применить фильтры</button>
            </div>
        )}

        <div className="search-results">
            {searchLoading ? (
                <div className="search-loading">
                    <div className="search-loading-dot"></div>
                    <span>Ищем...</span>
                </div>
            ) : discoverResults.length > 0 ? (
                <div className="search-grid">{discoverResults.map(r => <Card key={r.id} item={r} onSelect={(item, type) => { setSearchOpen(false); openDetails(item, type); }} type={r.media_type} />)}</div>
            ) : results.length > 0 ? (
                <div className="search-grid">{results.map(r => <Card key={r.id} item={r} onSelect={(item, type) => { setSearchOpen(false); openDetails(item, type); }} type={r.media_type} />)}</div>
            ) : query ? (
                <div className="search-empty search-empty-padded">
                    <div className="search-empty-icon">{I.search}</div>
                    <div className="search-empty-title">Ничего не найдено</div>
                    <div className="search-empty-hint">Попробуйте другой запрос или фильтры</div>
                </div>
            ) : (
                <div>
                    {searchHistory.length > 0 && !searchFiltersOpen && (
                        <div className="search-history">
                            <div className="search-history-header">
                                <div className="search-history-title">Недавние запросы</div>
                                <button className="search-history-clear" onClick={clearSearchHistory}>Очистить</button>
                            </div>
                            {searchHistory.map((h, i) => (
                                <button key={i} className="search-history-item" onClick={() => setQuery(h)}>
                                    <span className="search-history-icon">{I.clock}</span>
                                    <span className="search-history-text">{h}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    {searchHistory.length === 0 && !searchFiltersOpen && (
                        <div className="search-empty search-empty-padded">
                            <div className="search-empty-icon">{I.film}</div>
                            <div className="search-empty-title">Поиск фильмов</div>
                            <div className="search-empty-hint">Введите название или используйте фильтры</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
}
