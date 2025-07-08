// PWA Utilities - Consolidated PWA functionality
let deferredPrompt;
let isInstallable = false;

// Browser information cache
const browserInfo = {
  isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
  isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
  isChrome: /Chrome/.test(navigator.userAgent),
  isBrave: /Brave/.test(navigator.userAgent),
  isEdge: /Edg/.test(navigator.userAgent),
  isPWAMode: () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
};

// Icon SVG template
const iconSVG = `
  <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" fill="#1976d2" rx="80"/>
    <path d="M256 64c-48 64-96 128-96 192 0 53 43 96 96 96s96-43 96-96c0-64-48-128-96-192z" 
          fill="#ffffff" opacity="0.9"/>
    <circle cx="256" cy="320" r="80" fill="none" stroke="#ffffff" stroke-width="8" opacity="0.7"/>
    <line x1="256" y1="320" x2="320" y2="280" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>
    <text x="256" y="420" font-family="Arial, sans-serif" font-size="40" font-weight="bold" 
          text-anchor="middle" fill="#ffffff">検針</text>
  </svg>
`;

// Generate icons and manifest
export function generateIconsAndManifest() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  const svgBlob = new Blob([iconSVG], {type: 'image/svg+xml'});
  const url = URL.createObjectURL(svgBlob);
  
  img.onload = function() {
    const iconSizes = [
      {size: 16, rel: 'icon', type: 'image/png'},
      {size: 32, rel: 'icon', type: 'image/png'},
      {size: 57, rel: 'apple-touch-icon'},
      {size: 60, rel: 'apple-touch-icon'},
      {size: 72, rel: 'apple-touch-icon'},
      {size: 76, rel: 'apple-touch-icon'},
      {size: 114, rel: 'apple-touch-icon'},
      {size: 120, rel: 'apple-touch-icon'},
      {size: 144, rel: 'apple-touch-icon'},
      {size: 152, rel: 'apple-touch-icon'},
      {size: 180, rel: 'apple-touch-icon'},
      {size: 192, rel: 'icon', type: 'image/png'},
      {size: 512, rel: 'icon', type: 'image/png'}
    ];
    
    const manifestIcons = [];
    
    iconSizes.forEach(iconConfig => {
      canvas.width = iconConfig.size;
      canvas.height = iconConfig.size;
      ctx.drawImage(img, 0, 0, iconConfig.size, iconConfig.size);
      const dataURL = canvas.toDataURL('image/png');
      
      // Remove existing links
      const existingLinks = document.querySelectorAll(`link[rel="${iconConfig.rel}"][sizes="${iconConfig.size}x${iconConfig.size}"]`);
      existingLinks.forEach(link => link.remove());
      
      // Create new link
      const link = document.createElement('link');
      link.rel = iconConfig.rel;
      link.sizes = `${iconConfig.size}x${iconConfig.size}`;
      if (iconConfig.type) link.type = iconConfig.type;
      link.href = dataURL;
      document.head.appendChild(link);
      
      // Add to manifest icons
      if ([72, 96, 128, 144, 152, 192, 384, 512].includes(iconConfig.size)) {
        manifestIcons.push({
          src: dataURL,
          sizes: `${iconConfig.size}x${iconConfig.size}`,
          type: 'image/png',
          purpose: 'maskable any'
        });
      }
    });
    
    // Generate 384x384 icon
    canvas.width = 384;
    canvas.height = 384;
    ctx.drawImage(img, 0, 0, 384, 384);
    manifestIcons.push({
      src: canvas.toDataURL('image/png'),
      sizes: '384x384',
      type: 'image/png',
      purpose: 'maskable any'
    });
    
    // Set favicon
    const favicon = document.createElement('link');
    favicon.rel = 'shortcut icon';
    favicon.type = 'image/png';
    canvas.width = 32;
    canvas.height = 32;
    ctx.drawImage(img, 0, 0, 32, 32);
    favicon.href = canvas.toDataURL('image/png');
    document.head.appendChild(favicon);
    
    // Create dynamic manifest
    const manifest = {
      name: '水道検針アプリ',
      short_name: '水道検針',
      description: '水道メーター検針用PWAアプリ',
      start_url: '/?pwa=true',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#1976d2',
      orientation: 'portrait',
      scope: '/',
      lang: 'ja',
      icons: manifestIcons,
      categories: ['utilities', 'productivity'],
      prefer_related_applications: false
    };
    
    const manifestBlob = new Blob([JSON.stringify(manifest)], {type: 'application/json'});
    const manifestURL = URL.createObjectURL(manifestBlob);
    
    let manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = manifestURL;
    
    URL.revokeObjectURL(url);
    console.log('PWA icons and manifest generated successfully');
  };
  
  img.src = url;
}

// Check PWA mode and installability
export function checkPWAModeAndInstallability() {
  const urlParams = new URLSearchParams(window.location.search);
  const isPWAFromParam = urlParams.get('pwa') === 'true';
  
  if (browserInfo.isPWAMode() || isPWAFromParam) {
    window.location.replace('/property_select');
    return { isPWAMode: true, shouldShowButton: false };
  }
  
  const canInstall = 
    (browserInfo.isIOS && browserInfo.isSafari) ||
    isInstallable ||
    browserInfo.isChrome || browserInfo.isBrave || browserInfo.isEdge;
  
  return { isPWAMode: false, shouldShowButton: canInstall };
}

// Initialize PWA
export function initializePWA() {
  generateIconsAndManifest();
  
  const { isPWAMode, shouldShowButton } = checkPWAModeAndInstallability();
  
  if (!isPWAMode && shouldShowButton) {
    setTimeout(() => {
      const installBtn = document.getElementById('install-btn');
      if (installBtn) {
        installBtn.style.display = 'block';
        installBtn.disabled = false;
        installBtn.textContent = 'PWAをインストール';
      }
    }, 1000);
  }
}

// Install PWA
export function installPWA() {
  if (browserInfo.isIOS && browserInfo.isSafari) {
    showIOSInstallInstructions();
  } else if (deferredPrompt) {
    const installBtn = document.getElementById('install-btn');
    if (installBtn) {
      installBtn.disabled = true;
      installBtn.textContent = 'インストール中...';
    }
    
    try {
      deferredPrompt.prompt();
      
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          if (installBtn) {
            installBtn.style.display = 'none';
          }
          showInstallSuccess();
        } else {
          if (installBtn) {
            installBtn.disabled = false;
            installBtn.textContent = 'PWAをインストール';
          }
        }
        deferredPrompt = null;
      }).catch((error) => {
        console.error('Install error:', error);
        if (installBtn) {
          installBtn.disabled = false;
          installBtn.textContent = 'PWAをインストール';
        }
        showChromeInstallInstructions();
      });
      
    } catch (error) {
      console.error('Prompt error:', error);
      if (installBtn) {
        installBtn.disabled = false;
        installBtn.textContent = 'PWAをインストール';
      }
      showChromeInstallInstructions();
    }
  } else if (browserInfo.isChrome || browserInfo.isBrave || browserInfo.isEdge) {
    showChromeInstallInstructions();
  } else {
    showManualInstallInstructions();
  }
}

// Show install instructions
function showIOSInstallInstructions() {
  const instructions = document.createElement('div');
  instructions.id = 'install-instructions';
  instructions.innerHTML = `
    <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-top: 16px;">
      <h3 style="margin-top: 0;">iOSでのインストール方法</h3>
      <ol style="text-align: left; margin: 0;">
        <li>画面下部の共有ボタンをタップ</li>
        <li>「ホーム画面に追加」を選択</li>
        <li>「追加」をタップして完了</li>
      </ol>
      <button onclick="closeInstructions()" style="margin-top: 12px; padding: 8px 16px; background: #1976d2; color: white; border: none; border-radius: 4px;">閉じる</button>
    </div>
  `;
  document.querySelector('.container').appendChild(instructions);
}

function showChromeInstallInstructions() {
  const instructions = document.createElement('div');
  instructions.id = 'install-instructions';
  instructions.innerHTML = `
    <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-top: 16px;">
      <h3 style="margin-top: 0;">Chrome/Braveでのインストール方法</h3>
      <ol style="text-align: left; margin: 0;">
        <li>アドレスバー右端のインストールアイコンをクリック</li>
        <li>「インストール」をクリック</li>
        <li>インストール完了</li>
      </ol>
      <button onclick="closeInstructions()" style="margin-top: 12px; padding: 8px 16px; background: #1976d2; color: white; border: none; border-radius: 4px;">閉じる</button>
    </div>
  `;
  document.querySelector('.container').appendChild(instructions);
}

function showManualInstallInstructions() {
  const instructions = document.createElement('div');
  instructions.id = 'install-instructions';
  instructions.innerHTML = `
    <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-top: 16px;">
      <h3 style="margin-top: 0;">手動インストール方法</h3>
      <p style="text-align: left; margin: 0;">ブラウザのメニューから「ホーム画面に追加」または「アプリをインストール」を選択してください。</p>
      <button onclick="closeInstructions()" style="margin-top: 12px; padding: 8px 16px; background: #1976d2; color: white; border: none; border-radius: 4px;">閉じる</button>
    </div>
  `;
  document.querySelector('.container').appendChild(instructions);
}

function showInstallSuccess() {
  const msg = document.createElement('div');
  msg.innerHTML = 'インストールが完了しました。<br>ホーム画面からアプリを起動すると物件一覧画面に移動します。';
  msg.style.marginTop = '24px';
  msg.style.color = '#1976d2';
  msg.style.fontWeight = 'bold';
  document.querySelector('.container').appendChild(msg);
}

// Global functions
window.closeInstructions = function() {
  const instructions = document.getElementById('install-instructions');
  if (instructions) {
    instructions.remove();
  }
};

window.installPWA = installPWA;

// Event listeners
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  isInstallable = true;
  
  setTimeout(() => {
    const installBtn = document.getElementById('install-btn');
    if (installBtn) {
      installBtn.style.display = 'block';
      installBtn.disabled = false;
      installBtn.textContent = 'PWAをインストール';
    }
  }, 500);
});

window.addEventListener('appinstalled', (e) => {
  const installBtn = document.getElementById('install-btn');
  if (installBtn) {
    installBtn.style.display = 'none';
  }
  showInstallSuccess();
  deferredPrompt = null;
});

// Page visibility handling
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    setTimeout(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const isPWAFromParam = urlParams.get('pwa') === 'true';
      
      if (browserInfo.isPWAMode() || isPWAFromParam) {
        window.location.replace('/property_select');
      }
    }, 100);
  }
});

// Service Worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered successfully');
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });
  });
}