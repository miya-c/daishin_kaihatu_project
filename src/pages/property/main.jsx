import React from 'react';
import { createRoot } from 'react-dom/client';
import ErrorBoundary from '../../components/shared/ErrorBoundary';
import PropertySelectApp from '../../components/PropertySelect/PropertySelectApp';
import '../../styles/property_select.css';

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}

const root = createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <PropertySelectApp />
  </ErrorBoundary>
);
