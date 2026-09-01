/**
 * File neccessary to have highlight sintax in body response and body request
 * ? What should I use here to have a better organization in detection languages?
 */

export type BodyLanguage = 'json' | 'xml' | 'plain'

export function detectBodyLanguage(contentType: string | undefined): BodyLanguage {
  const ct = (contentType ?? '').toLowerCase()
  if (ct.includes('json')) return 'json'
  if (ct.includes('xml') || ct.includes('html')) return 'xml'
  return 'plain'
}

export function formatResponseBody(body: string, language: BodyLanguage): string {
  if (language === 'json') {
    try {
      return JSON.stringify(JSON.parse(body), null, 2)
    } catch {
      return body
    }
  }

  return body
}
