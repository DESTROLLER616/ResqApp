import { LanguageBody } from './language-body'

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const

export type HttpMethod = (typeof HTTP_METHODS)[number]

export interface HttpHeader {
  readonly id: string
  key: string
  value: string
  enabled: boolean
}

export interface HttpParam {
  readonly id: string
  key: string
  value: string
  enabled: boolean
}

/** In-memory request; `id` is the relative path within the project. */
export interface RequestDraft {
  id: string
  name: string
  method: HttpMethod
  url: string
  params: HttpParam[]
  headers: HttpHeader[]
  body: {
    data: string
    language: LanguageBody
  }
  documentation: string
}

/** JSON shape stored on disk (no `id`). */
export interface RequestFile {
  name: string
  method: HttpMethod
  url: string
  params: HttpParam[]
  headers: HttpHeader[]
  body: {
    data: string
    language: LanguageBody
  }
  documentation: string
}

export interface HttpResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  elapsedMs: number
}
