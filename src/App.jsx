import React, { useState } from 'react';
import useStore from './hooks/useStore';
import OnboardingScreen from './screens/OnboardingScreen';
import PlanScreen from './screens/PlanScreen';
import PantryScreen from './screens/PantryScreen';
import LibraryScreen from './screens/LibraryScreen';
import GroceryScreen from './screens/GroceryScreen';
import SettingsScreen from './screens/SettingsScreen';
import './index.css';

const NAV_ITEMS = [
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
  const [tab, setTab] = useState('plan');

  if (!store.onboarded) {
    return <OnboardingScreen store={store} />;
  }

  const screens = {
    plan: <PlanScreen store={store} />,
    grocery: <GroceryScreen store={store} />,
    pantry: <PantryScreen store={store} />,
    library: <LibraryScreen store={store} />,
    settings: <SettingsScreen store={store} />,
  };

  return (
    <div className="app-shell">
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            <Icon name="chef-hat" size={22} />
          </div>
          <div>
            <div className="sidebar-app-name">GET IN THE KITCHEN</div>
            <div className="sidebar-tagline">Real meals. Real budget.</div>
          </div>
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
            <span className="sidebar-budget-label">Weekly budget</span>
            <span className="sidebar-budget-amount">${store.budget.toFixed(0)}</span>
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
            <Icon name={item.icon} size={22} />
            <span className="nav-label">{item.label}</span>
          </div>
        ))}
      </nav>
    </div>
  );
}
