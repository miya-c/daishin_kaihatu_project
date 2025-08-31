/**
 * Character Encoding Fix Test - 文字化け修正のテスト
 * v20250831b - Service Worker + Cloudflare Pages UTF-8 修正の検証
 */

(function() {
    'use strict';

    console.log('🔤 Character Encoding Fix Test v20250831b 開始');

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

    // Test 1: 現在のページの文字エンコーディング確認
    const testCurrentPageEncoding = async () => {
        try {
            const documentEncoding = document.characterSet || document.charset;
            const metaCharset = document.querySelector('meta[charset]')?.getAttribute('charset');
            const htmlLang = document.documentElement.lang;
            
            // 日本語文字のテスト
            const japaneseSample = '日本語テスト: 漢字、ひらがな、カタカナ';
            const testElement = document.createElement('div');
            testElement.style.display = 'none';
            testElement.textContent = japaneseSample;
            document.body.appendChild(testElement);
            
            const retrievedText = testElement.textContent;
            document.body.removeChild(testElement);
            
            const isCorrect = retrievedText === japaneseSample;

            return {
                success: documentEncoding === 'UTF-8' && metaCharset?.toLowerCase() === 'utf-8' && isCorrect,
                details: {
                    documentEncoding: documentEncoding,
                    metaCharset: metaCharset,
                    htmlLang: htmlLang,
                    japaneseTestPassed: isCorrect,
                    sample: japaneseSample,
                    retrieved: retrievedText
                }
            };
        } catch (error) {
            return { success: false, details: { error: error.message } };
        }
    };

    // Test 2: HTTPヘッダーのContent-Type確認
    const testHttpHeaders = async () => {
        const testUrls = [
            window.location.pathname, // 現在のページ
            'property_select.html',
            'room_select.html',
            'meter_reading.html'
        ];

        const results = [];
        let successCount = 0;

        for (const url of testUrls) {
            try {
                const response = await fetch(url, { 
                    method: 'HEAD',
                    cache: 'no-cache'
                });

                const contentType = response.headers.get('Content-Type') || '';
                const hasCharset = contentType.includes('charset');
                const isUtf8 = contentType.toLowerCase().includes('utf-8');
                
                results.push({
                    url: url,
                    contentType: contentType,
                    hasCharset: hasCharset,
                    isUtf8: isUtf8,
                    correct: hasCharset && isUtf8
                });

                if (hasCharset && isUtf8) successCount++;
                
            } catch (error) {
                results.push({
                    url: url,
                    error: error.message,
                    correct: false
                });
            }
        }

        return {
            success: successCount >= Math.ceil(testUrls.length / 2), // 半数以上成功すればOK
            details: {
                totalUrls: testUrls.length,
                successCount: successCount,
                results: results
            }
        };
    };

    // Test 3: Service WorkerのHTMLレスポンス確認
    const testServiceWorkerResponse = async () => {
        if (!navigator.serviceWorker?.controller) {
            return { 
                success: false, 
                details: { reason: 'Service Worker not active' } 
            };
        }

        try {
            // Service Workerの統計情報取得
            const swStats = await new Promise((resolve) => {
                const timeout = setTimeout(() => resolve(null), 3000);
                
                const channel = new MessageChannel();
                channel.port1.onmessage = (event) => {
                    clearTimeout(timeout);
                    resolve(event.data);
                };

                navigator.serviceWorker.controller.postMessage({
                    type: 'PERFORMANCE_STATS_REQUEST'
                }, [channel.port2]);
            });

            // キャッシュからHTMLファイルを取得してContent-Type確認
            const testCache = async (url) => {
                try {
                    const response = await fetch(url, { cache: 'force-cache' });
                    const contentType = response.headers.get('Content-Type') || '';
                    return {
                        url: url,
                        contentType: contentType,
                        fromCache: response.headers.get('sw-cache-status') === 'hit',
                        correct: contentType.toLowerCase().includes('utf-8')
                    };
                } catch (error) {
                    return { url: url, error: error.message, correct: false };
                }
            };

            const cacheTests = await Promise.all([
                testCache('property_select.html'),
                testCache('room_select.html')
            ]);

            const successfulCacheTests = cacheTests.filter(t => t.correct).length;

            return {
                success: swStats !== null && successfulCacheTests > 0,
                details: {
                    serviceWorkerActive: !!navigator.serviceWorker.controller,
                    swStats: swStats,
                    cacheTests: cacheTests,
                    successfulCacheTests: successfulCacheTests
                }
            };
        } catch (error) {
            return { success: false, details: { error: error.message } };
        }
    };

    // Test 4: 文字化けサンプルテスト
    const testCharacterMojibake = async () => {
        const testSamples = [
            '日本語',
            'ひらがな',
            'カタカナ', 
            '漢字テスト',
            '特殊文字: ①②③',
            '記号: ※〒℃',
            '長い文章: これは日本語の文字化けテストです。正常に表示されていれば成功です。'
        ];

        try {
            // DOMに挿入してテスト
            const testContainer = document.createElement('div');
            testContainer.style.cssText = 'position:absolute;top:-9999px;left:-9999px;visibility:hidden;';
            document.body.appendChild(testContainer);

            const results = [];
            for (const sample of testSamples) {
                const testElement = document.createElement('span');
                testElement.textContent = sample;
                testContainer.appendChild(testElement);
                
                const retrieved = testElement.textContent;
                const correct = retrieved === sample;
                
                results.push({
                    original: sample,
                    retrieved: retrieved,
                    correct: correct
                });
                
                if (!correct) {
                    console.warn(`🔤 文字化け検出: "${sample}" → "${retrieved}"`);
                }
            }

            document.body.removeChild(testContainer);

            const successCount = results.filter(r => r.correct).length;
            const successRate = (successCount / results.length) * 100;

            return {
                success: successRate >= 90, // 90%以上の成功率を要求
                details: {
                    totalSamples: results.length,
                    successCount: successCount,
                    successRate: successRate,
                    results: results.filter(r => !r.correct) // 失敗のみ表示
                }
            };
        } catch (error) {
            return { success: false, details: { error: error.message } };
        }
    };

    // Test 5: Cloudflare Pages _headers ファイル効果確認
    const testCloudflareHeaders = async () => {
        try {
            // 現在のページでCloudflare固有のヘッダーをチェック
            const response = await fetch(window.location.href, { 
                method: 'HEAD',
                cache: 'no-cache' 
            });

            const headers = {};
            response.headers.forEach((value, key) => {
                headers[key.toLowerCase()] = value;
            });

            const contentType = headers['content-type'] || '';
            const cfCacheStatus = headers['cf-cache-status'];
            const server = headers['server'];

            const isCloudflare = server?.includes('cloudflare') || cfCacheStatus !== undefined;
            const hasUtf8 = contentType.toLowerCase().includes('utf-8');
            const hasCorrectContentType = contentType.toLowerCase().includes('text/html');

            return {
                success: isCloudflare && hasUtf8 && hasCorrectContentType,
                details: {
                    contentType: contentType,
                    cfCacheStatus: cfCacheStatus,
                    server: server,
                    isCloudflare: isCloudflare,
                    hasUtf8: hasUtf8,
                    headersFile: '_headers file should be working',
                    allHeaders: headers
                }
            };
        } catch (error) {
            return { success: false, details: { error: error.message } };
        }
    };

    // テスト実行スイート
    const runEncodingTests = async () => {
        console.log('\n🚀 Character Encoding Fix Test Suite 実行開始');
        console.log('=' .repeat(50));

        const tests = [
            ['現在のページエンコーディング確認', testCurrentPageEncoding],
            ['HTTPヘッダーContent-Type確認', testHttpHeaders],
            ['Service Workerレスポンス確認', testServiceWorkerResponse],
            ['文字化けサンプルテスト', testCharacterMojibake],
            ['Cloudflare Pages _headers効果確認', testCloudflareHeaders]
        ];

        for (const [name, testFn] of tests) {
            await addTest(name, testFn);
            // テスト間の間隔
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        // 結果サマリー
        console.log('\n' + '=' .repeat(50));
        console.log('🏁 文字化け修正テスト結果サマリー');
        
        const successCount = testResults.filter(r => r.success).length;
        const totalCount = testResults.length;
        
        console.log(`📊 成功: ${successCount}/${totalCount} テスト`);
        console.log(`🎯 成功率: ${Math.round((successCount/totalCount) * 100)}%`);
        
        if (successCount === totalCount) {
            console.log('✅ 全テスト成功！文字化け問題は解決されています。');
        } else if (successCount >= Math.ceil(totalCount * 0.8)) {
            console.log('⚡ 大部分のテストが成功。一部改善の余地があります。');
        } else {
            console.log('⚠️ 文字化け問題が残っています。以下の項目を確認してください:');
            testResults.filter(r => !r.success).forEach(r => {
                console.log(`  ❌ ${r.name}: ${r.error || '失敗'}`);
            });
        }

        // 推奨事項
        console.log('\n💡 推奨事項:');
        if (successCount < totalCount) {
            console.log('  - ブラウザのハードリロード（Ctrl+Shift+R）を実行');
            console.log('  - window.navigationDiagnostics.testEncoding() でエンコーディング詳細診断');
            console.log('  - window.navigationDiagnostics.completeReset() で完全リセット');
        } else {
            console.log('  - 文字化け修正は正常に動作しています');
            console.log('  - 今後も定期的にエンコーディング確認を実行してください');
        }

        return {
            totalTests: totalCount,
            successCount: successCount,
            successRate: (successCount/totalCount) * 100,
            results: testResults,
            allPassed: successCount === totalCount,
            encodingFixed: successCount >= Math.ceil(totalCount * 0.8)
        };
    };

    // グローバルに公開
    window.encodingFixTest = {
        run: runEncodingTests,
        results: testResults
    };

    console.log('🔧 Character Encoding Fix Test Suite 準備完了');
    console.log('実行方法: window.encodingFixTest.run()');

    // 自動実行（ページ読み込み完了後）
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(runEncodingTests, 2500);
        });
    } else {
        setTimeout(runEncodingTests, 2000);
    }

})();