## RBAC

### Perfis
- admin: acesso total, inclusive relatórios e cadastros.
- pdv: acesso somente ao PDV, criar vendas, consultar produtos/clientes.

### Regras de Redirecionamento
- Após login:
  - role=admin → `/admin`
  - role=pdv → `/admin/pdv`
  - cliente (login separado, em `/login`) → `/dashboard`
- O mapa completo de rotas e regras de acesso está em [rotas.md](./rotas.md).

### Autorização
- Middleware em rotas do App Router validando role.
- Interceptor axios anexando token; 401/403 redireciona para login.


