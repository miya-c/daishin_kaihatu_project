import { callAdminAPI } from '../api.js';

document.addEventListener('alpine:init', function () {
  Alpine.data('monthlyProcess', function () {
    return {
      step: 'idle',
      confirmExecute: false,
      checkResults: null,
      executeResult: null,
      error: '',
      confirmReset: false,
      monthlyTargetYear: new Date().getFullYear(),
      monthlyTargetMonth: String(new Date().getMonth() + 1).padStart(2, '0'),

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
              self.error = (result && result.error) || '確認に失敗しました';
              self.step = 'error';
            }
          })
          .catch(function (err) {
            self.error = err.message || '確認でエラーが発生しました';
            self.step = 'error';
          });
      },

      runExecute: function () {
        var self = this;
        // Pre-execution confirmation gate
        if (!self.confirmExecute) {
          self.confirmExecute = true;
          return;
        }
        self.step = 'executing';
        self.error = '';

        callAdminAPI('executeMonthlyProcess', {
          targetYear: self.monthlyTargetYear,
          targetMonth: self.monthlyTargetMonth,
        })
          .then(function (result) {
            if (result && result.success) {
              self.executeResult = result.data;
              self.step = 'done';
              self.confirmExecute = false;
            } else {
              self.error = (result && result.error) || '月次処理に失敗しました';
              self.step = 'error';
              self.confirmExecute = false;
            }
          })
          .catch(function (err) {
            self.error = err.message || '月次処理でエラーが発生しました';
            self.step = 'error';
            self.confirmExecute = false;
          });
      },

      reset: function () {
        if (this.checkResults || this.executeResult) {
          this.confirmReset = true;
          return;
        }
        this.step = 'idle';
        this.checkResults = null;
        this.executeResult = null;
        this.error = '';
        this.confirmReset = false;
      },
      confirmResetAction: function () {
        this.step = 'idle';
        this.checkResults = null;
        this.executeResult = null;
        this.error = '';
        this.confirmReset = false;
      },
      cancelReset: function () {
        this.confirmReset = false;
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

      setMonthlyTargetYear: function (e) {
        this.monthlyTargetYear = Number(e.target.value);
      },

      setMonthlyTargetMonth: function (e) {
        this.monthlyTargetMonth = e.target.value;
      },

      getMonthlyTargetLabel: function () {
        var m = Number(this.monthlyTargetMonth);
        return this.monthlyTargetYear + '年' + m + '月分';
      },

      getMonthLabel: function (m) {
        return Number(m) + '月';
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
          warning: '注意',
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

      getCheckList: function () {
        return this.checkResults && this.checkResults.checks ? this.checkResults.checks : [];
      },

      getExecuteMessage: function () {
        return this.executeResult && this.executeResult.summary
          ? this.executeResult.summary.message
          : '月次処理が完了しました。先月のデータは保存されています。';
      },

      getExecutedAt: function () {
        return this.executeResult ? '実行時刻: ' + (this.executeResult.executedAt || '') : '';
      },

      getExecutedDuration: function () {
        return this.executeResult ? '所要時間: ' + (this.executeResult.duration || '') : '';
      },

      hasCheckIssues: function () {
        return this.checkResults && this.checkResults.issues && this.checkResults.issues.length > 0;
      },

      undoStep: 'idle',
      undoBackupInfo: null,
      undoConfirm: false,
      undoResult: null,
      undoError: '',

      checkUndoAvailability: function () {
        var self = this;
        callAdminAPI('getMonthlyBackupInfo')
          .then(function (result) {
            if (result && result.success && result.exists) {
              self.undoBackupInfo = result.metadata;
            } else {
              self.undoBackupInfo = null;
            }
          })
          .catch(function () {
            self.undoBackupInfo = null;
          });
      },

      showUndoConfirm: function () {
        if (!this.undoBackupInfo) return;
        this.undoStep = 'confirm';
        this.undoConfirm = false;
        this.undoError = '';
      },

      cancelUndo: function () {
        this.undoStep = 'idle';
        this.undoConfirm = false;
      },

      confirmUndoExecute: function () {
        if (!this.undoConfirm) {
          this.undoConfirm = true;
          return;
        }
        this.runUndo();
      },

      runUndo: function () {
        var self = this;
        self.undoStep = 'executing';
        self.undoError = '';

        callAdminAPI('undoMonthlyProcess')
          .then(function (result) {
            if (result && result.success) {
              self.undoResult = result.data;
              self.undoBackupInfo = null;
              self.undoStep = 'done';
              self.undoConfirm = false;
            } else {
              self.undoError = (result && result.error) || '取り消しに失敗しました';
              self.undoStep = 'error';
              self.undoConfirm = false;
            }
          })
          .catch(function (err) {
            self.undoError = err.message || '取り消しでエラーが発生しました';
            self.undoStep = 'error';
            self.undoConfirm = false;
          });
      },

      resetUndo: function () {
        this.undoStep = 'idle';
        this.undoBackupInfo = null;
        this.undoResult = null;
        this.undoError = '';
        this.undoConfirm = false;
        this.checkUndoAvailability();
      },

      getUndoTargetLabel: function () {
        if (!this.undoBackupInfo || !this.undoBackupInfo.executedYearMonth) return '';
        var parts = this.undoBackupInfo.executedYearMonth.split('-');
        return parts[0] + '年' + parseInt(parts[1], 10) + '月分';
      },
    };
  });
});
