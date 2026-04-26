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

      submitting: false,
      viewMode: 'expand',
      sortState: { key: null, dir: null },
      expandedRooms: [],
      editInspectionForm: {
        roomId: '',
        roomName: '',
        currentReading: '',
        previousReading: '',
        roomStatus: 'normal',
        roomNotes: '',
        hasInspectionData: false,
      },
      editPropertyForm: { currentPropertyId: '', manualId: '', name: '' },

      bulkPropertyFormat: 'oneline',
      bulkPropertyText: '',
      bulkPropertyResults: null,
      bulkPropertySubmitting: false,

      bulkRoomFormat: 'oneline',
      bulkRoomText: '',
      bulkRoomResults: null,
      bulkRoomSubmitting: false,

      annualReport: null,
      annualReportYear: new Date().getFullYear(),
      annualReportLoading: false,
      annualAvailableYears: [],

      accessCopyData: null,
      accessCopyLoading: false,

      init: function () {
        var self = this;
        this._pendingPropertyId = '';
        this.loadProperties();
        this.loadAvailableYears();
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

      reloadRooms: function () {
        var self = this;
        var propId = self.getPropId(self.selectedProperty);
        if (!propId) return;
        self.roomsLoading = true;
        callAdminAPI('getRoomsForManagement', { propertyId: propId })
          .then(function (result) {
            if (result && result.success) {
              self.rooms = result.data || [];
            }
          })
          .catch(function () {})
          .finally(function () {
            self.roomsLoading = false;
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
        self.annualReport = null;
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

      openEditProperty: function () {
        if (!this.selectedProperty) return;
        var currentId = this.getPropId(this.selectedProperty);
        this.editPropertyForm = {
          currentPropertyId: currentId,
          manualId: currentId.replace('P', ''),
          name: this.getPropName(this.selectedProperty),
        };
        this.error = '';
        this.activeModal = 'editProperty';
      },

      onEditPropertyIdInput: function (e) {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
        this.editPropertyForm.manualId = e.target.value;
      },

      getDisplayEditPropertyId: function () {
        var digits = (this.editPropertyForm.manualId || '').replace(/[^0-9]/g, '');
        if (!digits) return 'P______';
        return 'P' + ('000000' + parseInt(digits, 10)).slice(-6);
      },

      submitEditProperty: function () {
        var self = this;
        var newName = self.editPropertyForm.name.trim();
        if (!newName) {
          self.error = '物件名を入力してください';
          return;
        }
        var digits = (self.editPropertyForm.manualId || '').replace(/[^0-9]/g, '');
        if (!digits) {
          self.error = '物件番号を入力してください';
          return;
        }
        self.submitting = true;
        self.error = '';
        var newId = 'P' + ('000000' + parseInt(digits, 10)).slice(-6);
        var params = {
          propertyId: self.editPropertyForm.currentPropertyId,
          newPropertyId: newId,
          newPropertyName: newName,
        };
        callAdminAPI('updateProperty', params)
          .then(function (result) {
            if (result && result.success) {
              self._pendingPropertyId = result.data.newPropertyId;
              self.closeModal();
              self.loadProperties();
              if (window.Alpine && Alpine.store('toast')) {
                Alpine.store('toast').success('物件情報を更新しました');
              }
            } else {
              self.error = (result && result.error) || '更新に失敗しました';
            }
          })
          .catch(function (err) {
            self.error = '更新に失敗しました: ' + (err.message || err);
          })
          .finally(function () {
            self.submitting = false;
          });
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
        self.submitting = true;
        self.error = '';
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
          })
          .finally(function () {
            self.submitting = false;
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
        self.submitting = true;
        self.error = '';
        callAdminAPI('addRoom', {
          propertyId: self.selectedProperty.propertyId || self.selectedProperty['物件ID'],
          roomName: name,
        })
          .then(function (result) {
            if (result && result.success) {
              self.closeModal();
              self.reloadRooms();
              if (window.Alpine && Alpine.store('toast')) {
                Alpine.store('toast').success('部屋「' + name + '」を追加しました');
              }
            } else {
              self.error = (result && result.error) || '部屋の追加に失敗しました';
            }
          })
          .catch(function (err) {
            self.error = '部屋の追加に失敗しました: ' + (err.message || err);
          })
          .finally(function () {
            self.submitting = false;
          });
      },

      submitEditRoom: function () {
        var self = this;
        var name = self.editRoomForm.name.trim();
        if (!name) {
          self.error = '部屋名を入力してください';
          return;
        }
        self.submitting = true;
        self.error = '';
        callAdminAPI('updateRoom', {
          propertyId: self.selectedProperty.propertyId || self.selectedProperty['物件ID'],
          roomId: self.editRoomForm.roomId,
          roomName: name,
        })
          .then(function (result) {
            if (result && result.success) {
              self.closeModal();
              self.reloadRooms();
              if (window.Alpine && Alpine.store('toast')) {
                Alpine.store('toast').success('部屋名を変更しました');
              }
            } else {
              self.error = (result && result.error) || '部屋の変更に失敗しました';
            }
          })
          .catch(function (err) {
            self.error = '部屋の変更に失敗しました: ' + (err.message || err);
          })
          .finally(function () {
            self.submitting = false;
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

        self.submitting = true;
        self.error = '';
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
                self.reloadRooms();
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
          })
          .finally(function () {
            self.submitting = false;
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
          var count = this.getSummaryCards().total;
          return this.getPropName(this.selectedProperty) + ' — 全' + count + '部屋の検針データ一覧';
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
        if (status === 'skip') return 'tag-skip';
        if (status === 'warning') return 'tag-warn-status';
        if (status === 'done') return 'tag-done';
        return 'tag-pending';
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
        return { total: inspectable, done: done, pending: pending, warning: warning, rate: rate };
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
        var status = room.roomStatus || '';
        if (!status) {
          if (room.inspectionSkip) status = 'skip';
          else if (room.billingSkip) status = 'owner';
          else status = 'normal';
        }
        this.editInspectionForm = {
          roomId: room.roomId || '',
          roomName: room.roomName || '',
          currentReading: room.currentReading !== '' ? room.currentReading : '',
          previousReading: room.previousReading !== '' ? room.previousReading : '',
          roomStatus: status,
          roomNotes: room.roomNotes || '',
          hasInspectionData: room.hasInspectionResult || false,
        };
        this.error = '';
        this.activeModal = 'editInspection';
      },

      getStatusLabel: function (status) {
        var labels = {
          normal: '🏠 通常入居中',
          vacant: '📭 空室',
          owner: '🔑 オーナー使用中',
          fixed: '💰 固定料金',
          skip: '🚫 検針不要',
        };
        return labels[status] || labels.normal;
      },

      getStatusDescription: function (status) {
        var descs = {
          normal: '通常どおり検針・請求を行います',
          vacant: '検針対象です（空室でも水が使われる場合があります）',
          owner: '検針対象ですが、請求はスキップされます',
          fixed: '検針対象ですが、請求はスキップされます（固定料金契約）',
          skip: '検針・請求ともにスキップされます',
        };
        return descs[status] || descs.normal;
      },

      getDerivedFlags: function (status) {
        if (status === 'skip') return { inspectionSkip: true, billingSkip: false };
        if (status === 'owner' || status === 'fixed')
          return { inspectionSkip: false, billingSkip: true };
        return { inspectionSkip: false, billingSkip: false };
      },

      setFormProp: function (formKey, prop, value) {
        this[formKey][prop] = value;
      },

      submitInspectionEdit: function () {
        var self = this;
        var form = self.editInspectionForm;
        if (!form.roomName || !form.roomName.trim()) {
          self.error = '部屋名を入力してください';
          return;
        }
        self.submitting = true;
        self.error = '';
        var params = {
          propertyId: self.getPropId(self.selectedProperty),
          roomId: form.roomId,
          roomName: form.roomName.trim(),
          roomStatus: form.roomStatus,
          roomNotes: form.roomNotes,
        };
        if (form.hasInspectionData) {
          params.currentReading = form.currentReading;
          params.previousReading = form.previousReading;
        }
        callAdminAPI('updateInspectionData', params)
          .then(function (result) {
            if (result && result.success) {
              self.closeModal();
              self.reloadRooms();
              if (window.Alpine && Alpine.store('toast')) {
                Alpine.store('toast').success('更新しました');
              }
            } else {
              self.error = (result && result.error) || '更新に失敗しました';
            }
          })
          .catch(function (err) {
            self.error = '更新に失敗しました: ' + (err.message || err);
          })
          .finally(function () {
            self.submitting = false;
          });
      },

      openBulkAddProperty: function () {
        this.bulkPropertyFormat = 'oneline';
        this.bulkPropertyText = '';
        this.bulkPropertyResults = null;
        this.bulkPropertySubmitting = false;
        this.error = '';
        this.activeModal = 'bulkAddProperty';
      },

      getBulkPropertyItems: function () {
        var text = this.bulkPropertyText || '';
        var format = this.bulkPropertyFormat;
        var lines = text.split('\n');
        var items = [];
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          if (!line) continue;
          if (format === 'csv') {
            var parts = line.split(',');
            var name = (parts[0] || '').trim();
            var id = (parts[1] || '').trim();
            if (name) items.push({ name: name, id: id });
          } else {
            items.push({ name: line, id: '' });
          }
        }
        return items;
      },

      getBulkPropertyCount: function () {
        return this.getBulkPropertyItems().length;
      },

      getBulkPropertyPreview: function () {
        var items = this.getBulkPropertyItems();
        if (items.length === 0) return [];
        var baseId = this.getAutoPropertyId();
        var baseNum = parseInt(baseId.replace('P', ''), 10);
        var preview = [];
        for (var i = 0; i < items.length; i++) {
          var item = items[i];
          var estimatedId;
          if (item.id) {
            var digits = item.id.replace(/[^0-9]/g, '');
            if (digits) {
              estimatedId = 'P' + ('000000' + parseInt(digits, 10)).slice(-6);
            } else {
              estimatedId = 'P' + ('000000' + (baseNum + i)).slice(-6);
            }
          } else {
            estimatedId = 'P' + ('000000' + (baseNum + i)).slice(-6);
          }
          preview.push({ name: item.name, id: estimatedId, hasManualId: !!item.id });
        }
        return preview;
      },

      submitBulkAddProperty: function () {
        var self = this;
        var items = self.getBulkPropertyItems();
        if (items.length === 0) {
          self.error = '物件名を入力してください';
          return;
        }
        self.bulkPropertySubmitting = true;
        self.error = '';
        callAdminAPI('bulkAddProperties', { items: items })
          .then(function (result) {
            if (result && result.success) {
              self.bulkPropertyResults = result.data;
              self.bulkPropertySubmitting = false;
              self.loadProperties();
            } else {
              self.error = (result && result.error) || '一括登録に失敗しました';
              self.bulkPropertySubmitting = false;
            }
          })
          .catch(function (err) {
            self.error = '一括登録に失敗しました: ' + (err.message || err);
            self.bulkPropertySubmitting = false;
          });
      },

      closeBulkPropertyModal: function () {
        this.activeModal = '';
        this.bulkPropertyResults = null;
        this.bulkPropertyText = '';
        this.error = '';
      },

      openBulkAddRoom: function () {
        if (!this.selectedProperty) return;
        this.bulkRoomFormat = 'oneline';
        this.bulkRoomText = '';
        this.bulkRoomResults = null;
        this.bulkRoomSubmitting = false;
        this.error = '';
        this.activeModal = 'bulkAddRoom';
      },

      getBulkRoomItems: function () {
        var text = this.bulkRoomText || '';
        var lines = text.split('\n');
        var items = [];
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          if (!line) continue;
          items.push({ name: line });
        }
        return items;
      },

      getBulkRoomCount: function () {
        return this.getBulkRoomItems().length;
      },

      getBulkRoomPreview: function () {
        var items = this.getBulkRoomItems();
        if (items.length === 0) return [];
        var baseNum = 1;
        for (var r = 0; r < this.rooms.length; r++) {
          var rid = this.rooms[r].roomId || '';
          var match = rid.match(/^R(\d{3})$/);
          if (match) {
            var num = parseInt(match[1], 10);
            if (num >= baseNum) baseNum = num + 1;
          }
        }
        var preview = [];
        for (var i = 0; i < items.length; i++) {
          preview.push({
            name: items[i].name,
            id: 'R' + ('000' + (baseNum + i)).slice(-3),
          });
        }
        return preview;
      },

      submitBulkAddRoom: function () {
        var self = this;
        var items = self.getBulkRoomItems();
        if (items.length === 0) {
          self.error = '部屋名を入力してください';
          return;
        }
        self.bulkRoomSubmitting = true;
        self.error = '';
        callAdminAPI('bulkAddRooms', {
          propertyId: self.getPropId(self.selectedProperty),
          items: items,
        })
          .then(function (result) {
            if (result && result.success) {
              self.bulkRoomResults = result.data;
              self.bulkRoomSubmitting = false;
              self.reloadRooms();
            } else {
              self.error = (result && result.error) || '一括登録に失敗しました';
              self.bulkRoomSubmitting = false;
            }
          })
          .catch(function (err) {
            self.error = '一括登録に失敗しました: ' + (err.message || err);
            self.bulkRoomSubmitting = false;
          });
      },

      closeBulkRoomModal: function () {
        this.activeModal = '';
        this.bulkRoomResults = null;
        this.bulkRoomText = '';
        this.error = '';
      },

      loadAnnualReport: function () {
        var self = this;
        if (!self.selectedProperty) return;
        self.annualReportLoading = true;
        self.annualReport = null;
        callAdminAPI('getAnnualReport', {
          propertyId: self.getPropId(self.selectedProperty),
          year: self.annualReportYear,
        })
          .then(function (result) {
            if (result && result.success) {
              self.annualReport = result.data;
            } else {
              self.error = (result && result.error) || '年間レポートの取得に失敗しました';
            }
            self.annualReportLoading = false;
          })
          .catch(function (err) {
            self.error = err.message || '年間レポートでエラーが発生しました';
            self.annualReportLoading = false;
          });
      },

      loadAvailableYears: function () {
        var self = this;
        callAdminAPI('getAvailableYears')
          .then(function (result) {
            if (result && result.success && result.years && result.years.length > 0) {
              self.annualAvailableYears = result.years;
              self.annualReportYear = result.years[0];
            }
          })
          .catch(function () {});
      },

      getCellStyle: function (monthData) {
        var status = monthData.roomStatus || 'normal';
        if (status === 'skip')
          return 'background: repeating-linear-gradient(45deg, #f5f5f5, #f5f5f5 10px, #e0e0e0 10px, #e0e0e0 20px);';
        if (status === 'owner') return 'background-color: #e3f2e8;';
        if (status === 'fixed') return 'background-color: #fef9e7;';
        if (status === 'vacant' && !monthData.usage && monthData.usage !== 0)
          return 'background-color: #f5f5f5;';
        return '';
      },

      getCellClass: function (month) {
        if (month.usage === 0) return 'cell-zero';
        return '';
      },

      getUsageClass: function (month) {
        if (month.warningFlag === '要確認') return 'val-abnormal';
        if (month.usage === 0) return 'val-zero';
        return 'val-normal';
      },

      getPrintDate: function () {
        var d = new Date();
        return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
      },

      printAnnualReport: function () {
        var container = document.querySelector('.annual-report-container');
        if (!container) return;
        var propName = this.getPropName(this.selectedProperty) || '';
        var title = propName + '_' + this.annualReportYear + '年_検針レポート';
        var printWindow = window.open('', '_blank');
        if (!printWindow) {
          alert('ポップアップがブロックされています。印刷用ウィンドウを許可してください。');
          return;
        }

        var printStyles = [
          '* { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }',
          'body { font-family: sans-serif; margin: 0; padding: 16px; color: #333; }',
          'table { border-collapse: collapse; width: 100%; font-size: 0.8rem; }',
          'th, td { border: 1px solid #dbdbdb; padding: 0.4rem 0.6rem; text-align: center; white-space: nowrap; }',
          'thead th { background: #f0f0f0; font-weight: 600; border-bottom: 2px solid #dbdbdb; position: sticky; top: 0; }',
          '.room-col { text-align: left; font-weight: 500; min-width: 80px; }',
          '.val-normal { color: #1a6db5; font-weight: 500; }',
          '.val-abnormal { color: #e74c3c; font-weight: 700; }',
          '.val-zero { color: #999; }',
          '.cell-zero { background: #f5f5f5; }',
          '.legend { display: flex; gap: 1.5rem; font-size: 0.8rem; color: #666; margin-bottom: 1rem; }',
          '.legend-item { display: flex; align-items: center; gap: 0.5rem; }',
          '.legend-dot { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }',
          '.print-header { margin-bottom: 1.5rem; }',
          '.print-header h2 { margin: 0 0 0.25rem; font-size: 1.2rem; }',
          '.print-header p { margin: 0; font-size: 0.8rem; color: #666; }',
          '.no-print { display: none !important; }',
          '.print-actions { position: sticky; top: 0; z-index: 100; background: #fff; padding: 12px 16px; border-bottom: 1px solid #dbdbdb; display: flex; align-items: center; gap: 12px; }',
          'tr, .summary-card { page-break-inside: avoid; break-inside: avoid; }',
          '@page { size: landscape; margin: 10mm; }',
          '@media print { .print-actions { display: none !important; } }',
        ].join('\n');

        var htmlParts = [];
        htmlParts.push('<!DOCTYPE html><html><head><meta charset="UTF-8">');
        htmlParts.push('<title>' + title + '</title>');
        htmlParts.push('<style>' + printStyles + '</style>');
        htmlParts.push('</head><body>');
        htmlParts.push(
          '<div class="print-actions no-print">' +
          '<strong style="font-size:1.1em">' + title + '</strong>' +
          '<button id="printBtn" style="padding:6px 16px;font-size:0.9em;cursor:pointer;border:1px solid #3273dc;background:#3273dc;color:#fff;border-radius:4px">🖨️ 印刷する</button>' +
          '<span style="font-size:0.8em;color:#666">内容を確認してから印刷ボタンを押してください</span>' +
          '</div>'
        );
        htmlParts.push('</body></html>');

        printWindow.document.open();
        printWindow.document.write(htmlParts.join(''));
        printWindow.document.close();

        var cloned = container.cloneNode(true);
        printWindow.document.body.appendChild(cloned);
        printWindow.document.title = title;

        var printBtn = printWindow.document.getElementById('printBtn');
        if (printBtn) {
          printBtn.addEventListener('click', function () {
            printWindow.print();
          });
        }
        printWindow.addEventListener('afterprint', function () {
          printWindow.close();
        });
      },

      setAnnualReportYear: function (e) {
        this.annualReportYear = Number(e.target.value);
        this.loadAnnualReport();
      },

      switchToAnnualReport: function () {
        this.viewMode = 'annual';
      },

      openAccessCopyModal: function () {
        var self = this;
        if (!self.selectedProperty) return;
        self.accessCopyData = null;
        self.accessCopyLoading = true;
        self.error = '';
        self.activeModal = 'accessCopy';

        callAdminAPI('getAccessCopyData', {
          propertyId: self.getPropId(self.selectedProperty),
        })
          .then(function (result) {
            self.accessCopyLoading = false;
            if (result && result.success) {
              self.accessCopyData = result.data;
            } else {
              self.error = (result && result.error) || 'データの取得に失敗しました';
            }
          })
          .catch(function (err) {
            self.accessCopyLoading = false;
            self.error = 'データの取得に失敗しました: ' + (err.message || err);
          });
      },

      executeAccessCopy: function () {
        var self = this;
        if (!self.accessCopyData || !self.accessCopyData.readings) return;

        var text = self.accessCopyData.readings.join('\n');
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard
            .writeText(text)
            .then(function () {
              self.closeModal();
              Alpine.store('toast').success(
                self.accessCopyData.totalCount + '件をコピーしました'
              );
            })
            .catch(function () {
              self._fallbackCopy(text);
            });
        } else {
          self._fallbackCopy(text);
        }
      },

      _fallbackCopy: function (text) {
        var self = this;
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
          self.closeModal();
          Alpine.store('toast').success(
            self.accessCopyData.totalCount + '件をコピーしました'
          );
        } catch (e) {
          self.error = 'コピーに失敗しました。手動でコピーしてください';
        }
        document.body.removeChild(ta);
      },
    };
  });
});
