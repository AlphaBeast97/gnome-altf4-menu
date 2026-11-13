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

export function normalizeActionIds(ids) {
  const requested = Array.isArray(ids) ? ids : [];
  const normalized = [];
  for (const id of requested) {
    if (POWER_ACTION_IDS.includes(id) && !normalized.includes(id))
      normalized.push(id);
  }
  for (const id of POWER_ACTION_IDS) {
    if (!normalized.includes(id))
      normalized.push(id);
  }
  return normalized;
}

export function filterAvailableActions(actions, visibleIds, systemActions,
  orderIds = visibleIds) {
  const order = normalizeActionIds(orderIds);
  const selected = Array.isArray(visibleIds) ? visibleIds.filter(
    id => POWER_ACTION_IDS.includes(id)) : [];
  const visible = new Set(selected.length ? selected : POWER_ACTION_IDS);
  const actionsById = new Map(actions.map(action => [action.id, action]));
  return order.map(id => actionsById.get(id)).filter(action => action &&
    visible.has(action.id) && systemActions[action.available]);
}

export function toggleActionVisibility(visibleIds, actionId, enabled,
  orderIds = visibleIds) {
  const order = normalizeActionIds(orderIds);
  const selected = Array.isArray(visibleIds) ? visibleIds.filter(
    id => POWER_ACTION_IDS.includes(id)) : [];
  const visible = new Set(selected.length ? selected : POWER_ACTION_IDS);
  if (enabled)
    visible.add(actionId);
  else if (visible.size > 1)
    visible.delete(actionId);
  return order.filter(id => visible.has(id));
}

export function pickInitialAction(actions, lastActionId) {
  return actions.find(action => action.id === lastActionId) ??
    actions[0] ??
    null;
}

export function shouldHandleAltF4({hasFocusWindow, overviewVisible}) {
  return !hasFocusWindow || overviewVisible;
}
