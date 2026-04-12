/**
 * Admin UI — Bootstrap entry point
 *
 * Imports all modules to register Alpine.js components
 * and stores via alpine:init event listeners.
 */

import './api.js';
import './stores.js';
import './components/auth.js';
import './components/app.js';
import './components/dashboard.js';
import './components/monthly-process.js';
import './components/data-maintenance.js';
import './components/setup-wizard.js';
import './components/diagnostics.js';

import Alpine from '@alpinejs/csp';

console.log(
  '[DEBUG] Alpine imported:',
  typeof Alpine,
  Alpine ? Object.keys(Alpine).slice(0, 5).join(',') : 'null'
);

window.Alpine = Alpine;

console.log('[DEBUG] About to call Alpine.start()');
try {
  Alpine.start();
  console.log('[DEBUG] Alpine.start() completed');
} catch (e) {
  console.error('[DEBUG] Alpine.start() FAILED:', e.message, e.stack);
}

console.log('[DEBUG] Alpine.version:', Alpine.version || 'unknown');
console.log(
  '[DEBUG] document.querySelectorAll("[x-data]").length:',
  document.querySelectorAll('[x-data]').length
);

console.log('Admin UI loaded');
