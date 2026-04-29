// GAS service mocks for vitest-based testing

// --- PropertiesService mock ---
const mockProperties = {};
export const PropertiesService = {
  getScriptProperties: () => ({
    getProperty: (key) => mockProperties[key] || null,
    setProperty: (key, value) => {
      mockProperties[key] = String(value);
    },
    deleteProperty: (key) => {
      delete mockProperties[key];
    },
    getProperties: () => ({ ...mockProperties }),
  }),
};

// --- UrlFetchApp mock ---
let _fetchResponse = {
  getContentText: () => '{"authorized":true,"message":"OK"}',
};
let _fetchError = null;

export const UrlFetchApp = {
  fetch: (url, options) => {
    if (_fetchError) throw _fetchError;
    return _fetchResponse;
  },
  setMockResponse: (response) => {
    _fetchResponse = response;
  },
  setMockError: (error) => {
    _fetchError = error;
  },
  resetMocks: () => {
    _fetchError = null;
    _fetchResponse = {
      getContentText: () => '{"authorized":true,"message":"OK"}',
    };
  },
};

// --- ScriptApp mock ---
let _scriptId = 'test-script-id-001';
export const ScriptApp = {
  getScriptId: () => _scriptId,
  setMockScriptId: (id) => {
    _scriptId = id;
  },
};

// --- Logger mock ---
export const logs = [];
export const Logger = {
  log: (msg) => {
    logs.push(msg);
  },
  clear: () => {
    logs.length = 0;
  },
};

// --- Helper to reset all mocks between tests ---
export const resetAllMocks = () => {
  Object.keys(mockProperties).forEach((k) => delete mockProperties[k]);
  UrlFetchApp.resetMocks();
  ScriptApp.setMockScriptId('test-script-id-001');
  Logger.clear();
};
