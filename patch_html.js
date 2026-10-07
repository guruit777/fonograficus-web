const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

const headInject = `
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="manifest" href="/manifest.json">
  <link rel="apple-touch-icon" href="/icon.png">
  <meta name="theme-color" content="#0f172a">
`;

html = html.replace('</head>', headInject + '</head>');

// Hide window controls since we are on mobile web
html = html.replace('class="window-actions no-drag"', 'class="window-actions no-drag" style="display: none;"');

fs.writeFileSync('public/index.html', html);
console.log('index.html modified for PWA!');
