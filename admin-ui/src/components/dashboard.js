/**
 * Dashboard Component — Alpine.data('dashboard')
 *
 * Displays summary stat cards, spreadsheet info,
 * and a property table with inspection status.
 */

import { callAdminAPI } from '../api.js';

document.addEventListener('alpine:init', function () {
  Alpine.data('dashboard', function () {
    return {
      loading: true,
      data: null,
      properties: [],
      error: '',

      init: function () {
        var self = this;
        this.refresh();

        this.$watch('$store.app.activeTab', function (v) {
          if (v === 'dashboard') {
            self.refresh();
          }
        });
      },

      refresh: function () {
        var self = this;
        self.loading = true;
        self.error = '';

        callAdminAPI('getAdminDashboardData')
          .then(function (result) {
            if (result && result.success) {
              self.data = result.data;
              self.properties = result.properties || [];
            }
          })
          .catch(function (err) {
            self.error = 'データの読み込みに失敗しました: ' + (err.message || err);
          })
          .finally(function () {
            self.loading = false;
          });
      },

      completionColor: function () {
        if (!this.data) return 'is-danger';
        var rate = this.data.completionRate || 0;
        if (rate >= 80) return 'is-success';
        if (rate >= 50) return 'is-warning';
        return 'is-danger';
      },
    };
  });
});
