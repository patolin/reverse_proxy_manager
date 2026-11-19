FROM node:20-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY vite.config.js ./
COPY client ./client
RUN npm run build

FROM node:20-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

RUN mkdir -p /app/data /app/proxy-dynamic && chown -R node:node /app/data /app/proxy-dynamic
COPY --chown=node:node migrations ./migrations
COPY --chown=node:node src ./src
COPY --from=build --chown=node:node /app/dist ./dist
USER node

EXPOSE 3000
CMD ["npm", "start"]
