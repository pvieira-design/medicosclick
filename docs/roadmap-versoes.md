🎯 Escopo do MVP
**Prioridade:** Lançar RÁPIDO com funcionalidades essenciais
 ✅ O que ENTRA no MVP
| Funcionalidade | Descrição |
|----------------|-----------|
| Abertura de horários | Médico solicita, staff aprova/rejeita |
| Fechamento de horários | Médico fecha livremente (sem aprovação) |
| Cancelamento emergencial | Quando há consulta em hoje/amanhã/depois - precisa aprovação |
| Histórico do médico | Ver solicitações aprovadas/rejeitadas |
| Próximas consultas | Médico vê consultas agendadas |
| Dashboard básico | Consultas do dia, não realizadas, motivos |
| Configurações admin | Faixas, horários, strikes, pesos do score |
| Gestão de usuários | Importar médicos do Click, criar staff manual |
 ❌ O que NÃO entra no MVP
| Funcionalidade | Versão Planejada |
|----------------|------------------|
| Chamados emergenciais (staff cria para médicos) | V1 |
| Notificações WhatsApp/email | V0 |
| Automação de reagendamento de pacientes | Futuro |
---
 👥 Usuários e Permissões
 Tipos de Usuário
| Tipo | Quantidade | Descrição |
|------|------------|-----------|
| Médico | ~80 | Solicita horários, vê consultas |
| Atendente | ~5 | Aprova/rejeita, NÃO vê dados de conversão/prescrição |
| Diretor | Staff | Tudo do atendente + vê conversão/prescrição + override |
| Admin | Staff | Tudo + configurações + gestão de usuários |
 Autenticação
- Login com **email/senha**
- Admin pode **resetar senha** de qualquer usuário
- Médicos importados da tabela `doctors` do Click (join com `users` para email)
- Staff cadastrado manualmente
---
 📊 Sistema de Faixas (P1-P5)
 Regra Geral
- Médico **novo começa em P5**
- Médico **pode ser rebaixado** se piorar performance
- Médico **NÃO pode abrir horários** fora dos períodos da sua faixa
- Recálculo de score é **MANUAL** (admin dispara)
 Configurações por Faixa (TODAS configuráveis pelo admin)
| Configuração | Descrição |
|--------------|-----------|
| Score mínimo | Pontuação mínima para estar na faixa |
| Consultas mínimas | Quantidade para poder subir de faixa |
| Períodos permitidos | Manhã, tarde, noite |
| Limite máximo de slots | Por semana |
| Mínimo de slots | Por semana (sistema bloqueia se não atingir) |
 Cálculo do Score
Score = (peso_conversão × taxa_conversão) + (peso_ticket × ticket_médio)
- **Pesos configuráveis** pelo admin
- Taxa de conversão e ticket médio vêm do **banco Click**
---
## ⏰ Regras de Horários
### Estrutura
- Slot de **20 minutos FIXO** para todos
- Horário é **SEMANAL** (ex: toda segunda às 08h)
- **NÃO tem** horário de almoço obrigatório
- Horário de funcionamento **configurável por dia da semana**
  - Default sáb/dom: até 17h
### Abertura de Horários
1. Médico seleciona slots na grade
2. Sistema valida: período permitido pela faixa, limite de slots, mínimo semanal
3. Se válido, cria solicitação **pendente**
4. Staff visualiza: **azul** = já aberto, **amarelo** = novo
5. Staff clica nos amarelos para aprovar
6. Sistema sincroniza com API Click automaticamente
### Fechamento de Horários
| Situação | Aprovação necessária? |
|----------|----------------------|
| Horário sem consulta, a partir de hoje+3 | ❌ Não, fecha direto |
| Horário sem consulta, hoje/amanhã/depois | ⚠️ Bloqueado |
| Horário COM consulta, hoje/amanhã/depois | ✅ Sim, cancelamento emergencial |
### Regra dos 3 dias
- **Não pode alterar**: hoje, amanhã, depois de amanhã
- Cancelamento emergencial é a **única exceção** (com aprovação)
---
## ⚠️ Sistema de Strikes
### Configurações (pelo admin)
- Número de strikes configurável
- Penalidades por strike configuráveis
- Exemplo de penalidade: diminuir X slots por Y dias
### Visibilidade
- Médico **consegue ver** quantos strikes tem
- Staff vê strikes de todos os médicos
### Quando ganha strike
- Cancelamento emergencial aprovado
---
## 📈 Dashboard Básico (MVP)
### Métricas do Staff
- Total de médicos por faixa
- Solicitações pendentes
- Consultas do dia (completed = true)
- Consultas não realizadas (completed = false)
- Motivos de cancelamento (reason_for_cancellation)
### Métricas do Médico (o que ele vê)
- Total de consultas realizadas
- Consultas de novos leads vs recorrentes
- Tempo médio de consulta
- Seus strikes
### Métricas que médico NÃO vê
- Nota/avaliação
- Taxa de conversão
- Ticket médio
---
## ⚙️ Configurações do Admin
| Configuração | Descrição |
|--------------|-----------|
| Horário por dia da semana | Ex: seg-sex 08-21h, sáb-dom 08-17h |
| Score mínimo por faixa | P1=80, P2=60, P3=40, P4=20, P5=0 (exemplo) |
| Consultas mínimas para subir | Quantidade por faixa |
| Limite de slots por faixa | Máximo semanal |
| Mínimo de slots por faixa | Mínimo semanal |
| Número de strikes | Quantos antes de penalidade |
| Penalidades de strike | O que acontece a cada strike |
| Peso conversão | Para cálculo do score |
| Peso ticket médio | Para cálculo do score |
---
## 🔌 Integrações
### Leitura de Dados
- **Direto no PostgreSQL de réplica** do Click
- Tabelas principais: `doctors`, `users`, `consultings`
- Conexão: `postgresql://postgres:***@click-***-replica.rds.amazonaws.com/click-database`
### Escrita de Dados
- **API Click** para atualizar horários do médico
- Se falhar: fica **PENDENTE** em fila de retry
### Identificação do Médico
- Tabela `doctors` do Click
- Join com `users` pelo `user_id` para obter email
- Mesmo email = mesmo médico
---
## 🔒 Regras de Aprovação
### Staff (Atendente)
- Aprovar/rejeitar solicitações de abertura
- Aprovar/rejeitar cancelamentos emergenciais
- **NÃO vê**: dados de conversão, prescrição
### Diretor
- Tudo do atendente
- **Vê**: dados de conversão, prescrição
- **Override**: pode aprovar ignorando regras de faixa
### Concorrência
- Se dois staffs aprovarem ao mesmo tempo: **primeiro que clicar ganha**
### Decisão
- Decisão do staff é **FINAL**
- Médico **não pode contestar**
---
## 📱 Telas do MVP
### Médico
1. **Meus Horários** - Grade com horários atuais
2. **Solicitar Abertura** - Selecionar novos horários
3. **Fechar Horários** - Desmarcar horários sem consulta
4. **Cancelamento Emergencial** - Para hoje/amanhã/depois com consulta
5. **Histórico** - Solicitações aprovadas/rejeitadas
6. **Próximas Consultas** - Consultas agendadas
7. **Meu Perfil** - Faixa, score, strikes, métricas básicas
### Staff
1. **Solicitações** - Pendentes de aprovação (grade azul/amarelo)
2. **Cancelamentos Emergenciais** - Pendentes de aprovação
3. **Dashboard** - Métricas do dia
4. **Médicos** - Lista com faixa, score
5. **Perfil do Médico** - Detalhes, histórico
### Admin
1. Tudo do Staff
2. **Configurações** - Faixas, horários, strikes, pesos
3. **Usuários** - Importar médicos, criar staff, resetar senhas
---
## 📝 Observações Adicionais
- Sistema funciona **24h**
- Férias do médico = só não deixar horário aberto
- Horário aberto sem consulta = aparece como "aberto sem agendamento"
- Mínimo de slots é por **semana** (não por dia)
- Se médico não atingir mínimo, sistema **bloqueia** a solicitação