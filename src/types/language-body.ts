export const LANGUAGE_BODY = ['HTML', 'JSON', 'XML'] as const

export type LanguageBody = (typeof LANGUAGE_BODY)[number]
