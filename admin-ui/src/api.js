/**
 * Admin API — Promise-based wrapper around google.script.run
 *
 * All calls go through callAdminAPI(action, params).
 * The server-side function `adminAction` receives the action name
 * and a params object that always includes adminToken when available.
 */

export function callAdminAPI(action, params) {
  params = params || {};

  return new Promise(function (resolve, reject) {
    var token = sessionStorage.getItem('ADMIN_TOKEN');
    if (token) {
      params.adminToken = token;
    }

    google.script.run
      .withSuccessHandler(function (result) {
        if (result && result.code === 'INVALID_TOKEN') {
          sessionStorage.removeItem('ADMIN_TOKEN');
        }
        resolve(result);
      })
      .withFailureHandler(function (error) {
        reject(error);
      })
      .adminAction(action, params);
  });
}
