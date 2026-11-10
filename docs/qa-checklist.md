# Manual QA checklist

Run these checks on a real GNOME session after installing the packed extension.
Cancel any destructive confirmation dialog instead of confirming it.

- [ ] Alt+F4 on an empty desktop opens the power menu.
- [ ] Alt+F4 in the overview opens the power menu.
- [ ] Alt+F4 with an application focused closes that application and does not
      open the power menu.
- [ ] The dialog is centered.
- [ ] The menu opens with one action row showing the remembered action, and it
      has a visible focus highlight.
- [ ] Clicking the action row opens the dropdown with the other available
      actions.
- [ ] Up/Down changes the selected action (check mark) and wraps at both ends,
      with the dropdown open or closed.
- [ ] Enter runs the selected action immediately.
- [ ] Space or a click opens and closes the dropdown.
- [ ] Clicking an option selects it and closes the dropdown.
- [ ] Escape closes an open dropdown first and closes the dialog second.
- [ ] OK runs the selected action; Escape and the Cancel button close the
      dialog without running anything.
- [ ] Clicking outside the dialog does not close or pass through it.
- [ ] Each of the six actions starts GNOME's native behavior or confirmation
      dialog: Lock Screen, Switch User, Log Out, Suspend, Restart, Power Off.
- [ ] After running an action and reopening the menu, that action is
      preselected.
- [ ] The last action survives a shell restart.
- [ ] Selecting a different action and pressing Cancel leaves the remembered
      action unchanged.
- [ ] An unknown or unavailable saved action falls back to the first available
      action.
- [ ] With Blur My Shell enabled and popup blur on, the dialog background is
      blurred and the rows are readable.
- [ ] With Blur My Shell popup blur off, the dialog uses the normal theme
      background.
- [ ] Disabling the extension while the dialog is open releases the modal and
      Alt+F4 returns to normal.
- [ ] Re-enabling the extension restores the menu.
- [ ] `gnome-extensions info altf4-power-menu@alphabeast97.github.io` reports
      `State: ACTIVE`.
