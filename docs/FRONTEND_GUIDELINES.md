# Diretrizes de UI/UX - ClickMedicos

Este documento define os padrões visuais e de interação para o projeto ClickMedicos. O objetivo é garantir uma interface limpa, moderna e eficiente, otimizada para profissionais de saúde que utilizam o sistema em monitores de pequeno formato.

## 1. Filosofia de Design

A interface do ClickMedicos deve ser **minimalista, moderna e funcional**. Dado que o público-alvo utiliza o sistema em telas pequenas, a prioridade é a densidade de informação inteligente e a clareza visual.

- **Clareza sobre Ornamentação**: Prefira clareza e legibilidade a elementos puramente decorativos.
- **Eficiência de Espaço**: Utilize o espaço de forma estratégica. Espaço em branco é importante para a respiração da UI, mas não deve ser desperdiçado em telas limitadas.
- **Hierarquia Intuitiva**: O usuário deve entender imediatamente o que é primário, secundário e informativo.

## 2. O que Evitar (Anti-patterns)

Para manter a estética "clean" e "chic" desejada, evite os seguintes elementos:

- **Sombras (box-shadow)**: Não utilize sombras em componentes (cards, botões, inputs). A profundidade deve ser comunicada através de cores de fundo e bordas sutis.
- **Bordas Parciais**: Evite aplicar cores de borda em apenas um lado do componente (ex: `border-l-4`) para fins decorativos.
- **Interfaces Poluídas**: Evite excesso de ícones, textos desnecessários ou muitos elementos competindo pela atenção.
- **Desperdício de Tela**: Evite paddings e margins excessivos que forcem o scroll desnecessário em monitores pequenos.

## 3. O que Usar (Padrões Recomendados)

- **Bordas Arredondadas**: Utilize consistentemente `rounded-lg` (8px) para a maioria dos componentes e `rounded-xl` (12px) para containers maiores.
- **Bordas Sutis**: Utilize bordas leves para definir limites, como `border-gray-200` ou `border-border/50`.
- **Efeitos de Hover**: Transições suaves de cor de fundo ou opacidade ao interagir com elementos clicáveis.
- **Gradientes de Destaque**: Utilize o gradiente verde da marca (`bg-gradient-brand`) para elementos que exigem atenção imediata, como a página de login ou CTAs principais.
- **Inputs Estruturados**: Todos os campos de entrada devem ter bordas visíveis e estados de foco claros.

## 4. Cores

A paleta de cores é centrada no verde médico, transmitindo confiança e profissionalismo.

| Categoria | Descrição | Exemplo de Classe Tailwind |
| :--- | :--- | :--- |
| **Primária** | Verde principal da marca | `bg-brand-600` ou `text-brand-700` |
| **Sucesso** | Ações positivas e confirmações | `text-green-600` / `bg-green-50` |
| **Erro** | Mensagens de erro e alertas críticos | `text-red-600` / `bg-red-50` |
| **Aviso** | Atenção e estados pendentes | `text-amber-600` / `bg-amber-50` |
| **Bordas** | Definição de componentes | `border-gray-200` |
| **Fundo** | Fundo de página e containers | `bg-white` / `bg-gray-50` |

### Gradientes
O projeto possui utilitários de gradiente pré-definidos que devem ser usados para manter a consistência.
- **Destaque Principal**: `bg-gradient-brand` (Verde marca)
- **Fundo Sutil**: `bg-gradient-brand-radial` ou `bg-gradient-brand-subtle`
- **Texto**: `text-gradient-brand`

## 5. Tipografia e Hierarquia Visual

A hierarquia deve ser estabelecida através de pesos (`font-weight`) e tamanhos, não apenas cores. O projeto utiliza a fonte **Inter**.

- **Títulos**: `text-xl` ou `text-2xl`, `font-semibold`, `text-gray-900`.
- **Subtítulos**: `text-base`, `font-medium`, `text-gray-700`.
- **Corpo de Texto**: `text-sm`, `font-normal`, `text-gray-600`.
- **Texto de Apoio/Legendas**: `text-xs`, `text-gray-500`.

## 6. Espaçamento

Considerando monitores pequenos, a escala de espaçamento deve ser compacta mas legível.

- **Padding de Cards**: Use `p-4` ou `p-5`. Evite `p-8` em telas pequenas.
- **Espaçamento entre Elementos**: Utilize `gap-4` para grupos de componentes.
- **Margens de Página**: `px-4 py-6` em containers principais.

## 7. Componentes

### Botões
Três níveis de prioridade:
1. **Filled (Primário)**: `bg-brand-600 text-white hover:bg-brand-700 rounded-lg transition-colors`
2. **Outline (Secundário)**: `border border-brand-600 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors`
3. **Ghost (Terciário)**: `text-brand-600 hover:bg-brand-50 rounded-lg transition-colors`

### Cards
- **Simples**: `bg-white border border-border rounded-xl`
- **Destaque**: `bg-secondary/50 border border-border rounded-xl` (ou use `bg-gray-50`)
- **Sem Sombras**: Nunca use `shadow-*`, mesmo as variantes `shadow-brand`.

### Inputs
- **Padrão**: `border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all`

## 8. Animações e Transições

As animações devem ser sutis para não distrair o profissional de saúde.
- Use `duration-200` ou `duration-300`.
- Use `ease-in-out`.
- Aplique em: Hover de botões, foco de inputs e transições de estados de cards.

## 9. Exemplos de Código

### Card de Agendamento (Otimizado)
```tsx
<div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-2">
  <div className="flex justify-between items-start">
    <h3 className="font-semibold text-gray-900 text-sm">João Silva</h3>
    <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
      Confirmado
    </span>
  </div>
  <p className="text-xs text-gray-500">14:30 - Consulta Geral</p>
  <div className="flex gap-2 mt-2">
    <button className="flex-1 text-xs border border-brand-600 text-brand-600 py-1.5 rounded-lg hover:bg-brand-50 transition-colors">
      Ver Detalhes
    </button>
    <button className="flex-1 text-xs bg-brand-600 text-white py-1.5 rounded-lg hover:bg-brand-700 transition-colors">
      Check-in
    </button>
  </div>
</div>
```

### Container de Destaque com Gradiente
```tsx
<div className="bg-gradient-brand rounded-xl p-6 text-white">
  <h2 className="text-lg font-semibold">Resumo do Dia</h2>
  <p className="text-white/90 text-sm mt-1">Você tem 12 consultas agendadas para hoje.</p>
</div>
```
