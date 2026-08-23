import { describe, expect, it } from 'vitest'
import type { HttpParam } from '@/types/http'
import { buildCompleteUrl, mergeParamsFromUrlSearch } from '@/features/request/utils/request-url'

function param(id: string, key: string, value: string, enabled = true): HttpParam {
  return { id, key, value, enabled }
}

function parsed(url: string): URL {
  return new URL(url)
}

describe('buildCompleteUrl — URL integrity', () => {
  it('preserves protocol, host, port, and pathname when appending params', () => {
    const complete = buildCompleteUrl('https://api.example.com:8443/v1/users', [
      param('1', 'page', '2'),
      param('2', 'limit', '20'),
    ])

    const url = parsed(complete)
    expect(url.protocol).toBe('https:')
    expect(url.hostname).toBe('api.example.com')
    expect(url.port).toBe('8443')
    expect(url.pathname).toBe('/v1/users')
    expect(url.searchParams.get('page')).toBe('2')
    expect(url.searchParams.get('limit')).toBe('20')
    expect([...url.searchParams.keys()]).toEqual(['page', 'limit'])
  })

  it('replaces an existing query string instead of concatenating it', () => {
    const complete = buildCompleteUrl('https://api.example.com/search?q=old&page=1', [
      param('1', 'q', 'new'),
    ])

    const url = parsed(complete)
    expect(url.origin + url.pathname).toBe('https://api.example.com/search')
    expect(url.searchParams.get('q')).toBe('new')
    expect(url.searchParams.has('page')).toBe(false)
    expect(complete).not.toContain('old')
  })

  it('ignores disabled params and empty keys', () => {
    const complete = buildCompleteUrl('https://api.example.com/items', [
      param('1', 'include', 'meta', false),
      param('2', '', 'orphan'),
      param('3', 'sort', 'name'),
    ])

    const url = parsed(complete)
    expect(url.searchParams.get('sort')).toBe('name')
    expect(url.searchParams.has('include')).toBe(false)
    expect([...url.searchParams.keys()]).toEqual(['sort'])
  })

  it('encodes reserved characters in keys and values', () => {
    const complete = buildCompleteUrl('https://api.example.com/q', [
      param('1', 'filter', 'name=Ada & age>1'),
      param('2', 'tag name', 'a/b'),
    ])

    const url = parsed(complete)
    expect(url.searchParams.get('filter')).toBe('name=Ada & age>1')
    expect(url.searchParams.get('tag name')).toBe('a/b')
    expect(complete).toMatch(/filter=name%3DAda/)
    expect(complete).not.toMatch(/[?&]filter=name=Ada/)
  })

  it('keeps hash and userinfo intact', () => {
    const complete = buildCompleteUrl('https://user:secret@api.example.com/docs#section', [
      param('1', 'lang', 'es'),
    ])

    const url = parsed(complete)
    expect(url.username).toBe('user')
    expect(url.password).toBe('secret')
    expect(url.hash).toBe('#section')
    expect(url.searchParams.get('lang')).toBe('es')
  })

  it('returns the original string when the base is not a valid absolute URL', () => {
    expect(buildCompleteUrl('/relative/path', [param('1', 'q', '1')])).toBe('/relative/path')
    expect(buildCompleteUrl('not a url', [param('1', 'q', '1')])).toBe('not a url')
    expect(buildCompleteUrl('', [param('1', 'q', '1')])).toBe('')
  })

  it('round-trips a complete URL through params without losing structure', () => {
    const base = 'https://api.example.com:443/v2/posts'
    const params = [param('a', 'author', 'ada'), param('b', 'draft', 'true')]
    const complete = buildCompleteUrl(base, params)
    const url = parsed(complete)

    const merged = mergeParamsFromUrlSearch(url.searchParams, params)
    const rebuilt = buildCompleteUrl(`${url.origin}${url.pathname}`, merged)

    expect(parsed(rebuilt).href).toBe(url.href)
    expect(merged.map((p) => ({ key: p.key, value: p.value, enabled: p.enabled }))).toEqual([
      { key: 'author', value: 'ada', enabled: true },
      { key: 'draft', value: 'true', enabled: true },
    ])
  })
})
