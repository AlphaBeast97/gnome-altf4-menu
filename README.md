# Alt+F4 Power Menu

A GNOME Shell extension that brings Windows-style Alt+F4 behavior to GNOME:

- With an application focused, Alt+F4 closes the window as usual.
- On the desktop or in the overview, Alt+F4 opens a centered power menu.
- The last action you chose is shown first the next time the menu opens.

The menu offers Lock Screen, Switch User, Log Out, Suspend, Restart, and Power
Off through GNOME's own system actions, so unavailable options are hidden and
confirmation dialogs are native.

## Blur My Shell

No special configuration is needed. The menu is a standard GNOME Shell dialog,
so Blur My Shell's popup blur applies to it automatically when that BMS option
is enabled.

## Requirements

- GNOME Shell 46–51
- Blur My Shell is optional

## Development

```bash
npm ci
npm run lint
npm run test:unit
npm run pack
npm run test:smoke
```

`npm run pack` creates
`dist/altf4-power-menu@alphabeast97.github.io.shell-extension.zip`.

Install it with:

```bash
gnome-extensions install --force dist/altf4-power-menu@alphabeast97.github.io.shell-extension.zip
```

Manual checks are listed in [docs/qa-checklist.md](docs/qa-checklist.md).

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).
