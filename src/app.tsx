import React from 'react';
import ReactDOM from 'react-dom/client';
import { ContentEngineApp } from './content-engine/ContentEngineApp';
import { pushPageContext } from './analytics/page-context.js';
import { SURFACES } from './routing/surface-utils';

function isRootPath(): boolean {
  const p = window.location.pathname.replace(/\/$/, '').replace(/\.html$/, '');
  return p === '' || p === '/index';
}

function MainApp() {
  const isRoot = isRootPath();

  if (isRoot) {
    const HomeApp = (window as any).HomeApp;
    if (typeof HomeApp === 'function') {
      return <HomeApp />;
    }
  }

  return <ContentEngineApp />;
}

let rootInstance: any = null;

export function mountApp() {
  const rootEl = document.getElementById('root');
  if (rootEl) {
    if (!rootInstance) {
      rootInstance = ReactDOM.createRoot(rootEl);
    }
    rootInstance.render(<MainApp />);
  }
}

if (typeof window !== 'undefined') {
  (window as any).mountContentEngineApp = mountApp;
  if (!isRootPath()) {
    mountApp();
  } else {
    // The homepage renders HomeApp and never reaches ContentEngineApp, so it would
    // otherwise be the one route in the site that never announces itself. Its identity
    // is static, so it can be declared here directly.
    pushPageContext({
      page_type: 'home',
      page_title: SURFACES.www.defaultTitle,
      description: SURFACES.www.defaultDescription,
      content_group: 'home',
      pathname: window.location.pathname,
      search: window.location.search,
      surface: 'www',
    });
  }
}
