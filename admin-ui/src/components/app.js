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
        { id: 'monthly', label: '月次処理', icon: '📅' },
        { id: 'setup', label: '初期設定', icon: '⚙️' },
        { id: 'maintenance', label: 'データメンテ', icon: '🔧' },
        { id: 'diagnostics', label: 'システム診断', icon: '🔍' },
      ],

      init: function () {
        var self = this;
        var savedToken = sessionStorage.getItem('ADMIN_TOKEN');
        if (savedToken) {
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
      },

      get authenticated() {
        return Alpine.store('auth').authenticated;
      },

      get activeTab() {
        return Alpine.store('app').activeTab;
      },

      switchTab: function (tabId) {
        Alpine.store('app').setActiveTab(tabId);
      },

      isActive: function (tabId) {
        return Alpine.store('app').activeTab === tabId;
      },

      logout: function () {
        Alpine.store('auth').logout();
        Alpine.store('app').setActiveTab('dashboard');
      },
    };
  });
});
