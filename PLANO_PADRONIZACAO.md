# 📋 Plano de Padronização de Uso — Moreira Direções

## Sistema de Gestão de Oficina de Direção

---

## 1. PERFIS DE ACESSO

| Perfil | Acesso | Responsabilidades |
|--------|--------|-------------------|
| **Admin** | Total | Configurações, usuários, relatórios, todas as operações |
| **Gerente** | Amplo | Aprovar orçamentos, supervisionar OS, relatórios, gerenciar usuários |
| **Técnico** | Operacional | Criar/editar OS, registrar serviços realizados, adicionar fotos |
| **Atendente** | Recepção | Cadastrar clientes, criar orçamentos, abrir OS, registrar entregas |

---

## 2. FLUXO PADRÃO DE ATENDIMENTO

### 2.1. Recepção do Veículo
1. **Atendente** verifica se o cliente já está cadastrado no sistema
2. Se novo: cadastra o cliente (nome, telefone, CPF/CNPJ obrigatório)
3. Cadastra o veículo (marca, modelo, ano, placa, tipo de direção)
4. Registra a queixa/problema relatado pelo cliente

### 2.2. Criação do Orçamento
1. Acessar **Orçamentos → Novo Orçamento**
2. Selecionar cliente e veículo
3. Listar todos os serviços e peças com valores unitários
4. Definir validade do orçamento (padrão: 15 dias)
5. Enviar/informar o orçamento ao cliente

### 2.3. Aprovação do Orçamento
1. Quando o cliente aprova, alterar status para **Aprovado**
2. O sistema permite converter automaticamente em Ordem de Serviço (OS)
3. Se recusado, alterar status para **Recusado** (manter histórico)

### 2.4. Abertura da Ordem de Serviço (OS)
1. Acessar **Ordens de Serviço → Nova OS** (ou converter orçamento)
2. Campos obrigatórios:
   - Cliente e veículo
   - Diagnóstico inicial
   - KM de entrada
   - Prioridade (Normal / Alta / Urgente)
3. **OBRIGATÓRIO**: Atribuir a OS a um técnico responsável
4. **OBRIGATÓRIO**: Tirar fotos do veículo na entrada (mínimo 4 fotos):
   - Frente do veículo
   - Traseira do veículo
   - Lateral esquerda
   - Lateral direita
   - Fotos adicionais de danos ou problemas existentes

### 2.5. Execução do Serviço
1. Técnico altera status para **Em Andamento** ao iniciar
2. Durante o serviço, registrar observações no campo de log
3. Se necessitar peça, alterar para **Aguardando Peça** (registrar qual peça)
4. Ao receber a peça, retornar para **Em Andamento**
5. Preencher os campos:
   - **Serviços Realizados**: descrição detalhada de tudo que foi feito
   - **Peças Utilizadas**: listar todas as peças trocadas/instaladas

### 2.6. Conclusão do Serviço
1. Técnico altera status para **Concluída**
2. Registrar KM de saída
3. **OBRIGATÓRIO**: Tirar fotos de saída do veículo (mesmos ângulos da entrada)
4. Gerente/Admin revisa a OS antes da entrega

### 2.7. Entrega ao Cliente
1. Atendente altera status para **Entregue**
2. Registrar data/hora da entrega
3. Cliente verifica o serviço junto ao veículo

---

## 3. PADRONIZAÇÃO DE SERVIÇOS

### 3.1. Categorias de Serviço

| Código | Categoria | Descrição |
|--------|-----------|-----------|
| DH | Direção Hidráulica | Manutenção/reparo de caixas de direção hidráulica |
| DE | Direção Elétrica | Manutenção/reparo de caixas de direção elétrica |
| DEH | Direção Eletro-hidráulica | Manutenção/reparo de sistemas eletro-hidráulicos |
| BX | Buchas/Terminais | Troca de buchas, terminais e articulações |
| BO | Bomba de Direção | Reparo/troca de bombas de direção hidráulica |
| MG | Mangueiras | Troca de mangueiras de pressão e retorno |
| AL | Alinhamento | Serviço de alinhamento de direção |
| BL | Balanceamento | Serviço de balanceamento de rodas |
| DG | Diagnóstico | Serviço de diagnóstico e avaliação |

### 3.2. Nomenclatura Padrão de Serviços

Para manter consistência, usar sempre os nomes padronizados abaixo:

**Direção Hidráulica:**
- "Reparo de caixa de direção hidráulica"
- "Revisão de caixa de direção hidráulica"
- "Troca de caixa de direção hidráulica"
- "Reparo de bomba de direção hidráulica"
- "Troca de bomba de direção hidráulica"
- "Troca de mangueira de pressão"
- "Troca de mangueira de retorno"
- "Troca de fluido de direção hidráulica"

**Direção Elétrica:**
- "Reparo de caixa de direção elétrica"
- "Troca de motor elétrico de direção"
- "Reprogramação de módulo de direção elétrica"
- "Revisão de caixa de direção elétrica"

**Buchas e Terminais:**
- "Troca de terminal de direção (lado esquerdo)"
- "Troca de terminal de direção (lado direito)"
- "Troca de bucha da barra estabilizadora"
- "Troca de pivô de suspensão"
- "Troca de bieleta da barra estabilizadora"
- "Troca de coifa de caixa de direção"

**Gerais:**
- "Alinhamento de direção"
- "Balanceamento de rodas"
- "Diagnóstico de sistema de direção"
- "Mão de obra adicional"

### 3.3. Nomenclatura Padrão de Peças

- "Caixa de direção hidráulica [marca] [modelo veículo]"
- "Caixa de direção elétrica [marca] [modelo veículo]"
- "Bomba de direção hidráulica [marca]"
- "Terminal de direção [lado] [marca]"
- "Bucha de barra estabilizadora [marca]"
- "Mangueira de pressão [marca]"
- "Mangueira de retorno [marca]"
- "Coifa de caixa de direção [marca]"
- "Fluido de direção hidráulica [marca] [qtd]L"
- "Kit de reparo de caixa de direção"
- "Kit de vedação de caixa de direção"

---

## 4. REGRAS DE PRIORIDADE

| Prioridade | Quando Usar | Prazo Esperado |
|------------|-------------|----------------|
| **Normal** | Serviços programados, trocas de rotina | Até 3 dias úteis |
| **Alta** | Cliente com urgência, problemas de segurança | Até 1 dia útil |
| **Urgente** | Direção travada, risco de acidente, guincho | Mesmo dia |

---

## 5. FOTOS DO VEÍCULO

### 5.1. Quando Fotografar

| Momento | Obrigatório? | Mínimo de Fotos |
|---------|--------------|-----------------|
| **Entrada** (recepção do veículo) | ✅ SIM | 4 fotos |
| **Saída** (antes da entrega) | ✅ SIM | 4 fotos |

### 5.2. Ângulos Obrigatórios
1. **Frente** — capota, para-choque, faróis
2. **Traseira** — para-choque traseiro, lanternas
3. **Lateral Esquerda** — porta do motorista, roda
4. **Lateral Direita** — porta do passageiro, roda
5. **Danos pré-existentes** — arranhões, amassados, riscos (quantas fotos forem necessárias)
6. **Componente específico** — peça a ser reparada/trocada

### 5.3. Qualidade da Foto
- Boa iluminação (usar flash se necessário)
- Veículo inteiro no quadro (ângulos gerais)
- Foco no detalhe (fotos de danos)
- Placa do veículo visível em pelo menos 1 foto

---

## 6. ATRIBUIÇÃO DE OS POR TÉCNICO

### 6.1. Regras de Atribuição
- Toda OS **deve** ter um técnico responsável atribuído
- A atribuição é feita na **criação da OS** ou pode ser alterada depois
- O gerente deve equilibrar a carga entre os técnicos
- O técnico atribuído é responsável por:
  - Iniciar o serviço
  - Registrar atualizações (log)
  - Marcar conclusão
  - Tirar fotos de saída

### 6.2. Dashboard do Técnico
- Cada técnico pode filtrar a listagem de OS para ver apenas as suas
- Usar o filtro "Técnico Responsável" na tela de Ordens de Serviço

---

## 7. REGISTROS E LOGS

### O que registrar no log da OS:
- ✅ Início do diagnóstico
- ✅ Peças solicitadas ao fornecedor
- ✅ Peças recebidas
- ✅ Problemas encontrados durante o serviço
- ✅ Contato com o cliente (aprovações adicionais)
- ✅ Qualquer alteração no escopo do serviço
- ✅ Testes realizados
- ✅ Observações sobre estado do veículo

---

## 8. RELATÓRIOS

### Relatórios disponíveis e frequência sugerida:
| Relatório | Frequência | Responsável |
|-----------|------------|-------------|
| OS por período | Diário | Gerente |
| Faturamento | Semanal/Mensal | Admin |
| Serviços por tipo de direção | Mensal | Gerente |
| Produtividade por técnico | Semanal | Gerente |
| Clientes ativos | Mensal | Admin |

---

## 9. BOAS PRÁTICAS

1. **Sempre** preencher todos os campos obrigatórios
2. **Sempre** tirar fotos de entrada e saída
3. **Sempre** atribuir um técnico à OS
4. **Nunca** alterar dados de OS já entregues
5. **Sempre** registrar observações importantes no log
6. Usar a nomenclatura padronizada de serviços e peças
7. Manter os dados do cliente atualizados (telefone, e-mail)
8. Verificar orçamentos pendentes diariamente
9. Fazer backup do banco de dados semanalmente
10. Registrar KM de entrada e saída em toda OS

---

*Documento gerado para uso interno — Moreira Direções*
*Versão 1.0*
