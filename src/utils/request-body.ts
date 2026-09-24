import type { BodyMode, FormField, FormFieldKind, FormFileSource, RequestBody } from '@/types/http'
import { LANGUAGE_BODY, type LanguageBody } from '@/types/language-body'

export function emptyRequestBody(): RequestBody {
  return {
    mode: 'raw',
    data: '',
    language: 'JSON',
    fields: [],
  }
}

function isLanguage(value: unknown): value is LanguageBody {
  return typeof value === 'string' && (LANGUAGE_BODY as readonly string[]).includes(value)
}

function isMode(value: unknown): value is BodyMode {
  return value === 'raw' || value === 'formData'
}

function isKind(value: unknown): value is FormFieldKind {
  return value === 'text' || value === 'file'
}

function isSource(value: unknown): value is FormFileSource {
  return value === 'project' || value === 'disk'
}

function normalizeField(field: Partial<FormField>): FormField {
  return {
    id: typeof field.id === 'string' && field.id.length > 0 ? field.id : crypto.randomUUID(),
    key: typeof field.key === 'string' ? field.key : '',
    value: typeof field.value === 'string' ? field.value : '',
    enabled: field.enabled !== false,
    kind: isKind(field.kind) ? field.kind : 'text',
    source: isSource(field.source) ? field.source : 'disk',
  }
}

export function normalizeRequestBody(body: Partial<RequestBody> | null | undefined): RequestBody {
  const fields = Array.isArray(body?.fields)
    ? body.fields.map((field) => normalizeField(field))
    : []
  return {
    mode: isMode(body?.mode) ? body.mode : 'raw',
    data: typeof body?.data === 'string' ? body.data : '',
    language: isLanguage(body?.language) ? body.language : 'JSON',
    fields,
  }
}
