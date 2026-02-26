#!/usr/bin/env bash
# MECP — Mesh Emergency Communication Protocol
# Shell encoder/decoder for quick testing and scripting.
#
# Usage:
#   ./mecp_encode.sh encode 0 M01 M07 "2pax 48.6520,20.1305"
#   ./mecp_encode.sh decode "MECP/0/M01 M07 2pax 48.6520,20.1305"
#   ./mecp_encode.sh encode 0 B01 M01 P05 "48.6520,20.1305 @1430"
#   ./mecp_encode.sh decode "MECP/0/B01 M01 P05 48.6520,20.1305 @1430"

set -euo pipefail

MAX_BYTES=200

mecp_encode() {
  local severity="$1"; shift
  local codes=()
  local freetext=""

  for arg in "$@"; do
    if [[ "$arg" =~ ^[A-Z][0-9]{2}$ ]]; then
      codes+=("$arg")
    else
      freetext="$arg"
    fi
  done

  local msg="MECP/${severity}/${codes[*]}"
  if [[ -n "$freetext" ]]; then
    msg="${msg} ${freetext}"
  fi

  local byte_len
  byte_len=$(printf '%s' "$msg" | wc -c)

  echo "$msg"
  if (( byte_len > MAX_BYTES )); then
    echo "(${byte_len} bytes — OVER LIMIT)" >&2
  else
    echo "(${byte_len} bytes)"
  fi
}

mecp_decode() {
  local raw="$1"

  # Check prefix
  if [[ "$raw" != MECP/* ]]; then
    echo "Not an MECP message"
    return 1
  fi

  # Severity
  local severity="${raw:5:1}"
  echo "Severity: $severity"

  # Body after MECP/N/
  local body="${raw:7}"
  local codes=()
  local freetext_parts=()
  local in_freetext=0

  for tok in $body; do
    if [[ $in_freetext -eq 0 && "$tok" =~ ^[A-Z][0-9]{2}$ ]]; then
      codes+=("$tok")
    else
      in_freetext=1
      freetext_parts+=("$tok")
    fi
  done

  echo "Codes:    ${codes[*]}"

  local freetext="${freetext_parts[*]}"
  if [[ -n "$freetext" ]]; then
    echo "Freetext: $freetext"
  fi

  # Drill?
  local is_drill="no"
  local is_beacon="no"
  for c in "${codes[@]}"; do
    if [[ "$c" == "D01" || "$c" == "D02" ]]; then
      is_drill="yes"
    fi
    if [[ "$c" == "B01" ]]; then
      is_beacon="yes"
    fi
  done
  echo "Drill:    $is_drill"
  echo "Beacon:   $is_beacon"

  # Pax
  if [[ "$freetext" =~ ([0-9]+)pax ]]; then
    echo "Pax:      ${BASH_REMATCH[1]}"
  fi

  # GPS
  if [[ "$freetext" =~ (-?[0-9]+\.[0-9]+),(-?[0-9]+\.[0-9]+) ]]; then
    echo "GPS:      ${BASH_REMATCH[1]}, ${BASH_REMATCH[2]}"
  fi

  # Reference tag
  if [[ "$freetext" =~ \#([A-Za-z0-9]{1,4}) ]]; then
    echo "Ref:      ${BASH_REMATCH[1]}"
  fi
}

case "${1:-}" in
  encode)
    shift
    mecp_encode "$@"
    ;;
  decode)
    shift
    mecp_decode "$1"
    ;;
  *)
    echo "Usage: $0 {encode|decode} ..."
    echo "  encode <severity> <codes...> [freetext]"
    echo "  decode <mecp_string>"
    exit 1
    ;;
esac
