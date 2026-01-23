# Fase 7: Polimento e Testes

> Duracao estimada: 3-4 dias
> Prioridade: Alta
> Dependencias: Todas as fases anteriores

## Objetivo

Finalizar o MVP com:
- Correcao de bugs encontrados
- Melhoria de UX/UI
- Testes E2E criticos
- Documentacao para usuarios
- Preparacao para deploy

---

## Checklist de Polimento

### 1. UX/UI

#### Loading States
- [ ] Skeletons em todas as listas
- [ ] Spinners em botoes de acao
- [ ] Placeholder content durante carregamento
- [ ] Transicoes suaves

#### Error States
- [ ] Mensagens de erro claras
- [ ] Tela de erro 500 personalizada
- [ ] Tela de 404 personalizada
- [ ] Tratamento de erro de rede

#### Empty States
- [ ] Mensagens quando nao ha dados
- [ ] Ilustracoes apropriadas
- [ ] Call-to-action quando faz sentido

#### Feedback
- [ ] Toast de sucesso em todas as acoes
- [ ] Toast de erro com mensagem util
- [ ] Confirmacao antes de acoes destrutivas
- [ ] Indicador de progresso para operacoes longas

---

### 2. Responsividade

#### Mobile (< 640px)
- [ ] Dashboard legivel
- [ ] Grade de horarios com scroll horizontal
- [ ] Menu hamburguer funcional
- [ ] Botoes com tamanho adequado para toque

#### Tablet (640px - 1024px)
- [ ] Layout em 2 colunas onde apropriado
- [ ] Sidebar colapsavel
- [ ] Tabelas com scroll horizontal se necessario

#### Desktop (> 1024px)
- [ ] Layout completo
- [ ] Sidebar sempre visivel
- [ ] Hover states em elementos interativos

---

### 3. Acessibilidade

#### Navegacao por Teclado
- [ ] Tab order correto
- [ ] Focus visible em todos elementos interativos
- [ ] Atalhos de teclado documentados

#### Screen Readers
- [ ] Labels em todos os inputs
- [ ] ARIA labels em botoes de icone
- [ ] Roles corretos em componentes customizados
- [ ] Announcements em mudancas de estado

#### Contraste e Cores
- [ ] Contraste minimo 4.5:1 para texto
- [ ] Nao depender apenas de cor para informacao
- [ ] Dark mode funcional (se implementado)

---

### 4. Performance

#### Frontend
- [ ] Lazy loading de rotas
- [ ] Imagens otimizadas
- [ ] Bundle size < 500KB gzipped
- [ ] LCP < 2.5s
- [ ] FID < 100ms

#### Backend
- [ ] Queries Prisma otimizadas (usar select)
- [ ] Indexes no banco de dados
- [ ] Cache de configuracoes
- [ ] Connection pooling configurado

---

### 5. Seguranca

#### Autenticacao
- [ ] Sessoes expiram corretamente
- [ ] Logout limpa todos os dados
- [ ] Protecao contra CSRF
- [ ] Rate limiting em login

#### Autorizacao
- [ ] Todas as rotas protegidas testadas
- [ ] Permissoes verificadas no backend
- [ ] Dados sensiveis nao vazam na API

#### Dados
- [ ] Inputs sanitizados
- [ ] SQL injection prevenido (Prisma)
- [ ] XSS prevenido (React escaping)

---

## Testes E2E

### Ferramenta: Playwright

```bash
pnpm add -D @playwright/test
npx playwright install
```

### Estrutura de Testes

```
apps/web/e2e/
├── auth/
│   ├── login.spec.ts
│   └── logout.spec.ts
├── medico/
│   ├── visualizar-horarios.spec.ts
│   ├── solicitar-abertura.spec.ts
│   └── fechar-horarios.spec.ts
├── staff/
│   ├── aprovar-solicitacao.spec.ts
│   ├── rejeitar-solicitacao.spec.ts
│   └── dashboard.spec.ts
└── admin/
    ├── criar-usuario.spec.ts
    └── configuracoes.spec.ts
```

### Testes Criticos

#### 1. Fluxo de Login

```typescript
// apps/web/e2e/auth/login.spec.ts

import { test, expect } from "@playwright/test";

test.describe("Login", () => {
  test("deve fazer login com credenciais validas", async ({ page }) => {
    await page.goto("/login");
    
    await page.fill('[name="email"]', "medico@teste.com");
    await page.fill('[name="password"]', "senha123");
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL("/dashboard");
    await expect(page.locator("text=Dashboard")).toBeVisible();
  });

  test("deve mostrar erro com credenciais invalidas", async ({ page }) => {
    await page.goto("/login");
    
    await page.fill('[name="email"]', "invalido@teste.com");
    await page.fill('[name="password"]', "senhaerrada");
    await page.click('button[type="submit"]');
    
    await expect(page.locator("text=Credenciais invalidas")).toBeVisible();
  });

  test("deve redirecionar para login se nao autenticado", async ({ page }) => {
    await page.goto("/dashboard");
    
    await expect(page).toHaveURL("/login");
  });
});
```

#### 2. Fluxo de Solicitacao de Abertura

```typescript
// apps/web/e2e/medico/solicitar-abertura.spec.ts

import { test, expect } from "@playwright/test";

test.describe("Solicitar Abertura", () => {
  test.beforeEach(async ({ page }) => {
    // Login como medico
    await page.goto("/login");
    await page.fill('[name="email"]', "medico@teste.com");
    await page.fill('[name="password"]', "senha123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("deve criar solicitacao ao selecionar slots", async ({ page }) => {
    await page.goto("/dashboard/solicitar");
    
    // Selecionar alguns slots
    await page.click('[data-slot="seg-14:00"]');
    await page.click('[data-slot="seg-14:20"]');
    
    // Verificar resumo
    await expect(page.locator("text=2 slots selecionados")).toBeVisible();
    
    // Confirmar
    await page.click('button:has-text("Solicitar Abertura")');
    
    // Verificar feedback
    await expect(page.locator("text=Solicitacao enviada")).toBeVisible();
  });

  test("deve bloquear slots fora do periodo permitido", async ({ page }) => {
    await page.goto("/dashboard/solicitar");
    
    // Tentar selecionar slot de manha (se medico for P4/P5)
    const slotManha = page.locator('[data-slot="seg-08:00"]');
    
    if (await slotManha.getAttribute("data-estado") === "fora-periodo") {
      await slotManha.click();
      await expect(page.locator("text=Periodo nao permitido")).toBeVisible();
    }
  });
});
```

#### 3. Fluxo de Aprovacao (Staff)

```typescript
// apps/web/e2e/staff/aprovar-solicitacao.spec.ts

import { test, expect } from "@playwright/test";

test.describe("Aprovar Solicitacao", () => {
  test.beforeEach(async ({ page }) => {
    // Login como staff
    await page.goto("/login");
    await page.fill('[name="email"]', "staff@teste.com");
    await page.fill('[name="password"]', "senha123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("deve aprovar solicitacao pendente", async ({ page }) => {
    await page.goto("/dashboard/solicitacoes");
    
    // Esperar carregar
    await page.waitForSelector('[data-testid="solicitacao-card"]');
    
    // Expandir primeira solicitacao
    await page.click('[data-testid="solicitacao-card"]:first-child');
    
    // Selecionar todos os slots
    await page.click('button:has-text("Selecionar Todos")');
    
    // Aprovar
    await page.click('button:has-text("Aprovar Selecionados")');
    
    // Confirmar
    await page.click('button:has-text("Confirmar")');
    
    // Verificar feedback
    await expect(page.locator("text=Solicitacao aprovada")).toBeVisible();
  });

  test("deve rejeitar com motivo obrigatorio", async ({ page }) => {
    await page.goto("/dashboard/solicitacoes");
    
    await page.waitForSelector('[data-testid="solicitacao-card"]');
    await page.click('[data-testid="solicitacao-card"]:first-child');
    
    // Rejeitar
    await page.click('button:has-text("Rejeitar")');
    
    // Tentar rejeitar sem motivo
    await page.click('button:has-text("Confirmar Rejeicao")');
    await expect(page.locator("text=Motivo obrigatorio")).toBeVisible();
    
    // Preencher motivo
    await page.fill('[name="motivoRejeicao"]', "Horario em conflito");
    await page.click('button:has-text("Confirmar Rejeicao")');
    
    await expect(page.locator("text=Solicitacao rejeitada")).toBeVisible();
  });
});
```

### Configuracao Playwright

```typescript
// playwright.config.ts

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3005",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3005",
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Documentacao

### Para Usuarios

#### 1. Guia do Medico
```markdown
# Guia do Medico - ClickMedicos

## Primeiros Passos
1. Acesse o sistema com seu email e senha
2. Na tela inicial, voce vera seus horarios atuais

## Solicitar Abertura de Horarios
1. Acesse "Solicitar Abertura" no menu
2. Clique nos horarios desejados (ficam amarelos)
3. Verifique o resumo no rodape
4. Clique em "Solicitar Abertura"
5. Aguarde aprovacao do staff

## Fechar Horarios
1. Acesse "Meus Horarios"
2. Clique nos horarios verdes que deseja fechar
3. Horarios com cadeado tem consulta agendada
4. Confirme o fechamento

## Cancelamento Emergencial
Para cancelar horarios com consulta:
1. Selecione o horario com consulta
2. Escolha o motivo do cancelamento
3. Aguarde aprovacao do staff
```

#### 2. Guia do Staff
```markdown
# Guia do Staff - ClickMedicos

## Aprovar Solicitacoes
1. Acesse "Solicitacoes" no menu
2. Veja as solicitacoes pendentes
3. Clique para expandir e ver os slots
4. Selecione os slots a aprovar
5. Clique em "Aprovar Selecionados"

## Cancelamentos Emergenciais
1. Acesse "Cancelamentos" no menu
2. Revise o motivo do medico
3. Aprove ou rejeite com justificativa
```

---

## Preparacao para Deploy

### Checklist Pre-Deploy

#### Ambiente
- [ ] Variaveis de ambiente configuradas
- [ ] Banco de dados migrado
- [ ] Seeds executados (se necessario)
- [ ] Conexao com Click testada

#### Build
- [ ] `pnpm build` sem erros
- [ ] `pnpm check-types` sem erros
- [ ] Testes passando

#### Seguranca
- [ ] CORS configurado corretamente
- [ ] HTTPS habilitado
- [ ] Secrets nao commitados

#### Monitoramento
- [ ] Logs configurados
- [ ] Error tracking (Sentry opcional)
- [ ] Health check endpoint

### Script de Deploy

```bash
#!/bin/bash
# deploy.sh

echo "Verificando tipos..."
pnpm check-types || exit 1

echo "Executando build..."
pnpm build || exit 1

echo "Executando testes..."
pnpm test || exit 1

echo "Executando migrations..."
pnpm db:push || exit 1

echo "Deploy concluido!"
```

---

## Bugs Conhecidos a Corrigir

### Prioridade Alta
- [ ] Erro de tipo no appRouter (LSP)
- [ ] Erro de tipo no sidebar.tsx (URLs)
- [ ] Erro no solicitar/page.tsx (useQuery)

### Prioridade Media
- [ ] [Listar outros bugs encontrados]

### Prioridade Baixa
- [ ] [Melhorias de UI menores]

---

## Criterios de Aceite Final

- [ ] Todos os fluxos principais funcionando
- [ ] Testes E2E passando
- [ ] Responsivo em mobile/tablet/desktop
- [ ] Acessibilidade basica implementada
- [ ] Performance aceitavel (LCP < 3s)
- [ ] Documentacao de usuario criada
- [ ] Zero erros criticos no build
- [ ] Deploy realizado com sucesso

---

## Checklist de Conclusao da Fase 7

- [ ] Bugs criticos corrigidos
- [ ] Loading/error/empty states implementados
- [ ] Responsividade testada
- [ ] Testes E2E criados e passando
- [ ] Documentacao de usuario criada
- [ ] Preparacao para deploy completa
- [ ] Stakeholder fez teste de aceitacao
- [ ] MVP pronto para producao
