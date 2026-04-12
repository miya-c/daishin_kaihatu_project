/**
 * Mock google.script.run for local development
 *
 * Mimics the GAS client-side API with chained handler support:
 *   google.script.run
 *     .withSuccessHandler(fn)
 *     .withFailureHandler(fn)
 *     .adminAction(action, params)
 */

(function () {
  if (!window.google) {
    window.google = {};
  }
  if (!window.google.script) {
    window.google.script = {};
  }

  function createMockRun() {
    var successHandler = null;
    var failureHandler = null;

    function adminAction(action, params) {
      var capturedSuccess = successHandler;
      var capturedFailure = failureHandler;

      // Reset handlers for next call
      successHandler = null;
      failureHandler = null;

      var delay = Math.floor(Math.random() * 300) + 300; // 300-600ms

      setTimeout(function () {
        var dispatcher = window.__mockDispatcher;

        if (typeof dispatcher !== 'function') {
          if (typeof capturedFailure === 'function') {
            capturedFailure({
              success: false,
              error:
                'モックディスパッチャーが見つかりません。mock/dispatcher.jsが読み込まれているか確認してください。',
            });
          }
          return;
        }

        try {
          var result = dispatcher(action, params || {});

          if (typeof capturedSuccess === 'function') {
            capturedSuccess(result);
          }
        } catch (err) {
          if (typeof capturedFailure === 'function') {
            capturedFailure({
              success: false,
              error: err.message || 'モック実行中にエラーが発生しました',
            });
          }
        }
      }, delay);

      return null; // google.script.run calls return void in GAS
    }

    adminAction.withSuccessHandler = function (handler) {
      successHandler = typeof handler === 'function' ? handler : null;
      return adminAction;
    };

    adminAction.withFailureHandler = function (handler) {
      failureHandler = typeof handler === 'function' ? handler : null;
      return adminAction;
    };

    return adminAction;
  }

  window.google.script.run = createMockRun();
})();
