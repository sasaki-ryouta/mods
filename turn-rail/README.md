# turn-rail

A Claude Code Mod that renders a quiet turn lifecycle rail.

```text
● turn.start  11:27
│
│ Claude response...
│
● turn.complete  9/29 Tue │ 11:29 │ 2m 18s

                                  7m ago
```

## Behavior

- `turn.start`: logs the start time in JST.
- Assistant messages: get a dim vertical rail through `ui.render`.
- `turn.complete`: logs completion date, weekday, time, and engine-provided `durationMs`.
- The latest completed turn gets a live relative age (`just now`, `7m ago`, `3h ago`, ...).
- Relative age is rendered through `SessionMode`, which the current public render contract exposes on both terminal and desktop.
- The age is checked every 30 seconds and kept in `$.state`; only a changed label redraws, and only the `SessionMode` footer.
- `/clear` (`session.end`) drops the age with the conversation.
- Starting a new turn removes the previous live age.
- Subagent completions are ignored in the primary rail.
- Aborted turns are labeled `turn.aborted`.

## Time format

All absolute times use `Asia/Tokyo` without printing `JST`.

Elapsed duration:

- under 1 second: `<1s`
- under 1 minute: `18s`
- under 1 hour: `2m 8s`
- under 24 hours: `1h 4m`
- 24 hours or more: `1d 1h`

Relative age is hidden after 7 days.

## Run from source

From the repository root:

Hooks modules are early access; on a build where they are not on yet, enable them:

```sh
CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude --plugin-dir turn-rail
```

## Tests

```sh
CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude plugin test turn-rail
```

## Render-site choice

The current public Claude Code render contract says:

- `AssistantMessage`: every surface
- `SessionMode`: terminal + desktop
- `AbovePrompt`: terminal only
- `TurnDuration`: terminal only

That is why the persistent live age uses `SessionMode` rather than `AbovePrompt` or `TurnDuration`. The complete timestamp itself stays in the transcript as a native dim system-log row.
