# Alt+F4 Power Menu — Design

Date: 2026-11-09
Status: Approved 2026-11-09
Target: GNOME Shell 46–51

## Intent

Add Windows-style Alt+F4 behavior to GNOME: with an application focused, Alt+F4
keeps closing that window; on the desktop or in the overview, Alt+F4 opens a
centered power dialog. Remember the last action the user chose and show that
action first the next time the menu opens.

## Why

GNOME's Alt+F4 binding is per-window. When no window is focused it does nothing,
so there is no quick, discoverable power menu from the desktop. Windows users
expect Alt+F4 on the desktop to open the shutdown dialog.

## Goals

- Alt+F4 on the desktop or in the overview opens the power dialog.
- Alt+F4 in a focused application is unchanged.
- Actions: Lock Screen, Switch User, Log Out, Suspend, Restart, Power Off.
- Use GNOME's `SystemActions` so availability checks and confirmation dialogs
  are native and correct.
- Persist the last chosen action and put it first (and focus it) next time.
- Work alongside Blur My Shell without BMS-specific code.
- Ship with automated checks, a smoke test, and manual QA notes.
- Everything tracked in git locally; nothing is pushed to GitHub until the
  user verifies the finished extension.

## Non-goals

- Preferences UI.
- Hibernate (not provided by `SystemActions`; needs extra UPower/logind work).
- Configurable shortcut. Alt+F4 is the point of the extension.
- extensions.gnome.org submission.
- Translations.
- Light/dark-specific custom theming beyond the native dialog.

## Anti-goals

- Never intercept Alt+F4 while an application window has focus.
- Never leave a keyboard handler, modal grab, or dialog behind after disable.
- No monkeypatching GNOME Shell or Blur My Shell.
- No runtime dependency on Blur My Shell.

## Constraints

- GNOME Shell 46–51, ESM extension conventions.
- Blur My Shell 77 is installed with popup blur enabled; BMS automatically
  targets standard `modal-dialog` actors.
- GSettings schema is shipped inside the extension and must be compiled.
- No root privileges.

## Approaches considered

### Shortcut interception

1. **Override Mutter's `close` handler with a custom handler.**
   Makes Alt+F4 open the menu everywhere, including inside applications.
   Rejected: the user chose Windows behavior and we must not break window
   closing.

2. **Register a second global keybinding on `<Alt>F4`.**
   Rejected: Mutter already owns that accelerator for the per-window `close`
   binding. Duplicate-accelerator precedence in Mutter is unreliable and
   version-dependent.

3. **Stage key-press handler, gated on focus state.**
   Chosen: connect to `global.stage`; handle Alt+F4 only when no window has
   focus, or when the overview is visible. Applications keep their normal
   key events, no Mutter settings are modified, and disabling the extension
   fully restores behavior.

### Dialog

1. **Custom `St.Widget`.** Rejected: reimplements centering, modal grabs,
   focus handling, and Escape behavior.
2. **Centered `PopupMenu`.** Rejected: needs an invisible source actor and
   arrow-removal positioning hacks; it is a menu, not a modal.
3. **`ModalDialog` with action rows.** Chosen: native centering, modal
   behavior, focus management, Escape/Cancel, and Blur My Shell support via
   the standard `modal-dialog` style class.

### Last-action persistence

`GSettings` key `last-action` (string) in the extension's own schema. Chosen
over a JSON file (no standard change notification, extra IO) and over
`dconf` directly (unnecessary). Unknown or unavailable saved actions fall
back to the default order.

## Architecture

- `extension.js`
  - `Extension` class owning the stage handler, settings, dialog instance,
    and `SystemActions` singleton.
  - Enable: load settings, connect `global.stage` `key-press-event`.
  - Alt+F4 path: verify Alt with no Ctrl/Shift/Super, then use
    `shouldHandleAltF4({hasFocusWindow, overviewVisible})`. If true, open the
    dialog and stop the event.
  - Dialog is single-instance; `destroy` signal clears the reference.
  - Disable: disconnect the stage handler, pop the modal grab and destroy the
    dialog if present, drop all references.
- `lib/actions.js`
  - Pure action definitions: `id`, `label`, `icon`, `available`, `activate`.
  - `orderActions(actions, lastActionId)`.
  - `shouldHandleAltF4({hasFocusWindow, overviewVisible})`.
- `schemas/org.gnome.shell.extensions.altf4-power-menu.gschema.xml`
  - Settings path `/org/gnome/shell/extensions/altf4-power-menu/`.
  - Key `last-action` type `s`, default `''`.
- `stylesheet.css`
  - Dialog title and action-row styling only; standard Shell dialog classes
    provide the surface, padding, and focus behavior.
- `metadata.json`
  - UUID `altf4-power-menu@alphabeast97.github.io`.
  - `settings-schema` pointing at the schema above.
  - Shell versions 46–51.

## Dialog behavior

- Centered on the current monitor with the standard modal lightbox.
- Title "Power".
- One focusable row per available action, with icon and label.
- Order: last chosen action first (if available), then the default order:
  Lock Screen, Switch User, Log Out, Suspend, Restart, Power Off.
- Focus starts on the first row. Up/Down cycles through visible rows. Enter
  activates. Escape and the Cancel button close the dialog.
- Choosing an action saves its id to `last-action`, closes the dialog, then
  calls the matching `SystemActions` method. Native confirmation dialogs for
  restart, power off, log out, and switch user are left to GNOME.
- Unavailable actions are omitted using `can-*` properties; if the saved
  action is unavailable the default order is used.

## Blur My Shell integration

No runtime coupling. The dialog is a standard `ModalDialog`, so its
`dialogLayout` carries the `modal-dialog` class. BMS's popup blur component
already tracks `Main.layoutManager.modalDialogGroup` and blurs that target.
Manual QA covers BMS enabled and disabled. README documents that BMS popup
blur must be enabled for the blur effect.

## Testing pipeline

1. **Lint** — ESLint flat config with recommended rules.
2. **Unit tests** — Node's built-in test runner:
   - action definitions are complete and unique;
   - `orderActions` puts the saved action first and falls back safely;
   - `shouldHandleAltF4` matches the Windows behavior table.
3. **Pack validation** — compile the schema, run `gnome-extensions pack`,
   inspect the archive for required files.
4. **Smoke test** — in a `dbus-run-session` headless GNOME Shell, install the
   packed extension into temporary XDG directories, enable it, assert
   `State: ACTIVE`, and fail on JS errors. Runs locally on GNOME 51 and in CI
   on GNOME 46; skipped with a clear message if headless mode is unavailable.
5. **Manual QA** — desktop/overview/application Alt+F4 behavior, every action,
   last-action persistence across reopen and re-login, Escape/Cancel, BMS
   on/off blur, extension disable restoring normal behavior.
6. **CI** — GitHub Actions: lint, unit tests, pack, smoke test, upload the
   extension zip as an artifact.

## Git and release workflow

- Initialize a local git repository with `main` as the default branch.
- Conventional commits, one logical change per commit.
- GPL-3.0-or-later license.
- Keep everything local until the user confirms the extension is verified.
- Then create the public GitHub repository `AlphaBeast97/gnome-altf4-menu`,
  push, watch CI, and attach the built zip to a release when tagged.

## Open questions

None.
