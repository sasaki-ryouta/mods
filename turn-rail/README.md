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
- The latest completed turn gets a live relative age (`just now`, `7m ago`, `3h ago`, ...), rendered in the native `AbovePrompt` band and refreshed every 30 seconds.
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

```sh
claude --plugin-dir turn-rail
```

## Tests

```sh
claude plugin test turn-rail
```

## Notes

Claude Code's public render contract currently gives `AssistantMessage` on every surface, while `TurnDuration` is terminal-only. The live relative age therefore uses `AbovePrompt` instead of depending on a terminal-only footer render site.
