FROM node:20-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

RUN mkdir -p /app/data /app/proxy-dynamic && chown -R node:node /app/data /app/proxy-dynamic
COPY --chown=node:node migrations ./migrations
COPY --chown=node:node src ./src
USER node

EXPOSE 3000
CMD ["npm", "start"]
