import type { Environment, VariableSpan, VariableStatus } from '@/types/environment'
import type { RequestDraft } from '@/types/http'

const TOKEN = /\{\{([^{}]*)\}\}/g

const METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD'])

export function variableSpans(
  text: string,
  activeKeys: ReadonlySet<string>,
  projectKeys: ReadonlySet<string>,
): VariableSpan[] {
  const spans: VariableSpan[] = []
  for (const match of text.matchAll(TOKEN)) {
    const name = (match[1] ?? '').trim()
    const start = match.index ?? 0
    spans.push({
      start,
      end: start + match[0].length,
      name,
      status: statusFor(name, activeKeys, projectKeys),
    })
  }
  return spans
}

export function statusFor(
  name: string,
  activeKeys: ReadonlySet<string>,
  projectKeys: ReadonlySet<string>,
): VariableStatus {
  if (!name) return 'missing'
  if (activeKeys.has(name)) return 'active'
  if (projectKeys.has(name)) return 'other'
  return 'missing'
}

export interface VariableCatalog {
  activeKeys: Set<string>
  projectKeys: Set<string>
  /** Public values of the active environment, keyed by variable name. */
  publicValues: Map<string, string>
  /** Secret variable ids of the active environment, keyed by variable name. */
  secretIds: Map<string, string>
}

export function catalogFor(
  environments: Environment[],
  activeEnvironmentId: string | null,
): VariableCatalog {
  const activeKeys = new Set<string>()
  const projectKeys = new Set<string>()
  const publicValues = new Map<string, string>()
  const secretIds = new Map<string, string>()
  const active = environments.find((environment) => environment.id === activeEnvironmentId)

  for (const environment of environments) {
    for (const variable of environment.variables) {
      const key = variable.key.trim()
      if (!key) continue
      projectKeys.add(key)
    }
  }

  if (active) {
    for (const variable of active.variables) {
      const key = variable.key.trim()
      if (!key) continue
      activeKeys.add(key)
      if (variable.secret) {
        secretIds.set(key, variable.id)
      } else {
        publicValues.set(key, variable.value)
      }
    }
  }

  return { activeKeys, projectKeys, publicValues, secretIds }
}

export function resolveTemplate(
  text: string,
  values: ReadonlyMap<string, string>,
): { text: string; unresolved: string[] } {
  const unresolved: string[] = []
  const next = text.replace(TOKEN, (full, raw: string) => {
    const name = raw.trim()
    if (!name) {
      unresolved.push(full)
      return full
    }
    const value = values.get(name)
    if (value === undefined) {
      unresolved.push(name)
      return full
    }
    return value
  })
  return { text: next, unresolved }
}

/** Public values are substituted. Secret names in the active environment become a mask. */
export function previewTemplate(
  text: string,
  publicValues: ReadonlyMap<string, string>,
  secretKeys: ReadonlySet<string>,
): string {
  return text.replace(TOKEN, (full, raw: string) => {
    const name = raw.trim()
    if (!name) return full
    if (secretKeys.has(name)) return '••••'
    const value = publicValues.get(name)
    if (value === undefined) return full
    return value
  })
}

export function resolveDraft(
  draft: RequestDraft,
  values: ReadonlyMap<string, string>,
): { draft: RequestDraft; unresolved: string[] } {
  const unresolved = new Set<string>()
  const apply = (text: string): string => {
    const result = resolveTemplate(text, values)
    for (const name of result.unresolved) unresolved.add(name)
    return result.text
  }

  const url = apply(draft.url)
  const params = draft.params.map((param) => {
    if (!param.enabled) return param
    return { ...param, key: apply(param.key), value: apply(param.value) }
  })
  const headers = draft.headers.map((header) => {
    if (!header.enabled) return header
    return { ...header, key: apply(header.key), value: apply(header.value) }
  })

  let body = draft.body
  if (!METHODS_WITHOUT_BODY.has(draft.method)) {
    if (body.mode === 'raw') {
      body = { ...body, data: apply(body.data) }
    } else {
      body = {
        ...body,
        fields: body.fields.map((field) => {
          if (!field.enabled || field.kind !== 'text') return field
          return { ...field, key: apply(field.key), value: apply(field.value) }
        }),
      }
    }
  }

  return {
    draft: { ...draft, url, params, headers, body },
    unresolved: [...unresolved],
  }
}

export function referencedSecretIds(
  draft: RequestDraft,
  secretIds: ReadonlyMap<string, string>,
): string[] {
  const names = new Set<string>()
  const collect = (text: string): void => {
    for (const span of variableSpans(text, new Set(secretIds.keys()), new Set())) {
      if (span.name && secretIds.has(span.name)) names.add(span.name)
    }
  }

  collect(draft.url)
  for (const param of draft.params) {
    if (!param.enabled) continue
    collect(param.key)
    collect(param.value)
  }
  for (const header of draft.headers) {
    if (!header.enabled) continue
    collect(header.key)
    collect(header.value)
  }
  if (!METHODS_WITHOUT_BODY.has(draft.method)) {
    if (draft.body.mode === 'raw') {
      collect(draft.body.data)
    } else {
      for (const field of draft.body.fields) {
        if (!field.enabled || field.kind !== 'text') continue
        collect(field.key)
        collect(field.value)
      }
    }
  }

  const ids: string[] = []
  for (const name of names) {
    const id = secretIds.get(name)
    if (id) ids.push(id)
  }
  return ids
}
