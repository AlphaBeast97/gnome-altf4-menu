import GLib from 'gi://GLib';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const TARGET_UUID = 'altf4-power-menu@alphabeast97.github.io';
const OUT = GLib.getenv('ALTF4_SMOKE_OUT');
const ACTIVE = 1;

export default class SmokeProbe extends Extension {
  enable() {
    this._tries = 0;
    this._timeoutId = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT, 250, () => {
        const extension = Main.extensionManager.lookup(TARGET_UUID);
        if (extension?.state === ACTIVE) {
          this._write('ACTIVE');
          return GLib.SOURCE_REMOVE;
        }
        if (++this._tries > 80) {
          this._write('MISSING');
          return GLib.SOURCE_REMOVE;
        }
        return GLib.SOURCE_CONTINUE;
      });
  }

  disable() {
    if (this._timeoutId) {
      GLib.source_remove(this._timeoutId);
      this._timeoutId = 0;
    }
  }

  _write(result) {
    if (OUT)
      GLib.file_set_contents(OUT, result);
  }
}
