import { useState, useEffect, useCallback } from 'react';
import { SEED_MEALS, DAYS, PLAN_SLOTS } from '../data/meals';

const KEYS = {
  meals: 'gitk_meals',
  plans: 'gitk_plans',
  pantry: 'gitk_pantry',
  budget: 'gitk_budget',
  actuals: 'gitk_actuals',
  apiKey: 'gitk_api_key',
  onboarded: 'gitk_onboarded',
  prefs: 'gitk_prefs',
};

const load = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
};

const save = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

export default function useStore() {
  const [meals, setMealsState] = useState(() => load(KEYS.meals, SEED_MEALS));
  const [plans, setPlansState] = useState(() => load(KEYS.plans, { week0: {}, week1: {}, week2: {}, week3: {} }));
  const [pantry, setPantryState] = useState(() => load(KEYS.pantry, []));
  const [budget, setBudgetState] = useState(() => load(KEYS.budget, 92));
  const [actuals, setActualsState] = useState(() => load(KEYS.actuals, {}));
  const [apiKey, setApiKeyState] = useState(() => localStorage.getItem(KEYS.apiKey) || '');
  const [onboarded, setOnboardedState] = useState(() => load(KEYS.onboarded, false));
  const [prefs, setPrefsState] = useState(() => load(KEYS.prefs, { householdSize: '2', dietary: [], stores: ['Aldi', 'Walmart', 'Costco'] }));
  const [activeWeek, setActiveWeek] = useState(0);

  const setMeals = useCallback((v) => { const val = typeof v === 'function' ? v(meals) : v; setMealsState(val); save(KEYS.meals, val); }, [meals]);
  const setPlans = useCallback((v) => { const val = typeof v === 'function' ? v(plans) : v; setPlansState(val); save(KEYS.plans, val); }, [plans]);
  const setPantry = useCallback((v) => { const val = typeof v === 'function' ? v(pantry) : v; setPantryState(val); save(KEYS.pantry, val); }, [pantry]);
  const setBudget = useCallback((v) => { setBudgetState(v); save(KEYS.budget, v); }, []);
  const setActuals = useCallback((v) => { const val = typeof v === 'function' ? v(actuals) : v; setActualsState(val); save(KEYS.actuals, val); }, [actuals]);
  const setApiKey = useCallback((v) => { setApiKeyState(v); localStorage.setItem(KEYS.apiKey, v); }, []);
  const setOnboarded = useCallback((v) => { setOnboardedState(v); save(KEYS.onboarded, v); }, []);
  const setPrefs = useCallback((v) => { const val = typeof v === 'function' ? v(prefs) : v; setPrefsState(val); save(KEYS.prefs, val); }, [prefs]);

  const currentPlan = plans['week' + activeWeek] || {};

  const setMealInPlan = useCallback((day, slot, mealId) => {
    setPlans(p => {
      const week = { ...(p['week' + activeWeek] || {}) };
      week[day] = { ...(week[day] || {}), [slot]: mealId };
      return { ...p, ['week' + activeWeek]: week };
    });
  }, [activeWeek, setPlans]);

  const clearWeek = useCallback((weekIndex) => {
    setPlans(p => ({ ...p, ['week' + weekIndex]: {} }));
  }, [setPlans]);

  const planTotal = useCallback((weekIndex = activeWeek) => {
    const plan = plans['week' + weekIndex] || {};
    let total = 0;
    Object.values(plan).forEach(day => {
      PLAN_SLOTS.forEach(slot => {
        const meal = meals.find(m => m.id === (day && day[slot]));
        if (meal) total += meal.cost;
      });
    });
    return total;
  }, [plans, meals, activeWeek]);

  const monthlyTotal = useCallback(() => {
    return [0, 1, 2, 3].reduce((sum, w) => sum + planTotal(w), 0);
  }, [planTotal]);

  const toggleFavorite = useCallback((id) => {
    setMeals(m => m.map(meal => meal.id === id ? { ...meal, favorite: !meal.favorite } : meal));
  }, [setMeals]);

  const addMeal = useCallback((meal) => {
    setMeals(m => [...m, { id: 'm' + Date.now(), favorite: false, steps: [], prepTime: 0, items: [], ...meal }]);
  }, [setMeals]);

  const removeMeal = useCallback((id) => {
    setMeals(m => m.filter(meal => meal.id !== id));
  }, [setMeals]);

  const updateMeal = useCallback((id, updates) => {
    setMeals(m => m.map(meal => meal.id === id ? { ...meal, ...updates } : meal));
  }, [setMeals]);

  const addPantryItem = useCallback((item) => {
    setPantry(p => [...p, { id: 'p' + Date.now(), addedAt: Date.now(), ...item }]);
  }, [setPantry]);

  const removePantryItem = useCallback((id) => {
    setPantry(p => p.filter(item => item.id !== id));
  }, [setPantry]);

  const restockPantryItem = useCallback((id, qty) => {
    setPantry(p => p.map(item => item.id === id ? { ...item, qty, addedAt: Date.now() } : item));
  }, [setPantry]);

  const apiFetch = useCallback(async (prompt, maxTokens = 1000) => {
    if (!apiKey) throw new Error('No API key');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await res.json();
    const tb = (data.content || []).find(b => b.type === 'text');
    if (!tb) throw new Error('No response');
    return tb.text.trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  }, [apiKey]);

  return {
    meals, setMeals, addMeal, removeMeal, updateMeal, toggleFavorite,
    plans, setPlans, currentPlan, activeWeek, setActiveWeek,
    setMealInPlan, clearWeek, planTotal, monthlyTotal,
    pantry, setPantry, addPantryItem, removePantryItem, restockPantryItem,
    budget, setBudget,
    actuals, setActuals,
    apiKey, setApiKey,
    onboarded, setOnboarded,
    prefs, setPrefs,
    apiFetch,
  };
}
