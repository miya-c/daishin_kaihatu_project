import { callAdminAPI } from '../api.js';

document.addEventListener('alpine:init', function () {
  Alpine.data('licenseList', function () {
    return {
      loading: true,
      licenses: [],
      apps: [],
      error: '',

      filterApp: '',
      filterStatus: '',
      filterSearch: '',

      showAddModal: false,
      showEditModal: false,
      showDeleteModal: false,

      addFormAppId: '',
      addFormCompanyName: '',
      addFormScriptId: '',
      addFormStatus: 'active',
      addFormExpiryDate: '',
      addFormNotes: '',

      editTarget: null,
      editCompanyName: '',
      editScriptId: '',
      editStatus: 'active',
      editExpiryDate: '',
      editNotes: '',

      deleteTarget: null,

      init: function () {
        var self = this;
        self.load();
        self.$watch('$store.app.activeTab', function (v) {
          if (v === 'licenses') {
            self.load();
          }
        });
      },

      load: function () {
        var self = this;
        self.loading = true;
        self.error = '';

        Promise.all([
          callAdminAPI('listLicenses'),
          callAdminAPI('listApps'),
        ])
          .then(function (results) {
            var licenseResult = results[0];
            var appResult = results[1];
            if (licenseResult && licenseResult.success) {
              self.licenses = licenseResult.licenses || [];
            }
            if (appResult && appResult.success) {
              self.apps = appResult.apps || [];
            }
          })
          .catch(function (err) {
            self.error = 'データの読み込みに失敗しました: ' + (err.message || err);
          })
          .finally(function () {
            self.loading = false;
          });
      },

      get filteredLicenses() {
        var self = this;
        return self.licenses.filter(function (c) {
          if (self.filterApp !== '' && c.appId !== self.filterApp) return false;
          if (self.filterStatus !== '' && c.status !== self.filterStatus) return false;
          if (self.filterSearch !== '' && c.companyName.indexOf(self.filterSearch) === -1) return false;
          return true;
        });
      },

      statusTagClass: function (status) {
        if (status === 'active') return 'is-active-tag';
        if (status === 'expiring') return 'is-expiring-tag';
        if (status === 'revoked') return 'is-revoked-tag';
        return '';
      },

      copyScriptId: function (scriptId) {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(scriptId).then(function () {
            Alpine.store('toast').success('コピーしました');
          });
        } else {
          var ta = document.createElement('textarea');
          ta.value = scriptId;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          Alpine.store('toast').success('コピーしました');
        }
      },

      getAppIcon: function (appId) {
        var app = this.apps.find(function (a) { return a.appId === appId; });
        return app ? app.icon : '📱';
      },

      getAppName: function (appId) {
        var app = this.apps.find(function (a) { return a.appId === appId; });
        return app ? app.appName : appId;
      },

      get30DaysLater: function () {
        var d = new Date();
        d.setDate(d.getDate() + 30);
        var yyyy = d.getFullYear();
        var mm = String(d.getMonth() + 1).padStart(2, '0');
        var dd = String(d.getDate()).padStart(2, '0');
        return yyyy + '-' + mm + '-' + dd;
      },

      openAddModal: function () {
        this.addFormAppId = this.apps.length > 0 ? this.apps[0].appId : '';
        this.addFormCompanyName = '';
        this.addFormScriptId = '';
        this.addFormStatus = 'active';
        this.addFormExpiryDate = '';
        this.addFormNotes = '';
        this.showAddModal = true;
      },

      doAdd: function () {
        var self = this;
        if (!self.addFormCompanyName.trim() || !self.addFormScriptId.trim()) {
          Alpine.store('toast').error('会社名とスクリプトIDは必須です');
          return;
        }
        self.loading = true;
        callAdminAPI('addLicense', {
          appId: self.addFormAppId,
          companyName: self.addFormCompanyName.trim(),
          scriptId: self.addFormScriptId.trim(),
          status: self.addFormStatus,
          expiryDate: self.addFormStatus === 'expiring' ? self.addFormExpiryDate : '',
          notes: self.addFormNotes,
        })
          .then(function (result) {
            if (result && result.success) {
              Alpine.store('toast').success('ライセンスを登録しました');
              self.showAddModal = false;
              self.load();
            } else {
              Alpine.store('toast').error(result && result.message ? result.message : '登録に失敗しました');
            }
          })
          .catch(function (err) {
            Alpine.store('toast').error('通信エラー: ' + err.message);
          })
          .finally(function () {
            self.loading = false;
          });
      },

      openEditModal: function (license) {
        this.editTarget = license;
        this.editCompanyName = license.companyName;
        this.editScriptId = license.scriptId;
        this.editStatus = license.status;
        this.editExpiryDate = this.get30DaysLater();
        this.editNotes = license.notes || '';
        this.showEditModal = true;
      },

      doUpdate: function () {
        var self = this;
        if (!self.editTarget) return;
        self.loading = true;
        callAdminAPI('updateLicense', {
          id: self.editTarget.id,
          companyName: self.editCompanyName.trim(),
          scriptId: self.editScriptId.trim(),
          status: self.editStatus,
          expiryDate: self.editStatus === 'expiring' ? self.editExpiryDate : '',
          notes: self.editNotes,
        })
          .then(function (result) {
            if (result && result.success) {
              Alpine.store('toast').success('ライセンスを更新しました');
              self.showEditModal = false;
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

      openDeleteModal: function (license) {
        this.deleteTarget = license;
        this.showDeleteModal = true;
      },

      doDelete: function () {
        var self = this;
        if (!self.deleteTarget) return;
        self.loading = true;
        callAdminAPI('deleteLicense', { id: self.deleteTarget.id })
          .then(function (result) {
            if (result && result.success) {
              Alpine.store('toast').success('ライセンスを削除しました');
              self.showDeleteModal = false;
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
