## Indexação por mecanismos de busca

O sistema é privado (funcionários e clientes logados) e **não deve aparecer em nenhum buscador** (Google, Bing, DuckDuckGo etc.) nem em ferramentas que treinam IA. Três camadas, todas ativas:

| Camada | Onde | O que faz |
|---|---|---|
| Cabeçalho `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex` | `next.config.ts` (`headers`) | Vale para **toda** resposta: páginas, APIs, imagens, PDFs. É a garantia de verdade, inclusive para quem chega por link direto (rastreio, e-mail de recuperar senha) |
| Meta `robots` e `googlebot` | `app/layout.tsx` (`metadata.robots`) | Mesma instrução dentro do HTML de cada página |
| `/robots.txt` | `app/robots.ts` | `Disallow: /` para todos os rastreadores e, por nome, para os de busca e de IA (Googlebot, Bingbot, GPTBot, ClaudeBot, CCBot, PerplexityBot, Google-Extended…) |

Não existe `sitemap.xml`, de propósito.

### Armadilha

O `robots.txt` pede para o rastreador nem entrar, e quem não entra também não lê o `noindex`. Por isso os dois existem: o `robots.txt` evita o acesso e o cabeçalho/meta cobre o caso de um buscador chegar à página por outro caminho. **Não remova o cabeçalho achando que o `robots.txt` basta.**

### Se uma página já foi indexada
Remova o `Disallow` do `robots.txt` por um tempo para o buscador ler o `noindex`, ou peça a remoção no Google Search Console. Para a opção de bloqueio total e permanente, o ideal é nem ter sido descoberta.

### Como conferir
```bash
curl -s https://<dominio>/robots.txt | head
curl -sI https://<dominio>/login | grep -i x-robots-tag
curl -s https://<dominio>/login | grep -o '<meta name="robots"[^>]*>'
```
