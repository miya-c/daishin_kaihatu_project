import { callAdminAPI } from '../api.js';

document.addEventListener('alpine:init', function () {
  Alpine.data('appManagement', function () {
    return {
      loading: true,
      apps: [],
      licenses: [],
      error: '',

      showAddAppModal: false,
      showEditAppModal: false,
      showDeleteAppModal: false,

      appFormAppId: '',
      appFormAppName: '',
      appFormIcon: '',

      editAppTarget: null,
      deleteAppTarget: null,

      init: function () {
        var self = this;
        self.load();
        self.$watch('$store.app.activeTab', function (v) {
          if (v === 'apps') {
            self.load();
          }
        });
      },

      load: function () {
        var self = this;
        self.loading = true;
        self.error = '';

        Promise.all([
          callAdminAPI('listApps'),
          callAdminAPI('listLicenses'),
        ])
          .then(function (results) {
            var appResult = results[0];
            var licenseResult = results[1];
            if (appResult && appResult.success) {
              self.apps = appResult.apps || [];
            }
            if (licenseResult && licenseResult.success) {
              self.licenses = licenseResult.licenses || [];
            }
          })
          .catch(function (err) {
            self.error = 'データの読み込みに失敗しました: ' + (err.message || err);
          })
          .finally(function () {
            self.loading = false;
          });
      },

      getLicenseCount: function (appId) {
        return this.licenses.filter(function (c) { return c.appId === appId; }).length;
      },

      openAddAppModal: function () {
        this.appFormAppId = '';
        this.appFormAppName = '';
        this.appFormIcon = '';
        this.showAddAppModal = true;
      },

      doAddApp: function () {
        var self = this;
        if (!self.appFormAppId.trim() || !self.appFormAppName.trim()) {
          Alpine.store('toast').error('アプリIDとアプリ名は必須です');
          return;
        }
        var exists = self.apps.find(function (a) { return a.appId === self.appFormAppId.trim(); });
        if (exists) {
          Alpine.store('toast').error('同じアプリIDが既に存在します');
          return;
        }
        self.loading = true;
        callAdminAPI('addApp', {
          appId: self.appFormAppId.trim(),
          appName: self.appFormAppName.trim(),
          icon: self.appFormIcon || '📱',
        })
          .then(function (result) {
            if (result && result.success) {
              Alpine.store('toast').success('アプリを追加しました');
              self.showAddAppModal = false;
              self.load();
            } else {
              Alpine.store('toast').error(result && result.message ? result.message : '追加に失敗しました');
            }
          })
          .catch(function (err) {
            Alpine.store('toast').error('通信エラー: ' + err.message);
          })
          .finally(function () {
            self.loading = false;
          });
      },

      openEditAppModal: function (app) {
        this.editAppTarget = app;
        this.appFormAppId = app.appId;
        this.appFormAppName = app.appName;
        this.appFormIcon = app.icon;
        this.showEditAppModal = true;
      },

      doEditApp: function () {
        var self = this;
        if (!self.appFormAppName.trim()) {
          Alpine.store('toast').error('アプリ名は必須です');
          return;
        }
        self.loading = true;
        callAdminAPI('updateApp', {
          appId: self.editAppTarget.appId,
          appName: self.appFormAppName.trim(),
          icon: self.appFormIcon || '📱',
        })
          .then(function (result) {
            if (result && result.success) {
              Alpine.store('toast').success('アプリを更新しました');
              self.showEditAppModal = false;
              self.load();
            } else {
              Alpine.store('toast').error(result && result.message ? result.message : '更新に失敗しました');
            }
          })
          .catch(function (err) {
            Alpine.store('toast').error('通信エラー: ' + err.message);
          })
          .finally(function () {
            self.loading = false;
          });
      },

      openDeleteAppModal: function (app) {
        var count = this.licenses.filter(function (c) { return c.appId === app.appId; }).length;
        if (count > 0) {
          Alpine.store('toast').error('このアプリには' + count + '件のライセンスが紐づいています。先にライセンスを削除してください。');
          return;
        }
        this.deleteAppTarget = app;
        this.showDeleteAppModal = true;
      },

      doDeleteApp: function () {
        var self = this;
        if (!self.deleteAppTarget) return;
        self.loading = true;
        callAdminAPI('deleteApp', { appId: self.deleteAppTarget.appId })
          .then(function (result) {
            if (result && result.success) {
              Alpine.store('toast').success('アプリを削除しました');
              self.showDeleteAppModal = false;
              self.load();
            } else {
              Alpine.store('toast').error(result && result.message ? result.message : '削除に失敗しました');
            }
          })
          .catch(function (err) {
            Alpine.store('toast').error('通信エラー: ' + err.message);
          })
          .finally(function () {
            self.loading = false;
          });
      },
    };
  });
});
