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
- Assistant messages: get a rail through `ui.render`, drawing only (the stored message is untouched): a dim `│` column on the terminal; elsewhere each line is drawn as a Markdown blockquote, whose left rule is the surface's own (stacked `│` breaks between lines there, and a Box cannot be thinner than one cell).
- `turn.complete`: logs completion date, weekday, time, and engine-provided `durationMs`.
- The latest completed turn gets a live relative age (`just now`, `7m ago`, `3h ago`, ...).
- Relative age is rendered in the terminal's footer modes (`SessionMode`) and, on the desktop, as a dim line in the band above the prompt (`AbovePrompt`), hidden while a turn runs. The desktop raises `SessionMode` but draws no footer for it (seen on 2.1.288).
- The age is checked every 30 seconds and kept in `$.state`; only a changed label redraws, and only the age's own site.
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

Checked against the 2.1.288 types and on the desktop app itself:

- `AssistantMessage`: every surface
- `SessionMode`: raised on terminal + desktop, but only the terminal draws it
- `AbovePrompt`: terminal + desktop
- `TurnDuration`: terminal only

The live age therefore uses `SessionMode` on the terminal and `AbovePrompt` on the desktop. The mobile Remote Control view raises neither, so it shows no live age. The complete timestamp itself stays in the transcript as a native dim system-log row.
