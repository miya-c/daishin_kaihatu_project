/**
 * Alpine.js Global Stores
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

    logout: function () {
      sessionStorage.removeItem('ADMIN_TOKEN');
      this.authenticated = false;
      this.token = null;
    },
  });

  Alpine.store('theme', {
    dark: false,

    init: function () {
      var saved = localStorage.getItem('admin-theme');
      if (saved === 'dark') {
        this.dark = true;
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        this.dark = false;
        document.documentElement.setAttribute('data-theme', 'light');
      }
    },

    toggle: function () {
      this.dark = !this.dark;
      if (this.dark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('admin-theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('admin-theme', 'light');
      }
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
