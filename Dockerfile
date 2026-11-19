FROM node:20-bookworm-slim AS build

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY vite.config.js ./
COPY client ./client
RUN npm run build && npm prune --omit=dev

FROM node:20-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
RUN mkdir -p /app/data /app/proxy-dynamic /app/deployment-queue \
  && touch /app/deployment-queue/jobs.sqlite \
  && chown -R node:node /app/data /app/proxy-dynamic /app/deployment-queue
COPY --chown=node:node migrations ./migrations
COPY --chown=node:node src ./src
COPY --from=build --chown=node:node /app/dist ./dist
USER node

EXPOSE 3000
CMD ["npm", "start"]
