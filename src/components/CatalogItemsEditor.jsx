import { useState, useRef, useEffect } from 'react';
import { SERVICE_CATALOG, PARTS_CATALOG } from '../lib/catalog';

export default function CatalogItemsEditor({ items, setItems, title = 'Itens do Orçamento' }) {
  const [openRowIndex, setOpenRowIndex] = useState(null);
  const [activeTab, setActiveTab] = useState('auto'); // 'auto' | 'servico' | 'peca' | 'todos'
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenRowIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatCurrency = (v) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  const addItem = (defaultType = 'servico', openCatalog = false) => {
    const nextIndex = items.length;
    setItems([...items, { description: '', type: defaultType, quantity: 1, unit_price: 0 }]);
    if (openCatalog) {
      setActiveTab(defaultType);
      setOpenRowIndex(nextIndex);
    }
  };

  const updateItem = (index, field, value) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    setItems(next);
  };

  const selectCatalogEntry = (index, name, entryType) => {
    const next = [...items];
    next[index] = {
      ...next[index],
      description: name,
      type: entryType,
    };
    setItems(next);
    setOpenRowIndex(null);
  };

  const removeItem = (index) => {
    if (items.length === 1) {
      setItems([{ description: '', type: 'servico', quantity: 1, unit_price: 0 }]);
      return;
    }
    setItems(items.filter((_, i) => i !== index));
    if (openRowIndex === index) setOpenRowIndex(null);
  };

  const getFilteredCatalog = (rowItem) => {
    const effectiveTab = activeTab === 'auto' ? (rowItem.type || 'servico') : activeTab;
    const rawSearch = (rowItem.description || '').trim().toLowerCase();

    // Se o texto digitado já é exatamente um item do catálogo, mostrar a lista completa para facilitar troca
    const isExactMatch = [...SERVICE_CATALOG, ...PARTS_CATALOG].some(group =>
      group.items.some(it => it.toLowerCase() === rawSearch)
    );
    const search = isExactMatch ? '' : rawSearch;

    const groups = [];
    if (effectiveTab === 'servico' || effectiveTab === 'todos') {
      for (const group of SERVICE_CATALOG) {
        const matched = search
          ? group.items.filter(it =>
              it.toLowerCase().includes(search) || group.category.toLowerCase().includes(search)
            )
          : group.items;
        if (matched.length > 0) {
          groups.push({ category: `🔧 ${group.category}`, type: 'servico', items: matched });
        }
      }
    }
    if (effectiveTab === 'peca' || effectiveTab === 'todos') {
      for (const group of PARTS_CATALOG) {
        const matched = search
          ? group.items.filter(it =>
              it.toLowerCase().includes(search) || group.category.toLowerCase().includes(search)
            )
          : group.items;
        if (matched.length > 0) {
          groups.push({ category: `⚙️ ${group.category}`, type: 'peca', items: matched });
        }
      }
    }
    return { groups, effectiveTab };
  };

  return (
    <div ref={containerRef}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, margin: '20px 0 12px' }}>
        <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text)' }}>{title}</h3>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Clique no campo de descrição para escolher da lista de <strong>Serviços de Direção/Suspensão</strong> ou <strong>Peças</strong>, ou digite livremente.
        </span>
      </div>

      <div className="items-table">
        <div className="item-row" style={{ fontWeight: 600, fontSize: 13, color: '#64748b' }}>
          <span>Descrição (Serviço ou Peça)</span>
          <span>Tipo</span>
          <span>Qtd</span>
          <span>Vlr Unit.</span>
          <span>Total</span>
          <span></span>
        </div>

        {items.map((item, i) => {
          const isOpen = openRowIndex === i;
          const { groups, effectiveTab } = getFilteredCatalog(item);

          return (
            <div key={i} className="item-row" style={{ position: 'relative' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  value={item.description}
                  onFocus={() => {
                    setActiveTab('auto');
                    setOpenRowIndex(i);
                  }}
                  onChange={e => {
                    updateItem(i, 'description', e.target.value);
                    if (openRowIndex !== i) setOpenRowIndex(i);
                  }}
                  placeholder={
                    item.type === 'peca'
                      ? 'Selecione uma peça da lista ou digite...'
                      : 'Selecione um serviço da lista ou digite...'
                  }
                  style={{ width: '100%', paddingRight: 82 }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (isOpen) {
                      setOpenRowIndex(null);
                    } else {
                      setActiveTab('auto');
                      setOpenRowIndex(i);
                    }
                  }}
                  title="Abrir catálogo de serviços e peças"
                  style={{
                    position: 'absolute',
                    right: 6,
                    padding: '4px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 6,
                    border: '1px solid rgba(245,166,35,0.3)',
                    background: isOpen ? 'var(--gold)' : 'rgba(245,166,35,0.12)',
                    color: isOpen ? '#0a0a0f' : 'var(--gold)',
                    cursor: 'pointer',
                  }}
                >
                  Lista ▾
                </button>

                {isOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      minWidth: 340,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--gold)',
                      borderRadius: 10,
                      zIndex: 60,
                      maxHeight: 320,
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: '0 12px 32px rgba(0,0,0,0.65)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Abas do catálogo */}
                    <div
                      style={{
                        display: 'flex',
                        gap: 6,
                        padding: '8px 10px',
                        background: 'var(--bg-surface)',
                        borderBottom: '1px solid var(--border)',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => setActiveTab('servico')}
                          style={{
                            padding: '4px 10px',
                            fontSize: 12,
                            fontWeight: 600,
                            borderRadius: 6,
                            border: 'none',
                            cursor: 'pointer',
                            background: effectiveTab === 'servico' ? 'var(--blue)' : 'rgba(255,255,255,0.06)',
                            color: effectiveTab === 'servico' ? '#fff' : 'var(--text-secondary)',
                          }}
                        >
                          🔧 Serviços
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('peca')}
                          style={{
                            padding: '4px 10px',
                            fontSize: 12,
                            fontWeight: 600,
                            borderRadius: 6,
                            border: 'none',
                            cursor: 'pointer',
                            background: effectiveTab === 'peca' ? 'var(--gold)' : 'rgba(255,255,255,0.06)',
                            color: effectiveTab === 'peca' ? '#0a0a0f' : 'var(--text-secondary)',
                          }}
                        >
                          ⚙️ Peças
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('todos')}
                          style={{
                            padding: '4px 10px',
                            fontSize: 12,
                            fontWeight: 600,
                            borderRadius: 6,
                            border: 'none',
                            cursor: 'pointer',
                            background: effectiveTab === 'todos' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
                            color: effectiveTab === 'todos' ? '#fff' : 'var(--text-secondary)',
                          }}
                        >
                          Todos
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpenRowIndex(null)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          fontSize: 12,
                          cursor: 'pointer',
                          padding: '2px 6px',
                        }}
                      >
                        Fechar ✕
                      </button>
                    </div>

                    {/* Lista de opções */}
                    <div style={{ overflowY: 'auto', maxHeight: 265 }}>
                      {groups.length === 0 ? (
                        <div style={{ padding: '14px 12px', fontSize: 13, color: 'var(--text-muted)' }}>
                          Nenhum item da lista corresponde a "{item.description}". Você pode manter o texto digitado normalmente.
                        </div>
                      ) : (
                        groups.map((group) => (
                          <div key={group.category}>
                            <div
                              style={{
                                padding: '6px 12px',
                                fontSize: 11,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                color: group.type === 'peca' ? 'var(--gold)' : 'var(--blue-light)',
                                background: 'rgba(255,255,255,0.03)',
                                borderBottom: '1px solid var(--border)',
                                position: 'sticky',
                                top: 0,
                              }}
                            >
                              {group.category}
                            </div>
                            {group.items.map((entryName) => (
                              <div
                                key={entryName}
                                onClick={() => selectCatalogEntry(i, entryName, group.type)}
                                style={{
                                  padding: '8px 14px',
                                  fontSize: 13,
                                  cursor: 'pointer',
                                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: 8,
                                  background: item.description === entryName ? 'rgba(245,166,35,0.12)' : 'transparent',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                                onMouseLeave={e =>
                                  (e.currentTarget.style.background =
                                    item.description === entryName ? 'rgba(245,166,35,0.12)' : 'transparent')
                                }
                              >
                                <span>{entryName}</span>
                                <span
                                  style={{
                                    fontSize: 10,
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    fontWeight: 600,
                                    flexShrink: 0,
                                    background: group.type === 'peca' ? 'rgba(245,166,35,0.15)' : 'rgba(43,127,255,0.15)',
                                    color: group.type === 'peca' ? 'var(--gold)' : 'var(--blue-light)',
                                  }}
                                >
                                  {group.type === 'peca' ? 'Peça' : 'Serviço'}
                                </span>
                              </div>
                            ))}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <select
                value={item.type}
                onChange={e => {
                  updateItem(i, 'type', e.target.value);
                  if (openRowIndex === i) setActiveTab(e.target.value);
                }}
              >
                <option value="servico">Serviço</option>
                <option value="peca">Peça</option>
              </select>

              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={e => updateItem(i, 'quantity', Number(e.target.value))}
              />

              <input
                type="number"
                min="0"
                step="0.01"
                value={item.unit_price}
                onChange={e => updateItem(i, 'unit_price', Number(e.target.value))}
              />

              <span className="item-total">{formatCurrency(item.quantity * item.unit_price)}</span>

              <button type="button" className="btn-remove-item" onClick={() => removeItem(i)} title="Remover item">
                ✕
              </button>
            </div>
          );
        })}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
          <button type="button" className="btn-add-item" onClick={() => addItem('servico', false)}>
            + Adicionar Item
          </button>
          <button
            type="button"
            className="btn-add-item"
            onClick={() => addItem('servico', true)}
            style={{ borderColor: 'rgba(43,127,255,0.35)', color: 'var(--blue-light)' }}
          >
            🔧 + Serviço da Lista
          </button>
          <button
            type="button"
            className="btn-add-item"
            onClick={() => addItem('peca', true)}
            style={{
              background: 'rgba(245,166,35,0.08)',
              borderColor: 'rgba(245,166,35,0.35)',
              color: 'var(--gold)',
            }}
          >
            ⚙️ + Peça da Lista
          </button>
        </div>
      </div>
    </div>
  );
}
