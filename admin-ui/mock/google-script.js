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

      successHandler = null;
      failureHandler = null;

      var delay = Math.floor(Math.random() * 300) + 300;

      setTimeout(function () {
        var dispatcher = window.__mockDispatcher;

        if (typeof dispatcher !== 'function') {
          if (typeof capturedFailure === 'function') {
            capturedFailure({
              success: false,
              error: 'モックディスパッチャーが見つかりません',
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

      return null;
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
