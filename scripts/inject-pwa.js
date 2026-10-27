const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '../dist');
const ASSETS_DIR = path.join(__dirname, '../assets');
const ICON_SOURCE = path.join(ASSETS_DIR, 'logo.png');
const ICON_DEST = path.join(DIST_DIR, 'logo.png');
const MANIFEST_PATH = path.join(DIST_DIR, 'manifest.json');
const INDEX_HTML_PATH = path.join(DIST_DIR, 'index.html');

// 1. Copy Icon
console.log('Copying logo...');
if (fs.existsSync(ICON_SOURCE)) {
    fs.copyFileSync(ICON_SOURCE, ICON_DEST);
    console.log('Icon copied to dist/logo.png');
} else {
    console.error('Error: Source logo not found at', ICON_SOURCE);
    process.exit(1);
}

// 2. Generate Manifest
console.log('Generating manifest.json...');
const manifest = {
    "short_name": "DiscAnalytix",
    "name": "DiscAnalytix",
    "icons": [
        {
            "src": "logo.png",
            "sizes": "192x192",
            "type": "image/png"
        },
        {
            "src": "logo.png",
            "sizes": "512x512",
            "type": "image/png"
        }
    ],
    "start_url": "/",
    "display": "standalone",
    "theme_color": "#0A84FF",
    "background_color": "#121212"
};

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
console.log('manifest.json created');

// 3. Inject into index.html
console.log('Injecting tags into index.html...');
let html = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

// Remove existing manifest/icon/viewport links if any to avoid duplicates
html = html.replace(/<link rel="manifest".*?>/g, '');
html = html.replace(/<link rel="apple-touch-icon".*?>/g, '');
html = html.replace(/<link rel="icon".*?>/g, '');
html = html.replace(/<meta name="viewport".*?>/g, '');

// Inject new tags
const tagsToInject = `
<link rel="manifest" href="/manifest.json">
<link rel="apple-touch-icon" href="/logo.png">
<link rel="icon" href="/logo.png">
<meta name="theme-color" content="#0A84FF">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
`;

// Inject before </head>
html = html.replace('</head>', `${tagsToInject}</head>`);

fs.writeFileSync(INDEX_HTML_PATH, html);
console.log('index.html updated');

console.log('PWA injection complete!');
