mod commands;
mod domain;
mod error;
mod services;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::workspace::list_recent_projects,
            commands::workspace::remove_recent_project,
            commands::workspace::open_project,
            commands::workspace::create_project,
            commands::workspace::init_project,
            commands::workspace::refresh_project,
            commands::workspace::create_folder,
            commands::workspace::create_request,
            commands::workspace::read_request,
            commands::workspace::write_request,
            commands::workspace::delete_entry,
            commands::workspace::move_entry,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
