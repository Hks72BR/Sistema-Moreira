const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
const certificate = fs.readFileSync(path.join(repositoryRoot, 'certs', 'lan.pem'));
const privateKey = fs.readFileSync(path.join(repositoryRoot, 'certs', 'lan-key.pem'));
const tlsOptions = { cert: certificate, key: privateKey };

function createEmulatorProxy(securePort, emulatorPort, emulatorName) {
  const server = https.createServer(tlsOptions, (request, response) => {
    const upstream = http.request({
      hostname: '127.0.0.1',
      port: emulatorPort,
      method: request.method,
      path: request.url,
      headers: {
        ...request.headers,
        host: `127.0.0.1:${emulatorPort}`,
      },
    }, (upstreamResponse) => {
      response.writeHead(
        upstreamResponse.statusCode,
        upstreamResponse.statusMessage,
        upstreamResponse.headers,
      );
      upstreamResponse.pipe(response);
    });

    upstream.on('error', (error) => {
      console.error(`${emulatorName} HTTPS proxy failed:`, error.message);
      if (!response.headersSent) {
        response.writeHead(502, { 'content-type': 'application/json' });
      }
      response.end(JSON.stringify({ error: `${emulatorName} emulator is unavailable.` }));
    });

    request.pipe(upstream);
  });

  server.listen(securePort, '0.0.0.0', () => {
    console.log(`${emulatorName} HTTPS proxy listening on 0.0.0.0:${securePort}`);
  });
}

createEmulatorProxy(9443, 9099, 'Firebase Auth');
createEmulatorProxy(9444, 8080, 'Firestore');

const certificatePath = path.join(repositoryRoot, 'public', 'dev-root-ca.cer');
const certificateServer = http.createServer((request, response) => {
  if (request.method !== 'GET' || request.url !== '/dev-root-ca.cer') {
    response.writeHead(404);
    response.end();
    return;
  }

  response.writeHead(200, {
    'content-type': 'application/pkix-cert',
    'content-length': fs.statSync(certificatePath).size,
    'content-disposition': 'attachment; filename="dev-root-ca.cer"',
    'cache-control': 'no-store',
  });
  fs.createReadStream(certificatePath).pipe(response);
});

certificateServer.listen(5174, '0.0.0.0', () => {
  console.log('Local CA certificate download listening on 0.0.0.0:5174');
});
