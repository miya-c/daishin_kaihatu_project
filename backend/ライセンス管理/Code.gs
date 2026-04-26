// ============================================================
// ライセンス管理 - Google Apps Script Backend
// ============================================================

var LICENSE_SHEET_NAME = 'licenses';
var APP_SHEET_NAME = 'apps';

// スプレッドシートID（setupSheets()で自動作成・設定されます）
var SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || '';

function getSpreadsheet() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

var LICENSE_COL = {
  APP_ID: 1,
  SCRIPT_ID: 2,
  COMPANY_NAME: 3,
  STATUS: 4,
  EXPIRY: 5,
  NOTES: 6,
  WEB_APP_URL: 7,
  API_KEY: 8,
};

var TOKEN_COL = {
  TOKEN: 1,
  LICENSE_ID: 2,
  EXPIRES_AT: 3,
  USED: 4,
};

var APP_COL = {
  APP_ID: 1,
  APP_NAME: 2,
  ICON: 3,
};

// ============================================================
// Web App Entry Point
// ============================================================

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  var scriptId = (e && e.parameter && e.parameter.scriptId) || '';

  // Setup token exchange (public, no admin auth)
  if (action === 'setup') {
    var token = (e && e.parameter && e.parameter.token) || '';
    return handleSetupToken(token);
  }

  // License check: explicit action=check OR legacy ?scriptId=xxx (backward compatible)
  if (action === 'check' || (!action && scriptId)) {
    var appId = (e && e.parameter && e.parameter.appId) || '';
    var result = checkLicense(scriptId, appId);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // No action -> serve admin HTML page
  return HtmlService.createHtmlOutputFromFile('admin')
    .setTitle('ライセンス管理')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ============================================================
// License Checking (backward compatible)
// ============================================================

function checkLicense(scriptId, appId) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(LICENSE_SHEET_NAME);

  if (!sheet) {
    return { authorized: false, message: 'License sheet not found' };
  }

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { authorized: false, message: 'No licenses registered' };
  }

  var hasAppId = appId && String(appId).trim() !== '';

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var rowScriptId = String(row[LICENSE_COL.SCRIPT_ID - 1]).trim();
    var rowAppId = String(row[LICENSE_COL.APP_ID - 1]).trim();

    // Match logic: if appId provided, match both; otherwise match scriptId only
    if (rowScriptId === scriptId) {
      if (hasAppId && rowAppId !== String(appId).trim()) {
        continue;
      }

      var status = String(row[LICENSE_COL.STATUS - 1]).trim();

      if (status === 'active') {
        return { authorized: true, message: 'OK' };
      }

      if (status === 'expiring') {
        var expiry = row[LICENSE_COL.EXPIRY - 1];
        if (expiry) {
          var expiryDate = new Date(expiry);
          var now = new Date();
          if (now <= expiryDate) {
            return { authorized: true, message: 'OK (expiring)' };
          }
          return { authorized: false, message: 'Grace period expired' };
        }
        // No date set -> safe default: authorized
        return { authorized: true, message: 'OK (expiring, no date)' };
      }

      if (status === 'revoked') {
        return { authorized: false, message: 'License revoked' };
      }

      return { authorized: false, message: 'Unknown status: ' + status };
    }
  }

  return { authorized: false, message: 'Script ID not found' };
}

// ============================================================
// Admin API Dispatcher
// ============================================================

function adminAction(action, params) {
  var token = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
  if (params.adminToken !== token) {
    return { success: false, code: 'INVALID_TOKEN' };
  }

  switch (action) {
    case 'verifyToken':
      return { success: true };
    case 'getDashboard':
      return getDashboard();
    case 'listLicenses':
      return listLicenses();
    case 'addLicense':
      return addLicense(params);
    case 'updateLicense':
      return updateLicense(params);
    case 'deleteLicense':
      return deleteLicense(params);
    case 'listApps':
      return listApps();
    case 'addApp':
      return addApp(params);
    case 'updateApp':
      return updateApp(params);
    case 'deleteApp':
      return deleteApp(params);
    case 'generateSetupToken':
      return generateSetupToken(params);
    default:
      return { success: false, message: 'Unknown action' };
  }
}

// ============================================================
// Dashboard
// ============================================================

function getDashboard() {
  var ss = getSpreadsheet();

  // Read apps
  var appSheet = ss.getSheetByName(APP_SHEET_NAME);
  var apps = [];
  if (appSheet) {
    var appData = appSheet.getDataRange().getValues();
    for (var i = 1; i < appData.length; i++) {
      apps.push({
        appId: String(appData[i][APP_COL.APP_ID - 1]).trim(),
        appName: String(appData[i][APP_COL.APP_NAME - 1]).trim(),
        icon: String(appData[i][APP_COL.ICON - 1]).trim(),
      });
    }
  }

  // Read licenses and count by status
  var licSheet = ss.getSheetByName(LICENSE_SHEET_NAME);
  var totalActive = 0;
  var totalExpiring = 0;
  var totalRevoked = 0;
  var perAppCounts = {};

  // Initialize per-app counters
  for (var a = 0; a < apps.length; a++) {
    perAppCounts[apps[a].appId] = { active: 0, expiring: 0, revoked: 0, total: 0 };
  }

  if (licSheet) {
    var licData = licSheet.getDataRange().getValues();
    for (var j = 1; j < licData.length; j++) {
      var status = String(licData[j][LICENSE_COL.STATUS - 1]).trim();
      var appId = String(licData[j][LICENSE_COL.APP_ID - 1]).trim();

      if (status === 'active') {
        totalActive++;
        if (perAppCounts[appId]) {
          perAppCounts[appId].active++;
          perAppCounts[appId].total++;
        }
      } else if (status === 'expiring') {
        totalExpiring++;
        if (perAppCounts[appId]) {
          perAppCounts[appId].expiring++;
          perAppCounts[appId].total++;
        }
      } else if (status === 'revoked') {
        totalRevoked++;
        if (perAppCounts[appId]) {
          perAppCounts[appId].revoked++;
          perAppCounts[appId].total++;
        }
      }
    }
  }

  // Build per-app breakdown
  var perAppBreakdown = [];
  for (var k = 0; k < apps.length; k++) {
    var id = apps[k].appId;
    var counts = perAppCounts[id] || { active: 0, expiring: 0, revoked: 0, total: 0 };
    perAppBreakdown.push({
      appId: id,
      appName: apps[k].appName,
      icon: apps[k].icon,
      total: counts.total,
      active: counts.active,
      expiring: counts.expiring,
      revoked: counts.revoked,
    });
  }

  return {
    success: true,
    apps: apps,
    totalActive: totalActive,
    totalExpiring: totalExpiring,
    totalRevoked: totalRevoked,
    perAppBreakdown: perAppBreakdown,
  };
}

// ============================================================
// License CRUD
// ============================================================

function listLicenses() {
  var ss = getSpreadsheet();
  var licSheet = ss.getSheetByName(LICENSE_SHEET_NAME);
  if (!licSheet) {
    return { success: true, licenses: [] };
  }

  // Build app lookup map
  var appMap = _getAppMap(ss);

  var data = licSheet.getDataRange().getValues();
  var licenses = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var appId = String(row[LICENSE_COL.APP_ID - 1]).trim();
    var appInfo = appMap[appId] || { appName: '', icon: '' };

    var expiryRaw = row[LICENSE_COL.EXPIRY - 1];
    var expiryStr = '';
    if (expiryRaw) {
      var d = new Date(expiryRaw);
      if (!isNaN(d.getTime())) {
        expiryStr = _formatDate(d);
      }
    }

    licenses.push({
      id: i + 1, // row number (1-indexed, accounting for header)
      appId: appId,
      appName: appInfo.appName,
      scriptId: String(row[LICENSE_COL.SCRIPT_ID - 1]).trim(),
      companyName: String(row[LICENSE_COL.COMPANY_NAME - 1]).trim(),
      status: String(row[LICENSE_COL.STATUS - 1]).trim(),
      expiryDate: expiryStr,
      notes: String(row[LICENSE_COL.NOTES - 1]).trim(),
      webAppUrl: String(row[LICENSE_COL.WEB_APP_URL - 1]).trim(),
      apiKey: String(row[LICENSE_COL.API_KEY - 1]).trim(),
    });
  }

  return { success: true, licenses: licenses };
}

function addLicense(params) {
  // Validate required fields
  if (!params.appId || !params.scriptId || !params.companyName) {
    return { success: false, message: 'appId, scriptId, companyName are required' };
  }

  var ss = getSpreadsheet();
  var licSheet = ss.getSheetByName(LICENSE_SHEET_NAME);
  if (!licSheet) {
    return { success: false, message: 'Licenses sheet not found' };
  }

  // Check for scriptId duplicate
  var data = licSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][LICENSE_COL.SCRIPT_ID - 1]).trim() === String(params.scriptId).trim()) {
      return { success: false, message: 'scriptId already exists' };
    }
  }

  var expiryValue = params.expiryDate ? new Date(params.expiryDate) : '';
  if (expiryValue && isNaN(expiryValue.getTime())) {
    expiryValue = '';
  }

  licSheet.appendRow([
    String(params.appId).trim(),
    String(params.scriptId).trim(),
    String(params.companyName).trim(),
    String(params.status || 'active').trim(),
    expiryValue,
    String(params.notes || '').trim(),
    String(params.webAppUrl || '').trim(),
    String(params.apiKey || '').trim(),
  ]);

  return { success: true };
}

function updateLicense(params) {
  if (!params.id) {
    return { success: false, message: 'id (row number) is required' };
  }

  var ss = getSpreadsheet();
  var licSheet = ss.getSheetByName(LICENSE_SHEET_NAME);
  if (!licSheet) {
    return { success: false, message: 'Licenses sheet not found' };
  }

  var rowNumber = Number(params.id);
  var lastRow = licSheet.getLastRow();
  if (rowNumber < 2 || rowNumber > lastRow) {
    return { success: false, message: 'Invalid row id' };
  }

  var newStatus = params.status !== undefined ? String(params.status).trim() : null;
  var currentStatus = String(licSheet.getRange(rowNumber, LICENSE_COL.STATUS).getValue()).trim();

  // Update fields if provided
  if (params.scriptId !== undefined) {
    licSheet.getRange(rowNumber, LICENSE_COL.SCRIPT_ID).setValue(String(params.scriptId).trim());
  }
  if (params.companyName !== undefined) {
    licSheet.getRange(rowNumber, LICENSE_COL.COMPANY_NAME).setValue(String(params.companyName).trim());
  }
  if (newStatus !== null) {
    licSheet.getRange(rowNumber, LICENSE_COL.STATUS).setValue(newStatus);
  }
  if (params.notes !== undefined) {
    licSheet.getRange(rowNumber, LICENSE_COL.NOTES).setValue(String(params.notes).trim());
  }
  if (params.webAppUrl !== undefined) {
    licSheet.getRange(rowNumber, LICENSE_COL.WEB_APP_URL).setValue(String(params.webAppUrl).trim());
  }
  if (params.apiKey !== undefined) {
    licSheet.getRange(rowNumber, LICENSE_COL.API_KEY).setValue(String(params.apiKey).trim());
  }

  // Handle expiry based on status change
  if (newStatus === 'expiring' && currentStatus !== 'expiring') {
    // Status changed to expiring: set 30 days if no date provided
    var expiryCell = licSheet.getRange(rowNumber, LICENSE_COL.EXPIRY);
    if (params.expiryDate) {
      expiryCell.setValue(new Date(params.expiryDate));
    } else if (!expiryCell.getValue()) {
      var futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      expiryCell.setValue(futureDate);
    }
  } else if (newStatus === 'active') {
    // Status changed to active: clear expiry
    licSheet.getRange(rowNumber, LICENSE_COL.EXPIRY).setValue('');
  } else if (params.expiryDate !== undefined) {
    // Explicit expiry date provided
    if (params.expiryDate) {
      licSheet.getRange(rowNumber, LICENSE_COL.EXPIRY).setValue(new Date(params.expiryDate));
    } else {
      licSheet.getRange(rowNumber, LICENSE_COL.EXPIRY).setValue('');
    }
  }

  // APP_ID is intentionally ignored (cannot be changed)

  return { success: true };
}

function deleteLicense(params) {
  if (!params.id) {
    return { success: false, message: 'id (row number) is required' };
  }

  var ss = getSpreadsheet();
  var licSheet = ss.getSheetByName(LICENSE_SHEET_NAME);
  if (!licSheet) {
    return { success: false, message: 'Licenses sheet not found' };
  }

  var rowNumber = Number(params.id);
  var lastRow = licSheet.getLastRow();
  if (rowNumber < 2 || rowNumber > lastRow) {
    return { success: false, message: 'Invalid row id' };
  }

  licSheet.deleteRow(rowNumber);
  return { success: true };
}

// ============================================================
// App CRUD
// ============================================================

function listApps() {
  var ss = getSpreadsheet();
  var appSheet = ss.getSheetByName(APP_SHEET_NAME);
  if (!appSheet) {
    return { success: true, apps: [] };
  }

  // Count licenses per app
  var licSheet = ss.getSheetByName(LICENSE_SHEET_NAME);
  var licenseCounts = {};
  if (licSheet) {
    var licData = licSheet.getDataRange().getValues();
    for (var i = 1; i < licData.length; i++) {
      var appId = String(licData[i][LICENSE_COL.APP_ID - 1]).trim();
      licenseCounts[appId] = (licenseCounts[appId] || 0) + 1;
    }
  }

  var appData = appSheet.getDataRange().getValues();
  var apps = [];

  for (var j = 1; j < appData.length; j++) {
    var id = String(appData[j][APP_COL.APP_ID - 1]).trim();
    apps.push({
      appId: id,
      appName: String(appData[j][APP_COL.APP_NAME - 1]).trim(),
      icon: String(appData[j][APP_COL.ICON - 1]).trim(),
      licenseCount: licenseCounts[id] || 0,
    });
  }

  return { success: true, apps: apps };
}

function addApp(params) {
  if (!params.appId || !params.appName) {
    return { success: false, message: 'appId and appName are required' };
  }

  var ss = getSpreadsheet();
  var appSheet = ss.getSheetByName(APP_SHEET_NAME);
  if (!appSheet) {
    return { success: false, message: 'Apps sheet not found' };
  }

  // Check appId duplicate
  var data = appSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][APP_COL.APP_ID - 1]).trim() === String(params.appId).trim()) {
      return { success: false, message: 'appId already exists' };
    }
  }

  appSheet.appendRow([
    String(params.appId).trim(),
    String(params.appName).trim(),
    String(params.icon || '').trim(),
  ]);

  return { success: true };
}

function updateApp(params) {
  if (!params.appId) {
    return { success: false, message: 'appId is required' };
  }

  var ss = getSpreadsheet();
  var appSheet = ss.getSheetByName(APP_SHEET_NAME);
  if (!appSheet) {
    return { success: false, message: 'Apps sheet not found' };
  }

  var data = appSheet.getDataRange().getValues();
  var targetAppId = String(params.appId).trim();
  var found = false;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][APP_COL.APP_ID - 1]).trim() === targetAppId) {
      if (params.appName !== undefined) {
        appSheet.getRange(i + 1, APP_COL.APP_NAME).setValue(String(params.appName).trim());
      }
      if (params.icon !== undefined) {
        appSheet.getRange(i + 1, APP_COL.ICON).setValue(String(params.icon).trim());
      }
      found = true;
      break;
    }
  }

  if (!found) {
    return { success: false, message: 'App not found' };
  }

  return { success: true };
}

function deleteApp(params) {
  if (!params.appId) {
    return { success: false, message: 'appId is required' };
  }

  var ss = getSpreadsheet();

  // Check if any licenses reference this appId
  var licSheet = ss.getSheetByName(LICENSE_SHEET_NAME);
  if (licSheet) {
    var licData = licSheet.getDataRange().getValues();
    for (var i = 1; i < licData.length; i++) {
      if (String(licData[i][LICENSE_COL.APP_ID - 1]).trim() === String(params.appId).trim()) {
        return { success: false, message: 'Cannot delete app with existing licenses' };
      }
    }
  }

  var appSheet = ss.getSheetByName(APP_SHEET_NAME);
  if (!appSheet) {
    return { success: false, message: 'Apps sheet not found' };
  }

  var appData = appSheet.getDataRange().getValues();
  var targetAppId = String(params.appId).trim();

  for (var j = 1; j < appData.length; j++) {
    if (String(appData[j][APP_COL.APP_ID - 1]).trim() === targetAppId) {
      appSheet.deleteRow(j + 1);
      return { success: true };
    }
  }

  return { success: false, message: 'App not found' };
}

// ============================================================
// onEdit Trigger
// ============================================================

function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  if (sheet.getName() !== LICENSE_SHEET_NAME) return;

  var range = e.range;
  var editedCol = range.getColumn();

  if (editedCol === LICENSE_COL.STATUS) {
    var status = String(range.getValue()).trim();
    if (status === 'expiring') {
      var expiryCell = sheet.getRange(range.getRow(), LICENSE_COL.EXPIRY);
      if (!expiryCell.getValue()) {
        var futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        expiryCell.setValue(futureDate);
      }
    }
  }
}

// ============================================================
// Setup & Migration
// ============================================================

function setupSheets() {
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty('SPREADSHEET_ID');
  var ss;

  if (ssId) {
    ss = SpreadsheetApp.openById(ssId);
  } else {
    ss = SpreadsheetApp.create('ライセンス管理');
    props.setProperty('SPREADSHEET_ID', ss.getId());
    // Update SPREADSHEET_ID for current execution
    SPREADSHEET_ID = ss.getId();
  }

  // Create apps sheet if not exists
  if (!ss.getSheetByName(APP_SHEET_NAME)) {
    var sheet = ss.insertSheet(APP_SHEET_NAME);
    sheet.appendRow(['APP_ID', 'APP_NAME', 'ICON']);
    // Add default apps
    sheet.appendRow(['suido', '水道検針', '💧']);
  }

  // Create or migrate licenses sheet
  if (!ss.getSheetByName(LICENSE_SHEET_NAME)) {
    var lSheet = ss.insertSheet(LICENSE_SHEET_NAME);
    lSheet.appendRow(['APP_ID', 'SCRIPT_ID', 'COMPANY_NAME', 'STATUS', 'EXPIRY', 'NOTES', 'WEB_APP_URL', 'API_KEY']);
  }

  // Create setup_tokens sheet if not exists
  if (!ss.getSheetByName('setup_tokens')) {
    var tSheet = ss.insertSheet('setup_tokens');
    tSheet.appendRow(['TOKEN', 'LICENSE_ID', 'EXPIRES_AT', 'USED']);
  }

  // Delete default "シート1" sheet AFTER creating our sheets
  var defaultSheet = ss.getSheetByName('シート1');
  if (defaultSheet) {
    ss.deleteSheet(defaultSheet);
  }

  // Delete old sheet if exists (from previous version)
  var oldSheet = ss.getSheetByName('ライセンス管理');
  if (oldSheet && ss.getSheetByName(LICENSE_SHEET_NAME)) {
    ss.deleteSheet(oldSheet);
  }

  setupInstallableTrigger(ss);
  Logger.log('セットアップ完了: https://docs.google.com/spreadsheets/d/' + ss.getId());
}

function setupInstallableTrigger(ss) {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'onEdit') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('onEdit')
    .forSpreadsheet(ss)
    .onEdit()
    .create();
}

// ============================================================
// Setup Token Management
// ============================================================

function handleSetupToken(token) {
  if (!token) {
    return HtmlService.createHtmlOutput(
      '<html><body style="font-family:sans-serif;text-align:center;padding:40px;">' +
      '<h2>エラー</h2><p>トークンが指定されていません。</p>' +
      '</body></html>'
    ).setTitle('セットアップエラー');
  }

  var result = exchangeSetupToken(token);

  if (!result.success) {
    return HtmlService.createHtmlOutput(
      '<html><body style="font-family:sans-serif;text-align:center;padding:40px;">' +
      '<h2>エラー</h2><p>' + result.message + '</p>' +
      '</body></html>'
    ).setTitle('セットアップエラー');
  }

  var pwaBaseUrl = PropertiesService.getScriptProperties().getProperty('PWA_BASE_URL') || '';
  var webAppUrl = result.webAppUrl;
  var apiKey = result.apiKey;
  var redirectUrl = pwaBaseUrl + '/#url=' + encodeURIComponent(webAppUrl) + '&key=' + encodeURIComponent(apiKey);

  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>セットアップ</title>' +
    '<style>body{font-family:sans-serif;text-align:center;padding:40px;} .spinner{margin:20px auto;width:40px;height:40px;border:4px solid #e0e0e0;border-top:4px solid #1976d2;border-radius:50%;animation:spin 1s linear infinite} @keyframes spin{to{transform:rotate(360deg)}}</style>' +
    '</head><body>' +
    '<div class="spinner"></div>' +
    '<h2>設定を読み込んでいます...</h2>' +
    '<p>しばらくお待ちください。</p>' +
    '<noscript><p>JavaScriptが無効です。<a href="' + redirectUrl + '">ここをクリック</a>して続行してください。</p></noscript>' +
    '<script>document.addEventListener("DOMContentLoaded", function() { window.location.replace("' + redirectUrl + '"); });</script>' +
    '</body></html>';

  return HtmlService.createHtmlOutput(html).setTitle('セットアップ');
}

function generateSetupToken(params) {
  if (!params.id) {
    return { success: false, message: 'id (row number) is required' };
  }

  var ss = getSpreadsheet();
  var licSheet = ss.getSheetByName(LICENSE_SHEET_NAME);
  if (!licSheet) {
    return { success: false, message: 'Licenses sheet not found' };
  }

  var rowNumber = Number(params.id);
  var lastRow = licSheet.getLastRow();
  if (rowNumber < 2 || rowNumber > lastRow) {
    return { success: false, message: 'Invalid row id' };
  }

  var licenseRow = licSheet.getRange(rowNumber, 1, 1, 8).getValues()[0];
  var webAppUrl = String(licenseRow[LICENSE_COL.WEB_APP_URL - 1]).trim();
  var apiKey = String(licenseRow[LICENSE_COL.API_KEY - 1]).trim();

  if (!webAppUrl || !apiKey) {
    return { success: false, message: 'License must have webAppUrl and apiKey configured' };
  }

  var token = Utilities.getUuid();
  var expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  var tSheet = ss.getSheetByName('setup_tokens');
  if (!tSheet) {
    return { success: false, message: 'Setup tokens sheet not found. Run setupSheets() first.' };
  }

  tSheet.appendRow([token, String(rowNumber), expiresAt, false]);

  var baseUrl = ScriptApp.getService().getUrl().split('?')[0];
  var setupUrl = baseUrl + '?action=setup&token=' + token;

  return { success: true, token: token, setupUrl: setupUrl };
}

function exchangeSetupToken(token) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('setup_tokens');
  if (!sheet) return { success: false, message: 'Setup tokens sheet not found' };

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][TOKEN_COL.TOKEN - 1] === token) {
      if (data[i][TOKEN_COL.USED - 1] === true) {
        return { success: false, message: 'Token already used' };
      }
      var expiresAt = new Date(data[i][TOKEN_COL.EXPIRES_AT - 1]);
      if (new Date() > expiresAt) {
        return { success: false, message: 'Token expired' };
      }
      sheet.getRange(i + 1, TOKEN_COL.USED).setValue(true);
      var licenseId = data[i][TOKEN_COL.LICENSE_ID - 1];
      var lSheet = ss.getSheetByName(LICENSE_SHEET_NAME);
      var licenseRow = lSheet.getRange(parseInt(licenseId), 1, 1, 8).getValues()[0];
      return {
        success: true,
        webAppUrl: licenseRow[LICENSE_COL.WEB_APP_URL - 1] || '',
        apiKey: licenseRow[LICENSE_COL.API_KEY - 1] || ''
      };
    }
  }
  return { success: false, message: 'Invalid token' };
}

// ============================================================
// Helpers
// ============================================================

function _getAppMap(ss) {
  var appSheet = ss.getSheetByName(APP_SHEET_NAME);
  var map = {};
  if (!appSheet) return map;

  var data = appSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var appId = String(data[i][APP_COL.APP_ID - 1]).trim();
    map[appId] = {
      appName: String(data[i][APP_COL.APP_NAME - 1]).trim(),
      icon: String(data[i][APP_COL.ICON - 1]).trim(),
    };
  }
  return map;
}

function _formatDate(date) {
  var y = date.getFullYear();
  var m = ('0' + (date.getMonth() + 1)).slice(-2);
  var d = ('0' + date.getDate()).slice(-2);
  return y + '-' + m + '-' + d;
}
