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
        { id: 'validate', label: 'システム確認', action: 'validateSystemSetup', icon: '🔍' },
        {
          id: 'templates',
          label: 'マスタテンプレート作成',
          action: 'createMasterSheetTemplates',
          icon: '📋',
        },
        { id: 'propertyIds', label: '物件ID採番', action: 'formatAllPropertyIds', icon: '🏷️' },
        { id: 'roomIds', label: '部屋ID生成', action: 'generateRoomIds', icon: '🔢' },
        {
          id: 'initialData',
          label: '検針データ作成',
          action: 'createInitialInspectionData',
          icon: '📊',
        },
        {
          id: 'populate',
          label: 'データ反映',
          action: 'populateInspectionDataFromMasters',
          icon: '📤',
        },
        { id: 'finalCheck', label: '最終確認', action: 'validateSystemSetup', icon: '✅' },
      ],
      results: {},
      loading: false,
      error: '',

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
              self.error = (result && result.error) || 'ステップの実行に失敗しました';
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

      reset: function () {
        this.results = {};
        this.currentStep = 0;
        this.loading = false;
        this.error = '';
      },
    };
  });
});
