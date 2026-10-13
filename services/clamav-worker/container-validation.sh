#!/bin/sh
set -eu

work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

printf 'elite modell clean test\n' > "$work_dir/clean.txt"
# Decode only inside the isolated Linux container so endpoint protection does
# not mistake this source file for the official harmless test payload.
printf '%s' 'WDVPIVAlQEFQWzRcUFpYNTQoUF4pN0NDKTd9JEVJQ0FSLVNUQU5EQVJELUFOVElWSVJVUy1URVNULUZJTEUhJEgrSCo=' \
  | base64 -d > "$work_dir/eicar.com"

clamdscan --no-summary "$work_dir/clean.txt" | grep -q 'OK$'
set +e
clamdscan --no-summary "$work_dir/eicar.com" > "$work_dir/eicar-result.txt" 2>&1
status=$?
set -e
test "$status" -eq 1
grep -q 'FOUND$' "$work_dir/eicar-result.txt"
echo 'CLAMAV_CONTAINER_SMOKE=PASS'
