export function callAdminAPI(action, params) {
  params = params || {};

  return new Promise(function (resolve, reject) {
    var token = sessionStorage.getItem('ADMIN_TOKEN');
    if (token) {
      params.adminToken = token;
    }

    var timedOut = false;
    var timer = setTimeout(function () {
      timedOut = true;
      reject(new Error('通信がタイムアウトしました。もう一度お試しください。'));
    }, 30000);

    console.log('[callAdminAPI] →', action, JSON.stringify(params));

    google.script.run
      .withSuccessHandler(function (result) {
        clearTimeout(timer);
        if (timedOut) return;
        console.log('[callAdminAPI] ←', action, 'result:', JSON.stringify(result));
        if (result && result.code === 'INVALID_TOKEN') {
          sessionStorage.removeItem('ADMIN_TOKEN');
          if (window.Alpine && Alpine.store('auth')) {
            Alpine.store('auth').authenticated = false;
            Alpine.store('auth').token = null;
          }
          if (window.Alpine && Alpine.store('toast')) {
            Alpine.store('toast').warning('ログインの有効期限が切れました');
          }
        }
        resolve(result);
      })
      .withFailureHandler(function (error) {
        clearTimeout(timer);
        if (timedOut) return;
        console.log('[callAdminAPI] ✗', action, 'error:', error);
        reject(error);
      })
      .adminAction(action, params);
  });
}
