/**
 * パフォーマンス監視ユーティリティ
 * Core Web Vitals と独自メトリクスの測定
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.isSupported = 'performance' in window && 'PerformanceObserver' in window;
    this.observers = [];
    
    if (this.isSupported) {
      this.init();
    }
  }

  init() {
    this.observeNavigationTiming();
    this.observeResourceTiming();
    this.observePaintTiming();
    this.observeLayoutShift();
    this.observeLargestContentfulPaint();
    this.observeFirstInputDelay();
  }

  // ナビゲーションタイミングの監視
  observeNavigationTiming() {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        this.metrics.navigationTiming = {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          domComplete: navigation.domComplete - navigation.navigationStart,
          loadComplete: navigation.loadEventEnd - navigation.navigationStart,
          firstByte: navigation.responseStart - navigation.navigationStart,
          domInteractive: navigation.domInteractive - navigation.navigationStart
        };
        
        console.log('[Performance] Navigation timing:', this.metrics.navigationTiming);
        this.reportMetrics('navigation', this.metrics.navigationTiming);
      }
    });
  }

  // リソースタイミングの監視
  observeResourceTiming() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest') {
          this.trackApiTiming(entry);
        }
      });
    });
    
    observer.observe({ entryTypes: ['resource'] });
    this.observers.push(observer);
  }

  // API通信時間の追跡
  trackApiTiming(entry) {
    const apiMetrics = {
      url: entry.name,
      duration: entry.duration,
      size: entry.transferSize,
      cached: entry.transferSize === 0 && entry.decodedBodySize > 0
    };
    
    if (!this.metrics.apiCalls) {
      this.metrics.apiCalls = [];
    }
    
    this.metrics.apiCalls.push(apiMetrics);
    console.log('[Performance] API call:', apiMetrics);
  }

  // Paint タイミングの監視
  observePaintTiming() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        this.metrics[entry.name] = entry.startTime;
        console.log(`[Performance] ${entry.name}:`, entry.startTime);
      });
    });
    
    observer.observe({ entryTypes: ['paint'] });
    this.observers.push(observer);
  }

  // Cumulative Layout Shift (CLS) の監視
  observeLayoutShift() {
    let clsValue = 0;
    
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      
      this.metrics.cumulativeLayoutShift = clsValue;
      console.log('[Performance] CLS:', clsValue);
    });
    
    observer.observe({ entryTypes: ['layout-shift'] });
    this.observers.push(observer);
  }

  // Largest Contentful Paint (LCP) の監視
  observeLargestContentfulPaint() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      this.metrics.largestContentfulPaint = lastEntry.startTime;
      console.log('[Performance] LCP:', lastEntry.startTime);
    });
    
    observer.observe({ entryTypes: ['largest-contentful-paint'] });
    this.observers.push(observer);
  }

  // First Input Delay (FID) の監視
  observeFirstInputDelay() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        this.metrics.firstInputDelay = entry.processingStart - entry.startTime;
        console.log('[Performance] FID:', this.metrics.firstInputDelay);
      });
    });
    
    observer.observe({ entryTypes: ['first-input'] });
    this.observers.push(observer);
  }

  // カスタムメトリクスの測定開始
  startMeasure(name) {
    performance.mark(`${name}-start`);
  }

  // カスタムメトリクスの測定終了
  endMeasure(name) {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const measure = performance.getEntriesByName(name, 'measure')[0];
    this.metrics[name] = measure.duration;
    
    console.log(`[Performance] ${name}:`, measure.duration);
    return measure.duration;
  }

  // React レンダリング時間の測定
  measureReactRender(componentName, renderFunction) {
    this.startMeasure(`react-${componentName}`);
    const result = renderFunction();
    
    // 非同期の場合
    if (result && typeof result.then === 'function') {
      return result.then(res => {
        this.endMeasure(`react-${componentName}`);
        return res;
      });
    }
    
    // 同期の場合
    setTimeout(() => {
      this.endMeasure(`react-${componentName}`);
    }, 0);
    
    return result;
  }

  // APIレスポンス時間の測定
  async measureApiCall(name, apiCall) {
    this.startMeasure(`api-${name}`);
    
    try {
      const result = await apiCall();
      this.endMeasure(`api-${name}`);
      return result;
    } catch (error) {
      this.endMeasure(`api-${name}`);
      throw error;
    }
  }

  // メトリクスの報告
  reportMetrics(category, data) {
    // ここで外部の分析サービスに送信可能
    // 例: Google Analytics, Application Insights など
    
    console.log(`[Performance] Reporting ${category}:`, data);
    
    // デバッグ用：ローカルストレージに保存
    const key = `perf_${category}_${Date.now()}`;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('[Performance] Failed to save metrics to localStorage');
    }
  }

  // パフォーマンス レポートの生成
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: { ...this.metrics },
      userAgent: navigator.userAgent,
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink
      } : null
    };

    console.log('[Performance] Generated report:', report);
    return report;
  }

  // メトリクスのクリア
  clearMetrics() {
    this.metrics = {};
    console.log('[Performance] Metrics cleared');
  }

  // オブザーバーの停止
  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    console.log('[Performance] All observers disconnected');
  }

  // Core Web Vitals の評価
  evaluateWebVitals() {
    const vitals = {
      lcp: this.metrics.largestContentfulPaint,
      fid: this.metrics.firstInputDelay,
      cls: this.metrics.cumulativeLayoutShift
    };

    const scores = {
      lcp: vitals.lcp <= 2500 ? 'good' : vitals.lcp <= 4000 ? 'needs-improvement' : 'poor',
      fid: vitals.fid <= 100 ? 'good' : vitals.fid <= 300 ? 'needs-improvement' : 'poor',
      cls: vitals.cls <= 0.1 ? 'good' : vitals.cls <= 0.25 ? 'needs-improvement' : 'poor'
    };

    console.log('[Performance] Core Web Vitals evaluation:', { vitals, scores });
    return { vitals, scores };
  }
}

// React 用のカスタムフック
if (typeof React !== 'undefined') {
  window.usePerformanceMonitor = () => {
    const monitor = React.useRef(window.performanceMonitor);
    
    const measureRender = React.useCallback((componentName, callback) => {
      return monitor.current.measureReactRender(componentName, callback);
    }, []);

    const measureApi = React.useCallback((name, apiCall) => {
      return monitor.current.measureApiCall(name, apiCall);
    }, []);

    const startMeasure = React.useCallback((name) => {
      monitor.current.startMeasure(name);
    }, []);

    const endMeasure = React.useCallback((name) => {
      return monitor.current.endMeasure(name);
    }, []);

    return {
      measureRender,
      measureApi,
      startMeasure,
      endMeasure,
      getMetrics: () => monitor.current.metrics,
      generateReport: () => monitor.current.generateReport()
    };
  };
}

// グローバルインスタンス
const performanceMonitor = new PerformanceMonitor();
window.performanceMonitor = performanceMonitor;

// ページ離脱時にレポート生成
window.addEventListener('beforeunload', () => {
  performanceMonitor.generateReport();
});

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PerformanceMonitor, performanceMonitor };
}

console.log('[Performance] Performance monitor initialized');