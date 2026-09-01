import { watch } from 'vue'
import { createI18n } from 'vue-i18n'
import es from './locales/es.json'

export type MessageSchema = typeof es

declare module 'vue-i18n' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- vue-i18n schema merging
  export interface DefineLocaleMessage extends MessageSchema {}
}

export const DEFAULT_LOCALE = 'es'
const LOCALE_STORAGE_KEY = 'locale'

const localeModules = import.meta.glob<MessageSchema>('./locales/*.json', {
  eager: true,
  import: 'default',
})

function localeFromPath(path: string): string {
  const fileName = path.split('/').pop() ?? path
  return fileName.replace(/\.json$/, '')
}

const messages: Record<string, MessageSchema> = { es }

for (const [path, localeMessages] of Object.entries(localeModules)) {
  const locale = localeFromPath(path)
  if (!locale) continue
  messages[locale] = localeMessages
}

export const availableLocales = Object.keys(messages)

function isSupportedLocale(locale: string): boolean {
  return locale in messages
}

export function resolveLocale(requested: string): string | null {
  if (isSupportedLocale(requested)) return requested

  const language = requested.split('-')[0]
  if (language && isSupportedLocale(language)) return language

  return null
}

function readStoredLocale(): string | null {
  try {
    return localStorage.getItem(LOCALE_STORAGE_KEY)
  } catch {
    return null
  }
}

function persistLocale(locale: string): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    return
  }
}

function resolveInitialLocale(): string {
  const stored = readStoredLocale()
  if (stored) {
    const resolved = resolveLocale(stored)
    if (resolved) return resolved
  }

  const fromNavigator = resolveLocale(navigator.language)
  if (fromNavigator) return fromNavigator

  if (isSupportedLocale(DEFAULT_LOCALE)) return DEFAULT_LOCALE

  return availableLocales[0] ?? DEFAULT_LOCALE
}

export const i18n = createI18n({
  legacy: false,
  locale: resolveInitialLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages,
})

export function setLocale(locale: string): boolean {
  const resolved = resolveLocale(locale)
  if (!resolved) return false

  i18n.global.locale.value = resolved
  return true
}

watch(
  i18n.global.locale,
  (locale) => {
    persistLocale(locale)
    document.documentElement.lang = locale
  },
  { immediate: true },
)
