/**
 * Admin API — Promise-based wrapper around fetch() GET
 *
 * All calls go through callAdminAPI(action, params).
 * The server-side doGet handles action=adminAction and routes
 * to adminDispatch internally.
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
      .adminDispatch(action, params);
  });
}
