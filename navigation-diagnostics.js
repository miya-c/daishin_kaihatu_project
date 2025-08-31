/**
 * Navigation Diagnostics Tool - キャッシュ＆ルーティング問題診断
 * Cloudflare Pages + Service Worker + 相対パス対応
 */

(function() {
    'use strict';

    console.log('🔧 Navigation Diagnostics Tool v20250831a 開始');

    // 診断情報収集
    const collectDiagnostics = () => {
        const diagnostics = {
            timestamp: new Date().toISOString(),
            environment: {
                url: window.location.href,
                origin: window.location.origin,
                pathname: window.location.pathname,
                search: window.location.search,
                hash: window.location.hash,
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language
            },
            serviceWorker: {
                supported: 'serviceWorker' in navigator,
                controller: !!navigator.serviceWorker?.controller,
                controllerUrl: navigator.serviceWorker?.controller?.scriptURL || null,
                state: navigator.serviceWorker?.controller?.state || 'none'
            },
            cache: {},
            storage: {
                localStorage: {},
                sessionStorage: {}
            },
            navigation: {
                possiblePaths: [
                    'property_select.html',
                    './property_select.html', 
                    '/property_select.html',
                    `${window.location.origin}/property_select.html`
                ]
            }
        };

        // LocalStorage情報
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.includes('room') || key.includes('property') || key.includes('cache'))) {
                    diagnostics.storage.localStorage[key] = localStorage.getItem(key)?.substring(0, 100) + '...';
                }
            }
        } catch (error) {
            diagnostics.storage.localStorage.error = error.message;
        }

        // SessionStorage情報
        try {
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key) {
                    diagnostics.storage.sessionStorage[key] = sessionStorage.getItem(key)?.substring(0, 100) + '...';
                }
            }
        } catch (error) {
            diagnostics.storage.sessionStorage.error = error.message;
        }

        return diagnostics;
    };

    // キャッシュ統計情報取得
    const getCacheStats = async () => {
        if (!('caches' in window)) return { supported: false };

        try {
            const cacheNames = await caches.keys();
            const stats = {
                supported: true,
                cacheNames: cacheNames,
                details: {}
            };

            for (const cacheName of cacheNames) {
                const cache = await caches.open(cacheName);
                const requests = await cache.keys();
                stats.details[cacheName] = {
                    itemCount: requests.length,
                    items: requests.slice(0, 10).map(req => ({
                        url: req.url,
                        method: req.method
                    }))
                };
            }

            return stats;
        } catch (error) {
            return { supported: true, error: error.message };
        }
    };

    // パス解決テスト
    const testPathResolution = async () => {
        const results = [];
        const testPaths = [
            'property_select.html',
            './property_select.html',
            '/property_select.html',
            `${window.location.origin}/property_select.html`
        ];

        for (const path of testPaths) {
            try {
                console.log(`🧪 パステスト: ${path}`);
                
                // fetch でアクセス可能性をテスト
                const startTime = Date.now();
                const response = await fetch(path, { 
                    method: 'HEAD',
                    cache: 'no-cache'
                });
                const responseTime = Date.now() - startTime;

                results.push({
                    path: path,
                    accessible: response.ok,
                    status: response.status,
                    statusText: response.statusText,
                    responseTime: responseTime,
                    headers: {
                        'content-type': response.headers.get('content-type'),
                        'cache-control': response.headers.get('cache-control'),
                        'cf-cache-status': response.headers.get('cf-cache-status')
                    }
                });

                console.log(`${response.ok ? '✅' : '❌'} ${path}: ${response.status} (${responseTime}ms)`);
            } catch (error) {
                results.push({
                    path: path,
                    accessible: false,
                    error: error.message,
                    responseTime: null
                });
                console.log(`❌ ${path}: ${error.message}`);
            }
        }

        return results;
    };

    // Service Worker通信テスト
    const testServiceWorkerCommunication = async () => {
        if (!navigator.serviceWorker?.controller) {
            return { available: false, reason: 'No service worker controller' };
        }

        try {
            return new Promise((resolve) => {
                const channel = new MessageChannel();
                const timeout = setTimeout(() => {
                    resolve({ available: false, reason: 'Timeout' });
                }, 3000);

                channel.port1.onmessage = (event) => {
                    clearTimeout(timeout);
                    resolve({ 
                        available: true, 
                        response: event.data,
                        controller: navigator.serviceWorker.controller.scriptURL
                    });
                };

                navigator.serviceWorker.controller.postMessage({
                    type: 'PERFORMANCE_STATS_REQUEST'
                }, [channel.port2]);
            });
        } catch (error) {
            return { available: false, reason: error.message };
        }
    };

    // キャッシュクリア機能
    const clearAllCaches = async () => {
        console.log('🧹 全キャッシュクリア開始');
        
        try {
            // Cache API
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                console.log('削除対象キャッシュ:', cacheNames);
                
                await Promise.all(
                    cacheNames.map(cacheName => {
                        console.log(`🗑️ キャッシュ削除: ${cacheName}`);
                        return caches.delete(cacheName);
                    })
                );
            }

            // LocalStorage
            const localKeys = Object.keys(localStorage).filter(key => 
                key.includes('room') || key.includes('property') || key.includes('cache')
            );
            localKeys.forEach(key => {
                localStorage.removeItem(key);
                console.log(`🗑️ LocalStorage削除: ${key}`);
            });

            // SessionStorage
            sessionStorage.clear();
            console.log('🗑️ SessionStorage全削除');

            console.log('✅ 全キャッシュクリア完了');
            return true;
        } catch (error) {
            console.error('❌ キャッシュクリアエラー:', error);
            return false;
        }
    };

    // Service Worker更新強制
    const forceServiceWorkerUpdate = async () => {
        if (!('serviceWorker' in navigator)) {
            return { success: false, reason: 'Service Worker not supported' };
        }

        try {
            console.log('🔄 Service Worker更新開始');
            
            const registration = await navigator.serviceWorker.getRegistration();
            if (!registration) {
                return { success: false, reason: 'No service worker registration found' };
            }

            console.log('現在のSW:', registration.active?.scriptURL);
            
            // 更新チェック
            await registration.update();
            
            // 待機中のワーカーがあればアクティベート
            if (registration.waiting) {
                console.log('待機中のSWをアクティベート');
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                
                // アクティベート完了を待つ
                await new Promise((resolve) => {
                    const checkUpdate = () => {
                        if (registration.active?.scriptURL !== registration.waiting?.scriptURL) {
                            resolve();
                        } else {
                            setTimeout(checkUpdate, 100);
                        }
                    };
                    checkUpdate();
                });
            }

            console.log('✅ Service Worker更新完了');
            return { success: true, registration: registration };
        } catch (error) {
            console.error('❌ Service Worker更新エラー:', error);
            return { success: false, error: error.message };
        }
    };

    // 完全リセット（究極の解決策）
    const performCompleteReset = async () => {
        console.log('🚨 完全リセット実行');
        
        const results = {
            cacheCleared: false,
            serviceWorkerUpdated: false,
            storageCleared: false
        };

        // キャッシュクリア
        results.cacheCleared = await clearAllCaches();

        // Service Worker更新
        const swResult = await forceServiceWorkerUpdate();
        results.serviceWorkerUpdated = swResult.success;

        // ストレージクリア
        try {
            localStorage.clear();
            sessionStorage.clear();
            results.storageCleared = true;
        } catch (error) {
            console.error('ストレージクリアエラー:', error);
        }

        console.log('🚨 完全リセット結果:', results);
        
        // ページリロード推奨
        if (results.cacheCleared && results.serviceWorkerUpdated) {
            console.log('✅ リセット成功 - ページを再読み込みしてください');
            if (confirm('完全リセットが完了しました。ページを再読み込みしますか？')) {
                window.location.reload(true);
            }
        }

        return results;
    };

    // 診断実行
    const runFullDiagnostics = async () => {
        console.log('🔬 完全診断開始');
        
        const results = {
            basic: collectDiagnostics(),
            cache: await getCacheStats(),
            pathResolution: await testPathResolution(),
            serviceWorker: await testServiceWorkerCommunication()
        };

        // 結果表示
        console.group('📊 診断結果');
        console.log('基本情報:', results.basic);
        console.log('キャッシュ統計:', results.cache);
        console.log('パス解決テスト:', results.pathResolution);
        console.log('Service Worker通信:', results.serviceWorker);
        console.groupEnd();

        // 問題の検出と推奨事項
        const issues = [];
        const recommendations = [];

        if (!results.serviceWorker.available) {
            issues.push('Service Workerと通信できません');
            recommendations.push('Service Workerを再登録してください');
        }

        const accessiblePaths = results.pathResolution.filter(r => r.accessible);
        if (accessiblePaths.length === 0) {
            issues.push('どのパスでもファイルにアクセスできません');
            recommendations.push('ネットワーク接続とサーバー設定を確認してください');
        } else if (accessiblePaths.length < results.pathResolution.length) {
            issues.push('一部のパスでアクセスできません');
            recommendations.push('相対パス優先の設定を確認してください');
        }

        if (issues.length > 0) {
            console.group('⚠️ 検出された問題');
            issues.forEach(issue => console.warn(issue));
            console.groupEnd();

            console.group('💡 推奨事項');
            recommendations.forEach(rec => console.info(rec));
            console.groupEnd();
        } else {
            console.log('✅ 問題は検出されませんでした');
        }

        return results;
    };

    // グローバルに公開
    window.navigationDiagnostics = {
        run: runFullDiagnostics,
        clearCache: clearAllCaches,
        updateServiceWorker: forceServiceWorkerUpdate,
        completeReset: performCompleteReset,
        testPaths: testPathResolution,
        collect: collectDiagnostics
    };

    // 自動実行（初回読み込み時）
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(runFullDiagnostics, 1000);
        });
    } else {
        setTimeout(runFullDiagnostics, 500);
    }

    console.log('🔧 Navigation Diagnostics Tool 準備完了');
    console.log('使用方法:');
    console.log('  - window.navigationDiagnostics.run() : 完全診断実行');
    console.log('  - window.navigationDiagnostics.clearCache() : キャッシュクリア');
    console.log('  - window.navigationDiagnostics.completeReset() : 完全リセット');

})();