import { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getAuth as getSecondaryAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  setPersistence,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import { auth, db, COMPANY_ID } from '../lib/firebase';
import * as firestoreApi from '../lib/firestore';

const defaultAuthContext = {
  user: null,
  loading: true,
  isOnline: true,
  login: async () => {},
  logout: async () => {},
  api: async () => {},
  dataVersion: 0,
};

const AuthContext = createContext(defaultAuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [initializationError, setInitializationError] = useState('');
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      if (import.meta.env.MODE !== 'offline' && !auth.currentUser) {
        const savedName = (sessionStorage.getItem('moreira.userName') || localStorage.getItem('moreira.userName') || '').trim();
        if (savedName) {
          try {
            const cred = await signInAnonymously(auth);
            setUser({
              id: cred.user.uid,
              username: savedName,
              name: savedName,
              role: 'admin',
              email: null,
            });
          } catch (e) {
            console.warn('Reconectando sessão anônima:', e);
          }
        }
      }
      setDataVersion(v => v + 1);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (import.meta.env.MODE === 'offline' && firebaseUser) {
        firestoreApi.getUser(firebaseUser.uid).then(userData => {
          setUser({
            id: firebaseUser.uid,
            username: userData.username || firebaseUser.email,
            name: userData.name || '',
            role: userData.role || 'tecnico',
            email: firebaseUser.email,
          });
          setLoading(false);
        }).catch(error => {
          console.error('Falha ao carregar perfil local:', error);
          setUser(null);
          setInitializationError('Nao foi possivel carregar o perfil local. Feche e abra o aplicativo novamente.');
          setLoading(false);
        });
        return;
      } else if (firebaseUser?.isAnonymous) {
        try {
          const name = (sessionStorage.getItem('moreira.userName') || localStorage.getItem('moreira.userName') || '')?.trim();
          setUser(name ? {
            id: firebaseUser.uid,
            username: name,
            name,
            role: 'admin',
            email: null,
          } : null);
        } catch (error) {
          console.error('Falha ao recuperar o nome do usuário:', error);
          setUser(null);
          setInitializationError('Nao foi possivel recuperar o usuario salvo neste dispositivo.');
        }
      } else if (import.meta.env.MODE !== 'offline') {
        const savedName = (sessionStorage.getItem('moreira.userName') || localStorage.getItem('moreira.userName') || '')?.trim();
        if (savedName && typeof navigator !== 'undefined' && !navigator.onLine) {
          setUser({
            id: 'offline_session',
            username: savedName,
            name: savedName,
            role: 'admin',
            email: null,
          });
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || import.meta.env.MODE === 'offline') return undefined;

    const unsubscribe = [];

    const listen = (reference, label) => {
      let initialSnapshot = true;
      unsubscribe.push(onSnapshot(reference, () => {
        if (initialSnapshot) {
          initialSnapshot = false;
          return;
        }
        setDataVersion(version => version + 1);
      }, error => {
        console.error(`Falha na sincronizacao em tempo real (${label}):`, error);
      }));
    };

    try {
      for (const path of ['clients', 'vehicles', 'budgets', 'serviceOrders', 'invoices']) {
        listen(collection(db, 'companies', COMPANY_ID, path), path);
      }
    } catch (error) {
      console.error('Falha ao iniciar a sincronizacao em tempo real:', error);
    }

    return () => {
      unsubscribe.forEach(stop => stop());
    };
  }, [user?.id]);

  const login = async (displayName, password) => {
    const name = displayName.trim();
    if (!name) throw new Error('Digite seu nome para entrar.');

    if (import.meta.env.MODE === 'offline') {
      const loginEmail = name.includes('@') ? name : `${name}@moreira.app`;
      const cred = await signInWithEmailAndPassword(auth, loginEmail, password);
      const userData = await firestoreApi.getUser(cred.user.uid).catch(() => null);
      const offlineUser = {
        id: cred.user.uid,
        username: userData?.username || name,
        name: userData?.name || '',
        role: userData?.role || 'admin',
        email: cred.user.email,
      };
      setUser(offlineUser);
      return { user: offlineUser };
    }

    sessionStorage.setItem('moreira.userName', name);
    localStorage.setItem('moreira.userName', name);
    let firebaseUser = auth.currentUser;
    try {
      await setPersistence(auth, browserSessionPersistence);
      if (!firebaseUser?.isAnonymous) {
        if (firebaseUser) await signOut(auth);
        firebaseUser = (await signInAnonymously(auth)).user;
      }
    } catch (error) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const offlineFallbackUser = {
          id: firebaseUser?.uid || 'offline_session',
          username: name,
          name,
          role: 'admin',
          email: null,
        };
        setUser(offlineFallbackUser);
        return { user: offlineFallbackUser };
      }
      sessionStorage.removeItem('moreira.userName');
      localStorage.removeItem('moreira.userName');
      throw error;
    }

    const u = {
      id: firebaseUser.uid,
      username: name,
      name,
      role: 'admin',
      email: null,
    };
    setUser(u);
    return { user: u };
  };

  const logout = async () => {
    if (import.meta.env.MODE !== 'offline') {
      sessionStorage.removeItem('moreira.userName');
      localStorage.removeItem('moreira.userName');
    }
    setUser(null);
    await signOut(auth).catch(() => {});
  };

  // Wrapper compatível — pages usam api() para fazer chamadas
  // Com Firebase, retorna direto do Firestore (sem HTTP)
  const api = async (endpoint, options = {}) => {
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body) : {};

    // ═══ AUTH ═══
    if (endpoint === '/auth/me' || endpoint.match(/^\/auth\/me$/)) {
      return user;
    }
    if (import.meta.env.MODE === 'offline' && endpoint.match(/^\/auth\/change-password$/)) {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, body.currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, body.newPassword);
      return { message: 'Senha alterada com sucesso' };
    }
    // ═══ SETTINGS ═══
    if (endpoint === '/settings' && method === 'GET') return firestoreApi.getSettings();
    if (endpoint === '/settings' && method === 'PUT') return firestoreApi.updateSettings(body);

    // ═══ CLIENTS ═══
    if (endpoint === '/clients' && method === 'POST') return firestoreApi.createClient(body);
    if ((endpoint.match(/^\/clients\?/) || endpoint === '/clients') && method === 'GET') {
      const params = new URLSearchParams(endpoint.split('?')[1] || '');
      return firestoreApi.getClients({
        search: params.get('search') || '',
        page: Number(params.get('page')) || 1,
        limitCount: Number(params.get('limit')) || 50,
      });
    }
    let m = endpoint.match(/^\/clients\/([^/?]+)/);
    if (m && method === 'GET') {
      const clientId = m[1];
      const params = new URLSearchParams(endpoint.split('?')[1] || '');
      const isBasic = params.get('basic') === 'true';
      return isBasic ? firestoreApi.getClientBasic(clientId) : firestoreApi.getClient(clientId);
    }
    if (m && method === 'PUT') return firestoreApi.updateClient(m[1], body);
    if (m && method === 'DELETE') return firestoreApi.deleteClient(m[1]);

    // ═══ VEHICLES ═══
    m = endpoint.match(/^\/vehicles\/client\/([^/?]+)$/);
    if (m) return firestoreApi.getVehiclesByClient(m[1]);
    m = endpoint.match(/^\/vehicles\/([^/?]+)$/);
    if (m && method === 'GET') return firestoreApi.getVehicle(m[1]);
    if (endpoint === '/vehicles' && method === 'POST') return firestoreApi.createVehicle(body);
    if (m && method === 'PUT') return firestoreApi.updateVehicle(m[1], body);
    if (m && method === 'DELETE') return firestoreApi.deleteVehicle(m[1]);

    // ═══ BUDGETS ═══
    if ((endpoint.match(/^\/budgets\?/) || endpoint === '/budgets') && method === 'GET') {
      const params = new URLSearchParams(endpoint.split('?')[1] || '');
      return firestoreApi.getBudgets({
        status: params.get('status') || undefined,
        search: params.get('search') || '',
        page: Number(params.get('page')) || 1,
        limitCount: Number(params.get('limit')) || 50,
      });
    }
    m = endpoint.match(/^\/budgets\/([^/?]+)\/status$/);
    if (m && method === 'PUT') return firestoreApi.updateBudgetStatus(m[1], body.status);
    m = endpoint.match(/^\/budgets\/([^/?]+)$/);
    if (m && method === 'GET') return firestoreApi.getBudget(m[1]);
    if (m && method === 'PUT') return firestoreApi.updateBudget(m[1], body);
    if (m && method === 'DELETE') return firestoreApi.deleteBudget(m[1]);
    if (endpoint === '/budgets' && method === 'POST') return firestoreApi.createBudget(body, user?.id, user?.name);

    // ═══ SERVICE ORDERS ═══
    if ((endpoint.match(/^\/service-orders\?/) || endpoint === '/service-orders') && method === 'GET') {
      const params = new URLSearchParams(endpoint.split('?')[1] || '');
      return firestoreApi.getServiceOrders({
        status: params.get('status') || undefined,
        assignedTo: params.get('assigned_to') || undefined,
        search: params.get('search') || '',
        page: Number(params.get('page')) || 1,
        limitCount: Number(params.get('limit')) || 50,
      });
    }
    m = endpoint.match(/^\/service-orders\/([^/?]+)\/status$/);
    if (m && method === 'PUT') return firestoreApi.updateOrderStatus(m[1], body, user?.id, user?.name);
    m = endpoint.match(/^\/service-orders\/([^/?]+)\/logs$/);
    if (m && method === 'POST') return firestoreApi.addOrderLog(m[1], body, user?.id, user?.name);
    m = endpoint.match(/^\/service-orders\/([^/?]+)$/);
    if (m && method === 'GET') return firestoreApi.getServiceOrder(m[1]);
    if (m && method === 'PUT') return firestoreApi.updateServiceOrder(m[1], body, user?.id, user?.name);
    if (m && method === 'DELETE') return firestoreApi.deleteServiceOrder(m[1]);
    if (endpoint === '/service-orders' && method === 'POST') return firestoreApi.createServiceOrder(body, user?.id, user?.name);

    // ═══ PHOTOS ═══
    m = endpoint.match(/^\/photos\/([^/?]+)$/);
    if (m && method === 'GET') return firestoreApi.getPhotos(m[1]);
    // Photo upload/delete são tratados diretamente nas pages (não via api())

    // ═══ REPORTS ═══
    if (endpoint === '/reports/dashboard') return firestoreApi.getDashboard();
    m = endpoint.match(/^\/reports\/monthly/);
    if (m) {
      const params = new URLSearchParams(endpoint.split('?')[1] || '');
      return firestoreApi.getMonthlyReport(Number(params.get('month')), Number(params.get('year')));
    }
    m = endpoint.match(/^\/reports\/client-history\/([^/?]+)$/);
    if (m) return firestoreApi.getClientHistory(m[1]);
    m = endpoint.match(/^\/reports\/services/);
    if (m) {
      const params = new URLSearchParams(endpoint.split('?')[1] || '');
      return firestoreApi.getServicesReport(params.get('startDate'), params.get('endDate'));
    }

    if (import.meta.env.MODE === 'offline') {
      if (endpoint === '/users' && method === 'GET') return firestoreApi.getUsers();
      m = endpoint.match(/^\/users\/([^/?]+)\/reset-password$/);
      if (m && method === 'PUT') {
        const targetUser = await firestoreApi.getUser(m[1]);
        const email = targetUser.email || (targetUser.username?.includes('@') ? targetUser.username : `${targetUser.username}@moreira.app`);
        await sendPasswordResetEmail(auth, email);
        return { message: `Email de redefinição enviado para ${email}` };
      }
      m = endpoint.match(/^\/users\/([^/?]+)$/);
      if (m && method === 'GET') return firestoreApi.getUser(m[1]);
      if (m && method === 'PUT') return firestoreApi.updateUser(m[1], body);
      if (endpoint === '/users' && method === 'POST') {
        const email = body.username.includes('@') ? body.username : `${body.username}@moreira.app`;
        const secondaryApp = initializeApp(auth.app.options, '_createUser');
        try {
          const secondaryAuth = getSecondaryAuth(secondaryApp);
          const cred = await createUserWithEmailAndPassword(secondaryAuth, email, body.password);
          const result = await firestoreApi.createUserDoc(cred.user.uid, { ...body, email });
          await deleteApp(secondaryApp);
          return result;
        } catch (err) {
          await deleteApp(secondaryApp).catch(() => {});
          throw err;
        }
      }
    }

    // ═══ INVOICES ═══
    if (endpoint === '/invoices' && method === 'GET') return firestoreApi.getInvoices();
    m = endpoint.match(/^\/invoices\/([^/?]+)\/status$/);
    if (m && method === 'PUT') return firestoreApi.updateInvoiceStatus(m[1], body.status);
    m = endpoint.match(/^\/invoices\/([^/?]+)$/);
    if (m && method === 'GET') return firestoreApi.getInvoice(m[1]);
    if (endpoint === '/invoices' && method === 'POST') return firestoreApi.createInvoice(body);

    throw new Error(`Endpoint não mapeado: ${method} ${endpoint}`);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isOnline, login, logout, api, dataVersion }}>
      {initializationError ? <div role="alert">{initializationError}</div> : children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
