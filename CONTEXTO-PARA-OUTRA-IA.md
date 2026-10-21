# Contexto do projeto Moreira Direções para continuidade por outra IA

Atualizado em: 20/10/2026, após o deploy e o teste de login em produção.

## 1. Estado atual e resultado principal

O sistema está publicado no Firebase Hosting do cliente:

- Aplicação: https://moreira-direcoes.web.app
- Console Firebase: https://console.firebase.google.com/project/moreira-direcoes/overview
- Projeto Firebase de produção: `moreira-direcoes`
- Site Hosting: `moreira-direcoes`
- ID da empresa usado nos caminhos do Firestore: `moreira`

O deploy foi executado com sucesso a partir do computador local, usando o Firebase CLI. Foram publicados o site, as regras e os índices do Firestore. Após o cliente habilitar o provedor Anônimo no Firebase Authentication, foi feito um teste real na URL pública: a entrada por nome funcionou e o dashboard carregou.

Não foi feita migração de dados do projeto antigo nem dos emuladores. No teste público, o dashboard mostrava os totais zerados.

## 2. Projeto e ambiente

- Repositório Git deste workspace: https://github.com/Hks72BR/Sistema-Moreira
- Branch local: `main`
- Último commit observado: `336c97d` — merge anterior da branch main.
- Diretório local no Windows: `C:\Users\higor\Desktop\Moreira direções APP`
- Frontend: React 18, Vite 5, React Router 6.
- Backend: Firebase Authentication e Cloud Firestore.
- Há também uma edição desktop Electron e uma edição de demonstração totalmente offline.
- Fotos em produção usam integração com Cloudinary; o upload em produção não foi validado nesta etapa.

O workspace já continha muitas alterações e arquivos não rastreados antes da finalização desta conversa. Não atribuir automaticamente todas essas mudanças a este trabalho. Não reverter, apagar ou sobrescrever alterações existentes sem entender sua origem.

Nenhum commit ou push foi feito nesta etapa. O deploy usou o build do estado local, que inclui alterações ainda não commitadas. Portanto, a versão publicada não corresponde necessariamente ao código atualmente disponível no GitHub.

## 3. O que o usuário pediu

1. Subir o ambiente de desenvolvimento.
2. Conectar a aplicação ao novo Firebase do cliente.
3. Substituir o acesso com senha por uma entrada simples informando o nome.
4. Permitir uso simultâneo pela equipe, com sessões separadas e alterações aparecendo para todos em tempo real.
5. Não usar controle de funções/perfis diferentes no fluxo principal.
6. Publicar efetivamente a aplicação no Firebase Hosting, e não apenas deixá-la rodando localmente.

O usuário mencionou até seis pessoas, mas ainda não forneceu a lista de nomes. Foi escolhido manter o campo de nome livre por enquanto. Não existe limite efetivo de seis pessoas nem lista de pessoas autorizadas.

## 4. Login por nome: comportamento e limitações

Na versão principal conectada ao Firebase:

- A tela de entrada solicita apenas o nome.
- O app usa Firebase Anonymous Authentication para obter uma sessão Firebase.
- O nome informado fica em `sessionStorage`, na chave `moreira.userName`.
- O fluxo configura `browserSessionPersistence` para a autenticação.
- Usuários recebem os mesmos acessos; o objeto interno usa `role: 'admin'` por compatibilidade com a aplicação.
- Não é necessário cadastro prévio nem senha.
- A tela de login mostra um aviso de que o nome não comprova identidade.

**Limitação importante:** esse modelo não autentica uma pessoa real. Qualquer pessoa que consiga acessar o site pode informar qualquer nome e operar os dados. Não chamar isso de acesso restrito à equipe ou de autenticação segura por nome.

As regras publicadas permitem leitura e escrita dos dados da empresa para qualquer sessão autenticada, inclusive anônima. Isso inclui criar, modificar e apagar clientes, veículos, orçamentos, ordens e outros dados. Os logs de OS permitem leitura e criação, mas não atualização ou exclusão. A coleção de perfis antigos `users` está bloqueada pelas regras.

Se futuramente houver necessidade de limitar acesso a seis pessoas ou proteger dados sensíveis, será necessário um modelo de identidade verificada e regras de autorização correspondentes. Uma lista de nomes, sozinha, não comprova identidade.

Na edição offline, o fluxo anterior de usuário e senha foi preservado.

## 5. Sincronização em tempo real

- O contexto de autenticação observa coleções principais do Firestore e expõe um sinal de atualização de dados (`dataVersion`).
- Clientes, veículos, orçamentos, ordens e notas são observados por listeners.
- As telas relevantes recarregam os dados quando o sinal muda.
- O detalhe de OS também observa subcoleções de itens, logs e fotos.
- O Firestore foi configurado para persistência multiaba.
- O responsável por uma OS passou a ser informado por nome/texto livre no fluxo principal. A seleção de usuários permanece na edição offline.

Validações realizadas em desenvolvimento:

- Entrada com nomes diferentes em abas separadas após recarregar as páginas.
- Um cliente fictício criado em uma aba apareceu automaticamente na outra.
- O registro fictício foi removido do emulador depois do teste.

Limites da validação:

- A sincronização foi observada entre abas no ambiente de emuladores; não houve validação completa com dois dispositivos físicos em produção.
- Durante hot reload, apareceu temporariamente um erro `useAuth(...) is null`; após recarregar, o login voltou a funcionar. Não foi demonstrada uma correção específica da causa.
- O navegador mostrou aviso de depreciação de `enableMultiTabIndexedDbPersistence`. O aviso não impediu o login ou o carregamento do dashboard.
- Não afirmar que todos os cenários de logout, duplicação de abas, reconexão e concorrência foram testados.

## 6. Arquivos relevantes alterados no trabalho de login/sincronização

### Autenticação, Firebase e dados

- `src/contexts/AuthContext.jsx`: autenticação anônima, nome por sessão, compatibilidade offline e listeners globais.
- `src/pages/Login.jsx`: entrada por nome na versão principal e aviso de acesso; senha mantida no modo offline.
- `src/lib/firebase.js`: separação entre emuladores e produção e persistência multiaba.
- `src/lib/firestore.js`: operações do banco, listeners de subcoleções de OS e responsável por nome.
- `firestore.rules`: regras compatíveis com o acesso anônimo escolhido.

### Telas com atualização conforme os dados mudam

- `src/pages/Clients.jsx`
- `src/pages/ClientDetail.jsx`
- `src/pages/Budgets.jsx`
- `src/pages/BudgetDetail.jsx`
- `src/pages/ServiceOrders.jsx`
- `src/pages/ServiceOrderDetail.jsx`
- `src/pages/Dashboard.jsx`
- `src/pages/Reports.jsx`

### Ajustes de interface e compatibilidade

- `src/pages/ServiceOrderForm.jsx` e `src/pages/ServiceOrderDetail.jsx`: responsável digitável na versão principal.
- `src/components/Layout.jsx`, `src/App.jsx` e `src/pages/Settings.jsx`: gestão de usuários e troca de senha removidas do fluxo principal, preservando a edição offline.
- `src/offline/auth.js` e `src/offline/firestore.js`: exports auxiliares para compatibilidade dos builds offline; esses arquivos estavam não rastreados no Git.
- `README.md`: documentação do acesso por nome, sincronização, configuração e limitações.

Há outras alterações no workspace, incluindo scripts, CSS, Electron, fotos, PWA/rede local e edição offline. Ler os diffs antes de decidir seu escopo; não foram todas produzidas nesta sequência.

## 7. Configuração: desenvolvimento versus produção

O arquivo `.env` local contém a configuração Web do Firebase do cliente. Não copiar credenciais ou o conteúdo completo desse arquivo para chats, commits ou relatórios.

Valores de destino confirmados:

```dotenv
VITE_FIREBASE_PROJECT_ID=moreira-direcoes
VITE_FIREBASE_AUTH_DOMAIN=moreira-direcoes.firebaseapp.com
```

As demais variáveis `VITE_FIREBASE_*` já estavam preenchidas localmente. O build de produção utiliza essas variáveis.

### Desenvolvimento

```powershell
npm run dev
```

Esse comando inicia os emuladores de Authentication e Firestore, faz o seed local previsto pelo projeto e inicia o Vite.

- Aplicação local observada: http://127.0.0.1:5173/
- Authentication Emulator: porta `9099`.
- Firestore Emulator: porta `8080`.
- Projeto de emuladores: `demo-moreira`.

O fato de `.env` apontar para o cliente não faz `npm run dev` usar o banco remoto: `src/lib/firebase.js` direciona o desenvolvimento normal aos emuladores.

O servidor local estava funcionando durante a conversa, mas é necessário verificar se continua ativo antes de reutilizá-lo.

### Produção

```powershell
npm run build
```

O Vite gera a pasta `dist`, publicada pelo Firebase Hosting.

**Cuidado com o projeto padrão:** `.firebaserc` ainda aponta para `sistema-moreira`, o projeto antigo. Ele não foi atualizado nesta etapa. Por isso, o deploy foi feito com `--project moreira-direcoes` explícito. Não executar um deploy genérico confiando no projeto padrão atual.

## 8. Deploy executado e permissões

Inicialmente, a conta autenticada no Firebase CLI não tinha acesso ao projeto novo, e a consulta ao Hosting retornou HTTP 403.

O usuário então concedeu acesso de Owner à conta utilizada no computador. Após isso, a consulta ao site Hosting funcionou.

Comando executado com sucesso no Windows:

```powershell
& .\node_modules\.bin\firebase.cmd deploy --only hosting,firestore --project moreira-direcoes --non-interactive
```

Resultado confirmado pelo CLI:

- Regras `firestore.rules` compilaram.
- Regras foram publicadas no Firestore.
- Índices de `firestore.indexes.json` foram enviados com sucesso.
- 86 arquivos de `dist` foram enviados ao Hosting.
- A versão do Hosting foi finalizada e liberada.
- URL final: https://moreira-direcoes.web.app

O CLI confirmou o envio dos índices; o estado final de construção de cada índice no console não foi verificado separadamente.

Não foi publicado Firebase Storage; a configuração atual de deploy envolve Hosting e Firestore.

## 9. Inicialização do Authentication e teste público

Depois do deploy, a tela pública abriu, mas a primeira tentativa de login retornou:

```text
auth/configuration-not-found
```

Uma consulta à configuração administrativa do Authentication também retornou `CONFIGURATION_NOT_FOUND`, indicando que ele ainda não estava inicializado no projeto.

Foi tentada a inicialização pela API `identityPlatform:initializeAuth`, mas a chamada foi recusada com:

```text
BILLING_NOT_ENABLED : Identity Platform feature requires billing to be enabled.
```

Essa tentativa não habilitou faturamento nem alterou o plano. Não repetir esse caminho presumindo que é necessário contratar Identity Platform para o acesso anônimo básico.

O usuário foi orientado a abrir Firebase Console > Authentication > Começar/Get started e habilitar o provedor Anônimo. Ele confirmou que fez isso.

Em seguida, foi recarregada a URL pública e feito login com o nome `Verificação de deploy`. O app redirecionou para `/` e carregou o dashboard sem erro de autenticação ou de permissão visível.

Nenhum cliente, orçamento ou OS foi criado para esse teste público. O login pode ter deixado uma conta anônima de teste no Authentication; não foi feita limpeza dessa conta.

## 10. GitHub Actions: situação real, diferente do deploy local

O usuário perguntou se seria possível publicar pela esteira para evitar autenticar a conta do cliente no computador.

Foi verificado:

- O GitHub CLI (`gh`) não estava autenticado neste ambiente.
- A integração GitHub disponível permitiu consultar o repositório e suas execuções.
- O workflow remoto `.github/workflows/deploy.yml` usa o secret `FIREBASE_TOKEN`.
- O workflow remoto faz deploy em push para `main`.
- A última execução consultada teve deploy bem-sucedido em 15/08/2026:
  https://github.com/Hks72BR/Sistema-Moreira/actions/runs/31898462659
- O `.firebaserc` remoto também aponta para `sistema-moreira`.
- Não foi verificado se o token da esteira tem acesso ao projeto `moreira-direcoes`.

Existe uma diferença local/remoto:

- O workflow local foi alterado para permitir publicação manual via `workflow_dispatch`, com input booleano `deploy`, apenas em `main`.
- Essa alteração não foi enviada ao GitHub.
- O workflow local não injeta as variáveis `VITE_FIREBASE_*` do cliente no build; o `.env` local não é automaticamente disponibilizado ao GitHub Actions.

**O deploy desta conversa foi local, não pela esteira.** Para habilitar deploys futuros pelo GitHub, será necessário alinhar destino, configuração do build, credenciais e versão commitada. Não disparar a esteira antiga sem conferir esses pontos.

Há ainda referências a `moreiradire-max/Moreira-app` no README e na configuração de distribuição Electron. O remoto Git observado neste workspace é `Hks72BR/Sistema-Moreira`. Essa divergência não foi resolvida.

## 11. Validações e pendências conhecidas

### Passou

- `npm run build` sem avisos de imports dinâmicos/estáticos do Firebase.
- `npm run test:offline` 100% aprovado (fases `seed` e `verify`, incluindo verificação do logo empacotado).
- Compilação das regras pelo Firebase CLI durante a publicação.
- Deploy atualizado de Hosting (com polimento de Login, Configurações sem Proposta Comercial, persistência moderna do Firestore e `.firebaserc` apontando para `moreira-direcoes`).
- Abertura da página pública e login anônimo por nome em produção.

### Avisos ou pendências que permanecem

- O Vite avisa sobre bundle grande (`jspdf` / `html2canvas`); o build não falha por isso.
- Não houve teste manual completo de CRUD, upload de fotos no Cloudinary, PDFs e todos os fluxos em produção.
- Não houve migração dos dados antigos.
- A lista de nomes da equipe ainda não foi fornecida (ficou para etapa posterior) e o campo de nome segue livre.
- Há mudanças locais não commitadas que precisam ser revisadas e commitadas quando desejado.

## 12. Recomendações para quem continuar

1. Tratar o deploy atual como concluído: o sistema já está disponível e atualizado em https://moreira-direcoes.web.app.
2. Conferir `git status` e ler os diffs antes de preparar um commit.
3. Não sobrescrever `.env`, não compartilhar tokens e não commitar credenciais.
4. Preservar o modo offline (`npm run test:offline`) ao modificar autenticação e acesso a dados.
5. Quando o cliente fornecer a lista de nomes da equipe, atualizar o login/seleção de responsável conforme desejado.
6. Priorizar validações direcionadas em produção (dados da empresa em Configurações, upload de foto via Cloudinary e fluxo OS/Orçamento).

## Resumo curto para iniciar outra conversa

> Estamos trabalhando no sistema Moreira Direções, React/Vite com Firebase e edição Electron/offline. O app está publicado e atualizado em https://moreira-direcoes.web.app (projeto Firebase `moreira-direcoes`, já configurado como `default` no `.firebaserc`). O login principal usa nome livre com Firebase Anonymous Auth; a lista de nomes da equipe ficou para depois. Foram corrigidos: a tela de Configurações (removida a Proposta Comercial de venda e atualizado o Manual de Padronização), o texto da tela de Login, a persistência multiaba moderna do Firestore (`persistentLocalCache`), os avisos de imports dinâmicos/estáticos do Firebase, o fallback do `AuthContext` contra erro de HMR e a condição de corrida do logo em `npm run test:offline` (que agora passa 100%). Restam para validação final pelo usuário em produção: preencher os dados da oficina em Configurações, testar upload de foto (Cloudinary) e validar um fluxo completo de Cliente -> Orçamento -> OS -> PDF/WhatsApp.
