# Plano V1 Produção — Moreira Direções (2 dias)

O app está **funcionalmente completo** com Firebase (Auth, Firestore, Storage).  
Faltam ajustes de segurança, limpeza de código legado, deploy no Firebase Hosting e testes de sanidade.

---

## DIA 1 — Hardening & Limpeza

### Fase 1: Variáveis de Ambiente (~30min)

- [ ] Criar `.env` com config do Firebase:
  ```
  VITE_FIREBASE_API_KEY=AIzaSyDFwT4uvP2m54_I-Y_e9D0GHgje9HvpBYw
  VITE_FIREBASE_AUTH_DOMAIN=sietemamoreira.firebaseapp.com
  VITE_FIREBASE_PROJECT_ID=sietemamoreira
  VITE_FIREBASE_STORAGE_BUCKET=sietemamoreira.firebasestorage.app
  VITE_FIREBASE_MESSAGING_SENDER_ID=837379691664
  VITE_FIREBASE_APP_ID=1:837379691664:web:c0e153b7b89cde9db77415
  ```
- [ ] Atualizar `src/lib/firebase.js` para ler de `import.meta.env.VITE_*`
- [ ] Criar `.env.example` (com valores vazios) para documentação
- [ ] Adicionar `.env` ao `.gitignore`

### Fase 2: Reset de Senha do Admin (~1h)

- [ ] Implementar reset de senha em `src/contexts/AuthContext.jsx` (linha ~170)
  - Usar a mesma técnica do "secondary app" já usada na criação de usuário
  - Evita depender de Cloud Functions
- [ ] Atualizar `src/pages/Users.jsx` (`handleResetPassword`, linha ~38) para tratar sucesso/erro corretamente

### Fase 3: Limpeza de Código Legado (~30min)

- [ ] Remover dependências mortas do `package.json`:
  - `express`, `cors`, `multer`, `sql.js`, `bcryptjs`, `jsonwebtoken`
- [ ] Remover pasta `server/` inteira (não é mais usada pelo frontend)
- [ ] Remover pasta `data/` (SQLite + fotos locais) — se a migração já foi executada
- [ ] Remover proxy `/api` do `vite.config.js`
- [ ] Limpar scripts obsoletos do `package.json` (`dev:server`, etc.)

### Fase 4: Segurança (~30min)

- [ ] Verificar `firestore.rules` — já estão boas (auth + role-based + logs imutáveis). Confirmar que há deny-all no catch-all
- [ ] Verificar `storage.rules` — OK (500KB limit, image-only, auth+company check)
- [ ] Limpar `console.log` com dados sensíveis no código
- [ ] Adicionar meta tag CSP básica no `index.html`

### Fase 5: Polimento UI para V1 (~1h)

- [ ] Verificar favicon/icon em `public/`
- [ ] Verificar tratamento de erros (try/catch com mensagem amigável) em todas as páginas
- [ ] Verificar loading states (spinners) em operações assíncronas
- [ ] Teste rápido de responsividade mobile

---

## DIA 2 — Build, Deploy & Validação

### Fase 6: Build & Deploy (~1h)

- [ ] `npm run build` — gerar `dist/`
- [ ] Testar localmente: `firebase emulators:start --only hosting` ou `npx serve dist`
- [ ] `firebase login` (se não logado)
- [ ] `firebase deploy --only firestore:rules` — publicar regras de segurança
- [ ] `firebase deploy --only storage` — publicar regras de storage
- [ ] `firebase deploy --only firestore:indexes` — publicar indexes
- [ ] `firebase deploy --only hosting` — app live!

### Fase 7: Teste de Sanidade em Produção (~2h)

| # | Teste | Status |
|---|-------|--------|
| 1 | **Login** — entrar com admin | ⬜ |
| 2 | **Clientes** — criar, editar, listar, buscar, deletar | ⬜ |
| 3 | **Veículos** — criar vinculado a cliente | ⬜ |
| 4 | **Orçamento** — criar com itens, aprovar, gerar PDF | ⬜ |
| 5 | **OS** — criar a partir de orçamento, mudar status, fotos entrada | ⬜ |
| 6 | **OS** — concluir, fotos saída, entregar | ⬜ |
| 7 | **Relatórios** — mensal, por serviço, histórico de cliente | ⬜ |
| 8 | **Usuários** — criar técnico, logar com ele, verificar permissões | ⬜ |
| 9 | **Configurações** — alterar dados da empresa | ⬜ |
| 10 | **Trocar Senha** — trocar senha do próprio usuário | ⬜ |
| 11 | **Reset Senha** — admin reseta senha de outro usuário | ⬜ |
| 12 | **Offline** — testar com rede desligada (persistence) | ⬜ |

### Fase 8: Ajustes Pós-Deploy (~1h buffer)

- [ ] Corrigir bugs encontrados nos testes
- [ ] Trocar senha padrão do admin (`Moreira2024!` → nova senha forte)
- [ ] Preencher dados iniciais da empresa em Configurações

---

## Arquivos-chave

| Arquivo | Ação |
|---------|------|
| `src/lib/firebase.js` | Mover config para `.env` |
| `src/contexts/AuthContext.jsx` | Implementar reset de senha (linha 170) |
| `src/pages/Users.jsx` | Ajustar handler de reset (linha 38) |
| `package.json` | Limpar dependências e scripts |
| `vite.config.js` | Remover proxy `/api` |
| `firebase.json` | Config de deploy (já pronto) |
| `firestore.rules` | Verificar catch-all deny |
| `storage.rules` | Verificar (já OK) |
| `server/` | **REMOVER inteira** |
| `data/` | **REMOVER** (se migração feita) |
| `index.html` | Adicionar meta CSP |

---

## Fora do Escopo da V1

- ❌ Build do Electron atualizado (tratar separadamente)
- ❌ Multi-tenant (COMPANY_ID fixo `'moreira'`)
- ❌ CI/CD pipeline
- ❌ Domínio customizado (usar URL padrão do Firebase Hosting)
- ❌ Monitoramento (Sentry, etc.)
- ❌ Backup automático
