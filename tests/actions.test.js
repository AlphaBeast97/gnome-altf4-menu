import test from 'node:test';
import assert from 'node:assert/strict';
import {
  POWER_ACTIONS,
  orderActions,
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

test('orderActions moves the saved action first without mutating input', () => {
  const input = [...POWER_ACTIONS];
  const result = orderActions(input, 'power-off');
  assert.equal(result[0].id, 'power-off');
  assert.deepEqual(result.slice(1).map(action => action.id),
    expectedIds.filter(id => id !== 'power-off'));
  assert.equal(input[0].id, 'lock-screen');
  assert.notEqual(result, input);
});

test('orderActions keeps default order for empty or unknown ids', () => {
  assert.deepEqual(orderActions(POWER_ACTIONS, '').map(a => a.id), expectedIds);
  assert.deepEqual(orderActions(POWER_ACTIONS, 'nope').map(a => a.id),
    expectedIds);
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
