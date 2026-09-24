import React, { useState, useEffect, useRef } from 'react';
import { STORES, SEED_MEALS } from '../data/meals';

// ---------------------------------------------------------------------------
// GET IN THE KITCHEN - Onboarding v2
// Welcome, 7 question steps, a "building your kitchen" moment, and a reveal.
// Change HOST_NAME here to rename the avatar everywhere.
// ---------------------------------------------------------------------------

const HOST_NAME = 'Michele';
const DRAFT_KEY = 'gitk_onboarding_draft';
const TOTAL_STEPS = 7;

const C = {
  teal: '#0A3D35',
  tealMid: '#0F5040',
  tealLight: '#E8F5F1',
  gold: '#C9A84C',
  goldLight: '#FFFAEF',
  cream: '#F9F4EC',
  surface: '#F0EBE0',
  border: '#E0D5C5',
  text: '#0A2E25',
  sec: '#3A5A50',
  allergy: '#9B1C1C',
  allergyBg: '#FDECEA',
};

const HOUSEHOLD = [
  { value: '1', num: '1', label: 'Just me' },
  { value: '2', num: '2', label: 'Two of us' },
  { value: '3-4', num: '3-4', label: 'The family' },
  { value: '5+', num: '5+', label: 'Full house' },
];

const BUDGET_PRESETS = ['300', '400', '450', '500', '600'];

const FREQ_OPTIONS = [
  { value: 'weekly', label: 'Every week', trips: 4 },
  { value: 'biweekly', label: 'Every 2 weeks', trips: 2 },
  { value: 'monthly', label: 'Once a month', trips: 1 },
];

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

// Which proteins each allergy blocks
const ALLERGY_BLOCKS = {
  'Shellfish': ['Shellfish'],
  'Fish': ['Fish'],
  'Eggs': ['Eggs'],
  'Milk or dairy': ['Greek yogurt'],
  'Peanuts': ['Peanut butter'],
  'Soy': ['Tofu'],
};

// Which proteins each house rule blocks
const MEATS = ['Chicken', 'Ground turkey', 'Beef', 'Pork', 'Lamb', 'Sausage'];
const RULE_BLOCKS = {
  'Vegetarian': [...MEATS, 'Fish', 'Shellfish'],
  'Vegan': [...MEATS, 'Fish', 'Shellfish', 'Eggs', 'Greek yogurt'],
  'Seafood, no meat': MEATS,
  'No pork': ['Pork'],
  'No red meat': ['Beef', 'Pork', 'Lamb'],
  'Halal': ['Pork'],
  'Kosher': ['Pork', 'Shellfish'],
};

// Words used to screen seed meals when the AI is not available
const ALLERGY_WORDS = {
  'Peanuts': ['peanut'],
  'Tree nuts': ['almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut'],
  'Shellfish': ['shrimp', 'crab', 'lobster', 'scallop', 'clam', 'mussel', 'oyster', 'crawfish'],
  'Fish': ['fish', 'salmon', 'tuna', 'tilapia', 'cod', 'whiting', 'catfish'],
  'Eggs': ['egg'],
  'Milk or dairy': ['milk', 'cheese', 'butter', 'yogurt', 'cream', 'sour cream'],
  'Wheat or gluten': ['bread', 'pasta', 'flour', 'tortilla', 'bun', 'noodle', 'wheat', 'cracker'],
  'Soy': ['soy', 'tofu', 'edamame'],
  'Sesame': ['sesame', 'tahini'],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function toggleIn(list, item) {
  return list.includes(item) ? list.filter(x => x !== item) : [...list, item];
}

function money(n) {
  const v = parseFloat(n);
  if (isNaN(v)) return '';
  return '$' + (Math.round(v * 100) / 100).toFixed(2);
}

function parseMealsJson(raw) {
  if (!raw) return null;
  let text = String(raw).replace(/```json|```/g, '').trim();
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1) return null;
  text = text.slice(start, end + 1);
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : null;
}

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function AnimStyles() {
  return (
    <style>{`
      @keyframes gitkBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
      @keyframes gitkBlink { 0%,92%,100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
      @keyframes gitkTalk { 0% { opacity: 0; } 100% { opacity: 1; } }
      @keyframes gitkDotsOut { 0%,85% { opacity: 1; } 100% { opacity: 0; } }
      @keyframes gitkTextIn { 0% { opacity: 0; transform: translateY(4px); } 100% { opacity: 1; transform: translateY(0); } }
      @keyframes gitkDot { 0%,100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-3px); opacity: 1; } }
      @keyframes gitkPulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
      .gitk-bob { animation: gitkBob 3.2s ease-in-out infinite; }
      .gitk-eye { transform-box: fill-box; transform-origin: center; animation: gitkBlink 4.5s infinite; }
      .gitk-mouth { opacity: 0; animation: gitkTalk 0.2s steps(1) 1.3s 10 alternate; }
      .gitk-dots { animation: gitkDotsOut 1.3s forwards; }
      .gitk-text { opacity: 0; animation: gitkTextIn 0.4s ease-out 1.2s forwards; }
      .gitk-d { display: inline-block; animation: gitkDot 0.9s ease-in-out infinite; }
      .gitk-pulse { animation: gitkPulse 1.2s ease-in-out infinite; }
      .gitk-onb button:focus-visible, .gitk-onb input:focus-visible { outline: 3px solid ${C.gold}; outline-offset: 2px; }
      @media (prefers-reduced-motion: reduce) {
        .gitk-bob, .gitk-eye, .gitk-mouth, .gitk-d, .gitk-pulse { animation: none; }
        .gitk-dots { animation: none; opacity: 0; }
        .gitk-text { animation: none; opacity: 1; }
      }
    `}</style>
  );
}

// Placeholder host avatar. Swap this SVG for the final illustration later.
function Avatar({ size = 48, ring = 2, bg = C.teal, talk = false }) {
  const inner = Math.round(size * 0.92);
  return (
    <div style={{
      width: size, height: size, flexShrink: 0, borderRadius: size / 2, background: bg,
      border: `${ring}px solid ${C.gold}`, overflow: 'hidden', display: 'flex',
      alignItems: 'flex-end', justifyContent: 'center', boxSizing: 'border-box',
    }}>
      <svg className="gitk-bob" width={inner} height={inner} viewBox="0 0 64 64" role="img" aria-label={`${HOST_NAME}, your kitchen host`}>
        <circle cx="32" cy="26" r="17" fill="#2B1B14" />
        <circle cx="19" cy="21" r="9" fill="#2B1B14" />
        <circle cx="45" cy="21" r="9" fill="#2B1B14" />
        <circle cx="32" cy="12" r="11" fill="#2B1B14" />
        <path d="M13 64c0-11 8-19 19-19s19 8 19 19z" fill={C.gold} />
        <rect x="28" y="38" width="8" height="10" fill="#7A4E33" />
        <ellipse cx="32" cy="29" rx="10" ry="12" fill="#8A5A3C" />
        <circle className="gitk-eye" cx="28" cy="27" r="1.4" fill="#2B1B14" />
        <circle className="gitk-eye" cx="36" cy="27" r="1.4" fill="#2B1B14" />
        <path d="M27 33q5 4 10 0" stroke="#2B1B14" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {talk && <ellipse className="gitk-mouth" cx="32" cy="34" rx="3.6" ry="2.6" fill="#3A1A12" />}
      </svg>
    </div>
  );
}

// Host speaks: typing dots first, then her line fades in.
function Host({ text }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
      <Avatar size={52} talk />
      <div style={{
        position: 'relative', background: '#fff', border: `1px solid ${C.border}`,
        borderRadius: '16px 16px 16px 4px', padding: '11px 14px', fontSize: 14,
        lineHeight: 1.45, color: C.text,
      }}>
        <div className="gitk-dots" aria-hidden="true" style={{
          position: 'absolute', left: 14, top: 12, display: 'flex', gap: 4,
          fontSize: 20, lineHeight: '10px', color: C.teal,
        }}>
          <span className="gitk-d">&bull;</span>
          <span className="gitk-d" style={{ animationDelay: '0.15s' }}>&bull;</span>
          <span className="gitk-d" style={{ animationDelay: '0.3s' }}>&bull;</span>
        </div>
        <div className="gitk-text">{text}</div>
      </div>
    </div>
  );
}

function Heading({ title, sub }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, lineHeight: 1.2, color: C.text }}>{title}</h1>
      {sub && <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: C.sec }}>{sub}</p>}
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={{ fontSize: 13, fontWeight: 700, color: C.sec }}>{children}</div>;
}

function Chip({ label, selected, onClick, variant = 'normal', disabled = false, note }) {
  const isAllergy = variant === 'allergy';
  let style = {
    minHeight: 40, padding: '0 14px', borderRadius: 20, fontSize: 14, fontFamily: 'inherit',
    display: 'inline-flex', alignItems: 'center', gap: 6, cursor: disabled ? 'not-allowed' : 'pointer',
    border: `1.5px solid ${C.border}`, background: '#fff', color: C.text, fontWeight: 500,
    transition: 'all .15s',
  };
  if (selected && isAllergy) {
    style = { ...style, border: `1.5px solid ${C.allergy}`, background: C.allergyBg, color: C.allergy, fontWeight: 700 };
  } else if (selected) {
    style = { ...style, border: `1.5px solid ${C.teal}`, background: C.teal, color: '#fff', fontWeight: 600 };
  }
  if (disabled) {
    style = { ...style, background: C.surface, color: '#8A9A94', border: `1.5px dashed ${C.border}` };
  }
  return (
    <button type="button" onClick={disabled ? undefined : onClick} aria-pressed={!!selected} disabled={disabled} style={style}>
      {selected && isAllergy && <i className="ti ti-alert-triangle" style={{ fontSize: 15 }} />}
      {selected && !isAllergy && <i className="ti ti-check" style={{ fontSize: 14, color: C.gold }} />}
      {label}
      {disabled && note && <span style={{ fontSize: 11, fontWeight: 700 }}>({note})</span>}
    </button>
  );
}

function ChipGroup({ children }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{children}</div>;
}

// Inline "add your own" row. Starts as a link, opens into an input.
function AddRow({ id, label, placeholder, onAdd, startOpen = false }) {
  const [open, setOpen] = useState(startOpen);
  const [val, setVal] = useState('');
  const add = () => {
    const v = val.trim();
    if (!v) return;
    onAdd(v);
    setVal('');
  };
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={{
        alignSelf: 'flex-start', minHeight: 40, padding: '0 4px', border: 'none', background: 'transparent',
        color: C.teal, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', display: 'flex',
        alignItems: 'center', gap: 6, cursor: 'pointer',
      }}>
        <i className="ti ti-plus" style={{ fontSize: 16 }} />{label}
      </button>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label htmlFor={id} style={{ fontSize: 14, fontWeight: 600, color: C.sec, margin: 0 }}>{label}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          id={id}
          value={val}
          placeholder={placeholder}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add(); }}
          style={{ flex: 1, height: 48, fontSize: 15, borderRadius: 12 }}
        />
        <button type="button" onClick={add} style={{
          height: 48, padding: '0 18px', borderRadius: 12, border: 'none', background: C.teal,
          color: C.gold, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
        }}>Add</button>
      </div>
    </div>
  );
}

function Card({ title, sub, children }) {
  return (
    <div style={{
      background: '#fff', border: `1px solid ${C.border}`, borderRadius: 18, padding: 16,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{title}</div>
        {sub && <div style={{ fontSize: 13, lineHeight: 1.45, color: C.sec }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function CheckBox({ on }) {
  return (
    <div style={{
      width: 26, height: 26, borderRadius: 8, flexShrink: 0, boxSizing: 'border-box',
      background: on ? C.teal : '#fff', border: on ? 'none' : `1.5px solid ${C.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {on && <i className="ti ti-check" style={{ fontSize: 16, color: C.gold }} />}
    </div>
  );
}

function PrimaryButton({ children, onClick, gold = false, disabled = false }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      width: '100%', height: 54, borderRadius: 14, border: 'none', cursor: disabled ? 'default' : 'pointer',
      background: gold ? C.gold : C.teal, color: gold ? C.teal : '#fff',
      fontSize: 16, fontWeight: 800, fontFamily: 'inherit', display: 'flex',
      alignItems: 'center', justifyContent: 'center', gap: 8, opacity: disabled ? 0.6 : 1,
    }}>
      {children}
      <i className="ti ti-arrow-right" style={{ fontSize: 18, color: gold ? C.teal : C.gold }} />
    </button>
  );
}

function TextButton({ children, onClick, light = false }) {
  return (
    <button type="button" onClick={onClick} style={{
      minHeight: 44, border: 'none', background: 'transparent', cursor: 'pointer',
      fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
      color: light ? 'rgba(255,255,255,0.75)' : C.sec,
    }}>{children}</button>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function OnboardingScreen({ store, onNavigate }) {
  const { setOnboarded, setPrefs, setBudget, apiFetch, setMeals, setApiKey } = store;
  const draft = useRef(loadDraft()).current;

  const [step, setStep] = useState(draft.step || 0);
  const [household, setHousehold] = useState(draft.household || '3-4');
  const [monthlyBudget, setMonthlyBudget] = useState(draft.monthlyBudget || '450');
  const [shopFreq, setShopFreq] = useState(draft.shopFreq || 'biweekly');
  const [stores, setStores] = useState(draft.stores || ['Aldi', 'Walmart']);
  const [hasAllergies, setHasAllergies] = useState(draft.hasAllergies ?? null);
  const [allergies, setAllergies] = useState(draft.allergies || []);
  const [houseRules, setHouseRules] = useState(draft.houseRules || []);
  const [healthGoals, setHealthGoals] = useState(draft.healthGoals || []);
  const [proteins, setProteins] = useState(draft.proteins || []);
  const [mealTypes, setMealTypes] = useState(draft.mealTypes || []);
  const [apiKeyInput, setApiKeyInput] = useState('');

  const [phase, setPhase] = useState('questions'); // questions | building | reveal
  const [buildTick, setBuildTick] = useState(0);
  const [starterMeals, setStarterMeals] = useState([]);
  const [usedAI, setUsedAI] = useState(false);

  // Save progress as she goes (the API key is never saved here)
  useEffect(() => {
    if (phase !== 'questions') return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        step, household, monthlyBudget, shopFreq, stores, hasAllergies,
        allergies, houseRules, healthGoals, proteins, mealTypes,
      }));
    } catch (e) { /* storage full or blocked, not a blocker */ }
  }, [phase, step, household, monthlyBudget, shopFreq, stores, hasAllergies, allergies, houseRules, healthGoals, proteins, mealTypes]);

  // Scroll to top on each new step
  useEffect(() => { window.scrollTo(0, 0); }, [step, phase]);

  // Walk through the building checklist while the AI works
  useEffect(() => {
    if (phase !== 'building') return;
    setBuildTick(0);
    const t = setInterval(() => setBuildTick(n => Math.min(n + 1, 3)), 2500);
    return () => clearInterval(t);
  }, [phase]);

  // ----- Derived values -----
  const mb = parseFloat(monthlyBudget) || 0;
  const trips = FREQ_OPTIONS.find(f => f.value === shopFreq)?.trips || 2;
  const householdLabel = HOUSEHOLD.find(h => h.value === household)?.num || household;

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
  const allowedProteins = proteins.filter(p => !blockedBy(p));

  const strictRules = houseRules.filter(r => r !== 'We eat everything');

  // ----- Handlers -----
  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const toggleHouseRule = (r) => {
    if (r === 'We eat everything') {
      setHouseRules(prev => prev.includes(r) ? [] : [r]);
    } else {
      setHouseRules(prev => toggleIn(prev.filter(x => x !== 'We eat everything'), r));
    }
  };

  const addUnique = (setter) => (val) => setter(prev => prev.some(x => x.toLowerCase() === val.toLowerCase()) ? prev : [...prev, val]);

  // ----- Fallback when the AI is not available -----
  const fallbackMeals = () => {
    const allergyWords = allergies.flatMap(a => ALLERGY_WORDS[a] || [a.toLowerCase()]);
    const blockedProteinWords = [];
    if (strictRules.some(r => ['Vegetarian', 'Vegan', 'Seafood, no meat'].includes(r))) blockedProteinWords.push('chicken', 'beef', 'pork', 'turkey', 'sausage', 'lamb');
    if (strictRules.some(r => ['Vegetarian', 'Vegan'].includes(r))) blockedProteinWords.push('fish', 'shrimp');
    if (strictRules.includes('Vegan')) blockedProteinWords.push('eggs', 'dairy');
    if (strictRules.some(r => ['No pork', 'Halal', 'Kosher', 'No red meat'].includes(r))) blockedProteinWords.push('pork');
    if (strictRules.includes('No red meat')) blockedProteinWords.push('beef', 'lamb');

    const safe = SEED_MEALS.filter(m => {
      const p = (m.protein || '').toLowerCase();
      if (blockedProteinWords.includes(p)) return false;
      const text = [m.name, ...(m.items || []).map(i => i.n || '')].join(' ').toLowerCase();
      return !allergyWords.some(w => text.includes(w));
    });
    return safe.length ? safe : [];
  };

  // ----- Finish: save prefs, build starter library -----
  const finish = async () => {
    const budget = mb || 450;
    // dietary keeps the old shape so Build My Week still enforces everything
    const dietary = [
      ...strictRules,
      ...allergies.map(a => `${a} allergy`),
    ];
    const prefs = {
      householdSize: household,
      dietary,
      allergies,
      houseRules: strictRules,
      healthGoals,
      stores,
      monthlyBudget: budget,
      shopFreq,
      weekType: 'normal',
      proteins: allowedProteins,
      mealTypes,
      customStores: stores.filter(s => !STORES.includes(s)),
    };

    setBudget(budget / 4);
    setPrefs(prefs);
    if (apiKeyInput.trim()) setApiKey(apiKeyInput.trim());

    setPhase('building');
    const started = Date.now();
    let meals = [];
    let ai = false;

    const hasKey = apiKeyInput.trim() || localStorage.getItem('gitk_api_key');
    if (hasKey) {
      try {
        const proteinStr = allowedProteins.length ? allowedProteins.join(', ') : 'a healthy mix of everyday proteins';
        const allergyStr = allergies.length ? allergies.join(', ') : 'none';
        const rulesStr = strictRules.length ? strictRules.join(', ') : 'none';
        const goalsStr = healthGoals.length ? healthGoals.join(', ') : 'none';
        const styleStr = mealTypes.length ? mealTypes.join(', ') : 'everyday American home cooking';
        const storeStr = [...stores, 'Pantry / on hand'].join('|');

        const prompt = `Generate a personalized starter meal library for a new user of a budget meal planning app.

USER PROFILE:
- Household size: ${household} people
- Monthly grocery budget: $${budget}
- Proteins they buy: ${proteinStr}
- Meal styles they love: ${styleStr}

FOOD ALLERGIES (life-safety rule): ${allergyStr}
Never include any allergen listed above in any form, including sauces, oils, marinades, garnishes, broths, and pre-made ingredients. If an ingredient might contain an allergen, leave it out.

HOUSE RULES (strict, never break): ${rulesStr}

HEALTH GOALS (lean meals this way, not a hard rule): ${goalsStr}

Generate exactly 15 meals: 4 breakfasts, 4 lunches, 5 dinners, 2 snacks.
All meals must be simple, budget-friendly, practical home cooking.
${allowedProteins.length ? 'Only use the proteins listed above.' : 'Use a variety of affordable proteins.'}
Scale ingredients for ${household} people.

Return ONLY a JSON array, no other text:
[{
  "name": "meal name",
  "slot": "Breakfast|Lunch|Dinner|Snack",
  "cost": 3.50,
  "protein": "chicken|beef|pork|turkey|fish|eggs|sausage|dairy|pb|none",
  "prepTime": 20,
  "items": [{"n": "ingredient name", "s": "${storeStr}"}],
  "steps": ["step 1", "step 2", "step 3"]
}]`;

        const raw = await apiFetch(prompt, 3000);
        const parsed = parseMealsJson(raw);
        if (parsed && parsed.length) {
          meals = parsed.map((m, i) => ({
            ...m,
            id: 'starter_' + Date.now() + '_' + i,
            favorite: false,
            image: null,
          }));
          ai = true;
        }
      } catch (e) {
        console.warn('Starter library generation failed, using starter meals instead:', e);
      }
    }

    if (!meals.length) meals = fallbackMeals();

    // Let the building moment breathe for at least 6 seconds
    const wait = Math.max(0, 6000 - (Date.now() - started));
    await new Promise(r => setTimeout(r, wait));

    setMeals(meals);
    setStarterMeals(meals);
    setUsedAI(ai);
    setPhase('reveal');
  };

  const complete = (goToPlan) => {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ }
    setOnboarded(true);
    if (goToPlan && typeof onNavigate === 'function') onNavigate('plan');
  };

  // ------------------------------------------------------------------------
  // BUILDING SCREEN
  // ------------------------------------------------------------------------
  if (phase === 'building') {
    const lines = [
      `Sizing meals for ${householdLabel} ${household === '1' ? 'person' : 'people'}`,
      `Keeping it under $${mb || 450} a month`,
      allergies.length || strictRules.length
        ? `Leaving out ${[...allergies, ...strictRules].slice(0, 3).join(', ').toLowerCase()}`
        : 'Checking your food rules',
      mealTypes.length ? `Picking ${mealTypes.slice(0, 2).join(' and ').toLowerCase()} and more` : 'Picking meals your crew will love',
    ];
    return (
      <div className="gitk-onb" style={{ minHeight: '100vh', background: C.teal, display: 'flex', justifyContent: 'center' }}>
        <AnimStyles />
        <div style={{ width: '100%', maxWidth: 480, padding: '70px 24px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <Avatar size={140} ring={5} bg={C.tealMid} />
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#fff' }}>Building your kitchen...</h1>
              <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.5, color: 'rgba(255,255,255,0.8)' }}>
                Give me about 15 seconds. I'm cooking up something that fits.
              </p>
            </div>
          </div>
          <div role="status" aria-live="polite" style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {lines.map((line, i) => {
              const done = i < buildTick;
              const now = i === buildTick;
              return (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 15, color: done || now ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                  {done && (
                    <div style={{ width: 26, height: 26, borderRadius: 13, background: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="ti ti-check" style={{ fontSize: 15, color: C.teal }} />
                    </div>
                  )}
                  {now && (
                    <div style={{ width: 26, height: 26, borderRadius: 13, border: `2px solid ${C.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxSizing: 'border-box' }}>
                      <div className="gitk-pulse" style={{ width: 8, height: 8, borderRadius: 4, background: C.gold }} />
                    </div>
                  )}
                  {!done && !now && (
                    <div style={{ width: 26, height: 26, borderRadius: 13, border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0, boxSizing: 'border-box' }} />
                  )}
                  {line}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------------
  // REVEAL SCREEN
  // ------------------------------------------------------------------------
  if (phase === 'reveal') {
    const preview = starterMeals.slice(0, 3);
    const more = Math.max(0, starterMeals.length - preview.length);
    return (
      <div className="gitk-onb" style={{ minHeight: '100vh', background: C.cream, display: 'flex', justifyContent: 'center' }}>
        <AnimStyles />
        <div style={{ width: '100%', maxWidth: 480, padding: '32px 24px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Host text={usedAI
            ? "Here's what I made for you. Every one fits your budget and your house rules."
            : "Here are some starter meals to get you going. Add your beta key in Settings and I'll make them just for you."} />
          <Heading
            title="Your kitchen is ready."
            sub={starterMeals.length ? `${starterMeals.length} meals picked for your family.` : 'Your library is ready for your first meals.'}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {starterMeals.length > 0 && <Tag>{starterMeals.length} meals</Tag>}
            <Tag>Under ${mb || 450} a month</Tag>
            <Tag>Serves {householdLabel}</Tag>
          </div>
          {preview.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {preview.map(m => (
                <div key={m.id || m.name} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 64, height: 64, flexShrink: 0, borderRadius: 12, background: C.tealLight, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {m.image
                      ? <img src={m.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <i className="ti ti-tools-kitchen-2" style={{ fontSize: 26, color: C.teal }} />}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{m.name}</div>
                    <div style={{ fontSize: 13, color: C.sec }}>
                      {[m.slot, m.prepTime ? `${m.prepTime} min` : null].filter(Boolean).join(', ')}
                      {m.cost ? <span style={{ fontWeight: 700, color: C.teal }}>{`  ${money(m.cost)}`}</span> : null}
                    </div>
                  </div>
                </div>
              ))}
              {more > 0 && (
                <div style={{ fontSize: 14, fontWeight: 600, color: C.sec, textAlign: 'center' }}>
                  Plus {more} more waiting in your library
                </div>
              )}
            </div>
          )}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 8 }}>
            <PrimaryButton onClick={() => complete(true)}>Build my first week</PrimaryButton>
            <TextButton onClick={() => complete(false)}>Look around first</TextButton>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------------
  // WELCOME SCREEN
  // ------------------------------------------------------------------------
  if (step === 0) {
    return (
      <div className="gitk-onb" style={{ minHeight: '100vh', background: C.teal, display: 'flex', justifyContent: 'center' }}>
        <AnimStyles />
        <div style={{ width: '100%', maxWidth: 480, minHeight: '100vh', padding: '24px 24px 32px', display: 'flex', flexDirection: 'column', gap: 24, boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo-icon.svg" alt="" style={{ width: 36, height: 36, borderRadius: 10 }} />
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: C.gold }}>GET IN THE KITCHEN</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, paddingTop: 28 }}>
            <Avatar size={168} ring={5} bg={C.tealMid} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.gold }}>Hey, I'm {HOST_NAME}.</div>
              <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, lineHeight: 1.15, color: '#fff' }}>Let's get you in the kitchen.</h1>
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: 'rgba(255,255,255,0.82)' }}>
                A few quick questions and I'll build a starter menu that fits your family, your budget, and your real life.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            {['Real meals', 'Real budget', 'Real life'].map(t => (
              <div key={t} style={{ padding: '8px 12px', borderRadius: 16, background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 13, fontWeight: 600 }}>{t}</div>
            ))}
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <PrimaryButton gold onClick={next}>Let's get cooking</PrimaryButton>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Takes about 2 minutes</div>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------------
  // QUESTION STEPS
  // ------------------------------------------------------------------------
  let host = '';
  let title = '';
  let sub = '';
  let body = null;
  let skip = null;
  let isLast = false;

  if (step === 1) {
    host = "Let's start with your crew. I'll size every recipe so there's enough, not waste.";
    title = 'Who are we feeding?';
    sub = 'Count everyone who eats at home most nights.';
    body = (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        {HOUSEHOLD.map(h => {
          const sel = household === h.value;
          return (
            <button key={h.value} type="button" onClick={() => setHousehold(h.value)} aria-pressed={sel} style={{
              height: 128, borderRadius: 16, cursor: 'pointer', fontFamily: 'inherit',
              border: sel ? `2px solid ${C.teal}` : `1px solid ${C.border}`,
              background: sel ? C.tealLight : '#fff', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all .15s',
            }}>
              <div style={{ fontSize: 34, fontWeight: 800, color: sel ? C.teal : C.text }}>{h.num}</div>
              <div style={{ fontSize: 14, fontWeight: sel ? 700 : 500, color: sel ? C.teal : C.sec }}>{h.label}</div>
            </button>
          );
        })}
      </div>
    );
  }

  if (step === 2) {
    host = "No judgment here. Real budgets get real plans, and I'll keep you inside yours.";
    title = "What's the grocery budget looking like?";
    sub = 'Your monthly amount for food at home.';
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 30, fontWeight: 800, color: C.teal }}>$</span>
            <label htmlFor="gitk-budget" style={{ position: 'absolute', left: -9999 }}>Monthly grocery budget</label>
            <input
              id="gitk-budget"
              type="number"
              inputMode="numeric"
              value={monthlyBudget}
              onChange={e => setMonthlyBudget(e.target.value)}
              style={{
                width: 150, fontSize: 52, fontWeight: 800, color: C.teal, border: 'none',
                borderBottom: `3px solid ${C.gold}`, borderRadius: 0, padding: '0 0 2px', background: 'transparent',
              }}
            />
            <span style={{ fontSize: 16, color: C.sec }}>a month</span>
          </div>
          <ChipGroup>
            {BUDGET_PRESETS.map(v => (
              <Chip key={v} label={`$${v}`} selected={monthlyBudget === v} onClick={() => setMonthlyBudget(v)} />
            ))}
          </ChipGroup>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionLabel>How often do you shop?</SectionLabel>
          {FREQ_OPTIONS.map(opt => {
            const sel = shopFreq === opt.value;
            const per = Math.round(mb / opt.trips);
            const desc = opt.trips === 1 ? '1 big trip' : `${opt.trips} trips, about $${per} each`;
            return (
              <button key={opt.value} type="button" onClick={() => setShopFreq(opt.value)} aria-pressed={sel} style={{
                minHeight: 56, padding: '10px 14px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
                border: sel ? `2px solid ${C.teal}` : `1px solid ${C.border}`, background: sel ? C.tealLight : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontSize: 15, fontWeight: sel ? 700 : 500, color: sel ? C.teal : C.text }}>{opt.label}</div>
                  <div style={{ fontSize: 13, color: C.sec }}>{mb ? desc : ''}</div>
                </div>
                <CheckBox on={sel} />
              </button>
            );
          })}
          {mb > 0 && (
            <div style={{ fontSize: 13, color: C.sec, paddingTop: 4 }}>
              That's about <strong style={{ color: C.teal }}>${Math.round(mb / 4)}</strong> a week and <strong style={{ color: C.teal }}>${Math.round(mb / trips)}</strong> per trip.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 3) {
    const allStores = [...STORES, ...stores.filter(s => !STORES.includes(s))];
    host = "I'll sort your list by store so you're in and out, not wandering the aisles.";
    title = 'Where do you shop?';
    sub = 'Pick every store you use. I can split one list across all of them.';
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {allStores.map(s => {
            const on = stores.includes(s);
            const custom = !STORES.includes(s);
            return (
              <button key={s} type="button" onClick={() => setStores(p => toggleIn(p, s))} aria-pressed={on} style={{
                minHeight: 56, padding: '0 4px', border: 'none', borderBottom: `1px solid ${C.border}`,
                background: 'transparent', fontFamily: 'inherit', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 16, fontWeight: 500, color: C.text }}>
                  {s}{custom && <span style={{ fontSize: 12, color: C.sec, fontWeight: 600 }}>  (added)</span>}
                </span>
                <CheckBox on={on} />
              </button>
            );
          })}
        </div>
        <AddRow id="gitk-add-store" label="Don't see your store?" placeholder="Add it here" startOpen onAdd={addUnique(setStores)} />
      </div>
    );
  }

  if (step === 4) {
    const customAllergies = allergies.filter(a => !ALLERGENS.includes(a));
    const customRules = houseRules.filter(r => !HOUSE_RULES.includes(r));
    const customGoals = healthGoals.filter(g => !HEALTH_GOALS.includes(g));
    host = "Tell me what's off the table once. I'll never put the wrong thing on your plate.";
    title = 'Anything off the table?';
    sub = "Three quick ones. Skip whatever doesn't apply.";
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card title="Any food allergies?" sub="Anything someone in your house can't eat, even a little.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 4, padding: 4, borderRadius: 14, background: C.surface }}>
            {[{ v: false, l: 'No' }, { v: true, l: 'Yes' }].map(o => {
              const sel = hasAllergies === o.v;
              return (
                <button key={o.l} type="button" aria-pressed={sel} onClick={() => {
                  setHasAllergies(o.v);
                  if (!o.v) setAllergies([]);
                }} style={{
                  height: 40, border: 'none', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer',
                  background: sel ? C.teal : 'transparent', color: sel ? '#fff' : C.text, fontWeight: sel ? 700 : 500,
                }}>{o.l}</button>
              );
            })}
          </div>
          {hasAllergies === true && (
            <>
              <ChipGroup>
                {ALLERGENS.map(a => (
                  <Chip key={a} label={a} variant="allergy" selected={allergies.includes(a)} onClick={() => setAllergies(p => toggleIn(p, a))} />
                ))}
                {customAllergies.map(a => (
                  <Chip key={a} label={a} variant="allergy" selected onClick={() => setAllergies(p => p.filter(x => x !== a))} />
                ))}
              </ChipGroup>
              <AddRow id="gitk-add-allergy" label="Add another allergy" placeholder="Like strawberries or mustard" onAdd={addUnique(setAllergies)} />
              <div style={{ fontSize: 12, lineHeight: 1.5, color: C.sec }}>
                I will never put these in a plan. Still check labels, just to be safe.
              </div>
            </>
          )}
        </Card>

        <Card title="How does your house eat?" sub="Beliefs, lifestyle, or foods you just skip.">
          <ChipGroup>
            {HOUSE_RULES.map(r => (
              <Chip key={r} label={r} selected={houseRules.includes(r)} onClick={() => toggleHouseRule(r)} />
            ))}
            {customRules.map(r => (
              <Chip key={r} label={r} selected onClick={() => setHouseRules(p => p.filter(x => x !== r))} />
            ))}
          </ChipGroup>
          <AddRow id="gitk-add-rule" label="Add your own" placeholder="Like no spicy food or no mushrooms" onAdd={(v) => setHouseRules(p => {
            const clean = p.filter(x => x !== 'We eat everything');
            return clean.some(x => x.toLowerCase() === v.toLowerCase()) ? clean : [...clean, v];
          })} />
        </Card>

        <Card title="Any health goals?" sub="Optional. I'll lean your meals this way.">
          <ChipGroup>
            {HEALTH_GOALS.map(g => (
              <Chip key={g} label={g} selected={healthGoals.includes(g)} onClick={() => setHealthGoals(p => toggleIn(p, g))} />
            ))}
            {customGoals.map(g => (
              <Chip key={g} label={g} selected onClick={() => setHealthGoals(p => p.filter(x => x !== g))} />
            ))}
          </ChipGroup>
          <AddRow id="gitk-add-goal" label="Add your own" placeholder="Like more fiber or more protein" onAdd={addUnique(setHealthGoals)} />
        </Card>
      </div>
    );
  }

  if (step === 5) {
    const listed = PROTEIN_GROUPS.flatMap(g => g.items);
    const customProteins = proteins.filter(p => !listed.includes(p));
    host = 'Now the good stuff. What proteins actually make it into your cart?';
    title = 'What proteins do you buy?';
    sub = "I'll rotate these so dinner never gets boring.";
    skip = 'Skip, use a mix';
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {PROTEIN_GROUPS.map(group => (
          <div key={group.group} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SectionLabel>{group.group}</SectionLabel>
            <ChipGroup>
              {group.items.map(p => {
                const block = blockedBy(p);
                return (
                  <Chip key={p} label={p} disabled={!!block} note={block}
                    selected={!block && proteins.includes(p)}
                    onClick={() => setProteins(prev => toggleIn(prev, p))} />
                );
              })}
            </ChipGroup>
          </div>
        ))}
        {customProteins.length > 0 && (
          <ChipGroup>
            {customProteins.map(p => (
              <Chip key={p} label={p} selected onClick={() => setProteins(prev => prev.filter(x => x !== p))} />
            ))}
          </ChipGroup>
        )}
        <AddRow id="gitk-add-protein" label="Buy something we didn't list?" placeholder="Like salmon, shrimp, goat, or seitan" onAdd={addUnique(setProteins)} />
      </div>
    );
  }

  if (step === 6) {
    const customTypes = mealTypes.filter(t => !MEAL_TYPES.includes(t));
    host = 'Pick the meals that get clean plates and zero complaints.';
    title = 'What does your crew actually eat?';
    sub = 'Choose as many as you like.';
    skip = 'Surprise me';
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <ChipGroup>
          {MEAL_TYPES.map(t => (
            <Chip key={t} label={t} selected={mealTypes.includes(t)} onClick={() => setMealTypes(p => toggleIn(p, t))} />
          ))}
          {customTypes.map(t => (
            <Chip key={t} label={t} selected onClick={() => setMealTypes(p => p.filter(x => x !== t))} />
          ))}
        </ChipGroup>
        <AddRow id="gitk-add-type" label="Something else your family loves?" placeholder="Like Nigerian, Southern, Mediterranean" startOpen onAdd={addUnique(setMealTypes)} />
      </div>
    );
  }

  if (step === 7) {
    isLast = true;
    host = "You're early, so there's one techy step. This goes away when we officially launch.";
    title = 'One quick beta step';
    sub = 'Paste the key I sent you to turn on the smart features.';
    skip = 'Skip for now';
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ background: C.goldLight, border: `1px solid ${C.gold}`, borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#7A5F1C' }}>For beta testers only</div>
          {['Build My Week plans all 7 days for you', 'Instant recipes for any meal', 'Your personal starter menu'].map(t => (
            <div key={t} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, color: C.text }}>
              <i className="ti ti-check" style={{ fontSize: 18, color: C.teal }} />{t}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label htmlFor="gitk-beta-key" style={{ fontSize: 14, fontWeight: 600, color: C.sec, margin: 0 }}>Your beta key</label>
          <input
            id="gitk-beta-key"
            type="password"
            autoComplete="off"
            value={apiKeyInput}
            onChange={e => setApiKeyInput(e.target.value)}
            placeholder="Paste it here"
            style={{ height: 50, fontSize: 15, borderRadius: 12 }}
          />
          <div style={{ fontSize: 13, color: C.sec }}>Saved only on this device.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="gitk-onb" style={{ minHeight: '100vh', background: C.cream, display: 'flex', justifyContent: 'center' }}>
      <AnimStyles />
      <div style={{ width: '100%', maxWidth: 480, minHeight: '100vh', padding: '20px 24px 0', display: 'flex', flexDirection: 'column', gap: 20, boxSizing: 'border-box' }}>
        {/* Top bar: back + progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button type="button" onClick={back} aria-label="Back" style={{
            width: 44, height: 44, flexShrink: 0, borderRadius: 22, border: 'none', background: C.surface,
            color: C.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 20 }} />
          </button>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 4 }} aria-hidden="true">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: 5, borderRadius: 3, transition: 'background .3s',
                  background: i < step - 1 ? C.teal : i === step - 1 ? C.gold : C.border,
                }} />
              ))}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.sec }}>Step {step} of {TOTAL_STEPS}</div>
          </div>
        </div>

        {/* key={step} restarts the talking animation on every new question */}
        <Host key={step} text={host} />
        <Heading title={title} sub={sub} />

        <div style={{ flex: 1 }}>{body}</div>

        {/* Sticky bottom actions */}
        <div style={{
          position: 'sticky', bottom: 0, background: C.cream, padding: '12px 0 28px',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {isLast
            ? <PrimaryButton onClick={finish}>Build my kitchen</PrimaryButton>
            : <PrimaryButton onClick={next}>Continue</PrimaryButton>}
          {skip && <TextButton onClick={isLast ? finish : next}>{skip}</TextButton>}
        </div>
      </div>
    </div>
  );
}

function Tag({ children }) {
  return (
    <div style={{ padding: '7px 12px', borderRadius: 14, background: C.tealLight, color: C.teal, fontSize: 13, fontWeight: 700 }}>
      {children}
    </div>
  );
}
