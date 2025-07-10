/**
 * 遅延読み込みユーティリティ
 * Intersection Observer APIを使用した画像の遅延読み込み
 */

class LazyLoadManager {
  constructor(options = {}) {
    this.options = {
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    };
    
    this.observer = null;
    this.images = new Set();
    this.init();
  }

  init() {
    if (!('IntersectionObserver' in window)) {
      console.warn('[LazyLoad] Intersection Observer not supported, falling back to immediate loading');
      this.loadAllImages();
      return;
    }

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadImage(entry.target);
          this.observer.unobserve(entry.target);
        }
      });
    }, this.options);
  }

  // 画像を遅延読み込み対象として追加
  observe(img) {
    if (!img || img.tagName !== 'IMG') {
      console.warn('[LazyLoad] Invalid image element provided');
      return;
    }

    // 既に読み込み済みの場合はスキップ
    if (img.complete && img.naturalHeight !== 0) {
      return;
    }

    this.images.add(img);
    
    if (this.observer) {
      this.observer.observe(img);
    } else {
      // Intersection Observer が利用できない場合は即座に読み込み
      this.loadImage(img);
    }
  }

  // 画像を読み込み
  loadImage(img) {
    const src = img.dataset.src;
    const srcset = img.dataset.srcset;

    if (src) {
      img.src = src;
      img.removeAttribute('data-src');
    }

    if (srcset) {
      img.srcset = srcset;
      img.removeAttribute('data-srcset');
    }

    img.classList.remove('lazy');
    img.classList.add('lazy-loaded');

    this.images.delete(img);
    console.log('[LazyLoad] Image loaded:', src);
  }

  // 全ての画像を即座に読み込み（フォールバック用）
  loadAllImages() {
    const lazyImages = document.querySelectorAll('img.lazy');
    lazyImages.forEach(img => this.loadImage(img));
  }

  // 破棄
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.images.clear();
  }
}

// グローバルインスタンス
const lazyLoadManager = new LazyLoadManager();

// DOM要素の自動検出と遅延読み込み設定
function initializeLazyLoading() {
  const lazyImages = document.querySelectorAll('img.lazy');
  lazyImages.forEach(img => {
    lazyLoadManager.observe(img);
  });
  
  console.log(`[LazyLoad] Initialized lazy loading for ${lazyImages.length} images`);
}

// DOM読み込み完了後に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeLazyLoading);
} else {
  initializeLazyLoading();
}

// MutationObserverで動的に追加された画像も対応
const imageObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1) { // Element node
        // 追加されたノード自体が遅延読み込み対象の画像の場合
        if (node.tagName === 'IMG' && node.classList.contains('lazy')) {
          lazyLoadManager.observe(node);
        }
        
        // 追加されたノードの子要素に遅延読み込み対象の画像がある場合
        const lazyImages = node.querySelectorAll && node.querySelectorAll('img.lazy');
        if (lazyImages) {
          lazyImages.forEach(img => lazyLoadManager.observe(img));
        }
      }
    });
  });
});

// MutationObserverで動的に追加される画像を監視
const mutationObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          // 追加されたノードが画像の場合
          if (node.tagName === 'IMG' && node.dataset.src) {
            imageObserver.observe(node);
          }
          // 追加されたノード内の画像をすべて監視
          const images = node.querySelectorAll && node.querySelectorAll('img[data-src]');
          if (images) {
            images.forEach(img => imageObserver.observe(img));
          }
        }
      });
    }
  });
});

// DOM監視開始
if (document.body) {
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LazyLoadManager, lazyLoadManager, initializeLazyLoading };
}

// React用のカスタムフック
if (typeof React !== 'undefined') {
  window.useLazyLoading = (ref) => {
    React.useEffect(() => {
      if (ref.current) {
        lazyLoadManager.observe(ref.current);
      }
    }, [ref]);
  };
}