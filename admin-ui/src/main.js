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

console.log('Admin UI loaded');
