const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.ico': 'image/x-icon'
};

function getLocalIpAddresses() {
  const nets = os.networkInterfaces();
  const results = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push(net.address);
      }
    }
  }
  return results;
}

const server = http.createServer((req, res) => {
  // Live-Speicherung aus dem Entwickler-Bereich direkt in die Projektdateien
  if (req.method === 'POST' && req.url === '/api/save-catalogs') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString('utf8');
    });
    req.on('end', () => {
      try {
        const catalogs = JSON.parse(body);
        if (!Array.isArray(catalogs)) throw new Error('Ungültiges Format');
        const jsonPath = path.join(ROOT, 'data', 'frageboegen.json');
        const jsPath = path.join(ROOT, 'data', 'defaultCatalogs.js');

        fs.writeFileSync(jsonPath, JSON.stringify(catalogs, null, 2), 'utf8');
        const jsContent = `/**\n * Automatisch aktualisierte Standard-Fragebögen\n */\nwindow.DEFAULT_CATALOGS = ${JSON.stringify(catalogs, null, 2)};\n`;
        fs.writeFileSync(jsPath, jsContent, 'utf8');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';

  const safePath = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(ROOT, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Nicht gefunden');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIpAddresses();
  console.log('==========================================================');
  console.log('🚒 FEUERWEHR PRÜFUNGS- & AUSBILDUNGS-TRAINER GESTARTET');
  console.log('==========================================================');
  console.log(`👉 Auf diesem PC öffnen:     http://localhost:${PORT}`);
  if (ips.length > 0) {
    ips.forEach(ip => {
      console.log(`📱 Im WLAN auf Handy öffnen: http://${ip}:${PORT}`);
    });
  }
  console.log('----------------------------------------------------------');
  console.log('Entwickler-Bereich PIN in der App: 1120');
  console.log('Änderungen im Entwickler-Bereich werden automatisch in');
  console.log('data/frageboegen.json und data/defaultCatalogs.js gespeichert!');
  console.log('==========================================================');
});
