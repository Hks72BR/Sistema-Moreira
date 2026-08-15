import { createContext, useContext, useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import * as firestoreApi from '../lib/firestore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userData = await firestoreApi.getUser(firebaseUser.uid);
          setUser({
            id: firebaseUser.uid,
            username: userData.username || firebaseUser.email,
            name: userData.name || '',
            role: userData.role || 'tecnico',
            email: firebaseUser.email,
          });
        } catch {
          // Usuário existe no Auth mas não no Firestore — logar com dados básicos
          setUser({
            id: firebaseUser.uid,
            username: firebaseUser.email,
            name: firebaseUser.email?.split('@')[0] || '',
            role: 'admin',
            email: firebaseUser.email,
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    // Aceitar username ou email — adicionar domínio se não tiver @
    const loginEmail = email.includes('@') ? email : `${email}@moreira.app`;
    const cred = await signInWithEmailAndPassword(auth, loginEmail, password);
    const userData = await firestoreApi.getUser(cred.user.uid).catch(() => null);
    const u = {
      id: cred.user.uid,
      username: userData?.username || email,
      name: userData?.name || '',
      role: userData?.role || 'admin',
      email: cred.user.email,
    };
    setUser(u);
    return { user: u };
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
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
    if (endpoint.match(/^\/auth\/change-password$/)) {
      // Firebase Auth: updatePassword — mas precisa de reauthentication
      const { updatePassword, EmailAuthProvider, reauthenticateWithCredential } = await import('firebase/auth');
      const credential = EmailAuthProvider.credential(auth.currentUser.email, body.currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, body.newPassword);
      return { message: 'Senha alterada com sucesso' };
    }

    // ═══ SETTINGS ═══
    if (endpoint === '/settings' && method === 'GET') return firestoreApi.getSettings();
    if (endpoint === '/settings' && method === 'PUT') return firestoreApi.updateSettings(body);

    // ═══ CLIENTS ═══
    if (endpoint.match(/^\/clients\?/) || endpoint === '/clients') {
      const params = new URLSearchParams(endpoint.split('?')[1] || '');
      return firestoreApi.getClients({
        search: params.get('search') || '',
        page: Number(params.get('page')) || 1,
        limitCount: Number(params.get('limit')) || 50,
      });
    }
    let m = endpoint.match(/^\/clients\/(\w+)$/);
    if (m && method === 'GET') return firestoreApi.getClient(m[1]);
    if (endpoint === '/clients' && method === 'POST') return firestoreApi.createClient(body);
    if (m && method === 'PUT') return firestoreApi.updateClient(m[1], body);
    if (m && method === 'DELETE') return firestoreApi.deleteClient(m[1]);

    // ═══ VEHICLES ═══
    m = endpoint.match(/^\/vehicles\/client\/(\w+)$/);
    if (m) return firestoreApi.getVehiclesByClient(m[1]);
    m = endpoint.match(/^\/vehicles\/(\w+)$/);
    if (m && method === 'GET') return firestoreApi.getVehicle(m[1]);
    if (endpoint === '/vehicles' && method === 'POST') return firestoreApi.createVehicle(body);
    if (m && method === 'PUT') return firestoreApi.updateVehicle(m[1], body);
    if (m && method === 'DELETE') return firestoreApi.deleteVehicle(m[1]);

    // ═══ BUDGETS ═══
    if (endpoint.match(/^\/budgets\?/) || endpoint === '/budgets') {
      const params = new URLSearchParams(endpoint.split('?')[1] || '');
      return firestoreApi.getBudgets({
        status: params.get('status') || undefined,
        search: params.get('search') || '',
        page: Number(params.get('page')) || 1,
        limitCount: Number(params.get('limit')) || 50,
      });
    }
    m = endpoint.match(/^\/budgets\/(\w+)\/status$/);
    if (m && method === 'PUT') return firestoreApi.updateBudgetStatus(m[1], body.status);
    m = endpoint.match(/^\/budgets\/(\w+)$/);
    if (m && method === 'GET') return firestoreApi.getBudget(m[1]);
    if (m && method === 'PUT') return firestoreApi.updateBudget(m[1], body);
    if (m && method === 'DELETE') return firestoreApi.deleteBudget(m[1]);
    if (endpoint === '/budgets' && method === 'POST') return firestoreApi.createBudget(body, user?.id, user?.name);

    // ═══ SERVICE ORDERS ═══
    if (endpoint.match(/^\/service-orders\?/) || endpoint === '/service-orders') {
      const params = new URLSearchParams(endpoint.split('?')[1] || '');
      return firestoreApi.getServiceOrders({
        status: params.get('status') || undefined,
        assignedTo: params.get('assigned_to') || undefined,
        search: params.get('search') || '',
        page: Number(params.get('page')) || 1,
        limitCount: Number(params.get('limit')) || 50,
      });
    }
    m = endpoint.match(/^\/service-orders\/(\w+)\/status$/);
    if (m && method === 'PUT') return firestoreApi.updateOrderStatus(m[1], body, user?.id, user?.name);
    m = endpoint.match(/^\/service-orders\/(\w+)\/logs$/);
    if (m && method === 'POST') return firestoreApi.addOrderLog(m[1], body, user?.id, user?.name);
    m = endpoint.match(/^\/service-orders\/(\w+)$/);
    if (m && method === 'GET') return firestoreApi.getServiceOrder(m[1]);
    if (m && method === 'PUT') return firestoreApi.updateServiceOrder(m[1], body, user?.id, user?.name);
    if (endpoint === '/service-orders' && method === 'POST') return firestoreApi.createServiceOrder(body, user?.id, user?.name);

    // ═══ PHOTOS ═══
    m = endpoint.match(/^\/photos\/(\w+)$/);
    if (m && method === 'GET') return firestoreApi.getPhotos(m[1]);
    // Photo upload/delete são tratados diretamente nas pages (não via api())

    // ═══ REPORTS ═══
    if (endpoint === '/reports/dashboard') return firestoreApi.getDashboard();
    m = endpoint.match(/^\/reports\/monthly/);
    if (m) {
      const params = new URLSearchParams(endpoint.split('?')[1] || '');
      return firestoreApi.getMonthlyReport(Number(params.get('month')), Number(params.get('year')));
    }
    m = endpoint.match(/^\/reports\/client-history\/(\w+)$/);
    if (m) return firestoreApi.getClientHistory(m[1]);
    m = endpoint.match(/^\/reports\/services/);
    if (m) {
      const params = new URLSearchParams(endpoint.split('?')[1] || '');
      return firestoreApi.getServicesReport(params.get('startDate'), params.get('endDate'));
    }

    // ═══ USERS ═══
    if (endpoint === '/users' && method === 'GET') return firestoreApi.getUsers();
    m = endpoint.match(/^\/users\/(\w+)\/reset-password$/);
    if (m && method === 'PUT') {
      const targetUser = await firestoreApi.getUser(m[1]);
      const email = targetUser.email || (targetUser.username?.includes('@') ? targetUser.username : `${targetUser.username}@moreira.app`);
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, email);
      return { message: `Email de redefinição enviado para ${email}` };
    }
    m = endpoint.match(/^\/users\/(\w+)$/);
    if (m && method === 'GET') return firestoreApi.getUser(m[1]);
    if (m && method === 'PUT') return firestoreApi.updateUser(m[1], body);
    if (endpoint === '/users' && method === 'POST') {
      // Criar usuário no Firebase Auth + Firestore
      // Usa uma segunda instância do Firebase para não deslogar o admin atual
      const { initializeApp, deleteApp } = await import('firebase/app');
      const { getAuth: getAuth2, createUserWithEmailAndPassword } = await import('firebase/auth');
      const email = body.username.includes('@') ? body.username : `${body.username}@moreira.app`;
      if (!body.password || body.password.length < 6) {
        throw new Error('Senha deve ter no mínimo 6 caracteres');
      }
      const secondaryApp = initializeApp(auth.app.options, '_createUser');
      try {
        const secondaryAuth = getAuth2(secondaryApp);
        const cred = await createUserWithEmailAndPassword(secondaryAuth, email, body.password);
        const result = await firestoreApi.createUserDoc(cred.user.uid, { ...body, email });
        await deleteApp(secondaryApp);
        return result;
      } catch (err) {
        await deleteApp(secondaryApp).catch(() => {});
        throw err;
      }
    }

    // ═══ INVOICES ═══
    if (endpoint === '/invoices' && method === 'GET') return firestoreApi.getInvoices();
    m = endpoint.match(/^\/invoices\/(\w+)\/status$/);
    if (m && method === 'PUT') return firestoreApi.updateInvoiceStatus(m[1], body.status);
    m = endpoint.match(/^\/invoices\/(\w+)$/);
    if (m && method === 'GET') return firestoreApi.getInvoice(m[1]);
    if (endpoint === '/invoices' && method === 'POST') return firestoreApi.createInvoice(body);

    throw new Error(`Endpoint não mapeado: ${method} ${endpoint}`);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, api }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
