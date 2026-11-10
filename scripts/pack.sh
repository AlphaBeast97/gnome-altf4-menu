#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
glib-compile-schemas --strict schemas
rm -rf dist
mkdir -p dist
gnome-extensions pack --force --out-dir dist --extra-source=lib \
  --extra-source=LICENSE \
  --schema schemas/org.gnome.shell.extensions.altf4-power-menu.gschema.xml \
  .
