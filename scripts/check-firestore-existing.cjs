const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');

const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const refreshToken = cfg.tokens.refresh_token;

function getFreshAccessToken() {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
      grant_type: 'refresh_token',
    }).toString();

    const req = https.request('https://www.googleapis.com/oauth2/v3/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.access_token) resolve(parsed.access_token);
          else reject(new Error('Falha token: ' + data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function listDocs(token, colName) {
  return new Promise((resolve, reject) => {
    const url = `https://firestore.googleapis.com/v1/projects/moreira-direcoes/databases/(default)/documents/companies/moreira/${colName}?pageSize=100`;
    const req = https.request(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.documents || []);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  const token = await getFreshAccessToken();
  console.log('Token OK');

  for (const col of ['clients', 'vehicles', 'budgets', 'serviceOrders', 'settings']) {
    const docs = await listDocs(token, col);
    console.log(`Coleção ${col}: ${docs.length} documentos`);
    if (docs.length > 0) {
      console.log(`  Exemplo de ID: ${docs[0].name.split('/').pop()}`);
    }
  }
}

run().catch(console.error);

