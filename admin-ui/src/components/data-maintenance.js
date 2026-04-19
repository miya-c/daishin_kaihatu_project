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
          id: 'migrateMonthlyToYearly',
          label: '月次→年アーカイブ移行',
          description: '📦 月次アーカイブ(1月=1シート)を年アーカイブ(1年=1シート)に統合します',
          icon: '📦',
          destructive: true,
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
        cleanUpOrphanedRooms: '物件マスタに存在しない部屋データを削除します。',
        migrateMonthlyToYearly:
          '全ての月次アーカイブシート（検針データ_YYYY年MM月）を年次アーカイブシート（検針データ_YYYY年）に統合します。移行後、元の月次シートは削除されます。この操作は取り消せません。',
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

      getResultText: function (tool) {
        if (!tool || tool.result == null) return '';
        var r = tool.result;
        if (typeof r === 'string') return r;
        if (r && r.message) return r.message;
        return '完了しました。';
      },
    };
  });
});
