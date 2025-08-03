import React from 'react';
import { ALMProvider } from './contexts/ALMContext';
import { Dashboard } from './components/Dashboard';
import './index.css';

function App() {
  return (
    <ALMProvider>
      <Dashboard />
    </ALMProvider>
  );
}

export default App;