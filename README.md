<div align="center">
  <img src="public/logo.png" alt="Moreira Direções" width="300" />
  
  # 🔧 Moreira Direções
  
  ### Sistema Inteligente de Gestão para Oficinas de Direção Veicular
  
  ![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
  ![Version](https://img.shields.io/badge/Version-1.0.1-blue)
  ![License](https://img.shields.io/badge/License-Proprietary-red)
  
</div>

---

## 📋 Sobre

**Moreira Direções** é um sistema de gestão completo e moderno, desenvolvido especificamente para oficinas mecânicas especializadas em manutenção de sistemas de direção veicular. Com interface intuitiva, funcionalidades robustas e suporte multi-usuário, o sistema oferece controle total sobre todos os aspectos operacionais da oficina.

---

## ✨ Funcionalidades Principais

### 👥 Gestão de Usuários e Acesso
- Entrada simples com nome, sem senha ou cadastro de contas
- O nome é apenas identificativo; não confirma a identidade de quem acessa
- Todos os usuários têm os mesmos acessos no sistema

### 📱 Gestão de Clientes
- Cadastro completo de clientes com informações de contato
- Histórico detalhado de atendimentos
- Acompanhamento de relacionamento com cliente
- Busca rápida e filtros avançados

### 🚗 Gestão de Veículos
- Cadastro vinculado ao cliente
- Tipo de direção (hidráulica, elétrica, etc.)
- Histórico de serviços por veículo
- Informações técnicas e especificações

### 💰 Orçamentos
- Criação rápida de orçamentos
- Aprovação e acompanhamento
- Templates personalizáveis
- Conversão automática para Ordem de Serviço

### 🔧 Ordens de Serviço
- Fluxo completo: Aberta → Em Andamento → Concluída → Entregue
- Registro de fotos do processo (entrada e saída)
- Detalhamento de serviços e peças
- Acompanhamento em tempo real

### 📸 Gestão de Fotos
- Captura de fotos via câmera ou upload
- Compressão automática para otimizar armazenamento
- Integração com Cloudinary para 25GB de armazenamento gratuito
- Visualização em galeria

### 📊 Relatórios Avançados
- Relatórios mensais de faturamento
- Análise por tipo de serviço
- Histórico completo do cliente
- Exportação em PDF
- Visualização gráfica de tendências

### ⚙️ Configurações e Personalização
- Dados da empresa (nome, CNPJ, contato)
- Personalização de NF-e
- Definição de taxas e margens
- Backup de dados

### 📄 Controle de NF-e
- Controle interno de notas fiscais
- Integração preparada para emissores homologados
- Rastreamento de documentos

---

## 🚀 Vantagens

✅ **Desktop + Web** - Acesse via aplicativo desktop (Windows) ou navegador
✅ **Offline Ready** - Funciona mesmo sem conexão (sincroniza depois)
✅ **Cloud Storage** - Fotos armazenadas com segurança na nuvem
✅ **Auto-Update** - Aplicativo se atualiza automaticamente
⚠️ **Acesso simplificado** - O nome não verifica identidade; qualquer pessoa com acesso ao app pode operar nos dados
✅ **Relatórios** - Análises completas em PDF
✅ **Uso pela equipe** - Cada pessoa informa seu nome ao entrar

---

## 🛠️ Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | React 18.3 + Vite 5.4 |
| **Desktop** | Electron 42.2 |
| **Auto-Update** | electron-updater 6.8 |
| **Backend** | Firebase (Auth + Firestore) |
| **Banco de Dados** | Firestore (NoSQL) |
| **Storage** | Cloudinary |
| **PDF** | jsPDF + jsPDF-AutoTable |
| **Compressão** | browser-image-compression |
| **Roteamento** | React Router 6.28 |
| **Build** | electron-builder 26.8 |

### Testar no celular pela rede local

1. Conecte o computador e o celular à mesma rede Wi-Fi.
2. No computador, execute `npm run dev:lan`.
3. No celular, abra o endereço de instalação do certificado CA exibido no terminal
   (`http://<IP-IPv4-do-computador>:5174/dev-root-ca.cer`) e instale-o como certificado
   de autoridade certificadora:
   - **Android:** Configurações > Segurança > Criptografia e credenciais > Instalar
     certificado > Certificado CA. Os nomes dos menus podem variar por fabricante.
   - **iPhone/iPad:** instale o perfil baixado em Ajustes > Perfil Baixado ou
     **VPN e Gerenciamento de Dispositivo**; depois habilite a confiança total em
     Ajustes > Geral > Sobre > Ajustes de Confiança de Certificados.
   - **Outro notebook Windows:** importe o arquivo em `certmgr.msc` para Certificados
     (Usuário Atual) > Autoridades de Certificação Raiz Confiáveis.
4. Abra o endereço HTTPS exibido no terminal (`https://<IP-IPv4-do-computador>:5173`).
   No Android/Chrome, use **Instalar app** no menu do navegador; no iPhone/iPad/Safari,
   use **Compartilhar > Adicionar à Tela de Início**.

O comando usa `mkcert` para criar uma autoridade certificadora local confiável no perfil
do Windows. Se ainda não estiver instalado, instale-o com
`winget install --exact --id FiloSottile.mkcert` e rode o comando novamente. O terminal
mostra a impressão digital SHA-256 da CA; confira-a ao verificar o certificado no
dispositivo. Instale a CA apenas nos seus dispositivos de teste e remova-a quando não
precisar mais desse ambiente. A chave privada da CA fica no perfil local do Windows e
não deve ser compartilhada.

Esse modo utiliza os emuladores locais de Authentication e Firestore por meio de proxies
HTTPS. Não é necessário nem recomendado usar uma conta ou projeto Firebase de produção
para esse teste. As fotos também ficam armazenadas como dados locais no Firestore
Emulator, sem enviar arquivos ao Cloudinary. Na primeira execução, o Firebase CLI pode
baixar os emuladores. O acesso pela rede depende das regras de firewall existentes; o
comando não altera o perfil de rede nem cria regras de firewall.

---

## 📦 Recursos Técnicos

- **Autenticação**: Firebase Authentication anônima; o nome informado não é verificado
- **Banco de Dados**: Firestore; regras permitem acesso completo a qualquer usuário autenticado
- **Fotos**: Cloudinary API com compressão no navegador
- **Relatórios**: Geração de PDFs com tabelas e gráficos
- **Desktop**: Aplicativo Windows com instalador NSIS
- **Atualização**: Sistema automático via GitHub Releases
- **CI/CD**: GitHub Actions para deploy automático em Firebase Hosting

---

## Desenvolvimento local

O repositorio principal e https://github.com/moreiradire-max/Moreira-app.
Pushes e pull requests em `main` validam o build, mas nao fazem deploy no Firebase.
A publicacao pelo GitHub Actions exige executar manualmente o workflow e habilitar
`deploy`. Configure primeiro o Firebase do cliente e as credenciais do workflow;
o envio do codigo para o repositorio nao troca a configuracao Firebase existente.

O app de produção usa os valores `VITE_FIREBASE_*` do `.env`. O login por nome cria
uma sessão anônima do Firebase e não limita o acesso a seis pessoas: não há verificação
de nome nem lista de usuários permitidos. As regras de produção concedem leitura e
alteração dos dados da empresa a qualquer sessão autenticada, inclusive anônima. Portanto,
qualquer pessoa que consiga abrir o app pode ver, alterar ou apagar os dados. Não use esse
modelo para informações que precisem de controle de acesso; para limitar o acesso, use
autenticação com identidade verificada.

Antes de publicar, habilite o provedor **Anônimo** em Firebase Authentication e publique
as regras de `firestore.rules` no projeto do cliente. Listas, dashboard e detalhes de OS
atualizam quando outro dispositivo altera os dados. `npm run dev` continua usando apenas
os emuladores locais.

### Instalador de demonstracao totalmente offline (Windows)

Execute `npm run make:offline`. O instalador NSIS e gerado em
`release-offline/Moreira-Demo-Offline-Setup-1.0.1.exe`, sem publicar releases ou conectar
ao Firebase. Instale-o e entre com `admin@moreira.test` / `MoreiraDev123!`.
Execute `npm run test:offline` para verificar a edicao no Electron com rede desativada,
perfil temporario isolado e uma segunda abertura para validar a persistencia.

Esta edicao e separada da versao de producao: tem identificador, atalho, pasta de dados
e aviso visual proprios. Usa os mesmos fluxos de clientes, veiculos, orcamentos, OS,
relatorios e fotos, mas substitui os acessos ao Firebase por adaptadores IndexedDB locais.
As senhas locais sao armazenadas com PBKDF2 e salt, e as fotos ficam no banco local.
O login funciona desde a primeira abertura sem internet; os dados persistem ao reiniciar.
Nao existe sincronizacao, migracao automatica para Firebase, recuperacao de senha por
email ou atualizacao automatica nessa edicao. WhatsApp precisa de internet.

Os dados ficam no perfil Windows do usuario, em
`%APPDATA%\Moreira-Demo-Offline` (armazenamento Chromium/IndexedDB). Use apenas dados
ficticios para apresentacoes; esta edicao nao substitui a preparacao de producao nem um
sistema de backup. Nao apague essa pasta para preservar os cadastros. Os comandos
`npm run build`, `npm run make` e `npm run dev:lan` mantem seus ambientes anteriores.

Execute `npm run dev` para iniciar o Vite com os emuladores locais de Authentication e
Firestore. O ambiente de desenvolvimento usa o projeto isolado `demo-moreira` e não
altera os dados do Firebase remoto. As fotos também ficam armazenadas como dados locais
no Firestore Emulator, sem enviar arquivos ao Cloudinary. Na primeira execução, o
Firebase CLI pode baixar os emuladores.

O usuário administrador local é criado novamente ao iniciar o ambiente:

- Email: `admin@moreira.test`
- Senha: `MoreiraDev123!`

Abra `http://127.0.0.1:5173` para testar o app e `http://127.0.0.1:4000` para
inspecionar os emuladores. Os dados ficam apenas nos emuladores locais; os builds de
produção continuam usando a configuração Firebase existente.

## 🎯 Casos de Uso

🔹 Oficinas de direção especializadas  
🔹 Serviços de manutenção preventiva  
🔹 Atendimento ao cliente estruturado  
🔹 Controle de estoque e peças  
🔹 Análise de rentabilidade por serviço  

---

## 📈 Estatísticas do Projeto

- **18.450+** linhas de código
- **63** arquivos estruturados
- **1.048** pacotes npm
- **100%** das funcionalidades core implementadas
- **Production Ready** ✅

---

<div align="center">
  
  ### Desenvolvido Por HRDJ Tech para melhorar a eficiência da sua oficina
  
  [Versão Atual: 1.0.1](https://github.com/moreiradire-max/Moreira-app/releases) • [Report Issues](https://github.com/moreiradire-max/Moreira-app/issues)
  
</div>
