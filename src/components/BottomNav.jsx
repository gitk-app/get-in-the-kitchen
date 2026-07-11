import React from 'react';
import { Icon } from './UI';

const tabs = [
  { id: 'plan', label: 'Plan', icon: 'calendar' },
  { id: 'pantry', label: 'Pantry', icon: 'fridge' },
  { id: 'library', label: 'Library', icon: 'book' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="bottom-nav">
      {tabs.map(tab => (
        <div
          key={tab.id}
          className={`nav-item ${active === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
          role="button"
          aria-label={tab.label}
        >
          <Icon name={tab.icon} size={22} />
          <span className="nav-label">{tab.label}</span>
        </div>
      ))}
    </nav>
  );
}
