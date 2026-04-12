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
        this.refresh();
      },

      refresh: function () {
        var self = this;
        self.loading = true;
        self.error = '';

        Promise.all([callAdminAPI('getAdminDashboardData'), callAdminAPI('getProperties')])
          .then(function (results) {
            var dashboardResult = results[0];
            var propertiesResult = results[1];

            if (dashboardResult && dashboardResult.success) {
              self.data = dashboardResult.data;
            }

            if (propertiesResult && propertiesResult.success) {
              self.properties = propertiesResult.data || [];
            }
          })
          .catch(function (err) {
            self.error = 'データの取得に失敗しました: ' + (err.message || err);
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
