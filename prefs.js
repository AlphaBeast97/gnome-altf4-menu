import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {
  DEFAULT_KEYVAL,
  DEFAULT_MODS,
  modifiersFromState,
  modifiersToGdk,
} from './lib/shortcut.js';

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
      shortcutLabel.accelerator = Gtk.accelerator_name(
        settings.get_uint('shortcut-keysym'),
        modifiersToGdk(settings.get_uint('shortcut-mods')));
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
        label: 'Hold Shift, Ctrl, Alt or Super with another key. ' +
          'A modifier alone is not enough.',
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
      box.append(hint);
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

    const page = new Adw.PreferencesPage();
    page.add(group);
    window.add(page);

    updateLabel();
  }
}
