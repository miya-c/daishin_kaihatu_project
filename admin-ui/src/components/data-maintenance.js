import { callAdminAPI } from '../api.js';

document.addEventListener('alpine:init', function () {
  Alpine.data('dataMaintenance', function () {
    return {
      tools: [
        {
          id: 'validateInspectionDataIntegrity',
          label: 'データの確認',
          description: '🔍 検針データに矛盾がないか確認します',
          icon: '🔍',
          destructive: false,
          loading: false,
          result: null,
          error: '',
          confirmPending: false,
        },
        {
          id: 'cleanupDuplicateData',
          label: '重複データの削除',
          description: '🗑️ 重複して登録された検針データを削除します',
          icon: '🗑️',
          destructive: true,
          loading: false,
          result: null,
          error: '',
          confirmPending: false,
        },
        {
          id: 'generateRoomIds',
          label: '部屋番号の設定',
          description: '🔢 部屋ごとの管理番号を自動で割り当てます',
          icon: '🔢',
          destructive: true,
          loading: false,
          result: null,
          error: '',
          confirmPending: false,
        },
        {
          id: 'formatAllPropertyIds',
          label: '物件番号の修正',
          description: '📝 物件番号を統一書式に整えます',
          icon: '📝',
          destructive: true,
          loading: false,
          result: null,
          error: '',
          confirmPending: false,
        },
        {
          id: 'cleanUpOrphanedRooms',
          label: '不要データの削除',
          description: '🧹 どの物件にも属していない不要な部屋データを削除します',
          icon: '🧹',
          destructive: true,
          loading: false,
          result: null,
          error: '',
          confirmPending: false,
        },
      ],
      // per-tool custom confirmation messages (Fix 4-5)
      confirmMessages: {
        validateInspectionDataIntegrity:
          '全シートの検針データの整合性を検証します。問題があればレポートします。',
        cleanupDuplicateData: '検針データの重複データを削除します。最初の1件のみ残ります。',
        generateRoomIds: '全部屋のIDを再採番します。既存の部屋IDが変更されます。',
        formatAllPropertyIds:
          '全シートの物件IDをP000001形式にフォーマットします。既にフォーマット済みのIDは変更されません。',
        cleanUpOrphanedRooms: '物件マスタに存在しない部屋データを削除します。',
      },

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
