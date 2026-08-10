import React, { useState, useMemo, useEffect } from 'react';
import { Icon, Button, SectionLabel } from '../components/UI';
import { PLAN_SLOTS, DAYS } from '../data/meals';

const STORE_COLORS = {
  'Aldi': { bg: '#f0fdf4', border: '#86efac', label: '#166534' },
  'Walmart': { bg: '#fffbeb', border: '#fcd34d', label: '#92400e' },
  'Costco': { bg: '#eff6ff', border: '#93c5fd', label: '#1e40af' },
  "Sam's Club": { bg: '#fef2f2', border: '#fca5a5', label: '#991b1b' },
  "Trader Joe's": { bg: '#fdf4ff', border: '#d8b4fe', label: '#6b21a8' },
  'Kroger': { bg: '#fff7ed', border: '#fdba74', label: '#9a3412' },
  'Other': { bg: '#f4f4f5', border: '#d4d4d8', label: '#52525b' },
  'Pantry': { bg: '#f4f4f5', border: '#d4d4d8', label: '#52525b' },
};

function getStoreColor(store) {
  for (const [key, val] of Object.entries(STORE_COLORS)) {
    if (store && store.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return STORE_COLORS['Other'];
}

const FREQ_OPTIONS = [
  { value: 'weekly', label: 'Weekly', trips: 4 },
  { value: 'biweekly', label: 'Every 2 weeks', trips: 2 },
  { value: 'twicemonth', label: 'Twice a month', trips: 2 },
];

function tripsPerMonth(freq) {
  return FREQ_OPTIONS.find(f => f.value === freq)?.trips || 2;
}

export default function GroceryScreen({ store }) {
  const { meals, plans, activeWeek, pantry, budget, setBudget, prefs, setPrefs } = store;

  // Shopping settings
  const monthlyBudget = prefs?.monthlyBudget || budget * 4;
  const freq = prefs?.shopFreq || 'biweekly';
  const trips = tripsPerMonth(freq);
  const perTripBudget = Math.round(monthlyBudget / trips);

  // Trip totals per store — persisted in localStorage
  const [storeTotals, setStoreTotals] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gitk_store_totals') || '{}'); } catch { return {}; }
  });

  // Trip history
  const [tripHistory, setTripHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gitk_trip_history') || '[]'); } catch { return []; }
  });

  const [checked, setChecked] = useState({});
  const [storeOverrides, setStoreOverrides] = useState({});
  const [editingStore, setEditingStore] = useState(null);
  const [extras, setExtras] = useState(() => {
    try {
      const pending = JSON.parse(localStorage.getItem('gitk_grocery_extras') || '[]');
      if (pending.length) localStorage.removeItem('gitk_grocery_extras');
      return pending;
    } catch { return []; }
  });
  const [extraName, setExtraName] = useState('');
  const [extraStore, setExtraStore] = useState('');
  const [addingExtra, setAddingExtra] = useState(false);
  const [view, setView] = useState('all');
  const [activeStore, setActiveStore] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Save store totals to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('gitk_store_totals', JSON.stringify(storeTotals));
  }, [storeTotals]);

  const setStoreTotal = (storeName, val) => {
    setStoreTotals(prev => ({ ...prev, [storeName]: val }));
  };

  const tripTotal = Object.values(storeTotals).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
  const remaining = perTripBudget - tripTotal;
  const isOver = tripTotal > perTripBudget;

  const saveTrip = () => {
    const newTrip = {
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      stores: { ...storeTotals },
      total: tripTotal,
      budget: perTripBudget,
    };
    const updated = [newTrip, ...tripHistory].slice(0, 12); // keep last 12 trips
    setTripHistory(updated);
    localStorage.setItem('gitk_trip_history', JSON.stringify(updated));
    setStoreTotals({});
    setChecked({});
    alert('Trip saved! Totals have been reset for your next trip.');
  };

  // Build grocery list from weekly plan
  const planItems = useMemo(() => {
    const plan = plans['week' + activeWeek] || {};
    const seen = {};
    DAYS.forEach(day => {
      PLAN_SLOTS.forEach(slot => {
        const meal = meals.find(m => m.id === (plan[day]?.[slot]));
        if (!meal?.items) return;
        meal.items.forEach(it => {
          const key = it.n.toLowerCase() + '|' + (it.s || '');
          if (!seen[key]) seen[key] = { name: it.n, store: it.s || '', source: 'plan' };
        });
      });
    });
    return Object.values(seen);
  }, [meals, plans, activeWeek]);

  const lowPantryItems = useMemo(() => {
    const now = Date.now();
    return pantry
      .filter(p => {
        if (p.type === 'frozen') return false;
        if (p.type === 'fresh' || p.fresh) {
          return Math.floor((now - p.addedAt) / 86400000) >= 3;
        }
        return false;
      })
      .slice(0, 6)
      .map(p => ({ name: p.name, store: '', source: 'pantry', qty: p.qty }));
  }, [pantry]);

  const allItems = useMemo(() => [...planItems, ...lowPantryItems, ...extras], [planItems, lowPantryItems, extras]);

  const byStore = useMemo(() => {
    const groups = {};
    allItems.forEach((item, idx) => {
      const key = item.source + '|' + idx + '|' + item.name;
      const s = storeOverrides[key] || item.store || 'No store';
      if (!groups[s]) groups[s] = [];
      groups[s].push({ ...item, idx, key });
    });
    return groups;
  }, [allItems, storeOverrides]);

  const userStores = prefs?.stores || [];
  const storesWithItems = Object.keys(byStore).filter(s => s !== 'No store');
  const checkedCount = Object.values(checked).filter(Boolean).length;

  const toggleCheck = (key) => setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  const removeExtra = (id) => setExtras(prev => prev.filter(e => e.id !== id));
  const addExtra = () => {
    if (!extraName.trim()) return;
    setExtras(prev => [...prev, { name: extraName.trim(), store: extraStore.trim() || '', source: 'extra', id: Date.now() }]);
    setExtraName(''); setExtraStore(''); setAddingExtra(false);
  };

  const renderItem = (item, idx) => {
    const key = item.key || (item.source + '|' + idx + '|' + item.name);
    const isChecked = checked[key];
    const currentStore = storeOverrides[key] || item.store || '';
    const storeColor = currentStore ? getStoreColor(currentStore) : null;
    const isEditingThisStore = editingStore === key;

    return (
      <div key={key} style={{ padding: '10px 0', borderBottom: '0.5px solid var(--border)', opacity: isChecked ? 0.45 : 1, transition: 'opacity .2s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div onClick={() => toggleCheck(key)} style={{
            width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: 'pointer',
            border: isChecked ? 'none' : '1.5px solid var(--border)',
            background: isChecked ? 'var(--green)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {isChecked && <Icon name="check" size={13} style={{ color: '#fff' }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, textDecoration: isChecked ? 'line-through' : 'none', color: isChecked ? 'var(--text-muted)' : 'var(--text)' }}>{item.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
              <span onClick={() => setEditingStore(isEditingThisStore ? null : key)}
                style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 4, cursor: 'pointer',
                  background: storeColor ? storeColor.bg : 'var(--surface)',
                  color: storeColor ? storeColor.label : 'var(--text-muted)',
                  border: '0.5px solid ' + (storeColor ? storeColor.border : 'var(--border)'),
                  fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3
                }}>
                {currentStore || 'No store'} <span style={{ fontSize: 9, opacity: 0.7 }}>▼</span>
              </span>
              {item.source === 'pantry' && <span style={{ fontSize: 10, color: 'var(--warning)', fontWeight: 600 }}>Running low</span>}
              {item.qty && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.qty}</span>}
            </div>
            {isEditingThisStore && (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {userStores.concat(['Other']).map(s => {
                  const sc = getStoreColor(s);
                  const isSel = currentStore === s;
                  return (
                    <div key={s} onClick={() => { setStoreOverrides(prev => ({ ...prev, [key]: s })); setEditingStore(null); }}
                      style={{ padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: isSel ? 700 : 400, border: '1.5px solid ' + (isSel ? sc.label : sc.border), background: isSel ? sc.bg : 'var(--bg-white)', color: isSel ? sc.label : 'var(--text-secondary)' }}>
                      {s}
                    </div>
                  );
                })}
                <div onClick={() => { setStoreOverrides(prev => ({ ...prev, [key]: '' })); setEditingStore(null); }}
                  style={{ padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', border: '1.5px solid var(--border)' }}>
                  No store
                </div>
                <div onClick={() => setEditingStore(null)}
                  style={{ padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', border: '1.5px solid var(--border)' }}>
                  Cancel
                </div>
              </div>
            )}
          </div>
          {item.source === 'extra' && (
            <button onClick={() => removeExtra(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, flexShrink: 0 }}>
              <Icon name="x" size={14} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <span className="screen-title">Grocery list</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowHistory(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}>
            History
          </button>
          <button onClick={() => setShowSettings(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <Icon name="settings" size={18} />
          </button>
        </div>
      </div>

      <div className="screen-padded">

        {/* ── BUDGET CARD ── */}
        <div className="card mb-12">
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>Monthly budget</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>${monthlyBudget.toFixed(0)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{trips} trips · ${perTripBudget}/trip</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>This trip</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: isOver ? 'var(--danger)' : tripTotal > 0 ? 'var(--green)' : 'var(--text)' }}>
                ${tripTotal.toFixed(2)}
              </div>
              <div style={{ fontSize: 12, marginTop: 2, color: isOver ? 'var(--danger)' : 'var(--green)', fontWeight: isOver ? 700 : 400 }}>
                {isOver ? `$${Math.abs(remaining).toFixed(2)} over` : tripTotal > 0 ? `$${remaining.toFixed(2)} left` : `budget $${perTripBudget}`}
              </div>
            </div>
          </div>

          {/* Budget progress bar */}
          <div style={{ height: 8, background: 'var(--surface)', borderRadius: 4, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ height: '100%', width: Math.min(100, (tripTotal / perTripBudget) * 100) + '%', background: isOver ? 'var(--danger)' : 'var(--green)', borderRadius: 4, transition: 'width .3s' }} />
          </div>

          {/* Per-store totals entry */}
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
            Enter totals by store
          </div>
          {userStores.map(s => {
            const sc = getStoreColor(s);
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{
                  fontSize: 12, padding: '3px 10px', borderRadius: 4, fontWeight: 600,
                  background: sc.bg, color: sc.label, border: '0.5px solid ' + sc.border,
                  minWidth: 80, textAlign: 'center'
                }}>{s}</span>
                <div style={{ flex: 1, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text-muted)' }}>$</span>
                  <input
                    type="number" step="0.01" placeholder="0.00"
                    value={storeTotals[s] || ''}
                    onChange={e => setStoreTotal(s, e.target.value)}
                    style={{ width: '100%', paddingLeft: 22, height: 38, fontSize: 15, fontWeight: 600 }}
                  />
                </div>
                {storeTotals[s] && parseFloat(storeTotals[s]) > 0 && (
                  <Icon name="check-circle" size={18} style={{ color: 'var(--green)', flexShrink: 0 }} />
                )}
              </div>
            );
          })}

          {tripTotal > 0 && (
            <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Trip total</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: isOver ? 'var(--danger)' : 'var(--green)' }}>${tripTotal.toFixed(2)}</span>
                <button onClick={saveTrip} style={{
                  background: 'var(--green)', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                }}>Save trip</button>
              </div>
            </div>
          )}
        </div>

        {/* ── VIEW TABS ── */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <button onClick={() => setView('all')} style={{ flex: 1, padding: '9px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: view === 'all' ? 'var(--green)' : 'var(--surface)', color: view === 'all' ? '#fff' : 'var(--text-secondary)' }}>
            All items ({allItems.length})
          </button>
          <button onClick={() => { setView('by-store'); setActiveStore(storesWithItems[0] || userStores[0] || null); }} style={{ flex: 1, padding: '9px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: view === 'by-store' ? 'var(--green)' : 'var(--surface)', color: view === 'by-store' ? '#fff' : 'var(--text-secondary)' }}>
            By store
          </button>
        </div>

        {/* ── ALL ITEMS VIEW ── */}
        {view === 'all' && (
          <div>
            {planItems.length > 0 && (
              <div className="mb-16">
                <SectionLabel>From your meal plan</SectionLabel>
                {planItems.map((item, idx) => renderItem(item, idx))}
              </div>
            )}
            {lowPantryItems.length > 0 && (
              <div className="mb-16">
                <SectionLabel>Running low in pantry</SectionLabel>
                {lowPantryItems.map((item, idx) => renderItem(item, planItems.length + idx))}
              </div>
            )}
            <div className="mb-16">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <SectionLabel>Extra items</SectionLabel>
                <button onClick={() => setAddingExtra(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="plus" size={14} /> Add item
                </button>
              </div>
              {extras.length === 0 && !addingExtra && (
                <div style={{ padding: '12px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  Tap "+ Add item" for anything not on your meal plan
                </div>
              )}
              {extras.map((item, idx) => renderItem(item, planItems.length + lowPantryItems.length + idx))}
              {addingExtra && (
                <div className="card-flat" style={{ marginTop: 8, padding: 12 }}>
                  <div className="form-group">
                    <input value={extraName} onChange={e => setExtraName(e.target.value)} placeholder="Item name" autoFocus onKeyDown={e => e.key === 'Enter' && addExtra()} />
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Store <span style={{ fontWeight: 400 }}>(optional)</span></label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {userStores.concat(['Other']).map(s => {
                        const sc = getStoreColor(s);
                        const isSel = extraStore === s;
                        return (
                          <div key={s} onClick={() => setExtraStore(isSel ? '' : s)}
                            style={{ padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: isSel ? 700 : 400, border: '1.5px solid ' + (isSel ? sc.label : sc.border), background: isSel ? sc.bg : 'var(--bg-white)', color: isSel ? sc.label : 'var(--text-secondary)' }}>
                            {s}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="primary" onClick={addExtra} style={{ flex: 1 }}>Add</Button>
                    <Button variant="ghost" onClick={() => { setAddingExtra(false); setExtraName(''); setExtraStore(''); }} style={{ flex: 1 }}>Cancel</Button>
                  </div>
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
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <button onClick={() => setChecked({})} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13 }}>Clear all checkmarks</button>
              </div>
            )}
          </div>
        )}

        {/* ── BY STORE VIEW ── */}
        {view === 'by-store' && (
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {userStores.map(s => {
                const color = getStoreColor(s);
                const isActive = activeStore === s;
                const count = byStore[s]?.length || 0;
                return (
                  <button key={s} onClick={() => setActiveStore(s)} style={{ padding: '7px 14px', borderRadius: 20, border: '1.5px solid', borderColor: isActive ? color.label : color.border, background: isActive ? color.bg : 'var(--bg-white)', color: isActive ? color.label : 'var(--text-secondary)', fontSize: 13, fontWeight: isActive ? 700 : 400, cursor: 'pointer' }}>
                    {s} {count > 0 ? `(${count})` : ''}
                  </button>
                );
              })}
            </div>
            {activeStore && byStore[activeStore]?.length > 0 && (
              <div>
                <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 12, background: getStoreColor(activeStore).bg, border: '0.5px solid ' + getStoreColor(activeStore).border }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: getStoreColor(activeStore).label }}>{activeStore}</div>
                  <div style={{ fontSize: 12, color: getStoreColor(activeStore).label, opacity: 0.8, marginTop: 2 }}>{byStore[activeStore].length} item{byStore[activeStore].length !== 1 ? 's' : ''}</div>
                </div>
                {byStore[activeStore].map((item, idx) => renderItem(item, idx))}
              </div>
            )}
            {activeStore && (!byStore[activeStore] || byStore[activeStore].length === 0) && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🛒</div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Nothing from {activeStore} this week</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── BUDGET SETTINGS SHEET ── */}
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
                <input type="number" value={monthlyBudget}
                  onChange={e => setPrefs(p => ({ ...p, monthlyBudget: parseFloat(e.target.value) || 0 }))}
                  style={{ fontSize: 24, fontWeight: 700, width: 120 }} />
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>per month</span>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>How often do you shop?</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {FREQ_OPTIONS.map(opt => (
                  <div key={opt.value} onClick={() => setPrefs(p => ({ ...p, shopFreq: opt.value }))}
                    style={{ padding: '12px 14px', borderRadius: 10, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: freq === opt.value ? '2px solid var(--green)' : '1px solid var(--border)', background: freq === opt.value ? 'var(--green-light)' : 'var(--bg-white)' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: freq === opt.value ? 700 : 400, color: freq === opt.value ? 'var(--green)' : 'var(--text)' }}>{opt.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        ${Math.round(monthlyBudget / opt.trips)}/trip · {opt.trips} trips/month
                      </div>
                    </div>
                    {freq === opt.value && <Icon name="check" size={16} style={{ color: 'var(--green)' }} />}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--green-light)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: '#166534' }}>
                <strong>${Math.round(monthlyBudget / trips)}</strong> per trip · <strong>{trips}</strong> trips per month · <strong>${monthlyBudget}</strong>/month
              </div>
            </div>

            <Button variant="primary" onClick={() => setShowSettings(false)}>Done</Button>
          </div>
        </>
      )}

      {/* ── TRIP HISTORY SHEET ── */}
      {showHistory && (
        <>
          <div onClick={() => setShowHistory(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200 }} />
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 640, background: 'var(--bg-white)', borderRadius: '20px 20px 0 0', zIndex: 201, maxHeight: '75vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px 10px', flexShrink: 0 }}>
              <div style={{ width: 40, height: 4, background: 'var(--border-strong)', borderRadius: 2, margin: '0 auto 16px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>Trip history</span>
                <button onClick={() => setShowHistory(false)} style={{ background: 'var(--surface)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
            </div>
            <div style={{ overflow: 'auto', flex: 1, padding: '0 20px 32px' }}>
              {tripHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  No trips saved yet. Enter your store totals and tap "Save trip" after shopping.
                </div>
              ) : (
                tripHistory.map((trip, i) => (
                  <div key={i} style={{ padding: '14px 0', borderBottom: '0.5px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{trip.date}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Budget: ${trip.budget}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: trip.total > trip.budget ? 'var(--danger)' : 'var(--green)' }}>${trip.total.toFixed(2)}</div>
                        <div style={{ fontSize: 11, color: trip.total > trip.budget ? 'var(--danger)' : 'var(--green)' }}>
                          {trip.total > trip.budget ? `$${(trip.total - trip.budget).toFixed(2)} over` : `$${(trip.budget - trip.total).toFixed(2)} under`}
                        </div>
                      </div>
                    </div>
                    {Object.entries(trip.stores || {}).filter(([, v]) => parseFloat(v) > 0).map(([s, v]) => (
                      <div key={s} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', padding: '2px 0' }}>
                        <span>{s}</span><span>${parseFloat(v).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
