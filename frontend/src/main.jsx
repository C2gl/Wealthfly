import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import AuthGate from './components/AuthGate.jsx';
import { TranslationProvider } from './i18n.jsx';
import { applyTheme, readStoredTheme } from './lib/theme.js';
import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './tokens.css';
import './styles.css';

// Apply the saved theme before the first paint so there's no flash of the wrong one.
applyTheme(readStoredTheme());

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TranslationProvider>
      <AuthGate>
        <App />
      </AuthGate>
    </TranslationProvider>
  </React.StrictMode>
);
