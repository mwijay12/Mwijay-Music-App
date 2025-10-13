import React from 'react';
import ReactDOM from 'react-dom/client';
// FIX: Changed import to point to the root App.tsx which now acts as a barrel file to resolve module resolution issues.
import App from './App';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}