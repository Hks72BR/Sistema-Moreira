const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');

const dir = path.resolve(__dirname, '..', 'migration', 'prepared');
const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const refreshToken = cfg.tokens.refresh_token;

let cachedToken = null;
let tokenExpiry = 0;

function getFreshAccessToken() {
  if (cachedToken && tokenExpiry > Date.now() + 5 * 60 * 1000) {
    return Promise.resolve(cachedToken);
  }
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
          if (parsed.access_token) {
            cachedToken = parsed.access_token;
            tokenExpiry = Date.now() + (parsed.expires_in || 3600) * 1000;
            resolve(cachedToken);
          } else {
            reject(new Error('Falha ao obter token: ' + data));
          }
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

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(val)) {
      return { timestampValue: val };
    }
    return { stringValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k !== 'id' && k !== 'orderId' && k !== 'itemId' && v !== undefined) {
      fields[k] = toFirestoreValue(v);
    }
  }
  return fields;
}

function postBatchWrite(token, writes, retries = 3) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify({ writes });
    const req = https.request('https://firestore.googleapis.com/v1/projects/moreira-direcoes/databases/(default)/documents:batchWrite', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', async () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else if (retries > 0 && (res.statusCode === 503 || res.statusCode === 500 || res.statusCode === 429)) {
            console.warn(`Retry batch (${retries} tentativas restantes)...`);
            await new Promise(r => setTimeout(r, 2000));
            resolve(await postBatchWrite(token, writes, retries - 1));
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', async err => {
      if (retries > 0) {
        console.warn(`Network retry (${retries} tentativas restantes)...`);
        await new Promise(r => setTimeout(r, 2000));
        resolve(await postBatchWrite(token, writes, retries - 1));
      } else {
        reject(err);
      }
    });
    req.write(bodyStr);
    req.end();
  });
}

async function uploadInChunks(name, items, buildDocPath, chunkSize = 350) {
  console.log(`\n========================================`);
  console.log(`INICIANDO ENVIO: ${name} (${items.length} documentos)`);
  console.log(`========================================`);

  const totalChunks = Math.ceil(items.length / chunkSize);
  let totalUploaded = 0;

  for (let i = 0; i < totalChunks; i++) {
    const chunk = items.slice(i * chunkSize, (i + 1) * chunkSize);
    const token = await getFreshAccessToken();

    const writes = chunk.map(item => ({
      update: {
        name: buildDocPath(item),
        fields: toFirestoreFields(item)
      }
    }));

    const startTime = Date.now();
    await postBatchWrite(token, writes);
    totalUploaded += chunk.length;
    const elapsed = Date.now() - startTime;

    const pct = ((totalUploaded / items.length) * 100).toFixed(1);
    console.log(`[${name}] Lote ${i + 1}/${totalChunks} enviado (${chunk.length} docs, ${elapsed}ms) — Progresso: ${totalUploaded}/${items.length} (${pct}%)`);
  }

  console.log(`✓ SUCESSO: Todos os ${totalUploaded} documentos de ${name} foram gravados no Firestore!`);
}

async function run() {
  console.log('=== MIGRAÇÃO SEGURA: BANCO DE DADOS ANTIGO -> MOREIRA DIREÇÕES ===');
  console.log('Projeto: moreira-direcoes (Google Cloud Firestore)');
  console.log('Iniciando...\n');

  // Carregar dados preparados
  const clients = JSON.parse(fs.readFileSync(path.join(dir, 'clients.json'), 'utf8'));
  const vehicles = JSON.parse(fs.readFileSync(path.join(dir, 'vehicles.json'), 'utf8'));
  const orders = JSON.parse(fs.readFileSync(path.join(dir, 'serviceOrders.json'), 'utf8'));
  const orderItems = JSON.parse(fs.readFileSync(path.join(dir, 'orderItems.json'), 'utf8'));

  const startTime = Date.now();

  // 1. Clientes
  await uploadInChunks('Clientes', clients, (c) => {
    return `projects/moreira-direcoes/databases/(default)/documents/companies/moreira/clients/${c.id}`;
  });

  // 2. Veículos
  await uploadInChunks('Veículos', vehicles, (v) => {
    return `projects/moreira-direcoes/databases/(default)/documents/companies/moreira/vehicles/${v.id}`;
  });

  // 3. Ordens de Serviço
  await uploadInChunks('Ordens de Serviço', orders, (o) => {
    return `projects/moreira-direcoes/databases/(default)/documents/companies/moreira/serviceOrders/${o.id}`;
  });

  // 4. Itens das Ordens de Serviço
  await uploadInChunks('Itens das Ordens de Serviço', orderItems, (it) => {
    return `projects/moreira-direcoes/databases/(default)/documents/companies/moreira/serviceOrders/${it.orderId}/items/${it.itemId}`;
  });

  const totalTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n======================================================');
  console.log('🎉 MIGRAÇÃO CONCLUÍDA COM 100% DE SUCESSO!');
  console.log(`Tempo total: ${totalTimeSeconds}s`);
  console.log(`- Clientes gravados: ${clients.length}`);
  console.log(`- Veículos gravados: ${vehicles.length}`);
  console.log(`- Ordens de Serviço gravadas: ${orders.length}`);
  console.log(`- Itens de Serviço/Peças gravados: ${orderItems.length}`);
  console.log('======================================================\n');
}

run().catch(err => {
  console.error('\n❌ ERRO NA MIGRAÇÃO:', err);
  process.exit(1);
});

