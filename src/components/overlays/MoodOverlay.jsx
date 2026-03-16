import { useApp } from '../../context/AppContext.jsx';
import Card from '../common/Card.jsx';

export default function MoodOverlay() {
  const {
    moodOpen,
    setMoodOpen,
    moodStep,
    moodMood,
    setMoodMood,
    setMoodStep,
    moodType,
    setMoodType,
    tg,
    setMoodDuration,
    fetchMoodResults,
    moodLoading,
    moodResults,
    MOOD_MAP,
    openDetails,
  } = useApp();

  if (!moodOpen) {
    return null;
  }

  return (
    <div className="mood-overlay">
            <div className="mood-header">
                <button className="mood-close" onClick={() => setMoodOpen(false)}>✕</button>
                <span style={{fontSize:16,fontWeight:800}}>🎯 Что посмотреть?</span>
            </div>
            
            {moodStep === 0 && (
                <>
                    <div className="mood-step-title">Какое настроение?</div>
                    <div className="mood-step-sub">Выберите что вам сейчас хочется</div>
                    <div className="mood-grid">
                        {[{id:'fun',emoji:'😂',label:'Весело'},{id:'scary',emoji:'😱',label:'Страшно'},{id:'sad',emoji:'😢',label:'Грустно'},{id:'tense',emoji:'😤',label:'Напряжённо'},{id:'romantic',emoji:'❤️',label:'Романтика'},{id:'epic',emoji:'🔥',label:'Эпик'}].map(m => (
                            <div key={m.id} className={`mood-card ${moodMood === m.id ? 'selected' : ''}`} onClick={() => { setMoodMood(m.id); setMoodStep(1); tg?.HapticFeedback?.impactOccurred?.('light'); }}>
                                <div className="mood-card-emoji">{m.emoji}</div>
                                <div className="mood-card-label">{m.label}</div>
                            </div>
                        ))}
                    </div>
                </>
            )}
            
            {moodStep === 1 && (
                <>
                    <div className="mood-step-title">Фильм или сериал?</div>
                    <div className="mood-step-sub">Выберите формат</div>
                    <div className="mood-grid">
                        {[{id:'movie',emoji:'🎬',label:'Фильм'},{id:'tv',emoji:'📺',label:'Сериал'}].map(t => (
                            <div key={t.id} className={`mood-card ${moodType === t.id ? 'selected' : ''}`} onClick={() => { setMoodType(t.id); setMoodStep(2); tg?.HapticFeedback?.impactOccurred?.('light'); }}>
                                <div className="mood-card-emoji">{t.emoji}</div>
                                <div className="mood-card-label">{t.label}</div>
                            </div>
                        ))}
                    </div>
                    <button className="mood-back" onClick={() => setMoodStep(0)}>← Назад</button>
                </>
            )}
            
            {moodStep === 2 && (
                <>
                    <div className="mood-step-title">{moodType === 'movie' ? 'Длительность?' : 'Готово!'}</div>
                    <div className="mood-step-sub">{moodType === 'movie' ? 'Сколько времени у вас?' : 'Ищем лучшие варианты...'}</div>
                    {moodType === 'movie' ? (
                        <div className="mood-grid">
                            {[{id:'short',emoji:'⚡',label:'До 90 мин'},{id:'medium',emoji:'🎯',label:'90-120 мин'},{id:'long',emoji:'🎭',label:'120+ мин'},{id:'any',emoji:'🤷',label:'Без разницы'}].map(d => (
                                <div key={d.id} className="mood-card" onClick={() => { setMoodDuration(d.id); fetchMoodResults(); tg?.HapticFeedback?.impactOccurred?.('medium'); }}>
                                    <div className="mood-card-emoji">{d.emoji}</div>
                                    <div className="mood-card-label">{d.label}</div>
                                </div>
                            ))}
                        </div>
                    ) : <div style={{textAlign:'center',padding:20}}><button className="filter-apply" style={{width:'100%'}} onClick={fetchMoodResults}>{moodLoading ? 'Подбираем...' : '🔍 Подобрать'}</button></div>}
                    <button className="mood-back" onClick={() => setMoodStep(1)}>← Назад</button>
                </>
            )}
            
            {moodStep === 3 && (
                <div className="mood-results">
                    <div className="mood-results-title">
                        {MOOD_MAP[moodMood]?.label || ''}: вот что мы нашли
                    </div>
                    {moodResults.length > 0 ? (
                        <div className="mood-results-grid">
                            {moodResults.map(r => (
                                <Card key={r.id} item={{...r, media_type: moodType}} onSelect={(item, type) => { setMoodOpen(false); openDetails(item, type); }} type={moodType} />
                            ))}
                        </div>
                    ) : (
                        <div style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>Ничего не найдено, попробуйте другие параметры</div>
                    )}
                    <button className="mood-back" onClick={() => setMoodStep(0)}>🔄 Попробовать снова</button>
                </div>
            )}
        </div>
  );
}
