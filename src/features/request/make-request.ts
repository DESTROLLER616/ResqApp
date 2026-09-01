import { sendHttpRequest } from '@/services/http'
import type { HttpResponse, RequestDraft } from '@/types/http'

export async function makeRequest(request: RequestDraft): Promise<HttpResponse> {
  return sendHttpRequest(request)
}

export default makeRequest
