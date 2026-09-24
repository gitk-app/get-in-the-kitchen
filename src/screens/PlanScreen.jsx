// GET IN THE KITCHEN - PlanScreen v2.2 (food safety rules)
import React, { useState, useCallback } from 'react';
import { Icon, Sheet, Button, Banner, BudgetBar, Pill, SectionLabel, EmptyState, StepNumber } from '../components/UI';
import { DAYS, PLAN_SLOTS, PROTEIN_OPTIONS } from '../data/meals';

// Fetch food photo from Pexels
async function fetchMealImage(mealName, apiKey) {
  if (!apiKey) return null;
  try {
    const query = encodeURIComponent(mealName + ' food');
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${query}&per_page=5&orientation=landscape`,
      { headers: { Authorization: apiKey } }
    );
    const data = await res.json();
    const photos = data.photos || [];
    if (!photos.length) return null;
    const top = photos.slice(0, 3);
    const pick = top[Math.floor(Math.random() * top.length)];
    return pick.src?.medium || null;
  } catch { return null; }
}


// ---------------------------------------------------------------------------
// Food safety rules. Reads both the new onboarding labels and older setting ids
// so every AI prompt respects allergies, house rules, and health goals.
// ---------------------------------------------------------------------------
const ALLERGY_TEXT = {
  'peanuts': 'peanuts, peanut butter, peanut oil',
  'tree nuts': 'almonds, walnuts, pecans, cashews, pistachios, hazelnuts, and any tree nut',
  'shellfish': 'shrimp, crab, lobster, crawfish, scallops, clams, mussels, oysters',
  'fish': 'all fish, fish sauce, anchovies',
  'eggs': 'eggs and anything made with eggs, including mayonnaise',
  'milk or dairy': 'milk, cheese, butter, cream, sour cream, yogurt',
  'wheat or gluten': 'wheat, flour, bread, pasta, flour tortillas, regular soy sauce',
  'soy': 'soy, soy sauce, tofu, edamame, soybean oil',
  'sesame': 'sesame seeds, sesame oil, tahini',
};

const ALLERGY_WORDS = {
  'peanuts': ['peanut'],
  'tree nuts': ['almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut'],
  'shellfish': ['shrimp', 'crab', 'lobster', 'crawfish', 'scallop', 'clam', 'mussel', 'oyster', 'shellfish'],
  'fish': ['fish', 'salmon', 'tuna', 'tilapia', 'cod', 'whiting', 'catfish'],
  'eggs': ['egg'],
  'milk or dairy': ['cheese', 'milk', 'yogurt', 'cream', 'butter'],
  'wheat or gluten': ['pasta', 'bread', 'sandwich', 'toast', 'wrap', 'noodle', 'pancake', 'waffle'],
  'soy': ['tofu', 'soy', 'edamame'],
  'sesame': ['sesame', 'tahini'],
};

// Old setting ids and new onboarding labels both land here (lowercased)
const RULE_TEXT = {
  'vegetarian': 'all meat, poultry, fish, and seafood',
  'vegan': 'all meat, poultry, fish, seafood, dairy, eggs, and honey',
  'seafood, no meat': 'all meat and poultry (fish and seafood are fine)',
  'no pork': 'pork, ham, bacon, pork sausage', 'no-pork': 'pork, ham, bacon, pork sausage',
  'no red meat': 'beef, pork, lamb, ham, bacon',
  'no-beef': 'beef, ground beef, steak, roast beef, pot roast, burgers',
  'no-seafood': 'fish, seafood, shrimp',
  'halal': 'pork, bacon, ham, alcohol, and any non-halal meat',
  'kosher': 'pork, shellfish, and mixing meat with dairy',
  'gluten-free': 'gluten, wheat, bread, pasta', 'gluten free': 'gluten, wheat, bread, pasta',
  'dairy-free': 'dairy, cheese, milk, butter', 'dairy free': 'dairy, cheese, milk, butter',
};

const RULE_WORDS = {
  'vegetarian': ['chicken', 'beef', 'pork', 'turkey', 'sausage', 'lamb', 'fish', 'shrimp', 'bacon', 'ham'],
  'vegan': ['chicken', 'beef', 'pork', 'turkey', 'sausage', 'lamb', 'fish', 'shrimp', 'bacon', 'ham', 'egg', 'cheese', 'milk', 'yogurt'],
  'seafood, no meat': ['chicken', 'beef', 'pork', 'turkey', 'sausage', 'lamb', 'bacon', 'ham'],
  'no pork': ['pork', 'bacon', 'ham'], 'no-pork': ['pork', 'bacon', 'ham'],
  'no red meat': ['beef', 'pork', 'lamb', 'bacon', 'ham', 'steak', 'burger'],
  'no-beef': ['beef', 'steak', 'burger'],
  'no-seafood': ['fish', 'shrimp', 'salmon', 'tuna'],
  'halal': ['pork', 'bacon', 'ham'],
  'kosher': ['pork', 'bacon', 'ham', 'shrimp', 'crab', 'lobster'],
};

function getDietRules(prefs) {
  const allergies = (prefs?.allergies || []).map(a => String(a));
  const raw = [...(prefs?.houseRules || []), ...(prefs?.dietary || [])]
    .map(d => String(d))
    .filter(d => !/ allergy$/i.test(d) && d.toLowerCase() !== 'we eat everything');
  const seen = new Set();
  const rules = raw.filter(r => { const k = r.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  const goals = (prefs?.healthGoals || []).map(g => String(g));

  const allergyList = allergies.map(a => ALLERGY_TEXT[a.toLowerCase()] || a);
  const avoidList = rules.map(r => RULE_TEXT[r.toLowerCase()] || r);
  const blockWords = [
    ...allergies.flatMap(a => ALLERGY_WORDS[a.toLowerCase()] || [a.toLowerCase()]),
    ...rules.flatMap(r => RULE_WORDS[r.toLowerCase()] || []),
  ];

  const allergyStr = allergyList.length ? allergyList.join('; ') : '';
  const lines = [];
  if (allergyStr) {
    lines.push(`FOOD ALLERGIES (life-safety rule, overrides everything else): never include ${allergyStr}. This includes sauces, oils, marinades, broths, garnishes, and pre-made ingredients. If an ingredient might contain an allergen, leave it out.`);
  }
  if (avoidList.length) {
    lines.push(`HOUSE RULES (strict, never break): do not use ${avoidList.join('; ')}.`);
  }
  if (goals.length) {
    lines.push(`HEALTH GOALS (lean meals this way, not a hard rule): ${goals.join(', ')}.`);
  }
  return { allergies, rules, goals, avoidList, blockWords, guard: lines.join('\n') };
}

function mealIsBlocked(meal, blockWords) {
  if (!blockWords.length) return false;
  const text = [meal.name || '', meal.protein || '', ...(meal.items || []).map(i => i.n || '')].join(' ').toLowerCase();
  return blockWords.some(w => text.includes(w));
}

function parseJson(text) {
  const clean = String(text || '').replace(/```json|```/g, '').trim();
  try { return JSON.parse(clean); } catch (e) { /* try to trim extra text */ }
  const firstObj = clean.indexOf('{'); const firstArr = clean.indexOf('[');
  const useArr = firstArr !== -1 && (firstObj === -1 || firstArr < firstObj);
  const start = useArr ? firstArr : firstObj;
  const end = useArr ? clean.lastIndexOf(']') : clean.lastIndexOf('}');
  return JSON.parse(clean.slice(start, end + 1));
}

const getMostRecentSunday = () => {
  const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d;
};
const getWeekStart = (w) => {
  const d = getMostRecentSunday(); d.setDate(d.getDate() + w * 7); return d;
};
const formatRange = (w) => {
  const s = getWeekStart(w), e = new Date(s); e.setDate(s.getDate() + 6);
  const o = { month: 'short', day: 'numeric', year: 'numeric' };
  return s.toLocaleDateString('en-US', o) + ' - ' + e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
const daysOld = (t) => Math.floor((Date.now() - t) / 86400000);

export default function PlanScreen({ store }) {
  const { meals, currentPlan, activeWeek, setActiveWeek, setMealInPlan, setBulkPlan, clearWeek,
    planTotal, monthlyTotal, budget, pantry, apiFetch, addMeal, updateMeal, prefs, unsplashKey } = store;

  const [picker, setPicker] = useState(null);
  const [browseAll, setBrowseAll] = useState(false);
  const [manualEntry, setManualEntry] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [recipeView, setRecipeView] = useState(null);
  const [stepsStatus, setStepsStatus] = useState({}); // mealId -> 'loading' | 'error'
  const [wizard, setWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardProteins, setWizardProteins] = useState(() => prefs?.proteins || []);
  const [wizardLeftovers, setWizardLeftovers] = useState('1-2');
  const [wizardBusyNights, setWizardBusyNights] = useState('Tuesday, Wednesday, Thursday, Friday');
  const [wizardLocked, setWizardLocked] = useState('');
  const [building, setBuilding] = useState(false);
  const [aiPicks, setAiPicks] = useState({});
  const [confirmClear, setConfirmClear] = useState(false);

  const diet = getDietRules(prefs);
  const total = planTotal();
  const mTotal = monthlyTotal();
  const mBudget = prefs?.monthlyBudget || budget * 4;
  const weeklyBudget = Math.round(mBudget / 4);
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
    const prompt = `Suggest 3 budget-friendly ${slot} meal ideas. ${pList.length ? 'Pantry: ' + pList.join(', ') + '.' : ''} Simple, family-friendly. Skip these: ${existing}.${diet.guard ? '\n' + diet.guard + '\n' : ' '}JSON only: [{"name":"","cost":0,"protein":"none"}]`;
    try {
      const text = await apiFetch(prompt, 300);
      const parsed = parseJson(text);
      const safe = parsed.filter(x => !mealIsBlocked(x, diet.blockWords));
      setAiPicks(p => ({ ...p, [key]: safe.map((x, i) => ({ ...x, id: 'aip-' + Date.now() + i })) }));
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

  // Writes recipe steps. Retries once, and shows an error instead of failing silently.
  const generateSteps = async (id, name, slot, attempt = 1) => {
    setStepsStatus(s => ({ ...s, [id]: 'loading' }));
    const prompt = `Simple home-cook recipe for "${name}" (${slot}). Practical, budget-friendly.
Write 5 to 7 short steps, each under 25 words.${diet.guard ? '\n' + diet.guard : ''}
Respond ONLY with JSON, no other text: {"prepTime":20,"steps":["step 1","step 2","step 3"]}`;
    try {
      const text = await apiFetch(prompt, 1200);
      const recipe = parseJson(text);
      const steps = Array.isArray(recipe.steps) ? recipe.steps.filter(Boolean) : [];
      if (!steps.length) throw new Error('No steps returned');
      updateMeal(id, { steps, prepTime: recipe.prepTime || 20 });
      setStepsStatus(s => { const n = { ...s }; delete n[id]; return n; });
    } catch (e) {
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 2500));
        return generateSteps(id, name, slot, attempt + 1);
      }
      console.warn('Could not write steps for', name, e);
      setStepsStatus(s => ({ ...s, [id]: 'error' }));
    }
  };

  const buildWeek = async () => {
    setBuilding(true);
    const pList = pantry.map(p => p.qty ? p.name + ' (' + p.qty + ')' : p.name);
    const currentMeals = store.mealsRef.current;

    // Proteins for this week, minus anything blocked by an allergy or house rule
    const safeProteins = wizardProteins.filter(p => !diet.blockWords.some(w => p.toLowerCase().includes(w)));
    const selectedText = safeProteins.join(' ').toLowerCase() + (safeProteins.some(p => /shellfish/i.test(p)) ? ' shrimp' : '');

    // Only pass library meals that are safe and match this week's proteins
    const filteredMeals = currentMeals.filter(m => {
      if (mealIsBlocked(m, diet.blockWords)) return false;
      if (!m.protein || m.protein === 'none') return true;
      if (!safeProteins.length) return true;
      const mProtein = m.protein.toLowerCase();
      return selectedText.includes(mProtein) || safeProteins.some(sp => mProtein.includes(sp.toLowerCase()));
    });
    const myMeals = filteredMeals.map(m => `${m.name} (${m.slot}, $${(m.cost || 0).toFixed(2)})`).join('; ');
    const proteins = safeProteins.length ? safeProteins.join(', ') : 'a variety of affordable everyday proteins';

    const mealTypes = prefs?.mealTypes?.length ? prefs.mealTypes : [];
    const householdSize = prefs?.householdSize || '2-3';

    // Proteins NOT picked this week (only when she picked some)
    const skipProteins = [];
    if (safeProteins.length) {
      ['beef', 'pork', 'chicken', 'turkey', 'fish', 'shrimp', 'lamb', 'sausage'].forEach(p => {
        if (!selectedText.includes(p)) skipProteins.push(p);
      });
    }

    const mealTypeStr = mealTypes.length ? mealTypes.join(', ') : 'American home cooking';
    const safetyBlock = [
      diet.guard,
      skipProteins.length ? `PROTEINS NOT PICKED THIS WEEK (do not use): ${skipProteins.join(', ')}.` : '',
    ].filter(Boolean).join('\n') || 'No restrictions given.';

    const prompt = `You are meal planning for a busy working mom who batch cooks. Build a smart 7-day plan where meals connect to each other.

HOUSEHOLD SIZE: ${householdSize} people
PROTEINS SELECTED: ${proteins}
MEAL STYLE PREFERENCES: ${mealTypeStr}
BUSY NIGHTS (quick meals only, max 20 min): ${wizardBusyNights}
LOCKED MEALS: ${wizardLocked || 'none'}
LEFTOVERS NIGHTS: ${wizardLeftovers}
PANTRY ON HAND: ${pList.length ? pList.join(', ') : 'not specified'}
MY SAVED MEALS: ${myMeals || 'none yet'}

DIETARY RULES, STRICTLY REQUIRED, NEVER VIOLATE THESE:
${safetyBlock}
${safeProteins.length ? 'Only use proteins listed in PROTEINS SELECTED above.' : ''}

BATCH COOKING RULES - this is the most important part:
1. Sunday dinner = the BIG COOK. Pick ONE protein from PROTEINS SELECTED only and make a large batch. Set batchCook:true and batchProtein to the protein name.
2. Monday and Tuesday meals should USE the Sunday batch in different forms. Set fromBatch:true and batchSource:"Sunday dinner".
3. If a second protein is selected, Wednesday dinner = second small cook using that protein. Set batchCook:true.
4. Thursday and Friday busy nights = leftovers OR ultra-quick meals (quesadillas, eggs, grilled cheese). Set fromBatch:true if using leftovers.
5. Saturday = flexible, slightly more effort if desired.

MEAL SIMPLICITY RULES:
- Breakfast: eggs, oatmeal, yogurt, toast. Fast. Under 15 min.
- Lunch: leftovers, wrap, sandwich, salad. Under 10 min.
- Dinner on busy nights: leftovers, quesadillas, eggs, grilled cheese ONLY.
- NO gourmet meals. Simple plain names only. "Baked chicken thighs" not "herb-crusted chicken".
- Repeating meals is fine and realistic.
- Use meals from my saved library whenever possible.
- Scale all meals for ${householdSize} people.

Set isNew:true for meals not in my saved library.
Respond ONLY with this exact JSON structure, no other text:
{"Sunday":{"Breakfast":{"name":"","isNew":false,"batchCook":false,"fromBatch":false,"batchSource":"","batchProtein":""},"Lunch":{"name":"","isNew":false,"batchCook":false,"fromBatch":false,"batchSource":"","batchProtein":""},"Dinner":{"name":"","isNew":false,"batchCook":false,"fromBatch":false,"batchSource":"","batchProtein":""}},"Monday":{"Breakfast":{"name":"","isNew":false,"batchCook":false,"fromBatch":false,"batchSource":"","batchProtein":""},"Lunch":{"name":"","isNew":false,"batchCook":false,"fromBatch":false,"batchSource":"","batchProtein":""},"Dinner":{"name":"","isNew":false,"batchCook":false,"fromBatch":false,"batchSource":"","batchProtein":""}},"Tuesday":{"Breakfast":{"name":"","isNew":false,"batchCook":false,"fromBatch":false,"batchSource":"","batchProtein":""},"Lunch":{"name":"","isNew":false,"batchCook":false,"fromBatch":false,"batchSource":"","batchProtein":""},"Dinner":{"name":"","isNew":false,"batchCook":false,"fromBatch":false,"batchSource":"","batchProtein":""}},"Wednesday":{"Breakfast":{"name":"","isNew":false,"batchCook":false,"fromBatch":false,"batchSource":"","batchProtein":""},"Lunch":{"name":"","isNew":false,"batchCook":false,"fromBatch":false,"batchSource":"","batchProtein":""},"Dinner":{"name":"","isNew":false,"batchCook":false,"fromBatch":false,"batchSource":"","batchProtein":""}},"Thursday":{"Breakfast":{"name":"","isNew":false,"batchCook":false,"fromBatch":false,"batchSource":"","batchProtein":""},"Lunch":{"name":"","isNew":false,"batchCook":false,"fromBatch":false,"batchSource":"","batchProtein":""},"Dinner":{"name":"","isNew":false,"batchCook":false,"fromBatch":false,"batchSource":"","batchProtein":""}},"Friday":{"Breakfast":{"name":"","isNew":false,"batchCook":false,"fromBatch":false,"batchSource":"","batchProtein":""},"Lunch":{"name":"","isNew":false,"batchCook":false,"fromBatch":false,"batchSource":"","batchProtein":""},"Dinner":{"name":"","isNew":false,"batchCook":false,"fromBatch":false,"batchSource":"","batchProtein":""}},"Saturday":{"Breakfast":{"name":"","isNew":false,"batchCook":false,"fromBatch":false,"batchSource":"","batchProtein":""},"Lunch":{"name":"","isNew":false,"batchCook":false,"fromBatch":false,"batchSource":"","batchProtein":""},"Dinner":{"name":"","isNew":false,"batchCook":false,"fromBatch":false,"batchSource":"","batchProtein":""}}}`;
    try {
      const text = await apiFetch(prompt, 2000);
      const weekPlan = parseJson(text);

      const newMealRecords = [];
      const newPlan = {};

      DAYS.forEach(day => {
        newPlan[day] = {};
        PLAN_SLOTS.forEach(slot => {
          const entry = weekPlan[day]?.[slot];
          const name = typeof entry === 'string' ? entry : entry?.name || '';
          if (!name) return;
          const batchCook = entry?.batchCook || false;
          const fromBatch = entry?.fromBatch || false;
          const batchSource = entry?.batchSource || '';
          const batchProtein = entry?.batchProtein || '';
          const lib = store.mealsRef.current;
          let match = lib.find(m => m.name.toLowerCase() === name.toLowerCase() && m.slot === slot);
          if (!match) match = lib.find(m => m.name.toLowerCase().includes(name.toLowerCase().split(' ')[0]) && m.slot === slot);
          if (match) {
            // Update existing meal with batch flags
            if (batchCook || fromBatch) {
              store.setMeals(prev => prev.map(m => m.id === match.id ? { ...m, batchCook, fromBatch, batchSource, batchProtein } : m));
            }
            newPlan[day][slot] = match.id;
          } else {
            const newId = 'm' + Date.now() + '-' + day + '-' + slot + '-' + Math.random().toString(36).slice(2, 6);
            const nm = { id: newId, name, slot, cost: 0, protein: 'none', items: [], steps: [], prepTime: 20, favorite: false, batchCook, fromBatch, batchSource, batchProtein };
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
      // Spaced out so the AI is not flooded with requests all at once
      newMealRecords.forEach((m, i) => {
        setTimeout(() => generateSteps(m.id, m.name, m.slot), i * 1500);
      });

      // Fetch photos for ALL meals in the plan in the background
      if (unsplashKey) {
        const allPlannedMeals = Object.values(newPlan).flatMap(day => Object.values(day));
        const uniqueIds = [...new Set(allPlannedMeals)];
        const allMeals = [...store.mealsRef.current, ...newMealRecords];

        // Stagger requests so we don't hammer the API
        uniqueIds.forEach((id, i) => {
          const meal = allMeals.find(m => m.id === id);
          if (!meal || meal.image) return;
          setTimeout(() => {
            fetchMealImage(meal.name, unsplashKey).then(url => {
              if (url) updateMeal(id, { image: url });
            });
          }, i * 300); // 300ms between each request
        });
      }
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
          <BudgetBar spent={total} budget={weeklyBudget} />
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

        {/* Welcome banner - shown when week is empty */}
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
              Your week is empty and ready to plan. Tap <strong>Build my week</strong> above and Claude will fill it in based on your budget and preferences - takes about 30 seconds.
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
                            {/* Full cell photo */}
                            {meal.image && (
                              <img src={meal.image} alt={meal.name}
                                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={e => e.target.style.display = 'none'}
                              />
                            )}
                            {/* Dark gradient overlay */}
                            <div style={{ position: 'absolute', inset: 0, background: meal.image ? 'linear-gradient(to bottom, transparent 20%, rgba(0,0,0,0.65) 100%)' : 'transparent' }} />
                            {/* Content overlay */}
                            <div style={{ position: 'absolute', inset: 0, padding: '6px 6px 4px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
                              onClick={() => {
                                setRecipeView(meal.id);
                                if (unsplashKey && !meal.image) {
                                  fetchMealImage(meal.name, unsplashKey).then(url => { if (url) updateMeal(meal.id, { image: url }); });
                                }
                              }}>
                              <div style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.2, color: meal.image ? '#fff' : 'var(--text)', marginBottom: 2, textShadow: meal.image ? '0 1px 3px rgba(0,0,0,0.8)' : 'none' }}>{meal.name}</div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                  {meal.batchCook && (
                                    <span style={{ fontSize: 8, color: '#7A5A10', background: 'rgba(255,250,239,0.95)', border: '0.5px solid #C9A84C', borderRadius: 3, padding: '1px 4px', fontWeight: 700 }}>🍳 BATCH</span>
                                  )}
                                  {meal.fromBatch && meal.batchSource && (
                                    <span style={{ fontSize: 8, color: '#0A5A45', background: 'rgba(232,245,241,0.95)', border: '0.5px solid #7EC8B5', borderRadius: 3, padding: '1px 4px', fontWeight: 600 }}>↩ {meal.batchSource.replace(' dinner', '')}</span>
                                  )}
                                </div>
                                <span className="meal-cell-change" style={{ background: 'rgba(255,255,255,0.9)', flexShrink: 0 }} onClick={e => { e.stopPropagation(); openPicker(day, slot); }}>swap</span>
                              </div>
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
                {stepsStatus[recipe.id] === 'loading' ? (
                  <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>Writing the steps, give me a few seconds...</p>
                ) : (
                  <>
                    <p className="text-sm mb-8" style={{ color: stepsStatus[recipe.id] === 'error' ? 'var(--danger)' : 'var(--text-secondary)' }}>
                      {stepsStatus[recipe.id] === 'error'
                        ? "Couldn't write the steps that time. Check your beta key in Settings, then try again."
                        : 'No recipe steps yet.'}
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => generateSteps(recipe.id, recipe.name, recipe.slot)}>
                      <Icon name="sparkles" size={14} /> {stepsStatus[recipe.id] === 'error' ? 'Try again' : 'Generate steps'}
                    </Button>
                  </>
                )}
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
                        {group.items.filter(p => !diet.blockWords.some(w => p.toLowerCase().includes(w))).map(p => (
                          <Pill key={p} selected={wizardProteins.includes(p)} onClick={() => toggleProtein(p)}>{p}</Pill>
                        ))}
                      </div>
                    </div>
                  ))}
                  {(() => {
                    const listed = PROTEIN_OPTIONS.flatMap(g => g.items);
                    const extras = (prefs?.proteins || []).filter(p => !listed.includes(p) && !diet.blockWords.some(w => p.toLowerCase().includes(w)));
                    if (!extras.length) return null;
                    return (
                      <div className="mb-12">
                        <SectionLabel>Your usual proteins</SectionLabel>
                        <div className="pill-group">
                          {extras.map(p => (
                            <Pill key={p} selected={wizardProteins.includes(p)} onClick={() => toggleProtein(p)}>{p}</Pill>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  {(diet.allergies.length > 0 || diet.rules.length > 0) && (
                    <p className="text-sm" style={{ marginTop: 4 }}>
                      Leaving out {[...diet.allergies, ...diet.rules].join(', ').toLowerCase()} every time.
                    </p>
                  )}
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
                    {[['0', 'None'], ['1-2', '1-2 nights'], ['3+', '3+ nights']].map(([val, label]) => (
                      <Pill key={val} selected={wizardLeftovers === val} onClick={() => setWizardLeftovers(val)}>{label}</Pill>
                    ))}
                  </div>
                </div>
                <div className="divider" />
                <div className="mb-16">
                  <h3 style={{ marginBottom: 4 }}>4. Anything already locked in?</h3>
                  <p className="text-sm mb-8">Optional - e.g. "Tuesday dinner is breakfast for dinner"</p>
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
