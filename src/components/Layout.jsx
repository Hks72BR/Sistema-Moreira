import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import Icon from './Icon';

const roleLabels = import.meta.env.MODE === 'offline'
  ? { admin: 'Administrador', gerente: 'Gerente', tecnico: 'Técnico', atendente: 'Atendente' }
  : { admin: 'Equipe' };

export default function Layout() {
  const { user, logout, isOnline } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const canManageOfflineUsers = import.meta.env.MODE === 'offline' &&
    (user?.role === 'admin' || user?.role === 'gerente');
  const canManageSettings = import.meta.env.MODE !== 'offline' || canManageOfflineUsers;

  // Close menus on navigation
  useEffect(() => {
    setShowMoreMenu(false);
    setShowUserMenu(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';

  return (
    <div className="app-layout">
      {import.meta.env.MODE === 'offline' && (
        <div role="status" style={{ padding: '8px 16px', background: '#33280f', color: '#f5c76a', textAlign: 'center' }}>
          Demonstracao offline — dados locais, sem sincronizacao. WhatsApp requer internet.
        </div>
      )}
      {import.meta.env.MODE !== 'offline' && !isOnline && (
        <div role="status" style={{ padding: '8px 16px', background: '#33280f', color: '#f5c76a', textAlign: 'center', fontSize: 13, fontWeight: 500, borderBottom: '1px solid rgba(245,166,35,0.3)' }}>
          ⚡ Sem internet no momento — Modo Offline ativo. Você pode continuar criando e editando clientes, orçamentos, OS e fotos normalmente; tudo será sincronizado assim que a conexão voltar.
        </div>
      )}
      <header className="topbar">
        <div className="topbar-brand" onClick={() => navigate('/')}>
          <img src="/logo.png" alt="Logo Moreira Direções" className="brand-logo" />
        </div>

        <nav className="topbar-nav">
          <NavLink to="/" end>
            <Icon name="dashboard" className="nav-icon" />
            <span className="nav-label">Dashboard</span>
          </NavLink>
          <NavLink to="/clientes">
            <Icon name="clients" className="nav-icon" />
            <span className="nav-label">Clientes</span>
          </NavLink>
          <NavLink to="/orcamentos">
            <Icon name="clipboard" className="nav-icon" />
            <span className="nav-label">Orçamentos</span>
          </NavLink>
          <NavLink to="/ordens">
            <Icon name="wrench" className="nav-icon" />
            <span className="nav-label">Ordens de Serviço</span>
          </NavLink>
          <NavLink to="/financeiro">
            <Icon name="coins" className="nav-icon" />
            <span className="nav-label">Financeiro</span>
          </NavLink>
          {canManageOfflineUsers && (
            <NavLink to="/usuarios">
              <Icon name="user" className="nav-icon" />
              <span className="nav-label">Usuários</span>
            </NavLink>
          )}
          {canManageSettings && (
            <NavLink to="/configuracoes">
              <Icon name="settings" className="nav-icon" />
              <span className="nav-label">Configurações</span>
            </NavLink>
          )}
        </nav>

        <div className="topbar-user" onClick={() => setShowUserMenu(!showUserMenu)}>
          <div className="user-avatar">{initials}</div>
          <div className="user-details">
            <span className="user-name">{user?.name}</span>
            <span className="user-role">{roleLabels[user?.role] || user?.role}</span>
          </div>
          <span className="user-chevron">▾</span>
          {showUserMenu && (
            <div className="user-dropdown" onClick={e => e.stopPropagation()}>
              <div className="dropdown-header">
                <div className="user-avatar-lg">{initials}</div>
                <div>
                  <div className="user-name">{user?.name}</div>
                  <div className="user-role">{roleLabels[user?.role] || user?.role}</div>
                </div>
              </div>
              <div className="dropdown-divider" />
              <button className="dropdown-item logout" onClick={handleLogout}>
                <Icon name="logout" />
                Sair do Sistema
              </button>
            </div>
          )}
        </div>
      </header>

      {showUserMenu && <div className="user-dropdown-backdrop" onClick={() => setShowUserMenu(false)} />}

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <NavLink to="/" end>
          <Icon name="dashboard" className="nav-icon" />
          Home
        </NavLink>
        <NavLink to="/clientes">
          <Icon name="clients" className="nav-icon" />
          Clientes
        </NavLink>
        <NavLink to="/orcamentos">
          <Icon name="clipboard" className="nav-icon" />
          Orçamentos
        </NavLink>
        <NavLink to="/ordens">
          <Icon name="wrench" className="nav-icon" />
          OS
        </NavLink>
        <button className="mobile-menu-btn" onClick={() => setShowMoreMenu(!showMoreMenu)}>
          <Icon name="menu" className="nav-icon" />
          Mais
        </button>
      </nav>

      {showMoreMenu && (
        <>
          <div className="mobile-more-backdrop" onClick={() => setShowMoreMenu(false)} />
          <div className="mobile-more-menu">
            <NavLink to="/financeiro"><Icon name="coins" /> Financeiro</NavLink>
            {canManageOfflineUsers && <NavLink to="/usuarios"><Icon name="user" /> Usuários</NavLink>}
            {canManageSettings && <NavLink to="/configuracoes"><Icon name="settings" /> Configurações</NavLink>}
            <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }}><Icon name="logout" /> Sair</a>
          </div>
        </>
      )}

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
