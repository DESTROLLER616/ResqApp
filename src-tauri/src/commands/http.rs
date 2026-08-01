use crate::domain::http::HttpResponse;
use crate::domain::request::RequestDraft;
use crate::error::AppError;
use crate::services::http_client;

fn map_err(err: AppError) -> String {
    err.to_string()
}

#[tauri::command]
pub async fn send_request(draft: RequestDraft) -> Result<HttpResponse, String> {
    http_client::send_request(&draft).await.map_err(map_err)
}
