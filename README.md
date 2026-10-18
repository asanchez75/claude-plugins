# claude-plugins

Claude Code plugins and mods by asanchez75, published as one marketplace: `asanchez75-claude-plugins`.

| Plugin | What it does |
|---|---|
| [snippets](plugins/snippets) | Expand `#hashtag` snippets in the prompt, with TAB autocomplete |

## Install

Add the marketplace once per Claude Code config, then install any plugin from it.

In a Claude Code session:

```
/plugin marketplace add asanchez75/claude-plugins
/plugin install snippets@asanchez75-claude-plugins
/reload-plugins
```

Or from your shell:

```
claude plugin marketplace add asanchez75/claude-plugins
claude plugin install snippets@asanchez75-claude-plugins
```

Check with `/plugin`: the plugin should be listed as enabled.

To get plugins added later, update the marketplace from `/plugin` > Marketplaces, or run `claude plugin marketplace update asanchez75-claude-plugins`.

## Uninstall

In a session, run `/plugin`, open the **Installed** tab, select the plugin and uninstall it.

Or from your shell:

```
claude plugin uninstall snippets@asanchez75-claude-plugins
claude plugin marketplace remove asanchez75-claude-plugins
```

The second line is optional: it removes the marketplace and stops updates for every plugin from it. Restart open sessions, or run `/reload-plugins`, to unload.

## Add a plugin

1. Create `plugins/<name>/` with:
   - `.claude-plugin/plugin.json`: `{ "name": "<name>", "version": "0.1.0", "description": "<one line>" }`
   - `hooks/hooks.json`: `{ "modules": ["./register.ts"] }`, for a mod
   - `hooks/register.ts`: the hooks module
   - `tests/*.test.ts`: optional tests
2. Add an entry to `plugins` in `.claude-plugin/marketplace.json`:
   `{ "name": "<name>", "source": "./plugins/<name>", "description": "<one line>" }`
3. Add a row to the table above.
4. Check:
   ```
   claude plugin validate .
   claude plugin validate plugins/<name>
   (cd plugins/<name> && claude plugin test)
   ```
5. Commit and push.

While developing, load the folder directly: `claude --plugin-dir plugins/<name>`.

To ship a change to an installed plugin, bump `version` in its `plugin.json` before pushing: installed copies are cached by version.

## License

MIT
