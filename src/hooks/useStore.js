import { useState, useCallback, useRef } from 'react';
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

const loadItem = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};

const saveItem = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

export default function useStore() {
  const [meals, _setMeals] = useState(() => loadItem(KEYS.meals, SEED_MEALS));
  const [plans, _setPlans] = useState(() => loadItem(KEYS.plans, { week0: {}, week1: {}, week2: {}, week3: {} }));
  const [pantry, _setPantry] = useState(() => loadItem(KEYS.pantry, []));
  const [budget, _setBudget] = useState(() => loadItem(KEYS.budget, 92));
  const [actuals, _setActuals] = useState(() => loadItem(KEYS.actuals, {}));
  const [apiKey, _setApiKey] = useState(() => localStorage.getItem(KEYS.apiKey) || '');
  const [onboarded, _setOnboarded] = useState(() => loadItem(KEYS.onboarded, false));
  const [prefs, _setPrefs] = useState(() => loadItem(KEYS.prefs, { householdSize: '2', dietary: [], stores: ['Aldi', 'Walmart', 'Costco'] }));
  const [activeWeek, setActiveWeek] = useState(0);

  // Use refs so async functions always see the latest state
  const mealsRef = useRef(meals);
  const plansRef = useRef(plans);
  const pantryRef = useRef(pantry);
  const activeWeekRef = useRef(activeWeek);

  const setMeals = useCallback((v) => {
    const val = typeof v === 'function' ? v(mealsRef.current) : v;
    mealsRef.current = val;
    _setMeals(val);
    saveItem(KEYS.meals, val);
  }, []);

  const setPlans = useCallback((v) => {
    const val = typeof v === 'function' ? v(plansRef.current) : v;
    plansRef.current = val;
    _setPlans(val);
    saveItem(KEYS.plans, val);
  }, []);

  const setPantry = useCallback((v) => {
    const val = typeof v === 'function' ? v(pantryRef.current) : v;
    pantryRef.current = val;
    _setPantry(val);
    saveItem(KEYS.pantry, val);
  }, []);

  const setBudget = useCallback((v) => { _setBudget(v); saveItem(KEYS.budget, v); }, []);
  const setActuals = useCallback((v) => { const val = typeof v === 'function' ? v(actuals) : v; _setActuals(val); saveItem(KEYS.actuals, val); }, [actuals]);
  const setApiKey = useCallback((v) => { _setApiKey(v); localStorage.setItem(KEYS.apiKey, v); }, []);
  const setOnboarded = useCallback((v) => { _setOnboarded(v); saveItem(KEYS.onboarded, v); }, []);
  const setPrefs = useCallback((v) => { const val = typeof v === 'function' ? v(prefs) : v; _setPrefs(val); saveItem(KEYS.prefs, val); }, [prefs]);

  const setActiveWeekAndRef = useCallback((w) => {
    activeWeekRef.current = w;
    setActiveWeek(w);
  }, []);

  const currentPlan = plans['week' + activeWeek] || {};

  // Stable meal operations — always read from ref, never stale
  const addMeal = useCallback((meal) => {
    const newMeal = { id: 'm' + Date.now() + Math.random().toString(36).slice(2), favorite: false, steps: [], prepTime: 0, items: [], ...meal };
    setMeals(prev => [...prev, newMeal]);
    return newMeal.id;
  }, [setMeals]);

  const removeMeal = useCallback((id) => {
    setMeals(prev => prev.filter(m => m.id !== id));
  }, [setMeals]);

  const updateMeal = useCallback((id, updates) => {
    setMeals(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  }, [setMeals]);

  const toggleFavorite = useCallback((id) => {
    setMeals(prev => prev.map(m => m.id === id ? { ...m, favorite: !m.favorite } : m));
  }, [setMeals]);

  // setMealInPlan — reads activeWeekRef so it's always current even inside async loops
  const setMealInPlan = useCallback((day, slot, mealId) => {
    setPlans(prev => {
      const weekKey = 'week' + activeWeekRef.current;
      const week = { ...(prev[weekKey] || {}) };
      week[day] = { ...(week[day] || {}), [slot]: mealId };
      return { ...prev, [weekKey]: week };
    });
  }, [setPlans]);

  // setBulkPlan — sets an entire week's plan at once, avoids loop race conditions
  const setBulkPlan = useCallback((daySlotMap) => {
    setPlans(prev => {
      const weekKey = 'week' + activeWeekRef.current;
      return { ...prev, [weekKey]: daySlotMap };
    });
  }, [setPlans]);

  const clearWeek = useCallback((weekIndex) => {
    setPlans(prev => ({ ...prev, ['week' + weekIndex]: {} }));
  }, [setPlans]);

  const planTotal = useCallback((weekIndex) => {
    const idx = weekIndex !== undefined ? weekIndex : activeWeek;
    const plan = plansRef.current['week' + idx] || {};
    let total = 0;
    Object.values(plan).forEach(day => {
      PLAN_SLOTS.forEach(slot => {
        const meal = mealsRef.current.find(m => m.id === (day && day[slot]));
        if (meal) total += meal.cost;
      });
    });
    return total;
  }, [activeWeek]);

  const monthlyTotal = useCallback(() => {
    return [0, 1, 2, 3].reduce((sum, w) => sum + planTotal(w), 0);
  }, [planTotal]);

  const addPantryItem = useCallback((item) => {
    setPantry(prev => [...prev, { id: 'p' + Date.now(), addedAt: Date.now(), ...item }]);
  }, [setPantry]);

  const removePantryItem = useCallback((id) => {
    setPantry(prev => prev.filter(item => item.id !== id));
  }, [setPantry]);

  const restockPantryItem = useCallback((id, qty) => {
    setPantry(prev => prev.map(item => item.id === id ? { ...item, qty, addedAt: Date.now() } : item));
  }, [setPantry]);

  const apiFetch = useCallback(async (prompt, maxTokens = 1000) => {
    const key = localStorage.getItem(KEYS.apiKey) || '';
    if (!key) throw new Error('No API key');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await res.json();
    const tb = (data.content || []).find(b => b.type === 'text');
    if (!tb) throw new Error('No response');
    return tb.text.trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  }, []);

  return {
    meals, setMeals, addMeal, removeMeal, updateMeal, toggleFavorite,
    plans, setPlans, currentPlan, activeWeek,
    setActiveWeek: setActiveWeekAndRef,
    setMealInPlan, setBulkPlan, clearWeek, planTotal, monthlyTotal,
    pantry, setPantry, addPantryItem, removePantryItem, restockPantryItem,
    budget, setBudget,
    actuals, setActuals,
    apiKey, setApiKey,
    onboarded, setOnboarded,
    prefs, setPrefs,
    apiFetch,
    mealsRef, plansRef, activeWeekRef,
  };
}
