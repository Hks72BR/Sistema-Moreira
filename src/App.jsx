import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientForm from './pages/ClientForm';
import ClientDetail from './pages/ClientDetail';
import LinkVehicle from './pages/LinkVehicle';
import Budgets from './pages/Budgets';
import BudgetForm from './pages/BudgetForm';
import BudgetDetail from './pages/BudgetDetail';
import ServiceOrders from './pages/ServiceOrders';
import ServiceOrderForm from './pages/ServiceOrderForm';
import ServiceOrderDetail from './pages/ServiceOrderDetail';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Carregando...</div>;
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="clientes" element={<Clients />} />
        <Route path="clientes/novo" element={<ClientForm />} />
        <Route path="clientes/:id/editar" element={<ClientForm />} />
        <Route path="clientes/:clientId/vincular-veiculo" element={<LinkVehicle />} />
        <Route path="clientes/:id" element={<ClientDetail />} />
        <Route path="orcamentos" element={<Budgets />} />
        <Route path="orcamentos/novo" element={<BudgetForm />} />
        <Route path="orcamentos/:id" element={<BudgetDetail />} />
        <Route path="ordens" element={<ServiceOrders />} />
        <Route path="ordens/nova" element={<ServiceOrderForm />} />
        <Route path="ordens/:id" element={<ServiceOrderDetail />} />
        <Route path="relatorios" element={<Reports />} />
        <Route
          path="usuarios"
          element={import.meta.env.MODE === 'offline' ? <Users /> : <Navigate to="/" replace />}
        />
        <Route path="configuracoes" element={<Settings />} />
      </Route>
    </Routes>
  );
}
