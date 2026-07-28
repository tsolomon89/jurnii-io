import React from 'react';
import ReactDOM from 'react-dom/client';
import { ContentEngineApp } from './content-engine/ContentEngineApp';

function isRootPath(): boolean {
  const p = window.location.pathname.replace(/\/$/, '');
  return p === '' || p === '/index.html';
}

function MainApp() {
  const isRoot = isRootPath();

  if (isRoot) {
    // Legacy home components mounted if available
    const HomeApp = (window as any).HomeApp;
    if (typeof HomeApp === 'function') {
      return <HomeApp />;
    }
  }

  return <ContentEngineApp />;
}

export function mountApp() {
  const rootEl = document.getElementById('root');
  if (rootEl) {
    ReactDOM.createRoot(rootEl).render(<MainApp />);
  }
}

if (typeof window !== 'undefined') {
  (window as any).mountContentEngineApp = mountApp;
}
