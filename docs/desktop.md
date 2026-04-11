# Desktop (Tauri + Next local)

## Arquitetura v1
- Shell desktop: Tauri (`src-tauri`).
- App funcional: Next.js existente (UI + API routes) executando localmente em `127.0.0.1:<porta dinâmica>`.
- Banco/serviços: mesmos da versão web (online-first).

## Fluxo de execução
1. O app Tauri inicia e seleciona uma porta local livre.
2. O runtime desktop sobe o servidor Next local com `APP_RUNTIME=desktop` e `NEXT_PUBLIC_APP_RUNTIME=desktop`.
3. Após healthcheck HTTP, a janela principal navega para o host local.
4. Ao encerrar o app, o processo local do Next é finalizado.

## Build e empacotamento
- `npm run desktop:next:build`: build Next em modo standalone (`NEXT_BUILD_STANDALONE=true`).
- `npm run desktop:prepare`: copia artefatos para `src-tauri/resources/app`.
- `npm run desktop:build:installer`: gera instalador desktop (MSI/NSIS).

## Comandos nativos iniciais
Implementados no backend Rust e disponíveis para evolução no frontend:
- `open_external_url`: abrir URL no browser padrão.
- `select_file`: abrir seletor de arquivo nativo.
- `open_path_in_file_explorer`: abrir pasta/arquivo no explorer do SO.
- `save_bytes_to_file`: salvar bytes com diálogo nativo (usado no fluxo de backup).
- `get_desktop_config`: expõe runtime, porta local e diretório de dados do app.

## Segurança
- Navegação da WebView restringida a `http://127.0.0.1:*` e `about:blank`.
- Secrets não são embutidos no binário; usar `.env` no ambiente de execução.
- Dependências críticas continuam externas: Postgres, token de blob storage, SMTP, chaves auth.

## Variáveis operacionais
- `APP_RUNTIME=desktop`
- `NEXT_PUBLIC_APP_RUNTIME=desktop`
- `PORT` (definida dinamicamente pelo runtime desktop)
- `HOSTNAME=127.0.0.1`

## Checklist de release v1
1. Confirmar `cargo`, toolchain Rust e Build Tools do Windows instalados.
2. Executar `npm run desktop:build:installer`.
3. Instalar em máquina limpa Windows e validar:
   - Login admin/PDV
   - CRUD principal (clientes/produtos/pedidos)
   - Scanner/câmera
   - Impressão
   - Backup/restore
4. Validar também que `npm run dev` e fluxo web seguem sem regressão.
