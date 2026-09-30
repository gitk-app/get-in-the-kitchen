// Set the Table - App v3.0 (renamed from GET IN THE KITCHEN)
import React, { useState } from 'react';
import useStore from './hooks/useStore';
import OnboardingScreen from './screens/OnboardingScreen';
import HomeScreen from './screens/HomeScreen';
import PlanScreen from './screens/PlanScreen';
import PantryScreen from './screens/PantryScreen';
import LibraryScreen from './screens/LibraryScreen';
import GroceryScreen from './screens/GroceryScreen';
import SettingsScreen from './screens/SettingsScreen';
import './index.css';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'plan', label: 'Plan', icon: 'calendar' },
  { id: 'grocery', label: 'Grocery', icon: 'shopping-cart' },
  { id: 'pantry', label: 'Pantry', icon: 'fridge' },
  { id: 'library', label: 'Library', icon: 'book' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

function Icon({ name, size = 20 }) {
  return <i className={`ti ti-${name}`} aria-hidden="true" style={{ fontSize: size }} />;
}

export default function App() {
  const store = useStore();
  const [tab, setTab] = useState('home');

  if (!store.onboarded) {
    return <OnboardingScreen store={store} onNavigate={setTab} />;
  }

  const screens = {
    home: <HomeScreen store={store} onNavigate={setTab} />,
    plan: <PlanScreen store={store} onNavigate={setTab} />,
    grocery: <GroceryScreen store={store} onNavigate={setTab} />,
    pantry: <PantryScreen store={store} onNavigate={setTab} />,
    library: <LibraryScreen store={store} onNavigate={setTab} />,
    settings: <SettingsScreen store={store} onNavigate={setTab} />,
  };

  return (
    <div className="app-shell">
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
          <img src="/logo.svg" alt="Set the Table" style={{ height: 34, width: 'auto', maxWidth: '100%' }} />
          <div className="sidebar-tagline">Real meals. Real budget. Real life.</div>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`sidebar-nav-item ${tab === item.id ? 'active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              <Icon name={item.icon} size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-budget">
            <span className="sidebar-budget-label">Monthly budget</span>
            <span className="sidebar-budget-amount">${(store.prefs?.monthlyBudget || store.budget * 4).toFixed(0)}</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <div className="content-inner">
          {screens[tab]}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav">
        {NAV_ITEMS.map(item => (
          <div
            key={item.id}
            className={`nav-item ${tab === item.id ? 'active' : ''}`}
            onClick={() => setTab(item.id)}
            role="button"
            aria-label={item.label}
          >
            <Icon name={item.icon} size={20} />
            <span className="nav-label">{item.label}</span>
          </div>
        ))}
      </nav>
    </div>
  );
}
