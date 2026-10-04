mod commands;
mod domain;
mod error;
mod services;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let salt_path = app
                .path()
                .app_local_data_dir()
                .map_err(|err| format!("could not resolve app local data path: {err}"))?
                .join("salt.txt");
            app.handle()
                .plugin(tauri_plugin_stronghold::Builder::with_argon2(&salt_path).build())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::http::send_request,
            commands::workspace::list_recent_projects,
            commands::workspace::remove_recent_project,
            commands::workspace::open_project,
            commands::workspace::create_project,
            commands::workspace::init_project,
            commands::workspace::refresh_project,
            commands::workspace::write_project_documentation,
            commands::workspace::create_folder,
            commands::workspace::create_request,
            commands::workspace::read_request,
            commands::workspace::write_request,
            commands::workspace::rename_entry,
            commands::workspace::delete_entry,
            commands::workspace::move_entry,
            commands::workspace::list_request_attachments,
            commands::workspace::copy_request_attachment,
            commands::environment::read_environments,
            commands::environment::write_environments,
            commands::environment::secret_vault_path,
            commands::environment::secret_vault_exists,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
