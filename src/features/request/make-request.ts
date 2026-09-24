import { sendHttpRequest } from '@/services/http'
import type { HttpResponse, RequestDraft } from '@/types/http'

export async function makeRequest(
  request: RequestDraft,
  projectRoot: string,
): Promise<HttpResponse> {
  return sendHttpRequest(request, projectRoot)
}

export default makeRequest
