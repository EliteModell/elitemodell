#!/bin/sh
set -eu

work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

printf 'elite modell clean test\n' > "$work_dir/clean.txt"
# EICAR is deliberately assembled in the test container so repository scanners
# do not quarantine this source file merely for containing the full signature.
printf '%s' 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-' > "$work_dir/eicar.com"
printf '%s' 'STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' >> "$work_dir/eicar.com"

clamdscan --no-summary "$work_dir/clean.txt" | grep -q 'OK$'
set +e
clamdscan --no-summary "$work_dir/eicar.com" > "$work_dir/eicar-result.txt" 2>&1
status=$?
set -e
test "$status" -eq 1
grep -q 'FOUND$' "$work_dir/eicar-result.txt"
echo 'CLAMAV_CONTAINER_SMOKE=PASS'
