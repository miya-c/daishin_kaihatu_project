// Cache Diagnostic Tool for ERR_FAILED Investigation
// Version: 20250831f - room_select.html access issue diagnosis

class CacheDiagnostic {
    constructor() {
        this.testResults = [];
    }

    // メイン診断実行
    async runFullDiagnostic() {
        console.log('🔬 Cache Diagnostic Tool v20250831f 開始');
        console.log('📊 ERR_FAILED問題の診断を実行します...');
        
        this.testResults = [];
        
        // Test 1: Service Worker状態確認
        await this.testServiceWorkerState();
        
        // Test 2: Cache API状態確認
        await this.testCacheAPIState();
        
        // Test 3: ファイルアクセステスト
        await this.testFileAccess();
        
        // Test 4: Network接続テスト
        await this.testNetworkConnectivity();
        
        // Test 5: ブラウザ情報収集
        await this.collectBrowserInfo();
        
        // 診断結果レポート生成
        this.generateDiagnosticReport();
        
        return this.testResults;
    }

    // Service Worker状態テスト
    async testServiceWorkerState() {
        console.log('🔧 Test 1: Service Worker状態確認');
        
        try {
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.getRegistration('/');
                const controller = navigator.serviceWorker.controller;
                
                const swState = {
                    isSupported: true,
                    hasRegistration: !!registration,
                    hasController: !!controller,
                    registrationState: registration ? registration.active?.state : 'none',
                    controllerUrl: controller ? controller.scriptURL : 'none',
                    scope: registration ? registration.scope : 'none'
                };
                
                this.testResults.push({
                    test: 'ServiceWorker状態',
                    status: swState.hasRegistration && swState.hasController ? 'OK' : 'WARNING',
                    details: swState
                });
                
                console.log('✅ Service Worker状態:', swState);
            } else {
                this.testResults.push({
                    test: 'ServiceWorker状態',
                    status: 'ERROR',
                    details: { error: 'Service Worker not supported' }
                });
            }
        } catch (error) {
            this.testResults.push({
                test: 'ServiceWorker状態',
                status: 'ERROR',
                details: { error: error.message }
            });
        }
    }

    // Cache API状態テスト
    async testCacheAPIState() {
        console.log('🗄️ Test 2: Cache API状態確認');
        
        try {
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                const cacheDetails = [];
                
                for (const cacheName of cacheNames) {
                    const cache = await caches.open(cacheName);
                    const keys = await cache.keys();
                    
                    // room_select.htmlが含まれているかチェック
                    const hasRoomSelect = keys.some(request => 
                        request.url.includes('room_select.html')
                    );
                    
                    cacheDetails.push({
                        name: cacheName,
                        itemCount: keys.length,
                        hasRoomSelect: hasRoomSelect,
                        isLegacy: cacheName.includes('v11') || cacheName.includes('v10')
                    });
                }
                
                this.testResults.push({
                    test: 'CacheAPI状態',
                    status: 'OK',
                    details: {
                        totalCaches: cacheNames.length,
                        caches: cacheDetails
                    }
                });
                
                console.log('✅ Cache API状態:', cacheDetails);
            } else {
                this.testResults.push({
                    test: 'CacheAPI状態',
                    status: 'ERROR',
                    details: { error: 'Cache API not supported' }
                });
            }
        } catch (error) {
            this.testResults.push({
                test: 'CacheAPI状態',
                status: 'ERROR',
                details: { error: error.message }
            });
        }
    }

    // ファイルアクセステスト
    async testFileAccess() {
        console.log('📁 Test 3: ファイルアクセステスト');
        
        const testPaths = [
            '/room_select.html',
            './room_select.html',
            'room_select.html',
            '/room_select.html?propertyId=P000001'
        ];
        
        const accessResults = [];
        
        for (const path of testPaths) {
            try {
                const startTime = Date.now();
                const response = await fetch(path, { 
                    method: 'HEAD',
                    cache: 'no-cache'
                });
                const endTime = Date.now();
                
                accessResults.push({
                    path: path,
                    status: response.status,
                    statusText: response.statusText,
                    ok: response.ok,
                    responseTime: endTime - startTime,
                    headers: Object.fromEntries(response.headers.entries())
                });
                
                console.log(`✅ ${path}: ${response.status} (${endTime - startTime}ms)`);
            } catch (error) {
                accessResults.push({
                    path: path,
                    status: 'FETCH_ERROR',
                    error: error.message
                });
                
                console.log(`❌ ${path}: ${error.message}`);
            }
        }
        
        this.testResults.push({
            test: 'ファイルアクセス',
            status: accessResults.some(r => r.ok) ? 'PARTIAL' : 'ERROR',
            details: accessResults
        });
    }

    // ネットワーク接続テスト
    async testNetworkConnectivity() {
        console.log('🌐 Test 4: ネットワーク接続テスト');
        
        try {
            const testUrls = [
                'https://daishin-kaihatu-project.pages.dev',
                'https://daishin-kaihatu-project.pages.dev/index.html',
                'https://daishin-kaihatu-project.pages.dev/property_select.html'
            ];
            
            const connectivityResults = [];
            
            for (const url of testUrls) {
                try {
                    const startTime = Date.now();
                    const response = await fetch(url, { 
                        method: 'HEAD',
                        cache: 'no-cache'
                    });
                    const endTime = Date.now();
                    
                    connectivityResults.push({
                        url: url,
                        status: response.status,
                        ok: response.ok,
                        responseTime: endTime - startTime
                    });
                } catch (error) {
                    connectivityResults.push({
                        url: url,
                        error: error.message
                    });
                }
            }
            
            this.testResults.push({
                test: 'ネットワーク接続',
                status: connectivityResults.some(r => r.ok) ? 'OK' : 'ERROR',
                details: connectivityResults
            });
            
        } catch (error) {
            this.testResults.push({
                test: 'ネットワーク接続',
                status: 'ERROR',
                details: { error: error.message }
            });
        }
    }

    // ブラウザ情報収集
    async collectBrowserInfo() {
        console.log('📱 Test 5: ブラウザ情報収集');
        
        const browserInfo = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            url: window.location.href,
            origin: window.location.origin,
            referrer: document.referrer,
            timestamp: new Date().toISOString()
        };
        
        // Performance timing情報（利用可能な場合）
        if (performance.timing) {
            browserInfo.performance = {
                navigationStart: performance.timing.navigationStart,
                loadEventEnd: performance.timing.loadEventEnd,
                domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
            };
        }
        
        this.testResults.push({
            test: 'ブラウザ情報',
            status: 'INFO',
            details: browserInfo
        });
        
        console.log('📊 ブラウザ情報:', browserInfo);
    }

    // 診断結果レポート生成
    generateDiagnosticReport() {
        console.log('\n📋 === CACHE DIAGNOSTIC REPORT ===');
        console.log('🕒 実行時間:', new Date().toLocaleString());
        console.log('📊 総テスト数:', this.testResults.length);
        
        const summary = {
            ok: this.testResults.filter(r => r.status === 'OK').length,
            warning: this.testResults.filter(r => r.status === 'WARNING').length,
            partial: this.testResults.filter(r => r.status === 'PARTIAL').length,
            error: this.testResults.filter(r => r.status === 'ERROR').length,
            info: this.testResults.filter(r => r.status === 'INFO').length
        };
        
        console.log('📈 結果サマリー:', summary);
        
        // 問題の特定と推奨対応
        this.provideTroubleshootingRecommendations(summary);
        
        // 詳細結果をConsoleに表示
        this.testResults.forEach((result, index) => {
            console.log(`\n${index + 1}. ${result.test}: ${result.status}`);
            if (result.details) {
                console.log('   詳細:', result.details);
            }
        });
        
        console.log('\n=== END DIAGNOSTIC REPORT ===\n');
    }

    // トラブルシューティング推奨事項
    provideTroubleshootingRecommendations(summary) {
        console.log('\n🔧 === 推奨対応 ===');
        
        if (summary.error > 0) {
            console.log('❌ エラーが検出されました:');
            
            const swError = this.testResults.find(r => r.test === 'ServiceWorker状態' && r.status === 'ERROR');
            if (swError) {
                console.log('  - Service Worker登録に問題があります');
                console.log('  - 推奨: ブラウザの開発者ツールでService Workerタブを確認');
            }
            
            const fileError = this.testResults.find(r => r.test === 'ファイルアクセス' && r.status === 'ERROR');
            if (fileError) {
                console.log('  - room_select.htmlへのアクセスに問題があります');
                console.log('  - 推奨: Cloudflare Pagesの配信状態を確認');
            }
            
            const networkError = this.testResults.find(r => r.test === 'ネットワーク接続' && r.status === 'ERROR');
            if (networkError) {
                console.log('  - ネットワーク接続に問題があります');
                console.log('  - 推奨: インターネット接続を確認');
            }
        }
        
        if (summary.warning > 0) {
            console.log('⚠️ 警告が検出されました:');
            console.log('  - Service Workerの状態を確認してください');
        }
        
        if (summary.ok === this.testResults.filter(r => r.status !== 'INFO').length) {
            console.log('✅ 全てのテストが正常に完了しました');
        }
        
        console.log('\n🛠️ 一般的な対応方法:');
        console.log('  1. ブラウザのキャッシュクリア (Ctrl+Shift+Delete)');
        console.log('  2. ハードリロード (Ctrl+Shift+R)');
        console.log('  3. Service Workerの手動更新');
        console.log('  4. 異なるブラウザでのテスト');
        console.log('=== END 推奨対応 ===');
    }

    // キャッシュクリア機能
    async clearAllCaches() {
        console.log('🧹 全キャッシュクリア開始...');
        
        try {
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                console.log('🗑️ 削除対象キャッシュ:', cacheNames);
                
                const deletePromises = cacheNames.map(cacheName => caches.delete(cacheName));
                await Promise.all(deletePromises);
                
                console.log('✅ 全キャッシュ削除完了');
                return true;
            } else {
                console.log('❌ Cache API not supported');
                return false;
            }
        } catch (error) {
            console.error('❌ キャッシュクリアエラー:', error);
            return false;
        }
    }

    // Service Worker強制更新
    async forceServiceWorkerUpdate() {
        console.log('🔄 Service Worker強制更新開始...');
        
        try {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                
                for (const registration of registrations) {
                    console.log('🔄 更新中:', registration.scope);
                    await registration.update();
                    
                    // 新しいService Workerがアクティブになるまで待機
                    if (registration.waiting) {
                        registration.waiting.postMessage({ action: 'skipWaiting' });
                    }
                }
                
                console.log('✅ Service Worker更新完了');
                return true;
            } else {
                console.log('❌ Service Worker not supported');
                return false;
            }
        } catch (error) {
            console.error('❌ Service Worker更新エラー:', error);
            return false;
        }
    }
}

// グローバルに利用可能にする
window.CacheDiagnostic = CacheDiagnostic;

// 簡単な実行用関数
window.runCacheDiagnostic = async function() {
    const diagnostic = new CacheDiagnostic();
    return await diagnostic.runFullDiagnostic();
};

window.clearAllCaches = async function() {
    const diagnostic = new CacheDiagnostic();
    return await diagnostic.clearAllCaches();
};

window.forceServiceWorkerUpdate = async function() {
    const diagnostic = new CacheDiagnostic();
    return await diagnostic.forceServiceWorkerUpdate();
};

console.log('🔬 Cache Diagnostic Tool loaded - Usage:');
console.log('  - runCacheDiagnostic() : 完全診断実行');
console.log('  - clearAllCaches() : 全キャッシュクリア');
console.log('  - forceServiceWorkerUpdate() : Service Worker強制更新');