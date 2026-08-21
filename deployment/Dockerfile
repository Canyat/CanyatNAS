# Stage 1: Build Frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM node:22-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
RUN npm run build

# Stage 3: Production Runner
FROM node:22-alpine
WORKDIR /app

# Install native dependencies for system metrics and SQLite
RUN apk add --no-cache bash curl docker-cli

COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

ENV NODE_ENV=production
ENV PORT=5678
ENV DATA_DIR=/app/data

EXPOSE 5678

VOLUME ["/app/data", "/media", "/mnt", "/var/run/docker.sock"]

CMD ["node", "backend/dist/server.js"]
