import type { LanguageBody } from './language-body'

export const BODY_MODES = ['raw', 'formData'] as const

export type BodyMode = (typeof BODY_MODES)[number]

export const FORM_FIELD_KINDS = ['text', 'file'] as const

export type FormFieldKind = (typeof FORM_FIELD_KINDS)[number]

export const FORM_FILE_SOURCES = ['project', 'disk'] as const

export type FormFileSource = (typeof FORM_FILE_SOURCES)[number]

export interface FormField {
  readonly id: string
  key: string
  value: string
  enabled: boolean
  kind: FormFieldKind
  source: FormFileSource
}

export interface RequestBody {
  mode: BodyMode
  data: string
  language: LanguageBody
  fields: FormField[]
}

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
  body: RequestBody
  documentation: string
}

/** JSON shape stored on disk (no `id`). */
export interface RequestFile {
  name: string
  method: HttpMethod
  url: string
  params: HttpParam[]
  headers: HttpHeader[]
  body: RequestBody
  documentation: string
}

export interface HttpResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  elapsedMs: number
}
