const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

const projectId = 'demo-moreira';
const email = 'admin@moreira.test';
const password = 'MoreiraDev123!';
const name = 'Administrador de Teste';

process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

const app = initializeApp({ projectId });
const auth = getAuth(app);

async function seedAdmin() {
  let user;

  try {
    user = await auth.getUserByEmail(email);
    user = await auth.updateUser(user.uid, { password, displayName: name });
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    user = await auth.createUser({ email, password, displayName: name });
  }

  await getFirestore(app)
    .doc(`companies/moreira/users/${user.uid}`)
    .set({
      username: email,
      name,
      role: 'admin',
      active: 1,
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true });

  console.log(`Emulator admin ready: ${email} (${user.uid})`);
}

seedAdmin()
  .catch((error) => {
    console.error('Failed to seed the local emulator admin:', error);
    process.exitCode = 1;
  })
  .finally(() => app.delete());
