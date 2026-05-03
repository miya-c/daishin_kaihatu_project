# Supabase 移行計画書

## 1. 概要

### 現在の構成

| レイヤー | 技術 | 役割 |
|---|---|---|
| バックエンド | Google Apps Script (GAS) | API・ビジネスロジック |
| データストア | Google Spreadsheet | データ永続化 |
| 管理画面 | Alpine.js (CSP) + Cloudflare配信 | 物件・部屋・検針データ管理 |
| PWA | Svelte 5 + Vite | 検針員用検針アプリ |
| 認証 | ADMIN_TOKEN（固定文字列） | 管理画面・PWA認証 |
| 配布モデル | 各社のGoogleアカウントにGASを個別設定 | 物理分離 |

### 移行先構成

| レイヤー | 技術 | 役割 |
|---|---|---|
| バックエンド | Supabase Edge Functions + RPC | API・ビジネスロジック |
| データストア | PostgreSQL (Supabase管理) | データ永続化 |
| 管理画面 | Alpine.js (CSP) + Cloudflare配信 | **変更なし**（API通信層のみ置換） |
| PWA | Svelte 5 + Vite | **変更なし**（API通信層のみ置換） |
| 認証 | Supabase Auth (JWT + RLS) | 役割ベースアクセス制御 |
| 配布モデル | 各社のSupabaseアカウントに個別プロジェクト | 物理分離（現状と同じ） |

### 移行判定

- **技術的実現性**: 100%可能。ブロッカーなし
- **コスト**: 各社個別アカウント → 全社無料枠で運用可能
- **最大メリット**: トランザクション安全性・CORS問題解消・タイムアウト制限撤廃

---

## 2. 各社個別アカウント方式

### アーキテクチャ

```
A社のSupabaseアカウント           B社のSupabaseアカウント
┌─────────────────────┐          ┌─────────────────────┐
│ プロジェクト         │          │ プロジェクト         │
│ ├── PostgreSQL DB    │          │ ├── PostgreSQL DB    │
│ ├── Edge Functions   │          │ ├── Edge Functions   │
│ ├── Auth             │          │ ├── Auth             │
│ └── Storage          │          │ └── Storage          │
│                     │          │                     │
│ 無料枠: 500MB       │          │ 無料枠: 500MB       │
└─────────────────────┘          └─────────────────────┘
        ↑                                ↑
        │ API通信                          │ API通信
        │                                │
┌────────────────┐               ┌────────────────┐
│ A社管理画面      │               │ B社管理画面      │
│ A社PWA          │               │ B社PWA          │
└────────────────┘               └────────────────┘
```

### コスト

| 社数 | 月額コスト | 備考 |
|---|---|---|
| 1〜N社 | **¥0** | 各社が独立した無料枠（500MB DB / 5GB帯域）を使用 |

### データ容量見積もり（10年運用）

| 規模 | 10年間DB使用量 | 無料枠に収まるか |
|---|---|---|
| 100部屋 | ~4MB | ✅ 余裕 |
| 500部屋 | ~20MB | ✅ 余裕 |
| 1,000部屋 | ~40MB | ✅ 余裕 |
| 5,000部屋 | ~200MB | ✅ 十分 |
| 10,000部屋 | ~400MB | ⚠️ 限界付近 |

---

## 3. 現行GAS配布用ファイル構成

### 必須ファイル（配布用）

backend/水道検針ライブラリ/ 内の全ファイル:

| ファイル | 役割 | 配布必須 |
|---|---|---|
| `web_app_api.js` | PWA用APIエントリポイント（doGet/doPost） | ✅ |
| `web_app_admin_api.js` | 管理画面用APIディスパッチ | ✅ |
| `api_data_functions.js` | コアデータAPI（物件・部屋・検針） | ✅ |
| `property_management.js` | 物件・部屋CRUD操作 | ✅ |
| `data_management.js` | 月次処理・アーカイブ・undo | ✅ |
| `data_indexes.js` | インデックス管理 | ✅ |
| `data_formatting.js` | ID・データフォーマット | ✅ |
| `data_cleanup.js` | データクリーンアップ | ✅ |
| `data_validation.js` | データ検証 | ✅ |
| `batch_processing.js` | バッチバリデーション | ✅ |
| `setup_validation.js` | セットアップ検証 | ✅ |
| `master_sheet_templates.js` | テンプレート作成 | ✅ |
| `system_diagnostics.js` | システム診断 | ✅ |
| `utilities.js` | ユーティリティ（ロック・キャッシュ・日付等） | ✅ |
| `spreadsheet_config.js` | スプレッドシート設定管理 | ✅ |
| `Config.js` | ライブラリ設定取得 | ✅ |
| `main.js` | ライブラリ情報・バージョン | ✅ |
| `dialog_functions.js` | GAS UIダイアログ | ✅ |
| `水道検針アプリ.js` | GAS メニュー・セットアップウィザード | ✅ |
| `appsscript.json` | GAS マニフェスト | ✅ |
| `admin.html` | 管理画面（ビルド済みHTML） | ✅ |

### GAS設定ファイル

| ファイル | 役割 | 備考 |
|---|---|---|
| `.clasp.json` | clasp設定（ローカル開発用） | 配布不要 |
| `.claspignore` | claspプッシュ除外設定 | 配布不要 |

### 管理画面ソース（ビルド用）

| ディレクトリ | 役割 |
|---|---|
| `admin-ui/` | Alpine.js管理画面のソースコード |
| `admin-ui/src/components/*.js` | 各コンポーネント（JS） |
| `admin-ui/index.html` | エントリHTML |
| `admin-ui/mock/` | ローカル開発用モック |

ビルドコマンド:
```bash
cd admin-ui && npm run build && cp dist/index.html ../backend/水道検針ライブラリ/admin.html
```

---

## 4. GAS依存関係 → Supabase対応マップ

### GAS API対応

| GAS API | 用途 | Supabase対応 | 移行複雑度 |
|---|---|---|---|
| `SpreadsheetApp` | 全データ操作 | PostgreSQL + Supabase Client | Medium |
| `LockService` | 排他制御 | PostgreSQL トランザクション（ACID） | Easy（不要化） |
| `PropertiesService` | 設定・API_KEY | Edge Functions Secrets | Easy |
| `CacheService` | キャッシュ | 不要（PostgreSQLが高速） | Easy（不要化） |
| `ContentService` | JSON レスポンス | Supabase REST API 標準 | Easy |
| `Utilities` | 日付・ハッシュ | 標準JS / Edge Functions | Easy |
| `SpreadsheetApp.getUi()` | UIダイアログ | 管理画面Webアプリが代替済み | 移行不要 |
| `doGet/doPost` | Web Apps エントリ | Edge Functions / REST | Easy |

### 移行不要なファイル（約40%）

| ファイル | 関数数 | 理由 |
|---|---|---|
| `dialog_functions.js` | 9 | GAS UI → 管理画面が代替済み |
| `水道検針アプリ.js` | 30+ | GAS メニュー・ウィザード → 管理画面が代替済み |
| `data_indexes.js` | 5 | メモリインデックス → PostgreSQLインデックスが代替 |
| `CacheService` 関連（utilities.js内） | ~5 | GAS キャッシュ → 不要 |
| `LockService` 関連（utilities.js内） | ~3 | GAS ロック → トランザクションが代替 |

---

## 5. Supabase機能対応（10項目）

| # | GAS機能 | Supabase対応 | 状態 |
|---|---|---|---|
| 1 | 原子マルチテーブル更新 | PostgreSQL トランザクション + RPC | ✅ ネイティブ |
| 2 | サーバーサイドディスパッチ | Edge Functions | ✅ ネイティブ |
| 3 | 設定・トークン保存 | Edge Functions Secrets / 環境変数 | ✅ ネイティブ |
| 4 | 定期実行（トリガー） | pg_cron 拡張 | ✅ ネイティブ |
| 5 | ファイル生成（PDF/CSV） | Edge Functions + Storage | ✅ ネイティブ |
| 6 | CORS | Supabase Client標準対応 | ✅ 改善（問題解消） |
| 7 | レート制限 | Auth標準 + Edge Functions | ✅ 対応可 |
| 8 | データ一括操作 | COPY / CSV import / API | ✅ ネイティブ |
| 9 | リアルタイム | Supabase Realtime | ✅ ネイティブ |
| 10 | マルチアプリ接続 | 同一バックエンドで管理UI+PWA | ✅ ネイティブ |

---

## 6. アーカイブ方式

### 現状（GAS）

```
inspection_data（メインシート）→ 常に現在月のみ（行数固定）
                         │
                         │ 月次処理でコピー
                         ↓
検針データ_2025年（年度アーカイブシート）  ← 年ごとに蓄積
検針データ_2026年（年度アーカイブシート）
...

_monthly_backup（一時バックアップ）     ← undo用、次回月次処理まで保持
```

### Supabase版

```
inspection_data テーブル         → 常に現在月のみ（行数固定）
inspection_archive テーブル      → 1テーブルに全履歴蓄積（月カラムで絞り込み）
monthly_backup テーブル          → 一時スナップショット（undo用）
```

年度ごとのシート分離不要。PostgreSQLなら1テーブルに蓄積し `WHERE month = '2026-04'` で抽出。

---

## 7. 移行フェーズ計画

### Phase 0: 準備（1週間）

- [ ] Supabaseプロジェクト作成（テスト用1社）
- [ ] PostgreSQLスキーマ定義（マイグレーションファイル作成）
- [ ] データ移行スクリプト作成（Spreadsheet → PostgreSQL）
- [ ] 開発環境セットアップ（Supabase CLI ローカル開発）

### Phase 1: 管理画面バックエンド移行（2〜3週間）

- [ ] スキーマ定義（property_master, room_master, inspection_data, inspection_archive, monthly_backup）
- [ ] RPC関数実装（月次処理、物件編集等の複雑ロジック）
- [ ] 管理画面フロントエンド: `callAdminAPI` → Supabase Client 置換
- [ ] 認証: ADMIN_TOKEN → Supabase Auth
- [ ] 並行稼働テスト（GAS残したままSupabase検証）

### Phase 2: PWA通信層移行（1〜2週間）

- [ ] `gasClient.ts` → `supabaseClient.ts` 実装
- [ ] `apiAdapter.ts`（環境変数でGAS/Supabase切替）
- [ ] オフラインキュー: Supabase用送信処理追加
- [ ] Service Worker: Supabase URL対応
- [ ] `offlineQueue.ts` → Supabase用 sender 追加

### Phase 3: 切替・運用（1週間）

- [ ] 全社Supabaseプロジェクト作成
- [ ] データ移行実行（各社のSpreadsheet → PostgreSQL）
- [ ] 管理画面・PWAの接続先切替
- [ ] 動作確認・テスト
- [ ] GASコードアーカイブ

---

## 8. Supabaseスキーマ設計（概要）

### メインテーブル

```sql
-- 物件マスタ
CREATE TABLE property_master (
  id VARCHAR(10) PRIMARY KEY,       -- 物件ID（P000001）
  name VARCHAR(100) NOT NULL,        -- 物件名
  notes TEXT,                        -- 備考
  inspection_completed_date DATE,    -- 検針完了日
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 部屋マスタ
CREATE TABLE room_master (
  id VARCHAR(20) PRIMARY KEY,        -- 部屋ID（P000001-R001）
  property_id VARCHAR(10) NOT NULL REFERENCES property_master(id),
  name VARCHAR(100) NOT NULL,        -- 部屋名
  room_status VARCHAR(20) DEFAULT 'normal',  -- 部屋ステータス
  notes TEXT,                        -- 備考
  inspection_skip BOOLEAN DEFAULT FALSE,
  billing_skip BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 検針データ（現在月のみ）
CREATE TABLE inspection_data (
  id SERIAL PRIMARY KEY,
  property_id VARCHAR(10) NOT NULL,
  property_name VARCHAR(100),
  room_id VARCHAR(20) NOT NULL,
  room_name VARCHAR(100),
  current_reading INTEGER,
  prev_reading INTEGER,
  prev2_reading INTEGER,
  prev3_reading INTEGER,
  usage_amount INTEGER,
  inspection_date TIMESTAMPTZ,
  warning_flag VARCHAR(20),
  standard_deviation FLOAT,
  room_status VARCHAR(20) DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, room_id)
);

-- 検針データアーカイブ（全履歴）
CREATE TABLE inspection_archive (
  id SERIAL PRIMARY KEY,
  month VARCHAR(7) NOT NULL,          -- 'YYYY-MM'
  property_id VARCHAR(10) NOT NULL,
  property_name VARCHAR(100),
  room_id VARCHAR(20) NOT NULL,
  room_name VARCHAR(100),
  current_reading INTEGER,
  prev_reading INTEGER,
  prev2_reading INTEGER,
  prev3_reading INTEGER,
  usage_amount INTEGER,
  inspection_date TIMESTAMPTZ,
  warning_flag VARCHAR(20),
  standard_deviation FLOAT,
  room_status VARCHAR(20) DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 月次バックアップ（undo用、一時）
CREATE TABLE monthly_backup (
  id SERIAL PRIMARY KEY,
  executed_month VARCHAR(7) NOT NULL,  -- 'YYYY-MM'
  snapshot JSONB NOT NULL,             -- inspection_data + property_master のスナップショット
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### インデックス

```sql
CREATE INDEX idx_room_master_property ON room_master(property_id);
CREATE INDEX idx_inspection_data_property ON inspection_data(property_id);
CREATE INDEX idx_inspection_archive_month ON inspection_archive(month);
CREATE INDEX idx_inspection_archive_property ON inspection_archive(property_id, month);
```

---

## 9. 前提・制約事項

- フロントエンドはCloudflareを使用してビルド及び配信
- Alpine.js CSPビルド制約に変更なし（Supabase ClientはCSP互換）
- Phase 1+2 は段階的移行（並行稼働期間あり）
- 各社のSupabaseアカウント作成は各社または開発者がサポート
- 現状のGAS版は移行完了までアーカイブ保持
