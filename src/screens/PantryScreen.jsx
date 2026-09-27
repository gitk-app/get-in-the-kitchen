// GET IN THE KITCHEN - PantryScreen v2.2 - Snap My Fridge - build:20260913
import React, { useState, lazy, Suspense, useRef } from 'react';
import { Icon, Button, Banner } from '../components/UI';
import { PANTRY_CATEGORIES } from '../data/meals';
import { pantryNeedsCheck } from '../hooks/useStore';
import { Host, HostAction } from '../components/Host';

const BarcodeScanner = lazy(() => import('../components/BarcodeScanner'));

const daysOld = (t) => Math.floor((Date.now() - t) / 86400000);

// Shrinks a phone photo before sending it. Full size photos are often too
// big to send, and smaller ones are faster and cheaper to read.
function resizeImage(file, maxSide = 1280) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

// Analyze fridge/pantry photo using Claude vision
async function analyzeFridgePhoto(base64Image, callClaude) {
  const text = await callClaude([{
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
  }], 1500);
  const clean = (text || '[]').replace(/```json|```/g, '').trim();
  const start = clean.indexOf('['), end = clean.lastIndexOf(']');
  return JSON.parse(start !== -1 && end !== -1 ? clean.slice(start, end + 1) : '[]');
}

const TYPE_OPTIONS = [
  { value: 'fresh', label: 'Fresh / Perishable', desc: 'Tracks age - use soon alerts' },
  { value: 'frozen', label: 'Frozen', desc: 'No age clock - stays until used' },
  { value: 'shelf', label: 'Shelf-stable', desc: 'Periodic check-in reminder' },
];

// Each pantry section gets its own color, so she can spot categories at a glance
const CATEGORY_THEMES = {
  'Produce': { icon: 'apple', bg: '#EEF7E6', border: '#B9DB9A', accent: '#5A9A2E', text: '#2F5716' },
  'Vegetables': { icon: 'carrot', bg: '#E6F4EE', border: '#9ED0BC', accent: '#2E8A6B', text: '#0F5040' },
  'Dairy': { icon: 'milk', bg: '#EAF2FB', border: '#AFCBEA', accent: '#3F7CC0', text: '#1D4677' },
  'Meat': { icon: 'meat', bg: '#FCEBE2', border: '#E9B299', accent: '#C0623D', text: '#7A3418' },
  'Fish/Seafood': { icon: 'fish', bg: '#E4F3F6', border: '#99CFDA', accent: '#23859A', text: '#0E4E5B' },
  'Pantry Staples': { icon: 'box', bg: '#FFF6E0', border: '#EACB7E', accent: '#C9A84C', text: '#6B5210' },
  'Frozen': { icon: 'snowflake', bg: '#EFEEFB', border: '#BDB8EC', accent: '#6A5FC9', text: '#352C85' },
};
const DEFAULT_THEME = { icon: 'basket', bg: '#F0EBE0', border: '#D8CCB8', accent: '#7A6A52', text: '#4A3F2E' };
const categoryTheme = (cat) => CATEGORY_THEMES[cat] || DEFAULT_THEME;

// Freshness badge: green when fresh, gold when it's time to use it, red when it's getting old
function FreshnessBadge({ item }) {
  const base = { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 12, whiteSpace: 'nowrap' };
  if (item.type === 'frozen') {
    return <span style={{ ...base, background: '#fff', color: '#352C85', border: '1px solid #BDB8EC' }}><Icon name="snowflake" size={11} />frozen</span>;
  }
  if (item.type === 'fresh' || item.fresh) {
    const age = daysOld(item.addedAt);
    const look = age >= 5
      ? { background: '#FDE4E1', color: '#9B1C1C', border: '1px solid #F3B1A9', label: `${age} days, use today` }
      : age >= 3
        ? { background: '#FFF1CC', color: '#7A5A10', border: '1px solid #EACB7E', label: `${age} days, use soon` }
        : { background: '#E3F5E8', color: '#1E6B3A', border: '1px solid #A8DDB7', label: age === 0 ? 'fresh today' : `fresh, ${age} day${age === 1 ? '' : 's'}` };
    return <span style={{ ...base, background: look.background, color: look.color, border: look.border }}><Icon name="leaf" size={11} />{look.label}</span>;
  }
  return <span style={{ ...base, background: '#fff', color: '#6B5210', border: '1px solid #EACB7E' }}><Icon name="box" size={11} />shelf-stable</span>;
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
  const { pantry, addPantryItem, removePantryItem, restockPantryItem, confirmPantryItem, markPantryUsedUp, tossPantryItem, meals, setPantry, hasAI, callClaude } = store;
  const firstName = String(store.prefs?.userName || '').trim().split(/\s+/)[0] || '';

  // After "Used it up", offer to put it on the grocery list
  const [usedUpPrompt, setUsedUpPrompt] = useState(null);
  const usedUpTimer = useRef(null);
  const handleUsedUp = (id) => {
    const item = markPantryUsedUp(id);
    if (!item) return;
    setUsedUpPrompt(item);
    clearTimeout(usedUpTimer.current);
    usedUpTimer.current = setTimeout(() => setUsedUpPrompt(null), 9000);
  };
  const addUsedUpToGrocery = () => {
    if (!usedUpPrompt) return;
    try {
      const handoff = JSON.parse(localStorage.getItem('gitk_grocery_extras') || '[]');
      handoff.push({ name: usedUpPrompt.name, store: '', source: 'extra', id: Date.now() });
      localStorage.setItem('gitk_grocery_extras', JSON.stringify(handoff));
    } catch {}
    setScanFeedback('\u2713 ' + usedUpPrompt.name + ' added to your grocery list');
    setTimeout(() => setScanFeedback(''), 3000);
    setUsedUpPrompt(null);
  };
  const handleTossed = (id) => {
    const item = tossPantryItem(id);
    if (item) {
      setScanFeedback('Tossed ' + item.name + '. It happens.');
      setTimeout(() => setScanFeedback(''), 3000);
    }
  };
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

  // Personal UPC library - saved to localStorage
  const loadUpcLibrary = () => {
    try { return JSON.parse(localStorage.getItem('gitk_upc_library') || '{}'); } catch { return {}; }
  };
  const saveUpcLibrary = (lib) => {
    try { localStorage.setItem('gitk_upc_library', JSON.stringify(lib)); } catch {}
  };

  const handleAdd = () => {
    if (!name.trim()) return;
    const result = addPantryItem({ name: name.trim(), qty: qty.trim(), category, type, fresh: type === 'fresh' });
    setScanFeedback(result === 'restocked' ? '\u2713 ' + name.trim() + ' restocked. Timer reset to today.' : '');
    if (result === 'restocked') setTimeout(() => setScanFeedback(''), 3000);
    setName(''); setQty('');
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
      // Not found anywhere - show quick-add sheet with empty name so user can type it
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
    const outcome = addPantryItem({
      name: result.name.trim(),
      qty: result.qty.trim(),
      category: result.category,
      type: result.type,
      fresh: result.type === 'fresh',
    });
    setScanResult(null);
    setScanFeedback(outcome === 'restocked' ? '\u2713 Restocked: ' + result.name.trim() + '. Timer reset.' : '\u2713 Added: ' + result.name.trim());
  };

  const handleSaveEdit = (updatedItem) => {
    setPantry(prev => prev.map(p => p.id === updatedItem.id ? updatedItem : p));
  };

  // Fridge photo scan handler
  const handleFridgePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!hasAI) {
      alert('Add your beta access code in Settings to use fridge scanning.');
      return;
    }
    setFridgeAnalyzing(true);
    try {
      const base64 = await resizeImage(file);
      const items = await analyzeFridgePhoto(base64, callClaude);
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
      alert('Could not read that photo. Try again with good lighting, or check your access code in Settings.');
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

  const isFreshItem = (p) => p.type === 'fresh' || (p.fresh && p.type !== 'frozen');
  const needsCheck = pantry
    .filter(pantryNeedsCheck)
    .map(p => ({ ...p, age: daysOld(p.addedAt), fresh: isFreshItem(p) }))
    .sort((a, b) => Number(b.fresh) - Number(a.fresh) || b.age - a.age);

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
                      Type the name below - we'll remember this barcode for next time
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
              <Icon name="camera" size={17} /> Snap pantry/fridge
            </button>
            <button onClick={() => { setScanFeedback(''); setScanning(true); }}
              style={{ padding: 13, borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', border: '0.5px solid var(--border)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon name="scan" size={17} /> Scan barcode
            </button>
          </div>

          {/* Snap pantry/fridge hint */}
          <div style={{ background: 'var(--teal-light)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: 'var(--teal)' }}>
            📸 <strong>New!</strong> Snap your fridge or pantry - AI detects all your ingredients at once
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
        {needsCheck.length > 0 && (
          <div className="card mb-12" style={{ border: '1px solid var(--gold)', background: 'var(--gold-light)' }}>
            <div style={{ marginBottom: 12 }}>
              <Host quick text={`Quick check${firstName ? ', ' + firstName : ''}: still have these? It keeps your meal ideas and grocery list accurate.`} />
            </div>
            {needsCheck.map(item => (
              <div key={item.id} style={{ padding: '10px 0', borderTop: '0.5px solid var(--border)' }}>
                <div className="flex items-center gap-8" style={{ flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{item.name}</span>
                  {item.qty && <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>({item.qty})</span>}
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: item.fresh && item.age >= 5 ? '#fef2f2' : 'var(--bg-white)', color: item.fresh && item.age >= 5 ? '#991b1b' : 'var(--gold-dark)' }}>
                    {item.age}d old
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <CheckButton label="Still good" icon="check" onClick={() => confirmPantryItem(item.id)} />
                  <CheckButton label="Restocked" icon="refresh" onClick={() => restockPantryItem(item.id)} />
                  <CheckButton label="Used it up" icon="tools-kitchen-2" onClick={() => handleUsedUp(item.id)} />
                  {item.fresh && <CheckButton label="Tossed it" icon="trash" onClick={() => handleTossed(item.id)} />}
                </div>
              </div>
            ))}
          </div>
        )}

        {pantry.length === 0 && (
          <div style={{ padding: '12px 0 20px' }}>
            <Host text={`Your pantry's empty${firstName ? ', ' + firstName : ''}. Snap a photo of your fridge or pantry shelf and I'll fill it in for you. You can also scan a barcode or type items above.`}>
              <HostAction onClick={() => fridgeInputRef.current?.click()}>Snap my fridge</HostAction>
            </Host>
          </div>
        )}

        {Object.entries(grouped).map(([cat, items]) => {
          const t = categoryTheme(cat);
          return (
            <section key={cat} style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0 8px', borderBottom: `3px solid ${t.accent}`, marginBottom: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: t.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={t.icon} size={16} />
                </div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>{cat}</h2>
                <span style={{ fontSize: 12, fontWeight: 700, color: t.text, background: t.bg, border: `1px solid ${t.border}`, borderRadius: 12, padding: '2px 10px' }}>
                  {items.length} item{items.length !== 1 ? 's' : ''}
                </span>
              </div>
              {items.map(item => (
                <div key={item.id} style={{ background: t.bg, border: `1px solid ${t.border}`, borderLeft: `5px solid ${t.accent}`, borderRadius: 14, marginBottom: 8, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px 6px' }}>
                    <div style={{ flex: 1, cursor: 'pointer', minWidth: 0 }} onClick={() => setEditItem(item)}>
                      <div className="flex items-center gap-8" style={{ flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{item.name}</span>
                        {item.qty && <span style={{ fontSize: 12, color: t.text }}>({item.qty})</span>}
                        <FreshnessBadge item={item} />
                      </div>
                      <div style={{ fontSize: 11, color: t.text, opacity: 0.75, marginTop: 3 }}>Tap to edit</div>
                    </div>
                    <button onClick={() => removePantryItem(item.id)} aria-label={`Delete ${item.name} (added by mistake)`} title="Delete (added by mistake)"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.text, opacity: 0.5, padding: 8 }}>
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 12px 10px' }}>
                    {isFreshItem(item) && <CheckButton small color={t.text} label="Restocked" icon="refresh" onClick={() => restockPantryItem(item.id)} />}
                    <CheckButton small color={t.text} label="Used it up" icon="tools-kitchen-2" onClick={() => handleUsedUp(item.id)} />
                    {isFreshItem(item) && <CheckButton small color={t.text} label="Tossed it" icon="trash" onClick={() => handleTossed(item.id)} />}
                  </div>
                </div>
              ))}
            </section>
          );
        })}
      </div>

      {usedUpPrompt && (
        <div role="status" style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 'calc(var(--nav-height) + 16px)', width: 'calc(100% - 32px)', maxWidth: 520, background: 'var(--teal)', color: '#fff', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, zIndex: 150, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
          <div style={{ flex: 1, fontSize: 14, lineHeight: 1.4 }}>
            <strong>{usedUpPrompt.name}</strong> used up. Add it to your grocery list?
          </div>
          <button onClick={addUsedUpToGrocery} style={{ background: 'var(--gold)', color: 'var(--teal)', border: 'none', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Add to list</button>
          <button onClick={() => setUsedUpPrompt(null)} aria-label="No thanks" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.75)', cursor: 'pointer', padding: 6 }}>
            <Icon name="x" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function CheckButton({ label, icon, onClick, small = false, color = 'var(--teal)' }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, minHeight: small ? 32 : 36,
      padding: small ? '0 10px' : '0 12px', borderRadius: 18, border: '1px solid rgba(0,0,0,0.08)',
      background: 'var(--bg-white)', color, fontSize: small ? 12 : 13, fontWeight: 700,
      fontFamily: 'inherit', cursor: 'pointer',
    }}>
      <Icon name={icon} size={small ? 13 : 14} />{label}
    </button>
  );
}
