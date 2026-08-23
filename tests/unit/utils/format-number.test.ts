import formatBytes from '@/utils/format-numbers'
import { describe, expect, it } from 'vitest'

describe('Test format of computer lenghts from bytes', () => {
  it('Keep bytes', () => {
    const bytes = 534
    expect(formatBytes(bytes)).toBe(`${bytes} B`)
  })

  it('Pass to KiloBytes', () => {
    const bytes = 1025
    expect(formatBytes(bytes)).toBe('1.00 KB')
  })

  it('Pass to MegaBytes', () => {
    const bytes = 1545654
    expect(formatBytes(bytes)).toBe('1.47 MB')
  })

  it('Pass to GigaBytes', () => {
    const bytes = 3402934586
    expect(formatBytes(bytes)).toBe('3.17 GB')
  })
})
