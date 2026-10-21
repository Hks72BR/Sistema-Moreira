import { doc, getDoc, setDoc } from './firestore';
import { requestResult, withStore } from './database';

const listeners = new Set();
const primaryAuth = { currentUser: null };
const reference = path => doc({}, path);
const sessionRef = reference('_offline/session');
let initialization;

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2', hash: 'SHA-256',
    salt: new TextEncoder().encode(salt), iterations: 210000,
  }, key, 256);
  return Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function credentialData(uid, email, password) {
  if (!password || password.length < 6) throw new Error('Senha deve ter no minimo 6 caracteres.');
  const salt = crypto.randomUUID();
  return { uid, email, salt, hash: await passwordHash(password, salt) };
}

async function initializeLocalAuth() {
  const email = 'admin@moreira.test';
  const existing = await getDoc(reference(`_credentials/${email}`));
  if (!existing.exists()) {
    const credentials = await credentialData('demo_admin', email, 'MoreiraDev123!');
    await withStore('readwrite', async store => {
      if (await requestResult(store.get(`_credentials/${email}`))) return;
      await requestResult(store.put({ path: `_credentials/${email}`, data: credentials }));
      await requestResult(store.put({
        path: 'companies/moreira/users/demo_admin',
        data: {
          username: email, email, name: 'Administrador de Demonstracao',
          role: 'admin', active: 1, createdAt: new Date().toISOString(),
        },
      }));
    });
  }
  const session = await getDoc(sessionRef);
  primaryAuth.currentUser = session.data()?.user || null;
  if (primaryAuth.currentUser) {
    const profile = await getDoc(reference(`companies/moreira/users/${primaryAuth.currentUser.uid}`));
    if (!profile.exists() || !profile.data().active) {
      primaryAuth.currentUser = null;
      await setDoc(sessionRef, { user: null });
      console.warn('Sessao local encerrada: usuario inativo ou sem perfil.');
    }
  }
}

function ready() {
  initialization ||= initializeLocalAuth();
  return initialization;
}

export function getAuth(app) {
  if (app.name !== '[DEFAULT]') return { app, currentUser: null };
  primaryAuth.app = app;
  return primaryAuth;
}

export const browserSessionPersistence = 'SESSION';
export async function setPersistence() {}

export function connectAuthEmulator() {
  throw new Error('A demonstracao offline nao pode conectar a emuladores.');
}

function notify() {
  listeners.forEach(listener => listener.next(primaryAuth.currentUser));
}

export function onAuthStateChanged(auth, next, error) {
  const listener = { next, error };
  listeners.add(listener);
  ready().then(() => {
    if (listeners.has(listener)) next(auth.currentUser);
  }).catch(failure => {
    console.error('Falha ao abrir autenticacao local:', failure);
    if (listeners.has(listener)) error?.(failure);
  });
  return () => listeners.delete(listener);
}

async function verify(email, password) {
  const record = await getDoc(reference(`_credentials/${normalizeEmail(email)}`));
  const credentials = record.data();
  if (!credentials || await passwordHash(password, credentials.salt) !== credentials.hash) {
    throw new Error('Usuario ou senha incorretos.');
  }
  const profile = await getDoc(reference(`companies/moreira/users/${credentials.uid}`));
  if (!profile.exists() || !profile.data().active) throw new Error('Usuario inativo ou sem perfil local.');
  return credentials;
}

export async function signInWithEmailAndPassword(auth, email, password) {
  await ready();
  const credentials = await verify(email, password);
  const user = { uid: credentials.uid, email: credentials.email };
  await setDoc(sessionRef, { user });
  auth.currentUser = user;
  notify();
  return { user };
}

export async function signInAnonymously() {
  throw new Error('A demonstracao offline exige usuario e senha.');
}

export async function signOut(auth) {
  await setDoc(sessionRef, { user: null });
  auth.currentUser = null;
  notify();
}

export async function createUserWithEmailAndPassword(auth, email, password) {
  await ready();
  const normalized = normalizeEmail(email);
  const credentials = await credentialData(crypto.randomUUID().replaceAll('-', ''), normalized, password);
  await withStore('readwrite', async store => {
    const path = `_credentials/${normalized}`;
    if (await requestResult(store.get(path))) throw new Error('Este usuario ja esta cadastrado.');
    await requestResult(store.put({ path, data: credentials }));
  });
  return { user: { uid: credentials.uid, email: normalized } };
}

export const EmailAuthProvider = {
  credential: (email, password) => ({ email, password }),
};

let reauthenticatedUser;
export async function reauthenticateWithCredential(user, credential) {
  const credentials = await verify(credential.email, credential.password);
  if (credentials.uid !== user.uid) throw new Error('Credencial nao corresponde ao usuario atual.');
  reauthenticatedUser = { uid: user.uid, expires: Date.now() + 60000 };
}

export async function updatePassword(user, password) {
  if (reauthenticatedUser?.uid !== user.uid || reauthenticatedUser.expires < Date.now()) {
    throw new Error('Confirme a senha atual antes de alterar a senha.');
  }
  await setDoc(reference(`_credentials/${user.email}`), await credentialData(user.uid, user.email, password));
  reauthenticatedUser = null;
}

export async function sendPasswordResetEmail() {
  throw new Error('Recuperacao por email indisponivel na demonstracao offline. Altere a senha em Configuracoes.');
}
