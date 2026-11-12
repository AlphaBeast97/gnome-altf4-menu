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

test('schema stores the power menu shortcut', () => {
  assert.match(schema, /<key name="shortcut-keysym" type="u">/);
  assert.match(schema, /<default>65473<\/default>/);
  assert.match(schema, /<key name="shortcut-mods" type="u">/);
  assert.match(schema, /<default>4<\/default>/);
});
