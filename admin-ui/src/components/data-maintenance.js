import { callAdminAPI } from '../api.js';

document.addEventListener('alpine:init', function () {
  Alpine.data('dataMaintenance', function () {
    return {
      tools: [
        {
          id: 'validateInspectionDataIntegrity',
          label: '整合性チェック',
          description: '🔍 検針データの整合性を検証します',
          icon: '🔍',
          destructive: false,
          loading: false,
          result: null,
          error: '',
          confirmPending: false,
        },
        {
          id: 'cleanupDuplicateData',
          label: '重複データ削除',
          description: '🗑️ 重複する検針データを削除します',
          icon: '🗑️',
          destructive: true,
          loading: false,
          result: null,
          error: '',
          confirmPending: false,
        },
        {
          id: 'generateRoomIds',
          label: '部屋ID自動生成',
          description: '🔢 部屋IDを自動採番します',
          icon: '🔢',
          destructive: true,
          loading: false,
          result: null,
          error: '',
          confirmPending: false,
        },
        {
          id: 'formatAllPropertyIds',
          label: '物件IDフォーマット',
          description: '📝 物件IDを正規フォーマットに変換します',
          icon: '📝',
          destructive: true,
          loading: false,
          result: null,
          error: '',
          confirmPending: false,
        },
        {
          id: 'cleanUpOrphanedRooms',
          label: '孤立データ削除',
          description: '🧹 物件に紐づかない孤立部屋を削除します',
          icon: '🧹',
          destructive: true,
          loading: false,
          result: null,
          error: '',
          confirmPending: false,
        },
      ],

      findTool: function (toolId) {
        return this.tools.find(function (t) {
          return t.id === toolId;
        });
      },

      executeTool: function (toolId) {
        var tool = this.findTool(toolId);
        if (!tool) return;

        if (tool.destructive) {
          tool.confirmPending = true;
          return;
        }

        this.confirmTool(toolId);
      },

      confirmTool: function (toolId) {
        var tool = this.findTool(toolId);
        if (!tool) return;

        var self = this;
        tool.loading = true;
        tool.error = '';
        tool.result = null;
        tool.confirmPending = false;

        callAdminAPI(toolId)
          .then(function (response) {
            tool.loading = false;
            if (response.success) {
              tool.result = response.data || response.message || '完了しました';
            } else {
              tool.error = response.error || response.message || 'エラーが発生しました';
            }
          })
          .catch(function (err) {
            tool.loading = false;
            tool.error = err.message || err || 'エラーが発生しました';
          });
      },

      cancelTool: function (toolId) {
        var tool = this.findTool(toolId);
        if (!tool) return;
        tool.confirmPending = false;
      },

      resetTool: function (toolId) {
        var tool = this.findTool(toolId);
        if (!tool) return;
        tool.result = null;
        tool.error = '';
        tool.confirmPending = false;
      },
    };
  });
});
