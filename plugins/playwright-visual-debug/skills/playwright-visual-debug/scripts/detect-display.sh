#!/usr/bin/env bash
# Print the X display a headed browser can use, as: DISPLAY=:N  (kind: local|vnc|virtual)
# Exit 0 = found, 1 = none usable. Details go to stderr.
set -u

kind_of() { # $1 = ":N" -> local | vnc | virtual
  local ps_out
  ps_out=$(ps -eo args= 2>/dev/null | grep -E "(^|/)(Xtigervnc|Xvnc|Xvfb|Xorg|Xwayland)\b.* $1( |$)" | head -1)
  case "$ps_out" in
    *Xtigervnc*|*Xvnc*) echo vnc ;;
    *Xvfb*)             echo virtual ;;
    *)                  echo local ;;
  esac
}

alive() { # $1 = ":N" -> socket exists and is owned by us (a gdm login screen is not usable)
  local s="/tmp/.X11-unix/X${1#:}"
  [ -S "$s" ] && [ "$(stat -c %U "$s")" = "$(id -un)" ]
}

# 1. Inherited $DISPLAY, unless it is SSH X11 forwarding (host:N.M) which the daemon can't use.
if [ -n "${DISPLAY:-}" ] && [[ "$DISPLAY" == :* ]]; then
  d="${DISPLAY%%.*}"
  if alive "$d"; then
    echo "DISPLAY=$DISPLAY  (kind: $(kind_of "$d"), inherited)"
    exit 0
  fi
fi
[ -n "${DISPLAY:-}" ] && echo "note: \$DISPLAY=$DISPLAY is not a usable local display (SSH forwarding?); scanning" >&2

# 2. Scan sockets owned by the current user, lowest number first; prefer vnc > local > virtual.
best=""; best_rank=9
for sock in $(ls /tmp/.X11-unix/X* 2>/dev/null | sort -V); do
  [ "$(stat -c %U "$sock")" = "$(id -un)" ] || continue
  d=":${sock##*/X}"
  k=$(kind_of "$d")
  case "$k" in vnc) r=0 ;; local) r=1 ;; *) r=2 ;; esac
  echo "found $d ($k)" >&2
  if [ "$r" -lt "$best_rank" ]; then best="$d"; best_rank=$r; best_kind=$k; fi
done

if [ -n "$best" ]; then
  echo "DISPLAY=$best  (kind: $best_kind, scanned)"
  exit 0
fi

echo "no usable X display found for user $(id -un)" >&2
exit 1
