import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {
  DEFAULT_KEYVAL,
  DEFAULT_MODS,
  modifiersFromState,
  modifiersToGdk,
} from './lib/shortcut.js';
import {
  normalizeActionIds,
  POWER_ACTIONS,
  POWER_ACTION_IDS,
  toggleActionVisibility,
} from './lib/actions.js';

// Gdk.keyval_is_modifier() is not introspectable in GJS.
const MODIFIER_KEYVALS = new Set([
  Gdk.KEY_Shift_L, Gdk.KEY_Shift_R,
  Gdk.KEY_Control_L, Gdk.KEY_Control_R,
  Gdk.KEY_Alt_L, Gdk.KEY_Alt_R,
  Gdk.KEY_Super_L, Gdk.KEY_Super_R,
  Gdk.KEY_Meta_L, Gdk.KEY_Meta_R,
  Gdk.KEY_Hyper_L, Gdk.KEY_Hyper_R,
  Gdk.KEY_Caps_Lock, Gdk.KEY_Num_Lock,
  Gdk.KEY_ISO_Level3_Shift,
]);

export default class AltF4PowerMenuPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings();
    const shortcutLabel = new Gtk.ShortcutLabel({valign: Gtk.Align.CENTER});
    const shortcutRow = new Adw.ActionRow({
      title: 'Shortcut',
      activatable: true,
    });

    function updateLabel() {
      const keyval = settings.get_uint('shortcut-keysym');
      shortcutLabel.accelerator = keyval ? Gtk.accelerator_name(
        keyval, modifiersToGdk(settings.get_uint('shortcut-mods'))) : '';
    }

    function save(keyval, mods) {
      settings.set_uint('shortcut-keysym', keyval);
      settings.set_uint('shortcut-mods', mods);
      updateLabel();
    }

    function capture() {
      const dialog = new Adw.Window({
        transient_for: window,
        modal: true,
        title: 'Press the new shortcut',
        default_width: 420,
        resizable: false,
      });

      const hint = new Gtk.Label({
        label: 'With Super, Ctrl or Alt',
        css_classes: ['dim-label'],
        justify: Gtk.Justification.CENTER,
      });
      const instruction = new Gtk.Label({
        label: 'Hold a modifier with another key',
        css_classes: ['dim-label'],
        wrap: true,
        justify: Gtk.Justification.CENTER,
      });
      const caveat = new Gtk.Label({
        label: 'Alt+F4 closes this dialog, so use the button below to choose it.',
        css_classes: ['dim-label'],
        wrap: true,
        justify: Gtk.Justification.CENTER,
      });

      const useDefault = new Gtk.Button({label: 'Use Alt+F4'});
      useDefault.connect('clicked', () => {
        save(DEFAULT_KEYVAL, DEFAULT_MODS);
        dialog.close();
      });
      const cancel = new Gtk.Button({label: 'Cancel'});
      cancel.connect('clicked', () => dialog.close());

      const keyHint = new Gtk.Label({
        label: 'Esc',
        css_classes: ['dim-label', 'caption-heading'],
      });
      const cancelHint = new Gtk.Label({
        label: 'Cancel',
        css_classes: ['dim-label'],
      });
      const backspaceHint = new Gtk.Label({
        label: 'Backspace',
        css_classes: ['dim-label', 'caption-heading'],
      });
      const removeHint = new Gtk.Label({
        label: 'Remove',
        css_classes: ['dim-label'],
      });
      const hints = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 6,
        halign: Gtk.Align.CENTER,
      });
      hints.append(keyHint);
      hints.append(cancelHint);
      hints.append(backspaceHint);
      hints.append(removeHint);

      const buttons = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 12,
        halign: Gtk.Align.CENTER,
      });
      buttons.append(useDefault);
      buttons.append(cancel);

      const box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 12,
        margin_top: 24,
        margin_bottom: 24,
        margin_start: 24,
        margin_end: 24,
      });
      const icon = new Gtk.Image({
        icon_name: 'preferences-desktop-keyboard-shortcuts-symbolic',
        pixel_size: 48,
      });
      const title = new Gtk.Label({
        label: 'Press the new shortcut',
        css_classes: ['title-2'],
        halign: Gtk.Align.CENTER,
      });
      icon.add_css_class('large-icons');
      box.append(icon);
      box.append(title);
      box.append(hint);
      box.append(instruction);
      box.append(hints);
      box.append(caveat);
      box.append(buttons);

      const toolbar = new Adw.ToolbarView();
      toolbar.add_top_bar(new Adw.HeaderBar());
      toolbar.set_content(box);
      dialog.set_content(toolbar);

      const controller = new Gtk.EventControllerKey();
      controller.set_propagation_phase(Gtk.PropagationPhase.CAPTURE);
      controller.connect('key-pressed', (_controller, keyval, _keycode, state) => {
        if (keyval === Gdk.KEY_Escape) {
          dialog.close();
          return true;
        }

        if (keyval === Gdk.KEY_BackSpace) {
          save(0, 0);
          dialog.close();
          return true;
        }

        if (MODIFIER_KEYVALS.has(keyval))
          return true;

        const mods = modifiersFromState(state);
        if (!mods) {
          hint.label = 'Hold a modifier with another key';
          return true;
        }

        save(keyval, mods);
        dialog.close();
        return true;
      });
      dialog.add_controller(controller);
      dialog.present();
    }

    shortcutRow.add_suffix(shortcutLabel);
    shortcutRow.connect('activated', capture);

    const resetRow = new Adw.ActionRow({
      title: 'Reset shortcut',
      subtitle: 'Restores Alt+F4.',
    });
    const resetButton = new Gtk.Button({
      label: 'Reset',
      valign: Gtk.Align.CENTER,
    });
    resetButton.connect('clicked', () => save(DEFAULT_KEYVAL, DEFAULT_MODS));
    resetRow.add_suffix(resetButton);
    resetRow.activatable_widget = resetButton;

    const group = new Adw.PreferencesGroup({
      title: 'Power Menu',
      description: 'Opens the power menu on the desktop or in the overview.',
    });
    group.add(shortcutRow);
    group.add(resetRow);

    const actionsGroup = new Adw.PreferencesGroup({
      title: 'Visible options',
      description: 'Choose which actions appear in the power menu. Drag to reorder.',
    });
    const actionList = new Gtk.ListBox({
      selection_mode: Gtk.SelectionMode.NONE,
      css_classes: ['boxed-list'],
    });
    const actionSwitches = new Map();
    const actionRows = new Map();
    const actionOrder = () => normalizeActionIds(
      settings.get_strv('action-order'));

    function saveOrder(order) {
      settings.set_strv('visible-actions', order);
    }

    function reorder(sourceId, targetId, targetY, targetHeight) {
      if (sourceId === targetId)
        return;

      const order = actionOrder();
      const sourceIndex = order.indexOf(sourceId);
      order.splice(sourceIndex, 1);
      const targetIndex = order.indexOf(targetId);
      const insertAt = targetIndex + (targetY > targetHeight / 2 ? 1 : 0);
      order.splice(insertAt, 0, sourceId);
      saveOrder(order);
    }

    function refreshActionRows() {
      for (const id of actionOrder())
        actionList.append(actionRows.get(id));
    }

    for (const action of POWER_ACTIONS) {
      const actionRow = new Adw.ActionRow({
        title: action.label,
        activatable: true,
      });
      const dragHandle = new Gtk.Label({
        label: '⋮⋮',
        tooltip_text: 'Drag to reorder',
        css_classes: ['dim-label'],
      });
      const actionSwitch = new Gtk.Switch({
        valign: Gtk.Align.CENTER,
        active: settings.get_strv('visible-actions').includes(action.id),
      });
      actionSwitch.connect('state-set', (_switch, state) => {
        const current = settings.get_strv('visible-actions');
        const next = toggleActionVisibility(current, action.id, state,
          actionOrder());
        if (next.join('\0') === current.join('\0'))
          return true;
        settings.set_strv('visible-actions', next);
        return false;
      });
      const dragSource = new Gtk.DragSource({actions: Gdk.DragAction.MOVE});
      dragSource.connect('prepare', () =>
        Gdk.ContentProvider.new_for_value(action.id));
      dragHandle.add_controller(dragSource);

      const dropTarget = Gtk.DropTarget.new(
        GObject.TYPE_STRING, Gdk.DragAction.MOVE);
      dropTarget.connect('drop', (_target, value, _x, y) => {
        reorder(value, action.id, y, actionRow.get_height());
        return true;
      });
      actionRow.add_controller(dropTarget);
      actionRow.add_suffix(dragHandle);
      actionRow.add_suffix(actionSwitch);
      actionRow.activatable_widget = actionSwitch;
      actionSwitches.set(action.id, actionSwitch);
      actionRows.set(action.id, actionRow);
    }
    refreshActionRows();
    actionsGroup.add(actionList);
    function refreshPreferences() {
      const visible = settings.get_strv('visible-actions');
      for (const id of POWER_ACTION_IDS)
        actionSwitches.get(id).set_active(visible.includes(id));
      refreshActionRows();
    }
    settings.connect('changed::visible-actions', refreshPreferences);
    settings.connect('changed::action-order', refreshPreferences);

    const page = new Adw.PreferencesPage();
    page.add(group);
    page.add(actionsGroup);
    window.add(page);

    updateLabel();
  }
}
