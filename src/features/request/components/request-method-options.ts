import { h, type VNodeChild } from 'vue'
import type { SelectOption } from 'naive-ui'
import { HTTP_METHODS, type HttpMethod } from '@/types/http'

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: '#10b981',
  POST: '#3b82f6',
  PUT: '#f59e0b',
  PATCH: '#a855f7',
  DELETE: '#ef4444',
  HEAD: '#6b7280',
  OPTIONS: '#6b7280',
}

export const methodOptions: SelectOption[] = HTTP_METHODS.map((method) => ({
  label: method.charAt(0).toUpperCase() + method.slice(1),
  value: method,
}))

export function renderMethodLabel(option: SelectOption): VNodeChild {
  const method = option.value as HttpMethod
  return h(
    'span',
    {
      style: {
        color: METHOD_COLORS[method],
        fontWeight: 600,
      },
    },
    String(option.label ?? method),
  )
}
