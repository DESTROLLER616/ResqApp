export const LANGUAGE_BODY = ['HTML', 'JSON', 'XML', 'TEXT'] as const

export type LanguageBody = (typeof LANGUAGE_BODY)[number]
