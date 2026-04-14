import './api.js';
import './stores.js';
import './components/auth.js';
import './components/app.js';
import './components/dashboard.js';
import './components/monthly-process.js';
import './components/data-maintenance.js';
import './components/property-management.js';
import './components/setup-wizard.js';
import './components/diagnostics.js';

import Alpine from '@alpinejs/csp';

window.Alpine = Alpine;
Alpine.start();
