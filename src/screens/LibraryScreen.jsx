import React, { useState } from 'react';
import { Icon, Button, Sheet, SectionLabel, EmptyState, StepNumber } from '../components/UI';
import { MEAL_SLOTS } from '../data/meals';

// Each ingredient is now {n: name, s: store}
// Store is optional — defaults to ''
function IngredientRow({ item, index, onChange, onRemove, stores }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
      <input
        value={item.n}
        onChange={e => onChange(index, 'n', e.target.value)}
        placeholder="Ingredient name"
        style={{ flex: 2, height: 36, fontSize: 13 }}
      />
      <select
        value={item.s || ''}
        onChange={e => onChange(index, 's', e.target.value)}
        style={{ flex: 1, height: 36, fontSize: 13, minWidth: 80 }}
      >
        <option value="">No store</option>
        {stores.map(s => <option key={s} value={s}>{s}</option>)}
        <option value="Pantry">Pantry</option>
        <option value="Other">Other</option>
      </select>
      <button onClick={() => onRemove(index)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, flexShrink: 0 }}>
        <Icon name="x" size={15} />
      </button>
    </div>
  );
}

export default function LibraryScreen({ store }) {
  const { meals, removeMeal, updateMeal, toggleFavorite, apiFetch, setMeals, pantry, prefs } = store;

  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [recipeView, setRecipeView] = useState(null);
  const [generatingFor, setGeneratingFor] = useState(null);
  const [generateError, setGenerateError] = useState('');

  // Add meal form state
  const [name, setName] = useState('');
  const [slot, setSlot] = useState('Dinner');
  const [cost, setCost] = useState('');
  const [ingredientRows, setIngredientRows] = useState([{ n: '', s: '' }]);
  const [steps, setSteps] = useState('');

  // Pantry cross-check result
  const [pantryCheck, setPantryCheck] = useState(null); // {missing: [], inPantry: []}

  const userStores = prefs?.stores || [];
  const filtered = meals.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()));
  const recipe = recipeView ? meals.find(m => m.id === recipeView) : null;

  const generateSteps = async (id, mealName, mealSlot) => {
    setGeneratingFor(id);
    setGenerateError('');
    const prompt = `Simple home-cook recipe for "${mealName}" (${mealSlot}). Practical, budget-friendly. JSON only: {"prepTime":20,"steps":["step 1","step 2","step 3","step 4"]}`;
    try {
      const text = await apiFetch(prompt, 500);
      const r = JSON.parse(text);
      updateMeal(id, { steps: r.steps || [], prepTime: r.prepTime || 20 });
      // If viewing this recipe, trigger a re-render
      if (recipeView === id) setRecipeView(id);
    } catch (e) {
      setGenerateError('Could not generate steps. Check your API key in Settings.');
    }
    setGeneratingFor(null);
  };

  const addIngredientRow = () => setIngredientRows(prev => [...prev, { n: '', s: '' }]);

  const updateIngredientRow = (index, field, value) => {
    setIngredientRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const removeIngredientRow = (index) => {
    setIngredientRows(prev => prev.filter((_, i) => i !== index));
  };

  const checkPantry = (items) => {
    const pantryNames = pantry.map(p => p.name.toLowerCase());
    const missing = items.filter(it => it.n && !pantryNames.some(pn => pn.includes(it.n.toLowerCase().split(' ')[0])));
    const inPantry = items.filter(it => it.n && pantryNames.some(pn => pn.includes(it.n.toLowerCase().split(' ')[0])));
    return { missing, inPantry };
  };

  const handleAdd = () => {
    if (!name.trim()) return;
    const items = ingredientRows.filter(r => r.n.trim()).map(r => ({ n: r.n.trim(), s: r.s || '' }));
    const stepList = steps ? steps.split('\n').map(x => x.trim()).filter(Boolean) : [];
    const newId = 'm' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const nm = { id: newId, name: name.trim(), slot, cost: parseFloat(cost) || 0, protein: 'none', items, steps: stepList, prepTime: 0, favorite: false };
    store.setMeals(prev => [...prev, nm]);

    // Cross-check pantry
    if (items.length > 0) {
      const check = checkPantry(items);
      if (check.missing.length > 0) {
        setPantryCheck({ mealName: name.trim(), ...check });
      }
    }

    if (!stepList.length) generateSteps(newId, name.trim(), slot);
    setName(''); setCost(''); setIngredientRows([{ n: '', s: '' }]); setSteps(''); setAdding(false);
  };

  const addMissingToGrocery = () => {
    // Store missing items in localStorage as pending grocery additions
    const existing = JSON.parse(localStorage.getItem('gitk_grocery_extras') || '[]');
    const toAdd = pantryCheck.missing.map(it => ({
      name: it.n, store: it.s || 'Other', source: 'extra', id: Date.now() + Math.random()
    }));
    localStorage.setItem('gitk_grocery_extras', JSON.stringify([...existing, ...toAdd]));
    setPantryCheck(null);
    alert(`Added ${toAdd.length} item${toAdd.length > 1 ? 's' : ''} to your grocery list.`);
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <span className="screen-title">Meal library</span>
        <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
          <Icon name="plus" size={14} /> Add meal
        </Button>
      </div>
      <div className="screen-padded">
        <div className="mb-12">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search meals…" />
        </div>

        {MEAL_SLOTS.map(s => {
          const items = filtered.filter(m => m.slot === s);
          if (!items.length) return null;
          return (
            <div key={s} className="mb-16">
              <SectionLabel>{s}</SectionLabel>
              {items.map(m => (
                <div key={m.id} className="card mb-8" style={{ padding: '12px 14px' }}>
                  <div className="flex justify-between items-start">
                    <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => { setGenerateError(''); setRecipeView(m.id); }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{m.name}</div>
                      <div className="flex gap-8 flex-wrap" style={{ marginBottom: 4 }}>
                        {m.cost > 0 && <span className="text-xs text-muted">~${m.cost.toFixed(2)}</span>}
                        {m.prepTime > 0 && <span className="text-xs text-muted">{m.prepTime} min</span>}
                        {m.steps?.length > 0
                          ? <span className="text-xs" style={{ color: 'var(--green)' }}><Icon name="check" size={11} /> {m.steps.length} steps</span>
                          : <span className="text-xs text-muted">No steps yet · tap to generate</span>}
                      </div>
                      {m.items?.length > 0 && <div className="text-xs text-muted">{m.items.slice(0, 3).map(it => it.n).join(', ')}</div>}
                    </div>
                    <div className="flex items-center gap-8">
                      <button onClick={() => toggleFavorite(m.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>
                        <Icon name={m.favorite ? 'star-filled' : 'star'} size={18} style={{ color: m.favorite ? '#eab308' : 'var(--text-muted)' }} />
                      </button>
                      <button onClick={() => removeMeal(m.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
        {filtered.length === 0 && <EmptyState icon="book" title="No meals found" body="Try a different search or add a new meal." />}
      </div>

      {/* Pantry cross-check result */}
      {pantryCheck && (
        <>
          <div onClick={() => setPantryCheck(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: 640, background: 'var(--bg-white)',
            borderRadius: '20px 20px 0 0', zIndex: 201, padding: '20px 20px 36px'
          }}>
            <div style={{ width: 40, height: 4, background: 'var(--border-strong)', borderRadius: 2, margin: '0 auto 16px' }} />
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Pantry check — {pantryCheck.mealName}</div>
            {pantryCheck.inPantry.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>✓ You have these</div>
                {pantryCheck.inPantry.map((it, i) => (
                  <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '4px 0' }}>{it.n}</div>
                ))}
              </div>
            )}
            {pantryCheck.missing.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Need to buy</div>
                {pantryCheck.missing.map((it, i) => (
                  <div key={i} style={{ fontSize: 13, color: 'var(--text)', padding: '4px 0', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{it.n}</span>
                    {it.s && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{it.s}</span>}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="primary" onClick={addMissingToGrocery} style={{ flex: 1 }}>
                <Icon name="shopping-cart" size={15} /> Add {pantryCheck.missing.length} to grocery list
              </Button>
              <Button variant="ghost" onClick={() => setPantryCheck(null)} style={{ flex: 1 }}>Skip</Button>
            </div>
          </div>
        </>
      )}

      {/* Recipe view sheet */}
      {recipe && (
        <Sheet onClose={() => { setRecipeView(null); setGenerateError(''); }} title={recipe.name}>
          <div style={{ padding: '12px 16px' }}>
            <div className="flex gap-12 mb-12 flex-wrap">
              {recipe.prepTime > 0 && <span className="text-sm text-muted"><Icon name="clock" size={14} /> {recipe.prepTime} min</span>}
              {recipe.cost > 0 && <span className="text-sm text-muted"><Icon name="coin" size={14} /> ~${recipe.cost.toFixed(2)}</span>}
            </div>
            {recipe.items?.length > 0 && (
              <>
                <SectionLabel>Ingredients</SectionLabel>
                {recipe.items.map((it, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '0.5px solid var(--border)', fontSize: 14 }}>
                    <span>{it.n}</span>
                    <span className="text-xs text-muted">{it.s || ''}</span>
                  </div>
                ))}
                <div style={{ height: 16 }} />
              </>
            )}
            {recipe.steps?.length > 0 ? (
              <>
                <SectionLabel>Instructions</SectionLabel>
                {recipe.steps.map((step, i) => (
                  <div key={i} className="flex gap-12" style={{ marginBottom: 14 }}>
                    <StepNumber n={i + 1} />
                    <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, paddingTop: 2, color: 'var(--text)' }}>{step}</p>
                  </div>
                ))}
                <div style={{ height: 8 }} />
                <Button variant="ghost" size="sm" onClick={() => generateSteps(recipe.id, recipe.name, recipe.slot)}
                  style={{ width: '100%' }}>
                  {generatingFor === recipe.id ? 'Regenerating…' : <><Icon name="refresh" size={14} /> Regenerate steps</>}
                </Button>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p className="text-sm text-muted mb-8">No recipe steps yet.</p>
                {generateError && <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 8 }}>{generateError}</p>}
                <Button variant="primary" size="sm" onClick={() => generateSteps(recipe.id, recipe.name, recipe.slot)}
                  style={{ width: '100%' }} disabled={generatingFor === recipe.id}>
                  {generatingFor === recipe.id
                    ? <><Icon name="loader" size={14} /> Generating…</>
                    : <><Icon name="sparkles" size={14} /> Generate steps</>}
                </Button>
              </div>
            )}
          </div>
        </Sheet>
      )}

      {/* Add meal sheet */}
      {adding && (
        <Sheet onClose={() => setAdding(false)} title="Add a meal">
          <div style={{ padding: '12px 16px' }}>
            <div className="form-group">
              <label>Meal name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Fish tacos" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }} className="mb-12">
              <div>
                <label>Meal slot</label>
                <select value={slot} onChange={e => setSlot(e.target.value)}>
                  {MEAL_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label>Est. cost ($)</label>
                <input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" step="0.50" />
              </div>
            </div>

            {/* Ingredients — one row per ingredient with optional store */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ margin: 0 }}>Ingredients <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(store optional)</span></label>
                <button onClick={addIngredientRow}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green)', fontSize: 12, fontWeight: 600, padding: 0 }}>
                  + Add row
                </button>
              </div>
              {ingredientRows.map((row, i) => (
                <IngredientRow key={i} item={row} index={i}
                  onChange={updateIngredientRow} onRemove={removeIngredientRow}
                  stores={userStores} />
              ))}
            </div>

            <div className="form-group">
              <label>Recipe steps <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(one per line — or leave blank to generate with AI)</span></label>
              <textarea value={steps} onChange={e => setSteps(e.target.value)}
                placeholder="Leave blank to auto-generate after saving…"
                style={{ height: 80, resize: 'vertical' }} />
            </div>
            <Button variant="primary" onClick={handleAdd}>
              <Icon name="plus" size={16} /> Add meal
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
