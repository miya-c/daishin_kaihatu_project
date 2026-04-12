import { callAdminAPI } from '../api.js';

document.addEventListener('alpine:init', function () {
  Alpine.data('monthlyProcess', function () {
    return {
      step: 'idle',
      checkResults: null,
      executeResult: null,
      error: '',

      runPreCheck: function () {
        var self = this;
        self.step = 'checking';
        self.error = '';

        callAdminAPI('preCheckMonthlyProcess')
          .then(function (result) {
            if (result && result.success) {
              self.checkResults = result.data;
              self.step = 'confirm';
            } else {
              self.error = (result && result.error) || '事前チェックに失敗しました';
              self.step = 'error';
            }
          })
          .catch(function (err) {
            self.error = err.message || '事前チェックでエラーが発生しました';
            self.step = 'error';
          });
      },

      runExecute: function () {
        var self = this;
        self.step = 'executing';
        self.error = '';

        callAdminAPI('executeMonthlyProcess')
          .then(function (result) {
            if (result && result.success) {
              self.executeResult = result.data;
              self.step = 'done';
            } else {
              self.error = (result && result.error) || '月次処理に失敗しました';
              self.step = 'error';
            }
          })
          .catch(function (err) {
            self.error = err.message || '月次処理でエラーが発生しました';
            self.step = 'error';
          });
      },

      reset: function () {
        this.step = 'idle';
        this.checkResults = null;
        this.executeResult = null;
        this.error = '';
      },

      getCategoryClass: function (category) {
        var map = {
          error: 'is-danger',
          warning: 'is-warning',
          success: 'is-success',
          info: 'is-info',
        };
        return map[category] || 'is-info';
      },

      getCategoryIcon: function (category) {
        var map = {
          error: '❌',
          warning: '⚠️',
          success: '✅',
          info: 'ℹ️',
        };
        return map[category] || 'ℹ️';
      },

      getCategoryLabel: function (category) {
        var map = {
          error: 'エラー',
          warning: '警告',
          success: '成功',
          info: '情報',
        };
        return map[category] || '情報';
      },

      get errorCount() {
        return this.checkResults ? this.checkResults.errorCount || 0 : 0;
      },

      get warningCount() {
        return this.checkResults ? this.checkResults.warningCount || 0 : 0;
      },

      get canExecute() {
        return this.checkResults && this.errorCount === 0;
      },
    };
  });
});
