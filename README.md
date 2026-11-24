<p align="center">
  <img src="docs/icon.png" alt="Alt+F4 Power Menu icon" width="128" height="128">
</p>
<h1 align="center">Alt+F4 Power Menu</h1>

<p align="center"><a href="https://alphabeast97.github.io/gnome-altf4-menu/"><strong>Visit the project website →</strong></a></p>

<p align="center"><em>The demo animation may take a moment to load.</em></p>
<p align="center">
  <video src="https://github.com/user-attachments/assets/f457a447-7738-447a-af50-c90a111b59cb.mp4" width="100%" autoplay loop muted playsinline controls></video>
</p>

<p align="center"><em>Blur My Shell is recommended for the blurred backdrop shown in this demo.</em></p>

## Preferences

<p align="center">
  <img src="docs/settings%20menu.png" alt="Alt+F4 Power Menu preferences showing shortcut controls, always-open mode, confirmation skipping, and visible actions" width="540">
</p>
<p align="center"><em>Confirmation skipping is shown enabled in this screenshot; it is off by default.</em></p>

Configure the extension from its preferences:

- **Shortcut:** choose a modifier-based key combination. Alt+F4 is the default.
- **Always open from shortcut:** when enabled, the configured shortcut opens the
  power menu immediately even while an application window is focused. It is off
  by default; with it off, the shortcut opens the menu on the desktop or in the
  overview and keeps normal close-window behavior for focused apps.
- **Skip confirmation dialogs:** optionally skip GNOME's extra confirmation for
  Log Out, Restart, and Power Off. This is off by default.
- **Visible options:** choose which actions appear, then drag to arrange their
  order.

A GNOME Shell extension that brings Windows-style Alt+F4 behavior to GNOME:

- With an application focused, Alt+F4 closes the window as usual.
- On the desktop or in the overview, Alt+F4 opens a centered power menu.
- An optional setting makes the configured shortcut open the menu immediately,
  even when an application window is focused. It is disabled by default.
- The shortcut is configurable in the extension's settings and defaults to
  Alt+F4. Choose any shortcut combination with a modifier key.
- The power-menu actions can be enabled or hidden individually.
- Power-menu actions can be reordered by dragging them in the extension's
  settings.
- The last action you chose is preselected the next time the menu opens.
- Cancel or Escape closes the menu without changing that memory.

The menu shows a single action row with a dropdown, like the Windows 11 power
dialog. Up/Down changes the selected action at any time, Enter runs it, Space
or a click opens the dropdown, and Escape closes the menu. Picking an option
from the dropdown with the mouse also selects it.

It offers Lock Screen, Switch User…, Log Out…, Suspend, Restart…, and Power
Off…. It uses GNOME's own `SystemActions`, so unavailable actions are omitted
and GNOME's native confirmation dialogs are used.

The optional **Skip confirmation dialogs** setting is off by default. When
enabled, Log Out, Restart, and Power Off skip GNOME's additional confirmation
dialog. Lock Screen, Switch User, and Suspend do not show that extra dialog.

## Power-menu options

Open the extension's settings and use the switches under **Visible options** to
choose which actions appear. Drag the handle beside an action to change its
order. Disabled actions keep their position and return to that position if
enabled again. At least one action must remain enabled.

## Requirements

- GNOME Shell 46–51
- Blur My Shell is recommended

## Install

Install it from
[extensions.gnome.org](https://extensions.gnome.org/extension/11716/altf4-power-menu/).

Alternatively, download the zip from the
[latest release](https://github.com/AlphaBeast97/gnome-altf4-menu/releases/latest),
or build it with `npm run pack`, then run:

```bash
gnome-extensions install --force altf4-power-menu@alphabeast97.github.io.shell-extension.zip
```

Reload the extension after installing it, then enable it. If GNOME Shell does
not pick up the new version, log out and back in:

```bash
gnome-extensions disable altf4-power-menu@alphabeast97.github.io 2>/dev/null || true
gnome-extensions enable altf4-power-menu@alphabeast97.github.io
gnome-extensions info altf4-power-menu@alphabeast97.github.io
```

`gnome-extensions info` should report `State: ACTIVE`.

## Shortcut

Open the extension's settings (Extensions → Alt+F4 Power Menu → Settings),
click the shortcut row, and press the new combination. Any combination with a
modifier key (Shift, Ctrl, Alt or Super) is supported. The chosen shortcut
replaces Alt+F4, and the Reset button restores Alt+F4.

By default, the shortcut only opens the menu on the desktop or in the overview.
With a window focused, it is left to the application and GNOME. To make the
configured shortcut open the menu over focused windows, enable **Always open
from shortcut** in the preferences. If the configured shortcut is
Alt+F4, enabling this option means Alt+F4 opens the power menu instead of
closing the focused window; choose another shortcut to keep Alt+F4's usual
close-window behavior.

Alt+F4 is GNOME's own close-window shortcut, so pressing it while the capture
dialog is open closes the dialog instead of recording it. Use the dialog's
**Use Alt+F4** button to select it.

## Blur My Shell

No special configuration is needed. The menu is a standard GNOME Shell modal
dialog, so Blur My Shell's popup blur applies to it automatically when that BMS
option is enabled. With popup blur disabled, the normal theme background is
used.

## Development

```bash
npm ci
npm run lint
npm run test:unit
npm run pack
npm run test:smoke
```

`npm run test` runs lint, unit tests, and packing. `npm run test:smoke` loads
the packed extension in a temporary headless GNOME Shell session and checks
that it reaches `State: ACTIVE`.

`npm run pack` creates
`dist/altf4-power-menu@alphabeast97.github.io.shell-extension.zip`. The smoke
test is skipped with a clear message when the installed GNOME Shell does not
support headless mode.

Manual checks are listed in [docs/qa-checklist.md](docs/qa-checklist.md).

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).
