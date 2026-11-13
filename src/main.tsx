import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { I18nProvider } from './i18n/I18nProvider';
import './index.css';

// The WebView2 context menu exposes reload/inspect/print entries that do not
// belong in the app UI. Clipboard shortcuts keep working.
window.addEventListener('contextmenu', (event) => event.preventDefault());

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>
);
