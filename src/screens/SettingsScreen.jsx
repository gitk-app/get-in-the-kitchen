import React, { useState } from 'react';
import { Icon, Button, Divider, Pill } from '../components/UI';
import { STORES } from '../data/meals';

const PROTEIN_OPTIONS = [
  { group: 'Meat & Seafood', items: ['Chicken', 'Beef', 'Pork', 'Turkey', 'Sausage', 'Fish/Seafood', 'Shrimp'] },
  { group: 'Vegetarian / Vegan', items: ['Eggs', 'Tofu', 'Tempeh', 'Lentils', 'Chickpeas', 'Black beans'] },
  { group: 'Dairy & Other', items: ['Cheese/Dairy', 'Peanut butter'] },
];

const MEAL_TYPES = [
  { value: 'tacos', label: '🌮 Tacos & bowls' },
  { value: 'pasta', label: '🍝 Pasta' },
  { value: 'sheet-pan', label: '🥦 Sheet pan meals' },
  { value: 'soups', label: '🍲 Soups & stews' },
  { value: 'breakfast-dinner', label: '🍳 Breakfast for dinner' },
  { value: 'sandwiches', label: '🥪 Sandwiches & wraps' },
  { value: 'bowls', label: '🍚 Rice & grain bowls' },
  { value: 'slow-cooker', label: '🥘 Slow cooker' },
  { value: 'grilling', label: '🔥 Grilling' },
  { value: 'stir-fry', label: '🥢 Stir fry' },
];

const HOUSEHOLD = [
  { value: '1', label: 'Just me', emoji: '🙋' },
  { value: '2', label: '2 people', emoji: '👫' },
  { value: '3-4', label: '3–4 people', emoji: '👨‍👩‍👧' },
  { value: '5+', label: '5 or more', emoji: '👨‍👩‍👧‍👦' },
];

const FREQ_OPTIONS = [
  { value: 'weekly', label: 'Weekly', trips: 4, desc: '4 trips/month' },
  { value: 'biweekly', label: 'Every 2 weeks', trips: 2, desc: '2 trips/month' },
  { value: 'twicemonth', label: 'Twice a month', trips: 2, desc: '2 trips/month' },
];

const DIETARY = ['No restrictions', 'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Nut-free'];

// Reusable bottom sheet wrapper
function EditSheet({ title, onClose, children }) {
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
        <div style={{ padding: '12px 16px 10px', borderBottom: '0.5px solid var(--border)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{title}</span>
          <button onClick={onClose} style={{ background: 'var(--surface)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ overflow: 'auto', flex: 1, padding: '16px 16px 36px' }}>{children}</div>
      </div>
    </>
  );
}

export default function SettingsScreen({ store }) {
  const { apiKey, setApiKey, prefs, setPrefs } = store;

  const [showApiKey, setShowApiKey] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [keySaved, setKeySaved] = useState(false);
  const [newStore, setNewStore] = useState('');
  const [editSheet, setEditSheet] = useState(null); // 'household' | 'dietary' | 'stores' | 'budget' | 'proteins' | 'mealtypes'

  const monthlyBudget = prefs?.monthlyBudget || 450;
  const shopFreq = prefs?.shopFreq || 'biweekly';
  const trips = FREQ_OPTIONS.find(f => f.value === shopFreq)?.trips || 2;
  const perTrip = Math.round(monthlyBudget / trips);

  const saveKey = () => {
    if (!newKey.trim().startsWith('sk-ant-')) { alert("That doesn't look like an Anthropic API key. It should start with sk-ant-"); return; }
    setApiKey(newKey.trim()); setKeySaved(true); setNewKey('');
    setTimeout(() => setKeySaved(false), 2000);
  };

  const toggleStore = (s) => setPrefs(p => ({ ...p, stores: p.stores.includes(s) ? p.stores.filter(x => x !== s) : [...p.stores, s] }));
  const addCustomStore = () => {
    if (!newStore.trim()) return;
    const name = newStore.trim();
    setPrefs(p => ({ ...p, stores: p.stores.includes(name) ? p.stores : [...p.stores, name], customStores: [...(p.customStores || []), name] }));
    setNewStore('');
  };
  const removeCustomStore = (name) => setPrefs(p => ({ ...p, stores: p.stores.filter(s => s !== name), customStores: (p.customStores || []).filter(s => s !== name) }));
  const toggleProtein = (p) => setPrefs(prev => ({ ...prev, proteins: prev.proteins?.includes(p) ? prev.proteins.filter(x => x !== p) : [...(prev.proteins || []), p] }));
  const toggleMealType = (t) => setPrefs(prev => ({ ...prev, mealTypes: prev.mealTypes?.includes(t) ? prev.mealTypes.filter(x => x !== t) : [...(prev.mealTypes || []), t] }));
  const toggleDietary = (d) => setPrefs(prev => ({ ...prev, dietary: prev.dietary?.includes(d) ? prev.dietary.filter(x => x !== d) : [...(prev.dietary || []), d] }));

  const allStores = [...STORES, ...(prefs?.customStores || []).filter(s => !STORES.includes(s))];

  // Preference summary rows
  const prefRows = [
    {
      key: 'household',
      label: 'Household size',
      value: HOUSEHOLD.find(h => h.value === prefs?.householdSize)?.label || '2 people',
      icon: '👨‍👩‍👧',
    },
    {
      key: 'dietary',
      label: 'Dietary needs',
      value: prefs?.dietary?.length ? prefs.dietary.join(', ') : 'No restrictions',
      icon: '🥗',
    },
    {
      key: 'stores',
      label: 'Your stores',
      value: prefs?.stores?.length ? prefs.stores.join(', ') : 'None selected',
      icon: '🛒',
    },
    {
      key: 'budget',
      label: 'Budget & shopping',
      value: `$${monthlyBudget}/month · $${perTrip}/trip`,
      icon: '💰',
    },
    {
      key: 'proteins',
      label: 'Proteins you buy',
      value: prefs?.proteins?.length ? prefs.proteins.join(', ') : 'No preference',
      icon: '🥩',
    },
    {
      key: 'mealtypes',
      label: 'Meal types',
      value: prefs?.mealTypes?.length ? prefs.mealTypes.map(t => MEAL_TYPES.find(m => m.value === t)?.label?.split(' ').slice(1).join(' ') || t).join(', ') : 'No preference',
      icon: '🍽️',
    },
  ];

  return (
    <div className="screen">
      <div className="screen-header">
        <span className="screen-title">Settings</span>
      </div>
      <div className="screen-padded">

        {/* ── PREFERENCES SECTION ── */}
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
          My preferences
        </div>
        <div className="card mb-20" style={{ padding: 0, overflow: 'hidden' }}>
          {prefRows.map((row, i) => (
            <div key={row.key} onClick={() => setEditSheet(row.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: i < prefRows.length - 1 ? '0.5px solid var(--border)' : 'none', cursor: 'pointer' }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{row.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{row.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.value}</div>
              </div>
              <Icon name="chevron-right" size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </div>
          ))}
        </div>

        {/* ── API KEY ── */}
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
          AI settings
        </div>
        <div className="card mb-20">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Anthropic API key</div>
          <p className="text-sm mb-12">Required for Build My Week and AI features. Stored only on this device.</p>
          {apiKey ? (
            <div className="flex items-center gap-8 mb-8">
              <Icon name="check" size={16} style={{ color: 'var(--green)' }} />
              <span className="text-sm" style={{ color: 'var(--green)' }}>API key saved</span>
              <button onClick={() => setShowApiKey(!showApiKey)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13 }}>
                {showApiKey ? 'Hide' : 'Change'}
              </button>
            </div>
          ) : (
            <div className="banner banner-warning mb-8">
              <Icon name="alert-triangle" size={14} /> No API key — AI features won't work.
            </div>
          )}
          {(!apiKey || showApiKey) && (
            <div>
              <input type="password" value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="sk-ant-..." className="mb-8" />
              <Button variant="primary" onClick={saveKey}>
                {keySaved ? <><Icon name="check" size={16} /> Saved!</> : 'Save API key'}
              </Button>
              <p className="text-xs text-muted mt-8">Get your free key at console.anthropic.com → API Keys</p>
            </div>
          )}
        </div>

        <Divider />
        <p className="text-xs text-muted" style={{ textAlign: 'center' }}>GET IN THE KITCHEN · v1.0 MVP<br />Real meals. Real budget. Real life.</p>
      </div>

      {/* ── EDIT SHEETS ── */}

      {/* Household */}
      {editSheet === 'household' && (
        <EditSheet title="Household size" onClose={() => setEditSheet(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {HOUSEHOLD.map(h => (
              <div key={h.value} onClick={() => setPrefs(p => ({ ...p, householdSize: h.value }))}
                style={{ border: prefs?.householdSize === h.value ? '2px solid var(--green)' : '1px solid var(--border)', borderRadius: 14, padding: '16px 10px', textAlign: 'center', cursor: 'pointer', background: prefs?.householdSize === h.value ? 'var(--green-light)' : 'var(--bg-white)' }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>{h.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: prefs?.householdSize === h.value ? 'var(--green)' : 'var(--text)' }}>{h.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20 }}>
            <Button variant="primary" onClick={() => setEditSheet(null)}>Save</Button>
          </div>
        </EditSheet>
      )}

      {/* Dietary */}
      {editSheet === 'dietary' && (
        <EditSheet title="Dietary needs" onClose={() => setEditSheet(null)}>
          <p className="text-sm mb-12">Select all that apply.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
            {DIETARY.map(d => (
              <Pill key={d} selected={prefs?.dietary?.includes(d)} onClick={() => toggleDietary(d)}>{d}</Pill>
            ))}
          </div>
          <Button variant="primary" onClick={() => setEditSheet(null)}>Save</Button>
        </EditSheet>
      )}

      {/* Stores */}
      {editSheet === 'stores' && (
        <EditSheet title="Your stores" onClose={() => setEditSheet(null)}>
          <p className="text-sm mb-12">Toggle the stores you shop at. Add custom stores below.</p>
          {allStores.map(s => (
            <div key={s} className="flex justify-between items-center" style={{ padding: '12px 0', borderBottom: '0.5px solid var(--border)' }}>
              <div className="flex items-center gap-8">
                <span style={{ fontSize: 14 }}>{s}</span>
                {(prefs?.customStores || []).includes(s) && (
                  <button onClick={() => removeCustomStore(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                    <Icon name="x" size={13} />
                  </button>
                )}
              </div>
              <button onClick={() => toggleStore(s)}
                style={{ width: 44, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', position: 'relative', background: prefs?.stores?.includes(s) ? 'var(--green)' : 'var(--border-strong)', transition: 'background .2s' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, transition: 'left .2s', left: prefs?.stores?.includes(s) ? 21 : 3 }} />
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, marginBottom: 20 }}>
            <input value={newStore} onChange={e => setNewStore(e.target.value)} placeholder="Add a store (e.g. Target)" onKeyDown={e => e.key === 'Enter' && addCustomStore()} style={{ flex: 1, height: 36, fontSize: 13 }} />
            <button onClick={addCustomStore} style={{ background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 8, padding: '0 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Add</button>
          </div>
          <Button variant="primary" onClick={() => setEditSheet(null)}>Save</Button>
        </EditSheet>
      )}

      {/* Budget */}
      {editSheet === 'budget' && (
        <EditSheet title="Budget & shopping" onClose={() => setEditSheet(null)}>
          <div className="form-group">
            <label>Monthly grocery budget</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 24, fontWeight: 700 }}>$</span>
              <input type="number" value={monthlyBudget}
                onChange={e => setPrefs(p => ({ ...p, monthlyBudget: parseFloat(e.target.value) || 0 }))}
                style={{ fontSize: 28, fontWeight: 700, width: 120 }} />
              <span className="text-sm text-muted">/month</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {['300', '400', '450', '500', '600'].map(v => (
                <Pill key={v} selected={monthlyBudget === parseInt(v)} onClick={() => setPrefs(p => ({ ...p, monthlyBudget: parseInt(v) }))}>${v}</Pill>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>How often do you shop?</label>
            {FREQ_OPTIONS.map(opt => (
              <div key={opt.value} onClick={() => setPrefs(p => ({ ...p, shopFreq: opt.value }))}
                style={{ padding: '12px 14px', borderRadius: 10, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: shopFreq === opt.value ? '2px solid var(--green)' : '1px solid var(--border)', background: shopFreq === opt.value ? 'var(--green-light)' : 'var(--bg-white)', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: shopFreq === opt.value ? 700 : 400, color: shopFreq === opt.value ? 'var(--green)' : 'var(--text)' }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>${Math.round(monthlyBudget / opt.trips)}/trip · {opt.desc}</div>
                </div>
                {shopFreq === opt.value && <Icon name="check" size={16} style={{ color: 'var(--green)' }} />}
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--green-light)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#166534' }}>
              <strong>${perTrip}</strong> per trip · <strong>${Math.round(monthlyBudget / 4)}</strong>/week
            </div>
          </div>
          <Button variant="primary" onClick={() => setEditSheet(null)}>Save</Button>
        </EditSheet>
      )}

      {/* Proteins */}
      {editSheet === 'proteins' && (
        <EditSheet title="Proteins you buy" onClose={() => setEditSheet(null)}>
          <p className="text-sm mb-16">Build My Week rotates these so meals stay interesting.</p>
          {PROTEIN_OPTIONS.map(group => (
            <div key={group.group} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>{group.group}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {group.items.map(p => (
                  <Pill key={p} selected={prefs?.proteins?.includes(p)} onClick={() => toggleProtein(p)}>{p}</Pill>
                ))}
              </div>
            </div>
          ))}
          <div style={{ marginTop: 8 }}>
            <Button variant="primary" onClick={() => setEditSheet(null)}>Save</Button>
          </div>
        </EditSheet>
      )}

      {/* Meal types */}
      {editSheet === 'mealtypes' && (
        <EditSheet title="Meal types" onClose={() => setEditSheet(null)}>
          <p className="text-sm mb-16">What does your household like to eat?</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {MEAL_TYPES.map(t => (
              <Pill key={t.value} selected={prefs?.mealTypes?.includes(t.value)} onClick={() => toggleMealType(t.value)}>{t.label}</Pill>
            ))}
          </div>
          <Button variant="primary" onClick={() => setEditSheet(null)}>Save</Button>
        </EditSheet>
      )}
    </div>
  );
}
