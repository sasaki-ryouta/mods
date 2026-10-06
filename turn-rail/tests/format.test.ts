import { describe, expect, test } from 'claude-code/testing'

import {
  formatCompleteDate,
  formatElapsed,
  formatRailLine,
  formatRelativeAge,
  formatStartTime,
} from '../hooks/format'

describe('format', () => {
  test('formats JST timestamps', () => {
    const at = Date.parse('2026-09-29T02:27:00.000Z')
    expect(formatStartTime(at)).toBe('11:27')
    expect(formatCompleteDate(at)).toBe('9/29 Tue')
  })

  test('formats elapsed duration without zero padding', () => {
    expect(formatElapsed(500)).toBe('<1s')
    expect(formatElapsed(18_000)).toBe('18s')
    expect(formatElapsed(128_000)).toBe('2m 8s')
    expect(formatElapsed(3_840_000)).toBe('1h 4m')
    expect(formatElapsed(90_000_000)).toBe('1d 1h')
  })

  test('formats relative age and expires it after seven days', () => {
    expect(formatRelativeAge(10_000)).toBe('just now')
    expect(formatRelativeAge(7 * 60_000)).toBe('7m ago')
    expect(formatRelativeAge(3 * 3_600_000)).toBe('3h ago')
    expect(formatRelativeAge(2 * 86_400_000)).toBe('2d ago')
    expect(formatRelativeAge(7 * 86_400_000)).toBeUndefined()
  })

  test('brackets the event and separates elements with spaces, no Markdown', () => {
    expect(formatRailLine(['complete', '9/29 Tue', '11:29', '2m 18s']))
      .toBe('[complete]  9/29 Tue  11:29  2m 18s')
  })
})
