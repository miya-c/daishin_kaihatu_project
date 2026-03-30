import React from 'react';
import { createRoot } from 'react-dom/client';
import ErrorBoundary from '../../components/shared/ErrorBoundary';
import RoomSelectApp from '../../components/RoomSelect/RoomSelectApp';
import '../../styles/room_select.css';

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}

const root = document.getElementById('root');
const appRoot = createRoot(root);
appRoot.render(
  <ErrorBoundary>
    <RoomSelectApp />
  </ErrorBoundary>
);
