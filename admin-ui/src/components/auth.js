/**
 * Auth Gate Component — Alpine.data('authGate')
 *
 * Token input form for admin authentication.
 * On submit the token is saved to sessionStorage and verified
 * against the server.  A successful verify sets the global
 * auth store to authenticated.
 */

import { callAdminAPI } from '../api.js';

document.addEventListener('alpine:init', function () {
  Alpine.data('authGate', function () {
    return {
      token: '',
      error: '',
      loading: false,

      submit: function () {
        var self = this;
        self.error = '';
        self.loading = true;

        sessionStorage.setItem('ADMIN_TOKEN', self.token);

        callAdminAPI('verifyToken', {})
          .then(function (result) {
            if (result && result.success) {
              Alpine.store('auth').authenticated = true;
              Alpine.store('auth').token = self.token;
              Alpine.store('toast').success('ログインしました');
            } else {
              self.error =
                result && result.message ? result.message : 'パスワードが正しくありません';
              sessionStorage.removeItem('ADMIN_TOKEN');
            }
          })
          .catch(function (err) {
            self.error =
              '通信エラーが発生しました。ネットワーク接続を確認してください: ' + err.message;
            sessionStorage.removeItem('ADMIN_TOKEN');
          })
          .finally(function () {
            self.loading = false;
          });
      },
    };
  });
});
