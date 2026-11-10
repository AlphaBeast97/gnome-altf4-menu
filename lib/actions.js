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

export function orderActions(actions, lastActionId) {
  const first = actions.find(action => action.id === lastActionId);
  if (!first)
    return [...actions];
  return [first, ...actions.filter(action => action !== first)];
}

export function shouldHandleAltF4({hasFocusWindow, overviewVisible}) {
  return !hasFocusWindow || overviewVisible;
}
