# Manual QA checklist

Run these checks on a real GNOME session after installing the packed extension.
Cancel any destructive confirmation dialog instead of confirming it.

- [x] Alt+F4 on an empty desktop opens the power menu.
- [x] Alt+F4 in the overview opens the power menu.
- [x] Alt+F4 with an application focused closes that application and does not
      open the power menu.
- [x] The extension's Settings page shows the shortcut row with Alt+F4 and a
      Reset row.
- [x] Clicking the shortcut row opens the capture dialog.
- [x] Escape and the Cancel button close the capture dialog without changing
      the shortcut.
- [x] Modifier-only presses are ignored, and a key without a modifier is
      rejected with a hint.
- [x] The capture dialog's Use Alt+F4 button keeps or restores Alt+F4.
- [x] Setting Ctrl+Alt+P makes that combination open the menu on the desktop,
      and Alt+F4 no longer opens it there.
- [x] Reset restores Alt+F4.
- [x] With a custom shortcut set, an application-focused window still receives
      its own shortcuts unchanged.
- [x] The chosen shortcut survives a shell restart.
- [x] The dialog is centered.
- [x] The menu opens with one action row showing the remembered action, and it
      has a visible focus highlight.
- [x] Clicking the action row opens the dropdown with the other available
      actions.
- [x] Up/Down changes the selected action (check mark) and wraps at both ends,
      with the dropdown open or closed.
- [x] Enter runs the selected action immediately.
- [x] Space or a click opens and closes the dropdown.
- [x] Clicking an option selects it and closes the dropdown.
- [x] Escape closes an open dropdown first and closes the dialog second.
- [x] OK runs the selected action; Escape and the Cancel button close the
      dialog without running anything.
- [x] Clicking outside the dialog does not close or pass through it.
- [x] Each of the six actions starts GNOME's native behavior or confirmation
      dialog: Lock Screen, Switch User, Log Out, Suspend, Restart, Power Off.
- [x] After running an action and reopening the menu, that action is
      preselected.
- [x] The last action survives a shell restart.
- [x] Selecting a different action and pressing Cancel leaves the remembered
      action unchanged.
- [x] An unknown or unavailable saved action falls back to the first available
      action.
- [x] With Blur My Shell enabled and popup blur on, the dialog background is
      blurred and the rows are readable.
- [x] With Blur My Shell popup blur off, the dialog uses the normal theme
      background.
- [x] Disabling the extension while the dialog is open releases the modal and
      Alt+F4 returns to normal.
- [x] Re-enabling the extension restores the menu.
- [x] `gnome-extensions info altf4-power-menu@alphabeast97.github.io` reports
      `State: ACTIVE`.
