import React, { useState } from 'react';
import { Icon, Button, Sheet, SectionLabel, EmptyState, StepNumber } from '../components/UI';
import { MEAL_SLOTS } from '../data/meals';

export default function LibraryScreen({ store }) {
  const { meals, addMeal, removeMeal, updateMeal, toggleFavorite, apiFetch } = store;
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [recipeView, setRecipeView] = useState(null);
  const [name, setName] = useState('');
  const [slot, setSlot] = useState('Dinner');
  const [cost, setCost] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [steps, setSteps] = useState('');

  const filtered = meals.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()));
  const recipe = recipeView ? meals.find(m => m.id === recipeView) : null;

  const generateSteps = async (id, mealName, mealSlot) => {
    const prompt = `Simple home-cook recipe for "${mealName}" (${mealSlot}). Practical, budget-friendly. JSON only: {"prepTime":20,"steps":["step 1","step 2","step 3"]}`;
    try {
      const text = await apiFetch(prompt, 400);
      const r = JSON.parse(text);
      updateMeal(id, { steps: r.steps || [], prepTime: r.prepTime || 20 });
    } catch {}
  };

  const handleAdd = () => {
    if (!name.trim()) return;
    const items = ingredients ? ingredients.split(',').map(x => ({ n: x.trim(), s: 'Aldi' })).filter(x => x.n) : [];
    const stepList = steps ? steps.split('\n').map(x => x.trim()).filter(Boolean) : [];
    const nm = { name: name.trim(), slot, cost: parseFloat(cost) || 0, protein: 'none', items, steps: stepList, prepTime: 0, favorite: false };
    addMeal(nm);
    if (!stepList.length) {
      const id = 'm' + Date.now();
      generateSteps(id, name.trim(), slot);
    }
    setName(''); setCost(''); setIngredients(''); setSteps(''); setAdding(false);
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
                    <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setRecipeView(m.id)}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{m.name}</div>
                      <div className="flex gap-8 flex-wrap" style={{ marginBottom: 4 }}>
                        {m.cost > 0 && <span className="text-xs text-muted">~${m.cost.toFixed(2)}</span>}
                        {m.prepTime > 0 && <span className="text-xs text-muted">{m.prepTime} min</span>}
                        {m.steps?.length > 0
                          ? <span className="text-xs" style={{ color: 'var(--green)' }}><Icon name="check" size={11} /> {m.steps.length} steps</span>
                          : <span className="text-xs text-muted">No steps yet</span>}
                      </div>
                      {m.items?.length > 0 && <div className="text-xs text-muted">{m.items.slice(0, 3).map(it => it.n).join(', ')}</div>}
                    </div>
                    <div className="flex items-center gap-8">
                      <button onClick={() => toggleFavorite(m.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: m.favorite ? '#eab308' : 'var(--border-strong)' }}>
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

      {/* Recipe view sheet */}
      {recipe && (
        <Sheet onClose={() => setRecipeView(null)} title={recipe.name}>
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
                    <span>{it.n}</span><span className="text-xs text-muted">{it.s}</span>
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
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <p className="text-sm text-muted mb-8">No recipe steps yet.</p>
                <Button variant="ghost" size="sm" onClick={() => generateSteps(recipe.id, recipe.name, recipe.slot)}>
                  <Icon name="sparkles" size={14} /> Generate steps
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
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Chicken taco bowls" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }} className="mb-8">
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
            <div className="form-group">
              <label>Ingredients (comma separated)</label>
              <input value={ingredients} onChange={e => setIngredients(e.target.value)} placeholder="Chicken thighs, rice, broccoli" />
            </div>
            <div className="form-group">
              <label>Recipe steps (one per line — optional)</label>
              <textarea value={steps} onChange={e => setSteps(e.target.value)} placeholder="Leave blank to generate with AI after saving…" style={{ height: 80, resize: 'vertical' }} />
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
