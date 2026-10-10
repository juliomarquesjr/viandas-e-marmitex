## Formulários no celular: o que garante o botão à vista

Problema que existiu: em celular baixo, com fonte grande ou teclado aberto, o botão de entrar (e de salvar nos cadastros) ficava inalcançável. Causa e correções:

- **A casca da janela cortava a página.** `.desktop-window-frame` (criada para o app desktop) tinha `height: 100vh; overflow: hidden` também na web, então tudo que passava da altura da tela era cortado, sem rolagem. Hoje o corte (`html.desktop-runtime`) vale só no app desktop; na web a página rola pelo documento. Na web a casca usa `overflow: clip`, que não cria área de rolagem mas impede que elementos absolutos (ex.: `sr-only` no fim de uma tabela larga) alarguem a página e a deixem "zoom out" no celular. Ver `app/globals.css`.
- **`100vh` não é a tela visível no celular.** `h-screen`/`min-h-screen` viraram `h-dvh`/`min-h-dvh`.
- **Entrar, esqueci e redefinir senha** (`app/(customer)/components/auth.css`, `AuthScene.tsx`): em tela baixa (menos de 780 px) só o cabeçalho da marca aparece e o formulário vem primeiro; ao tocar num campo o painel da marca recolhe e o formulário sobe (classe `is-typing`, mantida até sair da página para o botão não se mover no meio do toque); no último campo a tela rola até o botão; celular deitado usa duas colunas; o seletor Telefone | E-mail não estoura com fonte grande.
- **Teclado.** `app/components/ViewportVars.tsx` publica a área visível em `--vv-h`/`--vv-top` e marca `data-keyboard="open"` no `<html>` (teclado cobrindo mais de 150 px). Os modais (`[data-vv-dialog]`) ficam centrados e limitados a essa área no celular; na área do cliente a casca e as folhas passam a ter a altura da parte visível, a barra de baixo some e o botão Salvar fica acima do teclado. Em Chrome Android a tela de entrar também pede `interactive-widget=resizes-content`.

### Como testar (sem aparelho)

Roteiro usado, com o navegador automatizado em contextos móveis (`isMobile`, `hasTouch`):

1. Tamanhos: 280×653 (dobrável), 320×568, 360×640, 375×667, 390×844, 412×915, paisagem 640×360 e 667×375, tablet 768×1024.
2. Fonte grande: multiplicar o `font-size` calculado de cada elemento (uma passada para ler os tamanhos, outra para gravar; multiplicar em cascata compõe a escala e dá resultados falsos) por 1,3 e 1,6.
3. Teclado: reduzir a altura da janela em 40% (Chrome Android que encolhe a página) e, para teclado que só cobre (iOS), simular `visualViewport.height` menor e disparar `resize`.
4. Para cada combinação: tocar nos campos (o toque falha se algo cobrir o campo), conferir que o botão de enviar está inteiro na tela depois de `scrollIntoView` e não está coberto (`elementFromPoint`), e que `documentElement.scrollWidth` não passa de `innerWidth`.
5. Rodar de novo nas telas de entrar, esqueci/redefinir senha, login da equipe, cadastro de cliente (modal) e perfil.

Limite: o teclado do iOS não foi testado em aparelho real; a simulação cobre a lógica das variáveis, não o comportamento do Safari.
