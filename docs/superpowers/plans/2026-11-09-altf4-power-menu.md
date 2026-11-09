# Alt+F4 Power Menu Implementation Plan

> **For whoever implements this:** work the tasks in order and commit at each task's commit step. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a GNOME Shell 46–51 extension that opens a centered, Blur-My-Shell-compatible power dialog on Alt+F4 from the desktop or overview, while leaving Alt+F4 in applications unchanged. Remember and prioritize the last chosen action.

**Architecture:** A single `Extension` class connects a `global.stage` key handler. When no window is focused (or the overview is visible), it opens a native `ModalDialog` whose rows come from a pure action table and GNOME's `SystemActions`. The last chosen action id is stored in a GSettings schema and moved to the top on the next open.

**Tech Stack:** GNOME Shell 46–51 ESM extensions, GJS, St/Clutter/Shell, GSettings, Node 22 test runner, ESLint 10, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-09-altf4-power-menu-design.md`

## Global Constraints

- Extension UUID: `altf4-power-menu@alphabeast97.github.io`.
- Settings schema id: `org.gnome.shell.extensions.altf4-power-menu`.
- Settings path: `/org/gnome/shell/extensions/altf4-power-menu/`.
- Supported shell versions: `46`, `47`, `48`, `49`, `50`, `51`.
- License: GPL-3.0-or-later.
- Never push to GitHub until the user verifies the finished extension.
- Do not intercept Alt+F4 while an application window has focus.
- Do not add a runtime dependency on Blur My Shell.
- No preferences UI, no hibernate, no translations, no custom shortcut setting.
- Default action order: Lock Screen, Switch User…, Log Out…, Suspend, Restart…, Power Off….
- Saved action ids: `lock-screen`, `switch-user`, `logout`, `suspend`, `restart`, `power-off`.

## Review Focus

- Alt+F4 on an empty desktop must reach the stage handler and open the dialog; verify manually in Task 6.
- Alt+F4 in a focused application must still close that application; verify manually in Task 6.
- Disabling the extension while the dialog is open must release the modal grab and keyboard handler; verify manually in Task 6 and inspect the cleanup in Task 3.
- An unknown or unavailable saved action must not break ordering or focus; covered by the `orderActions` tests in Task 2.
- Blur My Shell must blur the dialog background without hiding the rows; verify manually with BMS enabled and disabled in Task 6.
- The packed zip must contain the compiled schema, or enabling the extension fails; covered by the smoke test in Task 4.

---

### Task 1: Repository scaffold and tooling

**Files:**
- Create: `.gitignore`, `LICENSE`, `package.json`, `package-lock.json`, `eslint.config.js`, `metadata.json`, `README.md`
- Test: `npm run lint`, metadata JSON parse

**Interfaces:**
- Consumes: nothing.
- Produces: npm scripts `lint`, `test:unit`, `test:smoke`, `pack`, `test`; repository root ready for extension files.

- [ ] **Step 1: Initialize git and install dev tooling**

```bash
git init -b main
npm init -y
npm install --save-dev eslint@^10.14.0 @eslint/js@^10.0.1 globals@^17.14.0
```

- [ ] **Step 2: Write `package.json` scripts and ESM mode**

Set `name` to `gnome-altf4-menu`, `version` to `0.1.0`, `private` to `true`, `type` to `module`, and scripts:

```json
{
  "lint": "eslint .",
  "test:unit": "node --test tests/*.test.js",
  "test:smoke": "bash tests/smoke.sh",
  "pack": "bash scripts/pack.sh",
  "test": "npm run lint && npm run test:unit && npm run pack"
}
```

- [ ] **Step 3: Write `.gitignore`**

```text
node_modules/
dist/
*.shell-extension.zip
schemas/gschemas.compiled
```

- [ ] **Step 4: Write `eslint.config.js`**

Use `@eslint/js` recommended rules. Set `sourceType: 'module'`, `ecmaVersion: 2024`, ignore `dist/` and `node_modules/`, and add GNOME globals: `global`, `imports`, `log`, `logError`, `print`, `_`, `C_`, `ngettext`, `pgettext`. Include `globals.node`. Set `no-unused-vars` to error with `argsIgnorePattern: '^_'`.

- [ ] **Step 5: Write `metadata.json`**

```json
{
  "uuid": "altf4-power-menu@alphabeast97.github.io",
  "name": "Alt+F4 Power Menu",
  "description": "Opens a power menu with Alt+F4 on the desktop or overview. Alt+F4 still closes focused windows.",
  "shell-version": ["46", "47", "48", "49", "50", "51"],
  "settings-schema": "org.gnome.shell.extensions.altf4-power-menu",
  "url": "https://github.com/AlphaBeast97/gnome-altf4-menu",
  "version": 1
}
```

- [ ] **Step 6: Add the GPL-3.0 license**

```bash
curl -fsSL https://www.gnu.org/licenses/gpl-3.0.txt -o LICENSE
```

- [ ] **Step 7: Write a minimal README**

Include title, one-paragraph behavior description, development commands (`npm ci`, `npm run lint`, `npm run test:unit`, `npm run pack`, `npm run test:smoke`), and GPL-3.0-or-later license line.

- [ ] **Step 8: Verify**

Run: `npm run lint`
Expected: PASS with no lint errors.

Run: `node -e "JSON.parse(require('node:fs').readFileSync('metadata.json'))"`
Expected: exits 0.

- [ ] **Step 9: Commit**

```bash
git add .gitignore LICENSE package.json package-lock.json eslint.config.js metadata.json README.md
git commit -m "chore: scaffold extension repository and tooling"
```

---

### Task 2: Pure action and shortcut logic

**Files:**
- Create: `lib/actions.js`
- Test: `tests/actions.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `POWER_ACTIONS`: frozen array of `{id, label, icon, available, activate}`.
  - `orderActions(actions, lastActionId)`: returns a new array with the matching action first; unknown/empty ids return a copy in default order.
  - `shouldHandleAltF4({hasFocusWindow, overviewVisible})`: returns `!hasFocusWindow || overviewVisible`.

- [ ] **Step 1: Write the failing tests**

`tests/actions.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  POWER_ACTIONS,
  orderActions,
  shouldHandleAltF4,
} from '../lib/actions.js';

const expectedIds = [
  'lock-screen', 'switch-user', 'logout',
  'suspend', 'restart', 'power-off',
];

test('POWER_ACTIONS has complete, unique definitions', () => {
  assert.deepEqual(POWER_ACTIONS.map(action => action.id), expectedIds);
  for (const action of POWER_ACTIONS) {
    assert.ok(action.label.length > 0);
    assert.match(action.icon, /-symbolic$/);
    assert.match(action.available, /^can-/);
    assert.match(action.activate, /^activate/);
  }
  assert.equal(new Set(POWER_ACTIONS.map(action => action.id)).size,
    POWER_ACTIONS.length);
});

test('orderActions moves the saved action first without mutating input', () => {
  const input = [...POWER_ACTIONS];
  const result = orderActions(input, 'power-off');
  assert.equal(result[0].id, 'power-off');
  assert.deepEqual(result.slice(1).map(action => action.id),
    expectedIds.filter(id => id !== 'power-off'));
  assert.equal(input[0].id, 'lock-screen');
  assert.notEqual(result, input);
});

test('orderActions keeps default order for empty or unknown ids', () => {
  assert.deepEqual(orderActions(POWER_ACTIONS, '').map(a => a.id), expectedIds);
  assert.deepEqual(orderActions(POWER_ACTIONS, 'nope').map(a => a.id),
    expectedIds);
});

test('shouldHandleAltF4 implements Windows behavior', () => {
  const cases = [
    [{hasFocusWindow: false, overviewVisible: false}, true],
    [{hasFocusWindow: true, overviewVisible: false}, false],
    [{hasFocusWindow: true, overviewVisible: true}, true],
    [{hasFocusWindow: false, overviewVisible: true}, true],
  ];
  for (const [input, expected] of cases)
    assert.equal(shouldHandleAltF4(input), expected);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:unit`
Expected: FAIL because `lib/actions.js` does not exist.

- [ ] **Step 3: Implement `lib/actions.js`**

Use the exact ordered ids, labels, icons, and method names from the Global Constraints and this table:

```js
// id, label, icon, available, activate
['lock-screen', 'Lock Screen', 'system-lock-screen-symbolic',
  'can-lock-screen', 'activateLockScreen'],
['switch-user', 'Switch User…', 'system-users-symbolic',
  'can-switch-user', 'activateSwitchUser'],
['logout', 'Log Out…', 'system-log-out-symbolic',
  'can-logout', 'activateLogout'],
['suspend', 'Suspend', 'system-suspend-symbolic',
  'can-suspend', 'activateSuspend'],
['restart', 'Restart…', 'system-reboot-symbolic',
  'can-restart', 'activateRestart'],
['power-off', 'Power Off…', 'system-shutdown-symbolic',
  'can-power-off', 'activatePowerOff'],
```

Freeze the array with `Object.freeze` and freeze each action object.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:unit`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/actions.js tests/actions.test.js
git commit -m "feat: add power action table and shortcut logic"
```

---

### Task 3: Settings schema, dialog, and extension lifecycle

**Files:**
- Create: `schemas/org.gnome.shell.extensions.altf4-power-menu.gschema.xml`
- Create: `extension.js`
- Create: `stylesheet.css`
- Test: `tests/schema.test.js`
- Modify: `package.json` only if the test runner glob needs no change (it should not)

**Interfaces:**
- Consumes: `POWER_ACTIONS`, `orderActions`, `shouldHandleAltF4` from Task 2.
- Produces: the extension class and a `power-menu` modal dialog using standard `modal-dialog` styling. No settings UI.

- [ ] **Step 1: Write the failing schema test**

`tests/schema.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const metadata = JSON.parse(
  readFileSync(new URL('../metadata.json', import.meta.url)));
const schema = readFileSync(
  new URL('../schemas/org.gnome.shell.extensions.altf4-power-menu.gschema.xml',
    import.meta.url), 'utf8');

test('metadata uses the extension settings schema', () => {
  assert.equal(metadata['settings-schema'],
    'org.gnome.shell.extensions.altf4-power-menu');
  assert.equal(metadata.uuid, 'altf4-power-menu@alphabeast97.github.io');
});

test('schema stores the last chosen action', () => {
  assert.match(schema, /id="org\.gnome\.shell\.extensions\.altf4-power-menu"/);
  assert.match(schema, /<key name="last-action" type="s">/);
  assert.match(schema, /<default>''<\/default>/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL because the schema file does not exist.

- [ ] **Step 3: Write the schema**

Use the id and path from the Global Constraints, with one key:

```xml
<key name="last-action" type="s">
  <default>''</default>
  <summary>Last chosen power action</summary>
  <description>Action id shown first when the power menu opens.</description>
</key>
```

- [ ] **Step 4: Implement `extension.js`**

Exact public shape:

```js
export default class AltF4PowerMenuExtension extends Extension {
    enable() { /* settings, SystemActions, connect stage key-press */ }
    disable() { /* disconnect stage handler, destroy dialog, drop refs */ }
}
```

Behavior requirements:

- `enable()` sets `this._settings = this.getSettings();`
  and `this._systemActions = SystemActions.getDefault();`
- Connect `global.stage` `'key-press-event'` to a bound handler. Store the
  connection id.
- Key handler: require `Clutter.KEY_F4`, `Clutter.ModifierType.MOD1_MASK`, and
  no Ctrl/Shift/Super. Then call
  `shouldHandleAltF4({hasFocusWindow: global.display.focus_window !== null, overviewVisible: Main.overview.visible})`.
  If false, return `Clutter.EVENT_PROPAGATE`; otherwise open the dialog and
  return `Clutter.EVENT_STOP`.
- `_openDialog()` must be idempotent: return if `this._dialog` is truthy.
  Build the dialog, set `this._dialog`, connect `'destroy'` to clear the
  reference, then `open()`. If `open()` returns false, destroy it and clear
  the reference.
- Build with
  `new ModalDialog.ModalDialog({styleClass: 'altf4-power-dialog'})`.
- Add a centered `St.Label` with text `Power` and class
  `altf4-power-title`.
- Build a vertical `St.BoxLayout` with class `altf4-power-list`.
- Filter actions with `this._systemActions[action.available]` and order them
  with `orderActions(filtered, this._settings.get_string('last-action'))`.
- Each row is a focusable `St.Button` with class `altf4-power-action`,
  `x_expand: true`, an `accessible_name`, and a horizontal child box
  containing a 16px `St.Icon` (class `altf4-power-icon`) and a
  `St.Label` with the action label.
- Clicking a row must: save `last-action`, close the dialog, then call
  `this._systemActions[action.activate]()`.
- While the dialog is open, connect a second `global.stage`
  `'key-press-event'` handler. Up/Down moves focus between the row buttons
  and wraps; all other keys propagate. Disconnect it when the dialog is
  destroyed. (`Clutter.KeyController` is new in Shell 51; do not use it.)
- Add one Cancel button with `key: Clutter.KEY_Escape` and
  `action: () => dialog.close()`.
- Set initial key focus to the first row when at least one exists.
- GNOME 46 and 51 differ in `St.BoxLayout`: 46 has `vertical`, 51 has
  `orientation`. Add a small helper that creates the box and then uses
  `set_vertical(true)` when available, otherwise sets
  `orientation = Clutter.Orientation.VERTICAL`.
- `disable()` must disconnect both stage handlers, call `popModal()` and
  `destroy()` on an open dialog, clear `this._dialogButtons`, and set
  `this._dialog`, `this._settings`, and `this._systemActions` to null.

- [ ] **Step 5: Write `stylesheet.css`**

Style only:
- `.altf4-power-title`: bold, slightly larger, bottom padding.
- `.altf4-power-list`: vertical spacing if needed; no colors.
- `.altf4-power-action`: padding, border radius.
- `.altf4-power-action:hover`, `.altf4-power-action:focus`: neutral
  translucent background that works in light and dark themes.
- `.altf4-power-icon`: no forced color; let the theme handle symbolic color.

Do not add a BMS-specific class or patch.

- [ ] **Step 6: Verify**

Run: `glib-compile-schemas --strict schemas`
Expected: exits 0.

Run: `npm run lint`
Expected: PASS.

Run: `npm run test:unit`
Expected: PASS, 6 tests.

- [ ] **Step 7: Commit**

```bash
git add extension.js stylesheet.css schemas tests/schema.test.js
git commit -m "feat: add settings, power dialog, and Alt+F4 stage handler"
```

---

### Task 4: Pack script and headless smoke test

**Files:**
- Create: `scripts/pack.sh`
- Create: `tests/smoke.sh`
- Test: `npm run pack`, `npm run test:smoke`

**Interfaces:**
- Consumes: the extension files from Tasks 1–3.
- Produces: `dist/altf4-power-menu@alphabeast97.github.io.shell-extension.zip` containing `metadata.json`, `extension.js`, `stylesheet.css`, `lib/actions.js`, and the compiled schema.

- [ ] **Step 1: Write `scripts/pack.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
glib-compile-schemas --strict schemas
rm -rf dist
mkdir -p dist
gnome-extensions pack --force --out-dir dist --extra-source=lib \
  --schema schemas/org.gnome.shell.extensions.altf4-power-menu.gschema.xml \
  .
```

Make it executable.

- [ ] **Step 2: Verify the archive**

Run: `npm run pack`
Expected: exits 0 and creates the zip.

Run: `unzip -l dist/*.shell-extension.zip`
Expected: includes `metadata.json`, `extension.js`, `stylesheet.css`,
`lib/actions.js`, `schemas/org.gnome.shell.extensions.altf4-power-menu.gschema.xml`,
and `schemas/gschemas.compiled`.

If `lib/actions.js` or the compiled schema is missing, fix the pack command
before continuing.

- [ ] **Step 3: Write `tests/smoke.sh`**

Behavior:
- Exit 0 with `SKIP: ...` if `gnome-shell` is missing or `gnome-shell --help`
  does not list `--headless`.
- Create a temporary directory with `data/gnome-shell/extensions`,
  `config`, and a mode-700 `runtime` directory.
- Pack the extension and unzip it into
  `data/gnome-shell/extensions/altf4-power-menu@alphabeast97.github.io`.
- Run `dbus-run-session` with `XDG_DATA_HOME`, `XDG_CONFIG_HOME`,
  `XDG_RUNTIME_DIR`, and `XDG_DATA_DIRS=/usr/share`.
- Start `gnome-shell --headless --wayland
  --wayland-display=altf4-smoke --virtual-monitor 1280x800`, redirecting to
  a log file.
- Poll `gnome-extensions list` for the UUID, enable it, wait 2 seconds, and
  assert `gnome-extensions info UUID` prints `State: ACTIVE`.
- Fail if the shell log contains `JS ERROR`.
- Always kill the shell and clean the temporary directory via traps.

- [ ] **Step 4: Run the smoke test**

Run: `npm run test:smoke`
Expected on GNOME 51: `State: ACTIVE` and exit 0.

On a shell without headless support: prints `SKIP:` and exits 0.

- [ ] **Step 5: Commit**

```bash
git add scripts/pack.sh tests/smoke.sh
git commit -m "test: add extension packaging and headless smoke test"
```

---

### Task 5: CI workflow, README, and QA checklist

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `docs/qa-checklist.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: npm scripts and smoke test from earlier tasks.
- Produces: CI that runs lint, unit tests, packing, and the smoke test on
  Ubuntu 24.04, uploading the zip artifact.

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

Use `actions/checkout@v4`, `actions/setup-node@v4` with Node 22 and npm
cache, then:

```yaml
- run: npm ci
- run: npm run lint
- run: npm run test:unit
- run: sudo apt-get update
- run: sudo apt-get install -y dbus gnome-shell unzip
- run: npm run test:smoke
- run: npm run pack
- uses: actions/upload-artifact@v4
  with:
    name: altf4-power-menu
    path: dist/*.shell-extension.zip
```

Trigger on `push` and `pull_request`.

- [ ] **Step 2: Write `docs/qa-checklist.md`**

Include checkboxes for:
- Desktop Alt+F4 opens the dialog.
- Overview Alt+F4 opens the dialog.
- Focused app Alt+F4 closes the app.
- Dialog is centered; Escape and Cancel close it; outside click is blocked.
- Up/Down moves focus with wrapping; Enter activates.
- Each of the six actions opens GNOME's native behavior/confirmation.
- Last action moves to the top and receives focus after reopening.
- Last action persists across a shell restart.
- Unknown or unavailable saved action falls back to default order.
- BMS enabled: dialog background is blurred; rows remain readable.
- BMS popup blur disabled: dialog uses the normal theme background.
- Disabling the extension while the dialog is open releases the modal and
  Alt+F4 returns to normal.
- Re-enabling restores the menu.
- `gnome-extensions info` reports `State: ACTIVE`.

- [ ] **Step 3: Finalize `README.md`**

Cover: behavior, what Alt+F4 does in apps vs desktop, actions, last-action
memory, Blur My Shell compatibility (BMS popup blur must be enabled; no
special configuration), supported GNOME versions, install from the zip,
development/test commands, manual QA link, and GPL-3.0-or-later.

- [ ] **Step 4: Run the full local suite**

Run: `npm ci && npm test && npm run test:smoke`
Expected: lint, unit tests, pack, and smoke all pass (or smoke prints SKIP
only if headless mode is unavailable).

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml docs/qa-checklist.md README.md
git commit -m "ci: add test pipeline and QA documentation"
```

---

### Task 6: Local install and manual QA

**Files:**
- Modify: only files needed to fix defects found here.
- Test: `dist/*.shell-extension.zip` installed into the user's extension directory.

**Interfaces:**
- Consumes: the packed extension.
- Produces: a verified local installation; no GitHub push.

- [ ] **Step 1: Install and enable locally**

```bash
npm run pack
gnome-extensions install --force dist/altf4-power-menu@alphabeast97.github.io.shell-extension.zip
gnome-extensions enable altf4-power-menu@alphabeast97.github.io
gnome-extensions info altf4-power-menu@alphabeast97.github.io
```

Expected: `Enabled: Yes`, `State: ACTIVE`.

If the shell requires a reload, log out and back in before testing.

- [ ] **Step 2: Work through `docs/qa-checklist.md`**

Use a throwaway application window for the focused-app test and cancel any
destructive confirmation dialogs. Take a screenshot of the open dialog with
BMS enabled and confirm the background is blurred and the rows are readable.

- [ ] **Step 3: Fix any defects, rerun the full suite, and commit**

Run: `npm test && npm run test:smoke`

Commit with a focused message, for example:

```bash
git add -A
git commit -m "fix: correct Alt+F4 stage routing on desktop"
```

Do not push.

- [ ] **Step 4: Hand off for user verification**

Report the git log, test results, QA checklist results, and the local install
state. Wait for the user's explicit confirmation before creating or pushing
the GitHub repository.
