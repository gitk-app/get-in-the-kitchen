import { useState, useCallback, useRef } from 'react';
import { SEED_MEALS, DAYS, PLAN_SLOTS } from '../data/meals';

const KEYS = {
  meals: 'gitk_meals',
  plans: 'gitk_plans',
  pantry: 'gitk_pantry',
  budget: 'gitk_budget',
  actuals: 'gitk_actuals',
  apiKey: 'gitk_api_key',
  unsplashKey: 'gitk_unsplash_key',
  onboarded: 'gitk_onboarded',
  betaCode: 'gitk_beta_code',
  prefs: 'gitk_prefs',
};

const PANTRY_LOG_KEY = 'gitk_pantry_log';
const DAY = 86400000;

// Days since the timer last started (bought or restocked)
export const pantryAge = (item) => Math.floor((Date.now() - (item.addedAt || Date.now())) / DAY);

const isFresh = (item) => item.type === 'fresh' || (item.fresh && item.type !== 'frozen');
const isShelf = (item) => item.type === 'shelf' || (!item.fresh && item.type !== 'frozen' && item.type !== 'fresh');

// Should the app ask "still have this?" Fresh items: every 3 days.
// Shelf items: after 18 days. "Still good" pushes the next ask back.
export const pantryNeedsCheck = (item) => {
  const since = Math.floor((Date.now() - (item.checkedAt || item.addedAt || Date.now())) / DAY);
  if (isFresh(item)) return since >= 3;
  if (isShelf(item)) return since >= 18;
  return false;
};

// Keeps a simple record of used and tossed food for future waste stats
const logPantryAction = (item, action) => {
  try {
    const log = JSON.parse(localStorage.getItem(PANTRY_LOG_KEY) || '[]');
    log.unshift({ name: item.name, qty: item.qty || '', category: item.category || '', action, at: Date.now(), age: pantryAge(item) });
    localStorage.setItem(PANTRY_LOG_KEY, JSON.stringify(log.slice(0, 1000)));
  } catch {}
};

const sameName = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

// A tester can open gettinginthekitchen.com/?code=KITCHEN2026 and the code
// is saved automatically, then removed from the address bar.
const readCodeFromLink = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = (params.get('code') || '').trim();
    if (code) {
      localStorage.setItem('gitk_beta_code', code);
      params.delete('code');
      const rest = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (rest ? '?' + rest : '') + window.location.hash);
    }
  } catch {}
  return localStorage.getItem('gitk_beta_code') || '';
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
  const [unsplashKey, _setUnsplashKey] = useState(() => localStorage.getItem(KEYS.unsplashKey) || '');
  const [betaCode, _setBetaCode] = useState(readCodeFromLink);
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
  const setUnsplashKey = useCallback((v) => { _setUnsplashKey(v); localStorage.setItem(KEYS.unsplashKey, v); }, []);
  const setBetaCode = useCallback((v) => { const c = String(v || '').trim(); _setBetaCode(c); localStorage.setItem(KEYS.betaCode, c); }, []);

  // Smart features work with a beta access code (no keys needed) or a personal key
  const hasAI = Boolean(betaCode || apiKey);
  const hasPhotos = Boolean(betaCode || unsplashKey);
  const setOnboarded = useCallback((v) => { _setOnboarded(v); saveItem(KEYS.onboarded, v); }, []);
  const setPrefs = useCallback((v) => { const val = typeof v === 'function' ? v(prefs) : v; _setPrefs(val); saveItem(KEYS.prefs, val); }, [prefs]);

  const setActiveWeekAndRef = useCallback((w) => {
    activeWeekRef.current = w;
    setActiveWeek(w);
  }, []);

  const currentPlan = plans['week' + activeWeek] || {};

  // Stable meal operations - always read from ref, never stale
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

  // setMealInPlan - reads activeWeekRef so it's always current even inside async loops
  const setMealInPlan = useCallback((day, slot, mealId) => {
    setPlans(prev => {
      const weekKey = 'week' + activeWeekRef.current;
      const week = { ...(prev[weekKey] || {}) };
      week[day] = { ...(week[day] || {}), [slot]: mealId };
      return { ...prev, [weekKey]: week };
    });
  }, [setPlans]);

  // setBulkPlan - sets an entire week's plan at once, avoids loop race conditions
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

  // Adding something she already has restocks it instead of making a duplicate.
  // Returns 'restocked' or 'added' so screens can say which happened.
  const addPantryItem = useCallback((item) => {
    const existing = pantryRef.current.find(p => sameName(p.name, item.name));
    if (existing) {
      setPantry(prev => prev.map(p => p.id === existing.id ? {
        ...p,
        ...item,
        id: p.id,
        qty: item.qty || p.qty,
        addedAt: Date.now(),
        checkedAt: undefined,
      } : p));
      return 'restocked';
    }
    setPantry(prev => [...prev, { id: 'p' + Date.now() + Math.random().toString(36).slice(2, 6), addedAt: Date.now(), ...item }]);
    return 'added';
  }, [setPantry]);

  const removePantryItem = useCallback((id) => {
    setPantry(prev => prev.filter(item => item.id !== id));
  }, [setPantry]);

  // Bought more: timer starts over today
  const restockPantryItem = useCallback((id, qty) => {
    setPantry(prev => prev.map(item => item.id === id ? { ...item, qty: qty ?? item.qty, addedAt: Date.now(), checkedAt: undefined } : item));
  }, [setPantry]);

  // Still have it and it's fine: keep the real age, just stop asking for a few days
  const confirmPantryItem = useCallback((id) => {
    setPantry(prev => prev.map(item => item.id === id ? { ...item, checkedAt: Date.now() } : item));
  }, [setPantry]);

  // Ate it all: remove it and note it was used
  const markPantryUsedUp = useCallback((id) => {
    const item = pantryRef.current.find(p => p.id === id);
    if (item) logPantryAction(item, 'used');
    setPantry(prev => prev.filter(p => p.id !== id));
    return item || null;
  }, [setPantry]);

  // Went bad: remove it and note it was tossed
  const tossPantryItem = useCallback((id) => {
    const item = pantryRef.current.find(p => p.id === id);
    if (item) logPantryAction(item, 'tossed');
    setPantry(prev => prev.filter(p => p.id !== id));
    return item || null;
  }, [setPantry]);

  // Sends a request to Claude. With a beta code it goes through the app's own
  // server (/api/claude), which holds the real key. A personal key still works too.
  const callClaude = useCallback(async (messages, maxTokens = 1000) => {
    const code = localStorage.getItem(KEYS.betaCode) || '';
    const key = localStorage.getItem(KEYS.apiKey) || '';
    let data = null;

    if (code) {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-gitk-code': code },
        body: JSON.stringify({ messages, max_tokens: maxTokens }),
      });
      if (res.status === 401 && !key) throw new Error('bad_code');
      if (res.ok) data = await res.json();
      else if (!key) throw new Error('AI request failed (' + res.status + ')');
    }

    if (!data && key) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: maxTokens, messages }),
      });
      data = await res.json();
    }

    if (!data) throw new Error('No access code');
    const tb = (data.content || []).find(b => b.type === 'text');
    if (!tb) throw new Error('No response');
    return tb.text.trim();
  }, []);

  const apiFetch = useCallback(async (prompt, maxTokens = 1000) => {
    const text = await callClaude([{ role: 'user', content: prompt }], maxTokens);
    return text.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  }, [callClaude]);

  // Finds a food photo. Returns an image address or null.
  const fetchPhoto = useCallback(async (query) => {
    const code = localStorage.getItem(KEYS.betaCode) || '';
    const key = localStorage.getItem(KEYS.unsplashKey) || '';
    try {
      if (code) {
        const res = await fetch('/api/photos?q=' + encodeURIComponent(query), { headers: { 'x-gitk-code': code } });
        if (res.ok) {
          const data = await res.json();
          if (data.url) return data.url;
        }
      }
      if (key) {
        const res = await fetch(
          'https://api.pexels.com/v1/search?query=' + encodeURIComponent(query) + '&per_page=5&orientation=landscape',
          { headers: { Authorization: key } }
        );
        const data = await res.json();
        const top = (data.photos || []).slice(0, 3);
        if (!top.length) return null;
        return top[Math.floor(Math.random() * top.length)].src?.medium || null;
      }
    } catch {}
    return null;
  }, []);

  // Checks a beta code with the server. Returns { ok, ai, photos }.
  const checkBetaCode = useCallback(async (code) => {
    try {
      const res = await fetch('/api/check', { headers: { 'x-gitk-code': String(code || '').trim() } });
      const data = await res.json();
      return { ok: res.ok && data.ok, ai: !!data.ai, photos: !!data.photos };
    } catch {
      return { ok: false, offline: true };
    }
  }, []);

  return {
    meals, setMeals, addMeal, removeMeal, updateMeal, toggleFavorite,
    plans, setPlans, currentPlan, activeWeek,
    setActiveWeek: setActiveWeekAndRef,
    setMealInPlan, setBulkPlan, clearWeek, planTotal, monthlyTotal,
    pantry, setPantry, addPantryItem, removePantryItem, restockPantryItem,
    confirmPantryItem, markPantryUsedUp, tossPantryItem,
    budget, setBudget,
    actuals, setActuals,
    apiKey, setApiKey, unsplashKey, setUnsplashKey,
    betaCode, setBetaCode, checkBetaCode, hasAI, hasPhotos,
    onboarded, setOnboarded,
    prefs, setPrefs,
    apiFetch, callClaude, fetchPhoto,
    mealsRef, plansRef, activeWeekRef,
  };
}
