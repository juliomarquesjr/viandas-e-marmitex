use reqwest::blocking::Client;
use rfd::FileDialog;
use serde::Serialize;
use std::fs;
use std::net::TcpListener;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use tauri::{Manager, RunEvent, Url};

struct NextServerState {
    child: Mutex<Option<Child>>,
    port: Mutex<Option<u16>>,
    data_dir: PathBuf,
}

impl NextServerState {
    fn new(data_dir: PathBuf) -> Self {
        Self {
            child: Mutex::new(None),
            port: Mutex::new(None),
            data_dir,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopConfig {
    runtime: String,
    server_port: Option<u16>,
    data_dir: String,
}

#[tauri::command]
fn get_desktop_config(state: tauri::State<'_, NextServerState>) -> DesktopConfig {
    let port = state.port.lock().ok().and_then(|guard| *guard);

    DesktopConfig {
        runtime: "desktop".to_string(),
        server_port: port,
        data_dir: state.data_dir.to_string_lossy().to_string(),
    }
}

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    webbrowser::open(&url)
        .map(|_| ())
        .map_err(|err| format!("Falha ao abrir URL externa: {err}"))
}

#[tauri::command]
fn select_file() -> Option<String> {
    FileDialog::new()
        .pick_file()
        .map(|path| path.to_string_lossy().to_string())
}

#[tauri::command]
fn open_path_in_file_explorer(path: String) -> Result<(), String> {
    let target = PathBuf::from(path);

    if !target.exists() {
        return Err("Caminho informado não existe".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(target)
            .spawn()
            .map_err(|err| format!("Falha ao abrir diretório: {err}"))?;
        Ok(())
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(target)
            .spawn()
            .map_err(|err| format!("Falha ao abrir diretório: {err}"))?;
        Ok(())
    }

    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        Command::new("xdg-open")
            .arg(target)
            .spawn()
            .map_err(|err| format!("Falha ao abrir diretório: {err}"))?;
        Ok(())
    }
}

#[tauri::command]
fn save_bytes_to_file(default_filename: String, bytes: Vec<u8>) -> Result<Option<String>, String> {
    let path = FileDialog::new()
        .set_file_name(&default_filename)
        .save_file();

    if let Some(path) = path {
        fs::write(&path, bytes).map_err(|err| format!("Falha ao salvar arquivo: {err}"))?;
        return Ok(Some(path.to_string_lossy().to_string()));
    }

    Ok(None)
}

#[tauri::command]
fn window_minimize(window: tauri::WebviewWindow) -> Result<(), String> {
    window
        .minimize()
        .map_err(|err| format!("Falha ao minimizar janela: {err}"))
}

#[tauri::command]
fn window_toggle_maximize(window: tauri::WebviewWindow) -> Result<(), String> {
    let is_maximized = window
        .is_maximized()
        .map_err(|err| format!("Falha ao consultar estado da janela: {err}"))?;

    if is_maximized {
        window
            .unmaximize()
            .map_err(|err| format!("Falha ao restaurar janela: {err}"))?;
    } else {
        window
            .maximize()
            .map_err(|err| format!("Falha ao maximizar janela: {err}"))?;
    }

    Ok(())
}

#[tauri::command]
fn window_is_maximized(window: tauri::WebviewWindow) -> Result<bool, String> {
    window
        .is_maximized()
        .map_err(|err| format!("Falha ao consultar estado da janela: {err}"))
}

#[tauri::command]
fn window_close(window: tauri::WebviewWindow) -> Result<(), String> {
    window
        .close()
        .map_err(|err| format!("Falha ao fechar janela: {err}"))
}

#[tauri::command]
fn window_start_dragging(window: tauri::WebviewWindow) -> Result<(), String> {
    window
        .start_dragging()
        .map_err(|err| format!("Falha ao arrastar janela: {err}"))
}

fn find_free_port() -> Result<u16, String> {
    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|err| format!("Falha ao encontrar porta livre: {err}"))?;

    let port = listener
        .local_addr()
        .map_err(|err| format!("Falha ao resolver porta local: {err}"))?
        .port();

    drop(listener);
    Ok(port)
}

fn project_root() -> Result<PathBuf, String> {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .map(|path| path.to_path_buf())
        .ok_or_else(|| "Falha ao resolver diretório do projeto".to_string())
}

fn resolve_next_app_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if cfg!(debug_assertions) {
        return project_root();
    }

    app.path()
        .resource_dir()
        .map_err(|err| format!("Falha ao resolver resources do app: {err}"))
        .map(|dir| dir.join("app"))
}

fn build_next_command(app: &tauri::AppHandle, app_dir: &Path, port: u16) -> Result<Command, String> {
    let mut command = if cfg!(debug_assertions) {
        let mut cmd = if cfg!(target_os = "windows") {
            let mut c = Command::new("npm.cmd");
            c.args(["run", "dev", "--", "--port", &port.to_string(), "--hostname", "127.0.0.1"]);
            c
        } else {
            let mut c = Command::new("npm");
            c.args(["run", "dev", "--", "--port", &port.to_string(), "--hostname", "127.0.0.1"]);
            c
        };
        cmd
    } else {
        let server_path = app_dir.join("server.js");

        if !server_path.exists() {
            return Err(format!(
                "server.js não encontrado em {}. Rode o build desktop antes de empacotar.",
                app_dir.display()
            ));
        }

        let mut cmd = Command::new("node");
        cmd.arg(server_path);
        cmd
    };

    command.current_dir(app_dir);
    command.env("HOSTNAME", "127.0.0.1");
    command.env("PORT", port.to_string());
    command.env("APP_RUNTIME", "desktop");
    command.env("NEXT_PUBLIC_APP_RUNTIME", "desktop");
    command.stdout(Stdio::inherit());
    command.stderr(Stdio::inherit());

    let _ = app;

    Ok(command)
}

fn wait_for_server_ready(base_url: &str, mut child: &mut Child) -> Result<(), String> {
    let client = Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
        .map_err(|err| format!("Falha ao criar cliente HTTP: {err}"))?;

    for _ in 0..120 {
        if let Ok(Some(status)) = child.try_wait() {
            return Err(format!("Servidor Next finalizou cedo com status: {status}"));
        }

        if let Ok(response) = client.get(base_url).send() {
            if response.status().is_success() || response.status().as_u16() == 404 {
                return Ok(());
            }
        }

        thread::sleep(Duration::from_millis(500));
    }

    Err("Timeout aguardando servidor local do Next subir".to_string())
}

fn stop_next_server(state: &NextServerState) {
    if let Ok(mut guard) = state.child.lock() {
        if let Some(mut child) = guard.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

fn start_next_server(app: &tauri::AppHandle, state: &NextServerState) -> Result<String, String> {
    let app_dir = resolve_next_app_dir(app)?;
    let port = find_free_port()?;

    let mut command = build_next_command(app, &app_dir, port)?;
    let mut child = command
        .spawn()
        .map_err(|err| format!("Falha ao iniciar servidor local do Next: {err}"))?;

    let url = format!("http://127.0.0.1:{port}");
    wait_for_server_ready(&url, &mut child)?;

    if let Ok(mut child_guard) = state.child.lock() {
        *child_guard = Some(child);
    }

    if let Ok(mut port_guard) = state.port.lock() {
        *port_guard = Some(port);
    }

    Ok(url)
}

fn main() {
    let app_builder = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_desktop_config,
            open_external_url,
            select_file,
            open_path_in_file_explorer,
            save_bytes_to_file,
            window_minimize,
            window_toggle_maximize,
            window_is_maximized,
            window_close,
            window_start_dragging,
        ])
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .map_err(|err| format!("Falha ao resolver diretório de dados: {err}"))?;

            fs::create_dir_all(&data_dir)
                .map_err(|err| format!("Falha ao criar diretório de dados: {err}"))?;

            app.manage(NextServerState::new(data_dir));

            let server_url = {
                let state = app.state::<NextServerState>();
                start_next_server(app.handle(), &state)?
            };

            let window = app
                .get_webview_window("main")
                .ok_or_else(|| "Janela principal não encontrada".to_string())?;

            window
                .navigate(Url::parse(&server_url).map_err(|err| format!("URL inválida: {err}"))?)
                .map_err(|err| format!("Falha ao navegar para app local: {err}"))?;

            window
                .show()
                .map_err(|err| format!("Falha ao exibir janela principal: {err}"))?;

            Ok(())
        });

    let app = app_builder
        .build(tauri::generate_context!())
        .expect("erro ao inicializar aplicação desktop");

    app.run(|app_handle, event| {
        if matches!(event, RunEvent::Exit | RunEvent::ExitRequested { .. }) {
            let state = app_handle.state::<NextServerState>();
            stop_next_server(&state);
        }
    });
}
