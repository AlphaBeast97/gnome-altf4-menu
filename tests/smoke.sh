#!/usr/bin/env bash
# Install the packed extension into a throwaway headless shell and confirm the
# shell enables it without JS errors. Uses an in-shell probe extension because
# the gnome-extensions CLI is unavailable or unreliable on some CI images.
set -euo pipefail
cd "$(dirname "$0")/.."

UUID=altf4-power-menu@alphabeast97.github.io
PROBE_UUID=altf4-smoke-probe@local

if ! command -v gnome-shell >/dev/null ||
   ! gnome-shell --help 2>&1 | grep -q -- '--headless'; then
  echo "SKIP: gnome-shell with --headless is not available"
  exit 0
fi

WORKDIR=$(mktemp -d "${TMPDIR:-/tmp}/altf4-smoke.XXXXXX")

cleanup() {
  rm -rf "${WORKDIR}"
}
trap cleanup EXIT

EXTENSIONS="${WORKDIR}/data/gnome-shell/extensions"
mkdir -p "${EXTENSIONS}" "${WORKDIR}/config" "${WORKDIR}/runtime"
chmod 700 "${WORKDIR}/runtime"

bash scripts/pack.sh >/dev/null
unzip -q dist/*.shell-extension.zip -d "${EXTENSIONS}/${UUID}"
# The installer compiles schemas from the shipped XML; do the same here.
glib-compile-schemas "${EXTENSIONS}/${UUID}/schemas"
cp -r tests/smoke-probe "${EXTENSIONS}/${PROBE_UUID}"

GSETTINGS_BACKEND=keyfile XDG_CONFIG_HOME="${WORKDIR}/config" \
  gsettings set org.gnome.shell enabled-extensions \
  "['${UUID}', '${PROBE_UUID}']"
GSETTINGS_BACKEND=keyfile XDG_CONFIG_HOME="${WORKDIR}/config" \
  gsettings set org.gnome.shell welcome-dialog-last-shown-version '99.0'

dbus-run-session -- bash -c '
  set -euo pipefail
  data=$1
  uuid=$2
  export XDG_DATA_HOME="$data/data"
  export XDG_CONFIG_HOME="$data/config"
  export XDG_RUNTIME_DIR="$data/runtime"
  export XDG_DATA_DIRS=/usr/share
  export GSETTINGS_BACKEND=keyfile
  export ALTF4_SMOKE_OUT="$data/smoke-result"

  gnome-shell --headless --wayland \
    --wayland-display="altf4-smoke-$$" --virtual-monitor 1280x800 \
    >"$data/shell.log" 2>&1 &
  shell_pid=$!
  trap "kill $shell_pid 2>/dev/null || true" EXIT

  for _ in $(seq 1 80); do
    [[ -f "$ALTF4_SMOKE_OUT" ]] && break
    sleep 0.25
  done

  if [[ ! -f "$ALTF4_SMOKE_OUT" ]]; then
    echo "FAIL: smoke probe never finished" >&2
    cat "$data/shell.log" >&2
    exit 1
  fi

  result=$(cat "$ALTF4_SMOKE_OUT")
  if [[ "$result" != "ACTIVE" ]]; then
    echo "FAIL: extension state is $result" >&2
    cat "$data/shell.log" >&2
    exit 1
  fi

  if grep -q "JS ERROR" "$data/shell.log"; then
    echo "FAIL: JS ERROR found in the shell log" >&2
    cat "$data/shell.log" >&2
    exit 1
  fi

  echo "Smoke test passed: $uuid is ACTIVE and the shell log is clean"
' smoke "${WORKDIR}" "${UUID}"
