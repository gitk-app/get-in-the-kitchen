// GET IN THE KITCHEN — PlanScreen v2.1
import React, { useState, useCallback } from 'react';
import { Icon, Sheet, Button, Banner, BudgetBar, Pill, SectionLabel, EmptyState, StepNumber } from '../components/UI';
import { DAYS, PLAN_SLOTS, PROTEIN_OPTIONS } from '../data/meals';

const getMostRecentSunday = () => {
  const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d;
};
const getWeekStart = (w) => {
  const d = getMostRecentSunday(); d.setDate(d.getDate() + w * 7); return d;
};
const formatRange = (w) => {
  const s = getWeekStart(w), e = new Date(s); e.setDate(s.getDate() + 6);
  const o = { month: 'short', day: 'numeric', year: 'numeric' };
  return s.toLocaleDateString('en-US', o) + ' – ' + e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
const daysOld = (t) => Math.floor((Date.now() - t) / 86400000);

export default function PlanScreen({ store }) {
  const { meals, currentPlan, activeWeek, setActiveWeek, setMealInPlan, setBulkPlan, clearWeek,
    planTotal, monthlyTotal, budget, pantry, apiFetch, addMeal, updateMeal, prefs } = store;

  const [picker, setPicker] = useState(null);
  const [browseAll, setBrowseAll] = useState(false);
  const [manualEntry, setManualEntry] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [recipeView, setRecipeView] = useState(null);
  const [wizard, setWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardProteins, setWizardProteins] = useState(() => prefs?.proteins || []);
  const [wizardLeftovers, setWizardLeftovers] = useState('1-2');
  const [wizardBusyNights, setWizardBusyNights] = useState('Tuesday, Wednesday, Thursday, Friday');
  const [wizardLocked, setWizardLocked] = useState('');
  const [building, setBuilding] = useState(false);
  const [aiPicks, setAiPicks] = useState({});
  const [confirmClear, setConfirmClear] = useState(false);

  const total = planTotal();
  const mTotal = monthlyTotal();
  const mBudget = budget * 4;
  const wkStart = getWeekStart(activeWeek);

  const freshUrgent = pantry.filter(p => p.fresh).map(p => ({ ...p, age: daysOld(p.addedAt) })).filter(p => p.age >= 2);
  const canMakeNow = meals.filter(m => {
    if (!m.items?.length) return false;
    const pNames = pantry.map(p => p.name.toLowerCase());
    const matches = m.items.filter(it => pNames.some(pn => pn.includes(it.n.toLowerCase().split(' ')[0])));
    return matches.length >= Math.ceil(m.items.length / 2);
  }).slice(0, 3);

  const openPicker = (day, slot) => {
    if (picker?.day === day && picker?.slot === slot) { setPicker(null); return; }
    setPicker({ day, slot });
    setBrowseAll(false);
    const key = day + '|' + slot;
    if (!aiPicks[key]) loadAiPicks(day, slot);
  };

  const loadAiPicks = async (day, slot) => {
    const key = day + '|' + slot;
    setAiPicks(p => ({ ...p, [key]: 'loading' }));
    const pList = pantry.map(p => p.qty ? p.name + ' (' + p.qty + ')' : p.name);
    const existing = meals.map(m => m.name).join('; ');
    const prompt = `Suggest 3 budget-friendly ${slot} meal ideas. ${pList.length ? 'Pantry: ' + pList.join(', ') + '.' : ''} Simple, family-friendly. Skip these: ${existing}. JSON only: [{"name":"","cost":0,"protein":"none"}]`;
    try {
      const text = await apiFetch(prompt, 300);
      const parsed = JSON.parse(text);
      setAiPicks(p => ({ ...p, [key]: parsed.map((x, i) => ({ ...x, id: 'aip-' + Date.now() + i })) }));
    } catch { setAiPicks(p => ({ ...p, [key]: [] })); }
  };

  const applyAiPick = (day, slot, pick) => {
    const newId = 'm' + Date.now() + '-pick-' + Math.random().toString(36).slice(2, 6);
    const newMeal = { id: newId, name: pick.name, slot, cost: pick.cost || 0, protein: pick.protein || 'none', items: [], steps: [], prepTime: 20, favorite: false };
    // Add meal and assign to plan in one synchronous sequence
    store.setMeals(prev => [...prev, newMeal]);
    setMealInPlan(day, slot, newId);
    setPicker(null);
    generateSteps(newId, pick.name, slot);
  };

  const generateSteps = async (id, name, slot) => {
    const prompt = `Simple home-cook recipe for "${name}" (${slot}). Practical, budget-friendly. JSON only: {"prepTime":20,"steps":["step 1","step 2","step 3"]}`;
    try {
      const text = await apiFetch(prompt, 400);
      const recipe = JSON.parse(text);
      updateMeal(id, { steps: recipe.steps || [], prepTime: recipe.prepTime || 20 });
    } catch {}
  };

  const buildWeek = async () => {
    setBuilding(true);
    const pList = pantry.map(p => p.qty ? p.name + ' (' + p.qty + ')' : p.name);
    const currentMeals = store.mealsRef.current;
    const myMeals = currentMeals.map(m => `${m.name} (${m.slot}, $${m.cost.toFixed(2)})`).join('; ');
    const proteins = wizardProteins.length ? wizardProteins.join(', ') : 'any';
    const weekType = prefs?.weekType || 'normal';
    const busyNights = wizardBusyNights;

    const prompt = `Build a realistic 7-day meal plan (Sunday-Saturday) for a working single mom. Budget $${budget}/week.

CRITICAL RULES — follow these strictly:
- ALL meals must be simple, practical, everyday home cooking. NO gourmet, restaurant-style, or chef-level meals.
- Breakfast: quick options only — eggs, oatmeal, yogurt, toast, cereal, smoothies. Max 15 minutes.
- Lunch: simple leftovers, sandwiches, wraps, salads, or soup. Max 10 minutes to assemble.
- Dinner on BUSY nights (${busyNights}): MUST be 20 minutes or less, OR slow cooker set in morning, OR planned leftovers from previous night. No complex cooking on busy nights.
- Dinner on other nights: still keep it simple — one-pan meals, casseroles, basic proteins with sides. Max 30-40 minutes.
- Week type is "${weekType}" — ${weekType === 'busy' || weekType === 'chaotic' ? 'make almost everything quick and simple, prioritize leftovers and slow cooker meals' : weekType === 'relaxed' ? 'can include slightly more involved meals on weekends' : 'balance quick weeknight meals with slightly more effort on weekends'}.
- Proteins to rotate: ${proteins}. Never the same protein at dinner more than 2 nights in a row.
- Leftovers strategy: ${wizardLeftovers} nights where dinner leftovers cover next day lunch.
- ${wizardLocked ? 'Already locked in: ' + wizardLocked + '.' : ''}
- ${pList.length ? 'Use what I have on hand: ' + pList.join(', ') + '.' : ''}
- Strongly prefer meals from my saved library: ${myMeals || 'none saved yet'}.
- For new meals, keep names simple and descriptive — "Baked chicken thighs with rice" not "Herb-crusted pan-seared chicken".

Set isNew:true for meals NOT in my saved library.
JSON only, no preamble: {"Sunday":{"Breakfast":{"name":"","isNew":false},"Lunch":{"name":"","isNew":false},"Dinner":{"name":"","isNew":false}},"Monday":{"Breakfast":{"name":"","isNew":false},"Lunch":{"name":"","isNew":false},"Dinner":{"name":"","isNew":false}},"Tuesday":{"Breakfast":{"name":"","isNew":false},"Lunch":{"name":"","isNew":false},"Dinner":{"name":"","isNew":false}},"Wednesday":{"Breakfast":{"name":"","isNew":false},"Lunch":{"name":"","isNew":false},"Dinner":{"name":"","isNew":false}},"Thursday":{"Breakfast":{"name":"","isNew":false},"Lunch":{"name":"","isNew":false},"Dinner":{"name":"","isNew":false}},"Friday":{"Breakfast":{"name":"","isNew":false},"Lunch":{"name":"","isNew":false},"Dinner":{"name":"","isNew":false}},"Saturday":{"Breakfast":{"name":"","isNew":false},"Lunch":{"name":"","isNew":false},"Dinner":{"name":"","isNew":false}}}`;
    try {
      const text = await apiFetch(prompt, 1400);
      const weekPlan = JSON.parse(text);

      // Build all new meals first, collect them
      const newMealRecords = [];
      const newPlan = {};

      DAYS.forEach(day => {
        newPlan[day] = {};
        PLAN_SLOTS.forEach(slot => {
          const entry = weekPlan[day]?.[slot];
          const name = typeof entry === 'string' ? entry : entry?.name || '';
          if (!name) return;
          // Check library using ref (always fresh)
          const lib = store.mealsRef.current;
          let match = lib.find(m => m.name.toLowerCase() === name.toLowerCase() && m.slot === slot);
          if (!match) match = lib.find(m => m.name.toLowerCase().includes(name.toLowerCase().split(' ')[0]) && m.slot === slot);
          if (match) {
            newPlan[day][slot] = match.id;
          } else {
            const newId = 'm' + Date.now() + '-' + day + '-' + slot + '-' + Math.random().toString(36).slice(2, 6);
            const nm = { id: newId, name, slot, cost: 0, protein: 'none', items: [], steps: [], prepTime: 20, favorite: false };
            newMealRecords.push(nm);
            newPlan[day][slot] = newId;
          }
        });
      });

      // Add ALL new meals to library at once, then set the plan at once
      if (newMealRecords.length > 0) {
        store.setMeals(prev => [...prev, ...newMealRecords]);
      }
      store.setBulkPlan(newPlan);

      setWizard(false);
      setBuilding(false);

      // Generate steps in background for new meals
      newMealRecords.forEach(m => generateSteps(m.id, m.name, m.slot));
    } catch (e) {
      setBuilding(false);
      alert('Could not build the week. Check your API key and try again.');
    }
  };

  const toggleProtein = (p) => setWizardProteins(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const recipe = recipeView ? meals.find(m => m.id === recipeView) : null;
  const pickerMeal = picker ? meals.find(m => m.id === (currentPlan[picker.day]?.[picker.slot])) : null;
  const pickerSlotMeals = picker ? meals.filter(m => m.slot === picker.slot) : [];
  const pickerFavs = pickerSlotMeals.filter(m => m.favorite).slice(0, 4);
  const pickerAiPicks = picker ? (aiPicks[picker.day + '|' + picker.slot] || null) : null;

  return (
    <div className="screen">
      {/* Week selector */}
      <div style={{ padding: '12px 16px 0', display: 'flex', gap: 6 }}>
        {[0, 1, 2, 3].map(w => (
          <button key={w} onClick={() => setActiveWeek(w)}
            style={{ flex: 1, padding: '8px 4px', borderRadius: 10, fontSize: 11, fontWeight: activeWeek === w ? 700 : 400, border: activeWeek === w ? '2px solid var(--green)' : '0.5px solid var(--border)', background: activeWeek === w ? 'var(--green-light)' : 'var(--bg-white)', color: activeWeek === w ? 'var(--green)' : 'var(--text-secondary)', cursor: 'pointer', lineHeight: 1.4 }}>
            Wk {w + 1}<br /><span style={{ fontWeight: 400, fontSize: 9 }}>{formatRange(w)}</span>
          </button>
        ))}
      </div>

      <div className="screen-padded">
        {/* Monthly summary */}
        <div className="card-flat flex justify-between items-center mb-12" style={{ marginTop: 12 }}>
          <span className="text-sm text-secondary">4-week estimate</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: mTotal > mBudget ? 'var(--danger)' : 'var(--text)' }}>
            ${mTotal.toFixed(2)} <span className="text-xs text-muted" style={{ fontWeight: 400 }}>of ${mBudget.toFixed(2)}</span>
          </span>
        </div>

        {/* Banners */}
        {freshUrgent.length > 0 && (
          <Banner type="warning" icon="leaf">
            Use soon: {freshUrgent.map(p => p.name + ' (' + p.age + 'd)').join(', ')}
          </Banner>
        )}
        {canMakeNow.length > 0 && (
          <Banner type="success" icon="chef-hat">
            You can make: {canMakeNow.map(m => m.name).join(', ')}
          </Banner>
        )}

        {/* Budget */}
        <div className="card mb-12">
          <BudgetBar spent={total} budget={budget} />
        </div>

        {/* Controls */}
        <div className="flex gap-8 mb-12">
          <Button variant="primary" onClick={() => { setWizard(true); setWizardStep(0); }} style={{ flex: 1 }}>
            <Icon name="sparkles" size={16} /> Build my week
          </Button>
          {confirmClear ? (
            <div className="flex gap-8 items-center">
              <Button variant="danger" size="sm" onClick={() => { clearWeek(activeWeek); setConfirmClear(false); }}>Clear</Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>Cancel</Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
              <Icon name="trash" size={14} />
            </Button>
          )}
        </div>

        {/* Welcome banner — shown when week is empty */}
        {Object.keys(currentPlan).length === 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
            border: '1px solid #86efac', borderRadius: 16,
            padding: '24px 20px', marginBottom: 20, textAlign: 'center'
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👋</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#166534', marginBottom: 6 }}>
              Welcome to GET IN THE KITCHEN
            </div>
            <div style={{ fontSize: 13, color: '#166534', opacity: 0.85, lineHeight: 1.6, marginBottom: 16 }}>
              Your week is empty and ready to plan. Tap <strong>Build my week</strong> above and Claude will fill it in based on your budget and preferences — takes about 30 seconds.
            </div>
            <div style={{ fontSize: 12, color: '#166534', opacity: 0.7 }}>
              Or tap any <strong>+</strong> cell below to add meals one at a time.
            </div>
          </div>
        )}

        {/* Week grid */}
        <table className="week-grid">
          <thead>
            <tr>
              <th style={{ width: 44, textAlign: 'left' }}></th>
              {PLAN_SLOTS.map(s => <th key={s}>{s}</th>)}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day, di) => {
              const dt = new Date(wkStart); dt.setDate(wkStart.getDate() + di);
              const dl = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return (
                <tr key={day}>
                  <td style={{ padding: '8px 6px 8px 0', verticalAlign: 'top' }}>
                    <div className="day-label">{day.slice(0, 3)}</div>
                    <div className="day-date">{dl}</div>
                  </td>
                  {PLAN_SLOTS.map(slot => {
                    const mealId = currentPlan[day]?.[slot];
                    const meal = meals.find(m => m.id === mealId);
                    return (
                      <td key={slot}>
                        {meal ? (
                          <div className="meal-cell-filled">
                            <div className="meal-cell-name" onClick={() => setRecipeView(meal.id)}>{meal.name}</div>
                            <div className="meal-cell-meta">
                              <span>${meal.cost.toFixed(2)}{meal.prepTime ? ' · ' + meal.prepTime + 'm' : ''}</span>
                              <span className="meal-cell-change" onClick={() => openPicker(day, slot)}>swap</span>
                            </div>
                          </div>
                        ) : (
                          <div className="meal-cell-empty" onClick={() => openPicker(day, slot)}>+</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Meal picker sheet */}
      {picker && (
        <Sheet onClose={() => setPicker(null)} title={picker.slot} subtitle={picker.day}>
          <div style={{ padding: '12px 16px' }}>
            {pickerMeal && (
              <div className="card-flat flex justify-between items-center mb-12">
                <div>
                  <div className="text-xs text-muted mb-4">Currently planned</div>
                  <div className="font-bold text-sm">{pickerMeal.name}</div>
                </div>
                <Button variant="ghost" size="sm" style={{ color: 'var(--danger)', fontSize: 12 }}
                  onClick={() => { setMealInPlan(picker.day, picker.slot, ''); setPicker(null); }}>
                  Clear
                </Button>
              </div>
            )}

            {/* Manual entry */}
            <div style={{ marginBottom: 14 }}>
              {!showManualEntry ? (
                <button onClick={() => setShowManualEntry(true)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px dashed var(--border)', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="pencil" size={14} /> Type a meal name manually…
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={manualEntry}
                    onChange={e => setManualEntry(e.target.value)}
                    placeholder="e.g. Leftovers, Cereal, Frozen pizza"
                    autoFocus
                    style={{ flex: 1, height: 40, fontSize: 14 }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && manualEntry.trim()) {
                        const newId = 'm' + Date.now() + '-manual';
                        const nm = { id: newId, name: manualEntry.trim(), slot: picker.slot, cost: 0, protein: 'none', items: [], steps: [], prepTime: 0, favorite: false };
                        store.setMeals(prev => [...prev, nm]);
                        setMealInPlan(picker.day, picker.slot, newId);
                        setManualEntry(''); setShowManualEntry(false); setPicker(null);
                      }
                    }}
                  />
                  <button onClick={() => {
                    if (!manualEntry.trim()) { setShowManualEntry(false); return; }
                    const newId = 'm' + Date.now() + '-manual';
                    const nm = { id: newId, name: manualEntry.trim(), slot: picker.slot, cost: 0, protein: 'none', items: [], steps: [], prepTime: 0, favorite: false };
                    store.setMeals(prev => [...prev, nm]);
                    setMealInPlan(picker.day, picker.slot, newId);
                    setManualEntry(''); setShowManualEntry(false); setPicker(null);
                  }} style={{ background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 8, padding: '0 14px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                    Add
                  </button>
                  <button onClick={() => { setShowManualEntry(false); setManualEntry(''); }}
                    style={{ background: 'var(--surface)', border: 'none', borderRadius: 8, padding: '0 10px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                </div>
              )}
            </div>
            {pickerFavs.length > 0 && (
              <>
                <SectionLabel>⭐ Favorites</SectionLabel>
                <div className="pill-group mb-12">
                  {pickerFavs.map(m => (
                    <Pill key={m.id} selected={pickerMeal?.id === m.id}
                      onClick={() => { setMealInPlan(picker.day, picker.slot, m.id); setPicker(null); }}>
                      {m.name} · ${m.cost.toFixed(2)}
                    </Pill>
                  ))}
                </div>
              </>
            )}
            <SectionLabel><Icon name="sparkles" size={12} /> Smart picks</SectionLabel>
            {!pickerAiPicks || pickerAiPicks === 'loading' ? (
              <p className="text-sm text-muted mb-12">Finding ideas…</p>
            ) : pickerAiPicks.length === 0 ? (
              <p className="text-sm text-muted mb-12">No suggestions. <button onClick={() => loadAiPicks(picker.day, picker.slot)} style={{ color: 'var(--green)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>Try again</button></p>
            ) : (
              <div className="pill-group mb-12">
                {pickerAiPicks.map(p => (
                  <Pill key={p.id} onClick={() => applyAiPick(picker.day, picker.slot, p)}>
                    {p.name} · ~${(p.cost || 0).toFixed(2)}
                  </Pill>
                ))}
              </div>
            )}
            <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 12 }}>
              {!browseAll ? (
                <button onClick={() => setBrowseAll(true)}
                  style={{ width: '100%', padding: '12px', borderRadius: 10, border: '0.5px solid var(--border)', background: 'var(--bg-white)', fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Browse all {pickerSlotMeals.length} {picker.slot.toLowerCase()} meals →
                </button>
              ) : (
                <div>
                  <button onClick={() => setBrowseAll(false)} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8 }}>▲ Collapse</button>
                  {pickerSlotMeals.map(m => (
                    <div key={m.id} onClick={() => { setMealInPlan(picker.day, picker.slot, m.id); setPicker(null); }}
                      style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: pickerMeal?.id === m.id ? 'var(--green-light)' : 'transparent', marginBottom: 2 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: pickerMeal?.id === m.id ? 700 : 400 }}>{m.favorite ? '⭐ ' : ''}{m.name}</div>
                        {m.items?.length > 0 && <div className="text-xs text-muted mt-4">{m.items.slice(0, 3).map(it => it.n).join(', ')}</div>}
                      </div>
                      <span className="text-xs text-muted">${m.cost.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Sheet>
      )}

      {/* Recipe sheet */}
      {recipe && (
        <Sheet onClose={() => setRecipeView(null)} title={recipe.name}>
          <div style={{ padding: '12px 16px' }}>
            <div className="flex gap-12 mb-12 flex-wrap">
              {recipe.prepTime > 0 && <span className="text-sm text-muted"><Icon name="clock" size={14} /> {recipe.prepTime} min</span>}
              {recipe.cost > 0 && <span className="text-sm text-muted"><Icon name="coin" size={14} /> ~${recipe.cost.toFixed(2)}</span>}
              {recipe.protein && recipe.protein !== 'none' && <span className="text-sm text-muted" style={{ textTransform: 'capitalize' }}><Icon name="meat" size={14} /> {recipe.protein}</span>}
            </div>
            {recipe.items?.length > 0 && (
              <>
                <SectionLabel>Ingredients</SectionLabel>
                {recipe.items.map((it, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '0.5px solid var(--border)', fontSize: 14 }}>
                    <span>{it.n}</span>
                    <span className="text-sm text-muted">{it.s}</span>
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
              <div className="card-flat" style={{ textAlign: 'center' }}>
                <p className="text-sm text-muted mb-8">No recipe steps yet.</p>
                <Button variant="ghost" size="sm" onClick={() => generateSteps(recipe.id, recipe.name, recipe.slot)}>
                  <Icon name="sparkles" size={14} /> Generate steps
                </Button>
              </div>
            )}
          </div>
        </Sheet>
      )}

      {/* Build My Week wizard */}
      {wizard && (
        <Sheet onClose={() => setWizard(false)} title="Build my week" subtitle="Answer 3 questions and Claude fills your whole week">
          <div style={{ padding: '12px 16px' }}>
            {building ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🍳</div>
                <h3 style={{ marginBottom: 8 }}>Building your week…</h3>
                <p>Checking your pantry, rotating proteins, staying in budget.</p>
              </div>
            ) : (
              <>
                <div className="mb-16">
                  <h3 style={{ marginBottom: 4 }}>1. What proteins this week?</h3>
                  <p className="text-sm mb-12">Select all that apply.</p>
                  {PROTEIN_OPTIONS.map(group => (
                    <div key={group.group} className="mb-12">
                      <SectionLabel>{group.group}</SectionLabel>
                      <div className="pill-group">
                        {group.items.map(p => (
                          <Pill key={p} selected={wizardProteins.includes(p)} onClick={() => toggleProtein(p)}>{p}</Pill>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="divider" />
                <div className="mb-16">
                  <h3 style={{ marginBottom: 4 }}>2. Which nights are you busy?</h3>
                  <p className="text-sm mb-8">Those dinners will be 20 min or less, slow cooker, or leftovers.</p>
                  <input
                    value={wizardBusyNights}
                    onChange={e => setWizardBusyNights(e.target.value)}
                    placeholder="e.g. Tuesday, Wednesday, Thursday, Friday"
                    style={{ marginBottom: 8 }}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {['Tuesday-Friday', 'Mon-Fri evenings', 'Weeknights', 'None this week'].map(opt => (
                      <div key={opt} onClick={() => setWizardBusyNights(opt)}
                        style={{ padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12, border: '1.5px solid ' + (wizardBusyNights === opt ? 'var(--green)' : 'var(--border)'), background: wizardBusyNights === opt ? 'var(--green-light)' : 'var(--bg-white)', color: wizardBusyNights === opt ? 'var(--green)' : 'var(--text-secondary)', fontWeight: wizardBusyNights === opt ? 700 : 400 }}>
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="divider" />
                <div className="mb-16">
                  <h3 style={{ marginBottom: 4 }}>3. Leftover nights?</h3>
                  <p className="text-sm mb-12">Dinner covers next day's lunch.</p>
                  <div className="pill-group">
                    {[['0', 'None'], ['1-2', '1–2 nights'], ['3+', '3+ nights']].map(([val, label]) => (
                      <Pill key={val} selected={wizardLeftovers === val} onClick={() => setWizardLeftovers(val)}>{label}</Pill>
                    ))}
                  </div>
                </div>
                <div className="divider" />
                <div className="mb-16">
                  <h3 style={{ marginBottom: 4 }}>4. Anything already locked in?</h3>
                  <p className="text-sm mb-8">Optional — e.g. "Tuesday dinner is breakfast for dinner"</p>
                  <textarea value={wizardLocked} onChange={e => setWizardLocked(e.target.value)}
                    placeholder="Leave blank if nothing is set yet…"
                    style={{ height: 72, resize: 'none' }} />
                </div>
                <Button variant="primary" onClick={buildWeek}>
                  <Icon name="sparkles" size={16} /> Build my week
                </Button>
              </>
            )}
          </div>
        </Sheet>
      )}
    </div>
  );
}
