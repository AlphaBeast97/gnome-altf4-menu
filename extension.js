import Clutter from 'gi://Clutter';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
import * as SystemActions from 'resource:///org/gnome/shell/misc/systemActions.js';

import {POWER_ACTIONS, orderActions, shouldHandleAltF4} from './lib/actions.js';

const DISALLOWED_MODIFIERS = Clutter.ModifierType.CONTROL_MASK |
  Clutter.ModifierType.SHIFT_MASK |
  Clutter.ModifierType.SUPER_MASK;

function createVerticalBox(params) {
  const box = new St.BoxLayout(params);
  // GNOME 46 exposes vertical, GNOME 51 only exposes orientation.
  if (typeof box.set_vertical === 'function')
    box.set_vertical(true);
  else
    box.orientation = Clutter.Orientation.VERTICAL;
  return box;
}

export default class AltF4PowerMenuExtension extends Extension {
  enable() {
    this._settings = this.getSettings();
    this._systemActions = SystemActions.getDefault();
    this._dialog = null;
    this._dialogButtons = null;
    this._dialogNavId = 0;
    this._stageKeyPressId = global.stage.connect(
      'key-press-event', this._onStageKeyPress.bind(this));
  }

  disable() {
    if (this._stageKeyPressId) {
      global.stage.disconnect(this._stageKeyPressId);
      this._stageKeyPressId = 0;
    }

    this._disconnectDialogNav();

    if (this._dialog) {
      const dialog = this._dialog;
      this._dialog = null;
      dialog.popModal();
      dialog.destroy();
    }

    this._dialogButtons = null;
    this._settings = null;
    this._systemActions = null;
  }

  _onStageKeyPress(_stage, event) {
    if (event.get_key_symbol() !== Clutter.KEY_F4)
      return Clutter.EVENT_PROPAGATE;

    const state = event.get_state();
    if (!(state & Clutter.ModifierType.MOD1_MASK) ||
        (state & DISALLOWED_MODIFIERS))
      return Clutter.EVENT_PROPAGATE;

    if (!shouldHandleAltF4({
      hasFocusWindow: global.display.focus_window !== null,
      overviewVisible: Main.overview.visible,
    }))
      return Clutter.EVENT_PROPAGATE;

    this._openDialog();
    return Clutter.EVENT_STOP;
  }

  _openDialog() {
    if (this._dialog)
      return;

    const dialog = new ModalDialog.ModalDialog({
      styleClass: 'altf4-power-dialog',
    });

    dialog.contentLayout.add_child(new St.Label({
      text: 'Power',
      style_class: 'altf4-power-title',
      x_align: Clutter.ActorAlign.CENTER,
    }));

    const list = createVerticalBox({style_class: 'altf4-power-list'});
    const actions = orderActions(
      POWER_ACTIONS.filter(action => this._systemActions[action.available]),
      this._settings.get_string('last-action'));

    this._dialogButtons = actions.map(action => {
      const content = new St.BoxLayout({
        style_class: 'altf4-power-action-content',
      });
      content.add_child(new St.Icon({
        icon_name: action.icon,
        icon_size: 16,
        style_class: 'altf4-power-icon',
      }));
      content.add_child(new St.Label({text: action.label}));

      const row = new St.Button({
        style_class: 'altf4-power-action',
        child: content,
        x_expand: true,
        can_focus: true,
        accessible_name: action.label,
      });
      row.connect('clicked', () => {
        this._settings.set_string('last-action', action.id);
        this._dialog?.close();
        this._systemActions[action.activate]();
      });
      list.add_child(row);
      return row;
    });

    dialog.contentLayout.add_child(list);
    dialog.addButton({
      label: 'Cancel',
      key: Clutter.KEY_Escape,
      action: () => dialog.close(),
    });

    if (this._dialogButtons.length > 0)
      dialog.setInitialKeyFocus(this._dialogButtons[0]);

    this._dialog = dialog;
    this._dialogNavId = global.stage.connect(
      'captured-event', this._onDialogNavKeyPress.bind(this));
    dialog.connect('closed', () => this._disconnectDialogNav());
    dialog.connect('destroy', () => {
      this._disconnectDialogNav();
      if (this._dialog === dialog)
        this._dialog = null;
      this._dialogButtons = null;
    });

    if (!dialog.open()) {
      dialog.destroy();
      return;
    }
  }

  _onDialogNavKeyPress(_stage, event) {
    if (event.type() !== Clutter.EventType.KEY_PRESS)
      return Clutter.EVENT_PROPAGATE;

    const symbol = event.get_key_symbol();
    if (symbol !== Clutter.KEY_Up && symbol !== Clutter.KEY_Down)
      return Clutter.EVENT_PROPAGATE;

    const buttons = this._dialogButtons;
    if (!buttons?.length)
      return Clutter.EVENT_PROPAGATE;

    const current = buttons.indexOf(global.stage.key_focus);
    const direction = symbol === Clutter.KEY_Down ? 1 : -1;
    const next = current === -1
      ? (direction === 1 ? 0 : buttons.length - 1)
      : (current + direction + buttons.length) % buttons.length;

    buttons[next].grab_key_focus();
    return Clutter.EVENT_STOP;
  }

  _disconnectDialogNav() {
    if (this._dialogNavId) {
      global.stage.disconnect(this._dialogNavId);
      this._dialogNavId = 0;
    }
  }
}
