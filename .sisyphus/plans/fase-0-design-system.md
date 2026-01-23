# FASE 0: Design System - Plano de Implementacao Completo

## Resumo Executivo

**Objetivo:** Transformar o visual do sistema para um design moderno, minimalista, com cor verde #285E31 como principal, bordas arredondadas, e background branco.

**Cor Principal:** `#285E31` (Verde escuro elegante)
**Background:** Branco puro
**Estilo:** Light mode first, bordas suaves, minimalista com toques de gradient

---

## 1. PALETA DE CORES COMPLETA

### 1.1 Cor Principal #285E31 e Variacoes

| Nome | HEX | OKLCH | Uso |
|------|-----|-------|-----|
| green-50 | #E8F5EA | `oklch(0.95 0.03 145)` | Backgrounds muito leves |
| green-100 | #C8E6C9 | `oklch(0.89 0.06 145)` | Backgrounds hover |
| green-200 | #A5D6A7 | `oklch(0.82 0.09 145)` | Borders leves |
| green-300 | #81C784 | `oklch(0.74 0.12 145)` | Icones secundarios |
| green-400 | #5BA862 | `oklch(0.62 0.13 145)` | Texto hover |
| **green-500** | **#285E31** | **`oklch(0.40 0.10 145)`** | **COR PRINCIPAL** |
| green-600 | #1F4A26 | `oklch(0.33 0.08 145)` | Hover de botoes |
| green-700 | #173A1D | `oklch(0.27 0.07 145)` | Texto destaque escuro |
| green-800 | #102A14 | `oklch(0.21 0.05 145)` | Backgrounds escuros |
| green-900 | #0A1B0C | `oklch(0.15 0.04 145)` | Dark mode primary |

### 1.2 Cores do Sistema (CSS Variables)

```css
:root {
  /* Background & Foreground */
  --background: oklch(1 0 0);                    /* Branco puro */
  --foreground: oklch(0.145 0 0);                /* Preto suave */
  
  /* PRIMARY = VERDE #285E31 */
  --primary: oklch(0.40 0.10 145);               /* #285E31 */
  --primary-foreground: oklch(1 0 0);            /* Branco */
  
  /* Cards */
  --card: oklch(1 0 0);                          /* Branco */
  --card-foreground: oklch(0.145 0 0);
  
  /* Muted (backgrounds sutis) */
  --muted: oklch(0.97 0.01 145);                 /* Verde muito claro */
  --muted-foreground: oklch(0.45 0 0);
  
  /* Accent (hover states) */
  --accent: oklch(0.95 0.03 145);                /* green-50 */
  --accent-foreground: oklch(0.27 0.07 145);     /* green-700 */
  
  /* Secondary */
  --secondary: oklch(0.95 0.03 145);             /* green-50 */
  --secondary-foreground: oklch(0.40 0.10 145);  /* green-500 */
  
  /* Borders */
  --border: oklch(0.90 0.01 145);                /* Verde muito sutil */
  --input: oklch(0.90 0.01 145);
  --ring: oklch(0.40 0.10 145);                  /* green-500 */
  
  /* Destructive (erro) */
  --destructive: oklch(0.58 0.22 27);
  
  /* Radius ARREDONDADO */
  --radius: 0.75rem;                             /* 12px */
  
  /* Sidebar */
  --sidebar: oklch(0.99 0.005 145);              /* Branco com toque verde */
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.40 0.10 145);       /* green-500 */
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: oklch(0.95 0.03 145);        /* green-50 */
  --sidebar-accent-foreground: oklch(0.27 0.07 145);
  --sidebar-border: oklch(0.92 0.01 145);
  
  /* Charts - tons de verde */
  --chart-1: oklch(0.40 0.10 145);               /* green-500 */
  --chart-2: oklch(0.62 0.13 145);               /* green-400 */
  --chart-3: oklch(0.74 0.12 145);               /* green-300 */
  --chart-4: oklch(0.82 0.09 145);               /* green-200 */
  --chart-5: oklch(0.89 0.06 145);               /* green-100 */
}
```

### 1.3 Dark Mode (mantendo o verde)

```css
.dark {
  --background: oklch(0.13 0.01 145);            /* Preto esverdeado */
  --foreground: oklch(0.985 0 0);
  
  --primary: oklch(0.62 0.13 145);               /* green-400 no dark */
  --primary-foreground: oklch(0.13 0.01 145);
  
  --card: oklch(0.18 0.01 145);
  --card-foreground: oklch(0.985 0 0);
  
  --muted: oklch(0.22 0.02 145);
  --muted-foreground: oklch(0.70 0 0);
  
  --accent: oklch(0.25 0.03 145);
  --accent-foreground: oklch(0.89 0.06 145);
  
  --secondary: oklch(0.22 0.02 145);
  --secondary-foreground: oklch(0.89 0.06 145);
  
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.62 0.13 145);
  
  --sidebar: oklch(0.18 0.01 145);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.62 0.13 145);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.25 0.03 145);
  --sidebar-accent-foreground: oklch(0.89 0.06 145);
  --sidebar-border: oklch(1 0 0 / 10%);
}
```

---

## 2. CLASSES UTILITARIAS CUSTOMIZADAS

### 2.1 Gradients (adicionar ao CSS)

```css
@layer utilities {
  /* Gradient backgrounds */
  .bg-gradient-brand {
    background: linear-gradient(135deg, oklch(0.40 0.10 145) 0%, oklch(0.33 0.08 145) 100%);
  }
  
  .bg-gradient-brand-light {
    background: linear-gradient(135deg, oklch(0.95 0.03 145) 0%, oklch(0.89 0.06 145) 100%);
  }
  
  .bg-gradient-brand-radial {
    background: radial-gradient(circle at top right, oklch(0.95 0.03 145) 0%, oklch(1 0 0) 70%);
  }
  
  /* Texto com gradient */
  .text-gradient-brand {
    background: linear-gradient(135deg, oklch(0.40 0.10 145) 0%, oklch(0.27 0.07 145) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  /* Glow effect para botoes */
  .shadow-brand {
    box-shadow: 0 4px 14px 0 oklch(0.40 0.10 145 / 25%);
  }
  
  .shadow-brand-lg {
    box-shadow: 0 8px 24px 0 oklch(0.40 0.10 145 / 30%);
  }
  
  /* Hover glow */
  .hover-glow:hover {
    box-shadow: 0 0 20px oklch(0.40 0.10 145 / 20%);
  }
}
```

### 2.2 Cores Tailwind Customizadas

```css
@theme inline {
  /* Adicionar cores brand ao tema */
  --color-brand-50: oklch(0.95 0.03 145);
  --color-brand-100: oklch(0.89 0.06 145);
  --color-brand-200: oklch(0.82 0.09 145);
  --color-brand-300: oklch(0.74 0.12 145);
  --color-brand-400: oklch(0.62 0.13 145);
  --color-brand-500: oklch(0.40 0.10 145);
  --color-brand-600: oklch(0.33 0.08 145);
  --color-brand-700: oklch(0.27 0.07 145);
  --color-brand-800: oklch(0.21 0.05 145);
  --color-brand-900: oklch(0.15 0.04 145);
}
```

---

## 3. ARQUIVOS A MODIFICAR

### 3.1 CSS Global

**Arquivo:** `apps/web/src/index.css`

**Codigo completo novo:**

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

:root {
  /* Background & Foreground - BRANCO PURO */
  --background: oklch(1 0 0);
  --foreground: oklch(0.15 0 0);
  
  /* PRIMARY = VERDE #285E31 */
  --primary: oklch(0.40 0.10 145);
  --primary-foreground: oklch(1 0 0);
  
  /* Cards */
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.15 0 0);
  
  /* Popover */
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.15 0 0);
  
  /* Secondary */
  --secondary: oklch(0.95 0.03 145);
  --secondary-foreground: oklch(0.40 0.10 145);
  
  /* Muted */
  --muted: oklch(0.97 0.01 145);
  --muted-foreground: oklch(0.45 0 0);
  
  /* Accent */
  --accent: oklch(0.95 0.03 145);
  --accent-foreground: oklch(0.27 0.07 145);
  
  /* Destructive */
  --destructive: oklch(0.58 0.22 27);
  
  /* Borders & Input */
  --border: oklch(0.90 0.01 145);
  --input: oklch(0.90 0.01 145);
  --ring: oklch(0.40 0.10 145);
  
  /* Charts - paleta verde */
  --chart-1: oklch(0.40 0.10 145);
  --chart-2: oklch(0.52 0.11 145);
  --chart-3: oklch(0.62 0.13 145);
  --chart-4: oklch(0.74 0.12 145);
  --chart-5: oklch(0.82 0.09 145);
  
  /* RADIUS ARREDONDADO */
  --radius: 0.75rem;
  
  /* Sidebar */
  --sidebar: oklch(0.995 0.003 145);
  --sidebar-foreground: oklch(0.15 0 0);
  --sidebar-primary: oklch(0.40 0.10 145);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: oklch(0.95 0.03 145);
  --sidebar-accent-foreground: oklch(0.27 0.07 145);
  --sidebar-border: oklch(0.92 0.01 145);
  --sidebar-ring: oklch(0.40 0.10 145);
}

.dark {
  --background: oklch(0.13 0.01 145);
  --foreground: oklch(0.98 0 0);
  
  --primary: oklch(0.62 0.13 145);
  --primary-foreground: oklch(0.13 0.01 145);
  
  --card: oklch(0.18 0.01 145);
  --card-foreground: oklch(0.98 0 0);
  
  --popover: oklch(0.18 0.01 145);
  --popover-foreground: oklch(0.98 0 0);
  
  --secondary: oklch(0.22 0.02 145);
  --secondary-foreground: oklch(0.89 0.06 145);
  
  --muted: oklch(0.22 0.02 145);
  --muted-foreground: oklch(0.65 0 0);
  
  --accent: oklch(0.25 0.03 145);
  --accent-foreground: oklch(0.89 0.06 145);
  
  --destructive: oklch(0.65 0.20 25);
  
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.62 0.13 145);
  
  --chart-1: oklch(0.62 0.13 145);
  --chart-2: oklch(0.52 0.11 145);
  --chart-3: oklch(0.74 0.12 145);
  --chart-4: oklch(0.82 0.09 145);
  --chart-5: oklch(0.89 0.06 145);
  
  --sidebar: oklch(0.18 0.01 145);
  --sidebar-foreground: oklch(0.98 0 0);
  --sidebar-primary: oklch(0.62 0.13 145);
  --sidebar-primary-foreground: oklch(0.98 0 0);
  --sidebar-accent: oklch(0.25 0.03 145);
  --sidebar-accent-foreground: oklch(0.89 0.06 145);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.62 0.13 145);
}

@theme inline {
  --font-sans: "Inter Variable", sans-serif;
  
  /* Cores do sistema */
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --color-foreground: var(--foreground);
  --color-background: var(--background);
  
  /* CORES BRAND CUSTOMIZADAS */
  --color-brand-50: oklch(0.95 0.03 145);
  --color-brand-100: oklch(0.89 0.06 145);
  --color-brand-200: oklch(0.82 0.09 145);
  --color-brand-300: oklch(0.74 0.12 145);
  --color-brand-400: oklch(0.62 0.13 145);
  --color-brand-500: oklch(0.40 0.10 145);
  --color-brand-600: oklch(0.33 0.08 145);
  --color-brand-700: oklch(0.27 0.07 145);
  --color-brand-800: oklch(0.21 0.05 145);
  --color-brand-900: oklch(0.15 0.04 145);
  
  /* Radius */
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-2xl: calc(var(--radius) + 8px);
  --radius-3xl: calc(var(--radius) + 12px);
  --radius-4xl: calc(var(--radius) + 16px);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply font-sans bg-background text-foreground antialiased;
  }
  html {
    @apply font-sans scroll-smooth;
  }
}

@layer utilities {
  /* Gradient backgrounds */
  .bg-gradient-brand {
    background: linear-gradient(135deg, oklch(0.40 0.10 145) 0%, oklch(0.33 0.08 145) 100%);
  }
  
  .bg-gradient-brand-light {
    background: linear-gradient(135deg, oklch(0.95 0.03 145) 0%, oklch(0.89 0.06 145) 100%);
  }
  
  .bg-gradient-brand-radial {
    background: radial-gradient(ellipse at top right, oklch(0.95 0.03 145) 0%, oklch(1 0 0) 60%);
  }
  
  .bg-gradient-brand-subtle {
    background: linear-gradient(180deg, oklch(0.98 0.01 145) 0%, oklch(1 0 0) 100%);
  }
  
  /* Texto com gradient */
  .text-gradient-brand {
    background: linear-gradient(135deg, oklch(0.40 0.10 145) 0%, oklch(0.27 0.07 145) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  /* Shadows com cor da marca */
  .shadow-brand-sm {
    box-shadow: 0 2px 8px 0 oklch(0.40 0.10 145 / 15%);
  }
  
  .shadow-brand {
    box-shadow: 0 4px 14px 0 oklch(0.40 0.10 145 / 20%);
  }
  
  .shadow-brand-lg {
    box-shadow: 0 8px 24px 0 oklch(0.40 0.10 145 / 25%);
  }
}
```

---

### 3.2 Componentes UI - Substituicoes

#### 3.2.1 button.tsx

**De:**
```tsx
"rounded-none border border-transparent"
```

**Para:**
```tsx
"rounded-lg border border-transparent"
```

**Todas as substituicoes:**
| Linha | De | Para |
|-------|-----|------|
| 7 | `rounded-none` | `rounded-lg` |
| 20 | `rounded-none` (xs) | `rounded-md` |
| 21 | `rounded-none` (sm) | `rounded-md` |
| 24 | `rounded-none` (icon-xs) | `rounded-md` |
| 25 | `rounded-none` (icon-sm) | `rounded-md` |

---

#### 3.2.2 card.tsx

**De:**
```tsx
"rounded-none py-4"
"*:[img:first-child]:rounded-none *:[img:last-child]:rounded-none"
"rounded-none border-t p-4"
```

**Para:**
```tsx
"rounded-2xl py-4"
"*:[img:first-child]:rounded-t-2xl *:[img:last-child]:rounded-b-2xl"
"border-t p-4"
```

---

#### 3.2.3 badge.tsx

**De:**
```tsx
"rounded-none border"
```

**Para:**
```tsx
"rounded-full border"
```

---

#### 3.2.4 input.tsx

**De:**
```tsx
"rounded-none border bg-transparent"
```

**Para:**
```tsx
"rounded-lg border bg-transparent"
```

---

#### 3.2.5 skeleton.tsx

**De:**
```tsx
className={cn("bg-muted rounded-none animate-pulse", className)}
```

**Para:**
```tsx
className={cn("bg-muted rounded-xl animate-pulse", className)}
```

---

#### 3.2.6 dialog.tsx

**De:**
```tsx
"rounded-none p-4"
```

**Para:**
```tsx
"rounded-2xl p-6"
```

---

#### 3.2.7 select.tsx

Substituir todos `rounded-none` por `rounded-lg`

---

#### 3.2.8 dropdown-menu.tsx

Substituir todos `rounded-none` por `rounded-xl` (container) e `rounded-lg` (items)

---

#### 3.2.9 checkbox.tsx

**De:**
```tsx
"rounded-none border"
```

**Para:**
```tsx
"rounded-sm border"
```

---

#### 3.2.10 tabs.tsx

**De:**
```tsx
"rounded-none p-[3px]"
```

**Para:**
```tsx
"rounded-xl p-1"
```

---

#### 3.2.11 tooltip.tsx

**De:**
```tsx
"rounded-none px-3 py-1.5"
```

**Para:**
```tsx
"rounded-lg px-3 py-1.5"
```

---

#### 3.2.12 scroll-area.tsx

**De:**
```tsx
className="rounded-none bg-border"
```

**Para:**
```tsx
className="rounded-full bg-border"
```

---

### 3.3 Paginas - Substituir TEAL por BRAND

#### Mapeamento Global (find/replace)

| Atual | Novo |
|-------|------|
| `teal-50` | `brand-50` |
| `teal-100` | `brand-100` |
| `teal-200` | `brand-200` |
| `teal-300` | `brand-300` |
| `teal-400` | `brand-400` |
| `teal-500` | `brand-500` |
| `teal-600` | `brand-600` |
| `teal-700` | `brand-700` |
| `teal-800` | `brand-800` |
| `teal-900` | `brand-900` |
| `teal-950` | `brand-900` |

#### Arquivos afetados:

1. **sidebar.tsx** - 8 ocorrencias
2. **dashboard.tsx** - 13 ocorrencias + remover `rounded-none` inline
3. **usuarios/page.tsx** - 24 ocorrencias
4. **horarios/page.tsx** - 4 ocorrencias
5. **medicos/page.tsx** - 2 ocorrencias
6. **cancelamentos/page.tsx** - 1 ocorrencia

---

### 3.4 Dashboard - Mudancas Especiais

**dashboard.tsx** - Alem de trocar teal por brand:

```tsx
// REMOVER rounded-none inline dos Cards
// De:
<Card className="col-span-4 rounded-none border-border shadow-sm">

// Para:
<Card className="col-span-4 border-border/50 shadow-sm hover:shadow-brand-sm transition-shadow">

// REMOVER rounded-none dos botoes
// De:
className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-none"

// Para:
className="w-full shadow-brand-sm hover:shadow-brand"

// ADICIONAR gradient sutil no header
// De:
<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">

// Para:
<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6 bg-gradient-brand-radial rounded-2xl p-6 -m-2">
```

---

## 4. ORDEM DE EXECUCAO (Checklist)

```
PASSO 1: CSS Global
[ ] Substituir conteudo completo de index.css
[ ] Verificar se variaveis CSS estao sendo aplicadas
[ ] Testar no browser

PASSO 2: Componentes Base (mais usados primeiro)
[ ] button.tsx - rounded-none -> rounded-lg/md
[ ] card.tsx - rounded-none -> rounded-2xl
[ ] input.tsx - rounded-none -> rounded-lg
[ ] badge.tsx - rounded-none -> rounded-full
[ ] skeleton.tsx - rounded-none -> rounded-xl

PASSO 3: Componentes Secundarios
[ ] dialog.tsx
[ ] select.tsx
[ ] dropdown-menu.tsx
[ ] checkbox.tsx
[ ] tabs.tsx
[ ] tooltip.tsx
[ ] scroll-area.tsx

PASSO 4: Sidebar
[ ] Substituir todas ocorrencias teal-* por brand-*
[ ] Verificar navegacao

PASSO 5: Dashboard Principal
[ ] Substituir teal-* por brand-*
[ ] Remover rounded-none inline
[ ] Adicionar gradients e shadows da marca

PASSO 6: Demais Paginas
[ ] usuarios/page.tsx
[ ] horarios/page.tsx
[ ] medicos/page.tsx
[ ] cancelamentos/page.tsx
[ ] pendentes/page.tsx
[ ] solicitar/page.tsx

PASSO 7: Validacao Final
[ ] Testar todas as paginas
[ ] Verificar dark mode
[ ] Verificar responsividade
[ ] Screenshot antes/depois
```

---

## 5. APIS DO CLICK (Referencia para Fase 5)

### 5.1 Atualizar Horario do Medico

```
POST https://clickcannabis.app.n8n.cloud/webhook/atualizar-hora-medico

Body:
{
  "doctor_id": 91,
  "schedule": {
    "DOM": ["09:00-16:00"],
    "SEG": ["12:00-15:00"],
    "TER": ["08:00-12:00", "19:40-21:00"],
    "QUA": ["08:00-12:00"],
    "QUI": ["17:00-21:20"],
    "SEX": ["08:00-12:00"],
    "SAB": ["09:00-16:00"]
  }
}
```

### 5.2 Atualizar Prioridade dos Medicos

```
POST https://clickcannabis.app.n8n.cloud/webhook/atualizar-prioridade-medico

Body: [
  { "id": 91, "prioridade": 1 },
  { "id": 58, "prioridade": 2 },
  ...
]
```

---

## 6. ESTIMATIVA DE TEMPO

| Tarefa | Tempo |
|--------|-------|
| CSS Global + Utilities | 20 min |
| Componentes UI (13 arquivos) | 45 min |
| Sidebar | 15 min |
| Dashboard | 20 min |
| Demais paginas (5) | 30 min |
| Testes e ajustes | 20 min |
| **TOTAL** | **~2.5 horas** |

---

## 7. VALIDACAO FINAL

### Comandos de Verificacao

```bash
# Verificar se ainda existe rounded-none onde nao deveria
grep -r "rounded-none" apps/web/src --include="*.tsx" | grep -v "node_modules" | wc -l
# Esperado: 0 ou apenas em Tooltip Arrow

# Verificar se ainda existe teal
grep -r "teal-" apps/web/src --include="*.tsx" | grep -v "node_modules" | wc -l
# Esperado: 0

# Verificar se brand esta sendo usado
grep -r "brand-" apps/web/src --include="*.tsx" | grep -v "node_modules" | wc -l
# Esperado: > 30
```

### Checklist Visual

- [ ] Botao primario e verde #285E31
- [ ] Cards tem bordas arredondadas (rounded-2xl)
- [ ] Inputs tem bordas arredondadas (rounded-lg)
- [ ] Badges sao pill (rounded-full)
- [ ] Sidebar ativa tem fundo verde claro
- [ ] Logo/titulo em verde escuro
- [ ] Gradients sutis no dashboard
- [ ] Shadows verdes nos botoes hover
- [ ] Nenhum elemento com cantos retos (exceto tooltip arrow)
- [ ] Dark mode funciona com tons verdes

---

## 8. RESULTADO ESPERADO

### Antes
- Cantos retos (sharp edges)
- Cor teal (azul-esverdeado)
- Visual generico

### Depois
- Cantos arredondados suaves
- Verde #285E31 como identidade
- Gradients sutis
- Shadows com cor da marca
- Visual premium e moderno
- Light mode como padrao
- Dark mode funcional

---

## PRONTO PARA IMPLEMENTAR

Quando autorizado, execute na ordem:
1. `index.css` completo
2. Componentes UI
3. Sidebar + paginas

**Comando:** Diga "implemente a fase 0" ou "/implement"
