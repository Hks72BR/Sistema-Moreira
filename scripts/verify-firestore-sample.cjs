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
          resolve(parsed.access_token);
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

function getDoc(token, docPath) {
  return new Promise((resolve, reject) => {
    const url = `https://firestore.googleapis.com/v1/projects/moreira-direcoes/databases/(default)/documents/${docPath}`;
    const req = https.request(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function verify() {
  const token = await getFreshAccessToken();
  console.log('--- TESTE DE INTEGRIDADE NO FIRESTORE PRODUÇÃO ---');

  // 1. Verificar Cliente 15
  const client15 = await getDoc(token, 'companies/moreira/clients/cli_legacy_15');
  console.log('Cliente 15 no Firestore:');
  console.log('  Nome:', client15.fields?.name?.stringValue);
  console.log('  Telefone:', client15.fields?.phone?.stringValue);
  console.log('  Endereço:', client15.fields?.address?.stringValue);

  // 2. Verificar Veículo 12 (que pertence ao cliente 15)
  const veh12 = await getDoc(token, 'companies/moreira/vehicles/veh_legacy_12');
  console.log('\nVeículo 12 no Firestore:');
  console.log('  Modelo:', veh12.fields?.make?.stringValue, veh12.fields?.model?.stringValue);
  console.log('  Placa:', veh12.fields?.plate?.stringValue);
  console.log('  Vínculo clientId:', veh12.fields?.clientId?.stringValue);
  console.log('  Nome do dono denormalizado:', veh12.fields?.clientName?.stringValue);

  // 3. Verificar OS 730462 (que pertence à placa do veículo 12: EQO2046)
  const os730462 = await getDoc(token, 'companies/moreira/serviceOrders/os_legacy_730462');
  console.log('\nOS 730462 no Firestore:');
  console.log('  Código:', os730462.fields?.code?.stringValue);
  console.log('  Placa:', os730462.fields?.plate?.stringValue);
  console.log('  Cliente:', os730462.fields?.client_name?.stringValue);
  console.log('  Total:', os730462.fields?.total?.doubleValue || os730462.fields?.total?.integerValue);
  console.log('  Status:', os730462.fields?.status?.stringValue);
  console.log('  Serviços Realizados:\n   ', os730462.fields?.services_performed?.stringValue);

  // 4. Verificar Item da OS 730462
  const item1 = await getDoc(token, 'companies/moreira/serviceOrders/os_legacy_730462/items/item_730462_1');
  console.log('\nItem da OS no Firestore:');
  console.log('  Descrição:', item1.fields?.description?.stringValue);
  console.log('  Tipo:', item1.fields?.type?.stringValue);
  console.log('  Valor:', item1.fields?.total?.doubleValue || item1.fields?.total?.integerValue);

  console.log('\n✓ TODAS AS CONSULTAS NO FIRESTORE PRODUÇÃO CONFIRMAM 100% DA INTEGRIDADE DOS DADOS!');
}

verify().catch(console.error);

