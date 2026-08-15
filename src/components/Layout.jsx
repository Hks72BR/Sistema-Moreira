import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';

const roleLabels = { admin: 'Administrador', gerente: 'Gerente', tecnico: 'Técnico', atendente: 'Atendente' };

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

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
      <header className="topbar">
        <div className="topbar-brand" onClick={() => navigate('/')}>
          <img src="/logo.png" alt="Moreira" className="brand-logo" />
          <div className="brand-text">
            <h1>MOREIRA</h1>
            <p>Direção &amp; Suspensão</p>
          </div>
        </div>

        <nav className="topbar-nav">
          <NavLink to="/" end>
            <span className="nav-icon">📊</span>
            <span className="nav-label">Dashboard</span>
          </NavLink>
          <NavLink to="/clientes">
            <span className="nav-icon">👥</span>
            <span className="nav-label">Clientes</span>
          </NavLink>
          <NavLink to="/orcamentos">
            <span className="nav-icon">📋</span>
            <span className="nav-label">Orçamentos</span>
          </NavLink>
          <NavLink to="/ordens">
            <span className="nav-icon">🔧</span>
            <span className="nav-label">Ordens de Serviço</span>
          </NavLink>
          <NavLink to="/relatorios">
            <span className="nav-icon">📈</span>
            <span className="nav-label">Relatórios</span>
          </NavLink>
          {(user?.role === 'admin' || user?.role === 'gerente') && (
            <>
              <NavLink to="/usuarios">
                <span className="nav-icon">👤</span>
                <span className="nav-label">Usuários</span>
              </NavLink>
              <NavLink to="/configuracoes">
                <span className="nav-icon">⚙️</span>
                <span className="nav-label">Configurações</span>
              </NavLink>
            </>
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
                🚪 Sair do Sistema
              </button>
            </div>
          )}
        </div>
      </header>

      {showUserMenu && <div className="user-dropdown-backdrop" onClick={() => setShowUserMenu(false)} />}

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <NavLink to="/" end>
          <span className="nav-icon">📊</span>
          Home
        </NavLink>
        <NavLink to="/clientes">
          <span className="nav-icon">👥</span>
          Clientes
        </NavLink>
        <NavLink to="/orcamentos">
          <span className="nav-icon">📋</span>
          Orçamentos
        </NavLink>
        <NavLink to="/ordens">
          <span className="nav-icon">🔧</span>
          OS
        </NavLink>
        <button className="mobile-menu-btn" onClick={() => setShowMoreMenu(!showMoreMenu)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', fontSize: '10px', fontWeight: 500, padding: '4px 8px', cursor: 'pointer' }}>
          <span className="nav-icon" style={{ fontSize: 20 }}>☰</span>
          Mais
        </button>
      </nav>

      {showMoreMenu && (
        <>
          <div className="mobile-more-backdrop" onClick={() => setShowMoreMenu(false)} />
          <div className="mobile-more-menu">
            <NavLink to="/relatorios">📈 Relatórios</NavLink>
            {(user?.role === 'admin' || user?.role === 'gerente') && (
              <>
                <NavLink to="/usuarios">👤 Usuários</NavLink>
                <NavLink to="/configuracoes">⚙️ Configurações</NavLink>
              </>
            )}
            <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }}>🚪 Sair</a>
          </div>
        </>
      )}

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
