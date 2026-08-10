import React, { useState, useMemo } from 'react';
import { Icon, Button, SectionLabel, BudgetBar } from '../components/UI';
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
    if (store.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return STORE_COLORS['Other'];
}

export default function GroceryScreen({ store }) {
  const { meals, plans, activeWeek, pantry, budget, prefs } = store;

  const [checked, setChecked] = useState({});
  const [prices, setPrices] = useState({});
  const [extras, setExtras] = useState([]);
  const [extraName, setExtraName] = useState('');
  const [extraStore, setExtraStore] = useState('');
  const [addingExtra, setAddingExtra] = useState(false);
  const [view, setView] = useState('all'); // 'all' | 'by-store'
  const [activeStore, setActiveStore] = useState(null);

  // Build grocery list from weekly plan
  const planItems = useMemo(() => {
    const plan = plans['week' + activeWeek] || {};
    const seen = {};
    DAYS.forEach(day => {
      PLAN_SLOTS.forEach(slot => {
        const meal = meals.find(m => m.id === (plan[day]?.[slot]));
        if (!meal?.items) return;
        meal.items.forEach(it => {
          const key = it.n.toLowerCase() + '|' + it.s;
          if (!seen[key]) seen[key] = { name: it.n, store: it.s, source: 'plan' };
        });
      });
    });
    return Object.values(seen);
  }, [meals, plans, activeWeek]);

  // Low pantry items — fresh items 3+ days old or qty mentioned as low
  const lowPantryItems = useMemo(() => {
    const now = Date.now();
    return pantry
      .filter(p => {
        if (p.type === 'frozen') return false;
        if (p.type === 'fresh' || p.fresh) {
          const age = Math.floor((now - p.addedAt) / 86400000);
          return age >= 3;
        }
        return false;
      })
      .slice(0, 8)
      .map(p => ({ name: p.name, store: 'Any', source: 'pantry', qty: p.qty }));
  }, [pantry]);

  // All items combined
  const allItems = useMemo(() => [
    ...planItems,
    ...lowPantryItems,
    ...extras,
  ], [planItems, lowPantryItems, extras]);

  // Group by store
  const byStore = useMemo(() => {
    const groups = {};
    allItems.forEach((item, idx) => {
      const s = item.store || 'Other';
      if (!groups[s]) groups[s] = [];
      groups[s].push({ ...item, idx });
    });
    return groups;
  }, [allItems]);

  const userStores = prefs?.stores?.length ? prefs.stores : Object.keys(byStore);
  const storesWithItems = Object.keys(byStore).filter(s => byStore[s].length > 0);

  // Budget calculations
  const estimatedTotal = useMemo(() => {
    return planItems.reduce((sum, item) => {
      const meal = meals.find(m => m.items?.some(it => it.n === item.name));
      return sum + (meal?.cost ? meal.cost / (meal.items?.length || 1) : 0);
    }, 0);
  }, [planItems, meals]);

  const actualTotal = useMemo(() => {
    return Object.values(prices).reduce((sum, p) => sum + (parseFloat(p) || 0), 0);
  }, [prices]);

  const checkedCount = Object.values(checked).filter(Boolean).length;

  const toggleCheck = (key) => setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  const setPrice = (key, val) => setPrices(prev => ({ ...prev, [key]: val }));

  const addExtra = () => {
    if (!extraName.trim()) return;
    setExtras(prev => [...prev, {
      name: extraName.trim(),
      store: extraStore.trim() || 'Other',
      source: 'extra',
      id: Date.now()
    }]);
    setExtraName(''); setExtraStore(''); setAddingExtra(false);
  };

  const removeExtra = (id) => setExtras(prev => prev.filter(e => e.id !== id));

  const renderItem = (item, idx) => {
    const key = item.source + '|' + idx + '|' + item.name;
    const isChecked = checked[key];
    const storeColor = getStoreColor(item.store || 'Other');

    return (
      <div key={key} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 0', borderBottom: '0.5px solid var(--border)',
        opacity: isChecked ? 0.45 : 1, transition: 'opacity .2s'
      }}>
        {/* Checkbox */}
        <div onClick={() => toggleCheck(key)} style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: 'pointer',
          border: isChecked ? 'none' : '1.5px solid var(--border)',
          background: isChecked ? 'var(--green)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {isChecked && <Icon name="check" size={13} style={{ color: '#fff' }} />}
        </div>

        {/* Item name + store tag */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 500,
            textDecoration: isChecked ? 'line-through' : 'none',
            color: isChecked ? 'var(--text-muted)' : 'var(--text)'
          }}>{item.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
            {item.store && item.store !== 'Any' && (
              <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 4,
                background: storeColor.bg, color: storeColor.label,
                border: '0.5px solid ' + storeColor.border, fontWeight: 600
              }}>{item.store}</span>
            )}
            {item.source === 'pantry' && (
              <span style={{ fontSize: 10, color: 'var(--warning)', fontWeight: 600 }}>Running low</span>
            )}
            {item.qty && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.qty}</span>}
          </div>
        </div>

        {/* Price input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>$</span>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={prices[key] || ''}
            onChange={e => setPrice(key, e.target.value)}
            style={{ width: 64, height: 32, fontSize: 13, textAlign: 'right', padding: '4px 8px' }}
          />
        </div>

        {/* Remove button for extras */}
        {item.source === 'extra' && (
          <button onClick={() => removeExtra(item.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, flexShrink: 0 }}>
            <Icon name="x" size={14} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <span className="screen-title">Grocery list</span>
        <span className="text-sm text-muted">{checkedCount}/{allItems.length} done</span>
      </div>

      <div className="screen-padded">

        {/* Budget summary card */}
        <div className="card mb-12">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Estimated</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>${estimatedTotal.toFixed(2)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Actual spent</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: actualTotal > budget ? 'var(--danger)' : 'var(--green)' }}>
                ${actualTotal.toFixed(2)}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Weekly budget</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>${budget.toFixed(0)}</span>
          </div>
          {/* Estimated bar */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Estimated vs budget</div>
            <div style={{ height: 6, background: 'var(--surface)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: Math.min(100, (estimatedTotal / budget) * 100) + '%', background: estimatedTotal > budget ? 'var(--danger)' : '#94a3b8', borderRadius: 3 }} />
            </div>
          </div>
          {/* Actual bar */}
          {actualTotal > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Actual vs budget</div>
              <div style={{ height: 6, background: 'var(--surface)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: Math.min(100, (actualTotal / budget) * 100) + '%', background: actualTotal > budget ? 'var(--danger)' : 'var(--green)', borderRadius: 3, transition: 'width .3s' }} />
              </div>
              {actualTotal > budget && (
                <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>
                  Over budget by ${(actualTotal - budget).toFixed(2)}
                </div>
              )}
              {actualTotal <= budget && (
                <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4 }}>
                  ${(budget - actualTotal).toFixed(2)} remaining
                </div>
              )}
            </div>
          )}
        </div>

        {/* View tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <button onClick={() => setView('all')} style={{
            flex: 1, padding: '9px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: view === 'all' ? 'var(--green)' : 'var(--surface)',
            color: view === 'all' ? '#fff' : 'var(--text-secondary)'
          }}>All items ({allItems.length})</button>
          <button onClick={() => { setView('by-store'); setActiveStore(storesWithItems[0] || null); }} style={{
            flex: 1, padding: '9px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: view === 'by-store' ? 'var(--green)' : 'var(--surface)',
            color: view === 'by-store' ? '#fff' : 'var(--text-secondary)'
          }}>By store</button>
        </div>

        {/* ALL ITEMS VIEW */}
        {view === 'all' && (
          <div>
            {/* Plan meals section */}
            {planItems.length > 0 && (
              <div className="mb-16">
                <SectionLabel>From your meal plan</SectionLabel>
                {planItems.map((item, idx) => renderItem(item, idx))}
              </div>
            )}

            {/* Low pantry section */}
            {lowPantryItems.length > 0 && (
              <div className="mb-16">
                <SectionLabel>Running low in pantry</SectionLabel>
                {lowPantryItems.map((item, idx) => renderItem(item, planItems.length + idx))}
              </div>
            )}

            {/* Extras section */}
            <div className="mb-16">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <SectionLabel>Extra items</SectionLabel>
                <button onClick={() => setAddingExtra(true)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--green)', fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 4
                }}>
                  <Icon name="plus" size={14} /> Add item
                </button>
              </div>
              {extras.length === 0 && !addingExtra && (
                <div style={{ padding: '12px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  Tap "+ Add item" to add anything not on your meal plan
                </div>
              )}
              {extras.map((item, idx) => renderItem(item, planItems.length + lowPantryItems.length + idx))}
              {addingExtra && (
                <div className="card-flat" style={{ marginTop: 8, padding: 12 }}>
                  <div className="form-group">
                    <input
                      value={extraName}
                      onChange={e => setExtraName(e.target.value)}
                      placeholder="Item name"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && addExtra()}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                    <input
                      value={extraStore}
                      onChange={e => setExtraStore(e.target.value)}
                      placeholder="Store (optional)"
                    />
                    <select value={extraStore} onChange={e => setExtraStore(e.target.value)}>
                      <option value="">Pick store</option>
                      {(prefs?.stores || []).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
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
                <div style={{ fontSize: 13 }}>Add meals to your weekly plan and they'll appear here automatically.</div>
              </div>
            )}
          </div>
        )}

        {/* BY STORE VIEW */}
        {view === 'by-store' && (
          <div>
            {/* Store tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {storesWithItems.map(s => {
                const color = getStoreColor(s);
                const isActive = activeStore === s;
                return (
                  <button key={s} onClick={() => setActiveStore(s)} style={{
                    padding: '7px 14px', borderRadius: 20, border: '1.5px solid',
                    borderColor: isActive ? color.label : color.border,
                    background: isActive ? color.bg : 'var(--bg-white)',
                    color: isActive ? color.label : 'var(--text-secondary)',
                    fontSize: 13, fontWeight: isActive ? 700 : 400, cursor: 'pointer'
                  }}>
                    {s} ({byStore[s]?.length || 0})
                  </button>
                );
              })}
            </div>

            {/* Items for active store */}
            {activeStore && byStore[activeStore] && (
              <div>
                <div style={{
                  padding: '10px 14px', borderRadius: 10, marginBottom: 12,
                  background: getStoreColor(activeStore).bg,
                  border: '0.5px solid ' + getStoreColor(activeStore).border
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: getStoreColor(activeStore).label }}>
                    {activeStore}
                  </div>
                  <div style={{ fontSize: 12, color: getStoreColor(activeStore).label, opacity: 0.8, marginTop: 2 }}>
                    {byStore[activeStore].filter((_, i) => checked[byStore[activeStore][i]?.source + '|' + i + '|' + byStore[activeStore][i]?.name]).length} of {byStore[activeStore].length} items checked
                  </div>
                </div>
                {byStore[activeStore].map((item, idx) => renderItem(item, item.idx !== undefined ? item.idx : idx))}
              </div>
            )}

            {storesWithItems.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                No items yet — add meals to your weekly plan first.
              </div>
            )}
          </div>
        )}

        {/* Clear all checks */}
        {checkedCount > 0 && (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <button onClick={() => setChecked({})} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 13
            }}>
              Clear all checkmarks
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
