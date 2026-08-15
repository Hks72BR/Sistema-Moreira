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
- Autenticação segura com Firebase
- Suporte para até 8 usuários simultâneos
- Controle de acesso por perfil (Admin, Gerente, Técnico, Atendente)
- Recuperação de senha por email

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
✅ **Segurança** - Autenticação Firebase com regras de Firestore  
✅ **Relatórios** - Análises completas em PDF  
✅ **Suporte Multi-usuário** - Até 8 usuários conectados simultaneamente  

---

## 🛠️ Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | React 18.3 + Vite 5.4 |
| **Desktop** | Electron 42.2 |
| **Auto-Update** | electron-updater 6.8 |
| **Backend** | Firebase (Auth + Firestore) |
| **Banco de Dados** | Firestore (NoSQL) |
| **Storage** | Cloudinary + Firebase Storage |
| **PDF** | jsPDF + jsPDF-AutoTable |
| **Compressão** | browser-image-compression |
| **Roteamento** | React Router 6.28 |
| **Build** | electron-builder 26.8 |

---

## 📦 Recursos Técnicos

- **Autenticação**: Firebase Authentication com email/senha
- **Banco de Dados**: Firestore com regras de segurança robustas
- **Fotos**: Cloudinary API (25GB grátis) com fallback para Firebase Storage
- **Relatórios**: Geração de PDFs com tabelas e gráficos
- **Desktop**: Aplicativo Windows com instalador NSIS
- **Atualização**: Sistema automático via GitHub Releases
- **CI/CD**: GitHub Actions para deploy automático em Firebase Hosting

---

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
  
  ### Desenvolvido com ❤️ para melhorar a eficiência da sua oficina
  
  [Versão Atual: 1.0.1](https://github.com/Hks72BR/Sistema-Moreira/releases) • [Report Issues](#)
  
</div>
