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

      hasSheetInfo: function () {
        return this.data && this.data.spreadsheetInfo;
      },
      getSheetName: function () {
        return this.data && this.data.spreadsheetInfo ? this.data.spreadsheetInfo.name : '';
      },
      getSheetUrl: function () {
        return this.data && this.data.spreadsheetInfo ? this.data.spreadsheetInfo.url : '#';
      },
      hasSheetUrl: function () {
        return this.data && this.data.spreadsheetInfo && this.data.spreadsheetInfo.url;
      },
      getDataCount: function (field) {
        return this.data ? this.data[field] || 0 : 0;
      },
      getCompletionRate: function () {
        return this.data && this.data.completionRate != null
          ? this.data.completionRate + '%'
          : '0%';
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
