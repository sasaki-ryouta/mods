const JST = 'Asia/Tokyo'

const weekday = new Intl.DateTimeFormat('en-US', {
  timeZone: JST,
  weekday: 'short',
})

const date = new Intl.DateTimeFormat('en-US', {
  timeZone: JST,
  month: 'numeric',
  day: 'numeric',
})

const time = new Intl.DateTimeFormat('en-GB', {
  timeZone: JST,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export function formatStartTime(epochMs: number): string {
  return time.format(new Date(epochMs))
}

/** `9/29 Tue`: the completion's date and weekday, one element of the line. */
export function formatCompleteDate(epochMs: number): string {
  const at = new Date(epochMs)
  return `${date.format(at)} ${weekday.format(at)}`
}

/**
 * A rail line: the marker, then the elements two spaces apart. The line is a
 * plain-text log row on every surface, so no Markdown (inline code) renders.
 */
export function formatRailLine(elements: readonly string[]): string {
  return `● ${elements.join('  ')}`
}

export function formatElapsed(durationMs: number): string {
  const ms = Math.max(0, Math.floor(durationMs))
  if (ms < 1000) return '<1s'

  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`

  const minutes = Math.floor(seconds / 60)
  const remainderSeconds = seconds % 60
  if (minutes < 60) return `${minutes}m ${remainderSeconds}s`

  const hours = Math.floor(minutes / 60)
  const remainderMinutes = minutes % 60
  if (hours < 24) return `${hours}h ${remainderMinutes}m`

  const days = Math.floor(hours / 24)
  const remainderHours = hours % 24
  return `${days}d ${remainderHours}h`
}

export function formatRelativeAge(ageMs: number): string | undefined {
  const seconds = Math.max(0, Math.floor(ageMs / 1000))
  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return undefined
}
