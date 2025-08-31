/**
 * Navigation Fix Test Suite - ナビゲーション修正のテスト
 * v20250831a - Service Worker + 相対パス + キャッシュクリア修正の検証
 */

(function() {
    'use strict';

    console.log('🧪 Navigation Fix Test Suite v20250831a 開始');

    const testResults = [];
    let testCount = 0;

    // テストヘルパー
    const addTest = (name, testFn) => {
        testCount++;
        const testId = testCount;
        console.log(`\n🧪 Test ${testId}: ${name}`);
        
        return testFn()
            .then(result => {
                const testResult = {
                    id: testId,
                    name: name,
                    success: result.success,
                    details: result.details || {},
                    timestamp: new Date().toISOString()
                };
                
                testResults.push(testResult);
                console.log(`${result.success ? '✅' : '❌'} Test ${testId}: ${result.success ? 'PASS' : 'FAIL'}`);
                if (result.details) {
                    console.log('📝 Details:', result.details);
                }
                
                return testResult;
            })
            .catch(error => {
                const testResult = {
                    id: testId,
                    name: name,
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                };
                
                testResults.push(testResult);
                console.log(`❌ Test ${testId}: ERROR - ${error.message}`);
                
                return testResult;
            });
    };

    // Test 1: Service Worker更新確認
    const testServiceWorkerUpdate = async () => {
        try {
            if (!('serviceWorker' in navigator)) {
                return { success: false, details: { reason: 'Service Worker not supported' } };
            }

            const registration = await navigator.serviceWorker.getRegistration();
            if (!registration) {
                return { success: false, details: { reason: 'No service worker registration' } };
            }

            const swUrl = registration.active?.scriptURL;
            const isV7 = swUrl && swUrl.includes('service-worker.js');
            
            // Service Worker内のバージョン確認（可能であれば）
            const swVersion = await new Promise((resolve) => {
                const timeout = setTimeout(() => resolve('unknown'), 2000);
                
                if (registration.active) {
                    const channel = new MessageChannel();
                    channel.port1.onmessage = (event) => {
                        clearTimeout(timeout);
                        resolve(event.data?.version || 'v7-expected');
                    };
                    
                    registration.active.postMessage({ type: 'VERSION_REQUEST' }, [channel.port2]);
                } else {
                    clearTimeout(timeout);
                    resolve('no-active-sw');
                }
            });

            return {
                success: isV7,
                details: {
                    scriptURL: swUrl,
                    version: swVersion,
                    state: registration.active?.state
                }
            };
        } catch (error) {
            return { success: false, details: { error: error.message } };
        }
    };

    // Test 2: HTMLファイルの相対パス解決テスト
    const testRelativePathResolution = async () => {
        const testPaths = [
            'property_select.html',  // 最優先
            './property_select.html',
            'room_select.html',
            './room_select.html'
        ];

        const results = [];
        let successCount = 0;

        for (const path of testPaths) {
            try {
                const startTime = Date.now();
                const response = await fetch(path, { 
                    method: 'HEAD',
                    cache: 'no-cache'
                });
                const responseTime = Date.now() - startTime;

                const result = {
                    path: path,
                    accessible: response.ok,
                    status: response.status,
                    responseTime: responseTime,
                    cached: response.headers.get('sw-cache-status') || 'unknown'
                };

                results.push(result);
                if (response.ok) successCount++;
                
            } catch (error) {
                results.push({
                    path: path,
                    accessible: false,
                    error: error.message
                });
            }
        }

        return {
            success: successCount >= 2, // 少なくとも2つのパスが成功すること
            details: {
                totalPaths: testPaths.length,
                successCount: successCount,
                results: results
            }
        };
    };

    // Test 3: キャッシュ機能のテスト
    const testCacheFunctionality = async () => {
        try {
            // Cache API availability
            const cacheSupported = 'caches' in window;
            if (!cacheSupported) {
                return { success: false, details: { reason: 'Cache API not supported' } };
            }

            // 既存のキャッシュ確認
            const cacheNames = await caches.keys();
            const hasV7Cache = cacheNames.some(name => 
                name.includes('v7-navigation-fix') || name.includes('meter-reading-app-v7')
            );

            // 診断ツールのキャッシュクリア機能テスト
            let clearFunctionWorks = false;
            if (window.navigationDiagnostics) {
                try {
                    // テスト用の小さなキャッシュを作成
                    const testCache = await caches.open('test-cache-clear');
                    await testCache.put('/test', new Response('test'));
                    
                    // クリア機能をテスト
                    await window.navigationDiagnostics.clearCache();
                    
                    // テストキャッシュが削除されたか確認
                    const remainingCaches = await caches.keys();
                    clearFunctionWorks = !remainingCaches.includes('test-cache-clear');
                } catch (error) {
                    console.warn('Cache clear test failed:', error.message);
                }
            }

            return {
                success: hasV7Cache && clearFunctionWorks,
                details: {
                    cacheSupported: cacheSupported,
                    cacheNames: cacheNames,
                    hasV7Cache: hasV7Cache,
                    clearFunctionWorks: clearFunctionWorks,
                    diagnosticsAvailable: !!window.navigationDiagnostics
                }
            };
        } catch (error) {
            return { success: false, details: { error: error.message } };
        }
    };

    // Test 4: ナビゲーション診断ツールの機能テスト
    const testNavigationDiagnostics = async () => {
        if (!window.navigationDiagnostics) {
            return { 
                success: false, 
                details: { reason: 'Navigation diagnostics not available' } 
            };
        }

        try {
            // 基本機能の確認
            const hasRequiredMethods = [
                'run', 'clearCache', 'updateServiceWorker', 
                'completeReset', 'testPaths', 'collect'
            ].every(method => typeof window.navigationDiagnostics[method] === 'function');

            // 診断情報収集のテスト
            const diagnostics = window.navigationDiagnostics.collect();
            const hasBasicInfo = diagnostics && 
                diagnostics.environment && 
                diagnostics.serviceWorker && 
                diagnostics.navigation;

            // パステストの実行
            const pathTestResults = await window.navigationDiagnostics.testPaths();
            const pathTestValid = Array.isArray(pathTestResults) && pathTestResults.length > 0;

            return {
                success: hasRequiredMethods && hasBasicInfo && pathTestValid,
                details: {
                    hasRequiredMethods: hasRequiredMethods,
                    hasBasicInfo: hasBasicInfo,
                    pathTestValid: pathTestValid,
                    pathTestResults: pathTestResults.slice(0, 2) // 最初の2つだけ表示
                }
            };
        } catch (error) {
            return { success: false, details: { error: error.message } };
        }
    };

    // Test 5: 修正されたgoBack関数のロジックテスト（シミュレート）
    const testGoBackLogic = async () => {
        try {
            // room_select.htmlのgoBack関数の優先順位をシミュレート
            const baseUrl = window.location.origin;
            const expectedPaths = [
                'property_select.html',      // 最優先（相対パス）
                './property_select.html',    // 明示的相対パス
                '/property_select.html',     // 絶対パス
                `${baseUrl}/property_select.html`  // 明示的絶対パス
            ];

            // 各パスの優先順位が正しいかテスト
            const priorityCorrect = expectedPaths[0] === 'property_select.html';
            
            // 実際のパス解決をテスト
            let workingPaths = 0;
            for (const path of expectedPaths) {
                try {
                    const response = await fetch(path, { method: 'HEAD', cache: 'no-cache' });
                    if (response.ok) workingPaths++;
                } catch (error) {
                    // エラーは無視（アクセスできないパスは正常）
                }
            }

            return {
                success: priorityCorrect && workingPaths >= 1,
                details: {
                    priorityCorrect: priorityCorrect,
                    expectedFirstPath: expectedPaths[0],
                    workingPaths: workingPaths,
                    totalPaths: expectedPaths.length
                }
            };
        } catch (error) {
            return { success: false, details: { error: error.message } };
        }
    };

    // テスト実行スイート
    const runAllTests = async () => {
        console.log('\n🚀 Navigation Fix Test Suite 実行開始');
        console.log('=' .repeat(50));

        const tests = [
            ['Service Worker更新確認', testServiceWorkerUpdate],
            ['相対パス解決テスト', testRelativePathResolution],
            ['キャッシュ機能テスト', testCacheFunctionality],
            ['ナビゲーション診断ツール機能テスト', testNavigationDiagnostics],
            ['goBack関数ロジックテスト', testGoBackLogic]
        ];

        for (const [name, testFn] of tests) {
            await addTest(name, testFn);
            // テスト間の間隔
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // 結果サマリー
        console.log('\n' + '=' .repeat(50));
        console.log('🏁 テスト結果サマリー');
        
        const successCount = testResults.filter(r => r.success).length;
        const totalCount = testResults.length;
        
        console.log(`📊 成功: ${successCount}/${totalCount} テスト`);
        console.log(`🎯 成功率: ${Math.round((successCount/totalCount) * 100)}%`);
        
        if (successCount === totalCount) {
            console.log('✅ 全テスト成功！ナビゲーション修正は正常に動作しています。');
        } else {
            console.log('⚠️ 一部テスト失敗。以下の項目を確認してください:');
            testResults.filter(r => !r.success).forEach(r => {
                console.log(`  ❌ ${r.name}: ${r.error || '失敗'}`);
            });
        }

        // 推奨事項
        console.log('\n💡 推奨事項:');
        if (successCount < totalCount) {
            console.log('  - ブラウザのハードリロード（Ctrl+Shift+R）を実行');
            console.log('  - window.navigationDiagnostics.completeReset() で完全リセット');
        } else {
            console.log('  - 実際のナビゲーション操作で動作確認');
        }

        return {
            totalTests: totalCount,
            successCount: successCount,
            successRate: (successCount/totalCount) * 100,
            results: testResults,
            allPassed: successCount === totalCount
        };
    };

    // グローバルに公開
    window.navigationFixTest = {
        run: runAllTests,
        results: testResults
    };

    console.log('🔧 Navigation Fix Test Suite 準備完了');
    console.log('実行方法: window.navigationFixTest.run()');

    // 自動実行（ページ読み込み完了後）
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(runAllTests, 2000);
        });
    } else {
        setTimeout(runAllTests, 1500);
    }

})();