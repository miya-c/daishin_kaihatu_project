/**
 * Diagnostics Component — Alpine.data('diagnostics')
 *
 * Runs system diagnostics and displays results:
 * overall status badge, sheets table, issues list, run button.
 */

import { callAdminAPI } from '../api.js';

document.addEventListener('alpine:init', function () {
  Alpine.data('diagnostics', function () {
    return {
      loading: false,
      data: null,
      error: '',
      lastRun: null,

      runDiagnostics: function () {
        var self = this;
        self.loading = true;
        self.error = '';

        callAdminAPI('runSystemDiagnostics')
          .then(function (result) {
            if (result && result.success) {
              self.data = result.data;
              self.lastRun = result.data.timestamp || new Date().toISOString();
            } else {
              self.error = '確認の実行に失敗しました';
            }
          })
          .catch(function (err) {
            self.error = '確認の実行に失敗しました: ' + (err.message || err);
          })
          .finally(function () {
            self.loading = false;
          });
      },

      getOverallStatus: function () {
        if (!this.data) return 'UNKNOWN';
        return this.data.overall || 'UNKNOWN';
      },

      getStatusClass: function (status) {
        switch (status) {
          case 'HEALTHY':
          case 'OK':
            return 'is-success';
          case 'WARNING':
            return 'is-warning';
          case 'ERROR':
          case 'CRITICAL':
            return 'is-danger';
          default:
            return 'is-info';
        }
      },

      getStatusLabel: function (status) {
        switch (status) {
          case 'HEALTHY':
            return '正常';
          case 'WARNING':
            return '警告';
          case 'ERROR':
            return 'エラー';
          default:
            return '不明';
        }
      },

      getSeverityIcon: function (severity) {
        switch (severity) {
          case 'error':
            return '🔴';
          case 'warning':
            return '🟡';
          case 'info':
            return '🔵';
          default:
            return '⚪';
        }
      },
    };
  });
});
