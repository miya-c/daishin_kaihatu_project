// Performance Monitor for Water Meter Reading App
// Version 20250826a - Comprehensive performance measurement and analysis

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoads: [],
      apiCalls: [],
      cacheHits: [],
      userInteractions: [],
      errors: []
    };
    this.storageKey = 'suido_performance_metrics';
    this.isEnabled = true;
    this.init();
  }

  // Initialize performance monitoring
  init() {
    console.log('📊 PerformanceMonitor v20250826a 初期化開始');
    
    // Load existing metrics
    this.loadMetrics();
    
    // Setup observers
    this.setupPerformanceObserver();
    this.setupNavigationTiming();
    this.setupResourceTiming();
    this.setupUserTiming();
    
    // Auto-save metrics periodically
    setInterval(() => this.saveMetrics(), 30000);
    
    // Cleanup old metrics
    this.cleanupOldMetrics();
    
    console.log('✅ PerformanceMonitor 初期化完了');
  }

  // Setup Performance Observer API
  setupPerformanceObserver() {
    if (!('PerformanceObserver' in window)) {
      console.warn('⚠️ PerformanceObserver未対応');
      return;
    }

    try {
      // Observe navigation and resource loading
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'navigation') {
            this.recordPageLoad(entry);
          } else if (entry.entryType === 'resource') {
            this.recordResourceLoad(entry);
          } else if (entry.entryType === 'measure') {
            this.recordCustomMetric(entry);
          }
        });
      });

      observer.observe({ entryTypes: ['navigation', 'resource', 'measure'] });
      console.log('📊 PerformanceObserver セットアップ完了');
    } catch (error) {
      console.warn('⚠️ PerformanceObserver セットアップ失敗:', error);
    }
  }

  // Setup Navigation Timing
  setupNavigationTiming() {
    if (performance.navigation) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0];
          if (navigation) {
            this.recordPageLoad(navigation);
          }
        }, 100);
      });
    }
  }

  // Setup Resource Timing
  setupResourceTiming() {
    // Monitor specific resources
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0];
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        
        this.recordAPICall({
          url: url,
          method: args[1]?.method || 'GET',
          status: response.status,
          duration: endTime - startTime,
          timestamp: Date.now(),
          cached: response.headers.get('sw-cache-status') === 'cache'
        });
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        this.recordAPICall({
          url: url,
          method: args[1]?.method || 'GET',
          status: 0,
          duration: endTime - startTime,
          timestamp: Date.now(),
          error: error.message
        });
        throw error;
      }
    };
  }

  // Setup User Timing API
  setupUserTiming() {
    // Custom performance marks for key operations
    this.createMark = (name) => {
      if (performance.mark) {
        performance.mark(name);
      }
    };

    this.createMeasure = (name, startMark, endMark) => {
      if (performance.measure) {
        performance.measure(name, startMark, endMark);
      }
    };
  }

  // Record page load metrics
  recordPageLoad(entry) {
    const metrics = {
      url: entry.name || window.location.href,
      timestamp: Date.now(),
      loadTime: entry.loadEventEnd - entry.loadEventStart,
      domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      firstPaint: this.getFirstPaint(),
      firstContentfulPaint: this.getFirstContentfulPaint(),
      navigation: {
        type: entry.type || performance.navigation?.type,
        redirectCount: entry.redirectCount || performance.navigation?.redirectCount
      },
      timing: {
        dns: entry.domainLookupEnd - entry.domainLookupStart,
        connection: entry.connectEnd - entry.connectStart,
        request: entry.responseStart - entry.requestStart,
        response: entry.responseEnd - entry.responseStart,
        domProcessing: entry.domContentLoadedEventStart - entry.responseEnd,
        total: entry.loadEventEnd - entry.navigationStart
      }
    };

    this.metrics.pageLoads.push(metrics);
    console.log('📊 ページロード測定:', metrics);
    
    // Limit stored entries
    if (this.metrics.pageLoads.length > 50) {
      this.metrics.pageLoads = this.metrics.pageLoads.slice(-50);
    }
  }

  // Record API call metrics
  recordAPICall(data) {
    const isLightAPI = data.url.includes('Light');
    const isGASAPI = data.url.includes('script.google.com');
    
    const metrics = {
      ...data,
      isLightAPI,
      isGASAPI,
      category: this.categorizeAPICall(data.url)
    };

    this.metrics.apiCalls.push(metrics);
    console.log(`📡 API呼び出し測定 (${isLightAPI ? 'Light' : '通常'}):`, metrics);
    
    // Limit stored entries
    if (this.metrics.apiCalls.length > 100) {
      this.metrics.apiCalls = this.metrics.apiCalls.slice(-100);
    }
  }

  // Record resource load metrics
  recordResourceLoad(entry) {
    // Only track important resources
    if (this.shouldTrackResource(entry.name)) {
      const metrics = {
        name: entry.name,
        type: entry.initiatorType,
        duration: entry.duration,
        size: entry.transferSize || entry.encodedBodySize,
        cached: entry.transferSize === 0 && entry.decodedBodySize > 0,
        timestamp: Date.now()
      };
      
      // Store in appropriate category
      if (metrics.cached) {
        this.metrics.cacheHits.push(metrics);
      }
      
      console.log('📦 リソースロード測定:', metrics);
    }
  }

  // Record custom metrics
  recordCustomMetric(entry) {
    console.log('⏱️ カスタム測定:', entry.name, `${entry.duration.toFixed(2)}ms`);
  }

  // Record cache hit
  recordCacheHit(type, key, size = 0) {
    const metrics = {
      type,
      key,
      size,
      timestamp: Date.now()
    };
    
    this.metrics.cacheHits.push(metrics);
    
    // Limit stored entries
    if (this.metrics.cacheHits.length > 200) {
      this.metrics.cacheHits = this.metrics.cacheHits.slice(-200);
    }
  }

  // Record user interaction
  recordUserInteraction(action, target, duration = 0) {
    const metrics = {
      action,
      target,
      duration,
      timestamp: Date.now(),
      page: window.location.pathname
    };
    
    this.metrics.userInteractions.push(metrics);
    
    // Limit stored entries
    if (this.metrics.userInteractions.length > 100) {
      this.metrics.userInteractions = this.metrics.userInteractions.slice(-100);
    }
  }

  // Record error
  recordError(error, context = '') {
    const metrics = {
      message: error.message || error,
      stack: error.stack,
      context,
      timestamp: Date.now(),
      page: window.location.pathname,
      userAgent: navigator.userAgent
    };
    
    this.metrics.errors.push(metrics);
    console.error('❌ エラー記録:', metrics);
    
    // Limit stored entries
    if (this.metrics.errors.length > 50) {
      this.metrics.errors = this.metrics.errors.slice(-50);
    }
  }

  // Get performance statistics
  getStats() {
    return {
      summary: {
        totalPageLoads: this.metrics.pageLoads.length,
        totalAPIRequests: this.metrics.apiCalls.length,
        totalCacheHits: this.metrics.cacheHits.length,
        totalErrors: this.metrics.errors.length,
        cacheHitRatio: this.calculateCacheHitRatio(),
        averageLoadTime: this.calculateAverageLoadTime(),
        averageAPITime: this.calculateAverageAPITime()
      },
      pageLoads: {
        latest: this.metrics.pageLoads.slice(-10),
        averages: this.calculatePageLoadAverages()
      },
      apiCalls: {
        latest: this.metrics.apiCalls.slice(-20),
        lightVsNormal: this.compareLightVsNormalAPI(),
        gasAPIStats: this.calculateGASAPIStats()
      },
      cachePerformance: {
        hitRatio: this.calculateCacheHitRatio(),
        sizeSaved: this.calculateCacheSize(),
        topCachedItems: this.getTopCachedItems()
      },
      errors: {
        recent: this.metrics.errors.slice(-10),
        byType: this.categorizeErrors()
      }
    };
  }

  // Generate performance report
  generateReport() {
    const stats = this.getStats();
    const report = {
      timestamp: Date.now(),
      reportVersion: '20250826a',
      period: {
        start: this.getOldestMetricTime(),
        end: Date.now()
      },
      ...stats
    };

    console.log('📊 パフォーマンスレポート生成完了:', report);
    return report;
  }

  // Save metrics to localStorage
  saveMetrics() {
    if (!this.isEnabled) return;
    
    try {
      const data = {
        metrics: this.metrics,
        lastSaved: Date.now(),
        version: '20250826a'
      };
      
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('⚠️ メトリクス保存失敗:', error);
    }
  }

  // Load metrics from localStorage
  loadMetrics() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.metrics) {
          this.metrics = data.metrics;
          console.log('📊 保存済みメトリクス読み込み完了');
        }
      }
    } catch (error) {
      console.warn('⚠️ メトリクス読み込み失敗:', error);
      this.metrics = { pageLoads: [], apiCalls: [], cacheHits: [], userInteractions: [], errors: [] };
    }
  }

  // Clean up old metrics (keep last 7 days)
  cleanupOldMetrics() {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key] = this.metrics[key].filter(item => 
        item.timestamp > sevenDaysAgo
      );
    });
    
    console.log('🧹 古いメトリクスクリーンアップ完了');
  }

  // Utility methods
  getFirstPaint() {
    const entry = performance.getEntriesByName('first-paint')[0];
    return entry ? entry.startTime : null;
  }

  getFirstContentfulPaint() {
    const entry = performance.getEntriesByName('first-contentful-paint')[0];
    return entry ? entry.startTime : null;
  }

  shouldTrackResource(name) {
    return name.includes('.js') || 
           name.includes('.css') || 
           name.includes('.html') ||
           name.includes('script.google.com');
  }

  categorizeAPICall(url) {
    if (url.includes('getProperties')) return 'properties';
    if (url.includes('getRooms')) return 'rooms';
    if (url.includes('getMeterReading')) return 'reading';
    if (url.includes('getDeltaData')) return 'delta';
    return 'other';
  }

  calculateCacheHitRatio() {
    const totalRequests = this.metrics.apiCalls.length;
    const cachedRequests = this.metrics.apiCalls.filter(call => call.cached).length;
    return totalRequests > 0 ? (cachedRequests / totalRequests * 100).toFixed(2) : 0;
  }

  calculateAverageLoadTime() {
    if (this.metrics.pageLoads.length === 0) return 0;
    const total = this.metrics.pageLoads.reduce((sum, load) => sum + load.timing.total, 0);
    return (total / this.metrics.pageLoads.length).toFixed(2);
  }

  calculateAverageAPITime() {
    if (this.metrics.apiCalls.length === 0) return 0;
    const total = this.metrics.apiCalls.reduce((sum, call) => sum + call.duration, 0);
    return (total / this.metrics.apiCalls.length).toFixed(2);
  }

  calculatePageLoadAverages() {
    if (this.metrics.pageLoads.length === 0) return {};
    
    const loads = this.metrics.pageLoads;
    return {
      dns: (loads.reduce((sum, l) => sum + l.timing.dns, 0) / loads.length).toFixed(2),
      connection: (loads.reduce((sum, l) => sum + l.timing.connection, 0) / loads.length).toFixed(2),
      request: (loads.reduce((sum, l) => sum + l.timing.request, 0) / loads.length).toFixed(2),
      response: (loads.reduce((sum, l) => sum + l.timing.response, 0) / loads.length).toFixed(2),
      domProcessing: (loads.reduce((sum, l) => sum + l.timing.domProcessing, 0) / loads.length).toFixed(2)
    };
  }

  compareLightVsNormalAPI() {
    const lightAPIs = this.metrics.apiCalls.filter(call => call.isLightAPI);
    const normalAPIs = this.metrics.apiCalls.filter(call => call.isGASAPI && !call.isLightAPI);
    
    return {
      lightAPI: {
        count: lightAPIs.length,
        averageTime: lightAPIs.length > 0 ? 
          (lightAPIs.reduce((sum, call) => sum + call.duration, 0) / lightAPIs.length).toFixed(2) : 0
      },
      normalAPI: {
        count: normalAPIs.length,
        averageTime: normalAPIs.length > 0 ? 
          (normalAPIs.reduce((sum, call) => sum + call.duration, 0) / normalAPIs.length).toFixed(2) : 0
      }
    };
  }

  calculateGASAPIStats() {
    const gasAPIs = this.metrics.apiCalls.filter(call => call.isGASAPI);
    return {
      total: gasAPIs.length,
      successful: gasAPIs.filter(call => call.status >= 200 && call.status < 300).length,
      errors: gasAPIs.filter(call => call.status === 0 || call.status >= 400).length,
      averageTime: gasAPIs.length > 0 ? 
        (gasAPIs.reduce((sum, call) => sum + call.duration, 0) / gasAPIs.length).toFixed(2) : 0
    };
  }

  calculateCacheSize() {
    return this.metrics.cacheHits.reduce((sum, hit) => sum + (hit.size || 0), 0);
  }

  getTopCachedItems() {
    const itemCounts = {};
    this.metrics.cacheHits.forEach(hit => {
      itemCounts[hit.type] = (itemCounts[hit.type] || 0) + 1;
    });
    
    return Object.entries(itemCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));
  }

  categorizeErrors() {
    const errorTypes = {};
    this.metrics.errors.forEach(error => {
      const type = error.context || 'unknown';
      errorTypes[type] = (errorTypes[type] || 0) + 1;
    });
    return errorTypes;
  }

  getOldestMetricTime() {
    const times = [
      ...this.metrics.pageLoads.map(p => p.timestamp),
      ...this.metrics.apiCalls.map(a => a.timestamp),
      ...this.metrics.cacheHits.map(c => c.timestamp)
    ];
    return times.length > 0 ? Math.min(...times) : Date.now();
  }
}

// Global instance
window.performanceMonitor = new PerformanceMonitor();

// Auto-track user interactions
document.addEventListener('click', (event) => {
  const startTime = performance.now();
  setTimeout(() => {
    const duration = performance.now() - startTime;
    window.performanceMonitor.recordUserInteraction(
      'click', 
      event.target.tagName + (event.target.className ? '.' + event.target.className : ''),
      duration
    );
  }, 0);
});

// Track errors
window.addEventListener('error', (event) => {
  window.performanceMonitor.recordError(event.error, 'window.error');
});

window.addEventListener('unhandledrejection', (event) => {
  window.performanceMonitor.recordError(event.reason, 'unhandledrejection');
});

// Save before unload
window.addEventListener('beforeunload', () => {
  window.performanceMonitor.saveMetrics();
});

console.log('🚀 PerformanceMonitor v20250826a ロード完了');