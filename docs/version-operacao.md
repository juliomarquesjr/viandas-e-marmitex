# Versão em produção (`/api/version`)

## Contrato da API

`GET /api/version` retorna JSON **sem autenticação** e **sem dados sensíveis**:

| Campo | Descrição |
|--------|------------|
| `app` | Nome da aplicação (`APP_NAME` ou `package.json` → `name`) |
| `version` | Versão semver (`APP_VERSION`, `npm_package_version` ou `package.json` → `version`) |
| `commitSha` | SHA do commit do deploy (`GIT_COMMIT_SHA`, `VERCEL_GIT_COMMIT_SHA` ou `GITHUB_SHA`; senão `unknown`) |
| `buildTime` | ISO 8601 UTC (`BUILD_TIME` em produção; em dev, horário atual; sem CI, `unknown` em prod) |
| `environment` | `dev`, `test` ou `prod` (via `APP_ENV`, `VERCEL_ENV` ou `NODE_ENV`) |

Exemplo:

```json
{
  "app": "viandas",
  "version": "0.1.0",
  "commitSha": "a1b2c3d4e5f6...",
  "buildTime": "2026-04-30T12:00:00Z",
  "environment": "prod"
}
```

## Automação (GitHub Actions)

O workflow [.github/workflows/ci.yml](../.github/workflows/ci.yml) define, antes do `npm run build`:

- `BUILD_TIME` — data/hora UTC do job
- `GIT_COMMIT_SHA` — `${{ github.sha }}`
- `APP_VERSION` — nome da tag, **apenas** em builds disparados por tag (releases)

No seu pipeline de **deploy** para produção, replique as mesmas variáveis (ou equivalentes do provedor) **antes** do `next build` ou **na inicialização** do container, conforme o host:

- **Vercel**: já expõe `VERCEL_GIT_COMMIT_SHA` e `VERCEL_ENV`; opcionalmente defina `BUILD_TIME` em script de build.
- **Docker / VM**: passe `GIT_COMMIT_SHA`, `BUILD_TIME` e opcionalmente `APP_VERSION` no `docker build` (`--build-arg`) ou no `environment` do serviço.

## Fallback manual (sem CI)

Defina no ambiente de execução ou no build:

| Variável | Obrigatória | Exemplo |
|----------|-------------|---------|
| `APP_VERSION` | Não | `1.2.3` |
| `GIT_COMMIT_SHA` ou `GITHUB_SHA` | Não | commit completo |
| `BUILD_TIME` | Recomendada em prod | `2026-04-30T15:04:05Z` |
| `APP_NAME` | Não | `viandas` |
| `APP_ENV` | Não | `prod`, `test`, `staging` |

Sem `BUILD_TIME` em `NODE_ENV=production`, o campo retorna `unknown` (evita timestamp falso).

## Checklist pós-deploy

1. Chamar `GET https://<seu-dominio>/api/version` e anotar `version`, `commitSha` e `buildTime`.
2. No GitHub: **Releases** ou **Commits** — confirmar que `commitSha` corresponde ao commit implantado (ou à tag de release).
3. Comparar `version` com a tag semver ou com o `version` do `package.json` da release.
4. Se `buildTime` for `unknown`, ajustar o pipeline para injetar `BUILD_TIME` no build ou no runtime.
5. Opcional: documentar no runbook interno o par esperado após cada release.

## Escalabilidade e manutenção

A lógica fica centralizada em [`lib/version-metadata.ts`](../lib/version-metadata.ts), com um único contrato TypeScript reutilizável. Novos provedores (ex.: outro PaaS) podem ser acrescentados apenas na função de resolução de `commitSha` / `environment`, sem mudar o contrato do JSON.

**Próximos passos opcionais:** proteger o endpoint em redes internas se no futuro incluir metadados adicionais; exibir `version` + SHA curto apenas na área admin da UI; alinhar `APP_VERSION` com releases automáticas via `semantic-release` ou tags.
