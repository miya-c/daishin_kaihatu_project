/**
 * generate-icons.js - PWA用アイコン生成スクリプト
 * 水道検針アプリのアイコンを各サイズで生成
 */

// Node.js環境でのみ実行（実際の運用時）
let fs, path;
if (typeof require !== 'undefined') {
  fs = require('fs');
  path = require('path');
}

/**
 * SVGアイコンの生成
 */
function generateSVGIcon(size, color = '#007bff') {
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.125}" fill="${color}"/>
  <g transform="translate(${size * 0.25}, ${size * 0.25})">
    <circle cx="${size * 0.25}" cy="${size * 0.25}" r="${size * 0.2}" fill="white" stroke="white" stroke-width="2"/>
    <path d="M${size * 0.15} ${size * 0.25} L${size * 0.35} ${size * 0.25} M${size * 0.25} ${size * 0.15} L${size * 0.25} ${size * 0.35}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
    <text x="${size * 0.25}" y="${size * 0.45}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="${size * 0.1}" font-weight="bold">H₂O</text>
  </g>
</svg>`.trim();
}

/**
 * maskableアイコンの生成
 */
function generateMaskableSVGIcon(size, color = '#007bff') {
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${color}"/>
  <g transform="translate(${size * 0.2}, ${size * 0.2})">
    <circle cx="${size * 0.3}" cy="${size * 0.3}" r="${size * 0.25}" fill="white" stroke="white" stroke-width="3"/>
    <path d="M${size * 0.15} ${size * 0.3} L${size * 0.45} ${size * 0.3} M${size * 0.3} ${size * 0.15} L${size * 0.3} ${size * 0.45}" stroke="${color}" stroke-width="4" stroke-linecap="round"/>
    <text x="${size * 0.3}" y="${size * 0.55}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="${size * 0.12}" font-weight="bold">H₂O</text>
  </g>
</svg>`.trim();
}

/**
 * アイコンサイズの定義
 */
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
const maskableSizes = [192, 512];

/**
 * アイコンディレクトリの確認・作成
 */
function ensureIconDirectory() {
  const iconDir = path.join(__dirname, 'icons');
  if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir, { recursive: true });
  }
  return iconDir;
}

/**
 * アイコンファイルの生成
 */
function generateIconFiles() {
  const iconDir = ensureIconDirectory();
  
  // 通常のアイコン
  iconSizes.forEach(size => {
    const svgContent = generateSVGIcon(size);
    const filename = `icon-${size}x${size}.svg`;
    const filepath = path.join(iconDir, filename);
    
    fs.writeFileSync(filepath, svgContent);
    console.log(`Generated: ${filename}`);
  });
  
  // maskableアイコン
  maskableSizes.forEach(size => {
    const svgContent = generateMaskableSVGIcon(size);
    const filename = `icon-${size}x${size}-maskable.svg`;
    const filepath = path.join(iconDir, filename);
    
    fs.writeFileSync(filepath, svgContent);
    console.log(`Generated: ${filename}`);
  });
  
  // ショートカット用アイコン
  const shortcutIcons = {
    'shortcut-property.svg': generateSVGIcon(192, '#28a745'),
    'shortcut-recent.svg': generateSVGIcon(192, '#ffc107')
  };
  
  Object.entries(shortcutIcons).forEach(([filename, svgContent]) => {
    const filepath = path.join(iconDir, filename);
    fs.writeFileSync(filepath, svgContent);
    console.log(`Generated: ${filename}`);
  });
}

/**
 * スプラッシュスクリーンの生成
 */
function generateSplashScreen() {
  const splashSVG = `
<svg width="750" height="1334" viewBox="0 0 750 1334" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="750" height="1334" fill="#f0f4f8"/>
  <g transform="translate(275, 567)">
    <circle cx="100" cy="100" r="80" fill="#007bff"/>
    <circle cx="100" cy="100" r="60" fill="white" stroke="#007bff" stroke-width="4"/>
    <path d="M60 100 L140 100 M100 60 L100 140" stroke="#007bff" stroke-width="6" stroke-linecap="round"/>
    <text x="100" y="160" text-anchor="middle" fill="#007bff" font-family="Arial, sans-serif" font-size="24" font-weight="bold">H₂O</text>
  </g>
  <text x="375" y="800" text-anchor="middle" fill="#007bff" font-family="Arial, sans-serif" font-size="32" font-weight="bold">水道検針アプリ</text>
  <text x="375" y="850" text-anchor="middle" fill="#6c757d" font-family="Arial, sans-serif" font-size="18">読み込み中...</text>
</svg>`.trim();
  
  const iconDir = ensureIconDirectory();
  const splashPath = path.join(iconDir, 'splash-screen.svg');
  
  fs.writeFileSync(splashPath, splashSVG);
  console.log('Generated: splash-screen.svg');
}

/**
 * ファビコンの生成
 */
function generateFavicon() {
  const faviconSVG = generateSVGIcon(32);
  const iconDir = ensureIconDirectory();
  const faviconPath = path.join(iconDir, 'favicon.svg');
  
  fs.writeFileSync(faviconPath, faviconSVG);
  console.log('Generated: favicon.svg');
}

/**
 * CSS用のアイコン参照を生成
 */
function generateIconCSS() {
  const css = `
/* PWA Icons CSS */
.pwa-icon {
  width: 24px;
  height: 24px;
  display: inline-block;
  background-image: url('/icons/icon-24x24.svg');
  background-size: contain;
  background-repeat: no-repeat;
}

.pwa-icon-large {
  width: 48px;
  height: 48px;
  display: inline-block;
  background-image: url('/icons/icon-48x48.svg');
  background-size: contain;
  background-repeat: no-repeat;
}

/* スプラッシュスクリーンのスタイル */
.splash-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #f0f4f8;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.splash-screen .logo {
  width: 120px;
  height: 120px;
  margin-bottom: 20px;
  background-image: url('/icons/icon-192x192.svg');
  background-size: contain;
  background-repeat: no-repeat;
}

.splash-screen .title {
  font-size: 24px;
  font-weight: bold;
  color: #007bff;
  margin-bottom: 10px;
}

.splash-screen .subtitle {
  font-size: 16px;
  color: #6c757d;
}
`;
  
  const cssPath = path.join(__dirname, 'css_styles', 'pwa-icons.css');
  fs.writeFileSync(cssPath, css);
  console.log('Generated: pwa-icons.css');
}

/**
 * HTMLでのアイコン使用例を生成
 */
function generateIconHTML() {
  const iconDir = ensureIconDirectory();
  const htmlPath = path.join(iconDir, 'icon-examples.html');
  
  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PWA Icons - 水道検針アプリ</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .icon-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; }
    .icon-item { text-align: center; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
    .icon-item img { max-width: 100%; height: auto; }
    .icon-item h3 { margin: 10px 0; font-size: 14px; }
  </style>
</head>
<body>
  <h1>PWA Icons - 水道検針アプリ</h1>
  <div class="icon-grid">
    ${iconSizes.map(size => `
      <div class="icon-item">
        <img src="icon-${size}x${size}.svg" alt="${size}x${size} icon">
        <h3>icon-${size}x${size}.svg</h3>
      </div>
    `).join('')}
    ${maskableSizes.map(size => `
      <div class="icon-item">
        <img src="icon-${size}x${size}-maskable.svg" alt="${size}x${size} maskable icon">
        <h3>icon-${size}x${size}-maskable.svg</h3>
      </div>
    `).join('')}
    <div class="icon-item">
      <img src="splash-screen.svg" alt="Splash screen" style="max-height: 200px;">
      <h3>splash-screen.svg</h3>
    </div>
  </div>
</body>
</html>
`;
  
  fs.writeFileSync(htmlPath, html);
  console.log('Generated: icon-examples.html');
}

/**
 * メイン実行関数
 */
function main() {
  console.log('PWA Icons Generation Started...');
  
  try {
    generateIconFiles();
    generateSplashScreen();
    generateFavicon();
    generateIconCSS();
    generateIconHTML();
    
    console.log('✅ PWA Icons Generation Completed!');
    console.log('');
    console.log('Generated files:');
    console.log('- SVG icons for all required sizes');
    console.log('- Maskable icons for adaptive icons');
    console.log('- Splash screen');
    console.log('- Favicon');
    console.log('- CSS file for easy integration');
    console.log('- HTML example file');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error);
  }
}

// Node.js環境でのみ実行
if (typeof require !== 'undefined' && require.main === module) {
  main();
}

// ブラウザ環境用のエクスポート
if (typeof window !== 'undefined') {
  window.IconGenerator = {
    generateSVGIcon,
    generateMaskableSVGIcon,
    iconSizes,
    maskableSizes
  };
}

console.log('[generate-icons.js] PWAアイコン生成スクリプト読み込み完了');