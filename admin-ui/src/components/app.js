/**
 * Admin App Component — Alpine.data('adminApp')
 *
 * Root layout component that manages tab navigation and
 * session restoration on page load.
 */

import { callAdminAPI } from '../api.js';

document.addEventListener('alpine:init', function () {
  Alpine.data('adminApp', function () {
    return {
      tabs: [
        { id: 'dashboard', label: 'ダッシュボード', icon: '📊' },
        { id: 'properties', label: '物件管理', icon: '🏠' },
        { id: 'monthly', label: '月次処理', icon: '📅' },
        { id: 'maintenance', label: 'データ管理', icon: '🔧' },
        { id: 'setup', label: '初期設定', icon: '⚙️' },
      ],

      sidebarOpen: false,
      sidebarClosed: false,

      init: function () {
        var self = this;
        var savedToken = sessionStorage.getItem('ADMIN_TOKEN');
        if (savedToken) {
          if (Alpine.store('auth').isSessionExpired()) {
            Alpine.store('toast').warning('ログインの有効期限が切れました');
            Alpine.store('auth').logout();
          } else {
            callAdminAPI('verifyToken', {})
              .then(function (result) {
                if (result && result.success) {
                  Alpine.store('auth').authenticated = true;
                  Alpine.store('auth').token = savedToken;
                } else {
                  Alpine.store('auth').logout();
                }
              })
              .catch(function () {
                Alpine.store('auth').logout();
              });
          }
        }

        // Restore tab from URL hash
        var hash = window.location.hash.replace('#', '');
        if (
          hash &&
          this.tabs.some(function (t) {
            return t.id === hash;
          })
        ) {
          Alpine.store('app').setActiveTab(hash);
        }

        // Listen for browser back/forward
        window.addEventListener('popstate', function () {
          var h = window.location.hash.replace('#', '');
          if (
            h &&
            self.tabs.some(function (t) {
              return t.id === h;
            })
          ) {
            Alpine.store('app').setActiveTab(h);
          }
        });

        this._keyHandler = function (e) {
          if (e.key === 'Escape') {
            if (self.sidebarOpen) {
              self.sidebarOpen = false;
            } else if (self.sidebarClosed) {
              self.sidebarClosed = false;
            }
          }
        };
        document.addEventListener('keydown', this._keyHandler);
      },

      destroy: function () {
        if (this._keyHandler) {
          document.removeEventListener('keydown', this._keyHandler);
        }
      },

      get authenticated() {
        return Alpine.store('auth').authenticated;
      },

      get activeTab() {
        return Alpine.store('app').activeTab;
      },

      switchTab: function (tabId) {
        Alpine.store('app').setActiveTab(tabId);
        history.pushState(null, '', '#' + tabId);
        this.sidebarOpen = false;
      },

      switchToProperties: function (propId) {
        Alpine.store('app').setActiveTab('properties');
        var hash = '#properties/' + (propId || '');
        history.pushState(null, '', hash);
        this.sidebarOpen = false;
      },

      isActive: function (tabId) {
        return Alpine.store('app').activeTab === tabId;
      },

      logout: function () {
        Alpine.store('toast').success('ログアウトしました');
        Alpine.store('auth').logout();
        Alpine.store('app').setActiveTab('dashboard');
      },

      get activeTabLabel() {
        var tab = this.tabs.find(function (t) {
          return t.id === Alpine.store('app').activeTab;
        });
        return tab ? tab.label : '';
      },

      toggleSidebar: function () {
        var isMobile = window.innerWidth <= 768;
        if (isMobile) {
          this.sidebarOpen = !this.sidebarOpen;
        } else {
          this.sidebarClosed = !this.sidebarClosed;
        }
      },

      closeSidebar: function () {
        this.sidebarOpen = false;
      },
    };
  });
});
