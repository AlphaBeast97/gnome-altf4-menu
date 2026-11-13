import test from 'node:test';
import assert from 'node:assert/strict';
import {
  POWER_ACTIONS,
  POWER_ACTION_IDS,
  filterAvailableActions,
  normalizeActionIds,
  pickInitialAction,
  shouldHandleAltF4,
  toggleActionVisibility,
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

test('power actions can be filtered by settings and availability', () => {
  const systemActions = {
    canLockScreen: true,
    canSwitchUser: false,
    canLogout: true,
    canSuspend: true,
    canRestart: true,
    canPowerOff: true,
  };
  const actions = filterAvailableActions(POWER_ACTIONS,
    ['power-off', 'unknown', 'switch-user', 'lock-screen'], systemActions,
    ['power-off', 'switch-user', 'lock-screen']);
  assert.deepEqual(actions.map(action => action.id),
    ['power-off', 'lock-screen']);
  assert.deepEqual(filterAvailableActions(POWER_ACTIONS, ['unknown'],
    systemActions).map(action => action.id),
  ['lock-screen', 'logout', 'suspend', 'restart', 'power-off']);
});

test('action order preserves saved order and appends missing actions', () => {
  assert.deepEqual(normalizeActionIds(['restart', 'lock-screen', 'restart']), [
    'restart', 'lock-screen', 'switch-user', 'logout', 'suspend', 'power-off',
  ]);
});

test('visibility settings always retain one action', () => {
  assert.deepEqual(toggleActionVisibility(POWER_ACTION_IDS, 'power-off', false),
    POWER_ACTION_IDS.slice(0, -1));
  assert.deepEqual(toggleActionVisibility(['power-off'], 'power-off', false),
    ['power-off']);
  assert.deepEqual(toggleActionVisibility(['lock-screen'], 'power-off', true),
    ['lock-screen', 'power-off']);
  assert.deepEqual(toggleActionVisibility(['lock-screen'], 'power-off', true,
    ['power-off', 'lock-screen']), ['power-off', 'lock-screen']);
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
