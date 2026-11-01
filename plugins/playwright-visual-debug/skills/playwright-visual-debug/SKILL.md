---
name: playwright-visual-debug
description: Debug a web page visually by launching a headed Playwright browser (bundled Chromium or Firefox) with playwright-cli on a real X display, either the local desktop or a VNC display on a remote machine. Use when the user wants to watch the browser, says headed, VNC, "see what the browser does", or when headless debugging isn't enough.
---

# Playwright visual debug

Drive a **headed** browser with `playwright-cli` so the user can watch it, locally or over VNC. For the command reference (snapshot, click, fill, console, network…), use the `playwright-cli` skill. This skill only covers getting a headed browser onto the right display.

## Why this exists

The `playwright-cli` daemon does not inherit SSH X11 forwarding (`DISPLAY=localhost:10.0`), so in an SSH shell headed mode fails or silently falls back to headless. `DISPLAY` must be a real local X display: the desktop (`:0`) or a VNC server's display (`:1`, `:2`…).

## Steps

1. **Find the display** (prints `DISPLAY=:N (kind: local|vnc|virtual)`):

   ```bash
   bash "${CLAUDE_SKILL_DIR}/scripts/detect-display.sh"
   ```

   It keeps an inherited local `$DISPLAY`, ignores SSH forwarding, and otherwise scans `/tmp/.X11-unix/` for sockets you own (preferring VNC, then local, then Xvfb). If it exits 1, no display is usable: tell the user, ask them to start one (e.g. `vncserver :1`) or fall back to headless.

2. **Pick the CLI**: use `playwright-cli`; if `command -v playwright-cli` fails, use `npx -y @playwright/cli` in its place.

3. **Open a named session** with the detected display. Use `--browser=chromium` (or `firefox`) for Playwright's bundled build; without it the CLI launches system Chrome.

   ```bash
   DISPLAY=:1 playwright-cli -s=debug open http://localhost:3000 --headed --browser=chromium
   ```

4. **Reuse the same `DISPLAY` and `-s=debug` on every command.** A missing `-s` creates a new headless session instead of targeting the headed one. To avoid repeating them, `export DISPLAY=:1 PLAYWRIGHT_CLI_SESSION=debug` in the same shell call.

   ```bash
   DISPLAY=:1 playwright-cli -s=debug snapshot
   DISPLAY=:1 playwright-cli -s=debug screenshot --filename=state.png
   ```

5. **Close when done**: `playwright-cli -s=debug close`. `playwright-cli list` shows live sessions; `close-all` / `kill-all` (forceful) clean up stragglers.

Useful `open` flags: `--persistent [--profile=DIR]` keeps cookies and localStorage; `--browser=firefox` for Firefox.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `Missing X server or $DISPLAY` | Run the detect script; set `DISPLAY` explicitly on the command. |
| Headed works in a local terminal but not over SSH | Inherited `localhost:N.0` is X11 forwarding; use the detected VNC display. |
| Commands act on a headless browser | `-s=<name>` missing on a later command. |
| Window not visible | Wrong display; compare with the VNC viewer's display number (`:1` = port 5901). |
| `Browser "chrome-for-testing" is not installed` | `playwright-cli install-browser chromium` (add `--dry-run` to preview). For the newest build: `npm i -g @playwright/cli@latest` first. |
| Display found but `Authorization required` | Set `XAUTHORITY` (e.g. `~/.Xauthority`). |
| Check a window exists | `DISPLAY=:1 xdotool search --name chrome` |
