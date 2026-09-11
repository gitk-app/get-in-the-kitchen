import React, { useMemo } from 'react';
import { Icon, SectionLabel } from '../components/UI';
import { DAYS, PLAN_SLOTS } from '../data/meals';

const DAYS_OF_WEEK = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function getTodayName() {
  return DAYS_OF_WEEK[new Date().getDay()];
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDateLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function HomeScreen({ store, onNavigate }) {
  const { meals, plans, activeWeek, pantry, prefs, budget } = store;

  const monthlyBudget = prefs?.monthlyBudget || budget * 4;
  const today = getTodayName();

  // Today's meals
  const currentPlan = plans['week' + activeWeek] || {};
  const todayPlan = currentPlan[today] || {};
  const todayMeals = PLAN_SLOTS.map(slot => ({
    slot,
    meal: meals.find(m => m.id === todayPlan[slot]) || null,
  }));

  // Budget stats
  const tripHistory = (() => { try { return JSON.parse(localStorage.getItem('gitk_trip_history') || '[]'); } catch { return []; } })();
  const currentMonthKey = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
  const monthSpent = tripHistory.filter(t => t.monthKey === currentMonthKey).reduce((s, t) => s + (t.total || 0), 0);
  const monthRemaining = monthlyBudget - monthSpent;
  const monthOver = monthSpent > monthlyBudget;

  // Week estimated cost
  const weekTotal = useMemo(() => {
    let total = 0;
    DAYS.forEach(day => {
      PLAN_SLOTS.forEach(slot => {
        const meal = meals.find(m => m.id === currentPlan[day]?.[slot]);
        if (meal?.cost) total += meal.cost;
      });
    });
    return total;
  }, [meals, currentPlan]);

  // Pantry alerts
  const pantryAlerts = useMemo(() => {
    const now = Date.now();
    return pantry
      .filter(p => {
        if (p.type === 'frozen') return false;
        if (p.type === 'fresh' || p.fresh) {
          const age = Math.floor((now - p.addedAt) / 86400000);
          return age >= 2;
        }
        return false;
      })
      .slice(0, 4)
      .map(p => ({
        name: p.name,
        age: Math.floor((now - p.addedAt) / 86400000),
        qty: p.qty,
      }));
  }, [pantry]);

  // Grocery list count
  const groceryCount = useMemo(() => {
    const seen = {};
    DAYS.forEach(day => {
      PLAN_SLOTS.forEach(slot => {
        const meal = meals.find(m => m.id === currentPlan[day]?.[slot]);
        if (!meal?.items) return;
        meal.items.forEach(it => { seen[it.n + '|' + (it.s || '')] = true; });
      });
    });
    return Object.keys(seen).length;
  }, [meals, currentPlan]);

  const FREQ_OPTIONS = [
    { value: 'weekly', trips: 4 },
    { value: 'biweekly', trips: 2 },
    { value: 'twicemonth', trips: 2 },
  ];
  const trips = FREQ_OPTIONS.find(f => f.value === (prefs?.shopFreq || 'biweekly'))?.trips || 2;
  const perTrip = Math.round(monthlyBudget / trips);

  const slots = ['Breakfast', 'Lunch', 'Dinner'];

  return (
    <div className="screen">
      {/* ── TEAL HERO ── */}
      <div style={{ background: '#0A3D35' }}>
        {/* Top bar */}
        <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 2 }}>{getGreeting()}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 10 }}>{getDateLabel()}</div>
          </div>
          <img src="/logo-icon.svg" alt="GET IN THE KITCHEN" style={{ width: 36, height: 36, borderRadius: 10 }} />
        </div>

        {/* Budget row */}
        <div style={{ padding: '0 20px 14px', display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Monthly remaining</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: monthOver ? '#ef4444' : '#C9A84C', lineHeight: 1 }}>${Math.abs(monthRemaining).toFixed(0)}{monthOver ? ' over' : ' left'}</div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: Math.min(100, (monthSpent / monthlyBudget) * 100) + '%', background: monthOver ? '#ef4444' : '#C9A84C', borderRadius: 2 }} />
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Week estimate</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#C9A84C', lineHeight: 1 }}>${weekTotal.toFixed(0)}</div>
          </div>
        </div>

        {/* Today's meals strip */}
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Today — {today}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {todayMeals.map(({ slot, meal }) => (
              <div key={slot} onClick={() => onNavigate('plan')}
                style={{ background: meal?.batchCook ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.08)', border: meal?.batchCook ? '1px solid rgba(201,168,76,0.4)' : 'none', borderRadius: 8, padding: '8px 6px', cursor: 'pointer' }}>
                <div style={{ fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>{slot}</div>
                {meal?.image && (
                  <div style={{ height: 32, borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
                    <img src={meal.image} alt={meal.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                  </div>
                )}
                <div style={{ fontSize: 9, fontWeight: 600, color: meal?.batchCook ? '#C9A84C' : '#fff', lineHeight: 1.3 }}>
                  {meal ? (meal.batchCook ? '🍳 ' + meal.name : meal.name) : <span style={{ color: 'rgba(255,255,255,0.25)' }}>Not planned</span>}
                </div>
                {meal?.cost > 0 && <div style={{ fontSize: 7, color: 'rgba(201,168,76,0.6)', marginTop: 2 }}>${meal.cost.toFixed(2)}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="screen-padded">

        {/* Quick actions */}
        <div style={{ marginBottom: 16 }}>
          <SectionLabel>Quick actions</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
            {[
              { label: 'Build my week', icon: 'sparkles', tab: 'plan' },
              { label: 'Scan item', icon: 'scan', tab: 'pantry' },
              { label: 'Grocery list', icon: 'shopping-cart', tab: 'grocery' },
            ].map(action => (
              <div key={action.tab} onClick={() => onNavigate(action.tab)}
                style={{ background: '#0A3D35', borderRadius: 10, padding: '12px 8px', textAlign: 'center', cursor: 'pointer' }}>
                <Icon name={action.icon} size={20} style={{ color: '#C9A84C', marginBottom: 6, display: 'block', margin: '0 auto 6px' }} />
                <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{action.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pantry alerts */}
        {pantryAlerts.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <SectionLabel>Pantry alerts</SectionLabel>
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 8 }}>
              {pantryAlerts.map((item, i) => (
                <div key={item.name} onClick={() => onNavigate('pantry')}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: i < pantryAlerts.length - 1 ? '0.5px solid var(--border)' : 'none', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{item.name}</div>
                    {item.qty && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{item.qty}</div>}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: item.age >= 4 ? '#fef2f2' : '#FFFAEF', color: item.age >= 4 ? '#991b1b' : '#7A5A10' }}>
                    {item.age}d old
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grocery list summary */}
        <div style={{ marginBottom: 16 }}>
          <SectionLabel>Grocery list</SectionLabel>
          <div onClick={() => onNavigate('grocery')}
            style={{ background: '#E8F5F1', border: '0.5px solid #7EC8B5', borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginTop: 8 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0A5A45' }}>
                {groceryCount > 0 ? `${groceryCount} items ready` : 'No items yet'}
              </div>
              <div style={{ fontSize: 12, color: '#7AA898', marginTop: 2 }}>
                {groceryCount > 0 ? `Next trip budget: $${perTrip}` : 'Add meals to your plan to populate'}
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#0A3D35' }}>{groceryCount}</div>
          </div>
        </div>

        {/* Week plan summary */}
        {Object.keys(currentPlan).length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <SectionLabel>This week</SectionLabel>
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 8 }}>
              {DAYS.slice(0, 4).map((day, i) => {
                const dinner = meals.find(m => m.id === currentPlan[day]?.Dinner);
                if (!dinner) return null;
                return (
                  <div key={day} onClick={() => onNavigate('plan')}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < 3 ? '0.5px solid var(--border)' : 'none', cursor: 'pointer' }}>
                    <div style={{ width: 36, textAlign: 'center' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: day === today ? '#C9A84C' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{day.slice(0, 3)}</div>
                    </div>
                    {dinner.image && (
                      <div style={{ width: 36, height: 36, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                        <img src={dinner.image} alt={dinner.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dinner.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Dinner · ${dinner.cost.toFixed(2)}</div>
                    </div>
                    {dinner.batchCook && <span style={{ fontSize: 9, fontWeight: 700, color: '#7A5A10', background: '#FFFAEF', border: '0.5px solid #C9A84C', borderRadius: 3, padding: '1px 5px', flexShrink: 0 }}>BATCH</span>}
                  </div>
                );
              }).filter(Boolean)}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
