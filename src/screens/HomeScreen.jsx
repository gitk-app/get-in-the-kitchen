import React, { useMemo, useState } from 'react';
import { Icon, SectionLabel } from '../components/UI';
import { DAYS, PLAN_SLOTS } from '../data/meals';
import { pantryNeedsCheck, pantryAge } from '../hooks/useStore';
import { Host, HostAction } from '../components/Host';

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
  const { meals, plans, activeWeek, pantry, prefs, budget, setPrefs } = store;
  const firstName = String(prefs?.userName || '').trim().split(/\s+/)[0] || '';
  const [nameInput, setNameInput] = useState('');

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

  // Pantry items that need a quick "still have it?" check
  const pantryChecks = useMemo(() => pantry
    .filter(pantryNeedsCheck)
    .map(p => ({ name: p.name, age: pantryAge(p), fresh: p.type === 'fresh' || (p.fresh && p.type !== 'frozen') }))
    .sort((a, b) => Number(b.fresh) - Number(a.fresh) || b.age - a.age), [pantry]);

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
    { value: 'monthly', trips: 1 },
  ];
  const trips = FREQ_OPTIONS.find(f => f.value === (prefs?.shopFreq || 'biweekly'))?.trips || 2;
  const perTrip = Math.round(monthlyBudget / trips);

  const slots = ['Breakfast', 'Lunch', 'Dinner'];

  // The host picks the one thing most worth saying today
  const hostNote = (() => {
    if (!firstName) return { key: 'name' };
    const oldFresh = pantryChecks.find(p => p.fresh && p.age >= 5);
    if (oldFresh) {
      return {
        text: `${firstName}, your ${oldFresh.name.toLowerCase()} is ${oldFresh.age} days old. Want to use it tonight, or should we check the pantry?`,
        actions: [{ label: 'Check pantry', tab: 'pantry' }],
      };
    }
    const hasPlan = Object.values(currentPlan).some(day => day && Object.values(day).some(Boolean));
    if (!hasPlan) {
      return {
        text: `No plan for this week yet, ${firstName}. Want me to build one around your budget?`,
        actions: [{ label: 'Build my week', tab: 'plan' }],
      };
    }
    if (monthOver) {
      return {
        text: `We went $${Math.abs(monthRemaining).toFixed(0)} over this month. No stress. Let's lean on what's already in the pantry for a few meals.`,
        actions: [{ label: 'See my pantry', tab: 'pantry' }],
      };
    }
    const dinner = todayMeals.find(t => t.slot === 'Dinner')?.meal;
    const dayOfMonth = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    if (monthSpent > 0 && dayOfMonth >= 20 && monthRemaining > 0) {
      return {
        text: `$${monthRemaining.toFixed(0)} left with ${daysInMonth - dayOfMonth} days to go this month. You're doing great, ${firstName}!`,
        actions: dinner ? [{ label: "Tonight's dinner", tab: 'plan' }] : [],
      };
    }
    if (dinner) {
      return {
        text: `Tonight's dinner is ${dinner.name}. ${dinner.steps?.length ? "The recipe's ready when you are." : "I can write the recipe when you're ready."}`,
        actions: [{ label: 'See the plan', tab: 'plan' }],
      };
    }
    return {
      text: groceryCount > 0
        ? `Your grocery list has ${groceryCount} items, and your next trip budget is $${perTrip}. You've got this.`
        : `Everything's in order, ${firstName}. Want to look over your week?`,
      actions: [{ label: groceryCount > 0 ? 'Grocery list' : 'My week', tab: groceryCount > 0 ? 'grocery' : 'plan' }],
    };
  })();

  const saveName = () => {
    const v = nameInput.trim();
    if (!v) return;
    setPrefs(p => ({ ...p, userName: v }));
    setNameInput('');
  };

  return (
    <div className="screen">
      {/* Teal hero with a food photo behind it. The teal fade keeps text easy to read. */}
      <style>{`
        .stt-hero-bg { background: linear-gradient(180deg, rgba(10,61,53,0.55) 0%, rgba(10,61,53,0.35) 45%, rgba(10,61,53,0.82) 100%), url('/bg-home.jpg') center 30% / cover no-repeat, #0A3D35; }
        @media (min-width: 768px) {
          .stt-hero-bg { background: linear-gradient(180deg, rgba(10,61,53,0.5) 0%, rgba(10,61,53,0.3) 45%, rgba(10,61,53,0.8) 100%), url('/bg-home-wide.jpg') center / cover no-repeat, #0A3D35; }
        }
      `}</style>
      <div className="stt-hero-bg">
        {/* Top bar */}
        <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 2 }}>{getGreeting()}{firstName ? ', ' + firstName : ''}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 10 }}>{getDateLabel()}</div>
          </div>
          <img src="/logo-icon.svg" alt="Set the Table" style={{ width: 36, height: 36, borderRadius: 10 }} />
        </div>

        {/* The host's check-in */}
        <div style={{ padding: '0 20px 16px' }}>
          {hostNote.key === 'name' ? (
            <Host quick onDark text="Hey! Before we go further, what should I call you?">
              <div style={{ display: 'flex', gap: 8 }}>
                <label htmlFor="home-name" style={{ position: 'absolute', left: -9999 }}>Your first name</label>
                <input id="home-name" value={nameInput} onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); }}
                  placeholder="Your first name" autoComplete="given-name" maxLength={40}
                  style={{ flex: 1, height: 38, fontSize: 14 }} />
                <HostAction onClick={saveName}>Save</HostAction>
              </div>
            </Host>
          ) : (
            <Host quick onDark text={hostNote.text}>
              {hostNote.actions?.length > 0 && hostNote.actions.map(a => (
                <HostAction key={a.label} onClick={() => onNavigate(a.tab)}>{a.label}</HostAction>
              ))}
            </Host>
          )}
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
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Today - {today}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {todayMeals.map(({ slot, meal }) => (
              <div key={slot} onClick={() => onNavigate('plan')}
                style={{ background: meal?.batchCook ? 'rgba(10,61,53,0.72)' : 'rgba(10,61,53,0.62)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: meal?.batchCook ? '1px solid rgba(201,168,76,0.6)' : '1px solid rgba(255,255,255,0.14)', borderRadius: 10, padding: '8px 6px', cursor: 'pointer' }}>
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

        {/* Pantry check-in */}
        {pantryChecks.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <SectionLabel>Pantry check-in</SectionLabel>
            <div onClick={() => onNavigate('pantry')} role="button" tabIndex={0}
              style={{ marginTop: 8, background: '#FFFAEF', border: '1px solid #C9A84C', borderRadius: 12, padding: '14px 16px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
                    {pantryChecks.length} item{pantryChecks.length !== 1 ? 's' : ''} need{pantryChecks.length === 1 ? 's' : ''} a quick check
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {pantryChecks.slice(0, 3).map(p => `${p.name} (${p.age}d)`).join(', ')}{pantryChecks.length > 3 ? ` and ${pantryChecks.length - 3} more` : ''}
                  </div>
                </div>
                <span style={{ flexShrink: 0, background: '#0A3D35', color: '#C9A84C', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 800 }}>Check now</span>
              </div>
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
