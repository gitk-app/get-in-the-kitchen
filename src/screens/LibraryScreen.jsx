import React, { useState } from 'react';
import { Icon, Button, Sheet, SectionLabel, EmptyState, StepNumber } from '../components/UI';
import { PLAN_SLOTS } from '../data/meals';
import { Host } from '../components/Host';

// Food rules for recipe prompts, so recipes respect allergies and house rules
function recipeGuard(prefs) {
  const allergies = prefs?.allergies || [];
  const rules = (prefs?.houseRules || []).filter(r => r !== 'We eat everything');
  const goals = prefs?.healthGoals || [];
  const lines = [];
  if (allergies.length) lines.push(`FOOD ALLERGIES (life-safety rule): never include ${allergies.join(', ')} in any form, including sauces, oils, broths, and garnishes.`);
  if (rules.length) lines.push(`HOUSE RULES (strict): ${rules.join(', ')}.`);
  if (goals.length) lines.push(`HEALTH GOALS (lean this way): ${goals.join(', ')}.`);
  return lines.join('\n');
}

// Library sections, in the order of the day
const SECTIONS = [
  { slot: 'Breakfast', icon: 'coffee' },
  { slot: 'Lunch', icon: 'salad' },
  { slot: 'Dinner', icon: 'tools-kitchen-2' },
];

// Each meal of the day gets its own warm color, so sections are easy to tell apart
const THEMES = {
  Breakfast: { bg: '#FFF6E0', border: '#EACB7E', accent: '#C9A84C', text: '#6B5210' },
  Lunch: { bg: '#E6F4EE', border: '#9ED0BC', accent: '#2E8A6B', text: '#0F5040' },
  Dinner: { bg: '#FCEBE2', border: '#E9B299', accent: '#C0623D', text: '#7A3418' },
  Other: { bg: '#F0EBE0', border: '#D8CCB8', accent: '#7A6A52', text: '#4A3F2E' },
};
const themeFor = (slot) => THEMES[slot] || THEMES.Other;

const LIB_STYLES = `
  .gitk-lib-grid { display: block; }
  @media (min-width: 768px) {
    .gitk-lib-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px; }
    .gitk-lib-grid > .gitk-meal-row { margin-bottom: 0; }
  }
  .gitk-meal-row { transition: transform .12s, box-shadow .12s; }
  .gitk-meal-row:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(10, 61, 53, 0.08); }
`;

function normalizeMealName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(w => w && !['a', 'an', 'the', 'with', 'and'].includes(w))
    .map(w => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w))
    .join(' ');
}

// How complete a meal is, so a merge keeps the best copy
const mealScore = (m) => (m.favorite ? 8 : 0) + (m.steps?.length ? 4 : 0) + (m.items?.length ? 2 : 0) + (m.image ? 1 : 0);

function parseJson(text) {
  const clean = String(text || '').replace(/```json|```/g, '').trim();
  try { return JSON.parse(clean); } catch (e) { /* trim extra text */ }
  return JSON.parse(clean.slice(clean.indexOf('{'), clean.lastIndexOf('}') + 1));
}

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
  const { meals, removeMeal, updateMeal, toggleFavorite, apiFetch, setMeals, setPlans, pantry, prefs, hasPhotos, fetchPhoto } = store;
  const fetchMealImage = (mealName) => fetchPhoto(mealName + ' food');

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All'); // All | Breakfast | Lunch | Dinner | Favorites
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
  // The app plans breakfast, lunch, and dinner. Older snack meals stay saved but are not shown.
  const libraryMeals = meals.filter(m => m.slot !== 'Snack');
  const searched = libraryMeals.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()));
  const filtered = searched.filter(m =>
    filter === 'All' ? true : filter === 'Favorites' ? m.favorite : m.slot === filter);
  // Favorites first, then A to Z
  const sortMeals = (list) => [...list].sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite) || a.name.localeCompare(b.name));
  const countFor = (f) => f === 'All' ? searched.length : f === 'Favorites' ? searched.filter(m => m.favorite).length : searched.filter(m => m.slot === f).length;
  const openRecipe = (id) => { setGenerateError(''); setRecipeView(id); };
  const confirmRemove = (m) => {
    if (window.confirm(`Remove "${m.name}" from your library?`)) removeMeal(m.id);
  };
  const otherMeals = filtered.filter(m => !SECTIONS.some(sec => sec.slot === m.slot));

  // Find meals with the same name in the same section
  const duplicateGroups = (() => {
    const groups = {};
    libraryMeals.forEach(m => { const k = m.slot + '|' + normalizeMealName(m.name); (groups[k] = groups[k] || []).push(m); });
    return Object.values(groups).filter(g => g.length > 1);
  })();
  const duplicateCount = duplicateGroups.reduce((n, g) => n + g.length - 1, 0);

  // Keeps the most complete copy of each meal, points the meal plan at it, removes the rest
  const mergeDuplicates = () => {
    const replace = {};
    duplicateGroups.forEach(group => {
      const keeper = [...group].sort((a, b) => mealScore(b) - mealScore(a))[0];
      group.forEach(m => { if (m.id !== keeper.id) replace[m.id] = keeper.id; });
    });
    setPlans(prev => {
      const next = {};
      Object.entries(prev).forEach(([week, days]) => {
        next[week] = {};
        Object.entries(days || {}).forEach(([day, slots]) => {
          next[week][day] = {};
          Object.entries(slots || {}).forEach(([slotName, mealId]) => { next[week][day][slotName] = replace[mealId] || mealId; });
        });
      });
      return next;
    });
    setMeals(prev => prev.filter(m => !replace[m.id]));
  };
  const recipe = recipeView ? meals.find(m => m.id === recipeView) : null;

  const generateSteps = async (id, mealName, mealSlot) => {
    setGeneratingFor(id);
    setGenerateError('');
    const guard = recipeGuard(prefs);
    const people = prefs?.householdSize || '2-3';
    const storeList = [...(prefs?.stores?.length ? prefs.stores : ['Walmart']), 'Pantry'].join('|');
    // A full, beginner-friendly recipe with measurements, matching the Plan screen
    const prompt = `Write a complete home-cook recipe for "${mealName}" (${mealSlot}) for ${people} people. Practical and budget-friendly.
Assume the cook is a beginner:
- List every ingredient with an amount scaled for ${people} people (for example "2 lb", "1 cup", "1 tsp", "3 cloves"). Include basics like oil, salt, and spices.
- Write 6 to 10 clear steps. Include heat levels, oven temperatures, cook times, and how to tell when something is done.
- If the meal uses leftovers, say how much to use and how to reheat safely.
- For each ingredient, pick a store from: ${storeList}. Use "Pantry" for basics like salt, oil, and spices.
- Estimate the total cost in US dollars to make it.${guard ? '\n' + guard : ''}
Respond ONLY with JSON, no other text: {"prepTime":20,"cost":8.5,"items":[{"q":"2 lb","n":"Chicken thighs","s":"store"}],"steps":["step 1","step 2"]}`;
    try {
      const text = await apiFetch(prompt, 2400);
      const r = parseJson(text);
      if (!Array.isArray(r.steps) || !r.steps.length) throw new Error('No steps');
      const updates = { steps: r.steps, prepTime: r.prepTime || 20, recipeVersion: 2 };
      if (Array.isArray(r.items) && r.items.length) {
        updates.items = r.items.filter(it => it && it.n).map(it => ({ q: String(it.q || ''), n: String(it.n), s: String(it.s || '') }));
      }
      if (Number(r.cost) > 0) updates.cost = Math.round(Number(r.cost) * 100) / 100;
      updateMeal(id, updates);
      // If viewing this recipe, trigger a re-render
      if (recipeView === id) setRecipeView(id);
    } catch (e) {
      setGenerateError("Couldn't write the recipe that time. Try again, or check your tester code in Settings.");
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
    const nm = { id: newId, name: name.trim(), slot, cost: parseFloat(cost) || 0, protein: 'none', items, steps: stepList, prepTime: 0, favorite: false, image: null };
    store.setMeals(prev => [...prev, nm]);

    // Find a food photo in the background
    if (hasPhotos) {
      fetchMealImage(name.trim()).then(imageUrl => {
        if (imageUrl) store.setMeals(prev => prev.map(m => m.id === newId ? { ...m, image: imageUrl } : m));
      });
    }

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
      <style>{LIB_STYLES}</style>
      <div className="screen-header">
        <span className="screen-title" style={{ whiteSpace: 'nowrap' }}>Meal library</span>
        <button type="button" onClick={() => setAdding(true)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 16px', borderRadius: 10,
          border: 'none', background: 'var(--teal)', color: '#fff', fontSize: 14, fontWeight: 700,
          fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0,
        }}>
          <Icon name="plus" size={15} style={{ color: 'var(--gold)' }} /> Add meal
        </button>
      </div>
      <div className="screen-padded">
        <div className="mb-12">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search meals..." aria-label="Search meals" />
        </div>

        {duplicateCount > 0 && (
          <div className="banner banner-warning" style={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Icon name="copy" size={15} />
              You have {duplicateCount} duplicate meal{duplicateCount !== 1 ? 's' : ''}. Merge them to tidy up your library. Your meal plan stays the same.
            </span>
            <button type="button" onClick={mergeDuplicates} style={{ background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
              Merge duplicates
            </button>
          </div>
        )}

        {/* Filter tabs */}
        <div role="tablist" aria-label="Filter meals" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 8 }}>
          {['All', 'Breakfast', 'Lunch', 'Dinner', 'Favorites'].map(f => {
            const on = filter === f;
            return (
              <button key={f} role="tab" aria-selected={on} onClick={() => setFilter(f)} style={{
                flexShrink: 0, minHeight: 38, padding: '0 14px', borderRadius: 19, fontFamily: 'inherit', fontSize: 13,
                fontWeight: on ? 700 : 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                border: on ? '1.5px solid var(--teal)' : '1px solid var(--border)',
                background: on ? 'var(--teal)' : 'var(--bg-white)', color: on ? '#fff' : 'var(--text)',
              }}>
                {f === 'Favorites' && <Icon name="star-filled" size={13} style={{ color: on ? 'var(--gold)' : 'var(--gold-dark)' }} />}
                {f}
                <span style={{ fontSize: 11, fontWeight: 700, opacity: on ? 0.85 : 0.6 }}>{countFor(f)}</span>
              </button>
            );
          })}
        </div>

        {filter === 'All' || filter === 'Favorites' ? (
          <>
            {SECTIONS.map(sec => {
              const items = sortMeals(filtered.filter(m => m.slot === sec.slot));
              if (!items.length) return null;
              return (
                <LibrarySection key={sec.slot} title={sec.slot} icon={sec.icon} count={items.length}>
                  {items.map(m => <MealRow key={m.id} meal={m} onOpen={openRecipe} onFavorite={toggleFavorite} onRemove={confirmRemove} />)}
                </LibrarySection>
              );
            })}
            {otherMeals.length > 0 && (
              <LibrarySection title="Other" icon="bowl" count={otherMeals.length}>
                {sortMeals(otherMeals).map(m => <MealRow key={m.id} meal={m} onOpen={openRecipe} onFavorite={toggleFavorite} onRemove={confirmRemove} />)}
              </LibrarySection>
            )}
          </>
        ) : (
          <div className="gitk-lib-grid">
            {sortMeals(filtered).map(m => <MealRow key={m.id} meal={m} onOpen={openRecipe} onFavorite={toggleFavorite} onRemove={confirmRemove} />)}
          </div>
        )}

        {filtered.length === 0 && (filter === 'Favorites' && !search
          ? <div style={{ padding: '16px 0' }}><Host text={`No favorites yet${store.prefs?.userName ? ', ' + String(store.prefs.userName).trim().split(/\s+/)[0] : ''}. Tap the star on any meal your crew loves and I'll keep it right here, and use it more when I plan your week.`} /></div>
          : <EmptyState icon="book" title="No meals found" body="Try a different search or add a new meal." />)}
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
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Pantry check - {pantryCheck.mealName}</div>
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
          {recipe.image && (
            <div style={{ height: 180, overflow: 'hidden', position: 'relative' }}>
              <img src={recipe.image} alt={recipe.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => e.target.style.display = 'none'}
              />
              {hasPhotos && (
                <button onClick={async () => {
                  const url = await fetchMealImage(recipe.name);
                  if (url) updateMeal(recipe.id, { image: url });
                }} style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}>
                  Try another photo
                </button>
              )}
            </div>
          )}
          {!recipe.image && hasPhotos && (
            <div style={{ padding: '10px 16px 0' }}>
              <button onClick={async () => {
                const url = await fetchMealImage(recipe.name);
                if (url) updateMeal(recipe.id, { image: url });
              }} style={{ background: 'var(--teal-light)', color: 'var(--teal)', border: '0.5px solid var(--teal)', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <Icon name="photo" size={13} /> Find a photo
              </button>
            </div>
          )}
          <div style={{ padding: '12px 16px' }}>
            <div className="flex gap-12 mb-12 flex-wrap">
              {recipe.prepTime > 0 && <span className="text-sm text-muted"><Icon name="clock" size={14} /> {recipe.prepTime} min</span>}
              {recipe.cost > 0 && <span className="text-sm text-muted"><Icon name="coin" size={14} /> ~${recipe.cost.toFixed(2)}</span>}
            </div>
            {recipe.items?.length > 0 && (
              <>
                <SectionLabel>Ingredients</SectionLabel>
                {recipe.items.map((it, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '0.5px solid var(--border)', fontSize: 14 }}>
                    <span>{it.q && <strong style={{ color: 'var(--teal)', marginRight: 6 }}>{it.q}</strong>}{it.n}</span>
                    <span className="text-xs text-muted" style={{ flexShrink: 0 }}>{it.s || ''}</span>
                  </div>
                ))}
                <div style={{ height: 16 }} />
              </>
            )}
            {recipe.steps?.length > 0 && recipe.recipeVersion !== 2 && (
              <div style={{ background: 'var(--gold-light)', border: '1px solid var(--gold)', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 10 }}>
                  {generatingFor === recipe.id
                    ? 'Writing the full recipe with measurements. Give me a few seconds...'
                    : 'Want the full recipe? I can add measurements and step-by-step detail.'}
                </div>
                {generateError && <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 8 }}>{generateError}</p>}
                {generatingFor !== recipe.id && (
                  <Button variant="primary" size="sm" onClick={() => generateSteps(recipe.id, recipe.name, recipe.slot)}>
                    <Icon name="sparkles" size={14} /> Get the full recipe
                  </Button>
                )}
              </div>
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
                  {generatingFor === recipe.id ? 'Rewriting...' : <><Icon name="refresh" size={14} /> Rewrite the recipe</>}
                </Button>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p className="text-sm text-muted mb-8">No recipe yet.</p>
                {generateError && <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 8 }}>{generateError}</p>}
                <Button variant="primary" size="sm" onClick={() => generateSteps(recipe.id, recipe.name, recipe.slot)}
                  style={{ width: '100%' }} disabled={generatingFor === recipe.id}>
                  {generatingFor === recipe.id
                    ? <><Icon name="loader" size={14} /> Writing the recipe...</>
                    : <><Icon name="sparkles" size={14} /> Write the recipe</>}
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
                  {PLAN_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label>Est. cost ($)</label>
                <input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" step="0.50" />
              </div>
            </div>

            {/* Ingredients - one row per ingredient with optional store */}
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
              <label>Recipe steps <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(one per line - or leave blank to generate with AI)</span></label>
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

function LibrarySection({ title, icon, count, children }) {
  const t = themeFor(title);
  return (
    <section style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0 10px', borderBottom: `3px solid ${t.accent}`, marginBottom: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: t.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name={icon} size={17} />
        </div>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{title}</h2>
        <span style={{ fontSize: 12, fontWeight: 700, color: t.text, background: t.bg, border: `1px solid ${t.border}`, borderRadius: 12, padding: '2px 10px' }}>
          {count} meal{count !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="gitk-lib-grid">{children}</div>
    </section>
  );
}

// Compact meal row: small photo, name, quick facts, favorite star
function MealRow({ meal, onOpen, onFavorite, onRemove }) {
  const m = meal;
  const t = themeFor(m.slot);
  return (
    <div className="gitk-meal-row" style={{
      padding: 8, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8,
      background: t.bg, border: `1px solid ${t.border}`, borderLeft: `5px solid ${t.accent}`, borderRadius: 14,
    }}>
      <button type="button" onClick={() => onOpen(m.id)} aria-label={`Open ${m.name}`} style={{
        flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none',
        padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: 'inherit',
      }}>
        <div style={{ width: 64, height: 64, borderRadius: 11, overflow: 'hidden', flexShrink: 0, background: '#fff', border: '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {m.image
            ? <img src={m.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
            : <Icon name="tools-kitchen-2" size={22} style={{ color: t.accent }} />}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{m.name}</div>
          <div style={{ fontSize: 12, color: t.text, marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {m.cost > 0 && <span style={{ fontWeight: 800, background: '#fff', borderRadius: 8, padding: '1px 7px' }}>${Number(m.cost).toFixed(2)}</span>}
            {m.prepTime > 0 && <span style={{ whiteSpace: 'nowrap' }}>{m.prepTime} min</span>}
            {m.steps?.length > 0
              ? <span style={{ whiteSpace: 'nowrap' }}>{m.steps.length} steps</span>
              : <span style={{ whiteSpace: 'nowrap', fontStyle: 'italic' }}>No steps yet</span>}
          </div>
        </div>
      </button>
      <button type="button" onClick={() => onFavorite(m.id)} aria-label={m.favorite ? `Remove ${m.name} from favorites` : `Add ${m.name} to favorites`} aria-pressed={!!m.favorite}
        style={{ width: 40, height: 40, flexShrink: 0, background: 'none', border: 'none', borderRadius: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={m.favorite ? 'star-filled' : 'star'} size={19} style={{ color: m.favorite ? '#C9A84C' : t.accent, opacity: m.favorite ? 1 : 0.6 }} />
      </button>
      <button type="button" onClick={() => onRemove(m)} aria-label={`Remove ${m.name}`}
        style={{ width: 34, height: 40, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: t.text, opacity: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="trash" size={15} />
      </button>
    </div>
  );
}
