import React, { useState } from 'react';
import { Icon, Button, Divider } from '../components/UI';
import { STORES } from '../data/meals';

export default function SettingsScreen({ store }) {
  const { budget, setBudget, apiKey, setApiKey, prefs, setPrefs } = store;
  const [showApiKey, setShowApiKey] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [keySaved, setKeySaved] = useState(false);

  const saveKey = () => {
    if (!newKey.trim().startsWith('sk-ant-')) { alert("That doesn't look like an Anthropic API key. It should start with sk-ant-"); return; }
    setApiKey(newKey.trim());
    setKeySaved(true);
    setNewKey('');
    setTimeout(() => setKeySaved(false), 2000);
  };

  const toggleStore = (store) => {
    setPrefs(p => ({
      ...p,
      stores: p.stores.includes(store) ? p.stores.filter(s => s !== store) : [...p.stores, store]
    }));
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <span className="screen-title">Settings</span>
      </div>
      <div className="screen-padded">
        <div className="settings-grid">

        {/* Budget */}
        <div className="card mb-16">
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Weekly budget</div>
          <div className="flex items-center gap-8">
            <span style={{ fontSize: 18, fontWeight: 500 }}>$</span>
            <input type="number" value={budget} onChange={e => setBudget(parseFloat(e.target.value) || 0)}
              style={{ width: 100, fontSize: 20, fontWeight: 700 }} />
            <span className="text-sm text-muted">per week · ${(budget * 4).toFixed(0)}/month</span>
          </div>
        </div>

        {/* Stores */}
        <div className="card mb-16">
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Your stores</div>
          <p className="text-sm mb-12">Used to route your grocery list.</p>
          {STORES.map(s => (
            <div key={s} className="flex justify-between items-center" style={{ padding: '10px 0', borderBottom: '0.5px solid var(--border)' }}>
              <span style={{ fontSize: 14 }}>{s}</span>
              <button onClick={() => toggleStore(s)}
                style={{ width: 44, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', position: 'relative', background: prefs.stores.includes(s) ? 'var(--green)' : 'var(--border-strong)', transition: 'background .2s' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, transition: 'left .2s', left: prefs.stores.includes(s) ? 21 : 3 }} />
              </button>
            </div>
          ))}
        </div>

        {/* Household */}
        <div className="card mb-16">
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Household size</div>
          <div className="flex gap-8 flex-wrap">
            {[['1', 'Just me'], ['2', '2 people'], ['3-4', '3–4 people'], ['5+', '5 or more']].map(([val, label]) => (
              <div key={val} onClick={() => setPrefs(p => ({ ...p, householdSize: val }))}
                style={{ padding: '8px 14px', borderRadius: 10, cursor: 'pointer', border: prefs.householdSize === val ? '2px solid var(--green)' : '1px solid var(--border)', background: prefs.householdSize === val ? 'var(--green-light)' : 'var(--bg-white)', color: prefs.householdSize === val ? 'var(--green)' : 'var(--text)', fontSize: 13, fontWeight: prefs.householdSize === val ? 700 : 400 }}>
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* API Key */}
        <div className="card mb-16">
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Anthropic API key</div>
          <p className="text-sm mb-12">Required for Build My Week and AI features. Stored only on your device.</p>
          {apiKey ? (
            <div className="flex items-center gap-8 mb-8">
              <Icon name="check" size={16} style={{ color: 'var(--green)' }} />
              <span className="text-sm" style={{ color: 'var(--green)' }}>API key saved</span>
              <button onClick={() => setShowApiKey(!showApiKey)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13 }}>
                {showApiKey ? 'Hide' : 'Change'}
              </button>
            </div>
          ) : (
            <div className="banner banner-warning mb-8">
              <Icon name="alert-triangle" size={14} /> No API key set — AI features won't work.
            </div>
          )}
          {(!apiKey || showApiKey) && (
            <div>
              <input type="password" value={newKey} onChange={e => setNewKey(e.target.value)}
                placeholder="sk-ant-..." className="mb-8" />
              <Button variant="primary" onClick={saveKey}>
                {keySaved ? <><Icon name="check" size={16} /> Saved!</> : 'Save API key'}
              </Button>
              <p className="text-xs text-muted mt-8">Get your free key at console.anthropic.com → API Keys</p>
            </div>
          )}
        </div>
        </div>{/* end settings-grid */}

        <Divider />
        <p className="text-xs text-muted" style={{ textAlign: 'center' }}>GET IN THE KITCHEN · v1.0 MVP<br />Real meals. Real budget. Real life.</p>
      </div>
    </div>
  );
}
