import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const states = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export default function ClientForm() {
  const { id } = useParams();
  const { api } = useAuth();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [form, setForm] = useState({
    name: '', type: 'pf', cpf_cnpj: '', phone: '', phone2: '',
    email: '', address: '', neighborhood: '', city: '', state: 'SP', zip_code: '', notes: ''
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditing) {
      api(`/clients/${id}`).then(data => {
        setForm({
          name: data.name || '', type: data.type || 'pf', cpf_cnpj: data.cpf_cnpj || '',
          phone: data.phone || '', phone2: data.phone2 || '', email: data.email || '',
          address: data.address || '', neighborhood: data.neighborhood || '',
          city: data.city || '', state: data.state || 'SP', zip_code: data.zip_code || '',
          notes: data.notes || ''
        });
      }).catch(err => setError(err.message));
    }
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (isEditing) {
        await api(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        const result = await api('/clients', { method: 'POST', body: JSON.stringify(form) });
        navigate(`/clientes/${result.id}`);
        return;
      }
      navigate(`/clientes/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</h2>
      </div>

      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Nome *</label>
              <input name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Tipo</label>
              <select name="type" value={form.type} onChange={handleChange}>
                <option value="pf">Pessoa Física</option>
                <option value="pj">Pessoa Jurídica</option>
              </select>
            </div>
            <div className="form-group">
              <label>{form.type === 'pj' ? 'CNPJ' : 'CPF'}</label>
              <input name="cpf_cnpj" value={form.cpf_cnpj} onChange={handleChange} placeholder={form.type === 'pj' ? '00.000.000/0000-00' : '000.000.000-00'} />
            </div>
            <div className="form-group">
              <label>Telefone</label>
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="(00) 00000-0000" />
            </div>
            <div className="form-group">
              <label>Telefone 2</label>
              <input name="phone2" value={form.phone2} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} />
            </div>
          </div>

          <h3 style={{ margin: '20px 0 12px', fontSize: 16 }}>Endereço</h3>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Endereço</label>
              <input name="address" value={form.address} onChange={handleChange} placeholder="Rua, número, complemento" />
            </div>
            <div className="form-group">
              <label>Bairro</label>
              <input name="neighborhood" value={form.neighborhood} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Cidade</label>
              <input name="city" value={form.city} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select name="state" value={form.state} onChange={handleChange}>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>CEP</label>
              <input name="zip_code" value={form.zip_code} onChange={handleChange} placeholder="00000-000" />
            </div>
          </div>

          <div className="form-group">
            <label>Observações</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Cadastrar Cliente')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
