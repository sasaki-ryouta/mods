import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

// 2026-09-29 11:27 JST
const T0 = Date.parse('2026-09-29T02:27:00.000Z')
const MIN = 60_000

function setup($: Engine, on: On) {
  const clock = mock.clock(on, { now: T0 })
  const lines: string[] = []
  // The engine beneath the plugin: these answer as core would.
  on('ui.log', (_$, e) => {
    if (e.to !== 'debug') lines.push(e.text)
    return {} as never
  })
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('ui.render', { component: 'AssistantMessage' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return Text({ children: e.props.text })
  })
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)
    return Box({})
  })
  on('ui.render', { component: 'SessionMode' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return Text({ dimColor: true, children: e.props.modes.join(' & ') })
  })
  return { clock, lines }
}

const complete = (turnId: string, durationMs: number, extra = {}) => ({
  answer: '',
  durationMs,
  isAborted: false,
  reason: 'answer' as const,
  turnId,
  ...extra,
})

// The age sits in the footer modes on the terminal and in the band above the
// prompt on the desktop, which draws no SessionMode footer.
async function ageOn($: Engine, surface: 'terminal' | 'desktop', isWorking = false) {
  const ui =
    surface === 'terminal'
      ? await $.ui.mount({ plugin: 'turn', surface, component: 'SessionMode', props: { modes: [] } })
      : await $.ui.mount({
          plugin: 'turn',
          surface,
          component: 'AbovePrompt',
          props: { hasSurvey: false, isWorking, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 10 }, view: {} },
        })
  const found = await ui.find({ text: /ago|just now/ })
  await ui.unmount()
  return found?.text
}

describe('turn rail', () => {
  test('logs start and complete once per main-loop turn, with real times', async ($, on) => {
    const { clock, lines } = setup($, on)
    await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

    await $.turn.start({ text: 'hi', turnId: 't1' })
    await clock.advance(2 * MIN + 18_000)
    await $.turn.complete(complete('t1', 138_000))

    // A NaN clock read would print "Invalid Date"; the times must be JST.
    expect(lines).toEqual([
      '[start]  11:27',
      '[complete]  9/29 Tue  11:29  2m 18s',
    ])
  })

  test('marks an interrupted turn as aborted', async ($, on) => {
    const { lines } = setup($, on)
    await $.turn.start({ text: 'hi', turnId: 't1' })
    await $.turn.complete(complete('t1', 42_000, { isAborted: true, reason: 'aborted' }))

    expect(lines.at(-1)).toBe('[aborted]  9/29 Tue  11:27  42s')
  })

  test('keeps subagent turns off the primary rail and the age', async ($, on) => {
    const { lines } = setup($, on)
    await $.turn.complete(complete('t9', 5_000, { agentId: 'sub-1' }))

    expect(lines).toEqual([])
    expect(await ageOn($, 'desktop')).toBeUndefined()
  })

  test('ages only the latest completed turn, on desktop and terminal', async ($, on) => {
    const { clock } = setup($, on)
    await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

    await $.turn.start({ text: 'a', turnId: 't1' })
    await $.turn.complete(complete('t1', 1_000))
    for (const surface of ['terminal', 'desktop'] as const) {
      expect(await ageOn($, surface)).toBe('just now')
    }

    await clock.advance(7 * MIN)
    expect(await ageOn($, 'desktop')).toBe('7m ago')
    expect(await ageOn($, 'terminal')).toBe('7m ago')
    // The band stays out of the way while a turn runs.
    expect(await ageOn($, 'desktop', true)).toBeUndefined()

    // The next turn takes the previous one's age off the footer.
    await $.turn.start({ text: 'b', turnId: 't2' })
    expect(await ageOn($, 'desktop')).toBeUndefined()

    await $.turn.complete(complete('t2', 1_000))
    await clock.advance(3 * 60 * MIN)
    expect(await ageOn($, 'desktop')).toBe('3h ago')

    // advance() caps the waits it resolves, so walk a week a day at a time.
    for (let day = 0; day < 7; day++) await clock.advance(24 * 60 * MIN)
    expect(await ageOn($, 'desktop')).toBeUndefined()
  })

  test('rails the reply on the terminal only, never changing its text', async ($, on) => {
    setup($, on)
    const props = { text: 'Claude response...\nsecond line', isFirstOfReply: true }

    // Terminal: a dim column of bars beside the engine's own drawing.
    const term = await $.ui.mount({ plugin: 'turn', surface: 'terminal', component: 'AssistantMessage', props })
    expect((await term.find({ type: 'Text', text: 'Claude response...' }))?.text).toBe(props.text)
    expect(await term.find({ type: 'Text', text: /^│\n│/ })).toBeDefined()
    await term.unmount()

    // Elsewhere: the reply is drawn as the engine draws it, nothing added.
    for (const surface of ['desktop', 'vscode', 'mobile'] as const) {
      const ui = await $.ui.mount({ plugin: 'turn', surface, component: 'AssistantMessage', props })
      expect((await ui.findAll({ type: 'Text' })).map(t => t.text)).toEqual([props.text])
      await ui.unmount()
    }
    expect(props.text).toBe('Claude response...\nsecond line')
  })
})
