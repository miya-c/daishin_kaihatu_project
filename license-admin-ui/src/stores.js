/**
 * Alpine.js Global Stores for License Admin
 *
 * Registered via the alpine:init event so they are available
 * before any component tries to read them.
 */

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

    SESSION_TIMEOUT_MS: 8 * 60 * 60 * 1000,

    isSessionExpired: function () {
      if (!this.authenticated) {
        return false;
      }
      var lastActivity = sessionStorage.getItem('ADMIN_LAST_ACTIVITY');
      if (!lastActivity) {
        return true;
      }
      return Date.now() - parseInt(lastActivity, 10) > this.SESSION_TIMEOUT_MS;
    },

    touchActivity: function () {
      sessionStorage.setItem('ADMIN_LAST_ACTIVITY', Date.now().toString());
    },

    logout: function () {
      sessionStorage.removeItem('ADMIN_TOKEN');
      sessionStorage.removeItem('ADMIN_LAST_ACTIVITY');
      this.authenticated = false;
      this.token = null;
    },
  });

  Alpine.store('theme', {
    current: localStorage.getItem('license-admin-theme') || 'blue',

    init: function () {
      this.apply();
    },

    apply: function () {
      document.documentElement.setAttribute('data-theme', this.current);
    },

    set: function (theme) {
      this.current = theme;
      localStorage.setItem('license-admin-theme', theme);
      this.apply();
    },

    isDark: function () {
      return this.current === 'mono-dark';
    },
  });

  Alpine.store('theme').init();

  Alpine.store('toast', {
    items: [],
    _nextId: 0,

    show: function (message, type) {
      var id = ++this._nextId;
      this.items.push({ id: id, message: message, type: type || 'info' });
      var self = this;
      setTimeout(function () {
        self.dismiss(id);
      }, 4000);
    },

    success: function (message) {
      this.show(message, 'success');
    },
    warning: function (message) {
      this.show(message, 'warning');
    },
    error: function (message) {
      this.show(message, 'error');
    },

    dismiss: function (id) {
      this.items = this.items.filter(function (item) {
        return item.id !== id;
      });
    },
  });
});
