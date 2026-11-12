// Modifier bits stored in settings. GDK and Clutter agree on the numeric
// values used here, so one mapping works in both the prefs and shell processes.
export const SHIFT = 1;
export const CONTROL = 2;
export const ALT = 4;
export const SUPER = 8;
export const MODIFIER_MASK = SHIFT | CONTROL | ALT | SUPER;

export const DEFAULT_KEYVAL = 65473; // F4
export const DEFAULT_MODS = ALT;

const GDK_SHIFT = 1;
const GDK_CONTROL = 4;
const GDK_ALT = 8;
const GDK_MOD4 = 64;
const GDK_SUPER = 1 << 26;

export function modifiersFromState(state) {
  let mods = 0;
  if (state & GDK_SHIFT)
    mods |= SHIFT;
  if (state & GDK_CONTROL)
    mods |= CONTROL;
  if (state & GDK_ALT)
    mods |= ALT;
  if (state & (GDK_MOD4 | GDK_SUPER))
    mods |= SUPER;
  return mods;
}

export function modifiersToGdk(mods) {
  let state = 0;
  if (mods & SHIFT)
    state |= GDK_SHIFT;
  if (mods & CONTROL)
    state |= GDK_CONTROL;
  if (mods & ALT)
    state |= GDK_ALT;
  if (mods & SUPER)
    state |= GDK_SUPER;
  return state;
}

export function matchesShortcut(keyval, state, expectedKeyval, expectedMods) {
  return keyval === expectedKeyval &&
    modifiersFromState(state) === (expectedMods & MODIFIER_MASK);
}
