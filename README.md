# Moreira Direções - Sistema de Gestão

Sistema completo para gestão de oficina mecânica especializada em manutenção de direção veicular.

## Funcionalidades

- **Login/Autenticação**: Até 8 usuários simultâneos com login individual
- **Gestão de Clientes**: Cadastro completo com histórico
- **Veículos**: Cadastro vinculado ao cliente com tipo de direção (hidráulica, elétrica, etc.)
- **Orçamentos**: Criação, aprovação e acompanhamento
- **Ordens de Serviço**: Fluxo completo (aberta → em andamento → concluída → entregue)
- **Relatórios**: Mensal, por serviço, histórico do cliente
- **Gestão de Usuários**: Admin pode criar/desativar usuários
- **Configurações**: Dados da empresa, NF-e

## Tecnologias

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Banco de Dados**: SQLite (local)
- **Desktop**: Electron
- **Instalador**: electron-builder (NSIS)

## Como Rodar (Desenvolvimento)

```bash
# Instalar dependências
npm install

# Rodar em modo desenvolvimento (web)
npm run dev

# Rodar com Electron
npm run electron
```

## Login Padrão

- **Usuário**: admin
- **Senha**: admin123

> ⚠️ Altere a senha padrão após o primeiro acesso!

## Acesso em Rede

O servidor roda na porta **3001**. Outros computadores na rede podem acessar via navegador:

```
http://IP-DO-SERVIDOR:3001
```

## Gerar Instalador (.exe)

```bash
npm run dist
```

O instalador será gerado na pasta `release/`.

## Estrutura do Banco de Dados

O banco SQLite é criado automaticamente em `data/moreira.db` com as tabelas:
- `users` - Usuários do sistema
- `clients` - Clientes
- `vehicles` - Veículos
- `budgets` / `budget_items` - Orçamentos
- `service_orders` / `service_order_items` - Ordens de serviço
- `service_logs` - Histórico de ações
- `invoices` - Notas fiscais (controle interno)
- `company_settings` - Configurações da empresa

## Nota Fiscal (NF-e)

O sistema possui controle interno de notas fiscais. Para emissão oficial de NF-e, é necessário integrar com um serviço homologado pela SEFAZ (Tiny ERP, Bling, Focus NFe, Nuvem Fiscal).

Requisitos para NF-e:
- Certificado Digital (e-CNPJ A1 ou A3)
- Credenciamento na SEFAZ
- Integração com emissor autorizado
