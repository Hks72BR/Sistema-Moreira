import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Icon from '../components/Icon';
import WhatsappLink from '../components/WhatsappLink';

export default function Clients() {
  const { api, dataVersion } = useAuth();
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadClients = async (searchTerm = '') => {
    setLoading(true);
    try {
      const data = await api(`/clients?search=${encodeURIComponent(searchTerm)}`);
      setClients(data.clients);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClients(search); }, [dataVersion]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadClients(search);
  };

  return (
    <div>
      <div className="page-header">
        <h2>Clientes</h2>
        <Link to="/clientes/novo" className="btn btn-primary">+ Novo Cliente</Link>
      </div>

      <div className="card">
        <form onSubmit={handleSearch} className="search-bar">
          <input
            type="text"
            placeholder="Buscar por nome, CPF/CNPJ, WhatsApp ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">Buscar</button>
          {search && (
            <button type="button" className="btn btn-outline" onClick={() => { setSearch(''); loadClients(); }}>
              Limpar
            </button>
          )}
        </form>

        {loading ? (
          <div className="loading">Carregando...</div>
        ) : clients.length === 0 ? (
          <div className="empty-state">
            <div className="icon"><Icon name="clients" size={34} /></div>
            <h3>Nenhum cliente encontrado</h3>
            <p>Cadastre o primeiro cliente para começar.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF/CNPJ</th>
                  <th>WhatsApp</th>
                  <th>Email</th>
                  <th>Cidade</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id}>
                    <td><Link to={`/clientes/${c.id}`} style={{ fontWeight: 500 }}>{c.name}</Link></td>
                    <td>{c.cpf_cnpj || '-'}</td>
                    <td><WhatsappLink phone={c.phone} /></td>
                    <td>{c.email || '-'}</td>
                    <td>{c.city || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Link to={`/clientes/${c.id}`} className="btn btn-outline btn-sm">Ver</Link>
                        <Link to={`/clientes/${c.id}/editar`} className="btn btn-outline btn-sm">Editar</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
