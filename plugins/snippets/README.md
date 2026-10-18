# snippets

A Claude Code mod that expands `#hashtag` snippets in the prompt.

- Type `#` and a prefix: matching snippets show in the typeahead. Press TAB to replace the `#word` with the snippet text.
- Any `#tag` still in the message is expanded when you press Enter. Unknown tags stay as typed.
- Snippets can include other `#tags`, and `<prepend>…</prepend>` / `<append>…</append>` move text to the start or end of the message.

Requires Claude Code v2.1.302 or later (tested on 2.1.302).

Install: see the [marketplace README](../../README.md#install).

Edit snippets in the `SNIPPETS` array in `hooks/register.ts`.
