import type { HttpParam } from '@/types/http'

export function buildCompleteUrl(base: string, params: HttpParam[]): string {
  try {
    const url = new URL(base)
    url.search = ''
    for (const param of params) {
      if (param.enabled && param.key) {
        url.searchParams.append(param.key, param.value)
      }
    }
    return url.toString()
  } catch {
    return base
  }
}

export function mergeParamsFromUrlSearch(
  searchParams: URLSearchParams,
  params: HttpParam[],
): HttpParam[] {
  const existingEnabled = params.filter((p) => p.enabled)
  const usedIds = new Set<string>()

  const fromUrl: HttpParam[] = [...searchParams.entries()].map(([key, value]) => {
    const existing = existingEnabled.find((param) => param.key === key && !usedIds.has(param.id))
    if (existing) {
      usedIds.add(existing.id)
      return { ...existing, key, value, enabled: true }
    }
    return {
      id: crypto.randomUUID(),
      key,
      value,
      enabled: true,
    }
  })

  const emptyEnabled = params.filter((param) => param.enabled && !param.key)
  const disabled = params.filter((param) => !param.enabled)

  return [...fromUrl, ...emptyEnabled, ...disabled]
}
