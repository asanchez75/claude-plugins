# translate-status

A Claude Code mod that translates every prompt you send into French and shows the translation in a band above the prompt. Port of the pi extension `translate-status.ts`.

- Your prompt goes to the model unchanged. The translation is for display only and runs in the background, so it never slows the prompt down.
- Slash commands and `!` shell escapes are not translated.
- The status line shows only short-lived states: translating…, failed, empty, ON/OFF.
- If you send another prompt before a translation comes back, the older result is thrown away.

Commands:

| Command | Effect |
|---|---|
| `/translate` | toggle on/off |
| `/translate on` / `off` | set the state explicitly |
| `/translate show` | toast with the last prompt and its translation |

The translation uses `haiku` with no extended thinking, at most 1024 tokens, billed to the session's credentials. To change the model, edit `MODEL` in `hooks/register.tsx`.

Install: see the [marketplace README](../../README.md#install).
