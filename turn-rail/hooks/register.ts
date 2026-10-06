import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import {
  formatCompleteDate,
  formatElapsed,
  formatRailLine,
  formatRelativeAge,
  formatStartTime,
} from './format'

const AGE_REFRESH_MS = 30_000
// ponytail: rows past this length draw without the rail; raise if replies get longer.
const RAIL = Array(2000).fill('│').join('\n')

// Held by the host so a hot reload keeps the latest turn. Writing `age` redraws
// only the SessionMode readers, and only when the shown label changes.
const completedAt = atom({ plugin: 'turn', key: 'completedAt' } as const, null)
const age = atom({ plugin: 'turn', key: 'age' } as const, null)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // A reload cancels the old timer and fires session.start again.
    $.clock.every(AGE_REFRESH_MS, async () => {
      const at = await read($, completedAt)
      if (at === null) return

      const label = formatRelativeAge((await $.clock.now()) - at) ?? null
      if (label !== (await read($, age))) await update($, age, () => label)
    })

    return next(e)
  })

  on('session.end', async ($, e, next) => {
    await update($, completedAt, () => null)
    await update($, age, () => null)

    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    await update($, completedAt, () => null)
    await update($, age, () => null)
    $.ui.log(formatRailLine(['start', formatStartTime(await $.clock.now())]))

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)

    // Subagent turns also complete through this event; agentId is absent on
    // the main loop only.
    if (e.agentId !== undefined) return result

    const now = await $.clock.now()
    const state = e.isAborted ? 'aborted' : 'complete'
    $.ui.log(
      formatRailLine([
        state,
        formatCompleteDate(now),
        formatStartTime(now),
        formatElapsed(e.durationMs),
      ]),
    )
    await update($, completedAt, () => now)
    await update($, age, () => formatRelativeAge(0) ?? null)

    return result
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    // Off the terminal the reply is drawn as the engine draws it.
    if (e.surface !== 'terminal') return next(e)

    const original = await next(e)
    const { Box, Text } = $.ui.resolve(e)

    // A Text is one row tall, so the rail is a tall column of bars in an
    // absolute Box spanning the message's height (top + bottom), clipped there.
    return Box({
      flexDirection: 'column',
      paddingLeft: 2,
      children: [
        Box({
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: 1,
          overflow: 'hidden',
          children: Text({ dimColor: true, children: RAIL }),
        }),
        original,
      ],
    })
  })

  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const label = await read($, age)
    if (label === null) return next(e)

    return next({
      ...e,
      props: { ...e.props, modes: [...e.props.modes, label] },
    })
  })

  // The desktop raises SessionMode but draws no footer for it (seen on
  // 2.1.288), so off the terminal the age takes the band above the prompt.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.surface === 'terminal' || e.props.hasSurvey || e.props.isWorking) {
      return next(e)
    }

    const label = await read($, age)
    if (label === null) return next(e)

    const { Text } = $.ui.resolve(e)
    return Text({ dimColor: true, children: label })
  })
}
