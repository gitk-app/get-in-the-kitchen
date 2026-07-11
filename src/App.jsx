import React, { useState } from 'react';
import useStore from './hooks/useStore';
import BottomNav from './components/BottomNav';
import OnboardingScreen from './screens/OnboardingScreen';
import PlanScreen from './screens/PlanScreen';
import PantryScreen from './screens/PantryScreen';
import LibraryScreen from './screens/LibraryScreen';
import SettingsScreen from './screens/SettingsScreen';
import './index.css';

export default function App() {
  const store = useStore();
  const [tab, setTab] = useState('plan');

  // Show onboarding first time
  if (!store.onboarded) {
    return <OnboardingScreen store={store} />;
  }

  const screens = {
    plan: <PlanScreen store={store} />,
    pantry: <PantryScreen store={store} />,
    library: <LibraryScreen store={store} />,
    settings: <SettingsScreen store={store} />,
  };

  return (
    <div className="app">
      {screens[tab]}
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
