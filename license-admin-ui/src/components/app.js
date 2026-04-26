/**
 * License Admin App Component — Alpine.data('licenseAdmin')
 *
 * Root layout component that manages tab navigation and
 * session restoration on page load.
 */

import { callAdminAPI } from '../api.js';

document.addEventListener('alpine:init', function () {
  Alpine.data('licenseAdmin', function () {
    return {
      tabs: [
        { id: 'dashboard', label: 'ダッシュボード', icon: '📊' },
        { id: 'licenses', label: 'ライセンス一覧', icon: '📋' },
        { id: 'apps', label: 'アプリ管理', icon: '📱' },
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
        this.sidebarOpen = false;
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
