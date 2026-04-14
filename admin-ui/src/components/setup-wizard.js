/**
 * Setup Wizard Component — Alpine.data('setupWizard')
 *
 * 7-step guided setup wizard for system initialization.
 */

import { callAdminAPI } from '../api.js';

document.addEventListener('alpine:init', function () {
  Alpine.data('setupWizard', function () {
    return {
      currentStep: 0,
      steps: [
        {
          id: 'validate',
          label: 'システムの状態確認',
          action: 'validateSystemSetup',
          icon: '🔍',
          description: 'スプレッドシートの構成を確認します',
        },
        {
          id: 'templates',
          label: 'テンプレート作成',
          action: 'createMasterSheetTemplates',
          icon: '📋',
          description: 'データ入力用のひな形シートを作成します',
        },
        {
          id: 'propertyIds',
          label: '物件番号の設定',
          action: 'formatAllPropertyIds',
          icon: '🏷️',
          description: '物件ごとの管理番号を整えます',
        },
        {
          id: 'roomIds',
          label: '部屋番号の設定',
          action: 'generateRoomIds',
          icon: '🔢',
          description: '部屋ごとの管理番号を自動で割り当てます',
        },
        {
          id: 'initialData',
          label: '検針台帳の作成',
          action: 'createInitialInspectionData',
          icon: '📊',
          description: '検針データを記録する台帳を作成します',
        },
        {
          id: 'populate',
          label: 'マスタデータの登録',
          action: 'populateInspectionDataFromMasters',
          icon: '📤',
          description: '物件・部屋のマスタデータを台帳に反映します',
        },
        {
          id: 'finalCheck',
          label: '最終確認',
          action: 'validateSystemSetup',
          icon: '✅',
          description: 'すべての設定が正しく完了しているか確認します',
        },
      ],
      results: {},
      loading: false,
      error: '',
      confirmReset: false,
      allComplete: false,

      executeCurrentStep: function () {
        var self = this;
        var step = self.steps[self.currentStep];
        self.loading = true;
        self.error = '';

        callAdminAPI(step.action)
          .then(function (result) {
            self.results[step.id] = {
              success: result && result.success,
              data: result,
              timestamp: new Date().toISOString(),
            };
            if (!result || !result.success) {
              self.error = (result && result.error) || '実行に失敗しました';
            }
          })
          .catch(function (err) {
            self.results[step.id] = {
              success: false,
              error: err.message || err,
              timestamp: new Date().toISOString(),
            };
            self.error = 'エラーが発生しました: ' + (err.message || err);
          })
          .finally(function () {
            self.loading = false;
            // Update overall completion state after each step run
            self.allComplete =
              self.steps.length > 0 &&
              self.steps.every(function (s) {
                var r = self.results[s.id];
                return r && r.success;
              });
          });
      },

      goToStep: function (index) {
        if (index >= 0 && index < this.steps.length) {
          this.currentStep = index;
          this.error = '';
        }
      },

      nextStep: function () {
        if (!this.isLastStep()) {
          this.currentStep++;
          this.error = '';
        }
      },

      prevStep: function () {
        if (!this.isFirstStep()) {
          this.currentStep--;
          this.error = '';
        }
      },

      isFirstStep: function () {
        return this.currentStep === 0;
      },

      isLastStep: function () {
        return this.currentStep === this.steps.length - 1;
      },

      getStepResult: function (stepId) {
        return this.results[stepId] || null;
      },

      getStepStatus: function (stepId) {
        if (this.loading) {
          var currentStep = this.steps[this.currentStep];
          if (currentStep && currentStep.id === stepId) {
            return 'running';
          }
        }
        var result = this.results[stepId];
        if (!result) return 'pending';
        return result.success ? 'success' : 'error';
      },

      getStatusIcon: function (status) {
        switch (status) {
          case 'running':
            return '⏳';
          case 'success':
            return '✅';
          case 'error':
            return '❌';
          default:
            return '⏳';
        }
      },

      formatStepResult: function (stepId) {
        var result = this.results[stepId];
        if (!result) return '';
        if (result.success) {
          var data = result.data;
          if (!data) return '完了しました';
          if (data.message) return data.message;
          var parts = [];
          if (data.created) parts.push('作成: ' + data.created);
          if (data.updated) parts.push('更新: ' + data.updated);
          if (data.total) parts.push('合計: ' + data.total);
          if (data.valid !== undefined) parts.push('有効: ' + data.valid);
          if (data.errors !== undefined && data.errors > 0) parts.push('エラー: ' + data.errors);
          return parts.length > 0 ? parts.join(' / ') : '完了しました';
        }
        return result.error || 'エラーが発生しました';
      },

      reset: function () {
        if (Object.keys(this.results).length > 0) {
          this.confirmReset = true;
          return;
        }
        this.results = {};
        this.currentStep = 0;
        this.loading = false;
        this.error = '';
        this.confirmReset = false;
      },
      confirmResetAction: function () {
        this.results = {};
        this.currentStep = 0;
        this.loading = false;
        this.error = '';
        this.confirmReset = false;
      },
      cancelReset: function () {
        this.confirmReset = false;
      },
    };
  });
});
