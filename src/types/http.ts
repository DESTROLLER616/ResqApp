export const HTTP_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
] as const

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

export interface RequestDraft {
  id: string
  name: string
  method: HttpMethod
  url: string
  params: HttpParam[]
  headers: HttpHeader[]
  body: string
}

export interface Collection {
  id: string
  name: string
  requests: RequestDraft[]
}