FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY services/video-worker/package.json ./
RUN npm install --include=dev --no-package-lock
COPY prisma ./prisma
RUN npx prisma generate && npm prune --omit=dev

FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=8080 REQUIRE_CLOUD_TASK_HEADER=true VIDEO_SOURCE_RETENTION_HOURS=24
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates ffmpeg tini \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/prisma ./prisma
COPY services/video-worker ./services/video-worker
USER node
EXPOSE 8080
ENTRYPOINT ["/usr/bin/tini", "--", "node", "--experimental-strip-types", "/app/services/video-worker/server.ts"]
