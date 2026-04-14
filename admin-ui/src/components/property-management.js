/**
 * Property Management Component — Alpine.data('propertyManagement')
 *
 * Manages properties and rooms: add, edit, delete with modal dialogs.
 */

import { callAdminAPI } from '../api.js';

document.addEventListener('alpine:init', function () {
  Alpine.data('propertyManagement', function () {
    return {
      properties: [],
      rooms: [],
      selectedProperty: null,
      loading: false,
      roomsLoading: false,
      roomsError: '',
      error: '',

      activeModal: '',

      addPropertyForm: { name: '', idMode: 'auto', manualId: '' },
      addRoomForm: { name: '' },
      editRoomForm: { roomId: '', name: '' },
      deleteTarget: null,

      init: function () {
        var self = this;
        this.loadProperties();
        this.$watch('$store.app.activeTab', function (v) {
          if (v === 'properties') {
            self.loadProperties();
          }
        });

        this._keyHandler = function (e) {
          if (e.key === 'Escape' && self.activeModal) {
            self.closeModal();
          }
        };
        document.addEventListener('keydown', this._keyHandler);
      },

      destroy: function () {
        if (this._keyHandler) {
          document.removeEventListener('keydown', this._keyHandler);
        }
      },

      loadProperties: function () {
        var self = this;
        self.loading = true;
        self.error = '';
        callAdminAPI('getProperties')
          .then(function (result) {
            if (result && result.success) {
              self.properties = result.data || [];
            } else {
              self.error = (result && result.error) || '物件一覧の取得に失敗しました';
            }
          })
          .catch(function (err) {
            self.error = '物件一覧の取得に失敗しました: ' + (err.message || err);
          })
          .finally(function () {
            self.loading = false;
          });
      },

      selectProperty: function (prop) {
        var self = this;
        var propId = self.getPropId(prop);
        if (self.selectedProperty && self.getPropId(self.selectedProperty) === propId) {
          self.selectedProperty = null;
          self.rooms = [];
          return;
        }
        self.selectedProperty = prop;
        self.roomsLoading = true;
        self.error = '';
        self.roomsError = '';
        callAdminAPI('getRoomsForManagement', { propertyId: propId })
          .then(function (result) {
            if (result && result.success) {
              self.rooms = result.data || [];
              self.roomsError = '';
            } else {
              self.roomsError = (result && result.error) || '部屋一覧の取得に失敗しました';
              self.error = self.roomsError;
            }
          })
          .catch(function (err) {
            self.roomsError = '部屋一覧の取得に失敗しました: ' + (err.message || err);
            self.error = self.roomsError;
          })
          .finally(function () {
            self.roomsLoading = false;
          });
      },

      getAutoPropertyId: function () {
        if (!this.properties || this.properties.length === 0) return 'P000001';
        var maxNum = 0;
        this.properties.forEach(function (p) {
          var id = (p.propertyId || p['物件ID'] || '').trim();
          var match = id.match(/^P(\d{6})$/);
          if (match) {
            var num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        });
        return 'P' + ('000000' + (maxNum + 1)).slice(-6);
      },

      getDisplayPropertyId: function () {
        if (this.addPropertyForm.idMode === 'auto') return this.getAutoPropertyId();
        var input = this.addPropertyForm.manualId || '';
        var digits = input.replace(/[^0-9]/g, '');
        if (!digits) return 'P______';
        var num = parseInt(digits, 10);
        return 'P' + ('000000' + num).slice(-6);
      },

      onManualIdInput: function (e) {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
        this.addPropertyForm.manualId = e.target.value;
      },

      openAddProperty: function () {
        this.addPropertyForm = { name: '', idMode: 'auto', manualId: '' };
        this.error = '';
        this.activeModal = 'addProperty';
      },

      openAddRoom: function () {
        this.addRoomForm = { name: '' };
        this.error = '';
        this.activeModal = 'addRoom';
      },

      openEditRoom: function (room) {
        this.editRoomForm = {
          roomId: room['部屋ID'] || room.roomId || room.id || '',
          name: room['部屋名'] || room.roomName || room.name || '',
        };
        this.error = '';
        this.activeModal = 'editRoom';
      },

      openDeleteConfirm: function (type, id, name, propertyId) {
        this.deleteTarget = {
          type: type,
          id: id,
          name: name,
          propertyId: propertyId || '',
          forceDelete: false,
        };
        this.error = '';
        this.activeModal = 'deleteConfirm';
      },

      closeModal: function () {
        this.activeModal = '';
        this.error = '';
        this.deleteTarget = null;
      },

      submitAddProperty: function () {
        var self = this;
        var name = self.addPropertyForm.name.trim();
        if (!name) {
          self.error = '物件名を入力してください';
          return;
        }
        var params = { propertyName: name };
        if (self.addPropertyForm.idMode === 'manual' && self.addPropertyForm.manualId) {
          var digits = self.addPropertyForm.manualId.replace(/\D/g, '');
          params.propertyId = 'P' + ('000000' + digits).slice(-6);
        }
        callAdminAPI('addProperty', params)
          .then(function (result) {
            if (result && result.success) {
              self.closeModal();
              self.loadProperties();
              if (window.Alpine && Alpine.store('toast')) {
                Alpine.store('toast').success('物件「' + name + '」を追加しました');
              }
            } else {
              self.error = (result && result.error) || '物件の追加に失敗しました';
            }
          })
          .catch(function (err) {
            self.error = '物件の追加に失敗しました: ' + (err.message || err);
          });
      },

      submitAddRoom: function () {
        var self = this;
        var name = self.addRoomForm.name.trim();
        if (!name) {
          self.error = '部屋名を入力してください';
          return;
        }
        if (!self.selectedProperty) return;
        callAdminAPI('addRoom', {
          propertyId: self.selectedProperty.propertyId || self.selectedProperty['物件ID'],
          roomName: name,
        })
          .then(function (result) {
            if (result && result.success) {
              self.closeModal();
              self.selectProperty(self.selectedProperty);
              if (window.Alpine && Alpine.store('toast')) {
                Alpine.store('toast').success('部屋「' + name + '」を追加しました');
              }
            } else {
              self.error = (result && result.error) || '部屋の追加に失敗しました';
            }
          })
          .catch(function (err) {
            self.error = '部屋の追加に失敗しました: ' + (err.message || err);
          });
      },

      submitEditRoom: function () {
        var self = this;
        var name = self.editRoomForm.name.trim();
        if (!name) {
          self.error = '部屋名を入力してください';
          return;
        }
        callAdminAPI('updateRoom', {
          propertyId: self.selectedProperty.propertyId || self.selectedProperty['物件ID'],
          roomId: self.editRoomForm.roomId,
          roomName: name,
        })
          .then(function (result) {
            if (result && result.success) {
              self.closeModal();
              self.selectProperty(self.selectedProperty);
              if (window.Alpine && Alpine.store('toast')) {
                Alpine.store('toast').success('部屋名を変更しました');
              }
            } else {
              self.error = (result && result.error) || '部屋の変更に失敗しました';
            }
          })
          .catch(function (err) {
            self.error = '部屋の変更に失敗しました: ' + (err.message || err);
          });
      },

      executeDelete: function () {
        var self = this;
        if (!self.deleteTarget) return;

        var apiAction = self.deleteTarget.type === 'property' ? 'deleteProperty' : 'deleteRoom';
        var apiParams =
          self.deleteTarget.type === 'property'
            ? { propertyId: self.deleteTarget.id }
            : { propertyId: self.deleteTarget.propertyId, roomId: self.deleteTarget.id };

        if (self.deleteTarget.forceDelete) {
          apiParams.force = true;
        }

        callAdminAPI(apiAction, apiParams)
          .then(function (result) {
            if (result && result.success) {
              self.closeModal();
              if (self.deleteTarget && self.deleteTarget.type === 'property') {
                self.selectedProperty = null;
                self.rooms = [];
                self.loadProperties();
              } else {
                self.selectProperty(self.selectedProperty);
              }
              if (window.Alpine && Alpine.store('toast')) {
                Alpine.store('toast').success('削除しました');
              }
            } else if (result && result.code === 'HAS_INSPECTION_RESULTS') {
              self.deleteTarget.forceDelete = true;
              self.error = result.error;
            } else {
              self.error = (result && result.error) || '削除に失敗しました';
            }
          })
          .catch(function (err) {
            self.error = '削除に失敗しました: ' + (err.message || err);
          });
      },

      getPropId: function (prop) {
        return prop.propertyId || prop['物件ID'] || '';
      },

      getPropName: function (prop) {
        return prop.propertyName || prop['物件名'] || '';
      },

      getRoomCount: function (prop) {
        return prop.roomCount || 0;
      },
    };
  });
});
