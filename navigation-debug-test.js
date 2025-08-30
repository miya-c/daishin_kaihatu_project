/**
 * ナビゲーション問題のデバッグテストスクリプト
 * 戻るボタンの動作確認とパス問題の診断
 */

(function() {
    'use strict';

    console.log('🧪 ナビゲーションデバッグテスト開始');
    
    // 現在の環境情報を収集
    const collectEnvironmentInfo = () => {
        const info = {
            currentUrl: window.location.href,
            protocol: window.location.protocol,
            host: window.location.host,
            pathname: window.location.pathname,
            origin: window.location.origin,
            baseURI: document.baseURI,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
        };
        
        console.log('🌍 環境情報:', info);
        return info;
    };
    
    // パス解決テスト
    const testPathResolution = () => {
        console.log('\n=== パス解決テスト ===');
        
        const testPaths = [
            '/property_select.html',                // 絶対パス（ルートから）
            'property_select.html',                 // 相対パス（現在のディレクトリから）
            './property_select.html',               // 明示的相対パス
            '../property_select.html',              // 親ディレクトリから
            `${window.location.origin}/property_select.html`  // 完全URL
        ];
        
        testPaths.forEach((path, index) => {
            try {
                const url = new URL(path, window.location.href);
                console.log(`${index + 1}. ${path} → ${url.href}`);
                
                // パスの存在確認（簡易）
                fetch(url.href, { method: 'HEAD' })
                    .then(response => {
                        console.log(`   ✅ 存在確認: ${response.status} ${response.statusText}`);
                    })
                    .catch(error => {
                        console.log(`   ❌ 存在確認エラー: ${error.message}`);
                    });
                    
            } catch (error) {
                console.log(`${index + 1}. ${path} → ❌ URL構築エラー: ${error.message}`);
            }
        });
    };
    
    // SessionStorage状態確認
    const checkSessionStorage = () => {
        console.log('\n=== SessionStorage状態確認 ===');
        
        const relevantKeys = [
            'navigationSource',
            'navigationTime',
            'selectedPropertyId',
            'selectedPropertyName',
            'forceRefreshRooms',
            'updatedRoomId'
        ];
        
        relevantKeys.forEach(key => {
            const value = sessionStorage.getItem(key);
            console.log(`${key}: ${value || '(未設定)'}`);
        });
    };
    
    // ナビゲーション履歴確認
    const checkNavigationHistory = () => {
        console.log('\n=== ナビゲーション履歴確認 ===');
        console.log(`履歴エントリ数: ${history.length}`);
        console.log(`現在のstate: ${JSON.stringify(history.state)}`);
        console.log(`リファラー: ${document.referrer || '(なし)'}`);
    };
    
    // 戻るボタンのシミュレーション
    const simulateGoBack = () => {
        console.log('\n=== 戻るボタンシミュレーション ===');
        
        if (typeof goBack === 'function') {
            console.log('✅ goBack関数が利用可能');
            
            const testGoBack = () => {
                console.log('🔄 goBack関数をテスト実行...');
                try {
                    // 実際の遷移は行わず、ログのみ確認
                    const originalHref = window.location.href;
                    
                    // window.location.hrefの変更をモック
                    let targetUrl = null;
                    const mockLocation = {
                        get href() { return targetUrl || originalHref; },
                        set href(value) { 
                            targetUrl = value;
                            console.log(`🚀 遷移予定: ${value}`);
                        }
                    };
                    
                    // 一時的にモック
                    const originalLocation = window.location;
                    Object.defineProperty(window, 'location', {
                        value: mockLocation,
                        writable: true,
                        configurable: true
                    });
                    
                    // goBack実行（実際の遷移はしない）
                    goBack();
                    
                    // 元に戻す
                    Object.defineProperty(window, 'location', {
                        value: originalLocation,
                        writable: true,
                        configurable: true
                    });
                    
                    console.log('✅ goBack関数のテスト実行完了');
                    
                } catch (error) {
                    console.error('❌ goBack関数テストエラー:', error);
                }
            };
            
            return testGoBack;
        } else {
            console.log('❌ goBack関数が見つかりません');
            return null;
        }
    };
    
    // ブラウザ互換性チェック
    const checkBrowserCompatibility = () => {
        console.log('\n=== ブラウザ互換性チェック ===');
        
        const features = {
            'URL Constructor': typeof URL !== 'undefined',
            'fetch API': typeof fetch !== 'undefined',
            'Promise': typeof Promise !== 'undefined',
            'SessionStorage': typeof sessionStorage !== 'undefined',
            'LocalStorage': typeof localStorage !== 'undefined',
            'History API': typeof history !== 'undefined'
        };
        
        Object.entries(features).forEach(([feature, available]) => {
            console.log(`${feature}: ${available ? '✅ 利用可能' : '❌ 未対応'}`);
        });
    };
    
    // 統合診断テスト
    const runFullDiagnostics = () => {
        console.log('🚀 ナビゲーション診断テスト開始\n');
        
        const envInfo = collectEnvironmentInfo();
        testPathResolution();
        checkSessionStorage();
        checkNavigationHistory();
        checkBrowserCompatibility();
        const testFunction = simulateGoBack();
        
        console.log('\n=== 診断結果サマリー ===');
        console.log(`現在のページ: ${envInfo.pathname}`);
        console.log(`ベースURL: ${envInfo.origin}`);
        console.log(`goBack関数: ${testFunction ? '✅ 利用可能' : '❌ 未定義'}`);
        
        return {
            environmentInfo: envInfo,
            testFunction: testFunction,
            timestamp: new Date().toISOString()
        };
    };
    
    // 手動テスト用のボタンを追加
    const addDebugButtons = () => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', addDebugButtonsToDOM);
        } else {
            addDebugButtonsToDOM();
        }
    };
    
    const addDebugButtonsToDOM = () => {
        // 既に追加済みかチェック
        if (document.getElementById('navigation-debug-panel')) {
            return;
        }
        
        const debugPanel = document.createElement('div');
        debugPanel.id = 'navigation-debug-panel';
        debugPanel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #263238;
            color: #b0bec5;
            padding: 16px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            max-width: 300px;
        `;
        
        debugPanel.innerHTML = `
            <div style="margin-bottom: 12px; font-weight: bold; color: #4fc3f7;">
                🧪 ナビゲーションデバッグ
            </div>
            <button onclick="window.runNavigationDiagnostics()" 
                    style="background: #1976d2; color: white; border: none; padding: 8px 12px; border-radius: 4px; margin: 4px; cursor: pointer; font-size: 11px;">
                📊 フル診断実行
            </button>
            <button onclick="window.testGoBackFunction()" 
                    style="background: #388e3c; color: white; border: none; padding: 8px 12px; border-radius: 4px; margin: 4px; cursor: pointer; font-size: 11px;">
                🔄 戻るボタンテスト
            </button>
            <button onclick="document.getElementById('navigation-debug-panel').remove()" 
                    style="background: #d32f2f; color: white; border: none; padding: 8px 12px; border-radius: 4px; margin: 4px; cursor: pointer; font-size: 11px;">
                ❌ 閉じる
            </button>
        `;
        
        document.body.appendChild(debugPanel);
    };
    
    // グローバルに公開
    window.runNavigationDiagnostics = runFullDiagnostics;
    window.testGoBackFunction = simulateGoBack();
    window.checkPathResolution = testPathResolution;
    window.collectEnvInfo = collectEnvironmentInfo;
    
    // デバッグパネル自動追加
    addDebugButtons();
    
    // 自動で軽い診断を実行
    setTimeout(() => {
        console.log('🎯 自動診断実行中...');
        const result = runFullDiagnostics();
        console.log('✅ ナビゲーションデバッグテスト完了');
        
        // 簡易レポート
        setTimeout(() => {
            console.log('\n💡 トラブルシューティングのヒント:');
            console.log('1. ブラウザのコンソールでエラーメッセージを確認');
            console.log('2. property_select.html ファイルの存在を確認');
            console.log('3. ブラウザキャッシュをクリア（Ctrl+F5 または Cmd+Shift+R）');
            console.log('4. 右下のデバッグパネルから詳細テストを実行');
        }, 1000);
        
    }, 500);
    
})();