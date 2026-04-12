/**
 * Alpine.js Global Stores
 *
 * Registered via the alpine:init event so they are available
 * before any component tries to read them.
 */

import { callAdminAPI } from './api.js';

document.addEventListener('alpine:init', function () {
  Alpine.store('app', {
    loading: false,
    error: null,
    activeTab: 'dashboard',

    setActiveTab: function (tab) {
      this.activeTab = tab;
    },

    clearError: function () {
      this.error = null;
    },
  });

  Alpine.store('auth', {
    authenticated: false,
    token: null,

    logout: function () {
      sessionStorage.removeItem('ADMIN_TOKEN');
      this.authenticated = false;
      this.token = null;
    },
  });

  var savedToken = sessionStorage.getItem('ADMIN_TOKEN');
  if (savedToken) {
    callAdminAPI('verifyToken', {}).then(function (result) {
      if (result && result.success) {
        Alpine.store('auth').authenticated = true;
        Alpine.store('auth').token = savedToken;
      } else {
        sessionStorage.removeItem('ADMIN_TOKEN');
      }
    });
  }
});
