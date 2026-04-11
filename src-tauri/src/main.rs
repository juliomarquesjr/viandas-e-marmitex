use reqwest::blocking::Client;
use rfd::FileDialog;
use serde::{Deserialize, Serialize};
use std::fs;
use std::net::TcpListener;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PrinterInfo {
    id: String,
    name: String,
    #[serde(default)]
    is_default_system: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DesktopPrintPreferences {
    default_printer_id: Option<String>,
    default_printer_name: Option<String>,
    default_thermal_printer_id: Option<String>,
    default_thermal_printer_name: Option<String>,
    auto_print_standard: bool,
    auto_print_thermal: bool,
    updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SavePrintPreferencesInput {
    default_printer_id: Option<String>,
    default_printer_name: Option<String>,
    default_thermal_printer_id: Option<String>,
    default_thermal_printer_name: Option<String>,
    auto_print_standard: bool,
    auto_print_thermal: bool,
}

#[derive(Debug, Deserialize)]
struct WindowsPrinterShellEntry {
    #[serde(rename = "DeviceID")]
    device_id: Option<String>,
    #[serde(rename = "Name")]
    name: Option<String>,
    #[serde(rename = "Default", default)]
    default: bool,
}

impl Default for DesktopPrintPreferences {
    fn default() -> Self {
        Self {
            default_printer_id: None,
            default_printer_name: None,
            default_thermal_printer_id: None,
            default_thermal_printer_name: None,
            auto_print_standard: false,
            auto_print_thermal: false,
            updated_at: None,
        }
    }
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

fn print_preferences_file_path(state: &NextServerState) -> PathBuf {
    state.data_dir.join("print-preferences.json")
}

fn current_timestamp_string() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string())
}

fn normalize_print_preferences(input: DesktopPrintPreferences) -> DesktopPrintPreferences {
    let has_standard_printer = input.default_printer_id.is_some();
    let has_thermal_printer = input.default_thermal_printer_id.is_some();

    DesktopPrintPreferences {
        default_printer_id: input.default_printer_id,
        default_printer_name: input.default_printer_name,
        default_thermal_printer_id: input.default_thermal_printer_id,
        default_thermal_printer_name: input.default_thermal_printer_name,
        auto_print_standard: input.auto_print_standard && has_standard_printer,
        auto_print_thermal: input.auto_print_thermal && has_thermal_printer,
        updated_at: input.updated_at,
    }
}

fn load_print_preferences_from_disk(state: &NextServerState) -> Result<DesktopPrintPreferences, String> {
    let file_path = print_preferences_file_path(state);

    if !file_path.exists() {
        return Ok(DesktopPrintPreferences::default());
    }

    let contents = fs::read_to_string(&file_path)
        .map_err(|err| format!("Falha ao ler preferências de impressão: {err}"))?;

    let preferences = serde_json::from_str::<DesktopPrintPreferences>(&contents)
        .map_err(|err| format!("Falha ao interpretar preferências de impressão: {err}"))?;

    Ok(normalize_print_preferences(preferences))
}

fn persist_print_preferences(
    state: &NextServerState,
    preferences: &DesktopPrintPreferences,
) -> Result<(), String> {
    let file_path = print_preferences_file_path(state);
    let serialized = serde_json::to_string_pretty(preferences)
        .map_err(|err| format!("Falha ao serializar preferências de impressão: {err}"))?;

    fs::write(&file_path, serialized)
        .map_err(|err| format!("Falha ao salvar preferências de impressão: {err}"))
}

#[cfg(target_os = "windows")]
fn list_windows_printers() -> Result<Vec<PrinterInfo>, String> {
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "Get-CimInstance Win32_Printer | Select-Object DeviceID,Name,Default | ConvertTo-Json -Compress",
        ])
        .output()
        .map_err(|err| format!("Falha ao consultar impressoras do Windows: {err}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

        return Err(if stderr.is_empty() {
            "Falha ao listar impressoras instaladas".to_string()
        } else {
            format!("Falha ao listar impressoras instaladas: {stderr}")
        });
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if stdout.is_empty() {
        return Ok(Vec::new());
    }

    let value: serde_json::Value = serde_json::from_str(&stdout)
        .map_err(|err| format!("Falha ao interpretar lista de impressoras: {err}"))?;

    let entries = match value {
        serde_json::Value::Array(_) => serde_json::from_value::<Vec<WindowsPrinterShellEntry>>(value)
            .map_err(|err| format!("Falha ao interpretar lista de impressoras: {err}"))?,
        serde_json::Value::Object(_) => vec![serde_json::from_value::<WindowsPrinterShellEntry>(value)
            .map_err(|err| format!("Falha ao interpretar lista de impressoras: {err}"))?],
        _ => Vec::new(),
    };

    let mut printers: Vec<PrinterInfo> = entries
        .into_iter()
        .filter_map(|entry| {
            let id = entry.device_id?;
            let name = entry.name.unwrap_or_else(|| id.clone());

            Some(PrinterInfo {
                id,
                name,
                is_default_system: entry.default,
            })
        })
        .collect();

    printers.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(printers)
}

#[cfg(not(target_os = "windows"))]
fn list_windows_printers() -> Result<Vec<PrinterInfo>, String> {
    Ok(Vec::new())
}

#[tauri::command]
fn list_printers() -> Result<Vec<PrinterInfo>, String> {
    list_windows_printers()
}

#[tauri::command]
fn get_print_preferences(
    state: tauri::State<'_, NextServerState>,
) -> Result<DesktopPrintPreferences, String> {
    load_print_preferences_from_disk(&state)
}

#[tauri::command]
fn save_print_preferences(
    input: SavePrintPreferencesInput,
    state: tauri::State<'_, NextServerState>,
) -> Result<DesktopPrintPreferences, String> {
    let preferences = normalize_print_preferences(DesktopPrintPreferences {
        default_printer_id: input.default_printer_id,
        default_printer_name: input.default_printer_name,
        default_thermal_printer_id: input.default_thermal_printer_id,
        default_thermal_printer_name: input.default_thermal_printer_name,
        auto_print_standard: input.auto_print_standard,
        auto_print_thermal: input.auto_print_thermal,
        updated_at: Some(current_timestamp_string()),
    });

    persist_print_preferences(&state, &preferences)?;
    Ok(preferences)
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
        if cfg!(target_os = "windows") {
            let mut cmd = Command::new("npm.cmd");
            cmd.args(["run", "dev", "--", "--port", &port.to_string(), "--hostname", "127.0.0.1"]);
            cmd
        } else {
            let mut cmd = Command::new("npm");
            cmd.args(["run", "dev", "--", "--port", &port.to_string(), "--hostname", "127.0.0.1"]);
            cmd
        }
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

fn wait_for_server_ready(base_url: &str, child: &mut Child) -> Result<(), String> {
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
            list_printers,
            get_print_preferences,
            save_print_preferences,
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
