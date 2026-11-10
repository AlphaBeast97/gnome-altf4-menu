# Manual QA checklist

Run these checks on a real GNOME session after installing the packed extension.
Cancel any destructive confirmation dialog instead of confirming it.

- [ ] Alt+F4 on an empty desktop opens the power menu.
- [ ] Alt+F4 in the overview opens the power menu.
- [ ] Alt+F4 with an application focused closes that application and does not
      open the power menu.
- [ ] The dialog is centered.
- [ ] Escape and the Cancel button close the dialog.
- [ ] Clicking outside the dialog does not close or pass through it.
- [ ] Up/Down moves focus between the rows and wraps at both ends.
- [ ] Enter activates the focused row.
- [ ] Each of the six actions starts GNOME's native behavior or confirmation
      dialog: Lock Screen, Switch User, Log Out, Suspend, Restart, Power Off.
- [ ] After choosing an action and reopening the menu, that action is first
      and has keyboard focus.
- [ ] The last action survives a shell restart.
- [ ] An unknown or unavailable saved action falls back to the default order.
- [ ] With Blur My Shell enabled and popup blur on, the dialog background is
      blurred and the rows are readable.
- [ ] With Blur My Shell popup blur off, the dialog uses the normal theme
      background.
- [ ] Disabling the extension while the dialog is open releases the modal and
      Alt+F4 returns to normal.
- [ ] Re-enabling the extension restores the menu.
- [ ] `gnome-extensions info altf4-power-menu@alphabeast97.github.io` reports
      `State: ACTIVE`.
