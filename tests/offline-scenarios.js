import * as api from '../src/lib/firestore';
import * as local from '../src/offline/firestore';
import * as authApi from '../src/offline/auth';
import { auth } from '../src/lib/firebase';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function rejects(callback, message) {
  try {
    await callback();
  } catch {
    return;
  }
  throw new Error(message);
}

export async function run(phase) {
  const results = [];
  await new Promise((resolve, reject) => {
    const unsubscribe = authApi.onAuthStateChanged(auth, () => {
      unsubscribe();
      resolve();
    }, reject);
  });
  if (phase === 'verify') {
    assert(auth.currentUser?.uid === 'demo_admin', 'Session did not survive process restart.');
    const clients = await api.getClients({ search: 'Cliente Offline' });
    assert(clients.total === 1, 'Client did not survive process restart.');
    const client = await api.getClient(clients.clients[0].id);
    assert(client.vehicles.length === 1 && client.serviceOrders.length === 1, 'Related data not persisted.');
    const order = await api.getServiceOrder(client.serviceOrders[0].id);
    assert(order.status === 'entregue', 'Order status not persisted.');
    const photos = await api.getPhotos(order.id);
    assert(photos.length === 2 && photos.every(photo => photo.downloadUrl.startsWith('data:image/')), 'Offline photos not persisted.');
    assert((await api.getSettings()).name === 'Oficina Demonstracao', 'Settings not persisted.');
    results.push('session, client, vehicle, order, photo and settings persist across process restart');
    return results;
  }

  assert(window.isSecureContext, 'Desktop scheme must be a secure context.');
  await rejects(() => authApi.signInWithEmailAndPassword(auth, 'admin@moreira.test', 'wrong-password'),
    'Invalid password was accepted.');
  await authApi.signInWithEmailAndPassword(auth, 'admin@moreira.test', 'MoreiraDev123!');
  assert((await api.getUser('demo_admin')).role === 'admin', 'Demo admin missing.');
  results.push('first launch and password verification without internet');

  const client = await api.createClient({ name: 'Cliente Offline', phone: '11999999999' });
  const vehicle = await api.createVehicle({
    client_id: client.id, make: 'Peugeot', model: '208', plate: 'ABC1D23', year: '2024',
  });
  const budget = await api.createBudget({
    client_id: client.id, vehicle_id: vehicle.id,
    items: [{ description: 'Revisao da direcao', quantity: 1, unit_price: 250 }],
  }, 'demo_admin', 'Administrador');
  const budgetDetails = await api.getBudget(budget.id);
  assert(budgetDetails.items[0].unit_price === 250 && budgetDetails.total === 250, 'Budget totals incorrect.');
  const order = await api.createServiceOrder({
    client_id: client.id, vehicle_id: vehicle.id, budget_id: budget.id,
  }, 'demo_admin', 'Administrador');
  await rejects(() => api.createServiceOrder({
    client_id: client.id, vehicle_id: vehicle.id, budget_id: budget.id,
  }, 'demo_admin', 'Administrador'), 'Budget converted twice.');
  await api.updateOrderStatus(order.id, { status: 'em_andamento' }, 'demo_admin', 'Administrador');
  await api.updateOrderStatus(order.id, { status: 'concluida' }, 'demo_admin', 'Administrador');
  await api.updateOrderStatus(order.id, { status: 'entregue' }, 'demo_admin', 'Administrador');
  assert((await api.getServiceOrder(order.id)).items.length === 1, 'Order items missing.');
  results.push('client, vehicle, budget, atomic conversion, duplicate prevention and complete order lifecycle');

  const picture = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP9kAAAAASUVORK5CYII=';
  await api.uploadPhotos(order.id, [new File([
    Uint8Array.from(atob(picture.split(',')[1]), character => character.charCodeAt(0)),
  ], 'teste.png', { type: 'image/png' })], { phase: 'entrada', label: 'Foto offline' }, 'demo_admin', 'Administrador');
  assert((await api.getPhotos(order.id)).length === 1, 'Photo upload failed.');
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const pixels = context.createImageData(256, 256);
  for (let offset = 0; offset < pixels.data.length; offset += 65536) {
    crypto.getRandomValues(pixels.data.subarray(offset, offset + 65536));
  }
  context.putImageData(pixels, 0, 0);
  const largeImage = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  assert(largeImage.size > 80 * 1024, 'Compression test image too small.');
  await api.uploadPhotos(order.id, [new File([largeImage], 'compressao.png', { type: 'image/png' })],
    { phase: 'saida', label: 'Compressao offline' }, 'demo_admin', 'Administrador');
  assert((await api.getPhotos(order.id)).length === 2, 'Photo compression/upload without network failed.');
  const dashboard = await api.getDashboard();
  assert(dashboard.totalClients === 1 && dashboard.revenue === 250, 'Dashboard values incorrect.');
  const now = new Date();
  const report = await api.getMonthlyReport(now.getMonth() + 1, now.getFullYear());
  assert(report.revenue === 250 && report.totals.entregues === 1, 'Report values incorrect.');
  await api.updateSettings({ name: 'Oficina Demonstracao', phone: '11999999999' });
  results.push('offline photos, dashboard, reports and settings');

  const ref = local.doc({}, 'tests/rollback');
  const batch = local.writeBatch();
  batch.set(ref, { value: 1 });
  batch.update(local.doc({}, 'tests/missing'), { value: 2 });
  await rejects(() => batch.commit(), 'Invalid batch should fail.');
  assert(!(await local.getDoc(ref)).exists(), 'Batch was partially committed.');
  await rejects(() => local.runTransaction({}, async transaction => {
    transaction.set(ref, { value: 2 });
    throw new Error('intentional rollback');
  }), 'Transaction should fail.');
  assert(!(await local.getDoc(ref)).exists(), 'Transaction was partially committed.');
  const ordered = await api.getClients();
  assert(ordered.clients[0].id === client.id, 'Collection reference IDs incorrect.');
  results.push('atomic batch/transaction rollback and query IDs');

  const secondaryAuth = authApi.getAuth({ name: 'secondary' });
  const account = await authApi.createUserWithEmailAndPassword(secondaryAuth, 'tecnico@moreira.app', 'Tecnico123!');
  await api.createUserDoc(account.user.uid, { username: 'tecnico', name: 'Tecnico Offline', role: 'tecnico' });
  await authApi.signOut(auth);
  await authApi.signInWithEmailAndPassword(auth, 'tecnico@moreira.app', 'Tecnico123!');
  await authApi.reauthenticateWithCredential(auth.currentUser,
    authApi.EmailAuthProvider.credential('tecnico@moreira.app', 'Tecnico123!'));
  await authApi.updatePassword(auth.currentUser, 'NovaSenha123!');
  await authApi.signOut(auth);
  await rejects(() => authApi.signInWithEmailAndPassword(auth, 'tecnico@moreira.app', 'Tecnico123!'), 'Old password accepted.');
  await authApi.signInWithEmailAndPassword(auth, 'tecnico@moreira.app', 'NovaSenha123!');
  await api.updateUser(account.user.uid, { active: 0 });
  await authApi.signOut(auth);
  await rejects(() => authApi.signInWithEmailAndPassword(auth, 'tecnico@moreira.app', 'NovaSenha123!'),
    'Inactive user accepted.');
  await authApi.signInWithEmailAndPassword(auth, 'admin@moreira.test', 'MoreiraDev123!');
  results.push('local user creation, password changes, inactive-user rejection and logout/login');
  return results;
}
