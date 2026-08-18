import React, { useState } from 'react';
import { Button, Pill } from '../components/UI';
import { STORES } from '../data/meals';

const DIETARY = ['No restrictions', 'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Nut-free'];

const HOUSEHOLD = [
  { value: '1', label: 'Just me', emoji: '🙋' },
  { value: '2', label: '2 people', emoji: '👫' },
  { value: '3-4', label: '3–4 people', emoji: '👨‍👩‍👧' },
  { value: '5+', label: '5 or more', emoji: '👨‍👩‍👧‍👦' },
];

const WEEK_TYPES = [
  { value: 'normal', label: 'Normal week', desc: 'Regular schedule, time to cook', emoji: '📅' },
  { value: 'busy', label: 'Busy week', desc: 'Short on time, need quick meals', emoji: '⚡' },
  { value: 'chaotic', label: 'Chaotic week', desc: 'Barely have time to think', emoji: '🌪️' },
  { value: 'relaxed', label: 'Extra time', desc: 'I can cook more involved meals', emoji: '👩‍🍳' },
];

const PROTEIN_OPTIONS = [
  { group: 'Meat & Seafood', items: ['Chicken', 'Beef', 'Pork', 'Turkey', 'Sausage', 'Fish/Seafood', 'Shrimp'] },
  { group: 'Vegetarian / Vegan', items: ['Eggs', 'Tofu', 'Tempeh', 'Lentils', 'Chickpeas', 'Black beans'] },
  { group: 'Dairy & Other', items: ['Cheese/Dairy', 'Peanut butter'] },
];

const MEAL_TYPES = [
  { value: 'tacos', label: '🌮 Tacos & bowls' },
  { value: 'pasta', label: '🍝 Pasta' },
  { value: 'sheet-pan', label: '🥦 Sheet pan meals' },
  { value: 'soups', label: '🍲 Soups & stews' },
  { value: 'breakfast-dinner', label: '🍳 Breakfast for dinner' },
  { value: 'sandwiches', label: '🥪 Sandwiches & wraps' },
  { value: 'bowls', label: '🍚 Rice & grain bowls' },
  { value: 'slow-cooker', label: '🥘 Slow cooker' },
  { value: 'grilling', label: '🔥 Grilling' },
  { value: 'stir-fry', label: '🥢 Stir fry' },
];

const FREQ_OPTIONS = [
  { value: 'weekly', label: 'Weekly', trips: 4, desc: '4 trips/month' },
  { value: 'biweekly', label: 'Every 2 weeks', trips: 2, desc: '2 trips/month' },
  { value: 'twicemonth', label: 'Twice a month', trips: 2, desc: '2 trips/month' },
];

export default function OnboardingScreen({ store }) {
  const { setOnboarded, setPrefs, setBudget } = store;

  const [step, setStep] = useState(0);
  const [household, setHousehold] = useState('2');
  const [dietary, setDietary] = useState([]);
  const [stores, setStores] = useState(['Aldi', 'Walmart']);
  const [monthlyBudget, setMonthlyBudget] = useState('450');
  const [shopFreq, setShopFreq] = useState('biweekly');
  const [weekType, setWeekType] = useState('normal');
  const [proteins, setProteins] = useState([]);
  const [mealTypes, setMealTypes] = useState([]);

  const toggleDietary = (d) => setDietary(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);
  const toggleStore = (s) => setStores(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const toggleProtein = (p) => setProteins(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  const toggleMealType = (t) => setMealTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const trips = FREQ_OPTIONS.find(f => f.value === shopFreq)?.trips || 2;
  const perTrip = Math.round(parseFloat(monthlyBudget || 0) / trips);

  const finish = () => {
    const mb = parseFloat(monthlyBudget) || 450;
    setBudget(mb / 4); // weekly budget for backward compat
    setPrefs({
      householdSize: household,
      dietary,
      stores,
      monthlyBudget: mb,
      shopFreq,
      weekType,
      proteins,
      mealTypes,
      customStores: [],
    });
    setOnboarded(true);
  };

  const steps = [
    // Step 0 — Welcome
    {
      title: null,
      content: (
        <div style={{ textAlign: 'center', paddingTop: 20 }}>
          <div style={{ width: 80, height: 80, background: 'var(--green)', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 36 }}>
            🍳
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10, color: 'var(--text)' }}>GET IN THE KITCHEN</h1>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.6 }}>
            Real meals. Real budget. Real life.
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 32 }}>
            We'll ask you 6 quick questions so your first week plan actually fits your life. Takes less than 2 minutes.
          </p>
          <Button variant="primary" onClick={() => setStep(1)} style={{ maxWidth: 320, margin: '0 auto' }}>
            Let's get started →
          </Button>
        </div>
      ),
      showProgress: false,
      showContinue: false,
    },

    // Step 1 — Household
    {
      title: 'Who are you feeding?',
      subtitle: "We'll size your meal plans and portions to match.",
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {HOUSEHOLD.map(h => (
            <div key={h.value} onClick={() => setHousehold(h.value)}
              style={{
                border: household === h.value ? '2px solid var(--green)' : '1px solid var(--border)',
                borderRadius: 14, padding: '20px 10px', textAlign: 'center', cursor: 'pointer',
                background: household === h.value ? 'var(--green-light)' : 'var(--bg-white)',
                transition: 'all .15s'
              }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{h.emoji}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: household === h.value ? 'var(--green)' : 'var(--text)' }}>{h.label}</div>
            </div>
          ))}
        </div>
      ),
    },

    // Step 2 — Dietary
    {
      title: 'Any dietary needs?',
      subtitle: 'Select all that apply. You can change this anytime in Settings.',
      content: (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {DIETARY.map(d => (
            <Pill key={d} selected={dietary.includes(d)} onClick={() => toggleDietary(d)}>{d}</Pill>
          ))}
        </div>
      ),
      skipLabel: 'No restrictions — skip',
    },

    // Step 3 — Stores
    {
      title: 'Where do you shop?',
      subtitle: "We'll route your grocery list by store so shopping is faster.",
      content: (
        <div>
          {STORES.map(s => (
            <div key={s} onClick={() => toggleStore(s)}
              className="flex justify-between items-center"
              style={{ padding: '14px 0', borderBottom: '0.5px solid var(--border)', cursor: 'pointer' }}>
              <span style={{ fontSize: 15, fontWeight: 500 }}>{s}</span>
              <div style={{
                width: 24, height: 24, borderRadius: 7,
                border: stores.includes(s) ? 'none' : '1.5px solid var(--border)',
                background: stores.includes(s) ? 'var(--green)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s'
              }}>
                {stores.includes(s) && <span style={{ color: '#fff', fontSize: 14, lineHeight: 1 }}>✓</span>}
              </div>
            </div>
          ))}
        </div>
      ),
    },

    // Step 4 — Budget
    {
      title: "What's your monthly grocery budget?",
      subtitle: "We'll keep your meal plan within your budget and calculate your per-trip spending.",
      content: (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 40, fontWeight: 800, color: 'var(--text)' }}>$</span>
            <input
              type="number"
              value={monthlyBudget}
              onChange={e => setMonthlyBudget(e.target.value)}
              style={{ fontSize: 48, fontWeight: 800, border: 'none', borderBottom: '3px solid var(--green)', borderRadius: 0, width: 160, paddingLeft: 0, color: 'var(--green)' }}
            />
            <span style={{ fontSize: 18, color: 'var(--text-muted)' }}>/month</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {['300', '400', '450', '500', '600'].map(v => (
              <Pill key={v} selected={monthlyBudget === v} onClick={() => setMonthlyBudget(v)}>${v}</Pill>
            ))}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>How often do you shop?</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FREQ_OPTIONS.map(opt => (
              <div key={opt.value} onClick={() => setShopFreq(opt.value)}
                style={{
                  padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                  border: shopFreq === opt.value ? '2px solid var(--green)' : '1px solid var(--border)',
                  background: shopFreq === opt.value ? 'var(--green-light)' : 'var(--bg-white)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all .15s'
                }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: shopFreq === opt.value ? 700 : 400, color: shopFreq === opt.value ? 'var(--green)' : 'var(--text)' }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{opt.desc} · ${Math.round(parseFloat(monthlyBudget || 0) / opt.trips)}/trip</div>
                </div>
                {shopFreq === opt.value && <span style={{ color: 'var(--green)', fontSize: 18 }}>✓</span>}
              </div>
            ))}
          </div>
          {monthlyBudget && (
            <div style={{ marginTop: 14, background: 'var(--green-light)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#166534' }}>
              <strong>${perTrip}</strong> per shopping trip · <strong>${Math.round(parseFloat(monthlyBudget) / 4)}</strong>/week
            </div>
          )}
        </div>
      ),
    },

    // Step 5 — Week type
    {
      title: 'What kind of week is this?',
      subtitle: "We'll adjust how complex your meal plan is based on how much time you have.",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {WEEK_TYPES.map(w => (
            <div key={w.value} onClick={() => setWeekType(w.value)}
              style={{
                padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                border: weekType === w.value ? '2px solid var(--green)' : '1px solid var(--border)',
                background: weekType === w.value ? 'var(--green-light)' : 'var(--bg-white)',
                display: 'flex', alignItems: 'center', gap: 14, transition: 'all .15s'
              }}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>{w.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: weekType === w.value ? 700 : 500, color: weekType === w.value ? 'var(--green)' : 'var(--text)' }}>{w.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{w.desc}</div>
              </div>
              {weekType === w.value && <span style={{ color: 'var(--green)', fontSize: 18, flexShrink: 0 }}>✓</span>}
            </div>
          ))}
        </div>
      ),
    },

    // Step 6 — Proteins
    {
      title: 'What proteins do you usually buy?',
      subtitle: 'Select all that apply. Build My Week will rotate these so meals stay interesting.',
      content: (
        <div>
          {PROTEIN_OPTIONS.map(group => (
            <div key={group.group} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>{group.group}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {group.items.map(p => (
                  <Pill key={p} selected={proteins.includes(p)} onClick={() => toggleProtein(p)}>{p}</Pill>
                ))}
              </div>
            </div>
          ))}
        </div>
      ),
      skipLabel: 'Skip — no preference',
    },

    // Step 7 — Meal types
    {
      title: 'What does your household like to eat?',
      subtitle: 'Pick as many as you want. This helps us suggest meals you\'ll actually make.',
      content: (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {MEAL_TYPES.map(t => (
            <Pill key={t.value} selected={mealTypes.includes(t.value)} onClick={() => toggleMealType(t.value)}>
              {t.label}
            </Pill>
          ))}
        </div>
      ),
      skipLabel: 'Skip — surprise me',
      isLast: true,
    },
  ];

  const current = steps[step];
  const totalSteps = steps.length - 1; // exclude welcome screen
  const progressStep = step; // step 0 = welcome (no bar), step 1-7 = progress

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)', display: 'flex',
      flexDirection: 'column', maxWidth: 480, margin: '0 auto', padding: '0 24px'
    }}>
      {/* Progress bar — only show on steps 1+ */}
      {step > 0 && (
        <div style={{ paddingTop: 52, paddingBottom: 0 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 28 }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 4, borderRadius: 2,
                background: i < step ? 'var(--green)' : 'var(--border)',
                transition: 'background .3s'
              }} />
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
            Step {step} of {totalSteps}
          </div>
          {current.title && (
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>{current.title}</h2>
          )}
          {current.subtitle && (
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>{current.subtitle}</p>
          )}
        </div>
      )}

      {/* Welcome screen has its own top padding */}
      {step === 0 && <div style={{ paddingTop: 60 }} />}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
        {current.content}
      </div>

      {/* Bottom actions */}
      {current.showContinue !== false && (
        <div style={{ padding: '16px 0 48px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {current.isLast ? (
            <Button variant="primary" onClick={finish}>
              Take me to my kitchen →
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setStep(s => s + 1)}>
              Continue
            </Button>
          )}
          {current.skipLabel && (
            <button onClick={() => setStep(s => s + 1)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)', padding: 8 }}>
              {current.skipLabel}
            </button>
          )}
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)', padding: 4 }}>
              ← Back
            </button>
          )}
        </div>
      )}
    </div>
  );
}
