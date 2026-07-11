import React, { useState } from 'react';
import { Icon, Button, Banner, SectionLabel, EmptyState } from '../components/UI';
import { PANTRY_CATEGORIES } from '../data/meals';

const daysOld = (t) => Math.floor((Date.now() - t) / 86400000);

export default function PantryScreen({ store }) {
  const { pantry, addPantryItem, removePantryItem, restockPantryItem, meals } = store;

  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [category, setCategory] = useState('Pantry Staples');
  const [fresh, setFresh] = useState(false);
  const [restockId, setRestockId] = useState(null);
  const [restockQty, setRestockQty] = useState('');

  const handleAdd = () => {
    if (!name.trim()) return;
    addPantryItem({ name: name.trim(), qty: qty.trim(), category, fresh });
    setName(''); setQty('');
  };

  const freshUrgent = pantry.filter(p => p.fresh).map(p => ({ ...p, age: daysOld(p.addedAt) })).filter(p => p.age >= 2);
  const shelfOld = pantry.filter(p => !p.fresh).map(p => ({ ...p, age: daysOld(p.addedAt) })).filter(p => p.age >= 18);

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
      <div className="screen-header">
        <span className="screen-title">Pantry</span>
        <span className="text-sm text-muted">{pantry.length} items</span>
      </div>
      <div className="screen-padded">
        {/* Add form */}
        <div className="card mb-12">
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
          <div className="flex gap-8 items-center mb-12">
            <button onClick={() => setFresh(!fresh)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-secondary)', padding: 0 }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, border: fresh ? 'none' : '1.5px solid var(--border)', background: fresh ? 'var(--green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {fresh && <Icon name="check" size={12} style={{ color: '#fff' }} />}
              </div>
              Fresh item (track freshness)
            </button>
          </div>
          <Button variant="primary" onClick={handleAdd}>
            <Icon name="plus" size={16} /> Add to pantry
          </Button>
        </div>

        {/* Can make now */}
        {canMakeNow.length > 0 && (
          <Banner type="success" icon="chef-hat">
            <strong>You can make:</strong> {canMakeNow.map(m => m.name).join(', ')}
          </Banner>
        )}

        {/* Freshness alerts */}
        {freshUrgent.length > 0 && (
          <Banner type="warning" icon="leaf">
            <strong>Use soon:</strong> {freshUrgent.map(p => `${p.name} (${p.age}d old)`).join(', ')}
          </Banner>
        )}

        {/* Shelf check-in */}
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

        {/* Empty state */}
        {pantry.length === 0 && (
          <EmptyState icon="fridge" title="Your pantry is empty" body="Add what you have on hand and we'll suggest meals you can make right now." />
        )}

        {/* Grouped pantry items */}
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="mb-16">
            <SectionLabel>{cat}</SectionLabel>
            {items.map(item => {
              const age = daysOld(item.addedAt);
              const isRestocking = restockId === item.id;
              return (
                <div key={item.id} className="pantry-item">
                  <div className="pantry-item-row">
                    <div style={{ flex: 1 }}>
                      <div className="flex items-center gap-8">
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{item.name}</span>
                        {item.qty && <span className="text-xs text-muted">({item.qty})</span>}
                        <span className={`freshness-badge ${item.fresh ? (age >= 2 ? 'stale' : '') : 'shelf'}`}>
                          {item.fresh ? `fresh · ${age}d` : 'shelf-stable'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-8 items-center">
                      {item.fresh && (
                        <Button variant="ghost" size="sm" onClick={() => { setRestockId(isRestocking ? null : item.id); setRestockQty(item.qty || ''); }}>
                          {isRestocking ? 'Cancel' : 'Restock'}
                        </Button>
                      )}
                      <button onClick={() => removePantryItem(item.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </div>
                  {isRestocking && (
                    <div className="flex gap-8 items-center" style={{ padding: '8px 12px', background: 'var(--surface)', borderTop: '0.5px solid var(--border)' }}>
                      <span className="text-sm text-secondary">New qty:</span>
                      <input value={restockQty} onChange={e => setRestockQty(e.target.value)} placeholder="e.g. 2 cartons" style={{ flex: 1, height: 32, fontSize: 13 }} />
                      <Button variant="ghost" size="sm" onClick={() => { restockPantryItem(item.id, restockQty); setRestockId(null); }}>
                        <Icon name="refresh" size={14} /> Reset clock
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
