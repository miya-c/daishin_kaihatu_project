// Automated Performance Test Suite for Water Meter Reading App
// Version 20250826a - Comprehensive performance testing and benchmarking

class PerformanceTestSuite {
  constructor() {
    this.tests = [];
    this.results = [];
    this.isRunning = false;
    this.testConfig = {
      iterations: 5,
      timeout: 10000,
      waitTime: 1000
    };
    
    console.log('🧪 PerformanceTestSuite v20250826a 初期化');
  }

  // Add test case
  addTest(name, testFn, options = {}) {
    this.tests.push({
      name,
      testFn,
      options: { ...this.testConfig, ...options },
      id: Date.now() + Math.random()
    });
  }

  // Run all tests
  async runAllTests() {
    if (this.isRunning) {
      console.warn('⚠️ テスト実行中です');
      return;
    }

    this.isRunning = true;
    this.results = [];
    
    console.log(`🚀 パフォーマンステスト開始 - ${this.tests.length}個のテスト`);
    
    try {
      for (const test of this.tests) {
        console.log(`📊 テスト実行中: ${test.name}`);
        const result = await this.runTest(test);
        this.results.push(result);
        
        // Wait between tests
        await this.sleep(test.options.waitTime);
      }
      
      console.log('✅ 全テスト完了');
      return this.generateTestReport();
      
    } catch (error) {
      console.error('❌ テスト実行エラー:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  // Run single test
  async runTest(test) {
    const results = [];
    const startTime = Date.now();
    
    try {
      for (let i = 0; i < test.options.iterations; i++) {
        console.log(`  反復 ${i + 1}/${test.options.iterations}`);
        
        const iterationStart = performance.now();
        const result = await Promise.race([
          test.testFn(),
          this.timeout(test.options.timeout)
        ]);
        const iterationEnd = performance.now();
        
        results.push({
          iteration: i + 1,
          duration: iterationEnd - iterationStart,
          result: result,
          timestamp: Date.now()
        });
        
        // Small delay between iterations
        if (i < test.options.iterations - 1) {
          await this.sleep(100);
        }
      }
      
      return {
        testName: test.name,
        status: 'success',
        iterations: results,
        summary: this.calculateSummary(results),
        totalTime: Date.now() - startTime,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error(`❌ テスト失敗: ${test.name}`, error);
      return {
        testName: test.name,
        status: 'error',
        error: error.message,
        iterations: results,
        totalTime: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  // Calculate test summary statistics
  calculateSummary(results) {
    if (results.length === 0) return {};
    
    const durations = results.map(r => r.duration);
    const successCount = results.filter(r => r.result && !r.result.error).length;
    
    return {
      total: results.length,
      successful: successCount,
      failed: results.length - successCount,
      successRate: (successCount / results.length * 100).toFixed(2),
      averageTime: (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2),
      minTime: Math.min(...durations).toFixed(2),
      maxTime: Math.max(...durations).toFixed(2),
      medianTime: this.calculateMedian(durations).toFixed(2)
    };
  }

  // Generate comprehensive test report
  generateTestReport() {
    const report = {
      timestamp: Date.now(),
      testSuiteVersion: '20250826a',
      totalTests: this.tests.length,
      completedTests: this.results.length,
      summary: this.generateOverallSummary(),
      results: this.results,
      recommendations: this.generateRecommendations()
    };
    
    console.log('📊 テストレポート生成完了:', report);
    return report;
  }

  // Generate overall summary
  generateOverallSummary() {
    const successful = this.results.filter(r => r.status === 'success');
    const failed = this.results.filter(r => r.status === 'error');
    
    if (successful.length === 0) {
      return { status: 'all_failed', message: '全てのテストが失敗しました' };
    }
    
    const allDurations = successful
      .flatMap(r => r.iterations?.map(i => i.duration) || []);
    
    return {
      status: failed.length === 0 ? 'all_passed' : 'partial_success',
      successfulTests: successful.length,
      failedTests: failed.length,
      overallAverageTime: allDurations.length > 0 
        ? (allDurations.reduce((a, b) => a + b, 0) / allDurations.length).toFixed(2)
        : 0,
      fastestTest: this.getFastestTest(successful),
      slowestTest: this.getSlowestTest(successful)
    };
  }

  // Generate performance recommendations
  generateRecommendations() {
    const recommendations = [];
    
    this.results.forEach(result => {
      if (result.status === 'success' && result.summary) {
        const avgTime = parseFloat(result.summary.averageTime);
        
        if (avgTime > 3000) {
          recommendations.push({
            test: result.testName,
            severity: 'high',
            issue: '応答時間が遅い',
            recommendation: '3秒以上の応答時間です。キャッシュ機能やAPI最適化を確認してください。'
          });
        } else if (avgTime > 1000) {
          recommendations.push({
            test: result.testName,
            severity: 'medium',
            issue: '応答時間が標準より遅い',
            recommendation: '1秒以上の応答時間です。軽量APIの使用を検討してください。'
          });
        }
        
        const successRate = parseFloat(result.summary.successRate);
        if (successRate < 95) {
          recommendations.push({
            test: result.testName,
            severity: 'high',
            issue: '成功率が低い',
            recommendation: `成功率${successRate}%です。エラーハンドリングとネットワーク安定性を確認してください。`
          });
        }
      }
    });
    
    return recommendations;
  }

  // Utility methods
  getFastestTest(results) {
    if (results.length === 0) return null;
    return results.reduce((fastest, current) => {
      const fastestTime = parseFloat(fastest.summary?.averageTime || Infinity);
      const currentTime = parseFloat(current.summary?.averageTime || Infinity);
      return currentTime < fastestTime ? current : fastest;
    });
  }

  getSlowestTest(results) {
    if (results.length === 0) return null;
    return results.reduce((slowest, current) => {
      const slowestTime = parseFloat(slowest.summary?.averageTime || 0);
      const currentTime = parseFloat(current.summary?.averageTime || 0);
      return currentTime > slowestTime ? current : slowest;
    });
  }

  calculateMedian(numbers) {
    const sorted = numbers.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  timeout(ms) {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Test timeout')), ms)
    );
  }
}

// Pre-defined test cases for water meter reading app
class WaterMeterPerformanceTests {
  constructor() {
    this.suite = new PerformanceTestSuite();
    this.gasWebAppUrl = sessionStorage.getItem('gasWebAppUrl');
    this.setupTests();
  }

  setupTests() {
    // Test 1: Property list loading (Light API)
    this.suite.addTest(
      '物件一覧読み込み (軽量API)',
      () => this.testPropertiesLightAPI(),
      { iterations: 5 }
    );

    // Test 2: Property list loading (Normal API)
    this.suite.addTest(
      '物件一覧読み込み (通常API)',
      () => this.testPropertiesNormalAPI(),
      { iterations: 5 }
    );

    // Test 3: Room list loading (Light API)
    this.suite.addTest(
      '部屋一覧読み込み (軽量API)',
      () => this.testRoomsLightAPI(),
      { iterations: 3 }
    );

    // Test 4: Cache performance
    this.suite.addTest(
      'キャッシュ機能性能',
      () => this.testCachePerformance(),
      { iterations: 10 }
    );

    // Test 5: Delta sync performance
    this.suite.addTest(
      '差分同期機能性能',
      () => this.testDeltaSyncPerformance(),
      { iterations: 3 }
    );

    // Test 6: Page load performance
    this.suite.addTest(
      'ページ読み込み性能',
      () => this.testPageLoadPerformance(),
      { iterations: 5 }
    );
  }

  // Test Properties Light API
  async testPropertiesLightAPI() {
    if (!this.gasWebAppUrl) {
      throw new Error('GAS Web App URL not configured');
    }

    const startTime = performance.now();
    
    try {
      const response = await fetch(
        `${this.gasWebAppUrl}?action=getPropertiesLight&cache=${Date.now()}`
      );
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      const endTime = performance.now();
      
      return {
        success: true,
        responseTime: endTime - startTime,
        dataSize: JSON.stringify(data).length,
        itemCount: data.data?.length || 0,
        compressionRatio: data.compressionRatio || 0,
        api: 'getPropertiesLight'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        responseTime: performance.now() - startTime,
        api: 'getPropertiesLight'
      };
    }
  }

  // Test Properties Normal API
  async testPropertiesNormalAPI() {
    if (!this.gasWebAppUrl) {
      throw new Error('GAS Web App URL not configured');
    }

    const startTime = performance.now();
    
    try {
      const response = await fetch(
        `${this.gasWebAppUrl}?action=getProperties&cache=${Date.now()}`
      );
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      const endTime = performance.now();
      
      return {
        success: true,
        responseTime: endTime - startTime,
        dataSize: JSON.stringify(data).length,
        itemCount: data.data?.length || 0,
        api: 'getProperties'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        responseTime: performance.now() - startTime,
        api: 'getProperties'
      };
    }
  }

  // Test Rooms Light API
  async testRoomsLightAPI() {
    if (!this.gasWebAppUrl) {
      throw new Error('GAS Web App URL not configured');
    }

    // Use a test property ID or the first available one
    const propertyId = 'P000001'; // Default test property
    const startTime = performance.now();
    
    try {
      const response = await fetch(
        `${this.gasWebAppUrl}?action=getRoomsLight&propertyId=${propertyId}&cache=${Date.now()}`
      );
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      const endTime = performance.now();
      
      return {
        success: true,
        responseTime: endTime - startTime,
        dataSize: JSON.stringify(data).length,
        itemCount: data.data?.rooms?.length || data.data?.length || 0,
        compressionRatio: data.compressionRatio || 0,
        api: 'getRoomsLight'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        responseTime: performance.now() - startTime,
        api: 'getRoomsLight'
      };
    }
  }

  // Test Cache Performance
  async testCachePerformance() {
    const startTime = performance.now();
    
    try {
      if (!window.pwaUtils) {
        throw new Error('PWA Utils not available');
      }
      
      // Test cache write
      const testData = { test: 'data', timestamp: Date.now() };
      const writeStart = performance.now();
      window.pwaUtils.setCacheData('test_performance', testData);
      const writeTime = performance.now() - writeStart;
      
      // Test cache read
      const readStart = performance.now();
      const cachedData = window.pwaUtils.getCacheData('test_performance');
      const readTime = performance.now() - readStart;
      
      // Test cache validity check
      const validityStart = performance.now();
      const isValid = window.pwaUtils.isCacheValid('test_performance');
      const validityTime = performance.now() - validityStart;
      
      // Cleanup
      window.pwaUtils.removeCacheData('test_performance');
      
      return {
        success: true,
        totalTime: performance.now() - startTime,
        writeTime: writeTime,
        readTime: readTime,
        validityCheckTime: validityTime,
        dataIntegrity: cachedData?.test === testData.test
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        totalTime: performance.now() - startTime
      };
    }
  }

  // Test Delta Sync Performance
  async testDeltaSyncPerformance() {
    if (!this.gasWebAppUrl) {
      throw new Error('GAS Web App URL not configured');
    }

    const startTime = performance.now();
    const lastSync = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    try {
      const response = await fetch(
        `${this.gasWebAppUrl}?action=getDeltaData&dataType=properties&lastSync=${lastSync}&cache=${Date.now()}`
      );
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      const endTime = performance.now();
      
      return {
        success: true,
        responseTime: endTime - startTime,
        deltaCount: data.data?.length || 0,
        hasChanges: (data.data?.length || 0) > 0,
        api: 'getDeltaData'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        responseTime: performance.now() - startTime,
        api: 'getDeltaData'
      };
    }
  }

  // Test Page Load Performance
  async testPageLoadPerformance() {
    const startTime = performance.now();
    
    try {
      // Get navigation timing if available
      const navigation = performance.getEntriesByType('navigation')[0];
      
      if (!navigation) {
        throw new Error('Navigation timing not available');
      }
      
      return {
        success: true,
        totalTime: performance.now() - startTime,
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstPaint: this.getFirstPaint(),
        networkTime: navigation.responseEnd - navigation.requestStart,
        renderTime: navigation.domContentLoadedEventStart - navigation.responseEnd
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        totalTime: performance.now() - startTime
      };
    }
  }

  getFirstPaint() {
    const entry = performance.getEntriesByName('first-paint')[0];
    return entry ? entry.startTime : null;
  }

  // Run all tests
  async runTests() {
    console.log('🧪 水道検針アプリパフォーマンステスト開始');
    return await this.suite.runAllTests();
  }
}

// Global instance
window.waterMeterPerformanceTests = new WaterMeterPerformanceTests();

// Export for external use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PerformanceTestSuite, WaterMeterPerformanceTests };
}

console.log('🧪 PerformanceTestSuite v20250826a ロード完了');