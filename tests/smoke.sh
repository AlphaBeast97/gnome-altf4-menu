#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

UUID=altf4-power-menu@alphabeast97.github.io

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

mkdir -p "${WORKDIR}/data/gnome-shell/extensions" \
  "${WORKDIR}/config" "${WORKDIR}/runtime"
chmod 700 "${WORKDIR}/runtime"

bash scripts/pack.sh >/dev/null
unzip -q dist/*.shell-extension.zip \
  -d "${WORKDIR}/data/gnome-shell/extensions/${UUID}"

dbus-run-session -- bash -c '
  set -euo pipefail
  data=$1
  uuid=$2
  export XDG_DATA_HOME="$data/data"
  export XDG_CONFIG_HOME="$data/config"
  export XDG_RUNTIME_DIR="$data/runtime"
  export XDG_DATA_DIRS=/usr/share
  export GSETTINGS_BACKEND=memory

  gnome-shell --headless --wayland \
    --wayland-display="altf4-smoke-$$" --virtual-monitor 1280x800 \
    >"$data/shell.log" 2>&1 &
  shell_pid=$!
  trap "kill $shell_pid 2>/dev/null || true" EXIT

  found=
  for _ in $(seq 1 50); do
    if gnome-extensions list 2>/dev/null | grep -qx "$uuid"; then
      found=1
      break
    fi
    sleep 0.2
  done

  if [[ -z "$found" ]]; then
    echo "FAIL: extension was not listed by the shell" >&2
    cat "$data/shell.log" >&2
    exit 1
  fi

  gnome-extensions enable "$uuid"
  sleep 2

  info=$(gnome-extensions info "$uuid")
  echo "$info"
  if ! grep -q "State: ACTIVE" <<<"$info"; then
    echo "FAIL: extension is not ACTIVE" >&2
    cat "$data/shell.log" >&2
    exit 1
  fi

  if grep -q "JS ERROR" "$data/shell.log"; then
    echo "FAIL: JS ERROR found in the shell log" >&2
    cat "$data/shell.log" >&2
    exit 1
  fi
' smoke "${WORKDIR}" "${UUID}"
