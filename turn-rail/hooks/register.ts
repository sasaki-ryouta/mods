import type { EngineInterface, On } from 'claude-code'

import {
  formatCompleteTime,
  formatElapsed,
  formatRelativeAge,
  formatStartTime,
} from './format'

const AGE_REFRESH_MS = 30_000

export function register(on: On) {
  let latestCompletedAt: number | undefined
  let tickerStarted = false

  const redrawAge = ($: EngineInterface) => {
    if (latestCompletedAt === undefined) return
    $.ui.invalidate('ui.render')
  }

  on('session.start', ($, e, next) => {
    if (!tickerStarted) {
      tickerStarted = true
      $.clock.every(AGE_REFRESH_MS, () => redrawAge($))
    }

    return next(e)
  })

  on('turn.start', ($, e, next) => {
    latestCompletedAt = undefined

    const now = Number($.clock.now())
    $.ui.log(`● turn.start  ${formatStartTime(now)}`)
    $.ui.invalidate('ui.render')

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)

    // Subagent turns also complete through this event. Keep the primary
    // transcript rail scoped to the main loop.
    if (e.agentId !== undefined) return result

    const completedAt = Number($.clock.now())
    latestCompletedAt = completedAt

    const state = e.isAborted ? 'turn.aborted' : 'turn.complete'
    $.ui.log(
      `● ${state}  ${formatCompleteTime(completedAt)} │ ${formatElapsed(e.durationMs)}`,
    )
    $.ui.invalidate('ui.render')

    return result
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const original = await next(e)
    const { Box, Text } = $.ui.resolve(e)

    return Box({
      flexDirection: 'row',
      children: [
        Text({ dimColor: true, children: '│ ' }),
        Box({ flexDirection: 'column', flexGrow: 1, children: original }),
      ],
    })
  })

  on('ui.render', { component: 'SessionMode' }, ($, e, next) => {
    if (latestCompletedAt === undefined) return next(e)

    const relative = formatRelativeAge(Number($.clock.now()) - latestCompletedAt)
    if (relative === undefined) return next(e)

    return next({
      ...e,
      props: {
        ...e.props,
        modes: [...e.props.modes, relative],
      },
    })
  })
}

export default { register }
