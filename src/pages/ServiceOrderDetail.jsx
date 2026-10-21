import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Icon from '../components/Icon';
import WhatsappLink, { getWhatsappUrl } from '../components/WhatsappLink';
import { compressPhoto, compressBase64Photo } from '../lib/photoCompression';
import * as firestoreApi from '../lib/firestore';
import * as storage from '../lib/storage';
import { printServiceOrder, downloadServiceOrderPDF } from '../lib/printer';
import { SERVICE_CATALOG, PARTS_CATALOG } from '../lib/catalog';

const statusLabels = {
  aberta: 'Aberta', em_andamento: 'Em Andamento', aguardando_peca: 'Aguard. Peça',
  concluida: 'Concluída', entregue: 'Entregue', cancelada: 'Cancelada'
};
const steeringLabels = { hidraulica: 'Hidráulica', eletrica: 'Elétrica', eletrohidraulica: 'Eletro-hidráulica', mecanica: 'Mecânica' };

const statusFlow = {
  aberta: ['em_andamento', 'cancelada'],
  em_andamento: ['aguardando_peca', 'concluida', 'cancelada'],
  aguardando_peca: ['em_andamento', 'concluida', 'cancelada'],
  concluida: ['entregue'],
  entregue: [],
  cancelada: []
};

export default function ServiceOrderDetail() {
  const { id } = useParams();
  const { api, user, dataVersion } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [company, setCompany] = useState({});
  const [loading, setLoading] = useState(true);
  const [deletingOrder, setDeletingOrder] = useState(false);
  const [logText, setLogText] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionSaving, setCompletionSaving] = useState(false);
  const [completionError, setCompletionError] = useState('');
  const [completionNotice, setCompletionNotice] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [users, setUsers] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [photoDataUrls, setPhotoDataUrls] = useState({});
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [photoPhase, setPhotoPhase] = useState('entrada');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const loadOrder = () => {
    api(`/service-orders/${id}`).then(data => { setOrder(data); setLoading(false); }).catch(() => setLoading(false));
  };

  const loadPhotos = async () => {
    try {
      const list = await api(`/photos/${id}`);
      setPhotos(list);
      // Carregar dados das fotos locais (Electron) ou URL do Firestore
      const urls = {};
      for (const p of list) {
        const localName = p.localFilename || p.filename || '';
        if (window.electronAPI && localName) {
          const base64 = await window.electronAPI.readPhoto(localName);
          if (base64) urls[p.id] = `data:image/jpeg;base64,${base64}`;
        } else if (p.url) {
          urls[p.id] = p.url;
        }
      }
      setPhotoDataUrls(urls);
    } catch { }
  };

  useEffect(() => {
    loadOrder();
    loadPhotos();
    api('/settings').then(data => { if (data) setCompany(data); }).catch(() => {});
  }, [id, dataVersion]);

  useEffect(() => {
    if (import.meta.env.MODE === 'offline') {
      api('/users').then(u => setUsers(u.filter(x => x.active))).catch(() => {});
    }
    return firestoreApi.watchServiceOrderChildren(id, () => {
      loadOrder();
      loadPhotos();
    });
  }, [id]);

  const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  const formatDate = (d) => d ? new Date(d).toLocaleString('pt-BR') : '-';

  const changeStatus = async (status) => {
    if (status === 'concluida') {
      setCompletionError('');
      setCompletionNotice(null);
      setShowCompletionModal(true);
      return;
    }
    const statusNames = { em_andamento: 'Iniciar Serviço', concluida: 'Concluir', entregue: 'Registrar Entrega', cancelada: 'Cancelar', aguardando_peca: 'Aguardar Peça' };
    if (!confirm(`${statusNames[status] || 'Alterar status'}?`)) return;
    try {
      await api(`/service-orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
      loadOrder();
    } catch (err) { alert(err.message); }
  };

  const completeOrder = async (notifyClient) => {
    if (completionSaving) return;
    const vehicleName = [order.make, order.model].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    const clientFirstName = order.client_name?.trim().split(/\s+/)[0];
    const serviceDescriptions = order.items?.map(item => item.description?.trim()).filter(Boolean) || [];
    const servicesText = order.services_performed?.trim()
      || (serviceDescriptions.length ? serviceDescriptions.map(description => `• ${description}`).join('\n') : '');
    const messageParts = [
      `Olá${clientFirstName ? `, *${clientFirstName}*` : ''}! 👋`,
      'Temos uma ótima notícia: o serviço do seu veículo foi concluído com sucesso.',
      `*ORDEM DE SERVIÇO*\n${order.code}`,
      [vehicleName && `*VEÍCULO*\n${vehicleName}`, order.plate && `Placa: ${order.plate.trim().toUpperCase()}`].filter(Boolean).join('\n'),
      servicesText && `*SERVIÇOS REALIZADOS*\n${servicesText}`,
      'Agradecemos por escolher a *Moreira Direções*.\nConte conosco sempre que precisar. 🤝'
    ].filter(Boolean);
    const whatsappUrl = notifyClient ? getWhatsappUrl(order.client_phone, messageParts.join('\n')) : '';
    const whatsappWindow = notifyClient && whatsappUrl ? window.open('about:blank', '_blank') : null;
    if (whatsappWindow) whatsappWindow.opener = null;

    setCompletionSaving(true);
    setCompletionError('');
    try {
      await api(`/service-orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status: 'concluida' }) });
      setShowCompletionModal(false);
      loadOrder();
      if (!notifyClient) {
        setCompletionNotice({
          title: 'OS concluída',
          message: 'Lembre-se de entrar em contato com o cliente para avisar que o serviço foi finalizado.'
        });
      } else if (!whatsappUrl) {
        setCompletionNotice({
          title: 'OS concluída',
          message: 'Não há um número de WhatsApp válido cadastrado para este cliente. Será necessário entrar em contato por outro meio.'
        });
      } else if (whatsappWindow) {
        whatsappWindow.location.href = whatsappUrl;
      } else {
        setCompletionNotice({
          title: 'OS concluída',
          message: 'O navegador bloqueou a abertura automática. Use o link abaixo para abrir o WhatsApp.',
          whatsappUrl
        });
      }
    } catch (err) {
      whatsappWindow?.close();
      setCompletionError(`Não foi possível concluir a OS: ${err.message}`);
    } finally {
      setCompletionSaving(false);
    }
  };

  const addLog = async () => {
    if (!logText.trim()) return;
    try {
      await api(`/service-orders/${id}/logs`, { method: 'POST', body: JSON.stringify({ description: logText }) });
      setLogText('');
      loadOrder();
    } catch (err) { alert(err.message); }
  };

  const openEdit = () => {
    setEditForm({
      assigned_to: order.assigned_to || '',
      assigned_to_name: order.assigned_to_name || order.assignedToName || '',
      diagnosis: order.diagnosis || '',
      services_performed: order.services_performed || '',
      parts_used: order.parts_used || '',
      notes: order.notes || '',
      km_exit: order.km_exit || '',
      priority: order.priority || 'normal'
    });
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    try {
      await api(`/service-orders/${id}`, { method: 'PUT', body: JSON.stringify(editForm) });
      setShowEditModal(false);
      loadOrder();
    } catch (err) { alert(err.message); }
  };

  // ── Photo functions ──
  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files.length) return;
    setUploadingPhoto(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ts = Date.now();
        const fileName = `os-${id}-${ts}-${i}.jpg`;
        
        // Upload para Cloudinary
        const { downloadUrl, storagePath, deleteToken } = await storage.uploadPhotoFile('moreira', id, file, fileName);

        // Salvar localmente também (Electron)
        if (downloadUrl) {
          // Gerar base64 para cache local
          const reader = new FileReader();
          const base64 = await new Promise((resolve) => {
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(file);
          });
          
          if (window.electronAPI) {
            await window.electronAPI.savePhoto(fileName, base64);
          }
        }
        
        // Salvar metadados no Firestore
        await firestoreApi.addPhotoDoc(id, {
          localFilename: fileName,
          url: downloadUrl,
          storagePath: storagePath,
          deleteToken: deleteToken || '',
          originalName: file.name,
          label: photoPhase === 'entrada' ? 'Foto de entrada' : 'Foto de saída',
          phase: photoPhase,
          uploadedBy: user?.id || '',
          uploadedByName: user?.name || '',
        });
      }
      loadPhotos();
    } catch (err) { alert(err.message); }
    finally { setUploadingPhoto(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const openCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } });
      streamRef.current = stream;
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
    } catch (err) {
      alert('Não foi possível acessar a câmera. Verifique as permissões.');
      setShowCamera(false);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    closeCamera();
    setUploadingPhoto(true);
    try {
      const compressed = await compressBase64Photo(dataUrl);
      const reader = new FileReader();
      const base64 = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(compressed);
      });
      
      const ts = Date.now();
      const fileName = `os-${id}-${ts}.jpg`;
      
      // Upload para Cloudinary
      const { downloadUrl, storagePath, deleteToken } = await storage.uploadPhotoBase64('moreira', id, dataUrl);

      // Salvar localmente também (Electron)
      if (window.electronAPI) {
        await window.electronAPI.savePhoto(fileName, base64);
      }
      
      await firestoreApi.addPhotoDoc(id, {
        localFilename: fileName,
        url: downloadUrl,
        storagePath: storagePath,
        deleteToken: deleteToken || '',
        originalName: fileName,
        label: photoPhase === 'entrada' ? 'Foto de entrada' : 'Foto de saída',
        phase: photoPhase,
        uploadedBy: user?.id || '',
        uploadedByName: user?.name || '',
      });
      
      loadPhotos();
    } catch (err) { alert(err.message); }
    finally { setUploadingPhoto(false); }
  };

  const closeCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setShowCamera(false);
  };

  const deletePhoto = async (photoId) => {
    if (!confirm('Remover esta foto?')) return;
    try {
      const photo = photos.find(p => p.id === photoId);
      if (photo) {
        await storage.deleteStoredPhoto(photo);
      }
      await firestoreApi.deletePhotoDoc(id, photoId);
      loadPhotos();
    } catch (err) { alert(err.message); }
  };

  const handleDeleteOrder = async () => {
    if (deletingOrder) return;
    if (!confirm(`Deseja realmente excluir a OS ${order?.code || ''} e todas as fotos relacionadas a ela? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setDeletingOrder(true);
    try {
      await api(`/service-orders/${id}`, { method: 'DELETE' });
      setShowEditModal(false);
      navigate('/ordens');
    } catch (err) {
      alert(err.message);
      setDeletingOrder(false);
    }
  };

  if (loading) return <div className="loading">Carregando...</div>;
  if (!order) return <div className="loading">OS não encontrada</div>;

  const nextStatuses = statusFlow[order.status] || [];
  const itemsTotal = order.items?.reduce((sum, i) => sum + i.total, 0) || 0;

  return (
    <div>
      <div className="page-header">
        <h2>
          OS {order.code}
          <span className={`badge badge-${order.status}`} style={{ marginLeft: 12, verticalAlign: 'middle' }}>
            {statusLabels[order.status]}
          </span>
          {order.priority !== 'normal' && (
            <span className={`badge badge-${order.priority}`} style={{ marginLeft: 8, verticalAlign: 'middle' }}>
              {order.priority === 'urgente' ? 'Urgente' : 'Alta'}
            </span>
          )}
        </h2>
        <div className="actions">
          <button className="btn btn-outline" onClick={() => printServiceOrder(order, company)}>
            <Icon name="printer" /> Imprimir OS
          </button>
          <button className="btn btn-outline" onClick={() => downloadServiceOrderPDF(order, company)}>
            <Icon name="file" /> PDF
          </button>
          {nextStatuses.map(s => (
            <button key={s} className={`btn ${s === 'cancelada' ? 'btn-danger' : s === 'entregue' ? 'btn-success' : 'btn-primary'}`} onClick={() => changeStatus(s)}>
              <Icon name={s === 'em_andamento' ? 'play' : s === 'concluida' ? 'check' : s === 'entregue' ? 'package' : s === 'aguardando_peca' ? 'clock' : 'close'} />
              {s === 'em_andamento' ? 'Iniciar' : s === 'concluida' ? 'Concluir' : s === 'entregue' ? 'Entregar' : s === 'aguardando_peca' ? 'Aguard. Peça' : 'Cancelar'}
            </button>
          ))}
          <button className="btn btn-outline" onClick={openEdit}><Icon name="edit" /> Editar</button>
          <button className="btn btn-danger btn-sm" onClick={handleDeleteOrder} disabled={deletingOrder}>
            {deletingOrder ? 'Excluindo...' : 'Excluir OS'}
          </button>
        </div>
      </div>

      <div className="detail-grid">
        <div>
          {/* Order Info */}
          <div className="card">
            <div className="card-header"><h3>Informações da OS</h3></div>
            <div className="detail-info">
              <div className="info-row"><span className="info-label">Cliente:</span><span className="info-value"><Link to={`/clientes/${order.client_id}`}>{order.client_name}</Link></span></div>
              <div className="info-row"><span className="info-label">WhatsApp:</span><span className="info-value"><WhatsappLink phone={order.client_phone} /></span></div>
              <div className="info-row"><span className="info-label">Veículo:</span><span className="info-value">{order.make} {order.model} {order.year} {order.color && `(${order.color})`}</span></div>
              <div className="info-row"><span className="info-label">Placa:</span><span className="info-value">{order.plate || '-'}</span></div>
              <div className="info-row"><span className="info-label">Direção:</span><span className="info-value">{steeringLabels[order.steering_type] || order.steering_type}</span></div>
              <div className="info-row"><span className="info-label">Responsável:</span><span className="info-value">{order.assigned_to_name || order.assigned_name || 'Não atribuído'}</span></div>
              <div className="info-row"><span className="info-label">Criado por:</span><span className="info-value">{order.created_by_name}</span></div>
              <div className="info-row"><span className="info-label">KM Entrada:</span><span className="info-value">{order.km_entry || '-'}</span></div>
              {order.km_exit && <div className="info-row"><span className="info-label">KM Saída:</span><span className="info-value">{order.km_exit}</span></div>}
              {order.budget_code && <div className="info-row"><span className="info-label">Orçamento:</span><span className="info-value"><Link to={`/orcamentos/${order.budget_id}`}>{order.budget_code}</Link></span></div>}
            </div>
          </div>

          {/* Diagnosis & Services */}
          {order.diagnosis && (
            <div className="card">
              <div className="card-header"><h3>Diagnóstico</h3></div>
              <p style={{ whiteSpace: 'pre-wrap' }}>{order.diagnosis}</p>
            </div>
          )}

          {order.services_performed && (
            <div className="card">
              <div className="card-header"><h3>Serviços Realizados</h3></div>
              <p style={{ whiteSpace: 'pre-wrap' }}>{order.services_performed}</p>
            </div>
          )}

          {order.parts_used && (
            <div className="card">
              <div className="card-header"><h3>Peças Utilizadas</h3></div>
              <p style={{ whiteSpace: 'pre-wrap' }}>{order.parts_used}</p>
            </div>
          )}

          {/* Items */}
          {order.items?.length > 0 && (
            <div className="card">
              <div className="card-header"><h3>Itens</h3></div>
              <table>
                <thead><tr><th>Descrição</th><th>Tipo</th><th>Qtd</th><th>Vlr Unit.</th><th>Total</th></tr></thead>
                <tbody>
                  {order.items.map(item => (
                    <tr key={item.id}>
                      <td>{item.description}</td>
                      <td>{item.type === 'peca' ? 'Peça' : 'Serviço'}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.unit_price)}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan="4" style={{ textAlign: 'right', fontWeight: 700 }}>Total:</td>
                  <td style={{ fontWeight: 700, color: 'var(--gold)' }}>{formatCurrency(itemsTotal)}</td></tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Photos Section */}
          <div className="card">
            <div className="card-header">
              <h3><Icon name="camera" /> Fotos do Veículo</h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select value={photoPhase} onChange={e => setPhotoPhase(e.target.value)} style={{ width: 'auto', padding: '6px 32px 6px 10px', fontSize: 13 }}>
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
                <button className="btn btn-outline btn-sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto}>
                  <Icon name="upload" /> Arquivo
                </button>
                <button className="btn btn-warning btn-sm" onClick={openCamera} disabled={uploadingPhoto}>
                  <Icon name="camera" /> Câmera
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileUpload} />
              </div>
            </div>
            {uploadingPhoto && <div style={{ textAlign: 'center', padding: 12, color: 'var(--gold)' }}>Enviando foto...</div>}
            
            {photos.length === 0 ? (
              <div className="empty-state" style={{ padding: 30 }}>
                <div className="icon"><Icon name="camera" size={34} /></div>
                <p>Nenhuma foto registrada</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>Tire fotos do veículo antes de iniciar o serviço</p>
              </div>
            ) : (
              <>
                {/* Entrada photos */}
                {photos.filter(p => p.phase === 'entrada').length > 0 && (
                  <div className="photos-section">
                    <h3 style={{ color: 'var(--info)' }}>Fotos de Entrada</h3>
                    <div className="photos-grid">
                      {photos.filter(p => p.phase === 'entrada').map(photo => (
                        <div key={photo.id} className="photo-card" onClick={() => setLightboxPhoto(photo)}>
                          <img src={photoDataUrls[photo.id] || ''} alt={photo.label} loading="lazy" />
                          <button className="photo-delete" onClick={(e) => { e.stopPropagation(); deletePhoto(photo.id); }}>✕</button>
                          <div className="photo-label">{new Date(photo.createdAt || photo.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Saída photos */}
                {photos.filter(p => p.phase === 'saida').length > 0 && (
                  <div className="photos-section">
                    <h3 style={{ color: 'var(--success)' }}>🟢 Fotos de Saída</h3>
                    <div className="photos-grid">
                      {photos.filter(p => p.phase === 'saida').map(photo => (
                        <div key={photo.id} className="photo-card" onClick={() => setLightboxPhoto(photo)}>
                          <img src={photoDataUrls[photo.id] || ''} alt={photo.label} loading="lazy" />
                          <button className="photo-delete" onClick={(e) => { e.stopPropagation(); deletePhoto(photo.id); }}>✕</button>
                          <div className="photo-label">{new Date(photo.createdAt || photo.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Datas</h3>
            <div className="detail-info">
              <div className="info-row"><span className="info-label">Criada:</span><span className="info-value">{formatDate(order.created_at)}</span></div>
              {order.started_at && <div className="info-row"><span className="info-label">Iniciada:</span><span className="info-value">{formatDate(order.started_at)}</span></div>}
              {order.estimated_completion && <div className="info-row"><span className="info-label">Previsão:</span><span className="info-value">{new Date(order.estimated_completion).toLocaleDateString('pt-BR')}</span></div>}
              {order.completed_at && <div className="info-row"><span className="info-label">Concluída:</span><span className="info-value">{formatDate(order.completed_at)}</span></div>}
              {order.delivered_at && <div className="info-row"><span className="info-label">Entregue:</span><span className="info-value">{formatDate(order.delivered_at)}</span></div>}
            </div>
          </div>

          {/* Add Log */}
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Adicionar Observação</h3>
            <textarea value={logText} onChange={e => setLogText(e.target.value)} placeholder="Registrar observação ou atualização..." style={{ minHeight: 60 }} />
            <button className="btn btn-primary btn-sm" onClick={addLog} style={{ marginTop: 8 }}>Registrar</button>
          </div>

          {/* Timeline */}
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Histórico</h3>
            {order.logs?.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Nenhum registro</p>
            ) : (
              <div className="timeline">
                {order.logs?.map(log => (
                  <div key={log.id} className="timeline-item">
                    <div className="action">{log.user_name}</div>
                    <div className="description">{log.description}</div>
                    <div className="time">{formatDate(log.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showCompletionModal && (
        <div className="modal-overlay" onClick={() => { if (!completionSaving) setShowCompletionModal(false); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="completion-title" onClick={e => e.stopPropagation()}>
            <h3 id="completion-title">Finalizar OS {order.code}</h3>
            <p>Deseja informar ao cliente <strong>{order.client_name}</strong> que o serviço foi finalizado?</p>
            <p style={{ color: 'var(--text-secondary)' }}>Ao escolher Sim, o WhatsApp será aberto com uma mensagem pronta para revisar e enviar.</p>
            {completionError && <div className="alert alert-error">{completionError}</div>}
            <div className="form-actions">
              <button className="btn btn-outline" onClick={() => completeOrder(false)} disabled={completionSaving}>
                {completionSaving ? 'Finalizando...' : 'Não, avisarei depois'}
              </button>
              <button className="btn btn-primary" onClick={() => completeOrder(true)} disabled={completionSaving}>
                {completionSaving ? 'Finalizando...' : 'Sim, avisar pelo WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}

      {completionNotice && (
        <div className="modal-overlay" onClick={() => setCompletionNotice(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="completion-notice-title" onClick={e => e.stopPropagation()}>
            <h3 id="completion-notice-title">{completionNotice.title}</h3>
            <p>{completionNotice.message}</p>
            {completionNotice.whatsappUrl && (
              <a className="btn btn-primary" href={completionNotice.whatsappUrl} target="_blank" rel="noopener noreferrer">
                Abrir WhatsApp
              </a>
            )}
            <div className="form-actions">
              <button className="btn btn-outline" onClick={() => setCompletionNotice(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Editar OS {order.code}</h3>
            {import.meta.env.MODE === 'offline' ? (
              <div className="form-group">
                <label>Técnico Responsável</label>
                <select value={editForm.assigned_to} onChange={e => setEditForm({...editForm, assigned_to: e.target.value})}>
                  <option value="">Selecione</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            ) : (
              <div className="form-group">
                <label>Responsável</label>
                <input
                  value={editForm.assigned_to_name || ''}
                  onChange={e => setEditForm({ ...editForm, assigned_to_name: e.target.value })}
                  maxLength={80}
                />
              </div>
            )}
            <div className="form-group">
              <label>Prioridade</label>
              <select value={editForm.priority} onChange={e => setEditForm({...editForm, priority: e.target.value})}>
                <option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option>
              </select>
            </div>
            <div className="form-group">
              <label>Diagnóstico</label>
              <textarea value={editForm.diagnosis} onChange={e => setEditForm({...editForm, diagnosis: e.target.value})} />
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8, flexWrap: 'wrap' }}>
                <label style={{ margin: 0 }}>Serviços Realizados</label>
                <select
                  value=""
                  onChange={e => {
                    if (!e.target.value) return;
                    const line = `• ${e.target.value}`;
                    const current = (editForm.services_performed || '').trim();
                    setEditForm({
                      ...editForm,
                      services_performed: current ? `${current}\n${line}` : line,
                    });
                  }}
                  style={{ width: 'auto', maxWidth: 280, padding: '4px 28px 4px 10px', fontSize: 12 }}
                >
                  <option value="">+ Inserir serviço da lista...</option>
                  {SERVICE_CATALOG.map(group => (
                    <optgroup key={group.category} label={group.category}>
                      {group.items.map(item => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <textarea value={editForm.services_performed} onChange={e => setEditForm({...editForm, services_performed: e.target.value})} placeholder="Descreva os serviços realizados ou selecione acima..." />
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8, flexWrap: 'wrap' }}>
                <label style={{ margin: 0 }}>Peças Utilizadas</label>
                <select
                  value=""
                  onChange={e => {
                    if (!e.target.value) return;
                    const line = `• ${e.target.value}`;
                    const current = (editForm.parts_used || '').trim();
                    setEditForm({
                      ...editForm,
                      parts_used: current ? `${current}\n${line}` : line,
                    });
                  }}
                  style={{ width: 'auto', maxWidth: 280, padding: '4px 28px 4px 10px', fontSize: 12 }}
                >
                  <option value="">+ Inserir peça da lista...</option>
                  {PARTS_CATALOG.map(group => (
                    <optgroup key={group.category} label={group.category}>
                      {group.items.map(item => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <textarea value={editForm.parts_used} onChange={e => setEditForm({...editForm, parts_used: e.target.value})} placeholder="Liste as peças utilizadas ou selecione acima..." />
            </div>
            <div className="form-group">
              <label>KM Saída</label>
              <input value={editForm.km_exit} onChange={e => setEditForm({...editForm, km_exit: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Observações</label>
              <textarea value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} />
            </div>
            <div className="form-actions" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteOrder}
                disabled={deletingOrder}
              >
                {deletingOrder ? 'Excluindo...' : 'Excluir OS'}
              </button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-outline" onClick={() => setShowEditModal(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={saveEdit}>Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Lightbox */}
      {lightboxPhoto && (
        <div className="lightbox-overlay" onClick={() => setLightboxPhoto(null)}>
          <img src={photoDataUrls[lightboxPhoto.id] || ''} alt={lightboxPhoto.label} />
        </div>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <div className="modal-overlay" onClick={closeCamera}>
          <div className="modal camera-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <h3><Icon name="camera" /> Capturar Foto ({photoPhase === 'entrada' ? 'Entrada' : 'Saída'})</h3>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', borderRadius: 10, background: '#000' }} />
            <div className="camera-controls">
              <button className="btn btn-outline" onClick={closeCamera}>Cancelar</button>
              <button className="btn-capture" onClick={capturePhoto} aria-label="Capturar foto"><Icon name="camera" size={26} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
