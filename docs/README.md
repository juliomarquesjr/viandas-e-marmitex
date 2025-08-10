## Documentação do Projeto

Este diretório centraliza a documentação funcional e técnica do sistema de pedidos e PDV para restaurantes (viandas/marmitas).

### Índice
- Requisitos do Produto: `docs/requisitos.md`
- Arquitetura: `docs/arquitetura.md`
- Modelagem de Dados: `docs/modelagem-dados.md`
- RBAC (Perfis e Permissões): `docs/rbac.md`
- Especificação de APIs: `docs/api.md`
- UX do PDV: `docs/ux-pdv.md`
- Relatórios: `docs/relatorios.md`
- Setup de Desenvolvimento: `docs/setup-dev.md`

### Convenções Gerais
- Frontend em Next.js (App Router), UI com shadcn/ui + Radix UI, axios para HTTP.
- Banco: Postgres (via Docker Compose).
- Padrões de acessibilidade e componentes seguindo shadcn/ui e utilitário `cn`.
- Evitar duplicação de código e manter arquivos abaixo de 200-300 linhas quando possível.

### Glossário
- PDV: Ponto de Venda (tela otimizada para fluxo de atendimento, full-screen).
- Backoffice/Admin: Área de gerenciamento (cadastros, relatórios, configurações).


