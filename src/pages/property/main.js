import PropertySelectPage from '../../components/PropertySelect/PropertySelectPage.svelte';
import '../../styles/property_select.css';

// Prefetch next page
const prefetchLink = document.createElement('link');
prefetchLink.rel = 'prefetch';
prefetchLink.href = '/room/';
document.head.appendChild(prefetchLink);

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}

const root = document.getElementById('root');
if (root) {
  new PropertySelectPage({ target: root });
}
