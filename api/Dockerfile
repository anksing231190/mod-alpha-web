# ---- build
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY api/package.json api/
RUN npm ci --workspace api --include-workspace-root=false
COPY api api
RUN npm --workspace api run build && npm prune --omit=dev --workspace api

# ---- runtime
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/api/dist api/dist
COPY --from=build /app/api/migrations api/migrations
COPY --from=build /app/api/package.json api/
WORKDIR /app/api
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:8080/health || exit 1
# MIGRATE_ON_START=true runs pending migrations (advisory-locked, safe with several replicas)
CMD ["node", "dist/server.js"]
