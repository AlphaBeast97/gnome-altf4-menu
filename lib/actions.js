const definitions = [
  ['lock-screen', 'Lock Screen', 'system-lock-screen-symbolic',
    'canLockScreen', 'activateLockScreen'],
  ['switch-user', 'Switch User…', 'system-users-symbolic',
    'canSwitchUser', 'activateSwitchUser'],
  ['logout', 'Log Out…', 'system-log-out-symbolic',
    'canLogout', 'activateLogout'],
  ['suspend', 'Suspend', 'media-playback-pause-symbolic',
    'canSuspend', 'activateSuspend'],
  ['restart', 'Restart…', 'system-reboot-symbolic',
    'canRestart', 'activateRestart'],
  ['power-off', 'Power Off…', 'system-shutdown-symbolic',
    'canPowerOff', 'activatePowerOff'],
];

export const POWER_ACTIONS = Object.freeze(definitions.map(
  ([id, label, icon, available, activate]) =>
    Object.freeze({id, label, icon, available, activate})));

export const POWER_ACTION_IDS = Object.freeze(
  POWER_ACTIONS.map(action => action.id));

export function filterAvailableActions(actions, visibleIds, systemActions) {
  const visible = Array.isArray(visibleIds) ? visibleIds : POWER_ACTION_IDS;
  const selected = POWER_ACTION_IDS.filter(id => visible.includes(id));
  const effectiveVisible = selected.length ? selected : POWER_ACTION_IDS;
  return actions.filter(action => effectiveVisible.includes(action.id) &&
    systemActions[action.available]);
}

export function toggleActionVisibility(visibleIds, actionId, enabled) {
  const selected = POWER_ACTION_IDS.filter(id => visibleIds.includes(id));
  const visible = new Set(selected.length ? selected : POWER_ACTION_IDS);
  if (enabled)
    visible.add(actionId);
  else if (visible.size > 1)
    visible.delete(actionId);
  return POWER_ACTION_IDS.filter(id => visible.has(id));
}

export function pickInitialAction(actions, lastActionId) {
  return actions.find(action => action.id === lastActionId) ??
    actions[0] ??
    null;
}

export function shouldHandleAltF4({hasFocusWindow, overviewVisible}) {
  return !hasFocusWindow || overviewVisible;
}
