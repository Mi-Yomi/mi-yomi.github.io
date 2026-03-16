import ContinueCard from './ContinueCard.jsx';

export default function ContinueSection({ title, icon, items, onSelect, getProgress }) {
    if (!items?.length) return null;
    return (
        <div className="section">
            <div className="section-head"><h2 className="section-title">{icon} {title}</h2></div>
            <div className="scroll-row">
                {items.slice(0, 10).map(m => {
                    const itemId = m.item_id || m.id;
                    const stored = getProgress ? getProgress(itemId) : null;
                    return (
                        <div key={itemId} style={{position:'relative'}}>
                            <ContinueCard 
                                item={{...m, id: itemId}} 
                                onSelect={onSelect} 
                                progress={m.progress || 5} 
                                storedTime={stored?.time || 0}
                                storedDuration={stored?.duration || 0}
                            />
                            {m.last_season && (
                                <div style={{position:'absolute',top:10,right:10,padding:'3px 8px',borderRadius:6,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',fontSize:10,fontWeight:800,color:'white',letterSpacing:'0.5px',zIndex:2}}>
                                    S{m.last_season}:E{m.last_episode}
                                </div>
                            )}
                            {m.last_source && (
                                <div style={{position:'absolute',top:10,left:10,padding:'2px 6px',borderRadius:5,background:'rgba(229,9,20,0.8)',fontSize:9,fontWeight:700,color:'white',zIndex:2}}>
                                    {m.last_source}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
