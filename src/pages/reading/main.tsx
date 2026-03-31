import { createRoot } from 'react-dom/client';
import ErrorBoundary from '../../components/shared/ErrorBoundary';
import MeterReadingApp from '../../components/MeterReading/MeterReadingApp';
import '../../styles/meter_reading.css';

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}

// Wait for styles to load
const root = document.getElementById('root')!;
root.classList.remove('styles-loading');
root.classList.add('styles-loaded');

const appRoot = createRoot(root);
appRoot.render(
  <ErrorBoundary>
    <MeterReadingApp />
  </ErrorBoundary>
);
