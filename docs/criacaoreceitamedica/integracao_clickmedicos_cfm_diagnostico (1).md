# Integração ClickMedicos + CFM + VIDaaS
## Diagnóstico e Plano de Ação

**Versão:** 1.0  
**Data:** Janeiro/2026  
**Documento:** Análise Técnica e Estratégica

---

## 1. Resumo Executivo

O sistema ClickMedicos atualmente gera receitas médicas e assina via VIDaaS, porém as receitas **não são registradas no sistema do CFM**. Isso faz com que a validação funcione apenas no ITI, mas não no portal oficial de Prescrição Eletrônica do CFM, onde farmácias e pacientes esperam validar.

**Resultado:** A receita é tecnicamente válida (assinatura ICP-Brasil ok), mas não aparece no ecossistema oficial do CFM.

---

## 2. Situação Atual

### 2.1 O que funciona hoje

| Etapa | Status | Descrição |
|-------|--------|-----------|
| Criação da receita | ✅ Funciona | Médico preenche dados no ClickMedicos |
| Geração do PDF | ✅ Funciona | Sistema gera PDF com layout correto |
| Assinatura VIDaaS | ✅ Funciona | PDF é assinado com certificado ICP-Brasil |
| Validação ITI | ✅ Funciona | https://validar.iti.gov.br confirma assinatura |
| Envio ao paciente | ✅ Funciona | Paciente recebe PDF assinado |

### 2.2 O que NÃO funciona

| Etapa | Status | Problema |
|-------|--------|----------|
| Registro no CFM | ❌ Não existe | Receita não é enviada ao sistema do CFM |
| Código CFM | ❌ Não existe | Receita não tem código tipo "CFMxxxxxxx" |
| Validação CFM | ❌ Não funciona | prescricao.cfm.org.br não encontra a receita |
| Histórico médico | ❌ Não aparece | Médico não vê receitas no Portal de Serviços CFM |
| Integração CFF | ❌ Não existe | Farmácias não recebem via sistema integrado |

### 2.3 Fluxo Atual (Incompleto)

```
MÉDICO                    CLICKMEDICOS                 VIDAAS                    ITI
   │                           │                          │                        │
   │  1. Preenche receita      │                          │                        │
   │─────────────────────────▶ │                          │                        │
   │                           │                          │                        │
   │                           │  2. Gera PDF             │                        │
   │                           │                          │                        │
   │                           │  3. Envia para assinar   │                        │
   │                           │─────────────────────────▶│                        │
   │                           │                          │                        │
   │  4. Push notification     │                          │                        │
   │◀──────────────────────────│◀─────────────────────────│                        │
   │                           │                          │                        │
   │  5. Autoriza (PIN)        │                          │                        │
   │─────────────────────────▶ │─────────────────────────▶│                        │
   │                           │                          │                        │
   │                           │  6. PDF assinado         │                        │
   │                           │◀─────────────────────────│                        │
   │                           │                          │                        │
   │                           │                          │  7. Pode validar       │
   │                           │                          │     assinatura         │
   │                           │                          │─────────────────────▶  │
   │                           │                          │                        │
   │                           │                          │     ✅ Assinatura OK   │
   │                           │                          │◀─────────────────────  │
   │                           │                          │                        │
                                                          
                              ⚠️ CFM NÃO PARTICIPA DO FLUXO!
                              
                              A receita existe apenas no ClickMedicos.
                              O CFM não sabe que ela foi emitida.
```

### 2.4 Por que a validação "aparecia" com CRM antes?

Quando você validava no ITI (validar.iti.gov.br), o sistema mostrava os dados do certificado do médico, incluindo o CRM que está registrado no certificado digital. **Isso NÃO significa que a receita estava no CFM** - apenas que o certificado usado para assinar pertence a um médico com aquele CRM.

A confusão acontece porque:
- O certificado VIDaaS do médico contém: Nome, CPF, CRM, UF
- O ITI mostra esses dados ao validar a assinatura
- Mas isso é diferente de ter a receita REGISTRADA no sistema do CFM

---

## 3. O Problema Central

### 3.1 Dois sistemas, duas validações

| Sistema | O que valida | URL |
|---------|--------------|-----|
| **ITI** | Se a assinatura digital é autêntica | validar.iti.gov.br |
| **CFM** | Se a receita foi emitida por um médico e está registrada | prescricao.cfm.org.br |

**Analogia:** É como ter um documento autenticado em cartório (ITI) vs. ter o documento registrado em um sistema oficial do governo (CFM). São coisas diferentes.

### 3.2 O que a farmácia espera

Quando um farmacêutico recebe uma receita digital, ele quer:

1. **Validar no portal do CFM** (prescricao.cfm.org.br)
2. **Ver confirmação** de que o médico realmente emitiu aquela receita
3. **Conferir dados** do paciente e medicamentos
4. **Ter segurança jurídica** de que está dispensando corretamente

Com o fluxo atual, o passo 1 falha porque a receita não existe no CFM.

### 3.3 Impacto para o negócio

| Impacto | Descrição |
|---------|-----------|
| **Desconfiança** | Farmácias podem recusar receitas não validáveis no CFM |
| **Retrabalho** | Pacientes precisam voltar ao médico para nova receita |
| **Credibilidade** | Sistema parece "incompleto" ou não oficial |
| **Conformidade** | Não atende 100% da Resolução CFM 2.299/2021 |

---

## 4. Solução Proposta

### 4.1 Integrar com a Prescrição Eletrônica do CFM

O CFM desenvolveu um sistema nacional de prescrição eletrônica que:
- Registra todas as receitas emitidas
- Gera código único de validação (CFMxxxxxxx)
- Permite validação por farmácias e pacientes
- Integra com o Conselho Federal de Farmácia (CFF)
- É gratuito para sistemas de terceiros

### 4.2 Como funciona a integração

O CFM disponibiliza uma **biblioteca oficial** e uma **API** para que sistemas como o ClickMedicos enviem receitas para serem registradas e assinadas dentro do ecossistema CFM.

**Biblioteca:** `@conselho-federal-de-medicina/integracao-prescricao-cfm`

### 4.3 Novo Fluxo (Completo)

```
MÉDICO         CLICKMEDICOS           CFM                CERTILLION           VIDAAS
   │                │                   │                     │                  │
   │  1. Preenche   │                   │                     │                  │
   │─────────────▶  │                   │                     │                  │
   │                │                   │                     │                  │
   │                │  2. Envia dados   │                     │                  │
   │                │─────────────────▶ │                     │                  │
   │                │   (via API CFM)   │                     │                  │
   │                │                   │                     │                  │
   │                │                   │  3. Abre iframe     │                  │
   │                │◀─────────────────│      assinatura     │                  │
   │                │                   │                     │                  │
   │                │  4. Iframe CFM    │                     │                  │
   │◀───────────────│   no navegador   │                     │                  │
   │                │                   │                     │                  │
   │                │                   │  5. Solicita        │                  │
   │                │                   │─────────────────────▶│                  │
   │                │                   │                     │                  │
   │                │                   │                     │  6. Conecta PSC  │
   │                │                   │                     │─────────────────▶│
   │                │                   │                     │                  │
   │  7. Push no celular                                      │                  │
   │◀──────────────────────────────────────────────────────────│──────────────── │
   │                │                   │                     │                  │
   │  8. Autoriza   │                   │                     │                  │
   │     (PIN)      │                   │                     │                  │
   │─────────────────────────────────────────────────────────────────────────────▶│
   │                │                   │                     │                  │
   │                │                   │  9. PDF assinado    │                  │
   │                │                   │     + Código CFM    │                  │
   │                │                   │     + REGISTRADO    │                  │
   │                │◀─────────────────│◀────────────────────│◀─────────────────│
   │                │                   │                     │                  │
   │                │                   │                     │                  │
                    
                    ✅ AGORA A RECEITA EXISTE NO CFM!
                    
                    - Código CFMxxxxxxx gerado
                    - Validável em prescricao.cfm.org.br
                    - Aparece no histórico do médico
                    - Integrada com CFF (farmácias)
```

### 4.4 Diferença Chave

| Aspecto | Fluxo Atual | Fluxo Proposto |
|---------|-------------|----------------|
| **Quem gerencia assinatura** | ClickMedicos → VIDaaS direto | ClickMedicos → CFM → Certillion → VIDaaS |
| **Onde receita é registrada** | Apenas no ClickMedicos | ClickMedicos + CFM |
| **Código de validação** | Não tem | CFMxxxxxxx |
| **Portal de validação** | Apenas ITI | ITI + CFM |
| **Histórico médico** | Só no ClickMedicos | ClickMedicos + Portal CFM |

---

## 5. O que Precisa Mudar

### 5.1 Mudanças no Backend

| Item | Situação Atual | Mudança Necessária |
|------|----------------|-------------------|
| **Serviço de assinatura** | Chama VIDaaS diretamente | Chamar API do CFM que internamente usa Certillion/VIDaaS |
| **Autenticação** | OAuth com VIDaaS | OAuth com CFM (client_id/secret do CFM) |
| **Gestão de token** | Token VIDaaS | Token CFM (reutilizar, não solicitar a cada chamada) |
| **Endpoint** | `/v0/oauth/signature` (VIDaaS) | Biblioteca CFM (iframe/popup) |

### 5.2 Mudanças no Frontend

| Item | Situação Atual | Mudança Necessária |
|------|----------------|-------------------|
| **Fluxo de assinatura** | Polling para VIDaaS | Iframe/popup da biblioteca CFM |
| **Feedback ao usuário** | Aguarda resposta VIDaaS | Iframe CFM mostra o processo |
| **Resultado** | PDF base64 do VIDaaS | URL do documento no CFM |

### 5.3 Mudanças no Modelo de Dados

| Campo | Situação Atual | Mudança Necessária |
|-------|----------------|-------------------|
| **codigoCfm** | Não existe | Adicionar campo para armazenar código CFMxxxxxxx |
| **urlDocumentoCfm** | Não existe | Adicionar URL do PDF no sistema CFM |
| **statusCfm** | Não existe | Adicionar status de registro no CFM |

### 5.4 O que NÃO muda

| Item | Por que não muda |
|------|------------------|
| **Geração do PDF** | O layout continua sendo gerado pelo ClickMedicos |
| **Dados da receita** | Mesmos campos obrigatórios (RDC 660/2022) |
| **Certificado do médico** | Continua usando VIDaaS (ou outro PSC que o médico tiver) |
| **Experiência do médico** | Ainda autoriza pelo app no celular |
| **Armazenamento local** | ClickMedicos continua guardando cópia |

---

## 6. Credenciais e Acesso

### 6.1 O que precisa solicitar ao CFM

Para integrar com o sistema de Prescrição Eletrônica do CFM, você precisa:

| Item | Descrição | Como obter |
|------|-----------|------------|
| **client_id** | Identificador da aplicação | Solicitar ao CFM |
| **client_secret** | Chave secreta da aplicação | Solicitar ao CFM |
| **URL do IAM** | Endpoint para obter tokens | Fornecido pelo CFM |
| **Ambiente de homologação** | Para testes | Automático após cadastro |
| **Ambiente de produção** | Para uso real | Após homologação aprovada |

### 6.2 Processo de credenciamento

1. **Ambiente de SIMULAÇÃO** (desenvolvimento)
   - Não precisa de credenciais
   - Usa mock da API
   - Para desenvolvimento inicial

2. **Ambiente de HOMOLOGAÇÃO** (testes)
   - Entrar em contato com o CFM
   - Solicitar cadastro da aplicação
   - Receber client_id e client_secret de homologação
   - Testar integração com API real (sem afetar produção)

3. **Ambiente de PRODUÇÃO** (uso real)
   - Após testes bem-sucedidos em homologação
   - Solicitar credenciais de produção ao CFM
   - Migrar para URLs de produção

### 6.3 Contato CFM

- **Portal de Serviços:** https://portalservicos.cfm.org.br
- **Prescrição Eletrônica:** https://prescricaoeletronica.cfm.org.br
- **Suporte Certillion (assinatura):** https://calendly.com/certillion/suporte

---

## 7. Custos

### 7.1 O que é gratuito

| Item | Custo |
|------|-------|
| Prescrição Eletrônica CFM | **Gratuito** |
| Biblioteca de integração | **Gratuito** |
| Registro de receitas | **Gratuito** |
| Validação de receitas | **Gratuito** |
| Certificado digital para médicos (via CFM) | **Gratuito** |

### 7.2 O que pode ter custo

| Item | Custo | Observação |
|------|-------|------------|
| Certificado VIDaaS (se não for pelo CFM) | ~R$ 150-250/ano | Médico já deve ter |
| Desenvolvimento da integração | Horas de dev | Interno |
| Suporte técnico dedicado | A consultar | Se necessário |

### 7.3 Resumo

A integração com o CFM é essencialmente **gratuita**. Os custos são apenas de desenvolvimento interno para implementar a integração.

---

## 8. Cronograma Sugerido

### Fase 1: Preparação (1-2 semanas)

- [ ] Estudar documentação da biblioteca CFM
- [ ] Testar em ambiente de SIMULAÇÃO
- [ ] Entrar em contato com CFM para credenciais de homologação

### Fase 2: Desenvolvimento (2-3 semanas)

- [ ] Implementar serviço de integração CFM no backend
- [ ] Adaptar frontend para usar iframe/popup CFM
- [ ] Adicionar campos no banco de dados
- [ ] Implementar fallback (se CFM indisponível, usar fluxo atual)

### Fase 3: Homologação (1-2 semanas)

- [ ] Testar com credenciais de homologação
- [ ] Validar fluxo completo (médico → assinatura → validação)
- [ ] Corrigir problemas encontrados
- [ ] Documentar processo

### Fase 4: Produção (1 semana)

- [ ] Solicitar credenciais de produção
- [ ] Migrar para ambiente de produção
- [ ] Monitorar primeiras receitas
- [ ] Coletar feedback dos médicos

**Tempo total estimado: 5-8 semanas**

---

## 9. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| CFM demora para fornecer credenciais | Média | Alto | Iniciar contato o quanto antes |
| API CFM instável | Baixa | Alto | Implementar fallback com fluxo atual (VIDaaS direto) |
| Médico não tem certificado compatível | Baixa | Médio | CFM suporta todos PSCs via Certillion |
| Mudança na API do CFM | Baixa | Médio | Usar biblioteca oficial que é mantida pelo CFM |

---

## 10. Exemplo de Receita Final

### 10.1 Receita Atual (só VIDaaS)

```
┌────────────────────────────────────────────────────────────┐
│                    RELATÓRIO MÉDICO                        │
├────────────────────────────────────────────────────────────┤
│ Paciente: Wagner Gomes Pires                               │
│ Data: 21/11/2024                                           │
│                                                            │
│ 1 - Canna River - Tincture Classic - Full Spectrum         │
│     6.000mg CBD - 60ml                                     │
│     Posologia: 2 gotas após café da manhã...               │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ Dr(a). JOAO PEDRO LOMBARDI DE ANDRADE                      │
│ CRM: 98317 - MG                                            │
│                                                            │
│ Assinado digitalmente conforme MP 2.200-2/2001             │
│ Verificar em: https://validar.iti.gov.br  ← APENAS ITI     │
└────────────────────────────────────────────────────────────┘
```

### 10.2 Receita com Integração CFM

```
┌────────────────────────────────────────────────────────────┐
│                    RELATÓRIO MÉDICO                        │
├────────────────────────────────────────────────────────────┤
│ Paciente: Wagner Gomes Pires                               │
│ Data: 21/11/2024                                           │
│                                                            │
│ 1 - Canna River - Tincture Classic - Full Spectrum         │
│     6.000mg CBD - 60ml                                     │
│     Posologia: 2 gotas após café da manhã...               │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ Dr(a). JOAO PEDRO LOMBARDI DE ANDRADE                      │
│ CRM: 98317 - MG                                            │
│                                                            │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ [QR CODE]  Código: CFMQs5QFKf                        │  │
│ │            Validar: prescricao.cfm.org.br  ← CFM!    │  │
│ │            Assinatura: validar.iti.gov.br            │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                            │
│ Assinado digitalmente conforme MP 2.200-2/2001             │
│ e Resolução CFM nº 2.299/2021                              │
└────────────────────────────────────────────────────────────┘
```

---

## 11. Conclusão

### O problema

O ClickMedicos assina receitas corretamente via VIDaaS, mas não registra no sistema do CFM. Isso faz com que receitas não sejam validáveis no portal oficial de prescrição eletrônica.

### A solução

Integrar com a API/biblioteca de Prescrição Eletrônica do CFM, fazendo com que as receitas sejam registradas e recebam código de validação oficial.

### O que não muda

- O médico continua usando seu certificado VIDaaS
- O processo de autorização (push + PIN) continua igual
- Os dados da receita continuam os mesmos

### O que muda

- O fluxo passa pelo CFM antes de ir para assinatura
- A receita recebe código CFMxxxxxxx
- Pode ser validada em prescricao.cfm.org.br
- Aparece no histórico do médico no Portal CFM

### Próximo passo

Entrar em contato com o CFM para solicitar credenciais de homologação e iniciar os testes de integração.

---

## 12. Links e Referências

### Documentação Técnica

| Recurso | URL |
|---------|-----|
| Biblioteca NPM CFM | https://www.npmjs.com/package/@conselho-federal-de-medicina/integracao-prescricao-cfm |
| Prescrição Eletrônica CFM | https://prescricaoeletronica.cfm.org.br |
| Perguntas Frequentes CFM | https://prescricaoeletronica.cfm.org.br/perguntas-frequentes |
| Validador ITI | https://validar.iti.gov.br |
| Portal de Serviços CFM | https://portalservicos.cfm.org.br |
| Certificado Digital CFM | https://certificadodigital.cfm.org.br |

### Legislação

| Documento | Assunto |
|-----------|---------|
| Resolução CFM 2.299/2021 | Prescrição eletrônica e assinatura digital |
| RDC 660/2022 (Anvisa) | Importação de produtos de cannabis |
| MP 2.200-2/2001 | Infraestrutura de Chaves Públicas (ICP-Brasil) |

### Suporte

| Contato | Finalidade |
|---------|------------|
| CFM - Portal de Serviços | Credenciais de integração |
| Certillion - Calendly | Suporte técnico assinatura |
| VIDaaS - Valid | Suporte certificado médico |

---

*Documento elaborado para orientar a integração do sistema ClickMedicos com a Prescrição Eletrônica Nacional do CFM.*
