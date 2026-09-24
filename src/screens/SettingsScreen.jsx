// GET IN THE KITCHEN - SettingsScreen v2.2 (matches onboarding v2)
import React, { useState, useEffect } from 'react';
import { Icon, Button, Divider, Pill } from '../components/UI';
import { STORES } from '../data/meals';

// ---------------------------------------------------------------------------
// These lists match OnboardingScreen.jsx so both screens save the same words
// ---------------------------------------------------------------------------
const ALLERGENS = ['Peanuts', 'Tree nuts', 'Shellfish', 'Fish', 'Eggs', 'Milk or dairy', 'Wheat or gluten', 'Soy', 'Sesame'];
const HOUSE_RULES = ['We eat everything', 'Vegetarian', 'Vegan', 'Seafood, no meat', 'No pork', 'No red meat', 'Halal', 'Kosher'];
const HEALTH_GOALS = ['Low sodium', 'Watching sugar', 'Lower carb', 'Heart healthy'];

const PROTEIN_GROUPS = [
  { group: 'Meat and seafood', items: ['Chicken', 'Ground turkey', 'Beef', 'Pork', 'Fish', 'Shellfish', 'Lamb', 'Sausage'] },
  { group: 'Plant and other', items: ['Eggs', 'Beans', 'Lentils', 'Chickpeas', 'Tofu', 'Greek yogurt', 'Peanut butter'] },
];

const MEAL_TYPES = [
  'Tacos and bowls', 'Pasta', 'Sheet pan dinners', 'Soups and stews', 'Breakfast for dinner',
  'Sandwiches and wraps', 'Rice and grain bowls', 'Slow cooker', 'Grilling', 'Stir fry',
  'Soul food classics', 'Caribbean',
];

const HOUSEHOLD = [
  { value: '1', num: '1', label: 'Just me' },
  { value: '2', num: '2', label: 'Two of us' },
  { value: '3-4', num: '3-4', label: 'The family' },
  { value: '5+', num: '5+', label: 'Full house' },
];

const FREQ_OPTIONS = [
  { value: 'weekly', label: 'Every week', trips: 4, desc: '4 trips a month' },
  { value: 'biweekly', label: 'Every 2 weeks', trips: 2, desc: '2 trips a month' },
  { value: 'monthly', label: 'Once a month', trips: 1, desc: '1 big trip' },
];
const normalizeFreq = (f) => (f === 'twicemonth' ? 'biweekly' : f);

// Same blocking logic as onboarding, so blocked proteins are locked here too
const MEATS = ['Chicken', 'Ground turkey', 'Beef', 'Pork', 'Lamb', 'Sausage'];
const ALLERGY_BLOCKS = {
  'Shellfish': ['Shellfish'], 'Fish': ['Fish'], 'Eggs': ['Eggs'],
  'Milk or dairy': ['Greek yogurt'], 'Peanuts': ['Peanut butter'], 'Soy': ['Tofu'],
};
const RULE_BLOCKS = {
  'Vegetarian': [...MEATS, 'Fish', 'Shellfish'],
  'Vegan': [...MEATS, 'Fish', 'Shellfish', 'Eggs', 'Greek yogurt'],
  'Seafood, no meat': MEATS,
  'No pork': ['Pork'],
  'No red meat': ['Beef', 'Pork', 'Lamb'],
  'Halal': ['Pork'],
  'Kosher': ['Pork', 'Shellfish'],
};

// ---------------------------------------------------------------------------
// One-time cleanup for people who set things up before onboarding v2
// ---------------------------------------------------------------------------
const OLD_RULES = {
  'vegetarian': 'Vegetarian', 'vegan': 'Vegan', 'no-pork': 'No pork', 'no pork': 'No pork',
  'halal': 'Halal', 'kosher': 'Kosher', 'no-beef': 'No beef', 'no-seafood': 'No seafood',
};
const OLD_ALLERGIES = {
  'gluten-free': ['Wheat or gluten'], 'dairy-free': ['Milk or dairy'], 'nut-free': ['Peanuts', 'Tree nuts'],
};
const OLD_MEAL_TYPES = {
  'tacos': 'Tacos and bowls', 'pasta': 'Pasta', 'sheet-pan': 'Sheet pan dinners', 'soups': 'Soups and stews',
  'breakfast-dinner': 'Breakfast for dinner', 'sandwiches': 'Sandwiches and wraps', 'bowls': 'Rice and grain bowls',
  'slow-cooker': 'Slow cooker', 'grilling': 'Grilling', 'stir-fry': 'Stir fry',
};
const OLD_PROTEINS = { 'Turkey': 'Ground turkey', 'Fish/Seafood': 'Fish', 'Black beans': 'Beans' };

const uniq = (list) => {
  const seen = new Set();
  return list.filter(x => { const k = String(x).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
};

// dietary is the older combined list other screens still read
const buildDietary = (houseRules, allergies) => [
  ...houseRules.filter(r => r !== 'We eat everything'),
  ...allergies.map(a => `${a} allergy`),
];

function migratePrefs(p) {
  if (!p) return p;
  let allergies = [...(p.allergies || [])];
  let houseRules = [...(p.houseRules || [])];

  (p.dietary || []).forEach(d => {
    const k = String(d).toLowerCase();
    if (/ allergy$/.test(k)) return; // rebuilt from allergies
    if (k === 'no restrictions' || k === 'we eat everything') return;
    if (OLD_ALLERGIES[k]) { allergies.push(...OLD_ALLERGIES[k]); return; }
    if (OLD_RULES[k]) { houseRules.push(OLD_RULES[k]); return; }
    const match = HOUSE_RULES.find(r => r.toLowerCase() === k);
    houseRules.push(match || d);
  });

  allergies = uniq(allergies);
  houseRules = uniq(houseRules);
  const mealTypes = uniq((p.mealTypes || []).map(t => OLD_MEAL_TYPES[t] || t));
  const proteins = uniq((p.proteins || []).map(x => OLD_PROTEINS[x] || x));
  const shopFreq = normalizeFreq(p.shopFreq || 'biweekly');

  return {
    ...p, allergies, houseRules, healthGoals: p.healthGoals || [],
    dietary: buildDietary(houseRules, allergies), mealTypes, proteins, shopFreq,
    foodRulesVersion: 2,
  };
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------
function EditSheet({ title, onClose, children }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200 }} />
      <div role="dialog" aria-label={title} style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 640, background: 'var(--bg-white)',
        borderRadius: '20px 20px 0 0', zIndex: 201, maxHeight: '85vh',
        display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ width: 40, height: 4, background: 'var(--border-strong)', borderRadius: 2, margin: '12px auto 0', flexShrink: 0 }} />
        <div style={{ padding: '12px 16px 10px', borderBottom: '0.5px solid var(--border)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{title}</span>
          <button onClick={onClose} aria-label="Close" style={{ background: 'var(--surface)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={16} />
          </button>
        </div>
        <div style={{ overflow: 'auto', flex: 1, padding: '16px 16px 36px' }}>{children}</div>
      </div>
    </>
  );
}

function AllergyChip({ label, selected, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 24,
      fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
      border: selected ? '1.5px solid #9B1C1C' : '1.5px solid var(--border)',
      background: selected ? '#FDECEA' : 'var(--bg-white)',
      color: selected ? '#9B1C1C' : 'var(--text)', fontWeight: selected ? 700 : 400,
    }}>
      {selected && <Icon name="alert-triangle" size={14} />}{label}
    </button>
  );
}

function LockedChip({ label, note }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 24,
      fontSize: 13, background: 'var(--surface)', color: '#8A9A94', border: '1.5px dashed var(--border)',
    }}>
      {label} <span style={{ fontSize: 11, fontWeight: 700 }}>({note})</span>
    </span>
  );
}

function RemovableChip({ label, onRemove, allergy = false }) {
  return (
    <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px 7px 14px', borderRadius: 24,
      fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
      background: allergy ? '#FDECEA' : 'var(--teal-light)', color: allergy ? '#9B1C1C' : 'var(--teal)',
      border: `1.5px solid ${allergy ? '#9B1C1C' : 'var(--teal)'}`,
    }}>
      {allergy && <Icon name="alert-triangle" size={14} />}{label} <Icon name="x" size={12} />
    </button>
  );
}

function AddRow({ placeholder, onAdd }) {
  const [val, setVal] = useState('');
  const add = () => { const v = val.trim(); if (!v) return; onAdd(v); setVal(''); };
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input value={val} onChange={e => setVal(e.target.value)} placeholder={placeholder}
        onKeyDown={e => { if (e.key === 'Enter') add(); }} style={{ flex: 1, height: 40, fontSize: 13 }} />
      <button type="button" onClick={add} style={{ background: 'var(--teal)', color: 'var(--gold)', border: 'none', borderRadius: 8, padding: '0 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Add</button>
    </div>
  );
}

function RuleCard({ title, sub, children }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 14, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{sub}</div>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function SettingsScreen({ store }) {
  const { apiKey, setApiKey, prefs, setPrefs, unsplashKey, setUnsplashKey } = store;

  const [showApiKey, setShowApiKey] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [keySaved, setKeySaved] = useState(false);
  const [newUnsplashKey, setNewUnsplashKey] = useState('');
  const [unsplashSaved, setUnsplashSaved] = useState(false);
  const [newStore, setNewStore] = useState('');
  const [editSheet, setEditSheet] = useState(null); // household | foodrules | stores | budget | proteins | mealtypes

  // Bring older saved settings into the new format, once
  useEffect(() => {
    if (prefs && prefs.foodRulesVersion !== 2) setPrefs(p => migratePrefs(p));
  }, [prefs, setPrefs]);

  const monthlyBudget = prefs?.monthlyBudget || 450;
  const shopFreq = normalizeFreq(prefs?.shopFreq || 'biweekly');
  const trips = FREQ_OPTIONS.find(f => f.value === shopFreq)?.trips || 2;
  const perTrip = Math.round(monthlyBudget / trips);

  const allergies = prefs?.allergies || [];
  const houseRules = prefs?.houseRules || [];
  const healthGoals = prefs?.healthGoals || [];

  const saveKey = () => {
    if (!newKey.trim().startsWith('sk-ant-')) { alert("That doesn't look like a beta key. It should start with sk-ant-"); return; }
    setApiKey(newKey.trim()); setKeySaved(true); setNewKey('');
    setTimeout(() => setKeySaved(false), 2000);
  };

  // ----- Food rules (always keeps dietary in sync for other screens) -----
  const setFoodRules = (next) => setPrefs(p => {
    const a = next.allergies ?? p.allergies ?? [];
    const r = next.houseRules ?? p.houseRules ?? [];
    const g = next.healthGoals ?? p.healthGoals ?? [];
    return { ...p, allergies: a, houseRules: r, healthGoals: g, dietary: buildDietary(r, a), foodRulesVersion: 2 };
  });
  const toggleAllergy = (a) => setFoodRules({ allergies: allergies.includes(a) ? allergies.filter(x => x !== a) : [...allergies, a] });
  const addAllergy = (v) => setFoodRules({ allergies: uniq([...allergies, v]) });
  const toggleRule = (r) => {
    if (r === 'We eat everything') { setFoodRules({ houseRules: houseRules.includes(r) ? [] : [r] }); return; }
    const clean = houseRules.filter(x => x !== 'We eat everything');
    setFoodRules({ houseRules: clean.includes(r) ? clean.filter(x => x !== r) : [...clean, r] });
  };
  const addRule = (v) => setFoodRules({ houseRules: uniq([...houseRules.filter(x => x !== 'We eat everything'), v]) });
  const toggleGoal = (g) => setFoodRules({ healthGoals: healthGoals.includes(g) ? healthGoals.filter(x => x !== g) : [...healthGoals, g] });
  const addGoal = (v) => setFoodRules({ healthGoals: uniq([...healthGoals, v]) });

  // ----- Proteins -----
  const blockedBy = (protein) => {
    for (const a of allergies) {
      if ((ALLERGY_BLOCKS[a] || []).includes(protein)) return 'allergy';
      if (!ALLERGENS.includes(a) && protein.toLowerCase().includes(a.toLowerCase())) return 'allergy';
    }
    for (const r of houseRules) {
      if ((RULE_BLOCKS[r] || []).includes(protein)) return 'house rule';
    }
    return null;
  };
  const toggleProtein = (p) => setPrefs(prev => ({ ...prev, proteins: prev.proteins?.includes(p) ? prev.proteins.filter(x => x !== p) : [...(prev.proteins || []), p] }));
  const addProtein = (v) => setPrefs(prev => ({ ...prev, proteins: uniq([...(prev.proteins || []), v]) }));

  // ----- Meal types -----
  const toggleMealType = (t) => setPrefs(prev => ({ ...prev, mealTypes: prev.mealTypes?.includes(t) ? prev.mealTypes.filter(x => x !== t) : [...(prev.mealTypes || []), t] }));
  const addMealType = (v) => setPrefs(prev => ({ ...prev, mealTypes: uniq([...(prev.mealTypes || []), v]) }));

  // ----- Stores -----
  const toggleStore = (s) => setPrefs(p => ({ ...p, stores: (p.stores || []).includes(s) ? p.stores.filter(x => x !== s) : [...(p.stores || []), s] }));
  const addCustomStore = () => {
    if (!newStore.trim()) return;
    const name = newStore.trim();
    setPrefs(p => ({ ...p, stores: (p.stores || []).includes(name) ? p.stores : [...(p.stores || []), name], customStores: uniq([...(p.customStores || []), name]) }));
    setNewStore('');
  };
  const removeCustomStore = (name) => setPrefs(p => ({ ...p, stores: (p.stores || []).filter(s => s !== name), customStores: (p.customStores || []).filter(s => s !== name) }));
  const allStores = uniq([...STORES, ...(prefs?.customStores || []), ...(prefs?.stores || [])]);

  // ----- Summary tiles -----
  const foodRulesSummary = (() => {
    const parts = [
      ...allergies.map(a => `${a} allergy`),
      ...houseRules.filter(r => r !== 'We eat everything'),
      ...healthGoals,
    ];
    return parts.length ? parts.join(', ') : 'No restrictions';
  })();

  const prefRows = [
    { key: 'household', label: 'Household size', value: HOUSEHOLD.find(h => h.value === prefs?.householdSize)?.label || 'Two of us', accent: '#0A7A65' },
    { key: 'foodrules', label: 'Food rules', value: foodRulesSummary, accent: allergies.length ? '#9B1C1C' : '#C9A84C' },
    { key: 'stores', label: 'Your stores', value: prefs?.stores?.length ? prefs.stores.join(', ') : 'None selected', accent: '#0A7A65' },
    { key: 'budget', label: 'Budget and shopping', value: `$${monthlyBudget} a month, $${perTrip} a trip`, accent: '#C9A84C' },
    { key: 'proteins', label: 'Proteins you buy', value: prefs?.proteins?.length ? prefs.proteins.join(', ') : 'A good mix', accent: '#0A7A65' },
    { key: 'mealtypes', label: 'Meals your crew eats', value: prefs?.mealTypes?.length ? prefs.mealTypes.join(', ') : 'Surprise me', accent: '#C9A84C' },
  ];

  const customAllergies = allergies.filter(a => !ALLERGENS.includes(a));
  const customRules = houseRules.filter(r => !HOUSE_RULES.includes(r));
  const customGoals = healthGoals.filter(g => !HEALTH_GOALS.includes(g));
  const listedProteins = PROTEIN_GROUPS.flatMap(g => g.items);
  const customProteins = (prefs?.proteins || []).filter(p => !listedProteins.includes(p));
  const customMealTypes = (prefs?.mealTypes || []).filter(t => !MEAL_TYPES.includes(t));

  return (
    <div className="screen">
      {/* Teal hero header */}
      <div style={{ background: '#0A3D35', padding: '20px 24px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <img src="/logo-icon.svg" alt="GET IN THE KITCHEN" style={{ width: 40, height: 40, borderRadius: 11 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#C9A84C', letterSpacing: '.06em' }}>GET IN THE KITCHEN</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>Real meals. Real budget. Real life.</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>Monthly budget</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#C9A84C', lineHeight: 1 }}>${monthlyBudget}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>${perTrip} a trip</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>Household</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#C9A84C', lineHeight: 1 }}>{HOUSEHOLD.find(h => h.value === prefs?.householdSize)?.num || '2'}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>people</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>Stores</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#C9A84C', lineHeight: 1 }}>{prefs?.stores?.length || 0}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prefs?.stores?.slice(0, 2).join(', ') || 'None set'}</div>
          </div>
        </div>
      </div>

      <div className="screen-padded">
        {/* Preferences */}
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, marginTop: 4 }}>My preferences</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {prefRows.map(row => (
            <button key={row.key} type="button" onClick={() => setEditSheet(row.key)}
              style={{ textAlign: 'left', fontFamily: 'inherit', background: '#fff', border: '0.5px solid var(--border)', borderRadius: 12, padding: '14px 14px 12px', cursor: 'pointer', borderTop: `3px solid ${row.accent}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: row.accent, marginBottom: 6 }}>{row.label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3, marginBottom: 4 }}>{row.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Tap to edit</div>
            </button>
          ))}
        </div>

        {/* Beta key */}
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10 }}>Smart features</div>
        <div className="card mb-20" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Your beta key</div>
          <p className="text-sm mb-12">Turns on Build My Week, recipes, and your starter menu. Stored only on this device.</p>
          {apiKey ? (
            <div className="flex items-center gap-8 mb-8">
              <Icon name="check" size={16} style={{ color: 'var(--green)' }} />
              <span className="text-sm" style={{ color: 'var(--green)' }}>Beta key saved</span>
              <button onClick={() => setShowApiKey(!showApiKey)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13 }}>
                {showApiKey ? 'Hide' : 'Change'}
              </button>
            </div>
          ) : (
            <div className="banner banner-warning mb-8">
              <Icon name="alert-triangle" size={14} /> No beta key yet, so smart features are off.
            </div>
          )}
          {(!apiKey || showApiKey) && (
            <div>
              <input type="password" autoComplete="off" value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="Paste your beta key" className="mb-8" />
              <Button variant="primary" onClick={saveKey}>
                {keySaved ? <><Icon name="check" size={16} /> Saved</> : 'Save beta key'}
              </Button>
            </div>
          )}
        </div>

        {/* Pexels key */}
        <div className="card mb-20" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Photo key (Pexels)</div>
          <p className="text-sm mb-12">Pulls food photos for your meal library.</p>
          {unsplashKey ? (
            <div className="flex items-center gap-8 mb-8">
              <Icon name="check" size={16} style={{ color: 'var(--teal)' }} />
              <span className="text-sm" style={{ color: 'var(--teal)' }}>Photo key saved, photos are on</span>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--gold-dark)', background: 'var(--gold-light)', padding: '8px 12px', borderRadius: 8, marginBottom: 8 }}>
              No photo key yet, so meal photos won't load
            </div>
          )}
          <input type="password" autoComplete="off" value={newUnsplashKey} onChange={e => setNewUnsplashKey(e.target.value)} placeholder="Paste your photo key" className="mb-8" />
          <Button variant="primary" onClick={() => {
            if (!newUnsplashKey.trim()) return;
            setUnsplashKey(newUnsplashKey.trim());
            setUnsplashSaved(true);
            setNewUnsplashKey('');
            setTimeout(() => setUnsplashSaved(false), 2000);
          }}>
            {unsplashSaved ? <><Icon name="check" size={16} /> Saved</> : 'Save photo key'}
          </Button>
        </div>

        <Divider />
        <p className="text-xs text-muted" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>GET IN THE KITCHEN, beta<br />Real meals. Real budget. Real life.</p>
      </div>

      {/* ---------------- Edit sheets ---------------- */}

      {editSheet === 'household' && (
        <EditSheet title="Who are we feeding?" onClose={() => setEditSheet(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {HOUSEHOLD.map(h => {
              const sel = prefs?.householdSize === h.value;
              return (
                <button key={h.value} type="button" aria-pressed={sel} onClick={() => setPrefs(p => ({ ...p, householdSize: h.value }))}
                  style={{ fontFamily: 'inherit', border: sel ? '2px solid var(--teal)' : '1px solid var(--border)', borderRadius: 14, padding: '18px 10px', textAlign: 'center', cursor: 'pointer', background: sel ? 'var(--teal-light)' : 'var(--bg-white)' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: sel ? 'var(--teal)' : 'var(--text)' }}>{h.num}</div>
                  <div style={{ fontSize: 13, fontWeight: sel ? 700 : 500, color: sel ? 'var(--teal)' : 'var(--text-secondary)' }}>{h.label}</div>
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 20 }}><Button variant="primary" onClick={() => setEditSheet(null)}>Done</Button></div>
        </EditSheet>
      )}

      {editSheet === 'foodrules' && (
        <EditSheet title="Anything off the table?" onClose={() => setEditSheet(null)}>
          <RuleCard title="Food allergies" sub="Anything someone in your house can't eat, even a little.">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ALLERGENS.map(a => <AllergyChip key={a} label={a} selected={allergies.includes(a)} onClick={() => toggleAllergy(a)} />)}
              {customAllergies.map(a => <RemovableChip key={a} label={a} allergy onRemove={() => toggleAllergy(a)} />)}
            </div>
            <AddRow placeholder="Add another allergy" onAdd={addAllergy} />
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>I will never put these in a plan. Still check labels, just to be safe.</div>
          </RuleCard>

          <RuleCard title="How does your house eat?" sub="Beliefs, lifestyle, or foods you just skip.">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {HOUSE_RULES.map(r => <Pill key={r} selected={houseRules.includes(r)} onClick={() => toggleRule(r)}>{r}</Pill>)}
              {customRules.map(r => <RemovableChip key={r} label={r} onRemove={() => toggleRule(r)} />)}
            </div>
            <AddRow placeholder="Like no spicy food or no mushrooms" onAdd={addRule} />
          </RuleCard>

          <RuleCard title="Health goals" sub="Optional. Meals lean this way.">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {HEALTH_GOALS.map(g => <Pill key={g} selected={healthGoals.includes(g)} onClick={() => toggleGoal(g)}>{g}</Pill>)}
              {customGoals.map(g => <RemovableChip key={g} label={g} onRemove={() => toggleGoal(g)} />)}
            </div>
            <AddRow placeholder="Like more fiber or more protein" onAdd={addGoal} />
          </RuleCard>

          <Button variant="primary" onClick={() => setEditSheet(null)}>Done</Button>
        </EditSheet>
      )}

      {editSheet === 'stores' && (
        <EditSheet title="Where do you shop?" onClose={() => setEditSheet(null)}>
          <p className="text-sm mb-12">Turn on every store you use.</p>
          {allStores.map(s => {
            const on = (prefs?.stores || []).includes(s);
            const custom = !STORES.includes(s);
            return (
              <div key={s} className="flex justify-between items-center" style={{ padding: '12px 0', borderBottom: '0.5px solid var(--border)' }}>
                <div className="flex items-center gap-8">
                  <span style={{ fontSize: 14 }}>{s}</span>
                  {custom && (
                    <button onClick={() => removeCustomStore(s)} aria-label={`Remove ${s}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}>
                      <Icon name="x" size={13} />
                    </button>
                  )}
                </div>
                <button onClick={() => toggleStore(s)} role="switch" aria-checked={on} aria-label={s}
                  style={{ width: 44, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', position: 'relative', background: on ? 'var(--teal)' : 'var(--border-strong)', transition: 'background .2s' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: on ? 'var(--gold)' : '#fff', position: 'absolute', top: 3, transition: 'left .2s', left: on ? 21 : 3 }} />
                </button>
              </div>
            );
          })}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, marginBottom: 20 }}>
            <input value={newStore} onChange={e => setNewStore(e.target.value)} placeholder="Add a store" onKeyDown={e => e.key === 'Enter' && addCustomStore()} style={{ flex: 1, height: 40, fontSize: 13 }} />
            <button onClick={addCustomStore} style={{ background: 'var(--teal)', color: 'var(--gold)', border: 'none', borderRadius: 8, padding: '0 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Add</button>
          </div>
          <Button variant="primary" onClick={() => setEditSheet(null)}>Done</Button>
        </EditSheet>
      )}

      {editSheet === 'budget' && (
        <EditSheet title="Budget and shopping" onClose={() => setEditSheet(null)}>
          <div className="form-group">
            <label htmlFor="settings-budget">Monthly grocery budget</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 24, fontWeight: 700 }}>$</span>
              <input id="settings-budget" type="number" inputMode="numeric" value={monthlyBudget}
                onChange={e => setPrefs(p => ({ ...p, monthlyBudget: parseFloat(e.target.value) || 0 }))}
                style={{ fontSize: 28, fontWeight: 700, width: 130 }} />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>a month</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {['300', '400', '450', '500', '600'].map(v => (
                <Pill key={v} selected={monthlyBudget === parseInt(v, 10)} onClick={() => setPrefs(p => ({ ...p, monthlyBudget: parseInt(v, 10) }))}>${v}</Pill>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>How often do you shop?</div>
            {FREQ_OPTIONS.map(opt => {
              const sel = shopFreq === opt.value;
              return (
                <button key={opt.value} type="button" aria-pressed={sel} onClick={() => setPrefs(p => ({ ...p, shopFreq: opt.value }))}
                  style={{ width: '100%', textAlign: 'left', fontFamily: 'inherit', padding: '12px 14px', borderRadius: 10, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: sel ? '2px solid var(--teal)' : '1px solid var(--border)', background: sel ? 'var(--teal-light)' : 'var(--bg-white)', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: sel ? 700 : 400, color: sel ? 'var(--teal)' : 'var(--text)' }}>{opt.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>${Math.round(monthlyBudget / opt.trips)} a trip, {opt.desc}</div>
                  </div>
                  {sel && <Icon name="check" size={16} style={{ color: 'var(--teal)' }} />}
                </button>
              );
            })}
          </div>
          <div style={{ background: 'var(--teal-light)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--teal)' }}>
            <strong>${perTrip}</strong> a trip and about <strong>${Math.round(monthlyBudget / 4)}</strong> a week
          </div>
          <Button variant="primary" onClick={() => setEditSheet(null)}>Done</Button>
        </EditSheet>
      )}

      {editSheet === 'proteins' && (
        <EditSheet title="What proteins do you buy?" onClose={() => setEditSheet(null)}>
          <p className="text-sm mb-16">Build My Week rotates these so dinner never gets boring.</p>
          {PROTEIN_GROUPS.map(group => (
            <div key={group.group} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>{group.group}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {group.items.map(p => {
                  const block = blockedBy(p);
                  return block
                    ? <LockedChip key={p} label={p} note={block} />
                    : <Pill key={p} selected={prefs?.proteins?.includes(p)} onClick={() => toggleProtein(p)}>{p}</Pill>;
                })}
              </div>
            </div>
          ))}
          {customProteins.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {customProteins.map(p => <RemovableChip key={p} label={p} onRemove={() => toggleProtein(p)} />)}
            </div>
          )}
          <div style={{ marginBottom: 20 }}><AddRow placeholder="Like salmon, shrimp, goat, or seitan" onAdd={addProtein} /></div>
          <Button variant="primary" onClick={() => setEditSheet(null)}>Done</Button>
        </EditSheet>
      )}

      {editSheet === 'mealtypes' && (
        <EditSheet title="What does your crew actually eat?" onClose={() => setEditSheet(null)}>
          <p className="text-sm mb-16">Choose as many as you like.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {MEAL_TYPES.map(t => <Pill key={t} selected={prefs?.mealTypes?.includes(t)} onClick={() => toggleMealType(t)}>{t}</Pill>)}
            {customMealTypes.map(t => <RemovableChip key={t} label={t} onRemove={() => toggleMealType(t)} />)}
          </div>
          <div style={{ marginBottom: 20 }}><AddRow placeholder="Like Nigerian, Southern, Mediterranean" onAdd={addMealType} /></div>
          <Button variant="primary" onClick={() => setEditSheet(null)}>Done</Button>
        </EditSheet>
      )}
    </div>
  );
}
