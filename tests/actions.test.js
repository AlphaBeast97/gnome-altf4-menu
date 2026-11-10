import test from 'node:test';
import assert from 'node:assert/strict';
import {
  POWER_ACTIONS,
  pickInitialAction,
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
    assert.match(action.available, /^can[A-Z]/);
    assert.match(action.activate, /^activate[A-Z]/);
  }
  assert.equal(new Set(POWER_ACTIONS.map(action => action.id)).size,
    POWER_ACTIONS.length);
});

test('pickInitialAction preselects the saved action', () => {
  assert.equal(pickInitialAction(POWER_ACTIONS, 'power-off').id, 'power-off');
  assert.equal(pickInitialAction(POWER_ACTIONS, '').id, 'lock-screen');
  assert.equal(pickInitialAction(POWER_ACTIONS, 'nope').id, 'lock-screen');
  assert.equal(pickInitialAction([], 'power-off'), null);
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
