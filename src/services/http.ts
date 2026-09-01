import { invoke } from '@tauri-apps/api/core'
import type { HttpResponse, RequestDraft, RequestFile } from '@/types/http'

function toRequestFile(draft: RequestDraft): RequestFile {
  return {
    name: draft.name,
    method: draft.method,
    url: draft.url,
    params: draft.params,
    headers: draft.headers,
    body: draft.body,
  }
}

export async function sendHttpRequest(draft: RequestDraft): Promise<HttpResponse> {
  return invoke<HttpResponse>('send_request', { draft: toRequestFile(draft) })
}
