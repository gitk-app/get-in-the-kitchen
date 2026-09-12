import React, { useState, lazy, Suspense, useRef } from 'react';
import { Icon, Button, Banner, SectionLabel, EmptyState } from '../components/UI';
import { PANTRY_CATEGORIES } from '../data/meals';

const BarcodeScanner = lazy(() => import('../components/BarcodeScanner'));

const daysOld = (t) => Math.floor((Date.now() - t) / 86400000);

// Analyze fridge/pantry photo using Claude vision
async function analyzeFridgePhoto(base64Image, apiKey) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: base64Image }
          },
          {
            type: 'text',
            text: `Look at this photo of a fridge, pantry, or kitchen counter. Identify all visible food ingredients and items.

For each item you can clearly see, return:
- name: simple common name (e.g. "Chicken thighs", "Eggs", "Milk", "Spinach")
- qty: estimated quantity if visible (e.g. "1 dozen", "2 lbs", "1 gallon") or empty string
- category: one of: Produce, Vegetables, Dairy, Meat, Fish/Seafood, Pantry Staples, Frozen
- type: "fresh" for perishables, "frozen" for frozen items, "shelf" for shelf-stable

Only include items you can clearly identify. Do not guess. Return ONLY a JSON array, no other text:
[{"name":"","qty":"","category":"Pantry Staples","type":"shelf"}]`
          }
        ]
      }]
    })
  });
  const data = await res.json();
  const text = data.content?.[0]?.text || '[]';
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

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
  const { pantry, addPantryItem, removePantryItem, restockPantryItem, meals, setPantry, apiKey } = store;
  const fridgeInputRef = useRef(null);

  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [category, setCategory] = useState('Pantry Staples');
  const [type, setType] = useState('shelf');
  const [scanning, setScanning] = useState(false);
  const [scanFeedback, setScanFeedback] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [fridgeAnalyzing, setFridgeAnalyzing] = useState(false);
  const [fridgeResults, setFridgeResults] = useState(null);
  const [fridgeSelected, setFridgeSelected] = useState({});

  // Personal UPC library — saved to localStorage
  const loadUpcLibrary = () => {
    try { return JSON.parse(localStorage.getItem('gitk_upc_library') || '{}'); } catch { return {}; }
  };
  const saveUpcLibrary = (lib) => {
    try { localStorage.setItem('gitk_upc_library', JSON.stringify(lib)); } catch {}
  };

  const handleAdd = () => {
    if (!name.trim()) return;
    addPantryItem({ name: name.trim(), qty: qty.trim(), category, type, fresh: type === 'fresh' });
    setName(''); setQty(''); setScanFeedback('');
  };

  const [scanResult, setScanResult] = useState(null);

  const handleScanResult = ({ barcode, name: foundName, category: foundCategory, found }) => {
    setScanning(false);

    // Always check personal UPC library first
    const upcLib = loadUpcLibrary();
    const personalMatch = upcLib[barcode];

    if (personalMatch) {
      // Found in personal library
      setScanResult({
        name: personalMatch.name,
        category: personalMatch.category || 'Pantry Staples',
        qty: '',
        type: 'shelf',
        barcode,
        fromPersonalLib: true,
      });
    } else if (found && foundName) {
      // Found in Open Food Facts
      setScanResult({
        name: foundName,
        category: foundCategory || 'Pantry Staples',
        qty: '',
        type: 'shelf',
        barcode,
        fromPersonalLib: false,
      });
    } else {
      // Not found anywhere — show quick-add sheet with empty name so user can type it
      // and we'll save the UPC mapping for next time
      setScanResult({
        name: '',
        category: 'Pantry Staples',
        qty: '',
        type: 'shelf',
        barcode,
        fromPersonalLib: false,
        notFound: true,
      });
    }
  };

  const handleScanAdd = (result) => {
    if (!result.name.trim()) return;
    // Save to personal UPC library if we have a barcode
    if (result.barcode && !result.fromPersonalLib) {
      const upcLib = loadUpcLibrary();
      upcLib[result.barcode] = { name: result.name.trim(), category: result.category };
      saveUpcLibrary(upcLib);
    }
    addPantryItem({
      name: result.name.trim(),
      qty: result.qty.trim(),
      category: result.category,
      type: result.type,
      fresh: result.type === 'fresh',
    });
    setScanResult(null);
    setScanFeedback('✓ Added: ' + result.name.trim());
  };

  const handleSaveEdit = (updatedItem) => {
    setPantry(prev => prev.map(p => p.id === updatedItem.id ? updatedItem : p));
  };

  // Fridge photo scan handler
  const handleFridgePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!apiKey) {
      alert('Add your Anthropic API key in Settings to use fridge scanning.');
      return;
    }
    setFridgeAnalyzing(true);
    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result.split(',')[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const items = await analyzeFridgePhoto(base64, apiKey);
      if (!items.length) {
        alert('No food items detected. Try a clearer photo with better lighting.');
        setFridgeAnalyzing(false);
        return;
      }
      // Pre-select all detected items
      const selected = {};
      items.forEach((_, i) => { selected[i] = true; });
      setFridgeResults(items);
      setFridgeSelected(selected);
    } catch (err) {
      alert('Could not analyze photo. Check your API key and try again.');
    }
    setFridgeAnalyzing(false);
  };

  const handleAddFridgeItems = () => {
    const toAdd = fridgeResults.filter((_, i) => fridgeSelected[i]);
    toAdd.forEach(item => {
      addPantryItem({
        name: item.name,
        qty: item.qty || '',
        category: item.category || 'Pantry Staples',
        type: item.type || 'shelf',
        fresh: item.type === 'fresh',
      });
    });
    setFridgeResults(null);
    setFridgeSelected({});
    setScanFeedback(`✓ Added ${toAdd.length} item${toAdd.length !== 1 ? 's' : ''} from your photo`);
    setTimeout(() => setScanFeedback(''), 3000);
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
      {/* Hidden file input for fridge photo */}
      <input ref={fridgeInputRef} type="file" accept="image/*" capture="environment"
        style={{ display: 'none' }} onChange={handleFridgePhoto} />

      {/* Analyzing overlay */}
      {fridgeAnalyzing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,61,53,0.92)', zIndex: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📸</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Scanning your fridge...</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 32 }}>AI is identifying your ingredients. Takes about 10 seconds.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: '#C9A84C', animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />
            ))}
          </div>
          <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}`}</style>
        </div>
      )}

      {/* Fridge results review sheet */}
      {fridgeResults && (
        <>
          <div onClick={() => setFridgeResults(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200 }} />
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 640, background: 'var(--bg-white)', borderRadius: '20px 20px 0 0', zIndex: 201, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: 40, height: 4, background: 'var(--border-strong)', borderRadius: 2, margin: '12px auto 0', flexShrink: 0 }} />
            <div style={{ padding: '12px 16px 10px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>📸 Found {fridgeResults.length} items</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Uncheck anything you don't want to add</div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '8px 16px' }}>
              {fridgeResults.map((item, i) => (
                <div key={i} onClick={() => setFridgeSelected(p => ({ ...p, [i]: !p[i] }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '0.5px solid var(--border)', cursor: 'pointer' }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, border: fridgeSelected[i] ? 'none' : '1.5px solid var(--border)', background: fridgeSelected[i] ? 'var(--teal)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {fridgeSelected[i] && <span style={{ color: '#fff', fontSize: 13 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                      {item.qty && <span>{item.qty} · </span>}
                      {item.category}
                      {item.type === 'fresh' && <span style={{ color: 'var(--teal)', marginLeft: 4 }}>· Fresh</span>}
                      {item.type === 'frozen' && <span style={{ color: '#1e40af', marginLeft: 4 }}>· Frozen</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 16px 24px', borderTop: '0.5px solid var(--border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setFridgeResults(null)}
                  style={{ flex: 1, background: 'var(--surface)', color: 'var(--text)', border: 'none', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleAddFridgeItems}
                  style={{ flex: 2, background: 'var(--teal)', color: '#C9A84C', border: 'none', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  Add {Object.values(fridgeSelected).filter(Boolean).length} items to pantry
                </button>
              </div>
            </div>
          </div>
        </>
      )}

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

      {/* Quick-add sheet after successful scan */}
      {scanResult && (
        <>
          <div onClick={() => setScanResult(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: 640, background: 'var(--bg-white)',
            borderRadius: '20px 20px 0 0', zIndex: 201,
            display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ width: 40, height: 4, background: 'var(--border-strong)', borderRadius: 2, margin: '12px auto 0' }} />
            <div style={{ padding: '12px 16px 10px', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>
                    {scanResult.fromPersonalLib ? '⭐ Recognized from your list' : scanResult.notFound ? '❓ Item not found' : 'Add to pantry'}
                  </span>
                  {scanResult.notFound && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Type the name below — we'll remember this barcode for next time
                    </div>
                  )}
                  {scanResult.fromPersonalLib && (
                    <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 2 }}>
                      Matched from your personal scan history
                    </div>
                  )}
                </div>
                <button onClick={() => setScanResult(null)} style={{ background: 'var(--surface)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
            </div>
            <div style={{ padding: '16px 16px 32px' }}>
              <div className="form-group">
                <label>{scanResult.notFound ? 'What is this item?' : 'Item'}</label>
                <input
                  value={scanResult.name}
                  onChange={e => setScanResult(r => ({ ...r, name: e.target.value }))}
                  placeholder={scanResult.notFound ? 'e.g. Aldi Fit & Active Yogurt' : ''}
                  autoFocus={scanResult.notFound}
                />
                {scanResult.notFound && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Barcode {scanResult.barcode} · Will be saved to your personal scan list
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>How much do you have?</label>
                <input
                  value={scanResult.qty}
                  onChange={e => setScanResult(r => ({ ...r, qty: e.target.value }))}
                  placeholder="e.g. 2 cans, 1 bag, 3 lbs"
                  autoFocus={!scanResult.notFound}
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={scanResult.category} onChange={e => setScanResult(r => ({ ...r, category: e.target.value }))}>
                  {PANTRY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="mb-12">
                <label>Storage type</label>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  {TYPE_OPTIONS.map(opt => (
                    <div key={opt.value} onClick={() => setScanResult(r => ({ ...r, type: opt.value }))}
                      style={{
                        flex: 1, padding: '8px 6px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                        border: scanResult.type === opt.value ? '2px solid var(--green)' : '1px solid var(--border)',
                        background: scanResult.type === opt.value ? 'var(--green-light)' : 'var(--bg-white)',
                        fontSize: 12, fontWeight: scanResult.type === opt.value ? 600 : 400,
                        color: scanResult.type === opt.value ? 'var(--green)' : 'var(--text-secondary)'
                      }}>
                      {opt.value === 'fresh' ? '🥬 Fresh' : opt.value === 'frozen' ? '❄️ Frozen' : '🥫 Shelf'}
                    </div>
                  ))}
                </div>
              </div>
              <Button variant="primary" onClick={() => handleScanAdd(scanResult)} disabled={!scanResult.name.trim()}>
                <Icon name="plus" size={16} /> Add to pantry{scanResult.notFound && scanResult.name.trim() ? ' · Save to my scan list' : ''}
              </Button>
              <button onClick={() => setScanResult(null)}
                style={{ width: '100%', marginTop: 8, padding: '10px', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      <div className="screen-header">
        <span className="screen-title">Pantry</span>
        <span className="text-sm text-muted">{pantry.length} items</span>
      </div>

      <div className="screen-padded">
        {/* Add form */}
        <div className="card mb-12">
          {/* Two action buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <button onClick={() => fridgeInputRef.current?.click()}
              style={{ padding: 13, borderRadius: 10, background: 'var(--teal)', color: '#C9A84C', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon name="camera" size={17} /> Snap fridge
            </button>
            <button onClick={() => { setScanFeedback(''); setScanning(true); }}
              style={{ padding: 13, borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', border: '0.5px solid var(--border)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon name="scan" size={17} /> Scan barcode
            </button>
          </div>

          {/* Snap fridge hint */}
          <div style={{ background: 'var(--teal-light)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: 'var(--teal)' }}>
            📸 <strong>New!</strong> Snap your fridge or pantry — AI detects all your ingredients at once
          </div>

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
