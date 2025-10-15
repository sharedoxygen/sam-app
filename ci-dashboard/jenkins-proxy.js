/**
 * Jenkins API Proxy Server
 * Handles authentication and CSRF exactly like trigger-builds.sh
 */

const http = require('http');
const https = require('https');
const url = require('url');
const path = require('path');
const fs = require('fs');

// Jenkins configuration (same as trigger-builds.sh)
const JENKINS_URL = process.env.JENKINS_URL || 'http://localhost:9080';
const JENKINS_USER = process.env.JENKINS_USER || 'admin';
const JENKINS_PASSWORD = process.env.JENKINS_PASSWORD || 'changeme';
const PORT = process.env.JENKINS_PROXY_PORT || 7005;

// Store session cookies and crumb data
let sessionData = {
  cookies: '',
  crumb: '',
  crumbField: 'Jenkins-Crumb',
};

/**
 * Make authenticated request to Jenkins (like trigger-builds.sh)
 */
function makeJenkinsRequest(jenkinsPath, method = 'GET', headers = {}) {
  return new Promise((resolve, reject) => {
    const jenkinsUrl = new URL(jenkinsPath, JENKINS_URL);
    const auth = Buffer.from(`${JENKINS_USER}:${JENKINS_PASSWORD}`).toString('base64');

    const options = {
      hostname: jenkinsUrl.hostname,
      port: jenkinsUrl.port,
      path: jenkinsUrl.pathname + jenkinsUrl.search,
      method: method,
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
        ...headers,
      },
    };

    // Add session cookies if available
    if (sessionData.cookies) {
      options.headers['Cookie'] = sessionData.cookies;
    }

    // Add CSRF crumb for POST requests
    if (method === 'POST' && sessionData.crumb) {
      options.headers[sessionData.crumbField] = sessionData.crumb;
    }

    const req = http.request(options, (res) => {
      let data = '';

      // Capture set-cookie headers
      if (res.headers['set-cookie']) {
        sessionData.cookies = res.headers['set-cookie'].join('; ');
      }

      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Get CSRF crumb (exactly like get_crumb_with_session in trigger-builds.sh)
 */
async function getCrumbWithSession() {
  try {
    console.log('🔐 Getting CSRF crumb with session...');

    const response = await makeJenkinsRequest('/crumbIssuer/api/json');

    if (response.statusCode === 200) {
      const crumbData = JSON.parse(response.data);
      sessionData.crumb = crumbData.crumb;
      sessionData.crumbField = crumbData.crumbRequestField;

      console.log(`✅ CSRF crumb obtained: ${sessionData.crumb.substring(0, 16)}...`);
      console.log(`✅ Crumb field: ${sessionData.crumbField}`);

      return true;
    } else {
      console.error(`❌ Failed to get crumb: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error getting CSRF crumb:', error.message);
    return false;
  }
}

/**
 * Handle proxy requests
 */
async function handleProxyRequest(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    const parsedUrl = url.parse(req.url, true);
    const jenkinePath = parsedUrl.pathname.replace('/jenkins-proxy', '');

    console.log(`📡 Proxying ${req.method} ${jenkinePath}`);

    // Ensure we have a valid CSRF crumb for POST requests
    if (req.method === 'POST') {
      const crumbSuccess = await getCrumbWithSession();
      if (!crumbSuccess) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to get CSRF crumb' }));
        return;
      }
    }

    // Make the request to Jenkins
    const response = await makeJenkinsRequest(jenkinePath, req.method);

    // Forward response
    res.writeHead(response.statusCode, {
      'Content-Type': response.headers['content-type'] || 'application/json',
    });
    res.end(response.data);

    console.log(`✅ Response: ${response.statusCode}`);
  } catch (error) {
    console.error('❌ Proxy error:', error.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Proxy request failed' }));
  }
}

/**
 * Serve static files
 */
function serveStaticFile(req, res) {
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;

  // Default to index.html
  if (pathname === '/') {
    pathname = '/index.html';
  }

  const filePath = path.join(__dirname, pathname);

  // Security check - ensure file is within dashboard directory
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('File not found');
      return;
    }

    // Set content type based on file extension
    const ext = path.extname(filePath);
    const contentTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
    };

    res.writeHead(200, {
      'Content-Type': contentTypes[ext] || 'text/plain',
    });
    res.end(data);
  });
}

/**
 * Main request handler
 */
function requestHandler(req, res) {
  const parsedUrl = url.parse(req.url);

  if (parsedUrl.pathname.startsWith('/jenkins-proxy')) {
    handleProxyRequest(req, res);
  } else {
    serveStaticFile(req, res);
  }
}

/**
 * Start the server
 */
async function startServer() {
  console.log('\n🚀 Starting Jenkins CI/CD Dashboard Proxy Server');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Test Jenkins connection
  console.log('🔍 Testing Jenkins connection...');
  try {
    const response = await makeJenkinsRequest('/api/json');
    if (response.statusCode === 200) {
      console.log('✅ Jenkins connection successful');
    } else {
      console.log(`⚠️  Jenkins returned status: ${response.statusCode}`);
    }
  } catch (error) {
    console.log('❌ Jenkins connection failed:', error.message);
  }

  // Get initial CSRF crumb
  await getCrumbWithSession();

  // Start HTTP server
  const server = http.createServer(requestHandler);

  server.listen(PORT, () => {
    console.log('\n✅ Server Started Successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🌐 Dashboard URL: http://localhost:${PORT}`);
    console.log(`🔗 Jenkins Proxy: http://localhost:${PORT}/jenkins-proxy`);
    console.log(`🎯 Jenkins Target: ${JENKINS_URL}`);
    console.log(`👤 Authentication: ${JENKINS_USER}:${JENKINS_PASSWORD}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 Dashboard Features:');
    console.log('  • Real-time build monitoring');
    console.log('  • Trigger individual/bulk builds');
    console.log('  • Abort builds');
    console.log('  • View build logs');
    console.log('  • Activity history');
    console.log('\n🔧 Same authentication as trigger-builds.sh');
    console.log('  • Session cookies');
    console.log('  • Basic authentication');
    console.log('  • CSRF protection');
    console.log('\n🎯 Press Ctrl+C to stop server');
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down server...');
    server.close(() => {
      console.log('✅ Server stopped');
      process.exit(0);
    });
  });
}

// Start the server
startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
