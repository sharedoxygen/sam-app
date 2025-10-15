#!/usr/bin/env node

/**
 * Simple HTTP server for the CI Dashboard
 * Run with: node serve.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || 'localhost';

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;

  // Default to index.html
  if (pathname === '/') {
    pathname = '/index.html';
  }

  const filePath = path.join(__dirname, pathname);
  const ext = path.extname(filePath);

  // Security check - prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
      return;
    }

    // Read and serve file
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal server error');
        return;
      }

      const contentType = mimeTypes[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      });
      res.end(data);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log('\n🚀 CI Dashboard Server Starting...\n');
  console.log('='.repeat(50));
  console.log(`📊 Sales Activity Manager`);
  console.log(`🔧 Jenkins CI/CD Dashboard`);
  console.log('='.repeat(50));
  console.log(`🌐 Server running at: http://${HOST}:${PORT}`);
  console.log(`📁 Serving from: ${__dirname}`);
  console.log(`🔄 Jenkins URL: http://localhost:9080`);
  console.log('='.repeat(50));
  console.log('\n📋 Available URLs:');
  console.log(`   Dashboard: http://${HOST}:${PORT}`);
  console.log(`   Jenkins:   http://localhost:9080`);
  console.log('\n🎯 Features:');
  console.log('   ✅ Real-time build status monitoring');
  console.log('   🚀 Trigger builds for any branch');
  console.log('   📝 View build logs');
  console.log('   🔄 Auto-refresh every 10 seconds');
  console.log('   🎨 Matches main app theme');
  console.log('\n⌨️  Keyboard Shortcuts:');
  console.log('   Ctrl+R - Refresh status');
  console.log('   Ctrl+T - Trigger all builds');
  console.log('   Ctrl+A - Abort all builds');
  console.log('\n💡 To stop the server, press Ctrl+C\n');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Try a different port:`);
    console.error(`   PORT=8081 node serve.js`);
  } else {
    console.error('❌ Server error:', err);
  }
});

process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down CI Dashboard server...');
  console.log('✅ Server stopped gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down CI Dashboard server...');
  console.log('✅ Server stopped gracefully');
  process.exit(0);
});
