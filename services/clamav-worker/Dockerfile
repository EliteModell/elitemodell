FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*
COPY services/clamav-worker/package.json ./
RUN npm install --include=dev --no-package-lock
COPY prisma ./prisma
RUN npx prisma generate \
 && npm prune --omit=dev

FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PORT=8080 \
    REQUIRE_CLOUD_TASK_HEADER=true \
    CLAMAV_SIGNATURE_MAX_AGE_HOURS=48 \
    SCANNER_MAX_FILE_BYTES=262144000 \
    SCANNER_TIMEOUT_MS=300000
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates clamav-daemon clamav-freshclam netcat-openbsd tini \
 && rm -rf /var/lib/apt/lists/* \
 && freshclam --stdout \
 && printf '\nTCPSocket 3310\nTCPAddr 127.0.0.1\n' >> /etc/clamav/clamd.conf \
 && sed -i 's/^StreamMaxLength .*/StreamMaxLength 262144000/' /etc/clamav/clamd.conf \
 && sed -i 's/^MaxFileSize .*/MaxFileSize 262144000/' /etc/clamav/clamd.conf \
 && sed -i 's/^MaxScanSize .*/MaxScanSize 524288000/' /etc/clamav/clamd.conf
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/prisma ./prisma
COPY services/clamav-worker ./services/clamav-worker
RUN chmod 0555 services/clamav-worker/entrypoint.sh
USER root
EXPOSE 8080
ENTRYPOINT ["/usr/bin/tini", "--", "/app/services/clamav-worker/entrypoint.sh"]
