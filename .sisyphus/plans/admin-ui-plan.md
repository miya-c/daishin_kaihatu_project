# Admin UI Implementation Plan — 水道検針システム

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Browser                                                │
│  admin.html (served by GAS HtmlService)                 │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Alpine.js CSP + Bulma CSS (CDN)                │    │
│  │  SPA with 5 tabs: Dashboard, Monthly, Setup,    │    │
│  │  Maintenance, Diagnostics                       │    │
│  └──────────────┬──────────────────────────────────┘    │
│                 │ google.script.run.adminAction()        │
├─────────────────┼───────────────────────────────────────┤
│  Client GAS     │  (library_client.gs)                  │
│                 ▼                                       │
│  adminAction(action, params) → cmlibrary.adminDispatch()│
├─────────────────────────────────────────────────────────┤
│  Library GAS   (admin_api.js)                           │
│  adminDispatch(action, params):                         │
│    1. Validate adminToken against ScriptProperties      │
│    2. Rate-limit check via CacheService                 │
│    3. Route to existing library functions               │
│    4. Return {success, ...} structured response         │
├─────────────────────────────────────────────────────────┤
│  Existing library functions (unchanged):                │
│  getProperties, preCheckMonthlyProcess,                 │
│  processInspectionDataMonthlyImpl, validateSystemSetup, │
│  validateInspectionDataIntegrity, runSystemDiagnostics  │
│  ... (17 files, ~9500 lines total)                      │
└─────────────────────────────────────────────────────────┘
```

## File Manifest

### New Files

| File                                          | Phase | Purpose                       |
| --------------------------------------------- | ----- | ----------------------------- |
| `admin-ui/package.json`                       | 0     | NPM config                    |
| `admin-ui/vite.config.js`                     | 0     | Vite build config             |
| `admin-ui/index.html`                         | 0     | Dev HTML template             |
| `admin-ui/src/main.js`                        | 0     | Bootstrap + Alpine init       |
| `admin-ui/src/api.js`                         | 0     | Promise-based API client      |
| `admin-ui/src/stores.js`                      | 0     | Alpine global stores          |
| `admin-ui/src/components/app.js`              | 0     | Root adminApp component       |
| `admin-ui/src/components/auth.js`             | 0     | Auth gate component           |
| `admin-ui/src/components/monthly-process.js`  | 2     | Monthly process wizard        |
| `admin-ui/src/components/dashboard.js`        | 3     | Dashboard section             |
| `admin-ui/src/components/data-maintenance.js` | 4     | Maintenance tools             |
| `admin-ui/src/components/setup-wizard.js`     | 5     | Setup wizard                  |
| `admin-ui/src/components/diagnostics.js`      | 6     | Diagnostics section           |
| `admin-ui/mock/google-script.js`              | 0     | google.script.run mock        |
| `admin-ui/mock/dispatcher.js`                 | 0     | Mock action dispatcher        |
| `admin-ui/mock/data.js`                       | 0     | Mock Japanese data            |
| `admin-ui/scripts/build.sh`                   | 0     | Build → copy → push script    |
| `backend/水道検針ライブラリ/admin_api.js`     | 1     | Server-side dispatcher + auth |
| `backend/水道検針ライブラリ/admin.html`       | 1     | Built admin SPA               |

### Modified Files

| File                                        | Phase | Changes                                          |
| ------------------------------------------- | ----- | ------------------------------------------------ |
| `.gitignore`                                | 0     | Add `admin-ui/dist/`, `admin-ui/node_modules/`   |
| `gas_scripts/library_client.gs`             | 1     | Add `adminAction()` function                     |
| `backend/水道検針ライブラリ/web_app_api.js` | 1     | Replace no-action HTML with admin.html serve     |
| `backend/水道検針ライブラリ/web_app_api.js` | 7     | Remove old admin actions from doGet default case |

---

## Phase 0: Project Setup — `admin-ui/` Dev Environment

**Goal:** Scaffold local development directory with Vite, Alpine.js CSP, Bulma, mock system, build pipeline. Zero changes to existing code.

### Steps

| #    | Task                                                         | File                              |
| ---- | ------------------------------------------------------------ | --------------------------------- |
| 0.1  | Create directory structure                                   | `admin-ui/`                       |
| 0.2  | Create package.json (vite, vite-plugin-singlefile)           | `admin-ui/package.json`           |
| 0.3  | Create vite.config.js (single-file output, CDN preservation) | `admin-ui/vite.config.js`         |
| 0.4  | Create index.html (Bulma CDN, Alpine CSP CDN, mock script)   | `admin-ui/index.html`             |
| 0.5  | Create google.script.run mock with Promise wrapper           | `admin-ui/mock/google-script.js`  |
| 0.6  | Create mock action dispatcher                                | `admin-ui/mock/dispatcher.js`     |
| 0.7  | Create mock Japanese data (3 properties, 8 rooms)            | `admin-ui/mock/data.js`           |
| 0.8  | Create api.js (Promise-based google.script.run wrapper)      | `admin-ui/src/api.js`             |
| 0.9  | Create stores.js (Alpine global stores)                      | `admin-ui/src/stores.js`          |
| 0.10 | Create app.js (bare adminApp component)                      | `admin-ui/src/components/app.js`  |
| 0.11 | Create auth.js (token input form)                            | `admin-ui/src/components/auth.js` |
| 0.12 | Create main.js (imports + Alpine init)                       | `admin-ui/src/main.js`            |
| 0.13 | Create build.sh (build → copy → clasp push)                  | `admin-ui/scripts/build.sh`       |
| 0.14 | Update .gitignore                                            | `.gitignore`                      |

### Success Criteria

- [ ] `cd admin-ui && npm install && npm run dev` starts Vite dev server
- [ ] Browser loads page with Bulma styling
- [ ] Mock `google.script.run` returns data for test actions
- [ ] `npm run build` produces single `dist/admin.html` (< 100KB)
- [ ] CDN links to Alpine.js CSP and Bulma preserved in output

---

## Phase 1: Core Infrastructure — Dispatcher, Auth, Routing Shell

**Goal:** Server-side dispatcher, client wrapper, bare admin HTML shell served from GAS. Auth gate works. Tabs render empty sections.

### Steps

| #   | Task                                                                                          | File                                        |
| --- | --------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 1.1 | Create admin_api.js (adminDispatch, validateAdminToken, checkAdminRateLimit, wrapAdminAction) | `backend/水道検針ライブラリ/admin_api.js`   |
| 1.2 | Add adminAction() wrapper function                                                            | `gas_scripts/library_client.gs`             |
| 1.3 | Modify doGet no-action route to serve admin.html                                              | `backend/水道検針ライブラリ/web_app_api.js` |
| 1.4 | Build admin.html shell and push to GAS                                                        | `backend/水道検針ライブラリ/admin.html`     |
| 1.5 | Verify GAS file concatenation order                                                           | GAS editor                                  |

### Key: admin_api.js Structure

```javascript
function adminDispatch(action, params) {
  // 1. Token validation
  // 2. Rate limiting (CacheService, 20 failures / 5min)
  // 3. Action routing (switch)
  // 4. Return {success, ...} with wrapAdminAction error wrapper
}
```

### Key: doGet Routing Change

```javascript
// Before: inline test HTML
// After:
if (!action) {
  return HtmlService.createHtmlOutputFromFile('admin')
    .setTitle('水道検針 管理画面')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
```

### Success Criteria

- [ ] Navigating to Web App URL renders admin HTML shell
- [ ] Auth gate: wrong token → error, correct token → tabs visible
- [ ] `google.script.run.adminAction('verifyToken', ...)` returns `{success: true}`
- [ ] Rate limiting blocks after 20 failed attempts
- [ ] Tab switching works (empty sections)
- [ ] Existing API actions (`?action=getProperties`) still work

---

## Phase 2: Monthly Process Section

**Goal:** 3-step wizard: pre-check → confirm → execute → results.

### Steps

| #   | Task                                                                                     | File                                         |
| --- | ---------------------------------------------------------------------------------------- | -------------------------------------------- |
| 2.1 | Add preCheckMonthlyProcess, executeMonthlyProcess, getMonthlyProcessStatus to dispatcher | `backend/水道検針ライブラリ/admin_api.js`    |
| 2.2 | Create monthly process Alpine component (wizard UI)                                      | `admin-ui/src/components/monthly-process.js` |
| 2.3 | Add mock responses for monthly actions                                                   | `admin-ui/mock/dispatcher.js`                |
| 2.4 | Build and deploy                                                                         | —                                            |

### UI Flow

1. **事前チェック**: Button → `preCheckMonthlyProcess` → color-coded check results
2. **確認**: Summary card with errors blocking, warnings confirming
3. **実行**: `executeMonthlyProcess` → loading spinner → results
4. **結果**: Archive sheet name, reset count, success message

### Success Criteria

- [ ] Pre-check displays categorized results (error/warning/success/info)
- [ ] Error checks block execution
- [ ] Execute shows loading state during 30-60s processing
- [ ] Results display with archive details
- [ ] All UI text in Japanese

---

## Phase 3: Dashboard Section

**Goal:** Property/inspection status overview with spreadsheet info.

### Steps

| #   | Task                                                            | File                                      |
| --- | --------------------------------------------------------------- | ----------------------------------------- |
| 3.1 | Add getRooms, getAdminDashboardData to dispatcher               | `backend/水道検針ライブラリ/admin_api.js` |
| 3.2 | Create getAdminDashboardData() aggregation function             | `backend/水道検針ライブラリ/admin_api.js` |
| 3.3 | Create dashboard Alpine component (stat cards + property table) | `admin-ui/src/components/dashboard.js`    |
| 3.4 | Add mock responses                                              | `admin-ui/mock/dispatcher.js`             |
| 3.5 | Build and deploy                                                | —                                         |

### Layout

- Top: 4 stat cards (total properties, rooms, inspected, completion %)
- Spreadsheet info card
- Property table with status badges

### Success Criteria

- [ ] Stat cards show accurate counts
- [ ] Property table loads all properties
- [ ] Status badges color-coded correctly
- [ ] Loading states during data fetch

---

## Phase 4: Data Maintenance Section

**Goal:** Data integrity check, duplicate cleanup, ID tools.

### Steps

| #   | Task                                                    | File                                          |
| --- | ------------------------------------------------------- | --------------------------------------------- |
| 4.1 | Add 5 maintenance actions to dispatcher                 | `backend/水道検針ライブラリ/admin_api.js`     |
| 4.2 | Create data maintenance Alpine component (5 tool cards) | `admin-ui/src/components/data-maintenance.js` |
| 4.3 | Add mock responses                                      | `admin-ui/mock/dispatcher.js`                 |
| 4.4 | Build and deploy                                        | —                                             |

### Tool Cards

1. 整合性チェック → `validateInspectionDataIntegrity`
2. 重複データ削除 → `optimizedCleanupDuplicateInspectionData`
3. 部屋ID自動生成 → `generateRoomIds`
4. 物件IDフォーマット → `formatAllPropertyIds`
5. 孤立データ削除 → `cleanUpOrphanedRooms`

### Success Criteria

- [ ] 5 tool cards render and execute correctly
- [ ] Destructive actions show confirmation dialog
- [ ] Results formatted clearly

---

## Phase 5: Setup Wizard Section

**Goal:** 7-step guided system setup.

### Steps

| #   | Task                                               | File                                      |
| --- | -------------------------------------------------- | ----------------------------------------- |
| 5.1 | Add setup actions to dispatcher                    | `backend/水道検針ライブラリ/admin_api.js` |
| 5.2 | Create setup wizard Alpine component (Bulma steps) | `admin-ui/src/components/setup-wizard.js` |
| 5.3 | Add mock responses                                 | `admin-ui/mock/dispatcher.js`             |
| 5.4 | Build and deploy                                   | —                                         |

### 7 Steps

| Step | Title                  | API Call                            |
| ---- | ---------------------- | ----------------------------------- |
| 1    | システム確認           | `validateSystemSetup`               |
| 2    | マスタテンプレート作成 | `createMasterSheetTemplates`        |
| 3    | 物件ID採番             | `formatAllPropertyIds`              |
| 4    | 部屋ID生成             | `generateRoomIds`                   |
| 5    | 検針データ作成         | `createInitialInspectionData`       |
| 6    | データ反映             | `populateInspectionDataFromMasters` |
| 7    | 最終確認               | `validateSystemSetup`               |

### Success Criteria

- [ ] 7-step wizard with progress indicator
- [ ] Each step executes and shows results
- [ ] Can navigate back to previous steps
- [ ] Final step shows comprehensive validation

---

## Phase 6: System Diagnostics Section

**Goal:** System health dashboard.

### Steps

| #   | Task                                   | File                                      |
| --- | -------------------------------------- | ----------------------------------------- |
| 6.1 | Add runSystemDiagnostics to dispatcher | `backend/水道検針ライブラリ/admin_api.js` |
| 6.2 | Create diagnostics Alpine component    | `admin-ui/src/components/diagnostics.js`  |
| 6.3 | Add mock responses                     | `admin-ui/mock/dispatcher.js`             |
| 6.4 | Build and deploy                       | —                                         |

### Layout

- Run diagnostics button
- Results: sheets status table, functions test, performance, issues list (color-coded), summary badge

### Success Criteria

- [ ] Diagnostics run and display organized results
- [ ] Issues color-coded by severity
- [ ] Overall status badge

---

## Phase 7: Security Hardening & Cleanup

**Goal:** Remove legacy admin code, simplify menu, harden security.

### Steps

| #   | Task                                                                                               | File                                        |
| --- | -------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 7.1 | Remove old URL-based admin actions (getSpreadsheetInfo, getPropertyMaster) from doGet default case | `backend/水道検針ライブラリ/web_app_api.js` |
| 7.2 | Simplify spreadsheet menu to "管理画面を開く" + basic items                                        | `gas_scripts/library_client.gs`             |
| 7.3 | Add rate limit reset on successful auth                                                            | `backend/水道検針ライブラリ/admin_api.js`   |
| 7.4 | Add admin action logging                                                                           | `backend/水道検針ライブラリ/admin_api.js`   |
| 7.5 | Regression test all existing API actions                                                           | —                                           |

### Success Criteria

- [ ] Old `?action=getSpreadsheetInfo&adminToken=...` returns "unknown action"
- [ ] Spreadsheet menu simplified
- [ ] Rate limit resets on successful auth
- [ ] All existing API actions still work (PWA unaffected)
- [ ] Admin UI all 5 sections functional

---

## Action Dispatcher Reference

| Action                              | Target Function                             | Phase |
| ----------------------------------- | ------------------------------------------- | ----- |
| `verifyToken`                       | (inline)                                    | 1     |
| `getSpreadsheetInfo`                | `getSpreadsheetInfo()`                      | 1     |
| `getProperties`                     | `getProperties()`                           | 1     |
| `preCheckMonthlyProcess`            | `preCheckMonthlyProcess()`                  | 2     |
| `executeMonthlyProcess`             | `processInspectionDataMonthlyImpl()`        | 2     |
| `getMonthlyProcessStatus`           | `getMonthlyProcessStatus()` (new)           | 2     |
| `getRooms`                          | `getRooms(propertyId)`                      | 3     |
| `getAdminDashboardData`             | `getAdminDashboardData()` (new)             | 3     |
| `validateInspectionDataIntegrity`   | `validateInspectionDataIntegrity()`         | 4     |
| `cleanupDuplicateData`              | `optimizedCleanupDuplicateInspectionData()` | 4     |
| `generateRoomIds`                   | `generateRoomIds()`                         | 4     |
| `formatAllPropertyIds`              | `formatAllPropertyIds()`                    | 4     |
| `cleanUpOrphanedRooms`              | `cleanUpOrphanedRooms()`                    | 4     |
| `validateSystemSetup`               | `validateSystemSetup(options)`              | 5     |
| `createMasterSheetTemplates`        | `createMasterSheetTemplates(null, options)` | 5     |
| `populateInspectionDataFromMasters` | `populateInspectionDataFromMasters(config)` | 5     |
| `createInitialInspectionData`       | `createInitialInspectionData()`             | 5     |
| `runSystemDiagnostics`              | `runSystemDiagnostics(options)`             | 6     |

## Distribution Workflow

**配布先企業のセットアップ（初回）:**

1. ライブラリを追加（スクリプトID入力、識別子: `cmlibrary`）
2. `library_client.gs` をコピー＆ペースト（1ファイル）
3. スクリプトプロパティに `ADMIN_TOKEN` を設定
4. Web Appとしてデプロイ
5. Web App URL にアクセス → 管理画面が表示される

**管理画面の更新時:**

1. ライブラリのバージョンを最新に更新
2. 完了（HTMLもライブラリに含まれるため自動更新）
