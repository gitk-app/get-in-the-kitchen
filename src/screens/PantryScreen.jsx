import React, { useState, lazy, Suspense } from 'react';
import { Icon, Button, Banner, SectionLabel, EmptyState } from '../components/UI';
import { PANTRY_CATEGORIES } from '../data/meals';

const BarcodeScanner = lazy(() => import('../components/BarcodeScanner'));

const daysOld = (t) => Math.floor((Date.now() - t) / 86400000);

const TYPE_OPTIONS = [
  { value: 'fresh', label: 'Fresh / Perishable', desc: 'Tracks age — use soon alerts' },
  { value: 'frozen', label: 'Frozen', desc: 'No age clock — stays until used' },
  { value: 'shelf', label: 'Shelf-stable', desc: 'Periodic check-in reminder' },
];

function FreshnessBadge({ item }) {
  if (item.type === 'frozen') {
    return <span className="freshness-badge shelf" style={{ background: '#eff6ff', color: '#1e40af' }}>❄️ frozen</span>;
  }
  if (item.type === 'fresh' || item.fresh) {
    const age = daysOld(item.addedAt);
    return <span className={`freshness-badge ${age >= 2 ? 'stale' : ''}`}>fresh · {age}d</span>;
  }
  return <span className="freshness-badge shelf">shelf-stable</span>;
}

function EditSheet({ item, onSave, onClose }) {
  const [name, setName] = useState(item.name);
  const [qty, setQty] = useState(item.qty || '');
  const [category, setCategory] = useState(item.category || 'Pantry Staples');
  const [type, setType] = useState(item.type || (item.fresh ? 'fresh' : 'shelf'));

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      ...item,
      name: name.trim(),
      qty: qty.trim(),
      category,
      type,
      // keep backward compat
      fresh: type === 'fresh',
      // reset clock if switching to fresh so it doesn't show as old
      addedAt: type === 'fresh' && item.type !== 'fresh' ? Date.now() : item.addedAt,
    });
    onClose();
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 640, background: 'var(--bg-white)',
        borderRadius: '20px 20px 0 0', zIndex: 201, maxHeight: '85vh',
        display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ width: 40, height: 4, background: 'var(--border-strong)', borderRadius: 2, margin: '12px auto 0', flexShrink: 0 }} />
        <div style={{ padding: '12px 16px 10px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>Edit pantry item</span>
            <button onClick={onClose} style={{ background: 'var(--surface)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
        </div>
        <div style={{ overflow: 'auto', flex: 1, padding: '16px 16px 32px' }}>
          <div className="form-group">
            <label>Item name</label>
            <input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Quantity</label>
            <input value={qty} onChange={e => setQty(e.target.value)} placeholder="e.g. 2 lbs, 3 bags, 1 carton" />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {PANTRY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Storage type</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              {TYPE_OPTIONS.map(opt => (
                <div key={opt.value} onClick={() => setType(opt.value)}
                  style={{
                    padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                    border: type === opt.value ? '2px solid var(--green)' : '1px solid var(--border)',
                    background: type === opt.value ? 'var(--green-light)' : 'var(--bg-white)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: type === opt.value ? 600 : 400, color: type === opt.value ? 'var(--green)' : 'var(--text)' }}>{opt.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{opt.desc}</div>
                  </div>
                  {type === opt.value && <Icon name="check" size={16} style={{ color: 'var(--green)', flexShrink: 0 }} />}
                </div>
              ))}
            </div>
          </div>
          <Button variant="primary" onClick={handleSave}>
            <Icon name="check" size={16} /> Save changes
          </Button>
        </div>
      </div>
    </>
  );
}

export default function PantryScreen({ store }) {
  const { pantry, addPantryItem, removePantryItem, restockPantryItem, meals, setPantry } = store;

  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [category, setCategory] = useState('Pantry Staples');
  const [type, setType] = useState('shelf');
  const [scanning, setScanning] = useState(false);
  const [scanFeedback, setScanFeedback] = useState('');
  const [editItem, setEditItem] = useState(null);

  const handleAdd = () => {
    if (!name.trim()) return;
    addPantryItem({
      name: name.trim(),
      qty: qty.trim(),
      category,
      type,
      fresh: type === 'fresh',
    });
    setName(''); setQty(''); setScanFeedback('');
  };

  const handleScanResult = ({ barcode, name: foundName, category: foundCategory, found }) => {
    setScanning(false);
    if (found && foundName) {
      setName(foundName);
      setCategory(foundCategory || 'Pantry Staples');
      setScanFeedback('✓ Found: ' + foundName);
    } else {
      setScanFeedback('Barcode ' + barcode + ' not found — enter name manually');
    }
  };

  const handleSaveEdit = (updatedItem) => {
    setPantry(prev => prev.map(p => p.id === updatedItem.id ? updatedItem : p));
  };

  const freshUrgent = pantry
    .filter(p => p.type === 'fresh' || (p.fresh && p.type !== 'frozen'))
    .map(p => ({ ...p, age: daysOld(p.addedAt) }))
    .filter(p => p.age >= 2);

  const shelfOld = pantry
    .filter(p => p.type === 'shelf' || (!p.fresh && p.type !== 'frozen'))
    .map(p => ({ ...p, age: daysOld(p.addedAt) }))
    .filter(p => p.age >= 18);

  const canMakeNow = meals.filter(m => {
    if (!m.items?.length) return false;
    const pNames = pantry.map(p => p.name.toLowerCase());
    const matches = m.items.filter(it => pNames.some(pn => pn.includes(it.n.toLowerCase().split(' ')[0])));
    return matches.length >= Math.ceil(m.items.length / 2);
  }).slice(0, 3);

  const grouped = PANTRY_CATEGORIES.reduce((acc, cat) => {
    const items = pantry.filter(p => (p.category || 'Pantry Staples') === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  return (
    <div className="screen">
      {scanning && (
        <Suspense fallback={null}>
          <BarcodeScanner onResult={handleScanResult} onClose={() => setScanning(false)} />
        </Suspense>
      )}

      {editItem && (
        <EditSheet
          item={editItem}
          onSave={handleSaveEdit}
          onClose={() => setEditItem(null)}
        />
      )}

      <div className="screen-header">
        <span className="screen-title">Pantry</span>
        <span className="text-sm text-muted">{pantry.length} items</span>
      </div>

      <div className="screen-padded">
        {/* Add form */}
        <div className="card mb-12">
          <button onClick={() => { setScanFeedback(''); setScanning(true); }}
            style={{
              width: '100%', padding: 13, borderRadius: 10, marginBottom: 12,
              background: 'var(--green)', color: '#fff', border: 'none',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}>
            <Icon name="scan" size={18} /> Scan barcode
          </button>

          {scanFeedback && (
            <div style={{
              padding: '8px 12px', borderRadius: 8, marginBottom: 10, fontSize: 13,
              background: scanFeedback.startsWith('✓') ? 'var(--green-light)' : 'var(--warning-light)',
              color: scanFeedback.startsWith('✓') ? '#166534' : '#92400e'
            }}>{scanFeedback}</div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1, height: 0.5, background: 'var(--border)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>or add manually</span>
            <div style={{ flex: 1, height: 0.5, background: 'var(--border)' }} />
          </div>

          <div className="form-group">
            <label>Item name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Chicken thighs" onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }} className="mb-8">
            <div>
              <label>Quantity</label>
              <input value={qty} onChange={e => setQty(e.target.value)} placeholder="e.g. 2 lbs" />
            </div>
            <div>
              <label>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}>
                {PANTRY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Storage type selector */}
          <div className="mb-12">
            <label>Storage type</label>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {TYPE_OPTIONS.map(opt => (
                <div key={opt.value} onClick={() => setType(opt.value)}
                  style={{
                    flex: 1, padding: '8px 6px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                    border: type === opt.value ? '2px solid var(--green)' : '1px solid var(--border)',
                    background: type === opt.value ? 'var(--green-light)' : 'var(--bg-white)',
                    fontSize: 12, fontWeight: type === opt.value ? 600 : 400,
                    color: type === opt.value ? 'var(--green)' : 'var(--text-secondary)'
                  }}>
                  {opt.value === 'fresh' ? '🥬 Fresh' : opt.value === 'frozen' ? '❄️ Frozen' : '🥫 Shelf'}
                </div>
              ))}
            </div>
          </div>

          <Button variant="primary" onClick={handleAdd}>
            <Icon name="plus" size={16} /> Add to pantry
          </Button>
        </div>

        {canMakeNow.length > 0 && (
          <Banner type="success" icon="chef-hat">
            <strong>You can make:</strong> {canMakeNow.map(m => m.name).join(', ')}
          </Banner>
        )}
        {freshUrgent.length > 0 && (
          <Banner type="warning" icon="leaf">
            <strong>Use soon:</strong> {freshUrgent.map(p => `${p.name} (${p.age}d old)`).join(', ')}
          </Banner>
        )}
        {shelfOld.length > 0 && (
          <div className="card mb-12">
            <div className="flex items-center gap-8 mb-8">
              <Icon name="help-circle" size={16} style={{ color: 'var(--warning)' }} />
              <span className="text-sm font-bold">Still got these?</span>
            </div>
            {shelfOld.map(item => (
              <div key={item.id} className="flex justify-between items-center" style={{ padding: '6px 0', borderBottom: '0.5px solid var(--border)' }}>
                <span className="text-sm">{item.name} ({item.age}d)</span>
                <div className="flex gap-8">
                  <Button variant="ghost" size="sm" onClick={() => restockPantryItem(item.id, item.qty)}>Still have it</Button>
                  <Button variant="ghost" size="sm" onClick={() => removePantryItem(item.id)}>Used it up</Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {pantry.length === 0 && (
          <EmptyState icon="fridge" title="Your pantry is empty" body="Scan a barcode or type an item above to get started." />
        )}

        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="mb-16">
            <SectionLabel>{cat}</SectionLabel>
            {items.map(item => (
              <div key={item.id} className="pantry-item">
                <div className="pantry-item-row">
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setEditItem(item)}>
                    <div className="flex items-center gap-8" style={{ flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{item.name}</span>
                      {item.qty && <span className="text-xs text-muted">({item.qty})</span>}
                      <FreshnessBadge item={item} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Tap to edit</div>
                  </div>
                  <button onClick={() => removePantryItem(item.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
