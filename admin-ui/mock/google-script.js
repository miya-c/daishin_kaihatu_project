(function () {
  var originalFetch = window.fetch;

  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : input.url;

    if (url && url.indexOf('action=adminAction') !== -1) {
      var urlObj = new URL(url, 'http://localhost');
      var subAction = urlObj.searchParams.get('adminSubAction');
      var dispatcher = window.__mockDispatcher;

      var delay = Math.floor(Math.random() * 300) + 300;

      return new Promise(function (resolve) {
        setTimeout(function () {
          if (typeof dispatcher !== 'function') {
            resolve({
              ok: true,
              json: function () {
                return Promise.resolve({
                  success: false,
                  error: 'モックディスパッチャーが見つかりません',
                });
              },
            });
            return;
          }

          try {
            var params = {};
            urlObj.searchParams.forEach(function (v, k) {
              if (k !== 'action' && k !== 'adminSubAction') {
                params[k] = v;
              }
            });
            var result = dispatcher(subAction, params);
            resolve({
              ok: true,
              json: function () {
                return Promise.resolve(result);
              },
            });
          } catch (err) {
            resolve({
              ok: true,
              json: function () {
                return Promise.resolve({
                  success: false,
                  error: err.message || 'モック実行中にエラーが発生しました',
                });
              },
            });
          }
        }, delay);
      });
    }

    return originalFetch.call(window, input, init);
  };
})();
