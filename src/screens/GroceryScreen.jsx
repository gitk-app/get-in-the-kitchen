import React, { useState, useMemo, useEffect } from 'react';
import { Icon, Button, SectionLabel } from '../components/UI';
import { PLAN_SLOTS, DAYS } from '../data/meals';

const STORE_COLORS = {
  'Aldi': { bg: '#f0fdf4', border: '#86efac', label: '#166534', bar: '#16a34a' },
  'Walmart': { bg: '#fffbeb', border: '#fcd34d', label: '#92400e', bar: '#d97706' },
  'Costco': { bg: '#eff6ff', border: '#93c5fd', label: '#1e40af', bar: '#3b82f6' },
  "Sam's Club": { bg: '#fef2f2', border: '#fca5a5', label: '#991b1b', bar: '#ef4444' },
  "Trader Joe's": { bg: '#fdf4ff', border: '#d8b4fe', label: '#6b21a8', bar: '#a855f7' },
  'Kroger': { bg: '#fff7ed', border: '#fdba74', label: '#9a3412', bar: '#f97316' },
  'Other': { bg: '#f4f4f5', border: '#d4d4d8', label: '#52525b', bar: '#71717a' },
};

function getStoreColor(s) {
  if (!s) return STORE_COLORS['Other'];
  for (const [key, val] of Object.entries(STORE_COLORS)) {
    if (s.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return STORE_COLORS['Other'];
}

const STORE_DOMAINS = {
  'aldi': 'aldi.us',
  'walmart': 'walmart.com',
  'costco': 'costco.com',
  "sam's club": 'samsclub.com',
  "trader joe's": 'traderjoes.com',
  'kroger': 'kroger.com',
  'target': 'target.com',
  'publix': 'publix.com',
  'heb': 'heb.com',
  'h-e-b': 'heb.com',
  'winn dixie': 'winndixie.com',
  'winn-dixie': 'winndixie.com',
  'meijer': 'meijer.com',
  'wegmans': 'wegmans.com',
  'sprouts': 'sprouts.com',
  'food lion': 'foodlion.com',
  'safeway': 'safeway.com',
  'albertsons': 'albertsons.com',
  'whole foods': 'wholefoodsmarket.com',
  'lidl': 'lidl.com',
  'hy-vee': 'hy-vee.com',
  'piggly wiggly': 'pigglywiggly.com',
  'ingles': 'ingles-markets.com',
  'winco': 'wincofoods.com',
};

function getStoreDomain(name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  for (const [key, domain] of Object.entries(STORE_DOMAINS)) {
    if (lower.includes(key)) return domain;
  }
  return null;
}

function StoreLogo({ name, size }) {
  const [failed, setFailed] = useState(false);
  const sc = getStoreColor(name);
  const domain = getStoreDomain(name);
  const logoSize = size || 16;

  if (!failed && domain) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: sc.bg, border: '0.5px solid ' + sc.border, borderRadius: 6, padding: '2px 7px' }}>
        <img
          src={'https://www.google.com/s2/favicons?domain=' + domain + '&sz=32'}
          alt={name}
          width={logoSize}
          height={logoSize}
          style={{ borderRadius: 2, objectFit: 'contain' }}
          onError={() => setFailed(true)}
        />
        <span style={{ fontSize: 11, fontWeight: 600, color: sc.label }}>{name}</span>
      </span>
    );
  }

  return (
    <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, fontWeight: 600, background: sc.bg, color: sc.label, border: '0.5px solid ' + sc.border }}>
      {name}
    </span>
  );
}

function StoreBarChart({ stores, total }) {
  return (
    <div style={{ marginTop: 10 }}>
      {Object.entries(stores).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a).map(([s, v]) => {
        const sc = getStoreColor(s);
        const pct = total > 0 ? Math.round((v / total) * 100) : 0;
        return (
          <div key={s} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
              <StoreLogo name={s} size={14} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>${v.toFixed(2)} <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>({pct}%)</span></span>
            </div>
            <div style={{ height: 8, background: 'var(--surface)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: pct + '%', background: sc.bar, borderRadius: 4 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const FREQ_OPTIONS = [
  { value: 'weekly', label: 'Weekly', trips: 4 },
  { value: 'biweekly', label: 'Every 2 weeks', trips: 2 },
  { value: 'twicemonth', label: 'Twice a month', trips: 2 },
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getMonthKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

export default function GroceryScreen({ store }) {
  const { meals, plans, activeWeek, pantry, budget, prefs, setPrefs } = store;

  const monthlyBudget = prefs?.monthlyBudget || budget * 4;
  const annualBudget = monthlyBudget * 12;
  const freq = prefs?.shopFreq || 'biweekly';
  const trips = FREQ_OPTIONS.find(f => f.value === freq)?.trips || 2;
  const perTripBudget = Math.round(monthlyBudget / trips);
  const userStores = prefs?.stores || [];

  const [storeTotals, setStoreTotals] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gitk_store_totals') || '{}'); } catch { return {}; }
  });
  useEffect(() => { localStorage.setItem('gitk_store_totals', JSON.stringify(storeTotals)); }, [storeTotals]);

  const [tripHistory, setTripHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gitk_trip_history') || '[]'); } catch { return []; }
  });

  const [extras, setExtras] = useState(() => {
    try {
      const p = JSON.parse(localStorage.getItem('gitk_grocery_extras') || '[]');
      if (p.length) localStorage.removeItem('gitk_grocery_extras');
      return p;
    } catch { return []; }
  });

  const [view, setView] = useState('all');
  const [activeStoreTab, setActiveStoreTab] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [extraName, setExtraName] = useState('');
  const [extraStore, setExtraStore] = useState('');
  const [addingExtra, setAddingExtra] = useState(false);
  const [storeOverrides, setStoreOverrides] = useState({});
  const [editingStore, setEditingStore] = useState(null);
  const [removed, setRemoved] = useState(new Set());
  const [checkedNames, setCheckedNames] = useState(new Set());

  const currentYear = new Date().getFullYear();
  const currentMonthKey = getMonthKey(new Date());

  const ytdTrips = useMemo(() => tripHistory.filter(t => t.yearKey === String(currentYear)), [tripHistory, currentYear]);
  const ytdTotal = useMemo(() => ytdTrips.reduce((s, t) => s + (t.total || 0), 0), [ytdTrips]);

  const monthlySpent = useMemo(() => {
    const spent = {};
    tripHistory.forEach(t => { if (t.monthKey) spent[t.monthKey] = (spent[t.monthKey] || 0) + (t.total || 0); });
    return spent;
  }, [tripHistory]);

  const currentMonthSpent = monthlySpent[currentMonthKey] || 0;
  const currentMonthRemaining = monthlyBudget - currentMonthSpent;
  const currentMonthOver = currentMonthSpent > monthlyBudget;

  const tripTotal = Object.values(storeTotals).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const tripRemaining = perTripBudget - tripTotal;
  const tripOver = tripTotal > perTripBudget;

  const last3Months = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = getMonthKey(d);
      const label = MONTHS[d.getMonth()] + ' ' + d.getFullYear();
      const mTrips = tripHistory.filter(t => t.monthKey === key);
      const total = mTrips.reduce((s, t) => s + (t.total || 0), 0);
      const allStores = {};
      mTrips.forEach(t => Object.entries(t.stores || {}).forEach(([s, v]) => { allStores[s] = (allStores[s] || 0) + (parseFloat(v) || 0); }));
      result.push({ key, label, trips: mTrips, total, allStores, budget: monthlyBudget });
    }
    return result;
  }, [tripHistory, monthlyBudget]);

  const saveTrip = () => {
    if (tripTotal === 0) { alert('Enter your store totals first.'); return; }
    const now = new Date();
    const t = {
      date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      monthKey: getMonthKey(now),
      yearKey: String(now.getFullYear()),
      stores: { ...storeTotals },
      total: tripTotal,
      budget: perTripBudget,
    };
    const updated = [t, ...tripHistory].slice(0, 50);
    setTripHistory(updated);
    localStorage.setItem('gitk_trip_history', JSON.stringify(updated));
    setStoreTotals({});
    setCheckedNames(new Set());
    setRemoved(new Set());
    alert('Trip saved! $' + tripTotal.toFixed(2) + ' logged.');
  };

  const planItems = useMemo(() => {
    const plan = plans['week' + activeWeek] || {};
    const seen = {};
    DAYS.forEach(day => {
      PLAN_SLOTS.forEach(slot => {
        const meal = meals.find(m => m.id === plan[day]?.[slot]);
        if (!meal?.items) return;
        meal.items.forEach(it => {
          const k = it.n + '|' + (it.s || '');
          if (!seen[k]) seen[k] = { name: it.n, store: it.s || '', source: 'plan' };
        });
      });
    });
    return Object.values(seen);
  }, [meals, plans, activeWeek]);

  const lowPantryItems = useMemo(() => pantry
    .filter(p => { if (p.type === 'frozen') return false; return (p.type === 'fresh' || p.fresh) && Math.floor((Date.now() - p.addedAt) / 86400000) >= 3; })
    .slice(0, 6).map(p => ({ name: p.name, store: '', source: 'pantry', qty: p.qty })), [pantry]);

  const allItems = useMemo(() => [...planItems, ...lowPantryItems, ...extras]
    .filter(item => !removed.has(item.name + '|' + item.source)), [planItems, lowPantryItems, extras, removed]);

  const getItemStore = (item) => storeOverrides[item.name] || item.store || '';

  const byStore = useMemo(() => {
    const g = {};
    allItems.forEach(item => { const s = getItemStore(item) || 'No store'; if (!g[s]) g[s] = []; g[s].push(item); });
    return g;
  }, [allItems, storeOverrides]);

  const toggleCheck = (name, source) => {
    const k = name + '|' + source;
    setCheckedNames(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  };

  const isChecked = (name, source) => checkedNames.has(name + '|' + source);
  const checkedCount = checkedNames.size;
  const removeChecked = () => { setRemoved(prev => new Set([...prev, ...checkedNames])); setCheckedNames(new Set()); };

  const addExtra = () => {
    if (!extraName.trim()) return;
    setExtras(prev => [...prev, { name: extraName.trim(), store: extraStore || '', source: 'extra', id: Date.now() }]);
    setExtraName(''); setExtraStore(''); setAddingExtra(false);
  };

  const renderItem = (item) => {
    const checked = isChecked(item.name, item.source);
    const currentStore = getItemStore(item);
    const isEditingThis = editingStore === item.name + item.source;
    return (
      <div key={item.name + item.source} style={{ padding: '10px 0', borderBottom: '0.5px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: checked ? 0.4 : 1 }}>
          <div onClick={() => toggleCheck(item.name, item.source)} style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, cursor: 'pointer', border: checked ? 'none' : '1.5px solid var(--border)', background: checked ? 'var(--green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {checked && <Icon name="check" size={14} style={{ color: '#fff' }} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, textDecoration: checked ? 'line-through' : 'none', color: checked ? 'var(--text-muted)' : 'var(--text)' }}>{item.name}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
              <span onClick={() => setEditingStore(isEditingThis ? null : item.name + item.source)} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <StoreLogo name={currentStore || 'No store'} size={13} />
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>▼</span>
              </span>
              {item.source === 'pantry' && <span style={{ fontSize: 10, color: 'var(--warning)', fontWeight: 600 }}>Running low</span>}
              {item.qty && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.qty}</span>}
            </div>
            {isEditingThis && (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {userStores.concat(['Other']).map(s => { const c = getStoreColor(s); const sel = currentStore === s; return <div key={s} onClick={() => { setStoreOverrides(p => ({ ...p, [item.name]: s })); setEditingStore(null); }} style={{ padding: '5px 10px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: sel ? 700 : 400, border: '1.5px solid ' + (sel ? c.label : c.border), background: sel ? c.bg : 'var(--bg-white)', color: sel ? c.label : 'var(--text-secondary)' }}>{s}</div>; })}
                <div onClick={() => { setStoreOverrides(p => ({ ...p, [item.name]: '' })); setEditingStore(null); }} style={{ padding: '5px 10px', borderRadius: 20, cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', border: '1.5px solid var(--border)' }}>No store</div>
                <div onClick={() => setEditingStore(null)} style={{ padding: '5px 10px', borderRadius: 20, cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', border: '1.5px solid var(--border)' }}>Cancel</div>
              </div>
            )}
          </div>
          {item.source === 'extra' && <button onClick={() => setExtras(p => p.filter(e => e.id !== item.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}><Icon name="x" size={14} /></button>}
        </div>
      </div>
    );
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <span className="screen-title">Grocery list</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowHistory(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}>History</button>
          <button onClick={() => setShowSettings(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Icon name="settings" size={18} /></button>
        </div>
      </div>

      <div className="screen-padded">

        {/* Budget card */}
        <div className="card mb-12">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>Monthly budget</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>${monthlyBudget}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{trips} trips · ${perTripBudget}/trip</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2, color: currentMonthOver ? 'var(--danger)' : 'var(--green)' }}>{currentMonthOver ? 'Over budget' : 'Remaining'}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: currentMonthOver ? 'var(--danger)' : 'var(--green)' }}>${Math.abs(currentMonthRemaining).toFixed(0)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>${currentMonthSpent.toFixed(2)} spent this month</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span>Monthly spent</span><span>${currentMonthSpent.toFixed(2)} of ${monthlyBudget}</span>
          </div>
          <div style={{ height: 8, background: 'var(--surface)', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ height: '100%', width: Math.min(100, (currentMonthSpent / monthlyBudget) * 100) + '%', background: currentMonthOver ? 'var(--danger)' : 'var(--green)', borderRadius: 4 }} />
          </div>

          {/* This trip sub-card */}
          <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>This trip</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Budget: ${perTripBudget}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: tripOver ? 'var(--danger)' : tripTotal > 0 ? 'var(--green)' : 'var(--text)' }}>${tripTotal.toFixed(2)}</div>
                {tripTotal > 0 && <div style={{ fontSize: 11, color: tripOver ? 'var(--danger)' : 'var(--green)' }}>{tripOver ? '$' + Math.abs(tripRemaining).toFixed(2) + ' over' : '$' + tripRemaining.toFixed(2) + ' left'}</div>}
              </div>
            </div>
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: Math.min(100, (tripTotal / perTripBudget) * 100) + '%', background: tripOver ? 'var(--danger)' : 'var(--green)', borderRadius: 3, transition: 'width .3s' }} />
            </div>
          </div>

          {/* Store totals */}
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Enter totals by store</div>
          {userStores.map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <StoreLogo name={s} size={16} />
              <div style={{ flex: 1, position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text-muted)' }}>$</span>
                <input type="number" step="0.01" placeholder="0.00" value={storeTotals[s] || ''}
                  onChange={e => setStoreTotals(p => ({ ...p, [s]: e.target.value }))}
                  style={{ width: '100%', paddingLeft: 22, height: 38, fontSize: 15, fontWeight: 600 }} />
              </div>
              {storeTotals[s] && parseFloat(storeTotals[s]) > 0 && <Icon name="check-circle" size={18} style={{ color: 'var(--green)', flexShrink: 0 }} />}
            </div>
          ))}

          {tripTotal > 0 && (
            <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Trip total</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: tripOver ? 'var(--danger)' : 'var(--green)' }}>${tripTotal.toFixed(2)}</span>
                <button onClick={saveTrip} style={{ background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save trip</button>
              </div>
            </div>
          )}
        </div>

        {/* YTD card */}
        <div className="card mb-12" style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '0.5px solid #86efac' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '.05em' }}>{currentYear} Year to date</div>
              <div style={{ fontSize: 11, color: '#166534', opacity: 0.8, marginTop: 2 }}>Resets Jan 1 · {ytdTrips.length} trip{ytdTrips.length !== 1 ? 's' : ''}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#166534' }}>${ytdTotal.toFixed(2)}</div>
              <div style={{ fontSize: 11, color: '#166534', opacity: 0.8 }}>of ${annualBudget.toFixed(0)}/yr</div>
            </div>
          </div>
          <div style={{ height: 8, background: 'rgba(255,255,255,0.5)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: Math.min(100, (ytdTotal / annualBudget) * 100) + '%', background: '#16a34a', borderRadius: 4 }} />
          </div>
          <div style={{ fontSize: 11, color: '#166534', marginTop: 6, opacity: 0.8 }}>${(annualBudget - ytdTotal).toFixed(2)} remaining for {currentYear}</div>
        </div>

        {/* View tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <button onClick={() => setView('all')} style={{ flex: 1, padding: 9, borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: view === 'all' ? 'var(--green)' : 'var(--surface)', color: view === 'all' ? '#fff' : 'var(--text-secondary)' }}>All items ({allItems.length})</button>
          <button onClick={() => { setView('by-store'); setActiveStoreTab(userStores[0] || null); }} style={{ flex: 1, padding: 9, borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: view === 'by-store' ? 'var(--green)' : 'var(--surface)', color: view === 'by-store' ? '#fff' : 'var(--text-secondary)' }}>By store</button>
        </div>

        {/* All items */}
        {view === 'all' && (
          <div>
            {planItems.filter(i => !removed.has(i.name + '|' + i.source)).length > 0 && (
              <div className="mb-16">
                <SectionLabel>From your meal plan</SectionLabel>
                {planItems.filter(i => !removed.has(i.name + '|' + i.source)).map(item => renderItem(item))}
              </div>
            )}
            {lowPantryItems.filter(i => !removed.has(i.name + '|' + i.source)).length > 0 && (
              <div className="mb-16">
                <SectionLabel>Running low in pantry</SectionLabel>
                {lowPantryItems.filter(i => !removed.has(i.name + '|' + i.source)).map(item => renderItem(item))}
              </div>
            )}
            <div className="mb-16">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <SectionLabel>Extra items</SectionLabel>
                <button onClick={() => setAddingExtra(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="plus" size={14} /> Add item</button>
              </div>
              {extras.filter(i => !removed.has(i.name + '|' + i.source)).length === 0 && !addingExtra && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>Tap "+ Add item" for anything not on your meal plan</div>
              )}
              {extras.filter(i => !removed.has(i.name + '|' + i.source)).map(item => renderItem(item))}
              {addingExtra && (
                <div className="card-flat" style={{ marginTop: 8, padding: 12 }}>
                  <div className="form-group"><input value={extraName} onChange={e => setExtraName(e.target.value)} placeholder="Item name" autoFocus onKeyDown={e => e.key === 'Enter' && addExtra()} /></div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Store (optional)</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {userStores.concat(['Other']).map(s => { const sc = getStoreColor(s); const sel = extraStore === s; return <div key={s} onClick={() => setExtraStore(sel ? '' : s)} style={{ padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: sel ? 700 : 400, border: '1.5px solid ' + (sel ? sc.label : sc.border), background: sel ? sc.bg : 'var(--bg-white)', color: sel ? sc.label : 'var(--text-secondary)' }}>{s}</div>; })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}><Button variant="primary" onClick={addExtra} style={{ flex: 1 }}>Add</Button><Button variant="ghost" onClick={() => { setAddingExtra(false); setExtraName(''); setExtraStore(''); }} style={{ flex: 1 }}>Cancel</Button></div>
                </div>
              )}
            </div>
            {allItems.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No items yet</div>
                <div style={{ fontSize: 13 }}>Add meals to your weekly plan and they'll appear here.</div>
              </div>
            )}
            {checkedCount > 0 && (
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                <button onClick={removeChecked} style={{ background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>✓ Remove {checkedCount} purchased item{checkedCount > 1 ? 's' : ''}</button>
                <button onClick={() => setCheckedNames(new Set())} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}>Just uncheck all</button>
              </div>
            )}
          </div>
        )}

        {/* By store */}
        {view === 'by-store' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {userStores.map(s => { const c = getStoreColor(s); const isActive = activeStoreTab === s; const count = byStore[s]?.length || 0; return (
                <button key={s} onClick={() => setActiveStoreTab(s)} style={{ padding: '6px 12px', borderRadius: 20, border: '1.5px solid', borderColor: isActive ? c.label : c.border, background: isActive ? c.bg : 'var(--bg-white)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <StoreLogo name={s} size={14} />
                  {count > 0 && <span style={{ fontSize: 11, color: c.label, fontWeight: 600 }}>({count})</span>}
                </button>
              ); })}
            </div>
            {activeStoreTab && byStore[activeStoreTab]?.length > 0 && (
              <div>
                <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 12, background: getStoreColor(activeStoreTab).bg, border: '0.5px solid ' + getStoreColor(activeStoreTab).border, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <StoreLogo name={activeStoreTab} size={20} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: getStoreColor(activeStoreTab).label }}>{byStore[activeStoreTab].length} item{byStore[activeStoreTab].length !== 1 ? 's' : ''}</span>
                </div>
                {byStore[activeStoreTab].map(item => renderItem(item))}
              </div>
            )}
            {activeStoreTab && (!byStore[activeStoreTab] || byStore[activeStoreTab].length === 0) && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>Nothing from {activeStoreTab} this week.</div>
            )}
          </div>
        )}
      </div>

      {/* Settings sheet */}
      {showSettings && (
        <>
          <div onClick={() => setShowSettings(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200 }} />
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 640, background: 'var(--bg-white)', borderRadius: '20px 20px 0 0', zIndex: 201, padding: '20px 20px 40px' }}>
            <div style={{ width: 40, height: 4, background: 'var(--border-strong)', borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Budget settings</div>
            <div className="form-group">
              <label>Monthly grocery budget</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 700 }}>$</span>
                <input type="number" value={monthlyBudget} onChange={e => setPrefs(p => ({ ...p, monthlyBudget: parseFloat(e.target.value) || 0 }))} style={{ fontSize: 24, fontWeight: 700, width: 120 }} />
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/month · ${(monthlyBudget * 12).toFixed(0)}/year</span>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>How often do you shop?</label>
              {FREQ_OPTIONS.map(opt => (
                <div key={opt.value} onClick={() => setPrefs(p => ({ ...p, shopFreq: opt.value }))}
                  style={{ padding: '12px 14px', borderRadius: 10, cursor: 'pointer', border: freq === opt.value ? '2px solid var(--green)' : '1px solid var(--border)', background: freq === opt.value ? 'var(--green-light)' : 'var(--bg-white)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: freq === opt.value ? 700 : 400, color: freq === opt.value ? 'var(--green)' : 'var(--text)' }}>{opt.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>${Math.round(monthlyBudget / opt.trips)}/trip</div>
                  </div>
                  {freq === opt.value && <Icon name="check" size={16} style={{ color: 'var(--green)' }} />}
                </div>
              ))}
            </div>
            <Button variant="primary" onClick={() => setShowSettings(false)}>Done</Button>
          </div>
        </>
      )}

      {/* History sheet */}
      {showHistory && (
        <>
          <div onClick={() => setShowHistory(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200 }} />
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 640, background: 'var(--bg-white)', borderRadius: '20px 20px 0 0', zIndex: 201, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px 10px', flexShrink: 0, borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ width: 40, height: 4, background: 'var(--border-strong)', borderRadius: 2, margin: '0 auto 16px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>Spending history</span>
                <button onClick={() => setShowHistory(false)} style={{ background: 'var(--surface)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
            </div>
            <div style={{ overflow: 'auto', flex: 1, padding: '16px 20px 32px' }}>
              <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '0.5px solid #86efac', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginBottom: 4 }}>{currentYear} Year to Date</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#166534' }}>${ytdTotal.toFixed(2)}</div>
                <div style={{ fontSize: 12, color: '#166534', opacity: 0.8 }}>{ytdTrips.length} trips · ${(annualBudget - ytdTotal).toFixed(2)} remaining of ${annualBudget.toFixed(0)} annual</div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.5)', borderRadius: 3, overflow: 'hidden', marginTop: 10 }}>
                  <div style={{ height: '100%', width: Math.min(100, (ytdTotal / annualBudget) * 100) + '%', background: '#16a34a', borderRadius: 3 }} />
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Last 3 months</div>
              {last3Months.map((month) => {
                const over = month.total > month.budget;
                return (
                  <div key={month.key} style={{ marginBottom: 20, background: 'var(--bg-white)', border: '0.5px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{month.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{month.trips.length} trip{month.trips.length !== 1 ? 's' : ''} · budget ${month.budget}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: over ? 'var(--danger)' : month.total > 0 ? 'var(--green)' : 'var(--text-muted)' }}>{month.total > 0 ? '$' + month.total.toFixed(2) : '—'}</div>
                        {month.total > 0 && <div style={{ fontSize: 11, color: over ? 'var(--danger)' : 'var(--green)' }}>{over ? '$' + (month.total - month.budget).toFixed(2) + ' over' : '$' + (month.budget - month.total).toFixed(2) + ' under'}</div>}
                      </div>
                    </div>
                    {month.total > 0 ? (
                      <div style={{ padding: '12px 16px' }}>
                        <div style={{ height: 8, background: 'var(--surface)', borderRadius: 4, overflow: 'hidden', marginBottom: 14 }}>
                          <div style={{ height: '100%', width: Math.min(100, (month.total / month.budget) * 100) + '%', background: over ? 'var(--danger)' : 'var(--green)', borderRadius: 4 }} />
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>By store</div>
                        <StoreBarChart stores={month.allStores} total={month.total} />
                        {month.trips.length > 0 && (
                          <div style={{ marginTop: 14, borderTop: '0.5px solid var(--border)', paddingTop: 12 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Trips</div>
                            {month.trips.map((t, ti) => (
                              <div key={ti} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: ti < month.trips.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.date}</span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: t.total > t.budget ? 'var(--danger)' : 'var(--green)' }}>${t.total.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No trips recorded</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
