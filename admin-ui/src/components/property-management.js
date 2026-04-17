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
      selectedPropertyId: '',
      loading: false,
      roomsLoading: false,
      roomsError: '',
      error: '',

      activeModal: '',

      addPropertyForm: { name: '', idMode: 'auto', manualId: '' },
      addRoomForm: { name: '' },
      editRoomForm: { roomId: '', name: '' },
      deleteTarget: null,

      viewMode: 'expand',
      sortState: { key: null, dir: null },
      expandedRooms: [],
      editInspectionForm: {
        roomId: '',
        roomName: '',
        currentReading: '',
        previousReading: '',
        inspectionSkip: false,
        billingSkip: false,
        hasInspectionData: false,
      },

      init: function () {
        var self = this;
        this._pendingPropertyId = '';
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

        if (!self._pendingPropertyId) {
          var hash = window.location.hash.replace('#properties/', '').replace('#properties', '');
          if (hash && hash !== 'properties') {
            self._pendingPropertyId = hash.trim();
          }
        }

        callAdminAPI('getProperties')
          .then(function (result) {
            if (result && result.success) {
              self.properties = result.data || [];
              if (self._pendingPropertyId) {
                var pid = self._pendingPropertyId;
                self._pendingPropertyId = '';
                var found = null;
                for (var i = 0; i < self.properties.length; i++) {
                  if (self.getPropId(self.properties[i]) === pid) {
                    found = self.properties[i];
                    break;
                  }
                }
                if (found) {
                  self.selectProperty(found);
                }
              }
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
          self.selectedPropertyId = '';
          self.rooms = [];
          return;
        }
        self.selectedProperty = prop;
        self.selectedPropertyId = propId;
        self.expandedRooms = [];
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
                self.selectedPropertyId = '';
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
        if (!prop) return '';
        return prop.propertyId || prop['物件ID'] || '';
      },

      getPropName: function (prop) {
        if (!prop) return '';
        return prop.propertyName || prop['物件名'] || '';
      },

      getSelectedPropHeading: function () {
        return this.selectedProperty ? this.getPropName(this.selectedProperty) + ' の部屋一覧' : '';
      },

      getPropertySubtitle: function () {
        if (this.selectedProperty) {
          return (
            this.getPropName(this.selectedProperty) +
            ' — 全' +
            this.rooms.length +
            '部屋の検針データ一覧'
          );
        }
        if (this.properties.length > 0) {
          return '物件を選択してください';
        }
        return '';
      },

      onPropertySelect: function () {
        var self = this;
        var propId = self.selectedPropertyId;
        if (!propId) {
          self.selectedProperty = null;
          self.rooms = [];
          return;
        }
        var found = null;
        for (var i = 0; i < self.properties.length; i++) {
          if (self.getPropId(self.properties[i]) === propId) {
            found = self.properties[i];
            break;
          }
        }
        if (found) {
          self.selectProperty(found);
        }
      },

      openDeletePropertyConfirm: function () {
        if (!this.selectedProperty) return;
        this.openDeleteConfirm(
          'property',
          this.getPropId(this.selectedProperty),
          this.getPropName(this.selectedProperty),
          ''
        );
      },

      getRoomCount: function (prop) {
        return prop.roomCount || 0;
      },

      getRoomField: function (room, field) {
        if (!room) return '';
        return room[field] || '';
      },

      getRoomStatusTag: function (room) {
        if (room.inspectionSkip) return 'skip';
        if (room.hasInspectionResult) {
          if (room.warningFlag === '要確認') return 'warning';
          return 'done';
        }
        return 'pending';
      },

      getRoomStatusLabel: function (room) {
        var status = this.getRoomStatusTag(room);
        if (status === 'skip') return '不要';
        if (status === 'warning') return '⚠️ 警告';
        if (status === 'done') return '✅ 済';
        return '未';
      },

      getRoomStatusClass: function (room) {
        var status = this.getRoomStatusTag(room);
        if (status === 'skip') return 'is-light';
        if (status === 'warning') return 'is-warning is-light';
        if (status === 'done') return 'is-success is-light';
        return 'is-light';
      },

      getReadingDate: function (room) {
        var d = room.readingDate || '';
        if (!d) return '—';
        if (d.length >= 10) return d.substring(5, 10).replace(/-/g, '/');
        return d;
      },

      getReadingDateFull: function (room) {
        var d = room.readingDate || '';
        if (!d) return '—';
        if (d.length >= 10) return d.substring(0, 10).replace(/-/g, '/');
        return d;
      },

      formatNumber: function (val) {
        if (val === '' || val === null || val === undefined) return '—';
        return Number(val).toLocaleString();
      },

      getUsageDisplay: function (room) {
        if (!room.hasInspectionResult) return '—';
        var u = room.usage;
        if (u === '' || u === null || u === undefined) return '—';
        return u + ' m\u00B3';
      },

      getUsageDisplayClass: function (room) {
        if (!room.hasInspectionResult) return '';
        if (room.warningFlag === '要確認') return 'has-text-danger has-text-weight-bold';
        return '';
      },

      getUsageMultiplier: function (room) {
        if (!room.hasInspectionResult) return '';
        var sd = room.standardDeviation;
        if (sd === '' || sd === null || sd === undefined || sd === 0) return '';
        return (room.usage / sd).toFixed(1);
      },

      getUsageTrend: function (room) {
        if (!room.hasInspectionResult) return null;
        var pr = room.previousReading;
        var pr2 = room.previousReading2;
        var pr3 = room.previousReading3;
        var hasPr = pr !== '' && pr !== null && pr !== undefined;
        var hasPr2 = pr2 !== '' && pr2 !== null && pr2 !== undefined;
        var hasPr3 = pr3 !== '' && pr3 !== null && pr3 !== undefined;
        return {
          current: room.usage || 0,
          prev: hasPr && hasPr2 ? pr - pr2 : 0,
          prev2: hasPr2 && hasPr3 ? pr2 - pr3 : 0,
        };
      },

      getSummaryCards: function () {
        var total = this.rooms.length;
        var done = 0,
          pending = 0,
          warning = 0,
          skip = 0;
        this.rooms.forEach(function (r) {
          if (r.inspectionSkip) {
            skip++;
            return;
          }
          if (r.hasInspectionResult) {
            if (r.warningFlag === '要確認') warning++;
            else done++;
          } else {
            pending++;
          }
        });
        var inspectable = total - skip;
        var completed = done + warning;
        var rate = inspectable > 0 ? Math.round((completed / inspectable) * 100) : 0;
        return { total: total, done: done, pending: pending, warning: warning, rate: rate };
      },

      switchView: function (mode) {
        this.viewMode = mode;
      },

      toggleRoomExpand: function (roomId) {
        var expanded = this.expandedRooms;
        if (expanded.indexOf(roomId) >= 0) {
          this.expandedRooms = expanded.filter(function (id) {
            return id !== roomId;
          });
        } else {
          this.expandedRooms = expanded.concat([roomId]);
        }
      },

      isRoomExpanded: function (roomId) {
        return this.expandedRooms.indexOf(roomId) >= 0;
      },

      sortBy: function (key) {
        if (this.sortState.key === key) {
          if (this.sortState.dir === 'asc') {
            this.sortState = { key: key, dir: 'desc' };
          } else {
            this.sortState = { key: null, dir: null };
          }
        } else {
          this.sortState = { key: key, dir: 'asc' };
        }
      },

      getSortedRooms: function () {
        var self = this;
        var rooms = this.rooms.slice();
        var state = this.sortState;
        if (!state.key) return rooms;
        var key = state.key;
        var dir = state.dir;
        rooms.sort(function (a, b) {
          var va, vb;
          if (key === 'status') {
            var order = { warning: 0, done: 1, pending: 2, skip: 3 };
            va = order[self.getRoomStatusTag(a)];
            vb = order[self.getRoomStatusTag(b)];
            return dir === 'asc' ? va - vb : vb - va;
          }
          if (
            key === 'currentReading' ||
            key === 'previousReading' ||
            key === 'usage' ||
            key === 'standardDeviation'
          ) {
            va = parseFloat(a[key]) || 0;
            vb = parseFloat(b[key]) || 0;
            return dir === 'asc' ? va - vb : vb - va;
          }
          if (key === 'roomName') {
            va = a.roomName || '';
            vb = b.roomName || '';
          } else if (key === 'readingDate') {
            va = a.readingDate || '';
            vb = b.readingDate || '';
          } else {
            va = a[key] || '';
            vb = b[key] || '';
          }
          if (dir === 'asc') return va < vb ? -1 : va > vb ? 1 : 0;
          return va > vb ? -1 : va < vb ? 1 : 0;
        });
        return rooms;
      },

      getSortIcon: function (key) {
        if (this.sortState.key !== key) return 'neutral';
        return this.sortState.dir;
      },

      openInspectionEdit: function (room) {
        this.editInspectionForm = {
          roomId: room.roomId || '',
          roomName: room.roomName || '',
          currentReading: room.currentReading !== '' ? room.currentReading : '',
          previousReading: room.previousReading !== '' ? room.previousReading : '',
          inspectionSkip: room.inspectionSkip || false,
          billingSkip: room.billingSkip || false,
          hasInspectionData: room.hasInspectionResult || false,
        };
        this.error = '';
        this.activeModal = 'editInspection';
      },

      submitInspectionEdit: function () {
        var self = this;
        var form = self.editInspectionForm;
        if (!form.roomName || !form.roomName.trim()) {
          self.error = '部屋名を入力してください';
          return;
        }
        var params = {
          propertyId: self.getPropId(self.selectedProperty),
          roomId: form.roomId,
          roomName: form.roomName.trim(),
          inspectionSkip: form.inspectionSkip,
          billingSkip: form.billingSkip,
        };
        if (form.hasInspectionData) {
          params.currentReading = form.currentReading;
          params.previousReading = form.previousReading;
        }
        callAdminAPI('updateInspectionData', params)
          .then(function (result) {
            if (result && result.success) {
              self.closeModal();
              self.selectProperty(self.selectedProperty);
              if (window.Alpine && Alpine.store('toast')) {
                Alpine.store('toast').success('更新しました');
              }
            } else {
              self.error = (result && result.error) || '更新に失敗しました';
            }
          })
          .catch(function (err) {
            self.error = '更新に失敗しました: ' + (err.message || err);
          });
      },
    };
  });
});
