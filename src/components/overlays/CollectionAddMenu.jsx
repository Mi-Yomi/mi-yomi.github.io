import { useRef } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import useDialogFocus from '../../hooks/useDialogFocus.js';

export default function CollectionAddMenu() {
  const {
    addToCollectionItem,
    collections,
    addItemToCollection,
    saveCollection,
    setAddToCollectionItem,
  } = useApp();
  const dialogRef = useRef(null);
  useDialogFocus(Boolean(addToCollectionItem), dialogRef);

  if (!addToCollectionItem) {
    return null;
  }

  return (
    <div ref={dialogRef} className="collection-add-menu" role="dialog" aria-modal="true" aria-labelledby="collection-add-title" tabIndex={-1}>
            <div id="collection-add-title" style={{fontSize:15,fontWeight:800,marginBottom:16}}>Добавить в коллекцию</div>
            {collections.map(col => {
                const isIn = (col.items || []).some(i => String(i.id) === String(addToCollectionItem.id));
                return (
                    <button key={col.id} className="collection-add-item" disabled={isIn} onClick={() => !isIn && addItemToCollection(col.id, addToCollectionItem)}>
                        <div className="collection-add-item-icon">📁</div>
                        <div className="collection-add-item-name">{col.title}</div>
                        {isIn && <div className="collection-add-item-check">✓</div>}
                    </button>
                );
            })}
            <button className="collection-add-item" onClick={() => {
                const title = prompt('Название новой коллекции:');
                if (title) { saveCollection(title, [addToCollectionItem]); setAddToCollectionItem(null); }
            }}>
                <div className="collection-add-item-icon">+</div>
                <div className="collection-add-item-name" style={{color:'var(--accent)'}}>Создать новую</div>
            </button>
            <button style={{width:'100%',padding:14,borderRadius:12,background:'var(--surface-2)',border:'1px solid var(--border)',color:'var(--text-muted)',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginTop:12}} onClick={() => setAddToCollectionItem(null)}>Отмена</button>
        </div>
  );
}
