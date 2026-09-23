import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import AuthGate from './components/AuthGate.jsx';
import { TranslationProvider } from './i18n.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TranslationProvider>
      <AuthGate>
        <App />
      </AuthGate>
    </TranslationProvider>
  </React.StrictMode>
);
