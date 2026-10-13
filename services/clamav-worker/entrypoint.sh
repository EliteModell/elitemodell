#!/bin/sh
set -eu

mkdir -p /var/run/clamav /var/log/clamav
chown -R clamav:clamav /var/run/clamav /var/log/clamav /var/lib/clamav

# Refresh on each cold start. If the network is temporarily unavailable, the
# worker may use the image-baked database only while it remains within the
# configured freshness window; /health and every scan enforce that window.
timeout 120 freshclam --stdout || true
clamd --foreground=true &

attempt=0
until printf 'PING\n' | nc -w 2 127.0.0.1 3310 | grep -q PONG; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 60 ]; then
    echo 'clamd did not become ready' >&2
    exit 1
  fi
  sleep 1
done

exec node --experimental-strip-types services/clamav-worker/server.ts
