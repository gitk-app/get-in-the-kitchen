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

export default function OnboardingScreen({ store }) {
  const { setBudget, setPrefs, setOnboarded } = store;
  const [step, setStep] = useState(0);
  const [household, setHousehold] = useState('2');
  const [dietary, setDietary] = useState([]);
  const [stores, setStores] = useState(['Aldi', 'Walmart']);
  const [budgetVal, setBudgetVal] = useState('92');

  const toggleDietary = (d) => setDietary(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);
  const toggleStore = (s) => setStores(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const finish = () => {
    setBudget(parseFloat(budgetVal) || 92);
    setPrefs({ householdSize: household, dietary, stores });
    setOnboarded(true);
  };

  const steps = [
    {
      title: 'Who are you feeding?',
      sub: "We'll size your portions and budget suggestions.",
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {HOUSEHOLD.map(h => (
            <div key={h.value} onClick={() => setHousehold(h.value)}
              style={{ border: household === h.value ? '2px solid var(--green)' : '1px solid var(--border)', borderRadius: 14, padding: '16px 10px', textAlign: 'center', cursor: 'pointer', background: household === h.value ? 'var(--green-light)' : 'var(--bg-white)' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{h.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: household === h.value ? 'var(--green)' : 'var(--text)' }}>{h.label}</div>
            </div>
          ))}
        </div>
      )
    },
    {
      title: 'Any dietary needs?',
      sub: "Select all that apply. You can change this anytime.",
      content: (
        <div className="pill-group">
          {DIETARY.map(d => (
            <Pill key={d} selected={dietary.includes(d)} onClick={() => toggleDietary(d)}>{d}</Pill>
          ))}
        </div>
      )
    },
    {
      title: 'Where do you shop?',
      sub: "We'll route your grocery list by store.",
      content: (
        <div>
          {STORES.map(s => (
            <div key={s} onClick={() => toggleStore(s)}
              className="flex justify-between items-center"
              style={{ padding: '12px 0', borderBottom: '0.5px solid var(--border)', cursor: 'pointer' }}>
              <span style={{ fontSize: 15, fontWeight: 500 }}>{s}</span>
              <div style={{ width: 22, height: 22, borderRadius: 6, border: stores.includes(s) ? 'none' : '1.5px solid var(--border)', background: stores.includes(s) ? 'var(--green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {stores.includes(s) && <span style={{ color: '#fff', fontSize: 14 }}>✓</span>}
              </div>
            </div>
          ))}
        </div>
      )
    },
    {
      title: "What's your weekly grocery budget?",
      sub: "We'll keep your meal plan under this number.",
      content: (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 32, fontWeight: 700 }}>$</span>
            <input type="number" value={budgetVal} onChange={e => setBudgetVal(e.target.value)}
              style={{ fontSize: 40, fontWeight: 700, border: 'none', borderBottom: '2px solid var(--green)', borderRadius: 0, width: 140, paddingLeft: 0 }} />
            <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>/week</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['60', '80', '92', '120', '150'].map(v => (
              <Pill key={v} selected={budgetVal === v} onClick={() => setBudgetVal(v)}>${v}</Pill>
            ))}
          </div>
          <p className="text-sm text-muted" style={{ marginTop: 16 }}>
            Monthly estimate: <strong>${(parseFloat(budgetVal || 0) * 4).toFixed(0)}</strong>
          </p>
        </div>
      )
    }
  ];

  const current = steps[step];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', maxWidth: 480, margin: '0 auto', padding: '0 24px' }}>
      {/* Progress */}
      <div style={{ paddingTop: 60, paddingBottom: 8 }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 32 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? 'var(--green)' : 'var(--border)', transition: 'background .3s' }} />
          ))}
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{current.title}</h2>
        <p className="text-sm" style={{ marginBottom: 28 }}>{current.sub}</p>
      </div>

      <div style={{ flex: 1 }}>{current.content}</div>

      <div style={{ padding: '24px 0 48px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {step < steps.length - 1 ? (
          <>
            <Button variant="primary" onClick={() => setStep(s => s + 1)}>Continue</Button>
            <button onClick={() => setStep(s => s + 1)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)', padding: 8 }}>
              Skip for now
            </button>
          </>
        ) : (
          <Button variant="primary" onClick={finish}>Get started →</Button>
        )}
      </div>
    </div>
  );
}
