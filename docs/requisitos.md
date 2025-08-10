## Requisitos do Produto

### Objetivo
Construir um sistema para restaurantes focado em venda por delivery (viandas/marmitas), com PDV e área de gerenciamento, suportando cadastro de clientes, produtos e vendas, além de relatórios.

### Perfis de Usuário
- Administrador: acesso ao backoffice (gerenciamento completo, relatórios, configurações).
- PDV: acesso exclusivo ao PDV (sem permissões administrativas), fluxo otimizado em tela cheia.

### Fluxos Principais
- Autenticação: login por e-mail/senha. Redirecionamento por perfil (PDV vs Admin).
- Cadastro: clientes, produtos (com código único e suporte a código de barras), categorias, tabelas de preço opcionais.
- Vendas (PDV): busca/scan por código de barras, seleção rápida, carrinho, descontos, meios de pagamento (dinheiro, cartão, pix), emissão de comprovante.
- Delivery: endereço do cliente, taxa de entrega, agendamento, integração futura com gateways/logística.
- Relatórios:
  - Diário (por período): total de vendas, ticket médio, itens mais vendidos.
  - Por cliente: frequência, LTV básico, últimos pedidos.
  - Por período: comparativos semana/mês.

### Requisitos Não Funcionais
- Performance: PDV responsivo, operação fluida em hardware modesto.
- Acessibilidade: navegação por teclado no PDV, foco visível, atalhos.
- Segurança: RBAC, hashing de senha, rate limit em auth.
- Observabilidade: logs estruturados, correlação de requisições.

### Integrações Futuras (fora do escopo inicial)
- Impressora térmica.
- Gateways de pagamento.
- Emissão de NF-e.


