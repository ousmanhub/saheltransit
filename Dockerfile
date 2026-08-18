FROM node:22-slim AS frontend-builder

WORKDIR /app

ENV NODE_OPTIONS=--max-old-space-size=4096

COPY package*.json ./
RUN npm install --no-audit --no-fund --no-progress

COPY . .
RUN npm run build

FROM node:22-slim

WORKDIR /app

COPY package-backend.json ./package.json
COPY server.js ./
RUN npm install --no-audit --no-fund --no-progress

COPY --from=frontend-builder /app/dist ./dist

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
