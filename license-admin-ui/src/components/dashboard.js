import { callAdminAPI } from '../api.js';

document.addEventListener('alpine:init', function () {
  Alpine.data('licenseDashboard', function () {
    return {
      loading: true,
      apps: [],
      totalActive: 0,
      totalExpiring: 0,
      totalRevoked: 0,
      perAppBreakdown: [],
      error: '',

      init: function () {
        var self = this;
        self.refresh();
        self.$watch('$store.app.activeTab', function (v) {
          if (v === 'dashboard') {
            self.refresh();
          }
        });
      },

      refresh: function () {
        var self = this;
        self.loading = true;
        self.error = '';

        callAdminAPI('getDashboard')
          .then(function (result) {
            if (result && result.success) {
              self.apps = result.apps || [];
              self.totalActive = result.totalActive || 0;
              self.totalExpiring = result.totalExpiring || 0;
              self.totalRevoked = result.totalRevoked || 0;
              self.perAppBreakdown = result.perAppBreakdown || [];
            }
          })
          .catch(function (err) {
            self.error = 'データの読み込みに失敗しました: ' + (err.message || err);
          })
          .finally(function () {
            self.loading = false;
          });
      },

      countByStatus: function (status) {
        if (status === 'active') return this.totalActive;
        if (status === 'expiring') return this.totalExpiring;
        if (status === 'revoked') return this.totalRevoked;
        return 0;
      },
    };
  });
});
