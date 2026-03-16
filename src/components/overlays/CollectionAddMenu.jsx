import { useApp } from '../../context/AppContext.jsx';

export default function CollectionAddMenu() {
  const {
    addToCollectionItem,
    collections,
    addItemToCollection,
    saveCollection,
    setAddToCollectionItem,
  } = useApp();

  if (!addToCollectionItem) {
    return null;
  }

  return (
    <div className="collection-add-menu">
            <div style={{fontSize:15,fontWeight:800,marginBottom:16}}>Добавить в коллекцию</div>
            {collections.map(col => {
                const isIn = (col.items || []).some(i => i.id === addToCollectionItem.id);
                return (
                    <div key={col.id} className="collection-add-item" onClick={() => !isIn && addItemToCollection(col.id, addToCollectionItem)}>
                        <div className="collection-add-item-icon">📁</div>
                        <div className="collection-add-item-name">{col.title}</div>
                        {isIn && <div className="collection-add-item-check">✓</div>}
                    </div>
                );
            })}
            <div className="collection-add-item" onClick={() => {
                const title = prompt('Название новой коллекции:');
                if (title) { saveCollection(title, [addToCollectionItem]); setAddToCollectionItem(null); }
            }}>
                <div className="collection-add-item-icon">+</div>
                <div className="collection-add-item-name" style={{color:'var(--accent)'}}>Создать новую</div>
            </div>
            <button style={{width:'100%',padding:14,borderRadius:12,background:'var(--surface-2)',border:'1px solid var(--border)',color:'var(--text-muted)',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginTop:12}} onClick={() => setAddToCollectionItem(null)}>Отмена</button>
        </div>
  );
}
