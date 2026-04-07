import { mount } from 'svelte';
import MeterReadingPage from '../../components/MeterReading/MeterReadingPage.svelte';
import '../../styles/meter_reading.css';

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}

// Wait for styles to load
const root = document.getElementById('root');
root.classList.remove('styles-loading');
root.classList.add('styles-loaded');

if (root) {
  mount(MeterReadingPage, {
    target: root,
    props: {},
    intro: true,
  });
  const skeletons = root.querySelectorAll('.skeleton-header, .skeleton-card');
  skeletons.forEach((el) => el.remove());
}
