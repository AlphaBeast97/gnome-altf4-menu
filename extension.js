import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
import * as SystemActions from 'resource:///org/gnome/shell/misc/systemActions.js';

import {
  POWER_ACTIONS,
  filterAvailableActions,
  pickInitialAction,
  shouldHandleAltF4,
} from './lib/actions.js';
import {
  matchesShortcut,
  modifiersToGdk,
} from './lib/shortcut.js';

function createVerticalBox(params) {
  const box = new St.BoxLayout(params);
  // GNOME 46 exposes vertical, GNOME 51 only exposes orientation.
  if (typeof box.set_vertical === 'function')
    box.set_vertical(true);
  else
    box.orientation = Clutter.Orientation.VERTICAL;
  return box;
}

function createActionContent(text) {
  const content = new St.BoxLayout({
    style_class: 'altf4-power-action-content',
    x_expand: true,
  });
  content.add_child(new St.Label({text, x_expand: true}));
  return content;
}

export default class AltF4PowerMenuExtension extends Extension {
  enable() {
    this._settings = this.getSettings();
    this._systemActions = SystemActions.getDefault();
    this._dialog = null;
    this._ensureShortcutBinding();
    this._globalShortcutRegistered = false;
    this._updateGlobalShortcut();
    this._settings.connectObject('changed', (_settings, key) => {
      if (key === 'shortcut-binding' && this._globalShortcutRegistered)
        this._removeGlobalShortcut();
      if (key === 'allow-focused-window' || key === 'shortcut-binding')
        this._updateGlobalShortcut();
    }, global.stage);
    global.stage.connectObject(
      'key-press-event', this._onStageKeyPress.bind(this), this._settings);
    this._resetDialogState();
  }

  disable() {
    global.stage.disconnectObject(this._settings);
    this._settings.disconnectObject(global.stage);

    this._removeGlobalShortcut();

    if (this._dialog) {
      const dialog = this._dialog;
      dialog.disconnectObject(this._settings);
      this._dialog = null;
      this._destroyDialogWidgets(dialog);
      dialog.popModal();
      dialog.destroy();
    }

    this._resetDialogState();
    this._settings = null;
    this._systemActions = null;
  }

  _resetDialogState() {
    this._actions = null;
    this._selectedAction = null;
    this._selector = null;
    this._selectorIcon = null;
    this._selectorLabel = null;
    this._chevron = null;
    this._options = null;
  }

  _destroyDialogWidgets(dialog) {
    for (const row of this._options?.get_children() ?? []) {
      row.disconnectObject(dialog);
      const check = row.child.get_last_child();
      check.destroy();
      row.destroy();
    }

    this._selector?.disconnectObject(dialog);
    const keyController = this._selector?.get_actions().find(
      action => action instanceof Clutter.KeyController);
    if (keyController) {
      keyController.disconnectObject(dialog);
      this._selector.remove_action(keyController);
    }

    this._selectorIcon?.destroy();
    this._selectorLabel?.destroy();
    this._chevron?.destroy();
    this._selector?.destroy();
    this._options?.destroy();
  }

  _ensureShortcutBinding() {
    const binding = this._settings.get_strv('shortcut-binding');
    if (binding.length > 0)
      return;

    const keyval = this._settings.get_uint('shortcut-keysym');
    if (!keyval)
      return;

    const mods = this._settings.get_uint('shortcut-mods');
    const accelerator = Meta.accelerator_name(keyval, modifiersToGdk(mods));
    this._settings.set_strv('shortcut-binding', [accelerator]);
  }

  _updateGlobalShortcut() {
    if (this._settings.get_boolean('allow-focused-window')) {
      if (this._globalShortcutRegistered)
        return;

      const action = Main.wm.addKeybinding(
        'shortcut-binding',
        this._settings,
        Meta.KeyBindingFlags.NONE,
        Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
        () => this._openDialog());
      this._globalShortcutRegistered = action !== Meta.KeyBindingAction.NONE;
      return;
    }

    this._removeGlobalShortcut();
  }

  _removeGlobalShortcut() {
    if (!this._globalShortcutRegistered)
      return;

    Main.wm.removeKeybinding('shortcut-binding');
    this._globalShortcutRegistered = false;
  }

  _onStageKeyPress(_stage, event) {
    if (this._settings.get_boolean('allow-focused-window') ||
        !matchesShortcut(event.get_key_symbol(), event.get_state(),
          this._settings.get_uint('shortcut-keysym'),
          this._settings.get_uint('shortcut-mods')))
      return Clutter.EVENT_PROPAGATE;

    const focusWindow = global.display.focus_window;
    const hasFocusWindow = focusWindow !== null &&
      focusWindow.get_window_type() !== Meta.WindowType.DESKTOP;
    if (!shouldHandleAltF4({
      hasFocusWindow,
      overviewVisible: Main.overview.visible,
    }))
      return Clutter.EVENT_PROPAGATE;

    this._openDialog();
    return Clutter.EVENT_STOP;
  }

  _openDialog() {
    if (this._dialog)
      return;

    const actions = filterAvailableActions(
      POWER_ACTIONS, this._settings.get_strv('visible-actions'),
      this._systemActions, this._settings.get_strv('action-order'));
    const selected = pickInitialAction(
      actions, this._settings.get_string('last-action'));
    if (!selected)
      return;

    const dialog = new ModalDialog.ModalDialog({
      styleClass: 'altf4-power-dialog',
    });

    dialog.contentLayout.add_child(new St.Label({
      text: 'Power',
      style_class: 'altf4-power-title',
      x_align: Clutter.ActorAlign.CENTER,
    }));

    this._actions = actions;
    this._selectedAction = selected;

    this._options = createVerticalBox({
      style_class: 'altf4-power-options',
      visible: false,
    });
    for (const action of actions) {
      const content = createActionContent(action.label);
      content.insert_child_at_index(new St.Icon({
        icon_name: action.icon,
        icon_size: 16,
        style_class: 'altf4-power-icon',
      }), 0);
      const check = new St.Icon({
        icon_name: 'object-select-symbolic',
        icon_size: 14,
        style_class: 'altf4-power-check',
      });
      content.add_child(check);

      const row = new St.Button({
        style_class: 'altf4-power-option',
        child: content,
        x_expand: true,
        can_focus: false,
        accessible_name: action.label,
      });
      row.connectObject('clicked', () => this._selectAction(action), dialog);
      this._options.add_child(row);
    }

    this._selectorIcon = new St.Icon({
      icon_size: 16,
      style_class: 'altf4-power-icon',
    });
    this._selectorLabel = new St.Label({x_expand: true});
    this._chevron = new St.Icon({
      icon_name: 'pan-down-symbolic',
      icon_size: 12,
      style_class: 'altf4-power-chevron',
    });

    const selectorContent = new St.BoxLayout({
      style_class: 'altf4-power-action-content',
      x_expand: true,
    });
    selectorContent.add_child(this._selectorIcon);
    selectorContent.add_child(this._selectorLabel);
    selectorContent.add_child(this._chevron);

    this._selector = new St.Button({
      style_class: 'altf4-power-selector',
      child: selectorContent,
      x_expand: true,
      can_focus: true,
    });
    this._selector.connectObject(
      'clicked', () => this._toggleOptions(), dialog);
    const keyController = new Clutter.KeyController();
    keyController.connectObject(
      'key-press', this._onSelectorKeyPress.bind(this), dialog);
    this._selector.add_action(keyController);

    dialog.contentLayout.add_child(this._selector);
    dialog.contentLayout.add_child(this._options);
    this._updateSelector();

    dialog.addButton({
      label: 'Cancel',
      key: Clutter.KEY_Escape,
      action: () => dialog.close(),
    });
    dialog.addButton({
      label: 'OK',
      default: true,
      action: () => this._activateSelected(),
    });

    this._dialog = dialog;
    dialog.connectObject('destroy', () => {
      dialog.disconnectObject(this._settings);
      this._destroyDialogWidgets(dialog);
      if (this._dialog === dialog)
        this._dialog = null;
      this._resetDialogState();
    }, this._settings);

    if (!dialog.open()) {
      dialog.destroy();
      return;
    }

    // Focus grabbed while the dialog was hidden does not paint the focus style.
    this._selector.grab_key_focus();
  }

  _updateSelector() {
    const action = this._selectedAction;
    if (!action)
      return;

    this._selectorIcon.icon_name = action.icon;
    this._selectorLabel.text = action.label;
    this._selector.accessible_name = action.label;

    const selectedIndex = this._actions.indexOf(action);
    this._options.get_children().forEach((row, index) => {
      row.child.get_last_child().visible = index === selectedIndex;
    });
  }

  _toggleOptions() {
    this._selector.grab_key_focus();
    if (this._options.visible)
      this._collapseOptions();
    else
      this._expandOptions();
  }

  _expandOptions() {
    this._options.show();
    this._chevron.icon_name = 'pan-up-symbolic';
    this._selector.grab_key_focus();
  }

  _collapseOptions() {
    this._options.hide();
    this._chevron.icon_name = 'pan-down-symbolic';
  }

  _selectAction(action) {
    this._selectedAction = action;
    this._updateSelector();
    this._collapseOptions();
    this._selector.grab_key_focus();
  }

  _activateSelected() {
    const action = this._selectedAction;
    if (!action)
      return;

    this._settings.set_string('last-action', action.id);
    this._dialog?.close();

    if (this._settings.get_boolean('skip-confirmations') &&
        this._activateWithoutConfirmation(action.id))
      return;

    this._systemActions[action.activate]();
  }

  _activateWithoutConfirmation(actionId) {
    let bus;
    let busName;
    let path;
    let iface;
    let method;
    let parameters;

    if (actionId === 'logout') {
      bus = Gio.DBus.session;
      busName = 'org.gnome.SessionManager';
      path = '/org/gnome/SessionManager';
      iface = 'org.gnome.SessionManager';
      method = 'Logout';
      // GNOME Session Manager flag 1 suppresses only its confirmation UI.
      parameters = new GLib.Variant('(u)', [1]);
    } else if (actionId === 'restart' || actionId === 'power-off') {
      bus = Gio.DBus.system;
      busName = 'org.freedesktop.login1';
      path = '/org/freedesktop/login1';
      iface = 'org.freedesktop.login1.Manager';
      method = actionId === 'restart' ? 'Reboot' : 'PowerOff';
      // Keep logind's normal inhibitor and shutdown handling; do not request
      // an interactive authorization prompt.
      parameters = new GLib.Variant('(b)', [false]);
    } else {
      // Lock Screen, Switch User and Suspend do not show this extra prompt.
      return false;
    }

    const systemActions = this._systemActions;
    bus.call(busName, path, iface, method, parameters, null,
      Gio.DBusCallFlags.NONE, -1, null, (connection, result) => {
        try {
          connection.call_finish(result);
        } catch (error) {
          console.error(`Alt+F4 Power Menu: ${method} request failed: ${error.message}`);
          // Preserve GNOME's normal action path if the D-Bus request fails.
          const action = POWER_ACTIONS.find(item => item.id === actionId);
          if (action && systemActions)
            systemActions[action.activate]();
        }
      });
    return true;
  }

  _onSelectorKeyPress(controller) {
    const [, symbol] = controller.get_key();

    const isEnter = symbol === Clutter.KEY_Return ||
      symbol === Clutter.KEY_KP_Enter ||
      symbol === Clutter.KEY_ISO_Enter;
    if (isEnter) {
      this._activateSelected();
      return Clutter.EVENT_STOP;
    }

    if (symbol === Clutter.KEY_Escape && this._options.visible) {
      this._collapseOptions();
      this._selector.grab_key_focus();
      return Clutter.EVENT_STOP;
    }

    if (symbol !== Clutter.KEY_Up && symbol !== Clutter.KEY_Down)
      return Clutter.EVENT_PROPAGATE;

    const actions = this._actions;
    if (!actions?.length)
      return Clutter.EVENT_PROPAGATE;

    const current = actions.indexOf(this._selectedAction);
    const direction = symbol === Clutter.KEY_Down ? 1 : -1;
    this._selectedAction =
      actions[(current + direction + actions.length) % actions.length];
    this._updateSelector();
    return Clutter.EVENT_STOP;
  }
}
