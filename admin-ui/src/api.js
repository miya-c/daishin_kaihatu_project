/**
 * Admin API — Promise-based wrapper around fetch() GET
 *
 * All calls go through callAdminAPI(action, params).
 * The server-side doGet handles action=adminAction and routes
 * to adminDispatch internally.
 */

export function callAdminAPI(action, params) {
  params = params || {};

  var token = sessionStorage.getItem('ADMIN_TOKEN');
  if (token) {
    params.adminToken = token;
  }

  var queryParams = ['action=adminAction', 'adminSubAction=' + encodeURIComponent(action)];
  var keys = Object.keys(params);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (key && params[key] !== undefined && params[key] !== null && params[key] !== '') {
      queryParams.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
    }
  }

  return fetch('?' + queryParams.join('&'))
    .then(function (response) {
      return response.json();
    })
    .then(function (result) {
      if (result && result.code === 'INVALID_TOKEN') {
        sessionStorage.removeItem('ADMIN_TOKEN');
      }
      return result;
    });
}
